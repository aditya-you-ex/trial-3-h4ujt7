/**
 * This file defines comprehensive theme constants and design tokens for the application's
 * theming system, providing a single source of truth for all visual styling requirements.
 * It implements complete design system tokens for typography, color palette, spacing,
 * breakpoints, shadows, transitions, and border radius with TypeScript support.
 */

// ------------------------------------
// External Imports
// ------------------------------------
// @mui/material version 5.14+
import { Theme } from '@mui/material';

/**
 * Global font family constants with fallback stacks. These values ensure consistent,
 * high-quality typography across various platforms and devices.
 */
export const FONT_FAMILY_PRIMARY = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
export const FONT_FAMILY_SECONDARY = "'SF Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
export const FONT_FAMILY_MONO = "'JetBrains Mono', 'Courier New', monospace";

/**
 * Global color constants used throughout the application. These are derived from
 * the design system specifications.
 */
export const COLOR_PRIMARY = '#2563EB';
export const COLOR_SECONDARY = '#64748B';
export const COLOR_SUCCESS = '#10B981';
export const COLOR_ERROR = '#EF4444';
export const COLOR_WARNING = '#F59E0B';

/**
 * Base unit and responsive breakpoint references for spacing and layout.
 */
export const SPACING_UNIT = 4;
export const MOBILE_BREAKPOINT = 320;
export const TABLET_BREAKPOINT = 768;
export const DESKTOP_BREAKPOINT = 1024;
export const WIDE_BREAKPOINT = 1440;

/**
 * Global transition duration reference for creating consistent animations.
 */
export const TRANSITION_DURATION_BASE = 200;

/**
 * Base border radius for all rounded corners across UI components.
 */
export const BORDER_RADIUS_BASE = 4;

/* =========================================================================
   TYPOGRAPHY
   ========================================================================= */

/**
 * TYPOGRAPHY object:
 * Comprehensive typography system constants including font families, sizes,
 * weights, line heights, and letter spacing for building consistent UI layouts.
 */
export const TYPOGRAPHY = {
  // The fontFamily object houses the primary, secondary, and monospace stacks.
  fontFamily: {
    primary: FONT_FAMILY_PRIMARY,
    secondary: FONT_FAMILY_SECONDARY,
    mono: FONT_FAMILY_MONO,
  },

  // The fontSize object provides a scalable set of font sizes.
  fontSize: {
    xxs: 10,
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
    huge: 40,
  },

  // The fontWeight object enumerates weight levels for text emphasis.
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semiBold: 600,
    bold: 700,
    extraBold: 800,
  },

  // The lineHeight object describes how tall lines of text look.
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },

  // The letterSpacing object provides spacing adjustments between letters.
  letterSpacing: {
    normal: '0em',
    wide: '0.02em',
    wider: '0.04em',
    widest: '0.08em',
  },
};

/* =========================================================================
   COLORS
   ========================================================================= */

/**
 * COLORS object:
 * Extended color system with semantic tokens, variations, and alpha channel support.
 * Organized to be easily consumed by MUI themes or other UI contexts.
 */
export const COLORS = {
  // Primary and secondary brand colors alongside success, error, and warning.
  primary: {
    main: COLOR_PRIMARY,
    light: '#3B82F6',
    dark: '#1E3A8A',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: COLOR_SECONDARY,
    light: '#94A3B8',
    dark: '#475569',
    contrastText: '#FFFFFF',
  },
  success: {
    main: COLOR_SUCCESS,
    light: '#34D399',
    dark: '#059669',
    contrastText: '#FFFFFF',
  },
  error: {
    main: COLOR_ERROR,
    light: '#F87171',
    dark: '#B91C1C',
    contrastText: '#FFFFFF',
  },
  warning: {
    main: COLOR_WARNING,
    light: '#FBBF24',
    dark: '#B45309',
    contrastText: '#FFFFFF',
  },

  // A gray palette useful for backgrounds, borders, and neutral text.
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Common colors often used for text or backgrounds.
  common: {
    black: '#000000',
    white: '#FFFFFF',
  },

  // Default text colors to be used across typical UI states.
  text: {
    primary: '#111827',
    secondary: '#374151',
    disabled: '#9CA3AF',
    hint: '#6B7280',
  },

  // Default background colors for components, pages, and surfaces.
  background: {
    default: '#FFFFFF',
    paper: '#F9FAFB',
  },
};

