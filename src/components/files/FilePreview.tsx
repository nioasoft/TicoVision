/**
 * FilePreview Component
 * Modal for previewing images and PDFs
 */

import { useEffect } from 'react';
import { X, Loader2, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFilePreview } from '@/hooks/use-file-upload';
import { formatFileSize } from '@/types/file-attachment.types';
import type { ClientAttachment } from '@/types/file-attachment.types';

interface FilePreviewProps {
  file: ClientAttachment | null;
  open: boolean;
  onClose: () => void;
}

export function FilePreview({ file, open, onClose }: FilePreviewProps) {
  const { previewUrl, loading, error, loadPreview, clearPreview } = useFilePreview();

  useEffect(() => {
    if (file && open) {
      loadPreview(file.storage_path);
    } else {
      clearPreview();
    }
  }, [file, open, loadPreview, clearPreview]);

  if (!file) return null;

  const isImage = file.file_type.startsWith('image/');
  const isPDF = file.file_type === 'application/pdf';

  const handleDownload = () => {
    if (previewUrl) {
      const link = document.createElement('a');
      link.href = previewUrl;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <DialogTitle className="rtl:text-right truncate">
                {file.file_name}
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1 rtl:text-right">
                {formatFileSize(file.file_size)} • גרסה {file.version}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 mr-4">
              {previewUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  הורד
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
          {loading && (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}

          {error && (
            <div className="text-center p-12">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {previewUrl && !loading && !error && (
            <>
              {isImage && (
                <div className="flex items-center justify-center">
                  <img
                    src={previewUrl}
                    alt={file.file_name}
                    className="max-w-full h-auto rounded-lg shadow-lg"
                  />
                </div>
              )}

              {isPDF && (
                <iframe
                  src={previewUrl}
                  title={file.file_name}
                  className="w-full h-[calc(90vh-200px)] rounded-lg border"
                />
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
