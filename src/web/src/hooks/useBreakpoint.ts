/**
 * A custom React hook that provides responsive breakpoint detection and management
 * using the application's theme breakpoint system. It enables components to adapt
 * their behavior and layout based on the current viewport size, with optimized
 * performance through debounced resize handling.
 *
 * This file implements all requirements specified in the technical and JSON specs:
 * - Retrieves breakpoint constants (mobile, tablet, desktop, wide) from the theme.
 * - Defines a debounced resize handler with a 250ms delay.
 * - Exposes the current breakpoint and boolean flags indicating each breakpoint state.
 * - Includes comprehensive comments for production readiness and clarity.
 */

// ------------------------------------
// External Imports (React v18.0+)
// ------------------------------------
import { useState, useEffect } from 'react'; // react@18.0+

// ------------------------------------
// Internal Imports
// ------------------------------------
import { BREAKPOINTS } from '../constants/theme.constants'; // Breakpoint constants

/**
 * A global constant defining the debounce delay (in milliseconds) for resize events.
 * This ensures the resize handler does not trigger excessive renders.
 */
const RESIZE_DEBOUNCE_MS = 250;

/**
 * getBreakpoint
 * -------------
 * A standalone helper function that determines the current breakpoint label
 * based on a given numerical width value. It leverages the theme breakpoint
 * constants to correctly categorize the viewport size.
 *
 * @param width - The current width of the window or viewport (in px).
 * @returns A string representing the current breakpoint category:
 *          'mobile', 'tablet', 'desktop', or 'wide'.
 *
 * Steps:
 *  1. If the width is greater than or equal to BREAKPOINTS.values.wide,
 *     the breakpoint is 'wide'.
 *  2. Else if width >= BREAKPOINTS.values.desktop, the breakpoint is 'desktop'.
 *  3. Else if width >= BREAKPOINTS.values.tablet, the breakpoint is 'tablet'.
 *  4. If none of the above, return 'mobile'.
 *  5. This handles exact boundary values by using >= comparisons.
 */
export function getBreakpoint(width: number): 'mobile' | 'tablet' | 'desktop' | 'wide' {
  const { mobile, tablet, desktop, wide } = BREAKPOINTS.values;
  if (width >= wide) {
    return 'wide';
  } else if (width >= desktop) {
    return 'desktop';
  } else if (width >= tablet) {
    return 'tablet';
  }
  return 'mobile';
}

/**
 * useBreakpoint
 * -------------
 * A custom React hook for responsive breakpoint detection. It returns
 * the current breakpoint label and boolean flags corresponding to each
 * breakpoint state. This hook optimizes performance by debouncing resize
 * events to limit updates to every 250ms. It is also designed to handle
 * server-side rendering (SSR) scenarios gracefully by providing safe defaults.
 *
 * @returns An object containing:
 *  - breakpoint (string): The current breakpoint label.
 *  - isMobile (boolean): True if the current breakpoint is 'mobile'.
 *  - isTablet (boolean): True if the current breakpoint is 'tablet'.
 *  - isDesktop (boolean): True if the current breakpoint is 'desktop'.
 *  - isWide (boolean): True if the current breakpoint is 'wide'.
 *
 * Steps:
 *  1. Determine if window is available (SSR check); set initial width accordingly.
 *  2. Maintain an internal state for the viewport width and derived breakpoint.
 *  3. Implement a debounced resize event handler with 250ms delay.
 *  4. Update the breakpoint whenever the internal width state changes.
 *  5. Derive boolean flags indicating each breakpoint based on the current label.
 *  6. Return the label and flags to be consumed by components.
 */
export default function useBreakpoint() {
  // SSR-safe check: in non-browser environments, window is undefined.
  const isClient = typeof window !== 'undefined';

  // Initialize the width state. On servers (SSR), default to 0
  // to treat the initial breakpoint as 'mobile' until hydration.
  const [width, setWidth] = useState<number>(isClient ? window.innerWidth : 0);

  // Derive the initial breakpoint from the initial width.
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop' | 'wide'>(
    () => getBreakpoint(width),
  );

  useEffect(() => {
    if (!isClient) return;

    let resizeTimer: ReturnType<typeof setTimeout> | null = null;

    /**
     * handleResize
     * ------------
     * A function that waits 250ms (RESIZE_DEBOUNCE_MS) after the last resize event
     * before updating the width state, thereby minimizing excessive renders.
     */
    function handleResize() {
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      resizeTimer = setTimeout(() => {
        setWidth(window.innerWidth);
      }, RESIZE_DEBOUNCE_MS);
    }

    // Attach the debounced resize event listener on mount.
    window.addEventListener('resize', handleResize);

    // Cleanup the event listener and any pending timeout on unmount.
    return () => {
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [isClient]);

  // Whenever the width changes, determine the updated breakpoint.
  useEffect(() => {
    setBreakpoint(getBreakpoint(width));
  }, [width]);

  // Compute boolean flags based on the current breakpoint.
  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';
  const isDesktop = breakpoint === 'desktop';
  const isWide = breakpoint === 'wide';

  // Return the current breakpoint state and the convenience flags.
  return {
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    isWide,
  };
}