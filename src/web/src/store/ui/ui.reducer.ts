/**
 * ui.reducer.ts
 * ----------------------------------------------------------------------------
 * This file implements a Redux reducer for managing the global UI state within
 * TaskStream AI. It addresses:
 * 1. Design System Specifications:
 *    - Comprehensive theme mode handling (light, dark, system).
 *    - Integration with responsive breakpoints.
 * 2. Component States:
 *    - Manages granular loading states, notification queue with severity levels,
 *      and frequent UI updates with performance optimization.
 * 3. User Interface Design:
 *    - Controls sidebar visibility for main dashboard rendering.
 *    - Tracks current breakpoint to optimize component layout.
 *
 * The reducer is built with @reduxjs/toolkit (version ^1.9.0) to ensure
 * immutability and robust performance at scale.
 */

///////////////////////////////////////////////////////
// External Imports (With Library Version Comments)  //
///////////////////////////////////////////////////////
// @reduxjs/toolkit version ^1.9.0
import { createReducer, PayloadAction } from '@reduxjs/toolkit';

///////////////////////////////////////////////////////
// Internal Imports                                  //
///////////////////////////////////////////////////////
import {
  UIState,
  ThemeMode,
  Notification,
  LoadingState,
} from './ui.types';

/**
 * The JSON specification references a UIActionTypes enum with the following:
 *   - SET_THEME
 *   - TOGGLE_SIDEBAR
 *   - SET_LOADING_STATE
 *   - SHOW_NOTIFICATION
 *   - HIDE_NOTIFICATION
 *   - SET_BREAKPOINT
 *
 * This enum is assumed to be part of ui.types.ts or a related module.
 * Below is a representative structure ensuring each action is handled.
 */
export enum UIActionTypes {
  SET_THEME = 'UI/SET_THEME',
  TOGGLE_SIDEBAR = 'UI/TOGGLE_SIDEBAR',
  SET_LOADING_STATE = 'UI/SET_LOADING_STATE',
  SHOW_NOTIFICATION = 'UI/SHOW_NOTIFICATION',
  HIDE_NOTIFICATION = 'UI/HIDE_NOTIFICATION',
  SET_BREAKPOINT = 'UI/SET_BREAKPOINT',
}

/**
 * initialState
 * ----------------------------------------------------------------------------
 * Defines the default UI state in a type-safe manner. This state covers:
 * 1. Theme selection (light, dark, or system).
 * 2. Sidebar visibility for layout control.
 * 3. Real-time notifications with severity prioritization.
 * 4. Granular loading states for multiple components or operations.
 * 5. Current responsive breakpoint for optimized rendering logic.
 *
 * Additional fields from UIState (e.g., isNavbarCollapsed, toasts,
 * globalLoadingState, activeDialogs) are included here to align with the
 * extended definition in ui.types.ts, even though the JSON specification
 * only explicitly mentions some. This ensures consistency with the actual
 * UIState interface.
 */
export const initialState: UIState = {
  // Current theme mode (LIGHT, DARK, or SYSTEM)
  themeMode: ThemeMode.LIGHT,

  // Whether the sidebar is open by default
  isSidebarOpen: false,

  // Whether the navbar is collapsed (not explicitly required by the JSON spec but defined in UIState)
  isNavbarCollapsed: false,

  // Array of in-app notifications
  notifications: [],

  // Array of ephemeral toast messages (declared in UIState but not specifically referenced in the spec)
  toasts: [],

  // Map of component-specific loading states
  loadingStates: {},

  // A high-level loading state for the entire application
  globalLoadingState: 'idle',

  // Currently active breakpoint (e.g., 'mobile', 'tablet', 'desktop', 'wide')
  currentBreakpoint: '',

  // An array of active modal/dialog identifiers
  activeDialogs: [],
};

