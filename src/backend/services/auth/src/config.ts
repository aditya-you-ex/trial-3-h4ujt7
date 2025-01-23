/**
 * AUTHENTICATION SERVICE CONFIGURATION MODULE
 * -----------------------------------------------------------------------------
 * Centralizes configuration settings for the authentication service, covering:
 *  - OAuth2 providers (Google, Microsoft, etc.)
 *  - Database connections (URL, SSL, timeouts)
 *  - Service-level parameters (port, host, environment)
 *  - Session management (cookie, rolling, secure flags)
 *  - Security features (rate limiting, CORS, JWT, encryption)
 *
 * Implements:
 *  1) Authentication Flow (7.1.1): Configures OAuth2 flow, JWT token handling,
 *     multiple identity providers, and secure session settings.
 *  2) Security Protocols (7.3): Ensures secure authentication, monitoring,
 *     and compliance with enterprise-grade security standards.
 *  3) Data Security (7.2): Enforces encryption standards, SSL usage for
 *     production, and safe handling of sensitive environment variables.
 *
 * References:
 *  - SECURITY_CONFIG (imported) for JWT and encryption defaults
 *  - UserRole (imported) for validating default role constraints
 *  - dotenv for environment variable management
 */

////////////////////////////////////////////////////////////////////////////////
// External Imports
////////////////////////////////////////////////////////////////////////////////
import { config as dotenvConfig } from 'dotenv'; // ^16.3.1

////////////////////////////////////////////////////////////////////////////////
// Internal Imports
////////////////////////////////////////////////////////////////////////////////
import { jwt, encryption } from '../../../config/security';
import { UserRole } from '../../../shared/interfaces/auth.interface';

////////////////////////////////////////////////////////////////////////////////
// Interface Definitions for Auth Configuration
////////////////////////////////////////////////////////////////////////////////

/**
 * Describes the shape of the RateLimit portion, used in security configuration.
 */
interface IRateLimitSettings {
  windowMs: number;
  max: number;
}

/**
 * Describes the CORS sub-configuration, controlling cross-origin requests.
 */
interface ICorsSettings {
  origin: string | undefined;
  methods: string[];
  credentials: boolean;
}

/**
 * Encompasses Google provider settings for OAuth sub-configuration.
 */
interface IProviderGoogle {
  clientId: string | undefined;
  clientSecret: string | undefined;
  callbackUrl: string | undefined;
  scopes: string[];
  validateCerts: boolean;
}

/**
 * Encompasses Microsoft provider settings for OAuth sub-configuration.
 */
interface IProviderMicrosoft {
  clientId: string | undefined;
  clientSecret: string | undefined;
  callbackUrl: string | undefined;
  scopes: string[];
  validateCerts: boolean;
}

/**
 * Defines the structure of the Oauth sub-configuration, containing
 * multiple providers along with their security settings.
 */
interface IOAuthSettings {
  google: IProviderGoogle;
  microsoft: IProviderMicrosoft;
}

/**
 * Defines the Session sub-configuration, specifying session
 * handling parameters including cookie domain, security flags, etc.
 */
interface ISessionSettings {
  secret: string | undefined;
  maxAge: number;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  httpOnly: boolean;
  rolling: boolean;
  resave: boolean;
  saveUninitialized: boolean;
  cookie: {
    domain: string | undefined;
    path: string;
  };
}

/**
 * Describes the Security sub-configuration, including references
 * to the globally loaded JWT and encryption objects, as well as local
 * rate limiting and CORS parameters.
 */
interface ISecuritySettings {
  rateLimit: IRateLimitSettings;
  cors: ICorsSettings;
  jwt: typeof jwt;
  encryption: typeof encryption;
}

/**
 * Database configuration interface specifying the connection URL,
 * SSL usage, timeouts, and pooling limits for the authentication service.
 */
interface IDatabaseSettings {
  url: string | undefined;
  poolSize: number;
  ssl: boolean;
  connectionTimeout: number;
  idleTimeout: number;
  maxConnections: number;
  enableSSL: boolean;
}

/**
 * Service configuration interface capturing fundamental details
 * like port, host, environment name, and versioning.
 */
interface IServiceSettings {
  port: string | number;
  host: string;
  name: string;
  version: string;
  environment: string;
  logLevel: string;
}

/**
 * Top-level interface encompassing all authentication service settings.
 * This unified configuration object is validated and exposed at runtime.
 */
interface IAuthConfig {
  service: IServiceSettings;
  database: IDatabaseSettings;
  oauth: IOAuthSettings;
  session: ISessionSettings;
  security: ISecuritySettings;
}

