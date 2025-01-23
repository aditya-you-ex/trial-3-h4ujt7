/**
 * chart.constants.ts
 * ----------------------------------------------------------------------------
 * Defines constant values and configurations for chart visualizations used
 * throughout the application's analytics and dashboard components. Includes chart
 * types, colors, sizes, and default configurations for consistent chart rendering.
 * 
 * Requirements Addressed:
 * 1) Analytics Dashboard (Tech Specs/6.4) for resource metrics, task distribution,
 *    and team performance visualizations.
 * 2) Data Visualization (Tech Specs/3.1.2) for standardized chart configurations
 *    across various UI components.
 */

// chart.js v4.4.0
import { ChartConfiguration } from 'chart.js';

/**
 * CHART_TYPES:
 * Defines all available chart types for visualization components.
 * This enum is used throughout the application to specify the chart type
 * in a consistent and type-safe manner.
 */
export enum CHART_TYPES {
  LINE = 'line',
  BAR = 'bar',
  AREA = 'area',
  PIE = 'pie',
  DOUGHNUT = 'doughnut',
}

/**
 * CHART_COLORS:
 * Defines a color palette for chart elements, matching the design system.
 * These color constants ensure consistent use of brand and status colors.
 */
export const CHART_COLORS = {
  PRIMARY: '#2563EB',   // Brand primary color
  SECONDARY: '#64748B', // Brand secondary color
  SUCCESS: '#10B981',   // Success color for positive metrics
  WARNING: '#F59E0B',   // Warning color for cautionary or pending items
  ERROR: '#EF4444',     // Error color for negative metrics or failures
};

/**
 * CHART_SIZES:
 * Defines standardized size presets for charts. For each preset,
 * both width and height are provided to maintain aspect ratios and
 * a consistent look across the application.
 */
export const CHART_SIZES = {
  SMALL: { width: 400, height: 300 },
  MEDIUM: { width: 600, height: 400 },
  LARGE: { width: 800, height: 600 },
};

/**
 * AXIS_CONFIG:
 * Default axis configurations for chart scales. These settings typically
 * map to Chart.js scale options for both x and y axes.
 */
export const AXIS_CONFIG = {
  x: {
    display: true,
    title: {
      display: true,
      text: 'X Axis',
    },
    grid: {
      display: false,
    },
  },
  y: {
    display: true,
    title: {
      display: true,
      text: 'Y Axis',
    },
    grid: {
      display: true,
    },
  },
};

/**
 * CHART_ANIMATIONS:
 * Defines animation settings for chart transitions and updates. These
 * can be applied globally across multiple chart instances.
 */
export const CHART_ANIMATIONS = {
  duration: 1000,       // Animation duration in milliseconds
  easing: 'easeInOutQuad', // Easing function for smooth transitions
};

/**
 * TOOLTIP_CONFIG:
 * Default tooltip configurations that apply to various chart instances.
 * Options such as tooltip display mode and enable/disable status are
 * centralized here for consistency.
 */
export const TOOLTIP_CONFIG = {
  enabled: true,
  mode: 'index', // Displays combined tooltip information for items sharing an index
};

/**
 * LEGEND_CONFIG:
 * Default legend configurations for chart rendering. Positions and alignment
 * settings are provided to maintain consistent placement across charts.
 */
export const LEGEND_CONFIG = {
  position: 'top',    // Legend will render at the top of the chart
  align: 'center',    // Legend items aligned at the center
};

/**
 * CHART_THEMES:
 * Theme-specific chart configurations for light and dark modes.
 * These can include background colors, text colors, or additional style
 * overrides to suit the application's theme requirements.
 */
export const CHART_THEMES = {
  light: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    borderColor: '#E5E7EB',
  },
  dark: {
    backgroundColor: '#1F2937',
    color: '#FFFFFF',
    borderColor: '#374151',
  },
};