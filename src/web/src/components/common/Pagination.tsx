import React, {
  FC,
  ChangeEvent,
  useMemo,
  MouseEvent,
  ReactNode,
  useCallback,
} from 'react'; // react@^18.0.0
import classNames from 'classnames'; // classnames@^2.3.2

/*
  ----------------------------------------------------------------------------------
  Internal Imports
  ----------------------------------------------------------------------------------
  - Button: A reusable React.FC<ButtonProps> for rendering fully styled buttons
  - PaginationParams: Type interface for pagination parameters (page, pageSize)
  - COLORS: Theme constants including primary, secondary, and dark mode color tokens
*/
import { Button } from './Button';
import { PaginationParams } from '../../types/common.types';
import { COLORS } from '../../constants/theme.constants';

/**
 * PaginationProps
 * -----------------------------------------------------------------------------
 * Defines the props contract for the Pagination component with enhanced
 * accessibility and loading states. Implements the TaskStream AI design 
 * system's pagination controls for navigating through paginated data sets.
 */
export interface PaginationProps {
  /**
   * The currently active page number (1-based indexing preferred).
   */
  currentPage: number;

  /**
   * Total number of pages available based on the data set.
   */
  totalPages: number;

  /**
   * Number of items displayed per page.
   */
  pageSize: number;

  /**
   * Total number of items across all pages (used for informational display).
   */
  totalItems: number;

  /**
   * Callback function triggered when the user requests a new page.
   * Receives the desired page number as an argument.
   */
  onPageChange: (page: number) => void;

  /**
   * Callback function triggered when the user changes the page size.
   * Receives the newly chosen page size as an argument.
   */
  onPageSizeChange: (pageSize: number) => void;

  /**
   * Optional CSS class name for custom overrides or additional styling.
   */
  className?: string;

  /**
   * Whether to display a page size selector in the pagination control.
   */
  showPageSize: boolean;

  /**
   * Indicates if the pagination component is in a loading state, generally
   * disabling interaction and showing a busy indicator where appropriate.
   */
  loading: boolean;

  /**
   * Indicates if the pagination UI should be disabled (no interaction) when true.
   */
  disabled: boolean;

  /**
   * The text direction (left-to-right or right-to-left), ensuring proper
   * presentation for RTL languages where needed.
   */
  dir: 'ltr' | 'rtl';

  /**
   * If true, applies a dark mode styling to the pagination container and elements.
   */
  darkMode: boolean;
}

/**
 * getPageNumbers
 * -----------------------------------------------------------------------------
 * Generates an array of page number identifiers along with optional ellipsis
 * placeholders to display in a pagination control.
 *
 * Steps:
 * 1. Check totalPages. If totalPages <= 7, return all pages straightforwardly.
 * 2. Otherwise, calculate a limited range around currentPage.
 * 3. Insert '...' (ellipsis) placeholders where necessary.
 * 4. Always ensure the first and last pages are included.
 * 5. Return the final array (including numeric pages and any strings for ellipsis).
 *
 * @param currentPage  The currently active page
 * @param totalPages   The total number of pages
 * @returns            An array of page identifiers: numbers or the '...' placeholder
 */
export function getPageNumbers(
  currentPage: number,
  totalPages: number
): Array<number | string> {
  // If there aren't enough pages to worry about truncation, just list them all
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  const pages: Array<number | string> = [];
  const minPage = 1;
  const maxPage = totalPages;

  // Always show the first page
  pages.push(minPage);

  // Define the main window of pages around the currentPage
  let left = currentPage - 2;
  let right = currentPage + 2;

  // Clamp the window
  if (left < 2) {
    left = 2;
    right = 5;
  }
  if (right > totalPages - 1) {
    right = totalPages - 1;
    left = totalPages - 4;
  }

  // If there's a gap between the first page and the left boundary, add ellipsis
  if (left > 2) {
    pages.push('...');
  }

  // Fill pages from left to right
  for (let i = left; i <= right; i += 1) {
    pages.push(i);
  }

  // If there's a gap between right and the last page, add ellipsis
  if (right < totalPages - 1) {
    pages.push('...');
  }

  // Finally, always show the last page
  pages.push(maxPage);

  return pages;
}

