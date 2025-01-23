/** 
 * A reusable, accessible, and customizable checkbox component 
 * that follows the TaskStream AI design system specifications.
 * Implements WCAG 2.1 AA compliance and provides comprehensive
 * form integration capabilities.
 */

import React, { useCallback, useState } from 'react'; // react ^18.0.0
import styled from '@emotion/styled'; // @emotion/styled ^11.11.0

// -------------------------------------------------------------------------------------
// Internal Imports
// -------------------------------------------------------------------------------------
import { COLORS } from '../../constants/theme.constants';

// -------------------------------------------------------------------------------------
// Interface: CheckboxProps
// Comprehensive props interface for the Checkbox component
// -------------------------------------------------------------------------------------
export interface CheckboxProps {
  /**
   * Controlled checked state to determine whether the checkbox is checked
   */
  checked: boolean;

  /**
   * Callback invoked when the checkbox state changes,
   * provides the new boolean value
   */
  onChange: (checked: boolean) => void;

  /**
   * Accessible label text to be displayed next to the checkbox
   */
  label: string;

  /**
   * Determines if the checkbox should be disabled
   */
  disabled?: boolean;

  /**
   * Indicates an error state, altering styling and helper text presentation
   */
  error?: boolean;

  /**
   * Optional helper or error text displayed beneath the checkbox
   */
  helperText?: string;

  /**
   * Custom CSS class for external styling or overrides
   */
  className?: string;

  /**
   * Unique identifier for the checkbox element
   */
  id?: string;

  /**
   * Name of the checkbox field, useful for form submissions
   */
  name?: string;

  /**
   * Event handler for blur events, supporting form integrations
   */
  onBlur?: () => void;

  /**
   * Custom ARIA label if different from the visible label text
   */
  ariaLabel?: string;
}

// -------------------------------------------------------------------------------------
// Styled Components
// -------------------------------------------------------------------------------------

/**
 * CheckboxContainer
 * Styled container housing both the checkbox input and the label,
 * providing appropriate spacing, pointer behavior, and visual states.
 */
const CheckboxContainer = styled.div<{
  disabled?: boolean;
}>`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  user-select: none;
  opacity: ${(props) => (props.disabled ? 0.5 : 1)};
  transition: opacity 0.2s ease;
`;

/**
 * CheckboxInput
 * Custom checkbox input with appearance: none, styled for
 * various visual states like focus, hover, checked, and error.
 */
const CheckboxInput = styled.input<{
  error?: boolean;
  checked?: boolean;
  disabled?: boolean;
}>`
  appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid
    ${(props) => (props.error ? COLORS.error.main : COLORS.primary.main)};
  border-radius: 4px;
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  transition: all 0.2s ease;
  background-color: ${(props) =>
    props.checked ? COLORS.primary.main : 'transparent'};
  outline: none;

  &:focus-visible {
    box-shadow: 0 0 0 2px ${COLORS.primary.main}33;
  }

  &:hover:not(:disabled) {
    border-color: ${COLORS.primary.main}CC;
  }
`;

/**
 * Label
 * Styled label text with adjustable color states,
 * including error, disabled, and regular display.
 */
const Label = styled.span<{
  error?: boolean;
  disabled?: boolean;
}>`
  font-size: 14px;
  color: ${(props) => (props.error ? COLORS.error.main : 'inherit')};
  opacity: ${(props) => (props.disabled ? 0.5 : 1)};
  transition: color 0.2s ease;
`;

/**
 * HelperText
 * Styled helper or error text displayed beneath
 * the checkbox for additional context.
 */
const HelperText = styled.span<{
  error?: boolean;
}>`
  font-size: 12px;
  color: ${(props) => (props.error ? COLORS.error.main : 'inherit')};
  margin-top: 4px;
  transition: color 0.2s ease;
`;

// -------------------------------------------------------------------------------------
// Checkbox Component
// Fully accessible and customizable checkbox component. Implements
// event handling, focus management, and form integration callbacks.
// -------------------------------------------------------------------------------------
export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  disabled,
  error,
  helperText,
  className,
  id,
  name,
  onBlur,
  ariaLabel,
}) => {
  /**
   * Local state to track focus for potential visual states.
   * This is primarily a placeholder demonstrating focus state
   * management if extended styling or ARIA attributes are needed.
   */
  const [isFocused, setIsFocused] = useState<boolean>(false);

  /**
   * handleFocus
   * Manages focus state, setting isFocused to true.
   */
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  /**
   * handleBlur
   * Manages focus state, resetting isFocused to false and
   * invoking the onBlur prop if provided for form integrations.
   */
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    if (onBlur) {
      onBlur();
    }
  }, [onBlur]);

  /**
   * handleChange
   * Manages the change event for the checkbox. Follows these steps:
   * 1. Prevent default event behavior
   * 2. Extract the checked value from the event target
   * 3. Invoke the onChange callback with the new checked value
   * 4. Call onBlur prop if provided for form integration
   * 5. Handle focus state management (demonstrated separately)
   */
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      event.preventDefault();
      const newChecked = event.target.checked;
      onChange(newChecked);
      if (onBlur) {
        onBlur();
      }
    },
    [onChange, onBlur]
  );

  return (
    <div className={className} style={{ display: 'inline-flex', flexDirection: 'column' }}>
      <CheckboxContainer disabled={disabled}>
        <CheckboxInput
          type="checkbox"
          id={id}
          name={name}
          checked={checked}
          disabled={disabled}
          error={error}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          aria-label={ariaLabel || label}
          aria-checked={checked}
          aria-invalid={error || false}
          data-focus={isFocused}
        />
        <Label error={error} disabled={disabled}>
          {label}
        </Label>
      </CheckboxContainer>
      {helperText && (
        <HelperText error={error}>{helperText}</HelperText>
      )}
    </div>
  );
};