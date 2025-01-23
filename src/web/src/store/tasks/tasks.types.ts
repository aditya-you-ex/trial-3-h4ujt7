/**
 * ---------------------------------------------------------------------------
 * tasks.types.ts
 * ---------------------------------------------------------------------------
 * Defines TypeScript types, interfaces, and enums for Redux-based task
 * state management within the TaskStream AI platform. This module includes:
 * 1) A comprehensive enum of Redux action types representing all task-related
 *    operations (CRUD, filtering, and error handling).
 * 2) The TasksState interface, describing the shape of the tasks slice in
 *    the Redux store, including real-time updates, loading states, errors,
 *    and enhanced task filtering capabilities.
 * 3) Strongly typed Action interfaces for each Redux action type, ensuring
 *    a robust and reliable workflow for handling all scenarios in task
 *    creation, retrieval, update, and deletion processes.
 *
 * Requirements Addressed:
 * - Task Management: Automated creation, assignment, tracking (Technical
 *   Specifications/1.2 System Overview/High-Level Description)
 * - Real-time Updates: Enhanced error handling and filtering through Redux
 *   store (Technical Specifications/2.2 Component Details/Data Storage Components)
 *
 * ---------------------------------------------------------------------------
 */

import { Action } from 'redux'; // redux ^4.2.1
import {
  Task,
  TaskCreateInput,
  TaskUpdateInput,
  TaskFilter,
} from '../../types/task.types';

/**
 * Enum: TasksActionTypes
 * ---------------------------------------------------------------------------
 * A comprehensive list of Redux action types for all operations related to
 * tasks in the TaskStream AI application. This includes fetching tasks from
 * the server, creating new tasks, updating or deleting existing tasks, and
 * managing error states or filter settings.
 */
export enum TasksActionTypes {
  FETCH_TASKS_REQUEST = 'FETCH_TASKS_REQUEST',
  FETCH_TASKS_SUCCESS = 'FETCH_TASKS_SUCCESS',
  FETCH_TASKS_FAILURE = 'FETCH_TASKS_FAILURE',

  CREATE_TASK_REQUEST = 'CREATE_TASK_REQUEST',
  CREATE_TASK_SUCCESS = 'CREATE_TASK_SUCCESS',
  CREATE_TASK_FAILURE = 'CREATE_TASK_FAILURE',

  UPDATE_TASK_REQUEST = 'UPDATE_TASK_REQUEST',
  UPDATE_TASK_SUCCESS = 'UPDATE_TASK_SUCCESS',
  UPDATE_TASK_FAILURE = 'UPDATE_TASK_FAILURE',

  DELETE_TASK_REQUEST = 'DELETE_TASK_REQUEST',
  DELETE_TASK_SUCCESS = 'DELETE_TASK_SUCCESS',
  DELETE_TASK_FAILURE = 'DELETE_TASK_FAILURE',

  SET_TASK_FILTER = 'SET_TASK_FILTER',
  CLEAR_TASK_ERROR = 'CLEAR_TASK_ERROR',
}

/**
 * Interface: TasksState
 * ---------------------------------------------------------------------------
 * Defines the shape of the tasks slice within the Redux store, encompassing
 * all critical data for managing and rendering tasks in the UI. Elements
 * include a tasks array, loading state, potential errors, current filters,
 * and a timestamp for indicating the most recent store update.
 */
export interface TasksState {
  /**
   * A read-only array of Task objects managed by Redux, representing
   * the current collection of tasks in memory. These tasks can be filtered
   * or updated based on user actions and system events.
   */
  readonly tasks: readonly Task[];

  /**
   * A boolean flag indicating whether an asynchronous fetching,
   * creation, update, or deletion operation is in progress.
   */
  loading: boolean;

  /**
   * A string holding any error message resulting from API calls
   * or Redux operations. Set to null if no error is present.
   */
  error: string | null;

