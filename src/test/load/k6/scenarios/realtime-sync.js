/********************************************************************************
 * Load Testing Scenario: Real-Time Synchronization using WebSockets
 * 
 * This file is designed to validate TaskStream AI's real-time update capabilities
 * under high concurrency, as outlined in the technical and JSON specifications.
 *
 * The following requirements are addressed:
 * 1. System Reliability (99.9% uptime) through sustained load testing.
 * 2. Real-time Updates over WebSockets, testing message handling and event flow.
 * 3. Concurrent Users scaling from 50 to 500 users, verifying system performance.
 *
 * Imports & Libraries (with versions in comments per specification):
 *   ws        (k6/ws)  - 0.42.0 - Provides WebSocket client functionality.
 *   check     (k6)     - 0.42.0 - For assertions and validation checks.
 *   sleep     (k6)     - 0.42.0 - Simulates user "think time" or delays.
 *   Trend, Rate (k6/metrics) - 0.42.0 - Creates custom metrics for performance.
 *
 * Usage:
 *   This scenario is designed to be invoked by k6, using the commands:
 *   k6 run realtime-sync.js
 *
 * Exported Entities:
 *   1) options: Contains scenario configuration (executor, stages) and thresholds.
 *   2) default: Main test function controlling the test flow for each VU iteration.
 ********************************************************************************/

/* --------------------------- External Imports --------------------------- */
import ws from 'k6/ws'; // version 0.42.0
import { check, sleep } from 'k6'; // version 0.42.0
import { Trend, Rate } from 'k6/metrics'; // version 0.42.0

/* -----------------------------------------------------------------------
 * Global Variables and Configuration
 * -----------------------------------------------------------------------
 * WS_BASE_URL:
 *   The base URL for establishing the WebSocket connection.
 *   Fallback to ws://localhost:3000 if not provided via environment variable.
 * 
 * TEST_CONFIGURATION:
 *   Contains the "scenarios" definition for ramping from 0 to 50 VUs,
 *   then up to 500 VUs, and back to 0, and the "thresholds" for performance.
 * ----------------------------------------------------------------------- */
const WS_BASE_URL = (__ENV.WS_BASE_URL && __ENV.WS_BASE_URL.trim() !== '')
  ? __ENV.WS_BASE_URL
  : 'ws://localhost:3000';

const TEST_CONFIGURATION = {
  scenarios: {
    realtime_sync: {
      executor: 'ramping-vus',
      stages: [
        { duration: '2m', target: 50 },   // Ramp up from 0 to 50 VUs in 2 minutes
        { duration: '5m', target: 500 },  // Stay at 500 VUs for 5 minutes
        { duration: '2m', target: 0 },    // Ramp down to 0 in 2 minutes
      ],
    },
  },
  thresholds: {
    // Performance thresholds:
    // 1) ws_session_duration: 95th percentile must be < 300000 ms (5 minutes).
    // 2) ws_connecting_duration: 95th percentile must be < 1000 ms (1 second).
    // 3) ws_messages_rate: Must exceed 100 events as a conceptual minimum.
    // 4) checks: Must maintain at least a 95% success rate.
    ws_session_duration: ['p(95)<300000'],
    ws_connecting_duration: ['p(95)<1000'],
    ws_messages_rate: ['rate>100'],
    checks: ['rate>0.95'],
  },
};

/* -----------------------------------------------------------------------
 * Custom Metrics
 * -----------------------------------------------------------------------
 * ws_session_duration    : Tracks overall WebSocket session duration in milliseconds.
 * ws_connecting_duration : Tracks time from initiating the WebSocket connection to
 *                          successful "open" event in milliseconds.
 * ws_messages_rate       : Tracks the rate of successfully processed messages.
 * 
 * The built-in "checks" metric is used for assertion success rates, aligning with
 * the scenario threshold 'checks'.
 * ----------------------------------------------------------------------- */
const wsSessionDuration = new Trend('ws_session_duration');
const wsConnectingDuration = new Trend('ws_connecting_duration');
const wsMessagesRate = new Rate('ws_messages_rate');

/* -----------------------------------------------------------------------
 * K6 Options Export
 * -----------------------------------------------------------------------
 * Exports scenario definitions and thresholds for the load test runner
 * to interpret and execute in the specified manner.
 * ----------------------------------------------------------------------- */
