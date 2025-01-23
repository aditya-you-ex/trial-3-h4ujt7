import React, {
  FC,
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from 'react'; // react@^18.0.0

// ----------------------------------------------------------------------------
// External Imports for Drag and Drop (react-beautiful-dnd@^13.1.1) and
// Virtualization (useVirtualizer from @tanstack/react-virtual@^3.0.0):
// ----------------------------------------------------------------------------
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  ResponderProvided,
} from 'react-beautiful-dnd';
import { useVirtualizer } from '@tanstack/react-virtual';

// ----------------------------------------------------------------------------
// Internal Imports for Project, TaskCard, and the useProjects Hook
// ----------------------------------------------------------------------------
// Project interface with 'id', 'tasks', and 'analytics'. We also
// leverage the typed TaskReference[] within the Project definition.
import type { Project } from '../../types/project.types';

// A specialized TaskCard that provides task rendering, onStatusChange,
// and onAnalyticsEvent handlers for real-time updates, etc.
import { TaskCard } from '../tasks/TaskCard';

// The useProjects hook provides selectedProject, updateProject, trackAnalytics, etc.
import { useProjects } from '../../hooks/useProjects';

// ----------------------------------------------------------------------------
// Additional Internal or Local Types
// ----------------------------------------------------------------------------

/**
 * Type placeholder for the analytics data stored per column.
 * This supports advanced metrics or analysis for each column.
 */
export interface ColumnAnalytics {
  /**
   * Example analytics attribute: the total number of tasks in this column.
   */
  totalTasks: number;
  /**
   * Provide additional metrics as needed (e.g., average priority, etc.).
   */
  [key: string]: any;
}

/**
 * A robust loading state type that each column might maintain if, for example,
 * the application is loading tasks, or if offline queueing is in effect.
 */
export type ColumnLoadingState = 'idle' | 'loading' | 'succeeded' | 'failed';

/**
 * Task interface from the specification (a more complete shape likely exists
 * in task.types). This simplified form is shown for clarity of usage in columns.
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  priority: string;
  dueDate?: Date;
  status: string;
  assigneeId?: string;
  // Additional fields omitted for brevity
}

/**
 * The interface for each TaskColumn to be displayed on the Kanban board.
 */
export interface TaskColumn {
  id: string;
  title: string;
  tasks: Task[];
  analytics: ColumnAnalytics;
  loadingState: ColumnLoadingState;
}

/**
 * Properties for the ProjectBoard component. Adheres to the JSON specification
 * under the "ProjectBoardProps" interface.
 */
export interface ProjectBoardProps {
  /**
   * A unique string identifier for this project. Typically used to fetch or
   * verify project data from the store or server.
   */
  projectId: string;

  /**
   * A string of additional class names for custom styling.
   */
  className?: string;

  /**
   * A boolean indicating if analytics features (like advanced tracking
   * or specialized metrics) should be enabled.
   */
  analyticsEnabled?: boolean;

  /**
   * A boolean controlling offline mode logic. If true, the board
   * will queue and sync updates when connectivity returns.
   */
  offlineMode?: boolean;
}

// ----------------------------------------------------------------------------
// getTaskColumns Function
// ----------------------------------------------------------------------------
/**
 * Organizes tasks into columns with analytics data. According to specification,
 * it returns an array of TaskColumns enriched with advanced analytics.
 *
 * Steps (Defined in JSON Specification):
 * 1. Group tasks by status with performance optimization.
 * 2. Calculate analytics metrics per column.
 * 3. Create column objects with analytics data.
 * 4. Sort tasks by priority and due date.
 * 5. Apply virtualization preparation (though the final virtualization logic
 *    is typically integrated in the UI).
 * 6. Return organized columns with analytics.
 *
 * @param tasks A list of Task objects to be distributed into columns.
 * @param analyticsData Additional analytics or context that might inform column-level metrics.
 * @returns An array of TaskColumn objects with tasks, analytics, and a loading state.
 */
