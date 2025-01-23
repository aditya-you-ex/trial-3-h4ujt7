/***************************************************************************************************
 * TaskStream AI - Logging Middleware
 * ---------------------------------------------------------------------------------------------
 * This file provides Express middleware components for request/response logging and performance
 * monitoring in the TaskStream AI platform. It integrates with our centralized logging system
 * (ELK Stack), supports distributed tracing, masks sensitive information, and captures detailed
 * performance metrics for real-time analytics and system reliability.
 *
 * In alignment with the Technical Specifications and JSON definition:
 *   - requestLogger: Main request logging middleware with security-sensitive data masking,
 *                   distributed tracing, and correlation ID management.
 *   - performanceLogger: Advanced performance tracking middleware capturing memory usage,
 *                       CPU utilization, DB query times, external call durations, etc.
 *   - RequestContext: Enhanced class for managing request context, storing request ID,
 *                     metadata, performance measurements, and distributed tracing spans.
 **************************************************************************************************/



/***************************************************************************************************
 * External Imports (with specified versions)
 **************************************************************************************************/
import express, { Request, Response, NextFunction } from 'express'; // version 4.18.2
import morgan from 'morgan'; // version 1.10.0
import { v4 as uuidv4 } from 'uuid'; // version 9.0.0


/***************************************************************************************************
 * Internal Imports
 **************************************************************************************************/
// Logger class (with .info, .debug, .error methods) from logger.ts
import { Logger } from '../utils/logger';

// LOG_CONFIG (includes overall log settings); from logging.ts we adapt the usage of
// "level", "sensitiveFields", "performanceThresholds" by mapping them to the relevant
// fields in LOG_CONFIG (e.g., security.sensitivePatterns, performance, etc.)
import { LOG_CONFIG } from '../../config/logging';


/***************************************************************************************************
 * Global Logger Instance
 * ---------------------------------------------------------------------------------------------
 * Create a logger with appropriate configuration for this middleware module. The JSON specification
 * indicates "elkConfig" usage, which we map to the "elasticsearch" property in LOG_CONFIG. We also
 * leverage the base log level and environment. In addition, we accept a 'service' field in the
 * config for better traceability across logs.
 **************************************************************************************************/
const logger = new Logger({
  level: LOG_CONFIG.level,
  consoleEnabled: LOG_CONFIG.enableConsole,
  file: LOG_CONFIG.enableFile
    ? {
        enabled: LOG_CONFIG.enableFile,
        filename: `${LOG_CONFIG.file.dirname}/middleware-%DATE%.log`,
        datePattern: LOG_CONFIG.file.datePattern,
        maxSize: LOG_CONFIG.file.maxSize,
        maxFiles: LOG_CONFIG.file.maxFiles,
        zippedArchive: LOG_CONFIG.file.compress,
        level: LOG_CONFIG.level,
      }
    : { enabled: false, filename: '' },
  elasticsearch: LOG_CONFIG.enableElasticsearch
    ? {
        enabled: LOG_CONFIG.enableElasticsearch,
        clientOpts: LOG_CONFIG.elasticsearch.clientOpts,
        indexPrefix: LOG_CONFIG.elasticsearch.level, // Not strictly required; could be refined
        level: LOG_CONFIG.elasticsearch.level,
      }
    : { enabled: false, clientOpts: {} },
  environment: process.env.NODE_ENV || 'development',
  maskSensitive: LOG_CONFIG.security.maskSensitiveData,
  // Additional custom field for identification
  service: 'http-middleware',
});



/***************************************************************************************************
 * Mapped Variables From LOG_CONFIG
 * ---------------------------------------------------------------------------------------------
 * The JSON specification references "sensitiveFields" and "performanceThresholds" directly, so we
 * map them to the existing LOG_CONFIG properties. For demonstration and compliance, we do a best
 * effort to unify these references with the actual structure in logging.ts.
 **************************************************************************************************/
const sensitiveFields: string[] = LOG_CONFIG.security?.sensitivePatterns || [];
// If LOG_CONFIG doesn't explicitly define performanceThresholds, we create a default
const performanceThresholds: Record<string, number> = (LOG_CONFIG as any).performanceThresholds || {
  maxResponseTime: 3000, // example threshold in ms for demonstration
  maxMemoryUsageMB: 512,
  maxCPUUsagePercent: 80,
};



/***************************************************************************************************
 * RequestContext Class
 * ---------------------------------------------------------------------------------------------
 * Enhanced class for managing request context with performance tracking, distributed tracing,
 * correlation ID, and security. As per the JSON specification, it has:
 *   - constructor(requestId: string, metadata: object, performanceConfig: object)
 *   - properties: requestId, metadata, startTime, performanceMetrics, spans
 *   - methods: getRequestDuration(), addSpan(spanName: string, spanData: object)
 **************************************************************************************************/
