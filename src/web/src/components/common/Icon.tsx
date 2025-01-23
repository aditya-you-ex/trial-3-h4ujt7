import React, { FC } from 'react'; // react@^18.0.0
import { IconType } from '@types/react-icons'; // @types/react-icons@^3.0.0

/*
  Internal imports from the TaskStream AI source.
  We import icon name constants and the icon map (Record<string, IconType>) for
  consistent usage across the application. We also import the COLORS object
  to leverage consistent theme-based coloring.
*/
import { IconNames, IconMap } from '../../assets/icons'; // IE1 compliance
import { COLORS } from '../../constants/theme.constants'; // IE1 compliance

/**
 * IconProps
 * ----------------------------------------------------------------------------
 * Defines the shape of the props passed into the reusable Icon component.
 * - name: Specifies which icon from IconNames to render.
 * - size: A design system size token, translating to fixed pixel sizes.
 * - color: A theme-based color token that maps to a main color value in COLORS.
 * - className: Optional additional class names for layout or overrides.
 * - onClick: Optional callback to handle click behavior for interactive icons.
 */
export interface IconProps {
  /**
   * Name of the icon to render from IconNames, ensuring type safety and
   * preventing typos or invalid icon references.
   */
  name: keyof typeof IconNames;

  /**
   * The size variant of the icon based on the design system. The default value
   * is 'md' (24px). Valid options:
   *  - sm => 16px
   *  - md => 24px
   *  - lg => 32px
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * The color token for the icon, referencing theme-based colors from COLORS.
   * By default, this is set to 'secondary', which maps to COLORS.secondary.main.
   */
  color?: keyof typeof COLORS;

  /**
   * An optional string for additional CSS class names, enabling layout or style
   * overrides (e.g., margins, display, or custom animations).
   */
  className?: string;

  /**
   * An optional onClick handler for interactive icons. When provided, the icon
   * is rendered in a focusable manner (with role="button" and tabIndex="0"),
   * facilitating keyboard and accessibility support.
   */
  onClick?: () => void;
}

/**
 * getSizeValue
 * ----------------------------------------------------------------------------
 * Utility function that converts the size token ('sm', 'md', or 'lg') into
 * an explicit pixel value to be applied as width and height in the icon style.
 */
function getSizeValue(size?: 'sm' | 'md' | 'lg'): number {
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
 * Icon
 * ----------------------------------------------------------------------------
 * A reusable icon component that supports:
 *  - Type-safe icon lookup from IconNames through IconMap
 *  - Theme-based color selection from COLORS (default secondary)
 *  - Size variants: sm (16px), md (24px), lg (32px)
 *  - Optional click handling for interactive behaviors
 *  - Full accessibility support via role, tabIndex, and aria-hidden
 *
 * This component ensures consistent styling, theming, and a single source of
 * truth for icons across the TaskStream AI application.
 */
export const Icon: FC<IconProps> = ({
  name,
  size = 'md',
  color = 'secondary',
  className,
  onClick,
}) => {
  // Retrieve the corresponding Icon component from the IconMap using the name prop.
  const SelectedIcon: IconType = IconMap[name];

  // Determine the numeric size (in px) for rendering the icon.
  const pixelSize = getSizeValue(size);

  // Derive the main hex value from the COLORS theme object. Fallback to secondary if unavailable.
  const selectedColor = COLORS[color]?.main || COLORS.secondary.main;

  return (
    <SelectedIcon
      /*
        The style attribute ensures that icons adhere to design system standards:
        - pixelSize is applied for width/height
        - selectedColor is applied to "color", controlling the icon fill
      */
      style={{
        width: pixelSize,
        height: pixelSize,
        color: selectedColor,
      }}
      /*
        When onClick is provided, treat the icon like a focusable, interactive element
        (role="button", tabIndex=0, aria-hidden=false).
        Otherwise, hide it from the accessibility tree (aria-hidden=true, role/ tabIndex omitted).
      */
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-hidden={!onClick}
      onClick={onClick}
      /*
        className prop usage allows layout-specific or custom styles to be applied,
        complementing the default design system rules.
      */
      className={className}
    />
  );
};