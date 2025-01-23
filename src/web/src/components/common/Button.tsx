import React, { FC, MouseEvent, ReactNode } from 'react'; // react@^18.0.0
import classNames from 'classnames'; // classnames@^2.3.2

/*
  ----------------------------------------------------------------------------------
  Internal Imports
  ----------------------------------------------------------------------------------
  - Icon: A reusable React.FC<IconProps> for rendering icons or symbolic graphics.
  - COLORS: TaskStream AI theme constants providing structured color tokens.
*/
import { Icon } from './Icon';
import { COLORS } from '../../constants/theme.constants';

/**
 * ButtonProps
 * ----------------------------------------------------------------------------
 * Defines the shape of the props passed into the reusable Button component.
 * This component is built with enterprise-grade accessibility, theming, and
 * scalability in mind, strictly adhering to the TaskStream AI design system.
 */
export interface ButtonProps {
  /**
   * The contents to display inside the button (text, icons, or nested elements).
   */
  children: ReactNode;

  /**
   * A style variant determining the visual styling of the button, mapped
   * directly to TaskStream AI design system tokens for coloring and borders.
   *
   *   - 'primary'   => Filled primary color button
   *   - 'secondary' => Filled secondary color button
   *   - 'outline'   => Transparent background, colored border
   *   - 'text'      => Bare text button with no border
   */
  variant: 'primary' | 'secondary' | 'outline' | 'text';

  /**
   * The size variant for the button, modifying padding, font size, and geometry
   * according to the design system guidelines.
   *
   *   - 'sm' => Small
   *   - 'md' => Medium
   *   - 'lg' => Large
   */
  size: 'sm' | 'md' | 'lg';

  /**
   * An optional icon name from IconNames. If provided, the button includes an
   * icon in addition to or instead of text. For loading states, the icon may
   * be replaced by a spinner.
   */
  iconName?: string;

  /**
   * Determines where the icon is placed relative to any text.
   *   - 'left'  => Icon to the left of the text
   *   - 'right' => Icon to the right of the text
   */
  iconPosition?: 'left' | 'right';

  /**
   * If true, the button is rendered in a visually and functionally disabled state,
   * with aria-disabled set accordingly for accessibility. Disables clicks.
   */
  disabled?: boolean;

  /**
   * If true, the button is rendered in a loading state, showing a spinner in place
   * of the icon or text, and aria-busy set accordingly.
   */
  loading?: boolean;

  /**
   * If true, the button will stretch to occupy the full available width of its
   * container (width: 100%).
   */
  fullWidth?: boolean;

  /**
   * The HTML type attribute for the <button> element. Defaults to 'button'.
   */
  type?: 'button' | 'submit' | 'reset';

  /**
   * An additional CSS class name for custom overrides, appended to the base classes.
   */
  className?: string;

  /**
   * An optional onClick event handler. Receives a `MouseEvent<HTMLButtonElement>`.
   */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;

  /**
   * An accessible label primarily for screen readers, set as `aria-label`.
   */
  ariaLabel?: string;

  /**
   * Override the keyboard navigable tab order for this button.
   */
  tabIndex?: number;
}

/**
 * getButtonClasses
 * ----------------------------------------------------------------------------
 * Generates a complete CSS class string for the Button component by combining
 * base, variant, size, and state-based styles. Additionally supports external
 * overrides via the `className` prop.
 */
function getButtonClasses(
  variant: ButtonProps['variant'],
  size: ButtonProps['size'],
  disabled: boolean | undefined,
  loading: boolean | undefined,
  fullWidth: boolean | undefined,
  className?: string
): string {
  /*
    Begin with base classes ensuring an inline-flex layout, alignment, consistent
    font styling, transitions, and border-box sizing.
    The class 'ts-button' can be used to attach additional global or scoped styling
    related to the design system if desired.
  */
  const baseClasses: string[] = [
    'ts-button',
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'focus:outline-none',
    'transition-colors',
    'duration-200',
    'cursor-pointer',
    'select-none',
    'rounded',
  ];

  // Variant-specific classes for color, border, and text styling
  switch (variant) {
    case 'primary':
      baseClasses.push(
        'bg-[var(--ts-color-primary,',
        COLORS.primary.main + ')]', // Fallback to the design system's primary color
        'text-white',
        'hover:bg-[var(--ts-color-primary-dark,' + COLORS.primary.dark + ')]',
        'focus:bg-[var(--ts-color-primary-dark,' + COLORS.primary.dark + ')]',
        'border-transparent'
      );
      break;

    case 'secondary':
      baseClasses.push(
        'bg-[var(--ts-color-secondary,' + COLORS.secondary.main + ')]',
        'text-white',
        'hover:bg-[var(--ts-color-secondary-dark,' + COLORS.secondary.dark + ')]',
        'focus:bg-[var(--ts-color-secondary-dark,' + COLORS.secondary.dark + ')]',
        'border-transparent'
      );
      break;

    case 'outline':
      baseClasses.push(
        'bg-transparent',
        'border',
        'text-[var(--ts-color-primary,' + COLORS.primary.main + ')]',
        'border-[var(--ts-color-primary,' + COLORS.primary.main + ')]',
        'hover:bg-[var(--ts-color-primary-light,' + COLORS.primary.light + ')]/10',
        'focus:bg-[var(--ts-color-primary-light,' + COLORS.primary.light + ')]/10'
      );
      break;

    case 'text':
      baseClasses.push(
        'bg-transparent',
        'border-none',
        'text-[var(--ts-color-primary,' + COLORS.primary.main + ')]',
        'hover:bg-[var(--ts-color-primary-light,' + COLORS.primary.light + ')]/10',
        'focus:bg-[var(--ts-color-primary-light,' + COLORS.primary.light + ')]/10'
      );
      break;
  }

  // Size-specific classes for padding, font-size, and overall geometry
  switch (size) {
    case 'sm':
      baseClasses.push('text-sm', 'px-2', 'py-1');
      break;
    case 'md':
      baseClasses.push('text-base', 'px-4', 'py-2');
      break;
    case 'lg':
      baseClasses.push('text-lg', 'px-6', 'py-3');
      break;
  }

  // Handle disabled or loading states
  const isNonInteractive = disabled || loading;
  if (isNonInteractive) {
    baseClasses.push(
      'opacity-50',
      'cursor-not-allowed'
    );
  }

  // Expand to full width if requested
  if (fullWidth) {
    baseClasses.push('w-full');
  }

  // Add any custom className overrides
  if (className) {
    baseClasses.push(className);
  }

  // Return the aggregated class string via classNames utility
  return classNames(baseClasses);
}

