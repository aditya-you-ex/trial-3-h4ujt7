/**
 * -------------------------------------------------------------------------
 * Root Reducer for TaskStream AI
 * -------------------------------------------------------------------------
 * This file configures the root Redux reducer for the TaskStream AI web
 * application. It unifies all feature-specific reducers (analytics, auth,
 * tasks, projects, and UI) into a single top-level reducer function
 * managing global state with strong type safety and immutability.
 *
 * Requirements Addressed:
 * 1) State Management (Technical Specifications/4.2.2 Frontend Frameworks):
 *    Utilizes Redux Toolkit for predictable state container management
 *    with robust typing and immutability guarantees.
 * 2) Core Components (Technical Specifications/2.2.1 Core Components):
 *    Centralizes the web application's multi-feature state management
 *    by combining all domain reducers into a single, coherent store
 *    interface.
 *
 * Implementation Summary:
 * - Imports all feature reducers with their respective typed states.
 * - Uses Redux Toolkit's combineReducers (version ^1.9.5) to assemble a
 *   single top-level reducer.
 * - Exposes a createRootReducer() factory function that encapsulates the
 *   combination logic, ensuring each slice is mapped to its type.
 * - Provides a RootState type as the canonical shape of the entire Redux
 *   state tree.
 * - Exports `rootReducer` as the default, fulfilling the specification's
 *   requirement for a type-safe combined reducer used across the app.
 */

// -------------------------------------------------------------------------
// External Imports (With Library Version Comments)
// -------------------------------------------------------------------------
// @reduxjs/toolkit version: ^1.9.5
import { combineReducers, Reducer } from '@reduxjs/toolkit';

// -------------------------------------------------------------------------
// Internal Imports (Feature Reducers)
// -------------------------------------------------------------------------
// Each reducer is imported according to the JSON specification, ensuring
// proper typed states for analytics, auth, tasks, projects, and UI slices.
import analyticsReducer from './analytics/analytics.reducer';
import authReducer from './auth/auth.reducer';
import tasksReducer from './tasks/tasks.reducer';
import projectsReducer from './projects/projects.reducer';
import uiReducer from './ui/ui.reducer';

// -------------------------------------------------------------------------
// Step: createRootReducer
// -------------------------------------------------------------------------
// 1. Import all feature reducers with type definitions (done above).
// 2. Use combineReducers to create a type-safe root reducer.
// 3. Map each reducer to its corresponding slice key.
// 4. Ensure state isolation across features by dedicated keys.
// 5. Optionally configure performance or memoization optimizations,
//    though Redux Toolkit applies default best practices.
// 6. Return the combined reducer with full type inference.
export function createRootReducer(): Reducer<RootState> {
  return combineReducers<RootState>({
    // Each slice key matches the domain of its respective reducer.
    analytics: analyticsReducer,
    auth: authReducer,
    tasks: tasksReducer,
    projects: projectsReducer,
    ui: uiReducer,
  });
}

/**
 * -------------------------------------------------------------------------
 * Instantiate the Root Reducer
 * -------------------------------------------------------------------------
 * We call createRootReducer() once for global usage. This ensures that the
 * entire application state is managed by a single top-level reducer object.
 * The returned reducer is bound to the shape described by RootState.
 */
const rootReducer = createRootReducer();

/**
 * -------------------------------------------------------------------------
 * Global Application State Type
 * -------------------------------------------------------------------------
 * RootState definitively represents the entire Redux store's shape. It is
 * derived using the type of our rootReducer. Whenever feature reducers
 * add or remove state slices, RootState automatically updates to match.
 */
export type RootState = ReturnType<typeof rootReducer>;

/**
 * -------------------------------------------------------------------------
 * Default Export: rootReducer
 * -------------------------------------------------------------------------
 * Export the unified root reducer as default. This aligns with the
 * specification's requirement for a default export named `rootReducer`,
 * providing a single, cohesive entry point for configuring the store.
 */
export default rootReducer;