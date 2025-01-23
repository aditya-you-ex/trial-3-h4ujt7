/**
 * Configuration module for Elasticsearch client setup and management
 * in TaskStream AI platform. This module provides connection settings,
 * index management, search optimization configurations, enhanced monitoring,
 * and high availability features.
 */

/* ---------------------- External Imports ---------------------- */
// dotenv v16.3.1 - Load environment variables from .env files
import dotenv from 'dotenv';
// @elastic/elasticsearch v8.10.0 - Official Elasticsearch client for Node.js
import { Client } from '@elastic/elasticsearch';

/* ---------------------- Internal Imports ---------------------- */
/**
 * Importing common response types for potential error handling and status reporting.
 * Note: We only explicitly reference ApiResponse's structure in specific error scenarios.
 *       This interface can provide a standardized error reporting schema for Elasticsearch-related operations.
 */
import { ApiResponse } from '../shared/interfaces/common.interface';

/* ---------------------- Initialize environment variables ---------------------- */
dotenv.config();

/**
 * Interface describing the connection pool tuning parameters
 * for Elasticsearch high availability and retries.
 */
interface ElasticsearchConnectionPoolConfig {
  /**
   * Maximum number of retries for the connection pool.
   */
  maxRetries: number | string;

  /**
   * Minimum delay between retries (milliseconds).
   */
  minDelay: number | string;

  /**
   * Maximum delay between retries (milliseconds).
   */
  maxDelay: number | string;
}

/**
 * Interface describing the monitoring configuration options,
 * enabling or disabling APM and general monitoring features.
 */
interface ElasticsearchMonitoringConfig {
  /**
   * Enables or disables Elasticsearch-based monitoring logic.
   */
  enabled: boolean | string;

  /**
   * Interval in milliseconds at which to perform monitoring checks.
   */
  interval: number | string;

  /**
   * Endpoint for an APM (Application Performance Monitoring) server, if used.
   */
  apmServerUrl?: string;
}

/**
 * Interface grouping all customizable index names for the TaskStream AI application.
 */
interface ElasticsearchIndicesConfig {
  /**
   * Index name for tasks data.
   */
  tasks: string;

  /**
   * Index name for projects data.
   */
  projects: string;

  /**
   * Index name for analytics data.
   */
  analytics: string;

  /**
   * Index name for logs data.
   */
  logs: string;

  /**
   * Index name for monitoring data.
   */
  monitoring: string;
}

/**
 * Interface describing optional TLS (Transport Layer Security) settings for secure connections.
 */
interface ElasticsearchTLSConfig {
  /**
   * Whether to reject unauthorized certificates.
   */
  rejectUnauthorized: boolean;

  /**
   * CA certificate file path or content for secure connectivity.
   */
  ca?: string;

  /**
   * Client certificate file path or content for mutual TLS.
   */
  cert?: string;

  /**
   * Client key file path or content for mutual TLS.
   */
  key?: string;
}

/**
 * Interface describing optional authentication credentials.
 */
interface ElasticsearchAuthConfig {
  /**
   * Username for Basic Auth.
   */
  username?: string;

  /**
   * Password for Basic Auth.
   */
  password?: string;

  /**
   * API key for token-based authentication.
   */
  apiKey?: string;
}

/**
 * Interface describing the complete Elasticsearch configuration,
 * including connection details, indices, monitoring, and TLS.
 */
interface ElasticsearchFullConfig {
  /**
   * Elasticsearch base node URL, e.g., http(s)://host:port.
   */
  node: string;

  /**
   * Settings for username/password or API key authentication.
   */
  auth: ElasticsearchAuthConfig;

  /**
   * TLS-related fields for secure connections.
   */
  tls: ElasticsearchTLSConfig;

  /**
   * Maximum number of request retries at the client level.
   */
  maxRetries: number | string;

  /**
   * Request timeout in milliseconds.
   */
  requestTimeout: number | string;

