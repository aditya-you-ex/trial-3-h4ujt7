import React, {
  FC,
  useState,
  useEffect,
  useCallback,
  useRef,
  KeyboardEvent,
  ChangeEvent,
} from 'react'; // react@^18.0.0
import { useParams } from 'react-router-dom'; // react-router-dom@^6.0.0
import { useWebSocket } from 'react-use-websocket'; // react-use-websocket@^4.0.0

/* -----------------------------------------------------------------------------
 * Internal Imports (IE1): Ensure that imported items are used correctly
 * -----------------------------------------------------------------------------*/
import { Project, ProjectStatus } from '../../types/project.types';
import {
  projectService,
  // Methods used: getProjectById, updateProject, subscribeToProjectUpdates
} from '../../services/project.service';
import { Card } from '../common/Card';

/* -----------------------------------------------------------------------------
 * External or Third-Party Imports (IE2): Include library version annotations
 * -----------------------------------------------------------------------------*/
// (Already done above in import statements as comments for react, react-router-dom, react-use-websocket)

/* -----------------------------------------------------------------------------
 * Local Interface: ProjectDetailsProps
 *   - Per JSON specification, it receives:
 *       projectId: string (the ID for the project to display)
 *       onUpdate: callback invoked whenever the project is updated
 * -----------------------------------------------------------------------------*/
export interface ProjectDetailsProps {
  /**
   * The unique ID of the project that this component should display.
   * If not provided externally, it may be read from route params as a fallback.
   */
  projectId: string;

  /**
   * A callback invoked whenever a project update occurs.
   * Receives the newly updated or retrieved Project as an argument.
   */
  onUpdate: (project: Project) => void;
}

/* -----------------------------------------------------------------------------
 * Custom Hook: useProjectDetails
 *   - Provides real-time, enhanced state management for a single project's details.
 *   - Implements the steps from the JSON specification:
 *        1) Initialize project & loading states
 *        2) Set up WebSocket connection for real-time updates
 *        3) Fetch initial project details
 *        4) Handle loading & error states with a retry mechanism
 *        5) Subscribe to real-time updates
 *        6) Clean up subscriptions on unmount
 *        7) Provide optimized update methods with debouncing
 * -----------------------------------------------------------------------------*/