/**
 * handlePageChange
 * -----------------------------------------------------------------------------
 * Handles page change events, performing boundary checks, and skipping
 * any logic if the pagination is currently loading or disabled.
 *
 * Steps:
 * 1. Check if loading or disabled, abort if true.
 * 2. Validate requested page number is within [1, totalPages].
 * 3. If valid, call the provided onPageChange callback with the new page.
 *
 * @param page         The desired page to navigate to
 * @param currentPage  The current page (for reference)
 * @param totalPages   Total number of pages
 * @param loading      Whether pagination is currently in a loading state
 * @param disabled     Whether pagination is disabled
 * @param onPageChange Callback function to invoke when changing page
 * @returns            No return value
 */
export function handlePageChange(
  page: number,
  currentPage: number,
  totalPages: number,
  loading: boolean,
  disabled: boolean,
  onPageChange: (p: number) => void
): void {
  // If the component is in a non-interactive state, do nothing
  if (loading || disabled) {
    return;
  }

  // Validate totalPages or other edge cases
  if (totalPages <= 0) {
    return;
  }

  // Ensure the requested page is within valid bounds
  const newPage = Math.max(1, Math.min(page, totalPages));

  // If there's only one page or the new page wouldn't change anything, skip
  if (totalPages === 1 || newPage === currentPage) {
    return;
  }

  // Invoke the callback with the validated new page
  onPageChange(newPage);
}

/**
 * handlePageSizeChange
 * -----------------------------------------------------------------------------
 * Handles changes to the page size, using an HTML select element event and
 * validating the new size before calling onPageSizeChange.
 *
 * Steps:
 * 1. Check if loading or disabled, abort if true.
 * 2. Extract the new page size from the change event.
 * 3. Convert to a numeric value if necessary and validate if it's a positive number.
 * 4. Call onPageSizeChange with the new page size.
 *
 * @param event            The change event from a <select> element
 * @param loading          Whether pagination is currently loading
 * @param disabled         Whether pagination is disabled
 * @param onPageSizeChange Callback for updating the page size
 * @returns                No return value
 */
export function handlePageSizeChange(
  event: ChangeEvent<HTMLSelectElement>,
  loading: boolean,
  disabled: boolean,
  onPageSizeChange: (pageSize: number) => void
): void {
  // If the control is non-interactive, skip
  if (loading || disabled) {
    return;
  }

  // Extract the desired page size
  const rawValue = event.target.value;
  const newSize = parseInt(rawValue, 10);

  // Validate that it's a valid positive number
  if (Number.isNaN(newSize) || newSize <= 0) {
    return;
  }

  // Invoke the callback
  onPageSizeChange(newSize);
}

/**
 * Pagination
 * -----------------------------------------------------------------------------
 * A reusable, production-ready pagination component for TaskStream AI. It adheres
 * to WCAG 2.1 AA accessibility guidelines, featuring keyboard navigation, ARIA
 * attributes, and robust design system integration with dark mode and RTL support.
 *
 * This component:
 * - Accepts current page, total pages, and total items for flexible displays
 * - Provides next/previous controls, numeric page buttons, and optional ellipses
 * - Supports a page size selector when showPageSize is true
 * - Disables interaction when loading or disabled
 * - Applies dark mode and RTL direction if indicated, ensuring correct layout
 *
 * @param props PaginationProps as described by the interface above
 * @returns     A fully accessible and styled pagination control
 */
