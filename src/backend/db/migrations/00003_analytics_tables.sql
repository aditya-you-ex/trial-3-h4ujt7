/*
===============================================================================
TaskStream AI - Analytics Database Migration (Version 3)
-------------------------------------------------------------------------------
Dependencies:
    - 00001_initial_schema.sql  (Base schema with 'users' table)
    - 00002_task_tables.sql     (Task, project, and related tables)
Description:
    This SQL migration creates and configures advanced analytics tables and
    functions for storing performance metrics, resource utilization data,
    predictive analytics results, and aggregated metrics. It includes partitioning,
    rolling window aggregations, retention policies, model versioning triggers,
    and materialized view support for real-time insight.
Schema Version:
    ANALYTICS_SCHEMA_VERSION = 3
===============================================================================
*/

/*------------------------------------------------------------------------------
  1. ADDITIONAL ENUM TYPES (if not already created)
     Defining an enum for resource utilization to classify CPU, MEMORY, etc.
------------------------------------------------------------------------------*/
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_namespace n ON t.typnamespace = n.oid
        WHERE t.typname = 'resource_utilization_type'
          AND n.nspname = 'public'
    ) THEN
        CREATE TYPE resource_utilization_type AS ENUM (
            'CPU',
            'MEMORY',
            'STORAGE',
            'NETWORK'
        );
    END IF;
END
$$;

