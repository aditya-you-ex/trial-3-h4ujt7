/**
 * @file Defines project-related constants used throughout the TaskStream AI web application,
 *       including project validation rules, default configurations, UI mappings, and API endpoints.
 *       Aligns with database constraints (see schema design), UI design system, and API patterns
 *       for project management features.
 */

// -----------------------------------------------------------------------------
// Internal Imports
// -----------------------------------------------------------------------------
import { ProjectStatus } from '../types/project.types';

/**
 * PROJECT_API_ENDPOINTS
 * -----------------------------------------------------------------------------
 * A centralized object listing REST endpoints for the "Project" resource.
 * Each property is either a static string or a function returning a path
 * that incorporates a unique project identifier. These mappings are
 * designed to standardize integration patterns across all project
 * management functionalities in the TaskStream AI web application.
 */
const PROJECT_API_ENDPOINTS: Record<string, string | ((id: string) => string)> = {
  /**
   * BASE
   * ---------------------------------------------------------------------------
   * The base endpoint for project operations (GET all, POST create).
   */
  BASE: '/api/v1/projects',

  /**
   * BY_ID
   * ---------------------------------------------------------------------------
   * Returns the endpoint for actions targeted at a specific project by ID.
   * Example usage: `/api/v1/projects/${projectId}`
   */
  BY_ID: (id: string): string => `/api/v1/projects/${id}`,

  /**
   * STATUS
   * ---------------------------------------------------------------------------
   * Returns the endpoint for updating or retrieving the status of a project.
   * Example usage: `/api/v1/projects/${projectId}/status`
   */
  STATUS: (id: string): string => `/api/v1/projects/${id}/status`,

  /**
   * MEMBERS
   * ---------------------------------------------------------------------------
   * Returns the endpoint for managing project members.
   * Example usage: `/api/v1/projects/${projectId}/members`
   */
  MEMBERS: (id: string): string => `/api/v1/projects/${id}/members`,

  /**
   * ANALYTICS
   * ---------------------------------------------------------------------------
   * Returns the endpoint for fetching analytics data related to project
   * performance, resource usage, or predictive metrics.
   * Example usage: `/api/v1/projects/${projectId}/analytics`
   */
  ANALYTICS: (id: string): string => `/api/v1/projects/${id}/analytics`,
};

/**
 * PROJECT_STATUS_LABELS
 * -----------------------------------------------------------------------------
 * Maps each status in ProjectStatus to a human-readable label string
 * for display in the UI. Ensures consistent wording across all views.
 */
const PROJECT_STATUS_LABELS = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  ON_HOLD: 'On Hold',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
} as const;

/**
 * PROJECT_STATUS_COLORS
 * -----------------------------------------------------------------------------
 * Maps each status in ProjectStatus to a color code used in UI elements
 * like status badges or highlights, preserving a consistent color
 * palette for visual cues throughout the application.
 */
const PROJECT_STATUS_COLORS = {
  PLANNING: '#64748B',
  ACTIVE: '#2563EB',
  ON_HOLD: '#F59E0B',
  COMPLETED: '#10B981',
  ARCHIVED: '#6B7280',
} as const;

/**
 * PROJECT_VALIDATION
 * -----------------------------------------------------------------------------
 * Defines numeric constraints for core project fields, safeguarding data
 * integrity and reflecting database schema restrictions. These values
 * can be used by both client and server validation routines.
 */
export const PROJECT_VALIDATION = {
  /**
   * NAME_MIN_LENGTH
   * ---------------------------------------------------------------------------
   * The minimum length allowed for the project name field.
   */
  NAME_MIN_LENGTH: 3,

  /**
   * NAME_MAX_LENGTH
   * ---------------------------------------------------------------------------
   * The maximum length allowed for the project name field.
   */
  NAME_MAX_LENGTH: 100,

  /**
   * DESCRIPTION_MAX_LENGTH
   * ---------------------------------------------------------------------------
   * The maximum length permitted for the project description field.
   */
  DESCRIPTION_MAX_LENGTH: 1000,

  /**
   * MAX_MEMBERS
   * ---------------------------------------------------------------------------
   * The maximum number of members allowed to be directly associated
   * with a single project for collaboration.
   */
  MAX_MEMBERS: 50,

  /**
   * MAX_TASKS
   * ---------------------------------------------------------------------------
   * The upper limit on the number of tasks within a single project,
   * aligning with system capacity planning.
   */
  MAX_TASKS: 1000,
} as const;

