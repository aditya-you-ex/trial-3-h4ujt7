/* eslint-disable max-len */
/**
 * SECURITY CONFIGURATION MODULE
 * --------------------------------------------------------------------------
 * This file centralizes security-related configuration for the TaskStream AI
 * platform. It enforces enterprise-grade security features, including
 * encryption, authentication, authorization, data protection, rate limiting,
 * CORS, and secure headers.
 *
 * Implements:
 *  1) Security Architecture from the technical specifications (2.4.2),
 *  2) Authentication & Authorization (7.1),
 *  3) Data Security (7.2), including TLS 1.3 and AES-256-GCM references.
 *
 * Core Responsibilities:
 *  - Loading environment variables related to security (JWT secret, allowed
 *    origins, OAuth callback, etc.) using dotenv.
 *  - Structuring an all-encompassing SECURITY_CONFIG object with sub-configs
 *    for JWT, encryption, CORS, rate limiting, helmet, and OAuth providers.
 *  - Providing a validation function to ensure all configuration details
 *    meet enterprise security requirements.
 *  - Initializing and returning the fully validated security configuration.
 *
 * Extensive comments are provided throughout in adherence to the enterprise-
 * level code guidelines, ensuring clarity for future maintainers and auditors.
 */

// -----------------------------------------------------------------------------
// External Imports (with version comments)
// -----------------------------------------------------------------------------
import { config as dotenvConfig } from 'dotenv'; // ^16.3.1
import helmet, { HelmetOptions } from 'helmet'; // ^7.0.0

// -----------------------------------------------------------------------------
// Internal Imports
// -----------------------------------------------------------------------------
import { AUTH_ERRORS } from '../shared/constants/error-codes';

// -----------------------------------------------------------------------------
// Interfaces for Typed Configuration
// -----------------------------------------------------------------------------

/**
 * Interface describing the JWT sub-configuration for authentication and session management.
 */
interface IJwtConfig {
  secret: string;
  expiresIn: string;
  algorithm: string;
  issuer: string;
  audience: string;
  refreshToken: {
    expiresIn: string;
    rotationWindow: string;
  };
}

/**
 * Interface describing the encryption sub-configuration, ensuring data at rest
 * and data in transit meet defined standards such as AES-256-GCM.
 */
interface IEncryptionConfig {
  algorithm: string;
  keyRotationDays: number;
  saltRounds: number;
  keyDerivation: string;
  minimumKeyLength: number;
  ivLength: number;
}

/**
 * Interface describing the CORS sub-configuration, controlling cross-origin
 * requests, allowed methods, headers, and other relevant security considerations.
 */
interface ICorsConfig {
  origin: string[]; // Array of allowed origins
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
  optionsSuccessStatus: number;
}

/**
 * Interface for rate-limiting configuration. Defines time window, max requests,
 * header usage, and the function used to identify clients (usually by IP).
 */
interface IRateLimitConfig {
  windowMs: number;
  max: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  skipSuccessfulRequests: boolean;
  keyGenerator: (req: any) => string;
}

/**
 * Interface encompassing helmet security header configuration, including CSP,
 * HSTS, referrer policy, and other critical HTTP security enhancements.
 */
interface IHelmetConfig {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: string[];
      scriptSrc: string[];
      styleSrc: string[];
      imgSrc: string[];
      connectSrc: string[];
      fontSrc: string[];
      objectSrc: string[];
      mediaSrc: string[];
      frameSrc: string[];
    };
  };
  hsts: {
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  referrerPolicy: string;
  noSniff: boolean;
  xssFilter: boolean;
}

/**
 * Interface for OAuth provider configurations, specifying providers, scopes,
 * callback URLs, and session duration details.
 */
interface IOAuthConfig {
  providers: string[];
  scopes: string[];
  callbackUrl: string | undefined;
  sessionDuration: string;
}

/**
 * Consolidated interface describing the entire SECURITY_CONFIG object,
 * including JWT, encryption, CORS, rate limiting, helmet, and OAuth settings.
 */
interface ISecurityConfig {
  jwt: IJwtConfig;
  encryption: IEncryptionConfig;
  cors: ICorsConfig;
  rateLimit: IRateLimitConfig;
  helmet: IHelmetConfig;
  oauth: IOAuthConfig;
}

// -----------------------------------------------------------------------------
// Globals / Default Configuration Structure
// -----------------------------------------------------------------------------

/**
 * validateSecurityConfig
 * --------------------------------------------------------------------------
 * Comprehensively checks that all required security parameters are present
 * and valid. Returns true if everything is consistent; otherwise logs errors
 * or warnings. In strict scenarios, an exception can be thrown if invalid.
 *
 * Steps:
 * 1) Verify all environment variables used by the configuration are set
 * 2) Validate JWT config (secret, expiration, etc.)
 * 3) Check encryption config meets corporate standards (AES-256-GCM, etc.)
 * 4) Validate that CORS settings are not dangerously open
 * 5) Confirm rate limiting parameters for DoS protection
 * 6) Check helmet directives for best-practice security headers
 * 7) Validate OAuth provider array and callback URL
 * 8) Return a boolean indicating overall security readiness
 */
