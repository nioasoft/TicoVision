import { useEffect } from 'react';

/**
 * Registers a beforeunload handler that warns the user when closing/refreshing
 * the browser tab while there are unsaved changes.
 */
export function useBeforeUnload(isDirty: boolean): void {
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
}
