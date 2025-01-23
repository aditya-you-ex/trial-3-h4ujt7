import React, {
  useEffect,
  useCallback,
  useRef,
  useState,
  memo,
  useMemo,
} from 'react'; // ^18.0.0
import { useForm, SubmitHandler, FormProvider } from 'react-hook-form'; // ^7.45.0
import { debounce } from 'lodash'; // ^4.17.21

// -----------------------------------------------------------------------------
// Internal Imports (IE1) - Types and Services
// -----------------------------------------------------------------------------
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskUpdateInput,
} from '../../types/task.types';
import NotificationService from '../../services/notification.service';
import ResourceAnalytics from '../../services/analytics.service';

// -----------------------------------------------------------------------------
// Local Type Declarations
// -----------------------------------------------------------------------------

/**
 * TaskEditProps
 * -----------------------------------------------------------------------------
 * Props interface for the TaskEdit component with enhanced functionality:
 *  - taskId: string (ID of the task to edit)
 *  - onClose(): callback when edit modal is closed
 *  - onSuccess(task: Task): callback when task is successfully updated
 *  - autoSave: boolean (whether to enable auto-save)
 *  - collaborationEnabled: boolean (whether real-time collaboration is enabled)
 */
export interface TaskEditProps {
  taskId: string;
  onClose: () => void;
  onSuccess: (updatedTask: Task) => void;
  autoSave: boolean;
  collaborationEnabled: boolean;
}

/**
 * withErrorBoundary
 * -----------------------------------------------------------------------------
 * Higher-order component to wrap TaskEdit in an error boundary for graceful error handling.
 * This is a placeholder for demonstration; a real implementation would catch errors
 * and display a fallback UI.
 */
function withErrorBoundary<P>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function WithErrorBoundaryWrapper(props: P) {
    // In a real environment, this might use React Error Boundaries or a custom approach.
    // For demonstration: simple try-catch removed since React requires a class for real boundaries.
    return <Component {...props} />;
  };
}

/**
 * withAnalytics
 * -----------------------------------------------------------------------------
 * Higher-order component to wrap TaskEdit in analytics tracking logic.
 * This is a placeholder; a real implementation might measure render times or user interactions.
 */
function withAnalytics<P>(
  Component: React.ComponentType<P>
): React.ComponentType<P> {
  return function WithAnalyticsWrapper(props: P) {
    // For demonstration, we simply render the component without additional logic.
    return <Component {...props} />;
  };
}

// -----------------------------------------------------------------------------
// Custom Hook: useAutoSave
// -----------------------------------------------------------------------------

/**
 * useAutoSave
 * -----------------------------------------------------------------------------
 * A custom hook for handling auto-save functionality with a debounced approach.
 *
 * Steps:
 *  1. Debounce the save function to avoid firing on every keystroke.
 *  2. Track whether the form data is dirty and determine when to trigger saves.
 *  3. Handle any save errors gracefully and notify if problems occur.
 *  4. Update a 'lastSaved' timestamp for user feedback.
 *  5. Clean up the debounced function on unmount.
 *
 * @param saveFn - An async function that performs the actual save operation.
 * @param debounceMs - Number of milliseconds to debounce before triggering the save.
 * @returns An object containing:
 *  - triggerSave: Function to manually force save if needed.
 *  - lastSaved: Date or undefined to indicate the last time data was successfully saved.
 *  - savingError: Any error encountered while saving (or undefined).
 *  - isSaving: Boolean indicating if a save is in progress.
 */
