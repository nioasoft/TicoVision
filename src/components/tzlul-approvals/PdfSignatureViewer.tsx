/**
 * PDF Viewer with draggable signature and date overlays
 * Displays a PDF and allows the user to position multiple signatures and dates by dragging
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Move, Plus, Calendar, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PdfElement } from '@/hooks/usePdfSignature';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfSignatureViewerProps {
  pdfFile: File | null;
  signatureUrl: string;
  elements: PdfElement[];
  onElementsChange: (elements: PdfElement[]) => void;
}

// Default sizes as percentage of page
const DEFAULT_SIGNATURE_WIDTH = 15;
const DEFAULT_SIGNATURE_HEIGHT = 7;
const DEFAULT_SIGNATURE_WITH_ADDRESS_WIDTH = 18;
const DEFAULT_SIGNATURE_WITH_ADDRESS_HEIGHT = 10; // Taller to fit address below
const DEFAULT_DATE_WIDTH = 12;
const DEFAULT_DATE_HEIGHT = 3;

// Address text for display
const SIGNATURE_ADDRESS = "רח' שד\"ל 3, תל אביב";

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export function PdfSignatureViewer({
  pdfFile,
  signatureUrl,
  elements,
  onElementsChange,
}: PdfSignatureViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [draggingId, setDraggingId] = useState<string | null>(null);
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
    onElementsChange([]);
  }, [pdfFile, onElementsChange]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  // Add signature to current page
  const handleAddSignature = useCallback(() => {
    const newElement: PdfElement = {
      id: generateId(),
      type: 'signature',
      x: 50 - DEFAULT_SIGNATURE_WIDTH / 2,
      y: 80,
      page: currentPage - 1,
      width: DEFAULT_SIGNATURE_WIDTH,
      height: DEFAULT_SIGNATURE_HEIGHT,
    };
    onElementsChange([...elements, newElement]);
  }, [currentPage, elements, onElementsChange]);

  // Add signature with address to current page
  const handleAddSignatureWithAddress = useCallback(() => {
    const newElement: PdfElement = {
      id: generateId(),
      type: 'signature_with_address',
      x: 50 - DEFAULT_SIGNATURE_WITH_ADDRESS_WIDTH / 2,
      y: 75,
      page: currentPage - 1,
      width: DEFAULT_SIGNATURE_WITH_ADDRESS_WIDTH,
      height: DEFAULT_SIGNATURE_WITH_ADDRESS_HEIGHT,
    };
    onElementsChange([...elements, newElement]);
  }, [currentPage, elements, onElementsChange]);

  // Add date to current page
  const handleAddDate = useCallback(() => {
    const today = new Date().toLocaleDateString('he-IL');
    const newElement: PdfElement = {
      id: generateId(),
      type: 'date',
      x: 50 - DEFAULT_DATE_WIDTH / 2,
      y: 85,
      page: currentPage - 1,
      width: DEFAULT_DATE_WIDTH,
      height: DEFAULT_DATE_HEIGHT,
      value: today,
    };
    onElementsChange([...elements, newElement]);
  }, [currentPage, elements, onElementsChange]);

  // Remove element
  const handleRemoveElement = useCallback((id: string) => {
    onElementsChange(elements.filter(el => el.id !== id));
  }, [elements, onElementsChange]);

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
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

  // Handle element dragging
  const handleMouseDown = useCallback((e: React.MouseEvent, elementId: string) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setDraggingId(elementId);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingId || !pageRef.current) return;

    const element = elements.find(el => el.id === draggingId);
    if (!element) return;

    const pageRect = pageRef.current.getBoundingClientRect();

    // Calculate new position as percentage
    const newX = ((e.clientX - pageRect.left - dragOffset.x) / pageRect.width) * 100;
    const newY = ((e.clientY - pageRect.top - dragOffset.y) / pageRect.height) * 100;

    // Clamp values to keep element within page bounds
    const clampedX = Math.max(0, Math.min(100 - element.width, newX));
    const clampedY = Math.max(0, Math.min(100 - element.height, newY));

    // Update the element position
    const updatedElements = elements.map(el =>
      el.id === draggingId
        ? { ...el, x: clampedX, y: clampedY }
        : el
    );
    onElementsChange(updatedElements);
  }, [draggingId, dragOffset, elements, onElementsChange]);

  const handleMouseUp = useCallback(() => {
    setDraggingId(null);
  }, []);

  // Add global mouse up listener to handle drag end outside the component
  useEffect(() => {
    const handleGlobalMouseUp = () => setDraggingId(null);
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

  // Elements on current page
  const elementsOnCurrentPage = elements.filter(el => el.page === currentPage - 1);
  const signaturesOnCurrentPage = elementsOnCurrentPage.filter(el => el.type === 'signature').length;
  const signaturesWithAddressOnCurrentPage = elementsOnCurrentPage.filter(el => el.type === 'signature_with_address').length;
  const datesOnCurrentPage = elementsOnCurrentPage.filter(el => el.type === 'date').length;

  // Summary of all elements
  const totalSignatures = elements.filter(el => el.type === 'signature').length;
  const totalSignaturesWithAddress = elements.filter(el => el.type === 'signature_with_address').length;
  const totalDates = elements.filter(el => el.type === 'date').length;

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

        {/* Add Elements Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="default"
            size="sm"
            onClick={handleAddSignature}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            הוסף חתימה
            {signaturesOnCurrentPage > 0 && (
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">
                {signaturesOnCurrentPage}
              </span>
            )}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleAddSignatureWithAddress}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            חתימה עם כתובת
            {signaturesWithAddressOnCurrentPage > 0 && (
              <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">
                {signaturesWithAddressOnCurrentPage}
              </span>
            )}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddDate}
            className="gap-2"
          >
            <Calendar className="h-4 w-4" />
            הוסף תאריך
            {datesOnCurrentPage > 0 && (
              <span className="bg-black/10 px-1.5 py-0.5 rounded text-xs">
                {datesOnCurrentPage}
              </span>
            )}
          </Button>
        </div>

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

      {/* PDF Viewer with elements overlay */}
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

            {/* Elements overlay */}
            {elementsOnCurrentPage.map((element) => (
              <div
                key={element.id}
                className={cn(
                  'absolute cursor-move select-none border-2 rounded group',
                  element.type === 'signature'
                    ? draggingId === element.id
                      ? 'border-primary shadow-lg'
                      : 'border-primary/50 hover:border-primary'
                    : element.type === 'signature_with_address'
                      ? draggingId === element.id
                        ? 'border-green-600 shadow-lg'
                        : 'border-green-500/50 hover:border-green-600'
                      : draggingId === element.id
                        ? 'border-orange-500 shadow-lg'
                        : 'border-orange-400/50 hover:border-orange-500'
                )}
                style={{
                  left: `${element.x}%`,
                  top: `${element.y}%`,
                  width: `${element.width}%`,
                  height: `${element.height}%`,
                }}
                onMouseDown={(e) => handleMouseDown(e, element.id)}
              >
                {element.type === 'signature' ? (
                  <img
                    src={signatureUrl}
                    alt="Signature"
                    className="w-full h-full object-contain pointer-events-none"
                    draggable={false}
                  />
                ) : element.type === 'signature_with_address' ? (
                  <div className="w-full h-full flex flex-col pointer-events-none">
                    <img
                      src={signatureUrl}
                      alt="Signature"
                      className="w-full h-[65%] object-contain"
                      draggable={false}
                    />
                    <div className="h-[35%] flex items-center justify-center text-xs font-medium text-gray-700" dir="rtl">
                      {SIGNATURE_ADDRESS}
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm font-medium pointer-events-none">
                    {element.value}
                  </div>
                )}

                {/* Label */}
                <div className={cn(
                  'absolute -top-6 left-1/2 -translate-x-1/2 text-primary-foreground text-xs px-2 py-0.5 rounded flex items-center gap-1 whitespace-nowrap',
                  element.type === 'signature' ? 'bg-primary' : element.type === 'signature_with_address' ? 'bg-green-600' : 'bg-orange-500'
                )}>
                  <Move className="h-3 w-3" />
                  <span>{element.type === 'signature' ? 'חתימה' : element.type === 'signature_with_address' ? 'חתימה+כתובת' : 'תאריך'}</span>
                </div>

                {/* Delete button */}
                <button
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveElement(element.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info text */}
      <div className="text-sm text-muted-foreground text-center space-y-1">
        <p>
          {elements.length === 0
            ? 'נווט לעמוד הרצוי ולחץ על "הוסף חתימה" או "חתימה עם כתובת" או "הוסף תאריך"'
            : 'גרור את האלמנטים למקם אותם על המסמך. מחק בלחיצה על X.'}
        </p>
        {elements.length > 0 && (
          <p className="text-xs">
            סה"כ: {totalSignatures} חתימות{totalSignaturesWithAddress > 0 ? `, ${totalSignaturesWithAddress} חתימות+כתובת` : ''}, {totalDates} תאריכים על {new Set(elements.map(e => e.page)).size} עמודים
          </p>
        )}
      </div>
    </div>
  );
}
