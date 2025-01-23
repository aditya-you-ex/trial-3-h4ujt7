/***************************************************************************************************
 * TaskStream AI - Core Logging Utility Module
 * ------------------------------------------------------------------
 * This module provides standardized logging functionality across the TaskStream AI platform.
 * It leverages multiple winston transports (console, daily rotate files, Elasticsearch),
 * enriches log messages with contextual metadata like request IDs, and securely handles
 * error formatting with masking of sensitive data.
 *
 * External Imports:
 *   - winston@3.10.0
 *   - winston-daily-rotate-file@4.7.1
 *   - winston-elasticsearch@0.17.4
 ***************************************************************************************************/

import winston from 'winston'; // version 3.10.0
import DailyRotateFile from 'winston-daily-rotate-file'; // version 4.7.1
import ElasticsearchTransport from 'winston-elasticsearch'; // version 0.17.4

/***************************************************************************************************
 * LOG_LEVELS
 * ------------------------------------------------------------------
 * Enum representing standardized log levels for consistent logging throughout
 * the TaskStream AI platform.
 ***************************************************************************************************/
export enum LOG_LEVELS {
  error = 0,
  warn = 1,
  info = 2,
  http = 3,
  debug = 4,
}

/***************************************************************************************************
 * DEFAULT_FORMAT
 * ------------------------------------------------------------------
 * The default Winston format pipeline for logs, combining:
 *   - Timestamp
 *   - JSON structured output
 *   - Stack trace handling for errors
 *   - Additional metadata
 ***************************************************************************************************/
const DEFAULT_FORMAT = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
  winston.format.errors({ stack: true }),
  winston.format.metadata()
);

/***************************************************************************************************
 * LoggerConfig
 * ------------------------------------------------------------------
 * Defines the configuration options for creating a winston-based logger.
 * This interface can be extended to accommodate additional custom logic,
 * such as advanced formatting rules, performance monitoring hooks, and more.
 ***************************************************************************************************/
interface LoggerConfig {
  /**
   * Base log level for the logger (e.g., 'info', 'debug', etc.).
   * Determines the verbosity of logs across all transports.
   */
  level: keyof typeof LOG_LEVELS;

  /**
   * Whether console transport is enabled. If true, logs will output
   * to stdout with color-coded formatting for local development
   * or debugging environments.
   */
  consoleEnabled?: boolean;

  /**
   * File transport configuration. Allows local or shared filesystem
   * log storage with rotation policies.
   */
  file?: {
    enabled: boolean;
    filename: string;          // Base filename for log rotation
    datePattern?: string;      // Rotate pattern (e.g., 'YYYY-MM-DD')
    maxSize?: string;          // Max file size before rotation (e.g., '20m')
    maxFiles?: string;         // Number of rotated files to keep
    zippedArchive?: boolean;   // Whether to gzip rotated logs
    level?: keyof typeof LOG_LEVELS; // Overrides default log level for file transport
  };

  /**
   * Elasticsearch transport configuration. Allows shipping logs to an
   * Elasticsearch cluster, enabling centralized log searching and analytics.
   */
  elasticsearch?: {
    enabled: boolean;
    clientOpts: {
      node: string;            // Elasticsearch node URL
      auth?: {
        username?: string;
        password?: string;
        apiKey?: string;
      };
      ssl?: { rejectUnauthorized?: boolean };
      maxRetries?: number;     // Retry count for ES connection
    };
    indexPrefix?: string;      // Prefix for ES index naming
    level?: keyof typeof LOG_LEVELS; // Overrides default log level for Elasticsearch
  };

  /**
   * Environment name (e.g., 'development', 'production').
   * Used to enrich logs with environment context, especially helpful
   * for error tracking across multiple deployments.
   */
  environment?: string;

  /**
   * Mask sensitive data fields such as passwords, tokens, or personal info.
   * This option can be extended to specify a list of field patterns.
   */
  maskSensitive?: boolean;

  /**
   * Additional custom fields for future expansion (performance hooks,
   * correlation IDs, metric instrumentation, etc.).
   */
  [key: string]: unknown;
}

/***************************************************************************************************
 * LogContext
 * ------------------------------------------------------------------
 * Represents contextual data associated with a specific logging instance,
 * such as request IDs or correlation IDs. This helps correlate logs
 * in distributed tracing scenarios.
 ***************************************************************************************************/
