/**
 * Comprehensive TypeScript types and interfaces for project-related Redux store
 * state, actions, and reducers. This file ensures strict type safety and standardized
 * API interactions in the TaskStream AI project management functionality.
 *
 * It addresses:
 * 1) Project Management: Core project management features with structured data references.
 * 2) State Management: Strongly typed interfaces for Redux store slices related to projects.
 * 3) Type Safety: Enforcing strict compile-time checks for all project-related operations.
 * 4) API Standards: Standardized response formats and error handling integrated with Redux.
 */

// -----------------------------------------------------------------------------
// External Imports (package version ^1.9.5 as specified)
// -----------------------------------------------------------------------------
import { PayloadAction } from '@reduxjs/toolkit';

// -----------------------------------------------------------------------------
// Internal Imports: Ensuring correctness based on provided source definitions
// -----------------------------------------------------------------------------
import { Project, ProjectCreateInput, ProjectUpdateInput } from '../../types/project.types';
import { LoadingState } from '../../types/common.types';

/**
 * Enum: ProjectsActionTypes
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Defines a comprehensive set of action types for all project-related Redux
 *   operations, including request, success, and failure states for
 *   fetching, creating, updating, deleting, as well as selecting a project.
 *
 * Description:
 *   Each member maps to a specific stage of a project-oriented operation
 *   to enable robust action handling throughout the application.
 */
export enum ProjectsActionTypes {
  FETCH_PROJECTS_REQUEST = 'FETCH_PROJECTS_REQUEST',
  FETCH_PROJECTS_SUCCESS = 'FETCH_PROJECTS_SUCCESS',
  FETCH_PROJECTS_FAILURE = 'FETCH_PROJECTS_FAILURE',

  CREATE_PROJECT_REQUEST = 'CREATE_PROJECT_REQUEST',
  CREATE_PROJECT_SUCCESS = 'CREATE_PROJECT_SUCCESS',
  CREATE_PROJECT_FAILURE = 'CREATE_PROJECT_FAILURE',

  UPDATE_PROJECT_REQUEST = 'UPDATE_PROJECT_REQUEST',
  UPDATE_PROJECT_SUCCESS = 'UPDATE_PROJECT_SUCCESS',
  UPDATE_PROJECT_FAILURE = 'UPDATE_PROJECT_FAILURE',

  DELETE_PROJECT_REQUEST = 'DELETE_PROJECT_REQUEST',
  DELETE_PROJECT_SUCCESS = 'DELETE_PROJECT_SUCCESS',
  DELETE_PROJECT_FAILURE = 'DELETE_PROJECT_FAILURE',

  SELECT_PROJECT = 'SELECT_PROJECT',
}

/**
 * Interface: ProjectsState
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Defines the shape of the project-related slice of the Redux store state,
 *   including project items, selection, loading status, and pagination.
 *
 * Description:
 *   This structure ensures consistent handling of project information within
 *   the state layer, including error messages and pagination metadata (e.g.,
 *   total, current page, and page size).
 */
export interface ProjectsState {
  /**
   * An array of project entities currently loaded in state.
   */
  items: Project[];

  /**
   * The currently selected project, or null if none is selected.
   */
  selectedProject: Project | null;

  /**
   * Indicates whether the store is idle, loading, succeeded, or failed
   * in relation to project data operations.
   */
  loading: LoadingState;

  /**
   * Contains any error string when a load, create, update, or delete
   * operation fails; otherwise null if no errors.
   */
  error: string | null;

  /**
   * Total number of projects, typically used for pagination UI.
   */
  total: number;

  /**
   * The current page number used in project listings or pagination logic.
   */
  currentPage: number;

  /**
   * The number of projects displayed per page when paginating.
   */
  pageSize: number;
}

/**
 * Interface: FetchProjectsPayload
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Represents the payload structure for fetching a list of projects,
 *   including pagination details, filters, and sort preferences.
 *
 * Description:
 *   The UI or any consumer can dispatch an action carrying this payload
 *   to indicate how to retrieve projects from an API or other data source.
 *   The backend or a saga/Thunk can interpret these fields to deliver
 *   the correct page of results, sorted and filtered appropriately.
 */
