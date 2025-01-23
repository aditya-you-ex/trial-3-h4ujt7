/**
 * This module provides Express middleware for request data validation using both Joi schemas
 * and custom utility-based checks. It aligns with TaskStream AI's requirement for robust
 * input validation to support:
 *  - Task Extraction Accuracy (95% accuracy) by preventing malformed data
 *  - System Reliability (99.9% uptime) by reducing invalid data propagation
 *  - Standardized API Response structures for validation failures
 *
 * Exports:
 *  1) validateSchema       -> Middleware factory for validating against a Joi schema
 *  2) validateRequiredFields -> Middleware factory for checking required fields
 *  3) validateDataTypes    -> Middleware factory for checking data types (including nested paths)
 */

import { Request, Response, NextFunction, RequestHandler } from 'express'; // express ^4.18.2
import Joi from 'joi'; // joi ^17.9.2

// Internal imports from within TaskStream AI platform
import { validateRequired, validateDataType, createValidationError } from '../utils/validation';
import { HTTP_STATUS } from '../constants/status-codes';
import type { ErrorResponse } from '../interfaces/common.interface';

// Optional import of validation error codes (if desired for standardization)
// This is not strictly listed in the JSON specification's "imports", but included for completeness.
// Uncomment if your system uses these enums to standardize error codes:
// import { VALIDATION_ERRORS } from '../constants/error-codes';

/**
 * Enhanced Express middleware factory to validate request data with Joi schema.
 * Ensures consistent API error responses for schema violations.
 *
 * @param {Joi.Schema} schema - The Joi schema against which to validate
 * @param {'body' | 'query' | 'params'} source - The request property to validate
 * @param {object} [options] - Optional validation config (allowUnknown, stripUnknown, abortEarly)
 * @returns {RequestHandler} Middleware function for Express
 */
export function validateSchema(
  schema: Joi.Schema,
  source: 'body' | 'query' | 'params',
  options?: {
    allowUnknown?: boolean;
    stripUnknown?: boolean;
    abortEarly?: boolean;
  }
): RequestHandler {
  // Default validation options providing:
  // - abortEarly: false => collect all errors before exit
  // - allowUnknown: true => ignore unknown keys
  // - stripUnknown: false => keep unknown fields intact unless explicitly set
  const defaultValidationOptions = {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: false,
  };

  const validationSettings = {
    ...defaultValidationOptions,
    ...(options || {}),
  };

  return (req: Request, res: Response, next: NextFunction): void => {
    // Extract data from request based on specified source for validation
    const payload = req[source];

    // Perform Joi validation with provided schema and dynamic options
    const { error, value } = schema.validate(payload, validationSettings);

    // If Joi validation fails, respond with standard error structure
    if (error) {
      // Collect detailed context from Joi error
      const validationDetails = error.details.map((detail) => ({
        message: detail.message,
        path: detail.path.join('.'),
        type: detail.type,
        context: detail.context,
      }));

      // Construct an ErrorResponse using createValidationError
      // For a standard code, you could pass "INVALID_FORMAT" or "INVALID_INPUT" if needed:
      // e.g. VALIDATION_ERRORS.INVALID_FORMAT, or any domain-specific code.
      const validationError: ErrorResponse = createValidationError(
        'VALIDATION_ERROR', // or a code of your choosing
        'Schema validation failed',
        { validationDetails }
      );

      // Unprocessable Entity is often used for semantic validation errors
      return res
        .status(HTTP_STATUS.UNPROCESSABLE_ENTITY)
        .json(validationError);
    }

    // If validation succeeded, assign sanitized/validated data back to request
    req[source] = value;
    return next();
  };
}

/**
 * Enhanced Express middleware factory that checks for presence of required fields.
 * Provides detailed error context if fields are missing or null/undefined.
 *
 * @param {string[]} requiredFields - List of field names that must be present
 * @param {'body' | 'query' | 'params'} source - Where to look for these fields in the request
 * @returns {RequestHandler} Middleware function for Express
 */
