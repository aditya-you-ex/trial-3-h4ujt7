/*
================================================================================
 TaskStream AI - Initial Database Migration Script
--------------------------------------------------------------------------------
 This script creates all necessary extensions, enumerations, and core tables for
 the TaskStream AI platform. It implements user management, OAuth integration,
 team structures, project/task management, and analytics tracking. The schema
 leverages enterprise-grade data constraints, reference integrity, indexing,
 and optimized data types to ensure scalability, security, and performance.
================================================================================
*/

-- =====================
-- 1. REQUIRED EXTENSIONS
-- =====================
-- Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Extension for advanced B-Tree based indexing
CREATE EXTENSION IF NOT EXISTS "btree_gin";
-- Extension for trigram-based text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================
-- 2. ENUMERATED TYPES
-- =====================
-- Enumerations for important domain concepts and constraints

-- User roles for authorization logic
CREATE TYPE user_role AS ENUM (
    'ADMIN',
    'PROJECT_MANAGER',
    'TEAM_LEAD',
    'DEVELOPER',
    'VIEWER'
);

-- Project lifecycle states
CREATE TYPE project_status AS ENUM (
    'PLANNING',
    'ACTIVE',
    'ON_HOLD',
    'COMPLETED',
    'ARCHIVED'
);

-- Task lifecycle states
CREATE TYPE task_status AS ENUM (
    'BACKLOG',
    'TODO',
    'IN_PROGRESS',
    'IN_REVIEW',
    'DONE'
);

-- Task priorities
CREATE TYPE task_priority AS ENUM (
    'HIGH',
    'MEDIUM',
    'LOW'
);

-- Task source identifiers for AI/auto-generation
CREATE TYPE task_source AS ENUM (
    'MANUAL',
    'EMAIL',
    'CHAT',
    'MEETING'
);

-- =====================
-- 3. TABLE DEFINITIONS
-- =====================

/*
 Table: users
 Description:
   Stores core user information with their credentials, roles, and activity data.
   Includes a system for storing permission sets as text arrays, along with
   timestamps for audit/monitoring. The email column is unique for each user.
*/
CREATE TABLE users (
    id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    role          user_role NOT NULL,
    permissions   TEXT[],
    is_active     BOOLEAN DEFAULT TRUE,
    last_login    TIMESTAMP WITH TIME ZONE,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index user data for faster lookups by email and role
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role ON users (role);

/*
 Table: oauth_profiles
 Description:
   Associates users with third-party OAuth providers for single sign-on (SSO).
   This allows multiple OAuth profiles per user, managed by a unique constraint
   on (provider, provider_id).
*/
CREATE TABLE oauth_profiles (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
    provider    VARCHAR(50) NOT NULL,
    provider_id VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure uniqueness for each provider/provider_id combination
CREATE UNIQUE INDEX idx_oauth_provider ON oauth_profiles (provider, provider_id);

/*
 Table: teams
 Description:
   Represents a named group of users. Teams can own projects and facilitate
   role-based collaboration across the system.
*/
CREATE TABLE teams (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL,
    description TEXT,
    created_by  uuid REFERENCES users(id),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

/*
 Table: team_members
 Description:
   Many-to-many relationship between teams and users. Stores additional role
   metadata at the team level (e.g., “Scrum Master”, “Lead Reviewer”) and
   tracks when the member joined the team.
*/
CREATE TABLE team_members (
    team_id   uuid REFERENCES teams(id) ON DELETE CASCADE,
    user_id   uuid REFERENCES users(id) ON DELETE CASCADE,
    role      VARCHAR(50) NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, user_id)
);

/*
 Table: projects
 Description:
   High-level container for tasks. Linked to a team and a user (creator).
   Tracks the status and timeframe of the project.
*/
CREATE TABLE projects (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    status      project_status NOT NULL DEFAULT 'PLANNING',
    start_date  DATE NOT NULL,
    end_date    DATE,
    team_id     uuid REFERENCES teams(id),
    created_by  uuid REFERENCES users(id),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index the team references and project status for quick queries
CREATE INDEX idx_projects_team ON projects (team_id);
CREATE INDEX idx_projects_status ON projects (status);

/*
 Table: tasks
 Description:
   Core task management entity. Stores details about each task, its priority,
   assigned user, relevant time estimates (estimated_hours, actual_hours),
   and optional AI metadata for automatic or augmented task creation.
*/
CREATE TABLE tasks (
    id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id     uuid REFERENCES projects(id) ON DELETE CASCADE,
    title          VARCHAR(255) NOT NULL,
    description    TEXT,
    status         task_status NOT NULL DEFAULT 'BACKLOG',
    priority       task_priority NOT NULL DEFAULT 'MEDIUM',
    assignee_id    uuid REFERENCES users(id),
    due_date       TIMESTAMP WITH TIME ZONE,
    estimated_hours DECIMAL(10,2),
    actual_hours    DECIMAL(10,2),
    source         task_source NOT NULL DEFAULT 'MANUAL',
    ai_metadata    JSONB,
    created_by     uuid REFERENCES users(id),
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index references, status, and due_date for faster filtering and reporting
CREATE INDEX idx_tasks_project ON tasks (project_id);
CREATE INDEX idx_tasks_assignee ON tasks (assignee_id);
CREATE INDEX idx_tasks_status ON tasks (status);
CREATE INDEX idx_tasks_due_date ON tasks (due_date);

/*
 Table: task_comments
 Description:
   Stores comments made by users on tasks. Tied to the tasks table with a
   cascading delete to keep data integrity.
*/
CREATE TABLE task_comments (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id     uuid REFERENCES tasks(id) ON DELETE CASCADE,
    user_id     uuid REFERENCES users(id),
    content     TEXT NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index the task reference for quicker retrieval of comments
CREATE INDEX idx_comments_task ON task_comments (task_id);

/*
 Table: analytics
 Description:
   Collects diverse usage metrics, such as interactions or performance data,
   for an entity (task, project, user, etc.). Metrics are stored in JSONB
   with a flexible schema for data science insights.
*/
CREATE TABLE analytics (
    id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id   uuid NOT NULL,
    metrics     JSONB NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for frequently queried entity metrics
CREATE INDEX idx_analytics_entity ON analytics (entity_type, entity_id);

/*
================================================================================
 End of File
================================================================================
*/