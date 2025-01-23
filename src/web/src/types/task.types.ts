/**
 * -----------------------------------------------------------------------------
 * Task Types Module
 * -----------------------------------------------------------------------------
 * This file defines all TypeScript enumerations and interfaces necessary to
 * manage and render tasks within the TaskStream AI frontend application.
 *
 * Requirements Addressed:
 * 1) Task Management (Technical Specifications/1.2 System Overview/High-Level Description)
 *    - Automated task creation, assignment, and tracking functionality.
 * 2) Data Schema (Technical Specifications/3.2 Database Design/3.2.1 Schema Design)
 *    - Ensures frontend task data structures match the database schema.
 * 3) Task Board View (Technical Specifications/6.5 Project Board View)
 *    - Provides interfaces for task visualization and enhanced filtering options.
 * 4) Analytics Integration (Technical Specifications/1.2 System Overview/High-Level Description)
 *    - Integrates with resource analytics for predictive task insights.
 *
 * Internal Imports:
 *  - { Metadata } from './common.types'    [Interface for creation/update info]
 *  - { ResourceAnalytics } from './analytics.types' [Interface for resource utilization details]
 */

import { Metadata } from './common.types';
import { ResourceAnalytics } from './analytics.types';

/**
 * Enum: TaskPriority
 * -----------------------------------------------------------------------------
 * Represents the priority level of a task, indicating its relative importance
 * and urgency. This enum supports sorting and filtering within the Task Board
 * and helps guide resource allocation.
 */
export enum TaskPriority {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

/**
 * Enum: TaskStatus
 * -----------------------------------------------------------------------------
 * Defines the various workflow states that a task may occupy within the system.
 * These states drive visual columns on the Task Board and can be utilized for
 * analytics on task progression.
 */
export enum TaskStatus {
  BACKLOG = 'BACKLOG',
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  IN_REVIEW = 'IN_REVIEW',
  DONE = 'DONE',
}

/**
 * Enum: TaskSource
 * -----------------------------------------------------------------------------
 * Specifies how a task was created. MANUAL tasks are user-initiated, whereas
 * other sources (EMAIL, CHAT, MEETING) indicate automated extraction from
 * different communication channels using NLP technology.
 */
export enum TaskSource {
  MANUAL = 'MANUAL',
  EMAIL = 'EMAIL',
  CHAT = 'CHAT',
  MEETING = 'MEETING',
}

/**
 * Interface: AIMetadata
 * -----------------------------------------------------------------------------
 * Holds AI-extracted details for automatically generated or augmented tasks.
 * This metadata is populated when tasks are created from external sources
 * like emails, chat messages, or meeting transcripts.
 */
export interface AIMetadata {
  /**
   * Represents the algorithm’s confidence score (0.0 - 1.0) in deriving
   * the correct task content from the source.
   */
  confidence: number;

  /**
   * A reference to the origin of this data, such as an email thread ID,
   * chat message ID, or transcript identifier.
   */
  extractedFrom: string;

  /**
   * An array of entity names (e.g., user references, system components)
   * extracted by AI for more context and potential linking to other records.
   */
  entities: string[];

  /**
   * A set of key terms or phrases discovered in the source data,
   * used to improve search and classification of the task.
   */
  keywords: string[];
}

/**
 * Interface: Task
 * -----------------------------------------------------------------------------
 * Core representation of a task used within the TaskStream AI platform. This
 * interface aligns with the database schema while incorporating both
 * user-defined and AI-generated fields. Extends analytics capabilities by
 * linking ResourceAnalytics for monitoring task-level resource usage.
 */
export interface Task {
  /**
   * Unique identifier for the task.
   */
  id: string;

  /**
   * The project under which this task is grouped.
   */
  projectId: string;

  /**
   * Short, descriptive title conveying the task’s main intent.
   */
  title: string;

  /**
   * Detailed description providing context, requirements, or guidance for
   * completing the task.
   */
  description: string;

