import React, {
  FC,
  ReactNode,
  useCallback,
  useMemo,
  useState,
  useEffect,
} from 'react'; // react@^18.0.0
import classNames from 'classnames'; // classnames@^2.3.2
import { FixedSizeList, ListChildComponentProps } from 'react-window'; // react-window@^1.8.9

// --------------------------------------------------------------------------------------------
// Internal Imports (IE1 compliance)
// --------------------------------------------------------------------------------------------
import { Pagination } from './Pagination';
import type { PaginationProps } from './Pagination';
import {
  PaginatedResponse,
  SortDirection,
} from '../../types/common.types';

// --------------------------------------------------------------------------------------------
// TableColumn Interface
// --------------------------------------------------------------------------------------------
/**
 * TableColumn<T>
 * ----------------------------------------------------------------------------------
 * An enhanced interface defining table column configuration with accessibility
 * and responsive features for TaskStream AI. Each column can be individually
 * configured for width, minimum width, sorting, rendering, and additional
 * ARIA attributes in both header and cell contexts.
 */
export interface TableColumn<T> {
  /**
   * The data field key for the column, typically referencing a property
   * in the row data object.
   */
  field: string;

  /**
   * The user-facing header text for this column. Displayed in the
   * table header cell with optional sort indicators if sortable is true.
   */
  header: string;

  /**
   * Indicates whether the column is sortable. If true, sort controls
   * and ARIA attributes will be applied to the header.
   */
  sortable: boolean;

  /**
   * A CSS-compatible value specifying the column width (e.g., '150px', '20%', etc.).
   * If not defined, the table layout may rely on auto-sizing or the minWidth.
   */
  width: string;

  /**
   * A CSS-compatible value specifying the minimum width. Useful for
   * responsive layouts and avoiding overly narrow columns.
   */
  minWidth: string;

  /**
   * A custom render function for the column cell. Receives the cell value
   * and the full row object as arguments, returning a ReactNode to be
   * displayed in that cell.
   */
  render: (value: any, row: T) => ReactNode;

  /**
   * Additional props, including ARIA attributes, to spread onto the header cell
   * element. Can be used to customize role, aria-sort, or other relevant features.
   */
  headerProps?: Record<string, any>;

  /**
   * Additional props, including ARIA attributes, to spread onto each cell in
   * the table body for this column. Can support custom data attributes or
   * specialized accessibility attributes.
   */
  cellProps?: Record<string, any>;
}

// --------------------------------------------------------------------------------------------
// TableProps<T> Interface
// --------------------------------------------------------------------------------------------
/**
 * TableProps<T>
 * ----------------------------------------------------------------------------------
 * Enhanced props interface for the Table component with accessibility and
 * performance features, including virtualization, multi/single column sorting,
 * pagination, and WCAG 2.1 AA compliance.
 */
export interface TableProps<T> {
  /**
   * The data to be displayed in the table. Can be a simple array of T
   * or a PaginatedResponse<T> if pagination is handled externally.
   */
  data: T[] | PaginatedResponse<T>;

  /**
   * The column definitions for the table. Each column specifies metadata,
   * including optional sorting and rendering.
   */
  columns: TableColumn<T>[];

  /**
   * Global flag enabling or disabling sorting. If false, all columns
   * ignore their sortable property and no sorting UI is rendered.
   */
  sortable: boolean;

  /**
   * If true, multiple columns can be sorted simultaneously. If false,
   * only one column can be sorted at a time.
   */
  multiSort: boolean;

  /**
   * Enables rendering of pagination UI. If data is of type PaginatedResponse,
   * relevant pagination info (page, totalPages, etc.) will be used. The
   * onPageChange callback is also invoked to handle page transitions.
   */
  pagination: boolean;

  /**
   * Enables row virtualization using react-window for better performance
   * with large data sets. If true, a virtual scroller is used to only render
   * rows in view.
   */
  virtualized: boolean;

  /**
   * Callback function invoked when a column is sorted (or sort toggled).
   * Receives the field name and the desired SortDirection (ASC/DESC).
   */
  onSort: (field: string, direction: SortDirection) => void;

  /**
   * Callback function invoked when pagination controls change pages.
   * Receives the new page number as an argument.
   */
  onPageChange: (page: number) => void;

  /**
   * Additional CSS class(es) for customizing the overall table container.
   */
  className?: string;

  /**
   * Indicates if the table is loading data. If true, a loading state
   * may be displayed in place of the main table body.
   */
  loading: boolean;

  /**
   * An accessible label describing the table contents, used by screen
   * readers for better WCAG 2.1 compliance.
   */
  ariaLabel: string;

  /**
   * If true, the table attempts to be more responsive, applying
   * overflow or flexible column widths. If false, it may use a
   * fixed layout.
   */
  responsive: boolean;
}

