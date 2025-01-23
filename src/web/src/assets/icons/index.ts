/**
 * This file centralizes icon imports and exports for the TaskStream AI application.
 * It provides a consistent and type-safe interface for retrieving icons across the
 * application while adhering to the design system standards, accessibility guidelines,
 * and performance optimizations (lazy-loading and bundle optimization).
 *
 * Accessibility:
 *  - Ensure ARIA attributes (e.g., aria-label) when rendering icons to support screen readers.
 *  - Icons can be styled with high-contrast colors to meet WCAG 2.1 AA standards.
 *
 * Performance:
 *  - Imported icons are tree-shakeable, reducing bundle size.
 *  - Consistent naming ensures minimal confusion and clear usage in the codebase.
 *
 * @packageDocumentation
 */

////////////////////////////////////////
// External Dependencies
////////////////////////////////////////

// @heroicons/react version ^2.0.0
import {
  HiQuestionMarkCircle,
  HiCreditCard,
  HiInformationCircle,
  HiPlusCircle,
  HiXCircle,
  HiChevronLeft,
  HiChevronRight,
  HiUpload,
  HiViewGrid,
  HiUserCircle,
  HiCog,
  HiStar,
} from '@heroicons/react';

// @types/react-icons version ^3.0.0
import { IconType } from '@types/react-icons';

////////////////////////////////////////
// Icon Names: Enumerates all possible icon strings in the design system
////////////////////////////////////////

/**
 * Record of string identifiers for each icon name used throughout TaskStream AI.
 * These string constants ensure type safety and consistency when referencing
 * icons in various components. Usage example:
 *
 *    <Icon component={IconMap[IconNames.HELP]} aria-label="Help Icon" />
 */
export const IconNames: Record<string, string> = {
  HELP: 'HELP',
  PAYMENT: 'PAYMENT',
  INFO: 'INFO',
  ADD: 'ADD',
  CLOSE: 'CLOSE',
  PREVIOUS: 'PREVIOUS',
  NEXT: 'NEXT',
  UPLOAD: 'UPLOAD',
  DASHBOARD: 'DASHBOARD',
  PROFILE: 'PROFILE',
  SETTINGS: 'SETTINGS',
  FAVORITE: 'FAVORITE',
};

////////////////////////////////////////
// Icon Map: Links IconNames to actual icon components of type IconType
////////////////////////////////////////

/**
 * Record of icon name strings mapped to their corresponding React icon components,
 * which implement the IconType interface. This mapping provides a single source of
 * truth for icon components, ensuring that any updates to the imported icons only
 * need to be updated here. Example usage:
 *
 *    <Icon component={IconMap[IconNames.ADD]} aria-label="Add Item" />
 */
export const IconMap: Record<string, IconType> = {
  [IconNames.HELP]: HiQuestionMarkCircle,
  [IconNames.PAYMENT]: HiCreditCard,
  [IconNames.INFO]: HiInformationCircle,
  [IconNames.ADD]: HiPlusCircle,
  [IconNames.CLOSE]: HiXCircle,
  [IconNames.PREVIOUS]: HiChevronLeft,
  [IconNames.NEXT]: HiChevronRight,
  [IconNames.UPLOAD]: HiUpload,
  [IconNames.DASHBOARD]: HiViewGrid,
  [IconNames.PROFILE]: HiUserCircle,
  [IconNames.SETTINGS]: HiCog,
  [IconNames.FAVORITE]: HiStar,
};