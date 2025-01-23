import React, { useEffect, FC, useCallback } from 'react'; // react@^18.0.0
import { useNavigate } from 'react-router-dom'; // react-router-dom@^6.0.0
import analytics from '@analytics/react'; // ^0.1.0

/*
  --------------------------------------------------------------------------------
  Internal Imports (IE1 compliance)
  --------------------------------------------------------------------------------
  - MainLayout: The main application layout wrapper with responsive behavior.
  - ErrorState: Error display component with screen reader support for enhanced
    accessibility and clear error messaging.
  - Button: A primary action button component following the design system,
    supporting variant="primary", onClick, ariaLabel, and so forth.
*/
import { MainLayout } from '../../components/layout/MainLayout';
import { ErrorState } from '../../components/common/ErrorState';
import { Button } from '../../components/common/Button';

/**
 * trackErrorOccurrence
 * -----------------------------------------------------------------------------
 * Tracks a 404 error occurrence to analytics and logs it for monitoring. Based
 * on the JSON specification, this function:
 *   1. Calls the analytics trackError function with error details.
 *   2. Logs the error occurrence for monitoring or debugging.
 *
 * @param path - The string representing the route path that triggered the 404.
 */
function trackErrorOccurrence(path: string): void {
  // Step 1: Call analytics or specific error tracking function:
  // This can be adapted as needed to the analytics library's actual API.
  analytics?.track?.('not_found_error', {
    path,
    description: '404 page not found',
    severity: 'warning',
  });

  // Step 2: Log error occurrence for system monitoring or debugging.
  // This consoles an error for local dev, but in production, it'd be replaced
  // with a robust logging pipeline or external monitoring service.
  // eslint-disable-next-line no-console
  console.error(`[404 Not Found Error] Attempted path: ${path}`);
}

/**
 * handleNavigateHome
 * -----------------------------------------------------------------------------
 * Navigates the user back to the home/dashboard page and reports a navigation
 * event to analytics. Fulfills JSON specification steps:
 *   1. Track navigation event
 *   2. Invoke navigate to root '/'
 *
 * No parameters, no return value.
 */
function handleNavigateHome(navigate: ReturnType<typeof useNavigate>): void {
  // (1) Track navigation
  analytics?.track?.('navigate_home', {
    message: 'User clicked Return Home on 404 page',
  });

  // (2) Use React Router's navigate to go to the root path
  navigate('/');
}

/**
 * Error404Page
 * -----------------------------------------------------------------------------
 * A production-ready React Functional Component that displays a user-friendly 404
 * error message using TaskStream AI's design system. It addresses the following:
 *   - Renders an ErrorState with accessible 404 info.
 *   - Wraps content in MainLayout for consistent layout structure.
 *   - Provides a button to navigate home (handleNavigateHome).
 *   - Tracks error occurrence on component mount (trackErrorOccurrence).
 *   - Follows design system specs for spacing, color, and responsive design.
 *   - Implements enhanced accessibility with ARIA roles and labeling.
 *   - Integrates analytics for error and navigation tracking.
 */
export const Error404Page: FC = () => {
  const navigate = useNavigate();

  /* --------------------------------------------------------------------------
     On mount, track the 404 error occurrence. For path, we can reference the
     browser location to identify which route was not found.
     -------------------------------------------------------------------------- */
  useEffect(() => {
    const currentPath = window.location.pathname || '/unknown';
    trackErrorOccurrence(currentPath);
  }, []);

  /* --------------------------------------------------------------------------
     A callback for returning the user to the home page. We wrap it in useCallback
     for potential performance benefits, though it's likely trivial in small pages.
     -------------------------------------------------------------------------- */
  const onReturnHome = useCallback(() => {
    handleNavigateHome(navigate);
  }, [navigate]);

  /* --------------------------------------------------------------------------
     Render the main layout and the localized error state. The role="region"
     ensures screen readers can easily identify this critical error area,
     and the ARIA attributes are used to comply with WCAG 2.1 AA guidelines.
     -------------------------------------------------------------------------- */
  return (
    <MainLayout>
      <div
        role="region"
        aria-label="404 Error Region"
        className="ts-error-404-wrapper"
        style={{ margin: '0 auto', maxWidth: 600, padding: '2rem' }}
      >
        <ErrorState
          error="The page you are looking for does not exist."
          title="Page Not Found (404)"
          className="mb-4"
          role="alert"
        />
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <Button
            variant="primary"
            onClick={onReturnHome}
            ariaLabel="Return to Home Page"
            size="md"
          >
            Return Home
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};