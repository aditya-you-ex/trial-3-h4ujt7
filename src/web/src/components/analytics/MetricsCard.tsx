import React, {
  FC,
  useMemo,
  useCallback,
  useEffect,
  useState,
  useRef,
} from 'react'; // react@^18.0.0
import classNames from 'classnames'; // classnames@^2.3.2

// IE1: Internal imports - consistent with source file references.
import { Card, CardProps } from '../common/Card'; // Must use CardProps as defined in Card.tsx
import ProgressBar, {
  ProgressBarProps,
} from '../common/ProgressBar'; // Default export + named interface
import {
  MetricType,
  PerformanceMetric,
} from '../../types/analytics.types'; // For metric type definitions

/**
 * MetricsCardProps
 * ----------------------------------------------------------------------------
 * Represents the prop signature required by the MetricsCard component. This
 * interface is defined according to the JSON specification, ensuring we
 * address every property:
 *
 * - metric (PerformanceMetric): Core metric data, including value, threshold,
 *   and trend info (e.g., "increasing").
 * - className (string?): Optional CSS class for layout customizations.
 * - onClick ((): void)? : Click handler for drill-down or interaction.
 * - tooltipContent (React.ReactNode?): If provided, shows an informational
 *   tooltip or additional details about the metric.
 * - updateInterval (number?): Optional poll interval in milliseconds to
 *   refresh or re-check metric data in real time.
 * - ariaLabel (string?): Accessibility label for screen readers describing
 *   the purpose or content of the metrics card.
 */
export interface MetricsCardProps {
  /**
   * metric
   * -------------------------------------------------------------------------
   * The PerformanceMetric object containing numeric values (value, threshold),
   * a metric type (e.g., RESOURCE_UTILIZATION), and a trend descriptor
   * (string).
   */
  metric: PerformanceMetric;

  /**
   * className
   * -------------------------------------------------------------------------
   * Optional CSS class names to apply additional or overridden styles
   * on the card container.
   */
  className?: string;

  /**
   * onClick
   * -------------------------------------------------------------------------
   * Optional callback invoked when the card is clicked. This can be used
   * to navigate to a more detailed view or trigger additional interactions.
   */
  onClick?: () => void;

  /**
   * tooltipContent
   * -------------------------------------------------------------------------
   * If present, can display a tooltip or popover with extra info about
   * the metric, such as explanations or disclaimers.
   */
  tooltipContent?: React.ReactNode;

  /**
   * updateInterval
   * -------------------------------------------------------------------------
   * An integer (in ms) controlling how often the MetricsCard attempts to
   * refresh or recheck its data in real time.
   */
  updateInterval?: number;

  /**
   * ariaLabel
   * -------------------------------------------------------------------------
   * A textual descriptor for screen readers, enhancing accessibility by
   * articulating the content or purpose of this metric card.
   */
  ariaLabel?: string;
}

/**
 * getMetricVariant
 * ----------------------------------------------------------------------------
 * Determines the visual variant for the progress bar based on how metric
 * value compares to its threshold. This function is exported for potential
 * reuse, but is also memoized inside the component to avoid unnecessary
 * recalculations. The logic is as follows:
 *
 * 1. If value >= threshold, return 'success'
 * 2. Else if value >= threshold * 0.75, return 'warning'
 * 3. Else, return 'error'
 *
 * We expose 'default' as a fallback if needed, but the current logic
 * covers success, warning, and error states. The conjured result can be
 * used directly as a variant in the ProgressBar for color or styling cues.
 *
 * @param value - The numeric metric reading to evaluate.
 * @param threshold - The defined threshold or target for the metric.
 * @returns One of 'default', 'success', 'warning', or 'error' to reflect the state.
 */
export function getMetricVariant(
  value: number,
  threshold: number
): 'default' | 'success' | 'warning' | 'error' {
  // Memoizable logic; straightforward threshold checks:
  if (value >= threshold) {
    return 'success';
  }
  if (value >= threshold * 0.75) {
    return 'warning';
  }
  return 'error';
}