export function useProjectDetails(projectId: string) {
  /**
   * The local component states:
   *  - project:      The current project details obtained from the API or real-time updates
   *  - loading:      A boolean to track the overall loading state
   *  - error:        A string or null to store errors that might occur
   *  - retryCount:   Number of retries attempted on initial fetch
   */
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  /**
   * A ref to help implement a simple debounce for updates if we allow editing.
   * If we have editable fields, we can store a timer or reference here.
   */
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Step 2: Use the projectService to derive a WebSocket URL for real-time updates.
   * The JSON specification references "subscribeToProjectUpdates" as a method that could
   * connect us to a real-time update feed. We'll assume it returns a valid WebSocket URL
   * or a suitable subscription endpoint.
   */
  const wsUrl = projectService.subscribeToProjectUpdates(projectId);

  /**
   * Integrate the react-use-websocket hook for receiving real-time messages with
   * minimal overhead. We'll parse the "lastJsonMessage" for updated Project data.
   */
  const {
    lastJsonMessage,
    readyState,
  } = useWebSocket(wsUrl, {
    // We can customize reconnection attempts, etc., if needed
    // e.g., reconnectionAttempts: 10,
    //       shouldReconnect: () => true
    share: true, // allow other components to share this WS if the library allows
    onOpen: () => {
      // For debugging or analytics, we might track that the websocket is connected
    },
    onError: (event) => {
      // In case the WebSocket fails, we might log or handle it
      console.error('Project updates WebSocket error', event);
    },
  });

  /**
   * Step 5: Whenever we receive a new "lastJsonMessage" from the WebSocket feed,
   * we interpret it as an updated version of the project. We'll assume the
   * back-end is sending a JSON shape matching the "Project" interface or an object
   * with a "project" field. We'll do a minimal check below.
   */
  useEffect(() => {
    if (lastJsonMessage && typeof lastJsonMessage === 'object') {
      // Attempt to parse the new project from the message
      const maybeUpdatedProject = (lastJsonMessage as any).project as Project | undefined;
      if (maybeUpdatedProject && maybeUpdatedProject.id === projectId) {
        setProject(maybeUpdatedProject);
        setError(null);
        setLoading(false);
      }
    }
  }, [lastJsonMessage, projectId]);

  /**
   * Step 3 & 4: A function to fetch the project's initial details from the backend.
   * We incorporate a minimal retry mechanism if the fetch fails, up to 3 attempts.
   */
  const fetchProject = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await projectService.getProjectById(projectId);
      if (response.data) {
        setProject(response.data);
        setError(null);
      } else {
        // Edge case: no data means an unexpected error scenario
        setError('No project data returned from server.');
      }
      setLoading(false);
      setRetryCount(0); // reset retry count on success
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || 'Failed to load the project details.');
      const newCount = retryCount + 1;
      setRetryCount(newCount);

      if (newCount < 3) {
        // After a short delay, attempt to fetch again
        setTimeout(() => {
          fetchProject();
        }, 2000);
      }
    }
  }, [projectId, retryCount]);

  /**
   * Step 3 (continued): On component mount, we fetch the project details.
   * This effect triggers only when projectId changes or if we run out of retry attempts.
   */
  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
    // Step 6 (partial): We'll return no unsubscribe here for the fetch call,
    // since the cleanup is not strictly needed beyond canceling the retry timeouts, etc.
    // We'll handle WebSocket cleanup through the library's built-in features.
  }, [projectId, fetchProject]);

  /**
   * Method: updateProjectName
   * Example of an "optimized" or "debounced" approach to updating the project's name
   * whenever a user modifies an input in an editable UI. We illustrate a typical
   * enterprise approach with a simple 500ms debouncing timer.
   */
  const updateProjectName = useCallback(
    (newName: string) => {
      if (!project) return;
      // Clear any existing timer
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      // Create a new timer to delay the update
      updateTimerRef.current = setTimeout(async () => {
        try {
          // We'll create a minimal partial update object
          const updated = {
            ...project,
            name: newName,
          };
          // Attempt to push changes using projectService.updateProject
          const response = await projectService.updateProject(project.id, {
            name: updated.name,
            description: updated.description,
            status: updated.status,
            startDate: project.startDate,
            endDate: project.endDate,
            teamId: project.teamId,
          });
          if (response.data) {
            setProject(response.data);
          }
          setError(null);
        } catch (err: any) {
          setError(err?.message || 'Failed to update project name.');
        }
      }, 500);
    },
    [project]
  );

  /**
   * Step 6: On unmount or projectId change, we ensure we clear any queued
   * timers for debounced saves. The "react-use-websocket" library also
   * handles unsubscription from the WebSocket automatically on unmount.
   */
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, []);

  /**
   * Step 7: Provide the relevant pieces of state and methods for the UI component.
   * This includes our local state, the loading/error statuses, and any update methods.
   */
  return {
    project,
    loading,
    error,
    readyState, // from WebSocket, can be used to show real-time connection status
    updateProjectName,
  };
}

/* -----------------------------------------------------------------------------
 * Main Component: ProjectDetails
 *   - Displays project info, status, tasks, team, analytics, etc.
 *   - Incorporates real-time updates via the custom hook.
 *   - Includes editing capabilities and accessibility.
 *   - Notifies parent via onUpdate() whenever the project is updated
 * -----------------------------------------------------------------------------*/
