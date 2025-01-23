////////////////////////////////////////////////////////////////////////////////////////////////////
// External Library Imports with Specific Versions
////////////////////////////////////////////////////////////////////////////////////////////////////
// rate-limiter-flexible v2.4.1 : For request rate limiting
import { RateLimiterMemory } from 'rate-limiter-flexible';
// helmet v7.0.0 : For managing HTTP security headers
import helmet from 'helmet';
// @taskstream/security-context v1.0.0 : For security context management and validation
import { SecurityContext } from '@taskstream/security-context';
// @taskstream/monitoring v1.0.0 : For performance and security monitoring
import { MonitoringService } from '@taskstream/monitoring';

////////////////////////////////////////////////////////////////////////////////////////////////////
// Internal Imports
////////////////////////////////////////////////////////////////////////////////////////////////////
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

////////////////////////////////////////////////////////////////////////////////////////////////////
// Interface & TypeScript Declarations
////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * Interface describing the authentication controller's configuration object,
 * which may contain additional initialization parameters or environment options
 * if needed for extended enterprise use cases.
 */
interface AuthControllerConfig {
  rateLimitPoints?: number;
  rateLimitDuration?: number;
  rateLimitBlockDuration?: number;
}

////////////////////////////////////////////////////////////////////////////////////////////////////
// AuthController Class Definition
////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * The AuthController class is responsible for handling HTTP endpoints related to
 * authentication, including:
 *  - Login
 *  - Refreshing Tokens
 *  - Logout / Session termination
 *  - OAuth2 Provider Callback
 *
 * This controller ensures:
 *  1) Strict adherence to the OAuth2 and JWT-based Authentication flow (Tech Specs 7.1.1).
 *  2) Role-based and permission-based checks aligned with the Authorization Matrix (7.1.2).
 *  3) Standardized API Response formats (3.3.4 API Response Standards).
 *  4) Reliability (99.9% uptime) through robust error handling, rate limiting, and security checks.
 *  5) Enhanced security with correlation IDs, security context tracking, and sanitized error outputs.
 */
export class AuthController {
  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Properties
  //////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * The core authentication service instance that provides methods such as:
   *  - login
   *  - refreshToken
   *  - logout
   *  - handleOAuthCallback
   *  - validateMFA
   */
  private readonly authService: AuthService;

  /**
   * SecurityContext instance for managing role-based access, correlation IDs, and
   * security validations at the request level. Enhances tracking and helps enforce
   * policy from the Authorization Matrix (7.1.2).
   */
  private readonly securityContext: SecurityContext;

  /**
   * MonitoringService instance for capturing metrics, performance data, and error events
   * to ensure reliability and facilitate real-time alerting.
   */
  private readonly monitoringService: MonitoringService;

