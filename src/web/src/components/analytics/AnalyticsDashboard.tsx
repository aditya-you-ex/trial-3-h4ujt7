import React, {
  FC,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  MouseEvent,
} from 'react'; // react@^18.0.0
import classNames from 'classnames'; // classnames@^2.3.2

/*****************************************************************************
 * Internal Imports (IE1 compliance)
 * Incorporate all required imports listed in the JSON specification and
 * ensure that we leverage each component appropriately throughout this file.
 *****************************************************************************/
import { MetricsCard } from './MetricsCard'; // Named import for rendering singular metric cards
import { PerformanceChart } from './PerformanceChart'; // Named import for chart-based visualizations
import { TeamPerformance } from './TeamPerformance'; // Named import for aggregated team performance metrics
import { PredictiveInsights } from './PredictiveInsights'; // Named import for AI-driven insights
import { analyticsService } from '../../services/analytics.service'; // Provides getDashboardData + subscribeToUpdates
/*****************************************************************************
 * Supported Types & Interfaces
 *****************************************************************************/
import { PerformanceMetric, MetricType, AnalyticsDashboard as AnalyticsDashboardData } from '../../types/analytics.types';
import { TimeRange } from '../../types/common.types';

/*****************************************************************************
 * JSON-Spec Defined Interface: AnalyticsDashboardProps
 * ----------------------------------------------------------------------------
 * The core props for the AnalyticsDashboard component as per the specification.
 * 1. className?: string             - Optional CSS class for custom styling.
 * 2. timeRange: TimeRange           - The time interval for which analytics data is displayed.
 * 3. teamIds: string[]              - The team IDs for which performance data is relevant.
 * 4. onMetricClick: (metricType: MetricType) => void
 *    A callback invoked when the user clicks on a particular metric card,
 *    enabling external analytics tracking or user navigation.
 *****************************************************************************/
export interface AnalyticsDashboardProps {
  /**
   * Optional additional CSS class for the top-level container,
   * allowing for specialized styling overrides or layout changes.
   */
  className?: string;

  /**
   * Defines the time range (startDate, endDate, duration) for which analytics
   * data is retrieved and displayed within this dashboard. Must be a valid object
   * with at least a startDate and endDate.
   */
  timeRange: TimeRange;

  /**
   * An array of team identifiers (e.g. ["TeamA", "TeamB"]) representing the
   * teams whose data will be displayed in the TeamPerformance component.
   */
  teamIds: string[];

  /**
   * A callback function triggered when a user interacts with a particular
   * metric card (e.g., resource utilization) to obtain more details or
   * navigate to a deeper analytics view.
   */
  onMetricClick: (metricType: MetricType) => void;
}

/*****************************************************************************
 * JSON-Spec Defined Custom Hook: useDashboardData
 * ----------------------------------------------------------------------------
 * This enhanced custom hook manages the fetching, caching, real-time updates,
 * error handling, and loading states for all main aspects of the analytics
 * dashboard data. Detailed steps include:
 *
 * 1. Initialize local state for the AnalyticsDashboard data object, loading,
 *    and potential errors.
 * 2. Validate or sanitize incoming timeRange/teamIds if needed.
 * 3. Attempt to retrieve data from analyticsService.getDashboardData,
 *    optionally implementing a retry mechanism.
 * 4. Cache successful responses inside a variable or memo. (For brevity, a simple
 *    in-file map can hold ephemeral references.)
 * 5. Set up real-time subscription with analyticsService.subscribeToUpdates,
 *    if that method is available, to push incremental changes to "data".
 * 6. Provide skeleton loaders or placeholders while "loading" is true, if the
 *    final UI wants to show them.
 * 7. On unmount, clean up any subscriptions or intervals to avoid memory leaks.
 * 8. Return an object with { data, loading, error, retry } to be consumed by the UI.
 * 9. Optionally track performance metrics (e.g., time to fetch) or progressive
 *    loading for large data sets.
 *****************************************************************************/
