/**
 * Hook for PDF signature operations
 * Handles adding signatures and dates to PDFs, downloading, and saving to storage
 */

import { useState, useCallback } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { supabase } from '@/lib/supabase';

export type PdfElementType = 'signature' | 'signature_with_address' | 'date';

// Address text for signature with address
const SIGNATURE_ADDRESS = "רח' שד\"ל 3, תל אביב";

// Hebrew font URL (Heebo Regular from Google Fonts)
const HEBREW_FONT_URL = 'https://fonts.gstatic.com/s/heebo/v28/NGSpv5_NC0k9P_v6ZUCbLRAHxK1EiSyccg.ttf';

// Cache for the Hebrew font to avoid re-fetching
let cachedHebrewFont: ArrayBuffer | null = null;

async function getHebrewFont(): Promise<ArrayBuffer> {
  if (cachedHebrewFont) {
    return cachedHebrewFont;
  }
  const response = await fetch(HEBREW_FONT_URL);
  if (!response.ok) {
    throw new Error('Failed to fetch Hebrew font');
  }
  cachedHebrewFont = await response.arrayBuffer();
  return cachedHebrewFont;
}

export interface PdfElement {
  id: string; // unique identifier
  type: PdfElementType;
  x: number; // percentage from left (0-100)
  y: number; // percentage from top (0-100)
  page: number; // 0-indexed page number
  width: number; // percentage of page width
  height: number; // percentage of page height
  value?: string; // for date elements, the date string
}

// Legacy type for backwards compatibility
export interface SignaturePosition {
  x: number;
  y: number;
  page: number;
  width: number;
  height: number;
}

interface UsePdfSignatureReturn {
  isProcessing: boolean;
  error: string | null;
  addSignatureToPdf: (
    pdfBytes: ArrayBuffer,
    signatureBytes: ArrayBuffer,
    position: SignaturePosition
  ) => Promise<Uint8Array>;
  addElementsToPdf: (
    pdfBytes: ArrayBuffer,
    signatureBytes: ArrayBuffer,
    elements: PdfElement[]
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
   * Add multiple elements (signatures and dates) to a PDF
   */
  const addElementsToPdf = useCallback(
    async (
      pdfBytes: ArrayBuffer,
      signatureBytes: ArrayBuffer,
      elements: PdfElement[]
    ): Promise<Uint8Array> => {
      setIsProcessing(true);
      setError(null);

      try {
        // Load the PDF
        const pdfDoc = await PDFDocument.load(pdfBytes);

        // Register fontkit to enable custom font embedding
        pdfDoc.registerFontkit(fontkit);

        const pages = pdfDoc.getPages();

        // Embed the signature image once (for all signature elements)
        const signatureImage = await pdfDoc.embedPng(signatureBytes);

        // Embed Hebrew font for text (supports Hebrew characters)
        const hebrewFontBytes = await getHebrewFont();
        const font = await pdfDoc.embedFont(hebrewFontBytes);

        // Process each element
        for (const element of elements) {
          // Validate page index
          if (element.page < 0 || element.page >= pages.length) {
            console.warn(`Invalid page index: ${element.page}, skipping element`);
            continue;
          }

          const page = pages[element.page];
          const { width: pageWidth, height: pageHeight } = page.getSize();

          // Calculate position in PDF coordinates
          // PDF coordinates start from bottom-left, but we get position from top-left
          const elemWidth = (element.width / 100) * pageWidth;
          const elemHeight = (element.height / 100) * pageHeight;
          const x = (element.x / 100) * pageWidth;
          const y = pageHeight - (element.y / 100) * pageHeight - elemHeight;

          if (element.type === 'signature') {
            // Draw signature image
            page.drawImage(signatureImage, {
              x,
              y,
              width: elemWidth,
              height: elemHeight,
            });
          } else if (element.type === 'signature_with_address') {
            // Draw signature image (upper portion)
            const signatureHeight = elemHeight * 0.65; // 65% for signature
            const addressHeight = elemHeight * 0.35; // 35% for address

            page.drawImage(signatureImage, {
              x,
              y: y + addressHeight, // Signature goes above the address
              width: elemWidth,
              height: signatureHeight,
            });

            // Draw address text below signature
            const fontSize = Math.min(addressHeight * 0.6, 10);
            const textWidth = font.widthOfTextAtSize(SIGNATURE_ADDRESS, fontSize);
            const textX = x + (elemWidth - textWidth) / 2; // Center the text

            page.drawText(SIGNATURE_ADDRESS, {
              x: textX,
              y: y + addressHeight * 0.3, // Position in the address area
              size: fontSize,
              font,
              color: rgb(0, 0, 0),
            });
          } else if (element.type === 'date') {
            // Draw date text
            const dateText = element.value || new Date().toLocaleDateString('he-IL');
            const fontSize = Math.min(elemHeight * 0.7, 14); // Scale font size

            page.drawText(dateText, {
              x,
              y: y + elemHeight * 0.3, // Center vertically
              size: fontSize,
              font,
              color: rgb(0, 0, 0),
            });
          }
        }

        // Save and return the modified PDF
        const modifiedPdfBytes = await pdfDoc.save();
        return modifiedPdfBytes;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add elements to PDF';
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
    addElementsToPdf,
    downloadPdf,
    savePdfToStorage,
  };
}
