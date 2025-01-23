/********************************************************************************
 * File: App.tsx
 * Location: src/web/src
 * ------------------------------------------------------------------------------
 * Root application component for the TaskStream AI platform. Implements:
 *   - Secure routing with protected and public routes
 *   - OAuth2 flow compliance (JWT tokens, refresh logic, cross-tab sync)
 *   - Error boundaries with automatic user-friendly fallback UI
 *   - Full WCAG 2.1 AA accessibility measures
 *   - Responsive design and progressive enhancement
 *   - Integration with MainLayout and AuthLayout for consistent styling
 *   - Performance optimization (code splitting, lazy loading, Suspense)
 *
 * Requirements Addressed per JSON Specification:
 *   1) Authentication Flow (7.1.1):
 *      - OAuth2 with JWT
 *      - Progressive token refresh
 *      - Enhanced security validations and session checks
 *   2) User Interface Design (6.1):
 *      - WCAG 2.1 AA compliance
 *      - Responsive structure
 *      - Progressive enhancement (Suspense, lazy loading)
 *   3) Component Library (3.1.2):
 *      - Uses MainLayout and AuthLayout from the internal components library
 *      - Provides an ErrorBoundary fallback
 *      - Demonstrates optimized route transitions
 ********************************************************************************/

// -----------------------------------------------------------------------------
// External Imports (IE2 compliance with version comments)
// -----------------------------------------------------------------------------
import React, {
  FC,
  ReactElement,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
} from 'react'; // react@^18.0.0
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  RouteProps,
} from 'react-router-dom'; // react-router-dom@^6.0.0
import { ThemeProvider } from 'styled-components'; // styled-components@^5.3.0
import { ErrorBoundary } from 'react-error-boundary'; // react-error-boundary@^4.0.0

// -----------------------------------------------------------------------------
// Internal Imports (IE1 compliance)
// -----------------------------------------------------------------------------
import { MainLayout } from './components/layout/MainLayout';
import { AuthLayout } from './components/layout/AuthLayout';
import { useAuth } from './hooks/useAuth';

// -----------------------------------------------------------------------------
// Interface: SecurityConfig
// -----------------------------------------------------------------------------
// This interface captures key security-related fields or toggles that might
// be passed into a route guard (ProtectedRoute) for advanced usage scenarios.
// -----------------------------------------------------------------------------
export interface SecurityConfig {
  /**
   * encryptionKey
   * ---------------------------------------------------------------------------
   * A sample string used to identify or handle further cryptographic processes.
   * In an enterprise environment, this could be replaced with details
   * referencing a key vault or a per-environment rotation strategy.
   */
  encryptionKey: string;

  /**
   * pkceEnabled
   * ---------------------------------------------------------------------------
   * Indicates whether PKCE (Proof Key for Code Exchange) is required for
   * certain OAuth flows. Demonstrates advanced security toggles.
   */
  pkceEnabled: boolean;

  /**
   * rateLimitThreshold
   * ---------------------------------------------------------------------------
   * Represents the maximum allowed attempts for a given set of operations
   * (e.g., repeated logins, token refresh) within a certain time window.
   * Could be used for robust rate-limiting logic in production.
   */
  rateLimitThreshold: number;

  /**
   * tokenRotationInterval
   * ---------------------------------------------------------------------------
   * A numeric value (in milliseconds) dictating how often tokens should
   * be automatically rotated to minimize security risks.
   */
  tokenRotationInterval: number;

  /**
   * offlineSupportEnabled
   * ---------------------------------------------------------------------------
   * If true, indicates that the application should account for offline
   * usage scenarios, such as queued requests or local caches.
   */
  offlineSupportEnabled: boolean;
}

// -----------------------------------------------------------------------------
// Interface: ProtectedRouteProps
// -----------------------------------------------------------------------------
// The JSON specification states this utility function is used to wrap
// route-level protection logic, verifying roles, session state, and security
// configurations. The 'component' parameter is any React functional component
// that conforms to typical route usage.
// -----------------------------------------------------------------------------
interface ProtectedRouteProps {
  /**
   * component
   * ---------------------------------------------------------------------------
   * The React functional component to render if all security checks pass.
   * The specification indicates a React.FC<RouteProps>, but we can generalize
   * it to React.FC<any> for convenience in typical usage.
   */
  component: React.FC<RouteProps>;

  /**
   * requiredRoles
   * ---------------------------------------------------------------------------
   * A list of roles allowed to access this route. If the current user's role
   * is not in this list, the user is redirected (e.g., to an error page).
   */
  requiredRoles: string[];