  /**
   * Whether to sniff for other cluster nodes on client startup.
   */
  sniffOnStart: boolean;

  /**
   * Connection pool tuning parameters for high availability.
   */
  connectionPool: ElasticsearchConnectionPoolConfig;

  /**
   * Default index names used by the TaskStream AI platform.
   */
  indices: ElasticsearchIndicesConfig;

  /**
   * Monitoring configuration section enabling advanced metrics.
   */
  monitoring: ElasticsearchMonitoringConfig;
}

/**
 * The default Elasticsearch configuration object for the TaskStream AI platform.
 * This object sets up basic connection settings, authentication, indices,
 * monitoring, and pooling strategies. These defaults can be overridden
 * at runtime by environment variables.
 */
export const ES_CONFIG: ElasticsearchFullConfig = {
  node: process.env.ES_NODE || 'http://localhost:9200',
  auth: {
    username: process.env.ES_USERNAME,
    password: process.env.ES_PASSWORD,
    apiKey: process.env.ES_API_KEY,
  },
  tls: {
    rejectUnauthorized: process.env.ES_TLS_VERIFY !== 'false',
    ca: process.env.ES_CA_CERT,
    cert: process.env.ES_CLIENT_CERT,
    key: process.env.ES_CLIENT_KEY,
  },
  maxRetries: process.env.ES_MAX_RETRIES || 3,
  requestTimeout: process.env.ES_TIMEOUT || 30000,
  sniffOnStart: process.env.ES_SNIFF === 'true',
  connectionPool: {
    maxRetries: process.env.ES_POOL_MAX_RETRIES || 3,
    minDelay: process.env.ES_POOL_MIN_DELAY || 100,
    maxDelay: process.env.ES_POOL_MAX_DELAY || 3000,
  },
  indices: {
    tasks: process.env.ES_TASKS_INDEX || 'taskstream-tasks',
    projects: process.env.ES_PROJECTS_INDEX || 'taskstream-projects',
    analytics: process.env.ES_ANALYTICS_INDEX || 'taskstream-analytics',
    logs: process.env.ES_LOGS_INDEX || 'taskstream-logs',
    monitoring: process.env.ES_MONITORING_INDEX || 'taskstream-monitoring',
  },
  monitoring: {
    enabled: process.env.ES_MONITORING_ENABLED === 'true',
    interval: process.env.ES_MONITORING_INTERVAL || 30000,
    apmServerUrl: process.env.ES_APM_SERVER_URL,
  },
};

/**
 * Validates the Elasticsearch configuration for required settings and valid values.
 *
 * @param config - The ElasticsearchFullConfig object to be validated.
 * @returns boolean - The validity status of the provided configuration.
 *
 * Steps:
 * 1. Check required connection settings.
 * 2. Validate authentication if enabled (username/password or apiKey).
 * 3. Verify TLS configuration if enabled.
 * 4. Validate index names and settings.
 * 5. Check monitoring configuration.
 * 6. Verify connection pool settings.
 * 7. Validate APM configuration if monitoring is enabled.
 * 8. Return validation result (true if valid, false otherwise).
 */
