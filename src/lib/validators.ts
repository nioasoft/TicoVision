/**
 * Validation utilities for Israeli-specific formats
 * Used across the application for consistent validation
 */

/**
 * Validates Israeli postal code (7 digits format introduced in 2013)
 * @param code - Postal code string to validate
 * @returns true if valid, false otherwise
 */
export const validateIsraeliPostalCode = (code: string): boolean => {
  if (!code) return false;
  return /^\d{7}$/.test(code);
};

/**
 * Formats Israeli postal code with space: 12345 67
 * @param code - Postal code string to format
 * @returns Formatted postal code
 */
export const formatPostalCode = (code: string): string => {
  const cleaned = code.replace(/\D/g, '');
  if (cleaned.length === 7) {
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return cleaned;
};

/**
 * Validates Israeli phone number format
 * Accepts: 05X-XXXXXXX or 0X-XXXXXXX (with or without hyphen)
 * @param phone - Phone number string to validate
 * @returns true if valid, false otherwise
 */
export const validateIsraeliPhone = (phone: string): boolean => {
  if (!phone) return false;
  // Remove hyphens for validation
  const cleaned = phone.replace(/-/g, '');
  // Israeli phone: 10 digits starting with 0
  return /^0\d{1,2}\d{7}$/.test(cleaned);
};

/**
 * Formats Israeli phone number with hyphen: 050-1234567
 * @param value - Phone number string to format
 * @returns Formatted phone number
 */
export const formatIsraeliPhone = (value: string): string => {
  // Remove all non-digit characters
  const numbers = value.replace(/\D/g, '');

  // Don't format if too short
  if (numbers.length <= 3) return numbers;

  // Format: 0XX-XXXXXXX or 05X-XXXXXXX (mobile)
  const prefix = numbers.slice(0, 3);
  const rest = numbers.slice(3, 10); // Max 10 digits total

  return `${prefix}-${rest}`;
};

/**
 * Formats Israeli landline phone number: 0X-XXXXXXX
 * Landline format: 2-digit prefix (02-09) + 7-digit number
 * @param value - Phone number string to format
 * @returns Formatted phone number
 */
export const formatIsraeliLandline = (value: string): string => {
  // Remove all non-digit characters
  const numbers = value.replace(/\D/g, '');

  // Don't format if too short
  if (numbers.length <= 2) return numbers;

  // Format: 0X-XXXXXXX (landline)
  const prefix = numbers.slice(0, 2);
  const rest = numbers.slice(2, 9); // Max 9 digits total

  return `${prefix}-${rest}`;
};

/**
 * Formats Israeli Tax ID to XX-XXXXXX-X format
 * @param taxId - Tax ID string (9 digits)
 * @returns Formatted tax ID with dashes
 * @example formatIsraeliTaxId("512345679") returns "51-2345678-9"
 */
export const formatIsraeliTaxId = (taxId: string): string => {
  // Remove all non-digit characters
  const numbers = taxId.replace(/\D/g, '');

  // Don't format if too short
  if (numbers.length <= 2) return numbers;

  // Format based on length
  if (numbers.length <= 8) {
    // XX-XXXXXX format (partial)
    return `${numbers.slice(0, 2)}-${numbers.slice(2, 8)}`;
  }

  // XX-XXXXXX-X format (complete)
  return `${numbers.slice(0, 2)}-${numbers.slice(2, 8)}-${numbers.slice(8, 9)}`;
};

/**
 * Strips formatting from Tax ID to get 9 digits only
 * @param formattedTaxId - Tax ID with dashes (XX-XXXXXX-X)
 * @returns Plain 9-digit string
 * @example stripTaxIdFormatting("51-2345678-9") returns "512345679"
 */
export const stripTaxIdFormatting = (formattedTaxId: string): string => {
  return formattedTaxId.replace(/\D/g, '');
};
