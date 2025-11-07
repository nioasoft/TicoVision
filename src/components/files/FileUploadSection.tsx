/**
 * FileUploadSection Component
 * Main wrapper for file upload functionality
 * Combines upload zone, file list, preview, and history
 */

import { useState } from 'react';
import { FileUploadZone } from './FileUploadZone';
import { FileList } from './FileList';
import { FilePreview } from './FilePreview';
import { FileVersionHistory } from './FileVersionHistory';
import { useFileUpload, useFileList } from '@/hooks/use-file-upload';
import type { UploadContext, ClientAttachment } from '@/types/file-attachment.types';

interface FileUploadSectionProps {
  clientId?: string;
  uploadContext: UploadContext;
  yearContext?: number;
  compact?: boolean;
  showLastLetterOnly?: boolean;
  disabled?: boolean;
}

export function FileUploadSection({
  clientId,
  uploadContext,
  yearContext,
  compact = false,
  showLastLetterOnly = false,
  disabled = false
}: FileUploadSectionProps) {
  const [previewFile, setPreviewFile] = useState<ClientAttachment | null>(null);
  const [historyFile, setHistoryFile] = useState<ClientAttachment | null>(null);

  // Upload hook
  const {
    uploadFile,
    uploadMultipleFiles,
    uploading,
    progress,
    error: uploadError
  } = useFileUpload({
    clientId,
    uploadContext,
    yearContext,
    onUploadSuccess: () => {
      refreshFiles();
    }
  });

  // File list hook
  const {
    files,
    loading,
    error: listError,
    deleteFile,
    refreshFiles
  } = useFileList({
    clientId,
    uploadContext,
    latestOnly: true
  });

  const handleFileSelect = async (selectedFiles: File[]) => {
    if (selectedFiles.length === 1) {
      await uploadFile(selectedFiles[0]);
    } else {
      await uploadMultipleFiles(selectedFiles);
    }
  };

  const handleView = (file: ClientAttachment) => {
    setPreviewFile(file);
  };

  const handleViewHistory = (file: ClientAttachment) => {
    setHistoryFile(file);
  };

  const handleDelete = async (fileId: string) => {
    const result = await deleteFile(fileId);
    return result;
  };

  // Show message if no client selected
  if (!clientId) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800 rtl:text-right">
          יש לבחור לקוח לפני העלאת קבצים
        </p>
      </div>
    );
  }

  // Show last letter only mode (for bookkeeping)
  if (showLastLetterOnly && files.length > 0) {
    const lastFile = files[0]; // Files are sorted by created_at DESC
    return (
      <div className="space-y-3">
        <div className="text-sm text-gray-700 rtl:text-right mb-2">
          המכתב האחרון:
        </div>

        <FileList
          files={[lastFile]}
          loading={loading}
          onView={handleView}
          onDelete={handleDelete}
          onViewHistory={handleViewHistory}
          compact={compact}
        />

        <FileUploadZone
          onFileSelect={handleFileSelect}
          progress={progress}
          error={uploadError || listError}
          disabled={disabled || uploading}
          compact
        />

        <FilePreview
          file={previewFile}
          open={!!previewFile}
          onClose={() => setPreviewFile(null)}
        />

        <FileVersionHistory
          file={historyFile}
          open={!!historyFile}
          onClose={() => setHistoryFile(null)}
          onViewVersion={handleView}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <FileUploadZone
        onFileSelect={handleFileSelect}
        progress={progress}
        error={uploadError || listError}
        disabled={disabled || uploading}
        compact={compact}
      />

      {/* File List */}
      {files.length > 0 && (
        <div>
          <div className="text-sm font-medium text-gray-700 mb-3 rtl:text-right">
            קבצים ({files.length})
          </div>

          <FileList
            files={files}
            loading={loading}
            onView={handleView}
            onDelete={handleDelete}
            onViewHistory={handleViewHistory}
            compact={compact}
          />
        </div>
      )}

      {/* Preview Modal */}
      <FilePreview
        file={previewFile}
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
      />

      {/* Version History Modal */}
      <FileVersionHistory
        file={historyFile}
        open={!!historyFile}
        onClose={() => setHistoryFile(null)}
        onViewVersion={handleView}
      />
    </div>
  );
}
