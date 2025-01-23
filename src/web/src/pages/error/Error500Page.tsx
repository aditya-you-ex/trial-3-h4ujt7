import React, { FC, useCallback, useEffect, useRef } from 'react'; // react@^18.0.0
import { useNavigate } from 'react-router-dom'; // react-router-dom@^6.0.0
import { useAnalytics } from '@taskstream/analytics'; // @taskstream/analytics@^1.0.0
import { ErrorTracker } from '@taskstream/error-tracking'; // @taskstream/error-tracking@^1.0.0

// ----------------------------------------------------------------------------
// Internal Imports
// ----------------------------------------------------------------------------
import { MainLayout } from '../../components/layout/MainLayout';
import { ErrorState } from '../../components/common/ErrorState';

// ----------------------------------------------------------------------------
// Type Definitions (Local to This File)
// ----------------------------------------------------------------------------

/**
 * ErrorAnalytics
 * ---------------------------------------------------------------------------
 * Represents an interface for capturing enhanced analytics data related to
 * error occurrences, user context, and any additional metadata to be sent
 * to external tracking services. Expand as needed for your analytics platform.
 */
interface ErrorAnalytics {
  /**
   * The unique identifier of the error event or category for metrics.
   */
  eventId?: string;

  /**
   * Additional key-value pairs for attribute-based reporting.
   */
  attributes?: Record<string, unknown>;

  /**
   * Timestamp or custom date markers could be included here.
   */
  timestamp?: Date;
}

// ----------------------------------------------------------------------------
// Error500Page Component Definition
// ----------------------------------------------------------------------------

/**
 * Error500Page
 * ----------------------------------------------------------------------------
 * A React functional component that displays a 500 Internal Server Error page.
 * Implements enhanced error tracking, analytics, WCAG 2.1 AA accessibility,
 * and standardized error visualization following TaskStream AI's design system.
 *
 * Requirements Addressed:
 *  1) User Interface Design (6.7 Component States): Presents a consistent
 *     error message and visual indicators for server errors, aligned with
 *     the design system.
 *  2) Error Handling (3.1.2 Component Library): Offers a centralized
 *     500-page handling with integrated error tracking and analytics for
 *     server-side failures.
 *  3) Accessibility (3.1.1 Design System Specifications): Ensures form
 *     labeling, ARIA attributes, focus management, and screen reader
 *     compatibility for the error message content.
 *
 * Constructor Steps (Inside Functional Implementation):
 *  1) Initialize component
 *  2) Set up navigation hook
 *  3) Initialize error tracking
 *  4) Configure analytics
 *  5) Set up retry handler
 *  6) Configure accessibility features
 */
