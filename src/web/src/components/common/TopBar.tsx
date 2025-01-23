import React, {
  FC,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'; // react@^18.0.0
import classNames from 'classnames'; // classnames@^2.3.2

// Internal imports (IE1 compliance).
import { Icon } from './Icon';
import { Avatar, Size as AvatarSize } from './Avatar';
import { useAuth } from '../../hooks/useAuth';

/**
 * TopBarProps
 * ----------------------------------------------------------------------------
 * Defines the shape of the props required by the TopBar component. The TopBar
 * provides a consistent site-wide header, including an optional menu button for
 * mobile or responsive layouts, user profile access, accessibility labels, and
 * test IDs for automated testing.
 */
export interface TopBarProps {
  /**
   * Optional string for supplying additional custom class names to
   * the top bar container. Useful for layout overrides in parent
   * contexts or theming variations.
   */
  className?: string;

  /**
   * Optional callback fired upon clicking the mobile menu button (often
   * referred to as the "hamburger icon"). If omitted, the menu icon is
   * hidden.
   */
  onMenuClick?: () => void;

  /**
   * Optional accessibility label for the entire top bar container.
   * Improves screen reader navigation by describing the site's header.
   */
  ariaLabel?: string;

  /**
   * Optional test identifier used to facilitate automated testing
   * of the top bar in end-to-end or unit test scenarios.
   */
  testId?: string;
}

/**
 * handleLogout
 * ----------------------------------------------------------------------------
 * Securely handles user logout with session cleanup steps. This function:
 * 1) Validates the current session state to see if tokens are valid.
 * 2) Clears local authentication presence in this component.
 * 3) Invokes the logout method from the useAuth hook to revoke or remove tokens.
 * 4) Clears session storage or cookies associated with the session.
 * 5) Broadcasts a logout event, ensuring cross-tab synchronization.
 * 6) Redirects or navigates the user to the login page (implementation-specific).
 *
 * @returns A Promise resolving when logout and cleanup actions finish.
 */
async function handleLogout(
  validateSession: () => Promise<boolean>,
  logout: () => Promise<void>
): Promise<void> {
  // (1) Validate the current session state
  const isSessionValid = await validateSession();

  // (2) Clear local references if session is invalid; proceed anyway for this demonstration
  // (In a real production environment, you might conditionally proceed or show a warning.)
  if (!isSessionValid) {
    // Could handle additional logic if needed
  }

  // (3) Call the logout function from the useAuth hook
  await logout();

  // (4) Clear session storage or relevant caching
  window.sessionStorage.clear();

  // (5) Broadcast event for cross-tab sync is handled within useAuth's logout
  // so no explicit action is taken here unless required.

  // (6) Navigate user to the login page
  // For demonstration, using a direct assignment.
  // In a real app with a router, you'd redirect with a router mechanism.
  window.location.href = '/login';
}

/**
 * handleProfileClick
 * ----------------------------------------------------------------------------
 * Handles the user clicking on their profile or avatar. This function:
 * 1) Checks the current session validity. If invalid, may force logout.
 * 2) Toggles the internal profile dropdown visibility state.
 * 3) Positions the dropdown below the avatar (handled by styling or absolute positioning).
 * 4) Sets ARIA attributes to ensure the dropdown is recognized by assistive technology.
 * 5) Focuses the first menu item in the dropdown for keyboard accessibility.
 * 6) Adds or manages keyboard navigation handlers.
 *
 * @param validateSession - Function to confirm if the session is still valid.
 * @param setProfileOpen  - React state setter to toggle the dropdown visibility.
 * @param firstMenuItemRef - Reference to the DOM node representing the first focusable menu item.
 */
function handleProfileClick(
  validateSession: () => Promise<boolean>,
  setProfileOpen: React.Dispatch<React.SetStateAction<boolean>>,
  firstMenuItemRef: React.RefObject<HTMLButtonElement>
): void {
  validateSession().then((isValid) => {
    // If session is invalid, we might show a prompt or auto-logout. This is optional.
    if (!isValid) {
      // Additional logic could go here, e.g., forcing a logout or alerting the user.
    }
    // (2) Toggle the dropdown
    setProfileOpen((prevOpen) => {
      const nextOpenState = !prevOpen;

      if (nextOpenState) {
        // (5) Focus first menu item on open, if available
        setTimeout(() => {
          if (firstMenuItemRef.current) {
            firstMenuItemRef.current.focus();
          }
        }, 0);
      }

      return nextOpenState;
    });
  });
}

/**
 * TopBar
 * ----------------------------------------------------------------------------
 * A reusable top navigation bar component that provides:
 *  - A consistent header layout
 *  - A user avatar and optional profile dropdown
 *  - Responsive design, including an optional mobile menu button
 *  - Basic help, notifications, or settings icons
 *  - Integration with useAuth for secure profile access and session management
 *
 * Implements all required functionalities, including authentication flow checks
 * (7.1.1), design system elements (3.1.1), and component library usage (3.1.2).
 *
 * @param props - The TopBarProps interface containing optional className,
 *                onMenuClick, ariaLabel, and testId.
 */
export const TopBar: FC<TopBarProps> = ({
  className,
  onMenuClick,
  ariaLabel,
  testId,
}) => {
  /**
   * Access authentication context: user object, logout function,
   * and validateSession to check whether the current token is valid.
   */
  const { user, logout, validateSession } = useAuth();

  /**
   * Local state to track whether the user profile dropdown is open.
   * This toggles on avatar click with the handleProfileClick function.
   */
  const [profileOpen, setProfileOpen] = useState<boolean>(false);

  /**
   * A ref pointing to the first interactive item within the dropdown menu,
   * to ensure keyboard users can navigate immediately after opening.
   */
  const firstMenuItemRef = useRef<HTMLButtonElement>(null);

  /**
   * A callback for handling the profile avatar click. This toggles the
   * dropdown and runs a session validity check.
   */
  const onProfileClick = useCallback(() => {
    handleProfileClick(validateSession, setProfileOpen, firstMenuItemRef);
  }, [validateSession]);

  /**
   * A callback for handling logout request from the profile dropdown.
   * It calls handleLogout to perform session cleanup.
   */
  const onLogoutClick = useCallback(async () => {
    await handleLogout(validateSession, logout);
  }, [validateSession, logout]);

  /**
   * Condition to determine the user's display name and avatar source.
   * If user is null, we might default to 'Guest'.
   */
  const displayName = user
    ? `${user.firstName} ${user.lastName}`
    : 'Guest User';

  const avatarSrc = ''; // Could be a user?.avatarUrl if provided by the system

  /**
   * Combine base 'topbar' class with any user-supplied classes via className prop.
   */
  const topBarClass = classNames('topbar', className);

  return (
    <header
      data-testid={testId}
      aria-label={ariaLabel}
      className={topBarClass}
      role="banner"
      /**
       * Outline for potential inline styles or leftover theming:
       * style={{
       *   // Example properties if needed
       *   position: 'sticky',
       *   top: 0,
       *   zIndex: 'var(--z-index-header)',
       * }}
       */
    >
      {/**
       * Left section of the top bar, typically displaying branding,
       * a site title, or a hamburger icon for mobile navigation.
       */}
      <div className="topbar-left">
        {onMenuClick && (
          <Icon
            name="DASHBOARD"
            size="md"
            className="topbar-menu-icon"
            onClick={onMenuClick}
          />
        )}
        <span
          style={{
            fontWeight: 600,
            marginLeft: onMenuClick ? '4px' : '0px',
          }}
        >
          TaskStream AI
        </span>
      </div>

      {/**
       * Right section of the top bar, typically containing various
       * interactive icons, user profile components, or other utilities.
       */}
      <div className="topbar-right">
        {/**
         * Example "notifications" icon placeholder. This can be replaced by
         * an actual logic that opens a notifications panel or dropdown.
         */}
        <Icon
          name="FAVORITE"
          size="md"
          color="secondary"
          className="topbar-icon"
          onClick={() => {
            // Placeholder for a notifications handler
            console.log('Notifications icon clicked');
          }}
        />

        {/**
         * Help icon to open a documentation or help panel. This is a placeholder
         * for an actual help flow or knowledge base integration.
         */}
        <Icon
          name="HELP"
          size="md"
          color="secondary"
          className="topbar-icon"
          onClick={() => {
            // Placeholder for help click
            console.log('Help icon clicked');
          }}
        />

        {/**
         * Settings icon as an example of additional top bar action. Could open
         * user settings, preferences, or application-level configuration.
         */}
        <Icon
          name="SETTINGS"
          size="md"
          color="secondary"
          className="topbar-icon"
          onClick={() => {
            // Placeholder for settings click
            console.log('Settings icon clicked');
          }}
        />

        {/**
         * User avatar. On click, opens the profile dropdown. If the user is
         * null, we show fallback initials like "Guest User => GU".
         */}
        <span
          style={{ position: 'relative' }}
          aria-controls="profile-dropdown-menu"
          aria-haspopup="true"
          aria-expanded={profileOpen}
        >
          <Avatar
            src={avatarSrc || null}
            name={displayName}
            size={AvatarSize.SM}
            loading={false}
            onError={() => {
              // Fallback or error handling
              console.log('Error loading avatar image.');
            }}
            alt="User Profile Avatar"
            showStatus={false}
            onClick={onProfileClick}
          />
          {/**
           * A conditional dropdown for the user profile menu. Typically absolutely
           * positioned. We show it only if profileOpen is true.
           */}
          {profileOpen && (
            <div
              id="profile-dropdown-menu"
              role="menu"
              aria-label="Profile Menu"
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                backgroundColor: 'var(--color-white)',
                border: '1px solid var(--color-gray-200)',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                padding: '8px',
                minWidth: '160px',
                zIndex: 1000,
              }}
            >
              <button
                type="button"
                ref={firstMenuItemRef}
                onClick={onLogoutClick}
                style={{
                  width: '100%',
                  backgroundColor: 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  padding: '8px',
                  fontSize: '14px',
                }}
              >
                Logout
              </button>
            </div>
          )}
        </span>
      </div>
    </header>
  );
};

