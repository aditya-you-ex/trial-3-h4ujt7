/**
 * --------------------------------------------------------------------------
 * TaskStream AI - Analytics Constants
 * --------------------------------------------------------------------------
 * This file defines constant values and configuration structures related
 * to analytics features in the TaskStream AI frontend application. These
 * constants include refresh intervals, default time ranges, metric thresholds,
 * chart color themes, human-friendly metric labels, and chart rendering configs.
 *
 * By centralizing these constants, we maintain a single source of truth for
 * enterprise-grade analytics settings used throughout the UI. This approach
 * promotes consistency, scalability, and maintainability across the platform.
 */

// -----------------------------------------------------------------------------
// Internal Imports - Referenced Types
// -----------------------------------------------------------------------------
import { MetricType } from '../types/analytics.types';

// -----------------------------------------------------------------------------
// Global Constants
// -----------------------------------------------------------------------------

/**
 * ANALYTICS_REFRESH_INTERVAL
 * --------------------------------------------------------------------------
 * Defines the default interval (in milliseconds) for refreshing analytics
 * data on the client side. Set to 5 minutes (300000 ms) to balance
 * near-real-time updates with performance overhead.
 */
export const ANALYTICS_REFRESH_INTERVAL = 300000;

/**
 * DEFAULT_TIME_RANGE
 * --------------------------------------------------------------------------
 * Establishes a default 30-day window for analytics queries and UI charts,
 * automatically setting the start date to 30 days prior to the current date
 * and the end date to the current date. This offers an immediate, relevant
 * snapshot of recent activities without additional user configuration.
 */
export const DEFAULT_TIME_RANGE = {
  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  end: new Date(),
};

// -----------------------------------------------------------------------------
// METRIC_THRESHOLDS
// -----------------------------------------------------------------------------
/**
 * METRIC_THRESHOLDS
 * --------------------------------------------------------------------------
 * Contains threshold definitions for multiple analytics metrics. These
 * thresholds guide visual indicators, alerts, and AI-driven recommendations
 * within the dashboard. Each metric's object defines parameters to highlight
 * warning, critical, or performance states.
 */
export const METRIC_THRESHOLDS = {
  /**
   * RESOURCE_UTILIZATION:
   * warning  - The utilization level above which usage should be monitored.
   * critical - The utilization level indicating a critical capacity concern.
   * target   - The optimal utilization level for maintaining high efficiency.
   */
  [MetricType.RESOURCE_UTILIZATION]: {
    warning: 0.75,
    critical: 0.9,
    target: 0.8,
  },

  /**
   * SPRINT_VELOCITY:
   * min     - The minimum acceptable velocity for a healthy sprint pace.
   * optimal - A recommended velocity for efficient delivery.
   * max     - A maximum velocity often indicating potential burnout or overcommitment.
   */
  [MetricType.SPRINT_VELOCITY]: {
    min: 10,
    optimal: 20,
    max: 30,
  },

  /**
   * TASK_COMPLETION_RATE:
   * low    - A completion rate below which intervention is recommended.
   * medium - A moderate completion rate suggesting opportunities for tuning.
   * high   - A high completion rate reflecting strong completion performance.
   */
  [MetricType.TASK_COMPLETION_RATE]: {
    low: 0.4,
    medium: 0.7,
    high: 0.9,
  },

  /**
   * TEAM_PRODUCTIVITY:
   * baseline    - A minimal baseline score to track initial performance.
   * target      - A planned benchmark aligned with typical team productivity.
   * exceptional - A distinguished level indicative of outstanding performance.
   */
  [MetricType.TEAM_PRODUCTIVITY]: {
    baseline: 50,
    target: 75,
    exceptional: 90,
  },
};

// -----------------------------------------------------------------------------
// TIME_RANGE_OPTIONS
// -----------------------------------------------------------------------------
/**
 * TIME_RANGE_OPTIONS
 * --------------------------------------------------------------------------
 * Enumerates preconfigured options for analytics time ranges. Each entry
 * provides:
 *   - value: A stable, programmatic key for referencing the range.
 *   - label: A user-friendly display name.
 *   - milliseconds: The duration in ms, when applicable.
 *
 * The CUSTOM option omits a defined duration, allowing users to specify
 * their own start and end times.
 */
