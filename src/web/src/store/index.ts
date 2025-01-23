/**
 * -----------------------------------------------------------------------------
 * Redux Store Configuration for TaskStream AI
 * -----------------------------------------------------------------------------
 * This file provides an enterprise-grade Redux store configuration for the
 * TaskStream AI web application. It implements and integrates all core 
 * state management requirements, including:
 *   - Redux Toolkit setup with enhanced defaults (serializable checks, thunk).
 *   - Development-only features such as logging middleware and DevTools.
 *   - Action batching for real-time updates and optimized dispatch performance.
 *   - Error tracking middleware to collect and log any runtime exceptions.
 *   - Type definitions for the global state (RootState) and dispatch.
 *
 * Requirements Addressed:
 * 1) State Management (Technical Specifications/4.2.2 Frontend Frameworks):
 *    Utilizes Redux Toolkit for a predictable, type-safe store with
 *    integrated middleware and dev tooling.
 * 2) Core Components (Technical Specifications/2.2.1 Core Components):
 *    Consolidates all feature-specific states (tasks, projects, analytics, etc.)
 *    into a single unified store, connecting React and Redux seamlessly.
 * 3) Real-time Updates (Technical Specifications/3.2.2 Data Access Patterns):
 *    Sets up action batching, ensuring optimized performance with the
 *    potential to dispatch multiple actions in quick succession without
 *    causing extraneous re-renders or overhead.
 *
 * Implementation Overview:
 *   - createSerializableStateInvariantMiddleware() identifies non-serializable
 *     data in Redux state for better debugging (development-only).
 *   -redux-thunk is used for async logic and side effects.
 *   - createLogger logs each action and state transition in development mode.
 *   - A custom errorTrackingMiddleware captures errors that may occur
 *     during reducer execution.
 *   - A custom actionBatchingMiddleware allows arrays of actions to be
 *     dispatched in a single pass, improving real-time functionality.
 *   - The store is configured to activate Redux DevTools in development mode,
 *     including the optional window.__REDUX_DEVTOOLS_EXTENSION__ if available.
 *
 * The store is created via configureAppStore, which can accept an optional
 * preloadedState object. A singleton store export is provided as the default.
 * Additionally, RootState and AppDispatch are exported for strong type usage
 * across the application.
 */

////////////////////////////////////
// External Imports (With Versions)
////////////////////////////////////
// @reduxjs/toolkit version: ^1.9.5
import { configureStore, Middleware } from '@reduxjs/toolkit';
// redux-thunk version: ^2.4.2
import thunk from 'redux-thunk';
// @reduxjs/toolkit version: ^1.9.5
import { createSerializableStateInvariantMiddleware } from '@reduxjs/toolkit';
// redux-logger version: ^3.0.6
import { createLogger } from 'redux-logger';

////////////////////////////////////
// Internal Imports (Root Reducer)
////////////////////////////////////
// rootReducer is the default export combining all feature reducers.
import rootReducer from './rootReducer';

////////////////////////////////////
// Global Environment Checks
////////////////////////////////////
/**
 * Determines if the app is running in development mode.
 * Used to conditionally apply dev-only middleware and configuration.
 */
const isDevelopment: boolean = process.env.NODE_ENV === 'development';

/**
 * A reference to the Redux DevTools extension, if present in the browser.
 * This is typically auto-detected by Redux Toolkit if enabled via devTools.
 */
declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: Function;
  }
}
const REDUX_DEVTOOLS_EXTENSION = window.__REDUX_DEVTOOLS_EXTENSION__;

////////////////////////////////////
// Custom Middlewares
////////////////////////////////////

/**
 * errorTrackingMiddleware
 * ---------------------------------------------------------------------------
 * A simple middleware that wraps the dispatch flow in a try/catch block
 * to capture unexpected errors during reducer execution. In a real-world
 * scenario, this can be augmented to send error details to a logging or
 * monitoring service.
 */
const errorTrackingMiddleware: Middleware = (storeAPI) => (next) => (action) => {
  try {
    return next(action);
  } catch (err) {
    // In an enterprise context, we'd integrate with an external
    // error tracking service (e.g., Sentry, Datadog) here.
    // For now, output to console for visibility:
    /* eslint-disable no-console */
    console.error('[Error Tracking Middleware]', err);
    /* eslint-enable no-console */
    throw err;
  }
};

