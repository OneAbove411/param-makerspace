import React from 'react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    /** Optional fallback UI. Defaults to a brutalist-styled error pane. */
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Route-level error boundary.
 *
 * Catches unhandled JS errors in the component tree below it and renders
 * a recovery UI instead of a white screen. Follows the brutalist visual
 * identity: brutal-dark bg, Space Mono data font, brutal-red accent.
 *
 * Usage in App.tsx:
 *   <ErrorBoundary>
 *     <Routes>...</Routes>
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        // Log to console — future: send to error tracking service
        console.error('[ErrorBoundary] Uncaught error:', error, info.componentStack);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="min-h-[60vh] flex items-center justify-center bg-brutal-bg px-4">
                    <div className="max-w-lg w-full border-2 border-brutal-dark bg-white p-8">
                        <h2 className="font-heading text-2xl text-brutal-dark mb-2">
                            Something broke
                        </h2>
                        <p className="font-data text-sm text-gray-600 mb-4">
                            An unexpected error occurred. You can try again or reload the page.
                        </p>
                        {this.state.error && (
                            <pre className="font-data text-xs text-brutal-red bg-gray-100 p-3 mb-4 overflow-x-auto max-h-32 border border-gray-200">
                                {this.state.error.message}
                            </pre>
                        )}
                        <div className="flex gap-3">
                            <button
                                onClick={this.handleRetry}
                                className="px-4 py-2 text-sm font-heading border-2 border-brutal-dark bg-white hover:bg-gray-50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                            >
                                Try again
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="px-4 py-2 text-sm font-heading border-2 border-brutal-dark bg-brutal-dark text-white hover:bg-gray-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brutal-red"
                            >
                                Reload page
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
