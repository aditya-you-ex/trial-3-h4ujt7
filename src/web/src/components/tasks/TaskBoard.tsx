import React, {
  FC, // react@^18.0.0
  useCallback,
  useMemo,
  useRef,
  useState,
  DragEvent,
  useEffect,
} from 'react';

// Third-Party Libraries (IE2 Compliant)
// @mui/material/styles version ^5.14.0
import { styled } from '@mui/material/styles';
// @tanstack/react-virtual version ^3.0.0
import { useVirtualizer } from '@tanstack/react-virtual';

// Internal Imports (IE1 Compliant)
import { TaskCard } from './TaskCard';
import { useWebSocket, ConnectionStatus } from '../../hooks/useWebSocket';
import { Task, TaskStatus } from '../../types/task.types';

/**
 * ColumnConfig
 * ----------------------------------------------------------------------------
 * Configuration for board columns, allowing advanced customization such as width,
 * visibility toggles, and WIP limits. Adheres to the technical specification
 * requiring columns to indicate TaskStatus, a desired width, and optional WIP limits.
 */
export interface ColumnConfig {
  /**
   * Identifies the specific task status associated with this column.
   * Examples: TaskStatus.BACKLOG, TaskStatus.IN_PROGRESS, etc.
   */
  status: TaskStatus;

  /**
   * The width of the column in pixels. Enables a flexible or
   * fixed-size layout while preserving responsive design capabilities.
   */
  width: number;

  /**
   * Determines if this column is visible. Hidden columns are not rendered.
   */
  visible: boolean;

  /**
   * Optional work-in-progress limit indicating how many tasks can be
   * displayed or assigned in this column before noticing capacity issues.
   */
  wipLimit?: number;
}

/**
 * TaskBoardProps
 * ----------------------------------------------------------------------------
 * Props for the TaskBoard component, defining the interface required
 * to render a Kanban-style board. Includes project reference, optional
 * className, an array of column configuration objects, a boolean for
 * enabling or disabling virtual scrolling, and a callback for column
 * config changes.
 */
export interface TaskBoardProps {
  /**
   * A unique identifier representing the project whose tasks
   * should be displayed on this board.
   */
  projectId: string;

  /**
   * An optional CSS class string for custom styling or layout rules
   * beyond the default. Can be used to override top-level margins,
   * backgrounds, or theme tokens.
   */
  className?: string;

  /**
   * An array of ColumnConfig objects, each describing how a board
   * column is displayed, including which TaskStatus it represents,
   * its width, visibility, and optional WIP limits.
   */
  columnConfig: ColumnConfig[];

  /**
   * Toggles advanced virtual scrolling functionality for boards
   * containing very large task counts. If true, each column individually
   * implements virtualization to enhance performance.
   */
  virtualScrollEnabled: boolean;

  /**
   * Callback triggered when the column configuration is updated
   * (e.g., changing widths, toggling visibility, or adjusting WIP limits).
   */
  onColumnConfigChange: (config: ColumnConfig[]) => void;
}

/**
 * useTaskBoardState
 * ----------------------------------------------------------------------------
 * A custom React hook for managing stateful logic in the TaskBoard.
 * Fulfills the specification's steps:
 * 1) Initialize WebSocket connection
 * 2) Set up virtual scrolling
 * 3) Handle real-time updates
 * 4) Manage optimistic updates
 * 5) Track drag-drop state
 *
 * Returns an object containing tasks, drag metadata, real-time events,
 * and helper methods for dynamic board interactions.
 */
function useTaskBoardState(
  projectId: string,
  columnConfig: ColumnConfig[]
) {
  /**
   * Step 1: Initialize WebSocket connection to receive real-time updates,
   * employing the useWebSocket hook with minimal configuration. The onMessage
   * callback processes incoming data from the server.
   */
  const {
    connectionStatus,
    isConnected,
    sendMessage,
  } = useWebSocket(`/projects/${projectId}/tasks`, {
    onMessage: (serverData: any) => {
      // Step 3: Handle real-time updates
      // Example shape of serverData: { action: 'UPDATE_TASKS', payload: updatedTasks }
      if (serverData?.action === 'UPDATE_TASKS' && Array.isArray(serverData.payload)) {
        setTasks(serverData.payload);
      }
    },
    onConnect: () => {
      // Potentially request initial tasks or subscribe to a channel
    },
    onDisconnect: () => {
      // Clean up or set offline flags
    },
    encryption: true,
    autoConnect: true,
  });

  /**
   * Tracks the local array of tasks for the board. This might be replaced or
   * merged with server-sourced data from WebSocket or an API call. The default
   * empty array is used until real-time or fetch-based population occurs.
   */
  const [tasks, setTasks] = useState<Task[]>([]);

  /**
   * Step 5: Track drag-drop state with a minimal approach. We store the ID
   * of the task currently being dragged and a small descriptor for visual
   * feedback. This can be extended for multi-task drag scenarios.
   */
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  /**
   * Step 4: Manage optimistic updates. For demonstration, if a user
   * performs a drag-and-drop reordering, we immediately update our
   * local tasks array, then issue a WebSocket or REST update. If the
   * server responds with a conflict, we can re-sync.
   *
   * This implementation is conceptual. The actual reordering logic
   * is found in handleDrop (in the actual TaskBoard component).
   */

  // Step 2 (partially): We'll incorporate virtualizer usage in the
  // parent component. The hook can also supply references or states
  // needed for virtualization if desired.

  return {
    tasks,
    setTasks,
    draggingTaskId,
    setDraggingTaskId,
    connectionStatus,
    isConnected,
    sendMessage,
  };
}

