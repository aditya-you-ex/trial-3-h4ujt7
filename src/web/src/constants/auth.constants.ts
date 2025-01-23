/**
 * TaskStream AI - Authentication Constants
 * -----------------------------------------------------------------------------
 * This file defines a comprehensive set of constants related to user
 * authentication, role-based access control, OAuth integrations, error messages,
 * and security configurations for the TaskStream AI web application. It
 * addresses the Authentication Flow (Technical Specifications §7.1.1),
 * Security Protocols (§7.3), and Authorization Matrix (§7.1.2).
 *
 * References:
 *  - src/web/src/types/auth.types.ts (importing UserRole enum for role-based
 *    access control).
 *  - Technical Specifications, especially sections 7.1.1, 7.3, 7.1.2.
 */

import { UserRole } from '../types/auth.types';

/**
 * AUTH_STORAGE_KEYS
 * -----------------------------------------------------------------------------
 * Defines the various keys used to securely store tokens, user data, and other
 * session-related fields in localStorage or sessionStorage. Each member is
 * named-exported for granular usage, satisfying the requirement for explicit
 * exports of individual properties.
 */
export const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'taskstream_v1_access_token',
  REFRESH_TOKEN: 'taskstream_v1_refresh_token',
  USER_DATA: 'taskstream_v1_user_data',
  OAUTH_STATE: 'taskstream_v1_oauth_state',
  ENCRYPTION_KEY: 'taskstream_v1_encryption_key',
  SESSION_ID: 'taskstream_v1_session_id',
} as const;

export const ACCESS_TOKEN = AUTH_STORAGE_KEYS.ACCESS_TOKEN;
export const REFRESH_TOKEN = AUTH_STORAGE_KEYS.REFRESH_TOKEN;
export const USER_DATA = AUTH_STORAGE_KEYS.USER_DATA;
export const OAUTH_STATE = AUTH_STORAGE_KEYS.OAUTH_STATE;
export const ENCRYPTION_KEY = AUTH_STORAGE_KEYS.ENCRYPTION_KEY;
export const SESSION_ID = AUTH_STORAGE_KEYS.SESSION_ID;

/**
 * AUTH_API_ENDPOINTS
 * -----------------------------------------------------------------------------
 * Enumerates the versioned API endpoint paths used for authentication
 * operations. Each endpoint is designed to integrate seamlessly with
 * the server-side routes specified in the overall backend architecture.
 */
export const AUTH_API_ENDPOINTS = {
  LOGIN: '/api/v1/auth/login',
  REGISTER: '/api/v1/auth/register',
  LOGOUT: '/api/v1/auth/logout',
  REFRESH_TOKEN: '/api/v1/auth/refresh',
  RESET_PASSWORD: '/api/v1/auth/reset-password',
  OAUTH_GOOGLE: '/api/v1/auth/google',
  OAUTH_GITHUB: '/api/v1/auth/github',
  VERIFY_EMAIL: '/api/v1/auth/verify-email',
} as const;

export const LOGIN = AUTH_API_ENDPOINTS.LOGIN;
export const REGISTER = AUTH_API_ENDPOINTS.REGISTER;
export const LOGOUT = AUTH_API_ENDPOINTS.LOGOUT;
export const REFRESH_TOKEN_ENDPOINT = AUTH_API_ENDPOINTS.REFRESH_TOKEN;
export const RESET_PASSWORD = AUTH_API_ENDPOINTS.RESET_PASSWORD;
export const OAUTH_GOOGLE = AUTH_API_ENDPOINTS.OAUTH_GOOGLE;
export const OAUTH_GITHUB = AUTH_API_ENDPOINTS.OAUTH_GITHUB;
export const VERIFY_EMAIL = AUTH_API_ENDPOINTS.VERIFY_EMAIL;

/**
 * AUTH_HTTP_METHODS
 * -----------------------------------------------------------------------------
 * Defines the HTTP methods to be used when calling each respective authentication
 * endpoint, ensuring consistent usage of RESTful conventions and alignment with
 * the system's communication patterns.
 */
export const AUTH_HTTP_METHODS = {
  LOGIN: 'POST',
  REGISTER: 'POST',
  LOGOUT: 'POST',
  REFRESH_TOKEN: 'POST',
  RESET_PASSWORD: 'POST',
  VERIFY_EMAIL: 'POST',
  OAUTH_CALLBACK: 'GET',
} as const;

