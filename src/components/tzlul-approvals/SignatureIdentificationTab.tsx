/**
 * Signature Identification Tab for Tzlul
 * Allows uploading a PDF and adding the company signature
 */

import { useState, useCallback, useRef } from 'react';
import { Upload, Download, Trash2, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { PdfSignatureViewer } from './PdfSignatureViewer';
import { usePdfSignature, type SignaturePosition } from '@/hooks/usePdfSignature';
import { cn } from '@/lib/utils';

// Signature URL - using the public brand folder
const SIGNATURE_URL = '/brand/tico_signature.png';

export function SignatureIdentificationTab() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [signaturePosition, setSignaturePosition] = useState<SignaturePosition | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isProcessing, addSignatureToPdf, downloadPdf, savePdfToStorage } = usePdfSignature();

  const handleFileSelect = useCallback((file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('סוג קובץ לא תקין - יש להעלות קובץ PDF');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('הקובץ גדול מדי - מקסימום 15MB');
      return;
    }

    setPdfFile(file);
    setSignaturePosition(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  const handleClear = useCallback(() => {
    setPdfFile(null);
    setSignaturePosition(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleSaveAndDownload = useCallback(async () => {
    if (!pdfFile || !signaturePosition) {
      toast.error('יש להעלות PDF ולמקם את החתימה');
      return;
    }

    try {
      // Read the PDF file
      const pdfBytes = await pdfFile.arrayBuffer();

      // Fetch the signature image
      const signatureResponse = await fetch(SIGNATURE_URL);
      if (!signatureResponse.ok) {
        throw new Error('Failed to fetch signature image');
      }
      const signatureBytes = await signatureResponse.arrayBuffer();

      // Add signature to PDF
      const signedPdfBytes = await addSignatureToPdf(pdfBytes, signatureBytes, signaturePosition);

      // Generate filename
      const originalName = pdfFile.name.replace(/\.pdf$/i, '');
      const signedFilename = `${originalName}-signed.pdf`;

      // Save to storage
      await savePdfToStorage(signedPdfBytes, pdfFile.name);

      // Download
      downloadPdf(signedPdfBytes, signedFilename);

      toast.success('PDF חתום נשמר והורד בהצלחה');
    } catch (err) {
      console.error('Error processing PDF:', err);
      toast.error(err instanceof Error ? err.message : 'שגיאה בעיבוד הקובץ');
    }
  }, [pdfFile, signaturePosition, addSignatureToPdf, savePdfToStorage, downloadPdf]);

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">חתימה לשם זיהוי</CardTitle>
          <CardDescription className="text-right">
            העלה מסמך PDF והוסף את חתימת המשרד לשם זיהוי
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload area */}
          {!pdfFile && (
            <div
              className={cn(
                'relative border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer',
                isDragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50'
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleInputChange}
              />
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-primary/10 rounded-full">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium">
                    גרור קובץ PDF לכאן או לחץ לבחירה
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    עד 15MB
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PDF Viewer */}
          {pdfFile && (
            <div className="space-y-4">
              {/* File info */}
              <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 ml-2" />
                  הסר
                </Button>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{pdfFile.name}</span>
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              {/* Viewer */}
              <PdfSignatureViewer
                pdfFile={pdfFile}
                signatureUrl={SIGNATURE_URL}
                signaturePosition={signaturePosition}
                onPositionChange={setSignaturePosition}
              />

              {/* Actions */}
              <div className="flex justify-center gap-4">
                <Button
                  onClick={handleSaveAndDownload}
                  disabled={!signaturePosition || isProcessing}
                  className="min-w-[200px]"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                      מעבד...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 ml-2" />
                      שמור והורד PDF חתום
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-medium text-blue-900 mb-3">הוראות שימוש:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>העלה קובץ PDF שדורש חתימה לזיהוי</li>
            <li>נווט לעמוד שבו רוצים להוסיף את החתימה</li>
            <li>לחץ על "הוסף חתימה לעמוד זה"</li>
            <li>גרור את החתימה למיקום הרצוי על העמוד</li>
            <li>לחץ על "שמור והורד" לקבלת המסמך החתום</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
