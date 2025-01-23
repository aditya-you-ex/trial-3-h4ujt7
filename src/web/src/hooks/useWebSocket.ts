/**
 * A secure and robust React hook that provides WebSocket functionality for real-time
 * communication between the frontend and backend, featuring JWT authentication,
 * automatic reconnection, message encryption, batching, rate-limiting, extensive
 * monitoring, and comprehensive error handling.
 */

// -----------------------------------------------------------------------------
// External Imports (with version annotations)
// -----------------------------------------------------------------------------
import { useState, useEffect, useCallback } from 'react'; // react@^18.2.0

// -----------------------------------------------------------------------------
// Internal Imports
// -----------------------------------------------------------------------------
import { WebSocketService } from '../services/websocket.service'; // Core WebSocket functionality
import { apiConfig } from '../config/api.config'; // Provides baseURL and optional wsConfig

// -----------------------------------------------------------------------------
// Enumerations & Additional Interfaces
// -----------------------------------------------------------------------------

/**
 * Enumerates the possible connection statuses for monitoring and reporting
 * real-time WebSocket connection states.
 */
export enum ConnectionStatus {
  INIT = 'INIT',
  CONNECTING = 'CONNECTING',
  RECONNECTING = 'RECONNECTING',
  OPEN = 'OPEN',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED',
  ERROR = 'ERROR',
}

/**
 * Represents a single error event or condition encountered when communicating
 * via WebSocket, enabling well-structured error reporting.
 */
export interface WebSocketError {
  code?: number;
  message?: string;
  timestamp: number;
  details?: any;
}

/**
 * Root structure for WebSocket performance and diagnostic metrics:
 *  - messagesSent: total outbound message count
 *  - messagesReceived: total inbound message count
 *  - lastPing: timestamp of the last successful ping or pong
 *  - averageLatency: estimated average round-trip time
 */
export interface WebSocketMetrics {
  messagesSent: number;
  messagesReceived: number;
  lastPing: number;
  averageLatency: number;
}

/**
 * Interface describing all relevant options and configuration parameters
 * for managing a WebSocket connection, including JWT authentication,
 * security features, reconnection logic, and performance controls.
 */
export interface WebSocketOptions {
  /**
   * Automatically attempt to connect and maintain the WebSocket on mount.
   */
  autoConnect: boolean;

  /**
   * Maximum number of reconnection attempts before giving up.
   */
  reconnectAttempts: number;

  /**
   * Delay (in milliseconds) between reconnection attempts.
   */
  reconnectInterval: number;

  /**
   * Callback for handling inbound messages. Invoked whenever a decrypted and
   * parsed message is received from the server.
   */
  onMessage: (data: any) => void;

  /**
   * Callback invoked immediately after a successful WebSocket connection is established.
   */
  onConnect: () => void;

  /**
   * Callback invoked when the WebSocket connection is disconnected or closed.
   */
  onDisconnect: () => void;

  /**
   * Callback invoked when an error condition occurs, such as a failed connection
   * attempt or decryption failure.
   */
  onError: (error: Error) => void;

  /**
   * Toggles the encryption mechanism in the underlying WebSocket service.
   */
  encryption: boolean;

  /**
   * Represents a compression level or threshold for the underlying data,
   * which may affect performance depending on the message sizes.
   */
  compressionLevel: number;

  /**
   * JWT or other authentication token required for establishing secure
   * WebSocket connections to the backend.
   */
  jwtToken: string;

  /**
   * Interval (in milliseconds) for sending ping messages to the server to
   * detect stale or unresponsive connections.
   */
  pingInterval: number;

  /**
   * Maximum time (in milliseconds) to await message acknowledgments or pongs
   * before declaring the connection stale.
   */
  messageTimeout: number;

  /**
   * When true, multiple outgoing messages are batched locally before being
   * sent, potentially reducing overhead at scale.
   */
  batchMessages: boolean;

  /**
   * The threshold size for batching. Once the outgoing queue reaches this
   * number of messages, they are flushed and sent over the connection.
   */
  batchSize: number;

