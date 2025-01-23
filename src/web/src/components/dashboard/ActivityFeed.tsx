/**
 * -------------------------------------------------------------------------------
 * File: ActivityFeed.tsx
 * Location: src/web/src/components/dashboard
 * Description:
 *   A real-time activity feed component that displays recent team activities,
 *   task updates, and system notifications in the dashboard. Implements
 *   enhanced error handling, accessibility, performance optimizations, and
 *   integration with TaskStream AI's NotificationService for robust retry
 *   mechanics and real-time collaboration.
 *
 * Requirements Addressed:
 *   1) Real-Time Collaboration (Section 1.2 High-Level Description)
 *      - Subscribes to real-time notifications with retry logic.
 *   2) User Interface Design (Section 6.2 Main Dashboard/Team Activity)
 *      - Renders team activity feed with user avatars, timestamps, and
 *        accessibility support.
 *   3) Component Library (Section 3.1.2 Component Library)
 *      - Implements progressive loading, virtual scrolling, and design
 *        system adherence.
 *
 * External Dependencies (IE2):
 *   - React ^18.0.0                     // react@^18.0.0
 *   - date-fns ^2.30.0                  // date-fns@^2.30.0
 *   - @tanstack/react-virtual ^3.0.0    // @tanstack/react-virtual@^3.0.0
 *
 * Internal Dependencies (IE1):
 *   - Avatar, { src, name, size: Size } from '../common/Avatar'
 *   - useAuth, { user: User | null, isAuthenticated: boolean } from '../../hooks/useAuth'
 *   - NotificationService, { getNotificationStream, reconnect } from '../../services/notification.service'
 *   - ErrorBoundary, { onError } from '../common/ErrorBoundary'
 *
 * Enterprise-Grade Compliance:
 *   - Thorough error-handling with exponential backoff for real-time subscription
 *   - Strict TypeScript interfaces for props, activity items, and function returns
 *   - Performance enhancements with conditional virtualization
 *   - Accessibility: roles, aria attributes, user avatar alt text
 *
 * -------------------------------------------------------------------------------
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  MutableRefObject,
  FC,
} from 'react'; // react@^18.0.0

import { formatDistanceToNow } from 'date-fns'; // date-fns@^2.30.0
import { useVirtualizer } from '@tanstack/react-virtual'; // @tanstack/react-virtual@^3.0.0

// Internal imports
import { useAuth } from '../../hooks/useAuth';
import { NotificationService } from '../../services/notification.service';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { Avatar, Size } from '../common/Avatar';

/**
 * Interface: ActivityFeedProps
 * -----------------------------------------------------------------------------
 * Props for the ActivityFeed component with enhanced configuration options.
 */
export interface ActivityFeedProps {
  /**
   * maxItems
   * ---------------------------------------------------------------------------
   * Maximum number of activity items to display. Older entries exceeding the
   * limit may be trimmed for performance or design constraints.
   */
  maxItems: number;

  /**
   * showAvatar
   * ---------------------------------------------------------------------------
   * If true, displays an avatar for each activity item indicating the user
   * associated with that action.
   */
  showAvatar: boolean;

  /**
   * className
   * ---------------------------------------------------------------------------
   * Optional CSS class to apply custom styling or overrides to the root feed
   * container.
   */
  className: string;

  /**
   * refreshInterval
   * ---------------------------------------------------------------------------
   * Interval in milliseconds for re-checking or refetching data if needed.
   * This may be used in tandem with real-time subscriptions for fallback.
   */
  refreshInterval: number;

  /**
   * retryAttempts
   * ---------------------------------------------------------------------------
   * Maximum number of retry attempts for the subscription reacquisition logic
   * if errors occur in the real-time feed.
   */
  retryAttempts: number;

  /**
   * enableVirtualization
   * ---------------------------------------------------------------------------
   * If set to true, the component uses virtual scrolling to optimize
   * performance for large lists of activity items.
   */
  enableVirtualization: boolean;
}

