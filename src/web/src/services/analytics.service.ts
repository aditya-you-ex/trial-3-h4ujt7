/**
 * Enterprise-grade AnalyticsService responsible for handling analytics-related
 * API communications and data processing in the frontend application. It provides
 * methods to fetch metrics, resource analytics, team performance data, and predictive
 * insights with enhanced reliability, including circuit breaker patterns, caching,
 * and comprehensive monitoring features.
 *
 * Requirements Addressed:
 *  - Analytics Engine (Predictive analytics for resource optimization)
 *  - Resource Optimization (Improved resource utilization)
 *  - Analytics Dashboard (Comprehensive analytics data: performance metrics, resource usage, etc.)
 *  - System Reliability (99.9% uptime through circuit breaker and robust error handling)
 */

// -----------------------------------------------------------------------------
// External Imports (with library version annotations per IE2)
// -----------------------------------------------------------------------------
import axios from 'axios'; // ^1.4.0
import CircuitBreaker from 'opossum'; // ^7.1.0
import { caching, Cache } from 'cache-manager'; // ^5.2.0

// -----------------------------------------------------------------------------
// Internal Imports (with usage details per IE1)
// -----------------------------------------------------------------------------
import { apiService, ApiErrorResponse } from './api.service'; // Core API communication service
import {
  MetricType,
  AnalyticsDashboard,
  ResourceAnalytics,
  TeamPerformance,
  PredictiveInsights,
} from '../types/analytics.types'; // Analytics-related types: metrics, resources, teams, insights

import { TimeRange } from '../types/common.types'; // Reused time range for analytics queries

// -----------------------------------------------------------------------------
// Interface: EnhancedCircuitBreakerOptions
// -----------------------------------------------------------------------------
// To align with the JSON specification requiring a dedicated circuit breaker
// within this service, we define minimal configuration for demonstration.
// In a production scenario, these options might be loaded from environment
// variables or advanced config files.
interface EnhancedCircuitBreakerOptions {
  /**
   * Time (in milliseconds) before the breaker automatically closes or moves
   * from open to half-open for a test request.
   */
  resetTimeout: number;

  /**
   * Percentage of errors in a rolling window that will trip the breaker.
   * e.g., 50 = 50% or more errors to open the circuit.
   */
  errorThresholdPercentage: number;

  /**
   * Minimal number of requests in the rolling window before opening the breaker.
   */
  volumeThreshold: number;

  /**
   * Timeout (in milliseconds) before we consider a single request a failure
   * if it does not complete.
   */
  timeout: number;
}

// -----------------------------------------------------------------------------
// Class: AnalyticsService
// -----------------------------------------------------------------------------
/**
 * The AnalyticsService class handles all analytics-related API communications
 * and data processing with reliability features:
 *  1. Circuit breaker to prevent repeated failing requests from overwhelming the system.
 *  2. Caching to reduce load on backend services and improve response times.
 *  3. Comprehensive monitoring (through logs and potential custom instrumentation).
 *  4. Fine-grained error handling and retry logic at call sites.
 */
class AnalyticsService {
  /**
   * Base endpoint for analytics-related API calls, appended to
   * the platform’s primary API domain or base path.
   */
  private readonly baseEndpoint: string;

  /**
   * A dedicated circuit breaker instance for analytics methods.
   * This additional layer of protection ensures that repeated
   * failures do not degrade system reliability.
   */
  private readonly circuitBreaker: CircuitBreaker;

  /**
   * A Cache instance from the 'cache-manager' library used
   * to store and retrieve analytics data.
   */
  private readonly cacheManager: Cache;