export class RequestContext {
  /**
   * Unique identifier for the request, used for correlation in distributed tracing.
   */
  public requestId: string;

  /**
   * Arbitrary metadata object, possibly storing user info, tenant info, or other relevant data.
   */
  public metadata: object;

  /**
   * Timestamp or high-resolution time at which processing of this request began.
   */
  public startTime: number;

  /**
   * Accumulated performance metrics, potentially including memory usage, CPU usage,
   * DB query times, or external call durations.
   */
  public performanceMetrics: Record<string, any>;

  /**
   * Array of tracing spans for distributed trace instrumentation.
   */
  public spans: Array<{ spanName: string; spanData: object; timestamp: number }>;

  /**
   * Creates a RequestContext instance with enhanced tracking capabilities.
   * @param requestId - The unique request ID for correlation.
   * @param metadata - Additional context or user-specific details.
   * @param performanceConfig - Configuration object or thresholds for performance measurement.
   */
  constructor(requestId: string, metadata: object, performanceConfig: object) {
    // Step 1: Set request ID and correlation ID
    this.requestId = requestId;

    // Step 2: Initialize metadata. Optionally, we could do security checks or merges here.
    this.metadata = metadata;

    // Step 3: Set up performance tracking. We store the high-resolution start time.
    this.startTime = Date.now();

    // Step 4: Initialize distributed tracing. We store any relevant data in performanceMetrics
    // or a separate structure. We'll create an empty object for now.
    this.performanceMetrics = {
      config: performanceConfig,
      memoryStart: 0,
      cpuStart: 0,
      externalCalls: [],
    };

    // Step 5: Configure metric collection. This could integrate with real or mock instrumentation.
    // For demonstration, we simply track the setup in an array of spans if needed.
    this.spans = [];
  }

  /**
   * Calculates the request duration with high precision. The JSON specification states:
   * returns {number} - Duration in ms with microsecond precision if possible.
   */
  public getRequestDuration(): number {
    // Step 1: Get the current time in milliseconds.
    const now = Date.now();
    // Step 2: Calculate the difference in ms
    const duration = now - this.startTime;
    // Steps 3 & 4: Return the final, optionally adjusted duration
    return duration;
  }

  /**
   * Adds a tracing span for distributed tracking. The JSON steps:
   *   - Create a new span with a timestamp
   *   - Add span metadata
   *   - Link to parent span if relevant
   *   - Store in spans array
   */
  public addSpan(spanName: string, spanData: object): void {
    const newSpan = {
      spanName,
      spanData,
      timestamp: Date.now(),
    };
    this.spans.push(newSpan);
  }
}



/***************************************************************************************************
 * requestLogger Middleware
 * ---------------------------------------------------------------------------------------------
 * Implements the JSON definition of requestLogger, providing secure HTTP request logging with:
 *   1. Unique request ID generation via uuid
 *   2. RequestContext creation
 *   3. Sensitive data masking
 *   4. Logging initial request details with correlation ID
 *   5. Attaching response listeners for completion tracking
 *   6. Measuring response time & status
 *   7. Logging final response details with performance
 *   8. Calling the next middleware
 **************************************************************************************************/
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Step 1: Generate unique request ID using uuid
  const requestId = uuidv4();

  // Step 2: Create a new RequestContext. We can pass some minimal metadata or user info as needed.
  // We'll also pass a simplified performanceConfig object.
  const performanceConfig = {
    thresholds: performanceThresholds,
  };
  const requestContext = new RequestContext(requestId, {}, performanceConfig);

  // Potentially store the context on the request object for downstream usage
  (req as any).requestContext = requestContext;

  // Step 3: Mask sensitive data from the request. We'll do a simple demonstration
  // by checking for known sensitive fields in request body or headers. Real implementations
  // could be more nuanced, but we follow the JSON specification.
  const sanitizedBody = { ...req.body };
  for (const field of sensitiveFields) {
    if (sanitizedBody[field]) {
      sanitizedBody[field] = '***REDACTED***';
    }
  }

  // Step 4: Log initial request details with correlation ID
  logger.info('Incoming request', {
    correlationId: requestId,
    method: req.method,
    url: req.originalUrl,
    maskedBody: sanitizedBody,
    ip: req.ip,
  });

  // Step 5: Attach response listeners for completion tracking
  const startTime = process.hrtime(); // High-resolution timer for accurate duration measurement
  res.on('finish', () => {
    // Step 6: Track response time & status
    const diff = process.hrtime(startTime);
    const responseTimeMs = diff[0] * 1000 + diff[1] / 1e6;

    // Step 7: Log final response details with performance metrics
    logger.info('Request completed', {
      correlationId: requestId,
      statusCode: res.statusCode,
      durationMs: responseTimeMs.toFixed(3),
    });
  });

  // Step 8: Forward to next middleware
  next();
}



