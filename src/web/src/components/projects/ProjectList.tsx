import React, {
  FC,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  useState,
  CSSProperties,
} from 'react'; // react@^18.0.0
import classNames from 'classnames'; // classnames@^2.3.2
import { AutoSizer, Grid, CellMeasurer, CellMeasurerCache } from 'react-virtualized'; // react-virtualized@^9.22.3

// Internal imports
import ProjectCard from './ProjectCard';
import { useProjects } from '../../hooks/useProjects';

// -----------------------------------------------------------------------------
// Types & Interfaces
// -----------------------------------------------------------------------------

/**
 * A placeholder for the sort option type. Adjust as needed for real usage.
 */
export type ProjectSortOption =
  | 'NAME_ASC'
  | 'NAME_DESC'
  | 'CREATED_ASC'
  | 'CREATED_DESC'
  | 'PROGRESS_ASC'
  | 'PROGRESS_DESC';

/**
 * A placeholder for the project filter settings. Extend as needed for real usage.
 */
export interface ProjectFilters {
  status?: string[];
  teamId?: string;
  searchTerm?: string;
}

/**
 * Enhanced props interface for the ProjectList component.
 * Provides optional callbacks, filtering, sorting, and className for styling.
 */
export interface ProjectListProps {
  /**
   * Additional CSS classes for styling or layout.
   */
  className?: string;

  /**
   * Callback when a project is selected by the user.
   * Receives the selected project as an argument.
   */
  onProjectSelect?: (project: Project) => void;

  /**
   * Current sort option controlling how projects are displayed.
   */
  sortBy?: ProjectSortOption;

  /**
   * Active filter settings used to refine the displayed projects.
   */
  filters?: ProjectFilters;
}

/**
 * Represents a standard Project entity as defined in the codebase.
 * The useProjects hook references this type.
 */
export interface Project {
  id: string;
  name: string;
  description: string;
  // Add other fields as needed from project.types.ts
}

/**
 * Represents the analytics data for a Project, such as resource utilization.
 * The useProjects hook references this type in projectAnalytics.
 */
export interface ProjectAnalytics {
  resourceUtilization: number;
  predictedCompletion?: Date;
  bottlenecks?: string[];
  // Extend as needed for real usage scenarios
}

// -----------------------------------------------------------------------------
// ProjectList Component
// -----------------------------------------------------------------------------

/**
 * Enhanced handler for project card click events with analytics tracking.
 * Steps (as required):
 * 1) Track analytics event for project selection
 * 2) Call selectProject from useProjects hook
 * 3) Call onProjectSelect prop if provided
 * 4) Handle navigation or state updates
 * 5) Update performance metrics
 */
const useHandleProjectClick = (
  onProjectSelect?: (project: Project) => void,
  selectProject?: (projectId: string) => void
) => {
  return useCallback(
    (project: Project) => {
      // 1) Track analytics event for project selection
      // (Placeholder for actual analytics logic)
      // e.g., console.log('[Analytics] Project selected:', project.id);

      // 2) Call selectProject from useProjects hook if available
      if (selectProject) {
        selectProject(project.id);
      }

      // 3) Call onProjectSelect prop if provided
      if (onProjectSelect) {
        onProjectSelect(project);
      }

      // 4) Handle navigation or state updates
      // (Placeholder for additional routing or UI logic)
      // e.g., navigate(`/projects/${project.id}`);

      // 5) Update performance metrics
      // (Placeholder for real performance measuring)
      // e.g., console.log('[Performance] Project selection handling complete.');
    },
    [onProjectSelect, selectProject]
  );
};

/**
 * Renders an individual project card with analytics data.
 * Steps (as required):
 * 1) Merge project and analytics data
 * 2) Apply performance optimizations
 * 3) Render ProjectCard component
 * 4) Handle loading states
 * 5) Implement error boundaries
 */
const useRenderProjectCard = () => {
  return useCallback(
    (
      project: Project,
      analytics: ProjectAnalytics | undefined,
      onCardClick: (p: Project) => void
    ): JSX.Element => {
      // 1) Merge project and analytics data (light example: pass analytics to card props)
      const cardAnalytics = analytics || {
        resourceUtilization: 0,
        bottlenecks: [],
      };

      // 2) Apply performance optimizations (e.g., memoization or partial re-renders)
      // (Placeholder, actual performance strategies vary by scenario.)

      // 4) Handle loading states (handled externally in the parent or the card's skeleton loader)
      // (Placeholder if needed.)

      // 5) Implement error boundaries:
      // Typically done at a higher level or via React error boundaries. Here we simply wrap in try/catch:
      try {
        // 3) Render ProjectCard with project & analytics
        return (
          <ProjectCard
            project={project}
            analytics={cardAnalytics}
            onClick={() => onCardClick(project)}
          />
        );
      } catch (err) {
        // fallback rendering if error occurs
        return (
          <div style={{ color: 'red' }}>
            Error rendering project card: {(err as Error).message}
          </div>
        );
      }
    },
    []
  );
};

