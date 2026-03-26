import { useCallback } from 'react';
import { useBlocker } from 'react-router-dom';
import { useBeforeUnload } from './useBeforeUnload';

interface UseUnsavedChangesGuardOptions {
  isDirty: boolean;
  /** Skip useBlocker - use for dialogs that don't own a route */
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
 * Combines react-router useBlocker + beforeunload to prevent
 * accidental data loss when navigating away or refreshing.
 *
 * Usage:
 * ```tsx
 * const guard = useUnsavedChangesGuard({ isDirty });
 * // ...
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
  // Browser close/refresh warning
  useBeforeUnload(isDirty);

  // React-router navigation blocking
  const blocker = useBlocker(skipRouterBlock ? false : isDirty);

  const confirmLeave = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  }, [blocker]);

  const cancelLeave = useCallback(() => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  }, [blocker]);

  return {
    showDialog: blocker.state === 'blocked',
    confirmLeave,
    cancelLeave,
  };
}
