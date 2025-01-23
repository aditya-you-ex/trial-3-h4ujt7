/**
 * -------------------------------------------------------------------------
 * auth.selectors.ts
 * -------------------------------------------------------------------------
 * This file provides strongly-typed, memoized selectors for accessing the
 * authentication-related fields within the Redux store. It is aligned with
 * the TaskStream AI technical specifications which require:
 *  1) Secure handling of authentication state (7.1.1 Authentication Flow).
 *  2) RBAC coordination via user roles (7.1.2 Authorization Matrix).
 *
 * The selectors implemented here offer:
 *  - Type safety with AuthState and RootState.
 *  - Null safety when retrieving authentication data.
 *  - Memoization via createSelector for performance and immutability.
 *  - Role-based access support to streamline checks against the user role.
 *
 * Functions:
 *  1) selectAuthState        => Base accessor for AuthState slice.
 *  2) selectIsAuthenticated  => Accessor for boolean isAuthenticated.
 *  3) selectCurrentUser      => User object retrieval with null safety.
 *  4) selectAuthToken        => Authentication token retrieval.
 *  5) selectAuthError        => Accessor for error message or null.
 *  6) selectUserRole         => Role-based permission accessor.
 */

// -------------------------------------------------------------------------
// External Imports (With Library Version Comments)
// -------------------------------------------------------------------------
// @reduxjs/toolkit version: ^1.9.0
import { createSelector } from '@reduxjs/toolkit';

// -------------------------------------------------------------------------
// Internal Imports
// -------------------------------------------------------------------------
// Type definition for root Redux state, containing the 'auth' property.
import type { RootState } from '../rootReducer';
// Type definitions for the authentication slice of state, including
// fields such as isAuthenticated, user, token, error, role, and user type.
import type { AuthState, User, UserRole } from './auth.types';

/**
 * -------------------------------------------------------------------------
 * 1) selectAuthState
 * -------------------------------------------------------------------------
 * Base selector to retrieve the entire AuthState slice from RootState.
 * Steps (per JSON spec):
 *  - Access the auth property from root state with type checking.
 *  - Return the complete auth state slice, maintaining immutability.
 */
export const selectAuthState = (state: RootState): AuthState => state.auth;

/**
 * -------------------------------------------------------------------------
 * 2) selectIsAuthenticated
 * -------------------------------------------------------------------------
 * Memoized selector for determining whether the user is authenticated.
 * Steps (per JSON spec):
 *  - Create memoized selector using createSelector.
 *  - Use selectAuthState as the input selector.
 *  - Extract and return the isAuthenticated boolean value.
 *  - Implement shallow equality to avoid needless re-renders.
 */
export const selectIsAuthenticated = createSelector(
  [selectAuthState],
  (auth: AuthState): boolean => auth.isAuthenticated
);

/**
 * -------------------------------------------------------------------------
 * 3) selectCurrentUser
 * -------------------------------------------------------------------------
 * Memoized selector for retrieving the currently logged-in user or null.
 * Steps (per JSON spec):
 *  - Create memoized selector using createSelector.
 *  - Use selectAuthState as the input selector.
 *  - Extract and return the user object with null check.
 *  - Implement reference equality to optimize performance.
 */
export const selectCurrentUser = createSelector(
  [selectAuthState],
  (auth: AuthState): User | null => auth.user
);

/**
 * -------------------------------------------------------------------------
 * 4) selectAuthToken
 * -------------------------------------------------------------------------
 * Memoized selector for retrieving the current authentication token or null.
 * Steps (per JSON spec):
 *  - Create memoized selector using createSelector.
 *  - Use selectAuthState as the input selector.
 *  - Extract and return the token object with null safety.
 *  - Implement reference equality to ensure performance benefits.
 */
export const selectAuthToken = createSelector(
  [selectAuthState],
  (auth: AuthState) => auth.token
);

/**
 * -------------------------------------------------------------------------
 * 5) selectAuthError
 * -------------------------------------------------------------------------
 * Memoized selector for retrieving any authentication error message or null.
 * Steps (per JSON spec):
 *  - Create memoized selector using createSelector.
 *  - Use selectAuthState as the input selector.
 *  - Extract and return the error string with null safety.
 *  - Implement equality check to avoid re-renders when error is unchanged.
 */
export const selectAuthError = createSelector(
  [selectAuthState],
  (auth: AuthState): string | null => auth.error
);

/**
 * -------------------------------------------------------------------------
 * 6) selectUserRole
 * -------------------------------------------------------------------------
 * Memoized selector for retrieving the user's role with RBAC support.
 * Steps (per JSON spec):
 *  - Create memoized selector using createSelector.
 *  - Use selectCurrentUser as the input selector for role dependency.
 *  - Extract and return user.role with null safety.
 *  - Implement a type guard (null check) for role validation.
 *  - Cache role value for performance improvements.
 */
export const selectUserRole = createSelector(
  [selectCurrentUser],
  (user: User | null): UserRole | null => {
    if (!user || !user.role) {
      return null;
    }
    return user.role;
  }
);