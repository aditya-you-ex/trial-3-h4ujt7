/**
 * TaskStream AI - Common Constants
 * -----------------------------------------------------------------------------
 * This file defines shared constants, default configurations, and reference
 * values used throughout the TaskStream AI web application. It addresses:
 *
 * 1. User Interface Design - By providing UI constants such as loading states,
 *    animation timings, and default date/time formats for consistent design.
 * 2. API Response Standards - By mapping standardized HTTP status codes and
 *    custom error codes for uniform client-server communication.
 * 3. System Architecture - Ensuring essential settings like pagination and
 *    sort direction are consistently applied across the application’s React,
 *    Redux, and other frontend layers.
 *
 * Note:
 * - Importing "StatusCodes" from "http-status-codes" (version ^2.2.0) to
 *   maintain alignment with widely used HTTP conventions.
 * - Importing "LoadingState" and "SortDirection" from "../types/common.types"
 *   based on the provided specification.
 */

// Third-party or external imports (version ^2.2.0 for http-status-codes):
import { StatusCodes } from 'http-status-codes'; // version ^2.2.0

// Internal imports from the common types definition:
import { LoadingState, SortDirection } from '../types/common.types';

/**
 * PAGINATION_DEFAULTS
 * -----------------------------------------------------------------------------
 * A configuration object carrying default pagination state and metadata.
 * Used throughout the application for initializing or resetting pagination
 * controls (e.g., in task lists, project boards, and search results).
 */
export const PAGINATION_DEFAULTS = {
  /**
   * The default number of items to display per page for list views.
   */
  PAGE_SIZE: 10,

  /**
   * The initial page to show when loading paginated data for the first time.
   */
  CURRENT_PAGE: 1,

  /**
   * The default direction in which list data is sorted.
   * By default, uses descending order to display newest items first.
   */
  SORT_DIRECTION: SortDirection.DESC,

  /**
   * The total number of pages for a paginated list, typically
   * calculated after fetching data from the server or local filters.
   */
  TOTAL_PAGES: 0,

  /**
   * A boolean indicating whether the current pagination context
   * has another page of items to display.
   */
  HAS_NEXT_PAGE: false,
} as const;

/**
 * DATE_FORMATS
 * -----------------------------------------------------------------------------
 * Common date/time formats and localized variants used for:
 * - Displaying dates in UI components
 * - Formatting data for APIs
 * - Managing user-specific locale settings
 */
export const DATE_FORMATS = {
  /**
   * A strict year-month-day (YYYY-MM-DD) format commonly used
   * for unambiguous date handling throughout the system.
   */
  DATE_ONLY: 'YYYY-MM-DD',

  /**
   * Displays or parses only time values in 24-hour format (HH:mm:ss),
   * used for logs, real-time updates, or scheduling.
   */
  TIME_ONLY: 'HH:mm:ss',

  /**
   * Standard date and time combination (YYYY-MM-DD HH:mm:ss),
   * suitable for user-friendly yet precise timestamps.
   */
  DATETIME: 'YYYY-MM-DD HH:mm:ss',

  /**
   * Denotes a time zone offset in UTC-based notation (e.g., +00:00),
   * ensuring consistent communication of time boundaries.
   */
  TIMEZONE: 'Z',

  /**
   * A record of locale-specific date/time formats. The keys are locale
   * strings (e.g., "en-US", "en-GB", "fr-FR"), mapped to the desired format.
   * Enables the UI to adjust date/time representations based on user
   * preferences or system configurations.
   */
  LOCALE_FORMATS: {
    'en-US': 'MM/DD/YYYY',
    'en-GB': 'DD/MM/YYYY',
    'fr-FR': 'DD/MM/YYYY',
  } as Record<string, string>,
} as const;

/**
 * UI_CONSTANTS
 * -----------------------------------------------------------------------------
 * Central resource for user interface constants that define application
 * loading states, animations, notifications, and transitions. This promotes
 * consistency and maintainability across all UI-related code and design system
 * elements.
 */
export const UI_CONSTANTS = {
  /**
   * An object mapping high-level textual keys to string literal
   * union types representing application loading states:
   *  - idle
   *  - loading
   *  - succeeded
   *  - failed
   *
   * Allows UI or Redux to handle data fetching states in a
   * strictly typed manner.
   */
  LOADING_STATES: {
    IDLE: 'idle' as LoadingState,
    LOADING: 'loading' as LoadingState,
    SUCCESS: 'succeeded' as LoadingState,
    ERROR: 'failed' as LoadingState,
  },

  /**
   * Defines the default duration (in milliseconds) for component
   * transitions and animations, such as modals, dropdowns, or
   * collapsible panels within the UI.
   */
  ANIMATION_DURATION: 300,

  /**
   * The duration (in milliseconds) after which toast or snackbar
   * notifications will automatically disappear, helping to maintain
   * a frictionless user experience.
   */
  TOAST_DURATION: 5000,

  /**
   * An additional mapping for custom transitions or states encountered
   * during animated UI flows (e.g., transitions for collapsible sidebars,
   * chart rendering, or hover effects).
   *
   * The keys are arbitrary string labels for the transition phases,
   * and the values are the corresponding string indicators used by
   * CSS/Possible JS event handlers.
   */
  TRANSITION_STATES: {
    ENTERING: 'entering',
    ENTERED: 'entered',
    EXITING: 'exiting',
    EXITED: 'exited',
  } as Record<string, string>,
} as const;

/**
 * HTTP_STATUS
 * -----------------------------------------------------------------------------
 * Consolidates standard HTTP status codes from "http-status-codes" with
 * additional custom error codes for specialized error handling. This ensures
 * consistent numeric references in all API calls, responses, and status checks.
 */
export const HTTP_STATUS = {
  /**
   * 200 - The request has succeeded.
   * Commonly used for GET or successful non-creation operations.
   */
  OK: StatusCodes.OK,

  /**
   * 201 - The request has succeeded, leading to a resource creation.
   */
  CREATED: StatusCodes.CREATED,

  /**
   * 400 - The server cannot or will not process the request due to
   * something that is perceived to be a client error.
   */
  BAD_REQUEST: StatusCodes.BAD_REQUEST,

  /**
   * 401 - The request has not been applied because it lacks valid
   * authentication credentials for the target resource.
   */
  UNAUTHORIZED: StatusCodes.UNAUTHORIZED,

  /**
   * 403 - The server understood the request but refuses to authorize it.
   */
  FORBIDDEN: StatusCodes.FORBIDDEN,

  /**
   * 404 - The requested resource could not be found but may be
   * available in the future.
   */
  NOT_FOUND: StatusCodes.NOT_FOUND,

  /**
   * 500 - A generic error message, given when an unexpected condition
   * was encountered on the server.
   */
  INTERNAL_SERVER_ERROR: StatusCodes.INTERNAL_SERVER_ERROR,

  /**
   * Custom application-specific error codes extending beyond
   * the standard HTTP status definitions. These can be used
   * for front-end or middle-tier logic that needs a fine-grained
   * or domain-specific code classification.
   */
  CUSTOM_ERROR_CODES: {
    USER_NOT_FOUND: 1001,
    PROJECT_LOCKED: 1002,
    INSUFFICIENT_BALANCE: 2001,
  } as Record<string, number>,
} as const;