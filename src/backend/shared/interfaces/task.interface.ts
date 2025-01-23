/***********************************************************************************************
 * Production-Ready Task Interfaces for TaskStream AI
 * 
 * This file defines TypeScript interfaces used across the TaskStream AI platform to handle
 * task-related data structures, including enhanced workflow states and AI integration.
 * Comprehensive comments are provided to ensure clarity and maintainability in an
 * enterprise-scale environment. All items specified in the system and JSON specification
 * are fully implemented.
 ***********************************************************************************************/

// ------------------------------------------------------------------------------------------------
// Internal Imports (Ensuring correct usage of imported members in compliance with specification)
// ------------------------------------------------------------------------------------------------

import {
  /**
   * Common entity metadata used across the system (includes createdAt, updatedAt, createdBy,
   * updatedBy, and version for consistent record tracking).
   */
  Metadata
} from './common.interface';

import {
  /**
   * Enumeration of project states for validating if a task can be created or updated
   * under certain project status constraints (e.g., ACTIVE).
   */
  ProjectStatus
} from './project.interface';

import {
  /**
   * ResourceAnalytics interface providing advanced metrics for a task's resource usage
   * and efficiency. Implementation details in analytics.interface.ts. According to the
   * JSON specification, members used include utilization, efficiency, predictedCompletion,
   * and riskScore for enhanced analytics and predictions, though the base interface
   * may contain additional fields.
   */
  ResourceAnalytics
} from './analytics.interface';

// ------------------------------------------------------------------------------------------------
// Enumerations
// ------------------------------------------------------------------------------------------------

/**
 * Enumeration of task priority levels within TaskStream AI, reflecting the urgency
 * or importance of a task relative to others.
 */
export enum TaskPriority {
  /**
   * Indicates a task requiring immediate attention with minimal delays.
   */
  HIGH = 'HIGH',

  /**
   * Represents a task with moderate urgency or impact.
   */
  MEDIUM = 'MEDIUM',

  /**
   * Denotes a task of lower priority that can be addressed after higher-level tasks.
   */
  LOW = 'LOW',
}

/**
 * Enumeration of workflow statuses for a task within TaskStream AI, covering
 * the full lifecycle from backlog to completion.
 */
export enum TaskStatus {
  /**
   * Initial collection point for tasks yet to be refined or assigned.
   */
  BACKLOG = 'BACKLOG',

  /**
   * Indicates tasks that are validated or ready to begin.
   */
  TODO = 'TODO',

  /**
   * Tasks actively in development or progress.
   */
  IN_PROGRESS = 'IN_PROGRESS',

  /**
   * Tasks under review or in QA processes before final completion.
   */
  IN_REVIEW = 'IN_REVIEW',

  /**
   * Tasks fully completed and validated.
   */
  DONE = 'DONE',
}

/**
 * Enumeration of possible sources for task creation, reflecting both manual
 * user input and various automated extraction pipelines.
 */
export enum TaskSource {
  /**
   * Task manually inserted into the platform by a user.
   */
  MANUAL = 'MANUAL',

  /**
   * Task auto-extracted from an email message.
   */
  EMAIL = 'EMAIL',

  /**
   * Task auto-extracted from chat conversations.
   */
  CHAT = 'CHAT',

  /**
   * Task auto-extracted from meeting transcripts or notes.
   */
  MEETING = 'MEETING',
}

// ------------------------------------------------------------------------------------------------
// AI-Related Interface
// ------------------------------------------------------------------------------------------------

/**
 * Enhanced AI-generated metadata for tasks automatically extracted from natural
 * communications. Includes confidence measures, recognized entities, keywords,
 * sentiment analysis outputs, and advanced classification predictions.
 */
export interface AIMetadata {
  /**
   * Numerical score (0-1 or similar scale) representing the AI's confidence in
   * the correctness of this task's extraction.
   */
  confidence: number;

  /**
   * Identifier or reference to the source text/body from which this task was derived,
   * e.g., an email message ID or chat snippet ID.
   */
  extractedFrom: string;

  /**
   * Array of entities recognized by the NLP engine (e.g., names, dates, places).
   */
  entities: string[];

  /**
   * List of relevant keywords found within the source text, aiding categorization
   * and faster retrieval or tagging.
   */
  keywords: string[];

  /**
   * A score reflecting the overall sentiment of the task context, typically
   * ranging from negative (e.g., -1) to positive (e.g., +1).
   */
  sentimentScore: number;

  /**
   * Indicators suggesting higher task urgency, such as mention of deadlines or
   * critical references in the source text.
   */
  urgencyIndicators: string[];

  /**
   * Map of category labels (keys) to their respective confidence values (values),
   * providing more granular classification predictions for the task.
   */
  categoryPredictions: Record<string, number>;
}

// ------------------------------------------------------------------------------------------------
// Core Task Interface
// ------------------------------------------------------------------------------------------------

/**
 * Represents the foundational task entity with advanced capabilities, including
 * optional AI metadata, analytics insights, and additional fields to support
 * robust task management within the platform.
 */
export interface Task {
  /**
   * Unique identifier for the task, often a UUID or database-generated string.
   */
  id: string;

  /**
   * Identifier referencing the project to which this task belongs.
   */
  projectId: string;

