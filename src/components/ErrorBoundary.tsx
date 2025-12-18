import { Component, ReactNode } from 'react';
import { logger } from '@/lib/logger';
import { ErrorFallback } from './ErrorFallback';

/** Session storage key to track reload attempts and prevent infinite loops */
const CHUNK_ERROR_RELOAD_KEY = 'chunk-error-reload';

/**
 * Checks if an error is related to failed chunk/module loading.
 * This typically happens after a new deployment when cached pages reference old chunks.
 */
const isChunkLoadError = (error: Error): boolean => {
  return (
    error.name === 'ChunkLoadError' ||
    error.message.includes('Loading chunk') ||
    error.message.includes('Failed to fetch dynamically imported module') ||
    error.message.includes('Expected a JavaScript-or-Wasm module') ||
    error.message.includes('Loading CSS chunk')
  );
};

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch React errors and prevent app crashes
 * Wraps critical sections of the app to provide graceful error handling
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    // Check if this is a chunk load error (happens after deployment)
    if (isChunkLoadError(error)) {
      // Only auto-reload once to prevent infinite loops
      const hasReloaded = sessionStorage.getItem(CHUNK_ERROR_RELOAD_KEY);
      if (!hasReloaded) {
        logger.warn('Chunk load error detected, reloading page...', {
          errorMessage: error.message,
        });
        sessionStorage.setItem(CHUNK_ERROR_RELOAD_KEY, 'true');
        window.location.reload();
        return;
      }
      // Clear the flag after showing error (for next time)
      setTimeout(() => sessionStorage.removeItem(CHUNK_ERROR_RELOAD_KEY), 5000);
    }

    // Log the error to our logging service
    logger.error('React Error Boundary caught an error', error, {
      componentStack: errorInfo.componentStack,
      errorName: error.name,
      errorMessage: error.message,
    });

    // In production, you could also send to Sentry/DataDog here
    if (import.meta.env.PROD) {
      // TODO: Send to external error tracking service
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <ErrorFallback
          error={this.state.error}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}