////////////////////////////////////////////////////////////////////////////////
// Global Configuration Object
////////////////////////////////////////////////////////////////////////////////

/**
 * AUTH_CONFIG
 * -----------------------------------------------------------------------------
 * Represents the final, merged, and validated authentication service configuration.
 * It is constructed and exported through the loadAuthConfig workflow.
 */
let AUTH_CONFIG: IAuthConfig;

////////////////////////////////////////////////////////////////////////////////
// Validation Function
////////////////////////////////////////////////////////////////////////////////

/**
 * validateAuthConfig
 * -----------------------------------------------------------------------------
 * Validates the authentication service configuration settings with enhanced
 * security checks. Returns true if configuration is valid and meets the
 * enterprise security requirements, otherwise logs issues and may fail.
 *
 * Steps:
 * 1. Verify all required environment variables and key settings are set
 * 2. Validate service configuration (port, host, environment)
 * 3. Validate database settings (URL, SSL, connection parameters)
 * 4. Validate OAuth providers (clientId, clientSecret, certificate usage)
 * 5. Validate session security settings (secret, cookie parameters)
 * 6. Validate rate limiting and CORS configurations
 * 7. Ensure all sensitive configurations are properly protected
 * 8. Log / warn about discovered issues for security monitoring
 * 9. Return the overall validation result (true/false)
 *
 * Incorporates references to the UserRole enum to demonstrate
 * extended usage for access control validations if needed.
 *
 * @param config The assembled authentication configuration object
 * @returns boolean: true if valid, false otherwise
 */
export function validateAuthConfig(config: IAuthConfig): boolean {
  let isValid = true;
  const isProduction = config.service.environment === 'production';

  // EXAMPLE USAGE OF UserRole import: Validate default role environment variable
  // to highlight usage of the enumerated roles (ADMIN, PROJECT_MANAGER, etc).
  if (process.env.AUTH_DEFAULT_ROLE) {
    const allowedRoles = Object.values(UserRole);
    const defaultRole = process.env.AUTH_DEFAULT_ROLE;
    if (!allowedRoles.includes(defaultRole as UserRole)) {
      console.warn(
        `[AuthConfig Validation] Invalid default role "${defaultRole}". Allowed roles: ${allowedRoles.join(', ')}.`
      );
      isValid = false;
    }
  }

  // (1) Check essential environment variables
  if (!config.database.url) {
    console.error('[AuthConfig Validation] Missing AUTH_DB_URL environment variable.');
    isValid = false;
  }
  if (!config.session.secret) {
    console.error('[AuthConfig Validation] SESSION_SECRET is required but not set.');
    isValid = false;
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('[AuthConfig Validation] Google OAuth credentials are not fully set.');
  }
  if (!process.env.MS_CLIENT_ID || !process.env.MS_CLIENT_SECRET) {
    console.warn('[AuthConfig Validation] Microsoft OAuth credentials are not fully set.');
  }

  // (2) Validate service config
  if (!config.service.port || !config.service.host) {
    console.error('[AuthConfig Validation] Service port/host is not defined properly.');
    isValid = false;
  }

  // (3) Validate database settings (SSL for production, connection thresholds)
  if (isProduction && !config.database.ssl) {
    console.warn('[AuthConfig Validation] SSL should be enabled in production for DB connections.');
  }
  if (config.database.poolSize <= 0) {
    console.error('[AuthConfig Validation] Database poolSize must be > 0.');
    isValid = false;
  }

  // (4) Validate OAuth provider configurations
  if (!config.oauth.google.clientId || !config.oauth.microsoft.clientId) {
    console.warn('[AuthConfig Validation] At least one OAuth provider is missing necessary clientId.');
  }
  if (config.oauth.google.validateCerts && !config.oauth.google.callbackUrl) {
    console.warn('[AuthConfig Validation] Google OAuth callback URL is undefined but validateCerts is true.');
  }
  if (config.oauth.microsoft.validateCerts && !config.oauth.microsoft.callbackUrl) {
    console.warn('[AuthConfig Validation] Microsoft OAuth callback URL is undefined but validateCerts is true.');
  }

  // (5) Validate session security settings
  if (isProduction && !config.session.secure) {
    console.warn('[AuthConfig Validation] Session cookie "secure" should be true in production.');
  }

  // (6) Validate rate limiting and CORS
  if (config.security.rateLimit.windowMs <= 0 || config.security.rateLimit.max <= 0) {
    console.error('[AuthConfig Validation] Rate limit windowMs and max must be positive integers.');
    isValid = false;
  }
  if (!config.security.cors.origin) {
    console.warn('[AuthConfig Validation] No CORS origin defined, might block external requests.');
  }

  // (7) Ensure sensitive configurations (jwt secret, encryption policies) are present
  if (!config.security.jwt.secret) {
    console.error('[AuthConfig Validation] Missing essential JWT secret in SecurityConfig.');
    isValid = false;
  }
  if (config.security.encryption.algorithm !== 'AES-256-GCM') {
    console.error('[AuthConfig Validation] Encryption must use AES-256-GCM.');
    isValid = false;
  }

  // (8) Log final validation results
  if (isValid) {
    console.info('[AuthConfig Validation] Configuration successfully validated.');
  } else {
    console.error('[AuthConfig Validation] One or more configuration checks failed.');
  }

  // (9) Return the result
  return isValid;
}

