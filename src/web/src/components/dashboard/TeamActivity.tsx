import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  memo,
  FC,
} from 'react';
// classnames@^2.3.2
import classNames from 'classnames';
// react-error-boundary@^4.0.0
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

// Internal Imports (IE1)
import { Avatar, Size as AvatarSize, UserStatus } from '../common/Avatar';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';

// -----------------------------------------------------------------------------
// Supporting Enumerations & Types
// -----------------------------------------------------------------------------

/**
 * Enumeration: ActivityActionType
 * -----------------------------------------------------------------------------
 * Provides the different possible activity actions a user might take
 * (e.g., created a task, commented on a task, etc.). This enumeration is
 * particularly useful in generating the localized, sanitized messages
 * within the real-time feed.
 */
export enum ActivityActionType {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  COMMENTED = 'COMMENTED',
  RESOLVED = 'RESOLVED',
}

/**
 * Enumeration: ActivityPriority
 * -----------------------------------------------------------------------------
 * Represents the possible priorities for a given activity or update, allowing
 * the UI to highlight or style the feed differently (e.g., high-priority
 * mentions in a distinct color).
 */
export enum ActivityPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

/**
 * Interface: ActivityItem
 * -----------------------------------------------------------------------------
 * Represents a single record or event in the real-time team activity feed.
 * Each item includes identifying information, user data, timestamps, and
 * relevant metadata for advanced functionality.
 */
export interface ActivityItem {
  /**
   * Global unique identifier for the activity item (UUID or similar).
   */
  id: string;

  /**
   * The user ID associated with this activity.
   */
  userId: string;

  /**
   * The user's displayed name for quick reference in the UI.
   */
  userName: string;

  /**
   * The path or URL to the user's avatar image.
   */
  userAvatar: string;

  /**
   * The specific action or event type (e.g., CREATED, COMMENTED).
   */
  action: ActivityActionType;

  /**
   * The target or subject of the action (e.g. "Project ABC", "Task #123").
   */
  target: string;

  /**
   * Timestamp indicating when the activity occurred.
   */
  timestamp: Date;

  /**
   * Arbitrary key-value metadata for storing extended or AI-based data points.
   */
  metadata: Record<string, unknown>;

  /**
   * The real-time status of the user at the time of the event (online, busy, etc.).
   */
  status: UserStatus;

  /**
   * The priority level for the activity to help highlight critical events.
   */
  priority: ActivityPriority;
}

/**
 * Interface: TeamActivityProps
 * -----------------------------------------------------------------------------
 * Defines the full set of properties accepted by the TeamActivity component,
 * including real-time configuration, performance tuning, and error-handling
 * fallback for rendering inside an error boundary.
 */
export interface TeamActivityProps {
  /**
   * Optional custom CSS class name for the root container of the team activity feed,
   * allowing for layout or styling overrides.
   */
  className?: string;

  /**
   * The maximum number of activity items to display in the feed. If more
   * items exist, older ones can be truncated or not rendered.
   */
  maxItems?: number;

  /**
   * Interval (in milliseconds) used for optional fallback refreshing or
   * keep-alive logic if real-time updates experience connectivity issues.
   */
  refreshInterval?: number;

  /**
   * React component to be rendered when errors occur within the team activity feed,
   * following react-error-boundary's pattern. If omitted, the feed will not employ
   * a custom fallback.
   */
  errorFallback?: FC<FallbackProps>;

  /**
   * The number of reconnection attempts allowed if the WebSocket connection repeatedly fails.
   */
  retryAttempts?: number;

  /**
   * A debounce interval (in milliseconds) to delay UI updates when multiple
   * activity messages arrive in quick succession, reducing re-renders and
   * improving performance.
   */
  debounceMs?: number;
}

/**
 * Function: formatActivityMessage
 * -----------------------------------------------------------------------------
 * Produces a sanitized and possibly localized message string describing the
 * user's action. The transformation includes basic XSS protection, message
 * templating based on the ActivityActionType, optional markdown formatting,
 * and any project-specific localization logic.
 *
 * Steps outlined in the JSON specification:
 *  1. Sanitize input data for XSS prevention.
 *  2. Apply a message template based on the action type.
 *  3. Format message with localized strings (placeholder).
 *  4. Apply markdown formatting if needed (placeholder).
 *  5. Return sanitized and formatted message.
 *
 * @param activity  - The ActivityItem object providing context for the message.
 * @param locale    - A string or locale object. Implementation is omitted here,
 *                    but you could pass in "en-US" or similar to localize text.
 * @returns         - A sanitized summary of the activity for display.
 */
