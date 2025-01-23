/************************************************************
 * File: Tabs.tsx
 * Location: src/web/src/components/common
 * Project: TaskStream AI
 * Description:
 *   A reusable tabbed interface component that provides a
 *   design-system-compliant way to organize and display
 *   content in separate views. Includes full accessibility
 *   support (ARIA roles, keyboard navigation, focus management),
 *   responsive behavior at defined breakpoints, and optional
 *   loading states. Implements the TabItem and TabsProps
 *   interfaces, supporting variant, size, and orientation
 *   configurations with smooth transitions.
 ************************************************************/

/* React v^18.0.0 for core component structure and hooks */
import React from 'react';

/* classnames v^2.3.2 for conditional and responsive styling */
import classNames from 'classnames';

/* LoadingState type from the internal project types */
import { LoadingState } from '../../types/common.types';

/************************************************************
 * Interface: TabItem
 * ----------------------------------------------------------
 * Defines the structure and properties of individual tab items,
 * including optional icon and tooltip support for accessible
 * UI and functionality. This interface ensures all tabs
 * maintain consistent shape and usage across the application.
 ************************************************************/
export interface TabItem {
  /**
   * A unique identifier for the tab. Used to track
   * the active tab in controlled/uncontrolled modes.
   */
  id: string;

  /**
   * A short, human-readable label used for display
   * within the tab button or title element.
   */
  label: string;

  /**
   * The content to be displayed when this tab
   * is active. This can be text, components,
   * or any valid React node.
   */
  content: React.ReactNode;

  /**
   * If true, the tab is disabled and cannot
   * be selected. Visually indicated by reduced
   * interaction states and ARIA attributes.
   */
  disabled?: boolean;

  /**
   * Optional icon to be displayed alongside
   * the label, for visual cues or branding.
   */
  icon?: React.ReactNode;

  /**
   * Optional tooltip text to provide additional
   * information on hover or focus, improving
   * UI accessibility and clarity.
   */
  tooltip?: string;
}

/************************************************************
 * Interface: TabsProps
 * ----------------------------------------------------------
 * Defines the configuration and behavior properties for
 * the Tabs component. Provides topic-specific control over
 * orientation, size, variant styling, and loading modes.
 ************************************************************/
export interface TabsProps {
  /**
   * An array of TabItem objects, each representing
   * a single tab within the interface. The component
   * will render one tab button per TabItem.
   */
  tabs: TabItem[];

  /**
   * The identifier of the currently active tab.
   * When provided, the Tabs component behaves in
   * a controlled manner, relying on this prop for
   * state. If omitted, Tabs manages its active tab
   * internally.
   */
  activeTab?: string;

  /**
   * A callback triggered whenever a new tab is
   * selected. Receives the id of the selected tab
   * as an argument, enabling parent components
   * to synchronize state or perform side effects.
   */
  onChange?: (tabId: string) => void;

  /**
   * Optional custom class name to apply to the
   * root element of the Tabs component, enabling
   * advanced styling or integration with existing
   * layout classes.
   */
  className?: string;

  /**
   * Displays a loading state. If true, the component
   * will show a blocking loader rather than the tab
   * list. This can be useful when data is being
   * fetched or processed. Internally mapped to a
   * LoadingState for stricter type checking.
   */
  loading?: boolean;

  /**
   * Determines the display orientation of the tabs:
   * "horizontal" or "vertical". This impacts visual
   * layout and keyboard navigation patterns.
   */
  orientation?: 'horizontal' | 'vertical';

  /**
   * Dictates the overall sizing of the tab buttons:
   * "small", "medium", or "large". Adjusts padding,
   * typography, and spacing in accordance with the
   * design system tokens.
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * Selects the visual variant style for the tabs:
   * "default", "contained", or "minimal". Each variant
   * applies unique background, border, and hover
   * states aligned with the design system.
   */
  variant?: 'default' | 'contained' | 'minimal';
}

/************************************************************
 * Function: getTabClassName
 * ----------------------------------------------------------
 * Generates class names for individual tab items based
 * on their state and design system tokens. Merges
 * multiple states (active, disabled, variant-based,
 * size-based) into a single string of classes for
 * improved maintainability and clarity.
 *
 * Steps to build the class name:
 * 1. Combine base tab classes with design system tokens.
 * 2. Apply variant-specific classes based on the variant prop.
 * 3. Add size-specific classes based on the size prop.
 * 4. Include active state classes with smooth transitions.
 * 5. Apply disabled state styling with reduced interactivity.
 * 6. Merge any custom classes passed via className prop.
 ************************************************************/
