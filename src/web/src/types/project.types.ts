/**
 * This file defines TypeScript types and interfaces for project-related
 * data structures used in the frontend application, ensuring type safety
 * and consistency with backend interfaces. It covers the core functionality
 * of project management, aligns with data schema design requirements, and
 * supports resource management features (analytics, bottleneck identification,
 * and utilization tracking) as outlined in the technical specifications.
 */

// -----------------------------------------------------------------------------
// Internal Imports: Ensuring correctness based on provided source definitions
// -----------------------------------------------------------------------------
import { ApiResponse, PaginatedResponse, Metadata } from '../types/common.types';

/**
 * Enumeration: ProjectStatus
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Enumerates the valid statuses that a project can have throughout its lifecycle.
 * 
 * Description:
 *   Each status string is self-descriptive, capturing the progress or state
 *   of a project. The system leverages these states for display, filtering,
 *   and workflow logic.
 */
export enum ProjectStatus {
  PLANNING = 'PLANNING',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Interface: ResourceAnalytics
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Encapsulates data relevant to resource utilization and performance metrics
 *   for a given project. This includes both real and predicted metrics used
 *   to optimize resource allocation.
 * 
 * Description:
 *   The resource allocation is represented as a map of resource identifier
 *   (e.g. developer ID, machine ID) to numeric usage. Performance metrics
 *   can be any number-based KPI, such as velocity or throughput. Bottlenecks
 *   highlight constraints within the project.
 */
export interface ResourceAnalytics {
  /**
   * A percentage (0-100) indicating how much of the project's allocated
   * resource capacity is currently in use.
   */
  resourceUtilization: number;

  /**
   * A predicted date/time by which the project is estimated
   * to complete based on current resource usage.
   */
  predictedCompletion: Date;

  /**
   * Mapping of resource identifiers to their current usage metric.
   * The key might represent a user or resource name; the value is
   * a numeric metric like hours, points, or percentages.
   */
  resourceAllocation: Map<string, number>;

  /**
   * A flexible record of extra performance-related metrics,
   * expressed as key-value pairs where the value is numeric.
   */
  performanceMetrics: Record<string, number>;

  /**
   * A list of known or suspected bottlenecks in the project.
   * Each list item is a descriptor indicating a specific area
   * causing delays or constraints.
   */
  bottlenecks: string[];
}

/**
 * Interface: TaskReference
 * ----------------------------------------------------------------------------
 * Purpose:
 *   A lightweight reference to a task object, preventing circular dependencies
 *   between the task and project data structures.
 * 
 * Description:
 *   This interface carries the most essential information about a task,
 *   including a simple string-based status for flexible usage across
 *   different workspace configurations.
 */
export interface TaskReference {
  /**
   * Unique identifier of the referenced task.
   */
  id: string;

  /**
   * The parent project ID to which this task belongs.
   */
  projectId: string;

  /**
   * Concise title summarizing the task contents.
   */
  title: string;

  /**
   * Status string representing the task state
   * (e.g. 'OPEN', 'IN_PROGRESS', 'DONE').
   */
  status: string;
}

/**
 * Interface: Project
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Describes the full project entity with all relevant data,
 *   including identification, scheduling, status tracking,
 *   resource metrics, and metadata.
 * 
 * Description:
 *   This interface centralizes all information about a project,
 *   enforcing consistent usage across the application. The tasks array
 *   leverages the TaskReference interface to avoid deep nesting.
 */
export interface Project {
  /**
   * Unique identifier for the project entity.
   */
  id: string;

  /**
   * Human-readable name or title of the project, used to identify it
   * within the UI or in references.
   */
  name: string;

  /**
   * Detailed description that provides additional context about
   * the project's objectives, scope, or constraints.
   */
  description: string;

  /**
   * The current state of the project in the system's lifecycle.
   * Constrained by the ProjectStatus enumeration.
   */
  status: ProjectStatus;

  /**
   * The date and time at which the project is expected (or planned)
   * to start. Useful for scheduling and timeline projections.
   */
  startDate: Date;

  /**
   * The expected or targeted completion date for the project.
   * May be adjusted as the project evolves.
   */
  endDate: Date;

  /**
   * Identifier for the team that owns or is primarily responsible
   * for this project's execution.
   */
  teamId: string;

  /**
   * A read-only array of task references belonging to this project.
   * Avoids a full-blown circular dependency while enabling linking
   * between projects and tasks.
   */
  readonly tasks: readonly TaskReference[];

  /**
   * An aggregated analytics object storing performance metrics,
   * resource utilization, predictions, and any identified bottlenecks.
   */
  analytics: ResourceAnalytics;

  /**
   * Immutable metadata capturing timestamps and user references
   * for creation and updates, as defined in the common types module.
   */
  metadata: Metadata;
}

/**
 * Interface: ProjectCreateInput
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Used for creating a new project in the system. 
 * 
 * Description:
 *   Carries the essential properties that a user or system must supply
 *   to initialize a project. Additional fields (e.g. status, analytics)
 *   may be set by default or derived from other data upon creation.
 */
export interface ProjectCreateInput {
  /**
   * Proposed project name.
   */
  name: string;

  /**
   * Explains key aspects such as the purpose, scope, or vision
   * of the new project being created.
   */
  description: string;

  /**
   * Proposed or planned project start date.
   */
  startDate: Date;

  /**
   * Proposed or planned project end date.
   */
  endDate: Date;

  /**
   * Unique identifier of the team that will undertake this new project.
   */
  teamId: string;
}

/**
 * Interface: ProjectUpdateInput
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Used for modifying or updating an existing project within the system.
 * 
 * Description:
 *   Expands upon ProjectCreateInput by including a status field, reflective
 *   of the project's progression. All fields are mandatory in this definition,
 *   though in practice partial updates can be performed at the service level.
 */
export interface ProjectUpdateInput {
  /**
   * Updated project name.
   */
  name: string;

  /**
   * Updated or refined project description.
   */
  description: string;

  /**
   * Status representing the project's current lifecycle stage.
   * Accepts any value from the ProjectStatus enum.
   */
  status: ProjectStatus;

  /**
   * Revised or confirmed project start date.
   */
  startDate: Date;

  /**
   * Revised or confirmed project end date.
   */
  endDate: Date;

  /**
   * Team identifier updated in cases where the project’s
   * ownership or responsibility has changed.
   */
  teamId: string;
}

/**
 * Type: ProjectResponse
 * ----------------------------------------------------------------------------
 * Purpose:
 *   A specialized alias connecting the ApiResponse generic to the
 *   Project interface, facilitating the return of a single project entity.
 * 
 * Description:
 *   Ensures that all typical API response fields (status code, message,
 *   timestamps, etc.) are combined with a strongly typed Project as 'data.'
 */
export type ProjectResponse = ApiResponse<Project>;

/**
 * Type: ProjectListResponse
 * ----------------------------------------------------------------------------
 * Purpose:
 *   A specialized alias connecting the PaginatedResponse generic to the
 *   Project interface, enabling paged listing of project entities.
 * 
 * Description:
 *   Delivers a list of Project objects along with pagination metadata,
 *   such as total item counts and page indicators, for UI or other consumers.
 */
export type ProjectListResponse = PaginatedResponse<Project>;