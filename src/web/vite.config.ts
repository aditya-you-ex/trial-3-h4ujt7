/**
 * Vite configuration file for TaskStream AI Web Application.
 * This file defines comprehensive build, development, and optimization
 * settings to ensure an enterprise-ready, production-grade environment.
 */

import { defineConfig } from 'vite' // vite ^4.4.0
import react from '@vitejs/plugin-react' // @vitejs/plugin-react ^4.0.1
import tsconfigPaths from 'vite-tsconfig-paths' // vite-tsconfig-paths ^4.2.0

export default defineConfig({
  /**
   * Array of Vite plugins used for this project.
   * - @vitejs/plugin-react for React 18+ with Fast Refresh support.
   * - vite-tsconfig-paths for resolving custom TypeScript paths.
   */
  plugins: [react(), tsconfigPaths()],

  /**
   * Development server settings.
   * - port: The port on which the dev server will listen (default 3000).
   * - host: True enables listening on all IPv4 addresses, allowing network access.
   * - proxy: Configures dev-time HTTP and WebSocket proxies for local APIs.
   */
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },

  /**
   * Production build settings.
   * - outDir: Directory for build output.
   * - sourcemap: Generate source maps for debugging production code.
   * - minify: Terser used for minification to optimize final bundle size.
   * - target: Sets the baseline environment (ESNext).
   * - chunkSizeWarningLimit: Defines max chunk size before warning (kB).
   * - rollupOptions: Custom Rollup config, manualChunks to chunk out common libraries.
   */
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    target: 'esnext',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: [
            'react',
            'react-dom',
            'react-router-dom',
            '@mui/material',
            '@reduxjs/toolkit',
            'd3',
          ],
        },
      },
    },
  },

  /**
   * Module resolution settings.
   * - alias: Customized shortcuts for common import paths, improving maintainability.
   */
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@pages': '/src/pages',
      '@store': '/src/store',
      '@services': '/src/services',
      '@hooks': '/src/hooks',
      '@utils': '/src/utils',
      '@types': '/src/types',
      '@constants': '/src/constants',
      '@config': '/src/config',
      '@assets': '/src/assets',
      '@styles': '/src/styles',
    },
  },

  /**
   * CSS handling configuration.
   * - modules.localsConvention: Enforces camelCase for class names.
   * - preprocessorOptions: Automatically injects global variables and mixins for SCSS.
   */
  css: {
    modules: {
      localsConvention: 'camelCase',
    },
    preprocessorOptions: {
      scss: {
        additionalData: '@import "@styles/variables.css";',
      },
    },
  },

  /**
   * Dependencies optimization (during dev and build).
   * - Ensures Vite pre-bundles certain libraries for faster startup.
   */
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@mui/material',
      '@reduxjs/toolkit',
      'd3',
    ],
  },

  /**
   * Test configuration for Vitest.
   * - globals: True allows using test globals like describe(), it(), expect() globally.
   * - environment: 'jsdom' simulates a browser environment.
   * - setupFiles: Additional scripts to run before test files.
   */
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})