// --------------------------------------------------------------------------------------------
// Utility Types & Internal State
// --------------------------------------------------------------------------------------------
/**
 * SortConfig
 * ----------------------------------------------------------------------------------
 * Represents a single column sort definition. If multiSort is enabled,
 * an array of these can be maintained. If multiSort is disabled, only
 * one configuration is used at a time.
 */
interface SortConfig {
  field: string;
  direction: SortDirection;
}

// --------------------------------------------------------------------------------------------
// Table Component
// --------------------------------------------------------------------------------------------
/**
 * Table<T>
 * ----------------------------------------------------------------------------------
 * A highly performant, accessible, and feature-rich table component implementing
 * TaskStream AI's design system. Supports:
 *    - Advanced sorting (single or multi-column)
 *    - Pagination (manual or with PaginatedResponse)
 *    - Virtualization via react-window
 *    - WCAG 2.1 AA accessibility features
 *
 * Steps & Implementation Notes:
 *  1. Use internal state to track sorting configuration (one or multiple columns).
 *  2. Provide a handleSort function to toggle column sort and invoke onSort.
 *  3. Render headers in renderTableHeader, applying ARIA attributes and sort controls.
 *  4. Render body in renderTableBody, with optional virtualization.
 *  5. If pagination is true, render the <Pagination> component, deriving page info
 *     from PaginatedResponse<T> or from fallback logic.
 */
