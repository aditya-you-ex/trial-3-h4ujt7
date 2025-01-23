import React, {
  // React version ^18.0.0
  useState,
  useRef,
  useEffect,
  KeyboardEvent,
  MouseEvent,
  useCallback,
  ChangeEvent,
  FC,
} from 'react';

// classnames version ^2.3.2
import classNames from 'classnames';

// Internal imports
import { LoadingState } from '../../types/common.types';

/**
 * Interface representing a single dropdown option.
 * This structure contains the visible label and the internal value.
 * Additional fields can be added as necessary to support the
 * design system or any metadata requirements.
 */
export interface DropdownOption {
  /**
   * The user-facing label displayed for this option.
   */
  label: string;

  /**
   * The internal or stored value for this option.
   * Typically a unique identifier, slug, or string constant.
   */
  value: string;

  /**
   * Arbitrary additional metadata or data needed for advanced
   * usage scenarios. Not displayed directly.
   */
  [key: string]: unknown;
}

/**
 * Type definition for custom filter function to determine if
 * a given option should be displayed, given the current
 * user input (search text) and any custom logic.
 */
export type FilterOptionFn = (option: DropdownOption, inputValue: string) => boolean;

/**
 * DropdownProps interface delineates the complete set of properties
 * supported by the advanced dropdown component. It includes single
 * and multi-select capabilities, search functionality, grouping,
 * virtualization, event callbacks, accessibility settings, and more.
 */
export interface DropdownProps {
  /**
   * The list of available dropdown options, each with a label and value.
   */
  options: DropdownOption[];

  /**
   * The currently selected value(s). If isMulti is true,
   * this may be an array of multiple selected items.
   */
  value: string | string[];

  /**
   * A callback function triggered whenever selection changes.
   * Receives the updated value or list of values.
   */
  onChange: (updatedValue: string | string[]) => void;

  /**
   * Placeholder text used when no selection is made or
   * when the dropdown is empty.
   */
  placeholder: string;

  /**
   * Controls whether multiple selections are allowed.
   * When true, the value prop and onChange arguments
   * will be arrays of strings.
   */
  isMulti: boolean;

  /**
   * Enables or disables internal search. When true,
   * a text input is used to filter displayed options.
   */
  isSearchable: boolean;

  /**
   * Disables the dropdown when set to true. The user
   * cannot open or change the selection.
   */
  isDisabled: boolean;

  /**
   * Displays a loading indicator when true, indicating
   * that content or options are currently being fetched.
   */
  isLoading: boolean;

  /**
   * The maximum height (in pixels) for the dropdown
   * options list. Used to constrain the dropdown size
   * to maintain consistent layout in the UI.
   */
  maxHeight: number;

  /**
   * A custom filter function. When provided, the dropdown
   * calls this function for each option to determine if
   * the option should be displayed for the current input.
   */
  filterOption?: FilterOptionFn;

  /**
   * A key name indicating an option field by which
   * the options should be grouped. When provided,
   * the dropdown renders grouped sections.
   */
  groupBy?: string;

  /**
   * Enables windowing or virtualization for large
   * option datasets, improving performance when dealing
   * with thousands of options.
   */
  virtualized: boolean;

  /**
   * A callback triggered whenever the search input
   * text changes.
   */
  onInputChange?: (inputValue: string) => void;

  /**
   * A callback triggered just before the dropdown menu
   * is opened.
   */
  onMenuOpen?: () => void;

  /**
   * A callback triggered just after the dropdown menu
   * is closed.
   */
  onMenuClose?: () => void;

  /**
   * An optional custom className string for adding additional
   * or override styles to the dropdown container.
   */
  className?: string;
}

/**
 * Dropdown is a highly accessible, feature-rich component
 * for both single and multi-select use cases. It adheres
 * to WCAG 2.1 AA standards by providing keyboard navigation,
 * ARIA attributes, and screen reader support.
 */
