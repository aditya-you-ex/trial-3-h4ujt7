// @types/jest v^29.5.0 - TypeScript type definitions for Jest
// ts-jest v^29.1.0 - TypeScript preprocessor for Jest
// @testing-library/jest-dom v^5.16.5 - Custom Jest matchers for DOM testing

import type { Config } from '@jest/types';

/**
 * Comprehensive Jest configuration for TaskStream AI's web application.
 * This configuration enforces code quality standards with a minimum of
 * 80% coverage thresholds, integrates TypeScript with ts-jest for seamless
 * test preprocessing, and sets up the jsdom environment to properly test
 * React 18+ components. It also maps internal module paths to improve
 * import readability and utilizes @testing-library/jest-dom for DOM-related
 * matchers.
 */
const config: Config.InitialOptions = {
  // Preset used to transform TypeScript test files via ts-jest
  preset: 'ts-jest',

  /**
   * Defines the environment in which tests are run.
   * 'jsdom' simulates a browser-like environment for
   * frontend component and DOM testing.
   */
  testEnvironment: 'jsdom',

  /**
   * The 'roots' array restricts Jest to only look for test files
   * within the specified directories. This project keeps all
   * testable source code within the 'src' folder.
   */
  roots: ['<rootDir>/src'],

  /**
   * File extensions that Jest accounts for when scanning for tests.
   * This includes both TypeScript and JavaScript variants to cover
   * all relevant code files.
   */
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  /**
   * Indicates whether coverage information should be collected.
   * In alignment with enterprise requirements, code coverage
   * metrics must be generated.
   */
  collectCoverage: true,

  /**
   * Defines the directory to which Jest writes coverage reports.
   * This is especially important for automated pipelines and
   * reporting tools within TaskStream AI's CI/CD process.
   */
  coverageDirectory: 'coverage',

  /**
   * Enforces a global minimum of 80% coverage across branches,
   * functions, lines, and statements, upholding TaskStream AI's
   * strict code quality standards.
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
   * Provides custom mapping for resolving module imports.
   * This aligns with TaskStream AI's directory structure
   * to improve clarity, maintainability, and scalability.
   */
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@pages/(.*)$': '<rootDir>/src/pages/$1',
    '^@store/(.*)$': '<rootDir>/src/store/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@types/(.*)$': '<rootDir>/src/types/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@assets/(.*)$': '<rootDir>/src/assets/$1',
    '^@styles/(.*)$': '<rootDir>/src/styles/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/src/__mocks__/fileMock.js',
  },

  /**
   * Specifies which files Jest will recognize as valid test files.
   * Both 'test' and 'spec' suffixes are supported, as well as
   * TypeScript and JavaScript expansions.
   */
  testMatch: [
    '<rootDir>/src/**/*.test.ts',
    '<rootDir>/src/**/*.test.tsx',
    '<rootDir>/src/**/*.spec.ts',
    '<rootDir>/src/**/*.spec.tsx',
  ],

  /**
   * Excludes certain directories from the testing and coverage process
   * to improve performance and avoid scanning unneeded files or build output.
   */
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/'],

  /**
   * Instructs Jest how to transform files before running tests.
   * This ensures TypeScript is properly compiled to JavaScript.
   */
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },

  /**
   * Array of modules that Jest loads before each test file is run.
   * @testing-library/jest-dom adds custom matchers that are
   * particularly helpful when testing DOM elements in React.
   */
  setupFilesAfterEnv: ['@testing-library/jest-dom'],

  /**
   * Defines global configurations for ts-jest, such as specifying
   * a particular tsconfig file for the TypeScript setup.
   */
  globals: {
    'ts-jest': {
      tsconfig: './tsconfig.json',
    },
  },

  /**
   * When set to true, Jest outputs individual test results with
   * detailed information during the run.
   */
  verbose: true,

  /**
   * Limits the number of worker processes used to run tests in parallel.
   * This '50%' setting is a balanced choice between speed and resource usage.
   */
  maxWorkers: '50%',

  /**
   * Specifies the maximum time (in milliseconds) before a test is
   * considered to have timed out. This is set higher to accommodate
   * potentially long-running integration or UI tests.
   */
  testTimeout: 10000,

  /**
   * Reporters monitor and report on test run results. In addition to
   * the default console reporter, jest-junit is used to produce
   * JUnit XML output, which integrates seamlessly with many CI tools.
   */
  reporters: ['default', 'jest-junit'],

  /**
   * Specifies which coverage report formats are generated.
   * Multiple formats allow for a comprehensive view of coverage
   * in multiple tools, including HTML (interactive browser view),
   * text, JSON summary, and the lcov format.
   */
  coverageReporters: ['text', 'lcov', 'json-summary', 'html'],
};

/**
 * Named export exposing the testEnvironment from the config.
 * This enables direct referencing in any environment-related checks.
 */
export const testEnvironment = config.testEnvironment;

/**
 * Named export exposing the coverageThreshold, allowing
 * external scripts or build pipelines to override or inspect
 * coverage rules if necessary.
 */
export const coverageThreshold = config.coverageThreshold;

/**
 * Default export of the comprehensive Jest configuration object.
 * This enables Jest to consume the configuration seamlessly
 * for all test operations across the TaskStream AI web codebase.
 */
export default config;