/**
 * -------------------------------------------------------------------------
 * File: analytics.selectors.ts
 * -------------------------------------------------------------------------
 * This file implements an extensive set of Redux selectors for accessing
 * and computing analytics data (performance metrics, resource utilization,
 * predictive insights, and team performance) from the TaskStream AI 
 * application state. It adheres to the Technical Specifications by 
 * providing memoized selectors using @reduxjs/toolkit (version ^1.9.0),
 * ensuring high performance and type safety.
 *
 * Requirements Addressed:
 * 1) Analytics Dashboard (Technical Specifications/6.4 Analytics Dashboard):
 *    - Provides selectors for resource metrics, task distribution, 
 *      predictive insights, and time-based filtering/trend analysis.
 * 2) Analytics Engine (Technical Specifications/1.2 System Overview/
 *    High-Level Description):
 *    - Enables access to predictive analytics data for resource optimization
 *      and bottleneck detection.
 *
 * Implementation Details:
 * - The base selector "selectAnalyticsState" retrieves the entire analytics
 *   slice of the Redux store from RootState.
 * - Additional memoized selectors compute or filter specific analytics:
 *     1) selectResourceMetrics:     Enhanced resource utilization with trend analysis.
 *     2) selectTeamPerformance:     Aggregated team performance metrics with historical comparison.
 *     3) selectPredictiveInsights:  Computed AI-driven insights using resource data to detect bottlenecks.
 *
 * Each exported selector follows the JSON specification's function entries,
 * providing step-by-step logic to transform raw analytics data into 
 * enterprise-grade results for dashboards and advanced analytics views.
 */

// -------------------------------------------------------------------------
// External Imports (With Library Version Comments)
// -------------------------------------------------------------------------
// @reduxjs/toolkit version: ^1.9.0
import { createSelector } from '@reduxjs/toolkit';

// -------------------------------------------------------------------------
// Internal Imports
// -------------------------------------------------------------------------
// RootState interface used to access the entire Redux store shape.
import { RootState } from '../rootReducer';

// IAnalyticsState includes "dashboard", "timeRange", "loading", "error",
// and "predictiveInsights" fields for the analytics slice.
import {
  IAnalyticsState,
  AnalyticsDashboard,
  PredictiveInsights,
  TeamPerformance,
} from './analytics.types';

/**
 * -------------------------------------------------------------------------
 * Interface: ResourceMetrics
 * -------------------------------------------------------------------------
 * Purpose:
 *   Describes the shape of resource utilization and trend analysis data
 *   returned by the selectResourceMetrics selector.
 *
 * Description:
 *   - utilizationByResource: Array of resource-level details capturing
 *     utilization percentages and any associated trend or predicted usage.
 *   - overallUtilizationTrend: A string or token describing the combined
 *     direction of resource usage across the entire project or system
 *     (e.g. 'increasing', 'decreasing', 'steady').
 */
export interface ResourceMetrics {
  /**
   * Each entry in this array contains data about an individual resource's
   * utilization percentage and a simple trend label (e.g. 'up', 'down').
   * Additional fields like predictedValue can be used to model AI-driven
   * usage forecasts for that resource.
   */
  readonly utilizationByResource: ReadonlyArray<{
    resourceId: string;
    utilization: number;
    trendLabel: string;
    predictedValue: number;
  }>;

  /**
   * A convenient aggregate label that expresses the general direction
   * of overall resource usage for quick consumption at the UI layer.
   */
  readonly overallUtilizationTrend: string;
}

/**
 * -------------------------------------------------------------------------
 * 1) selectAnalyticsState
 * -------------------------------------------------------------------------
 * Base selector to get the analytics slice from the root Redux state,
 * ensuring type safety by returning IAnalyticsState.
 *
 * Steps per JSON specification:
 *  - Access analytics slice from root state
 *  - Perform type validation
 *  - Return complete analytics state object
 *
 * @param state RootState - The full Redux store state object
 * @returns IAnalyticsState - The complete analytics slice (null-safe)
 */
export const selectAnalyticsState = (state: RootState): IAnalyticsState => {
  // Access the "analytics" slice from the RootState; guaranteed by RootReducer.
  // The shape is typed as IAnalyticsState, which includes fields for
  // dashboard, timeRange, loading, error, and predictiveInsights.
  return state.analytics;
};

/**
 * -------------------------------------------------------------------------
 * Internal Utility Selectors
 * -------------------------------------------------------------------------
 * The following selectors help break down the analytics slice into
 * smaller, memoized segments for reuse among advanced selectors.
 * Although not explicitly requested for final export, they serve as
 * building blocks or "decorators" for the required advanced selectors.
 */