export const Dropdown: FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder,
  isMulti,
  isSearchable,
  isDisabled,
  isLoading,
  maxHeight,
  filterOption,
  groupBy,
  virtualized,
  onInputChange,
  onMenuOpen,
  onMenuClose,
  className,
}) => {
  /**
   * Local state to handle whether the dropdown menu is open or closed.
   * The default is false to keep the menu closed initially.
   */
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  /**
   * Local state to handle highlighted or focused item index for
   * structured keyboard navigation. -1 means no item is highlighted.
   */
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  /**
   * Local state to capture the current input text for the search box,
   * aiding in filter logic, type-ahead, and dynamic searching.
   */
  const [searchInput, setSearchInput] = useState<string>('');

  /**
   * Use a ref to keep track of the root dropdown container
   * for handling click outside detection.
   */
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  /**
   * A convenience function that checks whether a given
   * option is selected, supporting both single and multi-select.
   */
  const isOptionSelected = useCallback(
    (optionValue: string): boolean => {
      if (isMulti && Array.isArray(value)) {
        return value.includes(optionValue);
      }
      return value === optionValue;
    },
    [value, isMulti]
  );

  /**
   * Toggles the menu open or closed, while also triggering
   * optional callback events for menu open and close.
   */
  const toggleMenu = useCallback((): void => {
    if (isDisabled) return;
    if (!menuOpen && onMenuOpen) {
      onMenuOpen();
    }
    if (menuOpen && onMenuClose) {
      onMenuClose();
    }
    setMenuOpen((prev) => !prev);
  }, [isDisabled, menuOpen, onMenuClose, onMenuOpen]);

  /**
   * Closes the menu programmatically, resetting highlight
   * and optionally calling onMenuClose if provided.
   */
  const closeMenu = useCallback((): void => {
    setMenuOpen(false);
    setHighlightedIndex(-1);
    if (onMenuClose) {
      onMenuClose();
    }
  }, [onMenuClose]);

  /**
   * Handler for changing the search input text. Invokes
   * user-provided onInputChange callback if necessary.
   */
  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      const newValue = e.target.value;
      setSearchInput(newValue);
      if (onInputChange) {
        onInputChange(newValue);
      }
    },
    [onInputChange]
  );

  /**
   * Function: handleClickOutside
   * -------------------------------------------------------------------------
   * Manages clicks outside the dropdown component to close the menu,
   * remove focus from the dropdown trigger, and reset active states.
   */
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    },
    [closeMenu]
  );

  /**
   * Function: handleOptionSelect
   * -------------------------------------------------------------------------
   * Selects or deselects the given option based on single or multi-select
   * mode, then notifies the parent via onChange callback. For multi-select,
   * toggles the presence of the selected value in the array. For single,
   * sets the value directly and closes the menu.
   */
  const handleOptionSelect = useCallback(
    (option: DropdownOption) => {
      if (isMulti) {
        const currentValues = Array.isArray(value) ? [...value] : [];
        const valueIndex = currentValues.indexOf(option.value);
        if (valueIndex >= 0) {
          currentValues.splice(valueIndex, 1);
        } else {
          currentValues.push(option.value);
        }
        onChange(currentValues);
      } else {
        onChange(option.value);
        closeMenu();
      }
    },
    [value, isMulti, onChange, closeMenu]
  );

  /**
   * Function: handleKeyDown
   * -------------------------------------------------------------------------
   * Handles comprehensive keyboard navigation to maintain
   * full accessibility support:
   * 1) ArrowUp / ArrowDown for item navigation
   * 2) Home / End for first / last item navigation
   * 3) Enter / Space for item selection
   * 4) Escape to close dropdown
   * 5) Tab for focus management
   * 6) Character keys for type-ahead search
   * 7) aria-activedescendant updates
   * 8) Prevent default behavior where appropriate
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!menuOpen) {
        // Open menu on certain keys only if disabled is false
        if (!isDisabled && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          toggleMenu();
        }
        return;
      }

      const displayedOptions = getDisplayedOptions();
      // Bail early if no displayed options
      if (displayedOptions.length === 0) {
        if (event.key === 'Escape' || event.key === 'Tab') {
          closeMenu();
        }
        return;
      }

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault();
          setHighlightedIndex((prev) => {
            const nextIndex = prev + 1;
            return nextIndex >= displayedOptions.length ? 0 : nextIndex;
          });
          break;
        }
        case 'ArrowUp': {
          event.preventDefault();
          setHighlightedIndex((prev) => {
            const nextIndex = prev - 1;
            return nextIndex < 0 ? displayedOptions.length - 1 : nextIndex;
          });
          break;
        }
        case 'Home': {
          event.preventDefault();
          setHighlightedIndex(0);
          break;
        }
        case 'End': {
          event.preventDefault();
          setHighlightedIndex(displayedOptions.length - 1);
          break;
        }
        case 'Enter':
        case ' ': {
          event.preventDefault();
          const currentOption = displayedOptions[highlightedIndex];
          if (currentOption) {
            handleOptionSelect(currentOption);
          }
          break;
        }
        case 'Escape': {
          event.preventDefault();
          closeMenu();
          break;
        }
        case 'Tab': {
          // Let tab propagate but close the menu
          closeMenu();
          break;
        }
        default:
          // For type-ahead or custom logic:
          if (event.key.length === 1 && isSearchable) {
            setSearchInput((prev) => `${prev}${event.key.toLowerCase()}`);
            if (onInputChange) {
              onInputChange(`${searchInput}${event.key}`);
            }
          }
          break;
      }
    },
    [
      menuOpen,
      isDisabled,
      highlightedIndex,
      getDisplayedOptions,
      handleOptionSelect,
      closeMenu,
      toggleMenu,
      onInputChange,
      isSearchable,
      searchInput,
    ]
  );

  /**
   * A memoized function that returns the filtered list of
   * dropdown options, taking into account user-defined filter logic,
   * grouping, and search input (if isSearchable is true).
   */
  const getDisplayedOptions = useCallback((): DropdownOption[] => {
    let filtered = options;

    // Filter by user-defined filterOption
    if (filterOption && searchInput) {
      filtered = filtered.filter((opt) => filterOption(opt, searchInput));
    } else if (isSearchable && searchInput) {
      // Default filtering if a custom filter is not provided
      const text = searchInput.toLowerCase();
      filtered = filtered.filter((opt) =>
        opt.label.toLowerCase().includes(text)
      );
    }

    // Optionally group options
    // This does not flatten them yet, but returns raw ungrouped if
    // groupBy is not defined. In real usage, you'd structure the
    // grouped rendering in the JSX with separate <optgroup> or sections.
    if (groupBy) {
      return filtered.sort((a, b) => {
        const groupA = (a[groupBy] || '') as string;
        const groupB = (b[groupBy] || '') as string;
        return groupA.localeCompare(groupB);
      });
    }

    return filtered;
  }, [options, filterOption, searchInput, isSearchable, groupBy]);

  /**
   * Attach a global click event listener to detect clicks
   * outside the dropdown, ensuring the menu closes properly
   * when focus is lost.
   */
  useEffect(() => {
    document.addEventListener('click', handleClickOutside as unknown as EventListener);
    return () => {
      document.removeEventListener('click', handleClickOutside as unknown as EventListener);
    };
  }, [handleClickOutside]);

  /**
   * If the menu is closed, clear the search input and highlight state.
   */
  useEffect(() => {
    if (!menuOpen) {
      setSearchInput('');
      setHighlightedIndex(-1);
    }
  }, [menuOpen]);

  /**
   * A dynamic ARIA ID for usage with aria-activedescendant
   * to indicate the currently highlighted item.
   */
  const activeDescendantId = menuOpen && highlightedIndex >= 0
    ? `dropdown-item-${highlightedIndex}`
    : undefined;

  /**
   * Renders the full list of options, including optional grouping
   * or virtualization. For brevity, the virtualization is not deeply
   * implemented here but can be expanded (e.g., react-window, react-virtual).
   */
  const renderOptionsList = (): JSX.Element => {
    const displayedOptions = getDisplayedOptions();

    // Basic virtualization placeholder:
    // In a real enterprise scenario, you would integrate a library
    // like react-window or react-virtualized to only render visible rows.
    const sliceOrAll = virtualized
      ? displayedOptions // placeholder, apply windowing slice logic here
      : displayedOptions;

    // Grouping logic demonstration:
    if (groupBy) {
      const grouped: Record<string, DropdownOption[]> = {};
      sliceOrAll.forEach((opt) => {
        const groupValue = (opt[groupBy] || '') as string;
        if (!grouped[groupValue]) {
          grouped[groupValue] = [];
        }
        grouped[groupValue].push(opt);
      });

      return (
        <>
          {Object.keys(grouped).map((groupName) => (
            <div className="dropdown__group" key={`group-${groupName}`}>
              <div className="dropdown__group-label" aria-hidden="true">
                {groupName}
              </div>
              {grouped[groupName].map((option, idx) => {
                const indexInFull = displayedOptions.indexOf(option);
                const isHighlighted = indexInFull === highlightedIndex;
                const isSelected = isOptionSelected(option.value);
                return (
                  <div
                    id={`dropdown-item-${indexInFull}`}
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    className={classNames('dropdown__option', {
                      'dropdown__option--highlighted': isHighlighted,
                      'dropdown__option--selected': isSelected,
                    })}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleOptionSelect(option);
                    }}
                  >
                    {option.label}
                  </div>
                );
              })}
            </div>
          ))}
        </>
      );
    }

    // Non-grouped rendering
    return (
      <>
        {sliceOrAll.map((option, index) => {
          const isHighlighted = index === highlightedIndex;
          const isSelected = isOptionSelected(option.value);
          return (
            <div
              id={`dropdown-item-${index}`}
              key={option.value}
              role="option"
              aria-selected={isSelected}
              className={classNames('dropdown__option', {
                'dropdown__option--highlighted': isHighlighted,
                'dropdown__option--selected': isSelected,
              })}
              onMouseDown={(e) => {
                e.preventDefault();
                handleOptionSelect(option);
              }}
            >
              {option.label}
            </div>
          );
        })}
      </>
    );
  };

  /**
   * Compute a textual display of the selected value(s).
   * For multi-select, join them with commas or some
   * design system approved separator.
   */
  const renderSelectedText = (): string => {
    if (isMulti && Array.isArray(value)) {
      const selectedLabels = value
        .map((val) => {
          const matched = options.find((opt) => opt.value === val);
          return matched ? matched.label : '';
        })
        .filter((label) => label !== '');
      if (selectedLabels.length === 0) return '';
      return selectedLabels.join(', ');
    }
    if (typeof value === 'string') {
      const singleOption = options.find((opt) => opt.value === value);
      return singleOption ? singleOption.label : '';
    }
    return '';
  };

  const isDropdownLoading: LoadingState = isLoading ? 'loading' : 'idle';

  return (
    <div
      className={classNames('dropdown', className, {
        'dropdown--disabled': isDisabled,
        'dropdown--open': menuOpen,
        'dropdown--loading': isLoading,
      })}
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
      tabIndex={isDisabled ? -1 : 0}
      role="combobox"
      aria-expanded={menuOpen}
      aria-owns="dropdown-listbox"
      aria-haspopup="listbox"
      aria-activedescendant={activeDescendantId}
    >
      {/* Label/Selection Display Area */}
      <div
        className={classNames('dropdown__control', {
          'dropdown__control--disabled': isDisabled,
        })}
        onClick={toggleMenu}
        onMouseDown={(e) => e.preventDefault()}
        aria-disabled={isDisabled}
      >
        {(isDropdownLoading === 'loading') && (
          <span className="dropdown__spinner" aria-hidden="true" />
        )}
        {!isSearchable && (
          <div className="dropdown__selected-text">
            {renderSelectedText() || placeholder}
          </div>
        )}
        {/* If isSearchable is true, show the internal input for filtering */}
        {isSearchable && !isDisabled && (
          <input
            className="dropdown__search-input"
            value={searchInput}
            onChange={handleInputChange}
            placeholder={placeholder}
            aria-label="Search dropdown"
            aria-autocomplete="list"
            aria-controls="dropdown-listbox"
            disabled={isDisabled}
          />
        )}
        <div className="dropdown__arrow" />
      </div>

      {/* Menu Container */}
      {menuOpen && (
        <div
          id="dropdown-listbox"
          className="dropdown__menu"
          role="listbox"
          style={{
            maxHeight: `${maxHeight}px`,
            overflowY: 'auto',
          }}
        >
          {getDisplayedOptions().length === 0 && !isLoading ? (
            <div className="dropdown__no-options" aria-live="polite">
              No options available
            </div>
          ) : (
            renderOptionsList()
          )}
        </div>
      )}
    </div>
  );
};