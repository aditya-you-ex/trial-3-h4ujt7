import React, { FC, ReactNode, useCallback } from 'react'; // react@^18.0.0
import classNames from 'classnames'; // classnames@^2.3.2

/**
 * Internal Imports
 * ----------------------------------------------------------------------------
 * We import the Project-related types (Project, ProjectStatus, ResourceAnalytics)
 * from our local types definition, the reusable Card and Icon components, and
 * the useTheme hook (to access spacing/color info). All are strictly aligned
 * with our codebase's design system and architecture.
 */
import { Project, ProjectStatus, ResourceAnalytics } from '../../types/project.types';
import { Card } from '../common/Card';
import { Icon } from '../common/Icon';
import { useTheme } from '../../hooks/useTheme';

/**
 * ProjectCardProps
 * ----------------------------------------------------------------------------
 * This interface defines the shape of properties accepted by the ProjectCard component.
 * - project: The Project entity to be displayed on the card.
 * - className: Optional CSS class(es) for custom styling.
 * - onClick: An optional callback, invoked when the card is clicked. Passes the Project as an argument.
 * - showAnalytics: Toggles whether analytics data should be rendered. Defaults to true.
 * - loading: Indicates if the card is in a loading state. Defaults to false.
 */
export interface ProjectCardProps {
  /**
   * Project data to display, including status, description, analytics, and timeline.
   */
  project: Project;

  /**
   * Additional CSS classes for layout or style overrides.
   */
  className?: string;

  /**
   * Optional click handler for card interaction. Provides the clicked project as an argument.
   */
  onClick?: (project: Project) => void;

  /**
   * Whether to display analytics data on this project card. Defaults to true.
   */
  showAnalytics?: boolean;

  /**
   * If set to true, indicates the card should display a loading state for analytics or other
   * asynchronous data. Defaults to false.
   */
  loading?: boolean;
}

/**
 * getProgressVariant
 * ----------------------------------------------------------------------------
 * Determines the appropriate style variant for a progress indicator based on:
 *   1) The project's status.
 *   2) A numeric completion percentage (0 to 100).
 *
 * Returns one of:
 *  - 'default'
 *  - 'success'
 *  - 'warning'
 *  - 'error'
 *
 * Steps:
 *  1. If the status is COMPLETED or the progress is >= 100, we label it 'success'.
 *  2. If the status is ARCHIVED, we opt for 'error'.
 *  3. If ON_HOLD or very low progress (<30%) might be 'warning'.
 *  4. Otherwise, 'default'.
 *
 * @param status   The project's current status (enum ProjectStatus).
 * @param progress A 0-100 numeric value indicating completion level.
 */
export function getProgressVariant(status: ProjectStatus, progress: number): 'default' | 'success' | 'warning' | 'error' {
  // Completed or effectively near 100% => success
  if (status === ProjectStatus.COMPLETED || progress >= 100) {
    return 'success';
  }

  // Archived => error
  if (status === ProjectStatus.ARCHIVED) {
    return 'error';
  }

  // On hold or very low progress => warning
  if (status === ProjectStatus.ON_HOLD || progress < 30) {
    return 'warning';
  }

  // Default fallback for ACTIVE, PLANNING, or other normal scenarios
  return 'default';
}

/**
 * calculateProgress
 * ----------------------------------------------------------------------------
 * Calculates a simple completion percentage for a given project by analyzing
 * its tasks. This function:
 *  1. Retrieves total task count from project.tasks (TaskReference[]).
 *  2. Finds all tasks matching a 'DONE' status (example logic).
 *  3. Computes (completedCount / totalCount) * 100.
 *  4. Returns the percentage as a number between 0 and 100.
 *
 * @param project The Project entity containing a list of tasks (task references).
 * @returns The numeric completion percentage (0-100).
 */
export function calculateProgress(project: Project): number {
  const totalTasks = project.tasks?.length || 0;
  if (totalTasks === 0) {
    // If no tasks, define progress as 0
    return 0;
  }

  // Example assumption: tasks with status === 'DONE' are considered completed
  const completedTasks = project.tasks.filter((t) => t.status === 'DONE').length;
  const progress = (completedTasks / totalTasks) * 100;

  // Ensure we clamp to 0-100 range in case of anomalies
  return Math.max(0, Math.min(100, progress));
}

/**
 * renderAnalytics
 * ----------------------------------------------------------------------------
 * Renders a section displaying resource analytics (utilization, predicted completion,
 * bottlenecks, etc.). This is an extracted helper that returns a React Node
 * to be injected in the main ProjectCard content if showAnalytics is true.
 *
 * Steps:
 *  1. Format analytics data (resourceUtilization, predictedCompletion, etc.).
 *  2. Apply theme-based styling via useTheme (spacing, color usage).
 *  3. Render metrics in a neat layout.
 *  4. Provide fallback for loading or error states as necessary.
 *
 * @param analytics The ResourceAnalytics object from the project data.
 * @param loading   Indicates if we are currently in a loading state.
 * @returns A ReactNode containing analytics details, or a placeholder if loading.
 */