/*------------------------------------------------------------------------------
  2. TABLE: performance_metrics
     Stores performance-related metrics referencing tasks, including category,
     metric type, numeric value, JSONB metadata, partitioned by monthly range
     on recorded_at. Supports composite indexing, foreign keys, and an audit
     trigger for changes.
------------------------------------------------------------------------------*/
CREATE TABLE IF NOT EXISTS performance_metrics (
    id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_type     VARCHAR(100) NOT NULL,
    metric_category VARCHAR(100) NOT NULL,
    entity_id       uuid NOT NULL,
    value           DOUBLE PRECISION NOT NULL,
    metadata        JSONB,
    recorded_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by      uuid REFERENCES users(id) ON DELETE SET NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
PARTITION BY RANGE (recorded_at);

/* Optional: Enforce a foreign key for entity_id referencing tasks. Adjust
   if performance_metrics can track other entities. For demonstration, we
   reference tasks with cascade. */
ALTER TABLE performance_metrics
    ADD CONSTRAINT fk_perf_entity_task
    FOREIGN KEY (entity_id)
    REFERENCES tasks(id)
    ON DELETE CASCADE;

/* Create at least one default partition to catch all out-of-range data. */
CREATE TABLE IF NOT EXISTS performance_metrics_default
    PARTITION OF performance_metrics
    FOR VALUES FROM (MINVALUE) TO (MAXVALUE);

/* Example monthly partition (January 2023). In production, partitions
   would be created per month/year as needed. */
CREATE TABLE IF NOT EXISTS performance_metrics_2023_01
    PARTITION OF performance_metrics
    FOR VALUES FROM ('2023-01-01') TO ('2023-02-01');

/* Composite index on entity_id, metric_type, and recorded_at for faster queries */
CREATE INDEX IF NOT EXISTS idx_performance_metrics_composite
    ON performance_metrics USING btree (entity_id, metric_type, recorded_at);

/* ===================== AUDIT LOG FOR PERFORMANCE_METRICS ==================== */
/* Auxiliary table to store audit trails for changes in performance_metrics */
CREATE TABLE IF NOT EXISTS performance_metrics_history (
    id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    performance_id  uuid NOT NULL,
    field_name      VARCHAR(100) NOT NULL,
    old_value       TEXT,
    new_value       TEXT,
    changed_by      uuid REFERENCES users(id) ON DELETE SET NULL,
    changed_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    change_type     VARCHAR(50) NOT NULL,
    metadata        JSONB
);

CREATE INDEX IF NOT EXISTS idx_perf_history_perf_id
    ON performance_metrics_history (performance_id);

CREATE INDEX IF NOT EXISTS idx_perf_history_changed_at
    ON performance_metrics_history (changed_at);

/* Function to audit changes in performance_metrics */
CREATE OR REPLACE FUNCTION fn_performance_metrics_audit()
RETURNS TRIGGER AS
$$
DECLARE
    col TEXT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        /* For each column in NEW, compare with OLD. If different, insert a history row. */

        IF NEW.metric_type IS DISTINCT FROM OLD.metric_type THEN
            INSERT INTO performance_metrics_history (
                performance_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type
            )
            VALUES (
                NEW.id, 'metric_type', OLD.metric_type, NEW.metric_type, NEW.created_by,
                CURRENT_TIMESTAMP, 'UPDATE'
            );
        END IF;

        IF NEW.metric_category IS DISTINCT FROM OLD.metric_category THEN
            INSERT INTO performance_metrics_history (
                performance_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type
            )
            VALUES (
                NEW.id, 'metric_category', OLD.metric_category, NEW.metric_category,
                NEW.created_by, CURRENT_TIMESTAMP, 'UPDATE'
            );
        END IF;

        IF NEW.entity_id IS DISTINCT FROM OLD.entity_id THEN
            INSERT INTO performance_metrics_history (
                performance_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type
            )
            VALUES (
                NEW.id, 'entity_id', OLD.entity_id::text, NEW.entity_id::text,
                NEW.created_by, CURRENT_TIMESTAMP, 'UPDATE'
            );
        END IF;

        IF NEW.value IS DISTINCT FROM OLD.value THEN
            INSERT INTO performance_metrics_history (
                performance_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type
            )
            VALUES (
                NEW.id, 'value', OLD.value::text, NEW.value::text,
                NEW.created_by, CURRENT_TIMESTAMP, 'UPDATE'
            );
        END IF;

        IF NEW.metadata IS DISTINCT FROM OLD.metadata THEN
            INSERT INTO performance_metrics_history (
                performance_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type, metadata
            )
            VALUES (
                NEW.id, 'metadata', OLD.metadata::text, NEW.metadata::text,
                NEW.created_by, CURRENT_TIMESTAMP, 'UPDATE', NEW.metadata
            );
        END IF;

        IF NEW.recorded_at IS DISTINCT FROM OLD.recorded_at THEN
            INSERT INTO performance_metrics_history (
                performance_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type
            )
            VALUES (
                NEW.id, 'recorded_at', OLD.recorded_at::text, NEW.recorded_at::text,
                NEW.created_by, CURRENT_TIMESTAMP, 'UPDATE'
            );
        END IF;

        IF NEW.updated_at IS DISTINCT FROM OLD.updated_at THEN
            INSERT INTO performance_metrics_history (
                performance_id, field_name, old_value, new_value, changed_by,
                changed_at, change_type
            )
            VALUES (
                NEW.id, 'updated_at', OLD.updated_at::text, NEW.updated_at::text,
                NEW.created_by, CURRENT_TIMESTAMP, 'UPDATE'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

/* Trigger to link fn_performance_metrics_audit to performance_metrics table */
CREATE TRIGGER trg_performance_metrics_audit
AFTER UPDATE
ON performance_metrics
FOR EACH ROW
EXECUTE PROCEDURE fn_performance_metrics_audit();

/*------------------------------------------------------------------------------
  3. TABLE: resource_metrics
     Tracks resource utilization (CPU, MEMORY, STORAGE, NETWORK) with rolling
     aggregations and a retention policy for older data. Utilization value
     must be within 0-100. A function updates a rolling 7-day avg; another
     function enforces data retention. Indexes optimized for time-series queries.
------------------------------------------------------------------------------*/
CREATE TABLE IF NOT EXISTS resource_metrics (
    id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id       uuid NOT NULL,
    resource_category VARCHAR(100) NOT NULL,
    metric_type       VARCHAR(100) NOT NULL,
    utilization_type  resource_utilization_type NOT NULL,
    value             DOUBLE PRECISION NOT NULL CHECK (value >= 0 AND value <= 100),
    recorded_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata          JSONB
);

/* For simplicity, reference tasks as the 'resource_id' if desired. Adjust as needed. */
ALTER TABLE resource_metrics
    ADD CONSTRAINT fk_resource_task
    FOREIGN KEY (resource_id)
    REFERENCES tasks(id)
    ON DELETE CASCADE;

/* Index to speed time-series queries (descending sort often used) */
CREATE INDEX IF NOT EXISTS idx_resource_metrics_time
    ON resource_metrics (recorded_at DESC);

/* Add an index for resource_id, resource_category, metric_type. */
CREATE INDEX IF NOT EXISTS idx_resource_metrics_composite
    ON resource_metrics (resource_id, resource_category, metric_type);

/* Optionally store a rolling 7-day average in an additional column. */
ALTER TABLE resource_metrics
    ADD COLUMN rolling_7d_avg DOUBLE PRECISION DEFAULT 0.0;

/* Rolling window function to recalc the 7-day average upon insert. */
CREATE OR REPLACE FUNCTION fn_resource_metrics_rolling_agg()
RETURNS TRIGGER AS
$$
BEGIN
    /*
      On each INSERT, calculate a 7-day average for the same resource_id
      and utilization_type from current_timestamp - 7 days to now,
      then update the new row's rolling_7d_avg column.
    */
    IF TG_OP = 'INSERT' THEN
        UPDATE resource_metrics
        SET rolling_7d_avg = (
            SELECT AVG(rm2.value)
            FROM resource_metrics rm2
            WHERE rm2.resource_id = NEW.resource_id
              AND rm2.utilization_type = NEW.utilization_type
              AND rm2.recorded_at >= (NEW.recorded_at - INTERVAL '7 days')
              AND rm2.recorded_at <= NEW.recorded_at
        )
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

/* Trigger binding for rolling window function. */
CREATE TRIGGER trg_resource_metrics_rolling_agg
AFTER INSERT
ON resource_metrics
FOR EACH ROW
EXECUTE PROCEDURE fn_resource_metrics_rolling_agg();

/* Retention policy function (example: remove data older than 365 days). */
CREATE OR REPLACE FUNCTION fn_resource_metrics_retention()
RETURNS TRIGGER AS
$$
BEGIN
    /*
      This approach removes older data whenever a new row is inserted.
      For large-scale systems, using a scheduled job or partition strategy
      is generally more efficient than an on-insert trigger.
    */
    PERFORM
        /* Remove records older than 365 days for same resource_category/metric_type */
        (DELETE FROM resource_metrics
         WHERE recorded_at < (NEW.recorded_at - INTERVAL '365 days')
           AND resource_category = NEW.resource_category
           AND metric_type = NEW.metric_type);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

/* Trigger to enforce the retention policy after each insert. */
CREATE TRIGGER trg_resource_metrics_retention
AFTER INSERT
ON resource_metrics
FOR EACH ROW
EXECUTE PROCEDURE fn_resource_metrics_retention();

/*------------------------------------------------------------------------------
  4. TABLE: predictive_metrics
     Stores ML predictions, including intervals, confidence scores, feature
     importance JSON, and model versioning. Also includes a trigger for tracking
     version changes in a history table.
------------------------------------------------------------------------------*/
CREATE TABLE IF NOT EXISTS predictive_metrics (
    id                       uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    prediction_type          VARCHAR(100) NOT NULL,
    target_entity            uuid NOT NULL,
    predicted_value          DOUBLE PRECISION NOT NULL,
    model_version            VARCHAR(50) NOT NULL,
    confidence_score         DOUBLE PRECISION NOT NULL,
    feature_importance       JSONB,
    prediction_interval_lower DOUBLE PRECISION,
    prediction_interval_upper DOUBLE PRECISION,
    validation_metrics       JSONB,
    recorded_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

/* For simplicity, reference tasks as the 'target_entity' if applicable. */
ALTER TABLE predictive_metrics
    ADD CONSTRAINT fk_predictive_entity_task
    FOREIGN KEY (target_entity)
    REFERENCES tasks(id)
    ON DELETE CASCADE;

/* Indexes on target_entity and prediction_type for quick lookups. */
CREATE INDEX IF NOT EXISTS idx_predictive_metrics_entity_type
    ON predictive_metrics (target_entity, prediction_type);

/* A small history table for model version changes (or any changes if desired). */
CREATE TABLE IF NOT EXISTS predictive_metrics_history (
    id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    predictive_id         uuid NOT NULL,
    field_name            VARCHAR(100) NOT NULL,
    old_value             TEXT,
    new_value             TEXT,
    changed_at            TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    change_type           VARCHAR(50) NOT NULL,
    metadata              JSONB
);

CREATE INDEX IF NOT EXISTS idx_predictive_metrics_history_id
    ON predictive_metrics_history (predictive_id);

/* Model versioning trigger function to record changes, especially model_version. */
CREATE OR REPLACE FUNCTION fn_predictive_metrics_versioning()
RETURNS TRIGGER AS
$$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        /* Check updates to model_version or other columns. */
        IF NEW.model_version IS DISTINCT FROM OLD.model_version THEN
            INSERT INTO predictive_metrics_history (
                predictive_id, field_name, old_value, new_value,
                changed_at, change_type
            )
            VALUES (
                NEW.id, 'model_version', OLD.model_version, NEW.model_version,
                CURRENT_TIMESTAMP, 'VERSION_UPDATE'
            );
        END IF;

        IF NEW.prediction_type IS DISTINCT FROM OLD.prediction_type THEN
            INSERT INTO predictive_metrics_history (
                predictive_id, field_name, old_value, new_value,
                changed_at, change_type
            )
            VALUES (
                NEW.id, 'prediction_type', OLD.prediction_type, NEW.prediction_type,
                CURRENT_TIMESTAMP, 'UPDATE'
            );
        END IF;

        IF NEW.target_entity IS DISTINCT FROM OLD.target_entity THEN
            INSERT INTO predictive_metrics_history (
                predictive_id, field_name, old_value, new_value,
                changed_at, change_type
            )
            VALUES (
                NEW.id, 'target_entity', OLD.target_entity::text, NEW.target_entity::text,
                CURRENT_TIMESTAMP, 'UPDATE'
            );
        END IF;

        IF NEW.predicted_value IS DISTINCT FROM OLD.predicted_value THEN
            INSERT INTO predictive_metrics_history (
                predictive_id, field_name, old_value, new_value,
                changed_at, change_type
            )
            VALUES (
                NEW.id, 'predicted_value', OLD.predicted_value::text, NEW.predicted_value::text,
                CURRENT_TIMESTAMP, 'UPDATE'
            );
        END IF;

        IF NEW.confidence_score IS DISTINCT FROM OLD.confidence_score THEN
            INSERT INTO predictive_metrics_history (
                predictive_id, field_name, old_value, new_value,
                changed_at, change_type
            )
            VALUES (
                NEW.id, 'confidence_score', OLD.confidence_score::text, NEW.confidence_score::text,
                CURRENT_TIMESTAMP, 'UPDATE'
            );
        END IF;

        IF NEW.feature_importance IS DISTINCT FROM OLD.feature_importance THEN
            INSERT INTO predictive_metrics_history (
                predictive_id, field_name, old_value, new_value,
                changed_at, change_type, metadata
            )
            VALUES (
                NEW.id, 'feature_importance', OLD.feature_importance::text,
                NEW.feature_importance::text, CURRENT_TIMESTAMP, 'UPDATE', NEW.feature_importance
            );
        END IF;

        IF NEW.prediction_interval_lower IS DISTINCT FROM OLD.prediction_interval_lower THEN
            INSERT INTO predictive_metrics_history (
                predictive_id, field_name, old_value, new_value,
                changed_at, change_type
            )
            VALUES (
                NEW.id, 'prediction_interval_lower',
                OLD.prediction_interval_lower::text,
                NEW.prediction_interval_lower::text,
                CURRENT_TIMESTAMP, 'UPDATE'
            );
        END IF;

        IF NEW.prediction_interval_upper IS DISTINCT FROM OLD.prediction_interval_upper THEN
            INSERT INTO predictive_metrics_history (
                predictive_id, field_name, old_value, new_value,
                changed_at, change_type
            )
            VALUES (
                NEW.id, 'prediction_interval_upper',
                OLD.prediction_interval_upper::text,
                NEW.prediction_interval_upper::text,
                CURRENT_TIMESTAMP, 'UPDATE'
            );
        END IF;

        IF NEW.validation_metrics IS DISTINCT FROM OLD.validation_metrics THEN
            INSERT INTO predictive_metrics_history (
                predictive_id, field_name, old_value, new_value,
                changed_at, change_type, metadata
            )
            VALUES (
                NEW.id, 'validation_metrics', OLD.validation_metrics::text,
                NEW.validation_metrics::text, CURRENT_TIMESTAMP, 'UPDATE', NEW.validation_metrics
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

/* Trigger to attach versioning function to predictive_metrics table. */
CREATE TRIGGER trg_predictive_metrics_versioning
AFTER UPDATE
ON predictive_metrics
FOR EACH ROW
EXECUTE PROCEDURE fn_predictive_metrics_versioning();

/*------------------------------------------------------------------------------
  5. TABLE: metric_aggregations
     Stores aggregated metric values for designated periods. Includes materialized
     views, real-time refresh triggers, retention policy, and validation checks.
------------------------------------------------------------------------------*/
CREATE TABLE IF NOT EXISTS metric_aggregations (
    id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_id        uuid NOT NULL,
    period_type      VARCHAR(50) NOT NULL,
    aggregated_value DOUBLE PRECISION NOT NULL,
    period_start     TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end       TIMESTAMP WITH TIME ZONE NOT NULL
);

/* For demonstration, link metric_id to performance_metrics. Adjust if needed
   for resource/predictive or any combined approach. */
ALTER TABLE metric_aggregations
    ADD CONSTRAINT fk_metric_aggregations_perf
    FOREIGN KEY (metric_id)
    REFERENCES performance_metrics(id)
    ON DELETE CASCADE;

/* Basic validation constraint for aggregated values. Adjust as needed. */
ALTER TABLE metric_aggregations
    ADD CONSTRAINT chk_aggregated_value
    CHECK (aggregated_value >= 0);

/* Index to help find aggregated rows by period_type or period_start/end. */
CREATE INDEX IF NOT EXISTS idx_metric_agg_period
    ON metric_aggregations (period_type, period_start, period_end);

/*
  Materialized view example for summation by period_type. Real deployments
  often create multiple specialized views. We'll create one as a template.
*/
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_metric_aggregations_summary AS
SELECT
    period_type,
    COUNT(*) AS records_count,
    AVG(aggregated_value) AS average_value,
    MIN(aggregated_value) AS min_value,
    MAX(aggregated_value) AS max_value
FROM metric_aggregations
GROUP BY period_type;

/* Function to refresh the materialized view in real-time as new data arrives.
   In practice, you might schedule or batch these refreshes. */
CREATE OR REPLACE FUNCTION fn_refresh_mv_metric_aggregations()
RETURNS TRIGGER AS
$$
BEGIN
    REFRESH MATERIALIZED VIEW mv_metric_aggregations_summary;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

/* Trigger to refresh MV on insert */
CREATE TRIGGER trg_refresh_metric_aggregations_mv
AFTER INSERT
ON metric_aggregations
FOR EACH ROW
EXECUTE PROCEDURE fn_refresh_mv_metric_aggregations();

/* Retention policy: For example, keep only 2 years of aggregations. */
CREATE OR REPLACE FUNCTION fn_metric_aggregations_retention()
RETURNS TRIGGER AS
$$
BEGIN
    DELETE FROM metric_aggregations
     WHERE period_end < (CURRENT_TIMESTAMP - INTERVAL '2 years');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

/* Trigger to enforce retention whenever a new aggregation entry is inserted. */
CREATE TRIGGER trg_metric_aggregations_retention
AFTER INSERT
ON metric_aggregations
FOR EACH ROW
EXECUTE PROCEDURE fn_metric_aggregations_retention();

/*------------------------------------------------------------------------------
  6. BACKGROUND WORKER STUB (COMMENT / PLACEHOLDER)
     Real-world usage might involve scheduling or external job processes to
     perform ongoing maintenance tasks. We leave a stub/table to highlight
     that capability.
------------------------------------------------------------------------------*/
-- NOTE: Example approach for background worker configuration. Implementation or
-- scheduling is environment-specific (e.g., cron jobs, pg_cron, or external).
-- CREATE TABLE IF NOT EXISTS background_workers (
--     name         VARCHAR(100) PRIMARY KEY,
--     description  TEXT,
--     schedule     VARCHAR(50),  -- e.g. cron expression or interval
--     last_run     TIMESTAMP WITH TIME ZONE
-- );

/*
===============================================================================
End of 00003_analytics_tables.sql
===============================================================================
*/