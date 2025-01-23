/**
 * ============================================================================
 * tasks.selectors.ts
 * ============================================================================
 * 
 * This file contains Redux selector functions for accessing and computing
 * derived task state data from the TaskStream AI application's Redux store.
 * It implements memoized selectors using both createSelector (from
 * @reduxjs/toolkit ^1.9.0) and createCachedSelector (from re-reselect ^4.0.0)
 * to optimize performance, enable real-time updates, and integrate with
 * analytics for resource optimization.
 *
 * Requirements Addressed:
 * ----------------------------------------------------------------------------
 * 1) Task Management (Technical Specifications/1.2):
 *    - Offers efficient access to all tasks and sub-filtered tasks, enabling
 *      automated creation, assignment, and tracking functionalities.
 * 2) Real-time Updates (Technical Specifications/2.2 - Data Storage):
 *    - Employs memoized selectors for minimal recomputation, facilitating
 *      real-time UI updates in large-scale usage scenarios.
 * 3) Performance Optimization (Technical Specifications/2.5.2 - Scaling):
 *    - Utilizes advanced (cached) selectors with configurable caching for
 *      memory efficiency and minimal CPU usage under high load.
 * 4) Analytics Integration (Technical Specifications/2.2.1 - Analytics Engine):
 *    - Provides derived insights through selectTaskAnalytics, enabling
 *      resource optimization and predictive insights into task progression.
 *
 * Implementation Summary:
 * ----------------------------------------------------------------------------
 *  - selectTasksState: Base selector returning the tasks slice from RootState.
 *  - selectAllTasks: Memoized selector returning all tasks with a configurable
 *    cache size for performance.
 *  - selectTasksByStatus: Uses createCachedSelector to filter tasks by statuses,
 *    employing an advanced cache key resolver for high-frequency requests.
 *  - selectFilteredTasks: Uses createCachedSelector with composite filters
 *    (status, priority, assignee, date range, searchTerm) and a composite
 *    cache key to deliver comprehensive filtering with minimal recomputation.
 *  - selectTaskAnalytics: Aggregates data from all tasks (completion rates,
 *    resource usage) to produce high-level analytics insights. Memoized via
 *    createSelector to efficiently update resource optimization data.
 */

// -----------------------------------------------------------------------------
// External Imports
// -----------------------------------------------------------------------------
// @reduxjs/toolkit ^1.9.0
import { createSelector } from '@reduxjs/toolkit';
// re-reselect ^4.0.0
import createCachedSelector from 're-reselect';

// -----------------------------------------------------------------------------
// Internal Imports
// -----------------------------------------------------------------------------
import { RootState } from '../rootReducer'; // Type definition for the root Redux state
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskFilter
} from '../../types/task.types'; // Enhanced task types with analytics support

/**
 * -----------------------------------------------------------------------------
 * 1) selectTasksState
 * -----------------------------------------------------------------------------
 * Base selector that returns the tasks slice of the Redux state.
 *
 * Steps:
 *  - Access the `tasks` property from the root state.
 *  - Return the tasks state slice.
 */
export const selectTasksState = (state: RootState) => state.tasks;

/**
 * -----------------------------------------------------------------------------
 * 2) selectAllTasks
 * -----------------------------------------------------------------------------
 * Memoized selector that returns all tasks from the state. Demonstrates
 * a configurable cache size for performance optimization.
 *
 * Steps:
 *  - Use createSelector with selectTasksState.
 *  - Configure cache size based on task volume (e.g., maxSize = 100).
 *  - Return tasks array from state with memoization.
 */
export const selectAllTasks = createSelector(
  [selectTasksState],
  (tasksState) => tasksState.tasks,
  {
    // Optional advanced memoization configuration. If supported by RTK,
    // we can specify a maxSize for LRU-like caching. 
    // This helps in extremely large state usage scenarios.
    memoizeOptions: {
      maxSize: 100
    }
  }
);

/**
 * -----------------------------------------------------------------------------
 * 3) selectTasksByStatus
 * -----------------------------------------------------------------------------
 * Enhanced memoized selector that returns tasks filtered by one or multiple
 * statuses. Employs createCachedSelector for advanced caching and a custom
 * cache key resolver to handle varying sets of statuses.
 *
 * Steps:
 *  - Use createCachedSelector for advanced caching.
 *  - Filter tasks array by the given status array.
 *  - Implement cache key resolver for each distinct status combination.
 *  - Return filtered tasks array with optimized memoization.
 */
export const selectTasksByStatus = createCachedSelector(
  [
    selectAllTasks,
    (_state: RootState, statuses: TaskStatus[]) => statuses
  ],
  (allTasks: Task[], statuses: TaskStatus[]) => {
    return allTasks.filter((task) => statuses.includes(task.status));
  }
)(
  // Cache key resolver: transforms array of statuses into a stable string
  (_state: RootState, statuses: TaskStatus[]) => statuses.sort().join('|')
);

