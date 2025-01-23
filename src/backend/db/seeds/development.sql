/*----------------------------------------------------------------------------
  TaskStream AI - Development Database Seed
  File: development.sql
  Description:
    SQL seed file that populates the development database with comprehensive
    test data, including enhanced AI metadata, predictive analytics, and
    realistic data patterns for development and testing purposes.

  Requirements Addressed:
    1) Development Environment Setup  (Tech Specs §8.1)
       - Provides comprehensive sample data with enhanced AI metadata and
         predictive analytics for local development testing.

    2) Data Schema Validation (Tech Specs §3.2.1)
       - Validates extended database schema through comprehensive data population,
         including AI-enhanced fields and predictive metrics.

  Important Notes:
    - This seed script references tables from:
      * initial_schema.sql         (users, teams, projects, tasks, analytics, etc.)
      * task_tables.sql            (task_dependencies, task_tags, task_attachments)
      * analytics_tables.sql       (performance_metrics, resource_metrics, predictive_metrics)
    - Globals used: DEVELOPMENT_SEED_VERSION=1.1, CLEANUP_BATCH_SIZE=1000,
      MAX_PARALLEL_INSERTS=50
    - The seed process is composed of:
        (1) validate_schema()        -> Returns boolean
        (2) cleanup_existing_data()  -> Removes old seed data in correct order
        (3) seed_users()             -> Inserts user accounts, teams, memberships
        (4) seed_tasks()             -> Creates projects, tasks, attachments, tags, comments
        (5) seed_analytics()         -> Inserts performance, resource, predictive metrics

  Exported Datasets:
    - sample_users
    - sample_tasks
    - sample_analytics
    - ai_metadata
    - predictive_metrics
----------------------------------------------------------------------------*/

/*----------------------------------------------------------------------------
  0. GLOBAL CONSTANTS
     These can be referenced within our seed script for batch sizes, versioning,
     or parallelization cues.
----------------------------------------------------------------------------*/
DO $$
BEGIN
  RAISE NOTICE 'Development seed version: %, CLEANUP_BATCH_SIZE: %, MAX_PARALLEL_INSERTS: %',
                '1.1',
                '1000',
                '50';
END;
$$;

/*----------------------------------------------------------------------------
  1. FUNCTION: validate_schema()
     Description:
       Validates database schema and constraints before seeding. Ensures that all
       critical tables exist, enumerations are present, and references are correct.
     Returns:
       boolean -> True if validation passes, raises exception otherwise.
     Steps:
       - Check table existence
       - Validate foreign key constraints
       - Verify enum types
       - Check index definitions
       - Validate permissions (skipped in this seed script, assume dev user has rights)
----------------------------------------------------------------------------*/
CREATE OR REPLACE FUNCTION validate_schema()
  RETURNS boolean
  LANGUAGE plpgsql
AS
$$
DECLARE
  missing TEXT := '';
  required_tables TEXT[] := ARRAY[
    'users',
    'teams',
    'projects',
    'tasks',
    'task_dependencies',
    'task_tags',
    'task_attachments',
    'analytics',
    'performance_metrics',
    'resource_metrics',
    'predictive_metrics'
  ];
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT UNNEST(required_tables)
  LOOP
    IF to_regclass('public.' || tbl) IS NULL THEN
      missing := missing || tbl || ' ';
    END IF;
  END LOOP;

  IF missing <> '' THEN
    RAISE EXCEPTION 'Schema validation failed. Missing tables: %', missing;
  END IF;

  -- We skip advanced checks on FKs, indexes, or enum types for brevity,
  -- but these would be performed here in a production environment.

  RETURN true;
END;
$$;


/*----------------------------------------------------------------------------
  2. PROCEDURE: cleanup_existing_data()
     Description:
       Safely removes existing seed data in the correct order, using batch
       deletions if necessary. This procedure helps avoid constraint violations
       during cleanup.

     Steps:
       1) Begin transaction
       2) Delete analytics data in batches (predictive_metrics, resource_metrics,
          performance_metrics, analytics)
       3) Remove task relationships (task_dependencies, task_tags, task_attachments,
          task_comments)
       4) Delete tasks
       5) Remove project data
       6) Clean up team memberships
       7) Remove user accounts
       8) Commit transaction
----------------------------------------------------------------------------*/
CREATE OR REPLACE PROCEDURE cleanup_existing_data()
LANGUAGE plpgsql
AS
$$
DECLARE
  batch_count INT := 1000;  -- CLEANUP_BATCH_SIZE
  rows_affected INT;
