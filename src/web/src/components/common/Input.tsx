import React, { useState, useEffect, useRef, useImperativeHandle } from 'react'; // v^18.0.0
import styled from '@emotion/styled'; // v^11.11.0

/**
 * Importing internal utilities and constants per project specifications.
 * - validateRequired function is used for real-time validation checks.
 * - COLORS provides theme color references, specifically error and a custom focus color.
 * - TYPOGRAPHY provides font family and size tokens.
 */
import { validateRequired } from '../../utils/validation.utils';
import { COLORS, TYPOGRAPHY } from '../../constants/theme.constants';

/**
 * DEBOUNCE_DELAY:
 * Defines a delay (in milliseconds) for debounced real-time validation.
 * Real-time validation is triggered after typing has ceased for this duration.
 */
const DEBOUNCE_DELAY = 300;

/**
 * StyledInput
 * -----------------------------------------------------------------------------------------
 * A styled <input> element that:
 *   - Uses TaskStream AI's design tokens for typography (fontFamily, fontSize).
 *   - Applies consistent padding, border, and rounded corners.
 *   - Changes border color and box-shadow when focused.
 *   - Highlights errors with a distinct color to meet WCAG 2.1 AA contrasts.
 *
 * This is an enterprise-grade approach ensuring uniform styling across the application.
 */
const StyledInput = styled.input<{
  hasError?: boolean;
}>`
  font-family: ${({ hasError }) =>
    hasError ? TYPOGRAPHY.fontFamily.primary : TYPOGRAPHY.fontFamily.primary};
  font-size: ${TYPOGRAPHY.fontSize.md}px;
  border-radius: 4px;
  padding: 8px;
  border: 1px solid
    ${({ hasError }) => (hasError ? COLORS.error.main : '#D1D5DB')};
  outline: none;
  transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;

  &:focus {
    border-color: ${({ hasError }) =>
      hasError ? COLORS.error.main : '#2563EB'};
    box-shadow: 0 0 0 3px
      ${({ hasError }) =>
        hasError ? 'rgba(239,68,68,0.4)' : 'rgba(37,99,235,0.4)'};
  }
`;

/**
 * ErrorMessage
 * -----------------------------------------------------------------------------------------
 * A small text component used to visually and semantically present error
 * feedback to end users. This is placed beneath the input field and is
 * configured to be accessible for screen readers via aria-describedby.
 */
const ErrorMessage = styled.p`
  margin-top: 4px;
  font-size: ${TYPOGRAPHY.fontSize.xs}px;
  color: ${COLORS.error.main};
  line-height: 1.25;
`;

/**
 * HelperText
 * -----------------------------------------------------------------------------------------
 * This component displays additional guidance for the user, especially
 * if the field is required but there is no current validation error.
 */
const HelperText = styled.p`
  margin-top: 4px;
  font-size: ${TYPOGRAPHY.fontSize.xs}px;
  color: #6b7280; /* A neutral gray for subtle text */
  line-height: 1.25;
`;

/**
 * InputProps
 * -----------------------------------------------------------------------------------------
 * Describes the properties accepted by the Input component to ensure
 * type safety and clarity for consumers of this reusable input field.
 */
export interface InputProps {
  /**
   * The unique identifier for the input element, useful for linking labels
   * or error messages with aria-describedby attributes.
   */
  id?: string;

  /**
   * The HTML form name for this input, used for referencing in form submissions
   * and hooking into certain validation utilities.
   */
  name?: string;

  /**
   * The current string value of the input. This affects real-time validation logic
   * for required fields.
   */
  value?: string;

  /**
   * The HTML input type (e.g., text, email, password). Default is 'text'.
   */
  type?: string;

  /**
   * Placeholder text displayed within the input when empty.
   */
  placeholder?: string;

  /**
   * Indicates whether this field must be completed. If true, real-time validation
   * checks will treat an empty field as invalid.
   */
  required?: boolean;

  /**
   * An error string that is externally controlled. If provided, it overrides any
   * internally computed validation message, allowing parent components to fully
   * manage error states.
   */
  error?: string;

  /**
   * A change handler invoked whenever the user modifies the input value.
   * Receives the standard React ChangeEvent.
   */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;

  /**
   * A blur handler invoked when the input loses focus. Useful for finalizing
   * validation states or cleaning up focus indicators. Receives the standard
   * React FocusEvent.
   */
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;

  /**
   * The aria-label attribute provides a textual description for screen readers
   * where a visible label is not otherwise available.
   */
  'aria-label'?: string;

  /**
   * The aria-describedby attribute allows the input to reference one or more
   * elements containing descriptive text, such as error messages or instructions.
   */
  'aria-describedby'?: string;
}

