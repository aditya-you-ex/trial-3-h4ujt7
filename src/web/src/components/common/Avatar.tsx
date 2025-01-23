/**
 * -----------------------------------------------------------------------------
 * File: Avatar.tsx
 * Location: src/web/src/components/common
 * Description:
 *   A reusable Avatar component that displays user profile images or fallback
 *   initials with configurable sizes and styles, following the TaskStream AI
 *   design system. Includes enhanced accessibility features, responsive image
 *   loading, and status indicators.
 *
 * Dependencies:
 *   - React ^18.0.0
 *   - classnames ^2.3.2
 *   - BaseComponentProps from src/web/src/types/common.types
 *
 * NOTE:
 *   This file adheres to enterprise-level standards for code organization,
 *   documentation, and maintainability.
 * -----------------------------------------------------------------------------
 */

// React version ^18.0.0
import React, { useCallback, useState } from 'react';

// classnames version ^2.3.2
import classNames from 'classnames';

// Internal Imports (IE1)
import { BaseComponentProps } from '../../types/common.types';

/**
 * Enumeration: Size
 * -----------------------------------------------------------------------------
 * Represents the available avatar sizes (xs, sm, md, lg, xl) as a TypeScript
 * enum. Each size corresponds to specific dimension values (width & height).
 */
export enum Size {
  XS = 'xs',
  SM = 'sm',
  MD = 'md',
  LG = 'lg',
  XL = 'xl',
}

/**
 * Enumeration: UserStatus
 * -----------------------------------------------------------------------------
 * Represents the user's presence state. Each status is mapped to a specific
 * color token from the TaskStream AI design system.
 */
export enum UserStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  AWAY = 'away',
  BUSY = 'busy',
}

/**
 * Function: getStatusColor
 * -----------------------------------------------------------------------------
 * Returns the appropriate CSS color variable based on the provided user status.
 *
 * @param status - A UserStatus enum value representing the user's presence.
 * @returns A string referencing the corresponding CSS variable for color.
 */
function getStatusColor(status: UserStatus): string {
  switch (status) {
    case UserStatus.ONLINE:
      return 'var(--color-success)';
    case UserStatus.OFFLINE:
      return 'var(--color-gray-400)';
    case UserStatus.AWAY:
      return 'var(--color-warning)';
    case UserStatus.BUSY:
      return 'var(--color-error)';
    default:
      return 'var(--color-gray-400)';
  }
}

/**
 * Function: getSizeClassName
 * -----------------------------------------------------------------------------
 * Returns a string representing the className that applies appropriate sizing
 * styles based on the provided Size enum value.
 *
 * @param size - A Size enum value indicating the desired avatar dimension.
 * @returns A string that can be used in a classNames() invocation.
 */
function getSizeClassName(size: Size): string {
  // We'll map each enum value to a distinct class for avatar sizing.
  switch (size) {
    case Size.XS:
      return 'avatar--xs';
    case Size.SM:
      return 'avatar--sm';
    case Size.MD:
      return 'avatar--md';
    case Size.LG:
      return 'avatar--lg';
    case Size.XL:
      return 'avatar--xl';
    default:
      return 'avatar--md';
  }
}

/**
 * Function: getInitials
 * -----------------------------------------------------------------------------
 * Extracts and formats user initials from a given full name. If the full name
 * cannot be parsed, returns '?' as a fallback.
 *
 * Steps (as per specification):
 *   1. Validate input name string.
 *   2. Split name into parts using a regex to account for multiple spaces.
 *   3. Take the first character of the first and last parts, if available.
 *   4. Convert to uppercase.
 *   5. Return combined initials or fallback to '?'.
 *
 * @param name - The user's full name (e.g., "Alice Brown").
 * @returns The extracted initials, up to two characters, in uppercase.
 */
