import React, {
  FC,
  useCallback,
  useEffect,
  useRef,
  useState,
  KeyboardEvent,
  MouseEvent,
} from 'react'; // react@^18.0.0
import classNames from 'classnames'; // classnames@^2.3.2
import { useInView } from 'react-intersection-observer'; // react-intersection-observer@^9.0.0

// Internal imports (per IE1 compliance)
import { Card } from '../common/Card';
import {
  PredictiveInsights as PredictiveDataModel, // from src/web/src/types/analytics.types
} from '../../types/analytics.types';
import { analyticsService } from '../../services/analytics.service'; // Enhanced service with subscription & feedback

/**
 * -----------------------------------------------------------------------------
 * Local Type Definitions
 * -----------------------------------------------------------------------------
 * The JSON specification references item and feedback types that may not be
 * explicitly present in "analytics.types.ts". We define them here to fulfill
 * the schema-based requirements for interactive insights and feedback.
 */

/**
 * Represents a single AI-derived insight item (e.g., a bottleneck) displayed
 * in the Predictive Insights component. This interface is used to type the
 * "items" array in the renderInsightSection function.
 */
export interface InsightItem {
  id: string;
  title: string;
  description?: string;
  severity?: 'low' | 'medium' | 'high';
}

/**
 * Represents a single recommendation. The JSON specification indicates a
 * separate type for recommendations. This interface models that concept.
 */
export interface RecommendationItem {
  id: string;
  message: string;
  actionLink?: string;
  priority?: 'high' | 'medium' | 'low';
}

/**
 * Represents a single risk factor. The JSON specification references a type
 * for risk items, which we define here to handle advanced risk data.
 */
export interface RiskItem {
  id: string;
  factor: string;
  severity?: 'low' | 'medium' | 'high';
  description?: string;
}

/**
 * Represents a single metric within the predictive insights. The JSON
 * specification references a type for metrics, which we define here.
 */
export interface MetricItem {
  id: string;
  name: string;
  value: number;
  trend?: 'up' | 'down' | 'steady';
  unit?: string;
}

/**
 * Represents feedback that a user submits about a particular insight or
 * recommendation. Matches the JSON specification references to “onFeedbackSubmit.”
 */
export interface InsightFeedback {
  itemId: string;
  rating: number; // e.g., 1-5 star rating or similar
  comments?: string;
}

/**
 * The JSON specification’s PredictiveInsightsProps interface describing the
 * props accepted by our React component. This ensures the component can:
 *  - Accept a timeRange for fetching insights
 *  - Optionally accept a custom CSS class name
 *  - Optionally accept an onInsightClick callback
 *  - Optionally accept an onFeedbackSubmit callback
 *  - Optionally accept a refreshInterval for real-time updates
 */
export interface PredictiveInsightsProps {
  /**
   * A TimeRange object that defines the start and end dates for which
   * predictive insights should be fetched and displayed.
   */
  timeRange: {
    startDate: Date;
    endDate: Date;
    duration?: number; // The JSON specification references “TimeRange,” often includes duration
  };

  /**
   * An optional CSS class supplemented into the container, enabling layout
   * or style overrides beyond the default appearance.
   */
  className?: string;

  /**
   * An optional callback triggered when a user clicks on an individual
   * "InsightItem" (e.g., a bottleneck) within the rendered section. This
   * allows parent components or pages to handle custom interactions.
   */
  onInsightClick?: (insight: InsightItem) => void;

  /**
   * An optional callback triggered when users submit feedback on a specific
   * insight item, facilitating continuous improvement of AI suggestions.
   */
  onFeedbackSubmit?: (feedback: InsightFeedback) => void;

  /**
   * An optional refresh interval (in milliseconds). If provided, the component
   * will set up a real-time subscription or periodic refetch to keep the
   * displayed insights up-to-date.
   */
  refreshInterval?: number;
}