export const Table: FC<TableProps<any>> = <T,>(props: TableProps<T>) => {
  const {
    data,
    columns,
    sortable,
    multiSort,
    pagination,
    virtualized,
    onSort,
    onPageChange,
    className,
    loading,
    ariaLabel,
    responsive,
  } = props;

  // ------------------------------------------------------------------------------
  // Distinguish between array data vs. PaginatedResponse
  // ------------------------------------------------------------------------------
  const isPaginatedResponse = (d: any): d is PaginatedResponse<T> => {
    return (
      d &&
      typeof d === 'object' &&
      Array.isArray(d.items) &&
      'total' in d &&
      'page' in d &&
      'pageSize' in d &&
      'totalPages' in d
    );
  };

  // Identify the effective data array
  const items = isPaginatedResponse(data) ? data.items : data;
  const totalItems = isPaginatedResponse(data) ? data.total : items.length;
  const currentPage = isPaginatedResponse(data) ? data.page : 1;
  const totalPages = isPaginatedResponse(data) ? data.totalPages : 1;
  const pageSize = isPaginatedResponse(data) ? data.pageSize : items.length;

  // ------------------------------------------------------------------------------
  // Local State: Maintains a list of column sort settings
  // ------------------------------------------------------------------------------
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([]);

  // ------------------------------------------------------------------------------
  // handleSort
  // ------------------------------------------------------------------------------
  /**
   * Enhanced sort handler with support for multi-column sorting:
   *  1. Checks multiSort prop to decide if multiple columns can be sorted
   *     simultaneously.
   *  2. If the field is already sorted, toggles sort direction from ASC to DESC
   *     or vice versa.
   *  3. If the field is new, sets its sort direction to ASC by default if
   *     multiSort is false; otherwise, adds it to any existing sorted columns.
   *  4. Calls onSort with the updated field/direction for parent notification.
   *  5. Updates any relevant aria-sort attributes in the header.
   */
  const handleSort = useCallback(
    (field: string, currentDirection: SortDirection, multi: boolean) => {
      if (!sortable) return;

      setSortConfigs((prev) => {
        const existingIndex = prev.findIndex((sc) => sc.field === field);
        let newSortConfigs: SortConfig[] = [];

        if (multi) {
          // Multi-column sort path
          if (existingIndex >= 0) {
            // Toggle direction for existing field
            const updated = [...prev];
            const existing = updated[existingIndex];
            const newDirection =
              existing.direction === SortDirection.ASC
                ? SortDirection.DESC
                : SortDirection.ASC;
            updated[existingIndex] = { field, direction: newDirection };
            newSortConfigs = updated;
          } else {
            // Add new field with ASC direction by default
            newSortConfigs = [
              ...prev,
              { field, direction: SortDirection.ASC },
            ];
          }
        } else {
          // Single-column sort path
          if (existingIndex >= 0) {
            // Toggle existing direction
            const newDirection =
              currentDirection === SortDirection.ASC
                ? SortDirection.DESC
                : SortDirection.ASC;
            newSortConfigs = [{ field, direction: newDirection }];
          } else {
            // New field => default to ASC
            newSortConfigs = [{ field, direction: SortDirection.ASC }];
          }
        }

        // Identify the last updated sort config (the one that triggered)
        const lastConfig = newSortConfigs.find((c) => c.field === field);
        if (lastConfig) {
          onSort(lastConfig.field, lastConfig.direction);
        }
        return newSortConfigs;
      });
    },
    [sortable, onSort]
  );

  // ------------------------------------------------------------------------------
  // deriveSortDirection
  // ------------------------------------------------------------------------------
  /**
   * Utility to find the current sort direction for a given column field.
   * If multiSort is enabled, a given field might appear in the array,
   * otherwise it will be the single item if it exists.
   */
  const deriveSortDirection = useCallback(
    (field: string): SortDirection | undefined => {
      const config = sortConfigs.find((sc) => sc.field === field);
      return config?.direction;
    },
    [sortConfigs]
  );

  // ------------------------------------------------------------------------------
  // renderTableHeader
  // ------------------------------------------------------------------------------
  /**
   * Renders accessible table header cells with enhanced sort controls.
   * Steps:
   *  1. map columns to <th> cells
   *  2. If column.sortable && global sorting is enabled, display sort indicator
   *  3. Add aria-sort attribute to reflect current direction for screen readers
   *  4. Provide keyboard navigation for toggling sort
   *  5. Apply dynamic width, minWidth, and other headerProps
   */
  const renderTableHeader = useMemo((): ReactNode => {
    return (
      <thead>
        <tr>
          {columns.map((col) => {
            // Determine if current column is sorted and get direction if so
            const direction = deriveSortDirection(col.field);
            const ariaSort =
              sortable && col.sortable
                ? direction === SortDirection.ASC
                  ? 'ascending'
                  : direction === SortDirection.DESC
                  ? 'descending'
                  : 'none'
                : undefined;

            // Sort toggling cycle
            const onClickHeader = () => {
              if (!col.sortable || !sortable) return;
              const dir = direction ?? SortDirection.ASC;
              handleSort(col.field, dir, multiSort);
            };

            // Class name for visually indicating sort
            const headerClasses = classNames('ts-table-header-cell', {
              'cursor-pointer': col.sortable && sortable,
              'font-bold': true,
            });

            // Combine any user-provided props with ours
            const ariaProps = {
              // If the column is sortable, reflect the current or default sort
              'aria-sort': ariaSort,
              // Additional user-defined header props
              ...col.headerProps,
              // For screen readers: "Sortable column: Header text"
              'aria-label': col.sortable
                ? `Sortable column: ${col.header}`
                : undefined,
            };

            const styleObj: React.CSSProperties = {
              width: col.width || 'auto',
              minWidth: col.minWidth || 'auto',
            };

            return (
              <th
                key={col.field}
                onClick={onClickHeader}
                className={headerClasses}
                style={styleObj}
                {...ariaProps}
              >
                <div className="flex items-center">
                  <span>{col.header}</span>
                  {col.sortable && sortable && (
                    <span className="ml-1 text-xs" aria-hidden="true">
                      {direction === SortDirection.ASC
                        ? '▲'
                        : direction === SortDirection.DESC
                        ? '▼'
                        : ''}
                    </span>
                  )}
                </div>
              </th>
            );
          })}
        </tr>
      </thead>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, deriveSortDirection, handleSort, multiSort, sortable]);

  // ------------------------------------------------------------------------------
  // renderTableBody
  // ------------------------------------------------------------------------------
  /**
   * Renders the table body with optional virtualization support.
   * Steps:
   *   1. Extract the data items from T[] or PaginatedResponse<T>.
   *   2. If virtualized, use react-window's FixedSizeList to render only
   *      the rows in view. Otherwise, render each row in a standard <tbody>.
   *   3. For each cell, call the user-provided render function or directly
   *      use the field if no render function is given, applying any cellProps.
   *   4. Add accessibility attributes such as role="row" or role="cell"
   *   5. Handle the global loading state: if loading is true, optionally show
   *      a loading row or skip rendering items.
   */
  const renderTableBody = useMemo((): ReactNode => {
    if (loading) {
      // If you're implementing a design system skeleton or spinner row,
      // you can place that here.
      return (
        <tbody>
          <tr>
            <td colSpan={columns.length} className="text-center py-4">
              Loading...
            </td>
          </tr>
        </tbody>
      );
    }

    // Non-virtualized path
    const standardBody = (
      <tbody>
        {items.map((row, rowIndex) => (
          <tr key={rowIndex} role="row" className="ts-table-row">
            {columns.map((col) => {
              const cellValue = (row as any)[col.field];
              const content = col.render
                ? col.render(cellValue, row)
                : `${cellValue}`;
              const cellAriaProps = {
                ...col.cellProps,
              };
              return (
                <td
                  key={col.field}
                  role="cell"
                  style={{ minWidth: col.minWidth }}
                  {...cellAriaProps}
                  className="ts-table-cell p-2 border-b border-gray-200"
                >
                  {content}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    );

    if (!virtualized) {
      // Return standard table body if virtualization is not enabled
      return standardBody;
    }

    // Virtualized path using react-window
    // We'll default to a row height of 48px for each data row.
    const rowHeight = 48;

    // rowRenderer function for react-window: draws row content
    const RowRenderer = ({ index, style }: ListChildComponentProps) => {
      const row = items[index];
      return (
        <div
          style={style}
          role="row"
          className="ts-virtual-row border-b border-gray-200 flex"
        >
          {columns.map((col, columnIndex) => {
            const cellValue = (row as any)[col.field];
            const content = col.render
              ? col.render(cellValue, row)
              : `${cellValue}`;
            const cellAriaProps = {
              ...col.cellProps,
            };
            // We emulate table cells using divs with role="cell"
            return (
              <div
                key={`${index}-${columnIndex}`}
                role="cell"
                style={{
                  flex: '0 0 auto',
                  width: col.width || 'auto',
                  minWidth: col.minWidth || 'auto',
                }}
                className="p-2"
                {...cellAriaProps}
              >
                {content}
              </div>
            );
          })}
        </div>
      );
    };

    // We'll wrap the table header in a <thead> and return a custom structure for virtualization:
    //  <div>  <-- container
    //    <table><thead> ... </thead></table>
    //    <FixedSizeList> ... </FixedSizeList>
    //  </div>
    // In this function, though, we only return the <tbody> if not virtualizing,
    // so the real logic belongs in the final JSX below.

    // For synergy with the final return, we return null here. The main virtualization
    // blocks will be returned in the top-level JSX. We'll build them there.
    return (
      <div className="ts-virtualized-body">
        {/* We can optionally put an ARIA role on the container */}
        <FixedSizeList
          height={Math.min(items.length * rowHeight, 400)}
          itemCount={items.length}
          itemSize={rowHeight}
          width="100%"
        >
          {RowRenderer}
        </FixedSizeList>
      </div>
    );
  }, [items, columns, loading, virtualized]);

  // ------------------------------------------------------------------------------
  // Final Table Render
  // ------------------------------------------------------------------------------
  const rootClasses = classNames(
    'ts-table-container',
    {
      'overflow-auto': responsive,
      'w-full': true,
    },
    className
  );

  // We'll conditionally render pagination if props.pagination is true.
  // The Table does not manage "page" state by itself; instead, we rely on
  // the parent or the PaginatedResponse fields. onPageChange is triggered
  // when the user interacts with the pagination.
  const renderPagination = (): ReactNode => {
    if (!pagination) return null;
    // Prepare minimal props for the <Pagination> component
    // including currentPage, totalPages, pageSize, totalItems, onPageChange, etc.
    const paginationProps: Partial<PaginationProps> = {
      currentPage: currentPage,
      totalPages: totalPages,
      pageSize: pageSize,
      totalItems: totalItems,
      onPageChange: (newPage) => {
        onPageChange(newPage);
      },
      onPageSizeChange: () => {
        /* This example does not manage changing page size inside the table itself.
           If needed, pass a parent callback or additional logic. */
      },
      loading: loading,
      disabled: false,
      showPageSize: false,
      // Additional styling or practicality can be added
      dir: 'ltr',
      darkMode: false,
    };
    return <Pagination {...(paginationProps as PaginationProps)} />;
  };

  // If virtualization is enabled, we do a custom layout that has a table header and a separate
  // virtual scroller for the body. If not, we do a standard <table> with <thead> and <tbody>.
  if (virtualized) {
    return (
      <div className={rootClasses} aria-label={ariaLabel} role="table">
        {/* Table Header in a normal <table> to keep it sticky and structured */}
        <table className="w-full border-collapse">
          {renderTableHeader}
        </table>

        {/* The virtualized body from renderTableBody is a separate element */}
        {renderTableBody}

        {/* Optional pagination controls */}
        <div className="mt-2">{renderPagination()}</div>
      </div>
    );
  }

  return (
    <div className={rootClasses} aria-label={ariaLabel} role="table">
      <table
        className="ts-table w-full border-collapse"
        style={{ tableLayout: responsive ? 'auto' : 'fixed' }}
      >
        {renderTableHeader}
        {renderTableBody}
      </table>
      <div className="mt-2">{renderPagination()}</div>
    </div>
  );
};

// --------------------------------------------------------------------------------------------
// Named Export (IE3 compliance)
// --------------------------------------------------------------------------------------------
/**
 * The Table component is exported to be used in other parts
 * of the TaskStream AI front-end. The TableProps and TableColumn
 * are also re-exported for type-checking convenience.
 */
export type { TableColumn };
export type { TableProps };