/**
 * Interface: ActivityItem
 * -----------------------------------------------------------------------------
 * Structure of an activity item with enhanced metadata, suitable for
 * real-time collaboration feeds. Reflects user-based actions, timestamps,
 * categories, and read status.
 */
export interface ActivityItem {
  /**
   * Unique identifier for this activity record.
   */
  id: string;

  /**
   * The unique user ID associated with this activity.
   */
  userId: string;

  /**
   * The display name (full name, handle) of the user performing the action.
   */
  userName: string;

  /**
   * A URL or data string for the user's avatar image.
   */
  userAvatar: string;

  /**
   * Short string describing the type of action that occurred (e.g. "created",
   * "updated", "commented").
   */
  action: string;

  /**
   * The target or subject of the action, such as a task name or resource.
   */
  target: string;

  /**
   * The exact time this activity happened, stored as a Date object.
   */
  timestamp: Date;

  /**
   * Category or custom grouping for the action (e.g. "task", "system", "comment").
   */
  category: string;

  /**
   * Indicates whether the current user has seen or read this item.
   */
  isRead: boolean;
}

/**
 * Function: formatActivityMessage
 * -----------------------------------------------------------------------------
 * Formats activity message from item data with localization support.
 * Steps to accomplish the formatting:
 *  1) Extract user name and action from the activity item.
 *  2) Apply localization to message template (placeholder approach).
 *  3) Format with target information if applicable.
 *  4) Apply security sanitization to remove potential HTML or script tags.
 *  5) Return the final, user-friendly message string.
 *
 * @param item   An object of type ActivityItem.
 * @param locale A string representing a locale or language preference.
 * @returns A localized and formatted activity message.
 */
export function formatActivityMessage(item: ActivityItem, locale: string): string {
  const baseMessage = `${item.userName} ${item.action} ${item.target}`;
  let localizedMessage = baseMessage;

  // Basic placeholder for applying a "locale". Could expand with i18n capabilities.
  if (locale.toLowerCase().startsWith('en')) {
    localizedMessage = baseMessage;
  }

  // Security sanitization: remove HTML tags and suspicious scripts from message.
  const sanitized = localizedMessage.replace(/<[^>]+>/g, '');

  return sanitized;
}

/**
 * Hook: useActivityStream
 * -----------------------------------------------------------------------------
 * Custom hook for managing activity stream subscriptions. Integrates with the
 * NotificationService to receive real-time updates for collaboration. Also
 * implements retry logic with exponential backoff for robust error handling.
 *
 * Steps:
 *  1) Initialize WebSocket-like subscription or internal stream from NotificationService.
 *  2) Set up retry logic with exponential backoff if the connection fails.
 *  3) Handle connection errors and attempt recovery.
 *  4) Manage subscription lifecycle and store updates in React state.
 *  5) Clean up on unmount to prevent memory leaks.
 *
 * @param refreshInterval Interval (ms) for manual fallback refresh logic.
 * @param retryAttempts   Number of times to try reconnecting upon errors.
 * @returns An object with:
 *   - activities: The list of ActivityItems.
 *   - error: Any connection or subscription error encountered.
 *   - status: A short string describing the subscription status.
 *   - forceReconnect: A function to manually invoke a reconnection attempt.
 */
