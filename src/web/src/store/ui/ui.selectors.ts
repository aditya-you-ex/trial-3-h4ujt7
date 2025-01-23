/* eslint-disable */

/**
 * ------------------------------------------------------------------------
 * ui.selectors.ts
 * ------------------------------------------------------------------------
 * This file provides a comprehensive set of memoized TypeScript selectors
 * for accessing and deriving UI state within TaskStream AI. The selectors
 * defined here align with the design system specifications, user interface
 * guidelines, and cross-cutting concerns such as:
 * 1) Theme selection (light, dark, system) with system preference fallback.
 * 2) Sidebar visibility management with responsive breakpoint awareness.
 * 3) Loading states at both global and component-specific levels.
 * 4) Notification lifecycle management, including filtering out expired
 *    notifications and sorting by severity and timestamp.
 * 5) Derivation of the current UI breakpoint and its extended properties,
 *    enabling dynamic layout changes for mobile, tablet, desktop, or wide
 *    screen sizes.
 *
 * All selectors here implement TypeScript type safety, performance
 * optimizations with createSelector from @reduxjs/toolkit (^1.9.0),
 * and robust memoization to minimize re-renders.
 */

///////////////////////////////////////////////
// External Imports (With Version Comments)  //
///////////////////////////////////////////////
import { createSelector } from '@reduxjs/toolkit'; // ^1.9.0

///////////////////////////////////////////////
// Internal Imports                          //
///////////////////////////////////////////////
import { RootState } from '../rootReducer';
import {
  UIState,
  Notification,
  LoadingState,
  ThemeMode,
} from './ui.types';

/**
 * BreakpointType
 * ------------------------------------------------------------------------
 * Represents a list of recognized breakpoint keys. This aligns with the
 * JSON specification indicating that currentBreakpoint is typed as a
 * BreakpointType in the UIState. Adjust this union if the design system
 * or MUI config changes the recognized breakpoints.
 */
export type BreakpointType = 'mobile' | 'tablet' | 'desktop' | 'wide' | '';

/**
 * BreakpointData
 * ------------------------------------------------------------------------
 * Used by selectCurrentBreakpoint to provide derived properties about the
 * current breakpoint. Each boolean indicates if the UI is in that category,
 * and name mirrors the raw string from UIState.currentBreakpoint.
 */
export interface BreakpointData {
  /**
   * Matches the exact breakpoint name observed in the state (e.g. 'mobile').
   */
  name: BreakpointType;

  /**
   * True if the current breakpoint is 'mobile'.
   */
  isMobile: boolean;

  /**
   * True if the current breakpoint is 'tablet'.
   */
  isTablet: boolean;

  /**
   * True if the current breakpoint is 'desktop'.
   */
  isDesktop: boolean;

  /**
   * True if the current breakpoint is 'wide'.
   */
  isWide: boolean;
}

/**
 * selectUI
 * ------------------------------------------------------------------------
 * Base selector to retrieve the entire UIState object from the RootState.
 * This is a foundational selector used by more targeted memoized selectors.
 *
 * Steps (per JSON spec):
 *  - Verify state exists
 *  - Return ui slice from root state with type assertion
 *  - Handle potential undefined state (in typical usage, RootState.ui is defined)
 */
export const selectUI = (state: RootState): UIState => {
  // In a well-structured Redux setup, state.ui should never be undefined,
  // but we guard to ensure robust error handling.
  if (!state || !state.ui) {
    throw new Error('[selectUI] UI state is not available in RootState.');
  }
  return state.ui;
};

/**
 * getSystemPreferredThemeMode
 * ------------------------------------------------------------------------
 * Helper function used by selectThemeMode to detect system preference.
 * Returns 'DARK' if the user has a dark color scheme preference,
 * otherwise returns 'LIGHT'. This is invoked if themeMode == SYSTEM.
 */
function getSystemPreferredThemeMode(): ThemeMode {
  if (typeof window !== 'undefined' && window.matchMedia) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    return prefersDark.matches ? ThemeMode.DARK : ThemeMode.LIGHT;
  }
  // Fallback if window or matchMedia is undefined. Defaulting to LIGHT if unknown.
  return ThemeMode.LIGHT;
}

/**
 * selectThemeMode
 * ------------------------------------------------------------------------
 * Memoized selector that derives the effective theme mode (LIGHT, DARK)
 * from the store. If the user explicitly sets the mode to SYSTEM, we
 * fallback to system preference detection (prefers-color-scheme).
 *
 * Steps (per JSON spec):
 *  - Use createSelector for memoization
 *  - Extract themeMode from UI state
 *  - Handle system preference if mode is SYSTEM
 *  - Return computed theme mode
 */
