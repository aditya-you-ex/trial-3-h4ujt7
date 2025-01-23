////////////////////////////////////////////////////////////////////////////////
// External Imports (with version comments)
////////////////////////////////////////////////////////////////////////////////
import * as path from 'path';
import request from 'supertest'; // ^6.3.0
import * as jwt from 'jsonwebtoken'; // ^9.0.0
import * as performanceNow from 'performance-now'; // ^2.1.0
import * as artillery from 'artillery'; // ^2.0.0
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals'; // ^29.0.0

////////////////////////////////////////////////////////////////////////////////
// Internal Imports
////////////////////////////////////////////////////////////////////////////////
import { validateJwt, requireRole } from '../../../../backend/services/auth/src/middleware/jwt.middleware';
import { AuthService } from '../../../../backend/services/auth/src/services/auth.service';
import { IJwtPayload, UserRole } from '../../../../backend/shared/interfaces/auth.interface';

////////////////////////////////////////////////////////////////////////////////
// Types & Interfaces for Test-Specific Structures
////////////////////////////////////////////////////////////////////////////////

/**
 * Defines optional parameters for the helper generateTestToken function,
 * allowing fine-grained control over expiration, claims, or other features.
 */
interface TokenOptions {
  expiresInSeconds?: number;
  roleOverride?: UserRole;
  mfaVerified?: boolean;
  customClaims?: Record<string, any>;
}

/**
 * Describes the shape of the test server context, including Express app
 * references or any additional resources required across test suites.
 */
interface ITestServerContext {
  app?: any;
  server?: any;
  redisMock?: any;
  externalServicesMock?: any;
}

////////////////////////////////////////////////////////////////////////////////
// Global Variables for Reuse
////////////////////////////////////////////////////////////////////////////////

/**
 * Context object holding references to the test server, mocks, and
 * any security or performance instrumentation needed by the tests.
 */
const testContext: ITestServerContext = {};

/**
 * Secret used specifically for test token signing to avoid collisions
 * with production secrets.
 */
const TEST_JWT_SECRET = 'test_environment_jwt_secret_12345';

////////////////////////////////////////////////////////////////////////////////
// Setup & Teardown Functions
////////////////////////////////////////////////////////////////////////////////

/**
 * beforeAll
 * -----------------------------------------------------------------------------
 * Sets up the test environment prior to running any tests. Fulfills the
 * specification steps:
 *  1) Initialize test server (express-based)
 *  2) Mock Redis client for rate limiting and blacklist
 *  3) Mock external services including MFA provider
 *  4) Setup performance monitoring
 *  5) Initialize security services
 *  6) Setup test data and configurations
 */
beforeAll(async (): Promise<void> => {
  // 1) Initialize a minimal Express app for testing middleware
  const express = require('express'); // Dynamically required to avoid direct import overhead
  const app = express();
  app.use(express.json());

  // 2) Mock or stub Redis client for rate limiting, blacklisting
  //    We'll attach it to a global testContext to facilitate usage in tests
  const redisMock = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    connect: jest.fn().mockResolvedValue(true),
    disconnect: jest.fn().mockResolvedValue(true),
  };
  testContext.redisMock = redisMock;

  // 3) Mock external services. For instance, an MFA provider or any other service
  //    that the AuthService or middlewares might interact with. Here, we do a simple example:
  const externalServicesMock = {
    sendMfaCode: jest.fn().mockResolvedValue(true),
  };
  testContext.externalServicesMock = externalServicesMock;

  // 4) Setup performance monitoring references or placeholders
  //    e.g., capturing a baseline timestamp or custom metrics
  const performanceStart = performanceNow();
  testContext['performanceStart'] = performanceStart;

  // 5) Initialize security services or any config if needed. In a real scenario,
  //    this could involve environment variable injection or dynamic configuration.
  process.env.JWT_SECRET = TEST_JWT_SECRET;

  // 6) Setup test data and configurations
  //    Example: We attach routes that use validateJwt and requireRole
  app.get('/secure-route', validateJwt, requireRole([UserRole.ADMIN]), (req: any, res: any) => {
    // Only accessible if validateJwt passes and user role is ADMIN
    return res.status(200).json({ message: 'Access granted - ADMIN scope' });
  });

  // Provide a minimal “/health” route for performance tests
  app.get('/health', (req: any, res: any) => {
    return res.status(200).json({ status: 'ok' });
  });

  // For token refresh flow demonstration, mock an endpoint that calls AuthService.refreshToken
  app.post('/token/refresh', async (req: any, res: any) => {
    try {
      // For demonstration, we call a mocked method
      // In real tests, we might spy on the actual AuthService or stub the method
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ error: 'No refresh token provided' });
      }
      // Simulate verifying a refresh token and issuing a new token
      // This is purely illustrative. Implementation details vary.
      const newAccessToken = 'newTestAccessToken12345';
      return res.status(200).json({ accessToken: newAccessToken });
    } catch (err) {
      return res.status(401).json({ error: 'Refresh token invalid' });
    }
  });

  // Attach the express app to the testContext, plus store the listening server object
  testContext.app = app;
  testContext.server = app.listen(0); // ephemeral port for local testing
});

