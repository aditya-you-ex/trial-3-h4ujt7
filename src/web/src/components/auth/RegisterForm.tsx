import React, { useState, useEffect, useCallback } from 'react'; // react@^18.0.0
import { useForm, SubmitHandler } from 'react-hook-form'; // react-hook-form@^7.45.0
import * as yup from 'yup'; // yup@^1.2.0

/**
 * Internal Imports with explicit references as per IE1
 */
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { AuthService } from '../../services/auth.service';

/**
 * RegisterFormData
 * --------------------------------------------------------------------------------------------
 * Interface reflecting each property required for secure registration, aligning with the JSON
 * specification. All fields are typed as read-only to reinforce immutability and security
 * within the registration flow.
 */
export interface RegisterFormData {
  readonly email: string;
  readonly password: string;
  readonly confirmPassword: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: string;
  readonly deviceFingerprint: string;
}

/**
 * validationSchema
 * --------------------------------------------------------------------------------------------
 * A comprehensive Yup validation schema that enforces:
 *  - Email formatting and required rules
 *  - Secure password checks (min length, complexity)
 *  - Matching confirmPassword
 *  - Names required with basic alphabetical constraints
 *  - Role validation from a controlled set of possible roles
 *  - deviceFingerprint required
 * Custom error messages are provided for clarity.
 */
export function validationSchema(): yup.ObjectSchema<yup.AnyObject> {
  // Example blacklisted domain for demonstration only
  const blacklistedDomains = ['spam.com', 'testmail.org'];

  return yup.object({
    email: yup
      .string()
      .required('Email is required.')
      .email('Please enter a valid email address.')
      .test(
        'domain-blacklist',
        'Email domain is not allowed.',
        (value = '') => {
          const domain = value.split('@')[1] || '';
          return !blacklistedDomains.includes(domain.toLowerCase());
        }
      ),
    password: yup
      .string()
      .required('Password is required.')
      .min(8, 'Password must be at least 8 characters long.')
      .matches(/[A-Z]/, 'Password must contain at least one uppercase letter.')
      .matches(/[a-z]/, 'Password must contain at least one lowercase letter.')
      .matches(/[0-9]/, 'Password must contain at least one digit.')
      .matches(/[^A-Za-z0-9]/, 'Password must contain at least one special character.'),
    confirmPassword: yup
      .string()
      .required('Confirm password is required.')
      .oneOf([yup.ref('password')], 'Passwords must match.'),
    firstName: yup
      .string()
      .required('First name is required.')
      .matches(/^[A-Za-z]+$/, 'First name must only contain alphabetic characters.'),
    lastName: yup
      .string()
      .required('Last name is required.')
      .matches(/^[A-Za-z]+$/, 'Last name must only contain alphabetic characters.'),
    role: yup
      .string()
      .required('Role is required.')
      .oneOf(
        ['ADMIN', 'PROJECT_MANAGER', 'TEAM_LEAD', 'DEVELOPER', 'VIEWER'],
        'Role must be a valid option.'
      ),
    deviceFingerprint: yup
      .string()
      .required('Device fingerprint is required.'),
  });
}

/**
 * RegisterFormProps
 * --------------------------------------------------------------------------------------------
 * Props interface for the RegisterForm component. onSuccess and onError callbacks are
 * designed to indicate form submission outcomes to parent layers (feature pages, etc.).
 */
export interface RegisterFormProps {
  onSuccess: () => void;
  onError: (error: unknown) => void;
}

/**
 * RegisterForm
 * --------------------------------------------------------------------------------------------
 * A secure, enterprise-grade React component for user registration in TaskStream AI
 * that implements:
 *  - Comprehensive form validation using Yup and react-hook-form
 *  - OAuth authentication with PKCE
 *  - CSRF token checks, rate limiting, and advanced security features
 *  - Accessibility compliance per design system guidelines
 *
 * Properties (from JSON spec):
 *  - authService: an AuthService instance for secure registration calls
 *  - loading: indicates in-progress submission
 *  - csrfToken: used to verify server trust
 *  - rateLimit: an object tracking allowed attempts before throttling
 *  - pkceVerifier: local reference to a PKCE code challenge verifier for OAuth flows
 *
 * Functions:
 *  - handleSubmit: orchestrates CSRF check, rate limiting, token generation, and
 *    final call to authService.register. On success or error, delegates to parent
 *    callbacks for further handling (e.g. redirect, notifications).
 *  - handleOAuthLogin: handles PKCE generation, state parameter creation, and calls
 *    authService.initiateOAuth for an external provider-based flow with extensive
 *    security checks. Supports cross-tab communication placeholders for advanced
 *    structures.
 */
