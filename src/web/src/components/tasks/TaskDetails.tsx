/* eslint-disable max-len */
/* -----------------------------------------------------------------------------
 * TaskDetails Component
 * -----------------------------------------------------------------------------
 * This file implements a React component named "TaskDetails" that displays
 * comprehensive information about a specific Task, including its description,
 * status, priority, AI-extracted metadata, and resource metrics. It integrates
 * with real-time update streams, supports editing (if props.editable is true),
 * and can also display analytics insights (if props.showAnalytics is true).
 *
 * Requirements Addressed:
 *  - Task Management
 *    (Technical Specifications/1.2 System Overview/High-Level Description)
 *  - Task Board View
 *    (Technical Specifications/6.5 Project Board View)
 *  - UI Design Standards
 *    (Technical Specifications/6.2 Main Dashboard)
 *  - Analytics Integration
 *    (Technical Specifications/2.2.1 Core Components)
 *
 * Implementation Details:
 * 1) The component fetches task data by calling taskService.getTaskById().
 * 2) If showAnalytics is true, it also fetches analytics data using analyticsService.
 * 3) Real-time updates are established via taskService.subscribeToTaskUpdates()
 *    or getTaskUpdateStream() (depending on underlying service design).
 * 4) Users can edit task details if the "editable" prop is enabled.
 * 5) The component renders AI metadata, resource metrics, and optional analytics
 *    visualizations. Errors and loading states are handled gracefully.
 * 6) The onUpdate callback is triggered upon successful task updates.
 *
 * External Dependencies (per IE2):
 *  - react ^18.0.0
 *
 * Internal Dependencies (per IE1):
 *  - ../../types/task.types
 *    { Task, TaskStatus, TaskPriority, AIMetadata, ResourceMetrics }
 *  - ../../services/task.service
 *    { taskService => getTaskById, updateTask, getTaskUpdateStream, subscribeToTaskUpdates }
 *  - ../../services/analytics.service
 *    { analyticsService => getTaskAnalytics, getResourceMetrics }
 * -----------------------------------------------------------------------------
 */

import React, {
  useEffect, // ^18.0.0
  useState,  // ^18.0.0
  useMemo,   // ^18.0.0
  useCallback, // ^18.0.0
} from 'react';

import {
  Task,
  TaskStatus,
  TaskPriority,
  AIMetadata,
  // The JSON spec references ResourceMetrics as a separate type, so we alias:
  ResourceAnalytics as ResourceMetrics,
  TaskUpdateInput,
} from '../../types/task.types';

import {
  // The JSON specification states these methods exist in taskService.
  // The actual service snippet might differ, but we will assume they are implemented.
  getTaskById,
  updateTask,
  getTaskUpdateStream,
  subscribeToTaskUpdates,
} from '../../services/task.service';

import {
  // According to the JSON specification, these analytics methods are available.
  getTaskAnalytics,
  getResourceMetrics,
} from '../../services/analytics.service';

/** ----------------------------------------------------------------------------
 * Props Interface: TaskDetailsProps
 * Description:
 *   Defines the shape of properties that the TaskDetails component accepts.
 *   - taskId: the identifier of the task to display.
 *   - editable: whether the user can modify the task details.
 *   - onUpdate: optional callback invoked upon successful task updates.
 *   - showAnalytics: toggles analytics data fetching and display.
 *   - metricsConfig: optional configuration for resource metrics visuals.
 * ----------------------------------------------------------------------------
 */
export interface TaskDetailsProps {
  /** Unique identifier of the task we want to display. */
  taskId: string;
  /** If true, the user can edit task fields like title, description, status. */
  editable?: boolean;
  /**
   * Optional callback invoked after a successful task update. This
   * can be used to refresh parent data or trigger any external logic.
   */
  onUpdate?: () => void;
  /** If true, analytics data (resource usage, AI metrics) are fetched and displayed. */
  showAnalytics?: boolean;
  /** Optional configuration that can dictate how metrics are displayed or computed. */
  metricsConfig?: ResourceMetricsConfig;
}

/** ----------------------------------------------------------------------------
 * Interface: ResourceMetricsConfig
 * Description:
 *   Represents optional configuration details for controlling how resource
 *   metrics are fetched or displayed. This is an example structure that can
 *   be expanded based on actual system needs (e.g., toggling chart displays).
 * ----------------------------------------------------------------------------
 */
