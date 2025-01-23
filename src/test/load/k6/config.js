/********************************************************************************
 * Main configuration file for k6 load testing scenarios (config.js)
 * ------------------------------------------------------------------------------
 * This file consolidates and merges global settings, shared configurations,
 * and multiple scenario modules for TaskStream AI's performance testing suite.
 *
 * Requirements Addressed (from the Technical Specification & JSON spec):
 *  1) System Reliability (99.9% uptime)          -> Ensured by robust scenario thresholds.
 *  2) API Gateway Scaling (1000 RPS)            -> Defined via ramping-vus and thresholds.
 *  3) Task Extraction Accuracy (95% accuracy)   -> Enforced via nlp_accuracy thresholds.
 *
 * In this code, we:
 *   - Define global constants and thresholds.
 *   - Import and merge scenario-specific configuration from sub-scenario modules.
 *   - Provide an enterprise-grade approach to merging scenario thresholds,
 *     staging profiles, and global setup data.
 *   - Export the final "options" object (scenarios + thresholds) used by k6.
 *   - Export a global "setup" function that initializes shared data context.
 *   - Implement required utility functions:
 *       1) mergeScenarioOptions()  -> Merges scenario options with global config.
 *       2) setupGlobalData()       -> Produces a comprehensive shared test context.
 * ------------------------------------------------------------------------------
 ********************************************************************************/

/* ---------------------------------------------------------------------------
 * Internal Imports
 * (Custom scenario modules for TaskStream AI load testing)
 * ---------------------------------------------------------------------------
 * Each scenario exports an "options" object (with scenario + threshold config)
 * and a default function (the primary scenario executor).
 * We also import an additional "setup" function from api-load.js for advanced
 * preparation of test data specifically required by the API load scenario.
 * ---------------------------------------------------------------------------
 */
import {
  options as apiLoadScenarioOptions,
  default as apiLoadExecutor,
  setup as apiLoadSetup,
} from './scenarios/api-load.js'; // Local module

import {
  options as nlpProcessingScenarioOptions,
  default as nlpProcessingExecutor,
} from './scenarios/nlp-processing.js'; // Local module

import {
  options as realtimeSyncScenarioOptions,
  default as realtimeSyncExecutor,
} from './scenarios/realtime-sync.js'; // Local module

/* ---------------------------------------------------------------------------
 * External Imports
 * ---------------------------------------------------------------------------
 * We must include version comments per specification:
 *   SharedArray from 'k6/data' @version 0.42.0
 *   sleep from 'k6' @version 0.42.0
 * ---------------------------------------------------------------------------
 */
import { SharedArray } from 'k6/data'; // v0.42.0
import { sleep } from 'k6';           // v0.42.0

/* ---------------------------------------------------------------------------
 * Global Constants & Thresholds
 * ---------------------------------------------------------------------------
 * These values serve as defaults and references to ensure system reliability,
 * meet the 99.9% uptime target, support 1000 RPS scaling, and enforce
 * 95% accuracy for task extraction.
 * ---------------------------------------------------------------------------
 */

/**
 * BASE_URL
 * The default base URL for TaskStream AI's HTTP API, used in certain fallback or
 * reference contexts. Scenarios may override or use their own environment-based
 * addresses.
 * @type {string}
 */
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

/**
 * WS_BASE_URL
 * The default WebSocket base URL for real-time sync scenarios.
 * @type {string}
 */
const WS_BASE_URL = process.env.WS_BASE_URL || 'ws://localhost:3000';

/**
 * GLOBAL_THRESHOLDS
 * Used to provide baseline threshold values for HTTP requests, WebSockets,
 * check success rates, and specialized metrics like NLP accuracy. These
 * thresholds have direct ties to the success criteria in the specs:
 *   - http_req_duration: Contributes to 99.9% reliability by bounding latency.
 *   - nlp_accuracy: Enforces 95% task extraction accuracy.
 *   - ws_session_duration: Helps ensure stable real-time sessions.
 * @type {Object}
 */
const GLOBAL_THRESHOLDS = {
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  http_req_failed: ['rate<0.01'],
  ws_session_duration: ['p(95)<300000'], // 5 minutes
  checks: ['rate>0.95'],                // 95% of checks must pass
  nlp_accuracy: ['value>0.95'],         // 95% accuracy requirement
};

/* ---------------------------------------------------------------------------
 * FUNCTION: mergeScenarioOptions
 * ---------------------------------------------------------------------------
 * Merges a global k6 configuration object with a scenario-specific options
 * object. This ensures:
 *   1) Input validation.
 *   2) Deep clone of global options to prevent accidental mutation.
 *   3) Combining threshold arrays and scenario definitions.
 *   4) Handling scenario-specific stage merges or overrides.
 *   5) Integrating any custom metrics or aggregator logic for reliability.
 *   6) Final validation of the merged configuration.
 *   7) Return the combined object.
 *
 * @param {Object} globalOpts - Primary configuration (thresholds, defaults).
 * @param {Object} scenarioOpts - Scenario-specific configuration.
 * @returns {Object} mergedOpts - The combined result of merging the two objects.
 * ---------------------------------------------------------------------------
 */
