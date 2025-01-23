import express, { Application, Request, Response, NextFunction } from 'express'; // express ^4.18.2
import cors from 'cors'; // cors ^2.8.5
import helmet from 'helmet'; // helmet ^7.0.0
import rateLimit from 'express-rate-limit'; // express-rate-limit ^6.9.0

// Internal Imports from TaskStream AI Platform
import { HTTP_STATUS } from '../../shared/constants/status-codes';
import { validateSchema } from '../../shared/middleware/validation.middleware';
import { ApiResponse } from '../../shared/interfaces/common.interface';

// -----------------------------------------------------------------------------
// Global Constants (Per JSON Specification)
// -----------------------------------------------------------------------------

/**
 * The default time window for rate limiting (in milliseconds).
 * Corresponds to 15 minutes.
 */
const RATE_LIMIT_WINDOW_MS: number = 15 * 60 * 1000;

/**
 * The maximum number of requests allowed within the rate limit time window.
 */
const RATE_LIMIT_MAX_REQUESTS: number = 1000;

/**
 * Timeout thresholds (in milliseconds) for different service endpoints, ensuring
 * that requests do not hang indefinitely and contribute to system reliability.
 */
const SERVICE_TIMEOUTS: Record<string, number> = {
  auth: 5000,
  tasks: 10000,
  analytics: 15000,
};

/**
 * Simple circuit breaker thresholds for upstream service calls.
 * errorThreshold: The percentage of errors (0-100) at which circuit is tripped.
 * resetTimeout: The delay before attempting to close the circuit again.
 */
const CIRCUIT_BREAKER_THRESHOLDS: Record<string, number> = {
  errorThreshold: 50,
  resetTimeout: 30000,
};

// -----------------------------------------------------------------------------
// In-Memory States for Circuit Breaking & Metrics
// -----------------------------------------------------------------------------

/**
 * Tracks error counts per service to facilitate a rudimentary circuit breaker.
 */
const serviceErrorCounts: Record<string, number> = {
  auth: 0,
  tasks: 0,
  analytics: 0,
  nlp: 0,
  integration: 0,
};

/**
 * Tracks whether a given service's circuit is open (i.e., calls to it
 * should be halted or quickly failed to maintain overall system stability).
 */
const serviceCircuitOpen: Record<string, boolean> = {
  auth: false,
  tasks: false,
  analytics: false,
  nlp: false,
  integration: false,
};

// -----------------------------------------------------------------------------
// Middleware Setup Function
// -----------------------------------------------------------------------------

/**
 * Configures global middleware for the API gateway with enhanced security,
 * monitoring, and reliability measures.
 *
 * Steps (per JSON specification):
 * 1) Configure CORS with environment-specific origins and options
 * 2) Set up Helmet security headers with strict CSP
 * 3) Configure dynamic rate limiting based on user roles
 * 4) Enable JSON body parsing with size limits
 * 5) Set up request logging with correlation IDs
 * 6) Configure compression/response-time stubs and monitoring
 * 7) Initialize circuit breaker for service calls
 * 8) Set up health check endpoints
 *
 * @param app Express application instance
 */
export function setupMiddleware(app: Application): void {
  // 1) Configure CORS with environment-specific origins and options if needed.
  //    For demonstration, allow all origins. Adjust in production as necessary.
  app.use(cors());

  // 2) Set up Helmet security headers with strict CSP if desired.
  //    Additional configurations can be added to strengthen content security.
  app.use(helmet());

  // 3) Dynamic rate limiting based on user roles or IP-based throttling.
  //    Basic usage here; can later be extended for role-based logic.
  const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      status: 'error',
      message: 'Rate limit exceeded - please retry later',
    },
  });
  app.use(limiter);

  // 4) Enable JSON body parsing with a generous size limit for file attachments or large requests.
  app.use(express.json({ limit: '10mb' }));

  // 5) Simple correlation ID-based logging.
  //    In production, consider using a logging library like Winston or pino.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const correlationId = req.headers['x-correlation-id'] || `req-${Date.now()}`;
    (req as any).correlationId = correlationId;
    // Example console log: In production, route to a proper logger.
    console.info(`[Request] Correlation-ID: ${correlationId} | ${req.method} ${req.url}`);
    next();
  });

  // 6) (Optional) Stubs for compression and response-time monitoring.
  //    Not adding external library for compression since not in JSON specification.
  //    We illustrate the approach for demonstration:
  /*
  import compression from 'compression';
  app.use(compression());
  */
  // Similarly, we could measure response times using a custom or external library.

  // 7) Initialize circuit breaker tracking. Already set up above with in-memory states.
  //    In practice, you might monitor error rates, automatically open/close circuits, etc.
  //    We leave the actual logic to the handleServiceError function below.

  // 8) Set up a simple health check endpoint.
  //    Responds with an ApiResponse<string> to confirm the gateway is running.
  app.get('/health', (_req: Request, res: Response) => {
    const responseBody: ApiResponse<string> = {
      status: 'success',
      message: 'Gateway is healthy',
      data: 'OK',
      errors: [],
      metadata: {
        requestId: (_req as any).correlationId || 'N/A',
        timestamp: new Date(),
      },
    };
    return res.status(HTTP_STATUS.OK).json(responseBody);
  });
}

