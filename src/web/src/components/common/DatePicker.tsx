/**
 * DatePicker.tsx
 * -----------------------------------------------------------------------------
 * A reusable date picker component that provides a user-friendly interface
 * for selecting dates with comprehensive validation, formatting, and range
 * support. This component supports localization, timezone considerations,
 * disabled states, minimum/maximum date ranges, and more.
 *
 * Created to satisfy TaskStream AI's requirements for consistent date input
 * handling in task deadlines, project timelines, and analytics date filtering.
 */

////////////////////////////////////////////////////////////////////////////////
// External Imports (React version ^18.0.0, @mui/x-date-pickers version ^6.0.0,
// @mui/material version ^5.14.0)
////////////////////////////////////////////////////////////////////////////////
import React from 'react';
import { DatePicker as MUIDatePicker } from '@mui/x-date-pickers';
import { TextField } from '@mui/material';

////////////////////////////////////////////////////////////////////////////////
// Internal Imports
////////////////////////////////////////////////////////////////////////////////
import { formatDate, isValidDate } from '../../utils/date.utils';
import { TimeRange } from '../../types/common.types';
import { COLORS } from '../../constants/theme.constants';

////////////////////////////////////////////////////////////////////////////////
// Interface: DatePickerProps
////////////////////////////////////////////////////////////////////////////////
/**
 * Enhanced props interface for the DatePicker component with additional
 * validation and formatting options. This ensures a standardized experience
 * for date selection across the application.
 */
export interface DatePickerProps {
  /**
   * The currently selected date value. If null, indicates no date is chosen.
   */
  value: Date | null;

  /**
   * The callback function triggered whenever a new date is selected. Receives
   * the updated date (or null) as an argument.
   */
  onChange: (date: Date | null) => void;

  /**
   * The label displayed above or alongside the date picker field.
   */
  label: string;

  /**
   * Whether the date field is required in forms. If so, validation logic
   * enforces that a date be chosen before submission.
   */
  required: boolean;

  /**
   * Whether the date picker is disabled. If true, the user cannot change
   * or select a new date.
   */
  disabled: boolean;

  /**
   * An optional error message. If provided, the TextField will be rendered
   * in an error state, displaying this message as helper text.
   */
  error: string;

  /**
   * The earliest allowed date for selection. Attempts to pick a date before
   * this value should render as invalid or disallowed.
   */
  minDate: Date;

  /**
   * The latest allowed date for selection. Attempts to pick a date after
   * this value should render as invalid or disallowed.
   */
  maxDate: Date;

  /**
   * A date formatting string indicating how the date should appear in
   * the input field (e.g., "yyyy-MM-dd").
   */
  format: string;

  /**
   * The locale identifier (e.g., "en-US") used for localized date formatting
   * and parsing. Depending on the date adapter, this can alter various
   * textual UI elements too.
   */
  locale: string;

  /**
   * The timezone identifier (e.g., "UTC", "America/New_York") to be used
   * when rendering or interpreting the date. Implementation specifics may
   * require a date adapter supporting time zones.
   */
  timezone: string;

  /**
   * If true, displays an option to clear the currently selected date.
   * This can help users quickly revert or unset date fields.
   */
  clearable: boolean;

  /**
   * A function that determines if a particular date should be disabled
   * (unselectable). Often used to block out weekends, holidays, or
   * out-of-scope dates.
   */
  shouldDisableDate: (date: Date) => boolean;
}

////////////////////////////////////////////////////////////////////////////////
// Component: DatePicker
////////////////////////////////////////////////////////////////////////////////
/**
 * An enhanced date picker component with comprehensive validation, formatting,
 * and accessibility features. Leverages MUI's DatePicker but adds custom logic
 * for error handling, min/max validation, date disabling, clearing, and
 * localized formatting.
 *
 * @param {DatePickerProps} props - The component props.
 * @returns {JSX.Element} Rendered date picker element with advanced capabilities.
 */
