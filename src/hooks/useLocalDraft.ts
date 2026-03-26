import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';

const STORAGE_PREFIX = 'tico_draft:';
const DEFAULT_DEBOUNCE_MS = 1000;
const DEFAULT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface DraftEntry<T> {
  data: T;
  savedAt: number;
  expiresAt: number;
}

interface UseLocalDraftOptions<T> {
  /** Unique key, e.g. 'protocol:abc-123' or 'letter:new' */
  key: string;
  /** Current form state to persist */
  data: T;
  /** Debounce delay in ms (default: 1000) */
  debounceMs?: number;
  /** Draft expiry in ms (default: 24 hours) */
  expiryMs?: number;
  /** Whether auto-save is enabled (default: true) */
  enabled?: boolean;
}

interface UseLocalDraftReturn<T> {
  /** Whether a recoverable draft exists */
  hasDraft: boolean;
  /** The recovered draft data */
  draftData: T | null;
  /** Timestamp of the last draft save */
  draftTimestamp: Date | null;
  /** Restore the draft */
  restoreDraft: () => T | null;
  /** Clear the stored draft (call after successful server save) */
  clearDraft: () => void;
  /** Dismiss the draft without restoring */
  dismissDraft: () => void;
}

function getStorageKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

function readDraft<T>(key: string): DraftEntry<T> | null {
  try {
    const raw = localStorage.getItem(getStorageKey(key));
    if (!raw) return null;
    const entry: DraftEntry<T> = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      localStorage.removeItem(getStorageKey(key));
      return null;
    }
    return entry;
  } catch {
    localStorage.removeItem(getStorageKey(key));
    return null;
  }
}

function writeDraft<T>(key: string, data: T, expiryMs: number): void {
  const now = Date.now();
  const entry: DraftEntry<T> = {
    data,
    savedAt: now,
    expiresAt: now + expiryMs,
  };
  try {
    localStorage.setItem(getStorageKey(key), JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable - silently fail
  }
}

/**
 * Auto-saves form state to localStorage with debouncing and expiration.
 * On mount, checks for an existing draft and offers recovery.
 *
 * Usage:
 * ```tsx
 * const draft = useLocalDraft({ key: 'letter:new', data: formState });
 * // Show DraftRecoveryBanner when draft.hasDraft is true
 * // Call draft.clearDraft() after successful server save
 * ```
 */
export function useLocalDraft<T>({
  key,
  data,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  expiryMs = DEFAULT_EXPIRY_MS,
  enabled = true,
}: UseLocalDraftOptions<T>): UseLocalDraftReturn<T> {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftData, setDraftData] = useState<T | null>(null);
  const [draftTimestamp, setDraftTimestamp] = useState<Date | null>(null);
  const initialLoadDone = useRef(false);
  const dismissed = useRef(false);

  // Serialize for debouncing
  const serialized = JSON.stringify(data);
  const debouncedSerialized = useDebounce(serialized, debounceMs);

  // On mount: check for existing draft
  useEffect(() => {
    if (!enabled) return;
    const existing = readDraft<T>(key);
    if (existing) {
      setHasDraft(true);
      setDraftData(existing.data);
      setDraftTimestamp(new Date(existing.savedAt));
    }
    initialLoadDone.current = true;
  }, [key, enabled]);

  // Auto-save on debounced changes
  useEffect(() => {
    if (!enabled || !initialLoadDone.current) return;
    // Don't overwrite a draft that hasn't been acknowledged yet
    // (unless user already dismissed or restored it)
    if (hasDraft && !dismissed.current) return;

    writeDraft(key, JSON.parse(debouncedSerialized) as T, expiryMs);
  }, [debouncedSerialized, key, expiryMs, enabled, hasDraft]);

  const restoreDraft = useCallback((): T | null => {
    const existing = readDraft<T>(key);
    if (existing) {
      setHasDraft(false);
      dismissed.current = true;
      return existing.data;
    }
    return null;
  }, [key]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(getStorageKey(key));
    setHasDraft(false);
    setDraftData(null);
    setDraftTimestamp(null);
    dismissed.current = true;
  }, [key]);

  const dismissDraft = useCallback(() => {
    localStorage.removeItem(getStorageKey(key));
    setHasDraft(false);
    setDraftData(null);
    setDraftTimestamp(null);
    dismissed.current = true;
  }, [key]);

  return {
    hasDraft,
    draftData,
    draftTimestamp,
    restoreDraft,
    clearDraft,
    dismissDraft,
  };
}