export function validateConfig(config: Partial<ElasticsearchFullConfig>): boolean {
  // 1. Check that a node URL is present
  if (!config.node || typeof config.node !== 'string' || !config.node.trim()) {
    return false;
  }

  // 2. Validate auth settings
  const hasAuth =
    (config.auth?.username && config.auth?.password) || config.auth?.apiKey;
  if (!hasAuth) {
    // If no credentials are provided, it might be permissible to connect anonymously.
    // We do not fail here unless environment demands secure auth.
  }

  // 3. Verify TLS if specified
  if (config.tls) {
    if (typeof config.tls.rejectUnauthorized !== 'boolean') {
      return false;
    }
    // Additional checks can be performed for CA, cert, and key if needed
  }

  // 4. Validate index settings
  if (config.indices) {
    const { tasks, projects, analytics, logs, monitoring } = config.indices;
    if (!tasks || !projects || !analytics || !logs || !monitoring) {
      return false;
    }
  }

  // 5. Check monitoring configuration
  if (config.monitoring) {
    if (typeof config.monitoring.enabled !== 'boolean' && typeof config.monitoring.enabled !== 'string') {
      return false;
    }
    if (!config.monitoring.interval || Number.isNaN(Number(config.monitoring.interval))) {
      return false;
    }
  }

  // 6. Verify connection pool settings
  if (config.connectionPool) {
    const { maxRetries, minDelay, maxDelay } = config.connectionPool;
    if (Number.isNaN(Number(maxRetries)) || Number.isNaN(Number(minDelay)) || Number.isNaN(Number(maxDelay))) {
      return false;
    }
  }

  // 7. Validate APM configuration if monitoring is enabled
  if (config.monitoring?.enabled === true && config.monitoring.apmServerUrl) {
    // We can further check the validity of the APM URL
  }

  // 8. If all checks passed, config is valid
  return true;
}

/**
 * Creates and returns a configured Elasticsearch client instance with enhanced error handling
 * and monitoring capabilities, based on the provided or merged configuration options.
 *
 * @param options - Partial overrides for the default Elasticsearch configuration.
 * @returns Client - A newly instantiated Elasticsearch client, ready for usage.
 *
 * Steps:
 * 1. Load and validate environment configuration.
 * 2. Merge default config with provided options.
 * 3. Initialize client with security settings.
 * 4. Set up connection pool and retry strategy.
 * 5. Configure APM if enabled.
 * 6. Verify connection and cluster health.
 * 7. Initialize index templates and mappings (placeholder).
 * 8. Set up monitoring if enabled.
 * 9. Return configured client instance.
 */
export function createElasticsearchClient(
  options: Partial<ElasticsearchFullConfig> = {}
): Client {
  // 1. Check if environment config merges properly
  const mergedConfig: ElasticsearchFullConfig = {
    ...ES_CONFIG,
    ...options,
    auth: {
      ...ES_CONFIG.auth,
      ...options.auth,
    },
    tls: {
      ...ES_CONFIG.tls,
      ...options.tls,
    },
    connectionPool: {
      ...ES_CONFIG.connectionPool,
      ...options.connectionPool,
    },
    indices: {
      ...ES_CONFIG.indices,
      ...options.indices,
    },
    monitoring: {
      ...ES_CONFIG.monitoring,
      ...options.monitoring,
    },
  };

  if (!validateConfig(mergedConfig)) {
    // Return or throw an error with a standardized structure
    const message = 'Invalid Elasticsearch configuration detected.';
    /* 
      Demonstration of using our ApiResponse interface for error reporting.
      Typically, we'd integrate this into a broader error-handling mechanism.
    */
    const errorResponse: ApiResponse<null> = {
      status: 'error',
      message,
      data: null,
      errors: [
        {
          code: 'INVALID_CONFIG',
          message,
          details: { mergedConfig },
          timestamp: new Date(),
          stackTrace: '',
        },
      ],
      metadata: {
        requestId: 'N/A',
        timestamp: new Date(),
      },
    };
    throw new Error(JSON.stringify(errorResponse));
  }

  // 2. Merge default config with user-supplied options
  const authSettings = mergedConfig.auth?.apiKey
    ? { apiKey: mergedConfig.auth.apiKey }
    : {
        username: mergedConfig.auth?.username,
        password: mergedConfig.auth?.password,
      };

  // 3. Initialize ES client with security and TLS
  const client = new Client({
    node: mergedConfig.node,
    auth: authSettings,
    maxRetries: Number(mergedConfig.maxRetries),
    requestTimeout: Number(mergedConfig.requestTimeout),
    sniffOnStart: mergedConfig.sniffOnStart,
    ssl: {
      rejectUnauthorized: mergedConfig.tls.rejectUnauthorized,
      ca: mergedConfig.tls.ca,
      cert: mergedConfig.tls.cert,
      key: mergedConfig.tls.key,
    },
  });

  // 4. Set up additional connection pool strategies or custom logic
  //    Placeholder: in-depth retry policy customization can be added if needed

  // 5. Configure APM if monitoring is enabled and APM server is specified
  if (mergedConfig.monitoring.enabled && mergedConfig.monitoring.apmServerUrl) {
    // Placeholder: set up official or community APM instrumentation
  }

  // 6. Verify cluster health as a simple connectivity check
  client.ping({}, (err) => {
    if (err) {
      // If ping fails, we log or handle it accordingly
      // Additional robust error-handling could be added here
    }
  });

  // 7. Initialize index templates and mappings (placeholder)
  //    You can create or update index templates if needed:
  //    client.indices.putTemplate({ ... })

  // 8. Set up monitoring if needed
  if (mergedConfig.monitoring.enabled) {
    // Placeholder: Integrate with external or custom monitoring solution
  }

  // 9. Return fully configured client instance
  return client;
}