/**
 * -----------------------------------------------------------------------------
 * useInsights - A custom hook to fetch and manage predictive insights data
 * -----------------------------------------------------------------------------
 * This hook addresses the JSON specification steps in detail:
 *  1. Initialize component states for insights, loading, and error.
 *  2. Optionally check local or external cache (not fully implemented here) for existing data.
 *  3. Create an effect to fetch insights whenever `timeRange` changes.
 *  4. If `refreshInterval` is provided, set up a real-time subscription or polling.
 *  5. Provide a feedback submission handler that delegates to analyticsService.
 *  6. Handle loading and error states with minimal retry logic.
 *  7. Cache or store successful responses locally.
 *  8. Clean up subscription on unmount.
 *  9. Return insights data, loading state, error info, refresh function, and feedback function.
 */
export function useInsights(
  timeRange: { startDate: Date; endDate: Date },
  refreshInterval?: number
): {
  insights: PredictiveDataModel | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
  submitFeedback: (feedback: InsightFeedback) => void;
} {
  // 1. Initialize local state for insights, loading status, and error.
  const [insights, setInsights] = useState<PredictiveDataModel | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // A reference to store any real-time subscription or polling handle for unsubscribing
  const subscriptionRef = useRef<() => void>();

  /**
   * 4. Real-time updates or polling function:
   * If the backend supports “subscribeToInsights” for push-based updates, we
   * store the unsubscribe function in subscriptionRef. Otherwise, if we rely on
   * polling, we might set an interval that calls “refresh()” periodically.
   */
  const activateRealTimeSubscription = useCallback(() => {
    // If the method is available, set up subscription.
    // Example usage, ignoring actual details:
    subscriptionRef.current = analyticsService.subscribeToInsights(
      timeRange,
      (updated: PredictiveDataModel) => {
        setInsights(updated);
        setError(null);
      },
      (err: Error) => {
        setError(err);
      }
    );
  }, [timeRange]);

  /**
   * 5. Implement feedback submission handler. This delegates to the
   * “analyticsService.submitInsightFeedback” and updates local UI states
   * if relevant.
   */
  const submitFeedback = useCallback(
    async (feedback: InsightFeedback) => {
      try {
        await analyticsService.submitInsightFeedback(feedback);
        // Optionally refresh or update local state if needed
      } catch (err) {
        // Provide minimal error handling for demonstration
        setError(err as Error);
      }
    },
    []
  );

  /**
   * A function to explicitly refetch the predictive insights from the service
   * on demand. This is used in both the initialization effect and any user-
   * triggered refresh flows.
   */
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsService.getPredictiveInsights(timeRange);
      setInsights(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  /**
   * 3. Create an effect to fetch insights whenever timeRange changes.
   * For brevity, we do not implement a local or external cache here, but
   * the specification references possible usage of cached data.
   */
  useEffect(() => {
    refresh();
    // Cleanup old subscription if present
    if (subscriptionRef.current) {
      subscriptionRef.current();
    }
    // 4. Set up subscription or polling if refreshInterval is provided
    if (refreshInterval && refreshInterval > 0) {
      // For demonstration, we show push-based subscription usage:
      activateRealTimeSubscription();
    }
    // 8. Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current();
      }
    };
  }, [activateRealTimeSubscription, refresh, refreshInterval, timeRange]);

  // 9. Return the relevant data and callbacks
  return {
    insights,
    loading,
    error,
    refresh,
    submitFeedback,
  };
}

/**
 * -----------------------------------------------------------------------------
 * renderInsightSection - Utility for rendering a list of insights
 * -----------------------------------------------------------------------------
 * The JSON specification details the steps:
 *  1. Render section title with accessibility attributes
 *  2. Set up intersection observer for progressive loading
 *  3. Map through items array (optionally with virtualization for large sets)
 *  4. Render each item with interactive elements
 *  5. Implement feedback submission forms or buttons if needed
 *  6. Apply click handlers and animations
 *  7. Add error boundaries for unexpected rendering errors
 *  8. Implement keyboard navigation
 *  9. Add ARIA labels and roles
 *
 * For brevity, partial steps are demonstrated, but we heavily document each step.
 */