BEGIN
  RAISE NOTICE 'Starting cleanup of existing seed data...';

  -- Step 1: Begin transaction
  BEGIN
    PERFORM validate_schema();
    RAISE NOTICE 'Schema validation passed. Proceeding with cleanup.';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Schema invalid. Cleanup aborted: %', SQLERRM;
  END;

  -- Encourage a manual transaction block
  BEGIN
    -- We do repeated batch deletions on large tables to avoid blow-up in single statements.

    /* Step 2: Delete analytics data in batches:
       predictive_metrics, resource_metrics, performance_metrics, analytics */
    LOOP
      DELETE FROM predictive_metrics
        WHERE ctid IN (SELECT ctid FROM predictive_metrics LIMIT batch_count);
      GET DIAGNOSTICS rows_affected = ROW_COUNT;
      EXIT WHEN rows_affected < batch_count;
    END LOOP;

    LOOP
      DELETE FROM resource_metrics
        WHERE ctid IN (SELECT ctid FROM resource_metrics LIMIT batch_count);
      GET DIAGNOSTICS rows_affected = ROW_COUNT;
      EXIT WHEN rows_affected < batch_count;
    END LOOP;

    LOOP
      DELETE FROM performance_metrics
        WHERE ctid IN (SELECT ctid FROM performance_metrics LIMIT batch_count);
      GET DIAGNOSTICS rows_affected = ROW_COUNT;
      EXIT WHEN rows_affected < batch_count;
    END LOOP;

    LOOP
      DELETE FROM analytics
        WHERE ctid IN (SELECT ctid FROM analytics LIMIT batch_count);
      GET DIAGNOSTICS rows_affected = ROW_COUNT;
      EXIT WHEN rows_affected < batch_count;
    END LOOP;

    /* Step 3: Remove task relationships */
    LOOP
      DELETE FROM task_dependencies
        WHERE ctid IN (SELECT ctid FROM task_dependencies LIMIT batch_count);
      GET DIAGNOSTICS rows_affected = ROW_COUNT;
      EXIT WHEN rows_affected < batch_count;
    END LOOP;

    LOOP
      DELETE FROM task_tags
        WHERE ctid IN (SELECT ctid FROM task_tags LIMIT batch_count);
      GET DIAGNOSTICS rows_affected = ROW_COUNT;
      EXIT WHEN rows_affected < batch_count;
    END LOOP;

    LOOP
      DELETE FROM task_attachments
        WHERE ctid IN (SELECT ctid FROM task_attachments LIMIT batch_count);
      GET DIAGNOSTICS rows_affected = ROW_COUNT;
      EXIT WHEN rows_affected < batch_count;
    END LOOP;

    LOOP
      DELETE FROM task_comments
        WHERE ctid IN (SELECT ctid FROM task_comments LIMIT batch_count);
      GET DIAGNOSTICS rows_affected = ROW_COUNT;
      EXIT WHEN rows_affected < batch_count;
    END LOOP;

    /* Step 4: Delete tasks */
    LOOP
      DELETE FROM tasks
        WHERE ctid IN (SELECT ctid FROM tasks LIMIT batch_count);
      GET DIAGNOSTICS rows_affected = ROW_COUNT;
      EXIT WHEN rows_affected < batch_count;
    END LOOP;

    /* Step 5: Remove project data */
    LOOP
      DELETE FROM projects
        WHERE ctid IN (SELECT ctid FROM projects LIMIT batch_count);
      GET DIAGNOSTICS rows_affected = ROW_COUNT;
      EXIT WHEN rows_affected < batch_count;
    END LOOP;

    /* Step 6: Clean up team memberships */
    LOOP
      DELETE FROM team_members
        WHERE ctid IN (SELECT ctid FROM team_members LIMIT batch_count);
      GET DIAGNOSTICS rows_affected = ROW_COUNT;
      EXIT WHEN rows_affected < batch_count;
    END LOOP;

    LOOP
      DELETE FROM teams
        WHERE ctid IN (SELECT ctid FROM teams LIMIT batch_count);
      GET DIAGNOSTICS rows_affected = ROW_COUNT;
      EXIT WHEN rows_affected < batch_count;
    END LOOP;

    /* Step 7: Remove user accounts (including oauth_profiles) */
    LOOP
      DELETE FROM oauth_profiles
        WHERE ctid IN (SELECT ctid FROM oauth_profiles LIMIT batch_count);
      GET DIAGNOSTICS rows_affected = ROW_COUNT;
      EXIT WHEN rows_affected < batch_count;
    END LOOP;

    LOOP
      DELETE FROM users
        WHERE ctid IN (SELECT ctid FROM users LIMIT batch_count);
      GET DIAGNOSTICS rows_affected = ROW_COUNT;
      EXIT WHEN rows_affected < batch_count;
    END LOOP;
  END;

  -- Step 8: All done
  RAISE NOTICE 'Cleanup completed successfully.';
