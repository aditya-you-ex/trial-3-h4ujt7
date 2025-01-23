import React, { memo, useMemo } from 'react'; // react@^18.0.0
import classNames from 'classnames'; // classnames@^2.3.2

// Internal imports per specification
import { Card } from '../common/Card'; // Using elevation and padding props
import { ProgressBar } from '../common/ProgressBar'; // Using value, variant, resourceUtilization props
import { Project } from '../../types/project.types'; // Extended project data interface with resourceMetrics
import { useProjects } from '../../hooks/useProjects'; // Enhanced hook: { projects, loading, error, refreshProjects }

/***************************************************************************************************
 * Interface: ProjectSummaryProps
 * --------------------------------------------------------------------------------------------------
 * Defines the shape of the props accepted by the ProjectSummary component. This interface aligns
 * with the JSON specification by including optional className and ariaLabel. Additional properties
 * (className, ariaLabel) may be used to tailor the component's styling or accessibility text.
 **************************************************************************************************/
export interface ProjectSummaryProps {
  /**
   * Optional additional CSS class names for layout or styling overrides.
   */
  className?: string;

  /**
   * An optional aria-label for improved accessibility, describing
   * the overall purpose or function of the ProjectSummary block.
   */
  ariaLabel?: string;
}

/***************************************************************************************************
 * Type: ProjectProgress
 * --------------------------------------------------------------------------------------------------
 * Defines a return shape for the computed project progress metrics, including:
 *  - progress: A numeric percentage representing completed tasks (0-100).
 *  - resourceUtilization: A numeric measure (0-100) representing how heavily
 *    the project's resources are utilized. Higher values indicate more resource usage.
 **************************************************************************************************/
interface ProjectProgress {
  progress: number;
  resourceUtilization: number;
}

/***************************************************************************************************
 * Function: getProjectProgress
 * --------------------------------------------------------------------------------------------------
 * Calculates the progress percentage and resource utilization of a given project. Steps:
 *  1. Retrieve total number of tasks from the project's resource metrics (if available).
 *  2. Retrieve number of completed tasks from the project's resource metrics.
 *  3. Compute the progress percentage (completed / total * 100), clamped to [0, 100].
 *  4. Extract resource utilization from the project's metrics, defaulting to 0 if absent.
 *  5. Return an object containing { progress, resourceUtilization } for the given project.
 **************************************************************************************************/
function getProjectProgress(project: Project): ProjectProgress {
  // STEP 1: Gather total tasks from resourceMetrics
  const totalTasks: number = project.resourceMetrics?.tasksTotal ?? 0;

  // STEP 2: Gather completed tasks from resourceMetrics
  const completedTasks: number = project.resourceMetrics?.tasksCompleted ?? 0;

  // Compute progress as a percentage, with a safe clamp between 0 and 100.
  // If totalTasks is 0, we consider progress as 0 to avoid division by zero.
  let computedProgress = 0;
  if (totalTasks > 0) {
    computedProgress = (completedTasks / totalTasks) * 100;
  }
  const progress = Math.max(0, Math.min(100, computedProgress));

  // STEP 4: Extract resource utilization from project.resourceMetrics
  // This is presumably a 0-100 numeric. Fall back to 0 if undefined.
  const resourceUtilization: number =
    project.resourceMetrics?.resourceUtilization ?? 0;

  // STEP 5: Return combined object
  return {
    progress,
    resourceUtilization,
  };
}

/***************************************************************************************************
 * Function: getProgressVariant
 * --------------------------------------------------------------------------------------------------
 * Determines the ProgressBar variant for visualizing the project's health or
 * status by analyzing its status, computed progress, and resource utilization.
 * Potential returns: 'default' | 'success' | 'warning' | 'error' | 'optimal'
 *
 * Steps:
 *  1. Check if the project status is completed or archived (example condition).
 *  2. Evaluate progress percentage for near-completion or low-completion edge cases.
 *  3. Analyze resource utilization for high or moderate usage to set warnings or errors.
 *  4. Apply threshold rules to pick an appropriate variant.
 *  5. Return the final variant string.
 **************************************************************************************************/
function getProgressVariant(
  project: Project,
  progressMetrics: ProjectProgress
): 'default' | 'success' | 'warning' | 'error' | 'optimal' {
  const { progress, resourceUtilization } = progressMetrics;

  // STEP 1: Check project status for a direct success condition
  // (Adjust logic to reflect domain-specific statuses).
  if (project.status === 'COMPLETED' || project.status === 'ARCHIVED') {
    return 'success';
  }

  // STEP 2: Evaluate progress percentage
  if (progress >= 100) {
    return 'success';
  }
  if (progress < 20) {
    // If progress is extremely low, we might highlight a warning
    // or normal 'default' based on user-defined thresholds
    return 'warning';
  }

  // STEP 3: Analyze resource utilization
  if (resourceUtilization > 90) {
    return 'error';
  } else if (resourceUtilization < 30) {
    return 'optimal';
  }

  // STEP 4: Additional thresholds can be inserted as needed
  // For demonstration, if progress < 50 or resourceUtilization is moderate:
  if (progress < 50) {
    return 'warning';
  }

  // STEP 5: Default variant if no special condition is met
  return 'default';
}