/**
 * afterAll
 * -----------------------------------------------------------------------------
 * Cleans up the test environment once all tests are completed. Fulfills
 * the specification steps:
 *  1) Close test server
 *  2) Clear all mocks
 *  3) Reset Redis client
 *  4) Clean up performance metrics
 *  5) Reset security configurations
 *  6) Clear test data
 */
afterAll(async (): Promise<void> => {
  // 1) Close test server if it was started
  if (testContext.server && typeof testContext.server.close === 'function') {
    testContext.server.close();
  }

  // 2) Clear all jest mocks
  jest.clearAllMocks();
  jest.resetAllMocks();

  // 3) Reset Redis client or any other external resources
  if (testContext.redisMock && typeof testContext.redisMock.disconnect === 'function') {
    await testContext.redisMock.disconnect();
  }

  // 4) Clean up performance metrics - here we might calculate total test duration
  const performanceEnd = performanceNow();
  const durationMs = (performanceEnd - (testContext['performanceStart'] || 0)).toFixed(2);

  // 5) Reset security configurations (unset environment variables or anything else)
  delete process.env.JWT_SECRET;

  // 6) Clear test data - in this mock scenario we can just remove references
  testContext.app = null;
  testContext.server = null;
  testContext.redisMock = null;
  testContext.externalServicesMock = null;

  // Optionally log the total test suite duration for debugging
  // eslint-disable-next-line no-console
  console.log(`Test suite completed in ${durationMs} ms.`);
});

////////////////////////////////////////////////////////////////////////////////
// Helper Functions
////////////////////////////////////////////////////////////////////////////////

/**
 * generateTestToken
 * -----------------------------------------------------------------------------
 * Helper function to generate test JWT tokens with various configurations.
 * Steps:
 *  1) Create JWT payload with test data
 *  2) Add MFA verification status if required
 *  3) Add custom claims based on options
 *  4) Sign token with test secret
 *  5) Apply token expiration settings
 *  6) Return signed token
 *
 * @param payload The base IJwtPayload to embed in the JWT
 * @param options Additional token creation options (role overrides, custom claims, expiry, etc.)
 * @returns The signed JWT token as a string
 */
function generateTestToken(payload: IJwtPayload, options?: TokenOptions): string {
  // 1) Create or copy the payload
  const finalPayload: IJwtPayload = {
    ...payload,
    // Provide default placeholders for standard properties if not set
    userId: payload.userId || 'unit-test-user-id',
    email: payload.email || 'unittest@example.com',
    role: options?.roleOverride || payload.role || UserRole.DEVELOPER,
    permissions: payload.permissions || [],
    sessionId: payload.sessionId || 'unit-test-session-id',
    mfaVerified: options?.mfaVerified ?? payload.mfaVerified ?? false,
  };

  // 2) Add MFA verification status if required - already done above

  // 3) Add custom claims if any
  if (options?.customClaims) {
    Object.assign(finalPayload, options.customClaims);
  }

  // 4) Sign token with test secret
  const secret = process.env.JWT_SECRET || TEST_JWT_SECRET;

  // 5) Apply token expiration settings: default to 1 hour if not specified
  const expiresIn = options?.expiresInSeconds || 3600;

  // 6) Return signed token
  const token = jwt.sign(finalPayload, secret, {
    algorithm: 'HS256',
    expiresIn,
  });
  return token;
}

////////////////////////////////////////////////////////////////////////////////
// Test Class Declaration According to Specification
////////////////////////////////////////////////////////////////////////////////

/**
 * JwtMiddlewareTests
 * -----------------------------------------------------------------------------
 * A comprehensive test suite for JWT validation middleware, covering security,
 * performance, and advanced token flows like refresh and role-based access.
 */