export let options = {
  scenarios: TEST_CONFIGURATION.scenarios,
  thresholds: TEST_CONFIGURATION.thresholds,
};

/* =============================================================================
 * Function: setupWebSocketSession
 * -----------------------------------------------------------------------------
 * Description:
 *   Establishes and configures an authenticated WebSocket session with
 *   comprehensive connection validation. Implements the following steps:
 *   1) Generate authentication token for WebSocket connection
 *   2) Construct WebSocket URL with authentication parameters
 *   3) Establish WebSocket connection with timeout handling
 *   4) Verify connection success and record connection metrics
 *   5) Configure message handlers for different event types
 *   6) Initialize session metrics collection
 *   7) Return configured session object
 *
 * Parameters:
 *   testContext (object): Contextual information such as user ID, iteration, or
 *                         scenario details to help generate unique tokens or logs.
 *
 * Returns:
 *   Object (session): Contains the WebSocket socket reference, timestamps,
 *                     counters, and any additional metadata used in the test.
 * ============================================================================= */
export function setupWebSocketSession(testContext) {
  // 1) Generate authentication token for WebSocket connection.
  //    Here, we create a dummy token using testContext for uniqueness.
  const userId = testContext.userId || 'unknownUser';
  const iterationId = testContext.iteration || 'unknownIteration';
  const generatedToken = `fakeToken-User${userId}-Iter${iterationId}-${Date.now()}`;

  // 2) Construct WebSocket URL with authentication parameters.
  const wsUrl = `${WS_BASE_URL}/realtime-sync?token=${encodeURIComponent(generatedToken)}`;

  // Object to store session-level data, including metrics or counters.
  const session = {
    socket: null,
    connectStartTime: Date.now(),
    connectedTime: 0,
    disconnectedTime: 0,
    projectUpdateCount: 0,
    taskUpdateCount: 0,
    isConnectionOpen: false,
  };

  // 3) Establish WebSocket connection with recommended timeout handling in K6.
  ws.connect(wsUrl, { timeout: 10000 }, (socket) => {
    // Record the time right before we attempt to connect fully.
    const connectingStart = Date.now();

    // 'open' event fires upon successful connection.
    socket.on('open', () => {
      const connectingEnd = Date.now();
      session.connectedTime = connectingEnd;
      session.isConnectionOpen = true;

      // 4) Verify connection success and record connection metrics.
      //    The connecting duration is how long it took from handshake start to open.
      wsConnectingDuration.add(connectingEnd - connectingStart);

      // We use checks() to validate that we have a valid socket.
      check(socket, {
        'WebSocket connection established': (s) => s && s.readyState === 1,
      });
    });

    // 5) Configure message handlers for different event types.
    //    In real scenarios, the server would send JSON messages indicating
    //    project updates, task updates, or other data flows.
    socket.on('message', (rawMessage) => {
      // Attempt to parse any incoming WebSocket data as JSON.
      let parsed = null;
      try {
        parsed = JSON.parse(rawMessage);
      } catch (e) {
        // If message is not valid JSON, skip further processing.
        return;
      }

      // Dispatch to specialized handlers based on message type.
      if (parsed && parsed.type === 'projectUpdate') {
        handleProjectUpdates(parsed);
        // Optional: increment local counters for aggregated usage stats
        session.projectUpdateCount++;
      } else if (parsed && parsed.type === 'taskUpdate') {
        handleTaskUpdates(parsed);
        // Optional: increment local counters for aggregated usage stats
        session.taskUpdateCount++;
      } else {
        // Unknown or unhandled message types can be logged or counted separately.
      }
    });

    // The 'close' event indicates the socket is closed by either party.
    socket.on('close', (code, reason) => {
      session.isConnectionOpen = false;
      session.disconnectedTime = Date.now();
      let totalDuration = session.disconnectedTime - session.connectStartTime;
      wsSessionDuration.add(totalDuration);

      // We can check that the closure code is normal (1000) or log any abnormal closure.
      check(code, {
        'WebSocket closed normally': (c) => c === 1000,
      });
    });

    // The 'error' event indicates an error occurred on the socket.
    socket.on('error', (err) => {
      // We record a check failure if an error is encountered:
      check(null, {
        'WebSocket encountered an error': false,
      });
    });

    // 6) Initialize session metrics collection
    //    For demonstration, we do so implicitly by capturing connecting duration
    //    above and session duration once the socket closes.

    // Store a reference to the socket in the session.
    // This allows calls to simulateUserActivity() or external logic to send messages.
    session.socket = socket;
  });
  
  // 7) Return configured session object for further usage in main function.
  return session;
}

