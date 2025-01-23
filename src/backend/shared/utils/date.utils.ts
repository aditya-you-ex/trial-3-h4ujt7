/**
 * Provides comprehensive utility functions for date manipulation, formatting,
 * validation, and comparison operations with enhanced timezone support and
 * caching mechanisms for the TaskStream AI platform. This module ensures
 * consistent date handling across different locales and timezones, directly
 * contributing to:
 *  - Task Extraction Accuracy (95% accuracy) through accurate date parsing
 *    and validation with timezone awareness
 *  - Data Management (consistent date handling in metadata and time-based
 *    operations across different regions)
 */

////////////////////////////////////////
// External Imports with Versions
////////////////////////////////////////

import { format, parseISO, isValid } from 'date-fns'; // ^2.30.0
import {
  formatInTimeZone,
  utcToZonedTime,
} from 'date-fns-tz'; // ^2.0.0

////////////////////////////////////////
// Internal Imports
////////////////////////////////////////

import { TimeRange } from '../interfaces/common.interface';
import { isValidDate as validateDate, createValidationError } from './validation';
import { VALIDATION_ERRORS } from '../constants/error-codes';

////////////////////////////////////////
// Caching
////////////////////////////////////////

/**
 * Internal cache to store formatted date strings to optimize repeated
 * formatting calls with the same date, format pattern, and timezone.
 */
const formatCache: Map<string, string> = new Map();

/**
 * Checks if a given timezone string is recognized as valid by the
 * JavaScript Intl.DateTimeFormat APIs. If this fails, an exception is
 * thrown internally, indicating the timezone is invalid.
 *
 * @param tz - The candidate timezone string to validate (e.g., "America/Denver").
 * @returns A boolean indicating whether the given timezone is valid.
 */
