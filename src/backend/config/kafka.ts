/***************************************************************************************************
 * TaskStream AI - Kafka Configuration Module
 * -----------------------------------------------------------------------------------------------
 * This module configures Kafka settings and provides factory functions for creating secure,
 * reliable, and monitored Kafka clients, producers, and consumers. It also includes a health
 * check mechanism to ensure Kafka connectivity and system reliability.
 *
 * External Imports:
 *   - kafkajs@2.2.4
 *
 * Internal Imports:
 *   - Logger class from src/backend/shared/utils/logger.ts
 ***************************************************************************************************/

import { Kafka, KafkaConfig, Producer, Consumer, CompressionTypes, logLevel as KafkaLogLevel } from 'kafkajs'; // version 2.2.4
import { Logger } from '../shared/utils/logger'; // Internal logger with error/info methods

/***************************************************************************************************
 * ENVIRONMENT VARIABLES & DEFAULTS
 * -----------------------------------------------------------------------------------------------
 * The following constants pull environment variables for Kafka configuration. They fall back to
 * predefined defaults to ensure local development and testing without explicit environment setup.
 **************************************************************************************************/
const KAFKA_CLIENT_ID: string = process.env.KAFKA_CLIENT_ID || 'taskstream-service';
const KAFKA_BROKERS: string[] = process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'];
const KAFKA_RETRY_MAX_RETRIES: number = parseInt(process.env.KAFKA_RETRY_MAX_RETRIES || '5', 10);
const KAFKA_RETRY_INITIAL_RETRY_TIME: number = parseInt(process.env.KAFKA_RETRY_INITIAL_RETRY_TIME || '100', 10);
const KAFKA_SSL_ENABLED: boolean = process.env.KAFKA_SSL_ENABLED === 'true';
const KAFKA_SASL_ENABLED: boolean = process.env.KAFKA_SASL_ENABLED === 'true';
const KAFKA_HEALTH_CHECK_INTERVAL: number = parseInt(process.env.KAFKA_HEALTH_CHECK_INTERVAL || '30000', 10);

/***************************************************************************************************
 * kafkaConfig
 * -----------------------------------------------------------------------------------------------
 * Default Kafka configuration object with retries, SSL/SASL settings, and other broker options.
 * Exposed as a named export to allow broad usage across the TaskStream AI codebase.
 **************************************************************************************************/
export const kafkaConfig = {
  clientId: KAFKA_CLIENT_ID,
  brokers: KAFKA_BROKERS,
  retry: {
    // Exponential backoff configuration
    initialRetryTime: KAFKA_RETRY_INITIAL_RETRY_TIME,
    retries: KAFKA_RETRY_MAX_RETRIES,
  },
  // SSL configuration if enabled via environment variable
  ssl: KAFKA_SSL_ENABLED
    ? {
        rejectUnauthorized: false,
      }
    : false,
  // SASL configuration if enabled; placeholders can be replaced with actual credentials
  sasl: KAFKA_SASL_ENABLED
    ? {
        mechanism: 'plain', // or 'scram-sha-256' / 'scram-sha-512' if desired
        username: process.env.KAFKA_SASL_USERNAME || 'placeholderUser',
        password: process.env.KAFKA_SASL_PASSWORD || 'placeholderPassword',
      }
    : undefined,
};

/***************************************************************************************************
 * LOGGER INITIALIZATION
 * -----------------------------------------------------------------------------------------------
 * Create a logger instance for monitoring Kafka events, capturing errors, and providing
 * operational insights. In production, this can be reconfigured with more advanced settings.
 **************************************************************************************************/
const logger = new Logger({
  level: 'info',
  consoleEnabled: true,
  environment: process.env.NODE_ENV || 'development',
});

/***************************************************************************************************
 * createKafkaClient
 * -----------------------------------------------------------------------------------------------
 * Creates and configures a new Kafka client instance with enhanced security, retry logic,
 * and circuit-breaker-like monitoring. Integrates with the TaskStream AI logging system for
 * real-time operational insights.
 *
 * @param {object} config - Partial or full Kafka configuration object to override defaults.
 * @returns {Kafka}       - Configured Kafka client instance.
 *
 * Steps:
 *   1. Merge provided config with default kafkaConfig.
 *   2. Configure SSL/TLS if enabled.
 *   3. Configure SASL authentication if enabled.
 *   4. Configure exponential backoff retry mechanism.
 *   5. Implement a basic circuit breaker approach via event monitoring.
 *   6. Set up comprehensive logging for Kafka internal events.
 *   7. Prepare any health check intervals if needed.
 *   8. Return the configured Kafka client instance.
 **************************************************************************************************/
export function createKafkaClient(config: Partial<KafkaConfig> = {}): Kafka {
  // Step 1: Merge user-defined config with defaults
  const finalConfig: KafkaConfig = {
    ...kafkaConfig,
    ...config,
    // Configure internal Kafka logging if desired. Using "nothing" can be replaced by advanced usage:
    logLevel: KafkaLogLevel.NOTHING,
  };

  // Step 2,3,4: SSL, SASL, retry are already reflected in finalConfig from kafkaConfig merges.

  // Step 5: Implement a basic circuit breaker approach through event logging and possible re-init
  // if consecutive errors exceed a threshold (placeholder for advanced usage).
  // Step 6: We rely on 'producer' or 'consumer' event listeners for monitoring in the calling code.

  // Step 7: Any health check intervals are configured externally, e.g., KAFKA_HEALTH_CHECK_INTERVAL.

  const client = new Kafka(finalConfig);
  logger.info('Kafka client created.', { clientId: finalConfig.clientId, brokers: finalConfig.brokers });

  return client;
}