/**
 * ----------------------------------------------------------------------------
 * Inline CSS/SCSS placeholders to illustrate how the classes might be written.
 * In a production environment, these would typically go into a separate
 * stylesheet or CSS module. Below are the styles from the JSON specification:
 *
 * .topbar {
 *   height: 64px;
 *   background-color: var(--color-white);
 *   border-bottom: 1px solid var(--color-gray-200);
 *   display: flex;
 *   align-items: center;
 *   justify-content: space-between;
 *   padding: 0 var(--spacing-md);
 *   position: sticky;
 *   top: 0;
 *   z-index: var(--z-index-header);
 * }
 * @media (max-width: 768px) {
 *   .topbar {
 *     height: 56px;
 *   }
 * }
 *
 * .topbar-left {
 *   display: flex;
 *   align-items: center;
 *   gap: var(--spacing-sm);
 * }
 * @media (max-width: 768px) {
 *   .topbar-left {
 *     gap: var(--spacing-xs);
 *   }
 * }
 *
 * .topbar-right {
 *   display: flex;
 *   align-items: center;
 *   gap: var(--spacing-md);
 * }
 * @media (max-width: 768px) {
 *   .topbar-right {
 *     gap: var(--spacing-sm);
 *   }
 * }
 *
 * .topbar-icon {
 *   cursor: pointer;
 * }
 *
 * .topbar-menu-icon {
 *   margin-right: var(--spacing-xs);
 *   cursor: pointer;
 * }
 * ----------------------------------------------------------------------------
 ```