export interface ResourceMetricsConfig {
  showCharts?: boolean;
  showTrends?: boolean;
  // Extend as needed for advanced analytics settings...
}

/** ----------------------------------------------------------------------------
 * The TaskDetails component's internal states:
 *   - task        : The current Task object fetched from the service.
 *   - loading     : Whether the component is currently loading data or updating.
 *   - error       : Contains an error message if something goes wrong.
 *   - updateStream: A WebSocket or subscription handle for real-time updates.
 *   - analytics   : Holds analytics data relevant to the task (if showAnalytics is true).
 * ----------------------------------------------------------------------------
 */
type AnalyticsData = {
  // A placeholder type to store the result of getTaskAnalytics or getResourceMetrics,
  // could be refined further based on real usage.
  taskInsights?: any;
  resourceInfo?: any;
};

/**
 * TaskDetails: React.FC Implementation
 * ----------------------------------------------------------------------------
 * Renders and manages a single Task in an in-depth view, handling AI metadata,
 * resource metrics, real-time updates, and optional editing. If analytics are
 * requested, it displays additional charts and insights.
 */
export const TaskDetails: React.FC<TaskDetailsProps> = ({
  taskId,
  editable = false,
  onUpdate,
  showAnalytics = false,
  metricsConfig,
}) => {
  /** The core task object and related states */
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /** A reference to any real-time subscription mechanism or WebSocket. */
  const [updateStream, setUpdateStream] = useState<WebSocket | null>(null);

  /** Analytics data for deeper insights (AI or resource usage). */
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  // ===========================================================================
  // Function: fetchTaskDetails
  // Description (from JSON spec): Fetches task details and analytics data.
  // Steps:
  // 1) Call taskService.getTaskById with taskId.
  // 2) Fetch analytics data if showAnalytics is true.
  // 3) Update task and analytics states.
  // 4) Initialize WebSocket connection or subscription for real-time updates.
  // 5) Handle any errors during fetch with retry logic (simple try/catch here).
  // ===========================================================================
  const fetchTaskDetails = useCallback(async (theTaskId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      // 1) Call service to get base task data.
      const fetchedTask = await getTaskById(theTaskId);
      setTask(fetchedTask);

      // 2) If analytics are requested, fetch them. We'll demonstrate two examples:
      //    getTaskAnalytics and getResourceMetrics, as stated in the specification.
      if (showAnalytics) {
        const analyticsData: AnalyticsData = {};
        try {
          analyticsData.taskInsights = await getTaskAnalytics(theTaskId);
        } catch (analyticsErr) {
          // If an error occurs, we'll store a partial error or fallback.
          analyticsData.taskInsights = null;
        }

        if (metricsConfig) {
          // If there's a resource metrics config, fetch resource usage as well.
          try {
            analyticsData.resourceInfo = await getResourceMetrics(theTaskId, metricsConfig);
          } catch (resourceErr) {
            analyticsData.resourceInfo = null;
          }
        }
        setAnalytics(analyticsData);
      }

      // 3) Real-time updates: subscribe to an update stream. The JSON spec
      //    references either a method subscribeToTaskUpdates or getTaskUpdateStream.
      //    We'll demonstrate using subscribeToTaskUpdates for this example.
      const connection = await subscribeToTaskUpdates(theTaskId, (updatedTask: Task) => {
        // If we receive changes for this specific task, update local state.
        if (updatedTask.id === theTaskId) {
          setTask(updatedTask);
        }
      });
      setUpdateStream(connection); // e.g., if the method returns a WebSocket reference

    } catch (err: any) {
      // 4) Error handling with minimal retry logic. For demonstration, we simply store the error message.
      setError(err?.message ?? 'Failed to fetch task details.');
      setTask(null);
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, [showAnalytics, metricsConfig]);

  // ===========================================================================
  // Function: handleTaskUpdate
  // Description (from JSON spec): Handles updates to task details (optimistic).
  // Steps:
  // 1) Apply optimistic update to local state.
  // 2) Call taskService.updateTask with taskId and update data.
  // 3) Update analytics if needed.
  // 4) Refresh task details after update.
  // 5) Trigger onUpdate callback if provided.
  // 6) Handle errors and revert optimistic update if needed.
  // ===========================================================================
  const handleTaskUpdate = useCallback(
    async (updateData: TaskUpdateInput): Promise<void> => {
      if (!task) return;

      // 1) Store old state for possible revert
      const oldTask = { ...task };

      // 1a) Apply optimistic changes to local Task
      const optimisticTask = { ...task, ...updateData };
      setTask(optimisticTask);

      try {
        // 2) Perform actual update
        await updateTask(task.id, updateData);

        // 3) If analytics are displayed, consider refreshing partial data
        if (showAnalytics && analytics?.taskInsights) {
          // For demonstration, we might call getTaskAnalytics again or
          // a specialized method to update relevant analytics fields.
          const updatedAnalytics = await getTaskAnalytics(task.id);
          setAnalytics((prev) => ({
            ...prev,
            taskInsights: updatedAnalytics,
          }));
        }

        // 4) Optionally re-fetch the entire task details to ensure fresh data
        await fetchTaskDetails(task.id);

        // 5) If a callback is provided, trigger it
        if (onUpdate) {
          onUpdate();
        }
      } catch (err: any) {
        // 6) Revert optimistic update if the update fails.
        setTask(oldTask);
        setError(err?.message ?? 'Failed to update task.');
      }
    },
    [task, analytics, fetchTaskDetails, showAnalytics, onUpdate],
  );

  // ===========================================================================
  // Effect: On component mount or when taskId changes, fetch the latest details.
  // ===========================================================================
  useEffect(() => {
    fetchTaskDetails(taskId);
    // Cleanup: if we had a real WebSocket, we might close it on unmount.
    return () => {
      if (updateStream) {
        updateStream.close();
      }
    };
  }, [taskId, fetchTaskDetails, updateStream]);

  // ===========================================================================
  // Render Function: renderTaskMetadata (from JSON spec)
  // Steps:
  // 1) Render creation and update dates
  // 2) Render creator and assignee info
  // 3) Render AI metadata visualizations
  // 4) Render resource utilization metrics
  // 5) Render real-time collaboration indicators
  // ===========================================================================
  const renderTaskMetadata = useCallback((): JSX.Element => {
    if (!task) {
      return <div className="ts-task-metadata">No task data available.</div>;
    }

    // Gathering AI metadata
    const aiData: AIMetadata | undefined = task.aiMetadata;
    // Gathering resource metrics
    const metrics: ResourceMetrics | undefined = (task as any).resourceMetrics;

    return (
      <div className="ts-task-metadata" style={{ marginBottom: '1rem' }}>
        {/* 1) Creation / update dates from hypothetical task.metadata */}
        <section style={{ marginBottom: '0.5rem' }}>
          <strong>Created At:</strong>{' '}
          {(task as any)?.metadata?.createdAt
            ? new Date((task as any).metadata.createdAt).toLocaleString()
            : 'N/A'}
          <br />
          <strong>Last Updated:</strong>{' '}
          {(task as any)?.metadata?.updatedAt
            ? new Date((task as any).metadata.updatedAt).toLocaleString()
            : 'N/A'}
        </section>

        {/* 2) Creator and assignee */}
        <section style={{ marginBottom: '0.5rem' }}>
          <strong>Created By:</strong> {(task as any)?.metadata?.createdBy || 'Unknown'}
          <br />
          <strong>Assignee:</strong> {task.assigneeId || 'Unassigned'}
        </section>

        {/* 3) AI metadata visualization */}
        {aiData && (
          <section style={{ marginBottom: '0.5rem' }}>
            <h4>AI-Extracted Data</h4>
            <div>
              <em>Confidence:</em> {aiData.confidence.toFixed(2)}
            </div>
            <div>
              <em>Source:</em> {aiData.extractedFrom}
            </div>
            <div>
              <em>Entities:</em> {aiData.entities.join(', ')}
            </div>
            <div>
              <em>Keywords:</em> {aiData.keywords.join(', ')}
            </div>
          </section>
        )}

        {/* 4) Resource utilization metrics (partial example) */}
        {metrics && (
          <section style={{ marginBottom: '0.5rem' }}>
            <h4>Resource Usage Metrics</h4>
            <p><em>Resource ID:</em> {metrics.resourceId}</p>
            <p><em>Utilization:</em> {metrics.utilization}%</p>
            <p><em>Allocated Hours:</em> {metrics.allocatedHours}</p>
            <p><em>Actual Hours:</em> {metrics.actualHours}</p>
            <p><em>Efficiency:</em> {metrics.efficiency}%</p>
          </section>
        )}

        {/* 5) Real-time collab indicators (placeholder) */}
        <section style={{ marginBottom: '0.5rem' }}>
          <em>Collaboration Status: Live updates enabled</em>
        </section>
      </div>
    );
  }, [task]);

  // ===========================================================================
  // Render Function: renderAnalytics (from JSON spec)
  // Steps:
  // 1) Render resource utilization charts
  // 2) Render predictive metrics
  // 3) Render performance indicators
  // 4) Handle loading and error states
  // ===========================================================================
  const renderAnalytics = useCallback((): JSX.Element => {
    // If not requested or no analytics data, show minimal or placeholder
    if (!showAnalytics) {
      return <div className="ts-analytics-disabled">Analytics are disabled.</div>;
    }

    if (loading) {
      return <div className="ts-analytics-loading">Loading analytics...</div>;
    }

    if (error) {
      return <div className="ts-analytics-error">Error: {error}</div>;
    }

    if (!analytics || (!analytics.taskInsights && !analytics.resourceInfo)) {
      return <div className="ts-analytics-none">No analytics data available.</div>;
    }

    return (
      <div className="ts-analytics-section" style={{ marginTop: '1rem' }}>
        <h3>Analytics &amp; Performance</h3>

        {/* 1) Resource utilization charts (placeholder) */}
        {analytics.resourceInfo && (
          <div style={{ marginBottom: '0.75rem' }}>
            <strong>Resource Utilization Chart:</strong> [Placeholder Chart Visualization]
          </div>
        )}

        {/* 2) Predictive metrics (placeholder) */}
        {analytics.taskInsights?.predictions && (
          <div style={{ marginBottom: '0.75rem' }}>
            <strong>Predictive Insights:</strong> {JSON.stringify(analytics.taskInsights.predictions)}
          </div>
        )}

        {/* 3) Performance indicators (placeholder) */}
        {analytics.taskInsights?.performance && (
          <div style={{ marginBottom: '0.75rem' }}>
            <strong>Performance Indicators:</strong> {JSON.stringify(analytics.taskInsights.performance)}
          </div>
        )}
      </div>
    );
  }, [showAnalytics, loading, error, analytics]);

  // ===========================================================================
  // UI Event Handlers
  // ===========================================================================
  // An optional event to handle saving changes if "editable" is true. In a more
  // advanced UI, this might be a form submission or an inline editing approach.
  const onSaveChanges = async () => {
    if (!task) return;
    // For demonstration, let's pretend we have some updated fields:
    const updateData: TaskUpdateInput = {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
      dueDate: (task as any).dueDate || new Date(),
      estimatedHours: (task as any).estimatedHours || 0,
      actualHours: (task as any).actualHours || 0,
    };
    await handleTaskUpdate(updateData);
  };

  // ===========================================================================
  // Main Render
  // ===========================================================================
  return (
    <div className="task-details-container" style={{ padding: '1rem', border: '1px solid #ccc' }}>
      {loading && <div>Loading task details...</div>}
      {error && (
        <div style={{ color: 'red', marginBottom: '1rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && task && (
        <React.Fragment>
          <h2>{task.title}</h2>
          <p>{task.description}</p>

          {/* Render crucial fields like status and priority */}
          <div style={{ marginBottom: '1rem' }}>
            <strong>Status:</strong> {task.status}{' '}
            <strong>Priority:</strong> {task.priority}
          </div>

          {/* Metadata and AI details */}
          {renderTaskMetadata()}

          {/* Analytics section if requested */}
          {renderAnalytics()}

          {/* If editable, show an example button for updates */}
          {editable && (
            <button type="button" onClick={onSaveChanges} style={{ marginTop: '1rem' }}>
              Save Changes
            </button>
          )}
        </React.Fragment>
      )}
    </div>
  );
};

export default TaskDetails;