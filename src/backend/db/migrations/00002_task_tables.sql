/*
================================================================================
 TaskStream AI - Additional Database Entities for Enhanced Task Management
--------------------------------------------------------------------------------
 This script extends the initial schema by introducing task dependency, attachment,
 tag, and history tracking tables, along with modifications to the tasks table to
 support richer functionality such as templates, subtasks, AI metadata, and tracked
 field changes. Triggers are provided to automatically update subtask counts and
 log field changes in the task_history table for auditing and analytics.
================================================================================
*/

/*==============================================================================
  1. TABLE: task_dependencies
    Manages relationships between tasks (e.g., BLOCKS, REQUIRES, RELATES_TO),
    including notes and weight to prioritize or rank dependencies.
==============================================================================*/
CREATE TABLE task_dependencies (
    id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id          uuid REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_id    uuid REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type  VARCHAR(50) NOT NULL,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by       uuid REFERENCES users(id),
    notes            TEXT,
    weight           INTEGER DEFAULT 1
);

-- Constraints on task_dependencies
ALTER TABLE task_dependencies
    ADD CONSTRAINT chk_task_dependency_self
    CHECK (task_id <> dependency_id);

ALTER TABLE task_dependencies
    ADD CONSTRAINT chk_dependency_type
    CHECK (dependency_type IN ('BLOCKS', 'REQUIRES', 'RELATES_TO', 'DUPLICATES', 'PARENT_OF'));

ALTER TABLE task_dependencies
    ADD CONSTRAINT chk_dependency_weight
    CHECK (weight BETWEEN 1 AND 10);

-- Indexes for fast lookups and ensuring uniqueness (no duplicate dependencies)
CREATE UNIQUE INDEX idx_task_dependencies
    ON task_dependencies (task_id, dependency_id);

CREATE INDEX idx_dependency_lookup
    ON task_dependencies (dependency_id);

CREATE INDEX idx_dependency_type
    ON task_dependencies (dependency_type);

/*==============================================================================
  2. TABLE: task_attachments
    Stores file attachments linked to tasks, including file metadata, hashing,
    optional archival flags, and general JSONB metadata for flexible usage.
==============================================================================*/
CREATE TABLE task_attachments (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id       uuid REFERENCES tasks(id) ON DELETE CASCADE,
    file_name     VARCHAR(255) NOT NULL,
    file_type     VARCHAR(100) NOT NULL,
    file_size     BIGINT NOT NULL,
    storage_path  TEXT NOT NULL,
    uploaded_by   uuid REFERENCES users(id),
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    content_hash  VARCHAR(64),
    mime_type     VARCHAR(127),
    is_archived   BOOLEAN DEFAULT false,
    metadata      JSONB
);

-- Indexes for optimized attachment queries
CREATE INDEX idx_task_attachments
    ON task_attachments (task_id);

CREATE INDEX idx_attachment_type
    ON task_attachments (file_type);

CREATE INDEX idx_attachment_metadata
    ON task_attachments
    USING gin (metadata);

/*==============================================================================
  3. TABLE: task_tags
    Allows adding tags to a task, which can be system-level or user-defined.
    Supports color codes, descriptions, and metadata for classification.
==============================================================================*/
CREATE TABLE task_tags (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id     uuid REFERENCES tasks(id) ON DELETE CASCADE,
    tag_name    VARCHAR(100) NOT NULL,
    created_by  uuid REFERENCES users(id),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    color       VARCHAR(7),
    description TEXT,
    is_system   BOOLEAN DEFAULT false
);

-- Indexes for searching and filtering tags
CREATE INDEX idx_task_tags
    ON task_tags (task_id);

CREATE INDEX idx_tag_search
    ON task_tags (tag_name);

-- Index to filter system tags easily
CREATE INDEX idx_system_tags
    ON task_tags (is_system)
    WHERE is_system = true;

/*==============================================================================
  4. TABLE: task_history
    Records changes to tasks for audit and change tracking, capturing old and new
    values, the user who made the change, timestamps, and optional metadata.
==============================================================================*/
CREATE TABLE task_history (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id     uuid REFERENCES tasks(id) ON DELETE CASCADE,
    field_name  VARCHAR(100) NOT NULL,
    old_value   TEXT,
    new_value   TEXT,
    changed_by  uuid REFERENCES users(id),
    changed_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    change_type VARCHAR(50) NOT NULL,
    source      VARCHAR(100),
    metadata    JSONB
);