END;
$$;


/*----------------------------------------------------------------------------
  3. PROCEDURE: seed_users()
     Description:
       Inserts sample user accounts with enhanced role-based configurations.
       Also sets up basic teams and memberships to demonstrate user distribution.

     Steps:
       1) Generate secure test passwords (dummy in dev environment)
       2) Insert admin user with full permissions
       3) Create project managers with resource allocation rights
       4) Add team leads with team-specific permissions
       5) Insert developers with skill metadata
       6) Create viewers with limited access
       7) Generate user preferences (stored in permissions as placeholder)
       8) Set up notification settings (not explicitly stored, but exemplified in column)
----------------------------------------------------------------------------*/
CREATE OR REPLACE PROCEDURE seed_users()
LANGUAGE plpgsql
AS
$$
DECLARE
  user_index INT := 0;
  -- Using distribution from specification: 
  --   ADMIN=1, PROJECT_MANAGER=3, TEAM_LEAD=4, DEVELOPER=10, VIEWER=2
  email_base TEXT := '@tsai.dev';
  admin_count INT    := 1;
  pm_count INT       := 3;
  lead_count INT     := 4;
  dev_count INT      := 10;
  viewer_count INT   := 2;

  i INT;
  raw_email TEXT;
  f_name TEXT;
  l_name TEXT;
  new_role user_role;
  combined_permissions TEXT[];
