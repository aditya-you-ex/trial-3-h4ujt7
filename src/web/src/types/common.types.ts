//
// http-status-codes version ^2.2.0
import { StatusCodes } from 'http-status-codes';

/**
 * A type alias representing all valid HTTP status codes from the
 * "http-status-codes" library. This leverages the numeric values exported
 * by the library to ensure strict type safety for API status handling
 * across the web application.
 */
export type HTTP_STATUS = (typeof StatusCodes)[keyof typeof StatusCodes];

/**
 * Interface: Metadata
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Immutable metadata fields for tracking entity creation and updates.
 *
 * Description:
 *   This interface standardizes the way timestamps and user references
 *   are recorded for any database or in-memory entity across the
 *   TaskStream AI web application. By keeping these fields immutable,
 *   the system ensures the integrity of audit-related properties.
 */
export interface Metadata {
  /**
   * The timestamp when this entity was created.
   * This field is automatically assigned at creation time and
   * should never be modified.
   */
  readonly createdAt: Date;

  /**
   * The timestamp when this entity was last updated.
   * This should only be changed by the system upon entity updates.
   */
  readonly updatedAt: Date;

  /**
   * The unique identifier of the user who created this entity.
   * Used for audit and traceability in multi-user environments.
   */
  readonly createdBy: string;

  /**
   * The unique identifier of the user who last updated this entity.
   * This field is updated each time the entity undergoes significant change.
   */
  readonly updatedBy: string;
}

/**
 * Interface: ApiResponse<T>
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Type-safe generic API response wrapper with null checking.
 *
 * Description:
 *   Defines the contract for all API responses returned by the
 *   TaskStream AI web application. This interface ensures that
 *   each response carries a status code, a message, optional data,
 *   a list of errors, and a timestamp for consistent handling
 *   on the client side.
 */
export interface ApiResponse<T> {
  /**
   * A numeric HTTP status code derived from the HTTP_STATUS type.
   * This property conveys the outcome of the request in a standardized way.
   */
  readonly status: HTTP_STATUS;

  /**
   * A human-readable message describing the overarching status or
   * intention of the response (e.g. "Operation successful").
   */
  readonly message: string;

  /**
   * The primary data payload. May be null if the request
   * does not include response data (for example, in error conditions).
   */
  readonly data: T | null;

  /**
   * A list of string-based error descriptions (if any) returned
   * by the server. In successful scenarios, this should be an empty array.
   */
  readonly errors: ReadonlyArray<string>;

  /**
   * The exact time at which the response was generated,
   * aiding in debugging and logging of requests.
   */
  readonly timestamp: Date;
}

/**
 * Interface: PaginatedResponse<T>
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Type-safe paginated response wrapper with additional pagination metadata.
 *
 * Description:
 *   This interface is used to represent lists of items (e.g., tasks, projects)
 *   that need to be loaded in chunks. It carries the set of items, total counts,
 *   current page, page size, and flags to determine navigability.
 */
export interface PaginatedResponse<T> {
  /**
   * A list of items tied to the current page context.
   */
  readonly items: ReadonlyArray<T>;

  /**
   * The total number of items across all pages.
   */
  readonly total: number;

  /**
   * The current page being viewed (1-indexed or 0-indexed based on usage).
   */
  readonly page: number;

  /**
   * The maximum number of items returned per page.
   */
  readonly pageSize: number;

  /**
   * The total number of pages calculated by dividing total items by the page size.
   */
  readonly totalPages: number;

  /**
   * Indicates if there is a subsequent page after the current one.
   */
  readonly hasNextPage: boolean;

  /**
   * Indicates if there is a preceding page before the current one.
   */
  readonly hasPreviousPage: boolean;
}

/**
 * Enum: SortDirection
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Type-safe sort direction enum with literal types.
 *
 * Description:
 *   Enumerates ascending and descending sort modes for use
 *   in query parameters or UI-based sorting controls. Ensures
 *   strict typing for any code referencing subsystem queries.
 */
export enum SortDirection {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Interface: PaginationParams
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Common pagination and sorting parameters with optional filters.
 *
 * Description:
 *   Provides a unified structure to represent client or server
 *   pagination input, including sorting configurations and
 *   an arbitrary filters map for advanced queries.
 */
export interface PaginationParams {
  /**
   * The current page number under inspection.
   */
  page: number;

  /**
   * The maximum number of items per page.
   */
  pageSize: number;

  /**
   * The field or property name by which data should be sorted.
   * May be null if no specific sort field is designated.
   */
  sortBy: string | null;

  /**
   * The direction (ascending or descending) in which records
   * should be sorted, referencing SortDirection.
   */
  sortDirection: SortDirection;

  /**
   * A map of filter criteria used to further slice or
   * refine the dataset. The values can be of any type
   * (e.g., string, number, boolean).
   */
  filters: Record<string, unknown>;
}

/**
 * Interface: ErrorResponse
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Comprehensive error response structure with optional stack trace.
 *
 * Description:
 *   When an operation fails, this structure standardizes the server's
 *   error reporting. Useful for debugging and user interactions where
 *   consistent error details are necessary.
 */
export interface ErrorResponse {
  /**
   * A machine-readable classification of the error condition (e.g. "E_VALIDATION").
   */
  readonly code: string;

  /**
   * A human-readable description or short phrase describing the problem.
   */
  readonly message: string;

  /**
   * Additional structured information related to the error scenario.
   * Often includes key-value pairs that can help troubleshoot the context.
   */
  readonly details: Record<string, unknown>;

  /**
   * The stack trace from the error, only present in non-production or
   * debugging modes where detailed error insights are allowed.
   */
  readonly stack: string | undefined;

  /**
   * The timestamp at which the error was generated, ensuring logs
   * and user-facing displays can reflect the incident time accurately.
   */
  readonly timestamp: Date;
}

/**
 * Interface: TimeRange
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Immutable time range structure with duration calculation.
 *
 * Description:
 *   Used to represent a block of time defined by a start and an end datetime,
 *   along with the computed duration in milliseconds (or a chosen unit).
 */
export interface TimeRange {
  /**
   * The beginning of the time interval.
   */
  readonly startDate: Date;

  /**
   * The conclusion of the time interval. Must always be
   * equal to or later than the startDate.
   */
  readonly endDate: Date;

  /**
   * A numeric representation (commonly measured in milliseconds)
   * of the difference between endDate and startDate.
   */
  readonly duration: number;
}

/**
 * Type: LoadingState
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Type-safe loading states using literal types.
 *
 * Description:
 *   A union type representing a UI or data fetching state. This helps
 *   ensure that edge cases (e.g. partial states) are not allowed
 *   in the codebase, promoting strict null and state checks.
 */
export type LoadingState =
  | 'idle'
  | 'loading'
  | 'succeeded'
  | 'failed';

/**
 * Interface: ValidationError
 * ----------------------------------------------------------------------------
 * Purpose:
 *   Field-level validation error structure.
 *
 * Description:
 *   Standardizes the representation of client or server-side
 *   validation failures. Bundles the specific field, a user-facing
 *   message, and the problematic input value for debugging.
 */
export interface ValidationError {
  /**
   * The name of the field that failed validation.
   */
  readonly field: string;

  /**
   * A human-readable message explaining why the validator rejected the value.
   */
  readonly message: string;

  /**
   * The actual value that triggered the validation error.
   */
  readonly value: unknown;
}