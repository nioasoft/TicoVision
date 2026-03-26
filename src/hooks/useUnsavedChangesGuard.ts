import { useState, useEffect, useCallback, useRef } from 'react';
import { useBeforeUnload } from './useBeforeUnload';

interface UseUnsavedChangesGuardOptions {
  isDirty: boolean;
  /** Skip route-level blocking - use for dialogs that don't own a route */
  skipRouterBlock?: boolean;
}

interface UseUnsavedChangesGuardReturn {
  /** Whether the confirmation dialog should be shown */
  showDialog: boolean;
  /** Confirm leaving (proceeds with navigation) */
  confirmLeave: () => void;
  /** Cancel leaving (stays on page) */
  cancelLeave: () => void;
}

/**
 * Prevents accidental data loss by intercepting navigation (browser back,
 * link clicks via pushState) and showing a confirmation dialog.
 * Also registers beforeunload for browser close/refresh.
 *
 * Compatible with BrowserRouter (does not require a data router).
 *
 * Usage:
 * ```tsx
 * const guard = useUnsavedChangesGuard({ isDirty });
 * <UnsavedChangesDialog
 *   open={guard.showDialog}
 *   onLeave={guard.confirmLeave}
 *   onStay={guard.cancelLeave}
 * />
 * ```
 */
export function useUnsavedChangesGuard({
  isDirty,
  skipRouterBlock = false,
}: UseUnsavedChangesGuardOptions): UseUnsavedChangesGuardReturn {
  const [showDialog, setShowDialog] = useState(false);
  const pendingNavigation = useRef<string | null>(null);
  const isBlocking = isDirty && !skipRouterBlock;

  // Browser close/refresh warning
  useBeforeUnload(isDirty);

  // Intercept browser back/forward (popstate)
  useEffect(() => {
    if (!isBlocking) return;

    // Push a duplicate entry so we can detect back navigation
    const currentUrl = window.location.href;
    window.history.pushState({ guard: true }, '', currentUrl);

    const handlePopState = () => {
      // User pressed back - show confirmation dialog
      // Re-push to keep them on the same page while dialog is open
      window.history.pushState({ guard: true }, '', currentUrl);
      pendingNavigation.current = 'back';
      setShowDialog(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isBlocking]);

  // Intercept programmatic navigation (pushState / replaceState)
  useEffect(() => {
    if (!isBlocking) return;

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);

    const intercept = (url?: string | URL | null) => {
      if (!url) return false;
      const targetUrl = typeof url === 'string' ? url : url.toString();
      // Only intercept if navigating to a different path
      if (targetUrl !== window.location.href && targetUrl !== window.location.pathname) {
        pendingNavigation.current = targetUrl;
        setShowDialog(true);
        return true; // blocked
      }
      return false;
    };

    window.history.pushState = function (data: unknown, unused: string, url?: string | URL | null) {
      // Allow our own guard pushState calls (have guard: true in data)
      if (data && typeof data === 'object' && 'guard' in data) {
        return originalPushState(data, unused, url);
      }
      if (intercept(url)) return;
      return originalPushState(data, unused, url);
    };

    window.history.replaceState = function (data: unknown, unused: string, url?: string | URL | null) {
      if (data && typeof data === 'object' && 'guard' in data) {
        return originalReplaceState(data, unused, url);
      }
      if (intercept(url)) return;
      return originalReplaceState(data, unused, url);
    };

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, [isBlocking]);

  const confirmLeave = useCallback(() => {
    setShowDialog(false);
    const target = pendingNavigation.current;
    pendingNavigation.current = null;

    if (target === 'back') {
      // Go back (the extra pushState entry + actual back)
      window.history.go(-2);
    } else if (target) {
      // Navigate to the intercepted URL
      window.location.href = target;
    }
  }, []);

  const cancelLeave = useCallback(() => {
    setShowDialog(false);
    pendingNavigation.current = null;
  }, []);

  return {
    showDialog,
    confirmLeave,
    cancelLeave,
  };
}