////////////////////////////////////////////////////////////////////////////////
// Load Configuration Function
////////////////////////////////////////////////////////////////////////////////

/**
 * loadAuthConfig
 * -----------------------------------------------------------------------------
 * Loads and initializes the authentication service configuration with
 * enterprise-level security enhancements. Leverages environment variables,
 * default values, and merges contents from the SECURITY_CONFIG (jwt, encryption).
 *
 * Steps:
 * 1. Load environment variables using dotenv with security checks
 * 2. Initialize configuration object with default or fallback values
 * 3. Merge with security configuration from SECURITY_CONFIG
 * 4. Apply environment-specific security settings if needed
 * 5. Validate the complete configuration using validateAuthConfig
 * 6. Set up configuration change monitoring (placeholder)
 * 7. Initialize secure session-related details
 * 8. Log configuration initialization for auditing
 * 9. Return the validated configuration object
 *
 * @returns IAuthConfig - The final, validated authentication configuration
 */
export function loadAuthConfig(): IAuthConfig {
  // (1) Load environment variables
  dotenvConfig();

  const isProduction = process.env.NODE_ENV === 'production';

  // (2) Initialize configuration object with fallback values
  const config: IAuthConfig = {
    service: {
      port: process.env.AUTH_SERVICE_PORT || 3001,
      host: process.env.AUTH_SERVICE_HOST || '0.0.0.0',
      name: 'auth-service',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      logLevel: process.env.LOG_LEVEL || 'info',
    },
    database: {
      url: process.env.AUTH_DB_URL,
      poolSize: parseInt(process.env.AUTH_DB_POOL_SIZE || '10', 10),
      ssl: isProduction,
      connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000', 10),
      idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '10000', 10),
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '50', 10),
      enableSSL: isProduction,
    },
    oauth: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl: process.env.GOOGLE_CALLBACK_URL,
        scopes: ['profile', 'email'],
        validateCerts: true,
      },
      microsoft: {
        clientId: process.env.MS_CLIENT_ID,
        clientSecret: process.env.MS_CLIENT_SECRET,
        callbackUrl: process.env.MS_CALLBACK_URL,
        scopes: ['user.read', 'profile', 'email'],
        validateCerts: true,
      },
    },
    session: {
      secret: process.env.SESSION_SECRET,
      maxAge: 86400000,
      secure: isProduction,
      sameSite: 'strict',
      httpOnly: true,
      rolling: true,
      resave: false,
      saveUninitialized: false,
      cookie: {
        domain: process.env.COOKIE_DOMAIN,
        path: '/',
      },
    },
    security: {
      rateLimit: {
        windowMs: 900000,
        max: 100,
      },
      cors: {
        origin: process.env.CORS_ORIGIN,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        credentials: true,
      },
      // (3) Merging with security configuration from SECURITY_CONFIG
      jwt,
      encryption,
    },
  };

  // (4) Apply environment-specific adjustments if needed (placeholder)

  // (5) Validate the final configuration
  const valid = validateAuthConfig(config);
  if (!valid) {
    throw new Error('AUTH_CONFIG validation failed. Check logs for details.');
  }

  // (6) Set up configuration change monitoring (placeholder)

  // (7) Initialize any additional session or secure settings if needed (placeholder)

  // (8) Log successful configuration load
  console.info('[AuthConfig] Authentication configuration successfully loaded.');

  // (9) Return the validated configuration
  return config;
}

////////////////////////////////////////////////////////////////////////////////
// Initialize and Export
////////////////////////////////////////////////////////////////////////////////

/**
 * Immediately load and cache the AUTH_CONFIG object so it's available
 * throughout the authentication service without repetitive initialization.
 */
AUTH_CONFIG = loadAuthConfig();

/**
 * Exporting the top-level configuration object and its key members
 * as named exports to simplify usage within other modules.
 */
export { AUTH_CONFIG };
export const { service, database, oauth, session, security } = AUTH_CONFIG;