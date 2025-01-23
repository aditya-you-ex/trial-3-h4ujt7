import { Router, Request, Response, NextFunction } from 'express'; // express 4.18.2
import correlationId from 'express-correlation-id'; // express-correlation-id 2.0.0
import { authenticate } from 'passport'; // passport 0.6.0
import monitor from 'express-monitor'; // express-monitor 1.0.0
import rateLimit from 'express-rate-limit'; // express-rate-limit 6.7.0
import circuitBreaker from 'express-circuit-breaker'; // express-circuit-breaker 2.0.0

/**
 * -----------------------------------------------------------------------------
 * Internal Imports
 * -----------------------------------------------------------------------------
 * validateSchema: Utility middleware for performing schema-based validation
 *                 on request data (parameters, body, or query).
 *
 * TaskController: Class containing methods for task-related logic that will
 *                 be invoked by our Express routes (createTask, getTaskById,
 *                 updateTask, deleteTask, updateTaskStatus, extractTaskFromCommunication).
 */
import { validateSchema } from '@shared/middleware/validation.middleware';
import { TaskController } from '../controllers/task.controller';

/**
 * -----------------------------------------------------------------------------
 * Rate Limiters
 * -----------------------------------------------------------------------------
 * Each endpoint below will use a specific rate limit configuration to ensure
 * compliance with system goals for throughput, security, and reliability.
 */
const createTaskRateLimit = rateLimit({
  windowMs: 60_000, // 1 minute window
  max: 100,         // limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false
});

const getTaskRateLimit = rateLimit({
  windowMs: 60_000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false
});

const putTaskRateLimit = rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
});

const deleteTaskRateLimit = rateLimit({
  windowMs: 60_000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false
});

const statusTaskRateLimit = rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * -----------------------------------------------------------------------------
 * configureTaskRoutes
 * -----------------------------------------------------------------------------
 * Main function exporting a configured Express router instance, implementing
 * secure, rate-limited REST APIs for task operations with automated extraction.
 * 
 * Steps (as required by the specification):
 *  1) Create new Express router instance
 *  2) Apply correlation ID middleware for request tracing
 *  3) Apply authentication middleware to all routes
 *  4) Apply monitoring middleware for metrics collection
 *  5) Configure POST /tasks endpoint with rate limit 100/min
 *  6) Configure GET /tasks/:id endpoint with rate limit 1000/min
 *  7) Configure PUT /tasks/:id endpoint with rate limit 200/min
 *  8) Configure DELETE /tasks/:id endpoint with rate limit 50/min
 *  9) Configure PUT /tasks/:id/status endpoint with rate limit 200/min
 * 10) Configure POST /tasks/extract endpoint with circuit breaker
 * 11) Apply validation middleware with enhanced schemas (placeholder usage here)
 * 12) Configure error handling middleware
 * 13) Return configured router
 */
