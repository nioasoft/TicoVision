/**
 * Hook for PDF signature operations
 * Handles adding signatures to PDFs, downloading, and saving to storage
 */

import { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { supabase } from '@/lib/supabase';

export interface SignaturePosition {
  x: number; // percentage from left (0-100)
  y: number; // percentage from top (0-100)
  page: number; // 0-indexed page number
  width: number; // percentage of page width
  height: number; // percentage of page height
}

interface UsePdfSignatureReturn {
  isProcessing: boolean;
  error: string | null;
  addSignatureToPdf: (
    pdfBytes: ArrayBuffer,
    signatureBytes: ArrayBuffer,
    position: SignaturePosition
  ) => Promise<Uint8Array>;
  downloadPdf: (pdfBytes: Uint8Array, filename: string) => void;
  savePdfToStorage: (
    pdfBytes: Uint8Array,
    originalFilename: string
  ) => Promise<string>;
}

/**
 * Sanitize filename for Supabase storage
 * Removes Hebrew characters, special chars, and replaces spaces
 */
function sanitizeFilename(filename: string): string {
  return filename
    // Remove Hebrew characters
    .replace(/[\u0590-\u05FF]/g, '')
    // Replace spaces and special chars with underscores
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    // Remove multiple consecutive underscores
    .replace(/_+/g, '_')
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, '')
    // Ensure we have a valid filename
    || 'document';
}

export function usePdfSignature(): UsePdfSignatureReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Add a signature image to a PDF at the specified position
   */
  const addSignatureToPdf = useCallback(
    async (
      pdfBytes: ArrayBuffer,
      signatureBytes: ArrayBuffer,
      position: SignaturePosition
    ): Promise<Uint8Array> => {
      setIsProcessing(true);
      setError(null);

      try {
        // Load the PDF
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        // Validate page index
        if (position.page < 0 || position.page >= pages.length) {
          throw new Error(`Invalid page index: ${position.page}`);
        }

        const page = pages[position.page];
        const { width: pageWidth, height: pageHeight } = page.getSize();

        // Embed the signature image (PNG)
        const signatureImage = await pdfDoc.embedPng(signatureBytes);
        const signatureDims = signatureImage.scale(1);

        // Calculate position in PDF coordinates
        // PDF coordinates start from bottom-left, but we get position from top-left
        const sigWidth = (position.width / 100) * pageWidth;
        const sigHeight = (position.height / 100) * pageHeight;
        const x = (position.x / 100) * pageWidth;
        const y = pageHeight - (position.y / 100) * pageHeight - sigHeight;

        // Draw the signature on the page
        page.drawImage(signatureImage, {
          x,
          y,
          width: sigWidth,
          height: sigHeight,
        });

        // Save and return the modified PDF
        const modifiedPdfBytes = await pdfDoc.save();
        return modifiedPdfBytes;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add signature to PDF';
        setError(errorMessage);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  /**
   * Download a PDF file to the user's device
   */
  const downloadPdf = useCallback((pdfBytes: Uint8Array, filename: string) => {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, []);

  /**
   * Save the signed PDF to Supabase storage
   */
  const savePdfToStorage = useCallback(
    async (pdfBytes: Uint8Array, originalFilename: string): Promise<string> => {
      setIsProcessing(true);
      setError(null);

      try {
        // Get tenant ID from user metadata
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        const tenantId = user.user_metadata?.tenant_id;
        if (!tenantId) {
          throw new Error('Tenant ID not found');
        }

        // Generate unique filename (sanitized for Supabase storage)
        const timestamp = Date.now();
        const baseName = originalFilename.replace(/\.pdf$/i, '');
        const sanitizedBaseName = sanitizeFilename(baseName);
        const signedFilename = `signed-${sanitizedBaseName}-${timestamp}.pdf`;
        const storagePath = `${tenantId}/tzlul-signatures/${signedFilename}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('client-attachments')
          .upload(storagePath, pdfBytes, {
            contentType: 'application/pdf',
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('client-attachments')
          .getPublicUrl(storagePath);

        return urlData.publicUrl;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to save PDF to storage';
        setError(errorMessage);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  return {
    isProcessing,
    error,
    addSignatureToPdf,
    downloadPdf,
    savePdfToStorage,
  };
}