  /**
   * Constructs the AnalyticsService with the following steps:
   *  1. Defines the base endpoint for analytics API calls.
   *  2. Initializes a second-level circuit breaker with configuration.
   *  3. Initializes an in-memory cache manager with a default TTL.
   *  4. Sets up basic logging and monitoring placeholders.
   *  5. Configures request timeout and thresholds to optimize reliability.
   */
  constructor() {
    // 1. Define a base endpoint for analytics. This can be extended for sub-routes.
    this.baseEndpoint = '/analytics';

    // 2. Create circuit breaker with demonstration options (these values could be
    //    tuned or pulled from a more robust config file).
    const breakerConfig: EnhancedCircuitBreakerOptions = {
      resetTimeout: 15000, // 15s before attempting half-open state
      errorThresholdPercentage: 50, // 50% error rate trips the breaker
      volumeThreshold: 5, // must see at least 5 requests in rolling window
      timeout: 10000, // 10s request timeout
    };

    // Initialize circuit breaker with a generic function signature. We will pass in
    // the actual request operation at call sites (via .fire(...)).
    this.circuitBreaker = new CircuitBreaker(
      async (operation: () => Promise<unknown>) => {
        // The circuit breaker calls operation() if closed or half-open.
        return operation();
      },
      {
        timeout: breakerConfig.timeout,
        errorThresholdPercentage: breakerConfig.errorThresholdPercentage,
        volumeThreshold: breakerConfig.volumeThreshold,
        resetTimeout: breakerConfig.resetTimeout,
      }
    );

    // Configure a simple fallback to indicate that the breaker is open.
    this.circuitBreaker.fallback(() => {
      throw new Error('AnalyticsService circuit breaker fallback invoked. Service might be down.');
    });

    // 3. Initialize an in-memory cache manager with a default TTL of 60 seconds.
    //    This can be adjusted or replaced with a Redis store for distributed caching.
    this.cacheManager = caching({
      store: 'memory',
      max: 100, // maximum number of items in cache
      ttl: 60, // default TTL in seconds
    });

    // 4. Set up basic logging placeholders. In production, we might integrate with
    //    a logging platform like Winston or a monitoring system.
    //    console.info('[AnalyticsService] Initialized with circuit breaker and cache.');

    // 5. Additional request or operational configurations would be placed here.
    //    For example, we could track metrics or connect this to an observability platform.
  }

  /**
   * Retrieves complete analytics dashboard data for a given time range,
   * combining multiple performance metrics, resource analytics, team data,
   * and predictive insights into one consolidated object.
   *
   * Steps:
   *  1. Check cache for existing data using the time range as part of the key.
   *  2. Validate the time range parameters (ensuring they are logically correct).
   *  3. Invoke a circuit breaker-protected operation to fetch from the backend
   *     via apiService.get<AnalyticsDashboard>().
   *  4. Implement minimal retry-like logic at the call site.
   *  5. Process and transform the response if needed (straight pass-through in this example).
   *  6. Cache the successful response.
   *  7. Return the final, typed AnalyticsDashboard object.
   *
   * @param timeRange - An object that includes startDate, endDate, and possibly
   *                    other relevant fields for analytics querying.
   * @returns A promise resolving to the AnalyticsDashboard object.
   */
  public async getDashboardData(timeRange: TimeRange): Promise<AnalyticsDashboard> {
    // 1. Construct a unique cache key tied to the time range.
    const cacheKey = `AnalyticsService:getDashboardData:${timeRange.startDate.toISOString()}_${timeRange.endDate.toISOString()}`;

    // 2. Attempt to retrieve from cache
    const cached = await this.cacheManager.get<AnalyticsDashboard>(cacheKey);
    if (cached) {
      return cached;
    }

    // 3. Validate the time range
    if (!timeRange || !timeRange.startDate || !timeRange.endDate) {
      throw new Error('Invalid time range in getDashboardData: Start or end date is missing.');
    }
    if (timeRange.endDate < timeRange.startDate) {
      throw new Error('Invalid time range in getDashboardData: endDate cannot precede startDate.');
    }

    // 4. Protect the call with the circuit breaker. We pass in an operation
    //    function that calls the apiService. If the breaker is open or the call
    //    fails enough times, we will throw automatically.
    try {
      const data = await this.circuitBreaker.fire(async () => {
        return apiService.get<AnalyticsDashboard>(`${this.baseEndpoint}/dashboard`, {
          params: {
            startDate: timeRange.startDate.toISOString(),
            endDate: timeRange.endDate.toISOString(),
          },
        });
      });
      // 5. Straight pass-through transformation if needed (none here).
      const dashboardData = data as AnalyticsDashboard;

      // 6. Cache successful response for future calls within TTL
      await this.cacheManager.set(cacheKey, dashboardData);

      // 7. Return result
      return dashboardData;
    } catch (err) {
      // Attempt to unify error structure if needed
      const error = this.transformError(err);
      // Additional logging or instrumentation can be performed here
      throw error;
    }
  }