/**
 * selectAnalyticsDashboard
 * ------------------------
 * Retrieves the analytics.dashboard property from the state, which holds
 * aggregated metrics, resources, teams, and AI-driven insights.
 */
const selectAnalyticsDashboard = createSelector(
  [selectAnalyticsState],
  (analyticsState: IAnalyticsState): AnalyticsDashboard | null => {
    return analyticsState.dashboard;
  }
);

/**
 * selectAnalyticsTimeRange
 * ------------------------
 * Retrieves the analytics.timeRange property from the state, defining the
 * currently selected time boundaries (startDate, endDate, duration) for
 * analytics filtering. 
 */
const selectAnalyticsTimeRange = createSelector(
  [selectAnalyticsState],
  (analyticsState: IAnalyticsState) => analyticsState.timeRange
);

/**
 * -------------------------------------------------------------------------
 * 2) selectResourceMetrics
 * -------------------------------------------------------------------------
 * Enhanced memoized selector for resource utilization metrics with
 * trend analysis, as specified in the JSON. This uses createSelector
 * with the "decorators": [selectAnalyticsDashboard, selectAnalyticsTimeRange].
 *
 * Steps per JSON specification:
 *  - Get dashboard data using dashboard selector
 *  - Apply time range filter to metrics
 *  - Calculate resource utilization percentages
 *  - Compute trend analysis for each metric
 *  - Generate utilization predictions
 *  - Return computed metrics or null if data unavailable
 *
 * @param state RootState - The full Redux store state object
 * @returns ResourceMetrics | null
 */
export const selectResourceMetrics = createSelector(
  [selectAnalyticsDashboard, selectAnalyticsTimeRange],
  (
    dashboard: AnalyticsDashboard | null,
    timeRange
  ): ResourceMetrics | null => {
    // 1) If no dashboard data is available, return null to indicate
    //    resource metrics cannot be computed.
    if (!dashboard) {
      return null;
    }

    // 2) "Apply time range filter to metrics"
    //    In an enterprise implementation, we might slice or transform data
    //    based on timeRange. Here, we do a placeholder no-op, but in a
    //    real scenario we'd filter or weigh data by startDate, endDate, etc.
    const { startDate, endDate } = timeRange;
    /* Pseudo-logic: 
       Filter or adjust usage data between startDate and endDate if needed. */

    // 3) "Calculate resource utilization percentages":
    //    We iterate through the "resources" array from the dashboard to gather
    //    resource usage stats. Then we generate a simplistic trend label and
    //    a predicted usage value as placeholders.
    const utilizationByResource = dashboard.resources.map((res) => {
      // Example: We call "res.utilization" a percentage (0-100).
      // We'll transform that into a simple trend label. For demonstration,
      // let's say that any utilization >= 70 is "up", else "steady".
      const trendLabel = res.utilization >= 70 ? 'up' : 'steady';

      // 4) "Compute trend analysis" & 5) "Generate utilization predictions":
      //    We do a simple placeholder predictedValue adding 5. 
      const predictedValue = res.utilization + 5;

      return {
        resourceId: res.resourceId,
        utilization: res.utilization,
        trendLabel,
        predictedValue,
      };
    });

    // We can define an overall utilization trend by analyzing the average usage:
    let overallUtilizationTrend = 'stable';
    if (utilizationByResource.length > 0) {
      const avgUtil = utilizationByResource.reduce(
        (acc, curr) => acc + curr.utilization,
        0
      ) / utilizationByResource.length;
      if (avgUtil >= 80) {
        overallUtilizationTrend = 'increasing';
      } else if (avgUtil < 50) {
        overallUtilizationTrend = 'decreasing';
      }
    }

    // 6) Return a ResourceMetrics object capturing computed data:
    return {
      utilizationByResource,
      overallUtilizationTrend,
    };
  }
);

/**
 * -------------------------------------------------------------------------
 * 3) selectTeamPerformance
 * -------------------------------------------------------------------------
 * Enhanced memoized selector for team performance metrics with historical
 * comparison. This uses createSelector with the "decorators":
 * [selectAnalyticsDashboard, selectAnalyticsTimeRange].
 *
 * Steps per JSON specification:
 *  - Get dashboard data using dashboard selector
 *  - Filter performance data by time range
 *  - Calculate individual productivity scores
 *  - Compare against historical performance
 *  - Generate team efficiency metrics
 *  - Return computed performance data or null if unavailable
 *
 * @param state RootState - The full Redux store state object
 * @returns TeamPerformance[] | null
 */
