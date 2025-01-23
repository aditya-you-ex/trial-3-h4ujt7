/**
 * ui.actions.ts
 * ----------------------------------------------------------------------------
 * This file defines Redux action creators for managing UI-related states
 * in TaskStream AI, such as theme mode, sidebar visibility, loading states,
 * and notifications. It strictly follows the technical specification
 * requirements for Design System Specifications, Component States, and
 * User Interface Design.
 *
 * Each action creator leverages Redux Toolkit's createAction (version ^1.9.0)
 * for type safety and clarity. Comprehensive code comments are provided
 * to outline the logic steps required by the specification.
 */

// ---------------------------------------------------------------------------
// External Imports (With Library Version Comments)
// ---------------------------------------------------------------------------
import { createAction } from '@reduxjs/toolkit'; // @reduxjs/toolkit version ^1.9.0

// ---------------------------------------------------------------------------
// Internal Imports
// ---------------------------------------------------------------------------
import {
  // Enum representing all UI-related action constant types
  // (SET_THEME, TOGGLE_SIDEBAR, SET_LOADING_STATE, SHOW_NOTIFICATION, HIDE_NOTIFICATION)
  UIActionTypes,
  // Enum representing Light, Dark, or System theme modes
  ThemeMode,
  // Enum representing the broad category of a notification (SUCCESS, ERROR, WARNING, INFO)
  NotificationType,
  // Union type representing 'idle' | 'loading' | 'succeeded' | 'failed'
  LoadingState,
  // Interface describing a user-facing notification structure
  Notification,
  // Optional extended severity enum if needed (LOW, MEDIUM, HIGH) - not strictly required by the spec
  NotificationSeverity,
} from './ui.types';

// ---------------------------------------------------------------------------
// Local Types & Interfaces
// ---------------------------------------------------------------------------

/**
 * NotificationOptions
 * ----------------------------------------------------------------------------
 * Defines optional parameters for displaying a notification. Some fields
 * in the Notification interface (like id, type, message, timestamp) are
 * automatically handled, so this type focuses on adjustable properties.
 */
interface NotificationOptions {
  /** Milliseconds before auto-dismiss. If not provided, default is 3000. */
  autoHideDuration?: number;
  /** Severity level (LOW, MEDIUM, HIGH) if used for advanced sorting or filtering. */
  severity?: NotificationSeverity;
  /** Label for an inline action button (optional). */
  actionLabel?: string;
  /**
   * Function invoked when the action button is clicked.
   * Defaults to a no-op if not provided.
   */
  onAction?: () => void;
}

// ---------------------------------------------------------------------------
// 1) setTheme Action Creator
// ---------------------------------------------------------------------------
/**
 * setTheme
 * ----------------------------------------------------------------------------
 * Creates a strictly typed action to update the application theme mode.
 * This covers the following specification steps:
 * 1. Validate the incoming theme mode (must be one of ThemeMode enum).
 * 2. If the mode is ThemeMode.SYSTEM, system preference would be detected by
 *    the app logic. (Note: actual detection logic typically occurs outside
 *    the action creator, but we acknowledge it here.)
 * 3. Create a Redux action with the SET_THEME type.
 * 4. Include a persistence flag in the payload to indicate if user preference
 *    should be saved.
 * 5. Return a strongly typed payload for the reducer.
 */
export const setTheme = createAction<
  { mode: ThemeMode; persist: boolean },
  UIActionTypes.SET_THEME
>(
  UIActionTypes.SET_THEME,
  (themeMode: ThemeMode, persistPreference: boolean) => {
    // Step 1: Validate the theme mode
    if (!Object.values(ThemeMode).includes(themeMode)) {
      throw new Error(`Invalid theme mode: ${themeMode}`);
    }
    // Steps 2-5: Prepare payload
    return {
      payload: {
        mode: themeMode,
        persist: persistPreference,
      },
    };
  }
);

// ---------------------------------------------------------------------------
// 2) toggleSidebar Action Creator
// ---------------------------------------------------------------------------
/**
 * toggleSidebar
 * ----------------------------------------------------------------------------
 * Creates a strictly typed action to toggle the sidebar visibility. This
 * action may also be forced to a specific state (open or closed) based on
 * responsive design conditions or user interactions. Specification steps:
 * 1. Check current viewport size for responsive behavior (done outside or
 *    in a thunk; here we simply collect the boolean).
 * 2. Create the action with the TOGGLE_SIDEBAR type.
 * 3. Include a forced state parameter in the payload if explicitly provided,
 *    otherwise set the payload state to null for the reducer to toggle.
 * 4. Return a strongly typed payload for the reducer.
 */
