/**
 * Implements a WebSocket service for real-time communication between the frontend
 * and backend, handling connection management, message processing, automatic
 * reconnection, and extensive security features such as encryption, authentication,
 * and monitoring of performance metrics.
 */

// -----------------------------------------------------------------------------
// External Imports (with version annotations)
// -----------------------------------------------------------------------------
import { EventEmitter } from 'events'; // ^3.3.0
import CryptoJS from 'crypto-js'; // ^4.1.1

// -----------------------------------------------------------------------------
// Internal Imports
// -----------------------------------------------------------------------------
import { apiConfig } from '../config/api.config';
import { API_VERSION } from '../constants/api.constants';

// -----------------------------------------------------------------------------
// Global Constants & Auxiliary Types
// -----------------------------------------------------------------------------

/**
 * Maximum number of reconnection attempts before giving up.
 */
const WS_RECONNECT_ATTEMPTS: number = 5;

/**
 * Delay (in milliseconds) between reconnection attempts.
 */
const WS_RECONNECT_INTERVAL: number = 3000;

/**
 * Interval (in milliseconds) for sending ping messages to detect stale connections.
 */
const WS_PING_INTERVAL: number = 30000;

/**
 * Maximum time (in milliseconds) to await message acknowledgments or responses.
 * Used to monitor potential delays or dropped messages.
 */
const WS_MESSAGE_TIMEOUT: number = 5000;

/**
 * Maximum allowed size (in bytes) for sending a single WebSocket message.
 * Messages exceeding this threshold are rejected to maintain performance and stability.
 */
const WS_MAX_MESSAGE_SIZE: number = 1048576;

/**
 * Message size (in bytes) above which we attempt compression before encryption.
 */
const WS_COMPRESSION_THRESHOLD: number = 1024;

/**
 * Optional interface for extended message-sending parameters such as type, priority, and others.
 * This allows the developer to pass additional metadata for more customized handling within the backend.
 */
export interface MessageOptions {
  /**
   * Identifies a category or type of message for routing and handling on the server side.
   */
  type?: string;

  /**
   * Indicates priority or other custom fields relevant to the message.
   */
  priority?: string;

  /**
   * Any other metadata (user-defined) for advanced usage scenarios.
   */
  [key: string]: any;
}

/**
 * Describes the structure of the decrypted message payload for incoming events.
 * We assume an object with a 'type' field that helps route to different message handlers.
 */
interface DecryptedPayload {
  type?: string;
  [key: string]: any;
}

// -----------------------------------------------------------------------------
// Class: WebSocketService
// -----------------------------------------------------------------------------
export class WebSocketService {
  /**
   * Underlying WebSocket connection instance. May be undefined if not connected.
   */
  private connection?: WebSocket;

  /**
   * EventEmitter used internally to dispatch connection and diagnostic events
   * for real-time monitoring or debugging.
   */
  private eventEmitter: EventEmitter;

  /**
   * Tracks if the current WebSocket connection is open and authenticated.
   */
  private isConnected: boolean;

  /**
   * Number of reconnection attempts performed so far.
   */
  private reconnectAttempts: number;

  /**
   * Periodic interval timer for sending ping messages to the backend.
   * Helps detect stale or dead connections.
   */
  private pingInterval?: NodeJS.Timeout;

  /**
   * Authentication token (JWT or other) used to connect and validate
   * user/agent identity for WebSocket communication.
   */
  private authToken: string;

  /**
   * Stores callbacks for different message types or events received from the server.
   */
  private messageHandlers: Map<string, Function>;

  /**
   * Tracks the timestamp of the last received pong or successful communication from the server.
   * Used to monitor connection health.
   */
  private lastPingTime: number;

  /**
   * Counts the total number of outbound messages to assist with performance metrics
   * and system-level monitoring.
   */
  private messageCount: number;

  /**
   * An optional private key or passphrase for symmetric encryption of messages.
   * In a production environment, avoid hardcoding keys in code.
   */
  private encryptionKey: string;