export const LOGIN_METHOD = AUTH_HTTP_METHODS.LOGIN;
export const REGISTER_METHOD = AUTH_HTTP_METHODS.REGISTER;
export const LOGOUT_METHOD = AUTH_HTTP_METHODS.LOGOUT;
export const REFRESH_TOKEN_METHOD = AUTH_HTTP_METHODS.REFRESH_TOKEN;
export const RESET_PASSWORD_METHOD = AUTH_HTTP_METHODS.RESET_PASSWORD;
export const VERIFY_EMAIL_METHOD = AUTH_HTTP_METHODS.VERIFY_EMAIL;
export const OAUTH_CALLBACK_METHOD = AUTH_HTTP_METHODS.OAUTH_CALLBACK;

/**
 * AUTH_TIMEOUTS
 * -----------------------------------------------------------------------------
 * Specifies the time-based constraints for tokens, sessions, rate-limiting
 * windows, and other critical operations in the authentication process to
 * ensure security and optimal performance.
 */
export const AUTH_TIMEOUTS = {
  ACCESS_TOKEN_EXPIRY: 3600,     // 1 hour
  REFRESH_TOKEN_EXPIRY: 604800,  // 7 days
  SESSION_EXPIRY: 86400,         // 24 hours
  VERIFICATION_EXPIRY: 3600,     // 1 hour
  RATE_LIMIT_WINDOW: 300,        // 5 minutes
  REQUEST_TIMEOUT: 30000,        // 30 seconds (in ms)
} as const;

export const ACCESS_TOKEN_EXPIRY = AUTH_TIMEOUTS.ACCESS_TOKEN_EXPIRY;
export const REFRESH_TOKEN_EXPIRY = AUTH_TIMEOUTS.REFRESH_TOKEN_EXPIRY;
export const SESSION_EXPIRY = AUTH_TIMEOUTS.SESSION_EXPIRY;
export const VERIFICATION_EXPIRY = AUTH_TIMEOUTS.VERIFICATION_EXPIRY;
export const RATE_LIMIT_WINDOW = AUTH_TIMEOUTS.RATE_LIMIT_WINDOW;
export const REQUEST_TIMEOUT = AUTH_TIMEOUTS.REQUEST_TIMEOUT;

/**
 * AUTH_ERROR_MESSAGES
 * -----------------------------------------------------------------------------
 * Provides a standardized list of error messages related to authentication
 * and authorization, supporting internationalization efforts and ensuring
 * consistent user-facing error handling.
 */
export const AUTH_ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_LOCKED: 'Account has been locked due to multiple failed attempts',
  SESSION_EXPIRED: 'Your session has expired. Please login again',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  EMAIL_NOT_VERIFIED: 'Please verify your email address',
  INVALID_TOKEN: 'Invalid or expired token',
  OAUTH_ERROR: 'Authentication failed with provider',
  RATE_LIMIT_EXCEEDED: 'Too many attempts. Please try again later',
  MAINTENANCE_MODE: 'System is under maintenance. Please try again later',
  ROLE_PERMISSION_DENIED: 'Your role does not have permission for this action',
  INVALID_SESSION: 'Invalid or expired session',
  ACCOUNT_DISABLED: 'Account has been disabled. Please contact support',
} as const;

export const INVALID_CREDENTIALS = AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS;
export const ACCOUNT_LOCKED = AUTH_ERROR_MESSAGES.ACCOUNT_LOCKED;
export const SESSION_EXPIRED = AUTH_ERROR_MESSAGES.SESSION_EXPIRED;
export const UNAUTHORIZED = AUTH_ERROR_MESSAGES.UNAUTHORIZED;
export const EMAIL_NOT_VERIFIED = AUTH_ERROR_MESSAGES.EMAIL_NOT_VERIFIED;
export const INVALID_TOKEN = AUTH_ERROR_MESSAGES.INVALID_TOKEN;
export const OAUTH_ERROR = AUTH_ERROR_MESSAGES.OAUTH_ERROR;
export const RATE_LIMIT_EXCEEDED = AUTH_ERROR_MESSAGES.RATE_LIMIT_EXCEEDED;
export const MAINTENANCE_MODE = AUTH_ERROR_MESSAGES.MAINTENANCE_MODE;
export const ROLE_PERMISSION_DENIED = AUTH_ERROR_MESSAGES.ROLE_PERMISSION_DENIED;
export const INVALID_SESSION = AUTH_ERROR_MESSAGES.INVALID_SESSION;
export const ACCOUNT_DISABLED = AUTH_ERROR_MESSAGES.ACCOUNT_DISABLED;

/**
 * AUTH_ROUTES
 * -----------------------------------------------------------------------------
 * Enumerates the frontend route paths for screens and pages pertinent to user
 * authentication, thereby supporting a centralized mapping for all login,
 * registration, and related pages.
 */
