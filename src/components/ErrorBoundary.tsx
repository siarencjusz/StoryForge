import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Top-level error boundary.
 * Catches unhandled React render errors and shows a recovery UI
 * instead of a white screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Log to console so devtools still capture it
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAndReload = () => {
    // Clear all persisted Zustand state so the app can start fresh
    try {
      localStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  private handleDismiss = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { error, errorInfo } = this.state;

    return (
      <div className="h-screen flex items-center justify-center bg-sf-bg-900 p-8">
        <div className="max-w-lg w-full bg-sf-bg-800 border border-sf-bg-600 rounded-lg p-6 shadow-xl">
          <h1 className="text-xl font-bold text-sf-error mb-2">Something went wrong</h1>
          <p className="text-sf-text-300 text-sm mb-4">
            An unexpected error crashed the UI. Your project data is likely safe — try reloading first.
          </p>

          {/* Error message */}
          <div className="bg-sf-bg-900 rounded p-3 mb-4 overflow-auto max-h-48 text-xs font-mono text-sf-text-400">
            <p className="text-sf-error font-semibold">{error?.message}</p>
            {errorInfo?.componentStack && (
              <pre className="mt-2 whitespace-pre-wrap">{errorInfo.componentStack}</pre>
            )}
          </div>

          {/* Recovery buttons */}
          <div className="flex gap-2">
            <button
              onClick={this.handleDismiss}
              className="btn btn-secondary text-sm"
            >
              Try to Continue
            </button>
            <button
              onClick={this.handleReload}
              className="btn btn-primary text-sm"
            >
              Reload Page
            </button>
            <button
              onClick={this.handleResetAndReload}
              className="btn btn-secondary text-sm text-sf-warning hover:text-sf-warning"
              title="Clears saved state and reloads — you'll lose unsaved changes"
            >
              Reset &amp; Reload
            </button>
          </div>
          <p className="text-xs text-sf-text-500 mt-3">
            "Reset &amp; Reload" clears saved state — use only if reloading alone doesn't fix the crash.
          </p>
        </div>
      </div>
    );
  }
}

