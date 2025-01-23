/**
 * Toast.tsx
 * ----------------------------------------------------------------------------
 * A reusable Toast notification component that displays temporary messages with
 * different severity levels (success, error, warning, info) and auto-dismissal
 * functionality. It integrates with the application's design system using
 * MUI's Alert and Snackbar components. Implements accessibility features,
 * animation support, and ensures compliance with TaskStream AI's design tokens.
 */

////////////////////////////////////////////////////////////
// External Imports (With Library Version Comments)       //
////////////////////////////////////////////////////////////
import React, { SyntheticEvent } from 'react'; // react version ^18.0.0
import { Snackbar, Alert } from '@mui/material'; // @mui/material version 5.14+
import { useDispatch } from 'react-redux'; // react-redux version ^8.0.0

////////////////////////////////////////////////////////////
// Internal Imports                                      //
////////////////////////////////////////////////////////////
import { NotificationType } from '../../store/ui/ui.types';
import { hideNotification } from '../../store/ui/ui.actions';

////////////////////////////////////////////////////////////
// Interface: ToastProps                                 //
////////////////////////////////////////////////////////////
/**
 * ToastProps
 * ----------------------------------------------------------------------------
 * Defines the contract for a single toast notification. Each toast displays
 * a specific message of a given NotificationType. It auto-dismisses after
 * a given duration (if provided) and calls onClose to trigger any cleanup.
 */
export interface ToastProps {
  /**
   * Unique identifier for the toast component instance.
   */
  id: string;

  /**
   * The notification type (SUCCESS, ERROR, WARNING, INFO) as defined
   * in TaskStream AI's UI state system.
   */
  type: NotificationType;

  /**
   * The textual message to be displayed in the toast.
   */
  message: string;

  /**
   * Number of milliseconds before this toast is automatically hidden.
   * If not provided, defaults to 3000ms.
   */
  autoHideDuration?: number;

  /**
   * Callback invoked when the toast is closed by user action or auto-dismiss.
   * Receives the toast ID as an argument for identification and potential
   * removal from the global UI state (e.g., via Redux).
   */
  onClose: (id: string) => void;
}

////////////////////////////////////////////////////////////
// Function: getAlertSeverity                            //
////////////////////////////////////////////////////////////
/**
 * getAlertSeverity
 * ----------------------------------------------------------------------------
 * Maps the TaskStream AI NotificationType to the MUI Alert severity string for
 * consistent styling per design system specifications. For instance, a
 * NotificationType.SUCCESS translates to an MUI severity of "success".
 *
 * @param {NotificationType} notificationType - The typed TaskStream AI
 * notification type enum (SUCCESS, ERROR, WARNING, INFO).
 * @returns {'success' | 'error' | 'warning' | 'info'} The corresponding MUI
 * Alert severity string used to style the notification.
 */
export function getAlertSeverity(
  notificationType: NotificationType
): 'success' | 'error' | 'warning' | 'info' {
  switch (notificationType) {
    case NotificationType.SUCCESS:
      return 'success';
    case NotificationType.ERROR:
      return 'error';
    case NotificationType.WARNING:
      return 'warning';
    default:
      return 'info';
  }
}

////////////////////////////////////////////////////////////
// Component: Toast                                      //
////////////////////////////////////////////////////////////
/**
 * Toast
 * ----------------------------------------------------------------------------
 * A reusable component that wraps a MUI Snackbar and Alert to provide an
 * accessible, animated toast notification. It auto-dismisses after the
 * specified duration and triggers onClose for further state cleanup
 * (e.g., removing the toast from the Redux store).
 *
 * Features:
 *  - Displays different notification types using getAlertSeverity.
 *  - Integrates with design tokens for color, typography, and spacing via MUI.
 *  - Auto-hide behavior after a configurable duration.
 *  - ARIA support, keyboard and screen reader accessibility.
 *  - Slide/Fade animation from MUI's Snackbar transitions by default.
 *
 * Steps:
 *  1. Map NotificationType to MUI severity via getAlertSeverity.
 *  2. Render a MUI Snackbar for the open state.
 *  3. Pass autoHideDuration to the Snackbar if provided, else default to 3000ms.
 *  4. Upon close, call the onClose callback passing the toast's unique ID.
 *  5. Provide the user the ability to dismiss the toast early by clicking
 *     the close icon or letting autoHide expire.
 *
 * @param {ToastProps} props The properties for the Toast component.
 * @returns {JSX.Element} A JSX element encapsulating Snackbar and Alert.
 */
const Toast: React.FC<ToastProps> = ({
  id,
  type,
  message,
  autoHideDuration,
  onClose,
}) => {
  const dispatch = useDispatch();

  /**
   * handleSnackbarClose
   * ----------------------------------------------------------------------------
   * Internal handler for MUI Snackbar close events. It checks the reason to
   * avoid closing on 'clickaway' if desired. Otherwise, it invokes the provided
   * onClose callback with this toast's ID for state management. Also dispatches
   * the hideNotification Redux action if needed to keep UI state consistent.
   *
   * @param {SyntheticEvent | Event} event The close event from MUI.
   * @param {string} reason The reason for the Snackbar closure (e.g., 'timeout').
   */
  const handleSnackbarClose = (
    event: Event | SyntheticEvent,
    reason?: string
  ) => {
    // Prevent accidental close on 'clickaway' (if that pattern is desired).
    if (reason === 'clickaway') {
      return;
    }
    // Dispatch the hideNotification action from the Redux store
    // to ensure the store reflects the removal of this specific toast.
    dispatch(hideNotification(id, false));
    onClose(id);
  };

  /**
   * Derived severity for MUI Alert component from the custom NotificationType.
   */
  const severity = getAlertSeverity(type);

  // Default autoHideDuration to 3000 ms if not explicitly provided
  const duration = typeof autoHideDuration === 'number' ? autoHideDuration : 3000;

  return (
    <Snackbar
      open
      autoHideDuration={duration}
      onClose={handleSnackbarClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
    >
      <Alert
        // MUI severity mapping to show correct design system color / style.
        severity={severity}
        // Provide a close icon to let users dismiss the toast early.
        onClose={() => {
          dispatch(hideNotification(id, false));
          onClose(id);
        }}
        // The MUI Alert's variant helps control the styling approach; "filled"
        // uses the design tokens for background fill plus white text for clarity.
        variant="filled"
        // ARIA role assignment for improved screen reader compatibility.
        role="alert"
        sx={{
          fontFamily: 'Inter, sans-serif', // Per design system typography
          // Additional styling can be provided to match exact spacing needs
          // from the design tokens (4px base grid).
          marginBottom: 1,
        }}
      >
        {message}
      </Alert>
    </Snackbar>
  );
};

export default Toast;