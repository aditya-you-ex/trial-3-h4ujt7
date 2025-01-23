import { Request, Response, NextFunction } from 'express'; // express@4.18.2
import { HTTP_STATUS } from '../constants/status-codes';
import {
  getErrorMessage,
  ErrorSeverity,
  ErrorCategory
} from '../constants/error-codes';
import { Logger } from '../utils/logger';

/**
 * Global logger instance tailored for error middleware usage.
 * Provides service-level identification and debugging context.
 */
const logger = new Logger({
  level: 'debug',
  consoleEnabled: true,
  environment: process.env.NODE_ENV ?? 'development',
  // Additional contextual metadata for identifying logs originating from this middleware:
  service: 'error-middleware',
  context: 'error-handling'
});

/**
 * ApplicationError
 * -----------------------------------------------------------------------------
 * An enhanced base error class for capturing additional metadata, severity,
 * and categorization details within the TaskStream AI platform. It ensures
 * secure handling of error data while supporting correlation IDs for
 * distributed tracing.
 */
export class ApplicationError extends Error {
  /**
   * Unique code identifying the specific error type.
   */
  public errorCode: string;

  /**
   * Severity level of the error for logging and alerting (LOW, MEDIUM, HIGH, CRITICAL).
   */
  public severity: ErrorSeverity;

  /**
   * Category indicating functional domain (e.g., validation, auth, system).
   */
  public category: ErrorCategory;

  /**
   * Arbitrary metadata for further context (e.g., request payload snapshots).
   */
  public metadata: object;

  /**
   * Unique identifier for correlating errors across services or request boundaries.
   */
  public correlationId: string;

  /**
   * Timestamp when the error was instantiated.
   */
  public timestamp: Date;

  /**
   * Constructor
   * -----------------------------------------------------------------------------
   * Initializes an ApplicationError with extended context, severity, categorization,
   * and automated correlation ID generation. By providing robust metadata handling,
   * the platform achieves secure, traceable error management aligned with enterprise
   * monitoring requirements.
   *
   * Steps:
   *  1) Call Error constructor with message
   *  2) Validate error code format
   *  3) Set error severity level
   *  4) Set error category
   *  5) Sanitize and set metadata
   *  6) Generate correlation ID
   *  7) Set timestamp
   *  8) Set error name to class name
   *  9) Capture and sanitize stack trace
   *
   * @param message - Human-readable error description
   * @param errorCode - Internal code referencing standardized error sets
   * @param severity - Error severity level
   * @param category - Functional classification of the error
   * @param metadata - Additional data providing context for debugging or reporting
   */
  constructor(
    message: string,
    errorCode: string,
    severity: ErrorSeverity,
    category: ErrorCategory,
    metadata: object
  ) {
    // (1) Call Error constructor with message
    super(message);

    // (2) Validate error code format (basic check, can be extended)
    if (!errorCode || typeof errorCode !== 'string') {
      throw new Error('Invalid error code provided to ApplicationError');
    }

    // (3) Set error severity level
    this.severity = severity;

    // (4) Set error category
    this.category = category;

    // (5) Sanitize and set metadata (in production, consider deeper masking)
    this.metadata = { ...metadata };

    // (6) Generate correlation ID (basic unique suffix approach, can be replaced with advanced logic)
    this.correlationId = `APPERR-${Math.random().toString(36).substring(2, 15)}`;

    // (7) Set timestamp
    this.timestamp = new Date();

    // (8) Set error name to class name
    this.name = this.constructor.name;

    // (9) Capture and sanitize stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Store the error code
    this.errorCode = errorCode;
  }

  /**
   * toJSON
   * -----------------------------------------------------------------------------
   * Converts error to a safe JSON representation for logging or API responses.
   *
   * Steps:
   *  1) Create base error object
   *  2) Add safe metadata
   *  3) Add correlation ID
   *  4) Add timestamp
   *  5) Return sanitized object
   *
   * @returns A secure, sanitized object describing the error
   */
  public toJSON(): object {
    // (1) Create base error object
    const safeError: Record<string, unknown> = {
      message: this.message,
      errorCode: this.errorCode,
      severity: this.severity,
      category: this.category
    };

    // (2) Add safe metadata (already sanitized in constructor)
    safeError.metadata = this.metadata;

    // (3) Add correlation ID
    safeError.correlationId = this.correlationId;

    // (4) Add timestamp
    safeError.timestamp = this.timestamp;

    // (5) Return sanitized object
    return safeError;
  }
}