export function renderInsightSection(
  title: string,
  items: InsightItem[],
  onItemClick?: (insight: InsightItem) => void,
  onFeedbackSubmit?: (feedback: InsightFeedback) => void
): JSX.Element {
  // 1. The parent container can be a Card or a semantic section
  // We also incorporate accessibility attributes: role="region" + aria-label
  const { ref, inView } = useInView({
    threshold: 0.1, // 2. Intersection observer for progressive loading or lazy rendering
  });

  // We track a local piece of state to demonstrate partial progressive loading
  const [visibleCount, setVisibleCount] = useState<number>(10);

  // If inView changes, we can show more items, emulating deep virtualization
  useEffect(() => {
    if (inView && visibleCount < items.length) {
      setVisibleCount((prev) => Math.min(prev + 10, items.length));
    }
  }, [inView, items.length, visibleCount]);

  return (
    <section
      className="ts-predictive-section"
      role="region"
      aria-label={`Insight Section: ${title}`}
    >
      {/* Title with accessibility attributes */}
      <h2 tabIndex={0} aria-level={2}>
        {title}
      </h2>

      {/* 3. Partial virtualization by limiting items to visibleCount */}
      {items.slice(0, visibleCount).map((item) => (
        <Card
          key={item.id}
          className="ts-insight-item"
          elevation="small"
          interactive
          onClick={() => {
            // 6. Click handler (and possible keyboard entry)
            if (onItemClick) {
              onItemClick(item);
            }
          }}
          onKeyPress={(evt: KeyboardEvent<HTMLDivElement>) => {
            // 8. Keyboard support for accessibility
            if (
              (evt.key === 'Enter' || evt.key === ' ') &&
              onItemClick
            ) {
              evt.preventDefault();
              onItemClick(item);
            }
          }}
        >
          <div
            className="ts-insight-details"
            role="article"
            aria-label={`Insight details for item: ${item.title}`}
          >
            <strong>{item.title}</strong>
            {item.severity && (
              <span className={`severity-badge severity-${item.severity}`}>
                {item.severity} severity
              </span>
            )}
            {item.description && <p>{item.description}</p>}
          </div>
          {onFeedbackSubmit && (
            <button
              type="button"
              className="ts-feedback-btn"
              aria-label="Submit feedback for this insight"
              onClick={(e: MouseEvent<HTMLButtonElement>) => {
                e.stopPropagation();
                onFeedbackSubmit({
                  itemId: item.id,
                  rating: 5, // Example rating
                });
              }}
            >
              Submit Feedback
            </button>
          )}
        </Card>
      ))}

      {/* 2. Intersection observer sentinel for progressive loading */}
      <div ref={ref} style={{ height: '1px' }} />
    </section>
  );
}

/**
 * -----------------------------------------------------------------------------
 * PredictiveInsights - Main React Component
 * -----------------------------------------------------------------------------
 * The primary UI for displaying AI-generated predictive insights, including:
 *  - Bottlenecks
 *  - Recommendations
 *  - Risk factors
 *  - Metrics
 * Features real-time updates, interactive elements, feedback functionalities,
 * accessibility enhancements, and performance optimizations via progressive
 * loading with Intersection Observer.
 */
