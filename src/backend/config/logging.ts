/***************************************************************************************************
 * TaskStream AI - Logging Configuration Module
 * -----------------------------------------------------------------------------------------------
 * This module provides a centralized logging configuration for TaskStream AI with an emphasis on
 * security, performance, and integration with monitoring tools. It leverages environment variables
 * to customize logging behaviors for different deployments, supporting console, file, and
 * Elasticsearch transports. Advanced features include sensitive data masking, IP anonymization,
 * buffering, compression, and rate limiting capabilities to meet the system monitoring and
 * reliability requirements (99.9% uptime) laid out in the Technical Specifications.
 *
 * External Imports:
 *   - dotenv@16.3.1
 *   - winston@3.10.0
 *
 * Internal Imports:
 *   - createLogger, LOG_LEVELS, LogTransport, Logger from ../shared/utils/logger
 *   - ES_CONFIG (indices, security/tls) from ./elasticsearch
 *
 * Exports:
 *   - LOG_CONFIG
 *   - getLoggerConfig()
 *   - configureLogger()
 *
 * Additional Named Exports (from LOG_CONFIG):
 *   - level
 *   - security
 *   - performance
 **************************************************************************************************/

import dotenv from 'dotenv'; // version 16.3.1
import winston from 'winston'; // version 3.10.0
import { createLogger, LOG_LEVELS, LogTransport, Logger } from '../shared/utils/logger';
import { ES_CONFIG } from './elasticsearch';

/***************************************************************************************************
 * Load Environment Variables
 * -----------------------------------------------------------------------------------------------
 * We invoke dotenv.config() early to ensure relevant environment variables are available throughout
 * this module. These variables override certain default log settings for security, performance, and
 * monitoring integration.
 **************************************************************************************************/
dotenv.config();

/***************************************************************************************************
 * LogConfig Interface
 * -----------------------------------------------------------------------------------------------
 * Describes all configuration fields required for robust and secure logging. This interface
 * encapsulates console file logging, Elasticsearch integration, security settings (masking,
 * anonymization), performance parameters (buffering, compression), and advanced features aligned
 * with system monitoring & reliability objectives.
 **************************************************************************************************/
export interface LogConfig {
  /************************************************************************************
   * The base log level determines the verbosity of logs. Defaults to 'info'
   * if not set by LOG_LEVEL or overridden in environment variables.
   ************************************************************************************/
  level: string;

  /************************************************************************************
   * Whether to enable console logging. Controlled via LOG_CONSOLE env var.
   ************************************************************************************/
  enableConsole: boolean;

  /************************************************************************************
   * Whether to enable file-based logging. Controlled via LOG_FILE env var.
   ************************************************************************************/
  enableFile: boolean;

  /************************************************************************************
   * Whether to enable Elasticsearch-based logging. Controlled via LOG_ELASTICSEARCH.
   ************************************************************************************/
  enableElasticsearch: boolean;

  /************************************************************************************
   * security section includes data-masking options (maskSensitiveData and
   * sensitivePatterns) and IP anonymization for compliance with enterprise security
   * policies.
   ************************************************************************************/
  security: {
    maskSensitiveData: boolean;
    sensitivePatterns: string[];
    ipAnonymization: boolean;
  };

  /************************************************************************************
   * performance section includes buffering, flushing intervals, and compression to
   * optimize log throughput for high-volume, distributed environments.
   ************************************************************************************/
  performance: {
    bufferSize: number;
    flushInterval: string;
    compression: boolean;
  };

  /************************************************************************************
   * file section controls where file-based logs are stored, along with rotation
   * mechanisms (datePattern, maxFiles, maxSize, etc.).
   ************************************************************************************/
  file: {
    dirname: string;
    datePattern: string;
    maxFiles: string;
    maxSize: string;
    compress: boolean;
  };

  /************************************************************************************
   * elasticsearch section defines log level, buffering, retry limits, and client
   * options for connecting and pushing logs to the ELK stack, integrated with
   * real-time system monitoring.
   ************************************************************************************/
  elasticsearch: {
    level: string;
    bufferLimit: number;
    retryLimit: number;
    clientOpts: {
      node?: string;
      auth?: {
        username?: string;
        password?: string;
      };
      ssl?: {
        rejectUnauthorized?: string | boolean;
      };
    };
  };
}