/***************************************************************************************************
 * performanceLogger Middleware
 * ---------------------------------------------------------------------------------------------
 * Advanced middleware for collecting detailed performance metrics:
 *   1. Initialize performance metrics
 *   2. Track memory usage & heap stats
 *   3. Monitor CPU utilization
 *   4. Track DB query times (placeholder)
 *   5. Calculate request queue time (placeholder)
 *   6. Monitor external service calls (placeholder)
 *   7. Log detailed performance on completion
 *   8. Trigger alerts if thresholds are exceeded
 *   9. Forward to next
 **************************************************************************************************/
export function performanceLogger(req: Request, res: Response, next: NextFunction): void {
  // Step 1: Initialize performance metrics collection
  const context = (req as any).requestContext as RequestContext;
  if (!context) {
    // If there's no existing context, we create one to store performance details.
    const fallbackContext = new RequestContext(uuidv4(), {}, { thresholds: performanceThresholds });
    (req as any).requestContext = fallbackContext;
  }

  const activeContext = (req as any).requestContext as RequestContext;

  // Step 2: Track memory usage and heap statistics (simple demonstration)
  const initialMemoryUsage = process.memoryUsage();
  activeContext.performanceMetrics.memoryStart = initialMemoryUsage.heapUsed;

  // Step 3: Monitor CPU utilization (placeholder). Node.js doesn't provide direct CPU usage
  // per request, so a sophisticated approach might be needed.
  activeContext.performanceMetrics.cpuStart = 0; // We can integrate system-level metrics.

  // Step 4: Track DB query times (placeholder). In real usage, you'd measure queries with
  // instrumentation or hooks. We store placeholders in performanceMetrics.
  activeContext.performanceMetrics.dbQueries = [];

  // Step 5: Calculate request queue time (placeholder). You might measure the time spent
  // waiting in the event loop or load balancer. We'll store a timestamp for demonstration.
  activeContext.performanceMetrics.queueStart = Date.now();

  // Step 6: Monitor external service call durations (placeholder). For example,
  // we could patch fetch/axios to measure external durations. We'll store an empty array.
  activeContext.performanceMetrics.externalCalls = [];

  // Step 7: We log the final performance metrics when the response finishes.
  const startTime = process.hrtime();
  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const requestTimeMs = diff[0] * 1000 + diff[1] / 1e6;

    // Gather final memory usage
    const finalMemoryUsage = process.memoryUsage();
    const usedHeapDiff =
      finalMemoryUsage.heapUsed - activeContext.performanceMetrics.memoryStart;

    // Basic CPU usage placeholder; real usage might parse from OS utilities or external tooling.
    const finalCPUUsage = 0;

    // Step 8: Trigger alerts if thresholds are exceeded
    const { maxResponseTime, maxMemoryUsageMB, maxCPUUsagePercent } = performanceThresholds;
    let alertTriggered = false;
    const alertDetails: Record<string, boolean | number> = {};

    // Compare requestTime to threshold
    if (requestTimeMs > maxResponseTime) {
      alertTriggered = true;
      alertDetails['excessResponseTimeMs'] = requestTimeMs;
    }

    // Convert usedHeapDiff to MB for threshold comparison
    const usedHeapMB = usedHeapDiff / (1024 * 1024);
    if (usedHeapMB > maxMemoryUsageMB) {
      alertTriggered = true;
      alertDetails['excessMemoryMB'] = usedHeapMB;
    }

    if (finalCPUUsage > maxCPUUsagePercent) {
      alertTriggered = true;
      alertDetails['excessCPUUsagePercent'] = finalCPUUsage;
    }

    // Step 7 (continued): Log the performance metrics
    logger.debug('Performance metrics collected', {
      requestId: activeContext.requestId,
      requestTimeMs: requestTimeMs.toFixed(3),
      memoryUsageIncreaseMB: usedHeapMB.toFixed(3),
      cpuUsagePercent: finalCPUUsage,
      triggeredAlerts: alertTriggered ? alertDetails : null,
    });

    // If threshold exceeded, we might log an error or integrate with an alerting system:
    if (alertTriggered) {
      logger.error('Performance thresholds exceeded', {
        requestId: activeContext.requestId,
        alertDetails,
      });
    }
  });

  // Step 9: Forward control
  next();
}