export const selectThemeMode = createSelector(
  [selectUI],
  (ui: UIState): ThemeMode => {
    if (ui.themeMode === ThemeMode.SYSTEM) {
      return getSystemPreferredThemeMode();
    }
    return ui.themeMode;
  },
);

/**
 * selectIsSidebarOpen
 * ------------------------------------------------------------------------
 * Memoized selector for determining whether the sidebar is open or closed.
 * Example logic with breakpoint awareness: If we are on a small/mobile
 * breakpoint, the UI might override the open state for responsive design.
 *
 * Steps (per JSON spec):
 *  - Use createSelector for memoization
 *  - Extract isSidebarOpen and currentBreakpoint
 *  - Apply breakpoint-specific logic
 *  - Return computed visibility state
 */
export const selectIsSidebarOpen = createSelector(
  [selectUI],
  (ui: UIState): boolean => {
    const { isSidebarOpen, currentBreakpoint } = ui;

    // Example advanced logic: forcibly close sidebar if in mobile mode
    // to reduce clutter. This is arbitrary for demonstration; real logic
    // might differ based on design specs.
    if (currentBreakpoint === 'mobile') {
      return false;
    }

    // Otherwise return isSidebarOpen as stored
    return isSidebarOpen;
  },
);

/**
 * isNotificationExpired
 * ------------------------------------------------------------------------
 * Helper function to determine if a given notification should be considered
 * expired. We assume that if the current time surpasses notification.timestamp
 * by more than notification.autoHideDuration, the notification is expired.
 */
function isNotificationExpired(n: Notification): boolean {
  const now = Date.now();
  const elapsed = now - n.timestamp;
  return elapsed > n.autoHideDuration;
}

/**
 * severityOrder
 * ------------------------------------------------------------------------
 * Helper function to rank severity in descending order: HIGH > MEDIUM > LOW.
 * If two severities match, we compare by timestamp ascending (older first).
 */
function severitySorter(a: Notification, b: Notification): number {
  const severityRank: Record<string, number> = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };
  const rankA = severityRank[a.severity] || 0;
  const rankB = severityRank[b.severity] || 0;
  // Sort descending by severity rank
  if (rankA > rankB) return -1;
  if (rankA < rankB) return 1;

  // If severity is identical, sort ascending by timestamp
  return a.timestamp - b.timestamp;
}

/**
 * selectNotifications
 * ------------------------------------------------------------------------
 * Memoized selector that filters out expired notifications, then sorts
 * the remaining by severity and timestamp.
 *
 * Steps (per JSON spec):
 *  - Use createSelector for memoization
 *  - Extract notifications array
 *  - Filter out expired notifications
 *  - Sort by timestamp and severity
 *  - Return processed notifications array
 */
export const selectNotifications = createSelector(
  [selectUI],
  (ui: UIState): Notification[] => {
    const active = ui.notifications.filter((n) => !isNotificationExpired(n));
    return [...active].sort(severitySorter);
  },
);

/**
 * selectLoadingState
 * ------------------------------------------------------------------------
 * Factory function that returns a memoized selector to retrieve a
 * component-specific loading state from the store. If no loading
 * status is found for the given key, 'idle' is returned.
 *
 * Steps (per JSON spec):
 *  - Create selector factory function
 *  - Use createSelector with componentKey
 *  - Extract loading state from loadingStates by key
 *  - Handle undefined loading state
 *  - Return type-safe loading state
 */
export const selectLoadingState = (componentKey: string) =>
  createSelector([selectUI], (ui: UIState): LoadingState => {
    const found = ui.loadingStates[componentKey];
    if (!found) {
      return 'idle';
    }
    return found;
  });

/**
 * selectCurrentBreakpoint
 * ------------------------------------------------------------------------
 * Memoized selector that retrieves the current breakpoint string from
 * the UI state and transforms it into an object with extended derived
 * properties (isMobile, isTablet, etc.). This helps simplify UI components
 * that need to react to different breakpoints.
 *
 * Steps (per JSON spec):
 *  - Use createSelector for memoization
 *  - Extract currentBreakpoint
 *  - Compute derived layout properties
 *  - Return enhanced breakpoint data
 */
export const selectCurrentBreakpoint = createSelector(
  [selectUI],
  (ui: UIState): BreakpointData => {
    const bpName = ui.currentBreakpoint as BreakpointType;

    return {
      name: bpName,
      isMobile: bpName === 'mobile',
      isTablet: bpName === 'tablet',
      isDesktop: bpName === 'desktop',
      isWide: bpName === 'wide',
    };
  },
);