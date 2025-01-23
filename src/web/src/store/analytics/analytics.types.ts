/**
 * -----------------------------------------------------------------------------
 * Import Statements
 * -----------------------------------------------------------------------------
 * We import "Action" from "@reduxjs/toolkit" (version ^1.9.0) for type-safe
 * Redux actions. We also import "AnalyticsDashboard" from our internal
 * "analytics.types" module and "TimeRange" from "common.types" to ensure
 * type integrity for analytics state and actions within this Redux slice.
 */
import type { Action } from '@reduxjs/toolkit'; // ^1.9.0
import type { AnalyticsDashboard } from '../../types/analytics.types';
import type { TimeRange } from '../../types/common.types';

/**
 * -----------------------------------------------------------------------------
 * Enum: AnalyticsActionTypes
 * -----------------------------------------------------------------------------
 * Purpose:
 *   Provides strongly typed constants for analytics-related Redux actions,
 *   ensuring no accidental typos or mismatched strings at the action level.
 *
 * Description:
 *   Enumerates the distinct phase-based actions responsible for fetching,
 *   updating, and clearing analytics data in the Redux store.
 */
export enum AnalyticsActionTypes {
  FETCH_METRICS_REQUEST = 'FETCH_METRICS_REQUEST',
  FETCH_METRICS_SUCCESS = 'FETCH_METRICS_SUCCESS',
  FETCH_METRICS_FAILURE = 'FETCH_METRICS_FAILURE',
  UPDATE_TIME_RANGE = 'UPDATE_TIME_RANGE',
  CLEAR_METRICS = 'CLEAR_METRICS',
}

/**
 * -----------------------------------------------------------------------------
 * Interface: IAnalyticsState
 * -----------------------------------------------------------------------------
 * Purpose:
 *   Defines the immutable analytics slice of the Redux store, managing
 *   the current dashboard data, time range selection, loading status,
 *   and any error details encountered during requests.
 *
 * Description:
 *   The "dashboard" field can be null if metrics have not yet been fetched
 *   or cleared. "timeRange" holds the user-selected time boundaries.
 *   "loading" conveys an ongoing action, and "error" provides context
 *   if a request fails.
 */
export interface IAnalyticsState {
  /**
   * The main analytics dashboard data. May be null if none
   * has been fetched or cleared by user actions.
   */
  readonly dashboard: AnalyticsDashboard | null;

  /**
   * The currently selected time range bounding the metrics,
   * ensuring consistent filtering across the analytics UI.
   */
  readonly timeRange: TimeRange;

  /**
   * Indicates whether a request is in progress, controlling
   * UI feedback such as spinners or disabled actions.
   */
  readonly loading: boolean;

  /**
   * Details about any encountered error. Null if
   * the most recent action succeeded or no action has been taken.
   */
  readonly error: { code: string; message: string } | null;
}

/**
 * -----------------------------------------------------------------------------
 * Interface: IFetchMetricsRequestAction
 * -----------------------------------------------------------------------------
 * Purpose:
 *   Expresses the intention to start fetching analytics metrics
 *   (e.g., performance metrics, resource analytics) from the server.
 *
 * Description:
 *   Triggered when the user or application logic initiates a retrieval
 *   of real-time or cached metrics for display in the dashboard.
 */
export interface IFetchMetricsRequestAction extends Action {
  readonly type: AnalyticsActionTypes.FETCH_METRICS_REQUEST;
}

/**
 * -----------------------------------------------------------------------------
 * Interface: IFetchMetricsSuccessAction
 * -----------------------------------------------------------------------------
 * Purpose:
 *   Signifies that the request for analytics metrics completed successfully,
 *   and includes the fetched "AnalyticsDashboard" payload for state updates.
 *
 * Description:
 *   This is typically dispatched after the server responds with valid
 *   metrics data, enabling the Redux store to refresh its analytics slice.
 */
export interface IFetchMetricsSuccessAction extends Action {
  readonly type: AnalyticsActionTypes.FETCH_METRICS_SUCCESS;
  readonly payload: AnalyticsDashboard;
}

/**
 * -----------------------------------------------------------------------------
 * Interface: IFetchMetricsFailureAction
 * -----------------------------------------------------------------------------
 * Purpose:
 *   Indicates that the request for analytics metrics encountered an error,
 *   providing an error structure for logging or UI display.
 *
 * Description:
 *   The payload contains error details such as an error code and message
 *   to guide user-facing messaging or diagnostic routines.
 */
export interface IFetchMetricsFailureAction extends Action {
  readonly type: AnalyticsActionTypes.FETCH_METRICS_FAILURE;
  readonly payload: {
    code: string;
    message: string;
  };
}

/**
 * -----------------------------------------------------------------------------
 * Interface: IUpdateTimeRangeAction
 * -----------------------------------------------------------------------------
 * Purpose:
 *   Allows the application to update the analytics time boundaries (e.g.,
 *   switching between 'Last 7 Days' and 'Last 30 Days') at the Redux store level.
 *
 * Description:
 *   Dispatched when users or system processes adjust the time range currently
 *   in focus, prompting the UI and metrics retrieval logic to filter accordingly.
 */
export interface IUpdateTimeRangeAction extends Action {
  readonly type: AnalyticsActionTypes.UPDATE_TIME_RANGE;
  readonly payload: TimeRange;
}

/**
 * -----------------------------------------------------------------------------
 * Interface: IClearMetricsAction
 * -----------------------------------------------------------------------------
 * Purpose:
 *   Resets or clears the analytics metrics in the Redux store,
 *   typically used when switching contexts or cleaning up stale data.
 *
 * Description:
 *   Useful when the user navigates away from analytics-intensive views,
 *   performing a housekeeping action on the Redux store to keep memory usage low
 *   or prepare for new data retrieval.
 */
export interface IClearMetricsAction extends Action {
  readonly type: AnalyticsActionTypes.CLEAR_METRICS;
}

/**
 * -----------------------------------------------------------------------------
 * Type: AnalyticsAction
 * -----------------------------------------------------------------------------
 * Purpose:
 *   Aggregates all analytics-related Redux actions into a single
 *   discriminated union, supporting exhaustive checks in reducers.
 *
 * Description:
 *   Enables robust type safety in analytics reducers by enforcing
 *   explicit handling of every possible action subtype, thus preventing
 *   unhandled states or silent failures.
 */
export type AnalyticsAction =
  | IFetchMetricsRequestAction
  | IFetchMetricsSuccessAction
  | IFetchMetricsFailureAction
  | IUpdateTimeRangeAction
  | IClearMetricsAction;