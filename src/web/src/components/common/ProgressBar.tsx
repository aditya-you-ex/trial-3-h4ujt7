/**
 * TaskStream AI
 * -----------------------------------------------------------------------------
 * File: ProgressBar.tsx
 * -----------------------------------------------------------------------------
 * A reusable progress bar component that visualizes completion or loading
 * progress with fully customizable appearance, animations, and comprehensive
 * accessibility. Implements design system consistency, multiple variants, and
 * RTL support.
 *
 * References from Technical Specifications:
 * - 3.1.1 Design System Specifications (Color palette, spacing, accessibility)
 * - 3.1.2 Component Library (Progress bar core UI component)
 * - 6.1 Design System Key ([====] styled with variants, animations, RTL)
 *
 * Features:
 * 1) Configurable value & max (0-100).
 * 2) Multiple variants: default, success, warning, error, custom.
 * 3) Optional custom color if variant='custom'.
 * 4) Animations (controlled by "animated" prop & transitionDuration).
 * 5) Indeterminate loading state with animated stripes.
 * 6) Accessibility including aria-label & screen reader support.
 * 7) Optional percentage label & RTL direction handling.
 * 8) Comprehensive comments for enterprise-grade maintainability.
 *
 * Dependencies & Implementation Details:
 * - React 18+ for UI rendering.
 * - classNames ^2.3.2 for conditional class composition.
 * - LoadingState (type only) from ../types/common.types for potential progress states.
 * - useTheme from ../hooks/useTheme for theme integration & color usage.
 * - CSS Modules or inline styling approach. This file demonstrates inline style objects
 *   with optional usage of classNames for clarity, though an external .module.css file
 *   could be used in a real project.
 */

////////////////////////////////////////////////////
// External Imports (with versions)               //
////////////////////////////////////////////////////
// react version ^18.0.0
import * as React from 'react';
// classnames version ^2.3.2
import classNames from 'classnames';

////////////////////////////////////////////////////
// Internal Imports                                //
////////////////////////////////////////////////////
import { LoadingState } from '../../types/common.types'; // For potential progress states
import { useTheme } from '../../hooks/useTheme'; // Theming hook for enterprise design system

////////////////////////////////////////////////////
// Interface Definition                            //
////////////////////////////////////////////////////
/**
 * ProgressBarProps
 * -----------------------------------------------------------------------------
 * Defines all property inputs for the ProgressBar component, ensuring
 * comprehensive customization, styling, and accessibility. Mirrors the
 * JSON specification's interface breakdown, with added comments and
 * fallback defaults where needed.
 */
export interface ProgressBarProps {
  /**
   * Current progress value (0-100).
   */
  value: number;

  /**
   * Maximum progress value, defaults to 100 if not specified.
   */
  max?: number;

  /**
   * Height of the progress bar in pixels (default: 4).
   */
  height?: number;

  /**
   * Visual variant controlling color and styling.
   * - 'default': uses theme primary color
   * - 'success': uses theme success color
   * - 'warning': uses theme warning color
   * - 'error': uses theme error color
   * - 'custom': uses customColor
   */
  variant?: 'default' | 'success' | 'warning' | 'error' | 'custom';

  /**
   * Whether to animate progress transitions.
   */
  animated?: boolean;

  /**
   * Whether to display the numeric percentage label inside or near the bar.
   */
  showLabel?: boolean;

  /**
   * Optional additional CSS class names for container-level customization.
   */
  className?: string;

  /**
   * Accessible label for screen readers. If omitted, we rely on default cues.
   */
  ariaLabel?: string;

  /**
   * Custom color value (e.g. #FF00FF), used only when variant='custom'.
   */
  customColor?: string;

  /**
   * Duration (in ms) of the progress bar's transition or animation effect.
   */
  transitionDuration?: number;

  /**
   * Whether the bar shows an indeterminate loading state
   * (animated stripes or motion to indicate unknown progress).
   */
  indeterminate?: boolean;

  /**
   * Text direction for RTL layout support.
   * - 'ltr' (left-to-right, default)
   * - 'rtl' (right-to-left)
   */
  dir?: 'ltr' | 'rtl';
}

////////////////////////////////////////////////////
// Component Definition                            //
////////////////////////////////////////////////////
/**
 * ProgressBar
 * -----------------------------------------------------------------------------
 * A functional component implementing a fully detailed progress indicator, with
 * support for specialized variants, custom colors, animations, labels, indeterminate
 * states, and robust accessibility. Integrates with the application's theme system
 * through the useTheme hook for consistent styling across the platform.
 */
