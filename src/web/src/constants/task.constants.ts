/***************************************************************************************************
 * Task Constants for TaskStream AI (Web Frontend)
 *
 * This file defines comprehensive constants, enumerations, and configuration objects for all
 * task-related functionality required in the web application. It ensures consistency between
 * frontend and backend by referencing TaskPriority, TaskStatus, and TaskSource enumerations
 * from the shared backend interfaces. This file also includes validation limits, task board
 * configuration, display preferences (such as colors and icons), and AI extraction confidence
 * thresholds, all aligned with accessibility and type safety standards.
 *
 * References:
 * - Task Management: Automated creation, assignment, tracking
 * - Task Workflow: Board visualization, statuses, transitions
 * - Task Extraction: AI-based extraction from communications, with source tracking
 * - UI Design Compliance: Matches color scheme, icons, and labeling from design specifications
 ***************************************************************************************************/

// -------------------------------------------------------------------------------------------------
// Internal Imports (from backend shared interfaces) - versioned to maintain consistent enumerations
// -------------------------------------------------------------------------------------------------
// NOTE: For third-party libraries (if any), include the library version in a comment near the import.

import {
  TaskPriority, // enum { HIGH = 'HIGH', MEDIUM = 'MEDIUM', LOW = 'LOW' }
  TaskStatus,   // enum { BACKLOG = 'BACKLOG', TODO = 'TODO', IN_PROGRESS = 'IN_PROGRESS', IN_REVIEW = 'IN_REVIEW', DONE = 'DONE' }
  TaskSource    // enum { MANUAL = 'MANUAL', EMAIL = 'EMAIL', CHAT = 'CHAT', MEETING = 'MEETING' }
} from '../../../backend/shared/interfaces/task.interface';

// -------------------------------------------------------------------------------------------------
// Global Task-Related Constants
// These constants represent validation bounds, default columns, color mappings, icons, etc.
// -------------------------------------------------------------------------------------------------

/**
 * Minimum allowable length for a task title to meet basic clarity requirements.
 */
export const TASK_TITLE_MIN_LENGTH = 3;

/**
 * Maximum allowable length for a task title, preventing overly verbose entries.
 */
export const TASK_TITLE_MAX_LENGTH = 100;

/**
 * Maximum allowable length for a task description, accounting for user comfort
 * while enforcing practical text limits for storage and performance considerations.
 */
export const TASK_DESCRIPTION_MAX_LENGTH = 2000;

/**
 * Minimum number of hours for a task estimate, set to 0 to allow tasks that may
 * require negligible additional effort.
 */
export const TASK_ESTIMATED_HOURS_MIN = 0;

/**
 * Maximum number of hours for a task estimate, preventing excessive or unrealistic values.
 */
export const TASK_ESTIMATED_HOURS_MAX = 240;

/**
 * Default ordered list of task board columns, corresponding to valid workflow statuses.
 * This array is employed within the board configuration to arrange columns visually.
 */
export const TASK_BOARD_COLUMNS: TaskStatus[] = [
  TaskStatus.BACKLOG,
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.DONE
];

/**
 * Mapping of task priority levels to color codes, supporting visual emphasis on urgent tasks.
 */
export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  [TaskPriority.HIGH]: '#EF4444',    // Red hue to indicate highest urgency
  [TaskPriority.MEDIUM]: '#F59E0B',  // Orange hue to mark moderate priority
  [TaskPriority.LOW]: '#10B981'      // Green hue to signal lower urgency
};

/**
 * Mapping of task statuses to color codes, enabling consistent visual cues
 * for each stage of the workflow (Backlog through Done).
 */
export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  [TaskStatus.BACKLOG]: '#64748B',    // Grayish-blue for tasks not yet refined
  [TaskStatus.TODO]: '#2563EB',       // Blue to highlight actionable items
  [TaskStatus.IN_PROGRESS]: '#F59E0B',// Orange to denote ongoing active work
  [TaskStatus.IN_REVIEW]: '#8B5CF6',  // Violet to reflect pending review or QA
  [TaskStatus.DONE]: '#10B981'        // Green to celebrate completion
};

/**
 * Mapping of task sources (manual, email, chat, meeting) to icon identifiers
 * used in the UI. These icon names should align with the chosen UI icon library.
 */
