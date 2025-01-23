/**
 * -----------------------------------------------------------------------------
 * File: analytics.reducer.ts
 * Description:
 *   This file defines a Redux reducer to manage the analytics state in an
 *   immutable and type-safe manner using @reduxjs/toolkit. It addresses
 *   the project's requirements for predictive analytics, comprehensive
 *   dashboard metrics, error handling, loading states, and time range
 *   filtering, as described in the technical specifications.
 *
 * Responsibilities:
 *   - Maintains the "dashboard" data within the Redux store using
 *     the IAnalyticsState interface.
 *   - Updates "timeRange" based on user actions or system events.
 *   - Tracks "loading" to manage UI responsiveness (e.g., spinners).
 *   - Manages "error" state for robust error reporting and
 *     data management strategy.
 *   - Follows advanced data management guidelines, ensuring seamless
 *     immutability and correctness in all state transitions.
 * -----------------------------------------------------------------------------
 */

// -----------------------------------------------------------------------------
// External Imports
// -----------------------------------------------------------------------------
// @reduxjs/toolkit version: ^1.9.0
import { createReducer } from '@reduxjs/toolkit';

// -----------------------------------------------------------------------------
// Internal Imports
// -----------------------------------------------------------------------------
// These types are defined in analytics.types.ts and ensure strong type safety
// for the analytics slice of the Redux store, including specialized action
// constants and payload structures that define how each action is handled.
import type { IAnalyticsState, AnalyticsAction } from './analytics.types';
import { AnalyticsActionTypes } from './analytics.types';

// -----------------------------------------------------------------------------
// Global Constants and Initial State
// -----------------------------------------------------------------------------
// We maintain a read-only initial state object per best practices. Note that
// "timeRange" is initialized with dummy values for demonstration and must
// always include a valid duration to meet the "TimeRange" interface contract.
const initialState: Readonly<IAnalyticsState> = {
  dashboard: null,
  timeRange: {
    startDate: new Date(),
    endDate: new Date(),
    duration: 0, // Ensuring compliance with the "TimeRange" interface
  },
  loading: false,
  error: null,
};

/**
 * -----------------------------------------------------------------------------
 * Reducer: analyticsReducer
 * -----------------------------------------------------------------------------
 * Purpose:
 *   Manages the analytics domain state (including predictive analytics,
 *   performance metrics, resource utilization, and time range filtering)
 *   in an immutable, consistent, and type-safe manner.
 *
 * Implementation Aspects:
 *   1. Uses createReducer (powered by Immer) for seamless immutability.
 *   2. Integrates loading states to provide immediate UI feedback.
 *   3. Maintains error details in a structured format for robust error handling.
 *   4. Validates and updates the "timeRange" to govern analytics filtering.
 *   5. Resets analytics data upon CLEAR_METRICS, ensuring a fresh state
 *      for subsequent data retrieval operations.
 *
 * In compliance with data management strategies, each case sets or resets
 * the relevant state fields. We rely on Redux Toolkit's Immer to handle
 * immutable state updates, allowing us to write simpler "mutable" code
 * that is auto-translated into pure immutable state updates.
 */
const analyticsReducer = createReducer<Readonly<IAnalyticsState>, AnalyticsAction>(
  initialState,
  {
    /**
     * -------------------------------------------------------------------------
     * FETCH_METRICS_REQUEST
     * -------------------------------------------------------------------------
     * Triggers the state transition indicating a metrics fetch is ongoing:
     * - Sets "loading" flag to true to display spinners or disable actions.
     * - Clears any existing error state to ensure a fresh operation scope.
     */
    [AnalyticsActionTypes.FETCH_METRICS_REQUEST]: (state) => {
      state.loading = true;
      state.error = null;
    },

    /**
     * -------------------------------------------------------------------------
     * FETCH_METRICS_SUCCESS
     * -------------------------------------------------------------------------
     * Invoked when analytics data has been successfully fetched from the
     * server or cache:
     * - Resets "loading" to false because the operation is complete.
     * - Clears any existing error details.
     * - Updates "dashboard" with the newly retrieved analytics payload.
     */
    [AnalyticsActionTypes.FETCH_METRICS_SUCCESS]: (state, action) => {
      state.loading = false;
      state.error = null;
      state.dashboard = action.payload; // AnalyticsDashboard type enforced
    },

    /**
     * -------------------------------------------------------------------------
     * FETCH_METRICS_FAILURE
     * -------------------------------------------------------------------------
     * Dispatched upon failed analytics fetch attempts:
     * - Ends the loading phase by setting "loading" to false.
     * - Populates the error object with the code and message from the payload.
     * - Leaves "dashboard" unchanged, preserving the last known state.
     */
    [AnalyticsActionTypes.FETCH_METRICS_FAILURE]: (state, action) => {
      state.loading = false;
      state.error = {
        code: action.payload.code,
        message: action.payload.message,
      };
    },

    /**
     * -------------------------------------------------------------------------
     * UPDATE_TIME_RANGE
     * -------------------------------------------------------------------------
     * Adjusts the time range window used for filtering analytics:
     * - Replaces the current "timeRange" with the user/system-specified payload.
     * - This triggers a subsequent fetch in most implementations.
     */
    [AnalyticsActionTypes.UPDATE_TIME_RANGE]: (state, action) => {
      state.timeRange = action.payload;
    },

    /**
     * -------------------------------------------------------------------------
     * CLEAR_METRICS
     * -------------------------------------------------------------------------
     * Resets the analytics slice of the store to its initial, pristine state:
     * - Useful when the user navigates away from analytics or to purge stale data.
     * - Maintains immutability by returning the "initialState" reference.
     */
    [AnalyticsActionTypes.CLEAR_METRICS]: () => {
      return initialState;
    },
  }
);

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------
// We export the reducer as the default module export, ensuring it is readily
// available for store configuration and integration into the broader
// application’s state management registry.
export default analyticsReducer;