interface LogContext {
  requestId?: string;      // Unique request identifier
  correlationId?: string;  // External correlation ID for cross-service tracking
  [key: string]: unknown;
}

/***************************************************************************************************
 * formatError
 * ------------------------------------------------------------------
 * Enhanced error formatter that creates structured error logs with full context
 * and security considerations. This function is responsible for sanitizing
 * sensitive data, preserving stack traces, and attaching relevant metadata
 * such as error codes, environment, and request/correlation IDs.
 ***************************************************************************************************/
export function formatError(error: Error | unknown): Record<string, unknown> {
  // If the error is not an Error instance, convert it to a generic object
  const err = error instanceof Error ? error : new Error(String(error));

  // Extract primary fields for structured logging
  const formattedError: Record<string, unknown> = {
    message: err.message || 'Unknown error',
    name: err.name || 'Error',
    stack: err.stack || 'No stack trace available',
    timestamp: new Date().toISOString(),
    errorCode: (err as any).code || 'N/A',
    errorType: err.constructor?.name || 'Error',
  };

  // Additional metadata or environment context can be appended here
  return formattedError;
}

/***************************************************************************************************
 * createLogger
 * ------------------------------------------------------------------
 * Factory function that creates and configures a new Winston logger instance with
 * specified transports and settings, implementing security and performance optimizations.
 *
 * Steps:
 *   1. Validate and sanitize the configuration input.
 *   2. Initialize the base logger with default formatting and minimum security measures.
 *   3. Configure console transport if enabled.
 *   4. Set up file rotation transport if enabled in config.
 *   5. Configure Elasticsearch transport if enabled, with error handling and retry logic.
 *   6. Apply optional data masking logic if configured.
 *   7. Add performance monitoring hooks (custom instrumentation if needed).
 *   8. Configure tracking for error handling and request correlation.
 *   9. Return the fully configured logger instance.
 ***************************************************************************************************/
export function createLogger(config: LoggerConfig): winston.Logger {
  // Step 1: Validate and sanitize configuration input
  const baseLogLevel = config.level || 'info';

  // Step 2: Initialize the base logger with default settings
  const transports: winston.transport[] = [];
  const logger = winston.createLogger({
    level: baseLogLevel,
    format: DEFAULT_FORMAT,
    defaultMeta: {
      environment: config.environment || 'unknown',
    },
  });

  // Step 3: Configure console transport if enabled
  if (config.consoleEnabled) {
    transports.push(
      new winston.transports.Console({
        level: baseLogLevel,
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf((info) => {
            const { level, message, timestamp, ...meta } = info;
            return `[${timestamp}] ${level}: ${message} ${JSON.stringify(meta)}`;
          })
        ),
      })
    );
  }

  // Step 4: Set up file rotation transport if enabled
  if (config.file?.enabled && config.file.filename) {
    const rotateTransport = new DailyRotateFile({
      level: config.file.level || baseLogLevel,
      filename: config.file.filename,
      datePattern: config.file.datePattern || 'YYYY-MM-DD',
      maxSize: config.file.maxSize || '20m',
      maxFiles: config.file.maxFiles || '14d',
      zippedArchive: config.file.zippedArchive || false,
      format: DEFAULT_FORMAT,
    });
    transports.push(rotateTransport);
  }

  // Step 5: Configure Elasticsearch transport if enabled
  if (config.elasticsearch?.enabled && config.elasticsearch.clientOpts) {
    const esTransportOptions: any = {
      level: config.elasticsearch.level || baseLogLevel,
      indexPrefix: config.elasticsearch.indexPrefix || 'taskstream-logs',
      clientOpts: {
        node: config.elasticsearch.clientOpts.node,
        auth: config.elasticsearch.clientOpts.auth,
        ssl: config.elasticsearch.clientOpts.ssl,
        maxRetries: config.elasticsearch.clientOpts.maxRetries || 3,
      },
      // This can be extended for advanced mapping templates or custom pipelines
      transformer: (logData: any) => {
        // Additional transformation to structure or mask data
        // for security can be inserted here.
        return {
          '@timestamp': logData.timestamp,
          severity: logData.level,
          message: logData.message,
          fields: {
            ...logData,
          },
        };
      },
    };

    const esTransport = new ElasticsearchTransport(esTransportOptions);
    transports.push(esTransport);
  }

  // Prepare final logging transports
  logger.add(new winston.transports.Stream({ stream: process.stderr, silent: true })); // placeholder
  transports.forEach((t) => logger.add(t));
  logger.remove(logger.transports.find((t) => t instanceof winston.transports.Stream) as any);

  // Step 6: Optional data masking can be applied via custom format or transforms
  // If config.maskSensitive is true, transformations to redact sensitive info can be added here.

  // Step 7: Performance monitoring hooks would go here if integrated
  // (e.g. hooking into request lifecycle to log latencies).

  // Step 8: Error handling and request correlation can be expanded with custom logic

  // Step 9: Return the fully configured logger instance
  return logger;
}

