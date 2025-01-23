import React, { FC, ReactNode } from 'react'; // react@^18.0.0
import classNames from 'classnames'; // classnames@^2.3.2

/**
 * Internal Imports
 * ----------------------------------------------------------------------------
 * 1) Icon: A reusable React.FC<IconProps> for rendering icons according to
 *    the TaskStream AI design system (including sizes, theme-based colors).
 * 2) Button: A reusable React.FC<ButtonProps> for rendering accessible, themable,
 *    and enterprise-grade buttons with optional icons.
 * 3) IconNames: Enumerates all possible string identifiers for icons in the
 *    design system. We use keyof typeof IconNames to ensure type safety.
 */
import { Icon } from './Icon';
import { Button } from './Button';
import { IconNames } from '../../assets/icons';

/**
 * EmptyStateProps
 * ----------------------------------------------------------------------------
 * Defines the shape of the props passed to the reusable EmptyState component.
 * This component strictly follows the TaskStream AI design system, supporting:
 *  - A consistent icon slot for decorative or illustrative usage.
 *  - A primary title and optional descriptive text or node.
 *  - An optional action button with accessible labeling.
 *  - Full theming and responsive design for enterprise use cases.
 *  - Optional testId for QA automation or integration testing.
 */
export interface EmptyStateProps {
  /** Name of the icon to display in the empty state. Ensures type safety by using keyof typeof IconNames. */
  iconName: keyof typeof IconNames;

  /** Main title text for the empty state, typically guiding the user on the context (e.g. "No Data Found"). */
  title: string;

  /** Optional descriptive text or custom React node that provides additional context or instructions. */
  description?: string | ReactNode;

  /** Optional label text for the action button. When provided, an action button is rendered. */
  actionLabel?: string;

  /** Optional click handler for the action button. Must be set alongside actionLabel to render. */
  onAction?: () => void;

  /** Additional CSS classes enabling custom overrides or layout adjustments. */
  className?: string;

  /**
   * Accessibility label for the overall empty state region, helping screen readers
   * identify the purpose of this component if the textual content is not sufficient.
   */
  ariaLabel?: string;

  /** A test identifier that can be used in automated testing to locate this component. */
  testId?: string;
}

/**
 * getEmptyStateClasses
 * ----------------------------------------------------------------------------
 * Combines a core set of tailwind or theme-based CSS classes for the EmptyState
 * layout, while also incorporating:
 *  1) Base empty state classes for structure and alignment.
 *  2) Theme-specific or tailwind-based styling tokens.
 *  3) Action-specific spacing for cases where an action button is present.
 *  4) Optional custom className overrides for layout or theming.
 *  5) Responsive classes ensuring consistent rendering across breakpoints.
 *
 * @param className - A string of additional class overrides, if any.
 * @param hasAction - A boolean indicating whether the empty state includes an action button.
 * @returns A full class string to be applied to the component container.
 */
export function getEmptyStateClasses(className: string, hasAction: boolean): string {
  // Start with a base set of tailwind utility classes ensuring a flexible layout,
  // centered content, consistent spacing, and a text-aligned structure.
  const baseClasses: string[] = [
    'ts-empty-state',      // An identifiable base class for potential global or scoped styling
    'flex',
    'flex-col',
    'items-center',
    'justify-center',
    'text-center',
    // Responsive padding for various breakpoints (e.g. p-4 on mobile, p-6 on sm, p-8 on md)
    'p-4',
    'sm:p-6',
    'md:p-8',
  ];

  // If there's an action, we can add additional bottom padding or spacing to account for the button area.
  if (hasAction) {
    baseClasses.push('pb-8');
  }

  // Add any custom overrides if the user supplies a className prop.
  if (className) {
    baseClasses.push(className);
  }

  // Combine everything into a single class string using the classnames utility.
  return classNames(baseClasses);
}

/**
 * EmptyState
 * ----------------------------------------------------------------------------
 * A reusable, production-grade empty state component that follows the TaskStream AI
 * design system. It provides:
 *  - A large icon area for illustration or decorative purpose.
 *  - A concise title and optional descriptive text to guide the user.
 *  - An optional action button for the user to rectify the empty state scenario
 *    (e.g. "Add Data", "Create Project").
 *  - Responsive design, full theming, accessibility attributes, and test IDs for
 *    enterprise reliability.
 */
export const EmptyState: FC<EmptyStateProps> = ({
  iconName,
  title,
  description,
  actionLabel,
  onAction,
  className,
  ariaLabel,
  testId,
}) => {
  /**
   * renderIcon
   * --------------------------------------------------------------------------
   * Renders the icon element if an iconName is provided. The Icon component is
   * configured to use size="lg" for a visually prominent illustration, and it
   * can be styled according to the design system color tokens or tailwind.
   *
   * @returns A ReactNode containing the icon, or null if no iconName is present.
   */
  function renderIcon(): ReactNode {
    // iconName is a required prop, but we add a defensive check for completeness.
    if (!iconName) {
      return null;
    }

    return (
      <Icon
        name={iconName}
        size="lg"
        className="mb-2 text-[var(--ts-color-secondary,#64748B)]"
      />
    );
  }

  /**
   * renderAction
   * --------------------------------------------------------------------------
   * Renders a primary action button if both actionLabel and onAction are provided.
   * This button allows the user to address the empty state scenario. The component:
   *  - Employs the design system's primary variant with a standard "md" size.
   *  - Adds top margin for spacing relative to the description text.
   *  - Declares ariaLabel set to the actionLabel for better accessibility. 
   *
   * @returns A ReactNode containing the action button, or null if no action is defined.
   */
  function renderAction(): ReactNode {
    if (!actionLabel || !onAction) {
      return null;
    }

    return (
      <Button
        variant="primary"
        size="md"
        onClick={onAction}
        ariaLabel={actionLabel}
        className="mt-4"
      >
        {actionLabel}
      </Button>
    );
  }

  // Determine if an action is present. We pass that info to getEmptyStateClasses
  // to conditionally adjust the layout spacing (e.g., additional padding at the bottom).
  const hasAction = Boolean(actionLabel && onAction);

  // Compute a combined class string including base, optional, and theme-based classes.
  const containerClasses = getEmptyStateClasses(className || '', hasAction);

  return (
    <div
      data-testid={testId}
      aria-label={ariaLabel}
      className={containerClasses}
    >
      {renderIcon()}
      <h2 className="text-xl font-semibold mb-2 text-[var(--ts-color-grey-900,#111827)]">
        {title}
      </h2>
      {description && (
        <div className="text-sm text-[var(--ts-color-secondary,#64748B)] max-w-md mb-2">
          {description}
        </div>
      )}
      {renderAction()}
    </div>
  );
};