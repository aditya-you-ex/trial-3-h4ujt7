import { Router, Request, Response, NextFunction } from 'express'; // express@4.18.2
import compression from 'compression'; // compression@1.7.4
import cors from 'cors'; // cors@2.8.5
import Joi from 'joi'; // joi@17.9.2

/****************************************************************************
 * Internal Imports
 * --------------------------------------------------------------------------
 * Importing the required internal modules as specified in the JSON spec:
 *  1) ProjectController class with methods:
 *     - createProject
 *     - updateProject
 *     - deleteProject
 *     - getProject
 *     - updateProjectAnalytics
 *     - getProjectResources
 *     - optimizeProjectResources
 *  2) validateSchema function from '@shared/middleware/validation.middleware'
 *  3) Project interface for references (though we may not explicitly type the
 *     responses here, it is used for clarity).
 ****************************************************************************/
import {
  ProjectController,
  // Pre-declared methods in this controller:
  //  createProject, updateProject, deleteProject, getProject,
  //  updateProjectAnalytics, getProjectResources, optimizeProjectResources
} from '../controllers/project.controller';

import { validateSchema } from '@shared/middleware/validation.middleware';

/****************************************************************************
 * Shared Interface (for reference):
 * import {
 *   Project,
 *   ProjectStatus,
 *   ResourceMetrics,    // not shown here in direct usage, but part of the interface
 *   optimizationScore,  // also part of the enhanced project interface
 * } from '@shared/interfaces/project.interface';
 ****************************************************************************/

/****************************************************************************
 * Global Constants from JSON specification:
 *   - projectValidationSchema: "Joi schema for project validation including resource metrics"
 *   - RATE_LIMIT_WINDOW = 60000 (ms)
 *   - RATE_LIMIT_MAX = 100
 *   - CACHE_DURATION = 300 (seconds)
 *
 * For demonstration, we define:
 *   projectValidationSchema -> for create requests
 *   projectUpdateValidationSchema -> for update requests
 * And placeholders for rate limiting, caching, etc.
 ****************************************************************************/
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 100;      // 100 requests per window
const CACHE_DURATION = 300;      // 300 seconds for caching

/****************************************************************************
 * Here we define a simple Joi schema for creating a project. This includes
 * core fields like name, description, scheduling, etc. We highlight resource
 * allocations to align with the platform's resource optimization features.
 ****************************************************************************/
const projectValidationSchema = Joi.object({
  name: Joi.string().trim().required(),
  description: Joi.string().allow('').optional(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  teamId: Joi.string().required(),
  resourcePool: Joi.array().items(Joi.string()).optional(),
}).required();

/****************************************************************************
 * For update requests, nearly all fields can be optional as partial edits.
 ****************************************************************************/
const projectUpdateValidationSchema = Joi.object({
  name: Joi.string().trim().optional(),
  description: Joi.string().allow('').optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  teamId: Joi.string().optional(),
  status: Joi.string().valid('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED').optional(),
  resourcePool: Joi.array().items(Joi.string()).optional(),
}).optional();

/****************************************************************************
 * Simple Rate Limiting (Per Endpoint):
 * The JSON spec requires "Set up rate limiting per endpoint". We do so with
 * a lightweight in-memory approach for demonstration. In production, an
 * external store (Redis, etc.) is recommended, or an official rate-limit
 * library (e.g. express-rate-limit), but that was not listed among imports.
 ****************************************************************************/
interface RateLimitTracker {
  [ip: string]: {
    count: number;
    firstRequest: number;
  };
}

// In-memory store mapping IP to usage stats for demonstration
const rateLimitStore: RateLimitTracker = {};

// Simple endpoint-level limiting
function createRateLimiter() {
  return function (req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const windowMs = RATE_LIMIT_WINDOW;
    const maxRequests = RATE_LIMIT_MAX;

    if (!rateLimitStore[ip]) {
      rateLimitStore[ip] = { count: 1, firstRequest: now };
      return next();
    }

    const elapsed = now - rateLimitStore[ip].firstRequest;
    if (elapsed < windowMs) {
      // Still in the same window
      rateLimitStore[ip].count += 1;
      if (rateLimitStore[ip].count > maxRequests) {
        // Exceeded limit
        return res.status(429).json({
          status: 'error',
          message: 'Too Many Requests - rate limit exceeded. Please try again later.',
        });
      }
      return next();
    } else {
      // Window expired, reset
      rateLimitStore[ip].count = 1;
      rateLimitStore[ip].firstRequest = now;
      return next();
    }
  };
}

/****************************************************************************
 * Tracing Middleware:
 * This function is a placeholder for "request tracing and correlation IDs"
 * from the specification steps. In production, you'd generate or parse a
 * correlation ID, track request, etc. For demonstration, we log the route.
 ****************************************************************************/
function traceRequests(req: Request, _res: Response, next: NextFunction) {
  // You might attach a correlationId to req here if available:
  // req.headers['x-correlation-id'] or generate a new ID
  // For now, we just show a console log for demonstration
  // (In production, you'd use a real logger).
  console.debug(`[Trace] Request: ${req.method} ${req.originalUrl}`);
  next();
}

/****************************************************************************
 * Authentication/Authorization Middleware:
 * The specification references "@validateAuth" as a decorator. We'll create
 * a stub to represent the check. In an enterprise scenario, you'd verify
 * JWT tokens, user roles, permissions, etc.
 ****************************************************************************/
function validateAuth(req: Request, res: Response, next: NextFunction) {
  // For demonstration, we'll accept all requests as authorized. Replace
  // with real checks as needed.
  next();
}

/****************************************************************************
 * Security Headers Middleware:
 * This addresses "Add security headers middleware". Without external deps
 * (like helmet), we manually set some basic headers. In a real environment,
 * consider helmet or similar packages for best practices.
 ****************************************************************************/
function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Additional headers can be added as needed
  next();
}

