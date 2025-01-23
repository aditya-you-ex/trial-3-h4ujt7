import React, {
  FC, // react@^18.0.0
  DragEvent,
  MouseEvent,
  useCallback,
} from 'react'; 
import classNames from 'classnames'; // classnames@^2.3.2
import { motion } from 'framer-motion'; // framer-motion@^10.0.0

// Internal imports (IE1 compliance).
import { Card } from '../common/Card';
import type { CardProps } from '../common/Card';
import { Task, TaskStatus } from '../../types/task.types';

/**
 * TaskCardProps
 * ----------------------------------------------------------------------------
 * Defines the enhanced props for the TaskCard component, ensuring comprehensive
 * accessibility and interaction logic for tasks displayed in the TaskStream AI
 * application. Adheres to Task Management and UI Design Standards with
 * WCAG 2.1 AA compliance.
 */
export interface TaskCardProps {
  /**
   * The Task object containing all details associated
   * with this card instance. Must conform to the Task
   * interface imported from task.types.ts.
   */
  task: Task;

  /**
   * An optional string of additional class names
   * for layout, styling overrides, or custom theming.
   */
  className?: string;

  /**
   * Determines if this task card is draggable. If true,
   * the card will include draggable attributes and events to
   * support drag-and-drop functionality on the task board.
   */
  draggable?: boolean;

  /**
   * Optional click handler. When defined, the card is treated as
   * an interactive element that invokes the provided callback
   * with the current task upon a mouse click. Typical usage:
   *  onClick={(task) => console.log(task.title)}
   */
  onClick?: (task: Task) => void;

  /**
   * An optional drag start handler, invoked when drag
   * begins. Receives the original React drag event and the
   * Task object for context.
   */
  onDragStart?: (e: DragEvent<HTMLDivElement>, task: Task) => void;

  /**
   * An optional drag end handler, triggered upon completion
   * or cancellation of the drag operation. Receives the
   * React drag event and the Task object for context.
   */
  onDragEnd?: (e: DragEvent<HTMLDivElement>, task: Task) => void;

  /**
   * Indicates whether this task card is currently being dragged.
   * Useful for applying visual states like a dimmed or raised
   * appearance during the drag operation.
   */
  isDragging?: boolean;

  /**
   * When true, displays a loading or skeleton state
   * representing data retrieval or processing in progress.
   */
  isLoading?: boolean;

  /**
   * Captures any error condition associated with the task card.
   * When present, an error message or fallback state can be rendered
   * instead of the usual task content.
   */
  error?: Error;

  /**
   * Optional string to specify an accessible label for the card,
   * particularly useful if the card's content alone doesn't provide
   * sufficient context for screen readers or other assistive technology.
   */
  ariaLabel?: string;

  /**
   * An optional test identifier for unit and integration testing.
   * When provided, it will be applied as a data-testid attribute.
   */
  testId?: string;
}

/**
 * getStatusVariant
 * ----------------------------------------------------------------------------
 * A utility function that maps TaskStatus values to a string representing
 * a CSS or styling variant with associated animation. This string can
 * be used to apply specialized classes, animations, or theming within
 * the TaskCard or related components. Includes handling for typical
 * statuses and defaults for unhandled or supplementary cases.
 *
 * Mapping:
 * - BACKLOG     => "default-subtle-anim"
 * - IN_PROGRESS => "warning-progress-anim"
 * - IN_REVIEW   => "info-pulse-anim"
 * - DONE        => "success-completion-anim"
 * - Other       => "default-base-anim"
 *
 * @param status - The TaskStatus to be mapped to a variant string.
 * @returns A string representing the variant class name or key.
 */
export function getStatusVariant(status: TaskStatus): string {
  switch (status) {
    case TaskStatus.BACKLOG:
      // Subtle default state with gentle animation
      return 'default-subtle-anim';
    case TaskStatus.IN_PROGRESS:
      // Warning hue, includes progress-like animation
      return 'warning-progress-anim';
    case TaskStatus.IN_REVIEW:
      // Informational color with a pulsing effect
      return 'info-pulse-anim';
    case TaskStatus.DONE:
      // Completion-based animation with a success color
      return 'success-completion-anim';
    default:
      // Covers TODO or any fallback scenario
      return 'default-base-anim';
  }
}

