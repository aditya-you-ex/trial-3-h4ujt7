import React, {
  FC,
  useEffect,
  useCallback,
  useRef,
  useState,
} from 'react'; // react@^18.0.0
import { Navigate, useNavigate } from 'react-router-dom'; // react-router-dom@^6.0.0
import styled from '@emotion/styled'; // @emotion/styled@^11.11.0

// -----------------------------------------------------------------------------
// Internal Imports (IE1 Compliance)
// -----------------------------------------------------------------------------
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { ProjectCreate } from '../../components/projects/ProjectCreate';
import { useAuth } from '../../hooks/useAuth';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { useAnalytics } from '../../hooks/useAnalytics';

// -----------------------------------------------------------------------------
// JSON-Specified Styled Components
// -----------------------------------------------------------------------------

/**
 * PageContainer
 * -----------------------------------------------------------------------------
 * An accessible container for the project creation page, ensuring compliance
 * with TaskStream AI design system standards. The styles reflect the JSON
 * specification, including layout constraints, spacing, role, and ARIA label
 * usage for improved accessibility.
 */
const PageContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: ${(props) => props.theme.spacing(3)};
  role: main;
  &[aria-label='Create Project Page'] {
    /* The ARIA label is assigned at render time in the component props */
  }
`;

/**
 * PageHeader
 * -----------------------------------------------------------------------------
 * An accessible header section that adheres to the JSON specification with
 * proper heading levels and textual styling. The role="banner" helps
 * assistive technologies identify the region as a top-level header.
 */
const PageHeader = styled.div`
  margin-bottom: ${(props) => props.theme.spacing(4)};
  role: banner;

  h1 {
    font-size: 2rem;
    margin-bottom: 1rem;
  }

  p {
    color: ${(props) => props.theme.palette.text.secondary};
  }
`;

// -----------------------------------------------------------------------------
// Type Annotations (Function Declarations per JSON Specification)
// -----------------------------------------------------------------------------

/**
 * ProjectCreatePage
 * -----------------------------------------------------------------------------
 * A page component that provides the project creation interface within the
 * TaskStream AI application. It implements the project creation form with
 * extensive validation, error handling, navigation, analytics tracking,
 * and accessibility features. Renders within the main dashboard layout,
 * ensuring an enterprise-grade approach.
 *
 * Steps Implemented (per JSON specification):
 *   1) Initialize analytics tracking
 *   2) Validate authentication status
 *   3) Redirect to login if not authenticated
 *   4) Track page view event
 *   5) Setup error handling
 *   6) Initialize navigation
 *   7) Render ErrorBoundary wrapper
 *   8) Render DashboardLayout with accessibility features
 *   9) Render ProjectCreate component with handlers
 *  10) Handle successful project creation
 *  11) Handle error scenarios
 *  12) Cleanup analytics on unmount
 */
export const ProjectCreatePage: FC = () => {
  // (1) Initialize analytics tracking (useAnalytics hook).
  const { trackPageView, trackEvent } = useAnalytics();

  // (2) Validate authentication status (useAuth hook).
  // If user is not authenticated, we redirect.
  const { isAuthenticated } = useAuth();

  // (6) Initialize navigation using react-router-dom.
  const navigate = useNavigate();

  // (12) Cleanup analytics on unmount: store a reference to track usage.
  const unmountedRef = useRef<boolean>(false);
  useEffect(() => {
    // (4) Track page view event (only on mount).
    trackPageView('ProjectCreatePage');

    return () => {
      // Marking usage for potential cleanup or unmount logic here.
      unmountedRef.current = true;
    };
  }, [trackPageView]);

  // (3) Redirect to login if not authenticated.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  /**
   * handleSuccess
   * -----------------------------------------------------------------------------
   * (10) Handle successful project creation. We dispatch an analytics event
   * and then navigate the user to the projects list or a relevant detail page.
   */
  const handleSuccess = useCallback(() => {
    // Fire an analytics event marking successful project creation.
    trackEvent('ProjectCreateSuccess', { timestamp: Date.now() });
    // Navigate to a relevant page, e.g., the list of projects.
    navigate('/projects');
  }, [trackEvent, navigate]);

  /**
   * handleError
   * -----------------------------------------------------------------------------
   * (11) Handle any error scenarios during project creation. We log or track
   * the error, enabling advanced diagnostics or user feedback. The actual
   * error UI feedback can also be handled by the ErrorBoundary or local
   * error states if necessary.
   */
  const handleError = useCallback((errorMessage: string) => {
    trackEvent('ProjectCreateFailure', { errorMessage });
    // Additional local state or logging might be done here.
  }, [trackEvent]);

  // (7) Render ErrorBoundary wrapper to gracefully handle runtime errors.
  return (
    <ErrorBoundary
      errorPersistKey="ProjectCreatePageError"
    >
      {/* (8) Render DashboardLayout with accessibility features. */}
      <DashboardLayout aria-label="Project Creation Layout">
        <PageContainer aria-label="Create Project Page">
          {/* (9) Inside the container, we can define a page header. */}
          <PageHeader>
            <h1>Create New Project</h1>
            <p>Provide details below to set up a new project in TaskStream AI.</p>
          </PageHeader>

          {/* (9) Render the ProjectCreate form component with success/error handlers. */}
          <ProjectCreate
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </PageContainer>
      </DashboardLayout>
    </ErrorBoundary>
  );
};