export const ProjectDetails: FC<ProjectDetailsProps> = ({
  projectId: propProjectId,
  onUpdate,
}) => {
  /**
   * In certain scenarios, the projectId might also be provided by the route.
   * We can incorporate a fallback using useParams if desired. The JSON specification
   * states we import "useParams," so we'll show usage here.
   */
  const { projectId: routeProjectId } = useParams();
  // Decide which projectId to actually use
  const effectiveProjectId = propProjectId || routeProjectId || '';

  /**
   * Use our custom hook to manage real-time project data, loading states, errors, etc.
   */
  const {
    project,
    loading,
    error,
    readyState,
    updateProjectName,
  } = useProjectDetails(effectiveProjectId);

  /**
   * Whenever the project changes from the hook (including real-time updates or fetch),
   * call the onUpdate callback so parent components can stay informed. We do so
   * inside a small effect to avoid extraneous calls if the project is null or unchanged.
   */
  useEffect(() => {
    if (project) {
      onUpdate(project);
    }
  }, [project, onUpdate]);

  /**
   * Handler for changing project name in an input field:
   *   - We'll call the "updateProjectName" from the hook.
   *   - This triggers a debounced update to the backend.
   */
  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    updateProjectName(newVal);
  };

  /**
   * Render a small label for the WebSocket connection status (for demonstration).
   * We can parse the "readyState" property from useWebSocket to show user-friendly text.
   */
  const getWebSocketStatusLabel = useCallback((): string => {
    switch (readyState) {
      case WebSocket.CONNECTING:
        return 'Connecting...';
      case WebSocket.OPEN:
        return 'Open';
      case WebSocket.CLOSING:
        return 'Closing...';
      case WebSocket.CLOSED:
        return 'Closed';
      default:
        return 'Uninitialized';
    }
  }, [readyState]);

  /**
   * Main Rendering:
   * We wrap the content in a Card for consistent styling, show loading or error states,
   * and if project data is available, display the relevant attributes:
   *   - Name (editable)
   *   - Description
   *   - Status
   *   - Analytics (resource utilization, etc.)
   *   - Tasks (show references if needed)
   *   - Team (basic reference, if any)
   */
  return (
    <Card
      elevation="medium"
      interactive={false}
      padding="medium"
      className="ts-project-details"
    >
      {/* Enhanced accessibility: Provide headings and semantic structure */}
      <h2 style={{ marginBottom: '1rem' }}>Project Details</h2>

      {loading && (
        <div
          aria-busy="true"
          aria-label="Loading project details"
          style={{ marginBottom: '1rem', fontStyle: 'italic' }}
        >
          Loading project information...
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{ color: 'red', marginBottom: '1rem', fontWeight: 'bold' }}
        >
          {error}
        </div>
      )}

      {/* If we have project data, display it. Otherwise, we might show a placeholder */}
      {project ? (
        <>
          {/* Example editable name field */}
          <label
            htmlFor="project-name-input"
            style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
            }}
          >
            Project Name:
          </label>
          <input
            id="project-name-input"
            type="text"
            defaultValue={project.name}
            onChange={handleNameChange}
            style={{
              marginBottom: '1rem',
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ccc',
              borderRadius: 4,
            }}
          />

          {/* Description - read-only in this example, could be made editable similarly */}
          <p>
            <strong>Description:</strong> {project.description}
          </p>

          {/* Project Status */}
          <p>
            <strong>Status:</strong> {project.status || ProjectStatus.PLANNING}
          </p>

          {/* Analytics section if available */}
          {project.analytics && (
            <div
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 4,
                padding: '0.75rem',
                marginTop: '1rem',
              }}
            >
              <h3>Project Analytics</h3>
              <p>
                <strong>Resource Utilization:</strong>{' '}
                {project.analytics.resourceUtilization}%
              </p>
              <p>
                <strong>Predicted Completion:</strong>{' '}
                {project.analytics.predictedCompletion
                  ? new Date(
                      project.analytics.predictedCompletion
                    ).toLocaleString()
                  : 'N/A'}
              </p>
              <p>
                <strong>Performance Metrics:</strong>{' '}
                {Object.entries(project.analytics.performanceMetrics).map(
                  ([key, val]) => {
                    return (
                      <span key={key}>
                        {key}: {val};{' '}
                      </span>
                    );
                  }
                )}
              </p>
              <p>
                <strong>Bottlenecks:</strong>{' '}
                {project.analytics.bottlenecks.length > 0
                  ? project.analytics.bottlenecks.join(', ')
                  : 'None'}
              </p>
            </div>
          )}

          {/* Task references, if available */}
          {project.tasks && project.tasks.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h3>Tasks</h3>
              <ul>
                {project.tasks.map((taskRef) => (
                  <li key={taskRef.id}>
                    <strong>{taskRef.title}</strong> | Status: {taskRef.status}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Team section: project.teamId is the reference; real data would come from another service */}
          {project.teamId && (
            <p style={{ marginTop: '1rem' }}>
              <strong>Team:</strong> {project.teamId}
            </p>
          )}

          {/* Real-time status from the WebSocket connection */}
          <p style={{ marginTop: '1rem', fontStyle: 'italic' }}>
            WebSocket Connection: {getWebSocketStatusLabel()}
          </p>
        </>
      ) : (
        !loading &&
        !error && (
          <div style={{ fontStyle: 'italic' }}>No Project Data Available.</div>
        )
      )}
    </Card>
  );
};