export interface FetchProjectsPayload {
  /**
   * The page number requested. Typically a 1-based or 0-based index
   * that indicates which segment of paged projects to retrieve.
   */
  page: number;

  /**
   * The maximum size of a single project page.
   */
  pageSize: number;

  /**
   * Arbitrary key-value filters that the fetching mechanism will use
   * to further refine or limit the returned projects.
   */
  filters: Record<string, unknown>;

  /**
   * A key or field name by which to order the fetched projects.
   */
  sortBy: string;

  /**
   * Determines whether to sort results in ascending ('asc') or
   * descending ('desc') order, providing a consistent interface.
   */
  sortOrder: 'asc' | 'desc';
}

// -----------------------------------------------------------------------------
// Additional Typed Payloads For Create, Update, and Delete Actions
// -----------------------------------------------------------------------------

/**
 * Interface: CreateProjectActionPayload
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Defines the payload for actions that create a new project using
 *   the ProjectCreateInput structure.
 */
export interface CreateProjectActionPayload {
  /**
   * The data necessary to construct a new project. This includes the project's
   * display name and description, as well as any metadata.
   */
  projectData: ProjectCreateInput;
}

/**
 * Interface: UpdateProjectActionPayload
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Defines the payload for actions that update an existing project
 *   by combining a project ID with the new fields to apply.
 */
export interface UpdateProjectActionPayload {
  /**
   * Unique identifier of the project to update.
   */
  id: string;

  /**
   * The new or updated fields for the specified project, referencing
   * the ProjectUpdateInput interface for strong validation.
   */
  projectData: ProjectUpdateInput;
}

/**
 * Interface: DeleteProjectActionPayload
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Simplified payload for actions that remove an existing project from
 *   the state and the backend, requiring only the project ID.
 */
export interface DeleteProjectActionPayload {
  /**
   * Unique identifier of the project to be deleted.
   */
  id: string;
}

/**
 * Interface: SelectProjectActionPayload
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Defines the payload structure used to select a project in the
 *   Redux store, typically for display or editing.
 */
export interface SelectProjectActionPayload {
  /**
   * Unique identifier of the project being selected; the reducer
   * will locate the full project object from the existing state.
   */
  id: string;
}

// -----------------------------------------------------------------------------
// Strongly Typed Redux Action Definitions
// -----------------------------------------------------------------------------

/**
 * Action: FetchProjectsRequestAction
 * ----------------------------------------------------------------------------
 * Payload: FetchProjectsPayload
 * Type: ProjectsActionTypes.FETCH_PROJECTS_REQUEST
 */
export type FetchProjectsRequestAction = PayloadAction<
  FetchProjectsPayload,
  ProjectsActionTypes.FETCH_PROJECTS_REQUEST
>;

/**
 * Action: FetchProjectsSuccessAction
 * ----------------------------------------------------------------------------
 * Payload: An object with the array of fetched projects, total count,
 *          and optional pagination details. This shape can vary depending
 *          on how the application responds to fetch results. In many
 *          cases, total pages or current page might also be included.
 */
export type FetchProjectsSuccessAction = PayloadAction<
  {
    items: Project[];
    total: number;
    currentPage: number;
    pageSize: number;
  },
  ProjectsActionTypes.FETCH_PROJECTS_SUCCESS
>;

/**
 * Action: FetchProjectsFailureAction
 * ----------------------------------------------------------------------------
 * Payload: Error string describing what went wrong during fetch.
 */
export type FetchProjectsFailureAction = PayloadAction<
  { error: string },
  ProjectsActionTypes.FETCH_PROJECTS_FAILURE
>;

/**
 * Action: CreateProjectRequestAction
 * ----------------------------------------------------------------------------
 * Payload: CreateProjectActionPayload, containing the data needed to
 *          create a new project entity.
 */
export type CreateProjectRequestAction = PayloadAction<
  CreateProjectActionPayload,
  ProjectsActionTypes.CREATE_PROJECT_REQUEST