BEGIN
  RAISE NOTICE 'Seeding users (20 total) with roles and basic teams...';

  /* Create two teams to demonstrate membership distribution */
  INSERT INTO teams (name, description, created_by)
  VALUES
    ('TeamAlpha', 'Primary alpha team for dev testing', NULL),
    ('TeamBeta',  'Secondary beta team for dev testing', NULL)
  RETURNING id into STRICT NOTHING;  -- We do not need the IDs here explicitly

  /* 1) Insert ADMIN user */
  FOR i IN 1..admin_count LOOP
    user_index := user_index + 1;
    raw_email := 'admin' || i::TEXT || email_base;
    f_name := 'Admin' || i::TEXT;
    l_name := 'User';
    new_role := 'ADMIN';
    combined_permissions := ARRAY['ALL_PRIVILEGES','TEAM_MANAGEMENT','NOTIFICATION_EMAIL','SECURITY_OVERSIGHT'];
    INSERT INTO users(
      email, password_hash, first_name, last_name, role, permissions, is_active
    )
    VALUES (
      raw_email,
      'secure_hashed_pass',  -- Dummy for dev
      f_name,
      l_name,
      new_role,
      combined_permissions,
      TRUE
    );
  END LOOP;

  /* 2) Insert PROJECT_MANAGER users */
  FOR i IN 1..pm_count LOOP
    user_index := user_index + 1;
    raw_email := 'pm' || i::TEXT || email_base;
    f_name := 'PM' || i::TEXT;
    l_name := 'User';
    new_role := 'PROJECT_MANAGER';
    combined_permissions := ARRAY['PROJECT_OWNERSHIP','RESOURCE_ALLOCATION','NOTIFICATION_EMAIL'];
    INSERT INTO users(
      email, password_hash, first_name, last_name, role, permissions, is_active
    )
    VALUES (
      raw_email,
      'secure_hashed_pass',
      f_name,
      l_name,
      new_role,
      combined_permissions,
      TRUE
    );
  END LOOP;

  /* 3) Insert TEAM_LEAD users */
  FOR i IN 1..lead_count LOOP
    user_index := user_index + 1;
    raw_email := 'lead' || i::TEXT || email_base;
    f_name := 'Lead' || i::TEXT;
    l_name := 'User';
    new_role := 'TEAM_LEAD';
    combined_permissions := ARRAY['TEAM_MANAGEMENT','SCHEDULE_REVIEWS','NOTIFICATION_EMAIL'];
    INSERT INTO users(
      email, password_hash, first_name, last_name, role, permissions, is_active
    )
    VALUES (
      raw_email,
      'secure_hashed_pass',
      f_name,
      l_name,
      new_role,
      combined_permissions,
      TRUE
    );
  END LOOP;

  /* 4) Insert DEVELOPER users (with skill metadata in the permissions array to simulate AI data) */
  FOR i IN 1..dev_count LOOP
    user_index := user_index + 1;
    raw_email := 'dev' || i::TEXT || email_base;
    f_name := 'Dev' || i::TEXT;
    l_name := 'User';
    new_role := 'DEVELOPER';
    combined_permissions := ARRAY[
      'CODE_PUSH',
      CASE WHEN i % 2 = 0 THEN 'SKILL_BACKEND' ELSE 'SKILL_FRONTEND' END,
      'NOTIFICATION_EMAIL'
    ];
    INSERT INTO users(
      email, password_hash, first_name, last_name, role, permissions, is_active
    )
    VALUES (
      raw_email,
      'secure_hashed_pass',
      f_name,
      l_name,
      new_role,
      combined_permissions,
      TRUE
    );
  END LOOP;

  /* 5) Insert VIEWER users */
  FOR i IN 1..viewer_count LOOP
    user_index := user_index + 1;
    raw_email := 'viewer' || i::TEXT || email_base;
    f_name := 'Viewer' || i::TEXT;
    l_name := 'User';
    new_role := 'VIEWER';
    combined_permissions := ARRAY['READ_ONLY','NOTIFICATION_EMAIL'];
    INSERT INTO users(
      email, password_hash, first_name, last_name, role, permissions, is_active
    )
    VALUES (
      raw_email,
      'secure_hashed_pass',
      f_name,
      l_name,
      new_role,
      combined_permissions,
      TRUE
    );
  END LOOP;

  -- 6) Demonstration team membership
  -- We will place some leads/devs in TeamAlpha, others in TeamBeta
  -- For brevity, we have limited logic. In practice, we'd map user IDs carefully.
  -- Assign any 2 leads and 5 devs to TeamAlpha, the rest to TeamBeta, etc.
  -- We do this using some dynamic approach (not strictly random).
  -- We'll do straightforward approach by referencing user emails to join teams:
  WITH alpha_team AS (
    SELECT id FROM teams WHERE name='TeamAlpha' LIMIT 1
  ),
  beta_team AS (
    SELECT id FROM teams WHERE name='TeamBeta' LIMIT 1
  ),
  leads AS (
    SELECT id, email
    FROM users
    WHERE role='TEAM_LEAD'
    ORDER BY email
  ),
  devs AS (
    SELECT id, email
    FROM users
    WHERE role='DEVELOPER'
    ORDER BY email
  )
  INSERT INTO team_members (team_id, user_id, role, joined_at)
  SELECT
    (SELECT id FROM alpha_team),
    l.id,
    'SCRUM_MASTER',
    now()
  FROM leads l
  WHERE l.email LIKE 'lead1%' OR l.email LIKE 'lead2%'
  UNION ALL
  SELECT
    (SELECT id FROM beta_team),
    l.id,
    'SCRUM_MASTER',
    now()
  FROM leads l
  WHERE l.email LIKE 'lead3%' OR l.email LIKE 'lead4%'
  UNION ALL
  SELECT
    (SELECT id FROM alpha_team),
    d.id,
    'DEVELOPER_ROLE',
    now()
  FROM devs d
  WHERE d.email IN ('dev1'||@tsai.dev, 'dev2'||@tsai.dev, 'dev3'||@tsai.dev, 'dev4'||@tsai.dev, 'dev5'||@tsai.dev)
  UNION ALL
  SELECT
    (SELECT id FROM beta_team),
    d.id,
    'DEVELOPER_ROLE',
    now()
  FROM devs d
  WHERE d.email IN ('dev6'||@tsai.dev, 'dev7'||@tsai.dev, 'dev8'||@tsai.dev, 'dev9'||@tsai.dev, 'dev10'||@tsai.dev);

  RAISE NOTICE 'Users and teams have been seeded successfully.';
