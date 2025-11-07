/**
 * FileUploadZone Component
 * Drag and drop zone for file uploads
 */

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { validateFile, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from '@/types/file-attachment.types';
import type { FileUploadProgress } from '@/types/file-attachment.types';

interface FileUploadZoneProps {
  onFileSelect: (files: File[]) => void;
  progress?: FileUploadProgress[];
  error?: string | null;
  disabled?: boolean;
  multiple?: boolean;
  compact?: boolean;
}

export function FileUploadZone({
  onFileSelect,
  progress = [],
  error,
  disabled = false,
  multiple = true,
  compact = false
}: FileUploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Validate all files
      const validFiles: File[] = [];
      const errors: string[] = [];

      acceptedFiles.forEach((file) => {
        const validation = validateFile(file);
        if (validation.valid) {
          validFiles.push(file);
        } else {
          errors.push(`${file.name}: ${validation.error}`);
        }
      });

      // Show first error if any
      if (errors.length > 0 && !error) {
        // Error will be shown by parent component
      }

      // Upload valid files
      if (validFiles.length > 0) {
        onFileSelect(validFiles);
      }
    },
    [onFileSelect, error]
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'application/pdf': ['.pdf']
    },
    maxSize: MAX_FILE_SIZE,
    multiple,
    disabled
  });

  const isUploading = progress.some((p) => p.status === 'uploading');

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg transition-colors cursor-pointer',
          compact ? 'p-4' : 'p-8',
          isDragActive && 'border-blue-500 bg-blue-50',
          isDragReject && 'border-red-500 bg-red-50',
          !isDragActive && !isDragReject && 'border-gray-300 hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center text-center gap-3">
          <div className="p-3 rounded-full bg-blue-100">
            <Upload className="h-6 w-6 text-blue-600" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-700">
              {isDragActive ? (
                'שחרר כאן להעלאה...'
              ) : (
                <>
                  <span className="text-blue-600 hover:text-blue-700">לחץ להעלאה</span>
                  {' או גרור קבצים לכאן'}
                </>
              )}
            </p>

            <p className="text-xs text-gray-500">
              JPG, PDF בלבד - עד 1MB
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {progress.length > 0 && (
        <div className="space-y-2">
          {progress.map((item) => (
            <div
              key={item.fileName}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {item.fileName}
                </p>

                {item.status === 'uploading' && (
                  <Progress value={item.progress} className="h-1 mt-1" />
                )}

                {item.status === 'success' && (
                  <p className="text-xs text-green-600 mt-1">הועלה בהצלחה</p>
                )}

                {item.status === 'error' && (
                  <p className="text-xs text-red-600 mt-1">{item.error}</p>
                )}
              </div>

              {item.status === 'success' && (
                <div className="flex-shrink-0 text-green-500">✓</div>
              )}

              {item.status === 'error' && (
                <div className="flex-shrink-0 text-red-500">✗</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="rtl:text-right">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
