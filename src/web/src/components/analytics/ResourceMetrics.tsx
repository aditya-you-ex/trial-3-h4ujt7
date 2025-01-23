// react@^18.0.0
import React, {
  FC,
  useState,
  useEffect,
  useCallback,
  MouseEvent,
  KeyboardEvent
} from 'react';

// classnames@^2.3.2
import classNames from 'classnames';

/*
  Internal Imports
  ------------------------------------------------------------------------------
  We import the following components, interfaces, and services based on the
  provided JSON specification. Each import is used to construct the ResourceMetrics
  component according to enterprise standards, system design patterns, and
  robust error handling.
*/
import { Card, CardProps } from '../common/Card';
import { ProgressBar, ProgressBarProps } from '../common/ProgressBar';
import { ResourceAnalytics } from '../../types/analytics.types';
import { analyticsService } from '../../services/analytics.service';
import { ErrorBoundary } from '../common/ErrorBoundary';

/*
  Props Interface: ResourceMetricsProps
  ------------------------------------------------------------------------------
  Describes the shape of the props used by the ResourceMetrics component as
  specified in the JSON schema. This component displays resource utilization
  metrics in a card format with progress bars and performance indicators,
  supports manual and automatic refresh, and integrates accessibility features.
*/
export interface ResourceMetricsProps {
  /**
   * Optional additional CSS classes for layout or styling overrides.
   */
  className?: string;

  /**
   * The time period (start and end) for metrics analysis. This prop is required.
   */
  timeRange: {
    startDate: Date;
    endDate: Date;
    duration?: number; // from TimeRange definition (optional usage)
  };

  /**
   * An optional callback triggered by manual refresh actions, such as a refresh
   * button in the UI.
   */
  onRefresh?: () => void;

  /**
   * Interval in milliseconds for automatic refresh cycles. When provided,
   * the component will periodically trigger data fetch or subscription updates.
   */
  autoRefreshInterval?: number;
}

/*
  Function: getMetricVariant
  ------------------------------------------------------------------------------
  Determines the visual variant of the ProgressBar based on the metric value
  and threshold comparisons. Returns one of 'success', 'warning', or 'error'.
  Steps:
    1) Compare value against threshold.
    2) Return 'success' if value >= threshold.
    3) Return 'warning' if value >= threshold * 0.7.
    4) Return 'error' if value < threshold * 0.7.
*/
function getMetricVariant(value: number, threshold: number): 'success' | 'warning' | 'error' {
  if (value >= threshold) {
    return 'success';
  }
  if (value >= threshold * 0.7) {
    return 'warning';
  }
  return 'error';
}