END;
$$;


/*----------------------------------------------------------------------------
  4. PROCEDURE: seed_tasks()
     Description:
       Creates sample projects, then inserts 100 tasks with comprehensive
       AI metadata and relationships. Also adds varied dependencies,
       attachments, tags, comments, real-time records, and AI suggestions.

     Steps:
       1) Create sample projects referencing teams
       2) Generate tasks with AI-extracted metadata
       3) Create realistic task dependencies
       4) Add varied attachments and references
       5) Insert task comments and history
       6) Generate task tags and categories
       7) Create time tracking records
       8) Set up task notifications
       9) Add AI-generated task suggestions
----------------------------------------------------------------------------*/
CREATE OR REPLACE PROCEDURE seed_tasks()
LANGUAGE plpgsql
AS
$$
DECLARE
  project_alpha_id UUID;
  project_beta_id UUID;
  project_gamma_id UUID;

  total_tasks INT := 100;
  i INT;
  status_distribution jsonb := '{"BACKLOG":30, "TODO":20, "IN_PROGRESS":25, "IN_REVIEW":15, "DONE":10}';
  current_status TEXT;
  title_txt TEXT;
  desc_txt TEXT;
  assigned_user UUID;
  array_users UUID[];
  ai_complexity TEXT[] := ARRAY['LOW','MEDIUM','HIGH'];
  ai_depend_type TEXT[] := ARRAY['BLOCKS','RELATES_TO','DUPLICATES'];
  auto_tags TEXT[] := ARRAY['BUG','FEATURE','IMPROVEMENT','TECHNICAL_DEBT'];
  complex_idx INT;
  tag_idx INT;
  new_task_id UUID;
  base_date TIMESTAMP := now();
