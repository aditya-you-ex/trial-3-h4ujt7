//------------------------------------------------------------------------------
// src/web/src/components/tasks/TaskFilter.tsx
//------------------------------------------------------------------------------
// A comprehensive task filtering component for TaskStream AI, implementing
// advanced filtering capabilities for statuses, priority, assignees, and date
// ranges, along with enhanced validation, accessibility, and performance
// optimizations.
//
// Requirements Addressed (Based on JSON Specification):
// 1) Task Management (Technical Specifications/1.2 System Overview/High-Level Description)
//    - Automated task creation, assignment, and tracking functionality
//      with advanced filtering capabilities and real-time updates
// 2) Project Board View (Technical Specifications/6.5 Project Board View)
//    - Enhanced task filtering and organization interface supporting
//      multiple filter combinations
// 3) UI Component Library (Technical Specifications/3.1.2 Component Library)
//    - Consistent UI components with accessibility and internationalization
//      support
//------------------------------------------------------------------------------

/*------------------------------------------------------------------------------
 * External Imports (with library versions per IE2)
 *----------------------------------------------------------------------------*/
// React ^18.0.0 for core React functionality
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';

// @mui/material/styles ^5.14.0 for styled components
import { styled } from '@mui/material/styles';

// lodash/debounce ^4.0.8 for optimizing filter updates
import debounce from 'lodash/debounce';

/*------------------------------------------------------------------------------
 * Internal Imports (with usage details per IE1)
 *----------------------------------------------------------------------------*/
// Enhanced select component for status and priority filters with validation support
import { Select } from '../common/Select';
// Enhanced date picker for due date range filter with timezone support and validation
import { DatePicker } from '../common/DatePicker';
// Error boundary for handling component-level errors
import { ErrorBoundary } from '../common/ErrorBoundary';

/*------------------------------------------------------------------------------
 * Types & Interfaces from JSON Specification
 *------------------------------------------------------------------------------
 * The JSON specification instructs us to define a TaskFilterProps interface,
 * a custom hook (useDebounceFilter), and additional internal types that handle
 * advanced validation, error reporting, and filter flow within this component.
 *----------------------------------------------------------------------------*/

/**
 * FilterValidationError
 * ----------------------------------------------------------------------------
 * A minimal interface representing validation errors within the TaskFilter
 * component. We leverage it in tandem with onValidationError for advanced
 * user feedback and error tracing during filter updates.
 */
export interface FilterValidationError {
  field: string;
  message: string;
}

/**
 * TaskStatus
 * ----------------------------------------------------------------------------
 * An enumeration of valid task statuses, used for validating user selections
 * and ensuring we only allow recognized status values in filter changes.
 */
export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  CANCELLED = 'CANCELLED',
}

/**
 * TaskFilter
 * ----------------------------------------------------------------------------
 * Represents the set of filtering criteria the user can specify in this
 * component. The presence and variety of filter fields can be extended
 * for advanced use cases, but it must at minimum represent statuses,
 * priority, assignees, and date range in line with the specification.
 */
export interface TaskFilter {
  statuses: string[];      // e.g. [TaskStatus.TODO, TaskStatus.IN_PROGRESS]
  priorities: string[];    // e.g. ['High', 'Medium', 'Low']
  assignees: string[];     // e.g. ['alice@example.com', 'bob@example.com']
  startDate: Date | null;  // earliest date to consider
  endDate: Date | null;    // latest date to consider
}

/**
 * TaskFilterProps (from JSON Specification)
 * ----------------------------------------------------------------------------
 * Enhanced props interface for TaskFilter component with validation &
 * accessibility support.
 */
export interface TaskFilterProps {
  /**
   * The current, complete filter state from the parent or store,
   * encapsulating statuses, priority, date range, etc.
   */
  value: TaskFilter;

  /**
   * A callback invoked whenever the filter state changes, providing the
   * updated filter to the parent for synchronization with the data model or store.
   */
  onChange: (filter: TaskFilter) => void;

  /**
   * The list of assignee options available for filtering tasks. Typically
   * derived from team members or user directory queries.
   */
  assigneeOptions: string[];