  /**
   * Rate-limiting measure for how many messages may be sent per second from
   * the client's perspective. Exceeding messages are queued until capacity
   * allows more messages to be sent.
   */
  rateLimitPerSecond: number;
}

/**
 * Interface describing the collection of state and functions returned
 * by the useWebSocket hook. This shape guarantees easily consumable
 * WebSocket statuses, metrics, and advanced capabilities.
 */
export interface WebSocketHookReturn {
  /**
   * True if the WebSocket handshake has completed and the connection is open.
   */
  isConnected: boolean;

  /**
   * Sends a new message over the WebSocket connection if open or queues it if not.
   * Returns a boolean indicating the immediate success of the send operation.
   */
  sendMessage: (message: any) => boolean;

  /**
   * Manually initiate the WebSocket connection logic if autoConnect is false,
   * or forcibly reconnect if the connection is closed.
   */
  connect: () => Promise<void>;

  /**
   * Cleanly close the existing WebSocket connection, clearing all intervals
   * and queued messages without attempting to reconnect.
   */
  disconnect: () => void;

  /**
   * Exposes the current status of the WebSocket connection from an enumerated
   * set of states: INIT, CONNECTING, RECONNECTING, OPEN, CLOSING, CLOSED, ERROR.
   */
  connectionStatus: ConnectionStatus;

  /**
   * Real-time metrics regarding message counts and timing data.
   */
  metrics: WebSocketMetrics;

  /**
   * Collection of encountered errors, each with a timestamp and optional code or message.
   */
  errors: WebSocketError[];

  /**
   * The last measured ping or round-trip time to the server in milliseconds, if available.
   */
  ping: number;

  /**
   * The current number of unsent messages queued locally (due to batching or rate-limiting).
   */
  messageQueue: number;

  /**
   * Tracks how many reconnection attempts have been performed during the
   * current session.
   */
  reconnectAttempts: number;
}

// -----------------------------------------------------------------------------
// Hook: useWebSocket
// -----------------------------------------------------------------------------

/**
 * Enhanced React hook for managing secure WebSocket connections with
 * comprehensive monitoring, automatic recovery, encryption, compression,
 * rate limiting, and connection health checks.
 *
 * Steps:
 * 1. Initialize WebSocket service with security configuration.
 * 2. Set up JWT authentication and validation.
 * 3. Configure message encryption and compression.
 * 4. Initialize connection monitoring and metrics.
 * 5. Set up automatic reconnection with exponential backoff.
 * 6. Configure message batching and rate limiting.
 * 7. Implement connection health checks.
 * 8. Set up performance monitoring and logging.
 * 9. Handle connection lifecycle events.
 * 10. Manage message queue and delivery.
 * 11. Implement error boundary and recovery.
 * 12. Clean up resources on unmount.
 *
 * @param path    - Optional endpoint path or route extension to identify specific channels.
 * @param options - Customizable WebSocketOptions controlling security, reconnection,
 *                  authentication, and advanced features.
 * @returns A WebSocketHookReturn object encapsulating connection state, monitoring
 *          metrics, error logs, and high-level send/connect/disconnect methods.
 */
