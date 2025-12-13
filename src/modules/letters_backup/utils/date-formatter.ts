/**
 * Date Formatter Utility for Israeli Letters
 * Formats dates according to Israeli standards (DD.MM.YYYY without leading zeros)
 */

/**
 * Format date for Israeli letters (no leading zeros)
 * Example: 4.10.2025 (not 04.10.2025)
 *
 * @param date - Date to format (defaults to current date)
 * @returns Formatted date string in Israeli format
 */
export function formatLetterDate(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('he-IL', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric'
  }).format(date);
}

/**
 * Format date with leading zeros (DD/MM/YYYY)
 * Example: 04/10/2025
 *
 * @param date - Date to format (defaults to current date)
 * @returns Formatted date string with slashes and leading zeros
 */
export function formatDateWithSlashes(date: Date = new Date()): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Parse Israeli date string to Date object
 * Supports both DD.MM.YYYY and DD/MM/YYYY formats
 *
 * @param dateString - Date string in Israeli format
 * @returns Date object or null if parsing fails
 */
export function parseIsraeliDate(dateString: string): Date | null {
  try {
    // Replace dots with slashes for consistency
    const normalized = dateString.replace(/\./g, '/');
    const parts = normalized.split('/');

    if (parts.length !== 3) return null;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[2], 10);

    const date = new Date(year, month, day);

    // Validate the date
    if (
      date.getDate() !== day ||
      date.getMonth() !== month ||
      date.getFullYear() !== year
    ) {
      return null;
    }

    return date;
  } catch {
    return null;
  }
}
