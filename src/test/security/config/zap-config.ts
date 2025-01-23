/* eslint-disable max-len */
/**
 * ZAP CONFIGURATION FILE
 * --------------------------------------------------------------------------
 * Defines comprehensive configuration settings for OWASP ZAP security testing
 * tool, including:
 *  - Advanced proxy settings
 *  - Customizable scanning policies
 *  - OAuth2 / JWT authentication handling
 *  - Environment-aware target specifications
 *  - Integration with automated vulnerability scanning, manual penetration
 *    testing workflows, and CI/CD pipelines
 *
 * This file addresses:
 *  1) "Security Testing" requirements (Technical Specifications §7.3.4)
 *  2) "Vulnerability Scanning" configuration for weekly scans with custom
 *     policies and authentication
 *  3) "Security Protocols" leveraging multiple environments and auth schemes
 *
 * Usage:
 *  This configuration can be consumed by any automated or manual process
 *  integrating OWASP ZAP within the broader TaskStream AI security framework.
 *  The "default" export unifies all relevant sub-configurations, ensuring
 *  comprehensive coverage for advanced security scanning scenarios.
 */

// -----------------------------------------------------------------------------
// External Imports (with version comments)
// -----------------------------------------------------------------------------
import { ZapClient } from '@zaproxy/core'; // ^2.0.0-beta.1

// -----------------------------------------------------------------------------
// Internal Imports
// -----------------------------------------------------------------------------
// SECURITY_CONFIG exports do NOT directly include "headers" and "oauth2Config"
// but we re-map to a local variable or fallback as needed.
import {
  jwt, // Named import for JWT sub-config (if needed for scanning authentication)
  oauth as oauth2Config // Renaming "oauth" to "oauth2Config" for clarity
} from '../../../backend/config/security';

// Since "headers" is not actually exported, we define a no-op fallback here:
const headers: Record<string, any> = {};

/**
 * GLOBAL CONSTANTS
 * --------------------------------------------------------------------------
 * Environment variables controlling ZAP usage:
 *  - ZAP_API_KEY: Authentication key for the ZAP API.
 *  - ZAP_PROXY_HOST: Hostname for the ZAP proxy server.
 *  - ZAP_PROXY_PORT: Port for the ZAP proxy server.
 *  - ZAP_ENV: Current environment (development, staging, production, etc.).
 */
const ZAP_API_KEY: string | undefined = process.env.ZAP_API_KEY;
const ZAP_PROXY_HOST: string = process.env.ZAP_PROXY_HOST || 'localhost';
const ZAP_PROXY_PORT: number = Number(process.env.ZAP_PROXY_PORT) || 8080;
const ZAP_ENV: string = process.env.NODE_ENV || 'development';

/**
 * createProxyConfig
 * --------------------------------------------------------------------------
 * Creates comprehensive ZAP proxy configuration settings, including:
 *  - Environment-specific variables
 *  - SSL/TLS certificate handling
 *  - Connection timeouts and retry logic
 *  - Logging, monitoring, and rate limiting
 *
 * @param environment - Current environment string (e.g., "development", "production")
 * @returns An object containing full proxy-related settings
 */
export function createProxyConfig(environment: string): Record<string, any> {
  // (1) Load environment-specific variables and settings
  //     Potential expansions could switch behaviors based on environment
  const envName = environment || ZAP_ENV;

  // (2) Configure proxy host, port, API key (ZAP-specific)
  //     Ensures the ZAP client or external tools can connect properly
  const proxyHost = ZAP_PROXY_HOST;
  const proxyPort = ZAP_PROXY_PORT;
  const apiKey = ZAP_API_KEY || 'UNSET_API_KEY';

  // (3) Set up SSL/TLS certificate handling
  //     Production might run with official certs, development might skip checks
  const sslConfig = {
    useTLS: true,
    // Example placeholders for demonstration. Production usage would
    // fetch real cert paths or environment-based cert references.
    caCertPath: '/etc/ssl/certs/zap-ca-cert.pem',
    clientCertPath: '/etc/ssl/certs/zap-client-cert.pem',
    strictSSL: envName === 'production',
  };

  // (4) Configure connection timeouts and retry logic
  //     Helps manage slow scans or ephemeral network issues
  const timeouts = {
    connectionTimeout: 30000, // milliseconds
    socketTimeout: 120000,
    maxRetries: 3,
    retryBackoffMs: 2000,
  };

  // (5) Set up logging and monitoring
  //     In an enterprise environment, this may integrate with a logging service
  const logging = {
    logLevel: envName === 'production' ? 'INFO' : 'DEBUG',
    logToFile: false,
    logFilePath: '/var/log/zap-proxy.log',
  };

  // (6) Configure rate limiting settings
  //     Might be relevant for restricting the pace of scanning to avoid
  //     overwhelming the target or the network
  const rateLimiting = {
    requestsPerSecond: 10,
    burstSize: 20,
  };

  // (7) Return complete proxy configuration
  return {
    environment: envName,
    proxyHost,
    proxyPort,
    apiKey,
    sslConfig,
    timeouts,
    logging,
    rateLimiting,
  };
}

