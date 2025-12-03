/**
 * PDF Import Button Component
 * Allows importing company data from Israeli Companies Registry PDF documents
 */

import React, { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FileUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { companyExtractionService } from '@/services/company-extraction.service';
import type { ExtractedCompanyData } from '@/services/company-extraction.service';

interface PdfImportButtonProps {
  onDataExtracted: (data: ExtractedCompanyData, file: File) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function PdfImportButton({ onDataExtracted, disabled = false }: PdfImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    e.target.value = '';

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast.error('יש להעלות קובץ PDF בלבד');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('הקובץ גדול מדי. גודל מקסימלי: 5MB');
      return;
    }

    setIsExtracting(true);

    try {
      const { data, error } = await companyExtractionService.extractFromPdf(file);

      if (error) {
        toast.error(error);
        return;
      }

      if (!data || (!data.company_name && !data.tax_id)) {
        toast.warning('לא נמצאו נתונים במסמך');
        return;
      }

      onDataExtracted(data, file);
      toast.success('נתוני החברה יובאו בהצלחה');

    } catch (error) {
      console.error('PDF extraction error:', error);
      toast.error('שגיאה בחילוץ נתונים. נסה שוב');
    } finally {
      setIsExtracting(false);
    }
  }, [onDataExtracted]);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={disabled || isExtracting}
        className="gap-2"
      >
        {isExtracting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            מחלץ נתונים...
          </>
        ) : (
          <>
            <FileUp className="h-4 w-4" />
            ייבוא מ-PDF
          </>
        )}
      </Button>
    </>
  );
}