  /**
   * Constructor initializes the internal event emitter, sets initial states,
   * and prepares the service for eventual connection.
   * No active WebSocket connection is created here; invoke connect() to start.
   */
  constructor() {
    // Instantiate an EventEmitter for connection or diagnostic events.
    this.eventEmitter = new EventEmitter();

    // Initially, there is no open connection.
    this.isConnected = false;

    // Reset reconnection attempts.
    this.reconnectAttempts = 0;

    // Initially, we do not have a valid authentication token.
    this.authToken = '';

    // Prepare a map to store message handlers keyed by message type.
    this.messageHandlers = new Map<string, Function>();

    // Record the last ping time as 0 to indicate no communication yet.
    this.lastPingTime = 0;

    // Initialize message count to 0.
    this.messageCount = 0;

    // Example encryption key or passphrase. For real systems, retrieve from secrets management.
    this.encryptionKey = 'ENTERPRISE_GRADE_SECRET_32CHAR_KEY';
  }

  /**
   * Establishes a secure WebSocket connection using the provided authentication token.
   * The method automatically configures event listeners for error handling, message reception,
   * ping/pong communication, and reconnection logic.
   *
   * @param token - A valid JWT or equivalent token for server-side authentication.
   * @returns A Promise that resolves once the connection is successfully opened.
   */
  public async connect(token: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Store the token for use in subsequent reconnections or message inits.
      this.authToken = token;

      try {
        // Derive protocol based on apiConfig.baseURL (http -> ws, https -> wss).
        const isSecure: boolean = apiConfig.baseURL.startsWith('https');
        const wsProtocol: string = isSecure ? 'wss' : 'ws';

        // Convert any http(s):// in the base URL so we reuse host and port. Remove trailing slashes.
        const strippedUrl: string = apiConfig.baseURL.replace(/^http(s?):\/\//, '').replace(/\/+$/, '');

        /**
         * Construct final WebSocket endpoint including:
         * 1. The base URL host.
         * 2. API version (as an example path or query parameter).
         * 3. Optional query parameters to carry the token for authentication.
         */
        const wsUrl: string = `${wsProtocol}://${strippedUrl}/realtime?version=${API_VERSION}&auth=${encodeURIComponent(
          this.authToken
        )}`;

        // Create a brand-new WebSocket connection instance.
        this.connection = new WebSocket(wsUrl);

        // Handle connection open event.
        this.connection.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.lastPingTime = Date.now();
          this.eventEmitter.emit('connection_opened', { timestamp: this.lastPingTime });
          this.initPingPong();
          resolve();
        };

        // Handle connection close event with automatic retry logic if applicable.
        this.connection.onclose = () => {
          this.isConnected = false;
          this.eventEmitter.emit('connection_closed', { reconnecting: true });

          // Attempt reconnection if we have not exceeded allowable attempts.
          if (this.reconnectAttempts < WS_RECONNECT_ATTEMPTS) {
            this.reconnectAttempts++;
            setTimeout(() => {
              this.connect(this.authToken).catch(() => {
                // If we fail again, emit an event for potential logging.
                this.eventEmitter.emit('connection_retry_failed', { attempts: this.reconnectAttempts });
              });
            }, WS_RECONNECT_INTERVAL);
          } else {
            // We have exhausted reconnection attempts, broadcast failure.
            this.eventEmitter.emit('connection_failed', { reason: 'Max attempts reached' });
          }
        };

        // Handle connection error event to diagnose issues. The onclose will handle reconnection.
        this.connection.onerror = (error) => {
          this.eventEmitter.emit('connection_error', { error, attempt: this.reconnectAttempts });
        };

        // Handle incoming messages from the server.
        this.connection.onmessage = (event: MessageEvent) => {
          this.handleIncomingMessage(event);
        };
      } catch (err) {
        this.eventEmitter.emit('connection_error', { error: err });
        reject(err);
      }
    });
  }

  /**
   * Safely closes the current WebSocket connection if open, clears any intervals,
   * and resets internal metrics and security contexts. This function is a final
   * shutdown method and does not attempt any reconnection.
   */
  public disconnect(): void {
    // Clear ping interval if it exists.
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }

    // Close the WebSocket if it's currently open.
    if (this.connection && this.isConnected) {
      this.connection.close();
    }

    // Reset the connection state.
    this.isConnected = false;
    this.authToken = '';
    this.connection = undefined;
    this.reconnectAttempts = 0;
    this.lastPingTime = 0;
    this.messageCount = 0;

    // Clear out any registered message handlers.
    this.messageHandlers.clear();

    // Emit a cleanup event to allow external subscribers to free up resources as needed.
    this.eventEmitter.emit('connection_disconnected');
  }

  /**
   * Sends an encrypted message through the current WebSocket connection, applying
   * optional compression if the payload exceeds a configurable threshold. Returns
   * a Promise resolving to a boolean indicating whether the message was successfully sent.
   *
   * @param message - The core message object or payload to send.
   * @param options - Additional message options such as type or priority.
   * @returns A Promise that resolves to a boolean indicating the outcome of the send operation.
   */
  public async sendMessage(message: any, options: MessageOptions = {}): Promise<boolean> {
    // Check if the connection is actually open before sending.
    if (!this.isConnected || !this.connection) {
      this.eventEmitter.emit('send_failed', { reason: 'WebSocket not connected' });
      return false;
    }

    try {
      // Stringify and compress (if needed) prior to encryption.
      let rawData: string = JSON.stringify(message);
      if (rawData.length > WS_COMPRESSION_THRESHOLD) {
        // In a production environment, implement a robust compression algorithm (e.g., gzip).
        // Here, illustrate concept only (placeholder).
        rawData = this.simpleCompression(rawData);
      }

      // Encrypt the message using the provided encryption key.
      const ciphertext = CryptoJS.AES.encrypt(rawData, this.encryptionKey).toString();

      /**
       * Construct final payload, including:
       *  - Encrypted data.
       *  - Timestamp for reference.
       *  - Optional message metadata such as type or priority.
       */
      const finalPayload = {
        encrypted: ciphertext,
        metadata: {
          options,
          timestamp: Date.now(),
        },
      };

      // Convert payload to string for sending over WebSocket.
      const payloadString = JSON.stringify(finalPayload);

      // Validate overall size constraints before sending.
      if (payloadString.length > WS_MAX_MESSAGE_SIZE) {
        this.eventEmitter.emit('send_failed', { reason: 'Message exceeds max allowed size' });
        return false;
      }

      // Transmit message over the WebSocket:
      // Browser-based WebSockets only support .send(string | Blob | ArrayBuffer).
      this.connection.send(payloadString);

      // Update internal metrics.
      this.messageCount++;
      this.eventEmitter.emit('message_sent', { messageCount: this.messageCount });

      return true;
    } catch (error) {
      this.eventEmitter.emit('send_error', { error });
      return false;
    }
  }

  /**
   * Registers a handler callback for a given message type or event identifier to manage
   * incoming data from the server. If a handler is already mapped to the same type,
   * it will be replaced.
   *
   * @param eventType - Identifies the category or type of inbound message.
   * @param handler - A callback function to handle the decrypted message object.
   */
  public addMessageHandler(eventType: string, handler: Function): void {
    this.messageHandlers.set(eventType, handler);
  }

  // -----------------------------------------------------------------------------
  // Private/Internal Methods
  // -----------------------------------------------------------------------------

  /**
   * Sets up a periodic interval to send ping messages to the server. If no response
   * (via pong) is received within the WS_MESSAGE_TIMEOUT, we assume the connection
   * is stale and close it to trigger the reconnection flow.
   */
  private initPingPong(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (!this.connection || !this.isConnected) {
        return;
      }

      // Check time elapsed since last pong to detect unresponsive connections.
      const now = Date.now();
      if (now - this.lastPingTime > WS_MESSAGE_TIMEOUT) {
        // Force closure to trigger reconnection if needed.
        this.eventEmitter.emit('ping_timeout', { lastPingTime: this.lastPingTime });
        if (this.connection.readyState === WebSocket.OPEN) {
          this.connection.close();
        }
        return;
      }

      // Use "ping" as a standard text message since browsers do not expose low-level ping frames.
      try {
        this.connection.send(JSON.stringify({ type: 'ping', timestamp: now }));
      } catch (err) {
        this.eventEmitter.emit('ping_send_error', { error: err });
      }
    }, WS_PING_INTERVAL);
  }

  /**
   * Processes incoming messages by decrypting and optionally decompressing them,
   * then dispatching them to any registered handlers matching the 'type' field
   * within the decrypted payload.
   *
   * @param event - The raw MessageEvent coming from the WebSocket onmessage callback.
   */
  private handleIncomingMessage(event: MessageEvent): void {
    let decryptedPayload: DecryptedPayload | null = null;

    try {
      // Parse the received data into JSON.
      const dataObject = JSON.parse(event.data);
      if (!dataObject.encrypted) {
        // Possibly a plain message (e.g., "pong" or system-level).
        this.handleSystemMessage(dataObject);
        return;
      }

      // Decrypt using the same encryption key.
      const bytes = CryptoJS.AES.decrypt(dataObject.encrypted, this.encryptionKey);
      const rawString: string = bytes.toString(CryptoJS.enc.Utf8);

      // Decompress if necessary. We assume a simple approach to check for markers or length.
      let finalString = rawString;
      if (this.isCompressedFormat(finalString)) {
        finalString = this.simpleDecompression(finalString);
      }

      // Convert the final plain text back to an object.
      decryptedPayload = JSON.parse(finalString) as DecryptedPayload;
    } catch (parseOrDecryptError) {
      this.eventEmitter.emit('decryption_error', { error: parseOrDecryptError });
      return;
    }

    // If we have a valid payload, route it to the appropriate handler.
    if (decryptedPayload && decryptedPayload.type) {
      const handler = this.messageHandlers.get(decryptedPayload.type);
      if (handler) {
        handler(decryptedPayload);
      } else {
        this.eventEmitter.emit('unhandled_message', { payload: decryptedPayload });
      }
      this.eventEmitter.emit('message_received', { type: decryptedPayload.type });
    }
  }

  /**
   * Handles system-level messages such as "pong" or unencrypted control messages.
   * If the message is recognized as a pong response, we update the lastPingTime to maintain
   * an active health status for the connection.
   *
   * @param msgObj - An already-parsed JSON object representing the incoming message.
   */
  private handleSystemMessage(msgObj: any): void {
    if (msgObj.type === 'pong') {
      this.lastPingTime = Date.now();
      this.eventEmitter.emit('pong_received', { lastPingTime: this.lastPingTime });
    } else {
      this.eventEmitter.emit('system_message', { data: msgObj });
    }
  }

  /**
   * Simplified example compression routine. A production system would likely
   * integrate a proper compression library (e.g., pako for deflate/gzip).
   * For demonstration, we prepend a marker to indicate "compressed" data.
   *
   * @param input - The raw data string to compress.
   * @returns A compressed version of the string.
   */
  private simpleCompression(input: string): string {
    // Mark the string as compressed; pretend we shrank it.
    const compressed = 'COMPRESSED|' + Buffer.from(input).toString('base64');
    return compressed;
  }

  /**
   * Checks if the provided string has the "COMPRESSED|" marker, indicating
   * it was processed by simpleCompression().
   *
   * @param input - The string to check for compression markers.
   * @returns True if it appears to be compressed, false otherwise.
   */
  private isCompressedFormat(input: string): boolean {
    return input.startsWith('COMPRESSED|');
  }

  /**
   * Reverses the effects of simpleCompression(), restoring the original string.
   *
   * @param input - A compressed data string previously returned by simpleCompression().
   * @returns The original, uncompressed string.
   */
  private simpleDecompression(input: string): string {
    const trimmed = input.replace(/^COMPRESSED\|/, '');
    const buffer = Buffer.from(trimmed, 'base64');
    return buffer.toString('utf-8');
  }
}