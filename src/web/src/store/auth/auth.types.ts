/**
 * File: auth.types.ts
 * -----------------------------------------------------------------------------
 * This file defines the types, interfaces, and enumerations used in Redux
 * authentication state management for TaskStream AI. It adheres to the advanced
 * security considerations in sections 7.1.1 (Authentication Flow), 7.1.2
 * (Authorization Matrix), and 7.2.1 (Encryption Standards) of the Technical
 * Specifications, ensuring robust, type-safe, and enterprise-grade code.
 *
 * All properties are declared as readonly whenever possible to maintain
 * data integrity and align with enterprise security standards. The import paths
 * are structured to reference shared authentication models in the ../../types
 * directory, where user and base authentication token definitions reside.
 */

import {
  User,
  AuthResponse as SourceAuthResponse,
} from '../../types/auth.types';

/**
 * Enum: AuthLoadingState
 * -----------------------------------------------------------------------------
 * Represents the possible loading phases of any authentication process,
 * aligning closely with best practices for asynchronous state handling in Redux.
 *
 * Members:
 *   - IDLE:      No authentication action is in progress.
 *   - PENDING:   An authentication operation (e.g., login) is currently pending.
 *   - SUCCESS:   The authentication operation completed successfully.
 *   - ERROR:     The authentication operation encountered a failure.
 */
