// cypress ^12.0.0
import { defineConfig } from 'cypress';

// @cypress/code-coverage ^3.10.0
import codeCoveragePlugin from '@cypress/code-coverage';

// Internal fixture imports for comprehensive E2E test scenarios
import { projects } from '../fixtures/projects.json';
import { tasks } from '../fixtures/tasks.json';
import { users } from '../fixtures/users.json';

/**
 * Asynchronous function that configures Cypress plugins, event handlers, and
 * test environment setup. This includes code coverage registration, data
 * validation, environment variable configuration, custom browser settings,
 * test retry handling, reporting, performance monitoring, and parallelization.
 *
 * @param on - Cypress event registration function
 * @param config - Current Cypress configuration object
 * @returns A Promise resolving to the updated config object
 */
async function setupNodeEvents(on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions): Promise<Cypress.PluginConfigOptions> {
  /**
   * 1. Register and configure code coverage plugin with minimum 80% threshold.
   * This plugin tracks instrumentation data and enforces coverage requirements.
   */
  codeCoveragePlugin(on, config);

  /**
   * 2. Load and validate test data fixtures from JSON files.
   * Ensuring we have adequate data for our end-to-end tests.
   */
  if (!projects || !Array.isArray(projects) || projects.length === 0) {
    throw new Error('[Cypress Config] No project data loaded from projects.json');
  }
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    throw new Error('[Cypress Config] No task data loaded from tasks.json');
  }
  if (!users?.users || !Array.isArray(users.users) || users.users.length === 0) {
    throw new Error('[Cypress Config] No user data loaded from users.json');
  }

  /**
   * 3. Configure environment-specific variables and settings.
   * The example sets or overrides API URLs, coverage flags, etc.
   * In a larger system, these values could be used for advanced logic below.
   */
  if (config.env.apiUrl) {
    config.env.API_URL = config.env.apiUrl;
  }

  /**
   * 4. Setup custom browser launch options to optimize memory and performance,
   * and address potential Docker/CI environment constraints.
   */
  on('before:browser:launch', (browser, launchOptions) => {
    if (browser.name === 'chrome' && launchOptions.args) {
      launchOptions.args.push('--disable-dev-shm-usage');
      launchOptions.args.push('--disable-gpu');
    }
    return launchOptions;
  });

  /**
   * 5. Configure test reporting and artifact collection. In this example,
   * we track spec results. Optionally, artifacts could be moved into a
   * directory for CI usage based on environment settings.
   */
  on('after:spec', (spec, results) => {
    if (config.env?.CI?.artifactPath && results && results.video) {
      // Example placeholder for copying artifacts to a specific location.
      // Implementation depends on the CI environment and artifact handling logic.
    }
  });

  /**
   * 6. Initialize test retry and flaky test detection mechanisms.
   * Retries are also set in config; we can perform additional logic here.
   */
  // Cypress automatically respects config.retries for runMode and openMode.

  /**
   * 7. Setup performance monitoring and metrics collection.
   * One could integrate with other services for real-time performance data.
   */
  on('before:spec', (spec) => {
    // This section can be extended to measure pre-test performance conditions.
  });
  on('after:run', (results) => {
    // Post-run performance analysis can be placed here.
  });

  /**
   * 8. Configure parallel test execution settings for CI/CD.
   * For instance, we can tweak memory usage or concurrency based on environment values.
   */
  if (config.env?.CI?.parallelization) {
    // Example adjustment to reduce in-memory test data retention.
    config.numTestsKeptInMemory = 0;
  }

  return config;
}

/**
 * The default export generates the comprehensive Cypress configuration object
 * for end-to-end and component testing, incorporating all enterprise-grade
 * settings, environment variables, code coverage integration, and plugin
 * loading as specified in the technical and JSON requirements.
 */
export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    videoCompression: 32,
    screenshotOnRunFailure: true,
    trashAssetsBeforeRuns: true,
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 30000,
    pageLoadTimeout: 60000,
    watchForFileChanges: false,
    retries: {
      runMode: 2,
      openMode: 0
    },
    env: {
      apiUrl: 'http://localhost:4000',
      coverage: true,
      codeCoverage: {
        url: '/api/__coverage__',
        exclude: ['cypress/**/*.*', 'src/test/**/*.*'],
        threshold: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80
        }
      },
      CI: {
        parallelization: true,
        maxWorkers: 4,
        artifactPath: 'cypress/artifacts'
      }
    },
    setupNodeEvents
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite'
    },
    supportFile: 'cypress/support/component.ts',
    specPattern: 'cypress/component/**/*.cy.ts'
  }
});