const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  height = 4,
  variant = 'default',
  animated = false,
  showLabel = false,
  className,
  ariaLabel,
  customColor,
  transitionDuration = 300,
  indeterminate = false,
  dir = 'ltr',
}) => {
  ////////////////////////////////////////////////////
  // Hooks and Internal State                       //
  ////////////////////////////////////////////////////
  // We retrieve the app's MUI theme object from our custom theme hook.
  // In real usage, you might further customize the color based on high contrast settings.
  const { theme } = useTheme();

  // We could optionally track a local loading state using LoadingState.
  // The snippet below shows how we might evaluate success/ongoing progress:
  // (Demonstrated for completeness; not strictly necessary to run the bar.)
  const [internalLoadingState, setInternalLoadingState] =
    React.useState<LoadingState>('idle');

  React.useEffect(() => {
    if (indeterminate) {
      setInternalLoadingState('loading');
    } else if (value >= max) {
      setInternalLoadingState('succeeded');
    } else {
      setInternalLoadingState('loading');
    }
  }, [max, value, indeterminate]);

  /**
   * Compute the numeric clamp of the progress to ensure it stays within 0-100 range,
   * even if a parent component sets a value above or below normal bounds.
   */
  const clampedValue = React.useMemo(() => {
    const v = Math.max(0, Math.min(value, max));
    return (v / max) * 100;
  }, [value, max]);

  /**
   * Determine the fill color based on variant. If variant='custom', we fall back
   * to `customColor`. Otherwise, we pull from the MUI theme palette. If not
   * provided, default to theme.palette.primary.main for 'default'.
   */
  const getProgressColor = React.useCallback((): string => {
    if (variant === 'custom' && customColor) {
      return customColor;
    }
    switch (variant) {
      case 'success':
        return theme.palette.success.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'error':
        return theme.palette.error.main;
      case 'default':
      default:
        return theme.palette.primary.main;
    }
  }, [variant, customColor, theme]);

  /**
   * Determine the direction for filling. If dir='rtl',
   * we can visually reverse the progress flow or leverage CSS transformations.
   */
  const isRTL = dir === 'rtl';

  ////////////////////////////////////////////////////
  // Inline Styles for Container & Filler           //
  ////////////////////////////////////////////////////
  // A simplified approach: define minimal inline styles object.
  // For a production system, consider using a .module.css or styled-components
  // approach with dynamic variables. The "animated" prop controls transitions.
  // "indeterminate" introduces a repeating background or transform animation.
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    height: `${height}px`,
    backgroundColor: theme.palette.grey[200],
    borderRadius: theme.shape.borderRadius,
    direction: dir,
  };

  // Basic fill style. If indeterminate, we override with an animated stripe approach.
  const fillerStyle: React.CSSProperties = {
    backgroundColor: getProgressColor(),
    height: '100%',
    transition: animated && !indeterminate
      ? `width ${transitionDuration}ms ease, background-color ${transitionDuration}ms ease`
      : 'none',
    width: indeterminate ? '100%' : `${clampedValue}%`,
    // For RTL, we can apply scaleX(-1) to mirror progress or float it to the right.
    transform: isRTL && !indeterminate ? 'scaleX(-1)' : undefined,
    transformOrigin: isRTL ? 'right center' : 'left center',
  };

  // Example of an indeterminate animation: repeated linear gradient movement.
  // For brevity, we define keyframes inline, but in real usage place them in CSS.
  const indeterminateAnimation = React.useMemo(() => {
    if (!indeterminate) return {};
    return {
      backgroundImage: `linear-gradient(to right, ${theme.palette.grey[200]} 0%, ${getProgressColor()} 50%, ${theme.palette.grey[200]} 100%)`,
      backgroundSize: '200% 100%',
      animation: `progress-stripes ${transitionDuration}ms linear infinite`,
    };
  }, [indeterminate, theme, getProgressColor, transitionDuration]);

  ////////////////////////////////////////////////////
  // Label Rendering                                //
  ////////////////////////////////////////////////////
  // If showLabel is true, we display a simple text label with the
  // computed progress (e.g. "45%"). For indeterminate, we might show "Loading..."
  const labelContent = indeterminate
    ? 'Loading...'
    : `${Math.round(clampedValue)}%`;

  const labelStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: isRTL ? 'auto' : '50%',
    right: isRTL ? '50%' : 'auto',
    transform: 'translateX(-50%)',
    color: theme.palette.common.black,
    fontSize: 12,
    fontWeight: 500,
  };

  ////////////////////////////////////////////////////
  // Final JSX Rendering                            //
  ////////////////////////////////////////////////////
  // We optionally attach ARIA attributes for accessibility,
  // including 'aria-valuemin', 'aria-valuemax', 'aria-valuenow',
  // and 'aria-label' or fallback role="progressbar".
  return (
    <div
      className={classNames('ts-progress-bar', className)}
      style={containerStyle}
      role="progressbar"
      aria-label={ariaLabel || 'progress bar'}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={indeterminate ? undefined : clampedValue}
      aria-busy={indeterminate ? 'true' : 'false'}
    >
      <div
        className="ts-progress-bar__filler"
        style={{
          ...fillerStyle,
          ...indeterminateAnimation,
        }}
      />
      {showLabel && (
        <div className="ts-progress-bar__label" style={labelStyle}>
          {labelContent}
        </div>
      )}

      {/* Example debug usage of internalLoadingState:
        <div style={{ position: 'absolute', bottom: '-1.5em', left: 0, fontSize: 10 }}>
          Internal State: {internalLoadingState}
        </div>
      */}
      {/* 
       * In a real app, the above snippet is optional. We demonstrate 
       * how we could integrate LoadingState for debug or transitions. 
       */}
      <style>
        {`
          /* Minimal inline keyframe for indeterminate stripes if used */
          @keyframes progress-stripes {
            0% {
              background-position: 0% 0%;
            }
            100% {
              background-position: 200% 0%;
            }
          }
          /* Additional sample: reduce motion if user prefers. In a real project,
             we'd detect prefers-reduced-motion in a global CSS approach. */
          @media (prefers-reduced-motion: reduce) {
            .ts-progress-bar__filler {
              transition: none !important;
              animation: none !important;
            }
          }
        `}
      </style>
    </div>
  );
};

export default ProgressBar;