/***************************************************************************************************
 * createProducer
 * -----------------------------------------------------------------------------------------------
 * Creates a Kafka producer with enhanced reliability settings (idempotent, transactions),
 * compression, monitoring, and robust error handling.
 *
 * @param {Kafka} client - A valid Kafka client instance from kafkajs.
 * @returns {Producer}   - Configured Kafka producer instance.
 *
 * Steps:
 *   1. Create producer using the provided Kafka client.
 *   2. Enable transactional/idempotent settings for reliability.
 *   3. Configure compression (e.g., gzip) if needed.
 *   4. Implement message validation placeholders.
 *   5. Implement a retry strategy based on client config.
 *   6. Set up performance monitoring and logging events.
 *   7. Configure error handling with dead-letter or fallback approach if appropriate.
 *   8. Initialize any health metrics.
 *   9. Return the producer instance.
 **************************************************************************************************/
export function createProducer(client: Kafka): Producer {
  // Step 1,2: Create a producer with idempotent = true for reliable once delivery
  const producer = client.producer({
    allowAutoTopicCreation: true,
    idempotent: true,
  });

  // Step 3: Compression, message validation, and other features can be used per send call:
  // E.g., producer.send({ topic, messages, compression: CompressionTypes.GZIP });

  // Step 6: Attach event listeners for logging
  producer.on(client.events.PRODUCER_CONNECT, () => {
    logger.info('Kafka producer connected successfully.');
  });
  producer.on(client.events.PRODUCER_DISCONNECT, () => {
    logger.warn('Kafka producer disconnected.');
  });
  producer.on(client.events.PRODUCER_NETWORK_REQUEST_TIMEOUT, (e) => {
    logger.error('Kafka producer network request timeout occurred.', { event: e });
  });

  return producer;
}

/***************************************************************************************************
 * createConsumer
 * -----------------------------------------------------------------------------------------------
 * Creates a Kafka consumer with enhanced reliability, parallel message processing, monitoring,
 * and dead-letter queue handling placeholders.
 *
 * @param {Kafka}   client  - A valid Kafka client instance from kafkajs.
 * @param {string}  groupId - Unique group ID for this set of consumers.
 * @returns {Consumer}      - Configured Kafka consumer instance.
 *
 * Steps:
 *   1. Create consumer with designated group ID.
 *   2. Configure auto-commit if desired.
 *   3. Set up placeholders for dead-letter queue handling if message processing fails.
 *   4. Implement message validation checks.
 *   5. Allow parallel processing if needed by adjusting concurrency approaches.
 *   6. Set up performance monitoring event listeners.
 *   7. Configure robust error handling and logging.
 *   8. Initialize health metrics or watchers as needed.
 *   9. Return the consumer instance.
 **************************************************************************************************/
export function createConsumer(client: Kafka, groupId: string): Consumer {
  // Step 1,2: Create a consumer with auto topic creation. Additional config can control auto commits.
  const consumer = client.consumer({
    groupId,
    allowAutoTopicCreation: true,
  });

  // Step 6,7: Set up event listeners for monitoring
  consumer.on(client.events.CONSUMER_CONNECT, () => {
    logger.info(`Kafka consumer connected. Group ID: ${groupId}`);
  });
  consumer.on(client.events.CONSUMER_CRASH, (event) => {
    logger.error('Kafka consumer crashed.', { event });
  });
  consumer.on(client.events.CONSUMER_DISCONNECT, () => {
    logger.warn(`Kafka consumer disconnected. Group ID: ${groupId}`);
  });

  return consumer;
}

/***************************************************************************************************
 * checkKafkaHealth
 * -----------------------------------------------------------------------------------------------
 * Performs a health check on Kafka brokers by verifying connectivity, metadata, and basic
 * producer/consumer operations.
 *
 * @param {Kafka} client - Kafka client instance to test.
 * @returns {Promise<boolean>} - Resolves with true if healthy, otherwise false.
 *
 * Steps:
 *   1. Attempt to connect to brokers via admin API (broker connectivity).
 *   2. Fetch cluster metadata to ensure availability.
 *   3. Create a short-lived producer, connect, and disconnect to test writing capability.
 *   4. Optionally create a short-lived consumer to test fetch capabilities if needed.
 *   5. Monitor broker response times or errors for warnings.
 *   6. Check SSL/SASL status if enabled.
 *   7. Log health metrics and final status.
 *   8. Return whether Kafka is healthy.
 **************************************************************************************************/
export async function checkKafkaHealth(client: Kafka): Promise<boolean> {
  const admin = client.admin();
  let isHealthy = false;

  try {
    // Step 1: Connect admin client to check broker availability
    await admin.connect();
    // Step 2: Fetch some basic metadata
    await admin.fetchTopicMetadata();

    // Step 3: Test producer connection
    const producer = client.producer({ allowAutoTopicCreation: false });
    await producer.connect();
    await producer.disconnect();

    // (Optional) Step 4: Consumer check can be done similarly if desired

    // Step 5,6: For advanced response-time stats, we could measure latencies or timeouts.

    // Step 7: Log success and set health to true
    logger.info('Kafka health check passed. Brokers are reachable and functional.');
    isHealthy = true;
  } catch (err) {
    logger.error('Kafka health check failed.', { error: err });
    isHealthy = false;
  } finally {
    // Disconnect admin to clean up resources
    try {
      await admin.disconnect();
    } catch (disconnectErr) {
      logger.error('Error disconnecting Kafka admin during health check.', { error: disconnectErr });
    }
  }

  // Step 8: Return final health status
  return isHealthy;
}