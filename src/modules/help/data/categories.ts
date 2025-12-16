/**
 * Help Categories Configuration
 */

import type { CategoryInfo } from '../types/help.types';

export const HELP_CATEGORIES: CategoryInfo[] = [
  {
    id: 'collections',
    label: 'מערכת גביה',
    icon: 'Receipt',
    description: 'ניהול גביית תשלומים, תזכורות, והבטחות תשלום',
  },
  {
    id: 'letters',
    label: 'מכתבים',
    icon: 'FileText',
    description: 'כתיבת מכתבי שכר טרחה, שליחה במייל ו-WhatsApp',
  },
  {
    id: 'clients',
    label: 'לקוחות',
    icon: 'Users',
    description: 'ניהול לקוחות, אנשי קשר, וקבוצות',
  },
  {
    id: 'files',
    label: 'קבצים',
    icon: 'FolderOpen',
    description: 'ניהול קבצים ומסמכים לפי קטגוריות',
  },
  {
    id: 'settings',
    label: 'הגדרות',
    icon: 'Settings',
    description: 'הגדרות מערכת, משתמשים, והרשאות',
  },
];

/**
 * Get category info by ID
 */
export function getCategoryInfo(id: string): CategoryInfo | undefined {
  return HELP_CATEGORIES.find((cat) => cat.id === id);
}
