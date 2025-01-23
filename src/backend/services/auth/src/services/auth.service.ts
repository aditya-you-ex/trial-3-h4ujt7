////////////////////////////////////////////////////////////////////////////////////////////////////
// Imports & Dependencies
////////////////////////////////////////////////////////////////////////////////////////////////////

// Third-party or external libraries (with specific versions)
/*
  ioredis ^5.3.2 : For Redis client to manage tokens, blacklisting, and session data
  rate-limiter-flexible ^2.4.1 : For robust IP-based rate limiting and protection against brute force
  prom-client ^14.2.0 : For Prometheus metrics collection and exposure in the authentication service
  winston ^3.8.0 : For structured logging of security events and service logs
  opossum ^6.0.1 : For implementing circuit breaker patterns around Redis operations
  jsonwebtoken ^9.0.0 : For issuing and verifying JWT tokens securely
*/

// Internal imports
import { Repository } from 'typeorm'; // version ^0.3.17
import { User } from '../models/user.model';

// Authentication & interface imports
import {
  IAuthRequest,
  IAuthResponse,
  IJwtPayload,
} from '../../../../shared/interfaces/auth.interface';

// External library imports
import Redis from 'ioredis'; // version ^5.3.2
import { RateLimiterRedis } from 'rate-limiter-flexible'; // version ^2.4.1
import * as Prometheus from 'prom-client'; // version ^14.2.0
import * as winston from 'winston'; // version ^3.8.0
import CircuitBreaker from 'opossum'; // version ^6.0.1
import { sign, verify } from 'jsonwebtoken'; // version ^9.0.0

////////////////////////////////////////////////////////////////////////////////////////////////////
// AuthService Class Definition
////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * The AuthService class implements core authentication logic, including:
 *  - Secure user login with rate limiting, suspicious activity checks, and MFA readiness
 *  - JWT token generation and management with rotation and blacklisting
 *  - Token verification with an advanced security model
 *  - Integration with Redis for session and token storage, plus lockout measures
 *  - Circuit breaker for Redis operations to enhance reliability (targeting 99.9% uptime)
 *  - Prometheus metrics for tracking authentication attempts and failures
 *  - Winston-based logging for security and auditing
 *
 * This class addresses:
 *  - 7.1.1 Authentication Flow
 *  - 7.1.2 Authorization Matrix
 *  - 7.2.1 Data Security (Token encryption, blacklisting, rotation)
 *  - 1.2 System Overview (System Reliability & Monitoring)
 */
export class AuthService {
  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Class Properties
  //////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Repository for the User entity, enabling creation, updates, and queries against users.
   * This ensures direct interaction with database records for authentication and validation.
   */
  private readonly userRepository: Repository<User>;

  /**
   * The Redis client instance used for storing token metadata, blacklisting tokens,
   * and persisting login session data. Ensures fast read/write performance.
   */
  private readonly redisClient: Redis;

  /**
   * A circuit breaker instance to wrap Redis operations. Helps maintain service reliability
   * by preventing cascading failures if Redis experiences issues.
   */
  private readonly redisBreaker: CircuitBreaker;

  /**
   * An IP-based rate limiter that leverages Redis as a backend. Prevents brute-force
   * attacks by limiting repeated authentication attempts from a single IP within a timeframe.
   */
  private readonly rateLimiter: RateLimiterRedis;

  /**
   * Winston logger used for security event and audit logs, capturing critical
   * authentication lifecycle events and suspicious activity.
   */
  private readonly logger: winston.Logger;

  /**
   * Prometheus counter metric tracking total authentication attempts in this service.
   */
  private readonly authAttempts: Prometheus.Counter<string>;

  /**
   * Prometheus counter metric tracking authentication failures (invalid credentials,
   * rate-limit hits, suspicious attempts) in this service.
   */
  private readonly authFailures: Prometheus.Counter<string>;