// -----------------------------------------------------------------------------
// Core Routes Setup Function
// -----------------------------------------------------------------------------

/**
 * Configures all API routes for the TaskStream AI gateway with service discovery,
 * load balancing, and robust error handling.
 *
 * Steps (per JSON specification):
 * 1) Configure auth service routes with JWT validation
 * 2) Configure task service routes with rate limiting
 * 3) Configure analytics service routes with caching
 * 4) Configure NLP service routes with timeout handling
 * 5) Configure integration service routes with retry logic
 * 6) Set up versioned API endpoints
 * 7) Configure service discovery and health checks
 * 8) Set up error handling middleware with detailed logging
 *
 * @param app Express application instance
 */
export function setupRoutes(app: Application): void {
  // 1) Auth service routes (JWT validation).
  //    As an example stub, we demonstrate a login endpoint. In real code,
  //    you'd import your auth controllers or route modules that implement JWT logic.
  const authRouter = express.Router();
  authRouter.post('/login', (req: Request, res: Response) => {
    // Example of how we might use validateSchema if we had a login payload schema:
    // validateSchema(loginSchema, 'body')(req, res, () => { ... });
    // For demonstration, we respond with a success or an error as placeholder:
    const responseBody: ApiResponse<string> = {
      status: 'success',
      message: 'Auth route stub',
      data: 'Token or session info here',
      errors: [],
      metadata: {
        requestId: (req as any).correlationId || 'N/A',
        timestamp: new Date(),
      },
    };
    return res.status(HTTP_STATUS.OK).json(responseBody);
  });
  app.use('/api/v1/auth', authRouter);

  // 2) Task service routes with rate limiting.
  //    We'll reuse the same rate limiter from above or define a new one if needed.
  const taskLimiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_REQUESTS / 2, // Example: stricter limit for tasks route
  });
  const tasksRouter = express.Router();
  tasksRouter.get('/', taskLimiter, (req: Request, res: Response) => {
    // Example of a tasks stub route
    const responseBody: ApiResponse<string[]> = {
      status: 'success',
      message: 'Task service route stub',
      data: ['Task1', 'Task2'],
      errors: [],
      metadata: {
        requestId: (req as any).correlationId || 'N/A',
        timestamp: new Date(),
      },
    };
    return res.status(HTTP_STATUS.OK).json(responseBody);
  });
  app.use('/api/v1/tasks', tasksRouter);

  // 3) Analytics service routes with caching (stub).
  //    In a real scenario, you might integrate a caching layer or use dedicated middleware.
  const analyticsRouter = express.Router();
  analyticsRouter.get('/reports', (req: Request, res: Response) => {
    // Potentially load from a cache or store if available
    const responseBody: ApiResponse<Record<string, any>> = {
      status: 'success',
      message: 'Analytics service route stub',
      data: { usage: 1000, cost: 250 },
      errors: [],
      metadata: {
        requestId: (req as any).correlationId || 'N/A',
        timestamp: new Date(),
      },
    };
    return res.status(HTTP_STATUS.OK).json(responseBody);
  });
  app.use('/api/v1/analytics', analyticsRouter);

  // 4) NLP service routes with timeout handling (stub).
  //    Could wrap calls to the NLP microservice in a promise that times out after SERVICE_TIMEOUTS.nlp.
  const nlpRouter = express.Router();
  nlpRouter.post('/process', async (req: Request, res: Response) => {
    // Example placeholder logic for a timed-out request if it takes too long:
    const nlpTimeout = SERVICE_TIMEOUTS.analytics; // Not explicitly given for NLP, reusing analytics as example
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      const responseBody: ApiResponse<null> = {
        status: 'error',
        message: 'NLP service request timed out',
        data: null,
        errors: [],
        metadata: {
          requestId: (req as any).correlationId || 'N/A',
          timestamp: new Date(),
        },
      };
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(responseBody);
    }, nlpTimeout);

    try {
      // Simulate NLP processing
      await new Promise((resolve) => setTimeout(resolve, 1000));
      if (!timedOut) {
        clearTimeout(timer);
        const responseBody: ApiResponse<Record<string, string>> = {
          status: 'success',
          message: 'NLP processing stub',
          data: { result: 'Extracted tasks or entities' },
          errors: [],
          metadata: {
            requestId: (req as any).correlationId || 'N/A',
            timestamp: new Date(),
          },
        };
        return res.status(HTTP_STATUS.OK).json(responseBody);
      }
    } catch (err) {
      if (!timedOut) {
        clearTimeout(timer);
        return handleServiceError(err as Error, res);
      }
    }
  });
  app.use('/api/v1/nlp', nlpRouter);

  // 5) Integration service routes with retry logic (stub).
  //    Example: If integration fails, we might try again based on a simple backoff strategy.
  const integrationRouter = express.Router();
  integrationRouter.get('/external', async (req: Request, res: Response) => {
    let attempts = 0;
    let success = false;
    let lastError: any;

    while (attempts < 3 && !success) {
      attempts += 1;
      try {
        // Simulate external service call...
        // We'll just mimic success on the second attempt
        if (attempts < 2) {
          throw new Error('Simulated external service error');
        }
        success = true;
      } catch (error) {
        lastError = error;
      }
    }

    if (!success) {
      return handleServiceError(lastError as Error, res);
    }

    const responseBody: ApiResponse<string> = {
      status: 'success',
      message: 'Integration service call succeeded',
      data: 'External service data here',
      errors: [],
      metadata: {
        requestId: (req as any).correlationId || 'N/A',
        timestamp: new Date(),
      },
    };
    return res.status(HTTP_STATUS.OK).json(responseBody);
  });
  app.use('/api/v1/integration', integrationRouter);

  // 6) Versioned API endpoints are illustrated above ("/api/v1/...").
  //    Additional versions can be introduced with minimal duplication.

  // 7) Service discovery & health checks can be integrated with a registry (stub).
  //    For demonstration, we show a minimal approach in the main health check route.

  // 8) Final error handling middleware with detailed logging can be placed last
  //    to catch unhandled route or server errors. Example:
  app.use((error: any, req: Request, res: Response, _next: NextFunction) => {
    // This captures errors thrown synchronously in route handlers.
    return handleServiceError(error, res);
  });
}

