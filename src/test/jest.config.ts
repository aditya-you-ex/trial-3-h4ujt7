/*************************************************************************************************
 * JEST CONFIGURATION FILE FOR TASKSTREAM AI
 *
 * This file defines an enterprise-grade Jest configuration that supports:
 *  - Comprehensive test execution across multiple projects (unit, integration, e2e, performance, etc.)
 *  - AI/ML component testing and performance monitoring
 *  - Enhanced coverage thresholds (≥80% on branches, functions, lines, statements)
 *  - Module resolution mappings to streamline imports for various test suites
 *  - Extensive comments per the coding standards (S1), addressing:
 *      1) Code Quality Standards (minimum 80% coverage)
 *      2) Test Environment Setup (all project components)
 *      3) System Reliability (aiming for 99.9% uptime through rigorous testing)
 *      4) AI/ML Component Testing (support for NLP engine and predictive analytics)
 *
 * External Libraries (IE2) with version references:
 *   @types/jest            ^29.5.0  (TypeScript types for Jest)
 *   ts-jest               ^29.1.0  (TypeScript preprocessor for Jest)
 *   @testing-library/jest-dom  ^5.16.5 (Custom Jest matchers for DOM testing)
 *   jest-performance       ^1.0.0  (Performance testing extensions for Jest)
 *   jest-junit            ^15.0.0 (JUnit report generator for CI/CD integration)
 *
 * Internal Imports (IE1) for Enhanced Test Environment Setup:
 *   NOTE: The specification references setupMetricsCollection and setupResourceMonitoring,
 *   but these are not found in test-setup.ts. We only import and use what actually exists
 *   to maintain a correct and compilable configuration.
 *
 *************************************************************************************************/

// ------------------------------------------------------------------------------------------------
// 1) Optional Import of Jest's Type Definitions (Ensuring correct config object typing)
// ------------------------------------------------------------------------------------------------
import type { Config } from '@jest/types'; // version ^29.5.0

// ------------------------------------------------------------------------------------------------
// 2) Internal Import: Actual function found in test-setup.ts
//    (setupMetricsCollection and setupResourceMonitoring are not present in the codebase.)
// ------------------------------------------------------------------------------------------------
// import { setupTestEnvironment } from './utils/test-setup'; // Example if we needed to call it here

/*************************************************************************************************
 * Main Jest Configuration Object
 * This object is exported as default, meeting the "export default config" requirement.
 * Additionally, we export the coverageThreshold as a named export.
 *************************************************************************************************/
