/**
 * Help System Types
 * TypeScript interfaces for the help and training page
 */

/**
 * Help content categories
 */
export type HelpCategory =
  | 'collections'
  | 'letters'
  | 'clients'
  | 'files'
  | 'settings';

/**
 * User roles that can access help content
 */
export type HelpUserRole = 'admin' | 'accountant' | 'bookkeeper' | 'client';

/**
 * Tip box types for tutorials
 */
export type TipType = 'info' | 'warning' | 'tip';

/**
 * A tip/note displayed within a tutorial step
 */
export interface TutorialTip {
  type: TipType;
  content: string;
}

/**
 * A single step in a tutorial
 */
export interface TutorialStep {
  id: string;
  stepNumber: number;
  title: string;
  description: string;
  screenshotUrl?: string;
  screenshotAlt?: string;
  tip?: TutorialTip;
}

/**
 * A complete tutorial with multiple steps
 */
export interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: HelpCategory;
  icon: string;
  steps: TutorialStep[];
  tags: string[];
  roles: HelpUserRole[];
  order: number;
}

/**
 * FAQ item
 */
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: HelpCategory;
  tags: string[];
}

/**
 * Category metadata for display
 */
export interface CategoryInfo {
  id: HelpCategory;
  label: string;
  icon: string;
  description: string;
}

/**
 * Search result item (can be tutorial or FAQ)
 */
export interface SearchResult {
  type: 'tutorial' | 'faq';
  id: string;
  title: string;
  description: string;
  category: HelpCategory;
  matchScore: number;
}

/**
 * Help content data structure
 */
export interface HelpContent {
  tutorials: Tutorial[];
  faqs: FAQItem[];
  categories: CategoryInfo[];
}