  /**
   * Manages the active filtering criteria used on the task board
   * or list views, such as status, priority, assignee, etc.
   */
  filter: TaskFilter;

  /**
   * A numeric timestamp (milliseconds since the Unix epoch) marking
   * the last time the tasks slice was successfully updated.
   */
  lastUpdated: number;
}

/**
 * Interface: FetchTasksRequestAction
 * ---------------------------------------------------------------------------
 * Issued when a request to retrieve tasks from the server is initiated.
 * Optionally, this may carry query parameters, filter constraints, or page
 * information to refine the server-side results.
 */
export interface FetchTasksRequestAction
  extends Action<TasksActionTypes.FETCH_TASKS_REQUEST> {
  /**
   * (Optional) Carry any request parameters or filter data
   * if the fetch operation requires server-side querying.
   */
  readonly payload?: Partial<TaskFilter>;
}

/**
 * Interface: FetchTasksSuccessAction
 * ---------------------------------------------------------------------------
 * Fired when the server returns a successful response containing the tasks.
 * The task list in the Redux store is updated accordingly.
 */
export interface FetchTasksSuccessAction
  extends Action<TasksActionTypes.FETCH_TASKS_SUCCESS> {
  /**
   * An array of Task objects received from the server.
   */
  readonly payload: Task[];
}

/**
 * Interface: FetchTasksFailureAction
 * ---------------------------------------------------------------------------
 * Dispatched if the fetch operation encounters an error on the server
 * or while processing the request, carrying the error information.
 */
export interface FetchTasksFailureAction
  extends Action<TasksActionTypes.FETCH_TASKS_FAILURE> {
  /**
   * An object containing an explanatory error message or code.
   */
  readonly payload: {
    error: string;
  };
}

/**
 * Interface: CreateTaskRequestAction
 * ---------------------------------------------------------------------------
 * Posted to initiate a new task creation. Contains the necessary payload
 * data to form and validate a Task before sending it to the server.
 */
export interface CreateTaskRequestAction
  extends Action<TasksActionTypes.CREATE_TASK_REQUEST> {
  /**
   * The input fields required to create a new task, such as
   * title, description, priority, and due date.
   */
  readonly payload: TaskCreateInput;
}

/**
 * Interface: CreateTaskSuccessAction
 * ---------------------------------------------------------------------------
 * Dispatched once a new task has been successfully created on the server.
 * The newly created Task object is returned in the payload for UI updates.
 */
export interface CreateTaskSuccessAction
  extends Action<TasksActionTypes.CREATE_TASK_SUCCESS> {
  /**
   * The freshly created Task object, as returned by the server.
   */
  readonly payload: Task;
}

/**
 * Interface: CreateTaskFailureAction
 * ---------------------------------------------------------------------------
 * Fired when the attempt to create a new task fails due to server
 * errors or validation issues, carrying the particular error details.
 */
export interface CreateTaskFailureAction
  extends Action<TasksActionTypes.CREATE_TASK_FAILURE> {
  /**
   * An object containing an explanatory error message or code.
   */
  readonly payload: {
    error: string;
  };
}

/**
 * Interface: UpdateTaskRequestAction
 * ---------------------------------------------------------------------------
 * Triggered to indicate a task update request. Provides the TaskUpdateInput
 * data needed to modify an existing Task according to partial updates.
 */
export interface UpdateTaskRequestAction
  extends Action<TasksActionTypes.UPDATE_TASK_REQUEST> {
  /**
   * Contains either a reference to the Task ID and a Partial<Task> object
   * or explicit fields for properties to be updated (title, status, etc.).
   */
  readonly payload: TaskUpdateInput;
}

/**
 * Interface: UpdateTaskSuccessAction
 * ---------------------------------------------------------------------------
 * Issued after the server acknowledges and applies the request to update
 * an existing Task. The payload contains the updated Task object.
 */
