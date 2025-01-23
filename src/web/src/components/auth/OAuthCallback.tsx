import React, { useEffect, useState } from 'react'; // react@^18.0.0
import { useNavigate, useSearchParams } from 'react-router-dom'; // react-router-dom@^6.0.0

/**
 * -------------------------------------------------------------------------
 * Imports - Internal
 * -------------------------------------------------------------------------
 * - useAuth: Authentication hook providing the loginWithOAuth function.
 * - AuthError: Detailed authentication-related error structure.
 * - OAuthProvider: Enum of valid OAuth provider identifiers.
 * - LoadingSpinner: Visual spinner component for loading states.
 * - ErrorState: Enhanced error display with retry functionality.
 */
import { useAuth, AuthError } from '../../hooks/useAuth';
import { OAuthProvider } from '../../types/auth.types';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorState } from '../common/ErrorState';

/**
 * Interface: OAuthCallbackProps
 * ----------------------------------------------------------------------
 * Describes the prop shape for the OAuthCallback component if extended
 * in the future. Currently no external props are passed, so this interface
 * remains empty. However, declared for future-proofing.
 */
interface OAuthCallbackProps {
  // Reserved for future expansions, e.g., optional onSuccess callback
}

/**
 * Component: OAuthCallback
 * ----------------------------------------------------------------------
 * Responsible for handling the OAuth 2.0 callback URL after successful
 * authentication with third-party providers such as Google or GitHub.
 * This component:
 *   1. Extracts required URL query parameters (code, state).
 *   2. Validates these parameters for security (CSRF/state checks).
 *   3. Performs a token exchange via loginWithOAuth.
 *   4. Handles success by navigating to the dashboard or another route.
 *   5. Manages errors and offers a retry mechanism, including basic
 *      rate limiting based on retryCount.
 *   6. Cleans up sensitive data from the URL upon completion.
 *
 * Internal State:
 *   - loading: boolean
 *       Indicates the callback is actively processing the OAuth request.
 *   - error: AuthError | null
 *       Stores any detailed authentication-related error, enabling
 *       granular feedback on failures.
 *   - retryCount: number
 *       Tracks how many times the user has attempted the OAuth flow
 *       again after encountering an error, partially fulfilling a
 *       rate limiting approach.
 */
