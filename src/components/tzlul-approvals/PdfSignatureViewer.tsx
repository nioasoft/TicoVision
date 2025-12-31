/**
 * PDF Viewer with draggable signature overlay
 * Displays a PDF and allows the user to position a signature by dragging
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Move, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SignaturePosition } from '@/hooks/usePdfSignature';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfSignatureViewerProps {
  pdfFile: File | null;
  signatureUrl: string;
  onPositionChange: (position: SignaturePosition | null) => void;
  signaturePosition: SignaturePosition | null;
}

// Default signature size as percentage of page
const DEFAULT_SIGNATURE_WIDTH = 15;
const DEFAULT_SIGNATURE_HEIGHT = 7;

export function PdfSignatureViewer({
  pdfFile,
  signatureUrl,
  onPositionChange,
  signaturePosition,
}: PdfSignatureViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Create object URL for the PDF file
  useEffect(() => {
    if (pdfFile) {
      const url = URL.createObjectURL(pdfFile);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPdfUrl(null);
  }, [pdfFile]);

  // Reset when file changes
  useEffect(() => {
    setCurrentPage(1);
    setScale(1);
    onPositionChange(null);
  }, [pdfFile, onPositionChange]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    // Don't auto-place signature - wait for user to click "Add Signature" button
  }, []);

  // Add signature to current page
  const handleAddSignatureToCurrentPage = useCallback(() => {
    onPositionChange({
      x: 50 - DEFAULT_SIGNATURE_WIDTH / 2,
      y: 80,
      page: currentPage - 1, // 0-indexed
      width: DEFAULT_SIGNATURE_WIDTH,
      height: DEFAULT_SIGNATURE_HEIGHT,
    });
  }, [currentPage, onPositionChange]);

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
    if (signaturePosition && signaturePosition.page === currentPage - 1) {
      // Keep signature on current page when navigating
    }
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, numPages));
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 2));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  // Handle signature dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !pageRef.current || !signaturePosition) return;

    const pageRect = pageRef.current.getBoundingClientRect();

    // Calculate new position as percentage
    const newX = ((e.clientX - pageRect.left - dragOffset.x) / pageRect.width) * 100;
    const newY = ((e.clientY - pageRect.top - dragOffset.y) / pageRect.height) * 100;

    // Clamp values to keep signature within page bounds
    const clampedX = Math.max(0, Math.min(100 - signaturePosition.width, newX));
    const clampedY = Math.max(0, Math.min(100 - signaturePosition.height, newY));

    onPositionChange({
      ...signaturePosition,
      x: clampedX,
      y: clampedY,
      page: currentPage - 1,
    });
  }, [isDragging, dragOffset, signaturePosition, currentPage, onPositionChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse up listener to handle drag end outside the component
  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  if (!pdfUrl) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted/30 rounded-lg border-2 border-dashed">
        <p className="text-muted-foreground">No PDF loaded</p>
      </div>
    );
  }

  const isSignatureOnCurrentPage = signaturePosition?.page === currentPage - 1;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="text-sm min-w-[80px] text-center">
            {currentPage} / {numPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Add Signature Button */}
        <Button
          variant={isSignatureOnCurrentPage ? 'secondary' : 'default'}
          size="sm"
          onClick={handleAddSignatureToCurrentPage}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {isSignatureOnCurrentPage ? 'החתימה בעמוד זה' : 'הוסף חתימה לעמוד זה'}
        </Button>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            disabled={scale >= 2}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Viewer with signature overlay */}
      <div
        ref={containerRef}
        className="relative overflow-auto bg-muted/30 rounded-lg border max-h-[85vh]"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div className="flex justify-center p-4">
          <div ref={pageRef} className="relative inline-block shadow-lg">
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              loading={
                <div className="flex items-center justify-center h-96 w-96">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              }
              error={
                <div className="flex items-center justify-center h-96 w-96 text-destructive">
                  Failed to load PDF
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>

            {/* Signature overlay */}
            {signaturePosition && isSignatureOnCurrentPage && (
              <div
                className={cn(
                  'absolute cursor-move select-none border-2 rounded',
                  isDragging
                    ? 'border-primary shadow-lg'
                    : 'border-primary/50 hover:border-primary'
                )}
                style={{
                  left: `${signaturePosition.x}%`,
                  top: `${signaturePosition.y}%`,
                  width: `${signaturePosition.width}%`,
                  height: `${signaturePosition.height}%`,
                }}
                onMouseDown={handleMouseDown}
              >
                <img
                  src={signatureUrl}
                  alt="Signature"
                  className="w-full h-full object-contain pointer-events-none"
                  draggable={false}
                />
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded flex items-center gap-1">
                  <Move className="h-3 w-3" />
                  <span>גרור להזזה</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info text */}
      <p className="text-sm text-muted-foreground text-center">
        {!signaturePosition
          ? 'נווט לעמוד הרצוי ולחץ על "הוסף חתימה לעמוד זה"'
          : isSignatureOnCurrentPage
            ? 'גרור את החתימה למקם אותה על המסמך'
            : `החתימה נמצאת בעמוד ${(signaturePosition?.page ?? 0) + 1}. נווט לשם לצפייה או להזזה.`}
      </p>
    </div>
  );
}