interface UseDashboardDataReturn {
  data: AnalyticsDashboardData | null;
  loading: boolean;
  error: Error | null;
  retry: () => void;
}

/**
 * A simple ephemeral cache to store analytics data keyed by time range + team IDs.
 * In a production scenario, we might leverage a more robust caching library or
 * rely on server-based caching.
 */
const dashboardDataCache: Record<string, AnalyticsDashboardData> = {};

/**
 * Constructs a unique string cache key from timeRange + teamIds to identify
 * the relevant AnalyticsDashboard data in memory.
 */
function buildDashboardCacheKey(timeRange: TimeRange, teamIds: string[]): string {
  const start = timeRange.startDate.toISOString();
  const end = timeRange.endDate.toISOString();
  // Sort teamIds to ensure consistent ordering in the key
  const teams = [...teamIds].sort().join('|');
  return `${start}::${end}::${teams}`;
}

export function useDashboardData(
  timeRange: TimeRange,
  teamIds: string[]
): UseDashboardDataReturn {
  // Local state for data, loading, and error statuses
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // We'll store the subscription cleanup function here, if used
  const subscriptionCleanupRef = useRef<() => void>();

  // Construct a stable cache key for retrieving or storing data
  const cacheKey = useMemo(() => buildDashboardCacheKey(timeRange, teamIds), [timeRange, teamIds]);

  /***************************************************************************
   * fetchDashboardData - an internal function that actually calls the analytics
   * service to retrieve the entire AnalyticsDashboard object for the
   * specified time range, then filters or merges in relevant team data if needed.
   ***************************************************************************/
  const fetchDashboardData = useCallback(
    async function fetchDashboardDataImpl(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        // Check ephemeral cache first
        const cached = dashboardDataCache[cacheKey];
        if (cached) {
          setData(cached);
          setLoading(false);
          return;
        }

        // If not cached, fetch from the analytics service
        const result = await analyticsService.getDashboardData(timeRange);
        // Optionally filter/merge if needed. For now, we store the entire object.
        dashboardDataCache[cacheKey] = result;
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [cacheKey, timeRange]
  );

  /***************************************************************************
   * subscribeToRealTimeData - sets up a hypothetical real-time subscription
   * for incremental or streaming updates. The analyticsService.subscribeToUpdates
   * would broadcast partial or full changes. If available, we must handle them:
   ***************************************************************************/
  const subscribeToRealTimeData = useCallback(() => {
    // If the method doesn't exist or isn't relevant, skip
    if (typeof analyticsService.subscribeToUpdates !== 'function') {
      return undefined;
    }

    // For demonstration, we pass a simple channel or event name
    // and the timeRange + teamIds to identify relevant updates.
    const unsub = analyticsService.subscribeToUpdates((updatedData: AnalyticsDashboardData) => {
      // Perform naive merging or direct replacement if the updated time range matches
      const sameKey = buildDashboardCacheKey(updatedData.timeRange, teamIds);
      if (sameKey === cacheKey) {
        dashboardDataCache[sameKey] = updatedData;
        setData(updatedData);
      }
    });

    return unsub;
  }, [cacheKey, teamIds]);

  /***************************************************************************
   * retry - public function for refreshing data or reattempt after errors
   ***************************************************************************/
  const retry = useCallback(() => {
    // Clear ephemeral cache for this key so we definitely re-fetch from server
    delete dashboardDataCache[cacheKey];
    fetchDashboardData();
  }, [cacheKey, fetchDashboardData]);

  /***************************************************************************
   * Lifecycle: On mount, fetch data & possibly subscribe to push updates
   ***************************************************************************/
  useEffect(() => {
    // Start data fetch immediately
    fetchDashboardData();

    // Start real-time subscription if relevant
    const unsub = subscribeToRealTimeData();
    subscriptionCleanupRef.current = unsub;

    // On unmount, clean up subscription if present
    return () => {
      if (subscriptionCleanupRef.current) {
        subscriptionCleanupRef.current();
      }
    };
  }, [fetchDashboardData, subscribeToRealTimeData]);

  return {
    data,
    loading,
    error,
    retry,
  };
}

/*****************************************************************************
 * JSON-Spec Function: handleMetricClick
 * ----------------------------------------------------------------------------
 * This function is designed to handle user interactions with an individual
 * metric card. It performs:
 * 1. Basic validation on the passed metricType
 * 2. "Analytics tracking" placeholder, e.g. console logs or event ingestion
 * 3. Calls the parent-provided onMetricClick callback
 * 4. Graceful error handling with an optional UI feedback
 * 5. Telemetry logging or performance measurement if needed
 *****************************************************************************/
export function handleMetricClick(
  metricType: MetricType,
  onMetricClick: (mt: MetricType) => void
): void {
  try {
    // 1. Optional validation
    if (!metricType || typeof metricType !== 'string') {
      throw new Error('Invalid or missing metric type passed to handleMetricClick.');
    }

    // 2. Analytics tracking placeholder
    // In a real system, we might call a logging or analytics aggregator
    // e.g., analytics.track('METRIC_CLICK', { metricType });
    // eslint-disable-next-line no-console
    console.log(`[handleMetricClick] User clicked metric type: ${metricType}`);

    // 3. Execute the parent's callback
    onMetricClick(metricType);

    // 4. (Optional) update local UI feedback states or call setState
    // Not needed here since we are deferring to the parent.

    // 5. Additional telemetry or performance logs if desired
    // eslint-disable-next-line no-console
    console.log('[handleMetricClick] Interaction handled successfully.');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[handleMetricClick] Failed to handle metric click:', err);
  }
}

/*****************************************************************************
 * Main Export: AnalyticsDashboard
 * ----------------------------------------------------------------------------
 * The primary enterprise-grade React component that:
 * 1. Consumes the useDashboardData hook to retrieve analytics data
 * 2. Renders multiple sub-components for resource metrics, performance charts,
 *    team performance modules, and predictive insights
 * 3. Integrates real-time data updates
 * 4. Implements accessibility features, skeleton loads, and error states
 * 5. Provides an onMetricClick mechanism to bubble user interactions up
 *    to the parent or external analytics
 *****************************************************************************/
export const AnalyticsDashboard: FC<AnalyticsDashboardProps> = ({
  className,
  timeRange,
  teamIds,
  onMetricClick,
}) => {
  /***************************************************************************
   * 1) Retrieve the entire analytics data set for the given time range
   *    and relevant team IDs. This includes resource metrics, team info,
   *    predictive insights, and more.
   ***************************************************************************/
  const { data, loading, error, retry } = useDashboardData(timeRange, teamIds);

  /***************************************************************************
   * 2) Derived states or transform. E.g., we might filter data for resource
   *    utilization, or pick out certain metrics to show in a chart.
   ***************************************************************************/
  const resourceMetrics: PerformanceMetric[] = useMemo(() => {
    if (!data || !data.metrics) return [];
    // Hypothetical scenario: we might filter or transform the raw metrics
    // to only show certain resource-based analytics. For now, return them all.
    return data.metrics;
  }, [data]);

  /***************************************************************************
   * 3) Render Handlers for partial UI sections (with robust commentary).
   *    We separate them for clarity:
   *      - renderResourceMetrics
   *      - renderPerformanceChart
   *      - renderTeamSection
   *      - renderPredictiveInsights
   *    We could also inline them. This helps illustrate an enterprise approach.
   ***************************************************************************/
  function renderResourceMetrics(): JSX.Element | null {
    if (!resourceMetrics.length) {
      return null;
    }

    // For demonstration: show each metric in a <MetricsCard /> if it suits
    // the UI or business logic. We'll also attach a click handler that calls
    // handleMetricClick -> onMetricClick prop. We assume each metric has an
    // identifying "type" from the MetricType enum.
    return (
      <div className="ts-resource-metrics grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 my-4">
        {resourceMetrics.map((metric) => (
          <MetricsCard
            key={metric.type}
            metric={metric}
            ariaLabel={`Card for metric type: ${metric.type}`}
            onClick={() => handleMetricClick(metric.type, onMetricClick)}
            tooltipContent={(
              <div>
                <strong>{metric.type}</strong> <br />
                Trend: {metric.trend}
              </div>
            )}
          />
        ))}
      </div>
    );
  }

  function renderPerformanceChart(): JSX.Element | null {
    if (!resourceMetrics.length) {
      return null;
    }
    // We'll show a single chart example with the resourceMetrics array.
    // We pass chartType='line', but it can be dynamic or chosen from user input.
    return (
      <div className="ts-performance-chart mt-6">
        <PerformanceChart
          metrics={resourceMetrics}
          chartType="line"
          width={600}
          height={400}
          enableRealTime={false}  /* For demonstration. Could be toggled or read from props. */
        />
      </div>
    );
  }

  function renderTeamSection(): JSX.Element | null {
    // We'll rely on <TeamPerformance> to handle team-level analytics.
    // We pass the same timeRange + teamIds the user gave us.
    if (!teamIds || !teamIds.length) {
      return null;
    }
    // The TeamPerformance component was defined to show each team's velocity,
    // completion rate, etc.
    return (
      <div className="ts-team-section my-4">
        <TeamPerformance
          timeRange={timeRange}
          teamIds={teamIds}
          className="mt-4"
        />
      </div>
    );
  }

  function renderPredictiveInsightsSection(): JSX.Element | null {
    // We'll show the <PredictiveInsights> component with the same timeRange.
    // This subcomponent fetches and displays advanced AI-driven data.
    return (
      <div className="ts-predictive-insights-section my-6">
        <PredictiveInsights
          timeRange={timeRange}
          refreshInterval={0} // Example, we can set a refresh if needed
        />
      </div>
    );
  }

  /***************************************************************************
   * 4) Main UI Render Flow
   *    We handle the "loading" and "error" states, show a manual "Retry" button,
   *    then render all sub-sections if data is loaded.
   ***************************************************************************/
  return (
    <div
      className={classNames(
        'ts-analytics-dashboard',
        'p-4',
        'w-full',
        'mx-auto',
        'max-w-screen-xl',
        className
      )}
      role="region"
      aria-label="Analytics Dashboard Main Container"
    >
      {/* Loading State Skeleton */}
      {loading && (
        <div className="text-center py-6 text-gray-500">
          <p>Loading analytics data, please wait...</p>
        </div>
      )}

      {/* Error State with Retry */}
      {error && !loading && (
        <div
          className="ts-error-state bg-red-50 p-4 rounded border border-red-300 mt-4"
          role="alert"
          aria-live="assertive"
        >
          <p className="text-red-800 font-semibold">
            An error occurred while loading analytics data:
          </p>
          <p className="text-red-700 mt-1">{error.message}</p>
          <button
            onClick={retry}
            className="inline-block mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Once loaded and no errors, display the analytics content */}
      {!loading && !error && data && (
        <>
          {/* 1. Resource Metrics as Cards, with onMetricClick logic */}
          {renderResourceMetrics()}

          {/* 2. Chart-based Visual Representation */}
          {renderPerformanceChart()}

          {/* 3. Team Performance Subcomponent */}
          {renderTeamSection()}

          {/* 4. AI-driven Predictive Insights for Resource Optimization */}
          {renderPredictiveInsightsSection()}
        </>
      )}

      {/* If data is missing but we're not loading or errored, we still handle a fallback. */}
      {!loading && !error && !data && (
        <div className="mt-4 text-gray-500">No analytics data available.</div>
      )}
    </div>
  );
};