////////////////////////////////////////////////////////////////////////////////
// External Imports (with version comments)
////////////////////////////////////////////////////////////////////////////////
import { Request, Response, NextFunction } from 'express'; // ^4.18.2
import * as winston from 'winston'; // ^3.8.0
import CircuitBreaker from 'opossum'; // ^7.1.0
import { createClient } from 'redis'; // ^4.6.0
import * as PromClient from 'prom-client'; // ^14.2.0
import { JwtPayload } from 'jsonwebtoken'; // ^9.0.0

////////////////////////////////////////////////////////////////////////////////
// Internal Imports
////////////////////////////////////////////////////////////////////////////////
import { session, security } from '../config'; // Accessing configuration objects
import { AuthService } from '../services/auth.service'; // Provides token verification and blacklist checks
import { IJwtPayload, UserRole } from '../../../../shared/interfaces/auth.interface';
import { AUTH_ERRORS } from '../../../../shared/constants/error-codes'; // For consistent error handling

////////////////////////////////////////////////////////////////////////////////
// Winston Logger Setup
////////////////////////////////////////////////////////////////////////////////
/**
 * In a production application, a shared logger instance might be injected
 * or imported from a common logging utility. For this middleware, we create
 * an instance configured with console transport, suitable for demonstration.
 */
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

////////////////////////////////////////////////////////////////////////////////
// Redis Client and Circuit Breaker Setup
////////////////////////////////////////////////////////////////////////////////
/**
 * Creates a Redis client for potential rate-limiting, blacklisting, or advanced
 * security checks. The AuthService class also uses a Redis client internally,
 * but here we showcase how a separate client can be used if necessary.
 *
 * For 99.9% uptime readiness, we wrap critical calls with a circuit breaker
 * to avoid cascading failures when Redis is unresponsive.
 */
const redisClient = createClient({
  // In a real deployment, connection details (host, port, auth) come from env
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});
redisClient.connect().catch((err) => {
  logger.error('Failed to connect Redis in JWT middleware.', { error: err });
});

/**
 * A circuit breaker around an example Redis operation if needed in this middleware.
 * You can expand usage to wrap additional security or data retrieval steps.
 */
const redisBreaker = new CircuitBreaker(
  async (commandArgs: { key: string }) => {
    const { key } = commandArgs;
    // Example get operation to demonstrate circuit usage
    return redisClient.get(key);
  },
  {
    timeout: 5000, // Timeout after 5s
    errorThresholdPercentage: 50, // Open circuit if 50% requests fail
    resetTimeout: 10000, // Half-open after 10s
  },
);

/**
 * Handle Circuit Breaker events for observability and reliability management.
 */
redisBreaker.on('open', () => logger.warn('Redis circuit breaker opened'));
redisBreaker.on('close', () => logger.info('Redis circuit breaker closed'));

////////////////////////////////////////////////////////////////////////////////
// Prometheus Metrics
////////////////////////////////////////////////////////////////////////////////
/**
 * We define counters to measure how often the JWT middleware runs, how many
 * validations succeed or fail, plus additional security metrics. These feed
 * into enterprise monitoring in line with 99.9% uptime goals.
 */
const jwtValidationRequestsTotal = new PromClient.Counter({
  name: 'ts_jwt_validation_requests_total',
  help: 'Total number of requests passing through validateJwt middleware',
});

const jwtValidationFailuresTotal = new PromClient.Counter({
  name: 'ts_jwt_validation_failures_total',
  help: 'Total number of JWT validation failures in the middleware',
});

const roleCheckRequestsTotal = new PromClient.Counter({
  name: 'ts_role_check_requests_total',
  help: 'Total number of requests passing through requireRole middleware',
});

const roleCheckFailuresTotal = new PromClient.Counter({
  name: 'ts_role_check_failures_total',
  help: 'Total number of role-based access failures in the middleware',
});

////////////////////////////////////////////////////////////////////////////////
// AuthService Instantiation
////////////////////////////////////////////////////////////////////////////////
/**
 * Normally, AuthService might be constructed using dependency injection to
 * provide the user repository, Redis client, and logger. For demonstration,
 * we highlight direct instantiation with placeholders or assumption that
 * the service is fully configured. If you have a DI container, adapt as needed.
 */
// Placeholder repository or actual TypeORM repository can be injected
// For this example, we assume AuthService manages its own references or stubs
const authService = new AuthService(
  // @ts-expect-error Example skeleton, replace with actual user repository instance
  {},
  redisClient as any,
  logger,
);

