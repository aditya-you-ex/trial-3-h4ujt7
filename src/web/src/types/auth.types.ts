/**
 * Project: TaskStream AI
 * File: auth.types.ts
 * -----------------------------------------------------------------------------
 * This file defines TypeScript interfaces, types, and enumerations responsible
 * for managing authentication, authorization, and user-related data in the
 * TaskStream AI web application. All fields are declared as readonly whenever
 * possible to enforce immutability for enhanced security and data integrity,
 * in alignment with sections 7.1 (Authentication & Authorization) and 2.4.2
 * (Security Architecture) of the Technical Specifications.
 *
 * Dependencies:
 *   - Internal: ApiResponse<T> (from ../types/common.types)
 *   - External: None
 *
 * Note:
 *   - All roles, interfaces, and types strictly follow the Authorization Matrix
 *     in section 7.1.2 and maintain enterprise-grade security measures.
 */

import type { ApiResponse } from '../types/common.types'; // Internal import for type-safe API responses

/**
 * Enum: UserRole
 * -----------------------------------------------------------------------------
 * Purpose:
 *   Enumerates all possible user roles within the TaskStream AI platform,
 *   strictly reflecting the Authorization Matrix defined in section 7.1.2
 *   of the Technical Specifications.
 *
 * Members:
 *   ADMIN           => Highest-level privileges (Full Access)
 *   PROJECT_MANAGER => Management of projects and resources
 *   TEAM_LEAD       => Supervisory tasks for team-based scoping
 *   DEVELOPER       => Standard task execution and self-scope operations
 *   VIEWER          => Read-only/checker capabilities
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  TEAM_LEAD = 'TEAM_LEAD',
  DEVELOPER = 'DEVELOPER',
  VIEWER = 'VIEWER',
}

/**
 * Interface: User
 * -----------------------------------------------------------------------------
 * Purpose:
 *   Represents a fully realized user entity within the web application,
 *   including role-based permissions. Each field is immutable (readonly)
 *   to satisfy the security requirements for user data integrity.
 *
 * Fields:
 *   - id: The unique identifier for this user (UUID string).
 *   - email: The user's email address (unique credential).
 *   - firstName: The user's first name.
 *   - lastName: The user's last name.
 *   - role: The UserRole enum value assigned to this user.
 *   - permissions: A strictly ReadonlyArray of string-based permissions that
 *                  further refine the role-based access control logic.
 *   - isActive: Boolean flag indicating if the user's account is enabled.
 *   - lastLogin: The Date/time of the user's most recent login.
 *
 * References:
 *   - Technical Specifications, 7.1.2 Authorization Matrix
 */
export interface User {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: UserRole;
  readonly permissions: ReadonlyArray<string>;
  readonly isActive: boolean;
  readonly lastLogin: Date;
}

/**
 * Interface: LoginRequest
 * -----------------------------------------------------------------------------
 * Purpose:
 *   Defines the shape of the payload that the client must provide
 *   to initiate an authentication attempt using TaskStream AI's
 *   standard username/password flow.
 *
 * Fields:
 *   - email: The user's email address.
 *   - password: The user's plaintext password (secured in transit).
 *
 * Security:
 *   - Aligned with 7.1.1 Authentication Flow; 
 *   - Both fields are immutable to prevent inadvertent manipulation.
 */
export interface LoginRequest {
  readonly email: string;
  readonly password: string;
}

/**
 * Interface: AuthResponse
 * -----------------------------------------------------------------------------
 * Purpose:
 *   Conveys the result of successful authentication or token refresh
 *   operations, featuring the key tokens and the authenticated user's
 *   current state.
 *
 * Fields:
 *   - accessToken: The active JWT for resource access, enforcing short-lived
 *                  token usage for security.
 *   - refreshToken: The token used to refresh the session without re-login.
 *   - tokenExpiry: The exact date/time the access token expires.
 *   - user: The immutable user details (wrapped in a Readonly).
 *
 * References:
 *   - Technical Specifications, 7.1 Authentication & Authorization
 */
export interface AuthResponse {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly tokenExpiry: Date;
  readonly user: Readonly<User>;
}

/**
 * Enum: OAuthProvider
 * -----------------------------------------------------------------------------
 * Purpose:
 *   Lists the supported OAuth 2.0 providers for the TaskStream AI platform,
 *   such as Google or GitHub. This aligns with future expansions in
 *   external identity management.
 *
 * Members:
 *   - GOOGLE
 *   - GITHUB
 */
export enum OAuthProvider {
  GOOGLE = 'GOOGLE',
  GITHUB = 'GITHUB',
}

/**
 * Interface: OAuthProfile
 * -----------------------------------------------------------------------------
 * Purpose:
 *   Encapsulates user information returned after a successful OAuth 2.0
 *   flow with an external provider, ensuring consistent integration
 *   with the platform's identity model.
 *
 * Fields:
 *   - provider: One of the supported OAuthProvider enum values.
 *   - id: Unique user identifier from the external provider.
 *   - email: The email address retrieved via OAuth.
 *   - firstName: The given name from the external service.
 *   - lastName: The surname from the external service.
 *   - avatarUrl: A URL to the user’s profile/avatar image, or null if
 *                not provided.
 */
export interface OAuthProfile {
  readonly provider: OAuthProvider;
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly avatarUrl: string | null;
}

/**
 * Interface: AuthState
 * -----------------------------------------------------------------------------
 * Purpose:
 *   Tracks the high-level authentication status for the Redux or global
 *   application store, mandating strong null checks for user identity
 *   while ensuring loading and error states are consistently managed.
 *
 * Fields:
 *   - isAuthenticated: Indicates if the user currently has permission
 *                      to access protected routes.
 *   - user: A Readonly<User> object or null if not yet authenticated.
 *   - loading: Reflects whether an auth operation (login, refresh) is in progress.
 *   - error: A string or null indicating if a recent auth operation failed.
 *
 * References:
 *   - Technical Specifications, 2.4.2 Security Architecture
 *   - Matches enterprise-grade state handling best practices.
 */
export interface AuthState {
  readonly isAuthenticated: boolean;
  readonly user: Readonly<User> | null;
  readonly loading: boolean;
  readonly error: string | null;
}

/**
 * Type: AuthApiResponse
 * -----------------------------------------------------------------------------
 * Purpose:
 *   A specialized version of the ApiResponse<T> interface (imported from
 *   ../types/common.types) to handle server responses for authentication
 *   flows (e.g., login, token refresh). This usage satisfies the requirement
 *   to leverage status and data properties from ApiResponse.
 *
 * Usage:
 *   Used by the frontend to parse standard authentication responses
 *   according to the format:
 *   {
 *     status: <HTTP_STATUS>,
 *     message: "...",
 *     data: { 
 *       accessToken: "...",
 *       refreshToken: "...",
 *       user: { ... }
 *     } | null,
 *     errors: [],
 *     timestamp: Date
 *   }
 */
export type AuthApiResponse = ApiResponse<AuthResponse>;