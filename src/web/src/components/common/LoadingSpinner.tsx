import React, { useEffect, useState, CSSProperties } from 'react'; // react v18.0.0
import { spin } from '../../styles/animations.css'; // Internal keyframe import

/**
 * Represents the allowed size variants for the LoadingSpinner component.
 * - 'sm' -> 16px
 * - 'md' -> 24px (default)
 * - 'lg' -> 32px
 */
export type SpinnerSize = 'sm' | 'md' | 'lg';

/**
 * Defines the props interface for the LoadingSpinner component.
 * @property {SpinnerSize} [size='md'] Size variant of the spinner.
 * @property {string} [color='var(--color-primary)'] Color token or valid CSS color.
 * @property {string} [className] Optional CSS class for custom styling.
 */
export interface LoadingSpinnerProps {
  size?: SpinnerSize;
  color?: string;
  className?: string;
}

/**
 * Maps the spinner size variant to a numeric pixel value. If the provided
 * variant is invalid, returns the medium (24px) size by default.
 *
 * @param {SpinnerSize} size - The chosen spinner size variant.
 * @returns {number} Pixel value corresponding to the spinner size variant.
 */
function getSpinnerSize(size: SpinnerSize): number {
  switch (size) {
    case 'sm':
      return 16;
    case 'md':
      return 24;
    case 'lg':
      return 32;
    default:
      return 24;
  }
}

/**
 * LoadingSpinner (React Functional Component)
 * -------------------------------------------
 * Provides a reusable, accessible, and customizable loading indicator
 * that follows TaskStream AI's design system and accessibility guidelines.
 * 
 * Key Features:
 * 1. Customizable size and color.
 * 2. GPU-accelerated spinning animation with optional reduced-motion support.
 * 3. Semantic HTML attributes for screen readers, including aria-live
 *    announcements and role="status" for real-time feedback without distraction.
 *
 * Usage Example:
 * <LoadingSpinner size="lg" color="var(--color-success)" />
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'var(--color-primary)',
  className,
}) => {
  /**
   * Tracks whether the user has requested reduced motion. If true, the
   * spinner's animation is disabled to respect user preferences.
   */
  const [reduceMotion, setReduceMotion] = useState<boolean>(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handlePrefChange = () => setReduceMotion(mediaQuery.matches);
    handlePrefChange();

    // Add event listener for motion preference changes
    mediaQuery.addEventListener('change', handlePrefChange);
    return () => {
      mediaQuery.removeEventListener('change', handlePrefChange);
    };
  }, []);

  // Determine pixel size based on the "size" prop
  const spinnerPixelSize = getSpinnerSize(size);

  // Container styling ensures GPU optimization and consistent layout
  const containerStyle: CSSProperties = {
    display: 'inline-block',
    position: 'relative',
    willChange: 'transform',
    transform: 'translateZ(0)',
  };

  // Spinner styling applies a border-top color and keyframe-based spin animation.
  // If reduced motion is enabled, animation is set to "none".
  const spinnerStyle: CSSProperties = {
    width: `${spinnerPixelSize}px`,
    height: `${spinnerPixelSize}px`,
    color,
    border: '2px solid transparent',
    borderTopColor: 'currentColor',
    borderRadius: '50%',
    animation: reduceMotion ? 'none' : `${spin} var(--transition-slow) linear infinite`,
  };

  return (
    <div
      className={className}
      style={containerStyle}
      role="status"
      aria-live="polite"
      aria-label="Loading..."
    >
      <div style={spinnerStyle} />
    </div>
  );
};

export default LoadingSpinner;