export function formatActivityMessage(
  activity: ActivityItem,
  locale: string
): string {
  // (1) Basic sanitization to mitigate XSS. This is a naive placeholder.
  const safeUserName = sanitizeString(activity.userName);
  const safeTarget = sanitizeString(activity.target);

  // (2) Apply a simple template based on the action:
  let messageTemplate = '';
  switch (activity.action) {
    case ActivityActionType.CREATED:
      messageTemplate = `${safeUserName} created ${safeTarget}.`;
      break;
    case ActivityActionType.UPDATED:
      messageTemplate = `${safeUserName} updated ${safeTarget}.`;
      break;
    case ActivityActionType.DELETED:
      messageTemplate = `${safeUserName} deleted ${safeTarget}.`;
      break;
    case ActivityActionType.COMMENTED:
      messageTemplate = `${safeUserName} commented on ${safeTarget}.`;
      break;
    case ActivityActionType.RESOLVED:
      messageTemplate = `${safeUserName} resolved ${safeTarget}.`;
      break;
    default:
      messageTemplate = `${safeUserName} performed an action on ${safeTarget}.`;
      break;
  }

  // (3) Format with localized strings (stubbed - using same text for all locales).
  const localizedMessage = localizeString(messageTemplate, locale);

  // (4) Apply markdown or additional transformations if needed (placeholder).
  const finalMessage = applyOptionalMarkdown(localizedMessage);

  // (5) Return the sanitized and fully processed message string.
  return finalMessage;
}

/**
 * Function: formatTimestamp
 * -----------------------------------------------------------------------------
 * Generates a user-friendly timestamp string based on a provided Date object
 * and the user's timezone or locale setting. Also calculates "time ago" style
 * differences (e.g., "2 hours ago").
 *
 * Steps from the JSON specification:
 *  1. Convert timestamp to the user's timezone.
 *  2. Calculate time difference from now.
 *  3. Apply appropriate time unit (e.g., minutes, hours, days).
 *  4. Format with localized strings (stubbed).
 *  5. Return the formatted relative time string.
 *
 * @param timestamp - The Date object representing when the activity occurred.
 * @param timezone  - The desired timezone or offset, e.g., "America/Los_Angeles".
 * @returns A final, localized string representing the relative or absolute time.
 */
export function formatTimestamp(timestamp: Date, timezone: string): string {
  // (1) Convert the timestamp to user timezone. This is a placeholder
  // demonstration. A real implementation might leverage Intl.DateTimeFormat
  // or moment-timezone library for correct transformations.
  const localTime = new Date(timestamp);

  // (2) Calculate time difference from now (in ms).
  const diffMs = Date.now() - localTime.valueOf();

  // (3) Apply a naive approach to determine time units:
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) {
    return localizeString('Just now', timezone);
  }
  if (diffMinutes < 60) {
    return localizeString(`${diffMinutes} minute(s) ago`, timezone);
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return localizeString(`${diffHours} hour(s) ago`, timezone);
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return localizeString(`${diffDays} day(s) ago`, timezone);
  }

  // Fallback: a rough, absolute date/time string:
  // (4) Format with localized strings:
  return localizeString(localTime.toLocaleString(), timezone);
}

// -----------------------------------------------------------------------------
// TeamActivity Component: Real-time feed with advanced error handling
// -----------------------------------------------------------------------------

/**
 * Component: TeamActivity
 * -----------------------------------------------------------------------------
 * An enterprise-grade, production-ready React component that displays a
 * real-time stream of team member activities and status updates using
 * WebSocket for live feeding. It includes:
 *    - Error boundary handling via react-error-boundary
 *    - Performance optimizations such as debouncing
 *    - Configurable maximum items, refresh intervals, and reconnection attempts
 *    - Intelligent use of "Avatar" to show real-time user statuses
 *    - Integration with user authentication state (useAuth)
 *
 * @param props - An object adhering to TeamActivityProps, passed to the
 *                component to customize its behavior and appearance.
 * @returns A JSX element providing the real-time team activity feed.
 */
