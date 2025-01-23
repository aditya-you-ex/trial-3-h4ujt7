/**
 * This file defines core authentication and authorization interfaces, types, and enums
 * used across the TaskStream AI platform for user management, access control, and
 * authentication flows with enhanced security features and granular permissions.
 *
 * It addresses the following requirements from the Technical Specifications:
 *  1) Authentication & Authorization (7.1) - Implements comprehensive interfaces for OAuth2 flow,
 *     JWT tokens, MFA support, and advanced security.
 *  2) Security Architecture (2.4.2) - Defines secure identity management and access control
 *     structures with monitoring capabilities.
 *  3) Authorization Matrix (7.1.2) - Implements granular role-based access control and
 *     hierarchical role definitions.
 *
 * Leverages 'jsonwebtoken' for JWT payload definitions in alignment with the platform's
 * security architecture, ensuring consistency and best practices in identity management.
 */

////////////////////////////////////////////////////////////////////////////////////////////////////
// Imports
////////////////////////////////////////////////////////////////////////////////////////////////////

import type { JwtPayload } from 'jsonwebtoken'; // version ^9.0.0
import type { Metadata } from './common.interface';

////////////////////////////////////////////////////////////////////////////////////////////////////
// Enumerations
////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Enumerates all recognized user roles within the TaskStream AI platform.
 * Reflects the hierarchical role structure as specified in "7.1.2 Authorization Matrix."
 * Each role grants a specific set of permissions and restrictions.
 */
export enum UserRole {
  /**
   * Highest-level role authorized to manage system-wide settings, user permissions,
   * and other administrative functions.
   */
  ADMIN = 'ADMIN',

  /**
   * Role typically responsible for overseeing one or more projects, with privileges
   * to create tasks, assign resources, and review project status in detail.
   */
  PROJECT_MANAGER = 'PROJECT_MANAGER',

  /**
   * Role that leads a team, overseeing tasks within the team's scope. Holds
   * permissions to allocate tasks among team members and offer approvals.
   */
  TEAM_LEAD = 'TEAM_LEAD',

  /**
   * Standard contributor role with the ability to self-assign and manage tasks
   * relevant to development, as well as limited view permissions on project data.
   */
  DEVELOPER = 'DEVELOPER',

  /**
   * Read-only role intended for stakeholders who need visibility into project
   * progress but do not require direct task manipulation capabilities.
   */
  VIEWER = 'VIEWER',
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// Interfaces
////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Represents an enhanced user entity within the TaskStream AI platform, incorporating
 * specialized security properties (2.4.2 Security Architecture) and aligning with the
 * role-based access control scheme (7.1.2 Authorization Matrix).
 */
export interface IUser {
  /**
   * Unique identifier for the user entity. Typically generated by the platform
   * or identity provider upon user creation.
   */
  id: string;

  /**
   * Email address used for both unique identification and login credentials.
   * Must be validated for format and uniqueness.
   */
  email: string;

  /**
   * Hashed password stored securely (never in plain text), reflecting best
   * practices in credential management. This field should be excluded from
   * most user-facing responses.
   */
  password: string;

  /**
   * User's given name, primarily used for display in dashboards, notifications,
   * and personalized system messages.
   */
  firstName: string;

  /**
   * User's family name or surname, also used for display and identification
   * in collaborative features and reports.
   */
  lastName: string;

  /**
   * Enumerated role that governs access level and capabilities within the
   * TaskStream AI platform. Aligned with the “UserRole” enum and the
   * “Authorization Matrix” (7.1.2).
   */
  role: UserRole;

  /**
   * Optional additional permission strings that grant certain privileges
   * beyond or within a role's default scope (e.g., custom ACL-based permissions).
   */
  permissions: string[];

  /**
   * Indicates whether the user’s account is active or has been disabled,
   * e.g., after multiple failed login attempts or upon manual deactivation.
   */
  isActive: boolean;

  /**
   * Timestamp of the user's most recent successful login for audit logging
   * and security monitoring.
   */
  lastLogin: Date;

  /**
   * Number of consecutive failed login attempts. Used for account lock
   * or alert triggers after exceeding certain thresholds.
   */
  failedLoginAttempts: number;

  /**
   * Timestamp of the user’s last failed login attempt, useful for logging,
   * debugging authentication anomalies, and automated lockouts.
   */
  lastFailedLogin: Date;

  /**
   * Indicates whether Multi-Factor Authentication (MFA) is enabled for the user.
   * If enabled, the user’s login process requires a valid MFA token.
   */
  mfaEnabled: boolean;

