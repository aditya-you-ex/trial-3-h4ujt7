import React, { Component, ReactNode, ErrorInfo } from 'react'; // react@^18.0.0
import { ErrorState } from './ErrorState';
import { ErrorResponse } from '../../types/common.types';

/**
 * ErrorBoundaryProps
 * ----------------------------------------------------------------------------
 * Defines the props for the ErrorBoundary component, which wrap child
 * components to catch and handle runtime errors. It supports:
 *  - Optional custom fallback UI (fallback).
 *  - An optional error callback (onError).
 *  - A unique errorPersistKey for persisting and restoring error state.
 *  - The child components (children) which may throw errors.
 */
export interface ErrorBoundaryProps {
  /**
   * React children to be rendered and monitored for errors.
   */
  children: ReactNode;

  /**
   * Optional custom fallback UI to display when an error is caught.
   * If not provided, a default visual ErrorState is rendered.
   */
  fallback?: ReactNode;

  /**
   * Optional callback invoked after an error is caught. Useful for logging
   * or error tracking solutions. Receives the error and React errorInfo.
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;

  /**
   * Optional key used to persist error state in localStorage. If provided,
   * the error boundary will attempt to restore and display a previously
   * captured error on mount.
   */
  errorPersistKey?: string;
}

/**
 * ErrorBoundaryState
 * ----------------------------------------------------------------------------
 * Maintains the runtime error state for the ErrorBoundary component.
 *  - hasError: set to true when an error is caught.
 *  - error: the actual error object, or null if no error.
 *  - errorInfo: additional React stack info about the error context.
 *  - retryCount: number of times the user has attempted to retry.
 */
export interface ErrorBoundaryState {
  /**
   * Indicates whether an error has been encountered.
   */
  hasError: boolean;

  /**
   * The caught error object, or null if no error is currently present.
   */
  error: Error | null;

  /**
   * Additional information about the error context, like component stack.
   */
  errorInfo: ErrorInfo | null;

  /**
   * The number of retries attempted by the user when an error is displayed.
   */
  retryCount: number;
}

/**
 * ErrorBoundary
 * ----------------------------------------------------------------------------
 * A robust React error boundary class component that catches JavaScript
 * errors anywhere in the child component tree. It provides:
 *  - Enhanced error handling with an optional callback.
 *  - Automatic persistent storage of error state if a key is provided.
 *  - A retry mechanism with a configurable maximum attempt guard.
 *  - WCAG 2.1 AA accessibility, ensuring we properly announce error states.
 *
 * Implementation Steps:
 *  1) The constructor initializes default error-state values and optionally
 *     restores persisted errors from localStorage if errorPersistKey is set.
 *  2) The static getDerivedStateFromError triggers whenever a child component
 *     throws, updating hasError and capturing the error.
 *  3) The componentDidCatch lifecycle method logs the error and calls any
 *     provided onError callback.
 *  4) The handleRetry method attempts to reset the boundary state and
 *     re-mount children if conditions allow.
 *  5) Render method conditionally shows either the custom fallback UI,
 *     a default ErrorState, or the original child components.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  /**
   * Supply a maximum number of times a user can retry
   * before we lock further attempts.
   */
  private static MAX_RETRY_ATTEMPTS = 3;

  /**
   * Constructs the ErrorBoundary instance. Sets the initial state and,
   * if errorPersistKey is provided, attempts to restore a previously
   * captured error from localStorage.
   */
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };

    // Restore any persisted error state if errorPersistKey is provided.
    if (this.props.errorPersistKey) {
      try {
        const storedErrorJSON = localStorage.getItem(this.props.errorPersistKey);
        if (storedErrorJSON) {
          const parsed = JSON.parse(storedErrorJSON);
          if (parsed && parsed.hasError && parsed.error) {
            // Safely restore the relevant fields.
            this.state = {
              hasError: true,
              error: new Error(parsed.error?.message || 'Persistent error'),
              errorInfo: null,
              retryCount: parsed.retryCount || 0,
            };
          }
        }
      } catch {
        // Fallback if parsing fails or localStorage is unavailable.
      }
    }
  }

  /**
   * React lifecycle method: Invoked when an error is thrown in a child component.
   * Returns updated state with hasError set to true and the error object captured.
   * This is a static method, so we cannot access instance fields directly.
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * React lifecycle method: Called after an error has been rendered by
   * getDerivedStateFromError. Typically used for side-effects such as logging.
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update the retry count each time we catch a new error.
    this.setState((prevState) => ({
      retryCount: prevState.retryCount + 1,
      errorInfo,
    }));

    // If the parent component provided an onError callback, invoke it now.
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Optionally persist error details to localStorage.
    this.persistErrorState(error);
  }

  /**
   * Attempts to retry rendering child components by resetting error-related state,
   * provided the maximum retry threshold has not been reached.
   */
  handleRetry = (): void => {
    // Check if we've hit the maximum number of retries.
    if (this.state.retryCount >= ErrorBoundary.MAX_RETRY_ATTEMPTS) {
      // We can log or ignore further attempts.
      return;
    }

    // Clear any persisted error from storage first.
    if (this.props.errorPersistKey) {
      localStorage.removeItem(this.props.errorPersistKey);
    }

    // Reset the error boundary state, effectively re-rendering children.
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Persists the current error details to localStorage under errorPersistKey,
   * if defined. This includes hasError, the error's message, and the current
   * retryCount to enable a consistent restoration of state between sessions
   * or user interactions.
   */
  private persistErrorState(error: Error): void {
    if (!this.props.errorPersistKey) return;

    try {
      const toStore = {
        hasError: true,
        error: { message: error.message },
        retryCount: this.state.retryCount + 1,
      };
      localStorage.setItem(this.props.errorPersistKey, JSON.stringify(toStore));
    } catch {
      // Fail silently if localStorage is unavailable or quota is exceeded.
    }
  }

  /**
   * Render function:
   *  1) If an error is present, either render a custom fallback UI if provided,
   *     or the default <ErrorState> with retry functionality.
   *  2) Otherwise, render the original child components normally.
   */
  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // If a custom fallback UI is specified, render it.
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Otherwise, render the default ErrorState with standardized design.
      // We pass a user-friendly message string from the error object
      // along with the handleRetry callback to allow the user to attempt
      // recovery if possible.
      const fallbackErrorMessage: ErrorResponse = {
        code: 'UI_RUNTIME_ERROR',
        message: this.state.error.message,
        details: {},
        stack: undefined,
        timestamp: new Date(),
      };

      return (
        <ErrorState
          error={fallbackErrorMessage}
          onRetry={this.handleRetry}
        />
      );
    }

    // No error has been encountered, render children normally.
    return this.props.children;
  }
}

export { ErrorBoundaryProps, ErrorBoundaryState, ErrorBoundary };