/**
 * formatMetricValue
 * ----------------------------------------------------------------------------
 * Formats the metric value for display. Handles:
 * - Locale-specific number formatting.
 * - Optional unit suffix based on MetricType (e.g., "%" for resource usage).
 * - Special case behaviors or rounding if needed.
 * - Basic accessibility considerations, e.g., ensuring string output is
 *   clear for screen readers.
 *
 * Steps:
 * 1) Check the metric type for custom formatting rules.
 * 2) Apply an Intl-based number formatter (e.g., 'en-US').
 * 3) Append any relevant suffix: for example, "%" for resource utilization.
 * 4) Return the final display string.
 *
 * @param value - The raw numeric metric value.
 * @param type - The MetricType enum specifying the category (RESOURCE_UTILIZATION, etc.).
 * @returns A human-readable, localized string representing the numeric data plus units.
 */
export function formatMetricValue(value: number, type: MetricType): string {
  // Create a standard locale-specific number formatter. In enterprise
  // contexts, we might detect user locale from an i18n solution or environment.
  const formatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
  });
  const formattedNumber = formatter.format(value);

  // Decide suffix or specialized formatting by metric type:
  switch (type) {
    case MetricType.RESOURCE_UTILIZATION: {
      // For resource utilization, we typically display as a percentage.
      return `${formattedNumber}%`;
    }
    case MetricType.SPRINT_VELOCITY: {
      // For sprint velocity, let's append 'sp' for 'story points' or
      // simply as an indicator of velocity speed.
      return `${formattedNumber} sp`;
    }
    default: {
      // For any other or future metric type, return the numeric string as-is.
      return formattedNumber;
    }
  }
}

/**
 * deriveFriendlyMetricTitle
 * ----------------------------------------------------------------------------
 * A small helper to derive a human-readable 'title' or label from the metric
 * type. This is purely for display convenience within the card header.
 *
 * @param type - The MetricType enumerator
 * @returns A readable string label (e.g., "Resource Utilization")
 */
function deriveFriendlyMetricTitle(type: MetricType): string {
  switch (type) {
    case MetricType.RESOURCE_UTILIZATION:
      return 'Resource Utilization';
    case MetricType.SPRINT_VELOCITY:
      return 'Sprint Velocity';
    case MetricType.TASK_COMPLETION_RATE:
      return 'Task Completion Rate';
    case MetricType.TEAM_PRODUCTIVITY:
      return 'Team Productivity';
    default:
      return 'Metric';
  }
}

/**
 * MetricsCard
 * ----------------------------------------------------------------------------
 * A reusable React component presenting a single metric's data in a formatted
 * card layout. It includes:
 * - A title derived from metric.type.
 * - Formatted numeric value and trend label.
 * - A ProgressBar visualization keyed off getMetricVariant.
 * - Optional tooltip, click handling, real-time updates, and accessibility.
 *
 * Enterprise-Grade Features & Implementation Details:
 * 1) We wrap the content in a base <Card> from ../common/Card, ensuring design
 *    system consistency.
 * 2) We memoize variant and formatted value to avoid spurious rerenders or
 *    recalculations on unrelated changes.
 * 3) With 'updateInterval', a component-level setInterval is used to simulate
 *    or trigger updates (could be replaced with an actual data fetch).
 * 4) Full A11y support via aria-label, role, and descriptive text for
 *    screen readers.
 * 5) OnClick handling for expansions, details, or any drill-down logic.
 */
