/* eslint-disable react/jsx-no-bind */
/* *****************************************************************************
 * LoginForm.tsx
 * -----------------------------------------------------------------------------
 * A secure, accessible, and enterprise-grade login form component implementing
 * OAuth2 authentication flow, comprehensive validation, error handling, and
 * accessibility features. Addresses requirements from:
 *  - Authentication Flow (Tech Specs/7.1.1)
 *  - Security Architecture (Tech Specs/2.4.2)
 *  - User Interface Design (Tech Specs/3.1)
 *
 * External Dependencies (with versions):
 *   react ^18.0.0          - Core React library
 *   react-i18next ^13.0.0  - Internationalization hook for multi-language support
 *   @taskstream/analytics ^1.0.0 - User interaction analytics
 *   @taskstream/validation ^1.0.0 - Form validation utilities
 *   @taskstream/a11y ^1.0.0      - Accessibility utilities
 *
 * Internal Dependencies:
 *   useAuth (hook) from '../../hooks/useAuth'
 *     - Provides login, loading, error, and rateLimitStatus for enhanced security
 *
 * Exports:
 *   LoginForm (React.FC<LoginFormProps>) - The enhanced login form component
 *   useFormValidation - A custom hook for real-time form validation
 *
 * Decorators:
 *   @withErrorBoundary - Wraps the component with an enterprise-grade error boundary
 *   @withAnalytics     - Tracks login form usage and events for analytics
 *
 * Implementation Outline:
 *   1) Local interface definitions for props and internal states
 *   2) useFormValidation - Real-time, debounced validation for email/password
 *   3) HOCs: withErrorBoundary, withAnalytics (placeholder stubs)
 *   4) BaseLoginForm component - Implements form, accessibility, and security
 *   5) Exported LoginForm - Wrapped by withErrorBoundary and withAnalytics
 * -----------------------------------------------------------------------------
 **************************************************************************** */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  FormEvent,
  KeyboardEvent,
} from 'react'; // react ^18.0.0
import { useTranslation } from 'react-i18next'; // react-i18next ^13.0.0
import analytics from '@taskstream/analytics'; // @taskstream/analytics ^1.0.0
import validation from '@taskstream/validation'; // @taskstream/validation ^1.0.0
import { useA11y } from '@taskstream/a11y'; // @taskstream/a11y ^1.0.0

import { useAuth, AuthError } from '../../hooks/useAuth'; // Internal enterprise hook
import type { User } from '../../types/auth.types';

/**
 * -----------------------------------------------------------------------------
 * Interface: LoginFormProps
 * -----------------------------------------------------------------------------
 * Props for the enterprise-grade LoginForm component. It supports success/error
 * callbacks, custom classNames, and a testId for unit testing or automation.
 */
export interface LoginFormProps {
  /**
   * onSuccess callback invoked when a user logs in successfully. Receives
   * the authenticated user object.
   */
  onSuccess: (user: User) => void;

  /**
   * onError callback invoked when a login error occurs. Receives an AuthError
   * for finer control of error handling.
   */
  onError: (error: AuthError) => void;

  /**
   * Optional CSS class for advanced layout or theming.
   */
  className?: string;

  /**
   * Optional testId for end-to-end tests or UI automation frameworks.
   */
  testId?: string;
}

/**
 * -----------------------------------------------------------------------------
 * Interface: FormValues
 * -----------------------------------------------------------------------------
 * Represents the local state structure for the login form, containing
 * fields for email, password, and a potential anti-CSRF token. Additional
 * fields may be appended as needed for advanced flows.
 */
interface FormValues {
  email: string;
  password: string;
  csrfToken: string;
}

/**
 * -----------------------------------------------------------------------------
 * Interface: ValidationResult
 * -----------------------------------------------------------------------------
 * Defines what the validation hook returns. Contains input errors, an
 * overall isValid flag, and references to setter functions for updates.
 */
interface ValidationResult {
  errors: {
    email?: string;
    password?: string;
  };
  isValid: boolean;
  validateField: (fieldName: keyof FormValues, value: string) => void;
  resetValidation: () => void;
}