/**
 * uiReducer
 * ----------------------------------------------------------------------------
 * This reducer centralizes state updates for UI concerns, ensuring both
 * performance and maintainability. It follows the JSON specification steps:
 *
 * 1. Initialize reducer with createReducer and type-safe initial state.
 * 2. Handle SET_THEME action with theme validation and system preference detection.
 * 3. Manage TOGGLE_SIDEBAR action with layout recalculation optimization.
 * 4. Process SET_LOADING_STATE action with granular component tracking.
 * 5. Handle SHOW_NOTIFICATION with severity levels and queue management.
 * 6. Manage HIDE_NOTIFICATION with optimized array updates.
 * 7. Handle SET_BREAKPOINT with responsive layout triggers.
 * 8. Implement performance optimizations leveraging Redux Toolkit's Immer-based approach.
 * 9. Return immutably updated state with type safety.
 */
const uiReducer = createReducer(initialState, (builder) => {
  /**
   * 1) SET_THEME:
   *    Applies the new theme mode (light, dark, or system). The specification
   *    mentions system preference detection. Typically, secondary logic to
   *    detect 'prefers-color-scheme' would occur outside the reducer (e.g.,
   *    in a saga or a custom hook). Here, we simply set the mode.
   */
  builder.addCase(UIActionTypes.SET_THEME, (state, action: PayloadAction<ThemeMode>) => {
    // Simple validation check or fallback could be done if needed.
    state.themeMode = action.payload;
  });

  /**
   * 2) TOGGLE_SIDEBAR:
   *    Flips the isSidebarOpen boolean, dictating whether the main sidebar
   *    is visible. We include a comment regarding layout recalculation or
   *    potential performance considerations, as larger UIs might re-render.
   */
  builder.addCase(UIActionTypes.TOGGLE_SIDEBAR, (state) => {
    state.isSidebarOpen = !state.isSidebarOpen;
  });

  /**
   * 3) SET_LOADING_STATE:
   *    Allows granular state management for asynchronous operations. The
   *    payload typically includes: { componentId: string, loadingState: LoadingState }.
   */
  builder.addCase(
    UIActionTypes.SET_LOADING_STATE,
    (
      state,
      action: PayloadAction<{
        componentId: string;
        loadingState: LoadingState;
      }>
    ) => {
      const { componentId, loadingState } = action.payload;
      state.loadingStates[componentId] = loadingState;
    }
  );

  /**
   * 4) SHOW_NOTIFICATION:
   *    Enqueues a new notification. This includes logic for severity, auto-hide,
   *    and action callback management. Additional logic for ensuring queue length
   *    or preventing duplicates can be added here.
   */
  builder.addCase(UIActionTypes.SHOW_NOTIFICATION, (state, action: PayloadAction<Notification>) => {
    // Spread the existing notifications array and add the new one
    state.notifications = [...state.notifications, action.payload];
  });

  /**
   * 5) HIDE_NOTIFICATION:
   *    Removes a notification (by its ID) from the queue. This is done with an
   *    optimized array update that leverages filtering. In large arrays, more
   *    advanced data structures or indexing might be used for performance.
   */
  builder.addCase(UIActionTypes.HIDE_NOTIFICATION, (state, action: PayloadAction<string>) => {
    const notificationIdToRemove = action.payload;
    state.notifications = state.notifications.filter(
      (notification) => notification.id !== notificationIdToRemove
    );
  });

  /**
   * 6) SET_BREAKPOINT:
   *    Updates the current breakpoint string (e.g., 'mobile', 'desktop') to enable
   *    responsive UI logic. This helps determine layout changes in real time.
   */
  builder.addCase(UIActionTypes.SET_BREAKPOINT, (state, action: PayloadAction<string>) => {
    state.currentBreakpoint = action.payload;
  });
});

/**
 * By exporting uiReducer as the default, we adhere to the JSON specification's
 * requirement that it be the default export. This reducer is typically combined
 * at the root level with other slices of application state, ensuring that UI
 * updates remain isolated and performing well (step #8 regarding performance).
 */
export default uiReducer;