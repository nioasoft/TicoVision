/**
 * useLastGroup Hook
 *
 * Stores and retrieves the last selected group ID from localStorage.
 * Used to show the most recently selected group first in group selectors.
 */

const STORAGE_KEY = 'tico_last_group_id';

export function useLastGroup() {
  /**
   * Get the last selected group ID from localStorage
   */
  const getLastGroupId = (): string | null => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage might not be available (SSR, privacy mode, etc.)
      return null;
    }
  };

  /**
   * Save the group ID to localStorage
   */
  const setLastGroupId = (groupId: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, groupId);
    } catch {
      // localStorage might not be available
      console.warn('Unable to save last group to localStorage');
    }
  };

  /**
   * Clear the last group ID from localStorage
   */
  const clearLastGroupId = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage might not be available
    }
  };

  return { getLastGroupId, setLastGroupId, clearLastGroupId };
}

export default useLastGroup;