export const TeamActivity: React.FC<TeamActivityProps> = memo(function TeamActivity(
  props: TeamActivityProps
) {
  const {
    className,
    maxItems = 20,
    refreshInterval = 60000,
    errorFallback: FallbackComponent,
    retryAttempts = 3,
    debounceMs = 300,
  } = props;

  // Acquire user session info, e.g., could be used for filtering or gating the feed.
  const { user, isAuthenticated } = useAuth();

  // Maintain an internal state of received activity items.
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // This ref helps us accumulate incoming updates and apply a debounced flush.
  const activityQueueRef = useRef<ActivityItem[]>([]);

  // Timer reference for the debouncing handle.
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Prepare the WebSocket with relevant options. "subscribe" is not provided in the
  // current useWebSocket, so we rely on the "onMessage" callback approach instead.
  const {
    isConnected,
    connect,
    disconnect,
    connectionStatus,
    metrics,
    errors,
    ping,
    messageQueue,
    reconnectAttempts,
  } = useWebSocket('team-activity', {
    autoConnect: false,
    reconnectAttempts: retryAttempts,
    reconnectInterval: 3000,
    // Encryption is configured to true by default in useWebSocket
    // We'll override or keep the defaults as needed:

    // Called whenever a new message is received by the underlying WebSocket.
    onMessage: useCallback(
      (data: any) => {
        // Expect data to match an ActivityItem structure if it's a real activity.
        // Additional type-checking or schema validation can occur here.
        if (data && data.id && data.timestamp) {
          queueActivity({
            id: data.id,
            userId: data.userId || '',
            userName: data.userName || 'Unknown User',
            userAvatar: data.userAvatar || '',
            action: data.action || ActivityActionType.CREATED,
            target: data.target || 'an item',
            timestamp: new Date(data.timestamp),
            metadata: data.metadata || {},
            status: data.status || UserStatus.OFFLINE,
            priority: data.priority || ActivityPriority.LOW,
          });
        }
      },
      []
    ),
    onConnect: useCallback(() => {
      // Could log or track that the feed connection is successful
    }, []),
    onDisconnect: useCallback(() => {
      // Possibly handle UI if we want to show "Disconnected" states
    }, []),
    onError: useCallback((error: Error) => {
      // We could handle or log the error here.
      // The feed might continue trying to reconnect as configured.
      console.error('TeamActivity WebSocket error:', error);
    }, []),
    // Additional settings
    rateLimitPerSecond: 15, // Local rate-limit if desired
  });

  /**
   * Function: queueActivity
   * -----------------------------------------------------------------------------
   * Adds a new activity item to the local queue. The actual state update to
   * "activities" is debounced to minimize re-renders if multiple messages
   * arrive in quick succession.
   *
   * @param activity - The newly received activity item.
   */
  const queueActivity = useCallback((activity: ActivityItem) => {
    activityQueueRef.current.push(activity);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    debounceTimerRef.current = setTimeout(() => {
      flushQueuedActivities();
    }, debounceMs);
  }, [debounceMs]);

  /**
   * Function: flushQueuedActivities
   * -----------------------------------------------------------------------------
   * Moves all items from the queue into the main "activities" state, respecting
   * the maximum item limit. This function is triggered after a debounce timer
   * to pool multiple updates.
   */
  const flushQueuedActivities = useCallback(() => {
    const newActivities = [...activityQueueRef.current];
    activityQueueRef.current = [];
    setActivities((prev) => {
      const combined = [...newActivities, ...prev];
      // If we want newest first, we can reverse or place them in order.
      // We'll assume newest are at the front for this demonstration.
      if (combined.length > maxItems) {
        return combined.slice(0, maxItems);
      }
      return combined;
    });
  }, [maxItems]);

  /**
   * Effect: Initialize WebSocket Connection
   * -----------------------------------------------------------------------------
   * If the user is authenticated, attempt to open the real-time feed. Otherwise,
   * ensure we disconnect. Also sets up an optional refresh interval that could
   * keep the feed alive or re-check data as a fallback, though the main feed
   * is fully real-time with websockets.
   */
  useEffect(() => {
    if (isAuthenticated) {
      // Connect once to the feed
      connect().catch((err) => {
        console.error('Failed to connect TeamActivity WebSocket:', err);
      });
    } else {
      // If not authenticated, ensure the feed is disconnected
      disconnect();
    }
    // Optional keep-alive or refresh fallback
    let refreshTimer: NodeJS.Timeout | null = null;
    if (refreshInterval > 0 && isAuthenticated) {
      refreshTimer = setInterval(() => {
        // One might re-fetch or ping the feed to keep the session alive.
        // Left as a placeholder for advanced usage: 
        // e.g., sendMessage({type: 'PING'});
      }, refreshInterval);
    }

    return () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, [isAuthenticated, connect, disconnect, refreshInterval]);

  /**
   * Cleanup on Unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Render function for a single activity item.
   * We rely on formatActivityMessage() and formatTimestamp() for final display.
   */
  const renderActivityItem = useCallback(
    (item: ActivityItem) => {
      const message = formatActivityMessage(item, 'en-US');
      const time = formatTimestamp(item.timestamp, 'en-US');
      return (
        <li
          key={item.id}
          className="team-activity__item"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.5rem 0',
            borderBottom: '1px solid var(--color-gray-200)',
          }}
        >
          <Avatar
            src={item.userAvatar}
            name={item.userName}
            size={AvatarSize.SM}
            showStatus={true}
            status={item.status}
            alt={item.userName}
          />
          <div style={{ marginLeft: '0.75rem' }}>
            <div style={{ fontWeight: 500 }}>{message}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)' }}>
              {time}
            </div>
          </div>
        </li>
      );
    },
    []
  );

  /**
   * A memoized list of rendered activity items. Using useMemo to avoid
   * unnecessary re-renders if "activities" is unchanged.
   */
  const activityList = useMemo(() => {
    if (!activities.length) {
      return (
        <li
          className="team-activity__item--empty"
          style={{ textAlign: 'center', padding: '1rem' }}
        >
          No recent activity found.
        </li>
      );
    }
    return activities.map(renderActivityItem);
  }, [activities, renderActivityItem]);

  /**
   * The main visual layout for the TeamActivity feed. Wrap in a container
   * that can handle isConnected states, error states, or additional metrics.
   */
  const MainContent = (
    <div
      className={classNames('team-activity', className)}
      style={{
        border: '1px solid var(--color-gray-300)',
        borderRadius: '4px',
        padding: '1rem',
        backgroundColor: 'var(--color-white)',
      }}
    >
      <header
        style={{
          marginBottom: '0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Team Activity</h3>
        <span style={{ fontSize: '0.9rem', color: 'var(--color-gray-600)' }}>
          {isConnected
            ? `Live • Ping: ${ping}ms • Items: ${activities.length}`
            : `Status: ${connectionStatus}`}
        </span>
      </header>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{activityList}</ul>
      {/* Additional optional metrics, errors, or info can be displayed here */}
      {errors && errors.length > 0 && (
        <div
          style={{
            marginTop: '0.75rem',
            color: 'var(--color-error)',
            fontStyle: 'italic',
          }}
        >
          <strong>Errors:</strong> {errors.map((e) => e.message).join(', ')}
        </div>
      )}
    </div>
  );

  // If a custom error fallback is provided, wrap the main content in an ErrorBoundary.
  // Otherwise, just return the main content directly.
  if (FallbackComponent) {
    return (
      <ErrorBoundary FallbackComponent={FallbackComponent}>
        {MainContent}
      </ErrorBoundary>
    );
  }

  return MainContent;
});