export const Error500Page: FC = () => {
  // --------------------------------------------------------------------------
  // (1) + (2) Initialize component & set up navigation hook
  // --------------------------------------------------------------------------
  const navigate = useNavigate();

  // --------------------------------------------------------------------------
  // (3) Initialize error tracking (via a mutable ref to preserve instance)
  // --------------------------------------------------------------------------
  const errorTrackerRef = useRef<ErrorTracker | null>(null);

  // --------------------------------------------------------------------------
  // (4) Configure analytics hook from @taskstream/analytics
  // --------------------------------------------------------------------------
  const analytics = useAnalytics();

  // --------------------------------------------------------------------------
  // Lifecycle: On mount, create an ErrorTracker instance and track the error
  // --------------------------------------------------------------------------
  useEffect(() => {
    // Initialize the tracker if not already
    if (!errorTrackerRef.current) {
      errorTrackerRef.current = new ErrorTracker();
    }

    // trackErrorOccurrence function as described in JSON specification
    // Steps:
    //  1) Log error details to tracking service
    //  2) Send error analytics data
    //  3) Record user context if available
    //  4) Track error timestamp and frequency
    trackErrorOccurrence({
      code: 'E_INTERNAL_SERVER',
      message: '500 Internal Server Error',
      details: { path: '/500' },
      stack: undefined,
      timestamp: new Date(),
    });
  }, []);

  // --------------------------------------------------------------------------
  // (5) Set up retry handler with enterprise-level detail
  // --------------------------------------------------------------------------
  /**
   * handleRetry
   * --------------------------------------------------------------------------
   * Called when users attempt to reload the page following a 500 error.
   * Completes the steps described in the JSON specification:
   *   1) Track retry attempt in analytics
   *   2) Log error retry event
   *   3) Navigate to the previous page using history
   *   4) If no history exists, navigate to dashboard
   *   5) Reset error state if applicable
   */
  const handleRetry = useCallback((): void => {
    // (1) Track retry attempt in analytics
    analytics.trackEvent('Error500Page_Retry', { category: 'Errors' });

    // (2) Log error retry event via custom error tracker
    if (errorTrackerRef.current) {
      errorTrackerRef.current.logEvent('RetryClicked', {
        errorCode: 500,
        path: '/500',
      });
    }

    // (3) Attempt to navigate back in history
    // If cannot go back, default to home/dashboard
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      // (4) No history, navigate to dashboard (or primary route)
      navigate('/');
    }

    // (5) (Optional) Reset error state if we kept it in higher-level store
  }, [analytics, navigate]);

  // --------------------------------------------------------------------------
  // Function: trackErrorOccurrence
  // --------------------------------------------------------------------------
  /**
   * trackErrorOccurrence
   * --------------------------------------------------------------------------
   * Tracks a newly encountered 500 error in analytics and error monitoring
   * systems. Follows the steps enumerated in the JSON specification.
   *
   * @param error - The error object containing code, message, stack, etc.
   */
  const trackErrorOccurrence = useCallback(
    (error: { code: string; message: string; details: Record<string, unknown>; stack?: string; timestamp: Date }) => {
      // (1) Log error details to the tracking service
      if (errorTrackerRef.current) {
        errorTrackerRef.current.logError(error.code, {
          message: error.message,
          details: error.details,
          stack: error.stack,
          occurredAt: error.timestamp,
        });
      }

      // (2) Send error analytics data using the analytics hook
      analytics.trackEvent('ErrorOccurred', {
        category: 'Errors',
        label: error.code,
        value: 1,
        meta: error.details,
      });

      // (3) Record user context if available (the analytics hook might hold user info)
      // E.g., const userContext = analytics.getUserContext();

      // (4) Track error timestamp and frequency:
      // Additional logic could be implemented to store frequency counters
    },
    [analytics]
  );

  // --------------------------------------------------------------------------
  // (6) Configure accessibility features for the render
  // --------------------------------------------------------------------------
  // Proper ARIA roles and attributes will be used in the returned JSX.

  // --------------------------------------------------------------------------
  // Render: Enhanced 500 Error Page
  //       1) Wrap in MainLayout
  //       2) Provide ARIA attributes
  //       3) Render ErrorState with code=500, error message, analytics data
  //       4) Pass handleRetry
  //       5) Ensure keyboard navigation
  // --------------------------------------------------------------------------
  return (
    <MainLayout>
      <section
        aria-label="500 Internal Server Error Section"
        role="region"
        tabIndex={-1}
        style={{
          // Additional styling patterns if needed
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          marginTop: '40px',
        }}
      >
        <ErrorState
          /* This prop representation aligns with the JSON specification:
             - error:        "ErrorResponse | string"
             - onRetry:      function
             - errorCode:    number
             - analyticsData: ErrorAnalytics
          */
          error={{
            code: 'E_INTERNAL_SERVER',
            message: 'Oops! Something went wrong on our end.',
            details: { info: 'Server responded with 500' },
            stack: undefined,
            timestamp: new Date(),
          }}
          onRetry={handleRetry}
          errorCode={500}
          analyticsData={{
            eventId: '500-page-internal-error',
            attributes: { severity: 'critical' },
            timestamp: new Date(),
          }}
        />
      </section>
    </MainLayout>
  );
};