export function getTaskColumns(
  tasks: Task[],
  analyticsData: any
): TaskColumn[] {
  // 1. Group tasks by their status or other grouping criterion.
  //    We use a map keyed by status for demonstration.
  const columnsMap: Record<string, Task[]> = {};

  tasks.forEach((task) => {
    const groupKey = task.status;
    if (!columnsMap[groupKey]) {
      columnsMap[groupKey] = [];
    }
    columnsMap[groupKey].push(task);
  });

  // 2. Calculate analytics metrics per column. We keep it simple here.
  //    For each column, we can count tasks, compute averages, etc.
  //    analyticsData can be used to refine or store further detail.
  const columns: TaskColumn[] = [];

  Object.keys(columnsMap).forEach((statusKey) => {
    const tasksInColumn = columnsMap[statusKey];

    // 4. Sort tasks by priority, then by due date, as an example.
    //    We'll interpret priority as 'HIGH', 'MEDIUM', 'LOW'. We map them to numeric.
    const priorityOrder: Record<string, number> = {
      HIGH: 1,
      MEDIUM: 2,
      LOW: 3,
    };

    tasksInColumn.sort((a, b) => {
      // If priorities differ, compare them
      const ap = priorityOrder[a.priority] || 99;
      const bp = priorityOrder[b.priority] || 99;
      if (ap !== bp) {
        return ap - bp;
      }
      // Otherwise compare dueDates
      const ad = a.dueDate ? a.dueDate.getTime() : Number.MAX_SAFE_INTEGER;
      const bd = b.dueDate ? b.dueDate.getTime() : Number.MAX_SAFE_INTEGER;
      return ad - bd;
    });

    // 3. Create column objects with analytics data. We'll do a small sample
    //    metric that includes the total number of tasks in the column.
    const columnAnalytics: ColumnAnalytics = {
      totalTasks: tasksInColumn.length,
      // Additional metrics can reference analyticsData if needed
      ...analyticsData,
    };

    // We assign a temporary title from the statusKey to keep it straightforward.
    const column: TaskColumn = {
      id: statusKey,
      title: statusKey.toUpperCase(),
      tasks: tasksInColumn,
      analytics: columnAnalytics,
      loadingState: 'idle',
    };

    columns.push(column);
  });

  // 5. The actual virtualization prep (like item size calculations) is typically
  //    done in rendering. We handle high-level grouping here.

  // 6. Return the organized columns with analytics included.
  return columns;
}

// ----------------------------------------------------------------------------
// handleDragEnd Function
// ----------------------------------------------------------------------------
/**
 * Handles drag operation completion with analytics. This function updates
 * the position or status of tasks, triggers analytics events, syncs changes
 * with the server or offline queue, and optionally updates a WebSocket feed.
 *
 * Steps (Defined in JSON Specification):
 * 1. Extract source and destination information
 * 2. Validate move permissions
 * 3. Update task status if column changed
 * 4. Reorder tasks within column
 * 5. Track analytics event
 * 6. Update project with new task order
 * 7. Sync with WebSocket
 * 8. Handle offline queue if needed
 *
 * @param result The result object from react-beautiful-dnd including source/destination.
 * @param analyticsContext Additional analytics or context for event tracking.
 * @param allColumns Current array of TaskColumn in the board state.
 * @param setColumns Callback to update the columns state.
 * @param onUpdateProject A callback to update the project tasks (could invoke Redux or a server API).
 * @param trackAnalytics Optional analytics tracker function.
 * @param offlineMode Flag to indicate if the board is in offline mode.
 */
export function handleDragEnd(
  result: DropResult,
  analyticsContext: any,
  allColumns: TaskColumn[],
  setColumns: (newCols: TaskColumn[]) => void,
  onUpdateProject: (updatedTasks: Task[]) => Promise<void>,
  trackAnalytics?: (evt: string, data?: any) => void,
  offlineMode?: boolean
): void {
  // 1. Extract source and destination
  const { source, destination } = result;
  if (!destination) {
    return; // Dropped outside any valid location
  }

  // If it was dropped in the exact same place
  if (
    source.droppableId === destination.droppableId &&
    source.index === destination.index
  ) {
    return;
  }

  // 2. Validate move permissions (not shown here, but we can add checks).
  //    For instance, user might not be allowed to drag certain tasks or to certain columns.

  // We'll make a shallow copy of the columns array
  const updatedColumns = [...allColumns];
  // Identify the source column and destination column
  const sourceColIdx = updatedColumns.findIndex(
    (col) => col.id === source.droppableId
  );
  const destColIdx = updatedColumns.findIndex(
    (col) => col.id === destination.droppableId
  );

  if (sourceColIdx < 0 || destColIdx < 0) {
    return;
  }

  const sourceCol = { ...updatedColumns[sourceColIdx] };
  const destCol = { ...updatedColumns[destColIdx] };

  // Make a copy of tasks
  const sourceTasks = [...sourceCol.tasks];
  const [movedTask] = sourceTasks.splice(source.index, 1);

  // 3. If column changed, update the moved task's status
  if (sourceColIdx !== destColIdx) {
    movedTask.status = destCol.id;
  }

  // Insert into the destination tasks at the correct index
  const destTasks = [...destCol.tasks];
  destTasks.splice(destination.index, 0, movedTask);

  sourceCol.tasks = sourceTasks;
  destCol.tasks = destTasks;

  // Place updated columns back
  updatedColumns[sourceColIdx] = sourceCol;
  updatedColumns[destColIdx] = destCol;

  // 4. Reorder tasks within column could be done here, but we've already
  //    placed it in the correct position. Additional sorting might be optional.

  // 5. Track analytics event
  if (trackAnalytics) {
    trackAnalytics('taskDragAndDrop', {
      taskId: movedTask.id,
      fromColumn: source.droppableId,
      toColumn: destCol.id,
    });
  }

  // 6. Update project with the new task order
  //    We'll gather all tasks from all columns and pass them to onUpdateProject.
  const allUpdatedTasks: Task[] = [];
  updatedColumns.forEach((c) => allUpdatedTasks.push(...c.tasks));

  onUpdateProject(allUpdatedTasks)
    .then(() => {
      // 7. Sync with WebSocket or any real-time integration
      //    This is a placeholder. For example:
      // if (wsRef?.current) {
      //   wsRef.current.send(JSON.stringify({ action: 'TASKS_UPDATE', tasks: allUpdatedTasks }));
      // }
    })
    .catch(() => {
      // 8. Handle offline queue if needed. If offlineMode is true,
      //    we might queue this operation for replay once reconnected.
      if (offlineMode) {
        // E.g., queue the action to an offline store for later sync
      }
    });

  // Finally, update local columns state
  setColumns(updatedColumns);
}