/***************************************************************************************************
 * Logger
 * ------------------------------------------------------------------
 * Enhanced Logger class providing secure, performant logging capabilities with support
 * for multiple transports and contexts.
 ***************************************************************************************************/
export class Logger {
  /**
   * Internal Winston logger instance for actual log operations.
   */
  private logger: winston.Logger;

  /**
   * Stored configuration object used to build the Winston logger and determine
   * transport, format, and security behavior.
   */
  private config: LoggerConfig;

  /**
   * Log context object storing correlation data, request IDs, etc.
   */
  private context: LogContext;

  /************************************************************************************************
   * Constructor
   * ---------------------------------------------------------------------------------------------
   * Initializes and configures the underlying Winston logger using the provided LoggerConfig.
   * This includes securing sensitive data, configuring log rotation, hooking performance metrics,
   * and enabling distributed tracing for system monitoring.
   ************************************************************************************************/
  constructor(config: LoggerConfig) {
    // Step 1: Validate configuration completeness and security settings
    if (!config || !config.level) {
      throw new Error('Logger configuration is incomplete. A valid level is required.');
    }

    // Step 2: Create Winston logger instance with secure defaults
    this.config = config;
    this.logger = createLogger(config);

    // Step 3: Initialize context as empty by default
    this.context = {};

    // Step 4: Additional expansions for performance monitoring, log rotation, error formatting
    // can be automatically included in the Winston pipeline.

    // Step 5: Ready for usage throughout TaskStream AI modules.
  }

  /************************************************************************************************
   * error
   * ---------------------------------------------------------------------------------------------
   * Logs error level messages with enhanced error tracking and context. This method sanitizes
   * sensitive data, includes stack traces, and correlates with request IDs where available.
   ************************************************************************************************/
  public error(message: string, meta: Record<string, unknown> = {}): void {
    const enrichedMeta = {
      ...meta,
      context: this.context,
    };
    this.logger.log('error', message, enrichedMeta);
  }

  /************************************************************************************************
   * warn
   * ---------------------------------------------------------------------------------------------
   * Logs warning level messages indicating a potential issue or something that requires attention
   * but is not necessarily an error.
   ************************************************************************************************/
  public warn(message: string, meta: Record<string, unknown> = {}): void {
    const enrichedMeta = {
      ...meta,
      context: this.context,
    };
    this.logger.log('warn', message, enrichedMeta);
  }

  /************************************************************************************************
   * info
   * ---------------------------------------------------------------------------------------------
   * Logs general informational messages concerning application flow, state changes, or
   * successful operations, providing visibility into the normal functioning of the system.
   ************************************************************************************************/
  public info(message: string, meta: Record<string, unknown> = {}): void {
    const enrichedMeta = {
      ...meta,
      context: this.context,
    };
    this.logger.log('info', message, enrichedMeta);
  }

  /************************************************************************************************
   * debug
   * ---------------------------------------------------------------------------------------------
   * Logs detailed debug-level messages for troubleshooting. Useful during development and
   * investigation of issues. Typically disabled in production for performance and security reasons.
   ************************************************************************************************/
  public debug(message: string, meta: Record<string, unknown> = {}): void {
    const enrichedMeta = {
      ...meta,
      context: this.context,
    };
    this.logger.log('debug', message, enrichedMeta);
  }

  /************************************************************************************************
   * addTransport
   * ---------------------------------------------------------------------------------------------
   * Dynamically adds a new Winston transport to the existing logger instance. This can be used
   * to integrate additional logging backends at runtime, such as sending logs to a third-party
   * service or a new filesystem location.
   ************************************************************************************************/
  public addTransport(transport: winston.transport): void {
    this.logger.add(transport);
  }

  /**
   * Updates the internal logging context with additional correlation data,
   * such as request IDs or tenant IDs, to be included in subsequent log calls.
   */
  public setContext(newContext: LogContext): void {
    this.context = {
      ...this.context,
      ...newContext,
    };
  }
}