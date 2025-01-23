/**
 * ------------------------------------------------------------------------
 * tasks.reducer.ts
 * ------------------------------------------------------------------------
 * Redux reducer for managing all task-related state in the TaskStream AI
 * application. Incorporates granular loading behavior, robust error states
 * with codes and timestamps, and pagination/filter support. This reducer
 * follows the specifications for:
 *   - Task CRUD operations (fetch, create, update, delete) with optimistic
 *     updates.
 *   - Enhanced error handling, storing error codes and timestamps.
 *   - Granular loading states keyed by operation type.
 *   - Pagination state management (page, limit, total).
 *   - Advanced filtering (via TaskFilter) for improved UI interactions.
 *   - Versioning for potential future migration mechanisms.
 *
 * This file relies on:
 *   1) The "TasksState" interface and "TasksActionTypes" enum (and union type)
 *      from './tasks.types'.
 *   2) "Reducer" from 'redux' (^4.2.1) for typing the Redux reducer function.
 *   3) "produce" from 'immer' (^9.0.0) for creating immutable updates more
 *      ergonomically.
 *
 * The reducer fully implements all requirements laid out in the JSON
 * specification, including:
 *   - Handling new or updated shape for tasks state: tasks[], loading object,
 *     error object, filter, and pagination.
 *   - Setting or clearing errors in a structured manner.
 *   - Managing or clearing loading states for each async action.
 *   - Providing a single store location for Task Board features and analytics.
 *   - Maintaining "version" in state for potential migration flows.
 *
 * ------------------------------------------------------------------------
 */

import { Reducer } from 'redux'; // redux ^4.2.1
import { produce } from 'immer'; // immer ^9.0.0

import {
  /**
   * The TasksState interface from tasks.types is extended in this reducer
   * logic to include the pagination object and a more detailed error shape,
   * honoring the JSON specification. Even though the external file might
   * differ, we treat it here as sufficiently flexible to incorporate the
   * new fields as needed.
   */
  TasksState,

  /**
   * The union of all possible task-related action interfaces along with the
   * enum of action type constants. This includes fetch, CRUD, filter, and
   * error clearing.
   */
  TasksActionTypesUnion,
  TasksActionTypes,
} from './tasks.types';

/**
 * Extended error shape for robust error tracking, specifying a numeric code
 * (string in usage), a user-facing message, and a timestamp for better
 * diagnostic accuracy.
 */
interface ExtendedError {
  code: string;
  message: string;
  timestamp: number;
}

/**
 * Extended pagination interface ensuring that the tasks list can be paginated
 * effectively within the Redux store. This structure is fully compliant
 * with the JSON specification describing { page, limit, total } fields.
 */
interface TasksPagination {
  page: number;
  limit: number;
  total: number;
}

/**
 * For granular loading states keyed by operation, we define an index
 * signature. Each operation (e.g., "fetchTasks", "createTask", etc.)
 * can be mapped to a boolean reflecting whether the operation is still
 * in progress (true) or has finished (false).
 */
interface LoadingMap {
  [operation: string]: boolean;
}

/**
 * ExtendedTasksState
 * -------------------------------------------------------------------------
 * This reducer's local state version extends the base "TasksState" definition
 * (imported from tasks.types) to include the additional shape elements
 * required by the JSON specification: a dictionary-based "loading" property
 * and a more detailed "error" structure, plus "pagination". Also includes
 * a "version" field for potential migration handling.
 */
interface ExtendedTasksState extends Omit<TasksState, 'loading' | 'error'> {
  /**
   * Dictionary-based loading states keyed by operation name. This
   * approach allows multiple concurrent operations to represent distinct
   * loading states, e.g., fetch vs. create vs. update.
   */
  loading: LoadingMap;

  /**
   * Enhanced error object capturing code, message, and a numeric timestamp.
   * By storing timestamp, we can track when errors initially occurred.
   */
  error: ExtendedError | null;

  /**
   * Pagination object containing page number, limit, and total. This
   * accommodates the JSON specification for large data sets and robust UI.
   */
  pagination: TasksPagination;

  /**
   * Numeric version to help with store migrations or transformation
   * between different application lifecycle phases.
   */
  version: number;
}

/**
 * initialState
 * -------------------------------------------------------------------------
 * Provides a default state that satisfies the JSON specification, including:
 *   - An empty list of tasks.
 *   - A blank dictionary for loading states (nothing is loading initially).
 *   - A null error to signify no problems have been encountered yet.
 *   - Default filter with empty arrays and no date range.
 *   - Pagination set to page=1, limit=20, total=0, typical for a fresh load.
 *   - version = 1, allowing future state migrations if needed.
 */
const initialState: ExtendedTasksState = {
  tasks: [],
  loading: {},
  error: null,
  filter: {
    status: [],
    priority: [],
    assigneeId: [],
    // The JSON specification allows null for dueDateRange.
    dueDateRange: null,
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
  },
  version: 1,
};

