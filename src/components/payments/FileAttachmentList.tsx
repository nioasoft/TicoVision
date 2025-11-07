/**
 * FileAttachmentList Component
 * Display and manage file attachments for payments (receipts, invoices, checks)
 * Integrates with existing file upload system
 */

import { useState, useEffect } from 'react';
import { FileText, Download, Eye, Trash2, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';
import { FileUploadZone } from '@/components/files/FileUploadZone';
import { FilePreview } from '@/components/files/FilePreview';
import { useFileList, useFilePreview } from '@/hooks/use-file-upload';
import { fileUploadService } from '@/services/file-upload.service';
import { formatFileSize, getFileIcon } from '@/lib/payment-utils';
import { formatIsraeliDateTime } from '@/lib/formatters';
import type { FileAttachmentListProps } from '@/types/payment.types';
import type { ClientAttachment } from '@/types/file-attachment.types';
import { cn } from '@/lib/utils';

export function FileAttachmentList({
  attachmentIds,
  onUpload,
  readonly = false,
  maxFiles = 10,
  className,
}: FileAttachmentListProps) {
  const [files, setFiles] = useState<ClientAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<ClientAttachment | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { previewUrl, loadPreview, clearPreview } = useFilePreview();

  // Load files by IDs
  useEffect(() => {
    const loadFiles = async () => {
      if (attachmentIds.length === 0) {
        setFiles([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Fetch each file by ID
        // Note: In a real implementation, you'd want a batch fetch endpoint
        const filePromises = attachmentIds.map(async (id) => {
          const { data, error } = await fileUploadService.getFilesByClient(id);
          return error ? null : data?.[0];
        });

        const loadedFiles = (await Promise.all(filePromises)).filter(
          (f): f is ClientAttachment => f !== null
        );

        setFiles(loadedFiles);
      } catch (error) {
        console.error('Error loading files:', error);
        setFiles([]);
      } finally {
        setLoading(false);
      }
    };

    loadFiles();
  }, [attachmentIds]);

  const handleView = async (file: ClientAttachment) => {
    setPreviewFile(file);
    await loadPreview(file.storage_path);
  };

  const handleDownload = async (file: ClientAttachment) => {
    try {
      const { data: url, error } = await fileUploadService.getFileUrl(file.storage_path);
      if (error || !url) {
        throw new Error('Failed to get download URL');
      }

      // Open in new tab for download
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const handleDeleteClick = (fileId: string) => {
    setFileToDelete(fileId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;

    setDeleting(true);
    try {
      const { error } = await fileUploadService.deleteFile(fileToDelete);
      if (error) {
        throw error;
      }

      // Remove from local state
      setFiles((prev) => prev.filter((f) => f.id !== fileToDelete));
    } catch (error) {
      console.error('Error deleting file:', error);
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  const handleUpload = async (uploadedFiles: File[]) => {
    if (onUpload) {
      await onUpload(uploadedFiles);
    }
  };

  const canUploadMore = files.length < maxFiles;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Upload Zone (if not readonly and under max) */}
      {!readonly && canUploadMore && onUpload && (
        <FileUploadZone
          onFilesSelected={handleUpload}
          maxFiles={maxFiles - files.length}
          acceptedTypes={['image/jpeg', 'image/jpg', 'application/pdf']}
          className="border-2 border-dashed"
        />
      )}

      {/* File Limit Warning */}
      {!readonly && !canUploadMore && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 rtl:text-right">
            הגעת למגבלת הקבצים המקסימלית ({maxFiles})
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}

      {/* Empty State */}
      {!loading && files.length === 0 && (
        <Card className="p-8">
          <div className="text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 rtl:text-right">
              {readonly ? 'אין קבצים מצורפים' : 'טען קבצים (חשבוניות, קבלות, המחאות)'}
            </p>
          </div>
        </Card>
      )}

      {/* File List */}
      {!loading && files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <Card
              key={file.id}
              className="p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* File Icon */}
                <div className="flex-shrink-0">
                  <div className="p-2 bg-blue-50 rounded text-2xl">
                    {getFileIcon(file.file_type)}
                  </div>
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate rtl:text-right">
                      {file.file_name}
                    </p>
                    {file.version > 1 && (
                      <Badge variant="secondary" className="text-xs">
                        v{file.version}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 rtl:text-right">
                    <span>{formatFileSize(file.file_size)}</span>
                    <span>•</span>
                    <span>{formatIsraeliDateTime(file.created_at)}</span>
                    {file.uploaded_by && (
                      <>
                        <span>•</span>
                        <span>הועלה ע"י מערכת</span>
                      </>
                    )}
                  </div>

                  {file.notes && (
                    <p className="text-xs text-gray-600 mt-1 rtl:text-right">
                      {file.notes}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* View Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleView(file)}
                    title="הצג קובץ"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  {/* Download Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(file)}
                    title="הורד קובץ"
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  {/* Delete Button (if not readonly) */}
                  {!readonly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(file.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="מחק קובץ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* File Count Summary */}
      {files.length > 0 && (
        <div className="flex justify-between items-center text-sm text-gray-500 px-1">
          <span className="rtl:text-right">
            סה"כ {files.length} {files.length === 1 ? 'קובץ' : 'קבצים'}
          </span>
          {maxFiles && (
            <span className="rtl:text-right">
              מקסימום: {maxFiles} קבצים
            </span>
          )}
        </div>
      )}

      {/* File Preview Dialog */}
      {previewFile && previewUrl && (
        <FilePreview
          file={previewFile}
          previewUrl={previewUrl}
          onClose={() => {
            setPreviewFile(null);
            clearPreview();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="rtl:text-right">
              מחיקת קובץ
            </AlertDialogTitle>
            <AlertDialogDescription className="rtl:text-right">
              האם אתה בטוח שברצונך למחוק את הקובץ? פעולה זו אינה ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={deleting}>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  מוחק...
                </>
              ) : (
                'מחק'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/**
 * Compact file attachment list - just shows count and quick preview
 */
interface FileAttachmentBadgeProps {
  attachmentCount: number;
  onClick?: () => void;
  className?: string;
}

export function FileAttachmentBadge({
  attachmentCount,
  onClick,
  className,
}: FileAttachmentBadgeProps) {
  if (attachmentCount === 0) {
    return (
      <Badge
        variant="outline"
        className={cn('rtl:text-right ltr:text-left text-gray-400', className)}
      >
        <FileText className="h-3 w-3 ml-1" />
        ללא קבצים
      </Badge>
    );
  }

  return (
    <Badge
      variant="default"
      className={cn(
        'rtl:text-right ltr:text-left bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200',
        className
      )}
      onClick={onClick}
    >
      <FileText className="h-3 w-3 ml-1" />
      {attachmentCount} {attachmentCount === 1 ? 'קובץ' : 'קבצים'}
    </Badge>
  );
}