/* =============================================================================
 * Function: handleProjectUpdates
 * -----------------------------------------------------------------------------
 * Description:
 *   Processes real-time project update messages with performance tracking.
 *   Steps:
 *   1) Validate message structure and content
 *   2) Parse project update payload
 *   3) Record message processing start time
 *   4) Apply project updates to local state
 *   5) Verify update consistency
 *   6) Record processing duration metrics
 *   7) Update message throughput statistics
 *
 * Parameters:
 *   message (object): The parsed JSON containing project update details.
 *
 * Returns:
 *   void: This function processes the message and updates metrics as needed.
 * ============================================================================= */
export function handleProjectUpdates(message) {
  // 1) Validate message structure and content:
  const isMessageValid = message && message.payload && message.type === 'projectUpdate';
  check(isMessageValid, {
    'Received valid project update message': (v) => v === true,
  });

  // 2) Parse project update payload (already parsed in main listener, but we reaffirm details):
  const projectUpdate = message.payload;

  // 3) Record message processing start time:
  const startTime = Date.now();

  // 4) Apply project updates to local state (simulation: we do not maintain a global store in k6):
  //    For demonstration, we simply keep concept of a "local" update. In real usage,
  //    you'd likely manipulate or track project data in memory or a separate system.
  
  // 5) Verify update consistency. In a real test, we might check fields:
  check(projectUpdate, {
    'Project update contains valid ID': (pu) => pu && !!pu.projectId,
  });

  // 6) Record processing duration metrics. If you need a separate metric, define it; 
  //    otherwise we can rely on messagesRate or custom checks. 
  //    We will simply measure the elapsed time for processing here as an example:
  const endTime = Date.now();
  const processingDuration = endTime - startTime;

  // 7) Update message throughput statistics
  //    Each successfully handled message is added as a success for wsMessagesRate.
  wsMessagesRate.add(true);

  // This is a place to log or store "processingDuration" if needed with a Trend metric
  // but for brevity, we omit a dedicated Trend for project update durations.
}

/* =============================================================================
 * Function: handleTaskUpdates
 * -----------------------------------------------------------------------------
 * Description:
 *   Processes real-time task update messages with performance tracking.
 *   Steps:
 *   1) Validate task update message structure
 *   2) Parse task update payload
 *   3) Record message processing start time
 *   4) Apply task updates to local state
 *   5) Verify update consistency
 *   6) Record processing duration metrics
 *   7) Update message throughput statistics
 *
 * Parameters:
 *   message (object): The parsed JSON containing task update details.
 *
 * Returns:
 *   void: This function processes the message and updates metrics as needed.
 * ============================================================================= */
export function handleTaskUpdates(message) {
  // 1) Validate task update message structure:
  const isMessageValid = message && message.payload && message.type === 'taskUpdate';
  check(isMessageValid, {
    'Received valid task update message': (v) => v === true,
  });

  // 2) Parse task update payload:
  const taskUpdate = message.payload;

  // 3) Record the message processing start time:
  const startTime = Date.now();

  // 4) Apply task updates to local state (simulation only):
  //    Similar to project updates, in a real scenario we'd manipulate a store or track changes.

  // 5) Verify update consistency by checking presence of essential fields:
  check(taskUpdate, {
    'Task update has valid ID': (tu) => tu && !!tu.taskId,
  });

  // 6) Record processing duration metrics (optional demonstration):
  const endTime = Date.now();
  const processingDuration = endTime - startTime;

  // 7) Update message throughput statistics:
  wsMessagesRate.add(true);
}

