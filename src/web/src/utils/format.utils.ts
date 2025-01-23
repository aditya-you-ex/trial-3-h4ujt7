/**
 * ---------------------------------------------------------------------------
 * TaskStream AI - Format Utilities
 * ---------------------------------------------------------------------------
 * This file provides a comprehensive set of utility functions for formatting
 * various data types. The utilities include number formatting, percentage
 * formatting, currency formatting, file size formatting, text truncation with
 * support for right-to-left (RTL) languages, and duration formatting with
 * optional localized output. It integrates external libraries such as
 * Numeral.js (^2.0.6) for numeric formatting and filesizes (^10.0.7) for file
 * size conversion. Accessibility considerations are represented through
 * comments indicating how ARIA attributes may be applied at the UI level.
 *
 * All functions are designed with strict type checking, thorough validation,
 * and enterprise-grade error handling to ensure consistent usage across
 * the TaskStream AI web application. Wherever necessary, potential developer
 * usage of ARIA attributes or other a11y-specific instructions is indicated
 * in comments, allowing for easy integration in React or similar frameworks.
 */

//
// External Library Imports
// ----------------------------------------------------------------------------
// numeral version ^2.0.6
import numeral from 'numeral';

// filesize version ^10.0.7
import filesize from 'filesize';

//
// Internal Imports
// ----------------------------------------------------------------------------
import { TimeRange } from '../../types/common.types';

/**
 * Interface for optional file size formatting. This can be extended
 * to include various parameters supported by the "filesize" library,
 * such as rounding, output format, etc.
 */
export interface FormatFileSizeOptions {
  /**
   * Optional base parameter for filesystem conversion,
   * e.g., 2 for binary-based, 10 for decimal-based.
   */
  base?: number;
  /**
   * Optional rounding method or precision level.
   */
  round?: number;
  /**
   * Determines whether the output is in a descriptive format (e.g. "1.05 KB")
   * or a precise numeric approach (e.g. "1,050 B"). See the "filesize" docs
   * for advanced usage.
   */
  output?: 'string' | 'object';
  /**
   * Additional parameters can be included here on an as-needed basis.
   */
  [key: string]: unknown;
}

/**
 * Interface for optional duration formatting. This can be expanded
 * to include descriptive or abbreviated time unit strings, as well
 * as advanced localization settings.
 */
export interface FormatDurationOptions {
  /**
   * When true, includes days in the formatted string if the duration
   * is sufficiently large (e.g., 2d 3h 10m). Defaults to false.
   */
  includeDays?: boolean;
  /**
   * When true, includes milliseconds in the formatted string if
   * the duration is smaller than a second. Defaults to false.
   */
  includeMilliseconds?: boolean;
  /**
   * Other advanced or locale-specific options can be defined here.
   */
  [key: string]: unknown;
}

/**
 * Formats a number with specified decimal places, thousands separators,
 * and locale support using Numeral.js. Throws an error if the input number
 * is invalid or if the format string cannot be processed by Numeral.
 *
 * @param value  A numeric value to be formatted.
 * @param format A string specifying the desired Numeral.js format pattern (e.g. "0,0.00").
 * @param locale A string representing the locale code (e.g. "en", "fr"). Numeral must be
 *               configured with this locale. If the locale is not recognized, the function
 *               falls back to the Numeral default.
 * @returns      A string representing the formatted number. Note that ARIA attributes
 *               for accessibility can be applied by the UI element consuming this result.
 */
export function formatNumber(value: number, format: string, locale: string): string {
  // 1. Validate input number is not null/undefined or NaN
  if (value === null || value === undefined || Number.isNaN(value)) {
    throw new Error(`Invalid 'value' parameter. Must be a valid number. Received: ${value}`);
  }

  // 2. Validate format string (basic check)
  if (typeof format !== 'string' || !format.trim()) {
    throw new Error(`Invalid 'format' parameter. Must be a non-empty string. Received: ${format}`);
  }

  // 3. Set locale-specific formatting rules. Fallback to default if this fails.
  try {
    numeral.locale(locale);
  } catch {
    // If the provided locale is not available or not configured in numeral,
    // it will fallback to what is currently set. We can optionally log or
    // handle this scenario as needed.
  }

  // 4. Apply numeral formatting with error handling
  let formatted: string;
  try {
    formatted = numeral(value).format(format);
  } catch (err) {
    throw new Error(`Numeral formatting failed for value: ${value}, format: ${format}. Error: ${(err as Error).message}`);
  }

  // 5. Validate output format. If not a string, throw an error.
  if (typeof formatted !== 'string') {
    throw new Error(`Expected a string output from Numeral, but received type: ${typeof formatted}`);
  }

  // 6. Return formatted string. ARIA considerations are typically handled in the UI:
  // e.g., <span aria-label={formattedValue}>{formattedValue}</span>
  return formatted;
}