export function useActivityStream(refreshInterval: number, retryAttempts: number) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');

  const retryCountRef: MutableRefObject<number> = useRef(0);
  const notificationServiceRef = useRef<NotificationService | null>(null);
  const subscriptionRef = useRef<ReturnType<NotificationService['getNotificationStream']> | null>(
    null
  );

  /**
   * forceReconnect
   * ---------------------------------------------------------------------------
   * Exposed function allowing the consumer to manually trigger a reconnection
   * attempt (resetting error state and applying exponential backoff again).
   */
  const forceReconnect = useCallback(() => {
    setError(null);
    retryCountRef.current = 0;
    setStatus('connecting');

    // Attempt a manual reconnect using NotificationService's reconnect logic
    if (notificationServiceRef.current) {
      notificationServiceRef.current.reconnect();
    }
  }, []);

  /**
   * subscribeToStream
   * ---------------------------------------------------------------------------
   * Encapsulates the subscription logic to the notification stream. Applies
   * exponential backoff on errors, up to the specified retryAttempts.
   */
  const subscribeToStream = useCallback(() => {
    // If we already have a subscription, unsubscribe first to avoid duplicates.
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    setStatus('connecting');
    const service = notificationServiceRef.current;
    if (!service) {
      return;
    }

    // Subscribe to the notificationSubject from NotificationService
    subscriptionRef.current = service.getNotificationStream().subscribe({
      next: (notification) => {
        // Minimal example of extracting ActivityItem from notification
        // In a real system, we'd confirm structure or type before updating
        const maybeActivity = notification.data?.activityItem as ActivityItem | undefined;
        if (maybeActivity && maybeActivity.id) {
          setActivities((prev) => [maybeActivity, ...prev].slice(0, 1000));
        }
        setStatus('connected');
      },
      error: (err: unknown) => {
        setStatus('error');
        setError(String(err));
        retryCountRef.current += 1;

        if (retryCountRef.current <= retryAttempts) {
          // Exponential backoff: base times attempt^2 for demonstration
          const delay = 1000 * Math.pow(2, retryCountRef.current);
          setTimeout(() => {
            if (service) {
              service.reconnect();
              subscribeToStream();
            }
          }, delay);
        }
      },
    });
  }, [retryAttempts]);

  /**
   * useEffect: Initialize NotificationService and subscription on mount.
   * Clean up on unmount to avoid memory leaks.
   */
  useEffect(() => {
    // Create a single instance of NotificationService or assume DI from a global
    notificationServiceRef.current = new NotificationService({
      webSocketUrl: '', // If needed, specify a real URL
      persistNotifications: false,
      enableAccessibility: true,
    });

    subscribeToStream();

    // Cleanup on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [subscribeToStream]);

  /**
   * useEffect: Optional fallback refresh logic based on refreshInterval.
   * If the real-time updates fail or are not triggered frequently, we
   * could poll or re-check data here. This is a placeholder approach.
   */
  useEffect(() => {
    if (refreshInterval > 0) {
      const timer = setInterval(() => {
        // Potentially refetch or validate the connection
        // Example: Attempt silent reconnection if status='error'
        if (status === 'error' && notificationServiceRef.current) {
          // Attempt a direct reconnect
          forceReconnect();
        }
      }, refreshInterval);

      return () => clearInterval(timer);
    }
  }, [refreshInterval, status, forceReconnect]);

  return {
    activities,
    error,
    status,
    forceReconnect,
  };
}

/**
 * Component: ActivityFeed
 * -----------------------------------------------------------------------------
 * The main, reusable activity feed component with real-time updates, optional
 * virtualization for large lists, user avatar display, and robust error handling
 * via ErrorBoundary. Conforms to the design, accessibility, and performance
 * standards of TaskStream AI.
 *
 * Exports Named Props (members_exposed):
 *   - maxItems: number
 *   - showAvatar: boolean
 *   - className: string
 *   - refreshInterval: number
 *   - retryAttempts: number
 *   - enableVirtualization: boolean
 *
 * @param props ActivityFeedProps
 * @returns JSX.Element
 */
export const ActivityFeed: FC<ActivityFeedProps> = ({
  maxItems,
  showAvatar,
  className,
  refreshInterval,
  retryAttempts,
  enableVirtualization,
}) => {
  // Access the current user if needed (securely) for read toggles or personalization
  const { user, isAuthenticated } = useAuth();

  // Use our custom hook to manage the real-time stream of activity items
  const { activities, error, status, forceReconnect } = useActivityStream(
    refreshInterval,
    retryAttempts
  );

  // Derived or truncated list limiting to maxItems
  const slicedActivities = useMemo<ActivityItem[]>(() => {
    return activities.slice(0, maxItems);
  }, [activities, maxItems]);

  /**
   * Virtualization Setup
   * ---------------------------------------------------------------------------
   * If enableVirtualization is true, we use the TanStack React Virtual library
   * to render only the visible rows. Otherwise, we simply render all items in
   * the DOM. This helps with performance for large activity streams.
   */
  const parentRef = useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: slicedActivities.length,
    // We approximate each item height in pixels for demonstration
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  // Render function for a single activity row
  const renderActivityRow = useCallback(
    (item: ActivityItem, index: number) => {
      const distance = formatDistanceToNow(item.timestamp, { addSuffix: true });
      const message = formatActivityMessage(item, 'en-US');

      return (
        <div
          key={item.id}
          className="flex border-b border-gray-200 py-2 px-3 items-center"
          style={{ width: '100%' }}
          data-testid={`activity-row-${index}`}
        >
          {showAvatar && (
            <div className="mr-3">
              <Avatar
                src={item.userAvatar}
                name={item.userName}
                size={Size.SM}
                alt={`${item.userName} avatar`}
              />
            </div>
          )}
          <div className="flex-1 flex flex-col">
            <span className="text-sm text-gray-900">{message}</span>
            <span className="text-xs text-gray-500">{distance}</span>
          </div>
        </div>
      );
    },
    [showAvatar]
  );

  /**
   * The main content of the feed, rendered differently based on the
   * enableVirtualization flag. We can use rowVirtualizer if virtualization
   * is enabled, or simply map over slicedActivities otherwise.
   */
  const feedContent = enableVirtualization ? (
    <div
      ref={parentRef}
      style={{
        height: '400px',
        overflow: 'auto',
      }}
      className="relative w-full"
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
          width: '100%',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const activity = slicedActivities[virtualRow.index];
          return (
            <div
              key={activity.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderActivityRow(activity, virtualRow.index)}
            </div>
          );
        })}
      </div>
    </div>
  ) : (
    <div className="w-full max-h-96 overflow-auto" data-testid="non-virtual-feed">
      {slicedActivities.map((item, idx) => renderActivityRow(item, idx))}
    </div>
  );

  /**
   * ErrorView
   * ---------------------------------------------------------------------------
   * Conditionally rendered if the real-time subscription fails. Allows the
   * user to manually retry establishing a connection. This is in addition
   * to the automatic exponential backoff from useActivityStream.
   */
  const ErrorView = error ? (
    <div className="text-red-600 text-sm p-2 bg-red-50 border border-red-200 rounded my-2 flex justify-between items-center">
      <span className="mr-2">Real-time feed encountered an error: {error}</span>
      <button
        onClick={forceReconnect}
        className="text-blue-600 font-medium underline"
        type="button"
      >
        Retry
      </button>
    </div>
  ) : null;

  /**
   * AuthWarning
   * ---------------------------------------------------------------------------
   * If the user isn't authenticated, we can show a simple message or block usage.
   * This component is optional, assuming some feeds might be publicly viewable.
   */
  const AuthWarning = !isAuthenticated ? (
    <div className="text-yellow-700 bg-yellow-50 px-4 py-2 border border-yellow-200 rounded text-sm my-2">
      You are not authenticated. Activity feed may be limited or unavailable.
    </div>
  ) : null;

  /**
   * ConnectionStatus
   * ---------------------------------------------------------------------------
   * A small UI snippet reflecting the subscription status: 'connecting',
   * 'connected', or 'error'. This can be displayed anywhere relevant in the UI.
   */
  const ConnectionStatus = (
    <div className="text-xs text-gray-400 italic mb-2">
      Status: <span data-testid="connection-status">{status}</span>
    </div>
  );

  return (
    <ErrorBoundary
      // Capture any unexpected rendering or runtime errors within the feed
      onError={(err) => {
        // In production, we could log or track this error in detail
        // console.error('ActivityFeed boundary error:', err);
      }}
    >
      <div className={`ts-activity-feed ${className}`}>
        {ConnectionStatus}
        {AuthWarning}
        {ErrorView}
        {feedContent}
      </div>
    </ErrorBoundary>
  );
};

export { maxItems, showAvatar, className, refreshInterval, retryAttempts, enableVirtualization } from './ActivityFeed.types';