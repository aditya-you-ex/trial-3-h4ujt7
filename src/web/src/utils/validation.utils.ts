/***************************************************************************************************
 * TaskStream AI - Frontend Validation Utilities
 * -----------------------------------------------------------------------------------------------
 * This file provides enterprise-grade validation utility functions used within the TaskStream AI
 * web application. Each function is designed to ensure data accuracy prior to API submission,
 * contributing to both high reliability (99.9% uptime target) and alignment with standardized API
 * response/error handling.
 *
 * Requirements Addressed:
 * 1) Task Extraction Accuracy (95%): By validating form data before submission, we reduce errors
 *    in task data creation, improving overall extraction accuracy.
 * 2) System Reliability (99.9% Uptime): Preventing invalid data submission reduces the risk
 *    of system interruptions or exceptions.
 * 3) API Response Standards: Producing and handling detailed, standardized error formats ensures
 *    consistent collaboration with TaskStream AI backend services.
 **************************************************************************************************/

/***************************************************************************************************
 * External Library Imports (with version information per IE2)
 **************************************************************************************************/
// date-fns v^2.30.0: Provides robust date validation utilities.
import { isValid } from 'date-fns'; // v^2.30.0

// validator v^13.11.0: Supplies RFC 5322-compliant email checking for improved correctness.
import { isEmail } from 'validator'; // v^13.11.0

/***************************************************************************************************
 * Internal Imports (with usage details per IE1)
 **************************************************************************************************/
/**
 * ApiErrorResponse is imported from the shared types to standardize the structure of error objects
 * produced by or passed to the TaskStream AI platform's API layer, ensuring consistent code, message,
 * details, and other fields across all services.
 */
import { ApiErrorResponse } from '../types/api.types';

/**
 * TimeRange is used to represent a block of time with start and end Date objects. Our validation
 * logic ensures these fields are valid Date objects and that the range respects system constraints.
 */
import { TimeRange } from '../types/common.types';

/***************************************************************************************************
 * validateRequired
 * -----------------------------------------------------------------------------------------------
 * Description:
 *   Validates the presence of all required fields in a given data object. If any field in
 *   requiredFields is null, undefined, or an empty string, it is recorded in missingFields.
 *
 * Parameters:
 *   @param data            An object containing the form or input data to be validated. Keys in
 *                         this object are checked against the requiredFields array.
 *   @param requiredFields  A string array of required field names that must exist in the data object.
 *
 * Returns:
 *   An object specifying { valid: boolean, missingFields: string[] }. The valid property is set
 *   to false if missingFields is non-empty, indicating that some fields are not populated.
 *
 * Steps:
 *   1) Initialize an empty missingFields array.
 *   2) Iterate through each field in requiredFields.
 *   3) If data[field] is undefined, null, or an empty string, push the field into missingFields.
 *   4) Return an object with valid flag (true if no missing fields, false otherwise) and the
 *      list of missingFields for further processing or display.
 **************************************************************************************************/
export function validateRequired(
  data: Record<string, unknown>,
  requiredFields: string[],
): { valid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const value = data[field];
    if (
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim().length === 0)
    ) {
      missingFields.push(field);
    }
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/***************************************************************************************************
 * validateEmail
 * -----------------------------------------------------------------------------------------------
 * Description:
 *   Checks if a given string is a valid email address according to RFC 5322 using the validator
 *   library's isEmail function. Returns true if the email is valid, false otherwise.
 *
 * Parameters:
 *   @param email  The string value to validate as a valid email address.
 *
 * Returns:
 *   A boolean indicating if the input string is a properly formed email address.
 *
 * Steps:
 *   1) Verify that the input is of type string; if not, return false.
 *   2) Invoke validator.isEmail to check RFC 5322 compliance.
 *   3) Return the result of isEmail.
 **************************************************************************************************/
export function validateEmail(email: string): boolean {
  if (typeof email !== 'string') {
    return false;
  }
  return isEmail(email);
}

/***************************************************************************************************
 * validatePassword
 * -----------------------------------------------------------------------------------------------
 * Description:
 *   Performs an enhanced validation of password strength, verifying minimum length, uppercase/lowercase
 *   letters, numeric digits, and special characters. Calculates a strength score (0-100) and returns
 *   the validation result, an array of errors if any requirement is not met, and the computed strength.
 *
 * Parameters:
 *   @param password  The raw string value representing the user's password input.
 *
 * Returns:
 *   An object containing { valid: boolean, errors: string[], strength: number }, where valid indicates
 *   whether all checks passed, errors lists each requirement not met, and strength is a numeric score
 *   quantifying the overall strength of the password.
 *
 * Steps:
 *   1) Check minimum length (>=8 characters). If not met, add an error message.
 *   2) Verify at least one uppercase letter using a regex. Add an error if not found.
 *   3) Verify at least one lowercase letter using a regex. Add an error if not found.
 *   4) Verify at least one numerical digit using a regex. Add an error if not found.
 *   5) Verify at least one special character using a regex. Add an error if not found.
 *   6) If no errors, compute a strength score from 0 to 100. Each fulfilled requirement
 *      can be assigned a portion of this score (e.g., 20 points each for 5 checks).
 *   7) Return the composite object representing validity, error messages, and the strength score.
 **************************************************************************************************/
