/**
 * Redux action creators for managing project-related state in the TaskStream AI
 * frontend application, implementing CRUD operations, project selection,
 * analytics tracking, and advanced error handling with comprehensive type safety.
 *
 * It addresses:
 *   1) Project Management: Providing all CRUD operations for projects.
 *   2) State Management: Leveraging Redux Toolkit’s createAsyncThunk for
 *      predictable state handling and typed interactions.
 *   3) Resource Management: Integrating analytics to capture resource usage,
 *      performance metrics, and advanced error-handling for production readiness.
 *
 * Dependencies:
 *   - Redux Toolkit (@reduxjs/toolkit ^1.9.5) for createAsyncThunk and PayloadAction
 *   - @analytics/core (^0.10.0) for analytics tracking
 *   - projectService for backend API integration
 *   - ProjectsActionTypes for typed action constants
 *   - Project, ProjectCreateInput, ProjectUpdateInput, FetchProjectsPayload, etc.
 *     from the relevant type definitions to ensure strict type safety
 */

import { createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import Analytics from '@analytics/core'; // ^0.10.0
import { ProjectsActionTypes } from './projects.types';
import type {
  FetchProjectsPayload,
  CreateProjectActionPayload,
  UpdateProjectActionPayload,
  DeleteProjectActionPayload,
  SelectProjectActionPayload,
} from './projects.types';
import type {
  Project,
  ProjectCreateInput,
  ProjectUpdateInput,
} from '../../types/project.types';
import { projectService } from '../../services/project.service';

/**
 * ThunkConfig interface to provide extra typing for
 * createAsyncThunk operations, including rejectValue used in error handling.
 * Adjust to match your application's specific Redux store configuration.
 */
interface ThunkConfig {
  // You may include your application's RootState and AppDispatch if needed:
  // state: RootState;
  // dispatch: AppDispatch;
  /**
   * Type of the rejectWithValue payload, ensuring advanced error handling.
   */
  rejectValue: string;
}

/**
 * Optional interface for advanced update operation options,
 * reflecting potential concurrency or resource usage configurations.
 */
interface UpdateOptions {
  /**
   * Determines if concurrency checks should be performed on the server side.
   */
  optimisticConcurrency?: boolean;
  /**
   * Additional metadata or instructions for partial updates, validations, etc.
   */
  meta?: Record<string, unknown>;
}

/**
 * Optional interface for advanced delete operation options,
 * allowing extended resource cleanup or tracking parameters.
 */
interface DeleteOptions {
  /**
   * Flag indicating whether related records (tasks, logs) should be
   * permanently removed or archived.
   */
  cascade?: boolean;
  /**
   * Additional cleanup or auditing behaviors.
   */
  meta?: Record<string, unknown>;
}

/**
 * Optional interface for project selection operation,
 * capturing extra details for navigation or analytics tracking if needed.
 */
interface SelectOptions {
  /**
   * Indicates whether the selection is strictly read-only,
   * or if the user can perform edits on the selected project.
   */
  readOnly?: boolean;
  /**
   * Arbitrary metadata for logging or analytics.
   */
  meta?: Record<string, unknown>;
}

/**
 * Internal analytics instance to track project-related events,
 * including resource usage, performance metrics, and user interactions.
 */
const analytics = new Analytics();

/***************************************************************************************************
 * Action Creator: fetchProjects
 * -------------------------------------------------------------------------------------------------
 * An async thunk action creator for fetching projects with pagination, filters, and caching logic.
 * Returns a Promise resolving to an array of Project entities. This function follows the steps:
 *
 * Steps:
 *  1. Validate input parameters and cache status (if implemented at the store/action level).
 *  2. Check cache for existing data (optional, since projectService may also handle it).
 *  3. Start performance tracking using analytics.
 *  4. Call projectService.getProjects with the given payload.
 *  5. Handle response caching when or if local caching is implemented in the thunk.
 *  6. Track analytics metrics for resource usage.
 *  7. Transform and validate response data (via TypeScript compile-time checks).
 *  8. Handle errors with retry logic at the service level and rejectWithValue here if needed.
 *  9. Update the Redux store with fresh data (handled automatically by Redux Toolkit).
 * 10. Return the processed array of projects.
 **************************************************************************************************/
export const fetchProjects = createAsyncThunk<
  Project[],
  FetchProjectsPayload,
  ThunkConfig
>(
  ProjectsActionTypes.FETCH_PROJECTS, // Action type constant from projects.types
  async (payload, { rejectWithValue }) => {
    try {
      // 1. (Optional) Validate input parameters if needed at this level
      if (payload.page < 1 || payload.pageSize < 1) {
        return rejectWithValue('Invalid pagination parameters provided.');
      }

      // 3. Start performance tracking or time measurement
      const fetchStartTime = performance.now();

      // 4. Call projectService with payload filters.
      // Note: projectService internally handles caching and circuit breaking.
      const response = await projectService.getProjects(payload.filters, {
        page: payload.page,
        pageSize: payload.pageSize,
        sortBy: payload.sortBy,
        sortOrder: payload.sortOrder,
      });

      // 6. Track analytics with resource usage and performance
      const fetchTime = performance.now() - fetchStartTime;
      analytics.track('fetchProjects', {
        page: payload.page,
        pageSize: payload.pageSize,
        fetchTime,
        projectCount: response.items.length,
      });

      // 7. Transform response data to an array of Projects and validate via TS definitions
      const projects: Project[] = response.items;

      // 10. Return processed projects
      return projects;
    } catch (error: any) {
      // 8. In case of error, capture for analytics and return typed rejection
      analytics.track('fetchProjectsError', { error: error.message || 'Unknown error' });
      return rejectWithValue(error.message || 'Failed to fetch projects');
    }
  }
);

/***************************************************************************************************
 * Action Creator: createProject
 * -------------------------------------------------------------------------------------------------
 * Async thunk action for creating a new project. Returns a Promise of the created Project object.
 * Steps:
 *  1. Validate input data against the schema (handled by type checking and potential runtime checks).
 *  2. Start performance tracking.
 *  3. Prepare optimistic update (optional, can be implemented in reducers).
 *  4. Call projectService.createProject with validated data.
 *  5. Track analytics event for creation.
 *  6. Handle success/failure scenarios with robust error handling.
 *  7. Update store cache automatically via fulfilled action if needed.
 *  8. Trigger notifications (could be handled in middleware or extra reducers).
 *  9. Return the created project object.
 **************************************************************************************************/
export const createProject = createAsyncThunk<
  Project,
  ProjectCreateInput,
  ThunkConfig
>(
  ProjectsActionTypes.CREATE_PROJECT, // Action type from projects.types
  async (projectData, { rejectWithValue }) => {
    try {
      // 2. Start performance tracking.
      const createStartTime = performance.now();

      // 4. Call projectService to create the project.
      const response = await projectService.createProject(projectData);

      // 5. Track analytics event for creation success.
      const createTime = performance.now() - createStartTime;
      analytics.track('createProjectSuccess', {
        projectName: projectData.name,
        createTime,
      });

      // 9. Return the created project from the service response.
      // projectService returns ProjectResponse, so response.data should be the Project entity.
      if (!response.data) {
        // If the backend responded but did not provide a valid Project object.
        return rejectWithValue('No valid project data returned from createProject API.');
      }
      return response.data;
    } catch (error: any) {
      // 6. Handle failures with advanced error handling.
      analytics.track('createProjectError', {
        message: error.message || 'Unknown error',
        projectData,
      });
      return rejectWithValue(error.message || 'Failed to create project');
    }
  }
);

/***************************************************************************************************
 * Action Creator: updateProject
 * -------------------------------------------------------------------------------------------------
 * Async thunk action for updating an existing project. Returns a Promise of the updated Project.
 * The payload is an object containing:
 *   id: string - the project ID
 *   data: ProjectUpdateInput - updated fields
 *   options: UpdateOptions - advanced concurrency or resource usage settings if needed
 *
 * Steps:
 *  1. Validate payload integrity and concurrency config.
 *  2. Start performance measurement for analytics.
 *  3. Apply an optional optimistic update in the reducer if desired.
 *  4. Call projectService.updateProject to perform the actual API call.
 *  5. Track analytics detailing the update operation.
 *  6. Handle success/failure scenarios with advanced error management.
 *  7. Invalidate or refresh caches as needed in the reducers (or rely on service).
 *  8. Trigger notifications about the update (reducers or side effect).
 *  9. Return the updated project from the API.
 **************************************************************************************************/
export const updateProject = createAsyncThunk<
  Project,
  { id: string; data: ProjectUpdateInput; options?: UpdateOptions },
  ThunkConfig
>(
  ProjectsActionTypes.UPDATE_PROJECT, // Redux action type constant
  async (payload, { rejectWithValue }) => {
    const { id, data } = payload;
    try {
      // 2. Start performance measurement
      const updateStartTime = performance.now();

      // 4. Execute the update via projectService
      const response = await projectService.updateProject(id, data);

      // 5. Track analytics with time and updated project status
      const updateTime = performance.now() - updateStartTime;
      analytics.track('updateProjectSuccess', {
        projectId: id,
        newStatus: data.status,
        updateTime,
      });

      // 9. Return the updated project object
      if (!response.data) {
        return rejectWithValue('No valid project data returned from updateProject API.');
      }
      return response.data;
    } catch (error: any) {
      // 6. Advanced error management with analytics
      analytics.track('updateProjectError', {
        projectId: id,
        message: error.message || 'Unknown error',
      });
      return rejectWithValue(error.message || 'Failed to update project');
    }
  }
);

/***************************************************************************************************
 * Action Creator: deleteProject
 * -------------------------------------------------------------------------------------------------
 * Async thunk action for deleting a project. Returns a Promise<void> upon success.
 * Parameters:
 *   projectId: string - ID of the project to delete
 *   options?: DeleteOptions - advanced deletion or cleanup config
 *
 * Steps:
 *  1. Validate user permissions and project existence (could be done in a guard or the service).
 *  2. Start performance tracking for analytics.
 *  3. Prepare optimistic deletion in the reducer if desired.
 *  4. Call projectService.deleteProject to remove from the backend.
 *  5. Track analytics event for resource cleanup.
 *  6. Cleanup associated resources or state within reducers if necessary.
 *  7. Invalidate or refresh local caches (handled in the service or extra reducers).
 *  8. Trigger notifications or system logs for final confirmation.
 **************************************************************************************************/
export const deleteProject = createAsyncThunk<
  void,
  { projectId: string; options?: DeleteOptions },
  ThunkConfig
>(
  ProjectsActionTypes.DELETE_PROJECT, // Action constant
  async ({ projectId }, { rejectWithValue }) => {
    try {
      // 2. Start performance measurement
      const deleteStartTime = performance.now();

      // 4. Perform the deletion via projectService
      await projectService.deleteProject(projectId);

      // 5. Track analytics for project deletion
      const deleteTime = performance.now() - deleteStartTime;
      analytics.track('deleteProjectSuccess', { projectId, deleteTime });
    } catch (error: any) {
      // 6. Error management with analytics
      analytics.track('deleteProjectError', {
        projectId,
        message: error.message || 'Unknown error',
      });
      return rejectWithValue(error.message || 'Failed to delete project');
    }
  }
);

/***************************************************************************************************
 * Action Creator: selectProject
 * -------------------------------------------------------------------------------------------------
 * A synchronous action creator for selecting a project in the Redux store, returning a typed
 * PayloadAction encapsulating the project ID. Also includes analytics tracking to record user
 * selection behavior in real time.
 *
 * Steps:
 *  1. Validate the project ID existence or format.
 *  2. Track selection analytics event.
 *  3. Create an action payload with the relevant project ID and optional config.
 *  4. Return a fully typed PayloadAction for dispatching.
 **************************************************************************************************/
export function selectProject(
  projectId: string,
  options?: SelectOptions
): PayloadAction<SelectProjectActionPayload> {
  // 1. Minimal validation
  if (!projectId) {
    throw new Error('selectProject called without a valid project ID');
  }

  // 2. Track analytics
  analytics.track('selectProject', {
    projectId,
    readOnly: options?.readOnly || false,
  });

  // 3 & 4. Return a typed payload action
  return {
    type: ProjectsActionTypes.SELECT_PROJECT,
    payload: {
      id: projectId,
    },
  };
}