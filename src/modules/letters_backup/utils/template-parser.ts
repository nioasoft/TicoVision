/**
 * Template Parser Utility
 * Handles variable replacement and template processing
 */

import type { LetterVariables } from '../types/letter.types';
import { formatLetterDate } from './date-formatter';
import DOMPurify from 'isomorphic-dompurify';

export class TemplateParser {
  private static readonly VARIABLE_PATTERN = /\[([^\]]+)\]/g; // Matches [variable_name]
  private static readonly BRACKET_VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g; // Matches {{variable_name}}

  /**
   * Escape HTML entities to prevent XSS
   * Use for all user-input variables except custom_header_lines
   */
  private static escapeHtml(unsafe: string | number): string {
    const str = String(unsafe);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Sanitize HTML with whitelist for custom_header_lines
   * Allows only: <b>, <strong>, <u>, <i>, <em>, <br>, <span> with style
   */
  private static sanitizeWithWhitelist(html: string): string {
    // Configure DOMPurify with whitelist that allows table elements and common formatting
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        // Text formatting
        'b', 'strong', 'u', 'i', 'em', 'br', 'span', 'p', 'div',
        // Table elements (for foreign worker documents)
        'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
        // Lists
        'ul', 'ol', 'li'
      ],
      ALLOWED_ATTR: ['style', 'width', 'cellpadding', 'cellspacing', 'border', 'colspan', 'rowspan'],
      ALLOWED_STYLES: {
        'span': {
          'color': [/^#[0-9A-Fa-f]{6}$/i, /^#[0-9A-Fa-f]{3}$/i],
          'font-weight': [/^(bold|normal|[1-9]00)$/],
          'text-decoration': [/^underline$/]
        },
        'div': {
          'font-family': [/.*/],  // Allows any font (including with spaces and commas)
          'font-size': [/^\d+px$/],
          'color': [/^#[0-9A-Fa-f]{6}$/i, /^#[0-9A-Fa-f]{3}$/i],
          'text-align': [/^(left|right|center|justify)$/],
          'font-weight': [/^(bold|normal|[1-9]00)$/],
          'line-height': [/^\d+(\.\d+)?$/]
        },
        'td': {
          'border': [/.*/],  // Allows complex border like "1px solid #000000"
          'padding': [/.*px$/],  // More permissive - any number + px
          'background-color': [/^#[0-9A-Fa-f]{6}$/i, /^#[0-9A-Fa-f]{3}$/i],
          'width': [/^\d+%$/, /^\d+px$/],  // Allows percentages and pixels
          'text-align': [/^(left|right|center|justify)$/],
          'vertical-align': [/^(top|middle|bottom)$/]
        },
        'th': {
          'border': [/.*/],
          'padding': [/.*px$/],
          'background-color': [/^#[0-9A-Fa-f]{6}$/i, /^#[0-9A-Fa-f]{3}$/i],
          'width': [/^\d+%$/, /^\d+px$/],
          'text-align': [/^(left|right|center|justify)$/],
          'font-weight': [/^(bold|normal|[1-9]00)$/]
        },
        'table': {
          'border-collapse': [/^collapse$/],
          'margin': [/.*/],
          'max-width': [/^\d+px$/],
          'width': [/^\d+%$/, /^\d+px$/]  // Allows percentages and pixels
        }
      }
    });
  }

  /**
   * Replace variables in template content
   * Uses HTML escaping for all variables to prevent XSS
   */
  static replaceVariables(
    template: string,
    variables: Partial<LetterVariables>,
    allowHtmlInVariables: string[] = []  // Whitelist for variables that can contain HTML
  ): string {
    let result = template;

    // Map common Hebrew variable names to their values
    const variableMap = this.buildVariableMap(variables);

    // Replace [variable] pattern
    result = result.replace(this.VARIABLE_PATTERN, (match, variableName) => {
      const value = this.getVariableValue(variableName, variableMap, variables);
      if (value === undefined) return match;

      // If this variable is whitelisted for HTML (e.g., custom_header_lines)
      if (allowHtmlInVariables.includes(variableName)) {
        return this.sanitizeWithWhitelist(String(value));
      }

      // Default: Escape HTML entities
      return this.escapeHtml(value);
    });

    // Replace {{variable}} pattern
    result = result.replace(this.BRACKET_VARIABLE_PATTERN, (match, variableName) => {
      const value = this.getVariableValue(variableName, variableMap, variables);
      if (value === undefined) return match;

      // If this variable is whitelisted for HTML
      if (allowHtmlInVariables.includes(variableName)) {
        return String(value); // Trusted HTML from backend functions - no sanitization needed
      }

      // Default: Escape HTML entities
      return this.escapeHtml(value);
    });

    return result;
  }

  /**
   * Build a map of Hebrew variable names to values
   */
  private static buildVariableMap(variables: Partial<LetterVariables>): Map<string, string> {
    const map = new Map<string, string>();

    // Date variables - auto-generate letter_date if not provided
    const currentDate = variables.date || formatLetterDate();
    map.set('תאריך', currentDate);
    map.set('date', currentDate);
    map.set('letter_date', currentDate);
    map.set('תאריך_מכתב', currentDate);

    if (variables.year) {
      map.set('שנה', variables.year);
      map.set('year', variables.year);
    } else {
      // Auto-add current year
      const currentYear = new Date().getFullYear().toString();
      map.set('שנה', currentYear);
      map.set('year', currentYear);
    }

    // Client information
    if (variables.client_name) {
      map.set('שם', variables.client_name);
      map.set('client_name', variables.client_name);
    }

    if (variables.company_name) {
      map.set('חברה', variables.company_name);
      map.set('company_name', variables.company_name);
    }

    if (variables.company_name_hebrew) {
      map.set('שם_חברה_עברית', variables.company_name_hebrew);
      map.set('company_name_hebrew', variables.company_name_hebrew);
    }

    if (variables.group_name) {
      map.set('קבוצה', variables.group_name);
      map.set('group_name', variables.group_name);
    }

    // Amount variables
    if (variables.amount) {
      map.set('סכום', this.formatCurrency(variables.amount));
      map.set('amount', this.formatCurrency(variables.amount));
    }

    if (variables.amount_with_vat) {
      map.set('סכום_כולל_מעמ', this.formatCurrency(variables.amount_with_vat));
      map.set('amount_with_vat', this.formatCurrency(variables.amount_with_vat));
    }

    if (variables.amount_after_discount) {
      map.set('סכום_לאחר_הנחה', this.formatCurrency(variables.amount_after_discount));
      map.set('amount_after_discount', this.formatCurrency(variables.amount_after_discount));
    }

    if (variables.monthly_amount) {
      map.set('סכום_חודשי', this.formatCurrency(variables.monthly_amount));
      map.set('monthly_amount', this.formatCurrency(variables.monthly_amount));
    }

    // Notification type
    if (variables.notification_type) {
      map.set('סוג_הודעה', variables.notification_type);
      map.set('notification_type', variables.notification_type);
    }

    // Payment link
    if (variables.payment_link) {
      map.set('קישור_תשלום', variables.payment_link);
      map.set('payment_link', variables.payment_link);
    }

    // Add all other variables directly
    for (const [key, value] of Object.entries(variables)) {
      if (value !== undefined && value !== null) {
        map.set(key, value);
      }
    }

    return map;
  }

  /**
   * Get variable value from map or direct access
   */
  private static getVariableValue(
    variableName: string,
    variableMap: Map<string, string>,
    variables: Partial<LetterVariables>
  ): string | undefined {
    // Try to get from map first
    if (variableMap.has(variableName)) {
      return variableMap.get(variableName);
    }

    // Try direct property access
    const value = (variables as Record<string, unknown>)[variableName];
    if (value !== undefined) {
      // Format numbers as currency if they look like amounts
      if (typeof value === 'number' && variableName.includes('amount')) {
        return this.formatCurrency(value);
      }
      return String(value);
    }

    return undefined;
  }

  /**
   * Format number as Israeli currency - ALWAYS rounded UP to whole shekel
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.ceil(amount));
  }

  /**
   * Format date in Israeli format (DD/MM/YYYY)
   */
  static formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('he-IL').format(d);
  }

  /**
   * Extract variables from template
   */
  static extractVariables(template: string): string[] {
    const variables = new Set<string>();

    // Extract [variable] pattern
    let match;
    while ((match = this.VARIABLE_PATTERN.exec(template)) !== null) {
      variables.add(match[1]);
    }

    // Reset regex state
    this.VARIABLE_PATTERN.lastIndex = 0;

    // Extract {{variable}} pattern
    while ((match = this.BRACKET_VARIABLE_PATTERN.exec(template)) !== null) {
      variables.add(match[1]);
    }

    // Reset regex state
    this.BRACKET_VARIABLE_PATTERN.lastIndex = 0;

    return Array.from(variables);
  }

  /**
   * Validate that all required variables are provided
   */
  static validateVariables(
    template: string,
    variables: Partial<LetterVariables>,
    required: string[]
  ): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const reqVar of required) {
      const value = (variables as Record<string, unknown>)[reqVar];
      if (value === undefined || value === null || value === '') {
        missing.push(reqVar);
      }
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Sanitize HTML content while preserving structure
   * Now uses DOMPurify for production-grade sanitization
   */
  static sanitizeHtml(html: string): string {
    // Use DOMPurify with safe defaults
    return DOMPurify.sanitize(html, {
      // Remove all scripts, iframes, and event handlers by default
      FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'style'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
    });
  }

  /**
   * Convert HTML to plain text
   */
  static htmlToText(html: string): string {
    // Basic conversion - in production, use a library like html-to-text
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Merge header, body, and footer into complete letter
   */
  static mergeLetterComponents(
    body: string,
    header?: string,
    footer?: string
  ): string {
    const parts: string[] = [];

    if (header) {
      parts.push(`<div class="letter-header">${header}</div>`);
    }

    parts.push(`<div class="letter-body">${body}</div>`);

    if (footer) {
      parts.push(`<div class="letter-footer">${footer}</div>`);
    }

    return `
      <div class="letter-container" dir="rtl">
        ${parts.join('\n')}
      </div>
    `;
  }

  /**
   * Generate letter CSS styles
   */
  static getLetterStyles(): string {
    return `
      .letter-container {
        font-family: 'Assistant', 'Heebo', Arial, sans-serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 40px;
        background: white;
        direction: rtl;
        text-align: right;
        line-height: 1.8;
      }

      .letter-header {
        margin-bottom: 40px;
        padding-bottom: 20px;
        border-bottom: 2px solid #e5e7eb;
      }

      .letter-body {
        margin-bottom: 40px;
        font-size: 16px;
      }

      .letter-body p {
        margin-bottom: 16px;
      }

      .letter-body strong {
        font-weight: 600;
      }

      .letter-footer {
        margin-top: 40px;
        padding-top: 20px;
        border-top: 2px solid #e5e7eb;
        font-size: 14px;
      }

      .payment-box {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
      }

      .highlight {
        background-color: #fef3c7;
        padding: 2px 4px;
        border-radius: 2px;
      }

      @media print {
        .letter-container {
          padding: 20px;
        }
        
        .no-print {
          display: none;
        }
      }
    `;
  }
}