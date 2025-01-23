/**
 * Jest configuration file for TaskStream AI backend services.
 * This configuration applies to all test types (NLP, analytics, authentication, task management, etc.)
 * and enforces enterprise-grade code quality standards, including minimum 80% coverage.
 *
 * External Dependencies:
 * @types/jest v^29.5.0 - Provides TypeScript type definitions for Jest testing framework
 * ts-jest v^29.1.0     - TypeScript preprocessor for Jest enabling TypeScript test execution
 */

import type { Config } from '@jest/types'; // @types/jest v^29.5.0

/**
 * Comprehensive Jest configuration object implementing all required
 * test patterns, coverage thresholds, module mappings, and environment settings.
 */
const config: Config.InitialOptions = {
  /**
   * Use 'ts-jest' as the Jest preset to handle TypeScript files seamlessly.
   * This preset is responsible for transforming .ts and .tsx files during tests.
   */
  preset: 'ts-jest', // ts-jest v^29.1.0

  /**
   * Specifies the test environment to be 'node', ensuring the Node.js environment
   * is used for backend service testing, including for NLP, analytics, and authentication.
   */
  testEnvironment: 'node',

  /**
   * Defines the root directories that Jest will scan for tests.
   * Any test files under these directories will be automatically included.
   */
  roots: ['<rootDir>/src'],

  /**
   * Acceptable file extensions that will be processed during testing.
   * Ensures coverage for TypeScript/JavaScript as well as JSON files if needed.
   */
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  /**
   * Enables coverage collection to ensure code quality thresholds are met.
   * Storing all coverage outputs within the specified directory for reporting.
   */
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',

  /**
   * Global coverage thresholds that must be satisfied by every pull request.
   * Enforces a minimum of 80% across branches, functions, lines, and statements.
   */
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  /**
   * Custom module name mappers for simplified import paths in tests.
   * Allows referencing directories like @shared, @config, @services, etc.
   */
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@nlp/(.*)$': '<rootDir>/src/nlp/$1',
  },

  /**
   * Patterns Jest will use to identify and run test files.
   * Includes both __tests__ directories and *.{spec,test} naming conventions.
   */
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],

  /**
   * Directories and paths to ignore while searching for test files.
   * This ensures we skip the node_modules, dist build output, and coverage directories.
   */
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/'],

  /**
   * Transform directive mapping any .ts or .tsx file through ts-jest,
   * enabling TypeScript transformation within Jest's testing lifecycle.
   */
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },

  /**
   * Setup files automatically executed by Jest after the test framework is installed.
   * Typically used to initialize global test configurations or utilities.
   */
  setupFilesAfterEnv: ['<rootDir>/src/test/utils/test-setup.ts'],

  /**
   * Global options specific to ts-jest, such as specifying a custom tsconfig file
   * that may include test-specific compiler options or paths.
   */
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
    },
  },

  /**
   * Enable verbose logging for test results, showing all individual test suites and checks.
   * Useful in CI/CD pipelines for detailed feedback.
   */
  verbose: true,

  /**
   * Configures the maximum number of worker processes that Jest can spawn simultaneously.
   * Expressed as a percentage of the available CPU cores for balanced resource usage.
   */
  maxWorkers: '50%',

  /**
   * Maximum time in milliseconds that a test is allowed to run before it is aborted.
   * This helps to prevent infinite loops or excessively long-running tests.
   */
  testTimeout: 30000,

  /**
   * An array of reporter names that Jest uses when writing coverage reports or test results.
   * 'jest-junit' generates an XML-based report suitable for CI analysis.
   */
  reporters: ['default', 'jest-junit'],

  /**
   * A list of coverage reporter names that Jest uses when writing coverage reports.
   * Contains text for console output, lcov for HTML rendering, and json-summary for deeper CI integration.
   */
  coverageReporters: ['text', 'lcov', 'json-summary'],

  /**
   * Multiple projects can be specified to segregate tests by domains or functionalities.
   * Each block defines its own identification and matching patterns for test files.
   */
  projects: [
    {
      displayName: 'nlp',
      testMatch: ['<rootDir>/src/nlp/**/*.test.ts'],
    },
    {
      displayName: 'analytics',
      testMatch: ['<rootDir>/src/services/analytics/**/*.test.ts'],
    },
    {
      displayName: 'auth',
      testMatch: ['<rootDir>/src/services/auth/**/*.test.ts'],
    },
    {
      displayName: 'tasks',
      testMatch: ['<rootDir>/src/services/tasks/**/*.test.ts'],
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/services/integration/**/*.test.ts'],
    },
  ],
};

/**
 * Default export for the complete Jest configuration object.
 * This should be imported by Jest to execute tests accurately.
 */
export default config;

/**
 * Named export of the testEnvironment property for potential separate references
 * if needed by specialized test runners or environment validations.
 */
export const testEnvironment = config.testEnvironment;

/**
 * Named export of the roots property for advanced usage scenarios in multi-repo or multi-root setups.
 */
export const roots = config.roots;