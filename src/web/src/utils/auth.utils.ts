/**
 * TaskStream AI - Authentication Utilities
 * -----------------------------------------------------------------------------
 * This file provides a comprehensive set of utility functions for handling
 * authentication, token management, and user authorization within the
 * TaskStream AI web application. It adheres to the enterprise-grade security
 * standards and strict validations outlined in the Technical Specifications,
 * particularly sections 7.1 (Authentication & Authorization) and 7.2 (Data
 * Security).
 *
 * Functions:
 *   1. isTokenValid(token: string): boolean
 *      - Validates token format, checks expiration, ensures minimal claims, and
 *        verifies (in a partial client-side sense) that the token hasn't been
 *        obviously tampered with.
 *
 *   2. parseTokenPayload(token: string): object
 *      - Extracts a strictly typed payload from the token, insisting on
 *        required claims and applying multiple security checks. Returns an
 *        object containing user data or throws an error if validation fails.
 *
 *   3. hasPermission(user: User, requiredPermission: string): boolean
 *      - Checks whether a given user has the specified permission,
 *        accommodating the ADMIN override.
 *
 *   4. hasRole(user: User, requiredRole: UserRole): boolean
 *      - Determines if the user’s role meets or exceeds a specific role
 *        requirement according to the system’s role hierarchy.
 *
 *   5. getTokenExpirationTime(token: string): number
 *      - Retrieves the numeric expiration timestamp from the token’s payload,
 *        returning this value in milliseconds since the Unix epoch.
 *
 * References:
 *   - Technical Specifications §§7.1.1 (Authentication Flow), 7.1.2
 *     (Authorization Matrix), and 7.2.1 (Encryption Standards).
 *   - The "jwt-decode" library (version ^3.1.2) for token payload decoding.
 */

import jwtDecode from 'jwt-decode'; // version ^3.1.2
import { User, UserRole } from '../types/auth.types';
import { AUTH_ERROR_MESSAGES } from '../constants/auth.constants';

/**
 * Interface: DecodedTokenPayload
 * -----------------------------------------------------------------------------
 * Represents the JWT payload structure that we expect from the server side.
 * This interface supports extra custom claims (e.g., version or role) as
 * needed by the TaskStream AI application. All optional fields must be
 * rigorously checked before use to ensure they exist and are correctly typed.
 */
interface DecodedTokenPayload {
  readonly sub?: string;
  readonly role?: string;
  readonly permissions?: string[];
  readonly exp?: number;
  readonly iat?: number;
  readonly ver?: string | number;
  // Extend as needed to enforce custom claims
}

/**
 * Interface: DecodedTokenHeader
 * -----------------------------------------------------------------------------
 * Represents the minimal, relevant JWT header fields required to perform
 * basic client-side checks on the token's cryptographic algorithm. Note that
 * real signature verification must be performed on the backend with the
 * secret or public key; the client can only check the header claims for
 * consistency.
 */
interface DecodedTokenHeader {
  readonly alg?: string;
  readonly typ?: string;
  readonly [key: string]: unknown;
}

/**
 * Utility Map: ROLE_HIERARCHY
 * -----------------------------------------------------------------------------
 * Defines the hierarchical priority of each role in order to compare role
 * levels. A larger numeric value indicates a higher or more privileged role.
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.VIEWER]: 1,
  [UserRole.DEVELOPER]: 2,
  [UserRole.TEAM_LEAD]: 3,
  [UserRole.PROJECT_MANAGER]: 4,
  [UserRole.ADMIN]: 5,
};

/**
 * Function: isTokenValid
 * -----------------------------------------------------------------------------
 * Checks if a JWT token is valid, unexpired, and meets minimal structural
 * requirements. This client-side function cannot fully verify the token’s
 * cryptographic signature, but will check for:
 *   - Proper token structure (3 segments separated by '.')
 *   - Algorithm field in the JWT header (optional client check)
 *   - Expiration claim presence and validity
 *   - Basic claim existence (iat, sub, etc.)
 *
 * @param {string} token - The JWT token in string form.
 * @returns {boolean} - True if the token appears valid and unexpired, False otherwise.
 */
export function isTokenValid(token: string): boolean {
  try {
    // 1. Basic format check: Must have three segments separated by "."
    if (!token || token.split('.').length !== 3) {
      return false;
    }

    // 2. Decode and inspect the header for minimal checks (algorithm, type)
    const header = jwtDecode<DecodedTokenHeader>(token, { header: true });
    if (!header || typeof header.alg !== 'string') {
      return false;
    }
    // Example client-side check: allow only RS256 or HS256 (if known).
    // In real scenarios, adjusting to the correct expected alg is crucial.
    const allowedAlgorithms = ['RS256', 'HS256'];
    if (!allowedAlgorithms.includes(header.alg)) {
      return false;
    }

    // 3. Decode the payload portion and ensure required fields are present
    const payload: DecodedTokenPayload = jwtDecode<DecodedTokenPayload>(token);
    if (typeof payload.exp !== 'number' || typeof payload.iat !== 'number') {
      return false;
    }
    // 4. Check if the token is expired based on the 'exp' claim
    const currentTimeInSec = Math.floor(Date.now() / 1000);
    if (payload.exp < currentTimeInSec) {
      return false;
    }

    // 5. Optional: Check for minimal claim presence, e.g., 'sub' or 'role'
    if (!payload.sub) {
      return false;
    }

    // If all checks pass, assume it's valid for client-side usage
    return true;
  } catch {
    // Any error in decoding or parsing indicates an invalid token structure
    return false;
  }
}