export const OAuthCallback: React.FC<OAuthCallbackProps> = () => {
  /**
   * loading: Tracks OAuth request processing status for controlling
   *          spinner visibility and gating UI transitions.
   */
  const [loading, setLoading] = useState<boolean>(false);

  /**
   * error: If non-null, indicates that an error has occurred during
   *        the OAuth processing. Contains detailed info about what
   *        specifically failed.
   */
  const [error, setError] = useState<AuthError | null>(null);

  /**
   * retryCount: Counter for how many times we've retried the OAuth
   *             callback logic. Used to implement a simplistic
   *             rate limiting mechanism (e.g., max attempts).
   */
  const [retryCount, setRetryCount] = useState<number>(0);

  /**
   * useAuth Hook
   * ------------------------------------------------------------------
   * Exposes the loginWithOAuth function necessary to complete the
   * token exchange after receiving code and state from the provider.
   */
  const { loginWithOAuth } = useAuth();

  /**
   * useNavigate Hook
   * ------------------------------------------------------------------
   * Provides imperative navigation to routes (e.g. redirect to the
   * dashboard upon successful authentication).
   */
  const navigate = useNavigate();

  /**
   * useSearchParams Hook
   * ------------------------------------------------------------------
   * Extracts query parameters such as code and state from the URL.
   */
  const [searchParams] = useSearchParams();

  /**
   * parseProviderFromState
   * ------------------------------------------------------------------
   * A helper function to derive which OAuthProvider is included in the
   * state parameter. This simplistic approach checks for known provider
   * keywords within the state string and returns the correct enum.
   * In a production scenario, this might parse a JSON-encoded state or
   * validate an HMAC signature.
   */
  function parseProviderFromState(rawState: string): OAuthProvider {
    const upper = rawState.toUpperCase();
    if (upper.includes('GOOGLE')) {
      return OAuthProvider.GOOGLE;
    }
    if (upper.includes('GITHUB')) {
      return OAuthProvider.GITHUB;
    }
    throw new Error('Unknown or unsupported provider in state parameter.');
  }

  /**
   * processOAuthCallback
   * ------------------------------------------------------------------
   * Manages the entire secure OAuth callback sequence:
   *   1) Validate and parse URL parameters.
   *   2) Check for basic rate limiting via retryCount.
   *   3) Derive OAuthProvider from state.
   *   4) Call loginWithOAuth to perform the token exchange.
   *   5) Clean up sensitive data from the URL.
   *   6) Navigate on success or handle errors on failure.
   *   7) Log attempts for security monitoring or auditing.
   */
  async function processOAuthCallback(): Promise<void> {
    try {
      // Rate limiting check: if user has retried beyond a threshold
      if (retryCount > 3) {
        throw new Error('Too many OAuth callback attempts. Please try again later.');
      }

      // 1) Extract code and state from URL. Validate presence.
      const code = searchParams.get('code');
      const rawState = searchParams.get('state');
      if (!code || !rawState) {
        throw new Error('Missing required OAuth parameters (code, state).');
      }

      // 2) Parse and validate the provider from the 'state' param.
      const provider = parseProviderFromState(rawState);

      // 3) Log attempt (placeholder for real security or analytics logs)
      //    This can be integrated with a production logging/monitoring system.
      // eslint-disable-next-line no-console
      console.log(`[SecurityMonitor] OAuth callback attempt for provider: ${provider}`);

      // 4) Exchange code for tokens via our auth service through useAuth.
      await loginWithOAuth(provider, code, rawState);

      // 5) Clean up URL to remove sensitive params: use replace to avoid
      //    polluting browser history with credentials.
      searchParams.delete('code');
      searchParams.delete('state');
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      // 6) On failure, we store the error with a standard AuthError shape.
      const message = typeof err?.message === 'string' ? err.message : 'Unknown error occurred.';
      setError({ code: 'OAUTH_CALLBACK_FAILED', message });
    }
  }

  /**
   * handleRetry
   * ------------------------------------------------------------------
   * Callback invoked when the user clicks the 'Retry' button on the
   * ErrorState component. Resets error, increments retryCount, and
   * re-triggers the OAuth processing to attempt completion again.
   */
  function handleRetry(): void {
    setError(null);
    setRetryCount((prev) => prev + 1);
    setLoading(true);
  }

  /**
   * useEffect: Orchestrates the OAuth callback flow.
   * ------------------------------------------------------------------
   * On component mount or when any dependency changes (particularly
   * retryCount after a user clicks 'Retry'):
   *   - We set loading to true before calling processOAuthCallback.
   *   - On completion or error, we reset loading to false.
   */
  useEffect(() => {
    setLoading(true);
    processOAuthCallback()
      .finally(() => {
        setLoading(false);
      });
    // Dependencies: searching for updated query params or retried calls
  }, [searchParams, navigate, loginWithOAuth, retryCount]);

  /**
   * Render Logic
   * ------------------------------------------------------------------
   * 1) If loading is true, show a LoadingSpinner.
   * 2) If an error is present, render the ErrorState with retry.
   * 3) Otherwise, show nothing (the user will be navigated away on success).
   */
  if (loading) {
    return <LoadingSpinner size="md" />;
  }

  if (error) {
    return (
      <ErrorState
        error={{
          code: error.code,
          message: error.message,
          details: {},
          stack: undefined,
          timestamp: new Date(),
        }}
        title="OAuth Processing Error"
        onRetry={handleRetry}
      />
    );
  }

  // If not loading and not in an error state, the user is likely being
  // redirected. We return null to avoid rendering any blank content.
  return null;
};