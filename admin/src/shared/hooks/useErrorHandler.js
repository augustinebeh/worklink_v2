/**
 * Error Handler Hook
 * Provides centralized error handling throughout the application
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Hook for handling errors with user-friendly messages
 */
export function useErrorHandler() {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { logout } = useAuth();

  /**
   * Handle different types of errors with appropriate responses
   */
  const handleError = useCallback((error, context = {}) => {
    console.error('Error handled:', error, context);

    // Extract error information
    const errorInfo = {
      message: error?.message || 'An unexpected error occurred',
      status: error?.status || error?.response?.status,
      type: error?.name || 'Error',
      context
    };

    // Handle specific error types
    switch (errorInfo.status) {
      case 401:
        // Unauthorized - redirect to login
        console.warn('🔐 Unauthorized access detected, logging out...');
        logout();
        return {
          message: 'Your session has expired. Please log in again.',
          shouldRedirect: true,
          severity: 'warning'
        };

      case 403:
        // Forbidden - access denied
        return {
          message: 'You do not have permission to perform this action.',
          severity: 'warning'
        };

      case 404:
        // Not found
        return {
          message: context.resourceName
            ? `${context.resourceName} not found.`
            : 'The requested resource was not found.',
          severity: 'info'
        };

      case 422:
        // Validation error
        return {
          message: 'Please check your inputs and try again.',
          severity: 'warning',
          details: error?.data?.errors
        };

      case 429:
        // Rate limit exceeded
        return {
          message: 'You are making too many requests. Please wait a moment and try again.',
          severity: 'warning'
        };

      case 500:
      case 502:
      case 503:
      case 504:
        // Server errors
        return {
          message: 'Our servers are experiencing issues. Please try again later.',
          severity: 'error'
        };

      case 408:
        // Timeout
        return {
          message: 'The request timed out. Please check your connection and try again.',
          severity: 'warning'
        };

      default:
        // Network or unknown errors
        if (error?.name === 'NetworkError' || !navigator.onLine) {
          return {
            message: 'No internet connection. Please check your network and try again.',
            severity: 'warning'
          };
        }

        // Generic error
        return {
          message: errorInfo.message,
          severity: 'error'
        };
    }
  }, [logout]);

  /**
   * Wrap an async function with error handling
   */
  const withErrorHandling = useCallback((asyncFn, context = {}) => {
    return async (...args) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await asyncFn(...args);
        return result;
      } catch (err) {
        const errorResponse = handleError(err, context);
        setError(errorResponse);
        throw err; // Re-throw for component-level handling if needed
      } finally {
        setIsLoading(false);
      }
    };
  }, [handleError]);

  /**
   * Manual error setting
   */
  const setErrorMessage = useCallback((message, severity = 'error') => {
    setError({ message, severity });
  }, []);

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Handle form validation errors
   */
  const handleValidationErrors = useCallback((errors) => {
    if (Array.isArray(errors)) {
      setError({
        message: 'Please fix the following errors:',
        severity: 'warning',
        details: errors
      });
    } else if (typeof errors === 'object') {
      const errorMessages = Object.values(errors).flat();
      setError({
        message: 'Please fix the following errors:',
        severity: 'warning',
        details: errorMessages
      });
    } else {
      setError({
        message: errors || 'Validation failed',
        severity: 'warning'
      });
    }
  }, []);

  return {
    error,
    isLoading,
    handleError,
    withErrorHandling,
    setErrorMessage,
    clearError,
    handleValidationErrors
  };
}

/**
 * Hook for handling API errors specifically
 */
export function useApiErrorHandler() {
  const { handleError, ...rest } = useErrorHandler();

  const handleApiError = useCallback((error, resourceName) => {
    return handleError(error, { resourceName, source: 'api' });
  }, [handleError]);

  const withApiErrorHandling = useCallback((apiCall, resourceName) => {
    return rest.withErrorHandling(apiCall, { resourceName, source: 'api' });
  }, [rest.withErrorHandling]);

  return {
    ...rest,
    handleApiError,
    withApiErrorHandling
  };
}

/**
 * Hook for handling form errors
 */
export function useFormErrorHandler() {
  const { handleValidationErrors, ...rest } = useErrorHandler();

  const handleFieldError = useCallback((field, message) => {
    rest.setErrorMessage(`${field}: ${message}`, 'warning');
  }, [rest]);

  return {
    ...rest,
    handleValidationErrors,
    handleFieldError
  };
}

/**
 * Global error handler for unhandled promise rejections and errors
 */
export function setupGlobalErrorHandling() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled promise rejection:', event.reason);

    // Prevent browser console error
    event.preventDefault();

    // You could show a global toast notification here
    console.warn('An unexpected error occurred. Please try refreshing the page.');
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    console.error('🚨 Uncaught error:', event.error);

    // You could show a global toast notification here
    console.warn('An unexpected error occurred. Please try refreshing the page.');
  });

  console.log('✅ Global error handlers installed');
}

/**
 * Context for error recovery actions
 */
export const ERROR_RECOVERY_ACTIONS = {
  RETRY: 'retry',
  REFRESH: 'refresh',
  NAVIGATE_HOME: 'navigate_home',
  LOGIN: 'login',
  CONTACT_SUPPORT: 'contact_support'
};

/**
 * Get suggested recovery actions based on error type
 */
export function getRecoveryActions(error) {
  const actions = [];

  switch (error?.status) {
    case 401:
      actions.push(ERROR_RECOVERY_ACTIONS.LOGIN);
      break;

    case 404:
      actions.push(ERROR_RECOVERY_ACTIONS.NAVIGATE_HOME);
      break;

    case 429:
    case 500:
    case 502:
    case 503:
    case 504:
      actions.push(ERROR_RECOVERY_ACTIONS.RETRY);
      break;

    case 408:
      actions.push(ERROR_RECOVERY_ACTIONS.RETRY, ERROR_RECOVERY_ACTIONS.REFRESH);
      break;

    default:
      actions.push(ERROR_RECOVERY_ACTIONS.RETRY, ERROR_RECOVERY_ACTIONS.REFRESH);
      if (error?.severity === 'error') {
        actions.push(ERROR_RECOVERY_ACTIONS.CONTACT_SUPPORT);
      }
  }

  return actions;
}

export default useErrorHandler;