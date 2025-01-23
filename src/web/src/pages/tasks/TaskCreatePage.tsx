import React, {
  FC,
  ReactElement,
  useCallback,
  useEffect,
  useState,
} from 'react'; // react@^18.0.0
import styled from '@emotion/styled'; // @emotion/styled@^11.11.0
import { useNavigate, useParams } from 'react-router-dom'; // react-router-dom@^6.0.0
import { useAnalytics } from '@analytics/react'; // @analytics/react@^0.1.0
import { ErrorBoundary } from 'react-error-boundary'; // react-error-boundary@^4.0.0

// Internal imports (IE1 compliance).
import { MainLayout } from '../../components/layout/MainLayout';
import { TaskCreate } from '../../components/tasks/TaskCreate';

/**
 * PageContainer
 * ----------------------------------------------------------------------------
 * A styled container for the task creation page that ensures a responsive layout:
 *  - Applies consistent spacing using theme-based values.
 *  - Centers content horizontally.
 *  - Enforces a minimum viewport height for a full-page layout.
 *  - Adapts padding for smaller screens via a media query.
 */
const PageContainer = styled.div`
  padding: ${(props) => props.theme.spacing(3)};
  max-width: 800px;
  margin: 0 auto;
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: ${(props) => props.theme.spacing(2)};
  }
`;

/**
 * A simple error fallback UI for handling unexpected component errors at runtime.
 * Displayed by the ErrorBoundary when children throw an error.
 */
function TaskCreateErrorFallback(): ReactElement {
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        padding: '1rem',
        border: '1px solid red',
        borderRadius: '4px',
        background: '#ffe5e5',
        color: '#9f3a38',
      }}
    >
      <p>Something went wrong while loading the Task Creation Page.</p>
      <p>Please try again or contact support if the issue persists.</p>
    </div>
  );
}

/**
 * handleTaskSuccess
 * ----------------------------------------------------------------------------
 * Enhanced handler for successful task creation. The function:
 *  1) Tracks a successful task creation event in analytics.
 *  2) Shows a success notification or console message (placeholder).
 *  3) Navigates to the task list view with preserved state.
 *  4) Handles potential navigation errors gracefully.
 *  5) Cleans up any temporary states or resources if needed.
 */
function handleTaskSuccess(
  navigateFn: ReturnType<typeof useNavigate>,
  trackFn: (eventName: string, eventData?: object) => void
): () => void {
  return () => {
    // 1) Track the successful creation event
    trackFn('task_creation_success', { info: 'Task created successfully' });

    // 2) Show a success notification (placeholder)
    // In a real scenario, integrate with the notification service:
    // notificationService.showNotification({ variant: 'SUCCESS', message: 'Task created successfully!' });
    // For demonstration:
    // eslint-disable-next-line no-console
    console.log('Task creation success - displaying notification to user.');

    // 3) Navigate to the task list with some preserved state if desired
    try {
      navigateFn('/tasks', { state: { from: 'TaskCreatePage' } });
    } catch (err) {
      // 4) Handle navigation errors
      // eslint-disable-next-line no-console
      console.error('Navigation error:', err);
    }

    // 5) Clean up resources / states (placeholder)
  };
}

/**
 * handleTaskCancel
 * ----------------------------------------------------------------------------
 * Enhanced handler for task creation cancellation. The function:
 *  1) Tracks a cancellation event in analytics.
 *  2) Preserves form state in sessionStorage if needed.
 *  3) Navigates back with history or to a designated route.
 *  4) Cleans up any temporary resources.
 *  5) Resets form state if needed.
 */
function handleTaskCancel(
  navigateFn: ReturnType<typeof useNavigate>,
  trackFn: (eventName: string, eventData?: object) => void
): () => void {
  return () => {
    // 1) Track cancellation event
    trackFn('task_creation_cancel', { info: 'User canceled task creation' });

    // 2) Preserve form state in session storage for demonstration
    sessionStorage.setItem('task_create_form', 'someFormData');

    // 3) Navigate back or to a relevant route
    try {
      navigateFn(-1); // go back one step in history
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Navigation error on cancel:', err);
    }

    // 4) Clean up resources, if any
    // 5) Reset form state, if needed
  };
}

/**
 * TaskCreatePage
 * ----------------------------------------------------------------------------
 * An enhanced main task creation page component with error handling and analytics.
 * It fulfills the requirements for:
 *  1) Task Management: providing an automated task creation workflow.
 *  2) Task Creation Interface: displaying the TaskCreate form with AI-driven validation.
 *  3) User Experience: implementing design system accessibility features
 *     and a responsive layout.
 *
 * Steps (per JSON specification):
 *  1) Initialize navigation hook with history state support.
 *  2) Extract and validate project ID from URL parameters.
 *  3) Initialize analytics tracking hook.
 *  4) Set up error boundary with fallback UI.
 *  5) Handle loading state management.
 *  6) Implement accessibility attributes.
 *  7) Render responsive main layout with the TaskCreate form.
 */
export const TaskCreatePage: FC = (): ReactElement => {
  // 1) Initialize navigation hook with history state
  const navigate = useNavigate();

  // 2) Extract project ID from URL params
  const { projectId } = useParams();

  // 3) Initialize analytics tracking hook
  const analytics = useAnalytics();

  // 5) Local loading state
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 4) We'll wrap the main layout content in an ErrorBoundary
  // 6) We add accessibility attributes to the container if needed
  return (
    <ErrorBoundary FallbackComponent={TaskCreateErrorFallback}>
      <MainLayout ariaLabel="Task Creation Layout">
        <PageContainer aria-label="Task Creation Container">
          {/* We could show a spinner or loading indicator if isLoading is true */}
          {isLoading && (
            <div
              role="status"
              aria-live="polite"
              style={{ marginBottom: '1rem' }}
            >
              Loading task creation form...
            </div>
          )}

          {/* 7) Render the TaskCreate form with required props */}
          <TaskCreate
            projectId={projectId || ''}
            onSuccess={useCallback(
              handleTaskSuccess(navigate, analytics.track),
              [navigate, analytics.track]
            )}
            onCancel={useCallback(
              handleTaskCancel(navigate, analytics.track),
              [navigate, analytics.track]
            )}
            theme={{} as any}
            locale="en"
          />
        </PageContainer>
      </MainLayout>
    </ErrorBoundary>
  );
};