  /**
   * Human-readable title summarizing the task's objective.
   */
  title: string;

  /**
   * Extended description providing more detail about the work required.
   */
  description: string;

  /**
   * Current workflow status (e.g., BACKLOG, IN_PROGRESS, DONE).
   */
  status: TaskStatus;

  /**
   * Priority level to distinguish urgent tasks from normal or deferred ones.
   */
  priority: TaskPriority;

  /**
   * Identifier for the user or resource assigned this task; empty string if unassigned.
   */
  assigneeId: string;

  /**
   * Due date for the task. This can be derived from scheduling or user input.
   */
  dueDate: Date;

  /**
   * Estimated number of hours required to complete this task.
   */
  estimatedHours: number;

  /**
   * Actual number of hours logged in the system for this task, useful for
   * variance reporting and productivity analysis.
   */
  actualHours: number;

  /**
   * Defines the source from which this task originated (manual entry, email, chat, etc.).
   */
  source: TaskSource;

  /**
   * AI-generated metadata for tasks extracted automatically, containing
   * confidence measures, recognized entities, sentiment, and more.
   */
  aiMetadata: AIMetadata;

  /**
   * Advanced analytics on resource usage, efficiency, and predictions for
   * fuller task insights. Incorporates utilization, efficiency, and
   * potential risk or completion projections.
   */
  analytics: ResourceAnalytics;

  /**
   * Common metadata fields for any entity within TaskStream AI, capturing
   * creation timestamps, version control, and update auditing.
   */
  metadata: Metadata;

  /**
   * Array of task identifiers representing dependencies that must be
   * completed or satisfied before this task can begin or finish.
   */
  dependencies: string[];

  /**
   * Assorted labels or tags enabling custom categorization, search, and
   * organization of tasks at scale.
   */
  tags: string[];

  /**
   * Represents the approximate completion progress of the task (0-100%).
   */
  completionPercentage: number;
}

// ------------------------------------------------------------------------------------------------
// Task Creation Interface
// ------------------------------------------------------------------------------------------------

/**
 * Payload structure for creating a new task in the platform, providing essential
 * details while omitting fields that are automatically generated or updated.
 */
export interface TaskCreateInput {
  /**
   * Identifier referencing the project to which this new task will belong.
   */
  projectId: string;

  /**
   * Title summarizing the main goal or action item for this task.
   */
  title: string;

  /**
   * Detailed description, clarifying requirements or steps to complete the task.
   */
  description: string;

  /**
   * Preliminary level of urgency or significance for the newly created task.
   */
  priority: TaskPriority;

  /**
   * Optional user or resource assignment; may be empty if not assigned.
   */
  assigneeId: string;

  /**
   * Initial due date establishing the time frame for completing this task.
   */
  dueDate: Date;

  /**
   * Estimated hours required, assisting in scheduling and resource allocation.
   */
  estimatedHours: number;

  /**
   * Source from which the task originated (manual user input, email parsing, etc.).
   */
  source: TaskSource;

  /**
   * Other tasks that must be completed first or otherwise linked to this new task.
   */
  dependencies: string[];

  /**
   * Optional set of tags for categorizing or quickly filtering this task.
   */
  tags: string[];
}

// ------------------------------------------------------------------------------------------------
// Task Update Interface
// ------------------------------------------------------------------------------------------------

/**
 * Payload structure for updating an existing task, including progress fields such
 * as actual hours and completion percentage.
 */
export interface TaskUpdateInput {
  /**
   * Revised or updated title for the task. If omitted, the title remains unchanged.
   */
  title: string;

  /**
   * Updated description or details for the task. If omitted, the description remains unchanged.
   */
  description: string;

  /**
   * Change to the workflow status (e.g., TODO -> IN_PROGRESS, IN_REVIEW -> DONE).
   */
  status: TaskStatus;

  /**
   * Adjusted priority reflecting changes in urgency or importance since creation.
   */
  priority: TaskPriority;

  /**
   * Reassignment of this task to another user or resource.
   */
  assigneeId: string;

  /**
   * Possible update to the task's due date.
   */
  dueDate: Date;

  /**
   * Updated estimate of hours required, potentially reflecting refined scoping.
   */
  estimatedHours: number;

  /**
   * Logged hours for actual work performed, aiding variance analysis.
   */
  actualHours: number;

  /**
   * Percentage indicating how much of the task is considered complete (0-100).
   */
  completionPercentage: number;

  /**
   * Updated dependencies for this task. Example: adding or removing prerequisite tasks.
   */
  dependencies: string[];

  /**
   * Updated set of tags, enabling re-categorization or refined searches.
   */
  tags: string[];
}

// ------------------------------------------------------------------------------------------------
// Utility for Task Validation Against Project Status
// ------------------------------------------------------------------------------------------------

/**
 * Utility function used to determine if a new or updated task can be managed within
 * a project that is in the ACTIVE status. This aligns with the specification requiring
 * referencing ProjectStatus for task validation.
 *
 * @param status - The current status of the project owning the task.
 * @returns true if the project is ACTIVE, false otherwise.
 */
export function isProjectActiveForTask(status: ProjectStatus): boolean {
  return status === ProjectStatus.ACTIVE;
}