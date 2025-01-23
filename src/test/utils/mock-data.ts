/***********************************************************************************************
 * Provides comprehensive mock data generation utilities for testing the TaskStream AI platform.
 * This file includes factories for tasks, projects, users, and analytics data with support for
 * AI metadata, security features, and complex relationships between entities. It adheres to the
 * defined database schemas, ensuring data integrity and facilitating both functional and
 * performance testing scenarios.
 ***********************************************************************************************/

//////////////////////////////////////////////////////////////////////////////////////////////
// External Imports (Version-Specific)
//////////////////////////////////////////////////////////////////////////////////////////////

// Importing the faker library (version ^8.0.0) for generating realistic fake data.
import { faker } from '@faker-js/faker'; // ^8.0.0

// Importing the uuid library (version ^9.0.0) for generating unique IDs.
import { v4 as uuid } from 'uuid'; // ^9.0.0

//////////////////////////////////////////////////////////////////////////////////////////////
// Internal Imports (Ensuring correct usage in compliance with provided interfaces)
//////////////////////////////////////////////////////////////////////////////////////////////

// Task-related imports including enumerations and AI metadata interface.
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskSource,
  AIMetadata
} from '../../backend/shared/interfaces/task.interface';

// Project-related imports: core project interface, status enumerations.
import {
  Project,
  ProjectStatus
} from '../../backend/shared/interfaces/project.interface';

// User and authentication data structures with role-based access control.
import {
  IUser,
  UserRole
} from '../../backend/shared/interfaces/auth.interface';

// Analytics data structures for dashboards, metrics, and resource analytics.
import {
  AnalyticsDashboard,
  PerformanceMetric,
  ResourceAnalytics,
  TeamPerformance
} from '../../backend/shared/interfaces/analytics.interface';

//////////////////////////////////////////////////////////////////////////////////////////////
// Utility Types & Interfaces (Local)
//////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Represents a partial override of the Task interface, enabling
 * consumers to provide specific field values that replace the
 * randomly generated defaults.
 */
type TaskOverrides = Partial<Task>;

/**
 * Represents a partial override of the Project interface, enabling
 * selective updates of generated fields.
 */
type ProjectOverrides = Partial<Project>;

/**
 * Represents a partial override of the IUser interface, giving test
 * scenarios the flexibility to customize user properties.
 */
type UserOverrides = Partial<IUser>;

/**
 * Represents a partial override of the AnalyticsDashboard interface,
 * suited for advanced test scenarios where certain analytics fields
 * need to be rigorously controlled or tested.
 */
type AnalyticsOverrides = Partial<AnalyticsDashboard>;

//////////////////////////////////////////////////////////////////////////////////////////////
// 1) createMockTask
//////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Generates a mock Task with realistic random data. This includes:
 *  - Unique ID
 *  - Random titles and descriptions
 *  - AI metadata such as confidence scores and sentiment
 *  - Resource analytics for task-level insights
 *  - Required schema fields like projectId, status, priority, etc.
 *
 * Steps (as specified by the JSON requirements):
 *  1) Generate unique ID using uuid
 *  2) Create base task object with faker data
 *  3) Generate AI metadata including confidence scores and predictions
 *  4) Create task analytics data with performance metrics
 *  5) Validate task object against Task interface (compile-time)
 *  6) Apply any provided overrides
 *  7) Return complete task object
 *
 * @param overrides - Partial values to override the default generated properties
 * @returns A fully populated Task object compliant with the Task interface
 */
