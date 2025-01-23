/***************************************************************************************************
 * TaskStream AI - Enterprise-Grade API Type Definitions
 * -----------------------------------------------------------------------------------------------
 * This file provides TypeScript types and interfaces for API communication between the frontend
 * and backend services. It includes endpoint definitions, HTTP configuration (with retry and
 * circuit breaker patterns), enhanced monitoring/tracing support, and standardized request/response
 * models. These types are central to ensuring reliable, strongly typed, and robust interactions
 * across the TaskStream AI platform.
 **************************************************************************************************/

/***************************************************************************************************
 * External Imports (with library versions per IE2)
 **************************************************************************************************/
/**
 * Axios v1.4.0 provides the necessary request and response interfaces for HTTP operations.
 * By combining Axios' definitions with our enterprise-specific configurations, we ensure
 * robust HTTP interactions that incorporate retries, circuit breaker logic, and monitoring.
 */
import type {
  AxiosRequestConfig, // v1.4.0
  AxiosResponse,      // v1.4.0
} from 'axios';

/***************************************************************************************************
 * Internal Imports (with usage details per IE1)
 **************************************************************************************************/
/**
 * We import the base API response structure and base error structure from our shared backend
 * interfaces to maintain consistency across the entire platform. The shared interfaces define
 * fundamental response patterns, error formats, and pagination constructs used by all microservices.
 */
import {
  ApiResponse as BaseApiResponse,
  ErrorResponse as BaseErrorResponse,
} from '../../../backend/shared/interfaces/common.interface';

/***************************************************************************************************
 * Enumerations, Interfaces, and Type Definitions
 **************************************************************************************************/

/**
 * Defines the set of all available API endpoints. Extended with additional
 * endpoints for monitoring, system health, and user preferences.
 */
export enum ApiEndpoint {
  /**
   * Endpoint for all authentication-related interactions,
   * including login, logout, and token refresh.
   */
  AUTH = 'auth',

  /**
   * Endpoint for fetching, creating, updating, and deleting projects.
   */
  PROJECTS = 'projects',

  /**
   * Endpoint for task management operations, including creation,
   * assignment, updates, and status transitions.
   */
  TASKS = 'tasks',

  /**
   * Endpoint for analytics operations, such as fetching metrics
   * and aggregations over tasks, projects, and team performance.
   */
  ANALYTICS = 'analytics',

  /**
   * Endpoint for real-time analytics data—e.g., streaming updates,
   * dynamic dashboards, and live resource metrics.
   */
  ANALYTICS_REALTIME = 'analytics/realtime',

  /**
   * Endpoint for storing or retrieving user preference data,
   * such as theme settings, notification preferences, and layout configurations.
   */
  USER_PREFERENCES = 'user/preferences',

  /**
   * Endpoint for retrieving the current health or status of the system,
   * useful for readiness and liveness checks in container orchestration.
   */
  SYSTEM_HEALTH = 'system/health',

  /**
   * Endpoint for retrieving or recording audit logs, enabling traceability
   * and compliance by documenting user and system actions.
   */
  AUDIT_LOGS = 'audit/logs',
}

/**
 * Enumerates various backoff strategies for retry policies.
 * The client can implement these strategies to handle transient
 * errors in a systematic way.
 */
export enum BackoffStrategy {
  /**
   * No backoff delay between retries. This strategy will retry
   * immediately for each attempt.
   */
  NONE = 'none',

  /**
   * Linear backoff increases the wait time in constant increments
   * for each retry attempt.
   */
  LINEAR = 'linear',

  /**
   * Exponential backoff doubles the wait time for each subsequent
   * retry, often used to avoid saturating services.
   */
  EXPONENTIAL = 'exponential',
}

/**
 * Configuration for API retry behavior, including the maximum number
 * of attempts, the backoff strategy for delay calculation, and which
 * HTTP status codes are considered retryable.
 */
export interface RetryPolicy {
  /**
   * The maximum number of retry attempts allowed before failing.
   */
  maxAttempts: number;

  /**
   * The backoff strategy (e.g., linear or exponential) to use
   * between retry attempts.
   */
  backoffStrategy: BackoffStrategy;