export function validatePassword(
  password: string,
): { valid: boolean; errors: string[]; strength: number } {
  const errors: string[] = [];
  let strength = 0;

  // Minimum length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }

  // Uppercase letter check
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter.');
  }

  // Lowercase letter check
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter.');
  }

  // Digit check
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit.');
  }

  // Special character check
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character.');
  }

  // Calculate the strength score if no errors
  if (errors.length === 0) {
    // Assign 20 points per successfully met criterion, up to a total of 100
    let criteriaMet = 0;

    if (password.length >= 8) criteriaMet++;
    if (/[A-Z]/.test(password)) criteriaMet++;
    if (/[a-z]/.test(password)) criteriaMet++;
    if (/[0-9]/.test(password)) criteriaMet++;
    if (/[^A-Za-z0-9]/.test(password)) criteriaMet++;

    strength = (criteriaMet / 5) * 100;
  }

  return {
    valid: errors.length === 0,
    errors,
    strength,
  };
}

/***************************************************************************************************
 * validateTimeRange
 * -----------------------------------------------------------------------------------------------
 * Description:
 *   Validates that both the start and end dates within a TimeRange object are legitimate date values,
 *   and ensures that the start date precedes the end date. Additionally checks that the range does not
 *   exceed a particular limit (for example, 365 days).
 *
 * Parameters:
 *   @param timeRange  An object containing the startDate and endDate fields (and possibly additional
 *                     time range fields) requiring validation.
 *
 * Returns:
 *   An object of the form { valid: boolean, error?: string }. If 'valid' is false, 'error' contains
 *   a human-readable reason.
 *
 * Steps:
 *   1) Check that both startDate and endDate are valid Date objects using date-fns isValid.
 *   2) Ensure startDate is strictly before endDate.
 *   3) Optionally confirm that the date interval does not exceed system-imposed limits
 *      (e.g., 365 days).
 *   4) Return the validation object with an optional error message if checks fail.
 **************************************************************************************************/
export function validateTimeRange(
  timeRange: TimeRange,
): { valid: boolean; error?: string } {
  const { startDate, endDate } = timeRange;

  if (!isValid(startDate) || !isValid(endDate)) {
    return {
      valid: false,
      error: 'Invalid startDate or endDate.',
    };
  }

  if (startDate >= endDate) {
    return {
      valid: false,
      error: 'The start date must be earlier than the end date.',
    };
  }

  // Example optional limit check: 365 days
  const differenceInMs = endDate.getTime() - startDate.getTime();
  const msInOneDay = 24 * 60 * 60 * 1000;
  if (differenceInMs > 365 * msInOneDay) {
    return {
      valid: false,
      error: 'The time range cannot exceed 365 days.',
    };
  }

  return { valid: true };
}

/***************************************************************************************************
 * createValidationError
 * -----------------------------------------------------------------------------------------------
 * Description:
 *   Constructs a standardized validation error response object conforming to ApiErrorResponse,
 *   suitable for alignment with the TaskStream AI API's error format. Provides optional details
 *   to enhance debugging and display UI-layers with user-friendly messaging.
 *
 * Parameters:
 *   @param code     A string representing a machine-readable error classification, e.g. "E_REQUIRED".
 *   @param message  A user-facing message summarizing the cause or nature of the validation failure.
 *   @param details  A free-form object containing keyed data that explains or contextualizes the
 *                   validation issue (e.g., missing fields, incorrect formats, etc.).
 *
 * Returns:
 *   An ApiErrorResponse object that includes code, message, details, timestamp, and stackTrace. The
 *   timestamp is automatically set to the current time, while stackTrace can remain an empty string
 *   in a production environment to avoid security exposure.
 *
 * Steps:
 *   1) Create an empty object of type ApiErrorResponse with the given code, message, and details.
 *   2) Populate the timestamp field with current time.
 *   3) Assign stackTrace as an empty string, or optionally incorporate stack data if available.
 *   4) Return the completed ApiErrorResponse object.
 **************************************************************************************************/
export function createValidationError(
  code: string,
  message: string,
  details: Record<string, any>,
): ApiErrorResponse {
  const errorResponse: ApiErrorResponse = {
    code,
    message,
    details,
    timestamp: new Date(),
    stackTrace: '',
  };
  return errorResponse;
}