  /**
   * Secret for the user’s MFA configuration, used for generating and validating
   * time-based or event-based one-time passwords. Must be encrypted and never
   * exposed as plain text.
   */
  mfaSecret: string;

  /**
   * Common metadata fields providing system-wide timestamps and versioning details
   * (e.g., createdAt, updatedAt, version). Enforces consistency with other entities
   * within the platform.
   */
  metadata: Metadata;
}

/**
 * Encapsulates the request payload required for user authentication, including
 * Multi-Factor Authentication (MFA) capabilities. This structure is used in the
 * login flow described in "7.1.1 Authentication Flow."
 */
export interface IAuthRequest {
  /**
   * Email address (or username) used for identifying the user during authentication.
   */
  email: string;

  /**
   * Password in plain text (only within the scope of transport/API request).
   * Must be hashed at or before persistence. Not stored in logs.
   */
  password: string;

  /**
   * One-time token generated in a user’s MFA application if the user has MFA
   * enabled. Mandatory if MFA is required for successful authentication.
   */
  mfaToken: string;
}

/**
 * Describes the successful or partially successful response issued upon
 * completion of the authentication process, including token details and whether
 * Multi-Factor Authentication is required.
 */
export interface IAuthResponse {
  /**
   * A short-lived token that grants the user access to the platform.
   * Typically encoded with user details (IJwtPayload).
   */
  accessToken: string;

  /**
   * Token that can be used to obtain a new access token once it expires, without
   * re-authenticating the user’s credentials.
   */
  refreshToken: string;

  /**
   * Time in seconds until the access token expires, useful for client-side timers
   * and automatic token refresh mechanisms.
   */
  expiresIn: number;

  /**
   * User object with private security fields (such as password, MFA secrets) omitted.
   * Provides essential identity info for client usage or UI personalization.
   */
  user: Omit<IUser, 'password' | 'mfaSecret'>;

  /**
   * Flag indicating whether this user is subject to an MFA requirement not yet satisfied.
   * If true, the system expects a valid MFA token to finalize authentication.
   */
  requiresMfa: boolean;
}

/**
 * Defines a custom payload structure for JWTs used within the platform,
 * integrating with the standard JwtPayload. Includes fields for tracking
 * roles, permissions, and MFA verification status.
 *
 * Corresponds directly with the security architecture in "2.4.2 Security Architecture"
 * and is integral to "7.1 Authentication & Authorization."
 */
export interface IJwtPayload extends JwtPayload {
  /**
   * Internal user identifier stored within the JWT for quick resolution of
   * the authenticated user in downstream services.
   */
  userId: string;

  /**
   * Email associated with the user’s account, often used for cross-referencing
   * or auditing events where user identity is required.
   */
  email: string;

  /**
   * Current role of the user, closed set from the “UserRole” enum. Facilitates
   * role-based access control checks at the service level.
   */
  role: UserRole;

  /**
   * Explicit list of permissions assigned to the user, enabling dynamic or
   * custom privileges beyond the role definition.
   */
  permissions: string[];

  /**
   * Unique identifier linking the session to any ephemeral session store
   * or auditing mechanisms for concurrency limits or security checks.
   */
  sessionId: string;

  /**
   * Boolean indicating that the user has satisfied Multi-Factor Authentication
   * requirements for this session. Helps enforce step-up authentication flows
   * in sensitive operations.
   */
  mfaVerified: boolean;
}

/**
 * Represents an OAuth-based external profile object, acquired from third-party
 * identity providers such as Google, GitHub, or LinkedIn. Accommodates seamlessly
 * linking external service identities to TaskStream AI user accounts.
 */
export interface IOAuthProfile {
  /**
   * The name of the OAuth provider (e.g., "google", "github") generating this profile.
   */
  provider: string;

  /**
   * Unique identifier assigned by the external provider to this account (often
   * distinct from the internal userId).
   */
  id: string;

  /**
   * Email address retrieved from the external profile. Validated during association
   * with TaskStream AI accounts, if needed.
   */
  email: string;

  /**
   * First name or given name from the external provider’s profile data.
   */
  firstName: string;

  /**
   * Last name or surname from the external provider’s profile data.
   */
  lastName: string;

  /**
   * Optional URL pointing to the user’s profile image or profile homepage
   * on the external provider’s platform.
   */
  profileUrl: string;

  /**
   * Additional arbitrary metadata from the external provider (e.g., locale,
   * custom claims, or profile preferences). Can be utilized to enrich
   * the user’s platform experience.
   */
  metadata: Record<string, any>;
}