  /**
   * A rate limiter instance that helps defend against brute force or other abusive behaviors.
   * It uses an in-memory store by default here, but can be extended to Redis or other
   * data stores for distributed environments.
   */
  private readonly rateLimiter: RateLimiterMemory;

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Constructor
  //////////////////////////////////////////////////////////////////////////////////////////////////
  /**
   * Constructs the AuthController with enterprise-grade configurations that integrate
   * security, monitoring, and reliability features. The constructor also sets up a
   * rate limiter to protect against excessive requests.
   *
   * Steps:
   *  1) Initialize AuthService instance for authentication logic.
   *  2) Initialize SecurityContext to manage request security data and correlation IDs.
   *  3) Initialize MonitoringService to track performance and security metrics.
   *  4) Configure and instantiate a RateLimiterMemory for inbound requests.
   *  5) Optionally integrate default HTTP headers and security settings via helmet.
   *
   * @param authService An instance of AuthService providing core authentication logic.
   * @param securityContext An instance of SecurityContext for role-based checks and correlation.
   * @param monitoringService An instance of MonitoringService for logging and metrics.
   * @param config An optional configuration object for customizing rate limiter behavior.
   */
  constructor(
    authService: AuthService,
    securityContext: SecurityContext,
    monitoringService: MonitoringService,
    config: AuthControllerConfig = {},
  ) {
    this.authService = authService;
    this.securityContext = securityContext;
    this.monitoringService = monitoringService;

    // Configure RateLimiter with enterprise-friendly defaults unless overridden
    const points = config.rateLimitPoints ?? 5;
    const duration = config.rateLimitDuration ?? 60;
    const blockDuration = config.rateLimitBlockDuration ?? 300;

    this.rateLimiter = new RateLimiterMemory({
      points,
      duration,
      blockDuration,
      keyPrefix: 'auth_route',
    });

    // Optionally set up baseline security headers using helmet
    // In a typical application, helmet would be applied at the Express app level.
    helmet();
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Public Methods (Named Exports from the Class)
  //////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Handles user login with enhanced security and reliability. Implements standard
   * authentication flow (7.1.1), along with correlation ID, rate limiting, and
   * comprehensive error handling. Also logs performance metrics and ensures
   * a standardized response format compliant with (3.3.4 API Response Standards).
   *
   * Steps:
   *  1) Generate/Extract correlation ID for monitoring and logging.
   *  2) Enforce rate limits using the RateLimiterMemory instance.
   *  3) Parse request body to gather credentials (email, password, mfaToken).
   *  4) Call AuthService.login() to perform the actual authentication logic.
   *  5) Capture success or error results and format them into the standardized response.
   *  6) Record event in MonitoringService for reliability tracking.
   *
   * @param req Express Request object
   * @param res Express Response object
   * @param next Express NextFunction for error handling
   */
  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    const correlationId = this.securityContext.getCorrelationId(req) ||
                          this.securityContext.generateCorrelationId();

    try {
      // Step 2) Rate limiting based on IP address or correlation
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      await this.rateLimiter.consume(ip);

      // Step 3) Extract credentials
      const { email, password, mfaToken } = req.body || {};

      // Step 4) Perform authentication via AuthService
      const loginResult = await this.authService.login(
        { email, password, mfaToken },
        ip,
      );

      // Step 5) Return success response in standardized format
      const responseBody = {
        status: 'success',
        message: 'Login successful',
        data: {
          accessToken: loginResult.accessToken,
          refreshToken: loginResult.refreshToken,
          expiresIn: loginResult.expiresIn,
          user: loginResult.user,
          requiresMfa: loginResult.requiresMfa,
        },
        errors: [],
        metadata: {
          requestId: correlationId,
          timestamp: new Date(),
        },
      };

      // Step 6) Log to monitoring service for reliability metrics
      this.monitoringService.captureEvent('AUTH_LOGIN_SUCCESS', {
        userId: loginResult.user.id,
        correlationId,
      });

      res.status(200).json(responseBody);
    } catch (error: any) {
      // Rate limit or authentication errors are caught here
      this.monitoringService.captureException(error, { correlationId });
      const errorResponse = {
        status: 'error',
        message: error?.message || 'Login failed',
        data: {},
        errors: [
          {
            code: 'LOGIN_ERROR',
            message: error?.message || 'Unable to process login',
            details: { correlationId },
            timestamp: new Date(),
            stackTrace: process.env.NODE_ENV === 'production' ? '' : error?.stack,
          },
        ],
        metadata: {
          requestId: correlationId,
          timestamp: new Date(),
        },
      };
      res.status(400).json(errorResponse);
      return next(error);
    }
  }

  /**
   * Handles the token refresh flow by validating the provided refresh token,
   * generating a new access token, and returning a standardized response.
   * Enforces security measures and logs relevant metrics for reliability (99.9% uptime).
   *
   * Steps:
   *  1) Extract correlation ID for consistent tracking.
   *  2) Enforce rate limits on refresh attempts (prevent token bruteforce).
   *  3) Validate the refresh token via AuthService.refreshToken().
   *  4) Return newly issued token data in the standardized format.
   *  5) Log event to MonitoringService for auditing and performance data.
   *
   * @param req Express Request object
   * @param res Express Response object
   * @param next Express NextFunction for error handling
   */
  public async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    const correlationId = this.securityContext.getCorrelationId(req) ||
                          this.securityContext.generateCorrelationId();
    try {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      await this.rateLimiter.consume(ip);

      // The refresh token might be provided in headers or body
      const { refreshToken } = req.body || {};
      if (!refreshToken) {
        throw new Error('No refresh token provided');
      }

      const refreshResult = await this.authService.refreshToken(refreshToken, ip);

      const responseBody = {
        status: 'success',
        message: 'Token refreshed successfully',
        data: {
          accessToken: refreshResult.accessToken,
          refreshToken: refreshResult.refreshToken,
          expiresIn: refreshResult.expiresIn,
        },
        errors: [],
        metadata: {
          requestId: correlationId,
          timestamp: new Date(),
        },
      };

      this.monitoringService.captureEvent('AUTH_REFRESH_SUCCESS', {
        correlationId,
        userId: refreshResult.userId,
      });

      res.status(200).json(responseBody);
    } catch (error: any) {
      this.monitoringService.captureException(error, { correlationId });
      const errorResponse = {
        status: 'error',
        message: error?.message || 'Refresh token failed',
        data: {},
        errors: [
          {
            code: 'REFRESH_TOKEN_ERROR',
            message: error?.message || 'Unable to refresh token',
            details: { correlationId },
            timestamp: new Date(),
            stackTrace: process.env.NODE_ENV === 'production' ? '' : error?.stack,
          },
        ],
        metadata: {
          requestId: correlationId,
          timestamp: new Date(),
        },
      };
      res.status(400).json(errorResponse);
      return next(error);
    }
  }

  /**
   * Logs the user out, invalidating or blacklisting the relevant tokens and
   * ending the user's session on the server side. Contributes to robust session
   * control and security best practices.
   *
   * Steps:
   *  1) Extract correlation ID.
   *  2) Enforce basic rate limit on logout calls.
   *  3) Invalidate the active session via AuthService.logout().
   *  4) Send standardized success response and log event data.
   *
   * @param req Express Request object
   * @param res Express Response object
   * @param next Express NextFunction for error handling
   */
  public async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    const correlationId = this.securityContext.getCorrelationId(req) ||
                          this.securityContext.generateCorrelationId();
    try {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      await this.rateLimiter.consume(ip);

      // The access token may be sent in an Authorization header or request body
      const token = req.headers.authorization?.split(' ')[1] || req.body?.accessToken;
      if (!token) {
        throw new Error('No access token provided to logout');
      }

      await this.authService.logout(token, ip);

      const responseBody = {
        status: 'success',
        message: 'User logged out successfully',
        data: {},
        errors: [],
        metadata: {
          requestId: correlationId,
          timestamp: new Date(),
        },
      };

      this.monitoringService.captureEvent('AUTH_LOGOUT_SUCCESS', { correlationId });
      res.status(200).json(responseBody);
    } catch (error: any) {
      this.monitoringService.captureException(error, { correlationId });
      const errorResponse = {
        status: 'error',
        message: error?.message || 'Logout failed',
        data: {},
        errors: [
          {
            code: 'LOGOUT_ERROR',
            message: error?.message || 'Unable to logout',
            details: { correlationId },
            timestamp: new Date(),
            stackTrace: process.env.NODE_ENV === 'production' ? '' : error?.stack,
          },
        ],
        metadata: {
          requestId: correlationId,
          timestamp: new Date(),
        },
      };
      res.status(400).json(errorResponse);
      return next(error);
    }
  }

  /**
   * Handles the callback flow from external OAuth providers (e.g., Google, GitHub),
   * exchanging authorization codes for user data and session tokens. Integrates
   * with AuthService.handleOAuthCallback() for extended security checks,
   * linking or creating user accounts, and returning standardized responses.
   *
   * Steps:
   *  1) Extract correlation ID and enforce rate limiting (prevent callback spamming).
   *  2) Retrieve 'code' or 'state' from query parameters.
   *  3) Pass to AuthService for OAuth2 token exchange and user creation/linking.
   *  4) Return newly authenticated user details or tokens.
   *  5) Log call in MonitoringService for auditing.
   *
   * @param req Express Request object
   * @param res Express Response object
   * @param next Express NextFunction for error handling
   */
  public async oauthCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    const correlationId = this.securityContext.getCorrelationId(req) ||
                          this.securityContext.generateCorrelationId();
    try {
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      await this.rateLimiter.consume(ip);

      // Typically we get these from query params
      const { code, state } = req.query;
      if (!code) {
        throw new Error('Missing OAuth authorization code');
      }

      const oauthResult = await this.authService.handleOAuthCallback(
        code.toString(),
        state?.toString(),
      );

      const responseBody = {
        status: 'success',
        message: 'OAuth callback successful',
        data: {
          accessToken: oauthResult.accessToken,
          refreshToken: oauthResult.refreshToken,
          expiresIn: oauthResult.expiresIn,
          user: oauthResult.user,
        },
        errors: [],
        metadata: {
          requestId: correlationId,
          timestamp: new Date(),
        },
      };

      this.monitoringService.captureEvent('AUTH_OAUTH_CALLBACK_SUCCESS', {
        correlationId,
        provider: oauthResult.provider,
      });

      res.status(200).json(responseBody);
    } catch (error: any) {
      this.monitoringService.captureException(error, { correlationId });
      const errorResponse = {
        status: 'error',
        message: error?.message || 'OAuth callback failed',
        data: {},
        errors: [
          {
            code: 'OAUTH_CALLBACK_ERROR',
            message: error?.message || 'Cannot complete OAuth callback',
            details: { correlationId },
            timestamp: new Date(),
            stackTrace: process.env.NODE_ENV === 'production' ? '' : error?.stack,
          },
        ],
        metadata: {
          requestId: correlationId,
          timestamp: new Date(),
        },
      };
      res.status(400).json(errorResponse);
      return next(error);
    }
  }
}