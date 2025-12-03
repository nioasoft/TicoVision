/**
 * Company Extraction Service
 * Extracts company data from Israeli Companies Registry PDFs using Claude Vision API
 */

import { supabase } from '@/lib/supabase';

export interface ExtractedCompanyData {
  company_name: string;
  tax_id: string;
  address_street: string;
  address_city: string;
  postal_code: string;
}

export interface ExtractionResult {
  data: ExtractedCompanyData | null;
  error: string | null;
}

class CompanyExtractionService {
  private pdfjsLib: typeof import('pdfjs-dist') | null = null;

  /**
   * Load PDF.js library dynamically
   */
  private async loadPdfJs() {
    if (this.pdfjsLib) return this.pdfjsLib;

    const pdfjsLib = await import('pdfjs-dist');
    // Use worker from node_modules to match API version
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();

    this.pdfjsLib = pdfjsLib;
    return pdfjsLib;
  }

  /**
   * Convert PDF first page to base64 PNG image
   */
  async pdfToImage(file: File): Promise<string> {
    const pdfjsLib = await this.loadPdfJs();

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1); // First page only

    // Render at 4x scale for better OCR quality (higher = more accurate text extraction)
    const viewport = page.getViewport({ scale: 4 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Failed to create canvas context');
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;

    return canvas.toDataURL('image/png');
  }

  /**
   * Extract company data from PDF via Edge Function
   */
  async extractFromPdf(file: File): Promise<ExtractionResult> {
    try {
      // Step 1: Convert PDF to image
      console.log('Converting PDF to image...');
      const imageBase64 = await this.pdfToImage(file);
      console.log('Image size:', Math.round(imageBase64.length / 1024), 'KB');

      // Step 2: Call Edge Function
      console.log('Calling extract-company-data Edge Function...');
      const { data, error } = await supabase.functions.invoke('extract-company-data', {
        body: { imageBase64 }
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw new Error(error.message || 'Edge Function error');
      }

      if (!data.success) {
        throw new Error(data.error || 'Extraction failed');
      }

      console.log('Extracted data:', data.data);
      return { data: data.data, error: null };

    } catch (error) {
      console.error('Extraction error:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'שגיאה בחילוץ נתונים מה-PDF'
      };
    }
  }
}

export const companyExtractionService = new CompanyExtractionService();