  /**
   * Controls whether the filter UI is in a loading state, preventing user
   * interactions or signifying incomplete data (e.g., waiting for server).
   */
  isLoading: boolean;

  /**
   * Callback function triggered on validation errors, supplying an
   * error payload that can be displayed to users or tracked for analytics.
   */
  onValidationError: (error: FilterValidationError) => void;

  /**
   * The current localization identifier (e.g., "en-US") used by date pickers
   * or other localized UI contexts.
   */
  locale: string;

  /**
   * The specific timezone (e.g., "UTC" or "America/New_York") applied to date
   * filtering logic, ensuring correct comparisons and user displays.
   */
  timezone: string;
}

/*------------------------------------------------------------------------------
 * Custom Hook: useDebounceFilter (from JSON Specification)
 *------------------------------------------------------------------------------
 * A utility hook that debounces changes to the filter state to optimize
 * performance. This avoids rapid re-renders or excessive queries when the
 * user modifies filter criteria in quick succession.
 *----------------------------------------------------------------------------*/

/**
 * useDebounceFilter
 * ----------------------------------------------------------------------------
 * @param {TaskFilter} filter - The input filter object that reacts to user changes.
 * @param {number} delay - The debounce delay in milliseconds.
 * @returns {TaskFilter} A debounced version of the filter that only updates
 *                       after delay passes without further changes.
 *
 * Implementation Steps (from JSON Specification):
 * 1) Create debounced callback using lodash debounce.
 * 2) Memoize callback to prevent recreation.
 * 3) Update filter value after delay.
 * 4) Clean up debounce on unmount.
 */
export function useDebounceFilter(filter: TaskFilter, delay: number): TaskFilter {
  // Maintain a local state for the debounced filter value.
  const [debouncedFilter, setDebouncedFilter] = useState<TaskFilter>(filter);

  // A ref to keep track of the current filter, preventing stale closures.
  const latestFilterRef = useRef<TaskFilter>(filter);

  useEffect(() => {
    latestFilterRef.current = filter;
  }, [filter]);

  // Step 1 & 2: Create and memoize a debounced function that will
  // update the local debouncedFilter state after the specified delay.
  const debouncedUpdate = useMemo(
    () =>
      debounce(() => {
        // Step 3: Actually update the filter state.
        setDebouncedFilter({ ...latestFilterRef.current });
      }, delay),
    [delay]
  );

  // Whenever the filter changes from external triggers, call the
  // debounced function to schedule an update.
  useEffect(() => {
    debouncedUpdate();
    // Step 4: Clean up the debounce on unmount or filter change.
    return () => {
      debouncedUpdate.cancel();
    };
  }, [filter, debouncedUpdate]);

  // The hook returns the local debounced filter, which only updates after delay.
  return debouncedFilter;
}

/*------------------------------------------------------------------------------
 * Function: handleStatusChange (from JSON Specification)
 *------------------------------------------------------------------------------
 * An enhanced handler for status filter changes with validation. This function
 * is designed to be integrated into the TaskFilter component to ensure that
 * user selections for statuses are both recognized (i.e., part of TaskStatus)
 * and free of invalid combinations. It triggers onValidationError when necessary.
 *----------------------------------------------------------------------------*/

/**
 * handleStatusChange
 * ----------------------------------------------------------------------------
 * @param {string[]} selectedStatuses - The array of status strings the user picked.
 * @param {TaskFilter} currentFilter - The current filter used to build an updated state.
 * @param {(filter: TaskFilter) => void} onFilterChange - A callback to propagate changes.
 * @param {(error: FilterValidationError) => void} onValidationError - A callback for errors.
 *
 * Implementation Steps (from JSON Specification):
 * 1) Validate selected status values against TaskStatus enum.
 * 2) Check for invalid combinations (example logic).
 * 3) Create new filter object with updated status array.
 * 4) Trigger validation error if needed.
 * 5) Call onChange prop with updated filter.
 */
