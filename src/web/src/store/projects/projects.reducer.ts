/**
 * Redux reducer (projects slice) for managing project-related state
 * in the frontend application. Implements comprehensive project management
 * functionality (CRUD, selection, error handling, pagination, and optional
 * optimistic updates) using Redux Toolkit.
 *
 * The slice maintains an array of projects, the currently selected project,
 * loading/error states, and pagination control (total item count, current
 * page, and page size). It aims to provide an enterprise-grade, robust
 * solution for project data handling within the TaskStream AI platform.
 */

// -----------------------------------------------------------------------------
// External Imports
// -----------------------------------------------------------------------------
// @reduxjs/toolkit version ^1.9.5
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// -----------------------------------------------------------------------------
// Internal Imports (Type Interfaces)
// -----------------------------------------------------------------------------
import { ProjectsState } from './projects.types'; // Projects slice state shape
import { Project } from '../../types/project.types'; // Project entity definition
import { LoadingState } from '../../types/common.types'; // 'idle' | 'loading' | 'succeeded' | 'failed'

// -----------------------------------------------------------------------------
// Initial State
// -----------------------------------------------------------------------------
// Defines the initial shape and default values for the projects slice state.
//   items: Array of loaded projects
//   selectedProject: The currently active project in the UI
//   loading: Represents request states such as 'idle' or 'loading'
//   error: Holds any error message encountered during async operations
//   total: Total number of projects (for pagination/display counts)
//   currentPage: Current paginated page being displayed
//   pageSize: Number of items displayed per page
const initialState: ProjectsState = {
  items: [],
  selectedProject: null,
  loading: 'idle',
  error: null,
  total: 0,
  currentPage: 1,
  pageSize: 10,
};

// -----------------------------------------------------------------------------
// Slice Definition
// -----------------------------------------------------------------------------
// createSlice is used to generate a slice of Redux state, along with
// action creators and a reducer. This slice is named 'projects'.
export const projectsSlice = createSlice({
  name: 'projects',
  // The initial state for the projects slice
  initialState,
  // The reducers field defines synchronous operations that update
  // the slice state. Each key in reducers will produce an Action
  // with a matching name. The logic in each reducer merges changes
  // into the current state using Immer under the hood.
  reducers: {
    /**
     * Initiates an asynchronous fetch for a list of projects, typically
     * triggering a saga, thunk, or other async call. This sets loading
     * to 'loading' and clears any existing error message, preparing
     * the slice for a new fetch operation.
     */
    fetchProjectsRequest(state) {
      state.loading = 'loading';
      state.error = null;
    },

    /**
     * Handles successful retrieval of projects from the server. Resets the
     * loading state to 'succeeded', updates the local items array, and
     * updates pagination data (total, currentPage, pageSize). Clears any
     * stale error message.
     */
    fetchProjectsSuccess(
      state,
      action: PayloadAction<{
        items: Project[];
        total: number;
        currentPage: number;
        pageSize: number;
      }>
    ) {
      state.loading = 'succeeded';
      state.error = null;
      state.items = action.payload.items;
      state.total = action.payload.total;
      state.currentPage = action.payload.currentPage;
      state.pageSize = action.payload.pageSize;
    },

    /**
     * Handles a failed attempt to fetch projects from the server. Sets the
     * loading state to 'failed' and captures an error message for UI display
     * or developer debugging.
     */
    fetchProjectsFailure(
      state,
      action: PayloadAction<{ error: string }>
    ) {
      state.loading = 'failed';
      state.error = action.payload.error;
    },

    /**
     * Begins the process of creating a new project. Sets loading to 'loading'
     * and clears out any error. In advanced usage, optimistic creation can
     * be applied here to add a temporary item to the list.
     */
    createProjectRequest(state) {
      state.loading = 'loading';
      state.error = null;
    },

    /**
     * Updates state with the newly created project upon a successful server
     * response. Loading is set to 'succeeded', and the new project is added
     * to the front of the items array. The total project count is incremented
     * to reflect the addition.
     */
    createProjectSuccess(
      state,
      action: PayloadAction<{ project: Project }>
    ) {
      state.loading = 'succeeded';
      state.error = null;
      state.items.unshift(action.payload.project);
      state.total += 1;
    },

    /**
     * Captures any errors encountered during creation of a new project.
     * Sets loading to 'failed' and stores the error message for further
     * display and debugging in the UI.
     */
    createProjectFailure(
      state,
      action: PayloadAction<{ error: string }>
    ) {
      state.loading = 'failed';
      state.error = action.payload.error;
    },

    /**
     * Begins the process of updating an existing project. Sets loading to
     * 'loading' and clears previous error messages. An optional 'optimistic'
     * approach can be placed here, but typically will be handled externally
     * in more advanced Redux patterns.
     */
    updateProjectRequest(state) {
      state.loading = 'loading';
      state.error = null;
    },

    /**
     * Applies updated project data to the state upon a successful server
     * response. The newly updated project replaces its prior version
     * in the items array via a mapped replacement, ensuring immutability.
     */
    updateProjectSuccess(
      state,
      action: PayloadAction<{ project: Project }>
    ) {
      state.loading = 'succeeded';
      state.error = null;
      const updatedProject = action.payload.project;
      state.items = state.items.map((proj) => {
        return proj.id === updatedProject.id ? updatedProject : proj;
      });
    },

    /**
     * Handles any errors arising from a project update operation. Sets
     * loading to 'failed' and stores a descriptive error message in
     * preparation for UI consumption.
     */
    updateProjectFailure(
      state,
      action: PayloadAction<{ error: string }>
    ) {
      state.loading = 'failed';
      state.error = action.payload.error;
    },

    /**
     * Initiates the project deletion sequence, setting loading to 'loading'
     * and clearing the error property. An optimistic update can be
     * implemented here if needed, removing the local item first.
     */
    deleteProjectRequest(state) {
      state.loading = 'loading';
      state.error = null;
    },

    /**
     * Removes the deleted project from local state upon successful confirmation
     * from the server. Identifies the project by ID and filters it out of
     * the items array. Decreases the total project count by one.
     */
    deleteProjectSuccess(
      state,
      action: PayloadAction<{ id: string }>
    ) {
      state.loading = 'succeeded';
      state.error = null;
      state.items = state.items.filter((proj) => proj.id !== action.payload.id);
      state.total = Math.max(0, state.total - 1);
    },

    /**
     * Catches errors from a failed project deletion operation. Sets loading
     * to 'failed' and the error property is updated with a message suitable
     * for user feedback or developer logs.
     */
    deleteProjectFailure(
      state,
      action: PayloadAction<{ error: string }>
    ) {
      state.loading = 'failed';
      state.error = action.payload.error;
    },

    /**
     * Mutator for setting a project as "selected" in the state, identified
     * by ID. If located in items, the project is placed in selectedProject;
     * otherwise, selection is set to null. This function integrates with
     * the UI, letting users focus on a specific entity for editing or details.
     */
    selectProject(
      state,
      action: PayloadAction<{ id: string }>
    ) {
      const found = state.items.find(
        (proj) => proj.id === action.payload.id
      );
      state.selectedProject = found ?? null;
    },
  },
});

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------
//
// 1) The projectsSlice object itself, which holds reducer logic and actions.
// 2) Named exports for the actions, allowing direct dispatch usage.
// 3) A named constant for the reducer, so consumers can use it in the store.
// 4) The default export also points to this reducer for convenient integration.
//
export const { actions: projectsActions, reducer: projectsReducer } = projectsSlice;
export default projectsReducer;