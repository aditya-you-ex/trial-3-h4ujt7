/*
===============================================================================
 TaskStream AI - Test Data Seed Script
-----------------------------------------------------------------------------
 This SQL file populates the database with comprehensive test data for
 development and testing environments. It provides sample users, teams,
 projects, tasks (with various dependencies, attachments, tags, and comments),
 and analytics data (performance_metrics, resource_metrics, predictive_metrics)
 in alignment with the schema definitions introduced by the migration files:
   - 00001_initial_schema.sql
   - 00002_task_tables.sql
   - 00003_analytics_tables.sql

 Requirements Addressed:
  - Test Data Generation (see Technical Specifications/2.5.1)
  - Data Schema Validation (see Technical Specifications/3.2 Database Design)

 Imports Referenced:
  - users, teams, projects, tasks, etc. from 00001_initial_schema.sql
  - task_dependencies, task_attachments, task_tags from 00002_task_tables.sql
  - performance_metrics, resource_metrics, predictive_metrics from 00003_analytics_tables.sql

 Globals Used:
  - TEST_ADMIN_EMAIL             = 'admin@taskstream.test'
  - TEST_USER_PASSWORD_HASH      = '$2b$10$TestHashForDevelopment'

 Exports Provided:
  - test_users (named data):
      admin_user (user_record)
      test_team  (team_record)

===============================================================================
*/

/*------------------------------------------------------------------------------
 NOTE: This script creates four core functions to insert data:
   1) create_test_users()
   2) create_test_projects()
   3) create_test_tasks()
   4) create_test_analytics()

 After definition, each function is invoked to populate the database. If you
 want to rerun, ensure you remove or modify existing records to avoid conflicts.
------------------------------------------------------------------------------*/

/*------------------------------------------------------------------------------
  FUNCTION: create_test_users
  Inserts multiple users with different roles, plus a special admin user and
  a single test team. Also inserts team_members records to associate them.
  Exports:
    - admin_user: ID '00000000-0000-0000-0000-000000000001'
    - test_team:  ID '00000000-0000-0000-0000-000000000010'
------------------------------------------------------------------------------*/
CREATE OR REPLACE FUNCTION create_test_users()
RETURNS void AS
$$
DECLARE
    v_admin_id   UUID := '00000000-0000-0000-0000-000000000001';
    v_team_id    UUID := '00000000-0000-0000-0000-000000000010';
    v_team_name  TEXT := 'Test Team';
    -- We'll insert a total of 20 users:
    --   1 Admin, 2 Project Managers, 3 Team Leads, 10 Developers, 4 Viewers
    v_idx INT;
BEGIN
    -- Insert the Admin user with stable ID
    INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at)
    VALUES (
       v_admin_id,
       'admin@taskstream.test',
       '$2b$10$TestHashForDevelopment',
       'System',
       'Administrator',
       'ADMIN',
       TRUE,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
    )
    ON CONFLICT (email) DO NOTHING;

    -- Insert additional users
    -- For simplicity, we use placeholder emails and a single password hash
    -- All user inserts use the same password hash for test convenience
    -- (A real environment might generate unique hashes)
    -- 2 Project Managers
    FOR v_idx IN 1..2 LOOP
        INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
        VALUES (
            CONCAT('pm', v_idx, '@taskstream.test'),
            '$2b$10$TestHashForDevelopment',
            CONCAT('Project', v_idx),
            'Manager',
            'PROJECT_MANAGER',
            TRUE
        ) ON CONFLICT (email) DO NOTHING;
    END LOOP;

    -- 3 Team Leads
    FOR v_idx IN 1..3 LOOP
        INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
        VALUES (
            CONCAT('lead', v_idx, '@taskstream.test'),
            '$2b$10$TestHashForDevelopment',
            CONCAT('TeamLead', v_idx),
            'LastName',
            'TEAM_LEAD',
            TRUE
        ) ON CONFLICT (email) DO NOTHING;
    END LOOP;

    -- 10 Developers
    FOR v_idx IN 1..10 LOOP
        INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
        VALUES (
            CONCAT('dev', v_idx, '@taskstream.test'),
            '$2b$10$TestHashForDevelopment',
            CONCAT('Dev', v_idx),
            'Engineer',
            'DEVELOPER',
            TRUE
        ) ON CONFLICT (email) DO NOTHING;
    END LOOP;

    -- 4 Viewers
    FOR v_idx IN 1..4 LOOP
        INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
        VALUES (
            CONCAT('viewer', v_idx, '@taskstream.test'),
            '$2b$10$TestHashForDevelopment',
            CONCAT('Viewer', v_idx),
            'Observer',
            'VIEWER',
            TRUE
        ) ON CONFLICT (email) DO NOTHING;
    END LOOP;

    -- Insert a test team (exported as 'test_team')
    INSERT INTO teams (id, name, description, created_by)
    VALUES (
        v_team_id,
        v_team_name,
        'Primary team for integration tests',
        v_admin_id
    )
    ON CONFLICT (id) DO NOTHING;

    -- Add some members to the test team
    -- We'll add the admin user plus a few random developers
    INSERT INTO team_members (team_id, user_id, role)
    SELECT v_team_id, u.id, 'CORE_MEMBER'
    FROM users u
    WHERE u.email IN (
       'admin@taskstream.test', -- admin
       'dev1@taskstream.test',
       'dev2@taskstream.test',
       'lead1@taskstream.test'
    )
    ON CONFLICT (team_id, user_id) DO NOTHING;