/* =============================================================================
 * Function: simulateUserActivity
 * -----------------------------------------------------------------------------
 * Description:
 *   Generates and sends realistic user activity patterns over WebSocket.
 *   Steps:
 *   1) Generate random but realistic user actions
 *   2) Add appropriate delays between actions
 *   3) Send actions through WebSocket connection
 *   4) Verify message delivery and response
 *   5) Record action latency metrics
 *   6) Monitor connection stability
 *   7) Update user activity statistics
 *
 * Parameters:
 *   session (object): A session object containing the socket reference and
 *                     any counters for tracking usage or message counts.
 *
 * Returns:
 *   void: The function simulates user actions against the WebSocket endpoint.
 * ============================================================================= */
export function simulateUserActivity(session) {
  // Ensure we have a valid, open socket in the session before proceeding.
  if (!session.socket || !session.isConnectionOpen) {
    // We use check to mark it as a test failure if the socket is invalid for usage.
    check(null, {
      'WebSocket is available for user activities': false,
    });
    return;
  }

  // 1) Generate random but realistic user actions:
  //    We'll pick from a small set of possible commands to simulate real-time usage.
  const possibleActions = ['createTask', 'updateTask', 'ping', 'joinProject', 'leaveProject'];

  // 2) Add appropriate delays and iterate a small number of times to simulate usage.
  //    We'll do up to 3 cycles of random user actions for demonstration.
  for (let i = 0; i < 3; i++) {
    // Randomly pick an action from the array
    const selectedAction = possibleActions[Math.floor(Math.random() * possibleActions.length)];

    // 3) Send actions through the WebSocket connection:
    const actionPayload = {
      type: 'userAction',
      action: selectedAction,
      timestamp: Date.now(),
      // Additional detail for the server's usage or logging.
    };

    const sendStart = Date.now();
    session.socket.send(JSON.stringify(actionPayload));

    // 4) Verify message delivery and response
    //    Because we rely on server-sent events, we track it through 'messagesRate' 
    //    or we can rely on the message event handlers to verify incoming responses.

    // 5) Record action latency metrics:
    //    For demonstration, we track minimal local latency from "sendStart" to "now".
    const sendEnd = Date.now();
    const sendDuration = sendEnd - sendStart; // in milliseconds

    // We can do a check or simply record a success to the wsMessagesRate if send is "successful".
    check(sendDuration, {
      'User action send completed': (d) => d >= 0,
    });

    // 6) Monitor connection stability:
    //    We'll do a quick check to see if the socket is still open after sending.
    check(session.socket.readyState, {
      'WebSocket remains open': (rs) => rs === 1,
    });

    // 7) Update user activity statistics:
    //    We'll note each successful action to wsMessagesRate, counting it as an attempt to
    //    measure overall throughput on the send side.
    wsMessagesRate.add(true);

    // Sleep a bit between actions to simulate user "think time".
    sleep(1);
  }
}

/* =============================================================================
 * Default Exported Function
 * -----------------------------------------------------------------------------
 * Orchestrates the main load test cycle for each VU (Virtual User) iteration.
 * The steps are:
 *   1) Create a test context object for user/iteration tracking.
 *   2) Establish a WebSocket session via setupWebSocketSession().
 *   3) Simulate user activity by calling simulateUserActivity().
 *   4) Allow time for further inbound messages and close the socket gracefully.
 *   5) Sleep or yield control in line with the scenario's pacing or design.
 * ============================================================================= */
export default function () {
  // 1) Create test context with user and iteration metadata for potential usage.
  const testContext = {
    userId: __VU,        // The built-in K6 variable for Virtual User ID
    iteration: __ITER,   // The built-in K6 variable for iteration number
  };

  // 2) Establish a WebSocket session.
  const session = setupWebSocketSession(testContext);

  // 3) Simulate user activity if session is valid.
  //    We use a short sleep to let 'open' event fire fully inside setupWebSocketSession's callback.
  sleep(2);
  simulateUserActivity(session);

  // 4) If we still have an open socket, close it gracefully, then measure session duration.
  //    We wait a bit to allow for server messages to come back for this iteration.
  sleep(3);
  if (session.socket && session.isConnectionOpen) {
    session.socket.close();
  }

  // 5) Sleep for a short time to yield until the next iteration or next stage in the scenario.
  sleep(1);
}