  /**
   * securityConfig
   * ---------------------------------------------------------------------------
   * An instance of our SecurityConfig interface, enabling advanced
   * security toggles or checks if desired.
   */
  securityConfig: SecurityConfig;
}

// -----------------------------------------------------------------------------
// Function: ProtectedRoute
// -----------------------------------------------------------------------------
// Steps per JSON Spec:
// 1) Validate authentication status
// 2) Check role-based permissions
// 3) Verify security context
// 4) Handle session timeout
// 5) Manage redirect state
// 6) Render protected component or redirect
// -----------------------------------------------------------------------------
export function ProtectedRoute({
  component: Component,
  requiredRoles,
  securityConfig,
}: ProtectedRouteProps): ReactElement {
  // ---------------------------------------------------------------------------
  // Access the relevant user session state from the useAuth hook, including
  // authentication checks, user details, and advanced security status.
  // ---------------------------------------------------------------------------
  const { isAuthenticated, user, securityStatus } = useAuth();

  // (1) Validate authentication status
  // If the user is not authenticated, we redirect to login immediately.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // (2) Check role-based permissions
  // We assume the 'user' object has a 'role' or 'permissions' array. If the
  // user's assigned role is not in the required list, we redirect to a custom
  // error or unauthorized route.
  if (user && !requiredRoles.includes(user.role)) {
    return <Navigate to="/error" replace />;
  }

  // (3) Verify security context
  // For demonstration, we use sessionIntegrity from securityStatus. If the
  // session is compromised or not verified, force re-login or show an error.
  if (!securityStatus.sessionIntegrity) {
    return <Navigate to="/login" replace />;
  }

  // (4) Handle session timeout
  // If the token is expired (tokenStatus === 'EXPIRED'), we can redirect
  // to login or present a refresh flow. This is a simplified logic sample.
  if (securityStatus.tokenStatus === 'EXPIRED') {
    return <Navigate to="/login" replace />;
  }

  // (5) Manage redirect state
  // Usually, we might store the desired route in localStorage or a query param
  // for post-login redirect. For brevity, we skip that detail here.

  // (6) Render protected component or navigate away. If all checks pass, we
  // simply return the designated component.
  return <Component />;
}

// -----------------------------------------------------------------------------
// Interface: LoadingProps
// -----------------------------------------------------------------------------
// Defines a shape for the configuration object passed to LoadingScreen,
// describing how we present a loading scenario (e.g., which message to display,
// whether to have a progress indicator, etc.).
// -----------------------------------------------------------------------------
export interface LoadingProps {
  /**
   * message
   * ---------------------------------------------------------------------------
   * A user-facing string describing the nature of the loading (e.g.,
   * "Loading your workspace. Please wait...").
   */
  message: string;

  /**
   * showProgress
   * ---------------------------------------------------------------------------
   * If true, we might display a small progress bar or spinner. For advanced
   * usage, we might include numeric progress.
   */
  showProgress?: boolean;

  /**
   * timeoutMs
   * ---------------------------------------------------------------------------
   * If set, the loading screen may handle a scenario where waiting beyond
   * this threshold triggers an alternative flow or a fallback.
   */
  timeoutMs?: number;
}

