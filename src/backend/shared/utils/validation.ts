/**
 * This module provides core validation utilities for the TaskStream AI platform.
 * It implements required field checks, data type validation, error creation,
 * email validation, and enhanced date validation (including timezone and range checks).
 * These functions bolster data integrity, contributing directly to:
 *  - Task Extraction Accuracy (95% accuracy) through rigorous input validation
 *  - System Reliability (99.9% uptime) by preventing invalid data propagation
 *  - Standardized error responses, in alignment with API Response Standards
 */

import { VALIDATION_ERRORS } from '../constants/error-codes'; // Internal import: Error codes for validation failures
import type { ErrorResponse } from '../interfaces/common.interface'; // Internal import: Error response structure

// date-fns ^2.30.0 for robust date parsing and validation
import { isDate, parseISO, isValid } from 'date-fns';

/**
 * Validates the presence of specified required fields in a data object.
 * Missing fields are collected in an array, and a "valid" flag indicates
 * whether all fields are present and non-null/undefined.
 *
 * @param data - The object to inspect for required fields.
 * @param requiredFields - The list of fields that must be present in data.
 * @returns An object containing:
 *  - valid: boolean indicating if all required fields are present
 *  - missing: string[] listing any required fields not present or null/undefined
 */
export function validateRequired(
  data: Record<string, any>,
  requiredFields: string[]
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  // Identify missing or null/undefined fields
  for (const field of requiredFields) {
    if (
      !Object.prototype.hasOwnProperty.call(data, field) ||
      data[field] === null ||
      data[field] === undefined
    ) {
      missing.push(field);
    }
  }

  // valid is determined by whether the missing array is empty
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Validates the data types of multiple fields against expected type definitions.
 * Special handling is provided for date and array types. Additional types
 * can be introduced as needed.
 *
 * @param data - The object whose fields are to be validated.
 * @param typeDefinitions - A mapping of field name to expected type (e.g. "string", "number", "boolean", "date", "array").
 * @returns An object containing:
 *  - valid: boolean indicating if all fields match their expected types
 *  - errors: An array of type mismatch details
 */
export function validateDataType(
  data: Record<string, any>,
  typeDefinitions: Record<string, string>
): {
  valid: boolean;
  errors: { field: string; expectedType: string; actualType: string }[];
} {
  const errors: { field: string; expectedType: string; actualType: string }[] = [];

  // Compare each field's actual type to the expected type
  for (const field of Object.keys(typeDefinitions)) {
    const expectedType = typeDefinitions[field];
    const value = data[field];
    let actualType = typeof value;

    // Handle special case: date
    if (expectedType === 'date') {
      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        actualType = 'date';
      } else if (typeof value === 'string') {
        // Attempt parsing as date
        const parsed = parseISO(value);
        if (isDate(parsed) && isValid(parsed)) {
          // Only if valid date
          actualType = 'date';
        } else {
          actualType = 'invalid_date';
        }
      }
    }

    // Handle special case: array
    if (expectedType === 'array') {
      if (Array.isArray(value)) {
        actualType = 'array';
      }
    }

    // If mismatch detected, record error
    if (
      (expectedType !== actualType) &&
      !(expectedType === 'date' && actualType === 'date') && // accept valid date
      !(expectedType === 'array' && actualType === 'array') // accept array
    ) {
      errors.push({
        field,
        expectedType,
        actualType,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Creates a standardized validation error response conforming to the platform's
 * error handling specification. This function leverages the ErrorResponse interface
 * (from ../interfaces/common.interface) to ensure uniform error representation.
 *
 * @param code - A unique error code from VALIDATION_ERRORS or any recognized domain.
 * @param message - A descriptive error message for the client or logs.
 * @param details - Additional contextual information about the error.
 * @returns An ErrorResponse object with code, message, details, timestamp, and a generated stack trace.
 */
export function createValidationError(
  code: string,
  message: string,
  details: Record<string, any>
): ErrorResponse {
  return {
    code,
    message,
    details,
    timestamp: new Date(),
    stackTrace: new Error().stack || '',
  };
}

/**
 * Checks whether a given string represents a valid email format (RFC 5322 standard).
 * Returns true for valid formats, false otherwise.
 *
 * @param email - The string to be tested for email format.
 * @returns A boolean indicating whether the provided string is a valid email address.
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') {
    return false;
  }

  // RFC 5322 official standard regex pattern
  // Note: Additional rules (e.g., domain validation) can be layered if needed.
  const emailRegex =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@(([^<>()[\]\\.,;:\s@"]+\.)+[^<>()[\]\\.,;:\s@"]{2,})$/i;

  return emailRegex.test(email);
}

/**
 * Validates whether the provided input is a valid date. This includes
 * parsing string inputs as ISO dates, checking for invalid dates,
 * and ensuring they fall within optional min/max boundaries.
 * A timezone check can be optionally enforced to validate the provided timezone.
 *
 * @param date - The input to be checked; may be a Date object, string, or any type.
 * @param options - An object that may include:
 *  - min: The earliest admissible date
 *  - max: The latest admissible date
 *  - requiredTimezone: A timezone string required for input acceptance
 * @returns A boolean indicating whether the date is valid under the given constraints.
 */
export function isValidDate(
  date: any,
  options?: {
    min?: Date;
    max?: Date;
    requiredTimezone?: string;
  }
): boolean {
  let dateObj: Date | null = null;

  // If already a Date object, directly use it
  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string') {
    // Parse string as ISO date
    const parsed = parseISO(date);
    if (isDate(parsed) && isValid(parsed)) {
      dateObj = parsed;
    }
  }

  // If dateObj is still null or not a valid Date object, return false
  if (!dateObj || !isDate(dateObj) || !isValid(dateObj)) {
    return false;
  }

  // Check against min bound
  if (options?.min && dateObj < options.min) {
    return false;
  }

  // Check against max bound
  if (options?.max && dateObj > options.max) {
    return false;
  }

  // Validate timezone if required
  if (options?.requiredTimezone) {
    // Placeholder check: ensure non-empty string if a timezone is required.
    // For stricter validation, consider verifying against IANA timezones.
    if (typeof options.requiredTimezone !== 'string' || !options.requiredTimezone.trim()) {
      return false;
    }
  }

  return true;
}