export function handleStatusChange(
  selectedStatuses: string[],
  currentFilter: TaskFilter,
  onFilterChange: (filter: TaskFilter) => void,
  onValidationError: (error: FilterValidationError) => void
): void {
  // Step 1: Validate that all statuses are recognized by the TaskStatus enum.
  const invalidStatuses = selectedStatuses.filter(
    (status) => !Object.values(TaskStatus).includes(status as TaskStatus)
  );

  if (invalidStatuses.length > 0) {
    // Step 4: Trigger validation error for invalid statuses.
    onValidationError({
      field: 'statuses',
      message: `Invalid status(es): ${invalidStatuses.join(', ')}`,
    });
    return; // We stop further processing if there's an error
  }

  // Step 2: Check for a hypothetical invalid combination example:
  // (DONE and CANCELLED cannot be selected at the same time).
  const hasDone = selectedStatuses.includes(TaskStatus.DONE);
  const hasCancelled = selectedStatuses.includes(TaskStatus.CANCELLED);

  if (hasDone && hasCancelled) {
    // Step 4: Trigger validation error for conflicting selection.
    onValidationError({
      field: 'statuses',
      message: `Cannot select "${TaskStatus.DONE}" and "${TaskStatus.CANCELLED}" together.`,
    });
    return;
  }

  // Step 3: Create a new TaskFilter object with updated statuses.
  const updatedFilter: TaskFilter = {
    ...currentFilter,
    statuses: [...selectedStatuses],
  };

  // Step 5: Call onChange (onFilterChange) with the new filter object.
  onFilterChange(updatedFilter);
}

/*------------------------------------------------------------------------------
 * Styled Component: FilterContainer (from JSON Specification)
 *------------------------------------------------------------------------------
 * A specialized container for holding filter controls. It includes a responsive
 * layout, spacing, background color, box-shadow, and more, ensuring consistent
 * presentation across the TaskStream AI interface.
 *
 * Implementation Steps (from JSON specification):
 * - base_component = 'div'
 * - Styles:
 *   1) Display: flex
 *   2) Gap: 16px
 *   3) Padding: 16px
 *   4) Flex-wrap: wrap
 *   5) Align-items: center
 *   6) Background-color: ${theme.palette.background.paper}
 *   7) Border-radius: ${theme.shape.borderRadius}px
 *   8) Box-shadow: ${theme.shadows[1]}
 *----------------------------------------------------------------------------*/

export const FilterContainer = styled('div')(({ theme }) => ({
  display: 'flex',
  gap: '16px',
  padding: '16px',
  flexWrap: 'wrap',
  alignItems: 'center',
  backgroundColor: theme.palette.background.paper,
  borderRadius: `${theme.shape.borderRadius}px`,
  boxShadow: theme.shadows[1],
}));

/*------------------------------------------------------------------------------
 * Main Export: TaskFilter (React.FC<TaskFilterProps>)
 *------------------------------------------------------------------------------
 * The primary component rendering a comprehensive filter UI for tasks, including
 * statuses, priorities, assignees, and date range selection. It integrates with
 * our custom hook (useDebounceFilter), handles user interactions with state, and
 * performs validations with the help of handleStatusChange.
 *----------------------------------------------------------------------------*/

/**
 * TaskFilter
 * ----------------------------------------------------------------------------
 * @description An enhanced task filter component with validation,
 *              accessibility, and performance optimizations.
 */