////////////////////////////////////////////////////////////////////////////////
// 1) validateJwt Middleware
////////////////////////////////////////////////////////////////////////////////
/**
 * validateJwt
 * -----------------------------------------------------------------------------
 * Express middleware that performs comprehensive JWT token validation with
 * multiple security checks. Implements the requirements from:
 *  - Authentication Flow (7.1.1): signature, expiration, blacklist
 *  - Security Protocols (7.3.1): rate limiting, request tracing
 *  - System Reliability (1.2): circuit breakers, performance monitoring
 *  - Detailed logging and metrics
 *
 * Steps:
 *  1) Generate request correlation ID for tracing
 *  2) Validate request headers and structure
 *  3) Extract JWT token from Authorization header
 *  4) Check rate limits for IP and user (can be partial here or rely on service)
 *  5) Verify token signature, expiration, and blacklist checks
 *  6) Decode and validate token payload structure
 *  7) Verify user permissions/status at a high level
 *  8) Log security event with correlation ID
 *  9) Update metrics for monitoring
 * 10) Attach user context to request
 * 11) Handle token refresh if needed (placeholder)
 * 12) Continue to next middleware on success
 */
export async function validateJwt(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // (1) Generate request correlation ID for distributed tracing
  // We check if there's an existing ID or generate a new one
  const correlationId =
    (req.headers['x-correlation-id'] as string) ||
    `corr-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  // Attach correlationId to request object for logging or passing forward
  (req as any).correlationId = correlationId;

  // (2) Validate request headers ensure we have 'Authorization: Bearer <token>'
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    jwtValidationFailuresTotal.inc();
    logger.warn('Missing or invalid Authorization header', {
      correlationId,
      errorCode: AUTH_ERRORS.INVALID_TOKEN,
    });
    return res.status(401).json({
      code: AUTH_ERRORS.INVALID_TOKEN,
      message: 'Authorization header missing or malformed',
      details: { correlationId },
      timestamp: new Date().toISOString(),
    });
  }

  // (3) Extract JWT token from Authorization
  const token = authHeader.slice(7).trim();
  if (!token) {
    jwtValidationFailuresTotal.inc();
    logger.warn('No token found after Bearer prefix', {
      correlationId,
      errorCode: AUTH_ERRORS.INVALID_TOKEN,
    });
    return res.status(401).json({
      code: AUTH_ERRORS.INVALID_TOKEN,
      message: 'Empty token in Authorization header',
      details: { correlationId },
      timestamp: new Date().toISOString(),
    });
  }

  // (4) Check rate limits for IP (basic demonstration, can be delegated to AuthService)
  // For enterprise readiness, session or security config might be used, e.g., security.rateLimit
  // or session-based settings. Detailed implementation can vary by environment.
  jwtValidationRequestsTotal.inc();

  // (5) Use the AuthService to do advanced verification: signature, expiration, blacklist, etc.
  let decodedPayload: IJwtPayload | null = null;
  try {
    // We'll wrap token verification in a circuit breaker to protect from potential issues
    // in verification logic, though typically you'd wrap external calls. This is for demonstration.
    const verifyBreaker = new CircuitBreaker(
      async (args: { jwtToken: string; ip: string }) => {
        return authService.verifyTokenWithEnhancedSecurity(args.jwtToken, args.ip);
      },
      {
        timeout: 8000, // If verification takes longer than 8s, break
        errorThresholdPercentage: 50,
        resetTimeout: 15000, // Try again after 15s
      },
    );

    // Listen for breaker state changes
    verifyBreaker.on('open', () =>
      logger.error('JWT verification circuit breaker opened', { correlationId }),
    );
    verifyBreaker.on('halfOpen', () =>
      logger.warn('JWT verification circuit breaker half-open', { correlationId }),
    );
    verifyBreaker.on('close', () =>
      logger.info('JWT verification circuit breaker closed', { correlationId }),
    );

    decodedPayload = await verifyBreaker.fire({ jwtToken: token, ip: req.ip });

    // If we reached here, verification succeeded
  } catch (error) {
    jwtValidationFailuresTotal.inc();
    logger.warn('Token verification failed', {
      correlationId,
      error: (error as Error).message,
      errorCode: AUTH_ERRORS.INVALID_TOKEN,
    });
    return res.status(401).json({
      code: AUTH_ERRORS.INVALID_TOKEN,
      message: 'Invalid or expired token',
      details: { correlationId },
      timestamp: new Date().toISOString(),
    });
  }

  // (6) The decode and payload validation step is already done by AuthService,
  //     but we can add extra checks if needed. The 'decodedPayload' must match
  //     the IJwtPayload structure.
  if (!decodedPayload || !decodedPayload.userId) {
    jwtValidationFailuresTotal.inc();
    logger.error('Decoded token payload missing userId', {
      correlationId,
      errorCode: AUTH_ERRORS.INVALID_TOKEN,
    });
    return res.status(401).json({
      code: AUTH_ERRORS.INVALID_TOKEN,
      message: 'Decoded payload invalid',
      details: { correlationId },
      timestamp: new Date().toISOString(),
    });
  }

  // (7) Verify user is active and has no broad constraints. The AuthService check
  //     includes user status. If necessary, add extra checks here.

  // (8) Log security event with correlation ID for auditing
  logger.info('JWT validation successful', {
    correlationId,
    userId: decodedPayload.userId,
    ipAddress: req.ip,
  });

  // (9) Update metrics: at this point, we've had a successful validation
  // We already incremented total requests. We can optionally track success counters.
  // e.g., define a separate "jwtValidationSuccessesTotal" if needed.

  // (10) Attach user context to request (commonly done as req.user)
  (req as any).user = decodedPayload;

  // (11) Handle token refresh if needed (placeholder).
  // If the token is close to expiry, the system might issue a new token
  // or respond with instructions for refresh. This is environment-dependent.

  // (12) Continue to the next middleware
  return next();
}

////////////////////////////////////////////////////////////////////////////////
// 2) requireRole Middleware Factory
////////////////////////////////////////////////////////////////////////////////
/**
 * requireRole
 * -----------------------------------------------------------------------------
 * Advanced middleware factory for role-based access control, supporting the
 * hierarchical permissions model from the platform's Authorization Matrix (7.1.2).
 *
 * Steps:
 *  1) Return middleware function with closure over allowed roles
 *  2) Verify request context and user object (set by validateJwt)
 *  3) Check user role against allowed roles or hierarchical logic
 *  4) Validate additional security constraints if provided in options
 *  5) Log access control decision
 *  6) Update security metrics or counters
 *  7) Continue if authorized, return 403 if unauthorized
 *
 * @param allowedRoles Array of UserRole enumerations allowed to access route
 * @param options Optional advanced security constraints (TBD)
 * @returns Express RequestHandler
 */
export function requireRole(
  allowedRoles: UserRole[],
  options?: Record<string, any>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // (1) We have the closure with the 'allowedRoles' array and any extra options

    // (2) Verify request context and user object
    roleCheckRequestsTotal.inc();
    const correlationId = (req as any).correlationId || `corr-${Date.now()}`;
    const userPayload = (req as any).user as IJwtPayload | undefined;

    if (!userPayload) {
      roleCheckFailuresTotal.inc();
      logger.warn('No user payload found on request, cannot authorize', {
        correlationId,
        errorCode: AUTH_ERRORS.UNAUTHORIZED,
      });
      return res.status(401).json({
        code: AUTH_ERRORS.UNAUTHORIZED,
        message: 'User not authenticated or token invalid',
        details: { correlationId },
        timestamp: new Date().toISOString(),
      });
    }

    // (3) Check user role against allowed roles
    // If we want a hierarchical approach (e.g., ADMIN can bypass everything),
    // we can do so. This example checks if the role is included, or if ADMIN is the user role.
    // Additionally, we could incorporate user permissions array if needed.
    const userRole = userPayload.role;
    const isAllowed =
      userRole === UserRole.ADMIN || // Admin override
      allowedRoles.includes(userRole);

    if (!isAllowed) {
      roleCheckFailuresTotal.inc();
      logger.warn('Role-based access denied', {
        correlationId,
        userId: userPayload.userId,
        userRole,
        allowedRoles,
        errorCode: AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
      });
      return res.status(403).json({
        code: AUTH_ERRORS.INSUFFICIENT_PERMISSIONS,
        message: 'Forbidden: insufficient role level',
        details: { correlationId, userRole, allowedRoles },
        timestamp: new Date().toISOString(),
      });
    }

    // (4) Validate additional security constraints if provided in options (placeholder).
    // e.g., time-of-day restrictions, feature flag checks, advanced attribute-based checks.

    // (5) Log access control decision
    logger.info('Role-based access granted', {
      correlationId,
      userId: userPayload.userId,
      userRole,
      allowedRoles,
    });

    // (6) Update security metrics
    // We could track a success for role checks if we want a separate counter.

    // (7) Continue if authorized
    return next();
  };
}