export function validateRequiredFields(
  requiredFields: string[],
  source: 'body' | 'query' | 'params'
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Extract relevant data subset from request
    const data = req[source] || {};

    // Run custom utility to detect missing fields
    const { valid, missing } = validateRequired(data, requiredFields);

    // If not valid, construct a comprehensive error response
    if (!valid) {
      const missingDetails = {
        missingFields: missing,
        expectedFields: requiredFields,
        actualValues: data,
      };

      const validationError: ErrorResponse = createValidationError(
        'REQUIRED_FIELDS_MISSING', // or a standard code from your domain
        'Missing required field(s)',
        missingDetails
      );

      return res.status(HTTP_STATUS.BAD_REQUEST).json(validationError);
    }

    // Otherwise proceed
    return next();
  };
}

/**
 * Enhanced Express middleware factory that validates data types of specified fields,
 * supporting nested paths (e.g., "user.profile.email"), array checks, and optional
 * custom validator functions.
 *
 * @param {Record<string, string | Function>} typeDefinitions - A map of fieldPath -> expectedType.
 *        Acceptable expectedType string values include "string", "number", "boolean", "array", "date", etc.
 *        If a function is provided, it should return true if valid, false otherwise (custom type check).
 * @param {'body' | 'query' | 'params'} source - The request property containing the target data
 * @returns {RequestHandler} Middleware function for Express
 */
export function validateDataTypes(
  typeDefinitions: Record<string, string | ((val: any) => boolean)>,
  source: 'body' | 'query' | 'params'
): RequestHandler {
  /**
   * A helper to safely access nested values using dot-notation,
   * e.g., "user.profile.email".
   */
  function getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((acc: any, part: string) => {
      if (acc === null || acc === undefined) return undefined;
      return acc[part];
    }, obj);
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const data = req[source] || {};
    const typeMismatchErrors: {
      field: string;
      expectedType: string;
      actualType: string;
    }[] = [];

    // Iterate over each field path in typeDefinitions
    for (const fieldPath of Object.keys(typeDefinitions)) {
      const expected = typeDefinitions[fieldPath];
      const value = getNestedValue(data, fieldPath);

      // Determine actual type
      let actualType = typeof value;

      // Handle null or undefined as a distinct scenario
      if (value === null) {
        actualType = 'null';
      }
      if (value === undefined) {
        actualType = 'undefined';
      }

      // If the expected is a function, treat it as a custom validator
      if (typeof expected === 'function') {
        const customIsValid = expected(value);
        if (!customIsValid) {
          typeMismatchErrors.push({
            field: fieldPath,
            expectedType: 'CustomFunction',
            actualType,
          });
        }
        continue;
      }

      // Process special types like "date" or "array"
      if (expected === 'date') {
        if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value)) {
          actualType = 'date';
        } else if (typeof value === 'string') {
          const maybeDate = new Date(value);
          if (!isNaN(maybeDate.getTime())) {
            actualType = 'date';
          }
        }
      } else if (expected === 'array' && Array.isArray(value)) {
        actualType = 'array';
      }

      // If mismatch, add to array of errors
      if (expected !== actualType) {
        typeMismatchErrors.push({
          field: fieldPath,
          expectedType: String(expected),
          actualType,
        });
      }
    }

    // If we have any errors, respond with structured JSON error
    if (typeMismatchErrors.length > 0) {
      const details = {
        typeMismatches: typeMismatchErrors,
      };

      const validationError: ErrorResponse = createValidationError(
        'DATA_TYPE_VALIDATION_ERROR', // or a standard code from your domain
        'One or more fields have an invalid data type',
        details
      );

      // 422 Unprocessable Entity for semantic validation errors
      return res
        .status(HTTP_STATUS.UNPROCESSABLE_ENTITY)
        .json(validationError);
    }

    // No mismatches found -> proceed
    return next();
  };
}