  /**
   * The current workflow status of this task.
   */
  status: TaskStatus;

  /**
   * The urgency or priority level of this task.
   */
  priority: TaskPriority;

  /**
   * Unique identifier of the assigned team member responsible for
   * completing or overseeing the task.
   */
  assigneeId: string;

  /**
   * The date/time by which the task must be completed.
   */
  dueDate: Date;

  /**
   * Estimated effort (in hours) required to complete this task.
   */
  estimatedHours: number;

  /**
   * The actual amount of time spent on the task, logged by the assignee.
   */
  actualHours: number;

  /**
   * Origin of this task, indicating whether it was manually created
   * or automatically extracted by AI from communications.
   */
  source: TaskSource;

  /**
   * AI-generated insights and keywords associated with the task, if any.
   */
  aiMetadata: AIMetadata;

  /**
   * Resource analytics data pertaining to the task. Provides insight
   * into utilization and efficiency for teams adopting data-driven
   * task management strategies.
   */
  analytics: ResourceAnalytics;

  /**
   * Immutable metadata capturing creation and last update timestamps,
   * along with responsible user identifiers.
   */
  metadata: Metadata;
}

/**
 * Interface: TaskCreateInput
 * -----------------------------------------------------------------------------
 * Describes the shape of the data used to create a new task. This structure
 * ensures the minimum fields necessary for task creation and alignment with
 * validation rules in the frontend form logic.
 */
export interface TaskCreateInput {
  /**
   * The identifier of the project to which this new task is associated.
   */
  projectId: string;

  /**
   * The short title that briefly summarizes the objective of the task.
   */
  title: string;

  /**
   * A text describing the task’s requirements or goals in greater detail.
   */
  description: string;

  /**
   * The priority level set for the new task.
   */
  priority: TaskPriority;

  /**
   * The person or role assigned to complete or manage this task.
   */
  assigneeId: string;

  /**
   * The due date that indicates the deadline for this task.
   */
  dueDate: Date;

  /**
   * An initial estimate of the effort (in hours) anticipated for
   * accomplishing this task.
   */
  estimatedHours: number;
}

/**
 * Interface: TaskUpdateInput
 * -----------------------------------------------------------------------------
 * Provides optional fields for updating an existing task. This interface
 * covers status changes, priority shifts, and logging of actual hours worked
 * after task completion or partial progress.
 */
export interface TaskUpdateInput {
  /**
   * The updated short title for this task.
   */
  title: string;

  /**
   * Revised or expanded details capturing key instructions or aims.
   */
  description: string;

  /**
   * The new workflow status reflecting the task’s current position.
   */
  status: TaskStatus;

  /**
   * The updated priority level of the task.
   */
  priority: TaskPriority;

  /**
   * Modified assignee, in case the task ownership is transferred.
   */
  assigneeId: string;

  /**
   * The updated deadline for this task, if the schedule has changed.
   */
  dueDate: Date;

  /**
   * Altered effort estimate based on refined planning or new information.
   */
  estimatedHours: number;

  /**
   * Logged hours reflecting the time actually spent on the task.
   */
  actualHours: number;
}

/**
 * Interface: TaskFilter
 * -----------------------------------------------------------------------------
 * Defines filtering options used on the Task Board or in list views.
 * Supports multi-select arrays for statuses, priorities, assigned users,
 * and a date range filter for tasks whose due dates lie within the specified
 * start and end times.
 */
export interface TaskFilter {
  /**
   * The set of statuses used to restrict the output to certain workflow states.
   */
  status: TaskStatus[];

  /**
   * Indicates allowed priority levels. Tasks falling outside these priorities
   * should be excluded from the results.
   */
  priority: TaskPriority[];

  /**
   * A list of user IDs. Only tasks assigned to any of these users should appear
   * in the filtered results.
   */
  assigneeId: string[];

  /**
   * A date range object specifying the earliest and latest due dates.
   */
  dueDateRange: {
    start: Date;
    end: Date;
  };
}