/**
 * ui.types.ts
 * ----------------------------------------------------------------------------
 * This file defines TypeScript types and interfaces for the UI state
 * management system in TaskStream AI. It addresses the following:
 * 1. Design System Specifications:
 *    - Theme configuration references for palette, typography, spacing,
 *      and breakpoints.
 * 2. User Interface Design:
 *    - Types for layout structure, responsive breakpoints, and UI
 *      component states.
 * 3. Cross-Cutting Concerns:
 *    - Notification interface, loading states, and overall global UI
 *      state management to ensure consistency across the application.
 */

///////////////////////////////////////////////////////
// External Imports (With Library Version Comments)  //
///////////////////////////////////////////////////////

// @mui/material version 5.14+
import type { Theme as MaterialUITheme } from '@mui/material';

///////////////////////////////////////////////////////
// Internal Imports                                  //
///////////////////////////////////////////////////////
import type { LoadingState } from '../../types/common.types';
import type { Theme as ConfigTheme } from '../../config/theme.config';

///////////////////////////////////////////////
// Extended/Custom Theme Type (If Required)  //
///////////////////////////////////////////////
/**
 * CustomTheme
 * --------------------------------------------------------------------------
 * An example extension type that references the members from the imported
 * custom theme configuration. This interface merges any additional
 * layering on top of Material-UI's Theme if needed.
 *
 * Note: The JSON specification references palette, typography, spacing,
 * and breakpoints. In practice, ConfigTheme is already a specialized MUI
 * Theme, but we define this for clarity in case we need more specificity.
 */
export interface CustomTheme extends ConfigTheme, MaterialUITheme {
  // Potentially re-expose or override theme properties here if necessary,
  // such as palette, typography, spacing, or breakpoints. Currently empty.
}

///////////////////////////////////////////////
// Enums for Theme, Notifications, Severity  //
///////////////////////////////////////////////

/**
 * ThemeMode
 * --------------------------------------------------------------------------
 * Enum representing the theme mode options for controlling the application
 * appearance. Fulfills requirements for system settings to switch between
 * Light, Dark, or System-based UI modes.
 */
export enum ThemeMode {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  SYSTEM = 'SYSTEM',
}

/**
 * NotificationType
 * --------------------------------------------------------------------------
 * Enum representing the broad category of notifications that can appear in
 * the system, aligning with cross-cutting concerns for alerting and messaging.
 */
export enum NotificationType {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  WARNING = 'WARNING',
  INFO = 'INFO',
}

/**
 * NotificationSeverity
 * --------------------------------------------------------------------------
 * Enum representing severity levels for notifications, allowing prioritization
 * and system-level filtering. This facilitates consistent handling of UI alerts.
 */
export enum NotificationSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

///////////////////////////////////////////////
// Notification Data Structure              //
///////////////////////////////////////////////

/**
 * Notification
 * --------------------------------------------------------------------------
 * Comprehensive interface describing a user-facing notification or toast
 * message. Implements auto-hide behavior, action callbacks, severity-level
 * prioritization, and typed messages.
 */
export interface Notification {
  /**
   * Unique identifier for tracking this notification instance. Often a UUID.
   */
  id: string;

  /**
   * The type of notification as defined by NotificationType (e.g., SUCCESS).
   */
  type: NotificationType;

  /**
   * Main textual message to be displayed within the notification.
   */
  message: string;

  /**
   * Duration (in milliseconds) after which this notification will be
   * automatically dismissed if no action is taken.
   */
  autoHideDuration: number;

  /**
   * Defines the severity level for this notification (e.g., LOW, MEDIUM, HIGH).
   */
  severity: NotificationSeverity;

  /**
   * Optional label for an action button within the notification UI.
   */
  actionLabel: string;

  /**
   * Callback function to be invoked when the notification action button
   * is clicked.
   */
  onAction: () => void;

  /**
   * Numeric timestamp (in ms) indicating when the notification was created,
   * aiding in sorting or expiring old notifications.
   */
  timestamp: number;
}

///////////////////////////////////////////////
// Global UI State                           //
///////////////////////////////////////////////

/**
 * UIState
 * --------------------------------------------------------------------------
 * Represents the global state slice dedicated to UI concerns. This covers
 * theme mode, layout configurations, notifications, loading states, and any
 * other cross-cutting UI logic.
 */
export interface UIState {
  /**
   * The current mode of the application theme (light, dark, or system).
   */
  themeMode: ThemeMode;

  /**
   * Whether the primary sidebar is currently open or collapsed.
   */
  isSidebarOpen: boolean;

  /**
   * Whether the top or side navigation bar is in a collapsed (narrow) state.
   */
  isNavbarCollapsed: boolean;

  /**
   * Collection of notifications displayed system-wide (e.g., banners, dialogs).
   */
  readonly notifications: readonly Notification[];

  /**
   * Collection of transient toasts or snackbars shown at the bottom or top
   * of the screen. These are typically ephemeral.
   */
  readonly toasts: readonly Notification[];

  /**
   * A record that maps unique string identifiers to aLoadingState, allowing
   * granular management of multiple asynchronous processes.
   */
  loadingStates: Record<string, LoadingState>;

  /**
   * A single global application loading state representing the overall
   * high-level fetch or action status.
   */
  globalLoadingState: LoadingState;

  /**
   * The currently detected or enforced breakpoint identifier (mobile, tablet,
   * desktop, wide, etc.) for responsive design logic.
   */
  currentBreakpoint: string;

  /**
   * An array of currently active dialogs (modals) identified by string keys.
   * Allows multiple overlaying dialogs to be tracked in the application.
   */
  readonly activeDialogs: readonly string[];
}