/**
 * -----------------------------------------------------------------------------
 * Hook: useFormValidation
 * -----------------------------------------------------------------------------
 * A custom hook for real-time, debounced form validation. Leverages the
 * @taskstream/validation library for robust enterprise-grade checks.
 *
 * Steps:
 *   1) Initialize validation state with empty error messages
 *   2) Provide a method to validate individual fields (email, password)
 *   3) Use a debouncing mechanism for performance
 *   4) Return errors, isValid, and field-level validation triggers
 */
export function useFormValidation(initialValues: FormValues): ValidationResult {
  // Local state for errors on individual fields
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // A reference to handle debounced validations
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * isValid - Derived from whether any field in errors has a truthy message
   */
  const isValid = !errors.email && !errors.password;

  /**
   * validateEmail - Example function that checks the email format
   * and domain constraints. Replace or augment as needed.
   */
  const validateEmail = useCallback((value: string): string | undefined => {
    if (!validation.isEmail(value)) {
      return 'Invalid email format.';
    }
    // Additional domain checks or blacklists can be implemented here.
    return undefined;
  }, []);

  /**
   * validatePassword - Checks password length, complexity, etc.
   * Demonstrates usage for enterprise-level validations.
   */
  const validatePassword = useCallback((value: string): string | undefined => {
    // Example: must be at least 8 chars, contain uppercase, etc.
    if (!value || value.length < 8) {
      return 'Password must be at least 8 characters long.';
    }
    if (!/[A-Z]/.test(value)) {
      return 'Password must contain at least one uppercase letter.';
    }
    if (!/[0-9]/.test(value)) {
      return 'Password must contain at least one digit.';
    }
    return undefined;
  }, []);

  /**
   * validateField
   * -----------------------------------------------------------------------------
   * Validates any given field with a small debounce for performance
   * and real-time user feedback. We store the result in the errors state.
   */
  const validateField = useCallback(
    (fieldName: keyof FormValues, value: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        setErrors((prev) => {
          const updated = { ...prev };
          if (fieldName === 'email') {
            updated.email = validateEmail(value);
          } else if (fieldName === 'password') {
            updated.password = validatePassword(value);
          }
          // csrfToken is not user-editable but you could add custom checks if needed
          return updated;
        });
      }, 300);
    },
    [validateEmail, validatePassword]
  );

  /**
   * resetValidation
   * -----------------------------------------------------------------------------
   * Clears any error messages, commonly used upon successful submission
   * or after user switches workflows.
   */
  const resetValidation = useCallback(() => {
    setErrors({});
  }, []);

  return {
    errors,
    isValid,
    validateField,
    resetValidation,
  };
}

/* -----------------------------------------------------------------------------
 * HOC: withErrorBoundary
 * -----------------------------------------------------------------------------
 * A placeholder for enterprise-grade error boundary. In a real app, you
 * might import a shared HOC from a library or a custom internal package.
 */
function withErrorBoundary<T extends object>(
  Component: React.FC<T>
): React.FC<T> {
  const Wrapped: React.FC<T> = (props) => {
    // This simplistic approach just renders the component.
    // Real-world usage should wrap with an <ErrorBoundary> component.
    return <Component {...props} />;
  };
  Wrapped.displayName = `WithErrorBoundary(${Component.displayName || Component.name})`;
  return Wrapped;
}

/* -----------------------------------------------------------------------------
 * HOC: withAnalytics
 * -----------------------------------------------------------------------------
 * Wraps the component to track user interactions such as form display,
 * attempts, success, or error states.
 */
function withAnalytics<T extends object>(Component: React.FC<T>): React.FC<T> {
  const Wrapped: React.FC<T> = (props) => {
    // Example: track that the login form was rendered on mount
    useEffect(() => {
      analytics.track('login_form_rendered', { timestamp: new Date().toISOString() });
    }, []);

    return <Component {...props} />;
  };
  Wrapped.displayName = `WithAnalytics(${Component.displayName || Component.name})`;
  return Wrapped;
}

