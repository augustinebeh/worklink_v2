import { Component } from 'react';
import { RefreshCwIcon, AlertTriangleIcon, HomeIcon } from 'lucide-react';

/**
 * ErrorBoundary - Catches React errors and prevents white screens
 * Shows a friendly error message with options to retry or go home
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-6">
          <div className="w-full max-w-sm text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangleIcon className="h-8 w-8 text-red-400" />
            </div>

            <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-dark-400 mb-6">
              The page encountered an error. Please try again.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleRetry}
                className="w-full py-3 px-4 rounded-xl bg-primary-500 text-white font-semibold flex items-center justify-center gap-2 hover:bg-primary-600 transition-colors"
              >
                <RefreshCwIcon className="h-5 w-5" />
                Try Again
              </button>

              <button
                onClick={this.handleGoHome}
                className="w-full py-3 px-4 rounded-xl bg-dark-800 text-white font-medium flex items-center justify-center gap-2 hover:bg-dark-700 transition-colors"
              >
                <HomeIcon className="h-5 w-5" />
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
