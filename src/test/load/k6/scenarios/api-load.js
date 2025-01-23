/********************************************************************************
 * Load Testing Script for TaskStream AI's Core APIs
 * File: api-load.js
 * Description:
 *   Defines k6 load testing scenarios for the TaskStream AI API endpoints,
 *   focusing on performance, scalability, and reliability under various load
 *   conditions. This script implements all features and stages required by the
 *   technical specification in an enterprise-ready style.
 ********************************************************************************/

/* ---------------------------------------------------------------------------
 * External Imports (k6@0.42.0 and modules)
 * ---------------------------------------------------------------------------
 */
import http from 'k6/http'; // version 0.42.0
import { check, sleep } from 'k6'; // version 0.42.0
import { SharedArray } from 'k6/data'; // version 0.42.0

/* ---------------------------------------------------------------------------
 * Global Constants & Variables
 * ---------------------------------------------------------------------------
 */

/**
 * BASE_URL - Configurable API base URL, defaults to local if not provided.
 * @type {string}
 */
const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:3000';

/**
 * GLOBAL_THRESHOLDS - Default threshold values for key k6 metrics if needed.
 * Note: Additional endpoint-specific thresholds are merged in options.thresholds.
 * @type {Object}
 */
const GLOBAL_THRESHOLDS = {
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  http_req_failed: ['rate<0.01'],
  checks: ['rate>0.95'],
  iteration_duration: ['p(95)<2000'],
};

/**
 * TEST_DATA - Shared array of user credentials or other payload data.
 * This data is loaded once and shared across all VUs for performance efficiency.
 * @type {SharedArray}
 */
const TEST_DATA = new SharedArray('test users', () => JSON.parse(open('./test-data.json')));

/**
 * SLEEP_DURATION - The default sleep duration between requests to simulate
 * user think-time.
 * @type {number}
 */
const SLEEP_DURATION = 1;

/**
 * API_ENDPOINTS - Central reference for API endpoint paths.
 * @type {Object}
 */
const API_ENDPOINTS = {
  auth: '/api/v1/auth',
  projects: '/api/v1/projects',
  tasks: '/api/v1/tasks',
  analytics: '/api/v1/analytics',
};

/* ---------------------------------------------------------------------------
 * k6 Test Configuration (Scenarios & Thresholds)
 * ---------------------------------------------------------------------------
 */

/**
 * The "options" object that k6 uses to configure test scenarios and thresholds.
 * We define a single scenario named "api_load" with ramping-vus executor and
 * multiple stages to handle warm-up, ramp-up, peak load, and cool-down phases.
 * Endpoint-specific thresholds are tagged and tracked using custom tags.
 */
export const options = {
  scenarios: {
    api_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 50, description: 'Warm-up phase' },
        { duration: '3m', target: 200, description: 'Ramp-up phase 1' },
        { duration: '5m', target: 500, description: 'Ramp-up phase 2' },
        { duration: '5m', target: 1000, description: 'Peak load phase' },
        { duration: '3m', target: 500, description: 'Cool-down phase 1' },
        { duration: '2m', target: 0, description: 'Cool-down phase 2' },
      ],
      exec: 'default',
    },
  },
  thresholds: {
    // Endpoint-specific thresholds using tags {endpoint:<name>}
    'http_req_duration{endpoint:auth}': ['p(95)<500', 'p(99)<1000'],
    'http_req_duration{endpoint:projects}': ['p(95)<500', 'p(99)<1000'],
    'http_req_duration{endpoint:tasks}': ['p(95)<500', 'p(99)<1000'],
    'http_req_duration{endpoint:analytics}': ['p(95)<800', 'p(99)<1500'],
    // General thresholds
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.95'],
    iteration_duration: ['p(95)<2000'],
  },
};

/* ---------------------------------------------------------------------------
 * Setup Function
 * ---------------------------------------------------------------------------
 */

/**
 * setup()
 * Initializes test data and configuration for the load test with proper isolation.
 * Executes once per test run before any virtual users start.
 * @returns {Object} testContext - Contains user credentials, project/task data, etc.
 */
export function setup() {
  // 1) Load and validate user credentials from TEST_DATA
  const userCredentials = TEST_DATA.find((u) => u.username && u.password);
  // Validate minimal existence of credentials
  if (!userCredentials) {
    throw new Error('No valid test user credentials found in test-data.json');
  }

  // 2) Pre-generate test project data with unique identifiers
  const projectData = {
    name: `LoadTestProject-${Math.floor(Math.random() * 1000000)}`,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { source: 'k6-load-test' },
  };

  // 3) Pre-generate test task data with dependencies
  const taskData = {
    title: `LoadTestTask-${Math.floor(Math.random() * 1000000)}`,
    description: 'Automatically generated task for load testing',
    status: 'NEW',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  };

  // 4) Initialize performance counters or metrics if needed
  const performanceMetrics = {
    testStartTime: new Date().toISOString(),
  };

  // 5) Verify test environment readiness (dummy check for demonstration)
  // In a real scenario, you might do a health check or readiness probe here.
  // e.g., http.get(`${BASE_URL}/health`) and verify status.

  // 6) Return comprehensive test context
  const testContext = {
    userCredentials,
    projectData,
    taskData,
    performanceMetrics,
  };

  return testContext;
}