function mergeScenarioOptions(globalOpts, scenarioOpts) {
  // 1) Validate input parameters
  if (!globalOpts || typeof globalOpts !== 'object') {
    throw new Error('mergeScenarioOptions: "globalOpts" must be a valid object.');
  }
  if (!scenarioOpts || typeof scenarioOpts !== 'object') {
    throw new Error('mergeScenarioOptions: "scenarioOpts" must be a valid object.');
  }

  // 2) Deep clone global options
  const merged = JSON.parse(JSON.stringify(globalOpts));

  // 3) Merge scenario-specific thresholds with global thresholds
  if (scenarioOpts.thresholds && typeof scenarioOpts.thresholds === 'object') {
    // If the merged config doesn't have a thresholds object yet, initialize it
    if (!merged.thresholds) {
      merged.thresholds = {};
    }
    for (const [metricName, thresholdArray] of Object.entries(scenarioOpts.thresholds)) {
      if (!merged.thresholds[metricName]) {
        merged.thresholds[metricName] = [];
      }
      // Merge threshold constraints by simple concatenation
      merged.thresholds[metricName] = [
        ...new Set([...merged.thresholds[metricName], ...thresholdArray]),
      ];
    }
  }

  // 4) Merge scenario definitions
  if (!merged.scenarios) {
    merged.scenarios = {};
  }
  if (scenarioOpts.scenarios && typeof scenarioOpts.scenarios === 'object') {
    for (const [scenarioName, scenarioDef] of Object.entries(scenarioOpts.scenarios)) {
      // Insert or override the scenario definition from scenarioOpts
      merged.scenarios[scenarioName] = scenarioDef;
    }
  }

  // 5) Combine custom metrics configurations (if the scenario sets any).
  //    In a typical setup, we might unify custom set of metrics. For brevity,
  //    we assume threshold merges suffice, as advanced custom metric merging
  //    is scenario-specific and can be appended here if needed.

  // 6) Validate final object
  if (!merged.scenarios || Object.keys(merged.scenarios).length === 0) {
    throw new Error('mergeScenarioOptions: Merged config did not contain any scenarios.');
  }
  // Optional: additional checks on thresholds or scenario integrity can be added.

  // 7) Return merged configuration
  return merged;
}

/* ---------------------------------------------------------------------------
 * FUNCTION: setupGlobalData
 * ---------------------------------------------------------------------------
 * Initializes comprehensive test data for all scenarios. In large
 * enterprise load tests, we frequently share user credentials, project
 * structures, or sample data among multiple scenarios. This function
 * demonstrates a robust approach, returning everything needed for
 * globally accessible test contexts.
 *
 * Steps:
 *   1) Initialize SharedArray for large data sets (e.g., user pool).
 *   2) Generate test user credentials with varied roles.
 *   3) Generate project and task data with hierarchical references.
 *   4) Prepare texts/communications for NLP testing (if desired).
 *   5) Setup WebSocket parameters or correlation IDs for real-time tests.
 *   6) Return the final data object.
 *
 * @returns {Object} - A curated, global test context object.
 * ---------------------------------------------------------------------------
 */
function setupGlobalData() {
  // 1) Example of creating a shared array for user data
  const userCredentials = new SharedArray('taskstream-users', () => {
    return [
      { username: 'loadTestUser1', password: 'password123', role: 'Manager' },
      { username: 'loadTestUser2', password: 'password123', role: 'Developer' },
      { username: 'loadTestUser3', password: 'password123', role: 'Viewer' },
      // Additional user credentials can be defined or loaded from JSON
    ];
  });

  // 2) Generate test data for projects, tasks, and NLP
  const projectData = {
    name: `GlobalConfigProject-${Date.now()}`,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { source: 'config-global-setup' },
  };
  const taskData = {
    title: `GlobalConfigTask-${Date.now()}`,
    description: 'Generic task from global setup',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  };

  // 3) Additional data sets for NLP text or real-time messages could be generated here as well
  const sampleNlpTexts = new SharedArray('global-nlp-samples', () => {
    return [
      'Please schedule a meeting about the integration by next week.',
      'Remind Bob to finalize the sales report and send it to the client.',
      'After lunch, we need to confirm the design specs and allocate tasks to devs.',
    ];
  });

  // 4) Setup WebSocket or correlation parameters (placeholder example)
  const wsParams = {
    correlationId: `corr-${Math.floor(Math.random() * 1e6)}`,
    environment: 'TEST',
  };

  // 5) Return final aggregated data
  return {
    baseUrl: BASE_URL,
    wsBaseUrl: WS_BASE_URL,
    userCredentials,
    projectData,
    taskData,
    sampleNlpTexts,
    wsParams,
  };
}

