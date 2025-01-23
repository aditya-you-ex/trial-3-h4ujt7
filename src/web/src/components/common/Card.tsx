import React, { FC, KeyboardEvent, MouseEvent } from 'react'; // react@^18.0.0
import classNames from 'classnames'; // classnames@^2.3.2

// Internal imports for consistent card styling and potential icon usage.
import { SHADOWS, BORDER_RADIUS } from '../../constants/theme.constants';
import { Icon } from './Icon';

/**
 * CardProps
 * ----------------------------------------------------------------------------
 * Defines the properties for the Card component, ensuring complete type safety
 * and enterprise-grade extensibility. This component offers configurable
 * elevation, padding, and interactive states in adherence to the design system.
 */
export interface CardProps {
  /**
   * Content to be rendered inside the card. Accepts any valid React node.
   * This prop is required for a meaningful Card.
   */
  children: React.ReactNode;

  /**
   * Optional additional CSS class names for custom styling or layout tweaks.
   * These classes are merged with the component's default class set.
   */
  className?: string;

  /**
   * Determines the Card's elevation level, providing a consistent shadow
   * depth. Defaults to 'small' if not specified.
   *  - 'small'  => Lower elevation shadow
   *  - 'medium' => Moderate elevation shadow
   *  - 'large'  => Higher elevation shadow
   */
  elevation?: 'small' | 'medium' | 'large';

  /**
   * Configures the padding around the card's content for balanced spacing.
   * Defaults to 'medium' if not specified.
   *  - 'none'   => Zero internal padding
   *  - 'small'  => Minimal padding
   *  - 'medium' => Default padding
   *  - 'large'  => Generous padding
   */
  padding?: 'none' | 'small' | 'medium' | 'large';

  /**
   * Enables hover, focus, and click interactions for the card. This feature
   * adds a pointer cursor and keyboard accessibility via role="button" and
   * tabIndex if set to true.
   */
  interactive?: boolean;

  /**
   * An optional click handler. When provided, the card is made accessible with
   * keyboard and pointer interactions. If interactive is false but an onClick
   * is provided, the card will still handle clicks but may not visually appear
   * interactive without additional styling.
   */
  onClick?: () => void;
}

/**
 * getCardClasses
 * ----------------------------------------------------------------------------
 * A utility function responsible for generating a string of CSS classes that
 * reflect the card's props. It leverages the 'classnames' library to compose
 * conditional class names.
 *
 * Steps:
 *  1. Start with a base card class name.
 *  2. Include the custom className if provided.
 *  3. Append classes for the elevation level.
 *  4. Append classes for the specified padding.
 *  5. Append an interactive class if enabled.
 *  6. Combine everything into a single class name string.
 *
 * @param props CardProps
 * @returns A combined class name string suitable for a card element.
 */
export function getCardClasses(props: CardProps): string {
  const {
    className,
    elevation = 'small',
    padding = 'medium',
    interactive = false,
  } = props;

  // Compute unique class strings for elevation and padding.
  // Applications can style these classes in parallel with the design system.
  const elevationClass = `ts-card--elevation-${elevation}`;
  const paddingClass = `ts-card--padding-${padding}`;

  // Use 'classnames' to combine classes reliably and handle conditionals.
  return classNames(
    'ts-card', // Base class for the Card
    elevationClass,
    paddingClass,
    { 'ts-card--interactive': interactive },
    className
  );
}

/**
 * getShadow
 * ----------------------------------------------------------------------------
 * Maps the card's elevation prop to a specific shadow setting from the SHADOWS
 * design token, achieving consistent depth perception across the application.
 */
function getShadow(elevation: 'small' | 'medium' | 'large'): string {
  switch (elevation) {
    case 'large':
      // Typically a higher shadow index for a larger elevation.
      return SHADOWS.elevation[4];
    case 'medium':
      return SHADOWS.elevation[2];
    case 'small':
    default:
      return SHADOWS.elevation[1];
  }
}

/**
 * Card
 * ----------------------------------------------------------------------------
 * A flexible and reusable container that aligns with the TaskStream AI design
 * system. It supports:
 *  - Children content (text, components, etc.)
 *  - Configurable elevation for shadow depth
 *  - Adjustable padding
 *  - Interactive states with hover/focus if desired
 *  - An accessible role/button setting if onClick is provided
 *
 * This Card ensures a uniform look and feel across the application, adhering
 * to enterprise-level performance and accessibility standards.
 */
export const Card: FC<CardProps> = ({
  children,
  className,
  elevation = 'small',
  padding = 'medium',
  interactive = false,
  onClick,
}) => {
  // Generate the CSS class names from the provided props.
  const cardClassNames = getCardClasses({
    className,
    elevation,
    padding,
    interactive,
  });

  // Accessibility:
  //  - If the card is interactive, assign role="button" and tabIndex for focus.
  //  - This ensures screen readers and keyboard users can detect its interactivity.
  const isInteractive = interactive || Boolean(onClick);

  // Inlined style with dynamic shadow and a default border radius for
  // consistent theming across the UI. Additional styles or overrides
  // can be passed via className.
  const cardStyle = {
    boxShadow: getShadow(elevation),
    borderRadius: `${BORDER_RADIUS.values.md}${BORDER_RADIUS.unit}`,
  };

  // Event handler placeholders for potential keyboard interaction enhancements.
  const handleKeyPress = (evt: KeyboardEvent<HTMLDivElement>) => {
    // Trigger onClick when pressing Enter or Space, simulating a button.
    if (onClick && (evt.key === 'Enter' || evt.key === ' ')) {
      evt.preventDefault();
      onClick();
    }
  };

  const handleClick = (evt: MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className={cardClassNames}
      style={cardStyle}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={handleClick}
      onKeyPress={isInteractive ? handleKeyPress : undefined}
      aria-pressed={undefined}
    >
      {children}
    </div>
  );
};