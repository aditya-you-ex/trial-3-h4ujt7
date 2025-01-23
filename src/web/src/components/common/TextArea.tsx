//
// Import Statements
// ----------------------------------------------------------------------------
// react version ^18.0.0
import React, {
  FC,
  useState,
  useRef,
  useEffect,
  ChangeEvent,
  FocusEvent,
  useCallback,
} from 'react';
// classnames version ^2.3.2
import classNames from 'classnames';
// use-debounce version ^9.0.0
import { useDebounce } from 'use-debounce';

// Internal Types
import { LoadingState } from '../../types/common.types';

//
// Interface: TextAreaProps
// ----------------------------------------------------------------------------
// Defines an enterprise-grade text area component with robust properties
// for accessibility, validation, loading states, and theming.
//
export interface TextAreaProps {
  /**
   * A unique identifier for the text area element.
   * Used for binding the label to the field and for test queries.
   */
  id: string;

  /**
   * The name attribute, typically used in form submissions.
   */
  name: string;

  /**
   * The current text value of the text area.
   * This component is designed as a controlled component; pass the new value
   * in this prop whenever onChange is called.
   */
  value: string;

  /**
   * Placeholder text displayed when the text area is empty.
   */
  placeholder: string;

  /**
   * An optional text label that describes the purpose of the field.
   * When provided, a <label> element will be rendered for better accessibility.
   */
  label: string;

  /**
   * Additional class names to be applied to the root container allowing
   * custom styling or overrides.
   */
  className: string;

  /**
   * Error message to display in an error state. If present, the text area
   * and associated text will visually reflect the error.
   */
  error: string;

  /**
   * Supplementary text displayed below the text area to support user input.
   * Can display instructions, hints, or contextual messages.
   */
  helperText: string;

  /**
   * When true, the text area is disabled, preventing user interaction.
   */
  disabled: boolean;

  /**
   * When true, indicates that user input is required for form submission.
   */
  required: boolean;

  /**
   * When true, automatically focuses on the text area when it first renders.
   */
  autoFocus: boolean;

  /**
   * When true, dynamically adjusts the text area height based on its content.
   * Prevents the component from displaying scrollbars for multi-line text.
   */
  autoGrow: boolean;

  /**
   * When true, displays a character count below the text area.
   * Typically used alongside maxLength to indicate remaining count.
   */
  showCharacterCount: boolean;

  /**
   * Configures the CSS resize property for the text area. For example:
   * "none", "vertical", "horizontal", or "both". Defaults to "vertical".
   */
  resize: string;

  /**
   * Enables native browser spellchecking functionality for the text area.
   */
  spellCheck: boolean;

  /**
   * The initial number of text area rows visible before scrolling or autoGrow.
   */
  rows: number;

  /**
   * Maximum number of characters allowed in the text area.
   * If set, input is prevented or trimmed once the limit is reached.
   */
  maxLength: number;

  /**
   * Maximum allowed height (in pixels) when autoGrow is enabled.
   * Prevents excessively tall expansions.
   */
  maxHeight: number;

  /**
   * Represents the loading or processing state of the text area,
   * possibly controlling UI feedback or disabling behavior.
   */
  loadingState: LoadingState;

  /**
   * A data-testid attribute for testing frameworks to identify the component.
   */
  'data-testid': string;

  /**
   * A record container for ARIA labels to enhance screen reader context.
   * For example, aria-labels={{ labelledby: 'anotherElementId' }}.
   */
  'aria-labels': Record<string, string>;

  /**
   * Callback fired whenever the text area value changes.
   * Receives the React change event for further processing.
   */
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;

  /**
   * Callback fired on blur (loss of focus).
   */
  onBlur: () => void;

  /**
   * Callback fired on focus (gain of focus).
   */
  onFocus: () => void;
}

