/* 
  ==================================================================================
  TaskStream AI
  src/web/src/components/common/Modal.tsx
  ----------------------------------------------------------------------------------
  A reusable, production-ready modal dialog component adhering to the TaskStream AI
  design system specifications. It provides an accessible, responsive, and
  theme-aware overlay with customizable content, actions, and animations.
  ----------------------------------------------------------------------------------
  Requirements Addressed (from JSON specification):
    1) Component Library Implementation (Design System)
    2) Design System Consistency
    3) Responsive Design (Breakpoints)
    4) Accessibility Standards (WCAG 2.1 AA)
  ----------------------------------------------------------------------------------
  Imported Internal Modules:
    - useTheme hook from '../../hooks/useTheme' for theme-based styling and spacing
    - Button component (theme-aware action buttons)
    - Icon component (close icon accessibility)
  Imported External Modules:
    - React 18 for core framework
    - styled, Dialog, DialogTitle, DialogContent, DialogActions, Fade from @mui/material
    - focus-trap-react ^10.0.0 for focus management
  ----------------------------------------------------------------------------------
  Implementation Steps (as per spec):
    1) Initialize focus trap for accessibility
    2) Setup keyboard event handling to manage ESC key with optional disabling
    3) Handle modal open/close transitions (fade)
    4) Render a close icon or optional actions
    5) Render the title and main content
    6) Render modal actions in footer region
    7) Apply responsive design rules using breakpoints
    8) Manage focus lifecycle upon open/close
    9) Handle backdrop clicks and escape key if configured
  ==================================================================================
*/

import React, {
  FC,
  ReactNode,
  useRef,
  useEffect,
  useCallback,
  CSSProperties,
} from 'react'; // react ^18.0.0
import { styled } from '@mui/material/styles'; // @mui/material/styles ^5.14.0
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fade,
  Theme,
} from '@mui/material'; // @mui/material ^5.14.0
import { useFocusTrap } from 'focus-trap-react'; // focus-trap-react ^10.0.0

import { useTheme } from '../../hooks/useTheme';
import { Button } from './Button';
import { Icon } from './Icon';

/**
 * getTransitionStyles
 * -----------------------------------------------------------------------------
 * Generates transition styles for the modal using theme-based transitions.
 * Steps:
 *   1) Retrieve transition tokens from MUI theme
 *   2) Generate fade/transform transition CSS
 *   3) Return the styles object for use in styled components
 *
 * @param theme - MUI Theme object containing transition definitions
 * @returns A CSSProperties object configuring the fade/transform transitions
 */
function getTransitionStyles(theme: Theme): CSSProperties {
  return {
    transition: theme.transitions.create(['opacity', 'transform'], {
      duration: theme.transitions.duration.short,
      easing: theme.transitions.easing.easeInOut,
    }),
    willChange: 'opacity, transform',
  };
}

/**
 * StyledDialog
 * -----------------------------------------------------------------------------
 * A styled version of the MUI Dialog component that applies theme-aware border
 * radii, transitions, and spacing. It leverages the getTransitionStyles helper
 * to control fade/transform properties.
 */
const StyledDialog = styled(Dialog)(({ theme }) => ({
  '& .MuiPaper-root': {
    borderRadius: theme.shape.borderRadius,
    ...getTransitionStyles(theme),
  },
}));

/**
 * StyledDialogTitle
 * -----------------------------------------------------------------------------
 * A styled version of the MUI DialogTitle component that applies consistent
 * typography, padding, and spacing from the design system.
 */
const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
  padding: theme.spacing(2),
  fontFamily: theme.typography.fontFamily,
  fontWeight: theme.typography.fontWeightMedium,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}));

/**
 * StyledDialogContent
 * -----------------------------------------------------------------------------
 * A styled version of the MUI DialogContent component that applies responsive
 * padding and optional scrolling. This follows the design system's spacing
 * guidelines.
 */
const StyledDialogContent = styled(DialogContent)(({ theme }) => ({
  padding: theme.spacing(2),
  [theme.breakpoints.up('tablet')]: {
    padding: theme.spacing(3),
  },
}));

/**
 * ModalAction
 * -----------------------------------------------------------------------------
 * Defines an interface for individual action buttons used in the modal footer.
 * Each action can specify a label, onClick handler, optional variant, disabled
 * state, and an ariaLabel for accessibility.
 */
export interface ModalAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  disabled?: boolean;
  ariaLabel?: string;
}

/**
 * ModalProps
 * -----------------------------------------------------------------------------
 * Defines all props accepted by the Modal component, including open state,
 * close handler, title, children, action array, and advanced accessibility
 * or layout options (e.g. disableBackdropClick, disableEscapeKeyDown).
 */
export interface ModalProps {
  /**
   * Whether the modal is currently open (true) or closed (false).
   */
  open: boolean;

  /**
   * Callback invoked when the modal should close, for instance when a user
   * clicks the 'close' icon, an action button, or the backdrop (unless such
   * actions are disabled). Receives no arguments here.
   */
  onClose: () => void;

  /**
   * The title rendered in the dialog header. If empty, no title bar is shown.
   */
  title?: string;

  /**
   * The main body content of the modal, typically descriptive text or form
   * elements. Accepts ReactNode for flexible composition.
   */
  children?: ReactNode;

  /**
   * An optional array of actions rendered in the modal footer. Each action is
   * defined by the ModalAction interface to handle text, onClick, variant, etc.
   */
  actions?: ModalAction[];