export const toggleSidebar = createAction<
  { forced: boolean; state: boolean | null },
  UIActionTypes.TOGGLE_SIDEBAR
>(
  UIActionTypes.TOGGLE_SIDEBAR,
  (forceState: boolean) => {
    const forced = typeof forceState === 'boolean';
    const state = forced ? forceState : null;
    return {
      payload: { forced, state },
    };
  }
);

// ---------------------------------------------------------------------------
// 3) setLoadingState Action Creator
// ---------------------------------------------------------------------------
/**
 * setLoadingState
 * ----------------------------------------------------------------------------
 * Creates a strictly typed action to update an asynchronous loading state
 * for a specified component key. Steps:
 * 1. Validate component key (must be a non-empty string).
 * 2. Validate loading state (idle, loading, succeeded, failed).
 * 3. Set a default timeout if not explicitly provided (e.g. 5000 ms).
 * 4. Create the action with the SET_LOADING_STATE type.
 * 5. Include a cleanup timeout in the payload for the reducer or saga.
 * 6. Return a strongly typed payload for the reducer.
 */
export const setLoadingState = createAction<
  { key: string; state: LoadingState; timeout: number },
  UIActionTypes.SET_LOADING_STATE
>(
  UIActionTypes.SET_LOADING_STATE,
  (componentKey: string, loadingState: LoadingState, timeout?: number) => {
    // Step 1: Validate component key
    if (!componentKey || typeof componentKey !== 'string') {
      throw new Error('Invalid component key. Must be a non-empty string.');
    }
    // Step 2: Validate loading state
    if (!['idle', 'loading', 'succeeded', 'failed'].includes(loadingState)) {
      throw new Error(`Invalid loading state: ${loadingState}`);
    }
    // Step 3: Default timeout
    const effectiveTimeout = typeof timeout === 'number' ? timeout : 5000;

    return {
      payload: {
        key: componentKey,
        state: loadingState,
        timeout: effectiveTimeout,
      },
    };
  }
);

// ---------------------------------------------------------------------------
// 4) showNotification Action Creator
// ---------------------------------------------------------------------------
/**
 * showNotification
 * ----------------------------------------------------------------------------
 * Creates a strictly typed action to display a notification. The specification
 * steps are:
 * 1. Generate a unique notification ID.
 * 2. Validate the notification type (SUCCESS, ERROR, WARNING, INFO).
 * 3. Process notification options, including duration, severity, or action.
 * 4. Handle potential queue limits at the reducer level.
 * 5. Create the action with SHOW_NOTIFICATION.
 * 6. Return a strongly typed payload with full notification data.
 */
export const showNotification = createAction<
  Notification,
  UIActionTypes.SHOW_NOTIFICATION
>(
  UIActionTypes.SHOW_NOTIFICATION,
  (
    type: NotificationType,
    message: string,
    options?: NotificationOptions
  ) => {
    // Step 1: Generate unique ID
    const uniqueId = `notif_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Step 2: Validate notification type
    if (!Object.values(NotificationType).includes(type)) {
      throw new Error(`Invalid NotificationType: ${type}`);
    }

    // Step 3: Process notification options
    const autoHideDuration = options?.autoHideDuration ?? 3000;
    const severity = options?.severity ?? NotificationSeverity.MEDIUM;
    const actionLabel = options?.actionLabel ?? '';
    const onAction = options?.onAction ?? (() => {});

    // Notification's creation timestamp
    const timestamp = Date.now();

    return {
      payload: {
        id: uniqueId,
        type,
        message,
        autoHideDuration,
        severity,
        actionLabel,
        onAction,
        timestamp,
      },
    };
  }
);

// ---------------------------------------------------------------------------
// 5) hideNotification Action Creator
// ---------------------------------------------------------------------------
/**
 * hideNotification
 * ----------------------------------------------------------------------------
 * Creates a strictly typed action to remove an existing notification. Steps:
 * 1. Validate the notification ID.
 * 2. Check for animation completion unless forced removal is specified
 *    (the actual check is typically in the reducer or a saga).
 * 3. Create the action with HIDE_NOTIFICATION.
 * 4. Include the force flag in the payload.
 * 5. Return a strongly typed payload for the reducer.
 */
export const hideNotification = createAction<
  { id: string; force: boolean },
  UIActionTypes.HIDE_NOTIFICATION
>(
  UIActionTypes.HIDE_NOTIFICATION,
  (id: string, force = false) => {
    // Step 1: Validate notification ID
    if (!id) {
      throw new Error('Cannot hide notification without a valid ID.');
    }
    // Steps 2-5: Prepare payload
    return {
      payload: { id, force },
    };
  }
);