/**
 * handleDragStart
 * ----------------------------------------------------------------------------
 * Enhanced drag start handler fulfilling the specification's steps:
 * 1) Set drag data with task ID and status
 * 2) Update ARIA live region
 * 3) Add visual feedback classes
 * 4) Track drag start analytics
 *
 * @param e    - The DragEvent from React describing the drag start action
 * @param task - The Task object being dragged
 */
function handleDragStart(e: DragEvent<HTMLDivElement>, task: Task): void {
  // 1) Embed essential details into the dataTransfer object
  const data = { taskId: task.id, status: task.status };
  e.dataTransfer.setData('application/json', JSON.stringify(data));

  // 2) Update ARIA live region for accessibility
  const liveRegion = document.getElementById('ts-live-region');
  if (liveRegion) {
    liveRegion.textContent = `Dragging task ${task.title} with status ${task.status}.`;
  }

  // 3) Add visual feedback classes for the item being dragged
  e.currentTarget.classList.add('ts-dragging-visual');

  // 4) Track drag start analytics (placeholder)
  // For real usage, integrate with an analytics or logging service
  console.log(
    `Analytics: Dragging task [${task.id}] titled "${task.title}" from status "${task.status}".`
  );
}

/**
 * BoardContainer
 * ----------------------------------------------------------------------------
 * Enhanced main container with enterprise-flavored accessibility and
 * responsive design. Complies with cross-browser flex standards, ensures
 * 100% height usage, padding for layout, and accommodates overflow on
 * smaller screens.
 */
const BoardContainer = styled('div')(() => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  gap: '16px',
  padding: '16px',
  position: 'relative',
  // Accessibility
  role: 'region',
  'aria-label': 'Task board',

  // Basic media query for narrower screens
  '@media (max-width: 768px)': {
    overflowX: 'auto',
  },
}));

/**
 * Column
 * ----------------------------------------------------------------------------
 * Represents a single board column for tasks, enabling customization of
 * width, background color, border radius, and transition effects. Accepts
 * dynamic props for status-based labeling and width-based styling.
 */
const Column = styled('div')<{ width: number; status: TaskStatus }>(
  ({ width, status }) => ({
    display: 'flex',
    flexDirection: 'column',
    minWidth: '300px',
    maxWidth: `${width}px`,
    height: '100%',
    background: 'var(--color-background-secondary)',
    borderRadius: '8px',
    padding: '16px',
    transition: 'width 0.3s ease',
    // Accessibility
    role: 'region',
    'aria-label': `${status} column`,
  })
);

/**
 * TaskBoard
 * ----------------------------------------------------------------------------
 * The main functional component implementing a Kanban-style board for tasks.
 * Displays columns for statuses, includes drag-and-drop capabilities, and
 * updates tasks in real time using a WebSocket connection. Optional
 * virtual scrolling is available to handle large task counts with high
 * performance.
 */