const config: Config.InitialOptions = {
  // ---------------------------------------------------------------------------------------------
  // Global Preset & Environment
  // ---------------------------------------------------------------------------------------------
  /**
   * Using ts-jest (version ^29.1.0) preset for TypeScript transformations and type-checking.
   */
  preset: 'ts-jest',

  /**
   * Setting the default test environment to Node.js to facilitate backend and integration tests.
   */
  testEnvironment: 'node',

  // ---------------------------------------------------------------------------------------------
  // File Roots & Extensions
  // ---------------------------------------------------------------------------------------------
  /**
   * The "roots" array tells Jest where to look for tests. "<rootDir>" dynamically references
   * the absolute path to the directory the config file is in or the project root.
   */
  roots: ['<rootDir>'],

  /**
   * Specifies the file extensions Jest recognizes. This includes TypeScript, JavaScript,
   * and JSON files. It's important for enterprise projects that have front-end (TSX) and
   * back-end (TS) tests.
   */
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // ---------------------------------------------------------------------------------------------
  // Coverage Collection & Thresholds
  // ---------------------------------------------------------------------------------------------
  /**
   * collectCoverage tells Jest to gather test coverage information. Combined with coverageDirectory,
   * we ensure a unified place to store coverage outputs.
   */
  collectCoverage: true,

  /**
   * The coverage reports will be output to <rootDir>/coverage. This can be used in CI/CD pipelines
   * to analyze coverage stats.
   */
  coverageDirectory: '<rootDir>/coverage',

  /**
   * This enforces minimum coverage thresholds for success. In alignment with the 80% coverage
   * requirement, anything below these thresholds will cause the test run to fail.
   */
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // ---------------------------------------------------------------------------------------------
  // Module Name Mappings
  // ---------------------------------------------------------------------------------------------
  /**
   * Allows rewriting module paths for simpler, domain-based imports in tests.
   * For instance, @test/ corresponds to <rootDir>/, @utils/ to <rootDir>/utils/, etc.
   */
  moduleNameMapper: {
    '@test/(.*)': '<rootDir>/$1',
    '@utils/(.*)': '<rootDir>/utils/$1',
    '@e2e/(.*)': '<rootDir>/e2e/$1',
    '@integration/(.*)': '<rootDir>/integration/$1',
    '@unit/(.*)': '<rootDir>/unit/$1',
    '@load/(.*)': '<rootDir>/load/$1',
    '@security/(.*)': '<rootDir>/security/$1',
    '@performance/(.*)': '<rootDir>/performance/$1',
    '@ai/(.*)': '<rootDir>/ai/$1',
    '@nlp/(.*)': '<rootDir>/nlp/$1'
  },

  // ---------------------------------------------------------------------------------------------
  // Test Match & Ignore Patterns
  // ---------------------------------------------------------------------------------------------
  /**
   * Glob patterns for discovering test files. By default, this picks up .test.ts or .spec.ts
   * anywhere in the repository.
   */
  testMatch: [
    '<rootDir>/**/*.test.ts',
    '<rootDir>/**/*.spec.ts'
  ],

  /**
   * Directories and files to exclude from test runs, preventing unnecessary scanning
   * or collisions with build artifacts.
   */
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],

  // ---------------------------------------------------------------------------------------------
  // Transform Settings
  // ---------------------------------------------------------------------------------------------
  /**
   * Indicates how Jest should transform different file types. We use ts-jest for .ts/.tsx.
   * The "isolatedModules": true and "diagnostics.warnOnly": true help maintain type-safety while
   * avoiding failing the test suite on TypeScript diagnostics warnings (they will be logged instead).
   */
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        isolatedModules: true,
        diagnostics: {
          warnOnly: true
        }
      }
    ]
  },

  // ---------------------------------------------------------------------------------------------
  // Setup Files
  // ---------------------------------------------------------------------------------------------
  /**
   * By listing files in "setupFilesAfterEnv", we ensure that certain scripts or initialization
   * code (e.g., global mocks, performance test hooks, AI/ML test scaffolding) run after the test
   * framework is installed but before individual tests. Example placeholders are included here.
   */
  setupFilesAfterEnv: [
    '<rootDir>/utils/test-setup.ts',
    '<rootDir>/utils/performance-setup.ts',
    '<rootDir>/utils/ai-test-setup.ts'
  ],

  // ---------------------------------------------------------------------------------------------
  // Global TS-Jest Configuration
  // ---------------------------------------------------------------------------------------------
  /**
   * Configures ts-jest to use the local tsconfig.json and to enable or disable specific diagnostics.
   */
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.json',
      diagnostics: true
    }
  },

  // ---------------------------------------------------------------------------------------------
  // Verbosity & Parallelism
  // ---------------------------------------------------------------------------------------------
  /**
   * Verbose output prints individual test names and statuses, which is often preferred in
   * large-scale or enterprise test suites for easier debugging.
   */
  verbose: true,

  /**
   * Limits the number of worker processes over which tests are parallelized. Using '50%' ensures
   * that half of the CPU cores are utilized, balancing speed with resource usage.
   */
  maxWorkers: '50%',

  /**
   * Increases the default Jest test timeout from 5 seconds to 30 seconds. This is particularly useful
   * for integration tests, AI/ML computations, or large volume data scenarios.
   */
  testTimeout: 30000,

  // ---------------------------------------------------------------------------------------------
  // Reporters & Coverage Reporting
  // ---------------------------------------------------------------------------------------------
  /**
   * Array of reporters that generate various output formats for test results. We include:
   *   1) default - standard console output
   *   2) jest-junit (version ^15.0.0) - generating XML test reports for CI/CD
   *   3) jest-performance/reporter (version ^1.0.0) - measuring test performance with threshold config
   */
  reporters: [
    'default',
    'jest-junit',
    [
      'jest-performance/reporter',
      {
        threshold: {
          maxExecutionTime: 5000
        }
      }
    ]
  ],

  /**
   * Coverage reports in multiple formats:
   *   - text: prints coverage summary to console
   *   - lcov: lcov.info file used by many coverage services
   *   - json-summary: concise .json with coverage statistics
   *   - html: human-readable coverage website
   *   - cobertura: XML-based coverage format widely used in enterprise CI
   */
  coverageReporters: [
    'text',
    'lcov',
    'json-summary',
    'html',
    'cobertura'
  ],

  // ---------------------------------------------------------------------------------------------
  // Projects Configuration
  // ---------------------------------------------------------------------------------------------
  /**
   * Jest multi-project runner, allowing separate configurations for different test categories:
   *  - unit
   *  - integration
   *  - e2e
   *  - performance
   *  - security
   *  - load
   *  - ai
   *  - nlp
   *
   * Each object can override certain global settings (like testMatch patterns, testTimeout, etc.).
   */
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/unit/**/*.test.ts'],
      testTimeout: 10000
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/integration/**/*.test.ts'],
      testTimeout: 20000
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/e2e/**/*.spec.ts'],
      testTimeout: 30000
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/performance/**/*.test.ts'],
      testTimeout: 60000,
      setupFilesAfterEnv: ['<rootDir>/utils/performance-setup.ts']
    },
    {
      displayName: 'security',
      testMatch: ['<rootDir>/security/**/*.test.ts'],
      testTimeout: 20000
    },
    {
      displayName: 'load',
      testMatch: ['<rootDir>/load/**/*.test.ts'],
      testTimeout: 120000,
      maxWorkers: '25%'
    },
    {
      displayName: 'ai',
      testMatch: ['<rootDir>/ai/**/*.test.ts'],
      testTimeout: 45000,
      setupFilesAfterEnv: ['<rootDir>/utils/ai-test-setup.ts']
    },
    {
      displayName: 'nlp',
      testMatch: ['<rootDir>/nlp/**/*.test.ts'],
      testTimeout: 45000,
      setupFilesAfterEnv: ['<rootDir>/utils/nlp-test-setup.ts']
    }
  ]
};

/**
 * Exporting the configuration object as default, fulfilling the requirement to
 * provide an enhanced Jest configuration object for a comprehensive test environment.
 */
export default config;

/**
 * Additionally exporting the coverageThreshold as requested by the specification:
 * Exports -> coverageThreshold object. This can be used externally if needed.
 */
export const coverageThreshold = config.coverageThreshold;