/**
 * Input
 * -----------------------------------------------------------------------------------------
 * A reusable input component with enterprise-grade accessibility (WCAG 2.1 AA), real-time
 * validation support, and consistent styling governed by TaskStream AI's design tokens.
 *
 * Features Implemented:
 *   1) Real-time validation using validateRequired if 'required' is true, with a debounced
 *      approach to minimize frequency of checks.
 *   2) Flexible error handling: externally controlled error messages override internal logic.
 *   3) Full ARIA attribute support for screen readers, ensuring robust accessibility compliance.
 *   4) Visual feedback for focus and error states via styled input and error message display.
 *
 * Steps Per JSON Spec:
 *   1) Initializes input ref and validation state.
 *   2) Sets up debounced validation after user stops typing (300ms).
 *   3) Implements real-time validation with user-friendly error feedback.
 *   4) Applies ARIA attributes for accessible naming and description.
 *   5) Handles focus and blur events, finalizing validation on blur.
 *   6) Manages error state and visual feedback thoroughly.
 *   7) Applies theme-based styling (typography, color tokens, transitions).
 *   8) Renders input with an error message container if present.
 *   9) Includes helper text for required fields when no error is present.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      name,
      value = '',
      type = 'text',
      placeholder,
      required = false,
      error: errorProp,
      onChange,
      onBlur,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
    },
    ref
  ) => {
    /**
     * Local state for storing internal validation errors. This can be overridden
     * by any externally provided error string from the parent component.
     */
    const [localError, setLocalError] = useState<string>('');
    /**
     * localValue helps track real-time changes before calling onChange,
     * enabling us to run debounced validation logic in the background.
     */
    const [localValue, setLocalValue] = useState<string>(value);

    /**
     * Using a ref to manage the input element for potential direct DOM access.
     * This is especially useful when the parent uses a forwardRef approach.
     */
    const inputRef = useRef<HTMLInputElement>(null);

    /**
     * The user may pass their own ref. We unify the internal ref with
     * the external ref using useImperativeHandle so parents can still
     * manipulate the <input>.
     */
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    /**
     * debounceTimer stores a reference to the current setTimeout, to be cleared
     * whenever the user types again before the time is up, thereby resetting
     * the delay for real-time validation.
     */
    const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
      null
    );

    /**
     * Effect: keep localValue in sync with the incoming prop value,
     * in case the parent updates value externally.
     */
    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    /**
     * Effect: keep localError loosely in sync with errorProp
     * so that a parent's externally controlled error overrides
     * internal validation state. If errorProp changes to a non-empty
     * string, we display that instead of localError.
     */
    useEffect(() => {
      if (errorProp) {
        setLocalError(errorProp);
      } else {
        // If the external error is cleared,
        // revert to our internally computed error (if any).
        setLocalError((prev) => (prev && prev === errorProp ? '' : prev));
      }
    }, [errorProp]);

    /**
     * Cleanup function to clear any pending timer on unmount,
     * preventing memory leaks or orphaned validation calls.
     */
    useEffect(() => {
      return () => {
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
      };
    }, [debounceTimer]);

    /**
     * validateField
     * ----------------------------------------------------------------------------
     * Conducts a required field check if `required === true`.
     * If missing, sets localError to a default message.
     * Otherwise clears the localError. This is a simplified real-time approach.
     */
    const validateField = (currentValue: string) => {
      if (!required) {
        // If the field is not required, simply clear localError unless external override.
        if (!errorProp) {
          setLocalError('');
        }
        return;
      }
      // Apply the validateRequired function
      const { valid } = validateRequired(
        { [name || 'field']: currentValue },
        [name || 'field']
      );
      if (!valid) {
        setLocalError('This field is required.');
      } else if (!errorProp) {
        // Only clear localError if there's no externally controlled error
        setLocalError('');
      }
    };

    /**
     * handleChange
     * ----------------------------------------------------------------------------
     * Triggered whenever the input value changes. This function:
     *   1) Clears any existing debounceTimer.
     *   2) Saves the new value to localValue.
     *   3) Schedules validation after DEBOUNCE_DELAY ms.
     *   4) Invokes any external onChange prop.
     */
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      const newValue = e.target.value;
      setLocalValue(newValue);

      const timer = setTimeout(() => {
        validateField(newValue);
      }, DEBOUNCE_DELAY);

      setDebounceTimer(timer);

      if (onChange) {
        onChange(e);
      }
    };

    /**
     * handleBlur
     * ----------------------------------------------------------------------------
     * Triggered when the input loses focus. Immediately validates
     * if the field is required, ensuring final check on blur.
     * Also calls the parent onBlur if provided.
     */
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (required) {
        validateField(e.target.value);
      }
      if (onBlur) {
        onBlur(e);
      }
    };

    /**
     * finalError
     * ----------------------------------------------------------------------------
     * If an external error is currently in effect, it has priority.
     * Otherwise we show the internal localError. This ensures
     * externally managed error states override local validation.
     */
    const finalError = errorProp || localError;

    /**
     * errorId
     * ----------------------------------------------------------------------------
     * An ID to link the error or helper text with the input via aria-describedby,
     * improving accessibility compliance for screen readers.
     */
    const errorId = id ? `${id}__error` : undefined;

    /**
     * describedBy
     * ----------------------------------------------------------------------------
     * Combines the user-provided aria-describedby with the errorId
     * so screen readers announce both the user-defined description
     * plus any generated error message when applicable.
     */
    const describedBy = [
      ariaDescribedBy,
      finalError ? errorId : undefined,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <StyledInput
          id={id}
          name={name}
          type={type}
          value={localValue}
          placeholder={placeholder}
          hasError={Boolean(finalError)}
          aria-label={ariaLabel}
          aria-describedby={describedBy || undefined}
          aria-invalid={Boolean(finalError)}
          ref={inputRef}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        {finalError ? (
          /**
           * Show the error message if finalError is active,
           * ensuring screen readers have access via role="alert"
           * and the errorId linking.
           */
          <ErrorMessage id={errorId} role="alert" aria-live="assertive">
            {finalError}
          </ErrorMessage>
        ) : (
          /**
           * If there's no error but the field is required,
           * display a small helper text for user clarity.
           */
          required && (
            <HelperText id={errorId} aria-live="polite">
              This field is required.
            </HelperText>
          )
        )}
      </div>
    );
  }
);