//
// Component: TextArea
// ----------------------------------------------------------------------------
// A reusable, enterprise-grade text area component featuring:
//   - Debounced change handling
//   - Optional auto-growing behavior
//   - Character count display
//   - Accessibility (ARIA features, error states, labeling)
//   - Loading states and robust validations
//
export const TextArea: FC<TextAreaProps> = ({
  id,
  name,
  value,
  placeholder,
  label,
  className,
  error,
  helperText,
  disabled,
  required,
  autoFocus,
  autoGrow,
  showCharacterCount,
  resize,
  spellCheck,
  rows,
  maxLength,
  maxHeight,
  loadingState,
  'data-testid': dataTestId,
  'aria-labels': ariaLabels,
  onChange,
  onBlur,
  onFocus,
}) => {
  /**
   * Local state for managing the displayed text. This ensures immediate
   * user feedback while controlling the value in tandem with the debounced
   * callback and parent updates.
   */
  const [localValue, setLocalValue] = useState<string>(value);

  /**
   * Local state for tracking the character count, displayed when
   * showCharacterCount is true and a maxLength is provided.
   */
  const [charCount, setCharCount] = useState<number>(value.length);

  /**
   * Reference to the <textarea> element to measure content size
   * and adjust height if autoGrow is enabled.
   */
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  /**
   * Debounced value derived from user input. When this debounced value changes,
   * the parent component's onChange callback is invoked, avoiding overly frequent
   * updates in real-time typing scenarios.
   */
  const [debouncedValue] = useDebounce(localValue, 300);

  /**
   * Effect: Synchronize the parent onChange callback with the debounced value.
   * Once the user stops typing and the debounce interval completes,
   * we invoke onChange so that the parent can receive the final text.
   */
  useEffect(() => {
    // Construct a synthetic event to replicate the onChange signature.
    const syntheticEvent = {
      target: { value: debouncedValue },
    } as unknown as React.ChangeEvent<HTMLTextAreaElement>;

    onChange(syntheticEvent);
  }, [debouncedValue, onChange]);

  /**
   * Effect: Whenever the `value` prop changes externally (e.g., reset form),
   * ensure the localValue and charCount reflect that.
   */
  useEffect(() => {
    setLocalValue(value);
    setCharCount(value.length);
  }, [value]);

  /**
   * Effect: If autoGrow is enabled, adjust the text area height
   * whenever the local value changes.
   */
  useEffect(() => {
    if (autoGrow && textAreaRef.current) {
      adjustHeight(textAreaRef.current);
    }
  }, [autoGrow, localValue]);

  /**
   * handleChange: React change event handler for the text area.
   * This function:
   *  1) Prevents input if maxLength is reached (or trims the text).
   *  2) Updates the local value state for immediate user feedback.
   *  3) Updates the character count if showCharacterCount is enabled.
   *  4) Adjusts the text area height if autoGrow is enabled.
   */
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = event.target.value;
      let finalValue = newValue;

      // 1) Prevent or trim input if maxLength is reached.
      if (maxLength > 0 && finalValue.length > maxLength) {
        finalValue = finalValue.substring(0, maxLength);
      }

      // 2) Update the local value state.
      setLocalValue(finalValue);

      // 3) Update character count if relevant.
      if (showCharacterCount && maxLength > 0) {
        setCharCount(finalValue.length);
      }

      // 4) If autoGrow is enabled, adjust size in real time.
      if (autoGrow && textAreaRef.current) {
        adjustHeight(textAreaRef.current);
      }
    },
    [maxLength, showCharacterCount, autoGrow]
  );

  /**
   * adjustHeight: Dynamically resizes the text area element to fit its content.
   *  1) Resets height to 'auto' to measure the natural scrollHeight.
   *  2) Calculates the element's scrollHeight.
   *  3) Sets the new height while honoring any maxHeight prop.
   *  4) Ensures the final height does not exceed maxHeight if specified.
   */
  const adjustHeight = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    const newHeight = element.scrollHeight;
    element.style.height = `${newHeight}px`;

    if (maxHeight > 0) {
      element.style.maxHeight = `${maxHeight}px`;
    }
  };

  /**
   * handleFocus: Forwards the focus event to the onFocus callback.
   * Ensures a consistent way to track focus transitions.
   */
  const handleFocus = (event: FocusEvent<HTMLTextAreaElement>) => {
    onFocus?.();
    if (autoGrow && textAreaRef.current) {
      adjustHeight(textAreaRef.current);
    }
  };

  /**
   * handleBlur: Forwards the blur event to the onBlur callback.
   * Typically used for validating or finalizing input.
   */
  const handleBlur = (event: FocusEvent<HTMLTextAreaElement>) => {
    onBlur?.();
  };

  /**
   * Determine if the component should be disabled.
   * If loadingState is 'loading', we optionally disable the field
   * to prevent user interactions during asynchronous operations.
   */
  const isDisabled = disabled || loadingState === 'loading';

  /**
   * Build a set of ARIA-related attributes from the aria-labels record
   * to support screen reader context. Each property in aria-labels can be
   * mapped to an appropriate aria-* attribute if relevant.
   */
  const ariaAttributes: Record<string, string> = {};
  if (ariaLabels) {
    Object.keys(ariaLabels).forEach((key) => {
      // Example: if key is 'labelledby', we form 'aria-labelledby'
      ariaAttributes[`aria-${key.toLowerCase()}`] = ariaLabels[key];
    });
  }

  /**
   * Derive relevant classes for styling:
   *  - Root container class merges user-provided className
   *  - Error state classes
   *  - Loading or Disabled state classes
   *  - Resizable as specified by the `resize` prop
   */
  const textAreaClass = classNames(
    'ts-textarea', // hypothetical base class
    className,
    {
      'ts-textarea--error': !!error,
      'ts-textarea--disabled': isDisabled,
      'ts-textarea--loading': loadingState === 'loading',
    }
  );

  /**
   * Inline style to set the resize property if provided.
   * Some design systems prefer controlling this via CSS modules;
   * here we illustrate an inline approach for clarity.
   */
  const textAreaStyle = {
    resize: resize || 'vertical',
  } as React.CSSProperties;

  return (
    <div
      className={classNames('ts-textarea__container', {
        'ts-textarea__container--error': !!error,
      })}
    >
      {/* Label Element (if label text is provided) */}
      {label && (
        <label
          htmlFor={id}
          className="ts-textarea__label"
        >
          {label}
          {required && <span className="ts-textarea__required">*</span>}
        </label>
      )}

      {/* Text Area Element */}
      <textarea
        id={id}
        name={name}
        ref={textAreaRef}
        className={textAreaClass}
        style={textAreaStyle}
        placeholder={placeholder}
        value={localValue}
        disabled={isDisabled}
        required={required}
        autoFocus={autoFocus}
        spellCheck={spellCheck}
        rows={rows || 3}
        data-testid={dataTestId}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-invalid={!!error}
        aria-required={required}
        {...ariaAttributes}
      />

      {/* Render helper text or error text if present */}
      {(helperText || error) && (
        <div
          className={classNames('ts-textarea__helper-text', {
            'ts-textarea__helper-text--error': !!error,
          })}
          aria-live="polite"
        >
          {error || helperText}
        </div>
      )}

      {/* Display character count if desired */}
      {showCharacterCount && maxLength > 0 && (
        <div className="ts-textarea__char-count">
          {charCount}/{maxLength}
        </div>
      )}
    </div>
  );
};