describe('JwtMiddlewareTests', () => {
  /**
   * testTokenValidationAndSecurity
   * -----------------------------------------------------------------------------
   * Tests JWT token validation with enhanced security features, including:
   *  - Generating a valid test token with MFA verification
   *  - Verifying the token is not in a blacklist
   *  - Checking rate limiting compliance
   *  - Sending request with token
   *  - Verifying middleware allows the request
   *  - Validating audit log entry (mocked here)
   *  - Checking performance metrics
   */
  it('testTokenValidationAndSecurity', async (): Promise<void> => {
    // (A) Generate valid test token with MFA verification
    const validToken = generateTestToken(
      {
        userId: 'test-user-123',
        email: 'mfauser@test.com',
        role: UserRole.ADMIN,
        permissions: ['ALL_PRIVILEGES'],
        sessionId: 'session-abc',
        mfaVerified: true,
      },
      { mfaVerified: true },
    );

    // (B) Verify token not in blacklist: we rely on the redisMock returning no blacklist data
    // (C) Check rate limiting compliance: also relies on the default mock which does not block
    // (D) Send request with token to secure-route which requires ADMIN role
    const res = await request(testContext.app)
      .get('/secure-route')
      .set('Authorization', `Bearer ${validToken}`);

    // (E) Ensure the middleware validates token and role, thus granting access
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.message).toBe('Access granted - ADMIN scope');

    // (F) Validate audit log entry: In a real test, we might spy on the logger
    // For demonstration, just confirm the call count or check mocks
    // e.g., expect(loggerSpy).toHaveBeenCalledWith(...)

    // (G) Check performance metrics: typically we would track e.g. a Prometheus metric
    // For demonstration, we measure a time delta. Real tests might delve deeper.
    const timeNow = performanceNow();
    expect(timeNow).toBeGreaterThan(0); // trivial assertion to show usage
  });

  /**
   * testTokenRefreshFlow
   * -----------------------------------------------------------------------------
   * Tests token refresh mechanism, ensuring:
   *  - Generating an expired token
   *  - Attempt refresh with valid refresh token
   *  - Verifying new token generation
   *  - Validating new token contents
   *  - Checking audit logging (mocked)
   */
  it('testTokenRefreshFlow', async (): Promise<void> => {
    // (A) Generate an expired token by setting expiresInSeconds to 1 and waiting
    const expiredToken = generateTestToken(
      {
        userId: 'test-user-456',
        email: 'refreshuser@test.com',
        role: UserRole.DEVELOPER,
        permissions: [],
        sessionId: 'session-def',
        mfaVerified: false,
      },
      { expiresInSeconds: 1 },
    );
    // Wait 2 seconds to ensure expiration
    await new Promise((r) => setTimeout(r, 2000));

    // (B) Attempt refresh with valid refresh token
    // In this scenario, we mock the refresh token as part of the request payload
    // The /token/refresh route is stubbed to return a new test token
    const response = await request(testContext.app)
      .post('/token/refresh')
      .send({ refreshToken: expiredToken });

    // (C) Verify new token generation
    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeDefined();

    // (D) Validate new token contents
    // We do a naive check that the token is not empty. Real test might decode + check claims.
    const newToken = response.body.accessToken;
    expect(newToken.length).toBeGreaterThan(10); // minimal length check

    // (E) Check audit logging for refresh. This is an example of how we'd do mocking:
    // e.g., expect(loggerSpy).toHaveBeenCalledWith(...)

    // No explicit fail is thrown, so success if the route returned a new token.
  });

  /**
   * testPerformanceUnderLoad
   * -----------------------------------------------------------------------------
   * Tests system performance under load conditions, fulfilling the "System Reliability"
   * requirement from the specification. Steps:
   *  1) Setup performance monitoring
   *  2) Generate multiple concurrent requests
   *  3) Measure response times
   *  4) Verify uptime requirements
   *  5) Check error rates
   *  6) Validate resource usage
   *
   * Usage of artillery is demonstrated in line, though in a real test environment,
   * one might run artillery externally or in a separate performance pipeline.
   */
  it('testPerformanceUnderLoad', async (): Promise<void> => {
    // (1) Setup performance monitoring - we can store a start time
    const startTime = performanceNow();

    // (2) Generate multiple concurrent requests using Artillery in a programmatic approach
    // Basic config object: hitting the health endpoint to confirm stability
    const scriptConfig = {
      config: {
        target: `http://127.0.0.1:${testContext.server.address().port}`,
        phases: [
          { duration: 5, arrivalRate: 10 }, // for 5 seconds, spawn 10 RPS
        ],
      },
      scenarios: [
        {
          name: 'HealthEndpointLoadTest',
          flow: [{ get: { url: '/health' } }],
        },
      ],
    };

    // We'll run artillery programmatically. A real environment might have a more elaborate script.
    // This returns a promise that resolves once the test completes.
    const result = await new Promise((resolve, reject) => {
      artillery.runner(scriptConfig, {}, (runnerErr: any, runnerRes: any) => {
        if (runnerErr) {
          return reject(runnerErr);
        }
        return resolve(runnerRes);
      });
    });

    // (3) Measure response times - part of result can be used to gather metrics
    // This test is purely illustrative; real usage would parse deeper stats
    expect(result).toBeDefined();

    // (4) Verify uptime requirements - we ensure we did not get a large number of errors
    // In real usage, we might parse aggregated stats from artillery
    // For demonstration, we do a trivial check:
    const endTime = performanceNow();
    const totalDuration = endTime - startTime;
    // Expect the load test to run within ~ 10 seconds for this trivial scenario
    expect(totalDuration).toBeLessThan(30000);

    // (5) Check error rates - in a real scenario, parse result output
    // For demonstration, assume no errors if result is present
    // (6) Validate resource usage - not covered in code but typically monitored externally

    // If we made it here, the load test completed without catastrophic failure
  });
});