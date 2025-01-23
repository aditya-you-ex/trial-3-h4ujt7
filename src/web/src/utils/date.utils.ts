/**
 * date.utils.ts
 * -----------------------------------------------------------------------------
 * Provides frontend date manipulation, formatting, and validation utilities
 * for consistent date handling across the TaskStream AI web application with
 * enhanced error handling, timezone support, and localization capabilities.
 */

////////////////////////////////////////////////////////////////////////////////
// External Imports (date-fns version ^2.30.0)
////////////////////////////////////////////////////////////////////////////////

import { format, parseISO, isValid, addDays, differenceInDays } from 'date-fns';

////////////////////////////////////////////////////////////////////////////////
// Internal Imports
////////////////////////////////////////////////////////////////////////////////

import { TimeRange } from '../../types/common.types';

////////////////////////////////////////////////////////////////////////////////
// Custom Error Classes
////////////////////////////////////////////////////////////////////////////////

/**
 * DateParsingError
 * -----------------------------------------------------------------------------
 * A typed error thrown when a critical date parsing operation fails definitively.
 * This error is used to indicate scenarios where the input date string format is
 * recognized but yields an invalid date object (e.g., malformed date content).
 */
export class DateParsingError extends Error {
  public readonly originalValue: string;

  constructor(message: string, originalValue: string) {
    super(message);
    this.name = 'DateParsingError';
    this.originalValue = originalValue;
  }
}

////////////////////////////////////////////////////////////////////////////////
// 1. formatDate
////////////////////////////////////////////////////////////////////////////////

/**
 * Formats a date into a specified format string with localization support and
 * graceful fallback for invalid inputs. If the date fails validation, returns
 * the fallback string "Invalid date".
 *
 * @param date - The Date object or ISO date string to format.
 * @param formatString - A valid date-fns format string (e.g., 'yyyy-MM-dd').
 * @param locale - An optional locale object to support multi-language formatting.
 * @returns A formatted date string or "Invalid date" if parsing/validation fails.
 */
export function formatDate(
  date: Date | string,
  formatString: string,
  locale?: Locale
): string {
  try {
    // Step 1: Validate the 'date' input to ensure it is not null or undefined.
    if (date === null || date === undefined) {
      return 'Invalid date';
    }

    // Step 2: If 'date' is a string, parse it using parseISO to convert to Date.
    let dateObj: Date;
    if (typeof date === 'string') {
      dateObj = parseISO(date);
    } else {
      dateObj = date;
    }

    // Step 3: Ensure the resulting Date object is valid (not "Invalid Date").
    if (!isValid(dateObj)) {
      return 'Invalid date';
    }

    // Step 4: Apply date formatting using the specified format string.
    //         Pass the locale if provided; otherwise, rely on default.
    return format(dateObj, formatString, locale ? { locale } : {});
  } catch (err) {
    // In the unlikely event of an unforeseen parsing error, safely return fallback.
    return 'Invalid date';
  }
}

////////////////////////////////////////////////////////////////////////////////
// 2. parseDate
////////////////////////////////////////////////////////////////////////////////

/**
 * Parses a date string into a Date object with enhanced validation and error
 * handling. Returns null if the input string is empty. Throws a typed
 * DateParsingError if the resulting Date object is definitively invalid.
 *
 * @param dateString - A string representation of the date in ISO format.
 * @returns A valid Date object or null if the input string is empty.
 * @throws DateParsingError if the parsed date is invalid.
 */
export function parseDate(dateString: string): Date | null {
  // Step 1: Check if the input string is empty or only whitespace.
  if (!dateString || dateString.trim().length === 0) {
    // Return null for non-critical (empty) string inputs.
    return null;
  }

  // Step 2: Attempt to parse the string using date-fns parseISO.
  const parsed: Date = parseISO(dateString);

  // Step 3: Validate that the parsed object is a correct Date.
  if (!isValid(parsed)) {
    // Throw a typed error for critical parsing failures.
    throw new DateParsingError('Unable to parse date string', dateString);
  }

  // Step 4: Return the parsed Date object if everything checks out.
  return parsed;
}

////////////////////////////////////////////////////////////////////////////////
// 3. isDateInRange
////////////////////////////////////////////////////////////////////////////////

/**
 * Checks whether a given date falls within a specified time range. This function
 * carefully validates the input Date and the start/end boundaries of the
 * TimeRange to handle null, undefined, or invalid dates comprehensively.
 *
 * @param date - The Date to test.
 * @param range - A TimeRange object containing startDate and endDate.
 * @returns True if the date is within the inclusive range, false otherwise.
 */
export function isDateInRange(date: Date, range: TimeRange): boolean {
  // Step 1: Validate the input date and ensure it is not null or undefined.
  if (!date || !isValid(date)) {
    return false;
  }

  // Step 2: Validate that the range exists and has valid start/end dates.
  if (!range || !range.startDate || !range.endDate) {
    return false;
  }
  if (!isValid(range.startDate) || !isValid(range.endDate)) {
    return false;
  }

  // Optional additional check: ensure startDate <= endDate logically.
  if (range.startDate.getTime() > range.endDate.getTime()) {
    return false;
  }

  // Step 3: Compare the given date with startDate and endDate.
  const dateTime = date.getTime();
  const startTime = range.startDate.getTime();
  const endTime = range.endDate.getTime();

  // Step 4: Return true if date is within or on the boundaries of the range.
  return dateTime >= startTime && dateTime <= endTime;
}

////////////////////////////////////////////////////////////////////////////////
// 4. calculateDateDifference
////////////////////////////////////////////////////////////////////////////////

/**
 * Calculates the absolute difference in days between two dates, taking into
 * account the possibility of invalid inputs. If either of the provided dates is
 * invalid, this function returns 0 to handle the scenario gracefully.
 *
 * @param date1 - The first Date, representing one endpoint of the timeline.
 * @param date2 - The second Date, representing the other endpoint of the timeline.
 * @returns The absolute difference in days between date1 and date2.
 */
export function calculateDateDifference(date1: Date, date2: Date): number {
  // Step 1: Validate both dates; return 0 if either is invalid or null.
  if (!date1 || !isValid(date1) || !date2 || !isValid(date2)) {
    return 0;
  }

  // Step 2: Use differenceInDays to compute the day difference.
  //         Wrap with Math.abs to ensure the result is non-negative.
  const diff = differenceInDays(date1, date2);

  // Step 3: Return the absolute difference in days.
  return Math.abs(diff);
}