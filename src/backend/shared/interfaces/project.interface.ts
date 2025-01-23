/********************************************************************************************
 * Production-Ready Project Interfaces for TaskStream AI
 * 
 * This file defines TypeScript interfaces used across the TaskStream AI platform to model
 * project-related data structures, including status enumeration, core project fields,
 * resource analytics integration, and partial update capabilities. Extensive comments
 * provide guidance for maintainers and integrators in an enterprise-scale environment.
 ********************************************************************************************/

// ------------------------------------------------------------------------------------------------
// Internal Imports (with references to actual source files and their declared interfaces)
// ------------------------------------------------------------------------------------------------
import { 
  /**
   * Common metadata fields for tracking creation, updates, and versioning.
   * Includes: createdAt, updatedAt, createdBy, updatedBy, version
   */
  Metadata 
} from './common.interface';

import {
  /**
   * Enhanced resource analytics interface providing the following:
   *  - utilization: number
   *  - efficiency: number
   *  - predictedCompletion: Date
   *  - resourceAllocation: Record<string, number>
   *  
   * See analytics.interface.ts for additional details on resource tracking.
   */
  ResourceAnalytics
} from './analytics.interface';

// ------------------------------------------------------------------------------------------------
// Enumerations
// ------------------------------------------------------------------------------------------------

/**
 * Enumeration of possible project statuses, reflecting the lifecycle stages
 * that a project may transition through during its existence in TaskStream AI.
 */
export enum ProjectStatus {
  /**
   * Project is in the planning stage before official work has begun.
   */
  PLANNING = 'PLANNING',

  /**
   * Project is active and ongoing, with assigned tasks being executed.
   */
  ACTIVE = 'ACTIVE',

  /**
   * Project progress is temporarily on hold, awaiting further decisions or resources.
   */
  ON_HOLD = 'ON_HOLD',

  /**
   * Project has been successfully completed, with all major deliverables finished.
   */
  COMPLETED = 'COMPLETED',

  /**
   * Project is archived, indicating it is no longer actively maintained or tracked.
   */
  ARCHIVED = 'ARCHIVED',
}

// ------------------------------------------------------------------------------------------------
// Supporting Interfaces
// ------------------------------------------------------------------------------------------------

/**
 * Basic reference to a Task entity in the TaskStream AI ecosystem. This is used
 * for establishing relationships within the Project interface without loading
 * full task details. Detailed task data resides in its own interface or module.
 */
export interface TaskReference {
  /**
   * Unique identifier for the referenced task, typically a UUID or database ID.
   */
  id: string;
}

// ------------------------------------------------------------------------------------------------
// Main Interfaces
// ------------------------------------------------------------------------------------------------

/**
 * Represents a TaskStream AI project with comprehensive resource, analytics,
 * and status tracking. Aligns with the system-wide Data Schema Design, enabling
 * robust collaboration within the platform.
 */
export interface Project {
  /**
   * Unique identifier for the project. Typically, this is a UUID or database ID
   * for internal reference and data retrieval.
   */
  id: string;

  /**
   * Human-readable name for the project, displayed to end users in dashboards
   * and throughout the UI.
   */
  name: string;

  /**
   * A brief or extended description of the project, giving context and objectives
   * for all stakeholders.
   */
  description: string;

  /**
   * Lifecycle stage of the project. May be PLANNING, ACTIVE, ON_HOLD, COMPLETED,
   * or ARCHIVED.
   */
  status: ProjectStatus;

  /**
   * Scheduled or assumed start date for the project, used for timeline calculations
   * and reporting.
   */
  startDate: Date;

  /**
   * Estimated or actual end date for the project, factoring into resource planning
   * and milestone tracking.
   */
  endDate: Date;

  /**
   * Identifier referencing the team or department primarily responsible for this
   * project. Used for collaboration, permissions, and reporting structures.
   */
  teamId: string;

  /**
   * Array of task references associated with this project. Each entry is a lightweight
   * pointer to a more detailed task record.
   */
  tasks: TaskReference[];

  /**
   * Metrics reflecting resource utilization and efficiency, often populated via
   * the analytics engine. Typically used for forecasting and spotting bottlenecks.
   */
  analytics: ResourceAnalytics;

  /**
   * Common metadata fields (creation, update history, versioning) consistent across
   * all major entities in TaskStream AI.
   */
  metadata: Metadata;

  /**
   * Collection of resource identifiers (e.g., user IDs, machine IDs) that are made
   * available to this project. Facilitates advanced resource allocation, optimization,
   * and forecasting in the platform's analytics engine.
   */
  resourcePool: string[];
}

/**
 * Interface for partially updating project data. All fields are optional, allowing
 * selective modification of properties like name, description, or resource allocation
 * without requiring a complete entity overwrite.
 */
export interface ProjectUpdateInput {
  /**
   * Updated project name or title. If undefined, this field remains unchanged.
   */
  name: string | undefined;

  /**
   * Updated description or summary of the project’s purpose and scope.
   */
  description: string | undefined;

  /**
   * Updated status of the project. May transition between PLANNING, ACTIVE, ON_HOLD,
   * COMPLETED, and ARCHIVED.
   */
  status: ProjectStatus | undefined;

  /**
   * Revised start date of the project, typically adjusting scheduling and timeline
   * calculations.
   */
  startDate: Date | undefined;

  /**
   * Revised end date of the project, factoring into milestone completion and resource
   * planning.
   */
  endDate: Date | undefined;

  /**
   * Pointer to a different team ID if project ownership or collaboration responsibilities
   * are being reassigned.
   */
  teamId: string | undefined;

  /**
   * Enhanced resource pool, allowing new or removed resource identifiers to be merged
   * into existing project allocations.
   */
  resourcePool: string[] | undefined;
}