/****************************************************************************
 * Caching Middleware:
 * For GET endpoints, set Cache-Control headers to allow clients/proxies
 * to cache responses for a certain duration (CACHE_DURATION seconds).
 ****************************************************************************/
function cacheGetRequests(req: Request, res: Response, next: NextFunction) {
  // Only apply to GET requests
  if (req.method === 'GET') {
    res.set('Cache-Control', `public, max-age=${CACHE_DURATION}`);
  }
  next();
}

/****************************************************************************
 * Health Check Handler:
 * Satisfies the "Set up health check endpoint" requirement. Returns a basic
 * JSON indicating system status. In real usage, consider verifying DB
 * connectivity or external dependencies before responding healthy = true.
 ****************************************************************************/
function healthCheckHandler(_req: Request, res: Response) {
  return res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
  });
}

/****************************************************************************
 * Error Handling Middleware:
 * The final step is "Configure error handling middleware". We'll attach a
 * basic error handler to unify error responses. In production, you'd have
 * more robust logic, including structured logging, error codes, etc.
 ****************************************************************************/
function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error('[Global Error Handler]', err);

  // Return a standardized response. The platform might define an error format:
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    details: err.details || null,
  });
}

/****************************************************************************
 * configureProjectRoutes (Factory Function)
 * ----------------------------------------------------------------------------
 * The main function requested by the JSON specification. It returns an Express
 * router fully configured with:
 *  1) Compression
 *  2) CORS
 *  3) Rate limiting
 *  4) Request tracing and correlation
 *  5) Security headers
 *  6) Caching headers for GET
 *  7) Health check endpoint
 *  8) RESTful routes for Project management
 *  9) Error handling
 ****************************************************************************/