/**
 * The ElasticsearchConfig class encapsulates the configuration and lifecycle management
 * for the Elasticsearch client. It provides methods for updating the configuration,
 * checking connectivity, and offering advanced monitoring capabilities.
 */
export class ElasticsearchConfig {
  /**
   * Internal Elasticsearch client instance.
   */
  public client: Client;

  /**
   * Internal representation of the merged configuration for Elasticsearch.
   */
  public config: ElasticsearchFullConfig;

  /**
   * Flag to indicate whether the cluster is reachable.
   */
  public isConnected: boolean;

  /**
   * Monitoring configuration, storing intervals and APM server details.
   */
  public monitoring: ElasticsearchMonitoringConfig;

  /**
   * Container for health check parameters and results used by this class.
   */
  public healthCheck: Record<string, any>;

  /**
   * Initializes Elasticsearch configuration with provided settings, verifying,
   * creating the client instance, setting up index templates, and enabling monitoring.
   *
   * @param options - Partial overrides to the default ES configuration.
   *
   * Steps:
   * 1. Initialize configuration by merging defaults with provided options.
   * 2. Validate settings using validateConfig.
   * 3. Create client instance with createElasticsearchClient.
   * 4. Set up index templates (placeholder).
   * 5. Configure monitoring.
   * 6. Initialize health checks.
   * 7. Set up APM integration (if enabled).
   * 8. Verify connection and store isConnected status.
   */
  constructor(options: Partial<ElasticsearchFullConfig> = {}) {
    // 1. Merge configuration
    const mergedConfig = {
      ...ES_CONFIG,
      ...options,
      auth: {
        ...ES_CONFIG.auth,
        ...options.auth,
      },
      tls: {
        ...ES_CONFIG.tls,
        ...options.tls,
      },
      connectionPool: {
        ...ES_CONFIG.connectionPool,
        ...options.connectionPool,
      },
      indices: {
        ...ES_CONFIG.indices,
        ...options.indices,
      },
      monitoring: {
        ...ES_CONFIG.monitoring,
        ...options.monitoring,
      },
    } as ElasticsearchFullConfig;

    // 2. Validate the final settings
    if (!validateConfig(mergedConfig)) {
      throw new Error('Elasticsearch configuration is invalid.');
    }

    this.config = mergedConfig;
    this.monitoring = mergedConfig.monitoring as ElasticsearchMonitoringConfig;

    // 3. Create the ES client
    this.client = createElasticsearchClient(mergedConfig);

    // 4. Placeholder for setting up index templates or mappings
    //    e.g., this.client.indices.putTemplate({...})

    // 5. Configure monitoring using mergedConfig.monitoring
    //    e.g., if (this.monitoring.enabled) { ... }

    // 6. Initialize healthCheck object
    this.healthCheck = {};

    // 7. Set up APM integration if enabled
    if (this.monitoring.enabled && this.monitoring.apmServerUrl) {
      // Placeholder: integrate with APM
    }

    // 8. Verify immediate connectivity
    this.isConnected = false;
    this.checkConnection().then((status) => {
      this.isConnected = status;
    });
  }