/***************************************************************************************************
 * Component: ProjectSummary
 * --------------------------------------------------------------------------------------------------
 * A functional React component (utilizing React.memo) that displays a concise summary
 * of active projects, including project name, completion progress, resource utilization,
 * and an interactive visual indicator (ProgressBar). This meets the requirements:
 *
 *  - Project Management (Core project org & collaboration)
 *  - Dashboard Design (Showing project progress indicators)
 *  - Resource Optimization (40% improvement via enhanced visual tracking)
 *
 * Key Implementation Details (from the JSON specification):
 *  1. Uses the useProjects hook to retrieve the list of current projects, loading status,
 *     error state, and refresh capability.
 *  2. Filters or highlights active projects (as desired for summary).
 *  3. For each project, computes progress and resource usage via getProjectProgress.
 *  4. Determines the progress bar variant from getProgressVariant for visual cues.
 *  5. Renders a Card with a ProgressBar, textual statuses, and resource metrics.
 *  6. Provides an optional button or mechanism to refresh or handle errors gracefully.
 *  7. Applies extensive comments and enterprise-grade, production-ready design patterns.
 **************************************************************************************************/
const ProjectSummary: React.FC<ProjectSummaryProps> = memo(
  ({ className, ariaLabel }) => {
    // Access project data, loading state, errors, and refresh function from the custom hook
    const { projects, loading, error, refreshProjects } = useProjects();

    /***********************************************************************************************
     * useMemo: activeProjects
     * ---------------------------------------------------------------------------------------------
     * Filters the projects array to only those with statuses the app deems 'active'. In a real
     * system, you'd adapt the condition to match actual statuses (e.g., 'ACTIVE', 'PLANNING' etc.).
     **********************************************************************************************/
    const activeProjects = useMemo(() => {
      return projects.filter((proj) => proj.status === 'ACTIVE');
    }, [projects]);

    /***********************************************************************************************
     * Handler: handleRefresh
     * ---------------------------------------------------------------------------------------------
     * Simple callback to forcibly refresh the projects data from the server or store. This
     * demonstrates how the user might update the summary if tasks or resource usage changes.
     **********************************************************************************************/
    const handleRefresh = () => {
      refreshProjects();
    };

    /***********************************************************************************************
     * Rendering: Return
     * ---------------------------------------------------------------------------------------------
     * We produce a container flow showing either a loading or error state, or a grid/list of
     * active project summaries. Each project is enclosed in a Card, with a computed progress
     * metric and a dynamic ProgressBar variant. We also demonstrate usage of resourceUtilization.
     **********************************************************************************************/
    return (
      <div
        className={classNames('ts-project-summary', className)}
        aria-label={ariaLabel || 'Project Summary Section'}
      >
        {/* Example: Display a header or control area for refresh/error states */}
        <div className="ts-project-summary__header">
          <h2 className="ts-project-summary__title">Active Projects Summary</h2>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="ts-project-summary__refresh-btn"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          {error && (
            <div className="ts-project-summary__error" role="alert">
              Error: {error}
            </div>
          )}
        </div>

        {loading && !activeProjects.length && (
          <div className="ts-project-summary__loading">Loading projects...</div>
        )}

        {/* If we have no active projects and not loading, show a small message */}
        {!loading && !error && activeProjects.length === 0 && (
          <div className="ts-project-summary__empty">
            No active projects found.
          </div>
        )}

        {/* PROJECT LIST RENDERING */}
        <div className="ts-project-summary__list">
          {activeProjects.map((project) => {
            // Evaluate progress metrics for this project
            const projectMetrics = getProjectProgress(project);
            // Derive the progress bar variant from status, progress, resource usage
            const variant = getProgressVariant(project, projectMetrics);

            return (
              <Card
                key={project.id}
                elevation="medium"
                padding="medium"
                className="ts-project-summary__card"
              >
                {/* Project Name */}
                <h3 className="ts-project-summary__card-title">{project.name}</h3>

                {/* Example textual status */}
                <div className="ts-project-summary__status">
                  Status: <strong>{project.status}</strong>
                </div>

                {/* Resource utilization text/visual detail */}
                <div className="ts-project-summary__resource">
                  Resource Utilization: {projectMetrics.resourceUtilization}%
                </div>

                {/* Interactive progress visualization */}
                <ProgressBar
                  value={projectMetrics.progress}
                  variant={variant}
                  resourceUtilization={projectMetrics.resourceUtilization}
                  showLabel
                  ariaLabel={`Progress for project ${project.name}`}
                />
              </Card>
            );
          })}
        </div>
      </div>
    );
  }
);

export default ProjectSummary;