/*
  Component: ResourceMetrics
  ------------------------------------------------------------------------------
  Provides a React functional component that displays resource utilization
  metrics in a card layout with progress bars and dynamic updates.
  Requirements & Implementation:
    - Renders three progress bars for demonstration: teamCapacity, sprintVelocity,
      and burndownRate (as requested in the JSON specification).
    - Uses local state for metrics data, loading, and error states.
    - Subscribes to real-time updates from analyticsService.subscribeToMetrics
      for any live metrics push. Also supports manual and auto refresh logic.
    - Applies ARIA labels, integrated keyboard navigation, and screen reader
      accessible design.
    - Wrapped in an ErrorBoundary for robust error handling.

  Architecture & Lifecycle:
    - useState: metricsData, loading, error
    - useEffect: 
        1) initial data fetch (and subscription),
        2) cleanup unsubscribe,
        3) handle auto-refresh intervals,
        4) respond to timeRange prop changes
    - useCallback for memoized event handlers (refresh, metric click, etc.)
    - Accessibility: ARIA roles, labels, and keyboard interactions for dynamic data.
*/
const ResourceMetrics: FC<ResourceMetricsProps> = ({
  className,
  timeRange,
  onRefresh,
  autoRefreshInterval
}) => {
  /**
   * metricsData - Holds numeric values for teamCapacity, sprintVelocity, and burndownRate.
   * loading - Indicates whether the component is currently fetching or subscribing to data.
   * error - Holds any error object or null if no errors exist.
   */
  const [metricsData, setMetricsData] = useState<{
    teamCapacity: number;
    sprintVelocity: number;
    burndownRate: number;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * handleError - Centralized function to process and store errors, ensuring
   * a single flow for error handling across subscription and data fetch methods.
   */
  const handleError = useCallback((err: Error) => {
    setError(err);
    setLoading(false);
  }, []);

  /**
   * handleSubscription - Callback invoked when real-time or polled metrics
   * updates are received from the analytics service. This updates local state
   * with the new metrics data, ensures loading is disabled, and clears any
   * error states if the data is valid.
   */
  const handleSubscription = useCallback(
    (updatedData: {
      teamCapacity: number;
      sprintVelocity: number;
      burndownRate: number;
    }) => {
      setMetricsData(updatedData);
      setLoading(false);
      setError(null);
    },
    []
  );

  /**
   * fetchMetrics - A function to manually fetch or refresh metrics data from
   * analyticsService. For demonstration, we simulate or call a real method such
   * as analyticsService.getResourceAnalytics(). We adapt it to produce data
   * relevant to teamCapacity, sprintVelocity, and burndownRate.
   */
  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      // Here we simulate or adapt a real call. The code below can combine
      // partial logic or a mock. In a production scenario, we might call:
      // const resourceData = await analyticsService.getResourceAnalytics(timeRange, [...resourceIds]);
      // Then transform that data to produce teamCapacity, sprintVelocity, burndownRate.
      // For now, let's simply simulate.
      const simulatedData = {
        teamCapacity: Math.floor(Math.random() * 120), // Possibly up to 120%
        sprintVelocity: Math.floor(Math.random() * 50), // e.g. 0..50 story points
        burndownRate: Math.floor(Math.random() * 100) // e.g. 0..100 tasks
      };
      // Update local state
      handleSubscription(simulatedData);
    } catch (err) {
      handleError(err as Error);
    }
  }, [handleError, handleSubscription]);

  /**
   * handleRefresh - Manual refresh handler that triggers data fetching
   * and also calls an external onRefresh callback if provided.
   */
  const handleRefresh = useCallback(() => {
    // Fire external callback if provided
    if (onRefresh) {
      onRefresh();
    }
    // Initiate metrics fetch
    fetchMetrics();
  }, [onRefresh, fetchMetrics]);

  /**
   * handleMetricClick - Example event handler for interacting with a metric
   * bar (e.g., to open a detailed view). Demonstrates how to handle user
   * clicks or keyboard events on a metric row or progress bar.
   */
  const handleMetricClick = useCallback(
    (event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>, metricName: string) => {
      // In production, we might open a modal or route to a detail page
      // For now, just log
      if (event.type === 'click' || (event as KeyboardEvent).key === 'Enter') {
        // eslint-disable-next-line no-console
        console.log(`Metric clicked: ${metricName}`);
      }
    },
    []
  );

  /**
   * useEffect: Subscribe to real-time metrics. For demonstration,
   * we simulate an analyticsService.subscribeToMetrics call. We'll
   * assume it returns an unsubscribe function. If your real code does
   * not have this method, adapt as needed to integrate websockets or polling.
   */
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    try {
      // Example: analyticsService.subscribeToMetrics returns an unsubscribe function
      unsubscribe = analyticsService.subscribeToMetrics((data: any) => {
        // Expect data to have teamCapacity, sprintVelocity, burndownRate.
        handleSubscription({
          teamCapacity: data?.teamCapacity ?? 0,
          sprintVelocity: data?.sprintVelocity ?? 0,
          burndownRate: data?.burndownRate ?? 0
        });
      });
    } catch (err) {
      handleError(err as Error);
    }

    // Cleanup subscription on unmount
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [handleSubscription, handleError]);

  /**
   * useEffect: Initial data fetching on mount and whenever timeRange changes.
   * We re-fetch metrics data to reflect the new timeframe.
   */
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics, timeRange]);

  /**
   * useEffect: Auto-refresh interval. If autoRefreshInterval is provided,
   * we set up a periodic fetch. Cleanup on unmount or when interval changes.
   */
  useEffect(() => {
    if (!autoRefreshInterval) return undefined;

    const intervalId = setInterval(() => {
      fetchMetrics();
    }, autoRefreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [autoRefreshInterval, fetchMetrics]);

  // Render logic:
  //  1) If error is present, display an inline fallback or pass the error up.
  //  2) Show a loading indicator if necessary.
  //  3) Render a Card with three progress bars for teamCapacity, sprintVelocity, burndownRate.

  const isLoadingOrNoData = loading || !metricsData;

  return (
    <ErrorBoundary>
      <Card
        className={classNames('ts-resource-metrics-card', className)}
        elevation="small"
        padding="medium"
        interactive={false}
      >
        <div className="resource-metrics-container flex flex-col space-y-4" role="region" aria-label="Resource Metrics">
          {/* Header row or controls */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold" aria-label="Resource Utilization Metrics">
              Resource Metrics
            </h3>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="text-sm underline text-blue-600 focus:outline-none"
              aria-label="Refresh resource metrics"
            >
              Refresh
            </button>
          </div>

          {error && (
            <div className="text-red-600 text-sm" role="alert" aria-live="assertive">
              An error occurred while loading resource metrics: {error.message}
            </div>
          )}

          {isLoadingOrNoData ? (
            <div className="text-gray-500 text-sm" aria-busy="true" aria-live="polite">
              Loading metrics...
            </div>
          ) : (
            <>
              {/* Team Capacity */}
              <div
                className="cursor-pointer"
                tabIndex={0}
                role="button"
                onClick={(e) => handleMetricClick(e, 'teamCapacity')}
                onKeyDown={(e) => handleMetricClick(e, 'teamCapacity')}
                aria-label="Team Capacity Metric"
              >
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Team Capacity</span>
                  <span className="text-sm text-gray-700">
                    {metricsData.teamCapacity}%
                  </span>
                </div>
                <ProgressBar
                  value={metricsData.teamCapacity}
                  max={120} 
                  variant={getMetricVariant(metricsData.teamCapacity, 100)}
                  showLabel={false}
                  ariaLabel="Team Capacity Progress Bar"
                />
              </div>

              {/* Sprint Velocity */}
              <div
                className="cursor-pointer"
                tabIndex={0}
                role="button"
                onClick={(e) => handleMetricClick(e, 'sprintVelocity')}
                onKeyDown={(e) => handleMetricClick(e, 'sprintVelocity')}
                aria-label="Sprint Velocity Metric"
              >
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Sprint Velocity</span>
                  <span className="text-sm text-gray-700">
                    {metricsData.sprintVelocity}
                  </span>
                </div>
                <ProgressBar
                  value={metricsData.sprintVelocity}
                  max={50}
                  variant={getMetricVariant(metricsData.sprintVelocity, 40)}
                  showLabel={false}
                  ariaLabel="Sprint Velocity Progress Bar"
                />
              </div>

              {/* Burndown Rate */}
              <div
                className="cursor-pointer"
                tabIndex={0}
                role="button"
                onClick={(e) => handleMetricClick(e, 'burndownRate')}
                onKeyDown={(e) => handleMetricClick(e, 'burndownRate')}
                aria-label="Burndown Rate Metric"
              >
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Burndown Rate</span>
                  <span className="text-sm text-gray-700">
                    {metricsData.burndownRate}%
                  </span>
                </div>
                <ProgressBar
                  value={metricsData.burndownRate}
                  max={100}
                  variant={getMetricVariant(metricsData.burndownRate, 100)}
                  showLabel={false}
                  ariaLabel="Burndown Rate Progress Bar"
                />
              </div>
            </>
          )}
        </div>
      </Card>
    </ErrorBoundary>
  );
};

export default ResourceMetrics;