export interface UpdateTaskSuccessAction
  extends Action<TasksActionTypes.UPDATE_TASK_SUCCESS> {
  /**
   * The updated Task object reflecting the applied modifications.
   */
  readonly payload: Task;
}

/**
 * Interface: UpdateTaskFailureAction
 * ---------------------------------------------------------------------------
 * Dispatched if an error occurs while updating a Task, carrying the relevant
 * error details for logging or UI display.
 */
export interface UpdateTaskFailureAction
  extends Action<TasksActionTypes.UPDATE_TASK_FAILURE> {
  /**
   * An object containing an explanatory error message or code.
   */
  readonly payload: {
    error: string;
  };
}

/**
 * Interface: DeleteTaskRequestAction
 * ---------------------------------------------------------------------------
 * Sent to remove a task from the server. Includes the relevant Task
 * identifier to delete.
 */
export interface DeleteTaskRequestAction
  extends Action<TasksActionTypes.DELETE_TASK_REQUEST> {
  /**
   * Object specifying the Task ID intended for deletion.
   */
  readonly payload: {
    id: string;
  };
}

/**
 * Interface: DeleteTaskSuccessAction
 * ---------------------------------------------------------------------------
 * Dispatched when the server successfully deletes the specified Task. The
 * payload ensures the Redux store can remove the Task accordingly.
 */
export interface DeleteTaskSuccessAction
  extends Action<TasksActionTypes.DELETE_TASK_SUCCESS> {
  /**
   * Object specifying the Task ID that was successfully removed.
   */
  readonly payload: {
    id: string;
  };
}

/**
 * Interface: DeleteTaskFailureAction
 * ---------------------------------------------------------------------------
 * Fired if something prevents the Task from being deleted, including
 * server errors, invalid Task IDs, or system constraints.
 */
export interface DeleteTaskFailureAction
  extends Action<TasksActionTypes.DELETE_TASK_FAILURE> {
  /**
   * Object specifying the Task ID and the related error message.
   */
  readonly payload: {
    id: string;
    error: string;
  };
}

/**
 * Interface: SetTaskFilterAction
 * ---------------------------------------------------------------------------
 * Used to apply or modify filtering criteria in the Redux state.
 * This action updates the active filter, controlling which tasks
 * appear on the board or in list views.
 */
export interface SetTaskFilterAction
  extends Action<TasksActionTypes.SET_TASK_FILTER> {
  /**
   * The TaskFilter object specifying attributes (e.g., status, priority,
   * assigned user, etc.) to filter the visible tasks.
   */
  readonly payload: TaskFilter;
}

/**
 * Interface: ClearTaskErrorAction
 * ---------------------------------------------------------------------------
 * Indicates that any present error in the tasks slice should be reset
 * to null, typically used after displaying or logging the error message.
 */
export interface ClearTaskErrorAction
  extends Action<TasksActionTypes.CLEAR_TASK_ERROR> {
  /**
   * No payload is required. The presence of this action type
   * indicates clearing the error field in Redux state.
   */
  readonly payload?: undefined;
}

/**
 * Type: TasksActionTypes
 * ---------------------------------------------------------------------------
 * A union type covering all possible Redux actions related to Task
 * operations, including fetching, creation, updates, deletion,
 * filter adjustments, and error handling. This type-safe union ensures
 * that all actions within the tasks domain adhere to a strict
 * contract when dispatched or handled.
 */
export type TasksActionTypesUnion =
  | FetchTasksRequestAction
  | FetchTasksSuccessAction
  | FetchTasksFailureAction
  | CreateTaskRequestAction
  | CreateTaskSuccessAction
  | CreateTaskFailureAction
  | UpdateTaskRequestAction
  | UpdateTaskSuccessAction
  | UpdateTaskFailureAction
  | DeleteTaskRequestAction
  | DeleteTaskSuccessAction
  | DeleteTaskFailureAction
  | SetTaskFilterAction
  | ClearTaskErrorAction;