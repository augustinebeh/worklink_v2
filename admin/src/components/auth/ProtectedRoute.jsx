/**
 * ProtectedRoute Component
 * Handles route-level authentication and authorization
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * ProtectedRoute wrapper that ensures user is authenticated
 * and optionally checks for specific permissions or roles
 */
export function ProtectedRoute({
  children,
  requirePermission,
  requireRole,
  requireAuth = true,
  fallback = null
}) {
  const { isAuthenticated, loading, hasPermission, hasRole, user } = useAuth();
  const location = useLocation();

  // Show loading spinner while auth is being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    // Redirect to login with return URL
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // Check permission requirement
  if (requirePermission && !hasPermission(requirePermission)) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You don't have permission to access this resource.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Required permission: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{requirePermission}</code>
            </p>
          </div>
        </div>
      )
    );
  }

  // Check role requirement
  if (requireRole && !hasRole(requireRole)) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You don't have the required role to access this resource.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Required role: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{requireRole}</code>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Your role: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{user?.role || 'None'}</code>
            </p>
          </div>
        </div>
      )
    );
  }

  // All checks passed, render the protected content
  return children;
}

/**
 * Higher-order component version of ProtectedRoute
 * Usage: const ProtectedComponent = withAuth(MyComponent, { requirePermission: 'admin' });
 */
export function withAuth(Component, options = {}) {
  return function AuthenticatedComponent(props) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

/**
 * Hook for conditional rendering based on permissions
 * Usage: const canEdit = usePermission('users:edit');
 */
export function usePermission(permission) {
  const { hasPermission } = useAuth();
  return hasPermission(permission);
}

/**
 * Hook for conditional rendering based on roles
 * Usage: const isAdmin = useRole('admin');
 */
export function useRole(...roles) {
  const { hasRole } = useAuth();
  return hasRole(...roles);
}

/**
 * Component for conditionally rendering content based on permissions
 * Usage: <RequirePermission permission="users:edit">Edit Button</RequirePermission>
 */
export function RequirePermission({ permission, children, fallback = null }) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return fallback;
  }

  return children;
}

/**
 * Component for conditionally rendering content based on roles
 * Usage: <RequireRole role="admin">Admin Panel</RequireRole>
 */
export function RequireRole({ role, children, fallback = null }) {
  const { hasRole } = useAuth();

  if (!hasRole(role)) {
    return fallback;
  }

  return children;
}

export default ProtectedRoute;