-- Indexes to efficiently retrieve history records by task, field, time, or metadata
CREATE INDEX idx_task_history
    ON task_history (task_id);

CREATE INDEX idx_history_field
    ON task_history (field_name);

CREATE INDEX idx_history_date
    ON task_history (changed_at);

CREATE INDEX idx_history_metadata
    ON task_history
    USING gin (metadata);

/*==============================================================================
  5. MODIFICATIONS TO EXISTING tasks TABLE
    Extends the tasks table with additional columns for parent/child relationships,
    AI metadata, estimates, and other advanced features. Also adds new indexes.
==============================================================================*/
ALTER TABLE tasks
    ADD COLUMN tags TEXT[] DEFAULT '{}'::TEXT[];

ALTER TABLE tasks
    ADD COLUMN parent_id uuid REFERENCES tasks(id);

ALTER TABLE tasks
    ADD COLUMN subtask_count INTEGER DEFAULT 0;

ALTER TABLE tasks
    ADD COLUMN is_template BOOLEAN DEFAULT false;

ALTER TABLE tasks
    ADD COLUMN template_id uuid REFERENCES tasks(id);

ALTER TABLE tasks
    ADD COLUMN completion_percentage DECIMAL(5,2) DEFAULT 0.0;

ALTER TABLE tasks
    ADD COLUMN story_points INTEGER;

ALTER TABLE tasks
    ADD COLUMN sprint_id uuid;

ALTER TABLE tasks
    ADD COLUMN original_estimate DECIMAL(10,2);

ALTER TABLE tasks
    ADD COLUMN remaining_estimate DECIMAL(10,2);

ALTER TABLE tasks
    ADD COLUMN ai_metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE tasks
    ADD COLUMN source_communication_id uuid;

ALTER TABLE tasks
    ADD COLUMN confidence_score DECIMAL(5,2);

ALTER TABLE tasks
    ADD COLUMN extracted_context TEXT;

-- Create indexes for newly added columns
CREATE INDEX idx_task_parent
    ON tasks (parent_id);

CREATE INDEX idx_task_template
    ON tasks (template_id);

CREATE INDEX idx_task_sprint
    ON tasks (sprint_id);

CREATE INDEX idx_task_ai_metadata
    ON tasks
    USING gin (ai_metadata);

/*==============================================================================
  6. TRIGGERS AND FUNCTIONS
    Includes:
     - update_subtask_count: Recomputes the subtask count when a task is added,
       removed, or updated regarding parent_id.
     - track_task_changes: Logs changes to the task fields in the task_history
       table for auditing and analytics.
==============================================================================*/

/*----------------------------------------------------------------------------
  6.1. FUNCTION: fn_update_subtask_count
       Updates 'subtask_count' on the parent task whenever a child is inserted,
       deleted, or has its parent changed.
----------------------------------------------------------------------------*/
CREATE OR REPLACE FUNCTION fn_update_subtask_count()
RETURNS TRIGGER AS
$$
BEGIN
    /* Handle INSERT: if a new row has a parent, increment that parent's subtask count */
    IF (TG_OP = 'INSERT') THEN
        IF NEW.parent_id IS NOT NULL THEN
            UPDATE tasks
            SET subtask_count = (
                SELECT COUNT(*) FROM tasks
                WHERE parent_id = NEW.parent_id
            )
            WHERE id = NEW.parent_id;
        END IF;
        RETURN NEW;
    /* Handle DELETE: if the deleted row had a parent, decrement that parent's subtask count */
    ELSIF (TG_OP = 'DELETE') THEN
        IF OLD.parent_id IS NOT NULL THEN
            UPDATE tasks
            SET subtask_count = (
                SELECT COUNT(*) FROM tasks
                WHERE parent_id = OLD.parent_id
            )
            WHERE id = OLD.parent_id;
        END IF;
        RETURN OLD;
    /* Handle UPDATE: if parent_id changes, update subtask counts for old and new parents */
    ELSIF (TG_OP = 'UPDATE') THEN
        IF NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
            -- Decrement old parent's subtask_count
            IF OLD.parent_id IS NOT NULL THEN
                UPDATE tasks
                SET subtask_count = (
                    SELECT COUNT(*) FROM tasks
                    WHERE parent_id = OLD.parent_id
                )
                WHERE id = OLD.parent_id;
            END IF;
            -- Increment new parent's subtask_count
            IF NEW.parent_id IS NOT NULL THEN
                UPDATE tasks
                SET subtask_count = (
                    SELECT COUNT(*) FROM tasks
                    WHERE parent_id = NEW.parent_id
                )
                WHERE id = NEW.parent_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger that binds fn_update_subtask_count to tasks table
