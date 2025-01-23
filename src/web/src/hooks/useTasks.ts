import { useState, useEffect, useCallback, useRef } from 'react';

// (IE2) External imports with version comments:
// useDebounce@^9.0.0
import { useDebounce } from 'use-debounce';
// react-error-boundary@^4.0.0
import { useErrorBoundary } from 'react-error-boundary';

// (IE1) Internal imports:
import { Task, TaskStatus, TaskMetadata } from '../types/task.types'; // Provides the Task interface with id, title, status, metadata
import { useWebSocket } from '../hooks/useWebSocket'; // Real-time updates via WebSocket
import { useAnalytics } from '../hooks/useAnalytics'; // Analytics tracking for task operations

/***********************************************************************************************
 * Types & Interfaces
 ***********************************************************************************************/

/**
 * Represents configuration options for the query or filtering mechanism used by the hook.
 * Demonstrates potential filtering or retrieval parameters. Customize as needed for your domain.
 */
interface TaskQueryOptions {
  projectId?: string;
  includeArchived?: boolean;
  filterStatus?: TaskStatus[];
  // Additional query fields can be placed here
}

/**
 * Configuration parameters for establishing a WebSocket connection.
 * Ties in with the useWebSocket hook (wsConfig argument).
 */
interface WebSocketConfig {
  url: string;
  token?: string;
  // Additional real-time config fields can be placed here
}

/**
 * Represents a domain-specific error object for tasks, including code and message.
 * This structure is aligned with the requirement to handle errors in a robust, typed manner.
 */
interface TaskError {
  code: string;
  message: string;
}

/**
 * Encapsulates task-specific analytics data, possibly derived from the useAnalytics hook
 * or from server-provided insights. Extend or adjust as needed for deeper analytics usage.
 */
interface TaskAnalytics {
  taskCount: number;
  // Additional fields can be included (e.g., completionsByDay, averageCompletionTime, etc.)
}

/**
 * Describes possible synchronization statuses between the client and the server.
 * This is helpful for real-time updates and offline/online transitions.
 */
export type SyncStatus = 'IDLE' | 'SYNCING' | 'ERROR';

/**
 * The object shape returned by the useTasks hook, providing comprehensive
 * task management capabilities including local states, error info, analytics,
 * and synchronization indicators.
 */
interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: TaskError | null;
  isOnline: boolean;
  analytics: TaskAnalytics;
  syncStatus: SyncStatus;
}

/***********************************************************************************************
 * Hook: useTasks
 * ---------------------------------------------------------------------------------------------
 * Provides a custom React hook delivering extensive functionality for managing tasks with
 * real-time updates, caching, error handling, analytics, cross-tab sync, and offline support.
 *
 * Steps Implemented According to JSON Specification:
 *  1) Initialize Redux dispatch and enhanced state selectors (replaced here with local states).
 *  2) Set up WebSocket connection for real-time updates.
 *  3) Initialize analytics tracking (useAnalytics).
 *  4) Set up error boundary integration (useErrorBoundary).
 *  5) Configure cache management with persistence (local storage or in-memory).
 *  6) Implement debounced task refresh mechanism.
 *  7) Set up cross-tab synchronization via BroadcastChannel or storage events.
 *  8) Initialize offline support capabilities.
 *  9) Implement enhanced error handling with retries.
 * 10) Set up performance monitoring placeholders.
 * 11) Return enhanced task management interface (tasks, loading, error, isOnline, analytics, syncStatus).
 ***********************************************************************************************/
