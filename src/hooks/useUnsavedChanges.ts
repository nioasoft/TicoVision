import { useState, useCallback } from 'react';

/**
 * Hook for managing unsaved changes detection in dialogs
 * Provides state and handlers for tracking dirty state and confirming exit
 */
export function useUnsavedChanges(isEnabled: boolean = true) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  /**
   * Mark the form as having unsaved changes
   */
  const markDirty = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  /**
   * Mark the form as clean (no unsaved changes)
   */
  const markClean = useCallback(() => {
    setHasUnsavedChanges(false);
  }, []);

  /**
   * Reset all state (call when dialog closes or on successful save)
   */
  const reset = useCallback(() => {
    setHasUnsavedChanges(false);
    setShowExitConfirm(false);
  }, []);

  /**
   * Handle close attempt - shows confirmation if there are unsaved changes
   * @param onClose - The actual close function to call if allowed
   */
  const handleCloseAttempt = useCallback(
    (onClose: () => void) => {
      if (hasUnsavedChanges && isEnabled) {
        setShowExitConfirm(true);
      } else {
        onClose();
      }
    },
    [hasUnsavedChanges, isEnabled]
  );

  /**
   * Confirm exit without saving - clears state and closes
   * @param onClose - The actual close function
   */
  const confirmExit = useCallback(
    (onClose: () => void) => {
      setHasUnsavedChanges(false);
      setShowExitConfirm(false);
      onClose();
    },
    []
  );

  /**
   * Cancel exit confirmation - stay in the dialog
   */
  const cancelExit = useCallback(() => {
    setShowExitConfirm(false);
  }, []);

  return {
    // State
    hasUnsavedChanges,
    showExitConfirm,

    // Setters (for edge cases)
    setShowExitConfirm,

    // Actions
    markDirty,
    markClean,
    reset,
    handleCloseAttempt,
    confirmExit,
    cancelExit,
  };
}