export const PredictiveInsights: FC<PredictiveInsightsProps> = ({
  timeRange,
  className,
  onInsightClick,
  onFeedbackSubmit,
  refreshInterval,
}) => {
  /**
   * Utilize the custom hook "useInsights" to load or subscribe to
   * the latest predictive insights for the given time range. This
   * includes AI-driven bottlenecks, recommendations, risk factors,
   * and metrics.
   */
  const { insights, loading, error, refresh, submitFeedback } = useInsights(
    {
      startDate: timeRange.startDate,
      endDate: timeRange.endDate,
    },
    refreshInterval
  );

  // Prepare a composite class name using classNames utility
  const rootClass = classNames('ts-predictive-insights', className);

  /**
   * A small helper to wrap a feedback submission call from child sections
   * with the same signature. If the parent does not provide an onFeedbackSubmit
   * callback, we still call the analytics service's function to store feedback.
   */
  const handleFeedbackSubmit = (feedback: InsightFeedback) => {
    // Always call the hook's method to store feedback
    submitFeedback(feedback);
    // Optionally bubble up to the parent's callback if provided
    if (onFeedbackSubmit) onFeedbackSubmit(feedback);
  };

  // Render the main content. If loading, we can show a spinner. If error, show error state.
  // Otherwise, display the sections for bottlenecks, recommendations, riskFactors, and metrics.
  return (
    <div className={rootClass}>
      {/* Handle loading and error states per enterprise-grade patterns */}
      {loading && <div className="ts-loading-spinner">Loading insights...</div>}
      {error && (
        <div className="ts-error-message" role="alert" aria-live="assertive">
          {`An error occurred: ${error.message}`}
        </div>
      )}

      {/* Refresh button for manual reload, demonstrating an explicit user action */}
      <button type="button" onClick={refresh} className="ts-refresh-button">
        Refresh Insights
      </button>

      {/* Once data is loaded, we can display the insights if available */}
      {insights && (
        <div className="ts-insights-container">
          {/* 
            The JSON specification references 'bottlenecks', 'recommendations',
            'riskFactors', and 'metrics' within the PredictiveInsights object.
            We pass them into specialized rendering sections.
          */}

          {insights.bottlenecks && insights.bottlenecks.length > 0 && (
            <>
              {renderInsightSection(
                'Bottlenecks',
                insights.bottlenecks, // typed as InsightItem[] in JSON spec
                onInsightClick,
                handleFeedbackSubmit
              )}
            </>
          )}

          {insights.recommendations && insights.recommendations.length > 0 && (
            <section
              className="ts-recommendations"
              role="region"
              aria-label="Recommendations Section"
            >
              <h2 tabIndex={0}>Recommendations</h2>
              {insights.recommendations.map((rec) => (
                <Card
                  key={rec.id}
                  className="ts-recommendation-item"
                  elevation="small"
                  interactive
                  onClick={() => {
                    // If the parent provided an on item click for insights, we do not have
                    // a perfect match in type, but we can unify or skip. For demonstration,
                    // skip calling `onInsightClick` or cast if desired. This is a separate type.
                  }}
                >
                  <strong>{rec.message}</strong>
                  {rec.actionLink && (
                    <a
                      href={rec.actionLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ts-recommendation-action-link"
                    >
                      Action
                    </a>
                  )}
                  {onFeedbackSubmit && (
                    <button
                      type="button"
                      className="ts-feedback-btn"
                      aria-label="Submit feedback for this recommendation"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFeedbackSubmit({
                          itemId: rec.id,
                          rating: 5, // placeholder rating
                        });
                      }}
                    >
                      Submit Feedback
                    </button>
                  )}
                </Card>
              ))}
            </section>
          )}

          {insights.riskFactors && insights.riskFactors.length > 0 && (
            <section
              className="ts-risk-factors"
              role="region"
              aria-label="Risk Factors Section"
            >
              <h2 tabIndex={0}>Risk Factors</h2>
              {insights.riskFactors.map((risk) => (
                <Card
                  key={risk.id}
                  className="ts-risk-item"
                  elevation="small"
                  interactive
                >
                  <div
                    className="ts-risk-item-details"
                    role="article"
                    aria-label={`Risk factor details: ${risk.factor}`}
                  >
                    <strong>{risk.factor}</strong>
                    {risk.severity && (
                      <span className={`risk-severity-${risk.severity}`}>
                        {risk.severity} severity
                      </span>
                    )}
                    {risk.description && <p>{risk.description}</p>}
                  </div>
                  {onFeedbackSubmit && (
                    <button
                      type="button"
                      className="ts-feedback-btn"
                      onClick={() =>
                        handleFeedbackSubmit({
                          itemId: risk.id,
                          rating: 3, // placeholder
                        })
                      }
                    >
                      Provide Feedback
                    </button>
                  )}
                </Card>
              ))}
            </section>
          )}

          {insights.metrics && insights.metrics.length > 0 && (
            <section
              className="ts-insights-metrics"
              role="region"
              aria-label="Metrics Section"
            >
              <h2 tabIndex={0}>Metrics</h2>
              <div className="ts-metrics-list">
                {insights.metrics.map((metric) => (
                  <Card
                    key={metric.id}
                    className="ts-metric-item"
                    elevation="small"
                  >
                    <div
                      className="ts-metric-details"
                      role="article"
                      aria-label={`Metric: ${metric.name}`}
                    >
                      <strong>{metric.name}</strong>
                      <div className="ts-metric-value">
                        {metric.value}
                        {metric.unit && <span> {metric.unit}</span>}
                      </div>
                      {metric.trend && (
                        <span className={`trend-${metric.trend}`}>
                          Trend: {metric.trend}
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};