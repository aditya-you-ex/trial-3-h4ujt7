import React from 'react'; // react@^18.0.0
import classNames from 'classnames'; // classnames@^2.3.2

// Importing named CSS classes for badge styling, variants, and sizes.
import { badge, badgeVariants, badgeSizes } from '../../styles/components.css';

/**
 * Enhanced props interface for the Badge component, incorporating
 * accessibility attributes, optional click handling, and keyboard support.
 */
export interface BadgeProps {
  /**
   * Content to be displayed inside the badge component.
   * This can be text, icons, or any valid React node.
   */
  children: React.ReactNode;

  /**
   * Visual style variant of the badge, applying WCAG-compliant colors.
   * Possible values: 'default', 'success', 'warning', 'error', 'info'.
   * Defaults to 'default' for a neutral appearance.
   */
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';

  /**
   * Size variant of the badge component, offering different padding
   * and font sizes. Possible values: 'small', 'medium', 'large'.
   * Defaults to 'medium'.
   */
  size?: 'small' | 'medium' | 'large';

  /**
   * An optional set of additional CSS class names to be applied,
   * enabling custom styling or overrides in specific contexts.
   */
  className?: string;

  /**
   * An optional accessible label for screen readers, enhancing clarity
   * for users relying on non-visual navigation.
   */
  ariaLabel?: string;

  /**
   * ARIA role indicating the semantic nature of this badge. Commonly
   * used roles here are 'status', 'alert', or 'badge'. Defaults to 'badge'.
   */
  role?: 'status' | 'alert' | 'badge';

  /**
   * An optional click handler allowing the badge to function as an
   * interactive element (e.g., filter chips or status toggles).
   */
  onClick?: (event: React.MouseEvent<HTMLSpanElement>) => void;

  /**
   * An optional tabIndex value to enable keyboard navigation when the badge
   * is interactive. Recommended if onClick is provided.
   */
  tabIndex?: number;
}

/**
 * A versatile, accessible badge component used to display small status indicators,
 * labels, or contextual information. Follows WCAG 2.1 AA color contrast
 * guidelines and supports keyboard focus for interactive scenarios.
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'medium',
  className,
  ariaLabel,
  role = 'badge',
  onClick,
  tabIndex,
}) => {
  /**
   * Combine all relevant CSS classes:
   * - The base badge class for fundamental styling and layout.
   * - A variant class for color-coding and state-based appearance.
   * - A size class for adjusting font size, padding, and spacing.
   * - Any optional custom className passed by the consumer.
   *
   * classNames(...) auto-merges them into a single string, ensuring that
   * conditionally undefined classes are safely handled.
   */
  const combinedClassNames = classNames(
    badge,
    badgeVariants && badgeVariants[variant],
    badgeSizes && badgeSizes[size],
    className
  );

  /**
   * Return an accessible <span> element that can optionally become interactive.
   * When onClick is provided, we assume that the badge may be used like a button,
   * so we also allow tabIndex to enable keyboard users to navigate here.
   * The aria-label provides additional context if content is non-textual.
   */
  return (
    <span
      className={combinedClassNames}
      role={role}
      aria-label={ariaLabel}
      onClick={onClick}
      tabIndex={tabIndex}
    >
      {children}
    </span>
  );
};