export function createMockTask(overrides?: TaskOverrides): Task {
  // Step 1: Generate unique IDs and random fields
  const baseTask: Task = {
    id: uuid(),
    projectId: uuid(),
    title: faker.lorem.sentence(),
    description: faker.lorem.paragraph(),
    status: faker.helpers.arrayElement([
      TaskStatus.BACKLOG,
      TaskStatus.TODO,
      TaskStatus.IN_PROGRESS,
      TaskStatus.IN_REVIEW,
      TaskStatus.DONE
    ]),
    priority: faker.helpers.arrayElement([
      TaskPriority.HIGH,
      TaskPriority.MEDIUM,
      TaskPriority.LOW
    ]),
    assigneeId: faker.datatype.boolean() ? uuid() : '',
    dueDate: faker.date.soon(),
    estimatedHours: faker.datatype.number({ min: 1, max: 20 }),
    actualHours: 0,
    source: faker.helpers.arrayElement([
      TaskSource.MANUAL,
      TaskSource.EMAIL,
      TaskSource.CHAT,
      TaskSource.MEETING
    ]),
    aiMetadata: {
      confidence: faker.datatype.number({ min: 0, max: 1, precision: 0.01 }),
      extractedFrom: uuid(),
      entities: faker.helpers.uniqueArray(() => faker.lorem.word(), 3),
      keywords: faker.helpers.uniqueArray(() => faker.lorem.word(), 5),
      sentimentScore: faker.datatype.number({ min: -1, max: 1, precision: 0.01 }),
      urgencyIndicators: faker.datatype.boolean()
        ? [faker.lorem.word(), faker.lorem.word()]
        : [],
      categoryPredictions: {
        [faker.lorem.word()]: faker.datatype.number({
          min: 0,
          max: 1,
          precision: 0.01
        }),
        [faker.lorem.word()]: faker.datatype.number({
          min: 0,
          max: 1,
          precision: 0.01
        })
      }
    } as AIMetadata,
    analytics: {
      resourceId: uuid(),
      utilization: faker.datatype.number({ min: 0, max: 100, precision: 0.01 }),
      allocatedHours: faker.datatype.number({ min: 1, max: 20 }),
      actualHours: faker.datatype.number({ min: 0, max: 20 }),
      efficiency: faker.datatype.number({ min: 0, max: 1, precision: 0.01 })
    } as ResourceAnalytics,
    metadata: {
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      createdBy: faker.internet.email(),
      updatedBy: faker.internet.email(),
      version: faker.datatype.number({ min: 1, max: 10 })
    },
    dependencies: faker.datatype.boolean()
      ? [uuid(), uuid()]
      : [],
    tags: faker.datatype.boolean()
      ? [faker.lorem.word(), faker.lorem.word()]
      : [],
    completionPercentage: faker.datatype.number({ min: 0, max: 100 })
  };

  // Step 6: Apply overrides to allow test scenarios to adjust fields
  const finalTask: Task = {
    ...baseTask,
    ...(overrides || {})
  };

  // Step 7: Return the completed object
  return finalTask;
}

//////////////////////////////////////////////////////////////////////////////////////////////
// 2) createMockProject
//////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Generates a mock Project with realistic random data. This includes:
 *  - Unique ID
 *  - Random names, descriptions, and statuses
 *  - Resource analytics representing project-level usage
 *  - Relationships to tasks through an array of task references
 *
 * Steps (per the specification):
 *  1) Generate unique ID using uuid
 *  2) Create base project object with faker data
 *  3) Generate mock tasks with relationships (via TaskReference IDs)
 *  4) Create resource metrics data (ResourceAnalytics)
 *  5) Validate project object against Project interface (compile-time)
 *  6) Apply any provided overrides
 *  7) Return complete project object
 *
 * @param overrides - Partial values to override the default generated properties
 * @returns A fully populated Project object compliant with the Project interface
 */
export function createMockProject(overrides?: ProjectOverrides): Project {
  // Step 1 & 2: Generate unique IDs and random fields
  const baseProject: Project = {
    id: uuid(),
    name: faker.company.name(),
    description: faker.lorem.paragraph(),
    status: faker.helpers.arrayElement([
      ProjectStatus.PLANNING,
      ProjectStatus.ACTIVE,
      ProjectStatus.ON_HOLD,
      ProjectStatus.COMPLETED,
      ProjectStatus.ARCHIVED
    ]),
    startDate: faker.date.past(),
    endDate: faker.date.future(),
    teamId: uuid(),
    tasks: faker.datatype.boolean()
      ? [{ id: uuid() }, { id: uuid() }]
      : [],
    analytics: {
      resourceId: uuid(),
      utilization: faker.datatype.number({ min: 0, max: 100, precision: 0.01 }),
      allocatedHours: faker.datatype.number({ min: 5, max: 200 }),
      actualHours: faker.datatype.number({ min: 0, max: 200 }),
      efficiency: faker.datatype.number({ min: 0, max: 1, precision: 0.01 })
    },
    metadata: {
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      createdBy: faker.internet.email(),
      updatedBy: faker.internet.email(),
      version: faker.datatype.number({ min: 1, max: 5 })
    },
    resourcePool: faker.datatype.boolean()
      ? [uuid(), uuid()]
      : []
  };

  // Step 6: Apply overrides
  const finalProject: Project = {
    ...baseProject,
    ...(overrides || {})
  };

  // Step 7: Return the completed object
  return finalProject;
}

//////////////////////////////////////////////////////////////////////////////////////////////
// 3) createMockUser
//////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Generates a mock IUser with realistic data, including role, permissions,
 * and relevant security fields.
 *
 * Steps:
 *  1) Generate unique ID using uuid
 *  2) Create base user object with faker data
 *  3) Generate security profile data (internal fields like MFA)
 *  4) Create role-based or permission-based overrides
 *  5) Validate user object against IUser interface (compile-time)
 *  6) Apply any provided overrides
 *  7) Return complete user object
 *
 * @param overrides - Partial values to override user fields
 * @returns A fully populated IUser object compliant with the IUser interface
 */