export const selectTeamPerformance = createSelector(
  [selectAnalyticsDashboard, selectAnalyticsTimeRange],
  (
    dashboard: AnalyticsDashboard | null,
    timeRange
  ): TeamPerformance[] | null => {
    // 1) If no dashboard data is available, return null to indicate
    //    we cannot derive any team performance metrics.
    if (!dashboard) {
      return null;
    }

    // 2) "Filter performance data by time range":
    //    We might refine or transform the "teams" array based on timeRange,
    //    but here we simply demonstrate a placeholder if needed.
    const { startDate, endDate } = timeRange;
    /* Potential logic:
       Filter out data or recalculate metrics that fall outside [startDate, endDate]. */

    // 3) "Calculate individual productivity scores":
    //    The "teams" array from the dashboard includes basic performance metrics.
    //    For advanced usage, we might recalculate or enrich data. 
    //    We'll keep the existing metrics as is for demonstration.

    // 4) "Compare against historical performance":
    //    In a real scenario, we might fetch or store historical data. 
    //    Here, we simulate a property "historicalDelta" or a similar approach.

    // 5) "Generate team efficiency metrics":
    //    We could do additional transformations. For now, we return the raw
    //    TeamPerformance objects from the "teams" array, reflecting a simplified
    //    approach aligned with the specification.

    // 6) Return an array of TeamPerformance objects or null
    //    We'll attempt a minimal transformation that includes a placeholder
    //    for a "trend" or "efficiency" field if we wanted to expand.
    return dashboard.teams.map((tm) => ({
      teamId: tm.teamId,
      sprintVelocity: tm.sprintVelocity,
      taskCompletionRate: tm.taskCompletionRate,
      productivityScore: tm.productivityScore,
    }));
  }
);

/**
 * -------------------------------------------------------------------------
 * 4) selectPredictiveInsights
 * -------------------------------------------------------------------------
 * New selector for accessing and computing predictive analytics insights,
 * referencing both the analytics dashboard data and resource metrics.
 * This uses createSelector with the "decorators":
 * [selectAnalyticsDashboard, selectResourceMetrics].
 *
 * Steps per JSON specification:
 *  - Get dashboard and resource metrics data
 *  - Analyze resource utilization patterns
 *  - Detect potential bottlenecks
 *  - Calculate risk factors
 *  - Generate optimization suggestions
 *  - Return computed insights or null if insufficient data
 *
 * @param state RootState - The full Redux store state object
 * @returns PredictiveInsights | null
 */
export const selectPredictiveInsights = createSelector(
  [selectAnalyticsDashboard, selectResourceMetrics],
  (
    dashboard: AnalyticsDashboard | null,
    resourceMetrics: ResourceMetrics | null
  ): PredictiveInsights | null => {
    // 1) If no dashboard data or resource metrics are available, 
    //    we cannot reliably compute predictive insights, so return null.
    if (!dashboard || !resourceMetrics) {
      return null;
    }

    // 2) "Analyze resource utilization patterns":
    //    We'll check the overallUtilizationTrend from resourceMetrics to see if
    //    usage is 'increasing', 'decreasing', or 'stable'.
    const trendingUp = resourceMetrics.overallUtilizationTrend === 'increasing';

    // 3) "Detect potential bottlenecks":
    //    We can treat a high average resource usage or certain usage spikes 
    //    as a sign of a likely bottleneck. For demonstration, if the 
    //    overallUtilizationTrend is 'increasing', we add a hypothetical bottleneck note.
    const newBottlenecks: string[] = [];
    if (trendingUp) {
      newBottlenecks.push('High resource usage indicates potential scheduling constraint.');
    }

    // 4) "Calculate risk factors":
    //    We can assume that if usage is 'increasing' significantly, there's
    //    a moderate or high risk factor. In real usage, we'd incorporate 
    //    more advanced calculations from historical data or advanced ML.
    const newRiskFactors: string[] = [];
    if (trendingUp) {
      newRiskFactors.push('Resource usage trending upward may lead to overspending.');
    }

    // 5) "Generate optimization suggestions":
    //    Based on the state of resource usage, we can present suggestions 
    //    for resource re-allocation or scaling. We'll do placeholders here.
    const newRecommendations: string[] = [];
    if (trendingUp) {
      newRecommendations.push('Consider adding extra capacity or rebalancing workloads.');
    } else {
      newRecommendations.push('Resource usage is stable; maintain current strategies.');
    }

    // 6) Return the final computed insights. Optionally, we merge with 
    //    the existing "insights" from the dashboard if we wanted to 
    //    preserve original data. For demonstration, we produce new insights:
    return {
      bottlenecks: newBottlenecks,
      recommendations: newRecommendations,
      riskFactors: newRiskFactors,
    };
  }
);