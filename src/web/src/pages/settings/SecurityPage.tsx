import React, {
  FC, // react@^18.0.0
  useState, // react@^18.0.0
  useEffect, // react@^18.0.0
  useCallback, // react@^18.0.0
  ChangeEvent,
} from 'react';
import zxcvbn from 'zxcvbn'; // zxcvbn@^4.4.2

/*
  ----------------------------------------------------------------------------------
  Internal Imports
  ----------------------------------------------------------------------------------
  Button: A reusable enterprise-grade button with optional loading, variant, and
          onClick handling for security actions.
  useAuth: A custom hook providing user authentication state, including user details,
           loading states, and advanced security statuses (placeholder for securityEvents).
*/
import { Button } from '../../components/common/Button';
import { useAuth } from '../../hooks/useAuth';

/**
 * SecurityFormState
 * ----------------------------------------------------------------------------
 * Represents the extensive state for the SecurityPage. Each property aligns with
 * the comprehensive security management functionality required, including password
 * changes, two-factor authentication, device tracking, and session/event data.
 */
interface SecurityFormState {
  /**
   * Stores the user's current password input, enabling old password checks
   * before allowing a secure password update.
   */
  currentPassword: string;

  /**
   * Stores the user's new password input, subject to strength validation,
   * history checks, and encryption before updates.
   */
  newPassword: string;

  /**
   * Must match the newPassword entry for basic form-level confirmation to
   * prevent typos from incorrectly updating.
   */
  confirmPassword: string;

  /**
   * Boolean flag to indicate if two-factor authentication is enabled, requiring
   * additional verification steps for login or configuration changes.
   */
  twoFactorEnabled: boolean;

  /**
   * A device identifier that can be used to track or differentiate user devices,
   * particularly useful for enterprise-level device management.
   */
  deviceId: string;

  /**
   * The last date/time the password change successfully occurred, used to
   * display security reminders or enforce password rotation policies.
   */
  lastPasswordChange: Date;

  /**
   * An array of security questions and answers, supporting advanced security flows
   * (e.g., identity verification for sensitive operations).
   */
  securityQuestions: Array<{ question: string; answer: string }>;

  /**
   * A list of all active sessions for this user, each containing an id, device name,
   * and last active timestamp. Provides the ability to manage or terminate sessions.
   */
  activeSessions: Array<{ id: string; device: string; lastActive: Date }>;

  /**
   * Used to store security events, e.g., password changes, suspicious sign-ins,
   * or 2FA toggles. Helps with thorough security monitoring and auditing.
   */
  securityEvents: Array<{ type: string; timestamp: Date; details: string }>;
}

/**
 * ----------------------------------------------------------------------------
 * SecurityPage
 * ----------------------------------------------------------------------------
 * A React functional component providing a comprehensive, enterprise-grade
 * security settings interface. It integrates password management, two-factor
 * authentication toggling, device session tracking, and security event audits.
 *
 * Steps Implemented (per specification):
 *  1. Initialize enhanced form state with useState hook
 *  2. Get user context and security events from useAuth hook
 *  3. Set up password strength validation with zxcvbn
 *  4. Handle form input changes with debouncing
 *  5. Validate password requirements and history
 *  6. Manage active sessions and devices
 *  7. Monitor and log security events
 *  8. Submit security setting changes with encryption
 *  9. Render comprehensive security settings interface
 *
 * @returns JSX.Element - Rendered security settings page with enhanced security features
 */