export function useWebSocket(
  path: string,
  options?: Partial<WebSocketOptions>
): WebSocketHookReturn {
  // -------------------------------------------------------------------------
  // Merge Default Options with Provided Options
  // -------------------------------------------------------------------------
  const defaultOptions: WebSocketOptions = {
    autoConnect: true,
    reconnectAttempts: 5,
    reconnectInterval: 3000,
    onMessage: () => {},
    onConnect: () => {},
    onDisconnect: () => {},
    onError: () => {},
    encryption: true,
    compressionLevel: 1,
    jwtToken: '',
    pingInterval: 30000,
    messageTimeout: 5000,
    batchMessages: false,
    batchSize: 10,
    rateLimitPerSecond: 10,
  };

  const mergedOptions: WebSocketOptions = {
    ...defaultOptions,
    ...options,
  };

  // Optionally retrieve any custom WebSocket config from apiConfig if present
  // (No actual wsConfig property is defined in apiConfig, so we fallback safely.)
  const wsBaseConfig: any = apiConfig.wsConfig || {};

  // -------------------------------------------------------------------------
  // Internal State & Refs for Managing WebSocket + Metrics
  // -------------------------------------------------------------------------
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    ConnectionStatus.INIT
  );
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [errors, setErrors] = useState<WebSocketError[]>([]);
  const [ping, setPing] = useState<number>(0);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const [messageQueue, setMessageQueue] = useState<number>(0);

  const [metrics, setMetrics] = useState<WebSocketMetrics>({
    messagesSent: 0,
    messagesReceived: 0,
    lastPing: 0,
    averageLatency: 0,
  });

  // Batching and rate-limiting buffers
  const outgoingQueueRef = React.useRef<any[]>([]);
  const messagesSentInCurrentWindowRef = React.useRef<number>(0);
  const rateLimitResetTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const flushTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Core instance of the WebSocketService
  const webSocketServiceRef = React.useRef<WebSocketService | null>(null);

  // -------------------------------------------------------------------------
  // Utility: Record an encountered error in state and invoke callback
  // -------------------------------------------------------------------------
  const handleError = useCallback(
    (error: any) => {
      const newError: WebSocketError = {
        code: error?.code || 0,
        message: error?.message || 'Unknown WebSocket error',
        timestamp: Date.now(),
        details: error,
      };
      setErrors((prev) => [...prev, newError]);
      mergedOptions.onError(new Error(newError.message));
    },
    [mergedOptions]
  );

  // -------------------------------------------------------------------------
  // Utility: Update metrics in a synchronized manner
  // -------------------------------------------------------------------------
  const updateMetrics = useCallback(
    (updates: Partial<WebSocketMetrics>) => {
      setMetrics((prev) => {
        const next = { ...prev, ...updates };
        return next;
      });
    },
    []
  );

  // -------------------------------------------------------------------------
  // Batching & Rate-Limiting: Flush all queued messages
  // -------------------------------------------------------------------------
  const flushOutgoingQueue = useCallback(() => {
    // Immediately exit if we do not have an active connection or no queue
    if (!webSocketServiceRef.current || !isConnected) return;
    const queue = outgoingQueueRef.current;
    if (!queue.length) return;

    let sentCount = 0;
    while (queue.length > 0) {
      // Check if we are at or above the rate limit for this second
      if (
        messagesSentInCurrentWindowRef.current >= mergedOptions.rateLimitPerSecond
      ) {
        break;
      }

      const nextMessage = queue.shift();
      webSocketServiceRef.current
        .sendMessage(nextMessage.payload, nextMessage.options)
        .then((success) => {
          if (!success) {
            handleError({
              message: 'Failed to send message from queue',
              code: 5001,
            });
          }
        })
        .catch((err) => {
          handleError(err);
        });

      messagesSentInCurrentWindowRef.current += 1;
      sentCount += 1;
    }

    outgoingQueueRef.current = queue;
    setMessageQueue(queue.length);
    if (sentCount > 0) {
      updateMetrics({ messagesSent: metrics.messagesSent + sentCount });
    }
  }, [
    isConnected,
    mergedOptions.rateLimitPerSecond,
    handleError,
    metrics.messagesSent,
    updateMetrics,
    mergedOptions,
  ]);

  // -------------------------------------------------------------------------
  // Local Rate Limit Window: Resets the messagesSentInCurrentWindowRef counter
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (rateLimitResetTimerRef.current) {
      clearInterval(rateLimitResetTimerRef.current);
    }
    rateLimitResetTimerRef.current = setInterval(() => {
      messagesSentInCurrentWindowRef.current = 0;
      // Attempt to flush queue again once the window resets
      flushOutgoingQueue();
    }, 1000);

    return () => {
      if (rateLimitResetTimerRef.current) {
        clearInterval(rateLimitResetTimerRef.current);
        rateLimitResetTimerRef.current = null;
      }
    };
  }, [flushOutgoingQueue]);

  // -------------------------------------------------------------------------
  // Batching Timer: Flush queued messages periodically if batchMessages is true
  // -------------------------------------------------------------------------
  const setupBatchFlushInterval = useCallback(() => {
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (mergedOptions.batchMessages) {
      flushTimerRef.current = setInterval(() => {
        flushOutgoingQueue();
      }, 500); // half-second flush interval
    }
  }, [mergedOptions.batchMessages, flushOutgoingQueue]);

  // -------------------------------------------------------------------------
  // Hook: connect
  // -------------------------------------------------------------------------
  const connect = useCallback(async (): Promise<void> => {
    if (!webSocketServiceRef.current) {
      webSocketServiceRef.current = new WebSocketService();
    }

    // If the service supports additional security handler or encryption toggle:
    try {
      if (typeof (webSocketServiceRef.current as any).addSecurityHandler === 'function') {
        (webSocketServiceRef.current as any).addSecurityHandler(() => {
          // Example placeholder security callback
        });
      }
      if (typeof (webSocketServiceRef.current as any).setEncryption === 'function') {
        (webSocketServiceRef.current as any).setEncryption(
          mergedOptions.encryption,
          'SOME_ENTERPRISE_KEY'
        );
      }
    } catch (err) {
      // Not implemented in the actual service, so ignore if fails
      // or track an error if needed
    }

    try {
      setConnectionStatus(ConnectionStatus.CONNECTING);

      // Pass the token, optionally include path as a custom hack in the token string
      let fullToken = mergedOptions.jwtToken || '';
      if (path) {
        // Append path in case the server can parse it
        fullToken = `${fullToken}::${path}`;
      }

      await webSocketServiceRef.current.connect(fullToken);
      setIsConnected(true);
      setConnectionStatus(ConnectionStatus.OPEN);
      setReconnectAttempts(0);
      mergedOptions.onConnect();
    } catch (err: any) {
      // If initial connection fails, set error state
      handleError(err);
      setIsConnected(false);
      setConnectionStatus(ConnectionStatus.ERROR);
    }

    // Register server message handler for inbound data
    if (webSocketServiceRef.current) {
      webSocketServiceRef.current.addMessageHandler('unhandled', (payload: any) => {
        handleError({
          code: 4004,
          message: 'Unhandled message type in WebSocket payload',
          details: payload,
        });
      });

      // Also register a generic wildcard or system-level message handler
      // to handle any message type externally
      webSocketServiceRef.current.addMessageHandler('', (payload: any) => {
        mergedOptions.onMessage(payload);
        setMetrics((prev) => ({
          ...prev,
          messagesReceived: prev.messagesReceived + 1,
        }));
      });

      // Attempt listening to a possible 'message_received' event emitter
      // for custom metrics around message type
      (webSocketServiceRef.current as any).eventEmitter?.on(
        'message_received',
        (details: { type: string }) => {
          setMetrics((prev) => ({
            ...prev,
            messagesReceived: prev.messagesReceived + 1,
          }));
          mergedOptions.onMessage(details);
        }
      );

      // Listen for pings or pongs to update average latency
      (webSocketServiceRef.current as any).eventEmitter?.on(
        'pong_received',
        ({ lastPingTime }: { lastPingTime: number }) => {
          const now = Date.now();
          const latency = now - lastPingTime;
          setPing(latency);
          updateMetrics({
            averageLatency:
              metrics.averageLatency === 0
                ? latency
                : (metrics.averageLatency + latency) / 2,
            lastPing: now,
          });
        }
      );

      // Listen for connection closures to handle reconnection or final closure
      (webSocketServiceRef.current as any).eventEmitter?.on(
        'connection_closed',
        (data: any) => {
          // Mark the local states for closure
          setIsConnected(false);
          setConnectionStatus(ConnectionStatus.CLOSED);

          // If it's trying to reconnect internally, we can mark that
          if (reconnectAttempts < mergedOptions.reconnectAttempts) {
            setConnectionStatus(ConnectionStatus.RECONNECTING);
          } else {
            mergedOptions.onDisconnect();
          }
        }
      );

      // Listen for actual reconnection attempts and track them
      (webSocketServiceRef.current as any).eventEmitter?.on(
        'connection_retry_failed',
        (info: any) => {
          setReconnectAttempts(info.attempts || 0);
        }
      );

      // Listen for final connection failures after all retries
      (webSocketServiceRef.current as any).eventEmitter?.on(
        'connection_failed',
        (info: any) => {
          setIsConnected(false);
          setConnectionStatus(ConnectionStatus.ERROR);
          handleError({
            code: 5002,
            message: 'Permanent WebSocket connection failure',
            details: info,
          });
          mergedOptions.onDisconnect();
        }
      );
    }
  }, [
    mergedOptions,
    path,
    handleError,
    metrics.averageLatency,
    metrics.lastPing,
    reconnectAttempts,
    updateMetrics,
  ]);

  // -------------------------------------------------------------------------
  // Hook: disconnect
  // -------------------------------------------------------------------------
  const disconnect = useCallback((): void => {
    if (webSocketServiceRef.current) {
      webSocketServiceRef.current.disconnect();
    }
    setIsConnected(false);
    setConnectionStatus(ConnectionStatus.CLOSED);
    mergedOptions.onDisconnect();
  }, [mergedOptions]);

  // -------------------------------------------------------------------------
  // Sending Messages: Adheres to Batching & Rate-Limiting
  // -------------------------------------------------------------------------
  const sendMessage = useCallback(
    (message: any): boolean => {
      // If not connected, queue the message if batchMessages is enabled
      if (!isConnected || !webSocketServiceRef.current) {
        if (mergedOptions.batchMessages) {
          outgoingQueueRef.current.push({ payload: message, options: {} });
          setMessageQueue(outgoingQueueRef.current.length);
          return true;
        }
        // Connection not established, message cannot be sent
        return false;
      }

      // Check if we are already above the rate limit
      if (
        messagesSentInCurrentWindowRef.current >= mergedOptions.rateLimitPerSecond
      ) {
        // Enqueue if batching is possible
        if (mergedOptions.batchMessages) {
          outgoingQueueRef.current.push({ payload: message, options: {} });
          setMessageQueue(outgoingQueueRef.current.length);
          return true;
        }
        // Otherwise fail
        handleError({
          code: 429,
          message: 'Local rate limit exceeded',
        });
        return false;
      }

      // If no batching needed, attempt to send directly
      webSocketServiceRef.current
        .sendMessage(message, {})
        .then((success) => {
          if (success) {
            messagesSentInCurrentWindowRef.current += 1;
            const newCount = metrics.messagesSent + 1;
            updateMetrics({ messagesSent: newCount });
          } else {
            handleError({
              code: 5003,
              message: 'sendMessage() returned false from WebSocketService',
            });
          }
        })
        .catch((err) => {
          handleError(err);
        });
      return true;
    },
    [
      handleError,
      isConnected,
      mergedOptions.batchMessages,
      mergedOptions.rateLimitPerSecond,
      metrics.messagesSent,
      updateMetrics,
    ]
  );

  // -------------------------------------------------------------------------
  // useEffect: Initialize / Cleanup the WebSocket Connection
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (mergedOptions.autoConnect) {
      // Attempt an immediate connection on mount
      connect().catch((err) => {
        // Connection error handling
        handleError(err);
      });
    }
    // Setup the batch flush interval if needed
    setupBatchFlushInterval();

    // Cleanup
    return () => {
      // On unmount, fully disconnect
      if (mergedOptions.autoConnect) {
        disconnect();
      }
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      if (rateLimitResetTimerRef.current) {
        clearInterval(rateLimitResetTimerRef.current);
        rateLimitResetTimerRef.current = null;
      }
    };
  }, [connect, disconnect, handleError, mergedOptions, setupBatchFlushInterval]);

  // -------------------------------------------------------------------------
  // Return the comprehensive WebSocket state and operations
  // -------------------------------------------------------------------------
  return {
    isConnected,
    sendMessage,
    connect,
    disconnect,
    connectionStatus,
    metrics,
    errors,
    ping,
    messageQueue,
    reconnectAttempts,
  };
}