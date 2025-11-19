/**
 * Letters V2 Type Definitions
 *
 * Unified type system for the new letter rendering architecture
 */

export interface LetterV2 {
  id: string;
  system_version: 'v1' | 'v2';
  version_number: number;
  is_latest: boolean;
  parent_letter_id: string | null;
  pdf_url: string | null;
  rendering_engine: 'legacy' | 'unified';
  generated_content_html: string;
  letter_type: string;
  variables_used: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  tenant_id: string;
  client_id: string;
}

export interface RenderOptions {
  format: 'email' | 'browser' | 'pdf';
  includeImages?: boolean;
}

export interface EmailAttachment {
  content: string; // base64
  filename: string;
  type: string;
  disposition: 'inline';
  content_id: string;
}

export interface EmailRenderResult {
  html: string;
  attachments: EmailAttachment[];
}

export interface ImageMap {
  [key: string]: string; // CID → URL/base64
}

export interface ParsedLetter {
  html: string;
  variables: Record<string, unknown>;
  letterType: string;
}

export type ImageName =
  | 'tico_logo_new'
  | 'tico_logo'
  | 'franco_logo_new'
  | 'franco_logo'
  | 'tagline'
  | 'bullet_star_blue'
  | 'bullet_star';