BEGIN
  RAISE NOTICE 'Seeding projects and tasks...';

  /* 1) Create sample projects referencing our two teams:
     - ProjectAlpha -> TeamAlpha
     - ProjectBeta  -> TeamAlpha
     - ProjectGamma -> TeamBeta
  */
  INSERT INTO projects(name, description, status, start_date, end_date, team_id, created_by)
  SELECT
    'ProjectAlpha',
    'Sample Project Alpha for dev seed',
    'ACTIVE',
    CURRENT_DATE - INTERVAL '10 days',       -- started 10 days ago
    CURRENT_DATE + INTERVAL '20 days',       -- ends in 20 days
    t.id,
    (SELECT id FROM users WHERE role='ADMIN' LIMIT 1)
  FROM teams t WHERE t.name='TeamAlpha'
  RETURNING id INTO project_alpha_id;

  INSERT INTO projects(name, description, status, start_date, end_date, team_id, created_by)
  SELECT
    'ProjectBeta',
    'Sample Project Beta for dev seed',
    'ACTIVE',
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE + INTERVAL '15 days',
    t.id,
    (SELECT id FROM users WHERE role='PROJECT_MANAGER' LIMIT 1)
  FROM teams t WHERE t.name='TeamAlpha'
  RETURNING id INTO project_beta_id;

  INSERT INTO projects(name, description, status, start_date, end_date, team_id, created_by)
  SELECT
    'ProjectGamma',
    'Sample Project Gamma for dev seed',
    'ACTIVE',
    CURRENT_DATE - INTERVAL '2 days',
    CURRENT_DATE + INTERVAL '25 days',
    t.id,
    (SELECT id FROM users WHERE role='TEAM_LEAD' LIMIT 1)
  FROM teams t WHERE t.name='TeamBeta'
  RETURNING id INTO project_gamma_id;

  -- We can gather user IDs for random assignment
  SELECT array_agg(id) INTO array_users
  FROM users
  WHERE role IN('PROJECT_MANAGER','TEAM_LEAD','DEVELOPER');

  IF array_length(array_users,1) IS NULL THEN
    RAISE EXCEPTION 'No suitable users found for task assignment.';
  END IF;

  /* 2) Generate 100 tasks with distribution from status_distribution:
     BACKLOG:30, TODO:20, IN_PROGRESS:25, IN_REVIEW:15, DONE:10
  */
  i := 0;
  FOR current_status IN (SELECT jsonb_object_keys(status_distribution) AS s) LOOP
    DECLARE
      count_for_status INT := (status_distribution ->> current_status.s)::INT;
      j INT;
    BEGIN
      FOR j IN 1..count_for_status LOOP
        i := i + 1;
        title_txt := current_status.s || ' Task #' || i;
        desc_txt := 'Automated seed generation for ' || current_status.s || ' item ' || i;
        assigned_user := array_users[((i % array_length(array_users,1)) + 1)];

        /* Simple approach to pick a random project among the 3 */
        IF (i % 3) = 1 THEN
          -- project alpha
          complex_idx := (i % 3) + 1;  -- cycle 1..3
          tag_idx := (i % 4) + 1;      -- cycle 1..4
          INSERT INTO tasks(
            project_id, title, description, status, priority, assignee_id, due_date,
            ai_metadata, created_by, created_at
          )
          VALUES (
            project_alpha_id,
            title_txt,
            desc_txt,
            current_status.s::task_status,
            'MEDIUM',
            assigned_user,
            base_date + (i * INTERVAL '1 day'),
            jsonb_build_object(
              'complexity_score', ai_complexity[complex_idx],
              'suggestion', 'Consider best practices refactor',
              'auto_tag', auto_tags[tag_idx]
            ),
            (SELECT id FROM users WHERE role='ADMIN' LIMIT 1),
            now()
          )
          RETURNING id INTO new_task_id;

        ELSIF (i % 3) = 2 THEN
          -- project beta
          complex_idx := (i % 3) + 1;
          tag_idx := (i % 4) + 1;
          INSERT INTO tasks(
            project_id, title, description, status, priority, assignee_id, due_date,
            ai_metadata, created_by, created_at
          )
          VALUES (
            project_beta_id,
            title_txt,
            desc_txt,
            current_status.s::task_status,
            'HIGH',
            assigned_user,
            base_date + (i * INTERVAL '1 day'),
            jsonb_build_object(
              'complexity_score', ai_complexity[complex_idx],
              'suggestion', 'Parallelize certain processes for efficiency',
              'auto_tag', auto_tags[tag_idx]
            ),
            (SELECT id FROM users WHERE role='PROJECT_MANAGER' LIMIT 1),
            now()
          )
          RETURNING id INTO new_task_id;

        ELSE
          -- project gamma
          complex_idx := (i % 3) + 1;
          tag_idx := (i % 4) + 1;
          INSERT INTO tasks(
            project_id, title, description, status, priority, assignee_id, due_date,
            ai_metadata, created_by, created_at
          )
          VALUES (
            project_gamma_id,
            title_txt,
            desc_txt,
            current_status.s::task_status,
            'LOW',
            assigned_user,
            base_date + (i * INTERVAL '1 day'),
            jsonb_build_object(
              'complexity_score', ai_complexity[complex_idx],
              'suggestion', 'Review design patterns for scale',
              'auto_tag', auto_tags[tag_idx]
            ),
            (SELECT id FROM users WHERE role='TEAM_LEAD' LIMIT 1),
            now()
          )
          RETURNING id INTO new_task_id;
        END IF;

        /* 3) Create mild task dependencies for some tasks. 
           For example, every 10th task references the previous task as a dependency.
        */
        IF (i % 10) = 0 AND i > 1 THEN
          INSERT INTO task_dependencies(
            task_id, dependency_id, dependency_type, created_by
          )
          VALUES (
            new_task_id,
            (SELECT id FROM tasks ORDER BY created_at DESC LIMIT 2 OFFSET 1),
            ai_depend_type[((i % 3) + 1)],
            assigned_user
          );
        END IF;

        /* 4) Add a small number of attachments for tasks that are multiple of 15 */
        IF (i % 15) = 0 THEN
          INSERT INTO task_attachments(
            task_id, file_name, file_type, file_size, storage_path, uploaded_by, content_hash
          )
          VALUES (
            new_task_id,
            'design_doc_' || i || '.pdf',
            'application/pdf',
            204800,
            '/mock/storage/docs/design_doc_' || i || '.pdf',
            assigned_user,
            'mockedhash123' || i
          );
        END IF;

        /* 5) Insert sample task comments, including "time tracking" or "notifications" mention */
        INSERT INTO task_comments(
          task_id, user_id, content
        )
        VALUES (
          new_task_id,
          assigned_user,
          'Comment from user ' || assigned_user::text || ' on task ' || i
        );

        /* Time tracking record as comment for demonstration */
        IF (i % 5) = 0 THEN
          INSERT INTO task_comments(
            task_id, user_id, content
          )
          VALUES (
            new_task_id,
            assigned_user,
            'Time tracking: spent ' || (i % 3 + 1)::text || ' hour(s) on this task.'
          );
        END IF;

        /* 6) Generate task tags (e.g., BUG, FEATURE, etc. placed above in ai_metadata, but we can also store them in task_tags) */
        INSERT INTO task_tags(
          task_id, tag_name, created_by
        )
        VALUES (
          new_task_id,
          auto_tags[tag_idx],
          assigned_user
        );

        /* 7) Additional step: "Set up task notifications" */
        IF (i % 7) = 0 THEN
          INSERT INTO task_comments(
            task_id, user_id, content
          ) VALUES (
            new_task_id,
            assigned_user,
            'Notification triggered for assignee regarding update on task ' || i
          );
        END IF;
        /* 8) AI suggestions have been placed in ai_metadata JSON, no extra table needed. */
      END LOOP;
    END;
  END LOOP;

  RAISE NOTICE 'Tasks seeded successfully (total=%).', i;
