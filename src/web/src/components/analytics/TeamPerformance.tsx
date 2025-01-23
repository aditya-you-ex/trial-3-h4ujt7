import React, { FC, useEffect, useRef, useState, useCallback, useMemo } from 'react'; // react@^18.0.0
import classNames from 'classnames'; // classnames@^2.3.2
import i18n from 'i18next'; // i18next@^21.8.0

// -----------------------------------------------------------------------------
// Internal Imports (IE1 Compliance)
// -----------------------------------------------------------------------------
import { Card, CardProps } from '../common/Card';
import { ProgressBar, ProgressBarProps } from '../common/ProgressBar';
import { ErrorBoundary, ErrorBoundaryProps } from '../common/ErrorBoundary';
import { LoadingSpinner, LoadingSpinnerProps } from '../common/LoadingSpinner';
import type {
  TeamPerformance as TeamPerformanceData,
} from '../../types/analytics.types';
import { analyticsService } from '../../services/analytics.service';

// -----------------------------------------------------------------------------
// Additional Types from Provided JSON Specification
// -----------------------------------------------------------------------------
import type { TimeRange } from '../../types/common.types';

/**
 * TeamPerformanceProps
 * ----------------------------------------------------------------------------
 * Defines the props for the TeamPerformance component, capturing:
 *  1. Optional CSS class for styling.
 *  2. A required time range (TimeRange) for analytics.
 *  3. A required list of team IDs to display performance metrics for.
 *  4. An optional callback for handling team selection.
 *  5. An optional refresh interval to auto-reload data.
 *  6. An optional error retry count for controlling the number of attempts.
 */
export interface TeamPerformanceProps {
  /**
   * Additional CSS classes for custom styling or theming.
   */
  className?: string;

  /**
   * Time period for which the performance metrics apply.
   * Must be a valid TimeRange object containing startDate and endDate.
   */
  timeRange: TimeRange;

  /**
   * Array of team IDs for which the component should retrieve and display
   * performance metrics. Example: ["teamA", "teamB"].
   */
  teamIds: string[];

  /**
   * Handler for when a user clicks a specific team.
   * Receives the teamId, enabling navigation or additional data fetching.
   */
  onTeamClick?: (teamId: string) => void;

  /**
   * Interval in milliseconds to trigger an automatic data refresh.
   * If not provided or 0/undefined, no auto-refresh is performed.
   */
  refreshInterval?: number;

  /**
   * Number of retry attempts for failed data fetches via our hook’s
   * exponential backoff logic. Defaults to 3 if not provided.
   */
  errorRetryCount?: number;
}

/**
 * Module-level caching map for TeamPerformance data.
 * key: string => "timeRange+teamIds" signature
 * value: array of TeamPerformanceData
 */
const performanceCache: Record<string, TeamPerformanceData[]> = {};

/**
 * Builds a unique cache key from the provided time range and team IDs
 * to ensure that repeated fetches for the same parameters can reuse data.
 *
 * @param timeRange - The time period object specifying startDate and endDate.
 * @param teamIds - The array of team IDs requested.
 * @returns A string used to index into our in-memory performanceCache.
 */
function buildCacheKey(timeRange: TimeRange, teamIds: string[]): string {
  const { startDate, endDate } = timeRange;
  // Example key: "startISO_endISO__teamA-teamB"
  return [
    startDate.toISOString(),
    endDate.toISOString(),
    teamIds.sort().join('-'),
  ].join('__');
}

/**
 * useTeamPerformance
 * ----------------------------------------------------------------------------
 * Custom hook that fetches, manages, and (optionally) subscribes to updates for
 * team performance data within a specified time range. Implements error handling,
 * caching, refresh intervals, and retry logic.
 *
 * Steps:
 *  1) Initialize local states for performance data, loading status, and errors.
 *  2) Construct a cache key and check if we already have data in memory.
 *  3) If we need to fetch fresh data, do so via analyticsService.getTeamPerformance.
 *  4) Filter results to the requested team IDs, store in local state, and cache.
 *  5) Implement a retry mechanism with exponential backoff for errors.
 *  6) Set up a subscription if analyticsService.subscribeToUpdates is available.
 *  7) If refreshInterval > 0, schedule periodic re-fetching of data.
 *  8) Cleanup any intervals or subscriptions on unmount.
 *  9) Return the current data state, loading, error, and a retry function.
 */