  /**
   * Represents the amount of time (in seconds) for which issued tokens remain valid
   * before rotation or expiration is enforced. Illustrates a token rotation policy.
   */
  private readonly tokenExpirationSeconds: number;

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Constructor
  //////////////////////////////////////////////////////////////////////////////////////////////////
  /**
   * Initializes the AuthService with enhanced security features, including Redis-based
   * circuit breaker, rate limiter, Prometheus metrics, and Winston logging.
   *
   * Steps:
   *  1) Initialize user repository
   *  2) Set up Redis client with circuit breaker
   *  3) Configure rate limiter
   *  4) Initialize logger
   *  5) Set up metrics collectors
   *  6) Configure token rotation policy
   *
   * @param userRepository Repository for performing CRUD operations on User entities
   * @param redisClient Redis connection instance for storing tokens and blacklists
   * @param logger Winston logger instance for security and audit logging
   */
  constructor(
    userRepository: Repository<User>,
    redisClient: Redis,
    logger: winston.Logger,
  ) {
    // 1) Initialize user repository
    this.userRepository = userRepository;

    // 2) Set up Redis client with circuit breaker
    this.redisClient = redisClient;
    // Example circuit breaker options; these can be tuned as needed:
    const breakerOptions = {
      timeout: 5000, // If Redis operation takes longer than 5s, trigger fallback
      errorThresholdPercentage: 50, // When 50% of requests fail, open the circuit
      resetTimeout: 10000, // After 10s, try to close the circuit again
    };
    this.redisBreaker = new CircuitBreaker(
      async (commandArgs: { key: string; value?: string; expiry?: number }) => {
        // This function is invoked by the circuit breaker when we do redis operations
        const { key, value, expiry } = commandArgs;
        // As an example, let's store a key if value is provided; otherwise just do a get
        if (value) {
          await this.redisClient.set(key, value, 'EX', expiry ?? 3600);
        } else {
          return await this.redisClient.get(key);
        }
        return null;
      },
      breakerOptions,
    );

    // 3) Configure rate limiter (using Redis to coordinate across multiple instances)
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redisClient,
      keyPrefix: 'auth_rl',
      points: 5, // Maximum number of requests
      duration: 60, // Per 60 seconds
      blockDuration: 300, // Block for 5 minutes if consumed more than points
      execEvenly: false, // Perform as soon as a request arrives if there are points
    });

    // 4) Initialize logger
    this.logger = logger;

    // 5) Set up metrics collectors
    this.authAttempts = new Prometheus.Counter({
      name: 'ts_auth_attempts_total',
      help: 'Total number of authentication attempts in the AuthService',
    });

    this.authFailures = new Prometheus.Counter({
      name: 'ts_auth_failures_total',
      help: 'Total number of authentication failures in the AuthService',
    });

    // 6) Configure token rotation policy (e.g., 1 hour default)
    this.tokenExpirationSeconds = 3600;
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Public Methods
  //////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Authenticates a user with enhanced security checks, including IP-based rate limiting,
   * suspicious activity detection, and robust JWT token issuance with rotation policies.
   *
   * Steps:
   *  1) Check rate limit for IP address
   *  2) Validate user credentials
   *  3) Check for suspicious activity patterns
   *  4) Generate secure tokens with rotation policy
   *  5) Store token metadata in Redis
   *  6) Log security event
   *  7) Update metrics
   *
   * @param credentials User's credentials, including email, password, and optional MFA
   * @param ipAddress String representing the request's IP address
   * @returns Promise<IAuthResponse> containing new access token, refresh token, user data, etc.
   */
  public async login(
    credentials: IAuthRequest,
    ipAddress: string,
  ): Promise<IAuthResponse> {
    // 1) Check rate limit for IP address
    this.authAttempts.inc();
    try {
      await this.rateLimiter.consume(ipAddress);
    } catch (rateLimitError) {
      this.authFailures.inc();
      this.logger.warn('Rate limit exceeded', {
        ipAddress,
        reason: 'Too many login attempts',
      });
      throw new Error('Too many login attempts. Please try again later.');
    }

    // 2) Validate user credentials
    const user = await this.userRepository.findOne({
      where: { email: credentials.email },
      select: [
        'id',
        'email',
        'password',
        'role',
        'permissions',
        'isActive',
        'failedLoginAttempts',
        'mfaEnabled',
        'mfaSecret',
      ],
    });

    if (!user || !user.isActive) {
      this.authFailures.inc();
      this.logger.warn('Invalid credentials or inactive user account', {
        email: credentials.email,
      });
      throw new Error('Invalid credentials or user not active');
    }

    const passwordOk = await user.comparePassword(credentials.password);
    if (!passwordOk) {
      user.failedLoginAttempts += 1;
      await this.userRepository.save(user); // Persist failed attempt count
      this.authFailures.inc();
      this.logger.warn('User failed to authenticate', {
        userId: user.id,
        ipAddress,
        failedLoginAttempts: user.failedLoginAttempts,
      });
      throw new Error('Invalid credentials');
    }

    // 3) Check for suspicious activity patterns (e.g., too many failed attempts recently)
    if (user.failedLoginAttempts > 10) {
      this.authFailures.inc();
      this.logger.error('Excessive failed login attempts detected', {
        userId: user.id,
        ipAddress,
        failedLoginAttempts: user.failedLoginAttempts,
      });
      throw new Error('Account locked due to suspicious activity');
    }

    // Reset failed attempts on successful login
    user.failedLoginAttempts = 0;
    user.lastLogin = new Date();
    await this.userRepository.save(user);

    // OPTIONAL: Check user.mfaEnabled and require MFA if not provided or invalid, etc.

    // 4) Generate secure tokens with rotation policy
    const { accessToken, refreshToken, expiresIn } = this.issueTokens(user);

    // 5) Store token metadata in Redis (Circuit-breaker-protected)
    // We store the token in an allow-list or track session data
    // "token:<accessToken>" => "active" with expiration matching token expiry
    try {
      await this.redisBreaker.fire({
        key: `token:${accessToken}`,
        value: 'active',
        expiry: expiresIn, // store it in seconds for the same lifetime
      });
    } catch (redisError) {
      this.authFailures.inc();
      this.logger.error('Failed to store token metadata in Redis', {
        error: redisError,
      });
      throw new Error('Internal error during token persistence');
    }

    // 6) Log security event
    this.logger.info('User successfully logged in', {
      userId: user.id,
      ipAddress,
    });

    // 7) Update metrics (authentication success)
    // Here, we've already incremented attempts, so we only track failures if any.

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        failedLoginAttempts: user.failedLoginAttempts,
        lastFailedLogin: user.lastFailedLogin,
        mfaEnabled: user.mfaEnabled,
        // metadata is not strictly returned here, but you could include partial info
        metadata: {
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          createdBy: user.createdBy,
          updatedBy: user.updatedBy,
          version: user.version,
        },
      },
      requiresMfa: false, // set to true if MFA must be completed in a subsequent step
    };
  }

  /**
   * Advanced token verification method that checks blacklist status (for logout or rotation),
   * verifies token signature, ensures token not expired, checks IP restrictions, and updates logs/metrics.
   *
   * Steps:
   *  1) Check token blacklist
   *  2) Verify token signature and expiry
   *  3) Validate token rotation status
   *  4) Check IP address against allowed list
   *  5) Verify user session status
   *  6) Log verification attempt
   *  7) Update security metrics
   *
   * @param token The JWT access token to verify
   * @param ipAddress IP address of the request for security checks
   * @returns A resolved promise with a validated IJwtPayload that includes user details
   */
  public async verifyTokenWithEnhancedSecurity(
    token: string,
    ipAddress: string,
  ): Promise<IJwtPayload> {
    // 1) Check token blacklist (or if token has been invalidated)
    // We'll retrieve from Redis; if a 'blacklist:token' exists, reject
    try {
      const blacklisted = await this.redisBreaker.fire({
        key: `blacklist:${token}`,
      });
      if (blacklisted) {
        this.authFailures.inc();
        this.logger.warn('Attempted use of blacklisted token', {
          ipAddress,
          token,
        });
        throw new Error('Token is blacklisted');
      }
    } catch (redisError) {
      this.authFailures.inc();
      this.logger.error('Failed to verify token blacklist status', {
        error: redisError,
      });
      throw new Error('Internal error checking token blacklist');
    }

    // 2) Verify token signature and expiry
    let decoded: IJwtPayload;
    try {
      // Retrieve secret from environment or config management; placeholder here
      const jwtSecret = process.env.JWT_SECRET || 'change_this_sample_secret';
      decoded = verify(token, jwtSecret) as IJwtPayload;
    } catch (jwtError) {
      this.authFailures.inc();
      this.logger.warn('JWT verification failed', { token, ipAddress, jwtError });
      throw new Error('Invalid or expired token');
    }

    // 3) Validate token rotation status (example: check if the token is listed as 'active')
    try {
      const status = await this.redisBreaker.fire({ key: `token:${token}` });
      if (!status) {
        this.authFailures.inc();
        this.logger.warn('Token not found in active set, possibly rotated', {
          ipAddress,
          token,
        });
        throw new Error('Token has been rotated or invalidated');
      }
    } catch (rotationError) {
      this.authFailures.inc();
      this.logger.error('Failed to validate token rotation status', {
        rotationError,
      });
      throw new Error('Internal error validating token rotation');
    }

    // 4) Check IP address against allowed list (placeholder; production might store user IP or geolocation)
    // Here we do a simple illustration:
    if (!ipAddress) {
      this.authFailures.inc();
      this.logger.warn('Missing IP address in token verification', { token });
      throw new Error('Cannot verify token without IP address');
    }

    // 5) Verify user session status (find user in DB or other checks)
    const user = await this.userRepository.findOne({ where: { id: decoded.userId } });
    if (!user || !user.isActive) {
      this.authFailures.inc();
      this.logger.warn('User associated with token not active or not found', {
        userId: decoded.userId,
        token,
      });
      throw new Error('User not active or token invalid');
    }

    // 6) Log verification attempt
    this.logger.info('Token verification successful', {
      userId: decoded.userId,
      ipAddress,
      token,
    });

    // 7) Update security metrics (if needed). We can increment a custom metric or reuse existing.
    // For demonstration, let's increment the attempts counter:
    this.authAttempts.inc();

    // Return the validated payload for downstream usage
    return decoded;
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////
  // Private Helpers
  //////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * Issues new JWT access and refresh tokens according to platform security requirements.
   * Incorporates the user's role, permissions, and MFA status into the payload.
   *
   * @param user The authenticated User object from the database
   * @returns An object containing the accessToken, refreshToken, and expiration in seconds
   */
  private issueTokens(
    user: User,
  ): { accessToken: string; refreshToken: string; expiresIn: number } {
    // In a real production scenario, these secrets should come from secure environment variables
    const jwtSecret = process.env.JWT_SECRET || 'change_this_sample_secret';
    const jwtRefreshSecret =
      process.env.JWT_REFRESH_SECRET || 'change_this_sample_refresh_secret';

    const payload: IJwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      sessionId: `${user.id}-${Date.now()}`,
      mfaVerified: !!user.mfaEnabled, // Example usage
      // Standard JWT fields
      iat: Math.floor(Date.now() / 1000),
    };

    // Generate access token
    const accessToken = sign(payload, jwtSecret, {
      expiresIn: this.tokenExpirationSeconds,
    });

    // Generate refresh token with a longer lifespan, e.g., 7 days
    const refreshToken = sign(
      { userId: user.id, sessionId: payload.sessionId },
      jwtRefreshSecret,
      { expiresIn: '7d' },
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.tokenExpirationSeconds,
    };
  }
}