/**
 * getErrorStatusCode
 * -----------------------------------------------------------------------------
 * Determines the appropriate HTTP status code for a given error. In the case of
 * an ApplicationError, this function consults the standardized error message
 * and metadata. Otherwise, it falls back to 500 (Internal Server Error).
 *
 * Steps:
 *  1) Check for custom error types (e.g., ApplicationError)
 *  2) Validate error instance
 *  3) Map application errors to status codes from getErrorMessage
 *  4) Handle potential domain/validation/integration errors
 *  5) Return a fallback of 500 if unrecognized
 *
 * @param error - The encountered Error object
 * @returns HTTP status code aligning with the platform's error specifications
 */
export function getErrorStatusCode(error: Error): number {
  // (1) Check for custom error
  if (error instanceof ApplicationError) {
    try {
      // (2) For recognized codes, map to the correct status
      const errorResponse = getErrorMessage(error.errorCode, 'en', {});
      // (3) Retrieve the mapped HTTP status code or fallback
      return errorResponse.metadata.httpStatus || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    } catch {
      // If anything fails, default to 500
      return HTTP_STATUS.INTERNAL_SERVER_ERROR;
    }
  }

  // (4) Additional handling for other error types can be added here if needed.

  // (5) Return fallback code
  return HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

/**
 * errorHandler
 * -----------------------------------------------------------------------------
 * An Express middleware for centralized error handling in the TaskStream AI platform.
 * Provides secure error transformation, standardized responses, logging, performance
 * monitoring, and i18n support.
 *
 * Steps:
 *  1) Generate or retrieve correlation ID for error tracking
 *  2) Sanitize error stack trace if needed
 *  3) Classify error type and severity
 *  4) Log error with context, including correlation ID
 *  5) Determine HTTP status code via getErrorStatusCode helper
 *  6) Format secure error message using i18n (getErrorMessage)
 *  7) Return standardized JSON error response
 *
 * @param error - The unhandled or thrown error
 * @param req - Express Request object
 * @param res - Express Response object
 * @param next - NextFunction for middleware chain
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // (1) Generate or retrieve correlation ID
  let correlationId: string;
  if (error instanceof ApplicationError) {
    correlationId = error.correlationId;
  } else {
    correlationId = `GENERR-${Math.random().toString(36).substring(2, 15)}`;
  }

  // (2) (Optional) Sanitize stack in production if desired (example placeholder)
  if (process.env.NODE_ENV === 'production') {
    // A more comprehensive approach might mask or remove entire stack details
    // to prevent sensitive data leakage in logs or responses.
    error.stack = '[stack trace suppressed in production]';
  }

  // (3) Classify error type/ severity if it's an ApplicationError, else default
  const severity =
    error instanceof ApplicationError ? error.severity : ('UNKNOWN' as ErrorSeverity);

  // (4) Log error with context. Provide correlation ID, request info, severity, etc.
  logger.error('Encountered an error during request processing', {
    correlationId,
    severity,
    requestPath: req.originalUrl,
    requestMethod: req.method,
    stack: error.stack ?? 'N/A'
  });

  // (5) Determine appropriate HTTP status code
  const statusCode = getErrorStatusCode(error);

  // (6) Format a secure error message with i18n support. Default if not an ApplicationError.
  let responseMessage = 'An unexpected error occurred. Please contact support if this persists.';
  if (error instanceof ApplicationError) {
    const errorInfo = getErrorMessage(error.errorCode, 'en', {});
    responseMessage = errorInfo.message;
  }

  // (7) Return a standardized error response. Minimize details to avoid exposing internals.
  //     The correlationId helps trace the error in logs.
  res.status(statusCode).json({
    status: 'error',
    correlationId,
    message: responseMessage
  });
}