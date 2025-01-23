/**
 * This file provides a comprehensive configuration setup for all API-related
 * requests in the TaskStream AI frontend application. It includes base URL,
 * timeouts, header creation, retry logic with exponential backoff, and
 * circuit breaker thresholds. The goal is to ensure consistent, secure,
 * and reliable communication with the backend services.
 */

// -----------------------------------------------------------------------------
// External Imports (with version annotations)
// -----------------------------------------------------------------------------
import axios from 'axios'; // ^1.4.0
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

// -----------------------------------------------------------------------------
// Internal Imports
// -----------------------------------------------------------------------------
import {
  API_VERSION,
  API_HEADERS,
  API_CONTENT_TYPES,
} from '../constants/api.constants';

// -----------------------------------------------------------------------------
// Global Configuration Variables
// -----------------------------------------------------------------------------
/**
 * The base URL for API requests. Falls back to localhost if no environment
 * variable is provided.
 */
const API_BASE_URL: string =
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

/**
 * Default request timeout (in milliseconds) for all outgoing HTTP calls.
 */
const DEFAULT_TIMEOUT: number = 30000;

/**
 * Defines the maximum number of retry attempts for failed requests.
 */
const MAX_RETRIES: number = 3;

/**
 * Initial delay (in milliseconds) used for exponential backoff.
 */
const RETRY_DELAY: number = 1000;

/**
 * Rate limit per second for the client-side logic. Actual enforcement
 * occurs server-side, but we track local rate-limiting to avoid
 * sending excessive requests.
 */
const RATE_LIMIT_PER_SECOND: number = 10;

/**
 * Circuit breaker threshold representing the maximum number of
 * consecutive failures allowed before breaking new requests.
 */
const CIRCUIT_BREAKER_THRESHOLD: number = 5;

// -----------------------------------------------------------------------------
// Function: createDefaultHeaders
// -----------------------------------------------------------------------------
/**
 * Creates default headers for API requests to ensure security,
 * proper content formatting, and request traceability.
 *
 * Steps:
 * 1. Generate a new UUID for request correlation.
 * 2. Set the Content-Type header to application/json.
 * 3. Set the Accept header to application/json.
 * 4. Insert an API version header for versioning.
 * 5. Add a unique request ID header for tracking.
 * 6. Optionally include an API key header for rate-limiting logic.
 * 7. Attach a Bearer token header if a token is provided.
 * 8. Return the complete headers object.
 *
 * @param token - An optional JWT token to include in the Authorization header.
 * @returns An object containing standard HTTP headers for API requests.
 */
export function createDefaultHeaders(
  token?: string
): Record<string, string> {
  // Generate a unique request ID using UUID
  const requestId: string = uuidv4();

  // Initialize headers with empty record
  const headers: Record<string, string> = {};

  // 1. Set Content-Type to JSON
  headers[API_HEADERS.CONTENT_TYPE] = API_CONTENT_TYPES.JSON;

  // 2. Set Accept to JSON
  headers[API_HEADERS.ACCEPT] = API_CONTENT_TYPES.JSON;

  // 3. Add API version header for versioning
  headers[API_HEADERS.X_API_VERSION] = API_VERSION;

  // 4. Add unique request ID header for traceability
  headers[API_HEADERS.X_REQUEST_ID] = requestId;

  // 5. Optionally include an API key header for rate limiting (string literal used, as not defined in the enum)
  headers['X-API-Key'] = process.env.REACT_APP_API_KEY || '';

  // 6. If a JWT token is provided, add a Bearer token to Authorization
  if (token) {
    headers[API_HEADERS.AUTHORIZATION] = `Bearer ${token}`;
  }

  // Return the fully assembled headers object
  return headers;
}

// -----------------------------------------------------------------------------
// Function: createRetryConfig
// -----------------------------------------------------------------------------
/**
 * Creates advanced retry configuration for API requests with exponential 
 * backoff and circuit breaker conditions. This object can be leveraged by 
 * Axios interceptors or other HTTP-request-handling utilities to automatically 
 * retry transient failures.
 *
 * Steps:
 * 1. Set the maximum allowable retry attempts from our global config.
 * 2. Define exponential backoff for retry delays based on RETRY_DELAY.
 * 3. Identify which error types or status codes trigger retries.
 * 4. Add logging or counters for each retry attempt.
 * 5. Ensure timeout handling integrates with the retry process.
 * 6. Provide circuit breaker logic to stop further requests after
 *    too many consecutive failures.
 * 7. Return a fully-formed retry configuration object.
 *
 * @returns A configuration object that can be used by Axios or other HTTP libraries
 *          to implement automatic retry logic.
 */
export function createRetryConfig(): object {
  // Read from global constants
  const maxAttempts: number = MAX_RETRIES;
  const circuitBreakerLimit: number = CIRCUIT_BREAKER_THRESHOLD;
  const baseDelay: number = RETRY_DELAY;

  // Construct the complete retry configuration
  // Note: Implementation details for circuit breaker and logging 
  // would be expanded in a real-world scenario with state tracking.
  const retryConfig = {
    maxAttempts,
    circuitBreakerLimit,
    baseDelay,
    backoffStrategy: 'exponential',
    retryCondition: (error: any): boolean => {
      // Retry on network or 5xx errors
      const status = error?.response?.status;
      // Network error or status >= 500
      return !status || (status >= 500 && status < 600);
    },
    calculateDelay: (attempt: number): number => {
      // Exponential backoff formula
      return Math.pow(2, attempt) * baseDelay;
    },
    onRetryAttempt: (attempt: number) => {
      // Logging or counters could go here
      // e.g., console.info(`Retry attempt #${attempt + 1}`);
    },
  };

  return retryConfig;
}

// -----------------------------------------------------------------------------
// apiConfig Object
// -----------------------------------------------------------------------------
/**
 * Main API configuration object that consolidates essential settings
 * for API requests, including base URL, timeout, default headers,
 * rate-limiting, retry logic, and circuit breaker thresholds.
 */
export const apiConfig = {
  /**
   * The base URL for all outgoing API requests.
   */
  baseURL: API_BASE_URL,

  /**
   * Maximum time (in milliseconds) to wait before considering
   * a request as timed out.
   */
  timeout: DEFAULT_TIMEOUT,

  /**
   * Default headers attached to every request. Typically overridden
   * at runtime via createDefaultHeaders(token).
   */
  headers: createDefaultHeaders(undefined),

  /**
   * Comprehensive retry configuration for handling transient failures
   * automatically, including exponential backoff and error-based conditions.
   */
  retryConfig: createRetryConfig(),

  /**
   * Local client-side rate-limiting configuration to avoid sending 
   * excessive requests in a short period. Actual enforcement is 
   * also handled server-side.
   */
  rateLimiting: {
    requestsPerSecond: RATE_LIMIT_PER_SECOND,
  },

  /**
   * Circuit breaker settings to halt new requests when repeated 
   * failures exceed the defined threshold.
   */
  circuitBreaker: {
    threshold: CIRCUIT_BREAKER_THRESHOLD,
  },
};