/* ---------------------------------------------------------------------------
 * Named Executor Functions
 * ---------------------------------------------------------------------------
 * Each scenario's "exec" property references a named function in this file.
 * We call the default exports from each scenario to maintain their logic.
 * This structure ensures that all scenario logic is orchestrated from a single
 * k6 config, while also unifying the global data if needed.
 * ---------------------------------------------------------------------------
 */

/**
 * apiLoadExec
 * Invokes the API Load scenario's default test function. This scenario
 * expects a data object containing user credentials, project/task data,
 * and any specialized environment references. The "setup" we define below
 * will also integrate the scenario-specific setup function from api-load.js,
 * storing the result in data.apiLoadData.
 */
function apiLoadExec(data) {
  // Pass the specialized API load data from this config's setup
  if (data && data.apiLoadData) {
    apiLoadExecutor(data.apiLoadData);
  }
}

/**
 * nlpProcessingExec
 * Invokes the NLP Processing scenario's default test function. This scenario
 * typically does not require specialized input from the aggregator, but we
 * maintain a consistent function signature. If needed, we can pass data here.
 */
function nlpProcessingExec() {
  // The default function in nlp-processing.js does not use input arguments
  nlpProcessingExecutor();
}

/**
 * realtimeSyncExec
 * Manages the WebSocket real-time sync scenario. No specialized data is
 * strictly required from aggregator, so we simply call the scenario's
 * default function.
 */
function realtimeSyncExec() {
  realtimeSyncExecutor();
}

/* ---------------------------------------------------------------------------
 * EXPORT: setup
 * ---------------------------------------------------------------------------
 * The single global setup function for the entire k6 test run. This function:
 *   1) Calls setupGlobalData() to create a broad test context.
 *   2) Invokes the scenario-specific setup from apiLoad.js (if required).
 *   3) Merges or attaches scenario-specific data for usage in scenario executors.
 *   4) Returns a final object that each scenario exec function receives as "data".
 *
 * k6 automatically calls this function once before ramping up any VUs.
 * The returned value is accessible in scenario exec functions as their parameter.
 * ---------------------------------------------------------------------------
 */
export function setup() {
  // 1) Start with the global context
  const globalData = setupGlobalData();

  // 2) The API load scenario file (api-load.js) has its own setup function
  //    that returns important data (user creds, project & task definitions).
  //    We call it and store the result under "apiLoadData".
  const apiLoadData = apiLoadSetup();
  globalData.apiLoadData = apiLoadData;

  // 3) Return the final aggregated data. All scenario executors can access
  //    "globalData" or specialized sub-keys as needed.
  return globalData;
}

/* ---------------------------------------------------------------------------
 * Scenario & Threshold Aggregation
 * ---------------------------------------------------------------------------
 * We build a final merged "options" object by:
 *   1) Starting with an empty config that includes the global thresholds.
 *   2) Merging the "apiLoadScenarioOptions", "nlpProcessingScenarioOptions",
 *      and "realtimeSyncScenarioOptions" via mergeScenarioOptions().
 *   3) Replacing each scenario's "exec" property with the named executor
 *      functions we've declared above (so the aggregator runs them).
 * ---------------------------------------------------------------------------
 */
// Step 1) Initialize a base config with empty scenarios and global thresholds
let baseConfig = {
  thresholds: { ...GLOBAL_THRESHOLDS }, // copy baseline global thresholds
  scenarios: {},
};

// Step 2) Merge scenario-specific options for each scenario module
baseConfig = mergeScenarioOptions(baseConfig, apiLoadScenarioOptions);
baseConfig = mergeScenarioOptions(baseConfig, nlpProcessingScenarioOptions);
baseConfig = mergeScenarioOptions(baseConfig, realtimeSyncScenarioOptions);

// Step 3) Replace each scenario's exec function reference with local named executors
if (baseConfig.scenarios.api_load) {
  baseConfig.scenarios.api_load.exec = 'apiLoadExec';
}
if (baseConfig.scenarios.nlp_processing) {
  baseConfig.scenarios.nlp_processing.exec = 'nlpProcessingExec';
}
if (baseConfig.scenarios.realtime_sync) {
  baseConfig.scenarios.realtime_sync.exec = 'realtimeSyncExec';
}

/* ---------------------------------------------------------------------------
 * EXPORT: options
 * ---------------------------------------------------------------------------
 * This final object is recognized by k6 as the test configuration. It
 * defines which scenarios exist, how they're executed, what thresholds
 * to apply, and references the aggregator's named exec functions.
 * ---------------------------------------------------------------------------
 */
export const options = {
  scenarios: baseConfig.scenarios,
  thresholds: baseConfig.thresholds,
};

/* ---------------------------------------------------------------------------
 * End of File: config.js
 * ---------------------------------------------------------------------------
 * We rely on k6 to orchestrate the entire test run as follows:
 *   1) setup() is called once to create the global data context.
 *   2) Each scenario uses the "exec" function to run the relevant scenario.
 *   3) k6 enforces thresholds for each defined metric across all scenarios.
 * This enterprise-ready strategy ensures synergy among different performance
 * tests while meeting all technical specifications and success criteria.
 * ---------------------------------------------------------------------------
 */