export const TaskBoard: FC<TaskBoardProps> = ({
  projectId,
  className,
  columnConfig,
  virtualScrollEnabled,
  onColumnConfigChange,
}) => {
  /**
   * Use the custom hook for board state, including real-time updates and
   * local drag tracking.
   */
  const {
    tasks,
    setTasks,
    draggingTaskId,
    setDraggingTaskId,
    connectionStatus,
    isConnected,
    sendMessage,
  } = useTaskBoardState(projectId, columnConfig);

  /**
   * Example ARIA live region. This element is used to communicate
   * dynamic changes to screen readers (drag announcements, etc.).
   */
  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (liveRegionRef.current) {
      liveRegionRef.current.setAttribute('aria-live', 'polite');
      liveRegionRef.current.setAttribute('id', 'ts-live-region');
      liveRegionRef.current.setAttribute('style', 'position: absolute; left: -9999px;');
    }
  }, []);

  /**
   * Divides the tasks array by status for easy rendering into columns.
   * In a real system, we might optimize or augment this approach with
   * memoization or indexing. Here, the grouping is straightforward.
   */
  const tasksByStatus = useMemo(() => {
    const grouping: Record<string, Task[]> = {};
    columnConfig.forEach((col) => {
      grouping[col.status] = [];
    });
    tasks.forEach((t) => {
      if (!grouping[t.status]) {
        grouping[t.status] = [];
      }
      grouping[t.status].push(t);
    });
    return grouping;
  }, [tasks, columnConfig]);

  /**
   * handleDrop
   * --------------------------------------------------------------------------
   * Completes the drag-and-drop cycle by reading the transferred data, updating
   * the task's status, managing optimistic UI updates, and (in a real environment)
   * sending an update to the server over the WebSocket or a REST endpoint.
   */
  const handleDrop = useCallback(
    (ev: DragEvent<HTMLDivElement>, newStatus: TaskStatus) => {
      ev.preventDefault();
      ev.currentTarget.classList.remove('ts-drop-target-hover');

      try {
        const rawData = ev.dataTransfer.getData('application/json');
        const parsed = JSON.parse(rawData) as { taskId: string; status: TaskStatus };
        const { taskId } = parsed;

        // Update tasks array with new status
        setTasks((prev) => {
          const updated = prev.map((task) =>
            task.id === taskId ? { ...task, status: newStatus } : task
          );
          return updated;
        });

        // Example optimistic update via WebSocket
        sendMessage({
          action: 'UPDATE_TASK_STATUS',
          payload: { taskId, newStatus },
        });
      } catch (err) {
        // Log error or revert UI changes if necessary
        console.warn('Error parsing dropped data or updating status', err);
      } finally {
        setDraggingTaskId(null);
      }
    },
    [sendMessage, setTasks, setDraggingTaskId]
  );

  /**
   * handleDragOver
   * --------------------------------------------------------------------------
   * Prevents default to allow dropping and applies hover feedback on columns.
   */
  const handleDragOver = useCallback((ev: DragEvent<HTMLDivElement>) => {
    ev.preventDefault();
    if (!ev.currentTarget.classList.contains('ts-drop-target-hover')) {
      ev.currentTarget.classList.add('ts-drop-target-hover');
    }
  }, []);

  /**
   * handleDragLeave
   * --------------------------------------------------------------------------
   * Removes any drop target hover feedback when the drag leaves the column area.
   */
  const handleDragLeave = useCallback((ev: DragEvent<HTMLDivElement>) => {
    ev.currentTarget.classList.remove('ts-drop-target-hover');
  }, []);

  return (
    <BoardContainer className={className}>
      {/* Hidden live region for screen readers */}
      <div ref={liveRegionRef} />

      {/* Connection Status Display (Example) */}
      <div
        aria-live="polite"
        style={{
          fontSize: '0.9rem',
          color: connectionStatus === ConnectionStatus.ERROR ? 'red' : 'inherit',
        }}
      >
        {isConnected
          ? 'WebSocket Connected'
          : `WS State: ${connectionStatus} (Project: ${projectId})`}
      </div>

      {/* Render columns defined in columnConfig if visible */}
      <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '16px' }}>
        {columnConfig.map((col) => {
          if (!col.visible) return null;

          /**
           * Conditionally implement virtualization if virtualScrollEnabled is true.
           * We set up a parentRef and rowVirtualizer for the tasks assigned to this column.
           */
          if (virtualScrollEnabled) {
            const parentRef = useRef<HTMLDivElement | null>(null);
            const columnTasks = tasksByStatus[col.status] || [];

            /**
             * useVirtualizer for advanced performance with large numbers of tasks.
             * The size function estimates each row height. For simplicity, assume
             * a fixed ~80px. Production usage might measure dynamically or factor expansions.
             */
            const rowVirtualizer = useVirtualizer({
              count: columnTasks.length,
              getScrollElement: () => parentRef.current,
              estimateSize: () => 80,
            });

            return (
              <Column
                key={col.status}
                width={col.width}
                status={col.status}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.status)}
                onDragLeave={handleDragLeave}
              >
                <div
                  ref={parentRef}
                  style={{
                    overflowY: 'auto',
                    flex: '1 1 auto',
                    position: 'relative',
                    height: '100%',
                  }}
                >
                  <div
                    style={{
                      height: rowVirtualizer.getTotalSize(),
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                      const item = columnTasks[virtualRow.index];
                      return (
                        <div
                          key={item.id}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            transform: `translateY(${virtualRow.start}px)`,
                            width: '100%',
                          }}
                        >
                          <TaskCard
                            task={item}
                            draggable
                            onDragStart={(evt) => {
                              setDraggingTaskId(item.id);
                              handleDragStart(evt, item);
                            }}
                            onDragEnd={(endEvt) => {
                              endEvt.currentTarget.classList.remove(
                                'ts-dragging-visual'
                              );
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Column>
            );
          }

          /**
           * Without virtual scrolling, we simply map the tasks assigned to this column.
           */
          const normalTasks = tasksByStatus[col.status] || [];
          return (
            <Column
              key={col.status}
              width={col.width}
              status={col.status}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.status)}
              onDragLeave={handleDragLeave}
            >
              {normalTasks.map((taskItem) => (
                <TaskCard
                  key={taskItem.id}
                  task={taskItem}
                  draggable
                  onDragStart={(evt) => {
                    setDraggingTaskId(taskItem.id);
                    handleDragStart(evt, taskItem);
                  }}
                  onDragEnd={(endEvt) => {
                    endEvt.currentTarget.classList.remove('ts-dragging-visual');
                  }}
                />
              ))}
            </Column>
          );
        })}
      </div>
    </BoardContainer>
  );
};