export function configureProjectRoutes(
  projectController: ProjectController
): Router {
  /**************************************************************************
   * Step 1) Create a new Express router instance with strict routing
   **************************************************************************/
  const router = Router({ strict: true });

  /**************************************************************************
   * Step 2) Apply compression middleware for response optimization
   **************************************************************************/
  router.use(compression());

  /**************************************************************************
   * Step 3) Configure CORS with security settings
   **************************************************************************/
  router.use(cors());

  /**************************************************************************
   * Step 4) We set up per-endpoint rate limiting. The specification says
   * "Set up rate limiting per endpoint," so we define it within each route
   * definition below using createRateLimiter().
   **************************************************************************/

  /**************************************************************************
   * Step 5) Configure request tracing and correlation IDs
   **************************************************************************/
  router.use(traceRequests);

  /**************************************************************************
   * Step 6) Add security headers middleware
   **************************************************************************/
  router.use(securityHeaders);

  /**************************************************************************
   * Step 7) Configure caching headers for GET endpoints
   * We'll apply them individually to GET routes to satisfy the spec.
   **************************************************************************/

  /**************************************************************************
   * Step 8) Set up health check endpoint
   **************************************************************************/
  router.get('/health', healthCheckHandler);

  /**************************************************************************
   * Step 9) Configure POST /projects route with enhanced validation
   * This route creates a new project. We use the projectValidationSchema
   * with validateSchema() for robust input validation. Once validated,
   * the ProjectController's createProject method is invoked.
   **************************************************************************/
  router.post(
    '/projects',
    validateAuth,
    createRateLimiter(),
    validateSchema(projectValidationSchema, 'body'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const newProject = await projectController.createProject(req.body);
        return res.status(201).json({
          status: 'success',
          data: newProject,
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  /**************************************************************************
   * Step 10) Configure GET /projects/:id route with caching
   * This fetches a project by ID. We add the createRateLimiter() and
   * cacheGetRequests for the GET operation.
   **************************************************************************/
  router.get(
    '/projects/:id',
    validateAuth,
    createRateLimiter(),
    cacheGetRequests,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const project = await projectController.getProject(req.params.id);
        return res.status(200).json({
          status: 'success',
          data: project,
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  /**************************************************************************
   * Step 11) Configure PUT /projects/:id route with validation
   * Allows partial updates to a project's fields. We use the
   * projectUpdateValidationSchema to ensure correct data types.
   **************************************************************************/
  router.put(
    '/projects/:id',
    validateAuth,
    createRateLimiter(),
    validateSchema(projectUpdateValidationSchema, 'body'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const updated = await projectController.updateProject(req.params.id, req.body);
        return res.status(200).json({
          status: 'success',
          data: updated,
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  /**************************************************************************
   * Step 12) Configure DELETE /projects/:id route with cleanup
   * Invokes the deleteProject method. Returns 204 No Content on success.
   **************************************************************************/
  router.delete(
    '/projects/:id',
    validateAuth,
    createRateLimiter(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await projectController.deleteProject(req.params.id);
        return res.status(204).send();
      } catch (error) {
        return next(error);
      }
    }
  );

  /**************************************************************************
   * Step 13) Configure PUT /projects/:id/analytics route
   * This invokes updateProjectAnalytics to refresh resource metrics or
   * advanced analytics for the project. Returns the success of the operation.
   **************************************************************************/
  router.put(
    '/projects/:id/analytics',
    validateAuth,
    createRateLimiter(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // updateProjectAnalytics might not return data, so we can either
        // respond with success or fetch updated analytics for the user.
        await projectController.updateProjectAnalytics(req.params.id);
        return res.status(200).json({
          status: 'success',
          message: 'Analytics updated successfully',
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  /**************************************************************************
   * Step 14) Add GET /projects/:id/resources endpoint
   * Returns real-time resource metrics or resource data from getProjectResources.
   * Apply caching to reduce overhead on GET requests.
   **************************************************************************/
  router.get(
    '/projects/:id/resources',
    validateAuth,
    createRateLimiter(),
    cacheGetRequests,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const resources = await projectController.getProjectResources(req.params.id);
        return res.status(200).json({
          status: 'success',
          data: resources,
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  /**************************************************************************
   * Step 15) Add POST /projects/:id/optimize endpoint
   * Leverages the optimizeProjectResources method from the controller
   * to dynamically reassign or rebalance resources for improved utilization.
   **************************************************************************/
  router.post(
    '/projects/:id/optimize',
    validateAuth,
    createRateLimiter(),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const optimizationResult = await projectController.optimizeProjectResources(req.params.id, req.body);
        return res.status(200).json({
          status: 'success',
          data: optimizationResult,
        });
      } catch (error) {
        return next(error);
      }
    }
  );

  /**************************************************************************
   * Step 16) Configure error handling middleware
   * We attach a global error handler at the end of our router pipeline.
   **************************************************************************/
  router.use(errorHandler);

  /**************************************************************************
   * Step 17) Return configured router
   **************************************************************************/
  return router;
}