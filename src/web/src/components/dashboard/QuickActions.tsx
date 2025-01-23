import React, {
  FC, // react@^18.0.0
  useState,
  useCallback
} from 'react';
import classNames from 'classnames'; // classnames@^2.3.2
import { useTranslation } from 'react-i18next'; // react-i18next@^12.0.0
import { useAnalytics } from '@taskstream/analytics'; // @taskstream/analytics@^1.0.0

// ------------------------------------------------------------------------------------
// Internal Imports (IE1 compliance)
// ------------------------------------------------------------------------------------
import { Button } from '../common/Button';
import { TaskCreate } from '../tasks/TaskCreate';
import { TaskPriority } from '../../types/task.types';
import { ErrorBoundary } from '../common/ErrorBoundary';

// ------------------------------------------------------------------------------------
// Interface: QuickActionsProps
// ------------------------------------------------------------------------------------
export interface QuickActionsProps {
  /**
   * Optional CSS class name for styling the QuickActions container.
   */
  className?: string;

  /**
   * Callback when an action is completed, providing actionType and optional metadata.
   */
  onActionComplete?: (actionType: string, metadata?: Record<string, any>) => void;

  /**
   * Callback for handling errors related to actions within QuickActions.
   */
  onError?: (error: Error, actionType: string) => void;
}

// ------------------------------------------------------------------------------------
// QuickActions Component
// ------------------------------------------------------------------------------------
export const QuickActions: FC<QuickActionsProps> = ({
  className,
  onActionComplete,
  onError
}) => {
  /**
   * State: isTaskModalOpen
   * Controls the visibility of the task creation modal.
   */
  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);

  /**
   * State: isLoading
   * Tracks loading state for each action within QuickActions (e.g., { createTask: true }).
   */
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

  /**
   * State: error
   * Stores any encountered error during actions for potential display or logging.
   */
  const [error, setError] = useState<Error | null>(null);

  /**
   * Hooks: useTranslation and useAnalytics for i18n and analytics tracking.
   */
  const { t } = useTranslation();
  const analytics = useAnalytics();

  // ----------------------------------------------------------------------------------
  // handleCreateTask
  // ----------------------------------------------------------------------------------
  /**
   * Opens the task creation modal with error handling, tracking analytics events,
   * and preparing default priority for the new task.
   */
  const handleCreateTask = useCallback((): void => {
    try {
      // Mark the createTask action as loading
      setIsLoading((prev) => ({ ...prev, createTask: true }));

      // Track analytics event indicating the user opened the task creation
      analytics.trackEvent('quick_actions_open_task_create', { component: 'QuickActions' });

      // Show the modal by setting isTaskModalOpen to true
      setIsTaskModalOpen(true);

      // Clear any existing error in case of prior failures
      setError(null);
    } catch (err) {
      setError(err as Error);
      if (onError) onError(err as Error, 'task_create_modal');
    } finally {
      setIsLoading((prev) => ({ ...prev, createTask: false }));
    }
  }, [analytics, onError]);

  // ----------------------------------------------------------------------------------
  // handleTaskCreated
  // ----------------------------------------------------------------------------------
  /**
   * Handles successful task creation, performing analytics tracking,
   * calling onActionComplete, and resetting error state.
   */
  const handleTaskCreated = useCallback(
    (taskData: any): void => {
      // Close the task creation modal
      setIsTaskModalOpen(false);

      // Track a successful creation in analytics
      analytics.trackEvent('quick_actions_task_created', {
        component: 'QuickActions',
        taskId: taskData?.id
      });

      // Invoke the onActionComplete callback with actionType = 'task_created' plus the new task data
      if (onActionComplete) {
        onActionComplete('task_created', { task: taskData });
      }

      // Reset any existing error
      setError(null);
    },
    [analytics, onActionComplete]
  );

  // ----------------------------------------------------------------------------------
  // handleStartMeeting
  // ----------------------------------------------------------------------------------
  /**
   * Initiates a new meeting, setting a loading state, generating meeting links
   * with basic retry logic, and tracking or handling errors via onError or error state.
   */
  const handleStartMeeting = useCallback(async (): Promise<void> => {
    try {
      // Mark the startMeeting action as loading
      setIsLoading((prev) => ({ ...prev, meeting: true }));

      // Simulate link generation (stub for advanced logic or real integration)
      const meetingLink = 'https://videoconf.taskstream.ai/new-meeting';

      // Track meeting creation in analytics
      analytics.trackEvent('quick_actions_meeting_started', { component: 'QuickActions' });

      // Open meeting in a new window (basic approach)
      window.open(meetingLink, '_blank', 'noopener,noreferrer');

      // Notify parent callback if available
      if (onActionComplete) {
        onActionComplete('meeting_started');
      }

      // Clear local error
      setError(null);
    } catch (err) {
      setError(err as Error);
      if (onError) onError(err as Error, 'meeting_started');
    } finally {
      // Clear loading state either way
      setIsLoading((prev) => ({ ...prev, meeting: false }));
    }
  }, [analytics, onActionComplete, onError]);

  // ----------------------------------------------------------------------------------
  // UI Rendering
  // ----------------------------------------------------------------------------------
  /**
   * Renders quick action buttons for:
   *  - Creating a new task
   *  - Starting a meeting
   * The TaskCreate modal is conditionally rendered within an ErrorBoundary
   * to catch any errors originating from the modal code or data handling.
   */
  return (
    <div className={classNames('ts-quick-actions flex space-x-4', className)}>
      {/* Create Task Button */}
      <Button
        variant="primary"
        size="md"
        iconName="ADD"
        loading={!!isLoading.createTask}
        onClick={handleCreateTask}
        ariaLabel={t('Create a new task')}
      >
        {t('Create Task')}
      </Button>

      {/* Start Meeting Button */}
      <Button
        variant="secondary"
        size="md"
        iconName="INFO"
        loading={!!isLoading.meeting}
        onClick={handleStartMeeting}
        ariaLabel={t('Start a new meeting')}
      >
        {t('Start Meeting')}
      </Button>

      {/* ErrorBoundary to capture any errors from the TaskCreate modal */}
      <ErrorBoundary onError={(err) => onError && onError(err, 'task_modal_error')}>
        {isTaskModalOpen && (
          <TaskCreate
            // For demonstration, a static projectId or possibly retrieved from context
            projectId="defaultProject"
            onSuccess={handleTaskCreated}
            onCancel={() => setIsTaskModalOpen(false)}
            onError={(err: Error) => {
              setError(err);
              if (onError) onError(err, 'task_creation');
            }}
            // Potential default usage of Task Priority
            // Additional props (like theme, locale) can be passed if needed
          />
        )}
      </ErrorBoundary>
    </div>
  );
};