export const RegisterForm: React.FC<RegisterFormProps> = ({ onSuccess, onError }) => {
  /**
   * Instantiate the enterprise-grade AuthService. This service includes PKCE,
   * encryption, OAuth, circuit breakers, and logging.
   */
  const [authService] = useState<AuthService>(() => {
    // Example config might be replaced with dynamic props or environment-based settings
    return new AuthService({
      encryptionKey: 'EXAMPLE_ENCRYPTION_KEY_1234',
      pkceEnabled: true,
      rateLimitThreshold: 5,
      tokenRotationInterval: 60000, // 1 minute placeholder
      offlineSupportEnabled: false,
    });
  });

  /**
   * Local state variables reflecting the JSON specification:
   *  - loading: toggles form and button states
   *  - csrfToken: placeholder for verifying authenticity
   *  - rateLimit: tracks remaining attempts
   *  - pkceVerifier: generated code verifier for PKCE
   */
  const [loading, setLoading] = useState<boolean>(false);
  const [csrfToken, setCsrfToken] = useState<string>('CSRF_TOKEN_PLACEHOLDER');
  const [rateLimit, setRateLimit] = useState<{ remaining: number }>({ remaining: 5 });
  const [pkceVerifier, setPkceVerifier] = useState<string>('');

  /**
   * Hook up react-hook-form with the advanced Yup validation schema.
   */
  const {
    register,
    handleSubmit: hookFormSubmit,
    formState: { errors },
    reset,
  } = useForm<RegisterFormData>({
    mode: 'onBlur',
    resolver: async (values, context, options) => {
      // We call the function so that it's always the latest schema
      const schema = validationSchema();
      return schema.validate(values, { abortEarly: false })
        .then(() => ({ values, errors: {} }))
        .catch((validationError) => {
          const formErrors: Record<string, any> = {};
          if (validationError.inner) {
            validationError.inner.forEach((err: any) => {
              if (!formErrors[err.path]) {
                formErrors[err.path] = { message: err.message };
              }
            });
          }
          return { values: {}, errors: formErrors };
        });
    },
  });

  /**
   * handleSubmit
   * ----------------------------------------------------------------------------------------
   * Secure form submission handler that implements:
   *  1) CSRF token validation
   *  2) Rate limiting checks
   *  3) Loading state toggles
   *  4) Device fingerprint generation
   *  5) AuthService registration call
   *  6) Success/error callbacks and final cleanup
   */
  const handleSubmit: SubmitHandler<RegisterFormData> = useCallback(
    async (data) => {
      try {
        // 1) Validate CSRF token (placeholder check)
        if (!csrfToken || csrfToken.length < 8) {
          throw new Error('Invalid CSRF token provided.');
        }

        // 2) Rate limiting check
        if (rateLimit.remaining <= 0) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }

        setLoading(true);

        // 3) Generate a new device fingerprint for this request. 
        //    In a real system, do something more robust (like hashing system info).
        const deviceFingerprint = `fp_${Math.random().toString(36).substring(2)}`;

        // 4) Call the auth service's register method. 
        //    The JSON spec references it as a function on AuthService for user creation.
        await authService.register({
          email: data.email,
          password: data.password,
          confirmPassword: data.confirmPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          deviceFingerprint,
        });

        // Example success event, often would log or dispatch analytics
        onSuccess();

        // Reset form fields on success
        reset();
      } catch (error) {
        onError(error);
      } finally {
        // 5) Adjust rate limit state 
        setRateLimit((prev) => ({ remaining: prev.remaining - 1 }));

        // 6) Clear loading state
        setLoading(false);
      }
    },
    [authService, csrfToken, rateLimit, onSuccess, onError, reset]
  );

  /**
   * handleOAuthLogin
   * ----------------------------------------------------------------------------------------
   * Enhanced OAuth login handler with PKCE flow. This function:
   *  1) Generates a PKCE verifier and challenge
   *  2) Stores the PKCE verifier in state for future code exchange
   *  3) Creates a state parameter for CSRF/session binding
   *  4) Calls AuthService initiateOAuth for the provider
   *  5) Handles errors with a robust logging strategy
   *  6) Includes placeholders for cross-tab communication
   */
  const handleOAuthLogin = useCallback(
    async (provider: string) => {
      try {
        // 1) Generate PKCE: a random verifier and a challenge
        const { verifier, challenge } = authService.generatePKCE();
        setPkceVerifier(verifier);

        // 2) Generate a random state parameter to mitigate CSRF
        const oauthState = `st_${Math.random().toString(36).substring(2)}`;

        // 3) Initiate OAuth flow (usually triggers redirect or popup)
        await authService.initiateOAuth(provider, challenge, oauthState);

        // 4) (Optional) Cross-tab communication placeholder
        //    e.g., localStorage.setItem('oauthFlow', JSON.stringify({ provider, verifier, oauthState }));
      } catch (error) {
        onError(error);
      }
    },
    [authService, onError]
  );

  /**
   * UI Structure
   * ----------------------------------------------------------------------------------------
   * The form includes email, password, confirmPassword, firstName, lastName, role,
   * and a hidden deviceFingerprint (displayed here as an example). We also provide
   * buttons to handle submission or OAuth-based flows.
   */
  return (
    <div
      style={{
        maxWidth: 400,
        margin: '0 auto',
        border: '1px solid #E5E7EB',
        padding: '1rem',
        borderRadius: 6,
      }}
    >
      <h2 style={{ marginBottom: '1rem' }}>Register for TaskStream AI</h2>
      <form onSubmit={hookFormSubmit(handleSubmit)} noValidate>
        {/* Email Field */}
        <div style={{ marginBottom: '1rem' }}>
          <Input
            id="register-email"
            type="email"
            placeholder="Enter your email"
            aria-label="Email"
            aria-describedby="register-email-help"
            // react-hook-form binding
            {...register('email')}
            error={errors.email?.message}
            required
          />
        </div>

        {/* Password Field */}
        <div style={{ marginBottom: '1rem' }}>
          <Input
            id="register-password"
            type="password"
            placeholder="Enter a secure password"
            aria-label="Password"
            aria-describedby="register-password-help"
            {...register('password')}
            error={errors.password?.message}
            required
          />
        </div>

        {/* Confirm Password Field */}
        <div style={{ marginBottom: '1rem' }}>
          <Input
            id="register-confirm-password"
            type="password"
            placeholder="Confirm your password"
            aria-label="Confirm Password"
            aria-describedby="register-confirm-password-help"
            {...register('confirmPassword')}
            error={errors.confirmPassword?.message}
            required
          />
        </div>

        {/* First Name Field */}
        <div style={{ marginBottom: '1rem' }}>
          <Input
            id="register-first-name"
            type="text"
            placeholder="First Name"
            aria-label="First Name"
            {...register('firstName')}
            error={errors.firstName?.message}
            required
          />
        </div>

        {/* Last Name Field */}
        <div style={{ marginBottom: '1rem' }}>
          <Input
            id="register-last-name"
            type="text"
            placeholder="Last Name"
            aria-label="Last Name"
            {...register('lastName')}
            error={errors.lastName?.message}
            required
          />
        </div>

        {/* Role Field */}
        <div style={{ marginBottom: '1rem' }}>
          <Input
            id="register-role"
            type="text"
            placeholder="Role (e.g. DEVELOPER)"
            aria-label="Role"
            {...register('role')}
            error={errors.role?.message}
            required
          />
        </div>

        {/* deviceFingerprint Field (example hidden or advanced usage) */}
        <div style={{ display: 'none' }}>
          <Input
            id="register-device-fingerprint"
            type="text"
            placeholder="Fingerprint"
            aria-label="Device Fingerprint"
            {...register('deviceFingerprint')}
          />
        </div>

        {/* Submit Button */}
        <Button
          variant="primary"
          size="md"
          type="submit"
          disabled={loading}
          loading={loading}
          fullWidth
          ariaLabel="Complete registration"
        >
          Register
        </Button>
      </form>

      {/* OAuth Quick Actions */}
      <div style={{ marginTop: '1rem' }}>
        <p style={{ textAlign: 'center', margin: '1rem 0' }}>Or Sign Up With</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOAuthLogin('GOOGLE')}
            ariaLabel="Register with Google"
          >
            Google
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOAuthLogin('GITHUB')}
            ariaLabel="Register with GitHub"
          >
            GitHub
          </Button>
        </div>
      </div>
    </div>
  );
};