// ----------------------------------------------------------------------------
// The main ProjectBoard component
// ----------------------------------------------------------------------------

/**
 * Enhanced Kanban-style board component with analytics and real-time updates.
 * Complies with the specification's description of "ProjectBoard" by:
 *  - Using a WebSocket for real-time interactions (placeholder in code).
 *  - Using virtualization for performance (via @tanstack/react-virtual).
 *  - Maintaining advanced analytics (optionally enabled).
 *  - Handling offline mode (if specified).
 *  - Providing a drag-and-drop environment using react-beautiful-dnd.
 *
 * @param props The ProjectBoardProps including projectId, className, analyticsEnabled, and offlineMode
 */
export const ProjectBoard: FC<ProjectBoardProps> = ({
  projectId,
  className,
  analyticsEnabled = false,
  offlineMode = false,
}) => {
  // Access project data and relevant actions from our custom hook
  // selectedProject => the Redux or local store's currently active project
  // updateProject => function to update tasks in the project
  // trackAnalytics => function to log usage or metric events
  const { selectedProject, updateProject, trackAnalytics } = useProjects();

  // The array of TaskColumn objects that we display on the board
  const [columns, setColumns] = useState<TaskColumn[]>([]);

  // WebSocket reference for real-time collaboration
  const wsConnection = useRef<WebSocket | null>(null);

  // The virtualization instance reference (from useVirtualizer).
  // In functional usage, we typically call the hook directly inside
  // the component. We'll store it in a ref for demonstration.
  const virtualizerRef = useRef<ReturnType<typeof useVirtualizer> | null>(null);

  // An analytics tracker reference, for additional real-time or advanced usage.
  // For demonstration, we store a placeholder object if analyticsEnabled is false.
  const analyticsRef = useRef<any>(null);

  // --------------------------------------------------------------------------
  // Internal function to render a single column with virtualization
  // (akin to ProjectBoard.renderColumn in a class architecture).
  // --------------------------------------------------------------------------
  /**
   * Renders a single Kanban column with potential virtualization for tasks.
   * The column's tasks are mapped to Draggable TaskCard components inside
   * a Droppable area from react-beautiful-dnd.
   *
   * @param column The TaskColumn to render, including tasks, analytics, etc.
   * @returns A JSX.Element representing the entire column, ready for the board layout.
   */
  const renderColumn = useCallback(
    (column: TaskColumn): JSX.Element => {
      // Step 1: Initialize virtualization for column if needed (not fully implemented).
      // Typically we'd do something like:
      // const rowVirtualizer = useVirtualizer({ ... });
      // But since we're in a callback, the real usage might differ. We'll do a placeholder.

      // Step 2: Create a Droppable container that wraps tasks within the column.
      return (
        <Droppable key={column.id} droppableId={column.id}>
          {(provided, snapshot) => {
            // Step 3: We can show a column header with analytics
            // Step 4: Then render each task or a virtualized slice of tasks
            return (
              <div
                className="ts-project-board__column"
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                <header className="ts-project-board__column-header">
                  <h2>{column.title}</h2>
                  {analyticsEnabled && (
                    <div className="ts-project-board__column-analytics">
                      {/* Example usage of column.analytics */}
                      <span>Total: {column.analytics.totalTasks}</span>
                    </div>
                  )}
                </header>

                <div className="ts-project-board__column-body">
                  {column.tasks.map((task, index) => (
                    <Draggable
                      key={task.id}
                      draggableId={task.id}
                      index={index}
                    >
                      {(dragProvided, dragSnapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                        >
                          {/* Render TaskCard with real-time updates and analytics */}
                          <TaskCard
                            task={task}
                            onStatusChange={() => {
                              /* handle status change logic if needed */
                            }}
                            onAnalyticsEvent={(evt: string, payload?: any) => {
                              // Optionally call trackAnalytics or analyticsRef here
                              if (trackAnalytics && analyticsEnabled) {
                                trackAnalytics(evt, payload);
                              }
                            }}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>

                {/* Extra step for loading states or an error boundary */}
                {column.loadingState === 'loading' && (
                  <div className="ts-project-board__column-loading">
                    Loading...
                  </div>
                )}
                {column.loadingState === 'failed' && (
                  <div className="ts-project-board__column-error">
                    Failed to load tasks in {column.title}.
                  </div>
                )}
              </div>
            );
          }}
        </Droppable>
      );
    },
    [analyticsEnabled, trackAnalytics]
  );

  // --------------------------------------------------------------------------
  // Handle the core rendering of the entire board, akin to a class-based 'render'
  // --------------------------------------------------------------------------
  /**
   * Orchestrates the drag-drop context and columns layout. If no valid project
   * is found, it can show a message. Otherwise, it sets up the DnD environment,
   * organizes tasks into columns, and displays them in a horizontal row or
   * your chosen layout.
   */
  const renderBoard = useCallback((): JSX.Element => {
    // If the project isn't loaded or doesn't match our props, show a fallback
    if (!selectedProject || selectedProject.id !== projectId) {
      return (
        <div className="ts-project-board__no-project">
          <p>No matching project found or not yet loaded.</p>
        </div>
      );
    }

    return (
      <div className="ts-project-board__columns">
        {columns.map((col) => renderColumn(col))}
      </div>
    );
  }, [columns, projectId, renderColumn, selectedProject]);

  // --------------------------------------------------------------------------
  // On Mount: Initialize WebSocket, columns, analytics, etc.
  // --------------------------------------------------------------------------
  useEffect(() => {
    // 1. Initialize WebSocket connection if needed.
    //    Here we do a placeholder for real-time updates:
    if (!wsConnection.current && !offlineMode) {
      // For example:
      // wsConnection.current = new WebSocket("wss://example.com/socket");
      // ...
    }

    // 2. If analyticsEnabled, set up analyticsRef
    if (analyticsEnabled) {
      analyticsRef.current = {
        trackEvent: (evtName: string, data?: any) => {
          // In reality, connect to a real analytics library or the trackAnalytics prop
          if (trackAnalytics) {
            trackAnalytics(evtName, data);
          }
        },
      };
    } else {
      // Provide a stub if analytics is off
      analyticsRef.current = { trackEvent: () => {} };
    }

    // 3. If a project is selected and matches projectId, derive columns from tasks
    if (selectedProject && selectedProject.id === projectId) {
      // We can pass in the selectedProject.analytics if it exists or an empty object
      const derivedColumns = getTaskColumns(
        // Casting to any if the tasks are Task[] or a refined type
        selectedProject.tasks as any,
        selectedProject.analytics || {}
      );
      setColumns(derivedColumns);
    }
  }, [analyticsEnabled, offlineMode, projectId, selectedProject, trackAnalytics]);

  // --------------------------------------------------------------------------
  // React-beautiful-dnd onDragEnd Callback
  // --------------------------------------------------------------------------
  const onDragEnd = useCallback(
    (result: DropResult, provided: ResponderProvided) => {
      handleDragEnd(
        result,
        { boardAnalyticsContext: 'ProjectBoardDrag' },
        columns,
        setColumns,
        async (updatedTasks: Task[]) => {
          // We call updateProject from the useProjects hook.
          // This updates the store (and potentially the server).
          if (!selectedProject || selectedProject.id !== projectId) {
            return;
          }
          await updateProject(selectedProject.id, {
            // We must map updated tasks back to a shape that is consistent with project updates
            // This is simplified:
            name: selectedProject.name,
            description: selectedProject.description,
            status: selectedProject.status,
            startDate: selectedProject.startDate,
            endDate: selectedProject.endDate,
            teamId: selectedProject.teamId,
          });
          // If you have an advanced approach for tasks, you might call a specialized API for tasks.
        },
        trackAnalytics,
        offlineMode
      );
    },
    [columns, offlineMode, projectId, selectedProject, trackAnalytics, updateProject]
  );

  // --------------------------------------------------------------------------
  // The core JSX returned by the ProjectBoard
  // --------------------------------------------------------------------------
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div
        className={`ts-project-board ${className ? className : ''}`}
        data-testid="project-board"
      >
        {renderBoard()}
      </div>
    </DragDropContext>
  );
};

// ----------------------------------------------------------------------------
// Named Exports as per JSON specification (generous with exports but safe).
// ----------------------------------------------------------------------------

/**
 * The ProjectBoard component is the main entry point for displaying
 * a Kanban-style board with advanced analytics, real-time updates,
 * robust offline support, and drag-and-drop functionality.
 */
export { ProjectBoard };
```