// -----------------------------------------------------------------------------
// Enhanced Error Handler
// -----------------------------------------------------------------------------

/**
 * Enhanced error handler for service-level errors with tracking and circuit breaker logic.
 * Steps (per JSON specification):
 * 1) Log error details with correlation ID
 * 2) Track error metrics for monitoring
 * 3) Map service errors to appropriate HTTP codes
 * 4) Format detailed error response
 * 5) Include error tracking reference
 * 6) Send error response to client
 * 7) Trigger circuit breaker if needed
 *
 * @param error The error object thrown by the service or route handler
 * @param res Express response object
 */
export function handleServiceError(error: Error, res: Response): void {
  // 1) Log error details with correlation ID
  const correlationId = (res.req as any).correlationId || 'unknown-correlation';
  console.error(`[Service Error] Correlation-ID: ${correlationId} |`, error);

  // 2) Track error metrics for monitoring (increment error counts and possibly open circuits)
  //    For demonstration, we attempt to guess a service from the URL:
  const requestedPath = (res.req as any).originalUrl || '';
  let serviceKey: keyof typeof serviceErrorCounts = 'tasks';
  if (requestedPath.includes('auth')) serviceKey = 'auth';
  else if (requestedPath.includes('analytics')) serviceKey = 'analytics';
  else if (requestedPath.includes('nlp')) serviceKey = 'nlp';
  else if (requestedPath.includes('integration')) serviceKey = 'integration';

  serviceErrorCounts[serviceKey] += 1;

  // If error ratio crosses threshold, open the circuit:
  // (This is a simplistic approach without actual ratio checks.)
  if (!serviceCircuitOpen[serviceKey]) {
    serviceCircuitOpen[serviceKey] = serviceErrorCounts[serviceKey] > CIRCUIT_BREAKER_THRESHOLDS.errorThreshold;
  }

  // 3) Map service errors to appropriate HTTP codes. We do a simple fallback here:
  const guessedStatus = HTTP_STATUS.INTERNAL_SERVER_ERROR;

  // 4) Format the detailed error response
  // 5) Include error tracking reference like correlationId
  const responseBody: ApiResponse<null> = {
    status: 'error',
    message: `An internal error occurred in ${serviceKey} service.`,
    data: null,
    errors: [
      {
        code: 'SERVICE_ERROR',
        message: error.message || 'Unknown service error',
        details: { stack: error.stack, serviceKey },
        timestamp: new Date(),
        stackTrace: error.stack || '',
      },
    ],
    metadata: {
      requestId: correlationId,
      timestamp: new Date(),
    },
  };

  // 6) Send error response to the client
  res.status(guessedStatus).json(responseBody);

  // 7) Trigger circuit breaker if needed
  //    If we detect circuit is open, we could forcibly fail subsequent calls.
  //    Real implementation might do more robust logic, timers, etc.
}

// -----------------------------------------------------------------------------
// Main Gateway Setup Method
// -----------------------------------------------------------------------------

/**
 * Main setup function for the API Gateway. It applies:
 * - Global middleware from setupMiddleware
 * - Route configuration from setupRoutes
 *
 * Exports:
 * - Named exports for setupMiddleware, setupRoutes, handleServiceError
 *
 * @param app Express application instance
 */
export function setupGateway(app: Application): void {
  setupMiddleware(app);
  setupRoutes(app);
}