function useAutoSave(
  saveFn: (data: TaskUpdateInput) => Promise<void>,
  debounceMs: number
) {
  const [lastSaved, setLastSaved] = useState<Date | undefined>(undefined);
  const [savingError, setSavingError] = useState<Error | undefined>(undefined);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const saveFunctionRef = useRef<(...args: any[]) => void>(() => undefined);

  // Create a stable debounced function that calls saveFn with the latest data.
  const debouncedSave = useMemo(() => {
    return debounce(async (data: TaskUpdateInput) => {
      try {
        setIsSaving(true);
        setSavingError(undefined);
        await saveFn(data);
        setLastSaved(new Date());
      } catch (err: any) {
        setSavingError(err);
      } finally {
        setIsSaving(false);
      }
    }, debounceMs);
  }, [saveFn, debounceMs]);

  // Cleanup the debounced function on unmount to avoid memory leaks.
  useEffect(() => {
    saveFunctionRef.current = debouncedSave;
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  // A direct call for manual saves outside the auto-save flow.
  const triggerSave = useCallback(
    async (updateInput: TaskUpdateInput) => {
      debouncedSave.cancel(); // Cancel any pending auto-saves
      try {
        setIsSaving(true);
        setSavingError(undefined);
        await saveFn(updateInput);
        setLastSaved(new Date());
      } catch (err: any) {
        setSavingError(err);
      } finally {
        setIsSaving(false);
      }
    },
    [debouncedSave, saveFn]
  );

  return {
    triggerSave,
    lastSaved,
    savingError,
    isSaving,
  };
}

// -----------------------------------------------------------------------------
// Main Component: TaskEdit
// -----------------------------------------------------------------------------

/**
 * TaskEditBase
 * -----------------------------------------------------------------------------
 * Base, unwrapped component for editing an existing task in the TaskStream AI platform.
 * Provides:
 *  - Real-time form validation using react-hook-form
 *  - Optional auto-save with debounce
 *  - Real-time collaboration (if enabled) via WebSocket
 *  - Analytics tracking upon successful updates
 *  - Accessibility with ARIA attributes and keyboard navigation
 *
 * Technical Steps followed:
 *  1. Initialize react-hook-form with default values and validation rules.
 *  2. If collaborationEnabled, establish a WebSocket for real-time updates or concurrency handling.
 *  3. Fetch task details by taskId and populate the form, handle loading states.
 *  4. If autoSave is enabled, set up the useAutoSave hook with a debounced approach.
 *  5. Provide onSubmit logic for final/manual saves if autoSave is false.
 *  6. On successful update, call onSuccess(updatedTask) and track analytics.
 *  7. Display notifications using NotificationService, show success or error as needed.
 *  8. Clean up resources (e.g., WebSocket) on component unmount.
 *  9. Render an accessible form with appropriate ARIA labels and roles.
 */
function TaskEditBase(props: TaskEditProps) {
  const {
    taskId,
    onClose,
    onSuccess,
    autoSave,
    collaborationEnabled,
  } = props;

  // ---------------------------------------------------------------------------
  // Local State & References
  // ---------------------------------------------------------------------------
  const [taskData, setTaskData] = useState<Task | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [collabSocket, setCollabSocket] = useState<WebSocket | null>(null);

  // Notification and analytics references
  const notificationServiceRef = useRef(new NotificationService({}));
  const analyticsRef = useRef(ResourceAnalytics);

  // ---------------------------------------------------------------------------
  // React Hook Form Setup
  // ---------------------------------------------------------------------------
  const methods = useForm<TaskUpdateInput>({
    mode: 'onChange',
    // Default values are empty or placeholders until the actual task is fetched.
    defaultValues: {
      title: '',
      description: '',
      status: TaskStatus.BACKLOG,
      priority: TaskPriority.MEDIUM,
      assigneeId: '',
      dueDate: new Date(),
      estimatedHours: 0,
      actualHours: 0,
    },
  });

  const {
    handleSubmit,
    reset,
    watch,
    formState: { isDirty, errors },
  } = methods;

  // ---------------------------------------------------------------------------
  // Auto-Save Hook
  // ---------------------------------------------------------------------------
  // We'll define the saving logic that calls an imaginary updateTask API.
  const saveFn = useCallback(
    async (data: TaskUpdateInput) => {
      // Example placeholder: Call API or repository to save updates
      // In a real scenario, we'd do something like:
      // const updatedTask = await taskService.updateTask(taskId, data);
      // We'll assume success for demonstration:

      // For demonstration, convert the partial update into a Task structure mock:
      if (taskData) {
        const now = new Date();
        const updated: Task = {
          ...taskData,
          title: data.title,
          description: data.description,
          status: data.status,
          priority: data.priority,
          assigneeId: data.assigneeId,
          dueDate: data.dueDate,
          // Simulate a 'lastModified' or 'metadata.version' update if relevant
          // We'll just pretend we have a lastModified at the top level
          // (even though in the real definition it might be in metadata).
          // The JSON specification expects lastModified, version usage at some level.
          // We'll store them in the object for demonstration:
          // @ts-expect-error: We simulate these fields as the spec demands
          lastModified: now,
          // @ts-expect-error
          version: (taskData as any).version ? (taskData as any).version + 1 : 1,
        };
        setTaskData(updated);

        // Fire analytics tracking for updated tasks if the real service has such a method:
        try {
          analyticsRef.current.trackTaskUpdate(updated);
        } catch {
          // No-op if the method doesn't exist in the snippet, but included per JSON spec
        }

        // Show success notification (or handle errors)
        notificationServiceRef.current.showNotification({
          variant: 'SUCCESS',
          message: 'Task updated successfully',
        });
        onSuccess(updated);
      }
    },
    [taskData, onSuccess]
  );

  const { triggerSave, lastSaved, savingError, isSaving } = useAutoSave(
    saveFn,
    800
  );

  // ---------------------------------------------------------------------------
  // Form Submission (Manual Save) Handler
  // ---------------------------------------------------------------------------
  const onSubmit: SubmitHandler<TaskUpdateInput> = async (data) => {
    try {
      // Force a save outside the debounced flow
      await triggerSave(data);
    } catch (err: any) {
      notificationServiceRef.current.showNotification({
        variant: 'ERROR',
        message: err?.message || 'Failed to save task',
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Collaboration Setup (if enabled)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let socket: WebSocket | null = null;
    if (collaborationEnabled) {
      // Example placeholder, real endpoint would vary
      socket = new WebSocket(`wss://collab.taskstream.ai/tasks/${taskId}`);
      setCollabSocket(socket);

      socket.onopen = () => {
        // Possibly notify or join a collab session
      };
      socket.onerror = (error) => {
        notificationServiceRef.current.showNotification({
          variant: 'ERROR',
          message: `Collaboration error: ${JSON.stringify(error)}`,
        });
      };
      socket.onmessage = (event) => {
        // Example: handle inbound data for real-time updates or conflict resolution
        // We might parse event.data here and reconcile changes
      };
    }
    return () => {
      // Cleanup
      if (socket) {
        socket.close();
      }
    };
  }, [collaborationEnabled, taskId]);

  // ---------------------------------------------------------------------------
  // Fetch Task Data
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    async function fetchTask() {
      try {
        // Example placeholder: fetch via an API or service
        // Here we'll mock a fake existing task
        const mockFetchedTask: Task = {
          id: taskId,
          projectId: 'fakeProject',
          title: 'Mock Task Title',
          description: 'Initial mock description...',
          status: TaskStatus.IN_PROGRESS,
          priority: TaskPriority.HIGH,
          assigneeId: 'user123',
          dueDate: new Date(Date.now() + 86400000), // tomorrow
          estimatedHours: 4,
          actualHours: 1,
          source: 'MANUAL',
          aiMetadata: {
            confidence: 0.9,
            extractedFrom: '',
            entities: [],
            keywords: [],
          },
          analytics: {
            resourceId: 'user123',
            utilization: 0.75,
            allocatedHours: 4,
            actualHours: 2,
            efficiency: 0.5,
          },
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'admin',
            updatedBy: 'admin',
            version: 1,
          },
        };

        if (isMounted) {
          setTaskData(mockFetchedTask);
          reset({
            title: mockFetchedTask.title,
            description: mockFetchedTask.description,
            status: mockFetchedTask.status,
            priority: mockFetchedTask.priority,
            assigneeId: mockFetchedTask.assigneeId,
            dueDate: mockFetchedTask.dueDate,
            estimatedHours: mockFetchedTask.estimatedHours,
            actualHours: mockFetchedTask.actualHours,
          });
          setLoading(false);
        }
      } catch (err: any) {
        notificationServiceRef.current.showNotification({
          variant: 'ERROR',
          message: err?.message || 'Failed to fetch task data',
        });
        setLoading(false);
      }
    }
    fetchTask();
    return () => {
      isMounted = false;
    };
  }, [taskId, reset]);

  // ---------------------------------------------------------------------------
  // Auto-Save Effect
  // ---------------------------------------------------------------------------
  // If autoSave is enabled, watch form changes and call debounced save
  useEffect(() => {
    if (!taskData || !autoSave) return;
    const subscription = watch((values) => {
      if (isDirty) {
        // Fire debounced auto-save
        triggerSave(values);
      }
    });
    return () => subscription.unsubscribe();
  }, [isDirty, watch, autoSave, taskData, triggerSave]);

  // ---------------------------------------------------------------------------
  // Render Functions
  // ---------------------------------------------------------------------------
  const renderLoading = () => {
    return (
      <div aria-busy="true" role="progressbar" style={{ padding: '1rem' }}>
        Loading task data, please wait...
      </div>
    );
  };

  const renderForm = () => {
    return (
      <form
        onSubmit={handleSubmit(onSubmit)}
        aria-label="Task Edit Form"
        style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
      >
        {/* Title Field */}
        <label htmlFor="title" aria-label="Task Title">
          Title (required)
        </label>
        <input
          id="title"
          type="text"
          {...methods.register('title', { required: true })}
          aria-invalid={errors.title ? 'true' : 'false'}
        />
        {errors.title && (
          <span role="alert" style={{ color: 'red' }}>
            Title is required
          </span>
        )}

        {/* Description Field */}
        <label htmlFor="description" aria-label="Task Description">
          Description
        </label>
        <textarea
          id="description"
          {...methods.register('description')}
          aria-invalid={errors.description ? 'true' : 'false'}
        />
        {errors.description && (
          <span role="alert" style={{ color: 'red' }}>
            {errors.description.message}
          </span>
        )}

        {/* Status Field */}
        <label htmlFor="status" aria-label="Task Status">
          Status
        </label>
        <select id="status" {...methods.register('status')}>
          {Object.values(TaskStatus).map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>

        {/* Priority Field */}
        <label htmlFor="priority" aria-label="Task Priority">
          Priority
        </label>
        <select id="priority" {...methods.register('priority')}>
          {Object.values(TaskPriority).map((pr) => (
            <option key={pr} value={pr}>
              {pr}
            </option>
          ))}
        </select>

        {/* Assignee Field */}
        <label htmlFor="assigneeId" aria-label="Task Assignee">
          Assignee
        </label>
        <input
          id="assigneeId"
          type="text"
          {...methods.register('assigneeId', { required: false })}
        />

        {/* Due Date Field */}
        <label htmlFor="dueDate" aria-label="Task Due Date">
          Due Date
        </label>
        <input
          id="dueDate"
          type="date"
          {...methods.register('dueDate', {
            // For demonstration, we parse date strings in onSubmit.
          })}
        />

        {/* Estimated Hours Field */}
        <label htmlFor="estimatedHours" aria-label="Estimated Hours">
          Estimated Hours
        </label>
        <input
          id="estimatedHours"
          type="number"
          step="0.5"
          {...methods.register('estimatedHours')}
        />

        {/* Actual Hours Field */}
        <label htmlFor="actualHours" aria-label="Actual Hours">
          Actual Hours
        </label>
        <input
          id="actualHours"
          type="number"
          step="0.5"
          {...methods.register('actualHours')}
        />

        {/* Display last saved info if relevant */}
        {autoSave && (
          <div aria-live="polite" style={{ fontSize: '0.85rem' }}>
            {isSaving
              ? 'Auto-saving...'
              : lastSaved
              ? `Last auto-save: ${lastSaved.toLocaleTimeString()}`
              : 'No changes saved yet.'}
            {savingError && (
              <span style={{ color: 'red', marginLeft: '1rem' }}>
                Error: {savingError.message}
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {!autoSave && (
          <button type="submit" aria-label="Save Task Changes">
            Save
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Task Edit Form"
        >
          Close
        </button>
      </form>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  if (loading) {
    return renderLoading();
  }

  return (
    <FormProvider {...methods}>
      <div
        role="region"
        aria-labelledby="task-edit-form"
        style={{ padding: '1rem', border: '1px solid #ccc' }}
      >
        <h2 id="task-edit-form">Edit Task</h2>
        {renderForm()}
      </div>
    </FormProvider>
  );
}

// -----------------------------------------------------------------------------
// Wrap with Decorators: React.memo -> withErrorBoundary -> withAnalytics
// -----------------------------------------------------------------------------
export const TaskEdit = withAnalytics(withErrorBoundary(memo(TaskEditBase)));