export function getTabClassName(
  isActive: boolean,
  isDisabled: boolean,
  className: string,
  variant: 'default' | 'contained' | 'minimal',
  size: 'small' | 'medium' | 'large'
): string {
  return classNames(
    // Base tab class:
    'ts-tab',

    // Variant-based classes mapping:
    {
      'ts-tab--default': variant === 'default',
      'ts-tab--contained': variant === 'contained',
      'ts-tab--minimal': variant === 'minimal',
    },

    // Size-based classes mapping:
    {
      'ts-tab--small': size === 'small',
      'ts-tab--medium': size === 'medium',
      'ts-tab--large': size === 'large',
    },

    // Active or Disabled state classes:
    {
      'is-active': isActive,
      'is-disabled': isDisabled,
    },

    // Custom class from props:
    className
  );
}

/************************************************************
 * Utility: mapBooleanToLoadingState
 * ----------------------------------------------------------
 * Converts a boolean loading prop into a strongly-typed
 * LoadingState. Serves as a small bridge between boolean
 * usage in the TabsProps and the union type from the
 * project-level definitions.
 ************************************************************/
function mapBooleanToLoadingState(loading?: boolean): LoadingState {
  if (loading) {
    return 'loading';
  }
  return 'idle';
}

/************************************************************
 * Component: Tabs
 * ----------------------------------------------------------
 * A reusable, accessible, and design-system-compliant tab
 * interface. Supports keyboard navigation (arrow keys,
 * home/end, enter/space), ARIA attributes, optional
 * vertical orientation, and multiple sizing/variant
 * configurations for consistent UI design.
 *
 * Features:
 * - Handles controlled or uncontrolled active tab.
 * - Provides accessible roles for tablist, tab, and tabpanel.
 * - Supports disabled tabs (ARIA-disabled, no focus).
 * - Offers optional loading state with an integrated spinner.
 * - Applies size, variant, and orientation classes for
 *   consistent design system usage.
 * - Includes responsive styling at breakpoints (mobile,
 *   tablet, desktop, wide) for layout adjustments.
 ************************************************************/