>;

/**
 * Action: CreateProjectSuccessAction
 * ----------------------------------------------------------------------------
 * Payload: The newly created project.
 */
export type CreateProjectSuccessAction = PayloadAction<
  { project: Project },
  ProjectsActionTypes.CREATE_PROJECT_SUCCESS
>;

/**
 * Action: CreateProjectFailureAction
 * ----------------------------------------------------------------------------
 * Payload: Error string describing what went wrong during project creation.
 */
export type CreateProjectFailureAction = PayloadAction<
  { error: string },
  ProjectsActionTypes.CREATE_PROJECT_FAILURE
>;

/**
 * Action: UpdateProjectRequestAction
 * ----------------------------------------------------------------------------
 * Payload: UpdateProjectActionPayload, which includes the project ID
 *          and updated data for the project.
 */
export type UpdateProjectRequestAction = PayloadAction<
  UpdateProjectActionPayload,
  ProjectsActionTypes.UPDATE_PROJECT_REQUEST
>;

/**
 * Action: UpdateProjectSuccessAction
 * ----------------------------------------------------------------------------
 * Payload: The updated project. Typically includes the full
 *          object so that the store can replace or patch it.
 */
export type UpdateProjectSuccessAction = PayloadAction<
  { project: Project },
  ProjectsActionTypes.UPDATE_PROJECT_SUCCESS
>;

/**
 * Action: UpdateProjectFailureAction
 * ----------------------------------------------------------------------------
 * Payload: Error string describing the cause of the update failure.
 */
export type UpdateProjectFailureAction = PayloadAction<
  { error: string },
  ProjectsActionTypes.UPDATE_PROJECT_FAILURE
>;

/**
 * Action: DeleteProjectRequestAction
 * ----------------------------------------------------------------------------
 * Payload: DeleteProjectActionPayload that carries the identifier
 *          of the project slated for deletion.
 */
export type DeleteProjectRequestAction = PayloadAction<
  DeleteProjectActionPayload,
  ProjectsActionTypes.DELETE_PROJECT_REQUEST
>;

/**
 * Action: DeleteProjectSuccessAction
 * ----------------------------------------------------------------------------
 * Payload: Confirms the successful deletion by providing the project ID
 *          that was removed, enabling the reducer to remove it from state.
 */
export type DeleteProjectSuccessAction = PayloadAction<
  { id: string },
  ProjectsActionTypes.DELETE_PROJECT_SUCCESS
>;

/**
 * Action: DeleteProjectFailureAction
 * ----------------------------------------------------------------------------
 * Payload: Error string detailing the failure that occurred while
 *          deleting a project.
 */
export type DeleteProjectFailureAction = PayloadAction<
  { error: string },
  ProjectsActionTypes.DELETE_PROJECT_FAILURE
>;

/**
 * Action: SelectProjectAction
 * ----------------------------------------------------------------------------
 * Payload: SelectProjectActionPayload, used by the reducer to mark
 *          a particular project as selected within the state.
 */
export type SelectProjectAction = PayloadAction<
  SelectProjectActionPayload,
  ProjectsActionTypes.SELECT_PROJECT
>;

/**
 * Type: ProjectsActions
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Combines all possible action types into a single union for projects,
 *   enabling exhaustive checks in reducers and middleware.
 *
 * Description:
 *   This union type fosters robust compile-time guarantees that every
 *   action scenario is handled appropriately, contributing to stable
 *   and maintainable state management.
 */
export type ProjectsActions =
  | FetchProjectsRequestAction
  | FetchProjectsSuccessAction
  | FetchProjectsFailureAction
  | CreateProjectRequestAction
  | CreateProjectSuccessAction
  | CreateProjectFailureAction
  | UpdateProjectRequestAction
  | UpdateProjectSuccessAction
  | UpdateProjectFailureAction
  | DeleteProjectRequestAction
  | DeleteProjectSuccessAction
  | DeleteProjectFailureAction
  | SelectProjectAction;