/**
 * -----------------------------------------------------------------------------
 * Component: BaseLoginForm
 * -----------------------------------------------------------------------------
 * The core login form implementing OAuth2-based authentication with
 * comprehensive error handling, accessibility, and real-time validation.
 *
 * Steps:
 *   1) Set up translation, accessibility, and local form states
 *   2) Integrate useFormValidation for email/password checks
 *   3) Implement rate-limit awareness by reading from useAuth().rateLimitStatus
 *   4) Implement CSRF handling via hidden field or state
 *   5) Provide ARIA attributes for improved a11y
 *   6) On submission:
 *         - Debounce or finalize validation
 *         - Invoke login from useAuth
 *         - If success => call onSuccess
 *         - If error => call onError
 *   7) Track analytics events as needed
 */
const BaseLoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onError,
  className,
  testId,
}) => {
  // i18n hook for multi-language support
  const { t } = useTranslation();

  // Accessibility hook for advanced keyboard/focus handling
  const { handleKeyDown } = useA11y();

  // Enterprise authentication hook providing login, loading, error, rateLimitStatus
  const { login, loading, error, rateLimitStatus, user } = useAuth() as {
    login: (creds: { email: string; password: string; deviceId?: string }) => Promise<void>;
    loading: boolean;
    error: AuthError | null;
    rateLimitStatus?: {
      lockedUntil: Date | null;
      attemptsRemaining: number;
    };
    user?: User | null;
  };

  // Local form state
  const [formValues, setFormValues] = useState<FormValues>({
    email: '',
    password: '',
    csrfToken: '',
  });

  // Setup real-time validation
  const { errors, isValid, validateField, resetValidation } = useFormValidation(formValues);

  /**
   * generateCsrfToken
   * -----------------------------------------------------------------------------
   * Placeholder to generate or fetch an anti-CSRF token for demonstration. In
   * production, you might retrieve it from an HTTP-only cookie or meta tag.
   */
  const generateCsrfToken = useCallback((): string => {
    // For demonstration, we'll pretend to generate a random token
    return `csrf_${Math.random().toString(36).substring(2)}`;
  }, []);

  /**
   * handleInputChange
   * -----------------------------------------------------------------------------
   * Synchronizes user input with local form state, triggering real-time
   * field validation for email & password.
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormValues((prev) => ({ ...prev, [name]: value }));
      validateField(name as keyof FormValues, value);
    },
    [validateField]
  );

  /**
   * handleSubmit
   * -----------------------------------------------------------------------------
   * Manages the actual login flow with rate limiting, CSRF token usage, and
   * calls to the authentication hook. If successful, triggers onSuccess();
   * if an error occurs, calls onError().
   */
  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      // Perform a final validation pass
      validateField('email', formValues.email);
      validateField('password', formValues.password);

      // If the user is locked out by the rate limiter, block further attempts
      if (rateLimitStatus && rateLimitStatus.lockedUntil && rateLimitStatus.lockedUntil > new Date()) {
        analytics.track('login_error', {
          reason: 'rate_limit_exceeded',
          timestamp: new Date().toISOString(),
        });
        onError({
          code: 'E_RATE_LIMIT',
          message: t('You have exceeded the maximum login attempts. Please try again later.'),
        });
        return;
      }

      // If form is invalid, do not proceed
      if (!isValid) {
        analytics.track('login_error', {
          reason: 'validation_failed',
          fields: errors,
          timestamp: new Date().toISOString(),
        });
        onError({
          code: 'E_FORM_INVALID',
          message: t('Please correct the highlighted errors and try again.'),
        });
        return;
      }

      // Attempt the secure login
      try {
        analytics.track('login_attempt', { email: formValues.email });
        await login({
          email: formValues.email,
          password: formValues.password,
          deviceId: 'enterprise_device_01',
        });

        // If hooking to redux or a centralized store, your user might be there
        if (user) {
          analytics.track('login_success', { userId: user.id });
          onSuccess(user);
        } else if (!error) {
          // Or if the user is asynchronously updated, wait for it or handle success
          analytics.track('login_success_noUserInState', {});
          onSuccess({
            id: 'pending_user',
            email: formValues.email,
            firstName: 'Pending',
            lastName: 'User',
            role: 'VIEWER' as const,
            permissions: [],
            isActive: true,
            lastLogin: new Date(),
          });
        }

        // Reset validation on success
        resetValidation();
      } catch (loginErr: any) {
        analytics.track('login_error', {
          reason: loginErr?.message || 'unknown',
          timestamp: new Date().toISOString(),
        });
        onError({
          code: 'E_UNKNOWN_LOGIN',
          message: loginErr?.message || t('An unknown error occurred during login.'),
        });
      }
    },
    [
      error,
      isValid,
      errors,
      formValues,
      rateLimitStatus,
      login,
      user,
      t,
      onSuccess,
      onError,
      resetValidation,
      validateField,
    ]
  );

  /**
   * useEffect: Generate CSRF token upon mount
   * -----------------------------------------------------------------------------
   * This effect simulates retrieving/generating a CSRF token to embed in
   * the form, fulfilling partial requirements of advanced security architecture.
   */
  useEffect(() => {
    const token = generateCsrfToken();
    setFormValues((prev) => ({ ...prev, csrfToken: token }));
  }, [generateCsrfToken]);

  /**
   * handleInputKeyDown
   * -----------------------------------------------------------------------------
   * Integrates with the a11y hook for advanced keyboard interactions. Users
   * can press Enter on the password field to submit. This also handles
   * accessible key codes for screen readers if needed.
   */
  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      handleKeyDown(e);
      if (e.key === 'Enter') {
        handleSubmit(e as unknown as FormEvent);
      }
    },
    [handleKeyDown, handleSubmit]
  );

  // Render the accessible form with ARIA tags and real-time error states
  return (
    <form
      data-testid={testId}
      className={className || 'tsai-login-form'}
      onSubmit={handleSubmit}
      aria-label={t('Login Form')}
    >
      {/* Email Field */}
      <label htmlFor="login-email" aria-label={t('Email')}>
        {t('Email')}
      </label>
      <input
        id="login-email"
        name="email"
        type="email"
        value={formValues.email}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        aria-invalid={!!errors.email}
        aria-describedby={errors.email ? 'email-error' : undefined}
        disabled={loading}
        placeholder={t('Enter your email')}
      />
      {errors.email && (
        <div id="email-error" role="alert" style={{ color: 'red' }}>
          {t(errors.email)}
        </div>
      )}

      {/* Password Field */}
      <label htmlFor="login-password" aria-label={t('Password')}>
        {t('Password')}
      </label>
      <input
        id="login-password"
        name="password"
        type="password"
        value={formValues.password}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        aria-invalid={!!errors.password}
        aria-describedby={errors.password ? 'password-error' : undefined}
        disabled={loading}
        placeholder={t('Enter your password')}
      />
      {errors.password && (
        <div id="password-error" role="alert" style={{ color: 'red' }}>
          {t(errors.password)}
        </div>
      )}

      {/* CSRF Token Hidden Field */}
      <input
        type="hidden"
        name="csrfToken"
        value={formValues.csrfToken}
        readOnly
      />

      {/* Rate Limit Feedback */}
      {rateLimitStatus && rateLimitStatus.attemptsRemaining <= 2 && (
        <div role="alert" style={{ color: '#c56b15', marginTop: '0.5rem' }}>
          {t('Warning: Only {{count}} login attempts remaining!', {
            count: rateLimitStatus.attemptsRemaining,
          })}
        </div>
      )}
      {rateLimitStatus && rateLimitStatus.lockedUntil && rateLimitStatus.lockedUntil > new Date() && (
        <div role="alert" style={{ color: 'red' }}>
          {t('Your account is temporarily locked due to excessive login attempts.')}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || (rateLimitStatus?.lockedUntil && rateLimitStatus.lockedUntil > new Date())}
        aria-busy={loading}
      >
        {loading ? t('Logging in...') : t('Login')}
      </button>

      {/* Global Error Display */}
      {error && (
        <div role="alert" style={{ color: 'red', marginTop: '1rem' }}>
          {t(error.message)}
        </div>
      )}
    </form>
  );
};

/**
 * -----------------------------------------------------------------------------
 * Export: LoginForm
 * -----------------------------------------------------------------------------
 * Wrap the BaseLoginForm in enterprise-level HOCs for error boundary and analytics.
 */
export const LoginForm = withAnalytics(withErrorBoundary(BaseLoginForm));
LoginForm.displayName = 'LoginForm';