/* =========================================================================
   SPACING
   ========================================================================= */

/**
 * SPACING object:
 * Comprehensive spacing system detailing base unit, scale multipliers, and
 * custom values used for padding, margins, and layout gaps.
 */
export const SPACING = {
  // Represents the base unit (in px).
  unit: SPACING_UNIT,

  // Scale multipliers that build upon the base unit for quick spacing increments.
  scale: {
    1: SPACING_UNIT * 1,
    2: SPACING_UNIT * 2,
    3: SPACING_UNIT * 3,
    4: SPACING_UNIT * 4,
    5: SPACING_UNIT * 5,
    6: SPACING_UNIT * 6,
    8: SPACING_UNIT * 8,
    10: SPACING_UNIT * 10,
  },

  // Custom spacing definitions for specific layout requirements.
  custom: {
    xxs: SPACING_UNIT * 0.5,
    xs: SPACING_UNIT,
    sm: SPACING_UNIT * 2,
    md: SPACING_UNIT * 3,
    lg: SPACING_UNIT * 4,
    xl: SPACING_UNIT * 6,
    xxl: SPACING_UNIT * 8,
  },
};

/* =========================================================================
   BREAKPOINTS
   ========================================================================= */

/**
 * BREAKPOINTS object:
 * Defines responsive breakpoint values and unit/step configurations for
 * MUI or custom media queries to adjust layouts across devices.
 */
export const BREAKPOINTS = {
  // Distinct breakpoints for mobile, tablet, desktop, and wide screens.
  values: {
    mobile: MOBILE_BREAKPOINT,
    tablet: TABLET_BREAKPOINT,
    desktop: DESKTOP_BREAKPOINT,
    wide: WIDE_BREAKPOINT,
  },

  // The unit used in breakpoints, typically "px".
  unit: 'px',

  // The default step used by certain MUI breakpoint calculations.
  step: 5,
};

/* =========================================================================
   SHADOWS
   ========================================================================= */

/**
 * SHADOWS object:
 * Box shadow system defining standard elevation levels and custom shadows
 * to enhance visual hierarchy and depth.
 */
export const SHADOWS = {
  // A typical elevation scale commonly used for material-like design.
  elevation: {
    0: 'none',
    1: '0px 1px 3px rgba(0,0,0,0.2)',
    2: '0px 3px 6px rgba(0,0,0,0.16)',
    3: '0px 5px 10px rgba(0,0,0,0.16)',
    4: '0px 8px 16px rgba(0,0,0,0.16)',
    5: '0px 12px 24px rgba(0,0,0,0.16)',
  },

  // Custom shadow definitions that can be used for unique components or states.
  custom: {
    soft: '0px 2px 4px rgba(0,0,0,0.1)',
    hard: '0px 2px 2px rgba(0,0,0,0.2)',
    focus: '0 0 0 3px rgba(37,99,235,0.5)',
  },
};

/* =========================================================================
   TRANSITIONS
   ========================================================================= */

/**
 * TRANSITIONS object:
 * Defines animation transition properties, including durations, easing functions,
 * and custom transitions for dynamic UI interactions.
 */
export const TRANSITIONS = {
  // Common duration values in milliseconds for creating consistent transitions.
  duration: {
    shortest: 150,
    shorter: 200,
    short: 250,
    base: TRANSITION_DURATION_BASE,
    medium: 300,
    long: 500,
    longer: 700,
    longest: 1000,
  },

  // Easing curves used across UI animations.
  easing: {
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },

  // Custom named transitions for unique interactions.
  custom: {
    swift: 'all 150ms ease-in-out',
    snappy: 'all 250ms cubic-bezier(0.4, 0, 0.2, 1)',
  },
};

/* =========================================================================
   BORDER_RADIUS
   ========================================================================= */

/**
 * BORDER_RADIUS object:
 * A uniform approach to rounded corners with consistent values for low, medium,
 * and high curvature across UI elements.
 */
export const BORDER_RADIUS = {
  // Pre-defined named radii for consistent rounded corners.
  values: {
    none: 0,
    sm: BORDER_RADIUS_BASE / 2,
    md: BORDER_RADIUS_BASE,
    lg: BORDER_RADIUS_BASE * 2,
    xl: BORDER_RADIUS_BASE * 3,
  },

  // The unit for border radius calculations, typically "px".
  unit: 'px',
};