export const TaskFilter: React.FC<TaskFilterProps> = ({
  value,
  onChange,
  assigneeOptions,
  isLoading,
  onValidationError,
  locale,
  timezone,
}) => {
  // Leverage the custom hook to debounce the entire filter:
  const debouncedFilter = useDebounceFilter(value, 300);

  // Local handler for priority selection. We can define or expand logic similarly
  // to handleStatusChange, though for demonstration we do minimal checks here.
  const handlePriorityChange = useCallback(
    (selectedPriorities: string | string[]) => {
      let prioritiesArr = Array.isArray(selectedPriorities)
        ? selectedPriorities
        : [selectedPriorities];
      // Example minimal validation: ensure no empty strings
      const cleaned = prioritiesArr.filter((p) => p.trim().length > 0);
      const updated: TaskFilter = { ...value, priorities: cleaned };
      onChange(updated);
    },
    [value, onChange]
  );

  // Local handler for date changes, which updates startDate or endDate
  // according to the user's selection. We can similarly add robust validation.
  const handleDateChange = useCallback(
    (field: 'startDate' | 'endDate', newDate: Date | null) => {
      const updated: TaskFilter = { ...value, [field]: newDate };
      // Potential advanced validation: verify start <= end
      if (updated.startDate && updated.endDate && updated.startDate > updated.endDate) {
        onValidationError({
          field: field,
          message: 'Start date cannot be after end date.',
        });
      }
      onChange(updated);
    },
    [value, onChange, onValidationError]
  );

  // Handler for assignee selection changes. Minimal validation is performed,
  // but we can expand to restrict invalid or unrecognized values in the future.
  const handleAssigneeChange = useCallback(
    (selectedAssignees: string | string[]) => {
      let assigneesArr = Array.isArray(selectedAssignees)
        ? selectedAssignees
        : [selectedAssignees];
      const updated: TaskFilter = { ...value, assignees: assigneesArr };
      onChange(updated);
    },
    [value, onChange]
  );

  // Handler for statuses, bridging to our handleStatusChange function.
  const handleStatusesUpdate = useCallback(
    (selected: string | string[]) => {
      let statusesArr = Array.isArray(selected) ? selected : [selected];
      handleStatusChange(statusesArr, value, onChange, onValidationError);
    },
    [value, onChange, onValidationError]
  );

  // The UI can be heavily customized. We wrap everything with ErrorBoundary
  // so that if any sub-component (Select, DatePicker, etc.) throws an error,
  // the user-facing experience remains robust.
  return (
    <ErrorBoundary>
      <FilterContainer>
        {/* Status Filter */}
        <Select
          id="status-select"
          label="Status"
          multiple
          name="taskStatus"
          options={[
            { value: TaskStatus.TODO, label: 'Todo' },
            { value: TaskStatus.IN_PROGRESS, label: 'In Progress' },
            { value: TaskStatus.DONE, label: 'Done' },
            { value: TaskStatus.CANCELLED, label: 'Cancelled' },
          ]}
          value={debouncedFilter.statuses}
          onChange={handleStatusesUpdate}
          disabled={isLoading}
          // Further error handling is done inside handleStatusChange
          placeholder="Select statuses..."
        />

        {/* Priority Filter */}
        <Select
          id="priority-select"
          label="Priority"
          multiple
          name="taskPriority"
          options={[
            { value: 'High', label: 'High' },
            { value: 'Medium', label: 'Medium' },
            { value: 'Low', label: 'Low' },
          ]}
          value={debouncedFilter.priorities}
          onChange={handlePriorityChange}
          disabled={isLoading}
          placeholder="Select priority..."
        />

        {/* Assignee Filter */}
        <Select
          id="assignee-select"
          label="Assignee"
          multiple
          name="taskAssignees"
          options={assigneeOptions.map((a) => ({ value: a, label: a }))}
          value={debouncedFilter.assignees}
          onChange={handleAssigneeChange}
          disabled={isLoading}
          placeholder="Select assignees..."
        />

        {/* Date Range Filter (Start Date) */}
        <DatePicker
          label="Start Date"
          value={debouncedFilter.startDate}
          onChange={(date) => handleDateChange('startDate', date)}
          required={false}
          disabled={isLoading}
          error=""
          minDate={new Date('2000-01-01')}
          maxDate={new Date('2100-01-01')}
          format="yyyy-MM-dd"
          locale={locale}
          timezone={timezone}
          clearable
          shouldDisableDate={() => false}
        />

        {/* Date Range Filter (End Date) */}
        <DatePicker
          label="End Date"
          value={debouncedFilter.endDate}
          onChange={(date) => handleDateChange('endDate', date)}
          required={false}
          disabled={isLoading}
          error=""
          minDate={new Date('2000-01-01')}
          maxDate={new Date('2100-01-01')}
          format="yyyy-MM-dd"
          locale={locale}
          timezone={timezone}
          clearable
          shouldDisableDate={() => false}
        />
      </FilterContainer>
    </ErrorBoundary>
  );
};