  /**
   * A string controlling the maximum width of the dialog (e.g. "sm", "md", "lg", "xl")
   * following typical MUI dialog breakpoints. Defaults to "sm" if not provided.
   */
  maxWidth?: string;

  /**
   * Whether the dialog should take up the full width across the screen (usually
   * in combination with maxWidth). If true, the content is not left-floating, but
   * fully stretched.
   */
  fullWidth?: boolean;

  /**
   * Whether clicking on the backdrop should be disabled. If true, clicks outside
   * the modal do not trigger onClose.
   */
  disableBackdropClick?: boolean;

  /**
   * Whether pressing the Escape key should be disabled. If true, pressing Escape
   * does not trigger onClose.
   */
  disableEscapeKeyDown?: boolean;

  /**
   * A label used to describe the purpose of the dialog to screen readers.
   * Maps to aria-label on the container if provided.
   */
  ariaLabel?: string;

  /**
   * An identifier for referencing the accessible description of the dialog.
   * Typically an element ID that references descriptive content with aria-describedby.
   */
  ariaDescribedby?: string;
}

/**
 * Modal
 * -----------------------------------------------------------------------------
 * The main accessible, responsive, and theme-aware modal component. It handles:
 *   - Focus trapping for WCAG compliance
 *   - Keyboard navigation (Escape key)
 *   - Backdrop clicks and transitions
 *   - Optional action buttons in footer
 *   - A close icon to the right of the title if onClose is provided
 *
 * Steps:
 *   1) Initialize focus trap hook (focus-trap-react)
 *   2) Setup keyboard event handlers (disableEscapeKeyDown)
 *   3) Render fade transitions with MUI's Fade component
 *   4) Show close icon in the header based on onClose
 *   5) Insert user-defined children in the body area (StyledDialogContent)
 *   6) Render modal footer action buttons (Styled Buttons) if actions are provided
 *   7) Apply responsive styles for different viewport sizes
 *   8) Manage open/close states and clean up focus as needed
 *   9) Respect disableBackdropClick and disableEscapeKeyDown
 */
export const Modal: FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  actions = [],
  maxWidth = 'sm',
  fullWidth = false,
  disableBackdropClick = false,
  disableEscapeKeyDown = false,
  ariaLabel,
  ariaDescribedby,
}) => {
  /**
   * Access the active theme to leverage breakpoints, transitions, spacing, etc.
   */
  const { theme } = useTheme();

  /**
   * A ref pointing to the modal container for focus trap usage.
   */
  const containerRef = useRef<HTMLDivElement | null>(null);

  /**
   * Initialize useFocusTrap hook. This returns functions to enable or disable
   * the trap, ensuring that keyboard focus does not leave the modal when open.
   */
  const { activate, deactivate } = useFocusTrap(containerRef, {
    escapeDeactivates: false, // We'll manage ESC ourselves
    returnFocusOnDeactivate: true,
  });

  /**
   * Watch the `open` prop to activate or deactivate the focus trap accordingly.
   */
  useEffect(() => {
    if (open) {
      activate();
    } else {
      deactivate();
    }
  }, [open, activate, deactivate]);

  /**
   * Internal handler for MUI's onClose event. We check the reason the dialog is
   * closing (backdropClick or escapeKeyDown) and respect the user's disable
   * settings before calling the original onClose callback.
   */
  const handleClose = useCallback(
    (
      event: {},
      reason: 'backdropClick' | 'escapeKeyDown' | 'closeClick' | undefined
    ) => {
      if ((reason === 'backdropClick' && disableBackdropClick) ||
          (reason === 'escapeKeyDown' && disableEscapeKeyDown)) {
        return;
      }
      onClose();
    },
    [onClose, disableBackdropClick, disableEscapeKeyDown]
  );

  return (
    <StyledDialog
      ref={containerRef}
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedby}
      aria-modal="true"
      disableEscapeKeyDown={disableEscapeKeyDown}
      // MUI's 'BackdropProps' can disable onClick if needed, but we handle logic in handleClose
      BackdropProps={{
        // We rely on handleClose logic for deciding actual dismissal
        style: { backgroundColor: 'rgba(0, 0, 0, 0.6)' },
      }}
      // Use the Fade component for transitions
      TransitionComponent={Fade}
    >
      {/* Dialog Title with optional close icon on the right */}
      {title && (
        <StyledDialogTitle>
          <div>{title}</div>
          {/* If onClose is defined, show a close icon to let the user dismiss the modal */}
          <div style={{ marginLeft: theme.spacing(2) }}>
            <Icon
              name="CLOSE"
              size="md"
              onClick={() => handleClose({}, 'closeClick')}
              className="cursor-pointer"
            />
          </div>
        </StyledDialogTitle>
      )}

      {/* Dialog Content */}
      <StyledDialogContent>{children}</StyledDialogContent>

      {/* Dialog Actions Footer (renders only if actions array is non-empty) */}
      {actions.length > 0 && (
        <DialogActions sx={{ padding: theme.spacing(2) }}>
          {actions.map((action, idx) => (
            <Button
              key={`modal-action-${idx}`}
              variant={action.variant || 'primary'}
              onClick={action.onClick}
              disabled={action.disabled}
              ariaLabel={action.ariaLabel}
              size="md"
              className="ml-2"
            >
              {action.label}
            </Button>
          ))}
        </DialogActions>
      )}
    </StyledDialog>
  );
};