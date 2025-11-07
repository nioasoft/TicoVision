/**
 * FileList Component
 * Display list of uploaded files with actions
 */

import { useState } from 'react';
import { FileText, Eye, Trash2, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { formatFileSize, FILE_TYPE_LABELS } from '@/types/file-attachment.types';
import type { ClientAttachment } from '@/types/file-attachment.types';

interface FileListProps {
  files: ClientAttachment[];
  loading?: boolean;
  onView: (file: ClientAttachment) => void;
  onDelete: (fileId: string) => Promise<{ success: boolean; error?: string }>;
  onViewHistory?: (file: ClientAttachment) => void;
  compact?: boolean;
}

export function FileList({
  files,
  loading = false,
  onView,
  onDelete,
  onViewHistory,
  compact = false
}: FileListProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = (fileId: string) => {
    setFileToDelete(fileId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;

    setDeleting(true);
    await onDelete(fileToDelete);
    setDeleting(false);
    setDeleteDialogOpen(false);
    setFileToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">אין קבצים</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {/* File Icon */}
            <div className="flex-shrink-0">
              <div className="p-2 bg-blue-50 rounded">
                <FileText className="h-4 w-4 text-blue-600" />
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

              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span>{formatFileSize(file.file_size)}</span>
                <span>•</span>
                <span>{FILE_TYPE_LABELS[file.file_type]}</span>
                <span>•</span>
                <span dir="ltr">
                  {new Date(file.created_at).toLocaleDateString('he-IL')}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* View Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onView(file)}
                title="הצג קובץ"
              >
                <Eye className="h-4 w-4" />
              </Button>

              {/* History Button */}
              {onViewHistory && file.version > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewHistory(file)}
                  title="היסטוריית גרסאות"
                >
                  <Clock className="h-4 w-4" />
                </Button>
              )}

              {/* Delete Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteClick(file.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                title="מחק קובץ"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="rtl:text-right">מחיקת קובץ</AlertDialogTitle>
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
    </>
  );
}
