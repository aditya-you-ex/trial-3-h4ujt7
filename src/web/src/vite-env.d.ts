/// <reference types="vite/client" />
// -------------------------------------------------------------------------------------
// External Import from 'vite' version '^4.4.0'
// This reference ensures that TypeScript recognizes all core Vite client type definitions
// and module augmentation capabilities, providing reliable type information for the
// environment variables and making certain that no type collisions occur within this
// TaskStream AI web application.
// -------------------------------------------------------------------------------------

/**
 * ImportMetaEnv
 * ----------------------------------------------------------------------------
 * This interface defines the shape of all environment variables used by the
 * TaskStream AI web application at runtime. Each property is strictly read-only,
 * ensuring they cannot be accidentally overwritten during application execution.
 * 
 * By enumerating each variable, developers gain compile-time validation
 * and type safety when referencing environment variables, significantly reducing
 * the risk of runtime configuration errors or typos that might affect behaviors
 * such as API communication, authentication flows, or feature toggles.
 */
export interface ImportMetaEnv {
  /**
   * VITE_API_URL
   * ----------------------------------------------------------------------------
   * The base URL for all API calls made by the TaskStream AI frontend.
   * This value is expected to point to the primary backend endpoint
   * responsible for core data handling, task orchestration, and AI services.
   */
  readonly VITE_API_URL: string;

  /**
   * VITE_AUTH_URL
   * ----------------------------------------------------------------------------
   * The URL dedicated to authentication-related operations, such as
   * token retrieval, user login flows, and session management through
   * OAuth-based endpoints or other identity providers.
   */
  readonly VITE_AUTH_URL: string;

  /**
   * VITE_WS_URL
   * ----------------------------------------------------------------------------
   * The base WebSocket endpoint for real-time communications, enabling
   * instant event broadcasting, push notifications, or live task
   * updates within the TaskStream AI platform.
   */
  readonly VITE_WS_URL: string;

  /**
   * VITE_ENV
   * ----------------------------------------------------------------------------
   * The current environment in which this web application is running.
   * This property is constrained to one of three string literals:
   *
   *   - 'development'
   *   - 'staging'
   *   - 'production'
   *
   * Using a literal union type allows the build system to catch any
   * mismatch or unsupported value at compile-time, thereby ensuring
   * environment-based logic is always valid.
   */
  readonly VITE_ENV: 'development' | 'staging' | 'production';

  /**
   * VITE_APP_TITLE
   * ----------------------------------------------------------------------------
   * A human-readable title or name for this TaskStream AI instance.
   * This value may be displayed in browser tabs, system notifications,
   * or user-facing headings to visually identify the application.
   */
  readonly VITE_APP_TITLE: string;

  /**
   * VITE_API_VERSION
   * ----------------------------------------------------------------------------
   * The version tag of the backend or API endpoints, allowing the
   * UI layer to call versioned routes and remain consistent with
   * any backward/forward compatibility strategies in place.
   */
  readonly VITE_API_VERSION: string;

  /**
   * VITE_ANALYTICS_ID
   * ----------------------------------------------------------------------------
   * (Optional) The identifier used for analytics integrations (for example,
   * Google Analytics ID or another tracking service key). If not provided,
   * analytics features reliant on this ID may be disabled or skipped at runtime.
   */
  readonly VITE_ANALYTICS_ID?: string;

  /**
   * VITE_SENTRY_DSN
   * ----------------------------------------------------------------------------
   * (Optional) The Data Source Name required for Sentry or similar error
   * tracking services. If not defined, error-reported events may be
   * silently discarded or never captured in Sentry.
   */
  readonly VITE_SENTRY_DSN?: string;

  /**
   * VITE_FEATURE_FLAGS
   * ----------------------------------------------------------------------------
   * A record of boolean feature flags, each keyed by a string name.
   * These flags facilitate toggling experimental, region-specific,
   * or role-based features without requiring a rebuild or redeployment.
   */
  readonly VITE_FEATURE_FLAGS: Record<string, boolean>;
}

/**
 * ImportMeta
 * ----------------------------------------------------------------------------
 * Augments the global `ImportMeta` interface recognized by Vite-aware
 * TypeScript environments. It ensures that any references to
 * `import.meta.env` will leverage the strict `ImportMetaEnv` shape
 * defined above. The `Readonly` wrapper provides an added layer of
 * immutability, preventing accidental assignments or modifications
 * to environment objects at runtime.
 */
export interface ImportMeta {
  /**
   * env
   * ----------------------------------------------------------------------------
   * Exposes all environment variables as declared by `ImportMetaEnv`,
   * providing validated, read-only configuration values for the web
   * application. Any attempt to modify these variables in code
   * will be disallowed by TypeScript.
   */
  readonly env: Readonly<ImportMetaEnv>;
}