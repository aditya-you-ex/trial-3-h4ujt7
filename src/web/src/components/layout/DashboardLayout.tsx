import React, {
  FC,
  useEffect,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from 'react';
// react@^18.0.0

// -------------------------------------------------------------------------
// External Imports
// -------------------------------------------------------------------------
import styled from 'styled-components'; // styled-components@^5.3.0

// -------------------------------------------------------------------------
// Internal Imports (IE1 compliance)
// -------------------------------------------------------------------------
import { Sidebar } from '../common/Sidebar';
import type { SidebarProps } from '../common/Sidebar';
import { TopBar } from '../common/TopBar';
import type { TopBarProps } from '../common/TopBar';
import useBreakpoint from '../../hooks/useBreakpoint'; // { isMobile, isTablet }

// -------------------------------------------------------------------------
// DashBoardLayoutProps Interface
// -------------------------------------------------------------------------
/**
 * DashboardLayoutProps
 * ---------------------------------------------------------------------------
 * Defines the props for the DashboardLayout component, which provides the main
 * dashboard structure with responsive sidebar navigation, top bar, and a
 * dedicated content area. Adheres to the following references:
 *   - Technical Specifications 6.2 (Main Dashboard)
 *   - Technical Specifications 6.6 (Responsive Design Breakpoints)
 *   - Technical Specifications 3.1.1 (Design System Specifications)
 */
export interface DashboardLayoutProps {
  /**
   * React children to be rendered in the main content area of the dashboard.
   */
  children: React.ReactNode;
  /**
   * An optional class name for layout overrides or additional styling.
   */
  className?: string;
  /**
   * An optional boolean to define the initial Sidebar collapse state. If true,
   * the sidebar is collapsed upon initial render. The final state may still
   * adjust based on user interactions or localStorage overrides.
   */
  initialSidebarState?: boolean;
  /**
   * An optional ARIA label for enhanced screen reader accessibility on the
   * outer container. Useful when multiple main regions or layouts may co-exist
   * and require distinct labeling.
   */
  'aria-label'?: string;
}

// -------------------------------------------------------------------------
// Styled Components for Layout (IE3 compliance for exports if needed)
// -------------------------------------------------------------------------

/**
 * LayoutContainer
 * ----------------------------------------------------------------------------
 * The overarching container that wraps the entire dashboard layout, including
 * sidebar, top bar, and main content area. Implements enterprise-level styling
 * for printing and background color usage from the theme.
 */
export const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: ${(props) => props.theme?.palette?.background?.default ?? '#FFF'};
  position: relative;
  isolation: isolate;

  @media print {
    background-color: white;
  }
`;

/**
 * MainContent
 * ----------------------------------------------------------------------------
 * The central content region adjacent to the sidebar. Margin-left transitions
 * accommodate a collapsing/non-collapsing sidebar. Implements breakpoints to
 * reset margin on small devices and gracefully degrade animations for reduced
 * motion users.
 */
export const MainContent = styled.main<{
  sidebarCollapsed: boolean;
}>`
  flex: 1;
  margin-left: ${(props) => (props.sidebarCollapsed ? '64px' : '240px')};
  padding: ${(props) => (props.theme?.spacing ? props.theme.spacing(3) : '24px')};
  transition: margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  min-width: 0;

  @media (max-width: ${(props) =>
      props.theme?.breakpoints?.mobile
        ? `${props.theme.breakpoints.mobile}px`
        : '768px'}) {
    margin-left: 0;
    padding: ${(props) => (props.theme?.spacing ? props.theme.spacing(2) : '16px')};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/**
 * MobileOverlay
 * ----------------------------------------------------------------------------
 * A translucent overlay used to dim or block interactions with the main
 * content area when the sidebar is open on mobile devices. Ensures touch
 * interactions are disabled behind the overlay and announces to screen readers
 * that the main area is covered.
 */
export const MobileOverlay = styled.div<{
  visible: boolean;
}>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: ${(props) => props.theme?.zIndex?.drawer
    ? props.theme.zIndex.drawer - 1
    : 999};
  display: ${(props) => (props.visible ? 'block' : 'none')};
  backdrop-filter: blur(4px);
  transition: opacity 0.3s ease;
  touch-action: none;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

// -------------------------------------------------------------------------
// Functions Required by JSON Specs
// -------------------------------------------------------------------------

/**
 * handleSidebarCollapse
 * ----------------------------------------------------------------------------
 * Manages the sidebar collapse state by:
 *   1) Updating the React state tracking collapse
 *   2) Persisting the collapse state to localStorage
 *   3) Adjusting layout arrangement (the margin or content shift) bound
 *      to that state
 *   4) Optionally announcing or logging a screen reader-friendly message
 *   5) Triggering any reflow or layout recalc needed
 *
 * @param collapsed A boolean indicating the desired collapse state.
 * @param setCollapsedState The React state setter for sidebar collapsed state.
 * @param announceRef An optional reference for screen reader announcements.
 */
function handleSidebarCollapse(
  collapsed: boolean,
  setCollapsedState: React.Dispatch<React.SetStateAction<boolean>>,
  announceRef?: React.RefObject<HTMLDivElement>,
): void {
  // 1) Update local React state
  setCollapsedState(collapsed);

  // 2) Persist to localStorage for next session (key name is arbitrary)
  localStorage.setItem('dashboard_sidebar_collapsed', JSON.stringify(collapsed));

  // 3) The <MainContent> handles margin shift via the 'sidebarCollapsed' prop.

  // 4) Announce the change for accessibility if we have an aria-live region
  if (announceRef?.current) {
    announceRef.current.textContent = collapsed
      ? 'Sidebar collapsed.'
      : 'Sidebar expanded.';
  }

  // 5) Forcing a reflow or layout calculation is rarely needed in React, but
  //    we might do so explicitly with requestAnimationFrame if desired.
  //    E.g., window.requestAnimationFrame(() => { ... });
}

/**
 * handleMobileMenuClick
 * ----------------------------------------------------------------------------
 * Toggles the visibility of the sidebar on mobile devices, managing an overlay,
 * body scroll locking, and optional touch event listeners. Also announces
 * changes for screen readers if an aria-live region is provided.
 *
 * @param mobileSidebarOpen The current state of the mobile sidebar (boolean)
 * @param setMobileSidebar The setter to flip its visibility
 * @param announceRef An optional reference for screen reader announcements
 */
function handleMobileMenuClick(
  mobileSidebarOpen: boolean,
  setMobileSidebar: React.Dispatch<React.SetStateAction<boolean>>,
  announceRef?: React.RefObject<HTMLDivElement>,
) {
  const newState = !mobileSidebarOpen;
  setMobileSidebar(newState);

  // Manage body scroll locking for mobile experience
  if (newState) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = 'auto';
  }

  // Optional: Announce via an aria-live region
  if (announceRef?.current) {
    announceRef.current.textContent = newState
      ? 'Sidebar menu opened on mobile.'
      : 'Sidebar menu closed on mobile.';
  }

  // Additional steps:
  // - We might register or deregister touch events
  // - Update any analytics or logs for mobile menu usage
}

// -------------------------------------------------------------------------
// Main DashboardLayout Component
// -------------------------------------------------------------------------

/**
 * DashboardLayout
 * ----------------------------------------------------------------------------
 * The primary layout component for the TaskStream AI dashboard. It incorporates:
 *  - A TopBar for site-wide headers or user actions
 *  - A Sidebar for main navigation (collapsible, mobile-friendly)
 *  - A MobileOverlay for small screens
 *  - A MainContent area, rendering child pages or views
 *
 * Implements:
 *  - handleSidebarCollapse: Persisting + updating collapsed state
 *  - handleMobileMenuClick: Toggling overlay and body scroll on mobile
 *  - Bowing to design guidelines from sections 6.2, 6.6, and 3.1.1
 */
export const DashboardLayout: FC<DashboardLayoutProps> = ({
  children,
  className,
  initialSidebarState = false,
  'aria-label': ariaLabel,
}) => {
  /**
   * Managing local states for:
   *  - collapsed: tracks whether the sidebar is collapsed (desktop or tablet usage)
   *  - mobileSidebarOpen: indicates if the sidebar is actively open on mobile
   */
  const [collapsed, setCollapsed] = useState<boolean>(initialSidebarState);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  /**
   * Breakpoint booleans from the custom hook to detect if we are on mobile or tablet.
   */
  const { isMobile, isTablet } = useBreakpoint();

  /**
   * A ref for optionally announcing changes to screen readers using aria-live.
   */
  const ariaAnnouncementRef = useRef<HTMLDivElement>(null);

  /**
   * On mount, try to load any persisted user preference for the sidebar collapsed state.
   */
  useEffect(() => {
    const stored = localStorage.getItem('dashboard_sidebar_collapsed');
    if (stored !== null) {
      try {
        const val = JSON.parse(stored);
        if (typeof val === 'boolean') {
          setCollapsed(val);
        }
      } catch {
        // If parsing fails, default to the initialSidebarState
      }
    }
  }, []);

  /**
   * Whenever the device is strictly mobile, the sidebar is effectively hidden
   * or uses the overlay approach. If we switch from mobile to desktop, close
   * the mobile overlay but keep the collapse state for a consistent UX.
   */
  useLayoutEffect(() => {
    if (!isMobile) {
      // On transitions from mobile to anything bigger, ensure overlay is closed
      setMobileSidebarOpen(false);
      document.body.style.overflow = 'auto';
    }
  }, [isMobile]);

  // The collapse callback used by the Sidebar
  const onCollapseSidebar = useCallback(
    (nextCollapsedState: boolean) => {
      handleSidebarCollapse(nextCollapsedState, setCollapsed, ariaAnnouncementRef);
    },
    [setCollapsed]
  );

  // The menu click callback used by the TopBar on mobile
  const onMobileMenuToggle = useCallback(() => {
    handleMobileMenuClick(mobileSidebarOpen, setMobileSidebarOpen, ariaAnnouncementRef);
  }, [mobileSidebarOpen]);

  /**
   * A function that can be passed to the Sidebar for closing it specifically
   * on mobile. This is only relevant if we wanted the Sidebar to handle an
   * internal "close button" scenario. The JSON specification mentions an
   * "onMobileClose" prop, though it's unused in the existing Sidebar code.
   */
  const handleMobileClose = useCallback(() => {
    if (mobileSidebarOpen) {
      handleMobileMenuClick(mobileSidebarOpen, setMobileSidebarOpen, ariaAnnouncementRef);
    }
  }, [mobileSidebarOpen]);

  return (
    <LayoutContainer
      className={className}
      aria-label={ariaLabel || 'Dashboard Layout'}
      role="region"
    >
      {/** 
       * The TopBar: Provides a site-wide header with onMenuClick handling 
       * for mobile scenarios. We also pass isSidebarCollapsed to fulfill 
       * the JSON specification item (members_used). 
       */}
      <TopBar
        onMenuClick={onMobileMenuToggle}
        isSidebarCollapsed={collapsed}
        ariaLabel="Dashboard Top Bar"
      />

      {/**
       * Sidebar with collapse state managed here. 
       * We pass 'persistState={false}' so the layout alone manages localStorage.
       */}
      <Sidebar
        isCollapsed={collapsed}
        onCollapse={onCollapseSidebar}
        onMobileClose={handleMobileClose}
        // We do not rely on the built-in persistState from Sidebar
        persistState={false}
        ariaLabel="Main Navigation Sidebar"
      />

      {/**
       * On mobile, the overlay is displayed only if the sidebar is currently open.
       */}
      <MobileOverlay
        visible={isMobile && mobileSidebarOpen}
        aria-hidden={!mobileSidebarOpen}
        onClick={() => handleMobileClose()}
      />

      {/**
       * MainContent region: 
       * - Shifts its margin based on the 'collapsed' prop for a desktop experience.
       * - On mobile, margin-left resets to 0 automatically (per the styled component).
       */}
      <MainContent sidebarCollapsed={collapsed}>{children}</MainContent>

      {/**
       * A visually hidden region to announce accessibility changes 
       * (ARIA live region, if desired).
       */}
      <div
        ref={ariaAnnouncementRef}
        aria-live="polite"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
          clip: 'rect(1px, 1px, 1px, 1px)',
          whiteSpace: 'nowrap',
        }}
      />
    </LayoutContainer>
  );
};