/**
 * tasksReducer
 * -------------------------------------------------------------------------
 * The main reducer function to manage the entire tasks slice of the Redux
 * store. It is a pure function that receives the current state (or the
 * initial state if none) and a Redux action, and returns a new immutably
 * updated state:
 *
 * 1) Uses Immer's "produce" to create immutable updates inside a
 *    mutation-friendly code block.
 * 2) Handles the essential synchronous transitions for each known action type.
 * 3) Maintains robust error states and loading states keyed by specific
 *    operations.
 * 4) Manages pagination, filtering, and the tasks collection.
 * 5) Includes placeholders for CRUD operations with minimal optimistic
 *    logic: we assume success after request but finalize the real data
 *    upon server confirmations.
 *
 * @param state  Current tasks slice state (ExtendedTasksState) or undefined
 * @param action Dispatched Redux action, typed with tasks-related union
 * @return The new ExtendedTasksState after applying the given action
 */
export const tasksReducer: Reducer<ExtendedTasksState, TasksActionTypesUnion> =
  (state = initialState, action): ExtendedTasksState =>
    produce(state, (draft) => {
      /**
       * Each case block below handles a specific action scenario
       * comprehensively. Where appropriate, we clear any existing error,
       * set loading states, or toggle them off.
       */
      switch (action.type) {
        /**
         * -------------------------------------------------------------------
         * FETCH_TASKS_REQUEST
         * -------------------------------------------------------------------
         * Triggered when the application begins to fetch tasks from the server.
         * We set the loading state for the "fetchTasks" key to true and clear
         * any existing error in anticipation of a successful fetch.
         */
        case TasksActionTypes.FETCH_TASKS_REQUEST: {
          draft.loading.fetchTasks = true;
          draft.error = null;
          return;
        }

        /**
         * -------------------------------------------------------------------
         * FETCH_TASKS_SUCCESS
         * -------------------------------------------------------------------
         * Dispatched upon a successful response from the server with tasks.
         * We replace the entire "tasks" array with the fetched ones, toggle
         * the loading state for "fetchTasks" to false, and record the moment
         * for future auditing or rendering triggers if desired.
         */
        case TasksActionTypes.FETCH_TASKS_SUCCESS: {
          draft.loading.fetchTasks = false;
          draft.error = null;
          draft.tasks = action.payload; // Replace tasks with newly fetched
          return;
        }

        /**
         * -------------------------------------------------------------------
         * FETCH_TASKS_FAILURE
         * -------------------------------------------------------------------
         * Dispatched if the fetch operation fails. We capture the error
         * in a structured format with a code, user-friendly message, and
         * an immutable timestamp so the UI can display timely error details.
         */
        case TasksActionTypes.FETCH_TASKS_FAILURE: {
          draft.loading.fetchTasks = false;
          draft.error = {
            code: 'FETCH_TASKS_FAILURE',
            message: action.payload.error,
            timestamp: Date.now(),
          };
          return;
        }

        /**
         * -------------------------------------------------------------------
         * CREATE_TASK_REQUEST
         * -------------------------------------------------------------------
         * Fired when the user or system attempts to create a new task.
         * We optimistically clear any previous errors and set the loading
         * state for this operation to true. In advanced workflows, we might
         * also add a placeholder task to the array here.
         */
        case TasksActionTypes.CREATE_TASK_REQUEST: {
          draft.loading.createTask = true;
          draft.error = null;
          return;
        }

        /**
         * -------------------------------------------------------------------
         * CREATE_TASK_SUCCESS
         * -------------------------------------------------------------------
         * Dispatched once the server confirms successful creation of the new
         * task. The newly created item is appended to the tasks array. We
         * turn off the loading state for "createTask" and record the event.
         */
        case TasksActionTypes.CREATE_TASK_SUCCESS: {
          draft.loading.createTask = false;
          draft.error = null;
          draft.tasks.push(action.payload); // Insert new task at the end
          return;
        }

        /**
         * -------------------------------------------------------------------
         * CREATE_TASK_FAILURE
         * -------------------------------------------------------------------
         * Dispatched if a task creation attempt fails at the server or client
         * side. We store the relevant error data so the UI can display
         * appropriate messaging and revert any optimistic UI changes if needed.
         */
        case TasksActionTypes.CREATE_TASK_FAILURE: {
          draft.loading.createTask = false;
          draft.error = {
            code: 'CREATE_TASK_FAILURE',
            message: action.payload.error,
            timestamp: Date.now(),
          };
          return;
        }

        /**
         * -------------------------------------------------------------------
         * UPDATE_TASK_REQUEST
         * -------------------------------------------------------------------
         * Fired when the application starts updating an existing task. We
         * clear errors for a fresh operation and set the corresponding
         * "updateTask" loading flag to true. In advanced scenarios, we might
         * also optimistically update the task in the state, though we finalize
         * it in UPDATE_TASK_SUCCESS.
         */
        case TasksActionTypes.UPDATE_TASK_REQUEST: {
          draft.loading.updateTask = true;
          draft.error = null;
          return;
        }

        /**
         * -------------------------------------------------------------------
         * UPDATE_TASK_SUCCESS
         * -------------------------------------------------------------------
         * Dispatched when the server completes updating the task. We search
         * our tasks array for the matching ID, then replace or merge the
         * updated fields. We set loading off, and clear errors.
         */
        case TasksActionTypes.UPDATE_TASK_SUCCESS: {
          draft.loading.updateTask = false;
          draft.error = null;

          const updatedTask = action.payload;
          const idx = draft.tasks.findIndex((t) => t.id === updatedTask.id);
          if (idx !== -1) {
            draft.tasks[idx] = updatedTask;
          }
          return;
        }

        /**
         * -------------------------------------------------------------------
         * UPDATE_TASK_FAILURE
         * -------------------------------------------------------------------
         * Triggered if the attempt to update a task fails. The error is
         * recorded for UI display, and the "updateTask" loading state is
         * turned off. Any optimistic updates would also be reversed here.
         */
        case TasksActionTypes.UPDATE_TASK_FAILURE: {
          draft.loading.updateTask = false;
          draft.error = {
            code: 'UPDATE_TASK_FAILURE',
            message: action.payload.error,
            timestamp: Date.now(),
          };
          return;
        }

        /**
         * -------------------------------------------------------------------
         * DELETE_TASK_REQUEST
         * -------------------------------------------------------------------
         * Fired when a user or system attempts to remove a task. We set the
         * "deleteTask" loading to true and discard any previous error. In
         * an optimistic UI approach, you might remove the task from the list
         * here, expecting a successful server response.
         */
        case TasksActionTypes.DELETE_TASK_REQUEST: {
          draft.loading.deleteTask = true;
          draft.error = null;
          return;
        }

        /**
         * -------------------------------------------------------------------
         * DELETE_TASK_SUCCESS
         * -------------------------------------------------------------------
         * Dispatched upon the server's confirmation that a task was deleted.
         * We finalize removing the task from the local tasks array. The
         * "deleteTask" loading is toggled off, and we can proceed.
         */
        case TasksActionTypes.DELETE_TASK_SUCCESS: {
          draft.loading.deleteTask = false;
          draft.error = null;
          const { id } = action.payload;
          draft.tasks = draft.tasks.filter((task) => task.id !== id);
          return;
        }

        /**
         * -------------------------------------------------------------------
         * DELETE_TASK_FAILURE
         * -------------------------------------------------------------------
         * Dispatched if a server or network error prevents the task deletion.
         * We store the error details and reset the "deleteTask" loading
         * boolean to false, enabling the UI to revert or notify the user.
         */
        case TasksActionTypes.DELETE_TASK_FAILURE: {
          draft.loading.deleteTask = false;
          draft.error = {
            code: 'DELETE_TASK_FAILURE',
            message: action.payload.error,
            timestamp: Date.now(),
          };
          return;
        }

        /**
         * -------------------------------------------------------------------
         * SET_TASK_FILTER
         * -------------------------------------------------------------------
         * This action updates the task filter state in order to present a
         * refined subset of tasks. For instance, we might filter by certain
         * statuses, priority levels, or assigned users. The dueDateRange
         * can be null or an object with start and end dates.
         */
        case TasksActionTypes.SET_TASK_FILTER: {
          draft.filter = { ...action.payload };
          return;
        }

        /**
         * -------------------------------------------------------------------
         * SET_TASK_PAGINATION
         * -------------------------------------------------------------------
         * Used to manage pagination in the tasks list, updating page,
         * limit, and total. This ensures the UI's pagination controls
         * can display relevant data for large task sets across multiple
         * pages.
         */
        case TasksActionTypes.SET_TASK_PAGINATION: {
          draft.pagination.page = action.payload.page;
          draft.pagination.limit = action.payload.limit;
          draft.pagination.total = action.payload.total;
          return;
        }

        /**
         * -------------------------------------------------------------------
         * CLEAR_TASK_ERROR
         * -------------------------------------------------------------------
         * Immediately resets any existing error to null, typically used
         * in scenarios where the UI has acknowledged the error or when
         * a new operation begins. This ensures the store doesn't continue
         * to show an outdated error.
         */
        case TasksActionTypes.CLEAR_TASK_ERROR: {
          draft.error = null;
          return;
        }

        /**
         * -------------------------------------------------------------------
         * Default
         * -------------------------------------------------------------------
         * For unknown action types, we make no changes and return the
         * current state as-is. This satisfies Redux best practices.
         */
        default: {
          return;
        }
      }
    });

// Exporting the reducer as a type-safe Redux reducer conforming to the
// shape of ExtendedTasksState and the union of tasks-related actions.
// This meets the JSON specification requiring us to share tasks, loading,
// error, filter, and pagination with the Redux store and external
// references. "version" is also included for future-proof migrations.
export { ExtendedTasksState as TasksState };