function useTeamPerformance(
  timeRange: TimeRange,
  teamIds: string[],
  refreshInterval?: number,
  errorRetryCount?: number
): {
  data: TeamPerformanceData[];
  loading: boolean;
  error: Error | null;
  retry: () => void;
} {
  // Comprehensive local states for data, loading, and error
  const [data, setData] = useState<TeamPerformanceData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Track the current number of attempts during a single fetch cycle
  const maxRetries = errorRetryCount ?? 3;

  // We store a reference to the current isMounted state to prevent setState
  // on unmounted components.
  const isMountedRef = useRef<boolean>(false);

  // Memoize the cache key to avoid recomputations
  const cacheKey = useMemo<string>(() => {
    return buildCacheKey(timeRange, teamIds);
  }, [timeRange, teamIds]);

  /**
   * Internal function to actually fetch data from the analyticsService,
   * applying exponential backoff if an error occurs.
   */
  const fetchTeamPerformanceData = useCallback(
    async (attempt: number) => {
      if (!isMountedRef.current) return;

      // If we have cached data, we can skip the actual fetch
      const cached = performanceCache[cacheKey];
      if (cached) {
        setData(cached);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch everything from the service
        const allTeams = await analyticsService.getTeamPerformance(timeRange);
        // Filter results to the subset of requested teamIds
        const relevantTeams = allTeams.filter((tp) => teamIds.includes(tp.teamId));

        // Cache the results for the next usage
        performanceCache[cacheKey] = relevantTeams;

        // Update state only if still mounted
        if (isMountedRef.current) {
          setData(relevantTeams);
          setError(null);
        }
      } catch (err: any) {
        // If we're still mounted, handle errors with possible retry
        if (isMountedRef.current) {
          if (attempt < maxRetries) {
            // Exponential delay: 2^(attempt) * 1000 ms
            const retryDelay = Math.pow(2, attempt) * 1000;
            setTimeout(() => {
              fetchTeamPerformanceData(attempt + 1);
            }, retryDelay);
          } else {
            // Retries exceeded
            setError(err instanceof Error ? err : new Error(String(err)));
          }
        }
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    },
    [cacheKey, timeRange, teamIds, maxRetries]
  );

  /**
   * Re-fetch or re-try the data fetch manually from external triggers.
   * Resets the attempt counter to 0.
   */
  const retry = useCallback(() => {
    if (!isMountedRef.current) return;
    // Force fresh re-fetch by removing from cache
    delete performanceCache[cacheKey];
    fetchTeamPerformanceData(0);
  }, [cacheKey, fetchTeamPerformanceData]);

  /**
   * useEffect to handle component mount/unmount logic and
   * the immediate data fetch on first render.
   */
  useEffect(() => {
    isMountedRef.current = true;
    fetchTeamPerformanceData(0);

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchTeamPerformanceData]);

  /**
   * Optional subscription for real-time updates or push-based data.
   * If analyticsService.subscribeToUpdates is available, we can listen
   * for push notifications. This example is conceptual, as the actual
   * signature can vary.
   */
  useEffect(() => {
    if (!analyticsService.subscribeToUpdates) return undefined;

    const unsubscribe = analyticsService.subscribeToUpdates(
      'team-performance-updates',
      (incoming: TeamPerformanceData[]) => {
        if (!isMountedRef.current) return;
        // Filter only relevant updates for the requested teamIds
        const relevant = incoming.filter((tp) => teamIds.includes(tp.teamId));
        if (relevant.length > 0) {
          // Merge or replace existing data
          performanceCache[cacheKey] = relevant;
          setData(relevant);
        }
      }
    );

    // Cleanup
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [cacheKey, teamIds]);

  /**
   * If refreshInterval is provided (> 0), we set up a timer to periodically
   * trigger a re-fetch from the backend. This complements other subscription
   * mechanisms or manual user-driven refresh actions.
   */
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) {
      return undefined;
    }

    const intervalId = setInterval(() => {
      // Force fresh data retrieval
      delete performanceCache[cacheKey];
      fetchTeamPerformanceData(0);
    }, refreshInterval);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [refreshInterval, cacheKey, fetchTeamPerformanceData]);

  // Return the aggregated state
  return {
    data,
    loading,
    error,
    retry,
  };
}

/**
 * TeamPerformance
 * ----------------------------------------------------------------------------
 * A React Functional Component (FC) that leverages the useTeamPerformance hook
 * to display multiple teams’ performance metrics (sprint velocity, task
 * completion rate, productivity score, etc.) in a visually appealing card layout,
 * each featuring a progress indicator. Includes robust error handling via
 * ErrorBoundary, loading spinners, caching, retry logic, and optional auto-refresh.
 */
