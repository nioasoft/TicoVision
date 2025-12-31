/**
 * PDF Import Button Component
 * Allows importing company registry PDF documents to be saved in file manager
 * Note: Data extraction via Claude API is disabled - only file upload
 */

import React, { useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { FileUp } from 'lucide-react';
import { toast } from 'sonner';
import type { ExtractedCompanyData } from '@/services/company-extraction.service';

interface PdfImportButtonProps {
  onDataExtracted: (data: ExtractedCompanyData | null, file: File) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function PdfImportButton({ onDataExtracted, disabled = false }: PdfImportButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Pass file without extraction - file will be saved to file manager
    onDataExtracted(null, file);
    toast.success('קובץ PDF נטען - יישמר עם יצירת הלקוח');
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
        disabled={disabled}
        className="gap-2"
      >
        <FileUp className="h-4 w-4" />
        העלאת PDF רשם חברות
      </Button>
    </>
  );
}