/***************************************************************************************************
 * LOG_CONFIG
 * -----------------------------------------------------------------------------------------------
 * Default or environment-driven logging configuration. Fields:
 *   - level: The overall log level (default 'info').
 *   - enableConsole: Whether console logs are enabled.
 *   - enableFile: Whether file transport is employed for local or shared FS logging.
 *   - enableElasticsearch: Whether Elasticsearch transport is employed for centralized logs.
 *   - security: Masking and IP anonymization.
 *   - performance: Buffering, flush intervals, compression.
 *   - file: Log rotation (dirname, datePattern, size, etc.).
 *   - elasticsearch: ES-level, buffering, retry, and connection options.
 **************************************************************************************************/
export const LOG_CONFIG: LogConfig = {
  level: process.env.LOG_LEVEL || 'info',
  enableConsole: process.env.LOG_CONSOLE !== 'false',
  enableFile: process.env.LOG_FILE === 'true',
  enableElasticsearch: process.env.LOG_ELASTICSEARCH === 'true',
  security: {
    maskSensitiveData: true,
    sensitivePatterns: ['password', 'token', 'key', 'secret'],
    ipAnonymization: true,
  },
  performance: {
    bufferSize: parseInt(process.env.LOG_BUFFER_SIZE || '1000', 10),
    flushInterval: process.env.LOG_FLUSH_INTERVAL || '5s',
    compression: true,
  },
  file: {
    dirname: process.env.LOG_FILE_DIR || 'logs',
    datePattern: 'YYYY-MM-DD',
    maxFiles: process.env.LOG_MAX_FILES || '30d',
    maxSize: process.env.LOG_MAX_SIZE || '100m',
    compress: true,
  },
  elasticsearch: {
    level: process.env.LOG_ES_LEVEL || 'info',
    bufferLimit: parseInt(process.env.LOG_ES_BUFFER_LIMIT || '100', 10),
    retryLimit: parseInt(process.env.LOG_ES_RETRY_LIMIT || '3', 10),
    clientOpts: {
      node: process.env.ES_NODE,
      auth: {
        username: process.env.ES_USERNAME,
        password: process.env.ES_PASSWORD,
      },
      ssl: {
        rejectUnauthorized: true,
      },
    },
  },
};

/***************************************************************************************************
 * Export LOG_CONFIG Members
 * -----------------------------------------------------------------------------------------------
 * Per specification, we expose the following members from LOG_CONFIG directly as named exports
 * for external modules to reference or override individually if needed.
 **************************************************************************************************/
export const { level, security, performance } = LOG_CONFIG;

/***************************************************************************************************
 * getLoggerConfig
 * -----------------------------------------------------------------------------------------------
 * Retrieves and validates logging configuration from environment variables with enhanced security
 * and performance settings.
 *
 * Steps:
 *   1. Load and validate environment variables.
 *   2. Merge default config with environment values.
 *   3. Apply security patterns and masks (if desired for global usage).
 *   4. Configure performance settings, including buffering and compression.
 *   5. Validate transport configurations (console, file, ES).
 *   6. Apply rate limiting or relevant constraints for high-volume use cases.
 *   7. Return secured configuration object for further usage.
 **************************************************************************************************/
export function getLoggerConfig(): LogConfig {
  // Step 1: Load environment variables explicitly (dotenv.config() is already called above).
  // Step 2: Merge defaults with environment-sourced overrides (already in LOG_CONFIG).
  const mergedConfig: LogConfig = { ...LOG_CONFIG };

  // Step 3: Optionally apply security patterns globally.
  //         (Currently, we store them in config.security; masking can be used downstream.)

  // Step 4: Confirm performance settings validity in mergedConfig.
  const bufferSizeValid = Number.isInteger(mergedConfig.performance.bufferSize) && mergedConfig.performance.bufferSize > 0;
  if (!bufferSizeValid) {
    mergedConfig.performance.bufferSize = 1000; // fallback
  }

  // Step 5: Validate each transport option (console, file, ES) for consistency.
  //         This can involve deeper checks, e.g., verifying file path permissions or ES connectivity.
  if (!mergedConfig.enableConsole && !mergedConfig.enableFile && !mergedConfig.enableElasticsearch) {
    // If everything is disabled, forcibly enable console to avoid silent drops:
    mergedConfig.enableConsole = true;
  }

  // Step 6: Apply rate limiting (placeholder for advanced usage).
  //         Could integrate a limit on logs per second or structured approach if needed.

  // Step 7: Return the final config. Additional transformation or secure practices might apply.
  return mergedConfig;
}