export const MetricsCard: FC<MetricsCardProps> = React.memo(
  ({
    metric,
    className,
    onClick,
    tooltipContent,
    updateInterval,
    ariaLabel,
  }) => {
    /**
     * We maintain a local metric reference if we wanted to adjust
     * or re-fetch data in real time. This demonstration simply logs
     * an update attempt. In production, you might include an API call
     * or state management logic in this effect.
     */
    const [currentMetric, setCurrentMetric] = useState<PerformanceMetric>(
      metric
    );

    /**
     * If updateInterval is provided and > 0, we set up a timer that
     * periodically triggers. For a real system, you'd fetch or recalc
     * the updated metric data here. This is intentionally left open to
     * be integrated with an actual data source.
     */
    useEffect(() => {
      if (!updateInterval || updateInterval <= 0) return;
      const intervalId = setInterval(() => {
        // Enterprise placeholder logic:
        // e.g., setCurrentMetric(await fetchUpdatedMetric())
        // For now, we just log it:
        // eslint-disable-next-line no-console
        console.log(
          '[MetricsCard] updateInterval triggered - possible data refresh or re-fetch.'
        );
      }, updateInterval);

      return () => {
        clearInterval(intervalId);
      };
    }, [updateInterval]);

    /**
     * We memoize the progress bar variant once per metric value/threshold
     * update, preventing repeated computations. Under the hood, we use
     * getMetricVariant to compare metric.value with metric.threshold.
     */
    const progressVariant = useMemo(() => {
      return getMetricVariant(currentMetric.value, currentMetric.threshold);
    }, [currentMetric.value, currentMetric.threshold]);

    /**
     * We memoize a user-friendly numeric display with appended units or
     * suffixes as needed. This function leverages internal locale settings
     * or fallback rules for final rendering.
     */
    const displayedValue = useMemo(() => {
      return formatMetricValue(currentMetric.value, currentMetric.type);
    }, [currentMetric.value, currentMetric.type]);

    /**
     * We derive a simple textual label for the metric type (like "Resource
     * Utilization"). For advanced i18n, a dictionary or translation approach
     * could be employed.
     */
    const metricTitle = useMemo(() => {
      return deriveFriendlyMetricTitle(currentMetric.type);
    }, [currentMetric.type]);

    /**
     * We define a trend color or style if needed. For demonstration,
     * we handle "increasing", "decreasing", or any other arbitrary
     * trend string. If your data contains more nuanced options, adapt
     * the color logic here accordingly.
     */
    const trendColor = useMemo(() => {
      const t = currentMetric.trend.toLowerCase();
      if (t.includes('increase')) return '#10B981'; // success-like green
      if (t.includes('decrease')) return '#EF4444'; // error-like red
      return '#374151'; // neutral text color from design system
    }, [currentMetric.trend]);

    /**
     * CSS classes for the outer container, merging an optional className
     * with a card-specific reference for potential styling. The Card
     * itself also supports an interactive mode if onClick is provided.
     */
    const containerClasses = classNames('ts-metrics-card', className);

    /**
     * Render the final card structure:
     *  1) Outer <Card> with optional onClick (interactive).
     *  2) A header row containing the title (e.g., "Resource Utilization") and
     *     optional tooltip icon or content.
     *  3) A body region with the main numeric display, the trend label, and
     *     a progress bar computed from progressVariant.
     *  4) The entire region annotated with aria-labels for screen readers
     *     if provided by the parent.
     */
    return (
      <Card
        className={containerClasses}
        onClick={onClick}
        interactive={!!onClick}
        elevation="small"
        padding="medium"
      >
        {/* The outer region container can be given a role and aria-label. */}
        <div
          className="ts-metrics-card__content"
          role="region"
          aria-label={ariaLabel || 'Metrics Card'}
        >
          <div className="ts-metrics-card__header">
            <div className="ts-metrics-card__title">
              <strong>{metricTitle}</strong>
            </div>
            {tooltipContent && (
              <div className="ts-metrics-card__tooltip">
                {tooltipContent}
              </div>
            )}
          </div>
          <div className="ts-metrics-card__body">
            <div className="ts-metrics-card__main-value">
              <span className="ts-metrics-card__value">{displayedValue}</span>
              <span
                className="ts-metrics-card__trend"
                style={{ color: trendColor, marginLeft: '0.5rem' }}
              >
                {currentMetric.trend}
              </span>
            </div>
            <div className="ts-metrics-card__progress-bar">
              <ProgressBar
                value={currentMetric.value}
                max={currentMetric.threshold}
                variant={progressVariant}
                showLabel={false}
                animated={true}
                ariaLabel="Metric Progress Visualization"
              />
            </div>
          </div>
        </div>
      </Card>
    );
  }
);