/**
 * The main ProjectList component implementing:
 * - Responsive grid layout with react-virtualized
 * - Enhanced filtering and sorting support (placeholders for real usage)
 * - Analytics integration via useProjects hook
 * - Performance optimization and accessibility features
 */
const ProjectList: FC<ProjectListProps> = ({
  className,
  onProjectSelect,
  sortBy,
  filters,
}) => {
  // Obtain project data and methods from useProjects
  const {
    projects,
    loading,
    error,
    fetchProjects,
    selectProject,
    projectAnalytics,
  } = useProjects();

  // Lifecycle: Fetch projects on mount or refresh
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Handler for project selection logic
  const handleProjectClick = useHandleProjectClick(onProjectSelect, selectProject);

  // Renderer for each project card
  const renderProjectCard = useRenderProjectCard();

  // Set up a CellMeasurerCache for dynamic card heights
  const cacheRef = useRef(
    new CellMeasurerCache({
      fixedWidth: true,
      defaultHeight: 250, // approximate default height
    })
  );

  // Conditionally handle loading or error states
  if (loading) {
    return <div className="ts-project-list__loading">Loading Projects...</div>;
  }
  if (error) {
    return <div className="ts-project-list__error">Error: {error}</div>;
  }

  // Compute analytics lookup for quick merging
  const analyticsMap = useMemo(() => {
    const map: Record<string, ProjectAnalytics> = {};
    projectAnalytics.forEach((pa) => {
      // In real usage, pa would have a projectId or similar
      // This is a placeholder example for demonstration
      // We can assume pa references the same .id as Project
      // @ts-ignore: example usage if pa has field 'projectId'
      const key = pa.projectId || '';
      map[key] = pa;
    });
    return map;
  }, [projectAnalytics]);

  // We'll define the column layout logic for a responsive approach.
  // Example: if the container width < 600 => 1 column, < 900 => 2 columns, etc.
  const computeColumnCount = (width: number): number => {
    if (width < 600) return 1;
    if (width < 900) return 2;
    if (width < 1200) return 3;
    return 4;
  };

  // cellRenderer for the react-virtualized Grid
  const cellRenderer = useCallback(
    ({
      columnIndex,
      rowIndex,
      key,
      parent,
      style,
    }: {
      columnIndex: number;
      rowIndex: number;
      key: string;
      parent: any;
      style: CSSProperties;
    }) => {
      const colCount = (parent.props as any).columnCount;
      const index = rowIndex * colCount + columnIndex;

      if (index >= projects.length) {
        return null;
      }

      const project = projects[index];
      const analytics = analyticsMap[project.id];

      return (
        <CellMeasurer
          cache={cacheRef.current}
          columnIndex={columnIndex}
          rowIndex={rowIndex}
          key={key}
          parent={parent}
        >
          <div style={style}>
            {renderProjectCard(project, analytics, handleProjectClick)}
          </div>
        </CellMeasurer>
      );
    },
    [projects, handleProjectClick, analyticsMap, renderProjectCard]
  );

  // rowCount is the number of rows in the grid, colCount is columns per row
  // We'll measure them on-the-fly in the render function using AutoSizer
  return (
    <div className={classNames('ts-project-list', className)}>
      <AutoSizer disableHeight>
        {({ width, height }) => {
          const colCount = computeColumnCount(width || 1000);
          const rowCount = Math.ceil(projects.length / colCount);

          return (
            <Grid
              className="ts-project-list__grid"
              cellRenderer={cellRenderer}
              columnCount={colCount}
              columnWidth={Math.floor(width / colCount)}
              height={height || 600}
              rowCount={rowCount}
              rowHeight={cacheRef.current.rowHeight}
              width={width}
              overscanRowCount={2}
              deferredMeasurementCache={cacheRef.current}
            />
          );
        }}
      </AutoSizer>
    </div>
  );
};

export default ProjectList;