export const DatePicker: React.FC<DatePickerProps> = React.memo(function DatePicker(
  props: DatePickerProps
): JSX.Element {
  /**
   * STEP 1: Destructure props for easy reference. We retain all props in
   * case we need advanced logic, such as passing the entire props object
   * down to MUIDatePicker or conditionally applying them.
   */
  const {
    value,
    onChange,
    label,
    required,
    disabled,
    error,
    minDate,
    maxDate,
    format,
    locale,
    timezone,
    clearable,
    shouldDisableDate,
  } = props;

  /**
   * STEP 2: Handle onChange with robust date validation. MUI's onChange
   * provides a Date or null. We verify if it's valid, then pass it to
   * the parent. If the date is invalid, we can either pass null or enforce
   * a fallback approach. Here, we return null if invalid.
   */
  const handleDateChange = (newValue: Date | null) => {
    if (newValue && isValidDate(newValue)) {
      onChange(newValue);
    } else {
      onChange(null);
    }
  };

  /**
   * STEP 3: Define a derived function to unify MUI's day-disabling logic:
   *   1) Respect the user's custom shouldDisableDate callback (if provided).
   *   2) Ensure no date before minDate or after maxDate is allowed.
   */
  const handleShouldDisableDate = React.useCallback(
    (day: Date) => {
      // If a custom user callback is given, run it first.
      if (shouldDisableDate && shouldDisableDate(day)) {
        return true;
      }

      // If invalid minDate or maxDate are provided, skip checks to avoid errors.
      if (!isValidDate(minDate) || !isValidDate(maxDate)) {
        return false;
      }

      // Compare with minDate and maxDate boundaries.
      const dayTime = day.getTime();
      if (dayTime < minDate.getTime() || dayTime > maxDate.getTime()) {
        return true;
      }

      return false;
    },
    [shouldDisableDate, minDate, maxDate]
  );

  /**
   * STEP 4: MUI core date picker usage. Accepts minDate, maxDate, format,
   * clearable, and callback for disabling specific dates. We also inject
   * our custom error handling into the renderInput function by passing
   * a standardized TextField with error states.
   */
  return (
    <MUIDatePicker
      label={label}
      value={value}
      onChange={handleDateChange}
      disabled={disabled}
      format={format}
      minDate={minDate}
      maxDate={maxDate}
      shouldDisableDate={handleShouldDisableDate}
      /**
       * NOTE: For advanced localization or timezone usage, a specialized
       * date adapter (e.g., @date-io, date-fns-tz) and a LocalizationProvider
       * may be necessary to fully leverage the locale ({locale}) and
       * timezone ({timezone}) beyond standard usage. This code expects that
       * the parent context has appropriately configured these features if
       * needed.
       */
      /**
       * Provide 'clearable' behavior by specifying an 'ActionBar' in MUI v6.
       * If clearable is true, show the 'clear' action. Otherwise, hide it.
       */
      slots={{}}
      slotProps={{
        actionBar: {
          actions: clearable
            ? ['clear', 'cancel', 'accept']
            : ['cancel', 'accept'],
        },
      }}
      /**
       * The TextField used to display the selected date. We inject an error
       * state if 'props.error' is non-empty, plus a helper text showing
       * that error. The color override references the theming constants.
       */
      renderInput={(params) => (
        <TextField
          {...params}
          required={required}
          error={Boolean(error)}
          helperText={error || params.helperText}
          sx={{
            // Use the imported COLORS for consistent theming across the app.
            '& .MuiOutlinedInput-root.Mui-error .MuiOutlinedInput-notchedOutline': {
              borderColor: COLORS.error.main,
            },
            '& .MuiFormLabel-root.Mui-error': {
              color: COLORS.error.main,
            },
            '& .MuiInputBase-root': {
              color: COLORS.primary.contrastText,
              backgroundColor: disabled
                ? COLORS.grey[200]
                : COLORS.primary.dark,
            },
            '& .MuiFormLabel-root': {
              // If not in an error state, use default label color
              color: error ? COLORS.error.main : COLORS.primary.light,
            },
          }}
        />
      )}
    />
  );
});

////////////////////////////////////////////////////////////////////////////////
// Export
////////////////////////////////////////////////////////////////////////////////
/**
 * Export the enhanced DatePicker component to be used wherever advanced
 * date selection is required, including but not limited to tasks, projects,
 * and analytics date range filtering.
 */
export default DatePicker;