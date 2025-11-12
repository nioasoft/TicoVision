/**
 * PDFGenerationService - On-Demand PDF Generation
 *
 * Handles PDF generation via Edge Function:
 * - Generates PDF on-demand (not pre-generated)
 * - Stores PDF in Supabase Storage
 * - Updates generated_letters.pdf_url
 * - Caches PDF URL for reuse
 *
 * Edge Function: 'generate-pdf'
 * Storage Bucket: 'letter-pdfs' (created in migration 091)
 */

import { supabase } from '@/lib/supabase';

interface PDFGenerationResponse {
  success: boolean;
  pdfUrl: string;
  error?: string;
}

interface PDFMetadata {
  letterId: string;
  generatedAt: string;
  fileSize: number;
  url: string;
}

export class PDFGenerationService {
  private readonly edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pdf`;
  private readonly bucket = 'letter-pdfs'; // Correct bucket (migration 091)

  /**
   * Generate PDF on-demand
   *
   * Calls the Edge Function to generate a PDF from the letter HTML.
   * The PDF is stored in Supabase Storage and the URL is returned.
   *
   * Process:
   * 1. Call Edge Function with letterId
   * 2. Edge Function renders HTML via Puppeteer
   * 3. PDF is uploaded to Storage
   * 4. URL is saved to generated_letters.pdf_url
   * 5. Public URL is returned
   *
   * @param letterId - ID of the letter to convert to PDF
   * @returns Public URL of the generated PDF
   * @throws Error if generation fails
   */
  async generatePDF(letterId: string): Promise<string> {
    try {
      const { data, error } = await supabase.functions.invoke<PDFGenerationResponse>('generate-pdf', {
        body: { letterId },
      });

      if (error) {
        throw new Error(`PDF generation failed: ${error.message}`);
      }

      if (!data || !data.success) {
        throw new Error(data?.error || 'PDF generation failed with unknown error');
      }

      return data.pdfUrl;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`PDF generation error: ${error.message}`);
      }
      throw new Error('PDF generation failed with unknown error');
    }
  }

  /**
   * Check if letter already has a PDF
   *
   * Checks the generated_letters.pdf_url field.
   * Returns true if PDF exists and is accessible.
   *
   * @param letterId - ID of the letter to check
   * @returns true if PDF exists, false otherwise
   */
  async hasPDF(letterId: string): Promise<boolean> {
    const { data, error } = await supabase.from('generated_letters').select('pdf_url').eq('id', letterId).single();

    if (error) return false;

    return !!data?.pdf_url;
  }

  /**
   * Get existing PDF URL (if exists)
   *
   * Returns the PDF URL from the database if it exists.
   * Returns null if no PDF has been generated yet.
   *
   * Use this to avoid regenerating PDFs unnecessarily.
   *
   * @param letterId - ID of the letter
   * @returns PDF URL or null
   */
  async getPDFUrl(letterId: string): Promise<string | null> {
    const { data, error } = await supabase.from('generated_letters').select('pdf_url').eq('id', letterId).single();

    if (error || !data?.pdf_url) return null;

    return data.pdf_url;
  }

  /**
   * Get or generate PDF
   *
   * Smart method that:
   * 1. Checks if PDF already exists
   * 2. Returns existing URL if found
   * 3. Generates new PDF if not found
   *
   * This is the recommended method for most use cases.
   *
   * @param letterId - ID of the letter
   * @param forceRegenerate - Force regeneration even if PDF exists
   * @returns PDF URL
   */
  async getOrGeneratePDF(letterId: string, forceRegenerate = false): Promise<string> {
    if (!forceRegenerate) {
      const existingUrl = await this.getPDFUrl(letterId);
      if (existingUrl) {
        return existingUrl;
      }
    }

    return this.generatePDF(letterId);
  }

  /**
   * Get PDF metadata
   *
   * Returns metadata about the PDF:
   * - Letter ID
   * - Generation timestamp
   * - File size
   * - Public URL
   *
   * @param letterId - ID of the letter
   * @returns PDF metadata or null if no PDF exists
   */
  async getPDFMetadata(letterId: string): Promise<PDFMetadata | null> {
    const { data: letter, error } = await supabase
      .from('generated_letters')
      .select('id, pdf_url, pdf_generated_at, created_at')
      .eq('id', letterId)
      .single();

    if (error || !letter?.pdf_url) return null;

    // Get file size from Storage
    const fileName = this.extractFileNameFromUrl(letter.pdf_url);
    if (!fileName) return null;

    const { data: fileData, error: fileError } = await supabase.storage.from(this.bucket).list('', {
      search: fileName,
    });

    if (fileError || !fileData || fileData.length === 0) return null;

    const file = fileData[0];

    return {
      letterId: letter.id,
      generatedAt: letter.created_at, // Using created_at as fallback since pdf_generated_at may not exist
      fileSize: file.metadata?.size || 0,
      url: letter.pdf_url,
    };
  }

  /**
   * Delete PDF
   *
   * Removes the PDF from Storage and clears the pdf_url field.
   * Use this when:
   * - Letter is deleted
   * - Letter is edited and PDF needs regeneration
   * - Storage cleanup
   *
   * @param letterId - ID of the letter
   * @returns true if deletion successful, false otherwise
   */
  async deletePDF(letterId: string): Promise<boolean> {
    const pdfUrl = await this.getPDFUrl(letterId);
    if (!pdfUrl) return false;

    const fileName = this.extractFileNameFromUrl(pdfUrl);
    if (!fileName) return false;

    try {
      // Delete from Storage
      const { error: storageError } = await supabase.storage.from(this.bucket).remove([fileName]);

      if (storageError) {
        console.error('Failed to delete PDF from storage:', storageError);
        return false;
      }

      // Clear pdf_url in database
      const { error: dbError } = await supabase
        .from('generated_letters')
        .update({ pdf_url: null })
        .eq('id', letterId);

      if (dbError) {
        console.error('Failed to clear PDF URL in database:', dbError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('PDF deletion error:', error);
      return false;
    }
  }

  /**
   * Extract filename from Supabase Storage URL
   *
   * Helper method to get the filename from a full Storage URL.
   *
   * @param url - Full Supabase Storage URL
   * @returns Filename or null if invalid URL
   */
  private extractFileNameFromUrl(url: string): string | null {
    try {
      const parts = url.split('/');
      return parts[parts.length - 1] || null;
    } catch {
      return null;
    }
  }

  /**
   * Get PDF download URL with expiry
   *
   * Generates a signed URL for downloading the PDF.
   * URL expires after specified duration.
   *
   * @param letterId - ID of the letter
   * @param expiresIn - Expiry time in seconds (default: 3600 = 1 hour)
   * @returns Signed download URL or null if PDF doesn't exist
   */
  async getDownloadUrl(letterId: string, expiresIn = 3600): Promise<string | null> {
    const pdfUrl = await this.getPDFUrl(letterId);
    if (!pdfUrl) return null;

    const fileName = this.extractFileNameFromUrl(pdfUrl);
    if (!fileName) return null;

    const { data, error } = await supabase.storage.from(this.bucket).createSignedUrl(fileName, expiresIn);

    if (error || !data) return null;

    return data.signedUrl;
  }

  /**
   * Batch generate PDFs
   *
   * Generates PDFs for multiple letters in parallel.
   * Returns results with success/failure for each letter.
   *
   * @param letterIds - Array of letter IDs
   * @returns Array of results (letterId + url or error)
   */
  async batchGeneratePDFs(letterIds: string[]): Promise<
    Array<{
      letterId: string;
      success: boolean;
      url?: string;
      error?: string;
    }>
  > {
    const results = await Promise.allSettled(letterIds.map((id) => this.generatePDF(id)));

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return {
          letterId: letterIds[index],
          success: true,
          url: result.value,
        };
      } else {
        return {
          letterId: letterIds[index],
          success: false,
          error: result.reason?.message || 'Unknown error',
        };
      }
    });
  }
}

// Singleton instance - use this throughout the app
export const pdfGenerationService = new PDFGenerationService();