export function getInitials(name: string): string {
  if (!name || typeof name !== 'string') {
    return '?';
  }

  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) {
    return '?';
  }

  const firstInitial = parts[0]?.[0] || '';
  const lastInitial = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
  const initials = (firstInitial + lastInitial).toUpperCase();

  return initials || '?';
}

/**
 * Interface: AvatarProps
 * -----------------------------------------------------------------------------
 * Enhanced props interface for the Avatar component with accessibility,
 * configurability, and error handling. Extends BaseComponentProps to
 * standardize component structure across the UI library.
 */
export interface AvatarProps extends BaseComponentProps {
  /**
   * The source URL for the user's profile image. If not provided, the component
   * automatically falls back to displaying the user's initials.
   */
  src?: string;

  /**
   * The full name of the user, used to generate the fallback initials
   * if the image is unavailable or not provided.
   */
  name?: string;

  /**
   * The enumerated size of the avatar (e.g. Size.MD).
   */
  size: Size;

  /**
   * A short alternative text describing the avatar image for screen readers.
   */
  alt?: string;

  /**
   * Whether or not the status indicator should be displayed in the bottom-right
   * corner of the avatar.
   */
  showStatus?: boolean;

  /**
   * The user's current status (e.g. online, offline, away, busy).
   * If showStatus is false, this prop is ignored.
   */
  status?: UserStatus;

  /**
   * If true, a loading effect is displayed instead of the final avatar content.
   */
  loading?: boolean;

  /**
   * A callback that runs when an error occurs loading the avatar image.
   */
  onError?: (event?: React.SyntheticEvent<HTMLImageElement, Event>) => void;

  /**
   * An ARIA label for enhanced accessibility, typically used if alt is not set
   * or if the avatar needs a specific descriptive label for screen readers.
   */
  'aria-label'?: string;

  /**
   * If true, requests the browser to load the image lazily (when supported),
   * potentially improving initial page performance.
   */
  lazy?: boolean;
}

/**
 * Component: Avatar
 * -----------------------------------------------------------------------------
 * Reusable avatar component with advanced configurability (size, status, error
 * handling, fallback initials) and relevant accessibility features. Conforms
 * to the TaskStream AI design system for color, typography, spacing, and
 * animation standards.
 */
