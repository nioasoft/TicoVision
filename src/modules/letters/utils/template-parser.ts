/**
 * Template Parser Utility
 * Handles variable replacement and template processing
 */

import type { LetterVariables } from '../types/letter.types';

export class TemplateParser {
  private static readonly VARIABLE_PATTERN = /\[([^\]]+)\]/g; // Matches [variable_name]
  private static readonly BRACKET_VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g; // Matches {{variable_name}}

  /**
   * Replace variables in template content
   */
  static replaceVariables(
    template: string,
    variables: Partial<LetterVariables>
  ): string {
    let result = template;

    // Map common Hebrew variable names to their values
    const variableMap = this.buildVariableMap(variables);

    // Replace [variable] pattern
    result = result.replace(this.VARIABLE_PATTERN, (match, variableName) => {
      const value = this.getVariableValue(variableName, variableMap, variables);
      return value !== undefined ? String(value) : match;
    });

    // Replace {{variable}} pattern
    result = result.replace(this.BRACKET_VARIABLE_PATTERN, (match, variableName) => {
      const value = this.getVariableValue(variableName, variableMap, variables);
      return value !== undefined ? String(value) : match;
    });

    return result;
  }

  /**
   * Build a map of Hebrew variable names to values
   */
  private static buildVariableMap(variables: Partial<LetterVariables>): Map<string, any> {
    const map = new Map<string, any>();

    // Date variables
    if (variables.date) {
      map.set('תאריך', variables.date);
      map.set('date', variables.date);
    }

    if (variables.year) {
      map.set('שנה', variables.year);
      map.set('year', variables.year);
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
    variableMap: Map<string, any>,
    variables: Partial<LetterVariables>
  ): any {
    // Try to get from map first
    if (variableMap.has(variableName)) {
      return variableMap.get(variableName);
    }

    // Try direct property access
    const value = (variables as any)[variableName];
    if (value !== undefined) {
      // Format numbers as currency if they look like amounts
      if (typeof value === 'number' && variableName.includes('amount')) {
        return this.formatCurrency(value);
      }
      return value;
    }

    return undefined;
  }

  /**
   * Format number as Israeli currency
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
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
      const value = (variables as any)[reqVar];
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
   */
  static sanitizeHtml(html: string): string {
    // This is a basic implementation
    // In production, use a library like DOMPurify
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/on\w+\s*=\s*'[^']*'/gi, '');
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