export const SecurityPage: FC = () => {
  /**
   * useAuth hook:
   * - Provides current user data, loading state, and advanced security info.
   * - In a production environment, it should also expose securityEvents or
   *   a mechanism to fetch them. For demonstration, we’ll track them locally.
   */
  const { user, loading: authLoading } = useAuth();

  /**
   * The SecurityPage can track local form state aligned to the SecurityFormState interface.
   * We initialize sensible defaults; in a real system, these might be fetched from an
   * API or derived from user data responses.
   */
  const [formState, setFormState] = useState<SecurityFormState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false,
    deviceId: '',
    lastPasswordChange: new Date(),
    securityQuestions: [
      { question: '', answer: '' },
      { question: '', answer: '' },
    ],
    activeSessions: [],
    securityEvents: [],
  });

  /**
   * passwordScore tracks the strength of the newPassword field using zxcvbn,
   * a password strength estimation library. This numeric score (0-4) can be
   * displayed to the user or used for password policy enforcement.
   */
  const [passwordScore, setPasswordScore] = useState<number>(0);

  /**
   * A boolean to handle immediate UI feedback for in-progress password changes,
   * session updates, or other security interactions.
   */
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  /**
   * useEffect: Initialize data for device tracking, session retrieval,
   * and last password change from an API or local source. This effect simulates
   * the retrieval of security-related state from a backend on mount.
   */
  useEffect(() => {
    // In a real system, these data points might come from an authenticated API call:
    // e.g., fetchActiveSessions(), fetchLastPasswordChange(), fetchSecurityEvents() ...
    const mockSessions = [
      { id: 'sess-1', device: 'Chrome on Windows', lastActive: new Date() },
      { id: 'sess-2', device: 'Safari on iPhone', lastActive: new Date() },
    ];
    const mockEvents = [
      {
        type: 'PASSWORD_CHANGE',
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        details: 'User changed password',
      },
      {
        type: 'LOGIN',
        timestamp: new Date(Date.now() - 7200000), // 2 hours ago
        details: 'User login from new device',
      },
    ];
    setFormState((prev) => ({
      ...prev,
      activeSessions: mockSessions,
      securityEvents: mockEvents,
    }));
  }, []);

  /**
   * handleInputChange
   * ----------------------------------------------------------------------------
   * A generic handler for text input fields within this security page. It supports
   * rudimentary debouncing to avoid constant state updates while the user types.
   *
   * @param field - The key in SecurityFormState that is being updated.
   * @param value - The new string value for that field.
   */
  const handleInputChange = useCallback((field: keyof SecurityFormState, value: string) => {
    // Basic "debounce" approach: micro-throttling so we don't recalc on every keystroke.
    // In a real codebase, we might use a library like lodash.debounce for production-level.
    setTimeout(() => {
      setFormState((prev) => ({
        ...prev,
        [field]: value,
      }));
    }, 150);
  }, []);

  /**
   * useEffect: Observes changes to newPassword to recalculate the password strength
   * using zxcvbn. This helps fulfill the data security requirement by providing
   * real-time feedback on password complexity.
   */
  useEffect(() => {
    if (formState.newPassword) {
      const result = zxcvbn(formState.newPassword);
      setPasswordScore(result.score);
    } else {
      setPasswordScore(0);
    }
  }, [formState.newPassword]);

  /**
   * handlePasswordChange
   * ----------------------------------------------------------------------------
   * Asynchronously processes a password change request. Follows the steps enumerated:
   *   1. Validate password strength requirements
   *   2. Check password history
   *   3. Encrypt new password
   *   4. Update password with API call
   *   5. Log security event
   *   6. Update last password change timestamp
   *   7. Notify user of successful change
   *
   * @param event - The React change event from a form submission or button click
   */
  const handlePasswordChange = async (
    event: ChangeEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>
  ): Promise<void> => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      // (1) Validate password strength and confirm match
      if (passwordScore < 2) {
        alert('Your new password is too weak. Please choose a stronger password.');
        return;
      }
      if (formState.newPassword !== formState.confirmPassword) {
        alert('Your new password and confirmation do not match.');
        return;
      }

      // (2) Check password history - placeholder for real checking,
      // e.g., an API call that compares to old password hashes.
      if (formState.currentPassword === formState.newPassword) {
        alert('New password cannot be the same as the current password.');
        return;
      }

      // (3) Encrypt new password - placeholder for actual encryption. This is a mock example.
      const encryptedNewPassword = `encrypted::${formState.newPassword}`;

      // (4) Update password with an API call
      // For a real system, we'd do something like: await api.put('/user/password', {...})
      // We'll simulate success with a short setTimeout
      await new Promise((resolve) => setTimeout(resolve, 500));

      // (5) Log a security event. In a production scenario, we might push to a logging service.
      const newSecurityEvent = {
        type: 'PASSWORD_CHANGE',
        timestamp: new Date(),
        details: `Password changed successfully for user: ${user?.email || 'N/A'}`,
      };

      // (6) Update the lastPasswordChange field
      // (7) Notify user of successful change (via alert or toast)
      setFormState((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        lastPasswordChange: new Date(),
        securityEvents: [...prev.securityEvents, newSecurityEvent],
      }));
      alert('Password updated successfully!');
    } catch (error: any) {
      console.error('Error changing password:', error);
      // Could log or display error details to the user
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * handleSessionManagement
   * ----------------------------------------------------------------------------
   * Manages active sessions, including terminating a selected session. Steps:
   *   1. Retrieve active sessions
   *   2. Validate session authentication
   *   3. Terminate selected session
   *   4. Update session list
   *   5. Log security event
   *   6. Notify user of session change
   *
   * @param sessionId - String representing the ID of the session to terminate
   */
  const handleSessionManagement = async (sessionId: string): Promise<void> => {
    setIsSubmitting(true);
    try {
      // (1) Retrieve current sessions from our formState
      const currentSessions = formState.activeSessions;

      // (2) Validate session - here we would check if sessionId is valid for this user
      const sessionExists = currentSessions.some((s) => s.id === sessionId);
      if (!sessionExists) {
        alert('Session not found or invalid.');
        return;
      }

      // (3) Terminate the session. In a production environment, we'd call an API:
      // e.g., await api.delete(`/sessions/${sessionId}`)
      // We'll simulate success with a short setTimeout
      await new Promise((resolve) => setTimeout(resolve, 300));

      // (4) Update session list locally
      const updatedSessions = currentSessions.filter((s) => s.id !== sessionId);

      // (5) Log security event
      const newSecurityEvent = {
        type: 'SESSION_TERMINATION',
        timestamp: new Date(),
        details: `Session ${sessionId} terminated by user ${user?.email || 'N/A'}`,
      };

      // (6) Notify user
      alert(`Session ${sessionId} was terminated successfully.`);

      setFormState((prev) => ({
        ...prev,
        activeSessions: updatedSessions,
        securityEvents: [...prev.securityEvents, newSecurityEvent],
      }));
    } catch (error: any) {
      console.error('Error managing session:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * handleToggle2FA
   * ----------------------------------------------------------------------------
   * Allows the user to toggle two-factor authentication on or off.
   * This is an additional method not explicitly enumerated in the steps,
   * but essential to meet the requirement for 2FA security management.
   */
  const handleToggle2FA = useCallback(async () => {
    setIsSubmitting(true);
    try {
      // In a real system, call an API endpoint to enable/disable 2FA
      // e.g. await api.post('/user/2fa', { enabled: !formState.twoFactorEnabled });
      // We'll simulate with a short setTimeout
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Log and alert
      const newSecurityEvent = {
        type: 'TWO_FACTOR_CHANGED',
        timestamp: new Date(),
        details: `Two-factor authentication set to ${!formState.twoFactorEnabled}`,
      };

      alert(`2FA is now ${!formState.twoFactorEnabled ? 'ENABLED' : 'DISABLED'}.`);

      setFormState((prev) => ({
        ...prev,
        twoFactorEnabled: !prev.twoFactorEnabled,
        securityEvents: [...prev.securityEvents, newSecurityEvent],
      }));
    } catch (error: any) {
      console.error('Error toggling 2FA:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formState.twoFactorEnabled]);

  /** 
   * Render function for listing active sessions from formState. 
   * Each session can be terminated via handleSessionManagement.
   */
  const renderActiveSessions = useCallback(() => {
    if (!formState.activeSessions.length) {
      return <p className="text-sm text-gray-500">No active sessions found.</p>;
    }
    return formState.activeSessions.map((session) => (
      <div key={session.id} className="flex items-center justify-between py-1">
        <span className="text-sm">
          <strong>Device:</strong> {session.device} &middot; <strong>Last Active:</strong>{' '}
          {session.lastActive.toLocaleString()}
        </span>
        <Button
          variant="outline"
          loading={isSubmitting}
          onClick={() => handleSessionManagement(session.id)}
        >
          Terminate
        </Button>
      </div>
    ));
  }, [formState.activeSessions, handleSessionManagement, isSubmitting]);

  /**
   * Render function for listing security events from formState. 
   * Each event is displayed with a timestamp, type, and optional details.
   */
  const renderSecurityEvents = useCallback(() => {
    if (!formState.securityEvents.length) {
      return <p className="text-sm text-gray-500">No security events recorded.</p>;
    }
    return (
      <ul className="space-y-1">
        {formState.securityEvents.map((evt, idx) => (
          <li key={`sec-evt-${idx}`} className="text-sm text-gray-700">
            <strong>{evt.type}</strong> &middot; {evt.timestamp.toLocaleString()} &middot;{' '}
            {evt.details}
          </li>
        ))}
      </ul>
    );
  }, [formState.securityEvents]);

  /**
   * The comprehensive UI for the SecurityPage is returned below. This includes:
   * - Password change form
   * - 2FA toggle
   * - Active sessions management
   * - Security events/Audit logs
   * - Real-time password strength feedback
   */
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Security Settings</h2>

      {/* 
        Password Change Section 
        Demonstrates advanced password management with real-time strength 
        validation, encryption placeholders, and event logging. 
      */}
      <section className="mb-8 border p-4 rounded">
        <h3 className="text-lg font-medium mb-2">Change Your Password</h3>
        <form
          onSubmit={(e) => handlePasswordChange(e)}
          className="space-y-3"
          autoComplete="off"
        >
          <div className="flex flex-col">
            <label htmlFor="currentPassword" className="text-sm font-semibold mb-1">
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              className="border p-2 rounded"
              disabled={authLoading || isSubmitting}
              onChange={(e) => handleInputChange('currentPassword', e.target.value)}
              value={formState.currentPassword}
              required
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="newPassword" className="text-sm font-semibold mb-1">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              className="border p-2 rounded"
              disabled={authLoading || isSubmitting}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              value={formState.newPassword}
              required
            />
            <p className="text-xs mt-1">
              Password Strength:{' '}
              <strong className="ml-1">
                {passwordScore}/4 {passwordScore < 2 ? '(Weak)' : '(OK)'}
              </strong>
            </p>
          </div>

          <div className="flex flex-col">
            <label htmlFor="confirmPassword" className="text-sm font-semibold mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="border p-2 rounded"
              disabled={authLoading || isSubmitting}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              value={formState.confirmPassword}
              required
            />
          </div>

          <Button variant="primary" type="submit" loading={isSubmitting}>
            Update Password
          </Button>
        </form>
      </section>

      {/* 
        Two-Factor Authentication Toggle 
        Addresses the need to allow the user to quickly enable or disable 2FA.
      */}
      <section className="mb-8 border p-4 rounded">
        <h3 className="text-lg font-medium mb-2">Two-Factor Authentication (2FA)</h3>
        <div className="flex items-center mb-3">
          <input
            id="twoFactorToggle"
            type="checkbox"
            checked={formState.twoFactorEnabled}
            disabled={authLoading || isSubmitting}
            onChange={handleToggle2FA}
            className="mr-2"
          />
          <label htmlFor="twoFactorToggle" className="text-sm font-semibold cursor-pointer">
            {formState.twoFactorEnabled ? 'Enabled' : 'Disabled'}
          </label>
        </div>
        <p className="text-sm text-gray-600">
          When enabled, you&apos;ll be prompted for an additional verification code upon sign-in.
        </p>
      </section>

      {/* 
        Device & Session Management 
        Provides a list of active sessions with a button to terminate any suspicious or
        unwanted sessions, fulfilling user access control and device tracking from the
        technical specifications.
      */}
      <section className="mb-8 border p-4 rounded">
        <h3 className="text-lg font-medium mb-2">Active Sessions</h3>
        {renderActiveSessions()}
      </section>

      {/* 
        Security Events / Audit Trail 
        Displays logs for security events including password changes, logins, 2FA toggles,
        and session terminations. Emphasizes comprehensive security monitoring. 
      */}
      <section className="mb-8 border p-4 rounded">
        <h3 className="text-lg font-medium mb-2">Security Events</h3>
        {renderSecurityEvents()}
      </section>

      {/* 
        Additional demonstration of "deviceId" and "lastPasswordChange" usage:
        We show them as read-only info for the user. In a real environment, deviceId 
        might be automatically detected or set. The lastPasswordChange is updated 
        in handlePasswordChange upon success.
      */}
      <section className="mb-8 border p-4 rounded">
        <h3 className="text-lg font-medium mb-2">Security Metadata</h3>
        <div className="text-sm text-gray-700">
          <p>
            <strong>Device ID:</strong>{' '}
            {formState.deviceId || 'N/A (not provided or auto-detected)'}
          </p>
          <p>
            <strong>Last Password Change:</strong>{' '}
            {formState.lastPasswordChange.toLocaleString()}
          </p>
        </div>
      </section>
    </div>
  );
};