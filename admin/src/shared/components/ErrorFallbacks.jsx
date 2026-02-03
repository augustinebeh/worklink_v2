/**
 * Error Fallback Components
 * Provides various fallback UIs for different error scenarios
 */

import { RefreshCwIcon, AlertTriangleIcon, WifiOffIcon, ServerCrashIcon, LockIcon } from 'lucide-react';
import Button from '../../components/ui/Button';

/**
 * Network Error Fallback
 */
export function NetworkErrorFallback({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
        <WifiOffIcon className="h-8 w-8 text-amber-600 dark:text-amber-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Network Connection Lost
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-sm">
        Please check your internet connection and try again.
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}

/**
 * Server Error Fallback
 */
export function ServerErrorFallback({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
        <ServerCrashIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Server Error
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-sm">
        Our servers are experiencing issues. Please try again in a few moments.
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          <RefreshCwIcon className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}

/**
 * Authorization Error Fallback
 */
export function AuthErrorFallback({ onLogin }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
        <LockIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Authentication Required
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-sm">
        You need to log in to access this content.
      </p>
      {onLogin && (
        <Button onClick={onLogin} variant="primary">
          Log In
        </Button>
      )}
    </div>
  );
}

/**
 * Not Found Error Fallback
 */
export function NotFoundFallback({ message = "The page you're looking for doesn't exist.", onGoBack, onGoHome }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="text-6xl font-bold text-gray-300 dark:text-gray-600 mb-4">
        404
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Page Not Found
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm">
        {message}
      </p>
      <div className="flex gap-2">
        {onGoBack && (
          <Button onClick={onGoBack} variant="outline">
            Go Back
          </Button>
        )}
        {onGoHome && (
          <Button onClick={onGoHome} variant="primary">
            Go Home
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Data Loading Error Fallback
 */
export function DataErrorFallback({ message = "Failed to load data", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <AlertTriangleIcon className="h-8 w-8 text-amber-500 mb-3" />
      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">
        Loading Error
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
        {message}
      </p>
      {onRetry && (
        <Button onClick={onRetry} size="sm" variant="outline">
          <RefreshCwIcon className="h-4 w-4 mr-1" />
          Retry
        </Button>
      )}
    </div>
  );
}

/**
 * Generic Component Error Fallback
 */
export function ComponentErrorFallback({ onRetry, componentName = "Component" }) {
  return (
    <div className="flex flex-col items-center justify-center p-6 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
      <AlertTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400 mb-2" />
      <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
        {componentName} Error
      </h4>
      <p className="text-xs text-red-700 dark:text-red-300 mb-3 text-center">
        This component couldn't be displayed due to an error.
      </p>
      {onRetry && (
        <Button onClick={onRetry} size="sm" variant="outline" className="text-red-700 border-red-300 hover:bg-red-100 dark:text-red-300 dark:border-red-600 dark:hover:bg-red-900/40">
          Try Again
        </Button>
      )}
    </div>
  );
}

/**
 * Empty State Fallback (not exactly an error, but useful)
 */
export function EmptyStateFallback({
  title = "No data available",
  message = "There's nothing to show here yet.",
  action,
  actionLabel = "Add New",
  icon: Icon = AlertTriangleIcon
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <Icon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
      </div>
      <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-sm">
        {message}
      </p>
      {action && (
        <Button onClick={action} variant="primary" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * Form Validation Error Fallback
 */
export function ValidationErrorFallback({ errors = [], onDismiss }) {
  if (!errors.length) return null;

  return (
    <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            Please fix the following errors:
          </h3>
          <ul className="text-sm text-red-700 dark:text-red-300 mt-2 space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="flex items-center gap-2">
                <span className="w-1 h-1 bg-red-500 rounded-full flex-shrink-0"></span>
                {error}
              </li>
            ))}
          </ul>
          {onDismiss && (
            <div className="mt-3">
              <Button
                size="sm"
                variant="outline"
                onClick={onDismiss}
                className="text-red-700 border-red-300 hover:bg-red-100 dark:text-red-300 dark:border-red-600 dark:hover:bg-red-900/40"
              >
                Dismiss
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}