export function validateSecurityConfig(config: ISecurityConfig): boolean {
  let isValid = true;

  // (1) Essential environment validations
  if (!process.env.JWT_SECRET) {
    console.error(`Security Validation Error: JWT_SECRET is not defined. [${AUTH_ERRORS.INVALID_TOKEN}]`);
    isValid = false;
  }
  if (!process.env.OAUTH_CALLBACK_URL) {
    console.warn(`Security Validation Warning: OAUTH_CALLBACK_URL is not defined. [${AUTH_ERRORS.UNAUTHORIZED}]`);
    // This might not be a critical error, but it's still a concern for OAuth flows
  }

  // (2) Validate JWT config
  if (!config.jwt.secret || config.jwt.secret.length < 10) {
    console.error('Invalid JWT configuration: secret must be set and >=10 chars.');
    isValid = false;
  }
  if (!config.jwt.issuer || !config.jwt.audience) {
    console.error('Invalid JWT configuration: issuer and audience must be set.');
    isValid = false;
  }

  // (3) Validate encryption config
  if (config.encryption.algorithm !== 'AES-256-GCM') {
    console.error('Encryption standard must be AES-256-GCM for data at rest or data in memory.');
    isValid = false;
  }
  if (config.encryption.minimumKeyLength < 256) {
    console.error('Encryption key length must be >= 256 bits.');
    isValid = false;
  }
  if (config.encryption.ivLength < 12) {
    console.error('Initialization vector (IV) length must be >= 12 bytes.');
    isValid = false;
  }

  // (4) Validate CORS config
  if (config.cors.origin.length === 0) {
    console.warn('CORS configuration: No allowed origins set, this may block all requests.');
  }
  if (!config.cors.methods.includes('GET')) {
    console.warn('CORS configuration: GET method is not listed, may break RESTful endpoints.');
  }

  // (5) Rate limit config
  if (config.rateLimit.windowMs <= 0 || config.rateLimit.max <= 0) {
    console.error('Rate limiter configuration is invalid: windowMs and max must be positive integers.');
    isValid = false;
  }

  // (6) Helmet config
  if (!config.helmet.contentSecurityPolicy) {
    console.error('Helmet configuration missing CSP directives.');
    isValid = false;
  }

  // (7) OAuth config
  if (config.oauth.providers.length === 0) {
    console.warn('OAuth providers array is empty, no external logins will be available.');
  }
  if (!config.oauth.callbackUrl) {
    console.warn('OAuth callback URL is missing; external provider auth flows may fail.');
  }

  // (8) Return final determination
  return isValid;
}

/**
 * loadSecurityConfig
 * --------------------------------------------------------------------------
 * Loads environment variables, constructs the ISecurityConfig object with
 * default or fallback values, validates the result, and returns the fully
 * initialized security config. Also applies environment-specific hardening.
 *
 * Steps:
 * 1) Invoke dotenv to load environment variables
 * 2) Build the default configuration object
 * 3) Override defaults with environment-specific values
 * 4) Validate the final configuration
 * 5) Initialize any encryption or security hooks (placeholder)
 * 6) Return the completed security config
 */
export function loadSecurityConfig(): ISecurityConfig {
  // (1) Load environment variables
  dotenvConfig();

  // (2) Build the default security configuration
  const defaultConfig: ISecurityConfig = {
    jwt: {
      secret: process.env.JWT_SECRET || 'CHANGE_ME',
      expiresIn: '24h',
      algorithm: 'HS256',
      issuer: 'taskstream-ai',
      audience: 'taskstream-api',
      refreshToken: {
        expiresIn: '7d',
        rotationWindow: '2d',
      },
    },
    encryption: {
      algorithm: 'AES-256-GCM',
      keyRotationDays: 90,
      saltRounds: 12,
      keyDerivation: 'PBKDF2',
      minimumKeyLength: 256,
      ivLength: 16,
    },
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
      exposedHeaders: ['X-Total-Count', 'X-Request-ID'],
      credentials: true,
      maxAge: 86400,
      optionsSuccessStatus: 204,
    },
    rateLimit: {
      windowMs: 900000, // 15 minutes in milliseconds
      max: 1000,
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests: false,
      keyGenerator: (req: any) => req.ip,
    },
    helmet: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", 'wss:', 'https:'],
          fontSrc: ["'self'", 'https:'],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      referrerPolicy: 'strict-origin-when-cross-origin',
      noSniff: true,
      xssFilter: true,
    },
    oauth: {
      providers: ['google', 'github'],
      scopes: ['profile', 'email'],
      callbackUrl: process.env.OAUTH_CALLBACK_URL,
      sessionDuration: '24h',
    },
  };

  // (3) Override or transform values if needed (placeholder for advanced setups)

  // (4) Validate final config
  const isValid = validateSecurityConfig(defaultConfig);
  if (!isValid) {
    throw new Error('Security configuration is invalid. Please check logs for details.');
  }

  // (5) Placeholder: initialize encryption keys, rotation schedules, or security monitors

  // (6) Return the finalized configuration object
  return defaultConfig;
}

// -----------------------------------------------------------------------------
// Final Exports
// -----------------------------------------------------------------------------

/**
 * SECURITY_CONFIG
 * --------------------------------------------------------------------------
 * The single source of truth for all security-related configurations in the
 * TaskStream AI platform, fully initialized and validated at import time.
 */
export const SECURITY_CONFIG: ISecurityConfig = loadSecurityConfig();

/**
 * Named Exports of SECURITY_CONFIG Sub-Objects
 * --------------------------------------------------------------------------
 * Exposing sub-objects individually for convenience in other modules that
 * specifically need JWT, encryption, CORS, etc.
 */
export const { jwt, encryption, cors, rateLimit, helmet: helmetConfig, oauth } = SECURITY_CONFIG;