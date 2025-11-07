/**
 * FileVersionHistory Component
 * Show all versions of a file with comparison
 */

import { useEffect, useState } from 'react';
import { Clock, Eye, Loader2, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fileUploadService } from '@/services/file-upload.service';
import { formatFileSize } from '@/types/file-attachment.types';
import type { ClientAttachment } from '@/types/file-attachment.types';

interface FileVersionHistoryProps {
  file: ClientAttachment | null;
  open: boolean;
  onClose: () => void;
  onViewVersion: (version: ClientAttachment) => void;
}

export function FileVersionHistory({
  file,
  open,
  onClose,
  onViewVersion
}: FileVersionHistoryProps) {
  const [versions, setVersions] = useState<ClientAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (file && open) {
      fetchVersions();
    }
  }, [file, open]);

  const fetchVersions = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await fileUploadService.getFileVersions(
        file.client_id,
        file.upload_context,
        file.year_context
      );

      if (fetchError || !data) {
        throw fetchError || new Error('Failed to load versions');
      }

      setVersions(data);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!file) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="rtl:text-right flex items-center gap-2">
            <Clock className="h-5 w-5" />
            היסטוריית גרסאות
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-2 rtl:text-right">
            {file.file_name}
          </p>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-auto">
          {loading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          )}

          {error && (
            <div className="text-center p-8">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && versions.length === 0 && (
            <div className="text-center p-8">
              <p className="text-sm text-gray-500">לא נמצאו גרסאות</p>
            </div>
          )}

          {!loading && !error && versions.map((version, index) => {
            const isLatest = version.is_latest;
            const uploadDate = new Date(version.created_at);

            return (
              <div
                key={version.id}
                className={`p-4 border rounded-lg ${
                  isLatest ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        variant={isLatest ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        גרסה {version.version}
                      </Badge>

                      {isLatest && (
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          גרסה נוכחית
                        </div>
                      )}
                    </div>

                    <div className="text-sm text-gray-700 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">גודל:</span>
                        <span>{formatFileSize(version.file_size)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">תאריך העלאה:</span>
                        <span dir="ltr">
                          {uploadDate.toLocaleDateString('he-IL')}
                          {' '}
                          {uploadDate.toLocaleTimeString('he-IL', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      {version.notes && (
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500">הערות:</span>
                          <span className="rtl:text-right">{version.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onViewVersion(version);
                      onClose();
                    }}
                    className="gap-2 flex-shrink-0"
                  >
                    <Eye className="h-4 w-4" />
                    הצג
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