CREATE TRIGGER update_subtask_count
AFTER INSERT OR DELETE OR UPDATE
ON tasks
FOR EACH ROW
EXECUTE PROCEDURE fn_update_subtask_count();

/*----------------------------------------------------------------------------
  6.2. FUNCTION: fn_track_task_changes
       Audits changes on the tasks table by comparing OLD and NEW values, then
       inserting differences into task_history. Offers robust coverage for every
       key column that may change during updates.
----------------------------------------------------------------------------*/
CREATE OR REPLACE FUNCTION fn_track_task_changes()
RETURNS TRIGGER AS
$$
DECLARE
    columnName TEXT;
BEGIN
    -- Only audit when something actually changes
    IF (TG_OP = 'UPDATE') THEN

        /* title */
        IF NEW.title IS DISTINCT FROM OLD.title THEN
            INSERT INTO task_history (
                task_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type, source
            )
            VALUES (
                NEW.id,
                'title',
                OLD.title,
                NEW.title,
                NULL,  -- changed_by unknown; set to NULL or application can handle
                CURRENT_TIMESTAMP,
                'UPDATE',
                'DB_TRIGGER'
            );
        END IF;

        /* description */
        IF NEW.description IS DISTINCT FROM OLD.description THEN
            INSERT INTO task_history (
                task_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type, source
            )
            VALUES (
                NEW.id,
                'description',
                OLD.description,
                NEW.description,
                NULL,
                CURRENT_TIMESTAMP,
                'UPDATE',
                'DB_TRIGGER'
            );
        END IF;

        /* status */
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            INSERT INTO task_history (
                task_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type, source
            )
            VALUES (
                NEW.id,
                'status',
                OLD.status::text,
                NEW.status::text,
                NULL,
                CURRENT_TIMESTAMP,
                'UPDATE',
                'DB_TRIGGER'
            );
        END IF;

        /* priority */
        IF NEW.priority IS DISTINCT FROM OLD.priority THEN
            INSERT INTO task_history (
                task_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type, source
            )
            VALUES (
                NEW.id,
                'priority',
                OLD.priority::text,
                NEW.priority::text,
                NULL,
                CURRENT_TIMESTAMP,
                'UPDATE',
                'DB_TRIGGER'
            );
        END IF;

        /* assignee_id */
        IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
            INSERT INTO task_history (
                task_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type, source
            )
            VALUES (
                NEW.id,
                'assignee_id',
                OLD.assignee_id::text,
                NEW.assignee_id::text,
                NULL,
                CURRENT_TIMESTAMP,
                'UPDATE',
                'DB_TRIGGER'
            );
        END IF;

        /* due_date */
        IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
            INSERT INTO task_history (
                task_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type, source
            )
            VALUES (
                NEW.id,
                'due_date',
                CASE WHEN OLD.due_date IS NULL THEN NULL ELSE OLD.due_date::text END,
                CASE WHEN NEW.due_date IS NULL THEN NULL ELSE NEW.due_date::text END,
                NULL,
                CURRENT_TIMESTAMP,
                'UPDATE',
                'DB_TRIGGER'
            );
        END IF;

        /* estimated_hours */
        IF NEW.estimated_hours IS DISTINCT FROM OLD.estimated_hours THEN
            INSERT INTO task_history (
                task_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type, source
            )
            VALUES (
                NEW.id,
                'estimated_hours',
                CASE WHEN OLD.estimated_hours IS NULL THEN NULL ELSE OLD.estimated_hours::text END,
                CASE WHEN NEW.estimated_hours IS NULL THEN NULL ELSE NEW.estimated_hours::text END,
                NULL,
                CURRENT_TIMESTAMP,
                'UPDATE',
                'DB_TRIGGER'
            );
        END IF;

        /* actual_hours */
        IF NEW.actual_hours IS DISTINCT FROM OLD.actual_hours THEN
            INSERT INTO task_history (
                task_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type, source
            )
            VALUES (
                NEW.id,
                'actual_hours',
                CASE WHEN OLD.actual_hours IS NULL THEN NULL ELSE OLD.actual_hours::text END,
                CASE WHEN NEW.actual_hours IS NULL THEN NULL ELSE NEW.actual_hours::text END,
                NULL,
                CURRENT_TIMESTAMP,
                'UPDATE',
                'DB_TRIGGER'
            );
        END IF;

        /* parent_id */
        IF NEW.parent_id IS DISTINCT FROM OLD.parent_id THEN
            INSERT INTO task_history (
                task_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type, source
            )
            VALUES (
                NEW.id,
                'parent_id',
                CASE WHEN OLD.parent_id IS NULL THEN NULL ELSE OLD.parent_id::text END,
                CASE WHEN NEW.parent_id IS NULL THEN NULL ELSE NEW.parent_id::text END,
                NULL,
                CURRENT_TIMESTAMP,
                'UPDATE',
                'DB_TRIGGER'
            );
        END IF;

        /* subtask_count */
        IF NEW.subtask_count IS DISTINCT FROM OLD.subtask_count THEN
            INSERT INTO task_history (
                task_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type, source
            )
            VALUES (
                NEW.id,
                'subtask_count',
                OLD.subtask_count::text,
                NEW.subtask_count::text,
                NULL,
                CURRENT_TIMESTAMP,
                'UPDATE',
                'DB_TRIGGER'
            );
        END IF;

        /* is_template */
        IF NEW.is_template IS DISTINCT FROM OLD.is_template THEN
            INSERT INTO task_history (
                task_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type, source
            )
            VALUES (
                NEW.id,
                'is_template',
                OLD.is_template::text,
                NEW.is_template::text,
                NULL,
                CURRENT_TIMESTAMP,
                'UPDATE',
                'DB_TRIGGER'
            );
        END IF;

        /* template_id */
        IF NEW.template_id IS DISTINCT FROM OLD.template_id THEN
            INSERT INTO task_history (
                task_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type, source
            )
            VALUES (
                NEW.id,
                'template_id',
                CASE WHEN OLD.template_id IS NULL THEN NULL ELSE OLD.template_id::text END,
                CASE WHEN NEW.template_id IS NULL THEN NULL ELSE NEW.template_id::text END,
                NULL,
                CURRENT_TIMESTAMP,
                'UPDATE',
                'DB_TRIGGER'
            );
        END IF;

        /* completion_percentage */
        IF NEW.completion_percentage IS DISTINCT FROM OLD.completion_percentage THEN
            INSERT INTO task_history (
                task_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type, source
            )
            VALUES (
                NEW.id,
                'completion_percentage',
                CASE WHEN OLD.completion_percentage IS NULL THEN NULL ELSE OLD.completion_percentage::text END,
                CASE WHEN NEW.completion_percentage IS NULL THEN NULL ELSE NEW.completion_percentage::text END,
                NULL,
                CURRENT_TIMESTAMP,
                'UPDATE',
                'DB_TRIGGER'
            );
        END IF;

        /* story_points */
        IF NEW.story_points IS DISTINCT FROM OLD.story_points THEN
            INSERT INTO task_history (
                task_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type, source
            )
            VALUES (
                NEW.id,
                'story_points',
                CASE WHEN OLD.story_points IS NULL THEN NULL ELSE OLD.story_points::text END,
                CASE WHEN NEW.story_points IS NULL THEN NULL ELSE NEW.story_points::text END,
                NULL,
                CURRENT_TIMESTAMP,
                'UPDATE',
                'DB_TRIGGER'
            );
        END IF;

        /* sprint_id */
        IF NEW.sprint_id IS DISTINCT FROM OLD.sprint_id THEN
            INSERT INTO task_history (
                task_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type, source
            )
            VALUES (
                NEW.id,
                'sprint_id',
                CASE WHEN OLD.sprint_id IS NULL THEN NULL ELSE OLD.sprint_id::text END,
                CASE WHEN NEW.sprint_id IS NULL THEN NULL ELSE NEW.sprint_id::text END,
                NULL,
                CURRENT_TIMESTAMP,
                'UPDATE',
                'DB_TRIGGER'
            );
        END IF;

        /* original_estimate */
        IF NEW.original_estimate IS DISTINCT FROM OLD.original_estimate THEN
            INSERT INTO task_history (
                task_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type, source
            )
            VALUES (
                NEW.id,
                'original_estimate',
                CASE WHEN OLD.original_estimate IS NULL THEN NULL ELSE OLD.original_estimate::text END,
                CASE WHEN NEW.original_estimate IS NULL THEN NULL ELSE NEW.original_estimate::text END,
                NULL,
                CURRENT_TIMESTAMP,
                'UPDATE',
                'DB_TRIGGER'
            );
        END IF;

        /* remaining_estimate */
        IF NEW.remaining_estimate IS DISTINCT FROM OLD.remaining_estimate THEN
            INSERT INTO task_history (
                task_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type, source
            )
            VALUES (
                NEW.id,
                'remaining_estimate',
                CASE WHEN OLD.remaining_estimate IS NULL THEN NULL ELSE OLD.remaining_estimate::text END,
                CASE WHEN NEW.remaining_estimate IS NULL THEN NULL ELSE NEW.remaining_estimate::text END,
                NULL,
                CURRENT_TIMESTAMP,
                'UPDATE',
                'DB_TRIGGER'
            );
        END IF;

        /* ai_metadata */
        IF NEW.ai_metadata IS DISTINCT FROM OLD.ai_metadata THEN
            INSERT INTO task_history (
                task_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type, source, metadata
            )
            VALUES (
                NEW.id,
                'ai_metadata',
                OLD.ai_metadata::text,
                NEW.ai_metadata::text,
                NULL,
                CURRENT_TIMESTAMP,
                'UPDATE',
                'DB_TRIGGER',
                NEW.ai_metadata
            );
        END IF;

        /* source_communication_id */
        IF NEW.source_communication_id IS DISTINCT FROM OLD.source_communication_id THEN
            INSERT INTO task_history (
                task_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type, source
            )
            VALUES (
                NEW.id,
                'source_communication_id',
                CASE WHEN OLD.source_communication_id IS NULL THEN NULL ELSE OLD.source_communication_id::text END,
                CASE WHEN NEW.source_communication_id IS NULL THEN NULL ELSE NEW.source_communication_id::text END,
                NULL,
                CURRENT_TIMESTAMP,
                'UPDATE',
                'DB_TRIGGER'
            );
        END IF;

        /* confidence_score */
        IF NEW.confidence_score IS DISTINCT FROM OLD.confidence_score THEN
            INSERT INTO task_history (
                task_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type, source
            )
            VALUES (
                NEW.id,
                'confidence_score',
                CASE WHEN OLD.confidence_score IS NULL THEN NULL ELSE OLD.confidence_score::text END,
                CASE WHEN NEW.confidence_score IS NULL THEN NULL ELSE NEW.confidence_score::text END,
                NULL,
                CURRENT_TIMESTAMP,
                'UPDATE',
                'DB_TRIGGER'
            );
        END IF;

        /* extracted_context */
        IF NEW.extracted_context IS DISTINCT FROM OLD.extracted_context THEN
            INSERT INTO task_history (
                task_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type, source
            )
            VALUES (
                NEW.id,
                'extracted_context',
                OLD.extracted_context,
                NEW.extracted_context,
                NULL,
                CURRENT_TIMESTAMP,
                'UPDATE',
                'DB_TRIGGER'
            );
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger that binds fn_track_task_changes to tasks table for auditing
CREATE TRIGGER track_task_changes
AFTER UPDATE
ON tasks
FOR EACH ROW
EXECUTE PROCEDURE fn_track_task_changes();

/*
================================================================================
 End of 00002_task_tables.sql
================================================================================
*/