export const TIME_RANGE_OPTIONS = {
  LAST_24_HOURS: {
    value: 'LAST_24_HOURS',
    label: 'Last 24 Hours',
    milliseconds: 24 * 60 * 60 * 1000,
  },
  LAST_7_DAYS: {
    value: 'LAST_7_DAYS',
    label: 'Last 7 Days',
    milliseconds: 7 * 24 * 60 * 60 * 1000,
  },
  LAST_30_DAYS: {
    value: 'LAST_30_DAYS',
    label: 'Last 30 Days',
    milliseconds: 30 * 24 * 60 * 60 * 1000,
  },
  LAST_90_DAYS: {
    value: 'LAST_90_DAYS',
    label: 'Last 90 Days',
    milliseconds: 90 * 24 * 60 * 60 * 1000,
  },
  CUSTOM: {
    value: 'CUSTOM',
    label: 'Custom Range',
  },
};

// -----------------------------------------------------------------------------
// CHART_COLORS
// -----------------------------------------------------------------------------
/**
 * CHART_COLORS
 * --------------------------------------------------------------------------
 * Theme-friendly palette used for chart visualizations. Each color set includes:
 *   - light:   A lighter shade suited for highlights or fill.
 *   - dark:    A deeper shade for emphasis or outlines.
 *   - contrast: A high-contrast variant for text or overlays.
 */
export const CHART_COLORS = {
  PRIMARY: {
    light: '#2563EB',
    dark: '#1D4ED8',
    contrast: '#FFFFFF',
  },
  SECONDARY: {
    light: '#64748B',
    dark: '#475569',
    contrast: '#FFFFFF',
  },
  SUCCESS: {
    light: '#10B981',
    dark: '#059669',
    contrast: '#FFFFFF',
  },
  WARNING: {
    light: '#F59E0B',
    dark: '#B45309',
    contrast: '#000000',
  },
  ERROR: {
    light: '#EF4444',
    dark: '#DC2626',
    contrast: '#FFFFFF',
  },
};

// -----------------------------------------------------------------------------
// METRIC_LABELS
// -----------------------------------------------------------------------------
/**
 * METRIC_LABELS
 * --------------------------------------------------------------------------
 * User-facing labels and longer descriptions for each metric type.
 * Facilitates text-based representation in the UI with support for
 * internationalization or future multi-language expansions.
 */
export const METRIC_LABELS = {
  [MetricType.RESOURCE_UTILIZATION]: {
    short: 'Util%',
    long: 'Resource Utilization',
    description:
      'Indicates the proportion of allocated resources currently in use, signaling capacity trends.',
  },
  [MetricType.SPRINT_VELOCITY]: {
    short: 'Velocity',
    long: 'Sprint Velocity',
    description:
      'Denotes the rate at which planned tasks are completed across sprints, reflecting team throughput.',
  },
  [MetricType.TASK_COMPLETION_RATE]: {
    short: 'TCR',
    long: 'Task Completion Rate',
    description:
      'Measures how many tasks are finished compared to the total assigned, highlighting execution effectiveness.',
  },
  [MetricType.TEAM_PRODUCTIVITY]: {
    short: 'Prod Score',
    long: 'Team Productivity',
    description:
      'Aggregates performance indicators like velocity and completion rates into an overall productivity measure.',
  },
};

// -----------------------------------------------------------------------------
// CHART_CONFIG
// -----------------------------------------------------------------------------
/**
 * CHART_CONFIG
 * --------------------------------------------------------------------------
 * Encapsulates robust chart configuration options, ensuring consistent
 * rendering, responsiveness, animation, and accessibility across all
 * analytics charts. These settings also enable flexible styling for
 * grid lines, tooltips, and multi-device layouts.
 */
export const CHART_CONFIG = {
  /**
   * Dimensions specify base width/height across mobile,
   * tablet, and desktop, supporting responsive chart layouts.
   */
  dimensions: {
    mobile: { width: 320, height: 240 },
    tablet: { width: 768, height: 480 },
    desktop: { width: 1024, height: 600 },
  },

  /**
   * Margins around the chart area to accommodate axes,
   * legends, titles, and any external labels.
   */
  margin: {
    top: 20,
    right: 20,
    bottom: 30,
    left: 40,
  },

  /**
   * Grid line styling for the chart background,
   * including color, opacity, and dash patterns.
   */
  gridLines: {
    color: '#CBD5E1',
    opacity: 0.5,
    dashArray: '3 3',
  },

  /**
   * Tooltip offset positions and additional class for styling
   * to enhance user feedback on data hover events.
   */
  tooltip: {
    offsetX: 10,
    offsetY: 10,
    className: 'chart-tooltip',
  },

  /**
   * Simple animation settings for transitions or
   * data updates, balancing performance and aesthetics.
   */
  animation: {
    duration: 400,
    easing: 'easeOutCubic',
  },

  /**
   * Accessibility features to announce new data changes
   * and visually describe the chart for screen readers.
   */
  accessibility: {
    announceNewData: true,
    describedBy: 'chart-description',
  },
};