/**
 * actionBatchingMiddleware
 * ---------------------------------------------------------------------------
 * Enables dispatching arrays of actions in a single go, which can benefit
 * real-time updates by removing repeated re-render cycles when multiple
 * discreet actions should fire consecutively.
 *
 * Example usage:
 * store.dispatch([
 *   { type: 'ACTION_ONE', payload: ... },
 *   { type: 'ACTION_TWO', payload: ... },
 * ]);
 */
const actionBatchingMiddleware: Middleware = (storeAPI) => (next) => (action) => {
  if (Array.isArray(action)) {
    // Dispatch each action within the array individually.
    // This ensures they flow through all middlewares and the reducer.
    action.forEach((singleAction) => storeAPI.dispatch(singleAction));
    return;
  }
  return next(action);
};

////////////////////////////////////
// Store Configuration Function
////////////////////////////////////
/**
 * configureAppStore
 * ---------------------------------------------------------------------------
 * Factory function to create a fully configured Redux store with:
 *   1. Serializability checks in development.
 *   2. Thunk middleware for async actions.
 *   3. A custom error tracking middleware.
 *   4. Action batching middleware to handle array-dispatched actions.
 *   5. Logging middleware (development only).
 *   6. Optional Redux DevTools extension in development mode.
 *   7. Support for preloadedState to hydrate store from server or local data.
 *   8. Root reducer combining all domain slices.
 *
 * @param preloadedState Optional partial preloaded state object.
 * @returns The fully configured Redux store instance.
 */
export function configureAppStore(preloadedState?: Partial<RootState>) {
  // Step (1) Create serializable state check middleware
  const serializableMiddleware = createSerializableStateInvariantMiddleware();

  // Step (2) Configure development logging middleware using redux-logger
  const logger = createLogger({
    collapsed: true,
    duration: true,
    timestamp: false,
  });

  // Step (3) Set up thunk middleware for async actions (already imported).
  // Step (4) Enable Redux DevTools in development environment with the devTools flag.
  // Step (5) Integrate errorTrackingMiddleware for capturing runtime errors.
  // Step (6) Add actionBatchingMiddleware to handle array-based dispatch.
  // Step (7) Apply preloadedState if provided.
  // Step (8) Create and return the store instance.

  const middlewares = [
    // 6) Action batching for real-time efficiency
    actionBatchingMiddleware,

    // 5) Error tracking
    errorTrackingMiddleware,

    // 3) Thunk async actions
    thunk,

    // 1) Serializable checks (development only, but we can limit it with a condition)
    serializableMiddleware,
  ];

  if (isDevelopment) {
    // 2) Logging in dev mode
    middlewares.push(logger);
  }

  const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => {
      // We do not want to add default middlewares from RTK again
      // if we already inserted them. We'll just merge them carefully:
      // Actually, we already have serializable checks & thunk, so we might
      // block duplication. But let's be consistent, returning our custom array:
      return middlewares;
    },
    devTools: isDevelopment && typeof REDUX_DEVTOOLS_EXTENSION !== 'undefined',
    preloadedState: preloadedState || {},
  });

  return store;
}

////////////////////////////////////
// Single-Instance Store
////////////////////////////////////
/**
 * A pre-configured store instance for the entire application. Most
 * large-scale apps can rely on a single global store, though we export
 * configureAppStore() above for advanced scenarios (like SSR or tests).
 */
export const store = configureAppStore();

////////////////////////////////////
// RootState and AppDispatch Types
////////////////////////////////////
/**
 * RootState
 * ---------------------------------------------------------------------------
 * The master state type derived from the rootReducer, representing the entire
 * Redux store structure. Any new slice in rootReducer reflects here.
 */
export type RootState = ReturnType<typeof rootReducer>;

/**
 * AppDispatch
 * ---------------------------------------------------------------------------
 * The specific dispatch function type from our store, including support for
 * async thunks and custom middlewares. This is used across the application
 * to ensure typed dispatch usage.
 */
export type AppDispatch = typeof store.dispatch;

////////////////////////////////////
// Default Export
////////////////////////////////////
/**
 * The default export is the globally instantiated store, suitable for
 * standard usage. In typical React applications, this is provided via
 * <Provider store={store}> at the root level.
 */
export default store;