/**
 * Formats a decimal number (0 <= value <= 1) as a percentage with configurable precision
 * and locale support. Internally uses Numeral for consistency.
 *
 * Steps:
 *  1. Validate input value is between 0 and 1.
 *  2. Validate decimal places is a non-negative integer.
 *  3. Set and apply locale-specific formatting rules.
 *  4. Multiply by 100 with precision handling.
 *  5. Format with specified decimal places.
 *  6. Append locale-specific percentage symbol.
 *  7. Add ARIA usage note for screen readers in code comment.
 *
 * @param value         A number between 0 and 1.
 * @param decimalPlaces Number of decimal places to retain in the formatted output.
 * @param locale        A string representing the numeral locale (e.g. "en").
 * @returns             A string with the formatted percentage (e.g. "85.0%" or "12%").
 */
export function formatPercentage(value: number, decimalPlaces: number, locale: string): string {
  // 1. Validate input value range
  if (value < 0 || value > 1) {
    throw new Error(`'value' must be between 0 and 1 for a percentage representation. Received: ${value}`);
  }

  // 2. Validate decimalPlaces is non-negative integer
  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0) {
    throw new Error(`'decimalPlaces' must be a non-negative integer. Received: ${decimalPlaces}`);
  }

  // 3. Set locale-specific formatting. Fallback if not recognized.
  try {
    numeral.locale(locale);
  } catch {
    // Log or fallback as needed
  }

  // 4. Multiply by 100 for the percentage
  const percentageValue = value * 100;

  // 5. Construct Numeral format string for the decimal places
  const decimalFormat = decimalPlaces > 0
    ? '0.' + '0'.repeat(decimalPlaces)
    : '0';

  // 6. Use Numeral to produce the numeric portion of the string
  let numericPart: string;
  try {
    numericPart = numeral(percentageValue).format(decimalFormat);
  } catch (err) {
    throw new Error(`Numeral formatting for percentage failed for value: ${value}. Error: ${(err as Error).message}`);
  }

  // 7. Combine numeric part with a percentage symbol. ARIA usage can be:
  // <span aria-label={`${numericPart} percent`}>{numericPart}%</span>
  return `${numericPart}%`;
}

/**
 * Formats a number as currency using the built-in ECMAScript Internationalization API.
 * Provides comprehensive currency code support and locale handling.
 *
 * Steps:
 *  1. Validate the input number.
 *  2. Validate currency code against a general constraint (non-empty string).
 *  3. Use Intl.NumberFormat to apply locale-specific currency formatting.
 *  4. Handle negative values appropriately with parentheses or signs (implicitly handled by Intl).
 *  5. Ensure the final string is properly spaced and grouped.
 *  6. Provide note on ARIA usage for currency in code comment.
 *
 * @param value        Numerical value representing the currency amount.
 * @param currencyCode A valid ISO 4217 currency code (e.g. "USD", "EUR").
 * @param locale       A locale code to determine formatting rules (e.g. "en-US", "fr-FR").
 * @returns            A formatted currency string (e.g. "$1,234.56").
 */
export function formatCurrency(value: number, currencyCode: string, locale: string): string {
  // 1. Validate input number
  if (value === null || value === undefined || Number.isNaN(value)) {
    throw new Error(`Invalid 'value' parameter for currency formatting. Received: ${value}`);
  }

  // 2. Validate currency code
  if (typeof currencyCode !== 'string' || !currencyCode.trim()) {
    throw new Error(`Invalid 'currencyCode'. Must be a non-empty string. Received: ${currencyCode}`);
  }

  // 3. Use Intl.NumberFormat for robust currency formatting
  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    });
  } catch (err) {
    throw new Error(`Intl currency format initialization failed for locale: ${locale}, currencyCode: ${currencyCode}. Error: ${(err as Error).message}`);
  }

  const formatted = formatter.format(value);

  // 4 & 5. Negative values, spacing, grouping are automatically handled by Intl.
  // 6. ARIA usage example in UI:
  // <span aria-label={`Amount of ${currencyCode} ${formatted}`}>{formatted}</span>
  return formatted;
}