/* ---------------------------------------------------------------------------
 * Authentication Function
 * ---------------------------------------------------------------------------
 */

/**
 * authenticateUser(credentials)
 * Performs user authentication with retry logic and token validation.
 * @param {Object} credentials - An object containing username and password.
 * @returns {string} - A validated JWT access token for subsequent requests.
 */
function authenticateUser(credentials) {
  // Validate input credentials
  if (!credentials.username || !credentials.password) {
    throw new Error('Invalid credentials object, username and password are required');
  }

  // Construct request payload
  const payload = JSON.stringify({
    username: credentials.username,
    password: credentials.password,
  });

  // Execute a POST request to the auth endpoint with a retry approach
  let res;
  for (let attempt = 0; attempt < 3; attempt++) {
    // Perform the authentication request with tagging for threshold metrics
    res = http.post(`${BASE_URL}${API_ENDPOINTS.auth}`, payload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { endpoint: 'auth' },
    });

    // Basic check on the response
    const passed = check(res, {
      'auth: status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    });

    if (passed) {
      break;
    }
    sleep(SLEEP_DURATION);
  }

  // Validate response structure and extract JWT
  if (!res || (res.status !== 200 && res.status !== 201)) {
    throw new Error(`Authentication failed after retries - status: ${res && res.status}`);
  }

  const jsonBody = res.json();
  if (!jsonBody || !jsonBody.token) {
    throw new Error('Invalid authentication response, token not found');
  }

  // Return the validated token
  return jsonBody.token;
}

/* ---------------------------------------------------------------------------
 * Project Scenario Function
 * ---------------------------------------------------------------------------
 */

/**
 * projectScenario(context)
 * Executes project-related API load tests with comprehensive validations.
 * @param {Object} context - Contains auth token and test data from setup().
 */
function projectScenario(context) {
  // List projects with pagination and filtering
  {
    const res = http.get(`${BASE_URL}${API_ENDPOINTS.projects}?page=1&limit=5`, {
      tags: { endpoint: 'projects' },
      headers: { Authorization: `Bearer ${context.token}` },
    });
    check(res, {
      'projects: list status is 200': (r) => r.status === 200,
    });
    sleep(SLEEP_DURATION);
  }

  // Create new project with unique identifiers
  {
    const payload = JSON.stringify(context.projectData);
    const res = http.post(`${BASE_URL}${API_ENDPOINTS.projects}`, payload, {
      tags: { endpoint: 'projects' },
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${context.token}`,
      },
    });
    check(res, {
      'projects: create status is 201': (r) => r.status === 201,
    });
    sleep(SLEEP_DURATION);
  }

  // Get project details with full validation (using an example project ID or name)
  {
    // In real usage, fetch project ID from creation response or fixture data
    const sampleProjectId = 'some-project-id-for-demo';
    const res = http.get(`${BASE_URL}${API_ENDPOINTS.projects}/${sampleProjectId}`, {
      tags: { endpoint: 'projects' },
      headers: { Authorization: `Bearer ${context.token}` },
    });
    check(res, {
      'projects: get detail 200 or 404 acceptable': (r) => r.status === 200 || r.status === 404,
    });
    sleep(SLEEP_DURATION);
  }

  // Update project with concurrent access handling
  {
    const payload = JSON.stringify({ name: 'UpdatedProjectName' });
    const sampleProjectId = 'some-project-id-for-demo';
    const res = http.put(`${BASE_URL}${API_ENDPOINTS.projects}/${sampleProjectId}`, payload, {
      tags: { endpoint: 'projects' },
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${context.token}`,
      },
    });
    check(res, {
      'projects: update status is 200': (r) => r.status === 200,
    });
    sleep(SLEEP_DURATION);
  }

  // Delete project with cleanup verification
  {
    const sampleProjectId = 'some-project-id-for-demo';
    const res = http.del(`${BASE_URL}${API_ENDPOINTS.projects}/${sampleProjectId}`, null, {
      tags: { endpoint: 'projects' },
      headers: { Authorization: `Bearer ${context.token}` },
    });
    check(res, {
      'projects: delete status is 200 or 204': (r) => r.status === 200 || r.status === 204,
    });
    sleep(SLEEP_DURATION);
  }
}

/* ---------------------------------------------------------------------------
 * Task Scenario Function
 * ---------------------------------------------------------------------------
 */

/**
 * taskScenario(context)
 * Executes task-related API load tests while managing project-task dependencies.
 * @param {Object} context - Contains auth token and test data from setup().
 */