/**
 * createAuthenticationConfig
 * --------------------------------------------------------------------------
 * Creates advanced authentication configuration supporting:
 *  - OAuth2 flows (using "oauth2Config")
 *  - JWT usage and validation (using "jwt")
 *  - Custom headers if required
 *  - Session management and fail handling
 *
 * @param authOptions - Free-form object that can override defaults or add custom logic
 * @returns A comprehensive authentication config object suitable for ZAP or other scanners
 */
export function createAuthenticationConfig(authOptions: Record<string, any>): Record<string, any> {
  // (1) Configure OAuth2 authentication flow
  //     Reference 'oauth2Config' from the security config for actual provider detail
  const oauth2 = {
    providers: oauth2Config.providers || [],
    callbackUrl: oauth2Config.callbackUrl || '',
    scopes: oauth2Config.scopes || [],
    sessionDuration: oauth2Config.sessionDuration || '24h',
    additionalParams: authOptions?.oauthParams || {},
  };

  // (2) Set up JWT token handling and validation
  //     Using 'jwt' from the security config
  const jwtConfig = {
    secret: jwt.secret,
    expiresIn: jwt.expiresIn,
    algorithm: jwt.algorithm,
    issuer: jwt.issuer,
    audience: jwt.audience,
    refreshToken: jwt.refreshToken,
  };

  // (3) Configure custom authentication headers
  //     We rely on fallback 'headers' object or user-provided keys in authOptions
  const customHeaders = {
    ...headers,
    ...(authOptions?.customHeaders || {}),
  };

  // (4) Set up session management and persistence
  //     Example placeholders for session handling. For real usage:
  //     - Could integrate with a distributed store or advanced session monitoring.
  const sessionManagement = {
    strategy: 'stateless', // or "stateful" with session store
    sessionKey: 'ZAP_SESSION_ID',
    sessionTimeout: 3600, // seconds
  };

  // (5) Configure authentication verification steps
  //     Example steps: checking token signatures, verifying claims, etc.
  const verification = {
    checkIssuer: true,
    checkAudience: true,
    acceptClockSkew: 30, // seconds of tolerance
  };

  // (6) Set up authentication failure handling
  //     For scanners or scripts, we might want to skip or forcibly fail if auth fails
  const failureHandling = {
    onAuthFailure: 'abort-scan', // or 'continue' based on organizational policy
    maxFailedRetries: 2,
  };

  // (7) Return complete authentication configuration
  return {
    oauth2,
    jwtConfig,
    customHeaders,
    sessionManagement,
    verification,
    failureHandling,
  };
}

/**
 * createScanPolicy
 * --------------------------------------------------------------------------
 * Creates a detailed scanning policy object, specifying:
 *  - Active and passive scan rules
 *  - Scope definitions, exclusions
 *  - Attack strengths and thresholds
 *  - Reporting mechanism or integration with external systems
 *
 * @param policyOptions - Object to override default rules, thresholds, or scope
 * @returns A comprehensive scan policy configuration object
 */