  /**
   * An array of HTTP status codes that will trigger a retry,
   * such as 500, 503, or other transient failures.
   */
  retryableStatuses: number[];
}

/**
 * Configuration for the circuit breaker pattern, protecting the system
 * from continuously retrying an endpoint that might be down or unresponsive.
 */
export interface CircuitBreakerConfig {
  /**
   * Number of consecutive failures required to open the circuit,
   * preventing further requests until the reset timeout expires.
   */
  failureThreshold: number;

  /**
   * Duration (in milliseconds) to wait before transitioning from
   * an open circuit to a half-open state, allowing a test request.
   */
  resetTimeout: number;

  /**
   * Number of concurrent (or consecutive) requests to allow in
   * the half-open state to determine if the endpoint has recovered.
   */
  halfOpenRequests: number;
}

/**
 * Configuration parameters for API monitoring and tracing. By enabling
 * tracing and metrics, developers can observe, troubleshoot, and optimize
 * performance across distributed services.
 */
export interface MonitoringConfig {
  /**
   * Toggles distributed tracing on or off for the API calls.
   */
  enableTracing: boolean;

  /**
   * Key-value pairs representing custom HTTP headers used for
   * propagating tracing context (e.g., X-Request-ID).
   */
  tracingHeaders: Record<string, string>;

  /**
   * Enables metrics collection for these API calls, allowing
   * instrumentation and performance analysis.
   */
  metricsEnabled: boolean;
}

/**
 * Offers a specialized HTTP client configuration that merges standard
 * Axios settings with enterprise-grade features for resilience, monitoring,
 * and distributed tracing.
 */
export interface HttpClientConfig extends AxiosRequestConfig {
  /**
   * Defines how many times and under what conditions an API call
   * will be retried upon failure.
   */
  retryPolicy?: RetryPolicy;

  /**
   * Defines circuit breaker behavior to prevent overloading services
   * when encountering multiple failures.
   */
  circuitBreaker?: CircuitBreakerConfig;

  /**
   * Enables or disables monitoring features, such as distributed tracing
   * or metrics collection, for each API call.
   */
  monitoring?: MonitoringConfig;
}

/**
 * Alias for the base error structure used in the TaskStream AI platform.
 * This extended or aliased type can be used to unify error handling
 * across frontend and backend code.
 */
export type ApiErrorResponse = BaseErrorResponse;

/**
 * Extended base response interface that includes an optional singular
 * 'error' property for convenience, alongside zero or more detailed
 * error entries in the inherited 'errors' array.
 */
export interface ApiResponse<T> extends BaseApiResponse<T> {
  /**
   * Optional single error object for quick reference or display
   * in the UI. When present, it generally mirrors the first entry of
   * the inherited 'errors' array, but UI logic can handle them differently
   * as needed.
   */
  error?: ApiErrorResponse;
}

/***************************************************************************************************
 * Global Constants
 **************************************************************************************************/

/**
 * The default API version used throughout the TaskStream AI platform.
 * This version is appended to request URLs to facilitate versioning
 * and backward compatibility.
 */
export const API_VERSION = 'v1';

/**
 * Default timeout (in milliseconds) for API requests. This value is used
 * when no other timeout is specified.
 */
export const DEFAULT_TIMEOUT = 30000;

/**
 * The maximum number of allowed retry attempts for an API call. This value
 * is used if a RetryPolicy does not explicitly specify a maxAttempts override.
 */
export const MAX_RETRY_ATTEMPTS = 3;

/**
 * The threshold for circuit breaker failures. After this number of consecutive
 * errors, the circuit transitions to the open state. This default is used if
 * no explicit threshold is defined in CircuitBreakerConfig.
 */
export const CIRCUIT_BREAKER_THRESHOLD = 5;

/**
 * A toggle indicating whether distributed tracing is enabled by default
 * for API calls and other system interactions.
 */
export const TRACING_ENABLED = true;

/***************************************************************************************************
 * Additional Axios Response Alias (Optional Usage)
 **************************************************************************************************/
/**
 * Alias for the Axios response type, allowing advanced usage if needed for
 * typed data extraction or transformations. This is typically wrapped by
 * our custom ApiResponse interface for domain-specific usage.
 */
export type ApiAxiosResponse<T> = AxiosResponse<ApiResponse<T>>;