const TeamPerformance: FC<TeamPerformanceProps> = (props) => {
  const {
    className,
    timeRange,
    teamIds,
    onTeamClick,
    refreshInterval,
    errorRetryCount,
  } = props;

  // Use our custom hook to retrieve performance data, handle loading and error states
  const {
    data,
    loading,
    error,
    retry,
  } = useTeamPerformance(timeRange, teamIds, refreshInterval, errorRetryCount);

  /**
   * Renders a single team’s performance card by mapping each relevant metric
   * (taskCompletionRate, sprintVelocity, productivityScore, predictiveInsights)
   * into accessible visual elements like ProgressBars or textual displays.
   */
  const renderTeamCard = (tp: TeamPerformanceData) => {
    const {
      teamId,
      sprintVelocity,
      taskCompletionRate,
      productivityScore,
      predictiveInsights,
    } = tp;

    const handleClick = () => {
      if (onTeamClick) {
        onTeamClick(teamId);
      }
    };

    // For demonstration, treat taskCompletionRate and productivityScore as percentages for the progress bar
    const taskRate = Math.max(0, Math.min(taskCompletionRate, 100));
    const productivity = Math.max(0, Math.min(productivityScore, 100));

    // We will treat sprintVelocity as a numeric value, displayed as text and also as a progress bar
    const sprintVel = Math.max(0, Math.min(sprintVelocity, 100));

    return (
      <Card
        key={teamId}
        className={classNames('ts-teamPerformanceCard', 'mb-4', 'cursor-pointer')}
        interactive
        onClick={handleClick}
        padding="medium"
        elevation="small"
      >
        <h2 className="font-semibold text-lg mb-2">Team: {teamId}</h2>

        <div className="mb-2">
          <span className="block text-sm text-gray-700 mb-1">Task Completion Rate</span>
          <ProgressBar
            value={taskRate}
            max={100}
            showLabel
            variant="success"
            animated
          />
        </div>

        <div className="mb-2">
          <span className="block text-sm text-gray-700 mb-1">Sprint Velocity</span>
          <ProgressBar
            value={sprintVel}
            max={100}
            showLabel
            variant="default"
            animated
          />
          <p className="mt-1 text-xs text-gray-500">
            {/* Provide additional context or numeric readout */}
            {sprintVelocity} arbitrary velocity units
          </p>
        </div>

        <div className="mb-2">
          <span className="block text-sm text-gray-700 mb-1">Productivity Score</span>
          <ProgressBar
            value={productivity}
            max={100}
            showLabel
            variant="warning"
            animated
          />
        </div>

        {predictiveInsights && (
          <div className="mt-3 text-sm text-gray-800">
            <strong>Predictive Insights:</strong>
            {Array.isArray(predictiveInsights.bottlenecks) && predictiveInsights.bottlenecks.length > 0 && (
              <div className="mt-2">
                <span className="font-medium">Bottlenecks:</span>{' '}
                {predictiveInsights.bottlenecks.join(', ')}
              </div>
            )}
            {Array.isArray(predictiveInsights.recommendations) && predictiveInsights.recommendations.length > 0 && (
              <div className="mt-1">
                <span className="font-medium">Recommendations:</span>{' '}
                {predictiveInsights.recommendations.join(', ')}
              </div>
            )}
            {Array.isArray(predictiveInsights.riskFactors) && predictiveInsights.riskFactors.length > 0 && (
              <div className="mt-1">
                <span className="font-medium">Risk Factors:</span>{' '}
                {predictiveInsights.riskFactors.join(', ')}
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };

  /**
   * Main render content for the TeamPerformance component. We consider three
   * primary states:
   *  1) Loading: show a spinner
   *  2) Error: show a fallback UI with a retry button
   *  3) Data available: show a list of Card components for each team
   */
  const renderContent = () => {
    if (loading) {
      return (
        <div className="w-full flex items-center justify-center py-10">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-4 bg-red-50 text-red-800 border border-red-200 rounded">
          <p className="font-semibold mb-2">{i18n.t('teamPerformance.errorTitle', 'Error Loading Team Performance')}</p>
          <p className="mb-4">{error.message}</p>
          <button
            type="button"
            onClick={retry}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 focus:outline-none"
          >
            {i18n.t('teamPerformance.retry', 'Retry')}
          </button>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="mt-4 p-4 text-gray-500 text-sm">
          {i18n.t('teamPerformance.noData', 'No performance data available for the selected teams.')}
        </div>
      );
    }

    // Render each team’s card
    return data.map(renderTeamCard);
  };

  return (
    <ErrorBoundary fallback={<div className="p-4 text-red-600">An unexpected error occurred.</div>}>
      <div className={classNames('ts-teamPerformanceContainer', className)}>
        {renderContent()}
      </div>
    </ErrorBoundary>
  );
};

export default TeamPerformance;