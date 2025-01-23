/*******************************************************************************************
 * Defines TypeScript interfaces for analytics data structures, metrics, and API responses
 * used across the TaskStream AI analytics services. This file leverages core functionality
 * from common.interface.ts (ApiResponse, PaginatedResponse, TimeRange) to provide an
 * enterprise-grade, scalable, and maintainable interface layer for analytics components.
 *******************************************************************************************/

import { 
  ApiResponse, 
  PaginatedResponse,
  TimeRange
} from './common.interface';

/**
 * Enumerates all supported metric types within TaskStream AI analytics services.
 * This enumeration is used to categorize and identify specific performance metrics.
 */
export enum MetricType {
  /** Represents resource utilization metrics, typically indicating how effectively resources are used. */
  RESOURCE_UTILIZATION = 'RESOURCE_UTILIZATION',

  /** Represents sprint velocity metrics, commonly measuring work throughput in Agile contexts. */
  SPRINT_VELOCITY = 'SPRINT_VELOCITY',

  /** Represents task completion rate metrics, tracking the percentage of completed tasks over time. */
  TASK_COMPLETION_RATE = 'TASK_COMPLETION_RATE',

  /** Represents team productivity metrics, indicating a holistic performance score for a team. */
  TEAM_PRODUCTIVITY = 'TEAM_PRODUCTIVITY',
}

/**
 * Represents a single performance metric within the analytics domain. It captures
 * the type of the metric, its current value, a threshold, and the overall trend.
 */
export interface PerformanceMetric {
  /**
   * A string identifying the specific metric (e.g., "RESOURCE_UTILIZATION").
   * May also be mapped to an enum value for stricter typing.
   */
  type: string;

  /**
   * The numerical value associated with this metric, reflecting the current measurement.
   */
  value: number;

  /**
   * A numeric threshold indicating a benchmark or limit for this metric.
   * If the metric's value approaches this threshold, alerts or warnings may be triggered.
   */
  threshold: number;

  /**
   * A string describing the current trend of this metric, such as "increasing", "decreasing", or "steady".
   */
  trend: string;
}

/**
 * Encapsulates resource utilization analytics, mapping to specific resources such as personnel,
 * hardware, or any entity tracked for performance measurements. This interface enables
 * in-depth analysis of allocated hours, actual hours, and efficiency rates.
 */
export interface ResourceAnalytics {
  /**
   * Unique identifier for the resource being analyzed, such as a user ID or system component ID.
   */
  resourceId: string;

  /**
   * Percentage metric (0-100) denoting the resource's utilization level over a given period.
   */
  utilization: number;

  /**
   * Total hours that were allocated or planned for this resource to work within the specified timeframe.
   */
  allocatedHours: number;

  /**
   * Actual hours logged or utilized by the resource during the same period.
   */
  actualHours: number;

  /**
   * Calculated efficiency metric, typically derived by comparing actual hours vs. allocated hours,
   * or using advanced predictive analytics to estimate optimal usage.
   */
  efficiency: number;
}

/**
 * Represents key team performance metrics within a specific timeframe or sprint.
 * It encompasses productivity, quality, velocity, and other risk or quality indicators
 * to provide a comprehensive overview of team health and effectiveness.
 */
export interface TeamPerformance {
  /**
   * Unique identifier for the team, allowing cross-referencing to project, department, or workspace records.
   */
  teamId: string;

  /**
   * Numeric value indicating how fast the team progresses through tasks or story points in Agile contexts.
   */
  sprintVelocity: number;

  /**
   * Percentage of tasks completed within the period vs. tasks assigned, indicating adherence to plan.
   */
  taskCompletionRate: number;

  /**
   * A synthesized performance score based on various metrics (e.g., velocity, quality, collaboration).
   */
  productivityScore: number;

  /**
   * Rate at which tasks and work items are being reduced or completed, often visualized in burndown charts.
   */
  burndownRate: number;

  /**
   * An object capturing category-specific quality data, such as defect rates, code review outcomes, etc.
   */
  qualityMetrics: Record<string, any>;

  /**
   * A list of descriptive indicators (e.g., "scope_risk", "deadline_risk") signaling potential issues.
   */
  riskIndicators: string[];
}

/**
 * Defines the overarching analytics dashboard data structure, consolidating multiple
 * metrics, resource data, and team performance results. This interface supports
 * historical trend data and predictive insights, enabling advanced decision-making.
 */
export interface AnalyticsDashboard {
  /**
   * Specifies the date range and timezone for these analytics, ensuring consistent time-based measurements.
   */
  timeRange: TimeRange;

  /**
   * A collection of system-wide or targeted metrics, such as resource utilization or sprint velocity.
   */
  metrics: PerformanceMetric[];

  /**
   * Resource-level analytics, allowing in-depth investigations of efficiency and utilization patterns.
   */
  resources: ResourceAnalytics[];

  /**
   * Team-level performance metrics, illustrating productivity, quality, and related indicators.
   */
  teams: TeamPerformance[];

  /**
   * General insights or observations derived from automated or manual analysis; the structure
   * can vary based on computed results.
   */
  insights: Record<string, any>;

  /**
   * Historical data points enabling trend visualization (e.g., daily or weekly metrics) for
   * proactive decision-making and retrospective analysis.
   */
  historicalTrends: Record<string, number[]>;

  /**
   * Forward-looking analytics or forecasts derived from predictive modeling, giving insight
   * into potential future states (e.g., resource bottlenecks, capacity issues).
   */
  predictiveInsights: Record<string, any>;

  /**
   * Arbitrary custom metrics that may be unique to an organization or specialized scenario,
   * allowing flexible extension of analytics without schema changes.
   */
  customMetrics: Record<string, any>;
}

/**
 * Provides a high-level API response shape containing an AnalyticsDashboard payload,
 * conforming to the standardized ApiResponse structure imported from common.interface.
 */
export interface AnalyticsDashboardResponse extends ApiResponse<AnalyticsDashboard> {
  /**
   * The generic parameter T in ApiResponse is bound to AnalyticsDashboard,
   * so this interface inherits 'data: AnalyticsDashboard' along with 'status' and other fields.
   */
}

/**
 * A paginated response structure for performance metrics, extending the TaskStream AI
 * PaginatedResponse interface. Presents a slice of PerformanceMetric records alongside
 * total counts and pagination details.
 */
export interface PaginatedPerformanceMetrics extends PaginatedResponse<PerformanceMetric> { 
  /**
   * 'items' will store an array of PerformanceMetrics; 'total' represents the total
   * count of available metrics in the data set, aligning with PaginatedResponse.
   */
}

/**
 * A paginated response structure for ResourceAnalytics, allowing batched exploration
 * of resource utilization data across many resources or extended time periods.
 */
export interface PaginatedResourceAnalytics extends PaginatedResponse<ResourceAnalytics> {
  /**
   * 'items' will store ResourceAnalytics objects, while 'total' provides the total
   * number of resources satisfying the query constraints.
   */
}

/**
 * A paginated response structure intended for team performance metrics. Supports
 * slicing and viewing large sets of TeamPerformance data in a controllable format.
 */
export interface PaginatedTeamPerformance extends PaginatedResponse<TeamPerformance> {
  /**
   * 'items' will store TeamPerformance objects, whereas 'total' denotes the count
   * of records matching the pagination and search parameters.
   */
}