function isValidTimezone(tz: string): boolean {
  if (typeof tz !== 'string' || !tz.trim()) {
    return false;
  }
  try {
    // Attempt to create a localized formatter using the proposed timezone.
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

////////////////////////////////////////
// Exported Functions
////////////////////////////////////////

/**
 * Formats a date object or string into a specified format with timezone support
 * and caching. Throws a validation error if the date or timezone is invalid.
 *
 * @param date - The date value to format (can be a Date object or an ISO string).
 * @param formatString - The desired output format (e.g., "yyyy-MM-dd HH:mm:ss").
 * @param timezone - The IANA timezone identifier (e.g., "America/Los_Angeles").
 * @returns The formatted date string in the specified timezone.
 */
export function formatDate(
  date: Date | string,
  formatString: string,
  timezone: string
): string {
  // Step 1: Check format cache for existing result
  const cacheKey = `${date}|${formatString}|${timezone}`;
  if (formatCache.has(cacheKey)) {
    return formatCache.get(cacheKey)!;
  }

  // Step 2: Validate input date and timezone
  // If the date is invalid under normal platform rules, throw an error.
  if (!validateDate(date)) {
    throw createValidationError(
      VALIDATION_ERRORS.INVALID_FORMAT,
      'Invalid date provided for formatting.',
      { providedDate: date, formatString, timezone }
    );
  }
  if (!isValidTimezone(timezone)) {
    throw createValidationError(
      VALIDATION_ERRORS.INVALID_TIMEZONE,
      'Invalid or unsupported timezone provided.',
      { providedDate: date, formatString, timezone }
    );
  }

  // Step 3: Convert string date to Date object if needed
  let dateObject: Date;
  if (typeof date === 'string') {
    const parsedDate = parseISO(date);
    if (!isValid(parsedDate)) {
      throw createValidationError(
        VALIDATION_ERRORS.INVALID_FORMAT,
        'Date string could not be parsed correctly.',
        { providedDate: date, formatString, timezone }
      );
    }
    dateObject = parsedDate;
  } else {
    dateObject = date;
  }

  // Step 4: Apply timezone conversion using date-fns-tz
  // For formatting, we can rely directly on formatInTimeZone.
  // No separate conversion step is required here beyond the final call below.

  // Step 5: Apply formatting using date-fns-tz formatInTimeZone
  const formattedString = formatInTimeZone(dateObject, timezone, formatString);

  // Step 6: Cache result for frequently used formats
  formatCache.set(cacheKey, formattedString);

  // Step 7: Return the formatted string
  return formattedString;
}

/**
 * Parses a date string into a Date object with timezone validation. Returns
 * the resultant Date object, which is offset to the specified timezone.
 * Throws a validation error if the date string or timezone is invalid.
 *
 * @param dateString - The ISO date string to parse (e.g., "2023-01-15T13:00:00Z").
 * @param timezone - The IANA timezone identifier (e.g., "Asia/Tokyo").
 * @returns A Date object representing the parsed date/time in the target timezone.
 */
export function parseDate(dateString: string, timezone: string): Date {
  // Step 1: Validate date string format
  // We'll reuse "validateDate" to check if the date string is valid. This does
  // not itself confirm timezone correctness, so we check timezone separately.
  if (!validateDate(dateString)) {
    throw createValidationError(
      VALIDATION_ERRORS.INVALID_FORMAT,
      'Invalid date string format supplied.',
      { dateString, timezone }
    );
  }

  // Step 2: Validate timezone format
  if (!isValidTimezone(timezone)) {
    throw createValidationError(
      VALIDATION_ERRORS.INVALID_TIMEZONE,
      'Invalid or unsupported timezone provided.',
      { dateString, timezone }
    );
  }

  // Step 3: Parse string using parseISO
  const parsed = parseISO(dateString);
  if (!isValid(parsed)) {
    throw createValidationError(
      VALIDATION_ERRORS.INVALID_FORMAT,
      'Failed to parse the date string into a valid Date object.',
      { dateString, timezone }
    );
  }

  // Step 4: Apply timezone conversion
  // This will produce a Date object offset to the specified timezone.
  // The underlying JS Date is always stored in UTC, but the local fields
  // reflect the target timezone.
  const zonedDate = utcToZonedTime(parsed, timezone);

  // Step 5: Validate resulting Date object
  if (!isValid(zonedDate)) {
    throw createValidationError(
      VALIDATION_ERRORS.INVALID_FORMAT,
      'Parsed date object is determined to be invalid upon timezone application.',
      { dateString, timezone }
    );
  }

  // Step 6: Return the parsed Date
  return zonedDate;
}

/**
 * Checks if a given date falls within a specified time range, considering
 * the range's timezone. Throws validation errors if the input date or
 * time range is invalid. Returns true if the date is within the range
 * (inclusive), otherwise false.
 *
 * @param date - The Date object to evaluate.
 * @param range - A TimeRange struct containing startDate, endDate, and timezone.
 * @returns A boolean indicating whether the date is within the specified range.
 */
export function isDateInRange(date: Date, range: TimeRange): boolean {
  // Step 1: Validate input date
  if (!validateDate(date)) {
    throw createValidationError(
      VALIDATION_ERRORS.INVALID_FORMAT,
      'Invalid date provided for range check.',
      { date, range }
    );
  }

  // Step 2: Validate range startDate
  if (!validateDate(range.startDate)) {
    throw createValidationError(
      VALIDATION_ERRORS.INVALID_FORMAT,
      'Invalid startDate in time range.',
      { date, range }
    );
  }

  // Step 3: Validate range endDate
  if (!validateDate(range.endDate)) {
    throw createValidationError(
      VALIDATION_ERRORS.INVALID_FORMAT,
      'Invalid endDate in time range.',
      { date, range }
    );
  }

  // Step 4: Validate timezone from TimeRange
  if (!isValidTimezone(range.timezone)) {
    throw createValidationError(
      VALIDATION_ERRORS.INVALID_TIMEZONE,
      'Invalid or unsupported timezone in the TimeRange object.',
      { date, range }
    );
  }

  // Step 5: Normalize all dates to the same timezone
  const zonedDate = utcToZonedTime(date, range.timezone);
  const zonedStart = utcToZonedTime(range.startDate, range.timezone);
  const zonedEnd = utcToZonedTime(range.endDate, range.timezone);

  // Step 6: Compare date with range boundaries
  // The getTime() method provides a numeric representation for equality checks.
  const dateMs = zonedDate.getTime();
  const startMs = zonedStart.getTime();
  const endMs = zonedEnd.getTime();

  // Step 7: Return the comparison result (inclusive boundaries)
  return dateMs >= startMs && dateMs <= endMs;
}