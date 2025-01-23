/**
 * A reusable radio button component that adheres to the TaskStream AI design system.
 * This component implements WCAG 2.1 AA accessibility guidelines, ensuring proper
 * keyboard navigation, focus states, and ARIA labels. It also integrates fully
 * with the spacing, colors, and typography systems defined in theme.constants.
 */

import React from 'react'; // ^18.0.0
import styled from '@emotion/styled'; // ^11.11.0

// ---------------------------------------------------------------------------------
// Internal Imports
// ---------------------------------------------------------------------------------
// Importing theme constants for color and spacing tokens.
import { COLORS, SPACING } from '../../constants/theme.constants';

/**
 * Defines the interface for the Radio component's props. Each Radio instance
 * must have an id, a value, and an onChange handler to support controlled form behavior.
 * The 'checked' property determines whether the radio is currently selected, and
 * 'label' provides a descriptive text for screen readers and visible UI. Accessibility
 * is further enhanced with optional ariaLabel and disabled states.
 */
export interface RadioProps {
  /**
   * Unique identifier for the radio input, essential for accessibility and
   * label association via htmlFor.
   */
  id: string;

  /**
   * The current string value of the radio input, used in external form logic
   * whenever the Radio is selected.
   */
  value: string;

  /**
   * Indicates whether the radio button is currently checked, controlling
   * its selected visual and state behavior.
   */
  checked: boolean;

  /**
   * The onChange event handler for the radio input, passed down to facilitate
   * controlled component patterns in React forms.
   */
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;

  /**
   * Text label displayed alongside the radio button, also serving as an
   * accessible descriptor if aria-label is not provided.
   */
  label: string;

  /**
   * Signals whether the radio input is disabled, preventing user interaction
   * and reflecting a distinct visual style to communicate its inactive state.
   */
  disabled?: boolean;

  /**
   * Additional CSS class names, allowing consumers to tailor the style further
   * without breaking the component's core design system constraints.
   */
  className?: string;

  /**
   * Custom ARIA label for enhanced accessibility. If provided, it will be
   * applied to the <input> as an aria-label attribute, informing screen readers
   * of a descriptive text separate from the visible label.
   */
  ariaLabel?: string;
}

// ---------------------------------------------------------------------------------
// Theme Aliases
// ---------------------------------------------------------------------------------
// Mapping to the main and disabled areas of the COLORS object for concise usage below.
const primaryColor = COLORS.primary.main;
const secondaryColor = COLORS.secondary.main;
const disabledColor = COLORS.text.disabled;

// ---------------------------------------------------------------------------------
// Styled Component Definitions
// ---------------------------------------------------------------------------------

/**
 * RadioContainer:
 * Serves as the primary wrapper around the radio input and its label, ensuring
 * proper alignment, spacing, and a comfortable touch target. The hover effect
 * is disabled for a disabled radio.
 */
const RadioContainer = styled.div<{
  disabled?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  /* Gaps between the radio input and label utilize the design system's base unit times 2 */
  gap: ${SPACING.unit * 2}px;
  /* Minimum height to meet accessibility guidelines for touch targets */
  min-height: 44px;
  /* Ensure comfortable padding around the container */
  padding: ${SPACING.unit}px;
  /* Cursor style reflecting disabled vs. pointer interaction */
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  user-select: none;
  transition: opacity 0.2s ease-in-out;

  /* Hover effect is only applied if the radio is not disabled */
  &:hover {
    ${(props) => !props.disabled && 'opacity: 0.8;'}
  }

  /* Adapt to mobile by slightly increasing the container height */
  @media (max-width: 768px) {
    min-height: 48px;
  }
`;

/**
 * RadioInput:
 * A custom-styled radio input that overrides the native appearance to create a
 * circular UI element. Checked states use the primary color, while unchecked states
 * default to the secondary color. Additionally, a pseudo-element visually indicates
 * the selection dot in the center when checked.
 */
const RadioInput = styled.input<{
  isChecked?: boolean;
}>`
  /* Remove default browser styles */
  appearance: none;

  /* The base circular shape for our custom radio */
  width: 20px;
  height: 20px;
  border: 2px solid ${(props) => (props.isChecked ? primaryColor : secondaryColor)};
  border-radius: 50%;
  background-color: ${(props) => (props.isChecked ? primaryColor : 'transparent')};
  transition: all 0.2s ease-in-out;
  position: relative;

  /* The cursor should reflect the disabled state or remain pointer */
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};

  /*
   * The pseudo-element below forms the visible dot in the middle of the circle
   * when the radio is checked. Opacity transitions for smooth check/uncheck animations.
   */
  &:after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: #ffffff;
    opacity: ${(props) => (props.isChecked ? 1 : 0)};
    transition: opacity 0.2s ease-in-out;
  }

  /*
   * Highlight the radio outline when focused using keyboard navigation,
   * reinforcing accessibility compliance and user awareness.
   */
  &:focus-visible {
    outline: 2px solid ${primaryColor};
    outline-offset: 2px;
  }

  /* Reflects the visual style for disabled radios */
  &:disabled {
    opacity: 0.5;
    border-color: ${disabledColor};
  }

  /*
   * On hover-capable devices, when the radio is not disabled, we accentuate
   * the border color as a subtle interactive feedback.
   */
  @media (hover: hover) {
    &:hover:not(:disabled) {
      border-color: ${primaryColor};
    }
  }
`;

/**
 * RadioLabel:
 * Displays the label text for the radio. This styled component adjusts typography,
 * color, and overflow behavior to ensure readability and clarity, even under
 * constrained widths.
 */
const RadioLabel = styled.label<{
  disabled?: boolean;
}>`
  /* Use the design system's primary font family at a standard small text size */
  font-family: var(--font-family-primary);
  font-size: 14px;
  line-height: 1.4;

  /* If disabled, fade out text color to visually convey unavailability */
  color: ${(props) => (props.disabled ? disabledColor : 'inherit')};

  /* Reflect the corresponding mouse cursor style */
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};

  /* Handle possible truncation gracefully if the label is too long for its container */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
`;

/**
 * The primary Radio component, uniting the styled container, input, and label
 * into a fully accessible, design-consistent radio element. This component
 * can be used independently or within a group of radios, leveraging the
 * onChange and checked properties for controlled form usage.
 */
export const Radio: React.FC<RadioProps> = ({
  id,
  value,
  checked,
  onChange,
  label,
  disabled,
  className,
  ariaLabel,
}) => {
  return (
    <RadioContainer disabled={disabled} className={className}>
      {/* The custom styled radio input, bound to the provided props */}
      <RadioInput
        type="radio"
        id={id}
        name={id}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-label={ariaLabel || label}
        isChecked={checked}
      />
      {/* The label serves as an interactive text association for the radio input */}
      <RadioLabel htmlFor={id} disabled={disabled}>
        {label}
      </RadioLabel>
    </RadioContainer>
  );
};