export enum AuthLoadingState {
  IDLE = 'IDLE',
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

/**
 * Enum: AuthActionTypes
 * -----------------------------------------------------------------------------
 * Enumerates all the action types associated with the authentication flow,
 * covering both standard username/password login and OAuth integration.
 *
 * Members:
 *   - LOGIN_REQUEST             => Initiates login sequence
 *   - LOGIN_SUCCESS             => Login operation succeeded
 *   - LOGIN_FAILURE             => Login operation failed
 *   - LOGOUT                    => Logs the user out of the application
 *   - REFRESH_TOKEN_REQUEST     => Begins token refresh operation
 *   - REFRESH_TOKEN_SUCCESS     => Token refresh succeeded
 *   - REFRESH_TOKEN_FAILURE     => Token refresh failed
 *   - OAUTH_LOGIN_REQUEST       => Begins external OAuth login flow
 *   - OAUTH_LOGIN_SUCCESS       => OAuth login succeeded
 *   - OAUTH_LOGIN_FAILURE       => OAuth login failed
 */
export enum AuthActionTypes {
  LOGIN_REQUEST = 'LOGIN_REQUEST',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  REFRESH_TOKEN_REQUEST = 'REFRESH_TOKEN_REQUEST',
  REFRESH_TOKEN_SUCCESS = 'REFRESH_TOKEN_SUCCESS',
  REFRESH_TOKEN_FAILURE = 'REFRESH_TOKEN_FAILURE',
  OAUTH_LOGIN_REQUEST = 'OAUTH_LOGIN_REQUEST',
  OAUTH_LOGIN_SUCCESS = 'OAUTH_LOGIN_SUCCESS',
  OAUTH_LOGIN_FAILURE = 'OAUTH_LOGIN_FAILURE',
}

/**
 * Interface: AuthResponse
 * -----------------------------------------------------------------------------
 * Overrides the base AuthResponse by removing unsupported fields and renaming
 * the expiry property to a numeric form, as mandated by the JSON specification.
 * Aligned with internal security protocols in 7.2.1 (Encryption Standards).
 *
 * Fields:
 *   - accessToken => JWT used to access protected resources
 *   - refreshToken => Token used to generate a new accessToken
 *   - expiresAt => Numeric expiration (UNIX epoch) for the accessToken
 */
export interface AuthResponse
  extends Omit<SourceAuthResponse, 'tokenExpiry' | 'user'> {
  readonly expiresAt: number;
}

/**
 * Interface: AuthState
 * -----------------------------------------------------------------------------
 * Defines the shape of authentication-related data in the Redux store,
 * incorporating references to the user entity, token details, and error
 * handling. Aligns with the 7.1 (Authentication & Authorization) specifications,
 * enforcing secure token storage and robust null checking.
 *
 * Fields:
 *   - isAuthenticated => Indicates if a valid session is active
 *   - loadingState    => Represents the stage of any ongoing authentication
 *   - user            => The authenticated user or null
 *   - token           => The active AuthResponse (tokens) or null
 *   - error           => Error message if the last operation failed
 *   - tokenExpiry     => Numeric expiration timestamp for the session
 */
export interface AuthState {
  readonly isAuthenticated: boolean;
  readonly loadingState: AuthLoadingState;
  readonly user: User | null;
  readonly token: AuthResponse | null;
  readonly error: string | null;
  readonly tokenExpiry: number | null;
}

/**
 * Interface: LoginRequestAction
 * -----------------------------------------------------------------------------
 * Dispatched when a user initiates a standard login flow.
 * Contains the credentials used for authentication.
 */
export interface LoginRequestAction {
  readonly type: AuthActionTypes.LOGIN_REQUEST;
  readonly payload: {
    readonly email: string;
    readonly password: string;
  };
}

/**
 * Interface: LoginSuccessAction
 * -----------------------------------------------------------------------------
 * Dispatched upon successful authentication, carrying user details and token.
 */
export interface LoginSuccessAction {
  readonly type: AuthActionTypes.LOGIN_SUCCESS;
  readonly payload: {
    readonly user: User;
    readonly token: AuthResponse;
  };
}

/**
 * Interface: LoginFailureAction
 * -----------------------------------------------------------------------------
 * Dispatched when login fails, containing an appropriate error message.
 */
export interface LoginFailureAction {
  readonly type: AuthActionTypes.LOGIN_FAILURE;
  readonly payload: {
    readonly error: string;
  };
}

/**
 * Interface: LogoutAction
 * -----------------------------------------------------------------------------
 * Dispatched to terminate the current session, clearing user and token data.
 */
export interface LogoutAction {
  readonly type: AuthActionTypes.LOGOUT;
}

/**
 * Interface: RefreshTokenRequestAction
 * -----------------------------------------------------------------------------
 * Triggered when a token refresh operation is initiated (e.g., near expiration).
 */
export interface RefreshTokenRequestAction {
  readonly type: AuthActionTypes.REFRESH_TOKEN_REQUEST;
  readonly payload: {
    readonly refreshToken: string;
  };
}

/**
 * Interface: RefreshTokenSuccessAction
 * -----------------------------------------------------------------------------
 * Dispatched upon a successful token refresh, delivering the updated tokens.
 */
export interface RefreshTokenSuccessAction {
  readonly type: AuthActionTypes.REFRESH_TOKEN_SUCCESS;
  readonly payload: {
    readonly token: AuthResponse;
  };
}

/**
 * Interface: RefreshTokenFailureAction
 * -----------------------------------------------------------------------------
 * Dispatched when a token refresh fails, mapping to the corresponding error.
 */
export interface RefreshTokenFailureAction {
  readonly type: AuthActionTypes.REFRESH_TOKEN_FAILURE;
  readonly payload: {
    readonly error: string;
  };
}

/**
 * Interface: OAuthLoginRequestAction
 * -----------------------------------------------------------------------------
 * Initiates an external OAuth 2.0 flow for supported providers (e.g., Google).
 */
export interface OAuthLoginRequestAction {
  readonly type: AuthActionTypes.OAUTH_LOGIN_REQUEST;
  readonly payload: {
    readonly provider: string;
  };
}

/**
 * Interface: OAuthLoginSuccessAction
 * -----------------------------------------------------------------------------
 * Dispatched after a successful OAuth exchange, containing new user and token.
 */
export interface OAuthLoginSuccessAction {
  readonly type: AuthActionTypes.OAUTH_LOGIN_SUCCESS;
  readonly payload: {
    readonly user: User;
    readonly token: AuthResponse;
  };
}

/**
 * Interface: OAuthLoginFailureAction
 * -----------------------------------------------------------------------------
 * Dispatched when the OAuth flow fails, carrying diagnostic error information.
 */
export interface OAuthLoginFailureAction {
  readonly type: AuthActionTypes.OAUTH_LOGIN_FAILURE;
  readonly payload: {
    readonly error: string;
  };
}

/**
 * Type: AuthAction
 * -----------------------------------------------------------------------------
 * A union type of all possible authentication-related actions. Its exhaustive
 * nature enforces compile-time safety, ensuring reducers handle each action
 * in line with the guidelines of sections 7.1.1 and 7.1.2.
 */
export type AuthAction =
  | LoginRequestAction
  | LoginSuccessAction
  | LoginFailureAction
  | LogoutAction
  | RefreshTokenRequestAction
  | RefreshTokenSuccessAction
  | RefreshTokenFailureAction
  | OAuthLoginRequestAction
  | OAuthLoginSuccessAction
  | OAuthLoginFailureAction;