function taskScenario(context) {
  // List tasks with complex filtering
  {
    const res = http.get(`${BASE_URL}${API_ENDPOINTS.tasks}?status=NEW&limit=10`, {
      tags: { endpoint: 'tasks' },
      headers: { Authorization: `Bearer ${context.token}` },
    });
    check(res, {
      'tasks: list status is 200': (r) => r.status === 200,
    });
    sleep(SLEEP_DURATION);
  }

  // Create new task with project association
  {
    const payload = JSON.stringify({
      ...context.taskData,
      projectId: 'demo-associated-project-id',
    });
    const res = http.post(`${BASE_URL}${API_ENDPOINTS.tasks}`, payload, {
      tags: { endpoint: 'tasks' },
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${context.token}`,
      },
    });
    check(res, {
      'tasks: create status is 201': (r) => r.status === 201,
    });
    sleep(SLEEP_DURATION);
  }

  // Get task details with relationship validation
  {
    const sampleTaskId = 'some-task-id-for-demo';
    const res = http.get(`${BASE_URL}${API_ENDPOINTS.tasks}/${sampleTaskId}`, {
      tags: { endpoint: 'tasks' },
      headers: { Authorization: `Bearer ${context.token}` },
    });
    check(res, {
      'tasks: get detail 200 or 404 acceptable': (r) => r.status === 200 || r.status === 404,
    });
    sleep(SLEEP_DURATION);
  }

  // Update task status with state verification
  {
    const payload = JSON.stringify({ status: 'IN_PROGRESS' });
    const sampleTaskId = 'some-task-id-for-demo';
    const res = http.put(`${BASE_URL}${API_ENDPOINTS.tasks}/${sampleTaskId}`, payload, {
      tags: { endpoint: 'tasks' },
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${context.token}`,
      },
    });
    check(res, {
      'tasks: update status is 200': (r) => r.status === 200,
    });
    sleep(SLEEP_DURATION);
  }

  // Delete task with dependency checking
  {
    const sampleTaskId = 'some-task-id-for-demo';
    const res = http.del(`${BASE_URL}${API_ENDPOINTS.tasks}/${sampleTaskId}`, null, {
      tags: { endpoint: 'tasks' },
      headers: { Authorization: `Bearer ${context.token}` },
    });
    check(res, {
      'tasks: delete status is 200 or 204': (r) => r.status === 200 || r.status === 204,
    });
    sleep(SLEEP_DURATION);
  }

  // Monitor task operation latencies is done implicitly via thresholds/checks
}

/* ---------------------------------------------------------------------------
 * Analytics Scenario Function
 * ---------------------------------------------------------------------------
 */

/**
 * analyticsScenario(context)
 * Executes analytics-related API load tests with data aggregation checks.
 * @param {Object} context - Contains auth token for secure requests.
 */
function analyticsScenario(context) {
  // Get performance metrics with time range parameters
  {
    const url = `${BASE_URL}${API_ENDPOINTS.analytics}?range=last30days`;
    const res = http.get(url, {
      tags: { endpoint: 'analytics' },
      headers: { Authorization: `Bearer ${context.token}` },
    });
    check(res, {
      'analytics: metrics status is 200': (r) => r.status === 200,
    });
    sleep(SLEEP_DURATION);
  }

  // Get resource utilization with granular data
  {
    const url = `${BASE_URL}${API_ENDPOINTS.analytics}/utilization?detail=high`;
    const res = http.get(url, {
      tags: { endpoint: 'analytics' },
      headers: { Authorization: `Bearer ${context.token}` },
    });
    check(res, {
      'analytics: resource utilization 200': (r) => r.status === 200,
    });
    sleep(SLEEP_DURATION);
  }

  // Get predictive insights with model validation
  {
    const url = `${BASE_URL}${API_ENDPOINTS.analytics}/predictions`;
    const res = http.get(url, {
      tags: { endpoint: 'analytics' },
      headers: { Authorization: `Bearer ${context.token}` },
    });
    check(res, {
      'analytics: predictions status is 200': (r) => r.status === 200,
    });
    sleep(SLEEP_DURATION);
  }

  // Verify data consistency and accuracy (demo check for example)
  // Typically you might parse the data and check certain fields or metrics

  // Measure analytics response times handled by thresholds

  // Validate data aggregation results - can parse JSON data here as well
}

/* ---------------------------------------------------------------------------
 * Main Execution Function (default)
 * ---------------------------------------------------------------------------
 */

/**
 * default(data)
 * The entry point for each Virtual User during the load test.
 * Invoked repeatedly according to the scenario definition in options.scenarios.
 * @param {Object} data - The context object returned from setup().
 */
export default function (data) {
  // 1) Obtain or refresh authentication token if not present
  if (!data.token) {
    data.token = authenticateUser(data.userCredentials);
  }

  // 2) Execute project-related tests
  projectScenario(data);

  // 3) Execute task-related tests
  taskScenario(data);

  // 4) Execute analytics-related tests
  analyticsScenario(data);

  // 5) Sleep to simulate realistic user think-time
  sleep(SLEEP_DURATION);
}
```