/**
 * TaskCard
 * ----------------------------------------------------------------------------
 * A reusable card component for displaying a Task with consistent styling,
 * drag-and-drop functionality, accessibility features, and real-time animations.
 * Incorporates the getStatusVariant output to visually differentiate task status,
 * and leverages the motion library for subtle transitions. Compliant with
 * enterprise coding standards and integrated with the TaskStream AI design system.
 */
export const TaskCard: FC<TaskCardProps> = ({
  task,
  className,
  draggable,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging,
  isLoading,
  error,
  ariaLabel,
  testId,
}) => {
  /**
   * Derive a variant string based on the current task's status.
   * This will be used for styling or stateful animations.
   */
  const statusVariant = getStatusVariant(task.status);

  /**
   * Classname composition:
   *  - ts-task-card to define the card base.
   *  - Additional user-provided className from props.
   *  - Visual states for loading, error, or dragging.
   */
  const containerClasses = classNames(
    'ts-task-card',
    className,
    {
      'ts-task-card--dragging': isDragging,
      'ts-task-card--loading': isLoading,
      'ts-task-card--error': !!error,
    }
  );

  /**
   * Using the Card component from ../common/Card to ensure
   * consistent styling, padding, and potential interactive states.
   * The motion.div wrapper provides an animated container for smooth
   * mounting, unmounting, or any dynamic updates around the card.
   */
  const MotionCard = motion<CardProps>(Card);

  /**
   * onClick wrapper. If an onClick prop is provided,
   * we invoke it with the current Task. 
   */
  const handleClick = useCallback(
    (evt: MouseEvent<HTMLDivElement>) => {
      if (onClick) {
        evt.stopPropagation();
        onClick(task);
      }
    },
    [onClick, task]
  );

  /**
   * onDragStart wrapper. If an onDragStart prop is provided,
   * we invoke it with the event and the current Task.
   */
  const handleDragStart = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (onDragStart) {
        onDragStart(e, task);
      }
    },
    [onDragStart, task]
  );

  /**
   * onDragEnd wrapper. If an onDragEnd prop is provided,
   * we invoke it with the event and the current Task.
   */
  const handleDragEnd = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (onDragEnd) {
        onDragEnd(e, task);
      }
    },
    [onDragEnd, task]
  );

  /**
   * Render the loading state, error state, or normal content
   * depending on the isLoading and error props.
   */
  const renderCardContent = () => {
    if (isLoading) {
      return (
        <div className="ts-task-card__loading">
          {/* Placeholder spinner or skeleton can go here */}
          Loading task details...
        </div>
      );
    }
    if (error) {
      return (
        <div className="ts-task-card__error">
          {/* Display a generic or custom error message */}
          An error occurred: {error.message}
        </div>
      );
    }
    return (
      <div className="ts-task-card__content">
        {/* Task Title */}
        <div className="ts-task-card__title">
          {task.title}
        </div>
        {/* Status-based styling or badge */}
        <div className={`ts-task-card__status ts-task-card__status--${statusVariant}`}>
          {task.status}
        </div>
        {/* Priority */}
        <div className={`ts-task-card__priority ts-task-card__priority--${task.priority.toLowerCase()}`}>
          Priority: {task.priority}
        </div>
        {/* Assignee */}
        <div className="ts-task-card__assignee">
          Assigned to: {task.assigneeId || 'Unassigned'}
        </div>
        {/* Optional date display */}
        <div className="ts-task-card__due">
          Due: {task.dueDate?.toLocaleDateString() || 'No due date'}
        </div>
      </div>
    );
  };

  /**
   * Motion variants for the outer container to animate
   * the card as it appears or while it updates. The
   * actual usage is minimal here, but can be extended
   * for drag or hover states.
   */
  const motionVariants = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  };

  return (
    <MotionCard
      /* Pass in the motion variants for subtle fade/scale animations. */
      variants={motionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      /* 
        Accessibility:
         - aria-label helps screen readers identify the card if text content is not sufficient.
         - data-testid for testing frameworks (Jest, Cypress, etc.).
       */
      aria-label={ariaLabel}
      data-testid={testId}
      /* 
        If the user wants the card to be draggable, set draggable attribute
        and handle the corresponding event callbacks.
      */
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
      onDragEnd={draggable ? handleDragEnd : undefined}
      /* 
        If onClick is supplied, allow the card to behave like a button
        in the sense of pointer interactions.
      */
      interactive={!!onClick || !!draggable}
      onClick={onClick ? handleClick : undefined}
      className={containerClasses}
      elevation="small"
      padding="medium"
    >
      {renderCardContent()}
    </MotionCard>
  );
};