END;
$$;


/*----------------------------------------------------------------------------
  5. PROCEDURE: seed_analytics()
     Description:
       Populates enhanced analytics data including predictive metrics. Inserts
       realistic performance data, resource utilization, and predictive model
       entries.

     Steps:
       1) Generate historical performance data
       2) Create resource utilization patterns
       3) Insert predictive analytics metrics
       4) Generate trend analysis data
       5) Create capacity planning metrics
       6) Add risk assessment data
       7) Generate ROI calculations
       8) Create team velocity metrics
----------------------------------------------------------------------------*/
CREATE OR REPLACE PROCEDURE seed_analytics()
LANGUAGE plpgsql
AS
$$
DECLARE
  metric_types TEXT[] := ARRAY['PERFORMANCE','PRODUCTIVITY','QUALITY','EFFICIENCY'];
  entity_tasks RECORD;
  entity_projects RECORD;
  day_offset INT;
  total_metrics_per_entity INT := 15;
  i INT;
  rndval DOUBLE PRECISION;
  resource_cat TEXT[] := ARRAY['ALPHA_CLUSTER','BETA_CLUSTER','GAMMA_CLUSTER'];
  util_types TEXT[] := ARRAY['CPU','MEMORY','STORAGE','NETWORK'];  -- from resource_utilization_type
  pmetric_id UUID;
