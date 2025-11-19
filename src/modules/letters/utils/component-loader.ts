/**
 * Component Loader Utilities
 * Helper functions for loading, building, and processing letter components
 */

import type { LetterVariables } from '../types/letter.types';

/**
 * Load HTML component from templates/ directory
 * @param path - Relative path from /templates/ (e.g., 'components/header.html' or 'bodies/annual-fee.html')
 * @returns HTML content as string
 */
export async function loadComponent(path: string): Promise<string> {
  const response = await fetch(`/templates/${path}`);

  if (!response.ok) {
    throw new Error(`Failed to load component: ${path} (${response.status})`);
  }

  return await response.text();
}

/**
 * Build full letter HTML from 4 components
 * Combines header, body, payment section, and footer into complete HTML document
 */
export function buildFullHTML(
  header: string,
  body: string,
  payment: string,
  footer: string
): string {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>תצוגה מקדימה - מכתב</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
            font-family: 'Assistant', 'Heebo', Arial, sans-serif;
            direction: rtl;
        }
        .letter-container {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="letter-container">
        <table width="800" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
            ${header}
            ${body}
            ${payment}
            ${footer}
        </table>
    </div>
</body>
</html>`;
}

/**
 * Replace {{variables}} in HTML template
 * @param html - HTML content with {{variable}} placeholders
 * @param variables - Key-value pairs to replace
 * @returns HTML with replaced variables
 */
export function replaceVariables(
  html: string,
  variables: Record<string, string | number | undefined>
): string {
  let result = html;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, String(value || ''));
  }

  return result;
}

/**
 * Calculate payment discounts based on amount
 * @param amount - Original amount in ILS
 * @returns Object with discounted amounts
 */
export function calculateDiscounts(amount: number) {
  return {
    amount_after_bank: Math.ceil(amount * 0.91),       // 9% discount
    amount_after_single: Math.ceil(amount * 0.92),     // 8% discount
    amount_after_payments: Math.ceil(amount * 0.96),   // 4% discount
  };
}

/**
 * Format Israeli date (DD/MM/YYYY)
 * @param date - Date object
 * @returns Formatted date string
 */
export function formatIsraeliDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
}

/**
 * Generate check dates description (for num_checks)
 * @param numChecks - Number of checks (default: 8)
 * @param taxYear - Tax year (default: next year)
 * @returns Hebrew description of check dates
 */
export function generateCheckDatesDescription(
  numChecks: number = 8,
  taxYear: number = new Date().getFullYear() + 1
): string {
  const startMonth = 1; // January
  const endMonth = startMonth + numChecks - 1;

  return `החל מיום 5.${startMonth}.${taxYear} ועד ליום 5.${endMonth}.${taxYear}`;
}

/**
 * Map body template filename to template_type in generated_letters table
 */
export function mapBodyToTemplateType(bodyTemplate: string): string {
  const mapping: Record<string, string> = {
    'annual-fee.html': 'external_index_only',
    'annual-fee-as-agreed.html': 'external_as_agreed',
    'annual-fee-real-change.html': 'external_real_change',
    'internal-audit-index.html': 'internal_audit_index',
    'internal-audit-as-agreed.html': 'internal_audit_as_agreed',
    'internal-audit-real-change.html': 'internal_audit_real_change',
    'retainer-index.html': 'retainer_index',
    'retainer-real-change.html': 'retainer_real_change',
    'bookkeeping-index.html': 'bookkeeping_index',
    'bookkeeping-as-agreed.html': 'bookkeeping_as_agreed',
    'bookkeeping-real-change.html': 'bookkeeping_real_change',
  };

  return mapping[bodyTemplate] || 'custom';
}
