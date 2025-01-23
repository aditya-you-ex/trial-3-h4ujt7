/**
 * Provides a type-safe enumeration of all standard HTTP status codes
 * used across the TaskStream AI Platform for consistent API responses.
 * This enum is designed to support system reliability goals,
 * ensuring uniform handling of success, client error, and server error states.
 */
export const enum HTTP_STATUS {
  /**
   * Indicates that a request has succeeded.
   * @type {number}
   */
  OK = 200,

  /**
   * Indicates that the request has succeeded and a new resource has been created.
   * Commonly used for POST requests.
   * @type {number}
   */
  CREATED = 201,

  /**
   * Indicates that the request has been accepted for processing,
   * but the processing has not been completed.
   * @type {number}
   */
  ACCEPTED = 202,

  /**
   * Indicates that the request was successfully processed,
   * but there is no new content to return.
   * @type {number}
   */
  NO_CONTENT = 204,

  /**
   * Indicates that the server cannot process the request due to a client error
   * (e.g., malformed request syntax or invalid request parameters).
   * @type {number}
   */
  BAD_REQUEST = 400,

  /**
   * Indicates that the request requires user authentication or the provided
   * credentials are invalid.
   * @type {number}
   */
  UNAUTHORIZED = 401,

  /**
   * Indicates that the client does not have permission to perform the requested operation
   * even if authenticated.
   * @type {number}
   */
  FORBIDDEN = 403,

  /**
   * Indicates that the server cannot find the requested resource.
   * @type {number}
   */
  NOT_FOUND = 404,

  /**
   * Indicates that the request could not be completed due to a conflict
   * with the current state of the target resource.
   * @type {number}
   */
  CONFLICT = 409,

  /**
   * Indicates that the request was well-formed but was unable to be followed
   * due to semantic errors in the data provided.
   * @type {number}
   */
  UNPROCESSABLE_ENTITY = 422,

  /**
   * Indicates that the user has sent too many requests in a given amount of time,
   * triggering rate-limiting or throttling mechanisms.
   * @type {number}
   */
  TOO_MANY_REQUESTS = 429,

  /**
   * Indicates that the server encountered an unexpected condition which
   * prevented it from fulfilling the request.
   * @type {number}
   */
  INTERNAL_SERVER_ERROR = 500,

  /**
   * Indicates that the server received an invalid response from an upstream server.
   * @type {number}
   */
  BAD_GATEWAY = 502,

  /**
   * Indicates that the server is currently unable to handle the request
   * due to a temporary overload or scheduled maintenance.
   * @type {number}
   */
  SERVICE_UNAVAILABLE = 503,

  /**
   * Indicates that the server, while acting as a gateway or proxy, did not
   * receive a timely response from an upstream server or some other auxiliary service.
   * @type {number}
   */
  GATEWAY_TIMEOUT = 504
}

/**
 * Provides a standardized, human-readable message for each HTTP status code
 * used across the TaskStream AI platform. This mapping ensures that all services
 * produce consistent message outputs for success, error, and informational responses.
 */
export const STATUS_MESSAGES: Record<number, string> = {
  [HTTP_STATUS.OK]: 'Request completed successfully',
  [HTTP_STATUS.CREATED]: 'Resource created successfully',
  [HTTP_STATUS.ACCEPTED]: 'Request accepted and being processed asynchronously',
  [HTTP_STATUS.NO_CONTENT]: 'Request processed successfully, no content to return',
  [HTTP_STATUS.BAD_REQUEST]: 'Invalid request parameters or payload',
  [HTTP_STATUS.UNAUTHORIZED]: 'Authentication required or credentials invalid',
  [HTTP_STATUS.FORBIDDEN]: 'Permission denied for requested operation',
  [HTTP_STATUS.NOT_FOUND]: 'Requested resource not found',
  [HTTP_STATUS.CONFLICT]: 'Resource state conflict detected',
  [HTTP_STATUS.UNPROCESSABLE_ENTITY]: 'Request validation failed - check input data',
  [HTTP_STATUS.TOO_MANY_REQUESTS]: 'Rate limit exceeded - please retry later',
  [HTTP_STATUS.INTERNAL_SERVER_ERROR]: 'Internal server error occurred',
  [HTTP_STATUS.BAD_GATEWAY]: 'Invalid response from upstream server',
  [HTTP_STATUS.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable - maintenance or overload',
  [HTTP_STATUS.GATEWAY_TIMEOUT]: 'Upstream server request timeout'
};

/**
 * Interface defining optional parameters for getStatusMessage,
 * allowing additional context to be appended to the base message
 * and optional masking for sensitive details in production environments.
 */
interface StatusMessageOptions {
  /**
   * Optional context or details to be appended to the message.
   */
  context?: string;
  /**
   * If true, and the environment is production, attempts to sanitize
   * or mask potentially sensitive content in the generated message.
   */
  mask?: boolean;
}

/**
 * Retrieves the standardized status message for a given HTTP status code.
 * Optionally appends context information and supports masking details
 * if configured for production environments.
 *
 * @param {number} statusCode - The HTTP status code (100 - 599).
 * @param {StatusMessageOptions} [options] - Optional parameters for context and masking.
 * @returns {string} A detailed, human-readable status message.
 */
export function getStatusMessage(
  statusCode: number,
  options?: StatusMessageOptions
): string {
  // 1) Validate input status code range to flag unknown codes early
  if (statusCode < 100 || statusCode > 599) {
    return 'Unknown status code';
  }

  // 2) Attempt to retrieve the base message from the STATUS_MESSAGES mapping
  let baseMessage = STATUS_MESSAGES[statusCode];
  if (!baseMessage) {
    return 'Unknown status code';
  }

  // 3) If context is provided, append it to the message for additional detail
  if (options?.context) {
    baseMessage = `${baseMessage} - ${options.context}`;
  }

  // 4) Optionally mask sensitive details if mask is set and we are in production
  if (options?.mask && process.env.NODE_ENV === 'production') {
    // In a real scenario, apply more advanced sanitization or redaction logic.
    // For demonstration, we replace any numeric sequence with [REDACTED].
    baseMessage = baseMessage.replace(/\d+/g, '[REDACTED]');
  }

  // 5) Return the final composed message with or without context
  return baseMessage;
}