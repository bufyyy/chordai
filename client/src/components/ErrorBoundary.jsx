import { Component } from 'react';

/**
 * Error Boundary component
 * Catches and displays errors gracefully
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // You could log to an error reporting service here
    // e.g., Sentry, LogRocket, etc.
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-8 max-w-2xl w-full border border-white/10 shadow-2xl">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-white text-center mb-4">
              Oops! Something went wrong
            </h1>

            {/* Description */}
            <p className="text-gray-400 text-center mb-6">
              We encountered an unexpected error. Don't worry, your data is safe. Try refreshing the
              page or contact support if the problem persists.
            </p>

            {/* Error Details (dev mode) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-400 mb-2">
                  Error Details (Development)
                </summary>
                <div className="glass-darker rounded-lg p-4 overflow-auto max-h-60">
                  <p className="text-sm font-mono text-red-400 mb-2">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="text-xs text-gray-500 overflow-x-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg font-medium transition-all shadow-lg hover:shadow-xl"
              >
                Reload Page
              </button>
            </div>

            {/* Support Link */}
            <div className="mt-6 text-center">
              <a
                href="https://github.com/yourusername/chordai/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Report this issue on GitHub →
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