END;
$$ LANGUAGE plpgsql;


/*------------------------------------------------------------------------------
  FUNCTION: create_test_projects
  Creates 10 sample projects with varying statuses. Ties half of them to the
  test team. The other half do not belong to the test team (for variety).
  Each project references a random user as creator.
------------------------------------------------------------------------------*/
CREATE OR REPLACE FUNCTION create_test_projects()
RETURNS void AS
$$
DECLARE
    v_id          UUID;
    v_idx         INT;
    v_statuses    TEXT[] := ARRAY['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'];
    v_random_user UUID;
    v_team_id     UUID := '00000000-0000-0000-0000-000000000010';
    v_creator_ids UUID[];
    v_rand_index  INT;
BEGIN
    -- Gather a list of possible creators from users table
    SELECT array_agg(id) INTO v_creator_ids FROM users WHERE role <> 'VIEWER';

    FOR v_idx IN 1..10 LOOP
        v_rand_index := 1 + floor(random() * (array_length(v_creator_ids,1))::numeric)::INT;
        v_random_user := v_creator_ids[v_rand_index];
        v_id := gen_random_uuid();

        INSERT INTO projects (
            id,
            name,
            description,
            status,
            start_date,
            end_date,
            team_id,
            created_by
        )
        VALUES (
            v_id,
            CONCAT('Project #', v_idx),
            CONCAT('Automatically generated project #', v_idx),
            v_statuses[(v_idx % array_length(v_statuses,1)) + 1],
            CURRENT_DATE + (v_idx * INTERVAL '1 day'),
            CURRENT_DATE + ((v_idx + 20) * INTERVAL '1 day'),
            CASE
                WHEN v_idx <= 5 THEN v_team_id
                ELSE NULL
            END,
            v_random_user
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;


/*------------------------------------------------------------------------------
  FUNCTION: create_test_tasks
  Inserts ~100 tasks spread across the 10 projects. Generates tasks in multiple
  statuses and priorities. Also creates dependencies (including a circular
  case), subtasks, attachments, tags, and comments. Demonstrates usage of the
  new columns introduced in 00002_task_tables.sql.

  Features:
    - Backlog, TODO, IN_PROGRESS, IN_REVIEW, DONE statuses
    - HIGH, MEDIUM, LOW priorities
    - Circular dependencies, complex chains
    - Subtask hierarchies
    - Template-based tasks
    - Attachments, tags, comments
    - AI metadata
------------------------------------------------------------------------------*/
CREATE OR REPLACE FUNCTION create_test_tasks()
RETURNS void AS
$$
DECLARE
    v_projects    UUID[];
    v_tasks       UUID[];
    v_idx         INT;
    v_task_id     UUID;
    v_project_id  UUID;
    v_assignee_id UUID;
    v_statuses    TEXT[] := ARRAY['BACKLOG','TODO','IN_PROGRESS','IN_REVIEW','DONE'];
    v_priorities  TEXT[] := ARRAY['HIGH','MEDIUM','LOW'];
    v_users       UUID[];
    v_rand_user   INT;
    v_rand_status INT;
    v_rand_prio   INT;
    v_circular1   UUID;
    v_circular2   UUID;
    v_circular3   UUID;
    v_subparent   UUID;
    v_tmpl_task   UUID;
BEGIN
    -- Get a list of project IDs
    SELECT array_agg(id) INTO v_projects FROM projects;

    -- Get a list of user IDs (assignees)
    SELECT array_agg(id) INTO v_users FROM users WHERE role in ('ADMIN','PROJECT_MANAGER','TEAM_LEAD','DEVELOPER');

    -- Insert ~100 tasks
    FOR v_idx IN 1..100 LOOP
        v_task_id := gen_random_uuid();
        v_project_id := v_projects[1 + floor(random()*(array_length(v_projects,1))::numeric)::INT];
        v_rand_user := 1 + floor(random()*(array_length(v_users,1))::numeric)::INT;
        v_assignee_id := v_users[v_rand_user];
        v_rand_status := 1 + floor(random()*(array_length(v_statuses,1))::numeric)::INT;
        v_rand_prio := 1 + floor(random()*(array_length(v_priorities,1))::numeric)::INT;

        INSERT INTO tasks (
            id, project_id, title, description, status, priority,
            assignee_id, due_date, created_by, ai_metadata,
            created_at, updated_at
        )
        VALUES (
            v_task_id,
            v_project_id,
            CONCAT('Task #', v_idx),
            CONCAT('Description for task #', v_idx),
            v_statuses[v_rand_status],
            v_priorities[v_rand_prio],
            v_assignee_id,
            CURRENT_TIMESTAMP + ((v_idx % 15) * INTERVAL '1 day'),
            v_assignee_id,
            jsonb_build_object('source','test_seed','detail','Mock AI data for demonstration'),
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- For demonstration, retrieve the IDs of the newly inserted tasks
    SELECT array_agg(id) INTO v_tasks FROM tasks;

    /*
     TASK DEPENDENCIES
     Create a complex chain (1->2->3->4->5) and a circular set (6->7->8->6).
     We'll assume the first 8 tasks in v_tasks exist.
    */
    IF array_length(v_tasks,1) >= 8 THEN
        /* chain 1->2->3->4->5 */
        INSERT INTO task_dependencies (task_id, dependency_id, dependency_type, created_by)
        VALUES
            (v_tasks[2], v_tasks[1], 'BLOCKED_BY', v_users[1]),
            (v_tasks[3], v_tasks[2], 'BLOCKED_BY', v_users[1]),
            (v_tasks[4], v_tasks[3], 'BLOCKED_BY', v_users[1]),
            (v_tasks[5], v_tasks[4], 'BLOCKED_BY', v_users[1])
        ON CONFLICT DO NOTHING;

        /*
          circular 6->7->8->6
          Note: We'll store them in local variables for clarity and re-insert.
        */
        v_circular1 := v_tasks[6];
        v_circular2 := v_tasks[7];
        v_circular3 := v_tasks[8];

        INSERT INTO task_dependencies (task_id, dependency_id, dependency_type, created_by)
        VALUES
            (v_circular1, v_circular2, 'BLOCKS', v_users[1]),
            (v_circular2, v_circular3, 'BLOCKS', v_users[1]),
            (v_circular3, v_circular1, 'BLOCKS', v_users[1])
        ON CONFLICT DO NOTHING;
    END IF;

    /*
      SUBTASK HIERARCHIES
      We'll pick tasks #9 as a parent and #10, #11, #12 as children,
      if available
    */
    IF array_length(v_tasks,1) >= 12 THEN
        v_subparent := v_tasks[9];
        UPDATE tasks SET parent_id = v_subparent WHERE id = v_tasks[10];
        UPDATE tasks SET parent_id = v_subparent WHERE id = v_tasks[11];
        UPDATE tasks SET parent_id = v_subparent WHERE id = v_tasks[12];
    END IF;

    /*
      TEMPLATE-BASED TASK
      We'll pick tasks[13] as a template, and tasks[14] references it.
    */
    IF array_length(v_tasks,1) >= 14 THEN
        v_tmpl_task := v_tasks[13];
        UPDATE tasks SET is_template = TRUE WHERE id = v_tmpl_task;
        UPDATE tasks SET template_id = v_tmpl_task WHERE id = v_tasks[14];
    END IF;

    /*
      ATTACHMENTS
      We'll add a few attachments to tasks #1 through #5, if they exist
    */
    IF array_length(v_tasks,1) >= 5 THEN
        INSERT INTO task_attachments (
            task_id, file_name, file_type, file_size, storage_path, uploaded_by
        )
        SELECT v_tasks[i], CONCAT('MockFile_', i, '.pdf'), 'PDF', 1024*i,
               CONCAT('/mock/path/task_', i, '_file.pdf'), v_users[1]
        FROM generate_series(1,5) as gs(i)
        ON CONFLICT DO NOTHING;
    END IF;

    /*
      TAGS
      We'll add simple tags to tasks[1..5] also
    */
    IF array_length(v_tasks,1) >= 5 THEN
        INSERT INTO task_tags (task_id, tag_name, created_by, color, description)
        SELECT v_tasks[i], CONCAT('tag_', i), v_users[2], '#FF00FF', 'Sample generated tag'
        FROM generate_series(1,5) as gs(i)
        ON CONFLICT DO NOTHING;
    END IF;

    /*
      COMMENTS
      We'll add a single comment to tasks[1..3]
    */
    IF array_length(v_tasks,1) >= 3 THEN
        INSERT INTO task_comments (task_id, user_id, content)
        VALUES
            (v_tasks[1], v_users[1], 'Initial comment on Task #1'),
            (v_tasks[2], v_users[2], 'Another comment on Task #2'),
            (v_tasks[3], v_users[3], 'Detailed remark on Task #3')
        ON CONFLICT DO NOTHING;
    END IF;

END;
$$ LANGUAGE plpgsql;


/*------------------------------------------------------------------------------
  FUNCTION: create_test_analytics
  Generates comprehensive analytics data in the tables:
    - performance_metrics
    - resource_metrics
    - predictive_metrics

  Includes time-series inserts, varied resource usage, anomaly patterns,
  predictive model data with confidence scores, etc.
------------------------------------------------------------------------------*/
CREATE OR REPLACE FUNCTION create_test_analytics()
RETURNS void AS
$$
DECLARE
    v_tasks   UUID[];
    v_idx     INT;
    v_period  INT;
    v_value   DOUBLE PRECISION;
    v_entity  UUID;
    v_rand    DOUBLE PRECISION;
    v_anomaly BOOLEAN;
    v_user    UUID;
    v_models  TEXT[] := ARRAY['v1.0', 'v1.1', 'v2.0'];
    v_predtypes TEXT[] := ARRAY['COMPLETION_TIME','RESOURCE_NEEDS','RISK_LEVEL','BOTTLENECK_PROBABILITY'];
    v_predconf TEXT[] := ARRAY['HIGH','MEDIUM','LOW'];
BEGIN
    -- Gather tasks as potential analytics entities
    SELECT array_agg(id) INTO v_tasks FROM tasks;
    IF v_tasks IS NULL OR array_length(v_tasks,1) < 1 THEN
        RAISE NOTICE 'No tasks found. create_test_analytics will do nothing.';
        RETURN;
    END IF;

    -- We'll link performance_metrics for each task across 12 time periods
    -- (e.g., monthly or daily), injecting occasional anomalies
    FOR v_idx IN 1..array_length(v_tasks,1) LOOP
        v_entity := v_tasks[v_idx];
        v_user := (SELECT id FROM users ORDER BY random() LIMIT 1);

        FOR v_period IN 1..12 LOOP
            -- Introduce a random spike or drop to emulate anomalies
            v_rand := random();
            v_anomaly := (v_period = 6 AND (v_rand > 0.5));

            IF v_anomaly THEN
               v_value := 50 + (random() * 200); -- big spike
            ELSE
               v_value := 10 + (random() * 40);  -- normal range
            END IF;

            INSERT INTO performance_metrics (
                id, metric_type, metric_category, entity_id, value, metadata,
                recorded_at, created_by
            )
            VALUES (
                gen_random_uuid(),
                'CycleTime',
                'TaskPerformance',
                v_entity,
                v_value,
                jsonb_build_object('period', v_period, 'potential_anomaly', v_anomaly),
                CURRENT_TIMESTAMP - ((12 - v_period) * INTERVAL '7 days'),
                v_user
            )
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;

    -- For resource_metrics, we track CPU usage. We'll do 5 random inserts per task.
    FOR v_idx IN 1..array_length(v_tasks,1) LOOP
        v_entity := v_tasks[v_idx];
        FOR v_period IN 1..5 LOOP
            INSERT INTO resource_metrics (
                id, resource_id, resource_category, metric_type, utilization_type,
                value, recorded_at, metadata
            )
            VALUES (
                gen_random_uuid(),
                v_entity,
                'TaskResource',
                'UtilizationCheck',
                'CPU',
                50 + (random() * 50),
                CURRENT_TIMESTAMP - (v_period * INTERVAL '5 days'),
                jsonb_build_object('note','CPU usage test data')
            )
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;

    -- For predictive_metrics, we'll generate 2 predictions per task
    FOR v_idx IN 1..array_length(v_tasks,1) LOOP
        v_entity := v_tasks[v_idx];
        INSERT INTO predictive_metrics (
            id, prediction_type, target_entity, predicted_value, model_version,
            confidence_score, feature_importance, prediction_interval_lower,
            prediction_interval_upper, validation_metrics
        )
        VALUES (
            gen_random_uuid(),
            v_predtypes[1 + floor(random()*(array_length(v_predtypes,1))::numeric)::INT],
            v_entity,
            10 + (random() * 90),
            v_models[1 + floor(random()*(array_length(v_models,1))::numeric)::INT],
            CASE
                WHEN random() < 0.3 THEN 0.95
                WHEN random() < 0.6 THEN 0.80
                ELSE 0.65
            END,
            jsonb_build_object('featureA', random(), 'featureB', random()),
            5 + (random() * 5),
            95 + (random() * 5),
            jsonb_build_object('accuracy', 0.9 + (random()*0.1), 'confidence_level', v_predconf[1 + floor(random()*3)::INT])
        )
        ON CONFLICT DO NOTHING;

        INSERT INTO predictive_metrics (
            id, prediction_type, target_entity, predicted_value, model_version,
            confidence_score, feature_importance, prediction_interval_lower,
            prediction_interval_upper, validation_metrics
        )
        VALUES (
            gen_random_uuid(),
            v_predtypes[1 + floor(random()*(array_length(v_predtypes,1))::numeric)::INT],
            v_entity,
            10 + (random() * 90),
            v_models[1 + floor(random()*(array_length(v_models,1))::numeric)::INT],
            CASE
                WHEN random() < 0.3 THEN 0.98
                WHEN random() < 0.6 THEN 0.70
                ELSE 0.60
            END,
            jsonb_build_object('featureC', random(), 'featureD', random()),
            3 + (random() * 7),
            90 + (random() * 10),
            jsonb_build_object('accuracy', 0.8 + (random()*0.2), 'confidence_level', v_predconf[1 + floor(random()*3)::INT])
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;


/*------------------------------------------------------------------------------
  EXECUTE ALL DATA SEEDING FUNCTIONS
------------------------------------------------------------------------------*/
BEGIN;

SELECT create_test_users();
SELECT create_test_projects();
SELECT create_test_tasks();
SELECT create_test_analytics();

COMMIT;

/*------------------------------------------------------------------------------
 EXPORT DECLARATION (for integration tests or references)
   test_users:
     admin_user => '00000000-0000-0000-0000-000000000001'
     test_team  => '00000000-0000-0000-0000-000000000010'
------------------------------------------------------------------------------*/