export const TASK_SOURCE_ICONS: Record<TaskSource, string> = {
  [TaskSource.MANUAL]: 'edit',   // Icon representing manual or user-driven entry
  [TaskSource.EMAIL]: 'email',   // Icon symbolizing an email source
  [TaskSource.CHAT]: 'chat',     // Icon illustrating chat-based creation
  [TaskSource.MEETING]: 'video'  // Icon denoting a meeting transcript source
};

/**
 * Specifies the array of required fields for task creation or updates, ensuring
 * minimal indispensable inputs are present for a valid task entity.
 */
export const TASK_REQUIRED_FIELDS: string[] = ['title', 'status', 'priority'];

/**
 * Defines allowed workflow transitions between task statuses. Each status is
 * followed by an array of valid next statuses to support the progression model.
 */
export const TASK_TRANSITION_RULES: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.BACKLOG]: [TaskStatus.TODO],
  [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.IN_REVIEW],
  [TaskStatus.IN_REVIEW]: [TaskStatus.TODO, TaskStatus.DONE],
  [TaskStatus.DONE]: [TaskStatus.TODO]
};

/**
 * Defines AI-based extraction confidence thresholds for task creation. These
 * thresholds can be used to highlight or triage tasks automatically extracted
 * from natural language sources, reflecting how confident the NLP system was.
 */
export const TASK_AI_EXTRACTION_CONFIDENCE: Record<TaskPriority, number> = {
  [TaskPriority.HIGH]: 0.9,
  [TaskPriority.MEDIUM]: 0.7,
  [TaskPriority.LOW]: 0.5
};

// -------------------------------------------------------------------------------------------------
// Validation Rules Object
// Contains length restrictions, required fields, and other constraints for task properties.
// -------------------------------------------------------------------------------------------------

/**
 * Comprehensive validation rules for task properties in the web frontend.
 * Includes string length limits for title/description, numeric boundary checks
 * for estimated hours, and a list of mandatory fields.
 */
export const TASK_VALIDATION_RULES = {
  /**
   * Title constraints, leveraging the global min/max length constants.
   */
  title: {
    minLength: TASK_TITLE_MIN_LENGTH,
    maxLength: TASK_TITLE_MAX_LENGTH
  },

  /**
   * Description constraints, focusing on maximum permitted length.
   */
  description: {
    maxLength: TASK_DESCRIPTION_MAX_LENGTH
  },

  /**
   * Estimated hours constraints, limiting the numeric range to realistic values.
   */
  estimatedHours: {
    min: TASK_ESTIMATED_HOURS_MIN,
    max: TASK_ESTIMATED_HOURS_MAX
  },

  /**
   * Ensures that certain fields are always present to form a valid task entity.
   */
  required: TASK_REQUIRED_FIELDS
};

// -------------------------------------------------------------------------------------------------
// Board Configuration Object
// Groups columns, color mapping, and status transition rules for the UI board display.
// -------------------------------------------------------------------------------------------------

/**
 * Configuration for the task board visualization, aligning the frontend layout
 * with statuses, colors, and permissible transitions. The columns array dictates
 * ordering, the colors object provides visual feedback, and the transitions
 * collection enforces logical workflow movements.
 */
export const TASK_BOARD_CONFIG = {
  /**
   * Ordered collection of workflow columns used in the UI board display.
   */
  columns: TASK_BOARD_COLUMNS,

  /**
   * Status-color mappings providing a consistent color scheme for each workflow state.
   */
  colors: TASK_STATUS_COLORS,

  /**
   * Defines which status transitions are valid when moving tasks across the board.
   */
  transitions: TASK_TRANSITION_RULES
};

// -------------------------------------------------------------------------------------------------
// Display Configuration Object
// Provides color codes for priorities, icon representations for task sources,
// and AI confidence thresholds to highlight tasks extracted automatically.
// -------------------------------------------------------------------------------------------------

/**
 * Configuration for how tasks are displayed on the frontend, including color
 * swatches for priorities, icon references for source origins, and thresholds
 * that indicate the AI's confidence in automatically extracted tasks.
 */
export const TASK_DISPLAY_CONFIG = {
  /**
   * Association of each priority (HIGH, MEDIUM, LOW) with a specific color code.
   */
  priorityColors: TASK_PRIORITY_COLORS,

  /**
   * Icon references that reflect the method by which a task was created
   * (manual, email, chat, or meeting transcript).
   */
  sourceIcons: TASK_SOURCE_ICONS,

  /**
   * Numerical values denoting the AI confidence in extraction. This can guide
   * special highlighting or sorting of tasks that need additional user review.
   */
  aiConfidence: TASK_AI_EXTRACTION_CONFIDENCE
};