/**
 * -----------------------------------------------------------------------------
 * 4) selectFilteredTasks
 * -----------------------------------------------------------------------------
 * Advanced memoized selector for comprehensive task filtering. Supports
 * multiple statuses, priorities, assignee IDs, date range, and text search.
 *
 * Steps:
 *  - Use createCachedSelector with a composite key.
 *  - Apply status filters from filter.statuses.
 *  - Apply priority filters from filter.priorities.
 *  - Apply assignee filters from filter.assigneeIds.
 *  - Apply date range filter from filter.dateRange.
 *  - Apply text search using filter.searchTerm.
 *  - Optimize cache key generation for filter combinations.
 *  - Return the filtered tasks array (optionally sorted, if needed).
 */
export const selectFilteredTasks = createCachedSelector(
  [
    selectAllTasks,
    (_state: RootState, filter: TaskFilter) => filter
  ],
  (allTasks: Task[], filter: TaskFilter) => {
    const {
      statuses,
      priorities,
      assigneeIds,
      dateRange,
      searchTerm
    } = filter;

    // Step-by-step filtering:
    let filtered = allTasks;

    // 1) Filter by statuses (if any are provided)
    if (statuses && statuses.length > 0) {
      filtered = filtered.filter((task) => statuses.includes(task.status));
    }

    // 2) Filter by priorities (if provided)
    if (priorities && priorities.length > 0) {
      filtered = filtered.filter((task) => priorities.includes(task.priority));
    }

    // 3) Filter by assignee IDs (if provided)
    if (assigneeIds && assigneeIds.length > 0) {
      filtered = filtered.filter((task) => assigneeIds.includes(task.assigneeId));
    }

    // 4) Filter by date range (if provided)
    //    We assume dateRange has { start: Date; end: Date }, so we verify
    //    that the task.dueDate is within the start-end bounds.
    if (dateRange && dateRange.start && dateRange.end) {
      filtered = filtered.filter((task) => {
        const due = task.dueDate.getTime();
        const start = dateRange.start.getTime();
        const end = dateRange.end.getTime();
        return due >= start && due <= end;
      });
    }

    // 5) Apply a simple text search on task title or description if searchTerm is present
    //    (In a real application, more advanced search logic could be used)
    if (searchTerm && searchTerm.trim().length > 0) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter((task) => {
        const inTitle = task.title.toLowerCase().includes(lowerTerm);
        const inDescription = task.description.toLowerCase().includes(lowerTerm);
        return inTitle || inDescription;
      });
    }

    return filtered;
  }
)(
  // Composite cache key that incorporates all filter fields to ensure
  // correct memoization within advanced caching. We join arrays by comma,
  // convert dates to numeric timestamps, and fallback on empty values.
  (_state: RootState, filter: TaskFilter) => {
    const {
      statuses = [],
      priorities = [],
      assigneeIds = [],
      dateRange,
      searchTerm
    } = filter;

    const statusKey = statuses.slice().sort().join(',');
    const priorityKey = priorities.slice().sort().join(',');
    const assigneeKey = assigneeIds.slice().sort().join(',');
    const startKey = dateRange?.start ? dateRange.start.getTime() : '';
    const endKey = dateRange?.end ? dateRange.end.getTime() : '';
    const termKey = searchTerm || '';

    return `${statusKey}|${priorityKey}|${assigneeKey}|${startKey}|${endKey}|${termKey}`;
  }
);

/**
 * -----------------------------------------------------------------------------
 * 5) selectTaskAnalytics
 * -----------------------------------------------------------------------------
 * Memoized selector returning aggregated analytics data about the tasks
 * to support resource optimization or predictive insights.
 *
 * Steps:
 *  - Use createSelector with selectAllTasks.
 *  - Calculate task completion rates (e.g., # done / total).
 *  - Analyze resource utilization or performance metrics (illustrative logic).
 *  - Generate predictive insights (placeholder or minimal logic).
 *  - Return analytics data with memoization.
 */
export const selectTaskAnalytics = createSelector(
  [selectAllTasks],
  (allTasks: Task[]) => {
    // Example aggregated analytics structure
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter((t) => t.status === TaskStatus.DONE).length;
    const completionRate = totalTasks > 0
      ? (completedTasks / totalTasks) * 100
      : 0;

    // Example of 'resource utilization' or predictive logic:
    // For demonstration, we calculate a simple ratio based on tasks that are
    // nearing their due date, but in real usage, more advanced analysis would apply.
    const soonDue = allTasks.filter((t) => {
      const now = Date.now();
      const dueTime = t.dueDate.getTime();
      const dayInMs = 24 * 60 * 60 * 1000;
      // Mark tasks as "soon due" if they are within the next 3 days
      return (dueTime - now) <= (3 * dayInMs) && t.status !== TaskStatus.DONE;
    }).length;
    const resourceUtilization = totalTasks > 0
      ? (soonDue / totalTasks) * 100
      : 0;

    // Predictive insights (placeholder):
    let predictiveInsights = '';
    if (resourceUtilization > 50) {
      predictiveInsights = 'High volume of soon-due tasks! Consider reallocation.';
    } else {
      predictiveInsights = 'Resource usage within expected thresholds.';
    }

    // Return an analytics object that could be further expanded
    // in real time for resource management
    return {
      totalTasks,
      completedTasks,
      completionRate,
      resourceUtilization,
      predictiveInsights
    };
  }
);