// -----------------------------------------------------------------------------
// Internal Utility Functions
// -----------------------------------------------------------------------------

/**
 * sanitizeString
 * -----------------------------------------------------------------------------
 * Performs a naive HTML-escaping operation on a string to reduce the possibility
 * of XSS if any untrusted data is rendered. In a real project, a robust library
 * such as DOMPurify or a server-side sanitization approach is recommended.
 *
 * @param input - Possibly unsafe string from external sources.
 * @returns A sanitized string with reserved HTML entities escaped.
 */
function sanitizeString(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * localizeString
 * -----------------------------------------------------------------------------
 * A placeholder function representing any localizable text transformation. For
 * demonstration, it simply returns the input unchanged. Real usage might rely
 * on i18n libraries like react-intl or i18next.
 *
 * @param text   - The text to be localized.
 * @param locale - The current locale identifier.
 * @returns A text string, potentially translated or altered based on locale.
 */
function localizeString(text: string, locale: string): string {
  // In practice, apply your i18n library logic here.
  return text;
}

/**
 * applyOptionalMarkdown
 * -----------------------------------------------------------------------------
 * Placeholder that might parse or inject simple Markdown transformations. In
 * a production scenario, you might use a library like marked or remark to
 * convert markdown to safe HTML.
 *
 * @param text - The input text that may contain markdown syntax.
 * @returns A string with any markdown transformations applied.
 */
function applyOptionalMarkdown(text: string): string {
  // For demonstration, we return the text unchanged.
  // Insert actual markdown parse logic if needed.
  return text;
}