export function createScanPolicy(policyOptions: Record<string, any>): Record<string, any> {
  // (1) Configure active scan rules and strengths
  //     Typical usage includes specifying rule IDs or categories
  const activeScanRules = {
    enabledRules: policyOptions?.activeRules || ['50000', '50001', '50002'],
    attackStrength: policyOptions?.attackStrength || 'HIGH', // LOW, MEDIUM, HIGH, INSANE
  };

  // (2) Set up passive scan rules and thresholds
  const passiveScanRules = {
    enabledRules: policyOptions?.passiveRules || ['60000', '60001'],
    alertThreshold: policyOptions?.alertThreshold || 'MEDIUM', // OFF, LOW, MEDIUM, HIGH
  };

  // (3) Define scan scope and exclusions
  const scope = {
    includedURLs: policyOptions?.includedURLs || ['https://app.taskstream.ai'],
    excludedURLs: policyOptions?.excludedURLs || [
      'https://app.taskstream.ai/logout',
      'https://app.taskstream.ai/assets/*',
    ],
  };

  // (4) Configure attack strength parameters
  //     E.g. how aggressively ZAP will attempt various injection or brute-force checks
  const attackStrengthSettings = {
    sqlInjection: 'HIGH',
    xss: 'HIGH',
    directoryBrowsing: 'MEDIUM',
  };

  // (5) Set up alert thresholds and reporting
  //     Merges with item #2 or can be explicitly declared globally
  const alertThresholds = {
    globalThreshold: policyOptions?.globalThreshold || 'MEDIUM',
    localOverrides: policyOptions?.thresholdOverrides || {},
  };

  // (6) Configure scan optimization settings
  //     For enterprise usage, we may limit the request rate or concurrency
  const optimization = {
    maxScanDurationMins: 60,
    concurrencyLimit: 5,
    followRedirects: true,
  };

  // (7) Set up result handling and persistence
  //     Potentially integrate with local or remote artifacts, logs, or issue trackers
  const resultHandling = {
    storeResults: true,
    resultsPath: './zap-results.json',
    failOnHighSeverity: policyOptions?.failOnHighSeverity || false,
  };

  // (8) Return the complete scan policy configuration
  return {
    activeScanRules,
    passiveScanRules,
    scope,
    attackStrengthSettings,
    alertThresholds,
    optimization,
    resultHandling,
  };
}

// -----------------------------------------------------------------------------
// Additional Utility / Setup for Automated ZAP Integration
// -----------------------------------------------------------------------------

/**
 * Instantiate a ZAP Client to demonstrate how one might programmatically
 * control scans, authenticate, etc. with the above config. This is optional
 * but can be helpful for orchestrated scanning in a CI/CD pipeline.
 */
const zapClient = new ZapClient({
  apiKey: ZAP_API_KEY || 'NO_KEY_PROVIDED',
  proxy: `http://${ZAP_PROXY_HOST}:${ZAP_PROXY_PORT}`,
});

// -----------------------------------------------------------------------------
// Environment-Aware Target Configuration & Reporting
// -----------------------------------------------------------------------------

/**
 * Provides environment-based target specifications for the TaskStream AI platform.
 * Adjust domain, protocol, or paths if needed to reflect actual endpoints.
 */
const target = {
  development: 'http://localhost:3000',
  staging: 'https://staging.taskstream.ai',
  production: 'https://app.taskstream.ai',
  selected: ZAP_ENV === 'production'
    ? 'https://app.taskstream.ai'
    : ZAP_ENV === 'staging'
      ? 'https://staging.taskstream.ai'
      : 'http://localhost:3000',
};

/**
 * Defines reporting options for automated vulnerability scanning and
 * penetration testing, including schedule or integration with CI/CD.
 */
const reporting = {
  // For example: weekly scans in staging or production
  schedule: 'weekly',
  // If integrated into GitHub Actions or other pipelines
  ciCdIntegration: true,
  // Potential output format. Could be "json", "html", "xml", etc.
  reportFormat: 'json',
  // Where to store final comprehensive reports
  reportOutputPath: './zap-security-report',
  // Slack or Email notifications placeholder
  notifications: {
    enabled: true,
    channels: ['slack', 'email'],
  },
};

// -----------------------------------------------------------------------------
// Default Export
// -----------------------------------------------------------------------------
/**
 * Exports a single default object containing the following keys:
 *
 *  - proxy         => Comprehensive proxy config from createProxyConfig
 *  - authentication=> Comprehensive auth config from createAuthenticationConfig
 *  - scan_policy   => Detailed scanning policy from createScanPolicy
 *  - target        => Environment-specific target definitions
 *  - reporting     => Reporting config, including scheduling & CI/CD integration
 *
 * This structure ensures that external scripts or modules can reference a
 * single location for all ZAP-related settings.
 */
export default {
  /**
   * proxy
   * Automatically generated by createProxyConfig, using the current ZAP_ENV.
   */
  proxy: createProxyConfig(ZAP_ENV),

  /**
   * authentication
   * Basic example usage with no overrides, can be further customized if needed.
   */
  authentication: createAuthenticationConfig({}),

  /**
   * scan_policy
   * Basic policy with default or demonstration values. Override as needed.
   */
  scan_policy: createScanPolicy({}),

  /**
   * target
   * Contains environment-based endpoints. "selected" is used by scanning tools
   * to determine which base URL to attack.
   */
  target,

  /**
   * reporting
   * Facilitates scheduling, CI/CD integration, and final output settings.
   */
  reporting,
};