/**
 * A small helper to convert button size tokens to numeric values for spinner size.
 */
function getSpinnerSize(size: ButtonProps['size']): number {
  /*
    We match the Icon component's logic: sm => 16px, md => 24px, lg => 32px
    to keep spinners and icons visually consistent within the button.
  */
  switch (size) {
    case 'sm':
      return 16;
    case 'lg':
      return 32;
    case 'md':
    default:
      return 24;
  }
}

/**
 * Button
 * ----------------------------------------------------------------------------
 * A reusable, production-ready button component implementing the TaskStream AI
 * design system. It adheres to WCAG 2.1 AA accessibility guidelines, including
 * focus states, ARIA attributes, and keyboard navigation.
 */
export const Button: FC<ButtonProps> = ({
  children,
  variant,
  size,
  iconName,
  iconPosition = 'left',
  disabled = false,
  loading = false,
  fullWidth = false,
  type = 'button',
  className,
  onClick,
  ariaLabel,
  tabIndex,
}) => {
  /**
   * Renders the button icon or loading spinner with proper sizing and spacing.
   * - If `loading` is true, we display a spinner.
   * - Otherwise, if `iconName` is provided, we render the Icon component.
   * - The icon or spinner is sized according to the button's size.
   */
  const renderIcon = (): ReactNode => {
    if (loading) {
      const spinnerPx = getSpinnerSize(size);
      return (
        <svg
          width={spinnerPx}
          height={spinnerPx}
          viewBox="0 0 24 24"
          className={classNames(
            'animate-spin',
            iconPosition === 'left' ? 'mr-2' : 'ml-2'
          )}
          aria-hidden="true"
          role="img"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" />
          <path
            className="opacity-75"
            d="M4 12a8 8 0 018-8"
          />
        </svg>
      );
    }

    if (iconName) {
      /*
        Render the provided icon if an iconName was specified. The Icon component
        is responsible for color, sizing, and accessibility by default. We add
        spacing based on iconPosition to separate it from text or other content.
      */
      return (
        <Icon
          name={iconName as any}
          size={size}
          className={classNames(iconPosition === 'left' ? 'mr-2' : 'ml-2')}
        />
      );
    }

    // If neither loading nor iconName are provided, return nothing.
    return null;
  };

  /**
   * Handle button click events, preventing user interaction if the button
   * is disabled or in a loading state, while calling the provided onClick
   * handler on success.
   */
  const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
    if (disabled || loading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // Add optional logic here for haptic feedback on touch devices if desired.
    // For now, we simply invoke the consumer's onClick if defined.
    if (onClick) {
      try {
        onClick(event);
      } catch (error) {
        // Graceful error handling
        // Could log or handle error in a monitored way
      }
    }
  };

  /*
    Combine all relevant classes for correct styling and pass them to the
    <button> element. We also set ARIA attributes for accessibility:
      - aria-label: if provided, for screen reader usage
      - aria-disabled: indicates that the button is disabled
      - aria-busy: indicates that the button is in a loading state
  */
  const computedClasses = getButtonClasses(
    variant,
    size,
    disabled,
    loading,
    fullWidth,
    className
  );

  return (
    <button
      type={type}
      className={computedClasses}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      aria-busy={loading}
      disabled={disabled || loading}
      onClick={handleClick}
      tabIndex={typeof tabIndex === 'number' ? tabIndex : undefined}
    >
      {iconPosition === 'left' && renderIcon()}
      {children}
      {iconPosition === 'right' && renderIcon()}
    </button>
  );
};

/*
  Exposing named members for convenience or type-checking in other parts of the app:
  - ButtonProps
  - The variant, size, onClick are implicitly part of the ButtonProps interface.
*/