export function createMockUser(overrides?: UserOverrides): IUser {
  // Step 1 & 2: Generate unique IDs and random fields
  const baseUser: IUser = {
    id: uuid(),
    email: faker.internet.email(),
    password: faker.internet.password(),
    firstName: faker.name.firstName(),
    lastName: faker.name.lastName(),
    role: faker.helpers.arrayElement([
      UserRole.ADMIN,
      UserRole.PROJECT_MANAGER,
      UserRole.TEAM_LEAD,
      UserRole.DEVELOPER,
      UserRole.VIEWER
    ]),
    permissions: [],
    isActive: faker.datatype.boolean(),
    lastLogin: faker.date.recent(),
    failedLoginAttempts: faker.datatype.number({ min: 0, max: 5 }),
    lastFailedLogin: faker.date.recent(),
    mfaEnabled: faker.datatype.boolean(),
    mfaSecret: faker.random.alpha({ count: 16 }),
    metadata: {
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      createdBy: faker.internet.email(),
      updatedBy: faker.internet.email(),
      version: faker.datatype.number({ min: 1, max: 10 })
    }
  };

  // Step 6: Apply overrides
  const finalUser: IUser = {
    ...baseUser,
    ...(overrides || {})
  };

  // Step 7: Return the completed object
  return finalUser;
}

//////////////////////////////////////////////////////////////////////////////////////////////
// 4) createMockAnalytics
//////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Generates comprehensive mock analytics data (AnalyticsDashboard) with
 * performance metrics, resource usage, team performance, and predictive
 * insights.
 *
 * Steps:
 *  1) Generate performance metrics with realistic values
 *  2) Create resource analytics data
 *  3) Generate team performance metrics
 *  4) Create AI predictions and confidence scores (mapped to predictiveInsights)
 *  5) Validate analytics object against AnalyticsDashboard interface (compile-time)
 *  6) Apply any provided overrides
 *  7) Return complete analytics object
 *
 * @param overrides - Partial values to override analytics fields
 * @returns A fully populated AnalyticsDashboard object
 */
export function createMockAnalytics(
  overrides?: AnalyticsOverrides
): AnalyticsDashboard {
  // Step 1 & 2: Generate performance metrics and resource analytics
  const baseAnalytics: AnalyticsDashboard = {
    timeRange: {
      startDate: faker.date.past(),
      endDate: faker.date.recent(),
      timezone: 'America/Los_Angeles'
    },
    metrics: [
      {
        type: 'RESOURCE_UTILIZATION',
        value: faker.datatype.number({ min: 0, max: 100, precision: 0.01 }),
        threshold: 90,
        trend: faker.helpers.arrayElement(['increasing', 'decreasing', 'steady'])
      },
      {
        type: 'SPRINT_VELOCITY',
        value: faker.datatype.number({ min: 0, max: 50, precision: 1 }),
        threshold: 40,
        trend: faker.helpers.arrayElement(['increasing', 'decreasing', 'steady'])
      }
    ] as PerformanceMetric[],
    resources: Array.from({ length: 2 }, () => ({
      resourceId: uuid(),
      utilization: faker.datatype.number({ min: 0, max: 100, precision: 0.01 }),
      allocatedHours: faker.datatype.number({ min: 1, max: 200 }),
      actualHours: faker.datatype.number({ min: 0, max: 200 }),
      efficiency: faker.datatype.number({ min: 0, max: 1, precision: 0.01 })
    })) as ResourceAnalytics[],
    teams: Array.from({ length: 1 }, () => ({
      teamId: uuid(),
      sprintVelocity: faker.datatype.number({ min: 0, max: 50 }),
      taskCompletionRate: faker.datatype.number({ min: 0, max: 1, precision: 0.01 }),
      productivityScore: faker.datatype.number({ min: 0, max: 100, precision: 0.01 }),
      burndownRate: faker.datatype.number({ min: 0, max: 1, precision: 0.01 }),
      qualityMetrics: {
        codeReviews: faker.datatype.number({ min: 0, max: 50 }),
        defectsFound: faker.datatype.number({ min: 0, max: 10 })
      },
      riskIndicators: faker.datatype.boolean() ? ['scope_risk'] : []
    })) as TeamPerformance[],
    insights: {
      topIssue: faker.lorem.words(3),
      suggestion: faker.lorem.sentence()
    },
    historicalTrends: {
      velocityTrend: [10, 12, 15, 13, 18],
      utilizationTrend: [40, 45, 42, 50, 55]
    },
    predictiveInsights: {
      potentialBottleneck: faker.lorem.word(),
      confidence: faker.datatype.number({ min: 0, max: 1, precision: 0.01 })
    },
    customMetrics: {
      additionalGauge: faker.datatype.number({ min: 0, max: 100, precision: 1 })
    }
  };

  // Step 6: Apply overrides
  const finalAnalytics: AnalyticsDashboard = {
    ...baseAnalytics,
    ...(overrides || {})
  };

  // Step 7: Return the completed object
  return finalAnalytics;
}