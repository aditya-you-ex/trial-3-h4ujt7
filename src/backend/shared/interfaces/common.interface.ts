/**
 * Represents the common metadata fields associated with any entity in the TaskStream AI platform.
 * These fields facilitate consistent data tracking across all microservices and database schemas.
 */
export interface Metadata {
  /**
   * Timestamp indicating when the entity was initially created.
   */
  createdAt: Date;

  /**
   * Timestamp indicating when the entity was last updated.
   */
  updatedAt: Date;

  /**
   * Identifier for the user or service that created this entity.
   */
  createdBy: string;

  /**
   * Identifier for the user or service that last updated this entity.
   */
  updatedBy: string;

  /**
   * Version number used for optimistic concurrency control and version tracking.
   */
  version: number;
}

/**
 * Represents the standardized structure for enhanced error details,
 * enabling robust debugging and error resolution processes.
 */
export interface ErrorResponse {
  /**
   * Error code or classification, e.g., "VALIDATION_ERROR" or "AUTH_FAILED".
   */
  code: string;

  /**
   * Readable message describing the error or the cause.
   */
  message: string;

  /**
   * Additional details providing context or parameters relevant to the error.
   */
  details: Record<string, any>;

  /**
   * Timestamp when the error was generated on the server.
   */
  timestamp: Date;

  /**
   * Stack trace or partial trace for deeper debugging; may be omitted in production environments.
   */
  stackTrace: string;
}

/**
 * Encapsulates supplemental, context-specific data that accompanies an API response,
 * such as request identifiers or timestamps. Designed for tracing and analytics.
 */
export interface ResponseMetadata {
  /**
   * Unique identifier correlating the request through the system for debugging or analytics.
   */
  requestId: string;

  /**
   * Timestamp marking the moment this response was generated.
   */
  timestamp: Date;

  /**
   * Additional arbitrary metadata, enabling extensible response context.
   */
  [key: string]: any;
}

/**
 * A generic wrapper for API responses across the TaskStream AI platform,
 * providing consistent status messaging, data payload, error details, and metadata.
 */
export interface ApiResponse<T> {
  /**
   * High-level result of the request, e.g., "success" or "error".
   */
  status: string;

  /**
   * Human-readable message briefly describing the result.
   */
  message: string;

  /**
   * Actual payload or data returned from the operation (generic type T).
   */
  data: T;

  /**
   * Array of error details for logging or debugging; empty if no errors occurred.
   */
  errors: ErrorResponse[];

  /**
   * Additional context or metadata relevant to this response.
   */
  metadata: ResponseMetadata;
}

/**
 * Enumerates the possible sorting directions for data queries.
 */
export enum SortDirection {
  /**
   * Sort the results in ascending order (A-Z / 1..N).
   */
  ASC = 'ASC',

  /**
   * Sort the results in descending order (Z-A / N..1).
   */
  DESC = 'DESC',
}

/**
 * Contains parameters for paginated requests, supporting both offset-based
 * and cursor-based pagination strategies with flexible sorting options.
 */
export interface PaginationParams {
  /**
   * Numeric page index to retrieve (used for offset-based pagination).
   */
  page: number;

  /**
   * Maximum number of items to include in a single page.
   */
  pageSize: number;

  /**
   * Field name used to sort the result set.
   */
  sortBy: string;

  /**
   * Sort direction (ascending or descending).
   */
  sortDirection: SortDirection;

  /**
   * Cursor token used for cursor-based pagination.
   */
  cursor: string;
}

/**
 * A generic interface for responses that contain a paginated list of items.
 * Supports offset-based and cursor-based pagination for large result sets.
 */
export interface PaginatedResponse<T> {
  /**
   * The array of items constituting the current page of results.
   */
  items: T[];

  /**
   * Total number of items satisfying the query (for offset-based pagination).
   */
  total: number;

  /**
   * Current page index (for offset-based pagination).
   */
  page: number;

  /**
   * Number of items per page (for offset-based pagination).
   */
  pageSize: number;

  /**
   * Total number of pages (for offset-based pagination).
   */
  totalPages: number;

  /**
   * Indicates whether there is more data to be fetched.
   */
  hasMore: boolean;

  /**
   * Provides a cursor token to fetch subsequent pages (for cursor-based pagination).
   */
  nextCursor: string;
}

/**
 * Represents a time range structure for analytics and queries, incorporating
 * timezone data for consistent date and time handling across the platform.
 */
export interface TimeRange {
  /**
   * Start date for the time range.
   */
  startDate: Date;

  /**
   * End date for the time range.
   */
  endDate: Date;

  /**
   * Timezone identifier (e.g., "America/Los_Angeles") for accurate local time calculations.
   */
  timezone: string;
}