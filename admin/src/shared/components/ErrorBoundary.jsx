/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI
 */

import React from 'react';
import { RefreshCwIcon, AlertTriangleIcon, HomeIcon, BugIcon } from 'lucide-react';
import Button from '../../components/ui/Button';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    this.setState({
      error,
      errorInfo
    });

    // Log to console in development
    if (import.meta.env.DEV) {
      console.group('🔥 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.groupEnd();
    }

    // In production, you might want to log to an error reporting service
    this.logErrorToService(error, errorInfo);
  }

  logErrorToService = (error, errorInfo) => {
    try {
      const errorReport = {
        id: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: sessionStorage.getItem('admin_user') ? JSON.parse(sessionStorage.getItem('admin_user')).id : 'anonymous',
        buildVersion: import.meta.env.VITE_BUILD_VERSION || 'unknown'
      };

      // In development, just log to console
      if (import.meta.env.DEV) {
        console.log('📊 Error Report:', errorReport);
        return;
      }

      // In production, send to error tracking service
      // Example: Sentry, LogRocket, Bugsnag, etc.
      /*
      fetch('/api/v1/errors/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(errorReport)
      }).catch(err => {
        console.warn('Failed to report error:', err);
      });
      */
    } catch (reportError) {
      console.warn('Failed to create error report:', reportError);
    }
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleGoHome = () => {
    window.location.href = '/admin';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { level = 'page' } = this.props;

      // Different UI based on error boundary level
      if (level === 'component') {
        return (
          <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <AlertTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Component Error
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  This component encountered an error and couldn't be displayed.
                </p>
                {import.meta.env.DEV && this.state.error && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer">
                      Error Details
                    </summary>
                    <pre className="text-xs text-red-600 dark:text-red-400 mt-1 whitespace-pre-wrap">
                      {this.state.error.message}
                    </pre>
                  </details>
                )}
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={this.handleRetry}
                    className="text-red-700 border-red-300 hover:bg-red-100 dark:text-red-300 dark:border-red-600 dark:hover:bg-red-900/40"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Page-level or app-level error boundary
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl p-8 text-center">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <AlertTriangleIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
            </div>

            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Oops! Something went wrong
            </h2>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We're sorry, but something unexpected happened. Our team has been notified and is working on a fix.
            </p>

            {this.state.errorId && (
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-6">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Error ID: {this.state.errorId}
                </p>
              </div>
            )}

            {import.meta.env.DEV && this.state.error && (
              <details className="text-left mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer mb-2">
                  <BugIcon className="inline h-4 w-4 mr-1" />
                  Development Error Details
                </summary>
                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
                  <div>
                    <strong>Error:</strong>
                    <pre className="whitespace-pre-wrap mt-1">{this.state.error.message}</pre>
                  </div>
                  {this.state.error.stack && (
                    <div>
                      <strong>Stack Trace:</strong>
                      <pre className="whitespace-pre-wrap mt-1 text-xs">{this.state.error.stack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="space-y-3">
              <Button
                onClick={this.handleRetry}
                className="w-full"
                variant="primary"
              >
                <RefreshCwIcon className="h-4 w-4 mr-2" />
                Try Again
              </Button>

              <div className="flex gap-2">
                <Button
                  onClick={this.handleGoHome}
                  className="flex-1"
                  variant="outline"
                >
                  <HomeIcon className="h-4 w-4 mr-2" />
                  Go Home
                </Button>

                <Button
                  onClick={this.handleReload}
                  className="flex-1"
                  variant="outline"
                >
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
                  Reload Page
                </Button>
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
              If this problem persists, please contact our support team.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for adding error boundary to any component
 */
export function withErrorBoundary(Component, errorBoundaryProps = {}) {
  return function ComponentWithErrorBoundary(props) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Hook for programmatically triggering error boundaries
 */
export function useErrorHandler() {
  return (error) => {
    // Throwing an error in a component will trigger the nearest error boundary
    if (error) {
      throw error;
    }
  };
}

/**
 * Async error boundary for handling promise rejections
 */
export class AsyncErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Async Error Boundary caught error:', error, errorInfo);
  }

  componentDidMount() {
    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  handleUnhandledRejection = (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    this.setState({ hasError: true });

    // Prevent the default browser behavior
    event.preventDefault();
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50">
          <h3 className="text-sm font-medium text-red-800">Async Error</h3>
          <p className="text-sm text-red-700 mt-1">
            An async operation failed. Please try again.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;