export const AUTH_ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  OAUTH_CALLBACK: '/oauth/callback',
} as const;

export const LOGIN_ROUTE = AUTH_ROUTES.LOGIN;
export const REGISTER_ROUTE = AUTH_ROUTES.REGISTER;
export const RESET_PASSWORD_ROUTE = AUTH_ROUTES.RESET_PASSWORD;
export const VERIFY_EMAIL_ROUTE = AUTH_ROUTES.VERIFY_EMAIL;
export const OAUTH_CALLBACK_ROUTE = AUTH_ROUTES.OAUTH_CALLBACK;

/**
 * AUTH_OAUTH_CONFIG
 * -----------------------------------------------------------------------------
 * Outlines configuration data for OAuth 2.0 providers such as Google and GitHub,
 * including required scopes, callback paths, and other essential fields.
 */
export const AUTH_OAUTH_CONFIG = {
  GOOGLE_SCOPES: ['email', 'profile'],
  GITHUB_SCOPES: ['user:email', 'read:user'],
  STATE_LENGTH: 32,
  REDIRECT_PATH: '/oauth/callback',
  PROVIDERS: ['google', 'github'],
} as const;

export const GOOGLE_SCOPES = AUTH_OAUTH_CONFIG.GOOGLE_SCOPES;
export const GITHUB_SCOPES = AUTH_OAUTH_CONFIG.GITHUB_SCOPES;
export const STATE_LENGTH = AUTH_OAUTH_CONFIG.STATE_LENGTH;
export const REDIRECT_PATH = AUTH_OAUTH_CONFIG.REDIRECT_PATH;
export const OAUTH_PROVIDERS = AUTH_OAUTH_CONFIG.PROVIDERS;

/**
 * AUTH_SECURITY_CONFIG
 * -----------------------------------------------------------------------------
 * Centralizes various security settings that govern login attempts, password
 * complexity, multi-factor authentication (MFA), and session renewal.
 */
export const AUTH_SECURITY_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 1800, // 30 minutes
  PASSWORD_MIN_LENGTH: 12,
  REQUIRE_SPECIAL_CHARS: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_UPPERCASE: true,
  MFA_ENABLED: true,
  SESSION_RENEW_THRESHOLD: 300, // 5 minutes before expiry
} as const;

export const MAX_LOGIN_ATTEMPTS = AUTH_SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS;
export const LOCKOUT_DURATION = AUTH_SECURITY_CONFIG.LOCKOUT_DURATION;
export const PASSWORD_MIN_LENGTH = AUTH_SECURITY_CONFIG.PASSWORD_MIN_LENGTH;
export const REQUIRE_SPECIAL_CHARS = AUTH_SECURITY_CONFIG.REQUIRE_SPECIAL_CHARS;
export const REQUIRE_NUMBERS = AUTH_SECURITY_CONFIG.REQUIRE_NUMBERS;
export const REQUIRE_UPPERCASE = AUTH_SECURITY_CONFIG.REQUIRE_UPPERCASE;
export const MFA_ENABLED = AUTH_SECURITY_CONFIG.MFA_ENABLED;
export const SESSION_RENEW_THRESHOLD = AUTH_SECURITY_CONFIG.SESSION_RENEW_THRESHOLD;

/**
 * AUTH_ROLE_PERMISSIONS
 * -----------------------------------------------------------------------------
 * Defines role-based access control (RBAC) constants aligning with the UserRole
 * enum (Technical Specifications §7.1.2). Each role is mapped to a list of
 * permission labels indicating the actions that role can perform. This object
 * serves as a baseline for advanced permission checks or expansions for
 * attribute-based access control (ABAC).
 */
export const AUTH_ROLE_PERMISSIONS: Readonly<Record<UserRole, ReadonlyArray<string>>> = {
  [UserRole.ADMIN]: ['ALL'],
  [UserRole.PROJECT_MANAGER]: [
    'CREATE_PROJECT',
    'EDIT_PROJECT',
    'VIEW_PROJECT',
    'MANAGE_TEAM',
    'VIEW_ANALYTICS',
  ],
  [UserRole.TEAM_LEAD]: [
    'CREATE_TASK',
    'EDIT_TASK',
    'ASSIGN_TASK',
    'VIEW_PROJECT',
    'VIEW_ANALYTICS',
  ],
  [UserRole.DEVELOPER]: [
    'CREATE_TASK',
    'EDIT_TASK',
    'SELF_ASSIGN',
    'VIEW_PROJECT',
  ],
  [UserRole.VIEWER]: [
    'VIEW_PROJECT',
  ],
} as const;