export const Pagination: FC<PaginationProps> = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  className,
  showPageSize,
  loading,
  disabled,
  dir,
  darkMode,
}) => {
  /**
   * Memoized array of page identifiers (numbers and/or '...') to render.
   * Dependencies: currentPage, totalPages
   */
  const pageNumbers = useMemo<Array<number | string>>(() => {
    return getPageNumbers(currentPage, totalPages);
  }, [currentPage, totalPages]);

  /**
   * Unified click handler for page navigation. This wraps the handlePageChange
   * function defined above, passing in the relevant props from this component.
   */
  const onPageClick = useCallback(
    (page: number) => {
      handlePageChange(
        page,
        currentPage,
        totalPages,
        loading,
        disabled,
        onPageChange
      );
    },
    [currentPage, totalPages, loading, disabled, onPageChange]
  );

  /**
   * Handler for changing the page size using the select element in the UI.
   * Wraps the handlePageSizeChange function, injecting the necessary props.
   */
  const onPageSizeSelect = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      handlePageSizeChange(event, loading, disabled, onPageSizeChange);
    },
    [loading, disabled, onPageSizeChange]
  );

  /**
   * Renders the numeric and ellipsis page buttons. Each button has:
   * - Proper aria-label for screen readers
   * - aria-current to indicate the active page
   * - A disabled state if the pagination is not interactive
   */
  const renderPageNumbers = (): ReactNode => {
    return pageNumbers.map((p, idx) => {
      if (typeof p === 'string') {
        // Ellipsis
        return (
          <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">
            ...
          </span>
        );
      }

      // This is a numeric page
      const isActive = p === currentPage;
      const ariaCurrent = isActive ? 'page' : undefined;
      const label = `Page ${p}`;
      return (
        <Button
          key={`page-${p}`}
          variant={isActive ? 'secondary' : 'text'}
          size="sm"
          disabled={disabled || loading}
          aria-label={label}
          aria-current={ariaCurrent}
          onClick={() => onPageClick(p)}
        >
          {p}
        </Button>
      );
    });
  };

  /**
   * Conditional rendering of a page size selector. This <select> will be
   * displayed only if showPageSize is true.
   */
  const renderPageSizeSelector = (): ReactNode => {
    if (!showPageSize) {
      return null;
    }

    // Define typical page sizes for selection
    const pageSizes = [5, 10, 25, 50, 100];

    return (
      <label className="mx-2 flex items-center space-x-1">
        <span className="text-sm text-gray-600 dark:text-gray-300">
          Items per page:
        </span>
        <select
          className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring focus:ring-blue-200 dark:bg-gray-700 dark:text-white"
          onChange={onPageSizeSelect}
          disabled={loading || disabled}
          value={pageSize}
          aria-label="Page Size Selector"
          role="listbox"
        >
          {pageSizes.map((size) => (
            <option key={`page-size-${size}`} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
    );
  };

  /**
   * Renders a textual summary of the total items or page range. This
   * is purely optional for user awareness but helps with accessibility
   * (live region).
   */
  const renderPageSummary = (): ReactNode => {
    if (totalItems < 0) {
      return null;
    }
    // Calculate the range of items shown on the current page
    const startIndex = (currentPage - 1) * pageSize + 1;
    let endIndex = currentPage * pageSize;
    if (endIndex > totalItems) {
      endIndex = totalItems;
    }

    return (
      <span
        role="status"
        aria-live="polite"
        className="mx-2 text-sm text-gray-700 dark:text-gray-200"
      >
        {`Showing ${startIndex}-${endIndex} of ${totalItems}`}
      </span>
    );
  };

  /**
   * Next and Previous navigation
   */
  const handlePreviousClick = () => {
    onPageClick(currentPage - 1);
  };

  const handleNextClick = () => {
    onPageClick(currentPage + 1);
  };

  // Classes for the container. Incorporate rtl or dark mode logic if desired
  const containerClasses = classNames(
    'ts-pagination',
    'flex',
    'items-center',
    'space-x-2',
    'rounded-md',
    'p-2',
    {
      // Reverse row direction in RTL
      'flex-row-reverse': dir === 'rtl',
      // Simple dark mode styles
      'bg-gray-800 text-white': darkMode,
      'bg-white text-black': !darkMode,
      // If disabled, slightly lower opacity
      'opacity-60 cursor-not-allowed': disabled,
    },
    className
  );

  return (
    <nav
      className={containerClasses}
      style={{
        // Example usage of additional colors from theme if needed
        backgroundColor: darkMode ? COLORS.darkMode?.background || '#1F2937' : undefined,
      }}
      dir={dir}
      aria-label="Pagination"
    >
      {/* Previous Page Button */}
      <Button
        variant="text"
        size="sm"
        disabled={currentPage <= 1 || loading || disabled}
        loading={false}
        onClick={handlePreviousClick}
        aria-label="Previous Page"
      >
        Prev
      </Button>

      {/* Page Number Buttons or Ellipses */}
      {renderPageNumbers()}

      {/* Next Page Button */}
      <Button
        variant="text"
        size="sm"
        disabled={currentPage >= totalPages || loading || disabled}
        loading={false}
        onClick={handleNextClick}
        aria-label="Next Page"
      >
        Next
      </Button>

      {/* Page Size Selector */}
      {renderPageSizeSelector()}

      {/* Page Summary Display (e.g., 1-10 of 42) */}
      {renderPageSummary()}
    </nav>
  );
};

/*
  Exposing named members for convenience or type-checking in other parts
  of the application. This ensures that consumers can directly import the
  Pagination component and its associated types.
*/
export { PaginationProps };
export default Pagination;