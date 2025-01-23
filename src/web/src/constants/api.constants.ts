/**
 * Defines a comprehensive set of constants, enums, and configurations
 * for API communication across the TaskStream AI frontend application.
 * This file ensures consistent usage of API endpoints, HTTP methods,
 * headers, content types, status codes, and global settings.
 */

/**
 * -----------------------------------------------------------------------------
 * Global Configuration Constants
 * -----------------------------------------------------------------------------
 */

/**
 * Represents the current API version identifier for all requests
 * to support versioned API interaction.
 */
export const API_VERSION: string = "v1";

/**
 * The base URL for all API calls to the TaskStream AI service.
 * Fallbacks to a predefined URL if the environment variable is not set.
 */
export const API_BASE_URL: string =
  process.env.REACT_APP_API_BASE_URL || "https://api.taskstream.ai";

/**
 * Default timeout in milliseconds for all outgoing API requests.
 * Helps ensure requests do not hang indefinitely.
 */
export const DEFAULT_TIMEOUT: number = 30000;

/**
 * Maximum number of retry attempts for failed API requests.
 * Useful for transient network or server errors.
 */
export const MAX_RETRIES: number = 3;

/**
 * Rate limit per defined time window (e.g., requests per minute).
 * Used in conjunction with server-side rate limiting policies.
 */
export const RATE_LIMIT: number = 1000;

/**
 * -----------------------------------------------------------------------------
 * API Endpoints Enum
 * -----------------------------------------------------------------------------
 * Enumerates all endpoint paths used within the system for authentication,
 * projects, tasks, analytics, user management, teams, and notifications.
 */
export enum API_ENDPOINTS {
  /**
   * Endpoint for user authentication actions such as login, logout,
   * token refresh, and user information retrieval.
   */
  AUTH = "/auth",

  /**
   * Endpoint for project-related operations including creation,
   * retrieval, updates, and deletions.
   */
  PROJECTS = "/projects",

  /**
   * Endpoint for task-related operations within projects such as
   * creation, assignment, status updates, and deletions.
   */
  TASKS = "/tasks",

  /**
   * Endpoint to retrieve and manage analytics data, reports, dashboards,
   * and other system metrics.
   */
  ANALYTICS = "/analytics",

  /**
   * Endpoint covering user data retrieval, profile settings, and
   * account-specific actions.
   */
  USERS = "/users",

  /**
   * Endpoint for team-related data, assignments, membership details,
   * and management functionalities.
   */
  TEAMS = "/teams",

  /**
   * Endpoint dedicated to push notifications, email triggers, and
   * event-based messaging within the system.
   */
  NOTIFICATIONS = "/notifications",
}

/**
 * -----------------------------------------------------------------------------
 * API Methods Enum
 * -----------------------------------------------------------------------------
 * Enumerates the primary HTTP methods used throughout the application
 * to ensure consistency across all requests.
 */
export enum API_METHODS {
  /**
   * Represents an HTTP GET request used for data retrieval.
   */
  GET = "GET",

  /**
   * Represents an HTTP POST request used to create or submit new data.
   */
  POST = "POST",

  /**
   * Represents an HTTP PUT request used for replacing or updating existing data.
   */
  PUT = "PUT",

  /**
   * Represents an HTTP DELETE request to remove existing data.
   */
  DELETE = "DELETE",

  /**
   * Represents an HTTP PATCH request used for partial modifications to existing data.
   */
  PATCH = "PATCH",
}

/**
 * -----------------------------------------------------------------------------
 * API Headers Enum
 * -----------------------------------------------------------------------------
 * Enumerates the default and custom headers used in API communication,
 * ensuring consistent header settings for all requests.
 */
export enum API_HEADERS {
  /**
   * Standard HTTP header for depicting the content type of a request.
   */
  CONTENT_TYPE = "Content-Type",

  /**
   * Standard HTTP header used for API token-based authorization.
   */
  AUTHORIZATION = "Authorization",

  /**
   * Standard HTTP header indicating the media types that are accepted
   * for a response.
   */
  ACCEPT = "Accept",

  /**
   * Custom header indicating the current version of the API in use.
   */
  X_API_VERSION = "X-API-Version",

  /**
   * Custom header representing a unique request identifier for
   * tracking requests and correlating logs.
   */
  X_REQUEST_ID = "X-Request-Id",

  /**
   * Custom header indicating the rate limit or the number of requests
   * allowed within a specific time window.
   */
  X_RATE_LIMIT = "X-Rate-Limit",
}

/**
 * -----------------------------------------------------------------------------
 * API Content Types Enum
 * -----------------------------------------------------------------------------
 * Enumerates the content types (MIME types) commonly used for request
 * and response handling within the frontend.
 */
export enum API_CONTENT_TYPES {
  /**
   * JSON content format (application/json).
   */
  JSON = "application/json",

  /**
   * Form data content format (multipart/form-data).
   */
  FORM_DATA = "multipart/form-data",

  /**
   * Binary stream content format (application/octet-stream).
   */
  STREAM = "application/octet-stream",

  /**
   * Event stream content format (text/event-stream).
   */
  EVENT_STREAM = "text/event-stream",
}

/**
 * -----------------------------------------------------------------------------
 * API Status Codes Enum
 * -----------------------------------------------------------------------------
 * Enumerates common HTTP status codes used throughout the application
 * to interpret server responses consistently.
 */
export enum API_STATUS_CODES {
  /**
   * 200 OK - The request has succeeded.
   */
  OK = 200,

  /**
   * 201 Created - The request has succeeded and a new resource has been created.
   */
  CREATED = 201,

  /**
   * 202 Accepted - The request has been accepted for processing, but the processing has not been completed.
   */
  ACCEPTED = 202,

  /**
   * 204 No Content - The server successfully processed the request,
   * but is not returning any content.
   */
  NO_CONTENT = 204,

  /**
   * 400 Bad Request - The server cannot or will not process the request
   * due to client error.
   */
  BAD_REQUEST = 400,

  /**
   * 401 Unauthorized - The request requires user authentication or authorization has failed.
   */
  UNAUTHORIZED = 401,

  /**
   * 403 Forbidden - The server understood the request but refuses to authorize it.
   */
  FORBIDDEN = 403,

  /**
   * 404 Not Found - The requested resource could not be found on the server.
   */
  NOT_FOUND = 404,

  /**
   * 409 Conflict - The request could not be completed due to a conflict with the current state of the resource.
   */
  CONFLICT = 409,

  /**
   * 429 Too Many Requests - The user has sent too many requests in a
   * given amount of time ("rate limiting").
   */
  TOO_MANY_REQUESTS = 429,

  /**
   * 500 Internal Server Error - An unexpected error occurred on the server side.
   */
  INTERNAL_SERVER_ERROR = 500,

  /**
   * 503 Service Unavailable - The server is currently unable to handle the request.
   */
  SERVICE_UNAVAILABLE = 503,
}