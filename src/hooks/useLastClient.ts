/**
 * useLastClient Hook
 *
 * Stores and retrieves the last selected client ID from localStorage.
 * Used to show the most recently selected client first in client selectors.
 */

const STORAGE_KEY = 'tico_last_client_id';

export function useLastClient() {
  /**
   * Get the last selected client ID from localStorage
   */
  const getLastClientId = (): string | null => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      // localStorage might not be available (SSR, privacy mode, etc.)
      return null;
    }
  };

  /**
   * Save the client ID to localStorage
   */
  const setLastClientId = (clientId: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, clientId);
    } catch {
      // localStorage might not be available
      console.warn('Unable to save last client to localStorage');
    }
  };

  /**
   * Clear the last client ID from localStorage
   */
  const clearLastClientId = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage might not be available
    }
  };

  return { getLastClientId, setLastClientId, clearLastClientId };
}

export default useLastClient;