/**
 * PROJECT_DEFAULTS
 * -----------------------------------------------------------------------------
 * Provides predefined default values for projects, streamlining
 * project creation and display behaviors.
 */
export const PROJECT_DEFAULTS = {
  /**
   * INITIAL_STATUS
   * ---------------------------------------------------------------------------
   * The default status for a newly created project.
   */
  INITIAL_STATUS: ProjectStatus.PLANNING,

  /**
   * DEFAULT_VIEW
   * ---------------------------------------------------------------------------
   * The default UI view (e.g. "board", "list") for displaying project tasks.
   */
  DEFAULT_VIEW: 'board',

  /**
   * DEFAULT_SORT
   * ---------------------------------------------------------------------------
   * The default sorting field used when listing or querying projects.
   */
  DEFAULT_SORT: 'created_at',

  /**
   * DEFAULT_PAGE_SIZE
   * ---------------------------------------------------------------------------
   * The default pagination size applied to project listings or queries.
   */
  DEFAULT_PAGE_SIZE: 20,
} as const;

/**
 * PROJECT_UI
 * -----------------------------------------------------------------------------
 * An aggregation of constants crucial to project-related UI rendering. 
 * It merges status labels and color configurations in a single export
 * to ensure a consolidated source of styling and display data for
 * ProjectStatus values.
 */
export const PROJECT_UI = {
  /**
   * STATUS_LABELS
   * ---------------------------------------------------------------------------
   * A record that pairs each ProjectStatus with its corresponding
   * textual label for user-facing displays.
   */
  STATUS_LABELS: {
    [ProjectStatus.PLANNING]: PROJECT_STATUS_LABELS.PLANNING,
    [ProjectStatus.ACTIVE]: PROJECT_STATUS_LABELS.ACTIVE,
    [ProjectStatus.ON_HOLD]: PROJECT_STATUS_LABELS.ON_HOLD,
    [ProjectStatus.COMPLETED]: PROJECT_STATUS_LABELS.COMPLETED,
    [ProjectStatus.ARCHIVED]: PROJECT_STATUS_LABELS.ARCHIVED,
  } as Record<ProjectStatus, string>,

  /**
   * STATUS_COLORS
   * ---------------------------------------------------------------------------
   * A record that associates each ProjectStatus with a designated color code,
   * ensuring visual consistency for status indicators.
   */
  STATUS_COLORS: {
    [ProjectStatus.PLANNING]: PROJECT_STATUS_COLORS.PLANNING,
    [ProjectStatus.ACTIVE]: PROJECT_STATUS_COLORS.ACTIVE,
    [ProjectStatus.ON_HOLD]: PROJECT_STATUS_COLORS.ON_HOLD,
    [ProjectStatus.COMPLETED]: PROJECT_STATUS_COLORS.COMPLETED,
    [ProjectStatus.ARCHIVED]: PROJECT_STATUS_COLORS.ARCHIVED,
  } as Record<ProjectStatus, string>,
};

/**
 * PROJECT_API
 * -----------------------------------------------------------------------------
 * Consolidates all project-centric API mappings into a single object,
 * enabling uniform references to RESTful endpoints and preventing
 * endpoint string duplication or typos across the codebase.
 */
export const PROJECT_API = {
  /**
   * ENDPOINTS
   * ---------------------------------------------------------------------------
   * A record of functions and strings representing the definitive
   * URL paths for managing projects, including retrieval, updates,
   * status transitions, and analytics requests.
   */
  ENDPOINTS: PROJECT_API_ENDPOINTS,
} as const;