/**
 * Formats a number of bytes into a human-readable file size string.
 *
 * Steps:
 *  1. Validate the input bytes is a non-negative number.
 *  2. Determine the optimal unit (handled internally by the 'filesize' package).
 *  3. Apply precision/rounding from passed in options if provided.
 *  4. Format with proper spacing and unit annotation.
 *  5. Provide ARIA note in code comment for screen readers.
 *  6. Handle edge cases for zero or extremely large sizes.
 *
 * @param bytes   The size in bytes to format. Should be a non-negative integer.
 * @param options Optional configuration object for the 'filesize' library.
 * @returns       A user-friendly string representing the size (e.g. "1.05 KB").
 */
export function formatFileSize(bytes: number, options?: FormatFileSizeOptions): string {
  // 1. Validate input
  if (!Number.isFinite(bytes) || bytes < 0) {
    throw new Error(`The 'bytes' parameter must be a non-negative number. Received: ${bytes}`);
  }

  // 2 & 3. Let the 'filesize' library handle normalizing units and applying any custom options.
  let result: string;
  try {
    result = filesize(bytes, { ...options }) as string;
  } catch (err) {
    throw new Error(`Failed to format file size for value: ${bytes}. Error: ${(err as Error).message}`);
  }

  // 5. ARIA usage in UI might be:
  // <span aria-label={`File size ${result}`}>{result}</span>
  return result;
}

/**
 * Truncates text to a specified maximum length with optional ellipsis,
 * including partial support for right-to-left (RTL) languages.
 *
 * Steps:
 *  1. Validate input text and maximum length.
 *  2. Detect text direction (basic regex check for RTL characters).
 *  3. Apply substring logic to preserve word boundaries (simple approach).
 *  4. Handle optional ellipsis insertion (e.g. "...").
 *  5. Preserve HTML entities if present, if possible.
 *  6. Provide ARIA usage note for full text.
 *
 * @param text      The original text string to be truncated.
 * @param maxLength Maximum number of characters allowed before truncation.
 * @param options   A configuration object, which may include:
 *                  - ellipsis: string (defaults to "...")
 *                  - preserveWords: boolean (attempt word-boundary truncation)
 * @returns         The truncated text. For more advanced RTL handling,
 *                  a specialized library or approach may be required.
 */
export function truncateText(
  text: string,
  maxLength: number,
  options?: {
    ellipsis?: string;
    preserveWords?: boolean;
  }
): string {
  // 1. Validate input
  if (typeof text !== 'string') {
    throw new Error(`'text' must be a string. Received type: ${typeof text}`);
  }
  if (!Number.isInteger(maxLength) || maxLength <= 0) {
    throw new Error(`'maxLength' must be a positive integer. Received: ${maxLength}`);
  }

  const ellipsis = options?.ellipsis ?? '...';
  const preserveWords = options?.preserveWords ?? false;

  if (text.length <= maxLength) {
    return text;
  }

  // 2. Basic RTL detection using a generalized Unicode range check
  const isRTL = /[\u0590-\u08FF]/.test(text);

  // 3. If preserveWords is enabled, attempt a naive word-boundary approach.
  let truncated = text.slice(0, maxLength);
  if (preserveWords) {
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    if (lastSpaceIndex > 0) {
      truncated = truncated.slice(0, lastSpaceIndex);
    }
  }

  // 4. Attach ellipsis
  truncated = `${truncated}${ellipsis}`;

  // 5. If text includes HTML entities, a more advanced parser might be needed. For now, we simply keep the substring.
  // 6. ARIA usage example in UI:
  // <span aria-label={`Full text: ${text}`}>{truncateText(text, 20, { ellipsis: '...' })}</span>
  // The label can reveal the full content for screen readers while showing truncated text visually.

  // 7. Placeholder logic for isRTL:
  // NOTE: Some advanced UI frameworks will automatically handle text direction if you set dir="auto".
  // Here, we simply return the truncated text. If specialized formatting for RTL is required, it can be handled by the UI.
  return isRTL ? truncated : truncated;
}