/***************************************************************************************************
 * validateLogLevel
 * -----------------------------------------------------------------------------------------------
 * Validates if the provided log level is supported and meets security & monitoring requirements.
 * 
 * Steps:
 *   1. Check if level exists in LOG_LEVELS enum.
 *   2. Validate against any security policy (e.g., restricting debug logs in production).
 *   3. Check compliance with system monitoring requirements (like no lower than 'info' in production).
 *   4. Return validation result as a boolean.
 **************************************************************************************************/
export function validateLogLevel(level: string): boolean {
  // Step 1: Check if level exists in LOG_LEVELS
  const validLevel = Object.keys(LOG_LEVELS).includes(level);

  // Step 2: If in production, we may disallow 'debug' as a security measure
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && level === 'debug') {
    return false;
  }

  // Step 3: For compliance with monitoring needs, we might require at least 'info' in certain contexts
  //         This is optional; for demonstration, we won't block levels below 'info' in dev.
  
  // Step 4: Return final validation
  return validLevel;
}

/***************************************************************************************************
 * configureLogger
 * -----------------------------------------------------------------------------------------------
 * Configures and returns a secure logger instance with specified settings and monitoring capabilities.
 *
 * Steps:
 *   1. Validate configuration security (log level checks, environment constraints).
 *   2. Create base logger instance using createLogger from ../shared/utils/logger.
 *   3. Configure secure transports (console, file, ES) based on config flags.
 *   4. Apply data masking if enabled in security settings.
 *   5. Setup performance monitoring, including potential buffering or flush intervals.
 *   6. Configure advanced error handling (stack traces, correlation IDs, etc.).
 *   7. Enable transport failover for reliability (file -> ES fallback or vice versa).
 *   8. Setup monitoring hooks for external alerting or metric ingestion.
 *   9. Return the fully initialized and secured logger instance.
 **************************************************************************************************/
export function configureLogger(config: LogConfig): Logger {
  // Step 1: Validate primary security constraints, especially log level
  if (!validateLogLevel(config.level)) {
    throw new Error(
      `Invalid or insecure log level '${config.level}' requested under current environment.`
    );
  }

  // Step 2: Create the base logger instance using our internal createLogger utility
  const loggerInstance: Logger = createLogger({
    level: config.level,
    consoleEnabled: config.enableConsole,
    file: config.enableFile
      ? {
          enabled: config.enableFile,
          filename: `${config.file.dirname}/application-%DATE%.log`,
          datePattern: config.file.datePattern,
          maxSize: config.file.maxSize,
          maxFiles: config.file.maxFiles,
          zippedArchive: config.file.compress,
          level: config.level,
        }
      : {
          enabled: false,
          filename: '',
        },
    elasticsearch: config.enableElasticsearch
      ? {
          enabled: config.enableElasticsearch,
          clientOpts: {
            node: config.elasticsearch.clientOpts.node || '',
            auth: {
              username: config.elasticsearch.clientOpts.auth?.username,
              password: config.elasticsearch.clientOpts.auth?.password,
              apiKey: undefined, // not in spec, but can be extended
            },
            ssl: {
              rejectUnauthorized:
                config.elasticsearch.clientOpts.ssl?.rejectUnauthorized === 'true' ||
                config.elasticsearch.clientOpts.ssl?.rejectUnauthorized === true,
            },
            maxRetries: config.elasticsearch.retryLimit,
          },
          indexPrefix: ES_CONFIG.indices.logs, // referencing ES_CONFIG for logs index prefix
          level: config.elasticsearch.level,
        }
      : { enabled: false, clientOpts: {} },
    environment: process.env.NODE_ENV || 'development',
    maskSensitive: config.security.maskSensitiveData,
  });

  // Step 3: (Transports are internally configured in createLogger. We rely on that logic.)

  // Step 4: Apply data masking if enabled. This step can be elaborated with a custom transform
  //         that checks config.security.sensitivePatterns. For demonstration, we rely on the
  //         built-in approach from logger utility or a future enhancement.

  // Step 5: Setup performance monitoring (buffering, flush intervals, compression) as needed
  //         This might involve hooking into a queue or aggregator. Not shown here in detail.

  // Step 6: Advanced error handling is delegated to the logger's error() method and the
  //         unified approach in ../shared/utils/logger (formatError, etc.).

  // Step 7: Transport failover can be enabled if multiple transports are configured. For example,
  //         if ES is down, local file logs remain consistent. The underlying createLogger logic
  //         includes minimal failover with Winston's built-in error event handling.

  // Step 8: Monitoring hooks can be integrated with external systems or watchers. 
  //         At this level, we can optionally attach event listeners to Winston or pass metrics
  //         to an external aggregator.

  // Step 9: Return the fully configured and secure logger instance.
  return loggerInstance;
}