/**
 * Function: parseTokenPayload
 * -----------------------------------------------------------------------------
 * Decodes the JWT token to extract and validate user-related data in a strictly
 * typed manner. If any checks fail, this function throws an Error containing
 * a relevant AUTH_ERROR_MESSAGES message.
 *
 * Steps:
 *  1. Decode the token payload using jwtDecode.
 *  2. Validate essential fields (sub, exp). If absent or invalid, throw error.
 *  3. Ensure the role is recognized in the UserRole enum if provided.
 *  4. Validate permissions array, if present.
 *  5. Enforce consistent typing and check for potential tampering claims.
 *
 * @param {string} token - The JWT token in string form.
 * @returns {object} - A strictly validated payload containing user claims.
 */
export function parseTokenPayload(token: string): {
  userId: string;
  role?: UserRole;
  permissions?: string[];
  exp: number;
  iat?: number;
  ver?: string | number;
} {
  try {
    // Decode the payload. If it fails, an error will be thrown by jwtDecode.
    const payload = jwtDecode<DecodedTokenPayload>(token);

    // Validate the sub claim as the user's unique identifier
    if (!payload.sub) {
      throw new Error(AUTH_ERROR_MESSAGES.INVALID_TOKEN);
    }

    // Confirm exp is present and numeric
    if (typeof payload.exp !== 'number') {
      throw new Error(AUTH_ERROR_MESSAGES.INVALID_TOKEN);
    }

    // role is optional, but if present, ensure it is a valid UserRole
    let parsedRole: UserRole | undefined;
    if (payload.role) {
      const validRoles = Object.values(UserRole);
      if (validRoles.includes(payload.role as UserRole)) {
        parsedRole = payload.role as UserRole;
      } else {
        throw new Error(AUTH_ERROR_MESSAGES.INVALID_TOKEN);
      }
    }

    // permissions must be an array of strings if declared
    let parsedPermissions: string[] | undefined;
    if (payload.permissions) {
      if (
        Array.isArray(payload.permissions) &&
        payload.permissions.every((p) => typeof p === 'string')
      ) {
        parsedPermissions = payload.permissions;
      } else {
        throw new Error(AUTH_ERROR_MESSAGES.INVALID_TOKEN);
      }
    }

    // Return a strictly typed result, including optional claims only if valid
    return {
      userId: payload.sub,
      role: parsedRole,
      permissions: parsedPermissions,
      exp: payload.exp,
      iat: typeof payload.iat === 'number' ? payload.iat : undefined,
      ver: payload.ver,
    };
  } catch {
    // Any parsing or validation failure triggers an invalid token error
    throw new Error(AUTH_ERROR_MESSAGES.INVALID_TOKEN);
  }
}

/**
 * Function: hasPermission
 * -----------------------------------------------------------------------------
 * Determines if the provided user has the specified permission. The ADMIN role
 * overrides any permission checks. If the user is an ADMIN, this function
 * immediately returns true.
 *
 * @param {User} user - The user whose permissions will be evaluated.
 * @param {string} requiredPermission - The permission label to check (e.g. "EDIT_TASK").
 * @returns {boolean} - True if the user possesses the required permission or is ADMIN.
 */
export function hasPermission(user: User, requiredPermission: string): boolean {
  // If user has role=ADMIN, automatically grant full access
  if (user.role === UserRole.ADMIN) {
    return true;
  }

  // Otherwise, check if the user's permissions array includes the required permission
  const userPerms = user.permissions || [];
  return userPerms.includes(requiredPermission);
}

/**
 * Function: hasRole
 * -----------------------------------------------------------------------------
 * Validates whether the user's role meets or exceeds the specified role in
 * the system's role hierarchy. This is particularly vital when a user with
 * role X should be allowed to perform tasks that require role Y, so long as
 * X >= Y in the hierarchy.
 *
 * @param {User} user - The user whose role is being checked.
 * @param {UserRole} requiredRole - The minimum role required to pass this check.
 * @returns {boolean} - True if the user’s role level is >= the required role level.
 */
export function hasRole(user: User, requiredRole: UserRole): boolean {
  const userRoleLevel = ROLE_HIERARCHY[user.role];
  const requiredRoleLevel = ROLE_HIERARCHY[requiredRole];
  return userRoleLevel >= requiredRoleLevel;
}

/**
 * Function: getTokenExpirationTime
 * -----------------------------------------------------------------------------
 * Retrieves the token's expiration time in milliseconds since the Unix epoch.
 * If the `exp` claim is invalid or missing, this function returns 0 to indicate
 * that the token cannot be trusted with regards to expiration.
 *
 * @param {string} token - The JWT token.
 * @returns {number} - The numeric expiration timestamp in milliseconds.
 */
export function getTokenExpirationTime(token: string): number {
  try {
    const payload = jwtDecode<DecodedTokenPayload>(token);
    if (typeof payload.exp !== 'number') {
      return 0;
    }
    // Convert 'exp' seconds to milliseconds
    return payload.exp * 1000;
  } catch {
    // If decoding fails, treat it as no valid expiration
    return 0;
  }
}