/**
 * Custom Hook: useFileUpload
 * Manages file upload state, progress, and operations
 */

import { useState, useCallback, useEffect } from 'react';
import { fileUploadService } from '@/services/file-upload.service';
import type {
  ClientAttachment,
  FileUploadOptions,
  FileUploadProgress,
  UploadContext
} from '@/types/file-attachment.types';

interface UseFileUploadOptions {
  clientId?: string;
  uploadContext: UploadContext;
  yearContext?: number;
  onUploadSuccess?: (attachment: ClientAttachment) => void;
  onUploadError?: (error: Error) => void;
}

export function useFileUpload(options: UseFileUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<FileUploadProgress[]>([]);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File, notes?: string) => {
      if (!options.clientId) {
        setError('Client ID is required');
        return;
      }

      setUploading(true);
      setError(null);

      // Add to progress tracking
      const progressItem: FileUploadProgress = {
        fileName: file.name,
        progress: 0,
        status: 'uploading'
      };
      setProgress((prev) => [...prev, progressItem]);

      try {
        const uploadOptions: FileUploadOptions = {
          clientId: options.clientId,
          uploadContext: options.uploadContext,
          yearContext: options.yearContext,
          notes
        };

        const { data, error: uploadError } = await fileUploadService.uploadFile(
          file,
          uploadOptions
        );

        if (uploadError || !data) {
          throw uploadError || new Error('Upload failed');
        }

        // Update progress to success
        setProgress((prev) =>
          prev.map((p) =>
            p.fileName === file.name
              ? { ...p, progress: 100, status: 'success' }
              : p
          )
        );

        // Call success callback
        if (options.onUploadSuccess) {
          options.onUploadSuccess(data);
        }

        return { data, error: null };
      } catch (err) {
        const error = err as Error;

        // Update progress to error
        setProgress((prev) =>
          prev.map((p) =>
            p.fileName === file.name
              ? { ...p, status: 'error', error: error.message }
              : p
          )
        );

        setError(error.message);

        // Call error callback
        if (options.onUploadError) {
          options.onUploadError(error);
        }

        return { data: null, error };
      } finally {
        setUploading(false);

        // Clear progress after 3 seconds
        setTimeout(() => {
          setProgress((prev) => prev.filter((p) => p.fileName !== file.name));
        }, 3000);
      }
    },
    [options]
  );

  const uploadMultipleFiles = useCallback(
    async (files: File[]) => {
      const results = await Promise.all(files.map((file) => uploadFile(file)));
      return results;
    },
    [uploadFile]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    uploadFile,
    uploadMultipleFiles,
    uploading,
    progress,
    error,
    clearError
  };
}

/**
 * Custom Hook: useFileList
 * Fetches and manages list of files for a client
 */

interface UseFileListOptions {
  clientId?: string;
  uploadContext?: UploadContext;
  latestOnly?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useFileList(options: UseFileListOptions) {
  const [files, setFiles] = useState<ClientAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    if (!options.clientId) {
      setFiles([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await fileUploadService.getFilesByClient(
        options.clientId,
        options.uploadContext,
        options.latestOnly ?? true
      );

      if (fetchError || !data) {
        throw fetchError || new Error('Failed to fetch files');
      }

      setFiles(data);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [options.clientId, options.uploadContext, options.latestOnly]);

  const deleteFile = useCallback(
    async (attachmentId: string) => {
      try {
        const { error: deleteError } = await fileUploadService.deleteFile(attachmentId);

        if (deleteError) {
          throw deleteError;
        }

        // Remove from local state
        setFiles((prev) => prev.filter((f) => f.id !== attachmentId));

        return { success: true };
      } catch (err) {
        const error = err as Error;
        setError(error.message);
        return { success: false, error: error.message };
      }
    },
    []
  );

  const refreshFiles = useCallback(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Auto-refresh on mount and when options change
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Auto-refresh interval (if enabled)
  useEffect(() => {
    if (options.autoRefresh && options.refreshInterval) {
      const interval = setInterval(fetchFiles, options.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [options.autoRefresh, options.refreshInterval, fetchFiles]);

  return {
    files,
    loading,
    error,
    deleteFile,
    refreshFiles
  };
}

/**
 * Custom Hook: useFilePreview
 * Manages file preview state and URL generation
 */

export function useFilePreview() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = useCallback(async (storagePath: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: url, error: urlError } = await fileUploadService.getFileUrl(
        storagePath
      );

      if (urlError || !url) {
        throw urlError || new Error('Failed to load preview');
      }

      setPreviewUrl(url);
    } catch (err) {
      const error = err as Error;
      setError(error.message);
      setPreviewUrl(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearPreview = useCallback(() => {
    setPreviewUrl(null);
    setError(null);
  }, []);

  return {
    previewUrl,
    loading,
    error,
    loadPreview,
    clearPreview
  };
}