export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
  loading = false,
  orientation = 'horizontal',
  size = 'medium',
  variant = 'default',
}) => {
  /**********************************************************
   * Track or Derive the Active Tab
   * --------------------------------------------------------
   * If activeTab prop is provided, this component operates
   * in "controlled" mode, tracking state externally. If not,
   * it manages its own active tab status via internal state.
   **********************************************************/
  const [internalTab, setInternalTab] = React.useState<string>(
    tabs.length > 0 ? tabs[0].id : ''
  );

  React.useEffect(() => {
    // If a parent component is controlling activeTab,
    // synchronize our internal state when it changes.
    if (activeTab !== undefined) {
      setInternalTab(activeTab);
    }
  }, [activeTab]);

  /**********************************************************
   * Derive Loading State
   * --------------------------------------------------------
   * Convert the boolean loading prop into a strongly typed
   * LoadingState for more robust usage if extended. This is
   * useful for consistent checks (e.g., 'loading', 'idle').
   **********************************************************/
  const derivedLoadingState = React.useMemo(
    () => mapBooleanToLoadingState(loading),
    [loading]
  );

  /**********************************************************
   * Tab Selection Handler
   * --------------------------------------------------------
   * When a user clicks or triggers selection via keyboard,
   * we update either our internal state or defer to the
   * parent's onChange callback if in controlled mode.
   **********************************************************/
  const handleTabChange = React.useCallback(
    (tabId: string) => {
      if (onChange) {
        // Controlled scenario: pass changes upstream
        onChange(tabId);
      } else {
        // Uncontrolled scenario: manage local state
        setInternalTab(tabId);
      }
    },
    [onChange]
  );

  /**********************************************************
   * Keyboard Navigation Handler
   * --------------------------------------------------------
   * Provides arrow key navigation and focus management. For
   * horizontal tabs, left/right arrows move focus. For
   * vertical tabs, up/down arrows apply. Home and End keys
   * jump to the first/last tab.
   **********************************************************/
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const { key } = event;
      const currentIndex = tabs.findIndex((t) => t.id === internalTab);

      // Early return if no tabs available or invalid index
      if (currentIndex === -1 || tabs.length === 0) return;

      let newIndex = currentIndex;

      // Orientation-based arrow keys
      const isHorizontal = orientation === 'horizontal';
      const isVertical = orientation === 'vertical';

      if (isHorizontal && key === 'ArrowRight') {
        newIndex = (currentIndex + 1) % tabs.length;
      } else if (isHorizontal && key === 'ArrowLeft') {
        newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (isVertical && key === 'ArrowDown') {
        newIndex = (currentIndex + 1) % tabs.length;
      } else if (isVertical && key === 'ArrowUp') {
        newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      } else if (key === 'Home') {
        newIndex = 0;
      } else if (key === 'End') {
        newIndex = tabs.length - 1;
      } else if (key === 'Enter' || key === ' ') {
        // Enter or Space toggles selection if there's a focused tab
        const focusedTab = tabs[currentIndex];
        if (focusedTab && !focusedTab.disabled) {
          handleTabChange(focusedTab.id);
        }
        return;
      }

      event.preventDefault();
      // Skip disabled tabs in the new index range
      let attemptCount = 0;
      while (tabs[newIndex].disabled && attemptCount < tabs.length) {
        newIndex = (newIndex + 1) % tabs.length;
        attemptCount++;
      }

      // If the newIndex remains valid, set the focus to newIndex
      if (onChange) {
        // Controlled: just move focus visually
        setInternalTab(tabs[newIndex].id);
      } else {
        // Uncontrolled: update active tab internally
        setInternalTab(tabs[newIndex].id);
      }
    },
    [orientation, tabs, internalTab, onChange, setInternalTab]
  );

  /**********************************************************
   * Loading State Rendering
   * --------------------------------------------------------
   * When derivedLoadingState is 'loading', we block out
   * the entire tab interface to display a spinner or
   * loading placeholder. Once the data is ready, normal
   * tab rendering resumes.
   **********************************************************/
  if (derivedLoadingState === 'loading') {
    return (
      <div className={classNames('ts-tabs__loading-container', className)}>
        {/* A simple design-system-compatible loading placeholder */}
        <div className="ts-tabs__spinner" aria-busy="true" aria-live="polite">
          Loading...
        </div>
      </div>
    );
  }

  /**********************************************************
   * Find the currently active tab object
   * --------------------------------------------------------
   * We only display the content for the active tab in the
   * dedicated tabpanel region for accessibility compliance.
   **********************************************************/
  const activeId = activeTab !== undefined ? activeTab : internalTab;
  const activeTabItem = tabs.find((t) => t.id === activeId);

  /**********************************************************
   * Root Container Classes
   * --------------------------------------------------------
   * Applies orientation classes (horizontal/vertical), plus
   * any additional custom class passed for layout styling.
   **********************************************************/
  const tabsContainerClass = classNames('ts-tabs', className, {
    'ts-tabs--horizontal': orientation === 'horizontal',
    'ts-tabs--vertical': orientation === 'vertical',
  });

  return (
    <div
      className={tabsContainerClass}
      role="tablist"
      aria-orientation={orientation}
      onKeyDown={handleKeyDown}
    >
      {/* Render each tab as a button or similar interactive control. */}
      <div className="ts-tabs__header">
        {tabs.map((tab) => {
          const isTabActive = tab.id === activeId;
          const tabClass = getTabClassName(
            isTabActive,
            !!tab.disabled,
            '',
            variant,
            size
          );

          // ARIA attributes: role="tab", aria-selected, aria-disabled, id
          // We'll also conditionally disable the underlying button for
          // proper focus management if the tab is disabled.
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              className={tabClass}
              aria-selected={isTabActive}
              aria-disabled={tab.disabled || false}
              tabIndex={isTabActive ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => {
                if (!tab.disabled) {
                  handleTabChange(tab.id);
                }
              }}
              title={tab.tooltip || ''}
            >
              {/* If an icon is provided, render it before the label */}
              {tab.icon && <span className="ts-tab__icon">{tab.icon}</span>}
              <span className="ts-tab__label">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Accessible tabpanel area displaying the active tab's content */}
      <div
        className="ts-tabs__tabpanel"
        role="tabpanel"
        aria-labelledby={activeId ? `tab-${activeId}` : undefined}
      >
        {activeTabItem?.content}
      </div>
    </div>
  );
};