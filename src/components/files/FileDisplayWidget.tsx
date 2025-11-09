/**
 * FileDisplayWidget Component
 * Displays files from a specific category in different variants (buttons, cards, compact)
 * Used to embed file displays in other pages
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileText, Download } from 'lucide-react';
import { fileUploadService } from '@/services/file-upload.service';
import type { ClientAttachment, FileCategory } from '@/types/file-attachment.types';
import { getCategoryLabel } from '@/types/file-attachment.types';
import { formatFileSize } from '@/types/file-attachment.types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FileDisplayWidgetProps {
  clientId: string;
  category: FileCategory;
  variant?: 'buttons' | 'cards' | 'compact';
  showEmpty?: boolean;
  className?: string;
}

export function FileDisplayWidget({
  clientId,
  category,
  variant = 'compact',
  showEmpty = false,
  className = ''
}: FileDisplayWidgetProps) {
  const [files, setFiles] = useState<ClientAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, category]);

  const loadFiles = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await fileUploadService.getFilesByCategory(clientId, category);

      if (fetchError) throw fetchError;

      setFiles(data || []);
    } catch (err) {
      console.error('Error loading files:', err);
      setError('שגיאה בטעינת הקבצים');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (file: ClientAttachment) => {
    try {
      const { data: url, error } = await fileUploadService.getFileUrl(file.storage_path);

      if (error || !url) throw new Error('שגיאה ביצירת קישור להורדה');

      // Open in new tab
      window.open(url, '_blank');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('שגיאה בהורדת הקובץ');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-4", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn("p-3 bg-red-50 border border-red-200 rounded-lg rtl:text-right text-red-600 text-sm", className)}>
        {error}
      </div>
    );
  }

  // Empty state
  if (files.length === 0 && !showEmpty) {
    return null;
  }

  if (files.length === 0 && showEmpty) {
    return (
      <div className={cn("p-4 bg-gray-50 border border-gray-200 rounded-lg rtl:text-right text-gray-500 text-sm", className)}>
        אין קבצים בקטגוריה "{getCategoryLabel(category)}"
      </div>
    );
  }

  // Buttons variant
  if (variant === 'buttons') {
    return (
      <div className={cn("space-y-2", className)}>
        {files.map((file) => (
          <Button
            key={file.id}
            variant="outline"
            className="w-full justify-start rtl:flex-row-reverse"
            onClick={() => handleDownload(file)}
          >
            <FileText className="h-4 w-4 ml-2" />
            <span className="flex-1 text-right truncate">{file.file_name}</span>
            {file.description && (
              <span className="text-xs text-gray-500 mr-2">({file.description})</span>
            )}
          </Button>
        ))}
      </div>
    );
  }

  // Cards variant
  if (variant === 'cards') {
    return (
      <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
        {files.map((file) => (
          <Card key={file.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="rtl:text-right">
              <CardTitle className="text-sm flex items-center gap-2 rtl:flex-row-reverse">
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="truncate">{file.file_name}</span>
              </CardTitle>
              {file.description && (
                <CardDescription className="rtl:text-right">
                  {file.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="rtl:text-right">
              <div className="flex items-center justify-between rtl:flex-row-reverse">
                <span className="text-xs text-gray-500">
                  {formatFileSize(file.file_size)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(file)}
                  className="rtl:flex-row-reverse"
                >
                  <Download className="h-3 w-3 ml-1" />
                  הורדה
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Compact variant (default)
  return (
    <div className={cn("space-y-1", className)}>
      {files.map((file) => (
        <button
          key={file.id}
          onClick={() => handleDownload(file)}
          className="w-full p-2 hover:bg-gray-50 rounded-md transition-colors text-right flex items-center gap-2 rtl:flex-row-reverse"
        >
          <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0 text-right">
            <p className="text-sm font-medium truncate rtl:text-right">{file.file_name}</p>
            {file.description && (
              <p className="text-xs text-gray-500 truncate rtl:text-right">{file.description}</p>
            )}
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">
            {formatFileSize(file.file_size)}
          </span>
        </button>
      ))}
    </div>
  );
}
