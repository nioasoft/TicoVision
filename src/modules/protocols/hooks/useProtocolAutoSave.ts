/**
 * useProtocolAutoSave
 * Hook for auto-saving protocol forms with debouncing
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { protocolService } from '../services/protocol.service';
import type { ProtocolFormState, SaveStatusInfo } from '../types/protocol.types';

interface UseProtocolAutoSaveOptions {
  /** Protocol ID (null for new protocols) */
  protocolId: string | null;
  /** Client ID for the protocol */
  clientId: string | null;
  /** Group ID for the protocol */
  groupId: string | null;
  /** Current form state */
  formState: ProtocolFormState;
  /** Whether the protocol is locked */
  isLocked: boolean;
  /** Debounce delay in ms (default: 2000) */
  debounceDelay?: number;
  /** Callback when protocol ID changes (for new protocols) */
  onProtocolIdChange?: (id: string) => void;
}

interface UseProtocolAutoSaveReturn {
  /** Current save status info */
  saveStatus: SaveStatusInfo;
  /** Manually trigger a save */
  triggerSave: () => Promise<void>;
  /** Reset the save status */
  resetStatus: () => void;
}

/**
 * Hook for auto-saving protocol forms
 * - Debounces form changes (2 seconds by default)
 * - Tracks dirty state via JSON comparison
 * - Handles new protocol creation
 * - Provides save status for UI feedback
 */
export function useProtocolAutoSave({
  protocolId,
  clientId,
  groupId,
  formState,
  isLocked,
  debounceDelay = 2000,
  onProtocolIdChange,
}: UseProtocolAutoSaveOptions): UseProtocolAutoSaveReturn {
  // Internal protocol ID that can be updated when new protocol is created
  const [internalProtocolId, setInternalProtocolId] = useState<string | null>(protocolId);

  // Save status
  const [saveStatus, setSaveStatus] = useState<SaveStatusInfo>({
    status: 'idle',
    lastSaved: null,
    error: null,
  });

  // Refs to avoid dependency issues in useCallback
  const formStateRef = useRef(formState);
  const clientIdRef = useRef(clientId);
  const groupIdRef = useRef(groupId);
  const isLockedRef = useRef(isLocked);
  const internalProtocolIdRef = useRef(internalProtocolId);
  const onProtocolIdChangeRef = useRef(onProtocolIdChange);
  const lastSavedRef = useRef<Date | null>(null);

  // Store the last saved form state for comparison
  const lastSavedFormRef = useRef<string | null>(null);

  // Flag to skip the first auto-save when loading existing protocol
  const isInitializedRef = useRef(false);

  // Flag to track if we're currently saving
  const isSavingRef = useRef(false);

  // Serialize form state for comparison
  const serializedForm = JSON.stringify(formState);

  // Debounce the serialized form
  const debouncedForm = useDebounce(serializedForm, debounceDelay);

  // Keep refs updated
  useEffect(() => {
    formStateRef.current = formState;
  }, [formState]);

  useEffect(() => {
    clientIdRef.current = clientId;
  }, [clientId]);

  useEffect(() => {
    groupIdRef.current = groupId;
  }, [groupId]);

  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  useEffect(() => {
    internalProtocolIdRef.current = internalProtocolId;
  }, [internalProtocolId]);

  useEffect(() => {
    onProtocolIdChangeRef.current = onProtocolIdChange;
  }, [onProtocolIdChange]);

  // Update internal protocol ID when prop changes
  useEffect(() => {
    setInternalProtocolId(protocolId);
  }, [protocolId]);

  // Initialize lastSavedFormRef when component mounts or protocol changes
  useEffect(() => {
    if (!isInitializedRef.current) {
      lastSavedFormRef.current = serializedForm;
      isInitializedRef.current = true;
    }
  }, [serializedForm]);

  // Check if form is dirty (computed, not stored in state to avoid loops)
  const isDirty = lastSavedFormRef.current !== null && serializedForm !== lastSavedFormRef.current;

  // Update status to dirty when form changes - but only once per change
  useEffect(() => {
    if (isDirty && !isSavingRef.current) {
      setSaveStatus(prev => {
        // Only update if not already dirty or saving
        if (prev.status === 'idle' || prev.status === 'saved') {
          return { ...prev, status: 'dirty', error: null };
        }
        return prev;
      });
    }
  }, [isDirty]);

  // Save function - stable reference, uses refs for current values
  const performSave = useCallback(async () => {
    // Don't save if locked
    if (isLockedRef.current) {
      return;
    }

    // Don't save if already saving
    if (isSavingRef.current) {
      return;
    }

    // Check if dirty using current form state
    const currentSerialized = JSON.stringify(formStateRef.current);
    if (lastSavedFormRef.current === currentSerialized) {
      return;
    }

    isSavingRef.current = true;
    setSaveStatus(prev => ({
      ...prev,
      status: 'saving',
      error: null,
    }));

    try {
      const { data, error } = await protocolService.saveProtocolForm(
        internalProtocolIdRef.current,
        clientIdRef.current,
        groupIdRef.current,
        formStateRef.current
      );

      if (error) {
        isSavingRef.current = false;
        setSaveStatus({
          status: 'error',
          lastSaved: lastSavedRef.current,
          error,
        });
        return;
      }

      // Update protocol ID if this was a new protocol
      if (!internalProtocolIdRef.current && data?.id) {
        setInternalProtocolId(data.id);
        internalProtocolIdRef.current = data.id;
        onProtocolIdChangeRef.current?.(data.id);
      }

      // Update last saved form and status
      lastSavedFormRef.current = currentSerialized;
      const now = new Date();
      lastSavedRef.current = now;
      isSavingRef.current = false;

      setSaveStatus({
        status: 'saved',
        lastSaved: now,
        error: null,
      });

      // Reset to idle after a short delay
      setTimeout(() => {
        setSaveStatus(prev => {
          if (prev.status === 'saved') {
            return { ...prev, status: 'idle' };
          }
          return prev;
        });
      }, 2000);
    } catch (err) {
      isSavingRef.current = false;
      setSaveStatus({
        status: 'error',
        lastSaved: lastSavedRef.current,
        error: err instanceof Error ? err : new Error('שגיאה לא ידועה'),
      });
    }
  }, []); // No dependencies - uses refs for all values

  // Auto-save when debounced form changes
  useEffect(() => {
    // Skip if not initialized
    if (!isInitializedRef.current) {
      return;
    }

    // Skip if the debounced value equals the last saved
    if (debouncedForm === lastSavedFormRef.current) {
      return;
    }

    // Skip if locked
    if (isLockedRef.current) {
      return;
    }

    performSave();
  }, [debouncedForm, performSave]);

  // Manual save trigger
  const triggerSave = useCallback(async () => {
    await performSave();
  }, [performSave]);

  // Reset status
  const resetStatus = useCallback(() => {
    setSaveStatus({
      status: 'idle',
      lastSaved: null,
      error: null,
    });
    lastSavedFormRef.current = JSON.stringify(formStateRef.current);
    lastSavedRef.current = null;
    isInitializedRef.current = true;
    isSavingRef.current = false;
  }, []);

  return {
    saveStatus,
    triggerSave,
    resetStatus,
  };
}