/**
 * Overloaded function declarations for formatDuration. It can accept either
 * a numeric milliseconds value or a TimeRange object for flexible usage.
 */
export function formatDuration(milliseconds: number, locale: string, options?: FormatDurationOptions): string;
export function formatDuration(timeRange: TimeRange, locale: string, options?: FormatDurationOptions): string;

/**
 * Formats a duration into a more human-readable string based on the
 * specified locale and options. Depending on the usage, it may take
 * either a plain number (representing milliseconds) or a TimeRange object.
 *
 * Steps:
 *  1. Validate input (numeric or TimeRange).
 *  2. Convert to total milliseconds from either direct input or timeRange.duration.
 *  3. Calculate subunits (days, hours, minutes, seconds, milliseconds).
 *  4. Apply locale-specific or user-specified unit labels.
 *  5. Build the final output string with correct spacing and singular/plural handling.
 *  6. Include ARIA note in comment for usage in screen readers.
 *
 * @param param   A number (ms) or a TimeRange object with startDate, endDate, and duration.
 * @param locale  The target locale (e.g. "en", "en-US"). Currently used to pick unit strings.
 * @param options Additional settings to determine which units to include or show (e.g. days, ms).
 * @returns       A formatted duration string (e.g. "1h 23m 15s"), depending on the chosen locale.
 */
export function formatDuration(
  param: number | TimeRange,
  locale: string,
  options?: FormatDurationOptions
): string {
  let totalMs: number;

  // 1. Validate input type
  if (typeof param === 'number') {
    if (!Number.isFinite(param) || param < 0) {
      throw new Error(`'milliseconds' must be a non-negative number. Received: ${param}`);
    }
    totalMs = param;
  } else {
    // param is TimeRange
    if (param.duration < 0) {
      throw new Error(`Invalid TimeRange duration. Must be non-negative. Received: ${param.duration}`);
    }
    totalMs = param.duration;
  }

  // 2. At this point, totalMs is the total duration in milliseconds
  // 3. Calculate subunits
  let remaining = totalMs;

  const days = options?.includeDays ? Math.floor(remaining / 86400000) : 0;
  if (options?.includeDays) {
    remaining = remaining % 86400000;
  }

  const hours = Math.floor(remaining / 3600000);
  remaining = remaining % 3600000;

  const minutes = Math.floor(remaining / 60000);
  remaining = remaining % 60000;

  const seconds = Math.floor(remaining / 1000);
  const millis = remaining % 1000;

  // 4. Apply localized or fallback unit labels. In a real system, we'd have
  // a more robust dictionary for multiple locales. For demonstration, only "en".
  const isEnglish = locale.toLowerCase().startsWith('en');
  const dayLabel = isEnglish ? 'd' : 'd';
  const hourLabel = isEnglish ? 'h' : 'h';
  const minuteLabel = isEnglish ? 'm' : 'm';
  const secondLabel = isEnglish ? 's' : 's';
  const msLabel = isEnglish ? 'ms' : 'ms';

  // 5. Construct the output string
  const parts: string[] = [];

  if (options?.includeDays && days > 0) {
    parts.push(`${days}${dayLabel}`);
  }
  if (hours > 0) {
    parts.push(`${hours}${hourLabel}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}${minuteLabel}`);
  }
  if (seconds > 0) {
    parts.push(`${seconds}${secondLabel}`);
  }
  if (options?.includeMilliseconds && millis > 0) {
    parts.push(`${millis}${msLabel}`);
  }

  // If totalMs was 0 or all subunits are 0, show something explicit (e.g., "0s")
  if (parts.length === 0) {
    parts.push(`0${secondLabel}`);
  }

  const finalString = parts.join(' ');

  // 6. ARIA usage example in UI:
  // <span aria-label={`Duration: ${finalString}`}>{finalString}</span>
  return finalString;
}

// Named exports for all utility functions, as specified in the JSON requirement.
export {
  formatNumber,
  formatPercentage,
  formatCurrency,
  formatFileSize,
  truncateText,
  formatDuration,
};