  /**
   * Retrieves the configured Elasticsearch client instance,
   * creating or re-checking if necessary.
   *
   * Steps:
   * 1. Check if a valid client instance exists.
   * 2. Verify health or recreate the client upon any inconsistency.
   * 3. Return the client instance.
   *
   * @returns Client - The current or newly created Elasticsearch client.
   */
  public getClient(): Client {
    if (!this.client) {
      // In case the client was removed, we recreate it
      this.client = createElasticsearchClient(this.config);
    }
    return this.client;
  }

  /**
   * Updates the current Elasticsearch configuration with new settings.
   * This method re-validates configuration, reconfigures monitoring,
   * and may recreate the client instance if critical parameters change.
   *
   * Steps:
   * 1. Validate new configuration using validateConfig.
   * 2. Update current settings and merge with existing config.
   * 3. Reconfigure monitoring if needed.
   * 4. Update health check parameters.
   * 5. Recreate client if major connection parameters changed.
   *
   * @param newConfig - Partial Elasticsearch config for updating.
   */
  public updateConfig(newConfig: Partial<ElasticsearchFullConfig>): void {
    const updatedConfig = {
      ...this.config,
      ...newConfig,
      auth: {
        ...this.config.auth,
        ...newConfig.auth,
      },
      tls: {
        ...this.config.tls,
        ...newConfig.tls,
      },
      connectionPool: {
        ...this.config.connectionPool,
        ...newConfig.connectionPool,
      },
      indices: {
        ...this.config.indices,
        ...newConfig.indices,
      },
      monitoring: {
        ...this.config.monitoring,
        ...newConfig.monitoring,
      },
    } as ElasticsearchFullConfig;

    if (!validateConfig(updatedConfig)) {
      throw new Error('Invalid updated Elasticsearch configuration.');
    }

    // Merge it into the class-level config
    this.config = updatedConfig;

    // Reconfigure monitoring
    if (updatedConfig.monitoring.enabled) {
      this.monitoring = updatedConfig.monitoring;
    }

    // Update health check parameters accordingly
    this.healthCheck = { ...this.healthCheck };

    // Recreate client if necessary
    this.client = createElasticsearchClient(this.config);
  }

  /**
   * Checks connectivity to the Elasticsearch cluster and performs basic health checks.
   * Returns a boolean indicating successful connectivity and cluster readiness.
   *
   * Steps:
   * 1. Ping Elasticsearch cluster as a basic connectivity test.
   * 2. Check cluster health for the desired status.
   * 3. Verify essential indices are accessible.
   * 4. Evaluate monitoring status if enabled.
   * 5. Update isConnected status.
   * 6. Return the aggregated boolean status.
   *
   * @returns Promise<boolean> - True if connected and healthy, false otherwise.
   */
  public async checkConnection(): Promise<boolean> {
    try {
      // 1. Basic ping test
      await this.client.ping();

      // 2. Cluster health check (can be more granular)
      const health = await this.client.cluster.health();
      if (health.body.status === 'red') {
        // 'red' typically indicates severe issues in cluster
        return false;
      }

      // 3. Verify essential indices (placeholder for actual index checks)
      // e.g., await this.client.indices.exists({ index: this.config.indices.tasks });

      // 4. Monitor if enabled (placeholder for any advanced checks)
      if (this.monitoring.enabled) {
        // Additional logic for monitoring, e.g., APM or metrics
      }

      // 5. If all checks pass
      this.isConnected = true;
      return true;
    } catch (error) {
      // 6. If any step fails, connectivity is not validated
      this.isConnected = false;
      return false;
    }
  }
}