export function useTasks(
  options: TaskQueryOptions = {},
  wsConfig: WebSocketConfig = { url: '' }
): UseTasksReturn {
  /*********************************************************************************************
   * 1) Initialize local states for tasks, loading, error, and other aspects
   *    that typically might come from Redux or a global store, but here we store them locally
   *    to demonstrate an independent approach.
   *********************************************************************************************/
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<TaskError | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('IDLE');

  /**
   * The analytics hook reference, providing relevant metrics and insights
   * for tasks. This can be used to track user interactions or advanced reporting.
   */
  const { /* destructure additional fields if needed */ } = useAnalytics();
  const [analytics, setAnalytics] = useState<TaskAnalytics>({ taskCount: 0 });

  /**
   * The error boundary context from react-error-boundary, used for
   * advanced error handling and capturing. We can show a fallback UI
   * or track error logs.
   */
  const { showBoundary } = useErrorBoundary();

  // (LD2) In a Redux scenario, we might do: const dispatch = useDispatch();

  /**
   * A ref storing the number of retry attempts for enhanced error handling.
   */
  const retryAttemptsRef = useRef<number>(0);

  /*********************************************************************************************
   * 2) Set up WebSocket connection for real-time updates
   *    Using the useWebSocket hook to manage a stable connection. If wsConfig.url
   *    is provided, we connect and handle inbound messages for tasks.
   *********************************************************************************************/
  const {
    isConnected,
    sendMessage,
    connect: connectWs,
    disconnect: disconnectWs,
    errors: wsErrors,
  } = useWebSocket(wsConfig.url ? wsConfig : { ...wsConfig, autoConnect: false });

  /**
   * If a wsConfig.url is specified, automatically connect to WebSocket
   * for real-time updates upon mount.
   */
  useEffect(() => {
    if (wsConfig.url) {
      connectWs().catch((err) => {
        setError({ code: 'WS_CONNECT_ERROR', message: String(err) });
      });
    }
    return () => {
      disconnectWs();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wsConfig.url]);

  /**
   * Example inbound message handler: handle real-time updates to tasks.
   * In a real scenario, you might parse message types, apply updates,
   * or handle partial modifications to the tasks array.
   */
  useEffect(() => {
    if (!isConnected) return;

    // Example placeholder: normally we'd do something like webSocketServiceRef.current.addMessageHandler
    // For demonstration, we might manually handle a hypothetical "TASK_UPDATE" event.
    // The useWebSocket hook would typically allow message subscription.
  }, [isConnected]);

  /*********************************************************************************************
   * 3) Initialize analytics tracking
   *    We rely on the useAnalytics hook. For demonstration, we might fetch or
   *    compute analytics data from it, then store that in local state.
   *********************************************************************************************/
  const updateAnalytics = useCallback(() => {
    try {
      // For demonstration, simulate setting some basic analytics about tasks
      setAnalytics((prev) => ({
        ...prev,
        taskCount: tasks.length,
      }));
    } catch (err: any) {
      setError({ code: 'ANALYTICS_ERROR', message: err.message });
    }
  }, [tasks]);

  useEffect(() => {
    updateAnalytics();
  }, [tasks, updateAnalytics]);

  /*********************************************************************************************
   * 4) Set up error boundary integration
   *    We can attempt to catch critical errors and pass them to react-error-boundary's showBoundary.
   *    If a severe error arises, we call showBoundary to display a fallback UI and track logs.
   *********************************************************************************************/
  const handleCriticalError = useCallback(
    (err: TaskError) => {
      showBoundary(new Error(`[Critical Task Error: ${err.code}] ${err.message}`));
    },
    [showBoundary]
  );

  useEffect(() => {
    // If there's a scenario that triggers a critical condition, we call handleCriticalError.
    // Example: a certain code like 'FATAL_TASK_ERROR'
    if (error && error.code === 'FATAL_TASK_ERROR') {
      handleCriticalError(error);
    }
  }, [error, handleCriticalError]);

  /*********************************************************************************************
   * 5) Configure cache management with persistence
   *    We'll demonstrate a minimal approach using localStorage to keep tasks
   *    consistent across sessions. In more advanced usage, we might rely on
   *    indexDB or a dedicated caching solution.
   *********************************************************************************************/
  const CACHE_KEY = 'useTasks_cache_items';

  const loadCache = useCallback(() => {
    try {
      const data = localStorage.getItem(CACHE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as Task[];
        setTasks(parsed);
      }
    } catch (err: any) {
      setError({ code: 'CACHE_LOAD_ERROR', message: err.message });
    }
  }, []);

  const saveCache = useCallback(
    (items: Task[]) => {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(items));
      } catch (err: any) {
        setError({ code: 'CACHE_SAVE_ERROR', message: err.message });
      }
    },
    [setError]
  );

  useEffect(() => {
    // load tasks from cache on mount
    loadCache();
  }, [loadCache]);

  useEffect(() => {
    // whenever tasks array changes, persist them
    saveCache(tasks);
  }, [tasks, saveCache]);

  /*********************************************************************************************
   * 6) Implement debounced task refresh mechanism
   *    We'll define a function that might fetch tasks from a server or re-check
   *    local changes. Then we use useDebounce to control how often that function is triggered.
   *********************************************************************************************/
  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setSyncStatus('SYNCING');

    // (LD2) Example fetch logic. In practice, we might call an API or a Redux action.
    // We'll simulate a success scenario with a short delay for demonstration:

    try {
      retryAttemptsRef.current = 0; // reset if a success occurs
      await new Promise((resolve) => setTimeout(resolve, 800)); // simulate async
      // Example: updated tasks from server or domain logic
      const pseudoTasks: Task[] = [
        {
          id: '1',
          title: 'Create Project Structure',
          status: TaskStatus.IN_PROGRESS,
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'alice',
            updatedBy: 'alice',
          } as unknown as TaskMetadata,
          // various other fields omitted for brevity
        },
        {
          id: '2',
          title: 'Setup CI/CD Pipeline',
          status: TaskStatus.TODO,
          metadata: {
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: 'bob',
            updatedBy: 'bob',
          } as unknown as TaskMetadata,
        },
      ];
      setTasks(pseudoTasks);
      setError(null);
    } catch (err: any) {
      setError({ code: 'FETCH_ERROR', message: err.message });
    } finally {
      setLoading(false);
      setSyncStatus('IDLE');
    }
  }, []);

  // useDebounce hook usage:
  // note that useDebounce returns [debouncedFunction, cancelFunction]
  const [debouncedRefresh] = useDebounce(fetchTasks, 1000);

  // If we want to re-fetch tasks on certain triggers:
  useEffect(() => {
    if (options.projectId) {
      // e.g., re-fetch tasks for a new project
      debouncedRefresh();
    }
  }, [options.projectId, debouncedRefresh]);

  /*********************************************************************************************
   * 7) Set up cross-tab synchronization
   *    We'll demonstrate using the BroadcastChannel API to keep multiple tabs
   *    in sync with the same tasks. If any tab updates tasks, the others can reflect that.
   *********************************************************************************************/
  useEffect(() => {
    const bc = new BroadcastChannel('useTasksChannel');

    // When a message is received from another tab, we update local tasks
    bc.onmessage = (event) => {
      if (event.data && event.data.type === 'TASKS_UPDATED') {
        if (Array.isArray(event.data.payload)) {
          setTasks(event.data.payload);
        }
      }
    };

    // Whenever tasks change locally, broadcast to other tabs
    bc.postMessage({ type: 'TASKS_UPDATED', payload: tasks });

    return () => {
      bc.close();
    };
  }, [tasks]);

  /*********************************************************************************************
   * 8) Initialize offline support capabilities
   *    We track the user's online/offline status using the browser's events and
   *    store that in isOnline. This can facilitate later logic like queueing updates.
   *********************************************************************************************/
  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /*********************************************************************************************
   * 9) Implement enhanced error handling with retries
   *    We'll integrate a minimal approach. If fetchTasks fails, we attempt a few more times.
   *    For demonstration, a local approach is used; in practice, we might rely on
   *    an external library or a Redux thunk with built-in retries.
   *********************************************************************************************/
  const attemptRetry = useCallback(async () => {
    if (retryAttemptsRef.current >= 3) {
      return; // do not exceed 3 attempts
    }
    retryAttemptsRef.current += 1;
    await fetchTasks();
  }, [fetchTasks]);

  useEffect(() => {
    if (error && error.code === 'FETCH_ERROR') {
      // Attempt to retry the fetch if we fail
      attemptRetry().catch((err) => {
        // If repeated fails, we keep error as is or show a boundary
        setError({ code: 'FATAL_TASK_ERROR', message: err.message });
      });
    }
  }, [error, attemptRetry]);

  /*********************************************************************************************
   * 10) Set up performance monitoring
   *    For demonstration, we'll log the time it takes to mount and do a naive measure.
   *    In a real scenario, we might use performance.mark or third-party monitoring.
   *********************************************************************************************/
  useEffect(() => {
    const start = performance.now();
    // Simulate we do some heavy lifting on mount
    const timeSpent = performance.now() - start;
    // eslint-disable-next-line no-console
    console.log(`[Performance] useTasks mount took ${timeSpent.toFixed(2)} ms`);
  }, []);

  /*********************************************************************************************
   * 11) Return the enhanced task management interface
   *    Expose the tasks, a loading flag, error object, online status,
   *    analytics data, and a syncStatus to track real-time or offline states.
   *********************************************************************************************/
  return {
    tasks,
    loading,
    error,
    isOnline,
    analytics,
    syncStatus,
  };
}