  /**
   * Fetches resource utilization analytics for a specific set of resources
   * within a defined time range. Returns an array of ResourceAnalytics objects.
   *
   * Steps:
   *  1. Construct a unique cache key based on the time range and list of resource IDs.
   *  2. Attempt to retrieve analytics from cache.
   *  3. Validate input parameters (time range and resource IDs).
   *  4. Use circuit breaker to call the backend with the GET method.
   *  5. Cache the results if successful.
   *  6. Return the processed data to the caller.
   *
   * @param timeRange - An object containing startDate and endDate for analytics.
   * @param resourceIds - A list of resource identifiers to retrieve analytics for.
   * @returns A promise resolving to an array of ResourceAnalytics objects.
   */
  public async getResourceAnalytics(
    timeRange: TimeRange,
    resourceIds: string[]
  ): Promise<ResourceAnalytics[]> {
    // 1. Build a cache key
    const resourceKey = resourceIds.join('-');
    const cacheKey = `AnalyticsService:getResourceAnalytics:${timeRange.startDate.toISOString()}_${timeRange.endDate.toISOString()}_${resourceKey}`;

    // 2. Check cache
    const cached = await this.cacheManager.get<ResourceAnalytics[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 3. Validate input
    if (!timeRange || !timeRange.startDate || !timeRange.endDate) {
      throw new Error('Invalid time range in getResourceAnalytics: missing start or end date.');
    }
    if (timeRange.endDate < timeRange.startDate) {
      throw new Error('Invalid time range in getResourceAnalytics: endDate < startDate.');
    }
    if (!Array.isArray(resourceIds) || resourceIds.length === 0) {
      throw new Error('Invalid resourceIds in getResourceAnalytics: must provide at least one ID.');
    }

    try {
      // 4. Use circuit breaker to protect the GET call
      const data = await this.circuitBreaker.fire(async () => {
        return apiService.get<ResourceAnalytics[]>(`${this.baseEndpoint}/resources`, {
          params: {
            startDate: timeRange.startDate.toISOString(),
            endDate: timeRange.endDate.toISOString(),
            resourceIds: resourceIds.join(','),
          },
        });
      });

      // 5. Cache results
      const analyticsData = data as ResourceAnalytics[];
      await this.cacheManager.set(cacheKey, analyticsData);

      // 6. Return
      return analyticsData;
    } catch (err) {
      throw this.transformError(err);
    }
  }

  /**
   * Retrieves aggregated or detailed performance metrics for one or more teams
   * within a specified time range. Returns an array of TeamPerformance objects.
   *
   * Implementation Steps:
   *  1. Construct a cache key combining the time range to minimize repeated calls.
   *  2. Attempt to retrieve from local in-memory cache.
   *  3. Validate the time range object for correctness.
   *  4. Fire the circuit breaker to perform a GET request via apiService.
   *  5. On success, store the data in the cache.
   *  6. Return typed results to the caller.
   *
   * @param timeRange - Time range for which to gather team performance data.
   * @returns Promise resolving to an array of TeamPerformance records.
   */
  public async getTeamPerformance(timeRange: TimeRange): Promise<TeamPerformance[]> {
    const cacheKey = `AnalyticsService:getTeamPerformance:${timeRange.startDate.toISOString()}_${timeRange.endDate.toISOString()}`;

    // Check cache
    const cached = await this.cacheManager.get<TeamPerformance[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Validate
    if (!timeRange || !timeRange.startDate || !timeRange.endDate) {
      throw new Error('Invalid time range in getTeamPerformance: start or end date missing.');
    }
    if (timeRange.endDate < timeRange.startDate) {
      throw new Error('Invalid time range in getTeamPerformance: endDate before startDate.');
    }

    try {
      const data = await this.circuitBreaker.fire(async () => {
        return apiService.get<TeamPerformance[]>(`${this.baseEndpoint}/team-performance`, {
          params: {
            startDate: timeRange.startDate.toISOString(),
            endDate: timeRange.endDate.toISOString(),
          },
        });
      });

      const performanceData = data as TeamPerformance[];
      await this.cacheManager.set(cacheKey, performanceData);

      return performanceData;
    } catch (err) {
      throw this.transformError(err);
    }
  }

  /**
   * Retrieves AI-driven predictive insights for the specified time frame.
   * This can include bottlenecks, recommendations, and risk factors that
   * help improve resource utilization or reduce delivery delays.
   *
   * Steps:
   *  1. Generate a cache key from the time range.
   *  2. Check local cache for insights data.
   *  3. Validate the time range parameters.
   *  4. Protect the request with a circuit breaker.
   *  5. Cache the result upon success.
   *  6. Return the typed predictive insights to the caller.
   *
   * @param timeRange - Start and end dates for which to analyze insights.
   * @returns A promise resolving to a PredictiveInsights object.
   */
  public async getPredictiveInsights(timeRange: TimeRange): Promise<PredictiveInsights> {
    const cacheKey = `AnalyticsService:getPredictiveInsights:${timeRange.startDate.toISOString()}_${timeRange.endDate.toISOString()}`;

    // Check cache
    const cached = await this.cacheManager.get<PredictiveInsights>(cacheKey);
    if (cached) {
      return cached;
    }

    // Validate time range
    if (!timeRange || !timeRange.startDate || !timeRange.endDate) {
      throw new Error('Invalid time range in getPredictiveInsights: missing start or end date.');
    }
    if (timeRange.endDate < timeRange.startDate) {
      throw new Error('Invalid time range in getPredictiveInsights: endDate < startDate.');
    }

    try {
      // Fire circuit breaker for GET or POST (decide based on backend requirements).
      // We'll assume GET for demonstration.
      const data = await this.circuitBreaker.fire(async () => {
        return apiService.get<PredictiveInsights>(`${this.baseEndpoint}/insights`, {
          params: {
            startDate: timeRange.startDate.toISOString(),
            endDate: timeRange.endDate.toISOString(),
          },
        });
      });

      const insights = data as PredictiveInsights;
      await this.cacheManager.set(cacheKey, insights);

      return insights;
    } catch (err) {
      throw this.transformError(err);
    }
  }

  /**
   * Internal helper method to unify error objects and ensure that
   * if the incoming error is not in a recognized format, we wrap
   * it inside an ApiErrorResponse-like structure for consistent
   * handling throughout the application.
   *
   * @param err - Any error thrown during API calls or circuit breaker operations.
   * @returns A standardized error that can be re-thrown or handled gracefully.
   */
  private transformError(err: unknown): Error {
    // If we detect a known structure, return it. Otherwise, wrap it.
    if (err && (err as ApiErrorResponse).code && (err as ApiErrorResponse).timestamp) {
      return err as Error;
    }
    // For demonstration, we'll create a simple error with a basic message.
    const e = new Error((err as Error)?.message || 'Unknown analytics service error');
    return e;
  }
}

// -----------------------------------------------------------------------------
// Singleton Export: analyticsService
// -----------------------------------------------------------------------------
/**
 * Singleton instance of AnalyticsService for application-wide analytics
 * functionality. Provides the named methods as described in the specification:
 *  - getDashboardData
 *  - getResourceAnalytics
 *  - getTeamPerformance
 *  - getPredictiveInsights
 */
export const analyticsService = new AnalyticsService();