export function renderAnalytics(
  analytics: ResourceAnalytics,
  loading: boolean
): ReactNode {
  const { spacing, colors } = useTheme(); // Access color & spacing
  const containerStyle: React.CSSProperties = {
    marginTop: spacing.custom.sm,
    padding: spacing.custom.xs,
    backgroundColor: colors.grey[50],
    borderRadius: '4px',
  };

  if (loading) {
    // Render a placeholder or skeleton if loading
    return (
      <div style={containerStyle}>
        <em style={{ color: colors.grey[500] }}>Loading analytics...</em>
      </div>
    );
  }

  // Format the date for predictedCompletion
  const predictedCompletionText = analytics.predictedCompletion
    ? analytics.predictedCompletion.toLocaleDateString()
    : 'N/A';

  return (
    <div style={containerStyle}>
      <div
        style={{
          fontWeight: 500,
          marginBottom: spacing.custom.xs,
          color: colors.text.primary,
        }}
      >
        Resource Utilization: {analytics.resourceUtilization}%
      </div>
      <div
        style={{
          marginBottom: spacing.custom.xs,
          color: colors.text.primary,
        }}
      >
        Predicted Completion: {predictedCompletionText}
      </div>
      {analytics.bottlenecks && analytics.bottlenecks.length > 0 && (
        <div
          style={{
            marginBottom: spacing.custom.xs,
            color: colors.error.dark,
          }}
        >
          <strong>Bottlenecks:</strong>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {analytics.bottlenecks.map((bottleneck, idx) => (
              <li key={idx}>{bottleneck}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * ProjectCard
 * ----------------------------------------------------------------------------
 * A reusable card component specializing in displaying a project's
 * key information: name, description, status, progress, and optional
 * analytics data. Integrates with the shared Card layout component.
 *
 * Includes:
 *  - An optional onClick prop for card-level interaction.
 *  - A progress calculation from the project's tasks.
 *  - A status-based progress variant derived by getProgressVariant(...).
 *  - Conditionally rendered analytics if showAnalytics is true.
 *  - A loading state indicator in analytics.
 */
const ProjectCard: FC<ProjectCardProps> = (props) => {
  const {
    project,
    className,
    onClick,
    showAnalytics = true,
    loading = false,
  } = props;

  /**
   * handleCardClick
   * --------------------------------------------------------------------------
   * Internal callback for the Card component's onClick. Defer to the user's
   * provided onClick if present, passing the Project object as an argument.
   */
  const handleCardClick = useCallback(() => {
    if (onClick) {
      onClick(project);
    }
  }, [onClick, project]);

  /**
   * Evaluate progress and variant. We'll compute the numeric progress
   * value from tasks and then pick a variant for styling logic (could
   * be used for a progress bar or highlight).
   */
  const progressValue = calculateProgress(project);
  const progressVariant = getProgressVariant(project.status, progressValue);

  /**
   * Use the card as interactive if onClick is provided.
   * This ensures proper accessibility and pointer cues from the shared Card.
   */
  const isInteractive = !!onClick;

  /**
   * Synthesize class names. We optionally incorporate the custom
   * className (if any) and produce a specialized project card
   * class for styling distinctions.
   */
  const cardClass = classNames('ts-project-card', className);

  /**
   * The main content for the card, displayed as children of the shared Card:
   * We'll highlight the project name, a status indicator, progress info,
   * and optionally the analytics section if showAnalytics is true.
   */
  return (
    <Card
      className={cardClass}
      interactive={isInteractive}
      onClick={handleCardClick}
    >
      {/* Title/Name Row */}
      <div className="ts-project-card__header">
        <h3 className="ts-project-card__title">{project.name}</h3>
        {/* Icon can represent the project status in some capacity */}
        <Icon
          name="INFO"
          size="md"
          color="secondary"
          className="ts-project-card__status-icon"
        />
      </div>

      {/* Description */}
      <div className="ts-project-card__description">
        {project.description}
      </div>

      {/* Progress Info */}
      <div className="ts-project-card__progress">
        <strong>Status:</strong> {project.status} |{' '}
        <strong>Progress:</strong> {progressValue.toFixed(0)}% (
        {progressVariant})
      </div>

      {/* Render analytics if allowed by showAnalytics */}
      {showAnalytics && project.analytics && (
        <>
          {renderAnalytics(project.analytics, loading)}
        </>
      )}
    </Card>
  );
};

export default ProjectCard;