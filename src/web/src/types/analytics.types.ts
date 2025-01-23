//
// Import Statements
// ----------------------------------------------------------------------------
// We import "ApiResponse", "PaginatedResponse", and "TimeRange" interfaces
// from our shared "common.types" module to ensure consistent handling of
// API responses, pagination metadata, and date-based analytics queries.
//
import { ApiResponse, PaginatedResponse, TimeRange } from './common.types';

/**
 * Enum: MetricType
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Enumerates the different categories of performance metrics
 *   tracked in the analytics dashboard.
 *
 * Description:
 *   Allows for strictly typed references to commonly used metrics such as
 *   resource utilization, sprint velocity, task completion rates, and
 *   overall team productivity.
 */
export enum MetricType {
  RESOURCE_UTILIZATION = 'RESOURCE_UTILIZATION',
  SPRINT_VELOCITY = 'SPRINT_VELOCITY',
  TASK_COMPLETION_RATE = 'TASK_COMPLETION_RATE',
  TEAM_PRODUCTIVITY = 'TEAM_PRODUCTIVITY',
}

/**
 * Interface: PerformanceMetric
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Defines the structure of any single performance metric within the
 *   analytics system.
 *
 * Description:
 *   Each metric is characterized by its specific MetricType,
 *   a numeric value, a threshold (to indicate acceptable ranges),
 *   and a trend to inform improvements or highlight risks.
 */
export interface PerformanceMetric {
  /**
   * Indicates which metric type this data point represents,
   * such as RESOURCE_UTILIZATION or TEAM_PRODUCTIVITY.
   */
  readonly type: MetricType;

  /**
   * The raw numeric value observed for this metric.
   */
  readonly value: number;

  /**
   * The boundary or limit at which this metric might trigger an alert
   * or require further monitoring.
   */
  readonly threshold: number;

  /**
   * A descriptive keyword or label indicating the direction or
   * momentum of the metric. For example, "increasing", "steady",
   * or "decreasing".
   */
  readonly trend: string;
}

/**
 * Interface: ResourceAnalytics
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Encapsulates analytics details for a specific resource
 *   (e.g., a user, machine, or cost center) tracked within the system.
 *
 * Description:
 *   Provides measurements for utilization, allocated vs. actual hours,
 *   and a computed efficiency score to gauge resource productivity.
 */
export interface ResourceAnalytics {
  /**
   * The unique identifier of the resource (like a user ID or machine ID).
   */
  readonly resourceId: string;

  /**
   * The percentage of utilization for this resource within the measured time frame.
   */
  readonly utilization: number;

  /**
   * The number of hours allocated/planned for this resource.
   */
  readonly allocatedHours: number;

  /**
   * The actual number of hours logged or consumed by this resource.
   */
  readonly actualHours: number;

  /**
   * A computed ratio of actual output or results compared
   * to the allocated inputs for this resource.
   */
  readonly efficiency: number;
}

/**
 * Interface: TeamPerformance
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Represents the aggregated performance data for an entire team.
 *
 * Description:
 *   Includes metrics like sprint velocity, overall task completion,
 *   and a productivity score that can be used to track improvements
 *   or spot bottlenecks within a team-based context.
 */
export interface TeamPerformance {
  /**
   * The unique identifier of the team.
   */
  readonly teamId: string;

  /**
   * The average or latest measure of how quickly
   * the team completes its planned tasks in a sprint.
   */
  readonly sprintVelocity: number;

  /**
   * The percentage of tasks or work items completed
   * during the measured time frame.
   */
  readonly taskCompletionRate: number;

  /**
   * A consolidated score reflecting both qualitative
   * and quantitative productivity indicators.
   */
  readonly productivityScore: number;
}

/**
 * Interface: PredictiveInsights
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Contains AI-generated notes and recommendations relating to
 *   potential risks, performance bottlenecks, or next steps to
 *   improve operational efficiency.
 *
 * Description:
 *   Provides intelligence that can guide teams toward resource
 *   reallocation or process changes, helping maintain or improve
 *   project success rates.
 */
export interface PredictiveInsights {
  /**
   * A collection of identified pain points or process slowdowns
   * that increase the likelihood of missed deadlines or reduced output.
   */
  readonly bottlenecks: string[];

  /**
   * System suggestions or best-practice steps to mitigate
   * discovered bottlenecks or optimize ongoing tasks.
   */
  readonly recommendations: string[];

  /**
   * Wider sets of risk factors that might affect team performance,
   * resource utilization, or deadlines, often requiring
   * proactive planning and contingencies.
   */
  readonly riskFactors: string[];
}

/**
 * Interface: AnalyticsDashboard
 * ----------------------------------------------------------------------------
 * Purpose:
 *   A central data container for all analytics sections in
 *   the frontend dashboard, providing a single object that can
 *   populate UI elements for metrics, resources, and teams.
 *
 * Description:
 *   Combines the time range of interest, a list of raw metrics,
 *   resource-level analytics, team-level analytics, as well
 *   as predictive insights from the AI engine.
 */
export interface AnalyticsDashboard {
  /**
   * The time range to which all included data pertains.
   */
  readonly timeRange: TimeRange;

  /**
   * A list of aggregated or computed performance metrics such as
   * resource utilization, velocity, and completion rates.
   */
  readonly metrics: ReadonlyArray<PerformanceMetric>;

  /**
   * Detailed resource-specific analytics, enabling deeper insight
   * into individual resource performance and efficiency.
   */
  readonly resources: ReadonlyArray<ResourceAnalytics>;

  /**
   * High-level metrics describing how each team is performing,
   * considering velocity, task completion, and productivity scores.
   */
  readonly teams: ReadonlyArray<TeamPerformance>;

  /**
   * AI-driven suggestions for improvements, along with
   * identified bottlenecks and potential risk factors.
   */
  readonly insights: PredictiveInsights;
}

/**
 * Type: AnalyticsTimeRangeOption
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Enumerates the available time range presets within the analytics module,
 *   such as the last 24 hours, last 7 days, etc.
 *
 * Description:
 *   Enables a consistent approach to filtering and displaying analytics
 *   for specific intervals, ensuring consistent queries and UI updates.
 */
export type AnalyticsTimeRangeOption =
  | 'LAST_24_HOURS'
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'LAST_90_DAYS';

/**
 * Type: AnalyticsApiResponse
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Wraps the analytics dashboard data within a standard API response structure.
 *
 * Description:
 *   Combines the "AnalyticsDashboard" interface as a payload
 *   with the status and other fields from the common ApiResponse type
 *   to ensure consistent client-side handling.
 */
export type AnalyticsApiResponse = ApiResponse<AnalyticsDashboard>;

/**
 * Type: ResourceAnalyticsPage
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Represents a paginated list of resource-level analytics data.
 *
 * Description:
 *   Uses the PaginatedResponse generic to receive a list (items) of
 *   "ResourceAnalytics", along with total counts and pagination fields
 *   for easy UI pagination.
 */
export type ResourceAnalyticsPage = PaginatedResponse<ResourceAnalytics>;