BEGIN
  RAISE NOTICE 'Seeding analytics data (performance, resource, predictive)...';

  /* Step 1: Generate historical performance data for each project */
  FOR entity_projects IN
      SELECT id FROM projects
  LOOP
    FOR i IN 1..total_metrics_per_entity LOOP
      day_offset := (i * 2);  -- every 2 days
      INSERT INTO performance_metrics(
        metric_type, metric_category, entity_id, value, recorded_at, created_by, metadata
      )
      VALUES (
        metric_types[(i % array_length(metric_types,1)) + 1],
        'PROJECT_METRIC',
        entity_projects.id,
        (random() * 100)::DOUBLE PRECISION,
        now() - (day_offset || ' days')::INTERVAL,
        (SELECT id FROM users WHERE role='PROJECT_MANAGER' LIMIT 1),
        jsonb_build_object('trend','stable','risk','low')
      )
      RETURNING id INTO pmetric_id;
    END LOOP;
  END LOOP;

  /* Step 2: Create resource utilization patterns for tasks or projects */
  FOR entity_tasks IN
      SELECT id FROM tasks LIMIT 30  -- For demonstration, only for first 30 tasks
  LOOP
    FOR i IN 1..total_metrics_per_entity LOOP
      rndval := (random() * 100);  -- 0..100
      INSERT INTO resource_metrics(
        resource_id,
        resource_category,
        metric_type,
        utilization_type,
        value,
        recorded_at,
        metadata
      )
      VALUES (
        entity_tasks.id,
        resource_cat[(i % 3) + 1],
        'UTIL_METRIC',
        util_types[(i % 4) + 1]::resource_utilization_type,
        rndval,
        now() - (i || ' hours')::INTERVAL,
        jsonb_build_object('note','auto-seed','risk',CASE WHEN rndval>80 THEN 'HIGH' ELSE 'LOW' END)
      );
    END LOOP;
  END LOOP;

  /* Step 3: Insert predictive analytics metrics for a subset of tasks */
  FOR entity_tasks IN
      SELECT id FROM tasks WHERE status <> 'DONE' LIMIT 10
  LOOP
    INSERT INTO predictive_metrics(
      prediction_type,
      target_entity,
      predicted_value,
      model_version,
      confidence_score,
      feature_importance,
      prediction_interval_lower,
      prediction_interval_upper,
      validation_metrics
    )
    VALUES (
      'TASK_DURATION',
      entity_tasks.id,
      10 + (random()*20)::DOUBLE PRECISION,  -- Predicted hours
      'v1.0.0',
      (0.5 + random()*0.5)::DOUBLE PRECISION,
      jsonb_build_object('key_factor','complexity_score','weight',(random()*10)::INT),
      5,
      30,
      jsonb_build_object('MAPE',(random()*10)::DOUBLE PRECISION,'MAE',(random()*5)::DOUBLE PRECISION)
    );
  END LOOP;

  /* Additional steps 4..8 are conceptually included in these data sets with JSON metadata.
     For brevity, we do not create separate tables for risk/ROI/team velocity. We rely on
     existing metrics + metadata to store them. */

  RAISE NOTICE 'Analytics seeded successfully.';
END;
$$;


/*----------------------------------------------------------------------------
  6. MASTER SEED EXECUTION
     We wrap the entire process in an explicit transaction block for safety.
     The final calls will produce the comprehensive seeded environment for local
     development.
----------------------------------------------------------------------------*/
BEGIN;

SELECT validate_schema() AS schema_ok;

CALL cleanup_existing_data();
CALL seed_users();
CALL seed_tasks();
CALL seed_analytics();

COMMIT;

/*----------------------------------------------------------------------------
  7. EXPORT ANNOTATIONS
     Indicating the data sets exposed by this development seed.
----------------------------------------------------------------------------*/
COMMENT ON TABLE users IS 'EXPORT: sample_users';
COMMENT ON TABLE tasks IS 'EXPORT: sample_tasks';
COMMENT ON TABLE analytics IS 'EXPORT: sample_analytics';
COMMENT ON TABLE tasks IS 'EXPORT: ai_metadata';
COMMENT ON TABLE predictive_metrics IS 'EXPORT: predictive_metrics';

/*----------------------------------------------------------------------------
  End of development.sql
----------------------------------------------------------------------------*/