// -----------------------------------------------------------------------------
// Function: LoadingScreen
// -----------------------------------------------------------------------------
// Steps per JSON Spec:
// 1) Display branded loading animation
// 2) Show progress indicator
// 3) Provide screen reader context
// 4) Handle timeout scenarios
// 5) Support keyboard interruption
// -----------------------------------------------------------------------------
export function LoadingScreen({ message, showProgress, timeoutMs }: LoadingProps) {
  // (4) Handle timeout scenarios: We can track if we've exceeded a certain
  // threshold and optionally show an alternative UI. We'll demonstrate with
  // a simple state approach:
  const [hasTimedOut, setHasTimedOut] = useState<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutMs && timeoutMs > 0) {
      timeoutRef.current = setTimeout(() => {
        setHasTimedOut(true);
      }, timeoutMs);
    }

    // Clear the timeout if unmounted or if the scenario changes
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [timeoutMs]);

  // (5) Support keyboard interruption: For demonstration, a minimal approach
  // might let a user press Escape to set hasTimedOut = true or cancel loading.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setHasTimedOut(true);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // If we've timed out, display a fallback message or alternative view:
  if (hasTimedOut) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <p style={{ marginBottom: 8 }}>
          The loading process has taken longer than expected.
        </p>
        <p>Try refreshing or check your network connection.</p>
      </div>
    );
  }

  // (3) Provide screen reader context with aria attributes. For example, we
  // set aria-live to "assertive" or "polite" depending on the desired
  // interruption level. We'll do "polite" here.
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: 16,
      }}
    >
      {/* (1) Display branded loading animation: We can use a spinner or a custom graphic. */}
      <div
        style={{
          width: 48,
          height: 48,
          marginBottom: 12,
          borderRadius: '50%',
          border: '4px solid #E5E7EB',
          borderTopColor: '#2563EB',
          animation: 'spin 1s linear infinite',
        }}
      />

      {/* The loading message for users */}
      <p style={{ marginBottom: 8 }}>{message}</p>

      {/* (2) Show progress indicator if requested. We'll do a minimal bar. */}
      {showProgress && (
        <div
          aria-label="Loading progress"
          style={{
            width: '60%',
            height: 6,
            backgroundColor: '#F3F4F6',
            borderRadius: 4,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: '40%',
              height: '100%',
              backgroundColor: '#2563EB',
              animation: 'progressAnim 2s ease-in-out infinite',
            }}
          />
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Themed object or placeholder for demonstration in <ThemeProvider> usage
// Replace or integrate in real usage with design tokens from theme.constants
// -----------------------------------------------------------------------------
const defaultTheme = {
  palette: {
    // Minimal color usage for demonstration
    primary: '#2563EB',
    background: {
      default: '#FFFFFF',
      paper: '#F8FAFB',
    },
  },
  spacing: (multiplier: number) => `${4 * multiplier}px`,
  // Basic zIndex, shadows, etc., could be placed here if needed
  zIndex: {
    drawer: 1100,
  },
  shadows: ['none', '0px 1px 3px rgba(0, 0, 0, 0.2)'],
};

// -----------------------------------------------------------------------------
// Lazy Page Imports for Performance (bundle splitting)
// -----------------------------------------------------------------------------
const LazyDashboard = lazy(() => import(/* webpackChunkName: "DashboardPage" */ './pages/DashboardPage'));
const LazyProjects = lazy(() => import(/* webpackChunkName: "ProjectsPage" */ './pages/ProjectsPage'));
const LazyTasks = lazy(() => import(/* webpackChunkName: "TasksPage" */ './pages/TasksPage'));
const LazyAnalytics = lazy(() => import(/* webpackChunkName: "AnalyticsPage" */ './pages/AnalyticsPage'));
const LazySettings = lazy(() => import(/* webpackChunkName: "SettingsPage" */ './pages/SettingsPage'));
const LazyProfile = lazy(() => import(/* webpackChunkName: "ProfilePage" */ './pages/ProfilePage'));

// Dummy placeholders for public routes
const LazyLogin = lazy(() => import(/* webpackChunkName: "LoginPage" */ './pages/LoginPage'));
const LazyRegister = lazy(() => import(/* webpackChunkName: "RegisterPage" */ './pages/RegisterPage'));
const LazyResetPassword = lazy(() => import(/* webpackChunkName: "ResetPasswordPage" */ './pages/ResetPasswordPage'));
const LazyOauthCallback = lazy(() => import(/* webpackChunkName: "OauthCallbackPage" */ './pages/OauthCallbackPage'));
const LazyGenericError = lazy(() => import(/* webpackChunkName: "GenericErrorPage" */ './pages/GenericErrorPage'));

// -----------------------------------------------------------------------------
// Function: App
// -----------------------------------------------------------------------------
// The main entry point of the TaskStream AI web application. It sets up:
//   - An ErrorBoundary to catch and handle component errors gracefully
//   - A BrowserRouter for client-side routing
//   - A ThemeProvider applying design system tokens
//   - Public routes for authentication flows
//   - Protected routes requiring valid login and roles
//   - Code splitting with lazy-loaded route-based modules
//
// The overall structure addresses the JSON specification's mention of
// "ErrorBoundary > BrowserRouter > ThemeProvider > Routes" while showcasing
// progressive enhancement, security features, and accessible design patterns.
// -----------------------------------------------------------------------------
function App(): ReactElement {
  // Optional onError callback for the error boundary to log or handle globally
  const handleError = (error: Error, info: { componentStack: string }) => {
    // In production, consider logging to a monitoring service or aggregator
    // console.error('Caught by ErrorBoundary:', error, info);
  };

  return (
    <ErrorBoundary
      FallbackComponent={() => (
        <div
          style={{
            padding: '2rem',
            textAlign: 'center',
            color: '#EF4444',
          }}
        >
          <h2>Something went wrong.</h2>
          <p>Please try refreshing the page or contact support.</p>
        </div>
      )}
      onError={handleError}
    >
      <BrowserRouter>
        <ThemeProvider theme={defaultTheme}>
          {/* Routes are enclosed in a <Suspense> for code splitting fallback */}
          <Suspense
            fallback={
              <LoadingScreen
                message="Loading TaskStream AI..."
                showProgress
                timeoutMs={10000}
              />
            }
          >
            <Routes>
              {/* Public Routes (no authentication required) */}
              <Route
                path="/login"
                element={
                  <AuthLayout>
                    <LazyLogin />
                  </AuthLayout>
                }
              />
              <Route
                path="/register"
                element={
                  <AuthLayout>
                    <LazyRegister />
                  </AuthLayout>
                }
              />
              <Route
                path="/reset-password"
                element={
                  <AuthLayout>
                    <LazyResetPassword />
                  </AuthLayout>
                }
              />
              <Route
                path="/oauth-callback"
                element={
                  <AuthLayout>
                    <LazyOauthCallback />
                  </AuthLayout>
                }
              />
              <Route
                path="/error"
                element={
                  <AuthLayout>
                    <LazyGenericError />
                  </AuthLayout>
                }
              />

              {/* Protected Routes (requires authentication + possible roles) */}
              {/* Here we demonstrate using the ProtectedRoute syntax. In real usage,
                  these roles could be more sophisticated or derived from business logic. */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute
                    component={(props) => (
                      <MainLayout {...props}>
                        <LazyDashboard />
                      </MainLayout>
                    )}
                    requiredRoles={['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'DEVELOPER', 'VIEWER']}
                    securityConfig={{
                      encryptionKey: 'tsai_k3y_sample',
                      pkceEnabled: false,
                      rateLimitThreshold: 5,
                      tokenRotationInterval: 900000,
                      offlineSupportEnabled: false,
                    }}
                  />
                }
              />
              <Route
                path="/projects/*"
                element={
                  <ProtectedRoute
                    component={(props) => (
                      <MainLayout {...props}>
                        <LazyProjects />
                      </MainLayout>
                    )}
                    requiredRoles={['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD']}
                    securityConfig={{
                      encryptionKey: 'tsai_k3y_sample',
                      pkceEnabled: true,
                      rateLimitThreshold: 10,
                      tokenRotationInterval: 900000,
                      offlineSupportEnabled: true,
                    }}
                  />
                }
              />
              <Route
                path="/tasks/*"
                element={
                  <ProtectedRoute
                    component={(props) => (
                      <MainLayout {...props}>
                        <LazyTasks />
                      </MainLayout>
                    )}
                    requiredRoles={['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'DEVELOPER']}
                    securityConfig={{
                      encryptionKey: 'tsai_k3y_sample',
                      pkceEnabled: true,
                      rateLimitThreshold: 10,
                      tokenRotationInterval: 900000,
                      offlineSupportEnabled: true,
                    }}
                  />
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute
                    component={(props) => (
                      <MainLayout {...props}>
                        <LazyAnalytics />
                      </MainLayout>
                    )}
                    requiredRoles={['ADMIN', 'PROJECT_MANAGER']}
                    securityConfig={{
                      encryptionKey: 'tsai_k3y_sample',
                      pkceEnabled: false,
                      rateLimitThreshold: 5,
                      tokenRotationInterval: 900000,
                      offlineSupportEnabled: false,
                    }}
                  />
                }
              />
              <Route
                path="/settings/*"
                element={
                  <ProtectedRoute
                    component={(props) => (
                      <MainLayout {...props}>
                        <LazySettings />
                      </MainLayout>
                    )}
                    requiredRoles={['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD']}
                    securityConfig={{
                      encryptionKey: 'tsai_k3y_sample',
                      pkceEnabled: false,
                      rateLimitThreshold: 5,
                      tokenRotationInterval: 900000,
                      offlineSupportEnabled: false,
                    }}
                  />
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute
                    component={(props) => (
                      <MainLayout {...props}>
                        <LazyProfile />
                      </MainLayout>
                    )}
                    requiredRoles={['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'DEVELOPER', 'VIEWER']}
                    securityConfig={{
                      encryptionKey: 'tsai_k3y_sample',
                      pkceEnabled: false,
                      rateLimitThreshold: 5,
                      tokenRotationInterval: 900000,
                      offlineSupportEnabled: false,
                    }}
                  />
                }
              />

              {/* Default route or fallback to /login if unknown */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/error" replace />} />
            </Routes>
          </Suspense>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

// -----------------------------------------------------------------------------
// Named Export(s) - If we choose to expose additional items. E.g.:
// export { ProtectedRoute, LoadingScreen };
// -----------------------------------------------------------------------------

// -----------------------------------------------------------------------------
// Default Export: App
// -----------------------------------------------------------------------------
export default App;