export const Avatar: React.FC<AvatarProps> = ({
  /**
   * Inherited from BaseComponentProps (common.types):
   *   className?: string
   *   testId?: string
   */
  className,
  testId,

  /**
   * Avatar-specific props:
   */
  src,
  name,
  size,
  alt,
  showStatus = false,
  status = UserStatus.OFFLINE,
  loading = false,
  onError,
  'aria-label': ariaLabel,
  lazy = false,
}) => {
  // Track whether the image has failed to load, in which case fallback to initials.
  const [hasImageError, setHasImageError] = useState<boolean>(false);

  /**
   * onImageError
   * ---------------------------------------------------------------------------
   * A specialized error handler passed to the <img> tag. Sets the local
   * hasImageError state to true, triggers the optional onError callback,
   * and effectively forces the component to display fallback initials.
   */
  const onImageError = useCallback(
    (event?: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setHasImageError(true);
      if (onError) {
        onError(event);
      }
    },
    [onError]
  );

  // If the component is in loading mode, we apply the 'avatar-loading' class.
  const avatarClass = classNames(
    'avatar',
    getSizeClassName(size),
    className,
    {
      'avatar-loading': loading,
    }
  );

  // Compute the fallback initials from "name".
  const initials = getInitials(name || '');

  // Evaluate if we should display an image or fallback to initials/placeholders.
  const shouldShowImage = src && !hasImageError && !loading;

  // Conditionally render the user status bubble, if requested.
  const renderStatus = showStatus ? (
    <span
      className="avatar-status"
      style={{
        backgroundColor: getStatusColor(status),
      }}
    />
  ) : null;

  return (
    <span
      data-testid={testId}
      className={avatarClass}
      aria-label={ariaLabel || alt || name || 'User Avatar'}
      // Outline of inlined or external stylings for the avatar container:
      // position: relative;
      // display: inline-flex;
      // align-items: center;
      // justify-content: center;
      // border-radius: 50%;
      // background-color: var(--color-gray-100);
      // overflow: hidden;
      // transition: all 0.2s ease-in-out;
      // user-select: none;
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '50%',
        backgroundColor: 'var(--color-gray-100)',
        overflow: 'hidden',
        transition: 'all 0.2s ease-in-out',
        userSelect: 'none',
      }}
    >
      {/**
       * If loading=false and we have a valid src that did not fail yet, display <img>.
       * Otherwise, show fallback initials or a loading effect if loading=true.
       */}
      {shouldShowImage ? (
        <img
          className="avatar-image"
          src={src}
          alt={alt || name || 'User Avatar'}
          loading={lazy ? 'lazy' : 'eager'}
          onError={onImageError}
          // Outline of inlined or external stylings for the avatar image:
          // width: 100%;
          // height: 100%;
          // object-fit: cover;
          // transition: opacity 0.2s ease-in-out;
          // backface-visibility: hidden;
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transition: 'opacity 0.2s ease-in-out',
            backfaceVisibility: 'hidden',
          }}
        />
      ) : (
        // Render user initials or a skeleton-like fallback if loading is true.
        <span
          className="avatar-initials"
          // Outline of inlined or external stylings for the avatar initials:
          // font-weight: var(--font-weight-medium);
          // color: var(--color-gray-700);
          // text-transform: uppercase;
          // line-height: 1;
          // user-select: none;
          style={{
            fontWeight: 'var(--font-weight-medium)' as unknown,
            color: 'var(--color-gray-700)',
            textTransform: 'uppercase',
            lineHeight: '1',
            userSelect: 'none',
          }}
        >
          {loading ? '' : initials}
        </span>
      )}
      {renderStatus}
    </span>
  );
};

/**
 * -----------------------------------------------------------------------------
 * Inline Comments on Additional Potential Avatar Classes/Animations:
 * -----------------------------------------------------------------------------
 *
 * .avatar-image {
 *   width: 100%;
 *   height: 100%;
 *   object-fit: cover;
 *   transition: opacity 0.2s ease-in-out;
 *   backface-visibility: hidden;
 * }
 *
 * .avatar-initials {
 *   font-weight: var(--font-weight-medium);
 *   color: var(--color-gray-700);
 *   text-transform: uppercase;
 *   line-height: 1;
 *   user-select: none;
 * }
 *
 * .avatar-status {
 *   position: absolute;
 *   bottom: 0;
 *   right: 0;
 *   width: 25%;
 *   height: 25%;
 *   border-radius: 50%;
 *   border: 2px solid var(--color-white);
 *   transition: all 0.2s ease-in-out;
 *   box-shadow: 0 0 0 2px var(--color-white);
 * }
 *
 * .avatar-loading {
 *   animation: avatar-pulse 1.5s ease-in-out infinite;
 *   background: linear-gradient(
 *     90deg,
 *     var(--color-gray-100) 0%,
 *     var(--color-gray-200) 50%,
 *     var(--color-gray-100) 100%
 *   );
 *   background-size: 200% 100%;
 * }
 *
 * @keyframes avatar-pulse {
 *   0% {
 *     background-position: 0% 0%;
 *   }
 *   100% {
 *     background-position: -200% 0%;
 *   }
 * }
 *
 * .avatar--xs {
 *   width: 24px;
 *   height: 24px;
 * }
 *
 * .avatar--sm {
 *   width: 32px;
 *   height: 32px;
 * }
 *
 * .avatar--md {
 *   width: 40px;
 *   height: 40px;
 * }
 *
 * .avatar--lg {
 *   width: 48px;
 *   height: 48px;
 * }
 *
 * .avatar--xl {
 *   width: 56px;
 *   height: 56px;
 * }
 */