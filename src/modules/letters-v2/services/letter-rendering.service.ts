/**
 * LetterRenderingService - Unified Letter Rendering
 *
 * Three rendering modes:
 * 1. Email: CID references + base64 attachments
 * 2. Browser: Public URLs for images
 * 3. PDF: Optimized HTML for Puppeteer
 *
 * All modes work from the same source (generated_letters.generated_content_html)
 */

import { supabase } from '@/lib/supabase';
import { imageServiceV2 } from './image.service';
import type { EmailRenderResult, EmailAttachment, ParsedLetter } from '../types/letters-v2.types';

export class LetterRenderingService {
  /**
   * Render letter for email (CID references + base64 attachments)
   *
   * Prepares the letter for email delivery with:
   * - HTML content with CID references intact
   * - Base64-encoded image attachments
   * - Proper content-id mapping
   *
   * @param letterId - ID of the letter in generated_letters table
   * @returns HTML and attachments array ready for SendGrid/SMTP
   * @throws Error if letter not found
   */
  async renderForEmail(letterId: string): Promise<EmailRenderResult> {
    // 1. Load letter from DB
    const { data: letter, error } = await supabase
      .from('generated_letters')
      .select('*')
      .eq('id', letterId)
      .single();

    if (error || !letter) {
      throw new Error(`Letter not found: ${letterId}`);
    }

    // 2. Get HTML (already has CID references)
    const html = letter.generated_content_html;

    // 3. Get all images as base64
    const imagesBase64 = await imageServiceV2.getAllAsBase64();

    // 4. Build attachments array
    const attachments: EmailAttachment[] = [
      {
        content: imagesBase64.tico_logo_new,
        filename: 'tico_logo_new.png',
        type: 'image/png',
        disposition: 'inline',
        content_id: 'tico_logo_new',
      },
      {
        content: imagesBase64.franco_logo_new,
        filename: 'franco_logo_new.png',
        type: 'image/png',
        disposition: 'inline',
        content_id: 'franco_logo_new',
      },
      {
        content: imagesBase64.tagline,
        filename: 'tagline.png',
        type: 'image/png',
        disposition: 'inline',
        content_id: 'tagline',
      },
      {
        content: imagesBase64.bullet_star_blue,
        filename: 'bullet_star_blue.png',
        type: 'image/png',
        disposition: 'inline',
        content_id: 'bullet_star_blue',
      },
    ];

    return { html, attachments };
  }

  /**
   * Render letter for browser (convert CID → public URLs)
   *
   * Replaces all CID references with public URLs from Supabase Storage.
   * Used for:
   * - Letter preview in UI
   * - Letter display in dashboard
   * - Direct browser rendering
   *
   * @param letterId - ID of the letter in generated_letters table
   * @returns HTML with public URLs (ready for browser display)
   * @throws Error if letter not found
   */
  async renderForBrowser(letterId: string): Promise<string> {
    // 1. Load letter from DB
    const { data: letter, error } = await supabase
      .from('generated_letters')
      .select('*')
      .eq('id', letterId)
      .single();

    if (error || !letter) {
      throw new Error(`Letter not found: ${letterId}`);
    }

    // 2. Get HTML with CID references
    let html = letter.generated_content_html;

    // 3. Get all public URLs
    const imageUrls = imageServiceV2.getAllPublicUrls();

    // 4. Replace all CID references with public URLs
    for (const [cid, url] of Object.entries(imageUrls)) {
      html = html.replace(new RegExp(cid, 'g'), url);
    }

    return html;
  }

  /**
   * Render letter for PDF generation (optimized HTML)
   *
   * For PDF, we need public URLs (Puppeteer will fetch them).
   * This is essentially the same as renderForBrowser.
   *
   * Future optimizations could include:
   * - Inline critical CSS
   * - Remove interactive elements
   * - Optimize image sizes
   *
   * @param letterId - ID of the letter in generated_letters table
   * @returns HTML optimized for PDF rendering
   * @throws Error if letter not found
   */
  async renderForPDF(letterId: string): Promise<string> {
    // For PDF, we need public URLs (Puppeteer will fetch them)
    return this.renderForBrowser(letterId);
  }

  /**
   * Parse letter back to editable format (for edit feature)
   *
   * Extracts:
   * - Original HTML
   * - Variables used
   * - Letter type
   *
   * This enables the "Edit Letter" feature where users can
   * modify variables and regenerate the letter.
   *
   * @param letterId - ID of the letter in generated_letters table
   * @returns Parsed letter data ready for editing
   * @throws Error if letter not found
   */
  async parseLetterForEdit(letterId: string): Promise<ParsedLetter> {
    const { data: letter, error } = await supabase
      .from('generated_letters')
      .select('*')
      .eq('id', letterId)
      .single();

    if (error || !letter) {
      throw new Error(`Letter not found: ${letterId}`);
    }

    return {
      html: letter.generated_content_html,
      variables: letter.variables_used || {},
      letterType: letter.letter_type || 'unknown',
    };
  }

  /**
   * Get letter metadata without rendering
   *
   * Useful for listing letters, checking status, etc.
   *
   * @param letterId - ID of the letter in generated_letters table
   * @returns Letter metadata
   * @throws Error if letter not found
   */
  async getLetterMetadata(letterId: string): Promise<{
    id: string;
    letterType: string;
    createdAt: string;
    hasPDF: boolean;
    systemVersion: string;
  }> {
    const { data: letter, error } = await supabase
      .from('generated_letters')
      .select('id, letter_type, created_at, pdf_url, system_version')
      .eq('id', letterId)
      .single();

    if (error || !letter) {
      throw new Error(`Letter not found: ${letterId}`);
    }

    return {
      id: letter.id,
      letterType: letter.letter_type || 'unknown',
      createdAt: letter.created_at,
      hasPDF: !!letter.pdf_url,
      systemVersion: letter.system_version || 'v1',
    };
  }

  /**
   * Validate that a letter has all required images
   *
   * Checks if all CID references in HTML have corresponding images.
   * Returns list of missing images.
   *
   * @param letterId - ID of the letter in generated_letters table
   * @returns Array of missing image names (empty if all present)
   */
  async validateLetterImages(letterId: string): Promise<string[]> {
    const { data: letter, error } = await supabase
      .from('generated_letters')
      .select('generated_content_html')
      .eq('id', letterId)
      .single();

    if (error || !letter) {
      throw new Error(`Letter not found: ${letterId}`);
    }

    const html = letter.generated_content_html;
    const cidPattern = /cid:(\w+)/g;
    const foundCids = new Set<string>();
    let match;

    while ((match = cidPattern.exec(html)) !== null) {
      foundCids.add(match[1]);
    }

    const missingImages: string[] = [];
    const availableImages = imageServiceV2.getAllPublicUrls();

    for (const cid of foundCids) {
      if (!availableImages[`cid:${cid}`]) {
        missingImages.push(cid);
      }
    }

    return missingImages;
  }
}

// Singleton instance - use this throughout the app
export const letterRenderingService = new LetterRenderingService();
