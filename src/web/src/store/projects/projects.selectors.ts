/**
 * -------------------------------------------------------------------------
 * projects.selectors.ts
 * -------------------------------------------------------------------------
 * Redux selectors for accessing and deriving project-related state from
 * the Redux store. Implements memoized selectors for efficient state
 * access and computed values with TypeScript type safety.
 *
 * Requirements Addressed:
 * 1) Project Management (Technical Specifications/1.2 System Overview/High-Level Description):
 *    - Provides structured access to all project data necessary for core
 *      project management functionality with task organization and team
 *      collaboration.
 * 2) State Management (Technical Specifications/4.2.2 Frontend Frameworks):
 *    - Uses Redux Toolkit ^1.9.5 for predictable state container management
 *      with memoized selectors.
 * 3) Performance Optimization (Technical Specifications/2.1 High-Level Architecture):
 *    - Implements createSelector for efficient state derivation and caching,
 *      preventing unnecessary re-renders.
 */

// -----------------------------------------------------------------------------
// External Imports
// -----------------------------------------------------------------------------
// @reduxjs/toolkit version: ^1.9.5
import { createSelector } from '@reduxjs/toolkit';

// -----------------------------------------------------------------------------
// Internal Imports
// -----------------------------------------------------------------------------
// RootState provides type definition for the complete Redux store shape.
import type { RootState } from '../rootReducer';
// Project interface definition and ProjectStatus enum for data integrity.
import type { Project, ProjectStatus } from '../../types/project.types';

/**
 * selectProjectsState
 * --------------------------------------------------------------------------
 * Base selector to get the entire 'projects' slice from the RootState.
 * Steps:
 * 1) Access and return the 'projects' property from the root state.
 *
 * @param {RootState} state - The global Redux store state
 * @returns {ProjectsState} The projects slice of the Redux store
 */
export const selectProjectsState = (state: RootState) => state.projects;

/**
 * selectAllProjects
 * --------------------------------------------------------------------------
 * Memoized selector to retrieve all Project entities from the store.
 * Steps:
 * 1) Use createSelector for memoization.
 * 2) Get projects state via selectProjectsState.
 * 3) Return the 'items' array from projects state with type safety.
 *
 * @param {RootState} state - The global Redux store state
 * @returns {Project[]} An array of all projects in the store
 */
export const selectAllProjects = createSelector(
  [selectProjectsState],
  (projectsState) => projectsState.items
);

/**
 * selectSelectedProject
 * --------------------------------------------------------------------------
 * Memoized selector to get the currently selected project from the store.
 * Steps:
 * 1) Use createSelector for memoization.
 * 2) Obtain the projects slice via selectProjectsState.
 * 3) Return selectedProject with proper type checking, allowing null if none.
 *
 * @param {RootState} state - The global Redux store state
 * @returns {Project | null} The currently selected project or null if none
 */
export const selectSelectedProject = createSelector(
  [selectProjectsState],
  (projectsState) => projectsState.selectedProject
);

/**
 * selectProjectsLoading
 * --------------------------------------------------------------------------
 * Memoized selector to determine if the projects slice is in a loading state.
 * Steps:
 * 1) Use createSelector for memoization.
 * 2) Obtain the projects slice via selectProjectsState.
 * 3) Return a boolean indicating if loading is in progress.
 *
 * @param {RootState} state - The global Redux store state
 * @returns {boolean} True if the projects slice is currently loading
 */
export const selectProjectsLoading = createSelector(
  [selectProjectsState],
  (projectsState) => projectsState.loading === 'loading'
);

/**
 * selectProjectsError
 * --------------------------------------------------------------------------
 * Memoized selector to retrieve any error message present in the projects slice.
 * Steps:
 * 1) Use createSelector for memoization.
 * 2) Obtain the projects slice via selectProjectsState.
 * 3) Return the error property, or null if there's no current error.
 *
 * @param {RootState} state - The global Redux store state
 * @returns {string | null} The error message if any, otherwise null
 */
export const selectProjectsError = createSelector(
  [selectProjectsState],
  (projectsState) => projectsState.error
);

/**
 * selectActiveProjects
 * --------------------------------------------------------------------------
 * Memoized selector to retrieve only the active projects, thus filtering
 * out any with other statuses. Useful for quick UI listings or analytics.
 * Steps:
 * 1) Use createSelector for memoization.
 * 2) Get all projects via selectAllProjects.
 * 3) Filter projects to those whose status is ProjectStatus.ACTIVE.
 * 4) Implement null checking (if items were unexpectedly null).
 * 5) Return the filtered array with strict type safety.
 *
 * @param {RootState} state - The global Redux store state
 * @returns {Project[]} An array of active projects
 */
export const selectActiveProjects = createSelector(
  [selectAllProjects],
  (allProjects) => {
    if (!allProjects) return [];
    return allProjects.filter((project) => project.status === ProjectStatus.ACTIVE);
  }
);

/**
 * selectProjectById
 * --------------------------------------------------------------------------
 * Memoized selector factory to retrieve a single project by a provided ID.
 * Steps:
 * 1) Create a selector that takes 'projectId' as a parameter.
 * 2) Obtain all projects using selectAllProjects.
 * 3) Locate the project matching the given ID.
 * 4) Implement proper memoization dependencies to avoid recomputation.
 * 5) Properly handle the undefined case if no matching project exists.
 *
 * @param {string} projectId - The unique ID of the requested project
 * @returns {function} A selector function returning Project | undefined
 */
export const selectProjectById = (projectId: string) =>
  createSelector([selectAllProjects], (allProjects) => {
    return allProjects.find((project) => project.id === projectId);
  });