export function configureTaskRoutes(taskController: TaskController): Router {
  // 1) Create new Express router instance
  const router = Router();

  // 2) Apply correlation ID middleware for consistent request tracing
  router.use(correlationId());

  // Provide each response with the correlation ID, ensuring traceability
  router.use((req: Request, res: Response, next: NextFunction) => {
    if (typeof req.correlationId === 'function') {
      res.setHeader('X-Correlation-Id', req.correlationId());
    }
    return next();
  });

  // 3) Apply JWT authentication middleware to all routes (passport config)
  //    In this example, we assume the 'jwt' strategy is configured in passport.
  router.use(authenticate('jwt', { session: false }));

  // 4) Apply monitoring middleware for capturing metrics
  router.use(monitor());

  /**
   * -----------------------------------------------------------------------------
   * POST /tasks
   * (Step 5: Rate limit of 100/min)
   * -----------------------------------------------------------------------------
   * Creates a new task by delegating to TaskController.createTask. Includes:
   *  - Body validation (placeholder schema usage)
   *  - Task creation logic
   *  - Standardized HTTP response handling
   */
  router.post(
    '/tasks',
    createTaskRateLimit,
    // 11) Sample validation call - schema usage is a placeholder
    // validateSchema(createTaskSchema, 'body'),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Presently calls the controller method with the request body
        const result = await taskController.createTask(req.body);
        // The controller is expected to return a structured result
        return res.status(201).json(result);
      } catch (error) {
        return next(error);
      }
    }
  );

  /**
   * -----------------------------------------------------------------------------
   * GET /tasks/:id
   * (Step 6: Rate limit of 1000/min)
   * -----------------------------------------------------------------------------
   * Retrieves a single task by ID. Delegates to TaskController.getTaskById.
   */
  router.get(
    '/tasks/:id',
    getTaskRateLimit,
    // Additional schema-based param validation could be inserted here
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const task = await taskController.getTaskById(id);
        if (!task) {
          // If the controller indicates no result, respond with 404 or relevant logic
          return res.status(404).json({ message: 'Task not found', correlationId: req.correlationId?.() });
        }
        return res.status(200).json(task);
      } catch (error) {
        return next(error);
      }
    }
  );

  /**
   * -----------------------------------------------------------------------------
   * PUT /tasks/:id
   * (Step 7: Rate limit of 200/min)
   * -----------------------------------------------------------------------------
   * Updates an existing task by delegating to TaskController.updateTask.
   */
  router.put(
    '/tasks/:id',
    putTaskRateLimit,
    // 11) Placeholder for request body validation
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const updated = await taskController.updateTask(id, req.body);
        if (!updated) {
          return res.status(404).json({ message: 'Unable to update task, not found', correlationId: req.correlationId?.() });
        }
        return res.status(200).json(updated);
      } catch (error) {
        return next(error);
      }
    }
  );

  /**
   * -----------------------------------------------------------------------------
   * DELETE /tasks/:id
   * (Step 8: Rate limit of 50/min)
   * -----------------------------------------------------------------------------
   * Deletes a task by ID, delegating to TaskController.deleteTask.
   */
  router.delete(
    '/tasks/:id',
    deleteTaskRateLimit,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        const result = await taskController.deleteTask(id);
        if (!result) {
          return res.status(404).json({ message: 'Task not found or could not be deleted', correlationId: req.correlationId?.() });
        }
        return res.status(200).json({ message: 'Task deleted successfully' });
      } catch (error) {
        return next(error);
      }
    }
  );

  /**
   * -----------------------------------------------------------------------------
   * PUT /tasks/:id/status
   * (Step 9: Rate limit of 200/min)
   * -----------------------------------------------------------------------------
   * Updates only the status of an existing task, delegating to TaskController.updateTaskStatus.
   */
  router.put(
    '/tasks/:id/status',
    statusTaskRateLimit,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        // For example, this might expect a body with { status: 'IN_PROGRESS' } or similar
        const updated = await taskController.updateTaskStatus(id, req.body.status);
        if (!updated) {
          return res.status(404).json({ message: 'Unable to update task status', correlationId: req.correlationId?.() });
        }
        return res.status(200).json(updated);
      } catch (error) {
        return next(error);
      }
    }
  );

  /**
   * -----------------------------------------------------------------------------
   * POST /tasks/extract
   * (Step 10: Circuit breaker for NLP-based extraction - minimal example config)
   * -----------------------------------------------------------------------------
   * Performs automated task extraction from natural language input
   * (e.g., chat text, email, meeting transcripts).
   */
  router.post(
    '/tasks/extract',
    circuitBreaker({ timeout: 6000, errorThreshold: 0.5, resetTimeout: 10000 }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const communicationData = req.body;
        const extractedTask = await taskController.extractTaskFromCommunication(communicationData);
        // If successful, we typically return status 201 for creation
        return res.status(201).json(extractedTask);
      } catch (error) {
        return next(error);
      }
    }
  );

  /**
   * -----------------------------------------------------------------------------
   * Step 12: Error Handling Middleware
   * -----------------------------------------------------------------------------
   * Global error handler for this router. Captures any thrown errors and formats
   * them into a standardized response. In a production environment, we could
   * integrate more sophisticated logging, error codes, or translations.
   */
  router.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    // Log the error. In a real solution, we'd leverage a logger service here.
    // This sample simply outputs to console for demonstration.
    // The correlation ID is appended for better traceability.
    const cid = req.correlationId?.();
    // Potentially we can also set a default status code (e.g., 500) if not set.
    const statusCode = err.statusCode && typeof err.statusCode === 'number' ? err.statusCode : 500;
    return res.status(statusCode).json({
      message: err.message || 'Unexpected error occurred',
      correlationId: cid,
      error: err
    });
  });

  // 13) Return configured router
  return router;
}