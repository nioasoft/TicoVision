/**
 * FileCategorySection Component
 * Displays files for a specific category with upload, edit, and delete capabilities
 * Supports multi-select for bulk delete operations
 */

import { useState, useEffect } from 'react';
import { FileUploadZone } from './FileUploadZone';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Download, Trash2, Edit2, Save, X, FileText, Info, CheckSquare, Square } from 'lucide-react';
import { fileUploadService } from '@/services/file-upload.service';
import type { ClientAttachment, FileCategory } from '@/types/file-attachment.types';
import { getCategoryLabel } from '@/types/file-attachment.types';
import { formatFileSize } from '@/types/file-attachment.types';
import { toast } from 'sonner';

interface FileCategorySectionProps {
  clientId?: string;
  groupId?: string;
  category: FileCategory;
}

interface FileUploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export function FileCategorySection({ clientId, groupId, category }: FileCategorySectionProps) {
  const [files, setFiles] = useState<ClientAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress[]>([]);
  const [uploadDescription, setUploadDescription] = useState('');
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState('');

  // Multi-select state
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const isGroupMode = !!groupId;

  useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, groupId, category]);

  const loadFiles = async () => {
    setIsLoading(true);
    setError(null);
    setFiles([]);

    // Both group mode and client mode now load files
    if (!clientId && !groupId) {
      setIsLoading(false);
      return;
    }

    try {
      let data: ClientAttachment[] | null = null;
      let fetchError: Error | null = null;

      if (isGroupMode && groupId) {
        // Load group files
        const result = await fileUploadService.getFilesByGroupCategory(groupId, category);
        data = result.data;
        fetchError = result.error;
      } else if (clientId) {
        // Load client files
        const result = await fileUploadService.getFilesByCategory(clientId, category);
        data = result.data;
        fetchError = result.error;
      }

      if (fetchError) throw fetchError;

      setFiles(data || []);
    } catch (err) {
      console.error('Error loading files:', err);
      setError('שגיאה בטעינת הקבצים');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (selectedFiles: File[]) => {
    const file = selectedFiles[0];
    if (!file) return;

    // Validate description length (description is optional)
    if (uploadDescription.length > 50) {
      toast.error('התיאור חייב להיות עד 50 תווים');
      return;
    }

    // Start upload progress
    setUploadProgress([{
      fileName: file.name,
      progress: 50,
      status: 'uploading'
    }]);

    try {
      if (isGroupMode && groupId) {
        // Group Upload - file is stored at group level
        const { error: uploadError } = await fileUploadService.uploadFileToGroupCategory(
          file,
          groupId,
          category,
          uploadDescription.trim()
        );

        if (uploadError) throw uploadError;

        // Success
        setUploadProgress([{
          fileName: file.name,
          progress: 100,
          status: 'success'
        }]);

        toast.success('הקובץ הועלה בהצלחה לקבוצה');
        loadFiles(); // Reload files to show the new group file

      } else if (clientId) {
        // Single Client Upload
        const { error: uploadError } = await fileUploadService.uploadFileToCategory(
          file,
          clientId,
          category,
          uploadDescription.trim()
        );

        if (uploadError) throw uploadError;

        // Success
        setUploadProgress([{
          fileName: file.name,
          progress: 100,
          status: 'success'
        }]);

        toast.success('הקובץ הועלה בהצלחה');
        loadFiles(); // Reload files
      }

      setUploadDescription(''); // Reset description

      // Clear progress after 2 seconds
      setTimeout(() => {
        setUploadProgress([]);
      }, 2000);
    } catch (err) {
      console.error('Upload error:', err);
      setUploadProgress([{
        fileName: file.name,
        progress: 0,
        status: 'error',
        error: err instanceof Error ? err.message : 'שגיאה בהעלאת הקובץ'
      }]);
      toast.error('שגיאה בהעלאת הקובץ');
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

  const handleDelete = async (fileId: string) => {
    try {
      const { error } = await fileUploadService.deleteFile(fileId);

      if (error) throw error;

      toast.success('הקובץ נמחק בהצלחה');
      loadFiles();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('שגיאה במחיקת הקובץ');
    }
  };

  const startEditDescription = (file: ClientAttachment) => {
    setEditingFileId(file.id);
    setEditingDescription(file.description || '');
  };

  const cancelEditDescription = () => {
    setEditingFileId(null);
    setEditingDescription('');
  };

  const saveEditDescription = async (fileId: string) => {
    if (editingDescription.length > 50) {
      toast.error('התיאור חייב להיות עד 50 תווים');
      return;
    }

    try {
      const { error } = await fileUploadService.updateFileDescription(fileId, editingDescription.trim());

      if (error) throw error;

      toast.success('התיאור עודכן בהצלחה');
      setEditingFileId(null);
      setEditingDescription('');
      loadFiles();
    } catch (err) {
      console.error('Update error:', err);
      toast.error('שגיאה בעדכון התיאור');
    }
  };

  // Multi-select handlers
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const selectAllFiles = () => {
    setSelectedFiles(new Set(files.map((f) => f.id)));
  };

  const deselectAllFiles = () => {
    setSelectedFiles(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedFiles.size === 0) return;

    setIsBulkDeleting(true);
    try {
      const { data, error } = await fileUploadService.bulkDeleteFiles(Array.from(selectedFiles));

      if (error) throw error;

      toast.success(`${data?.deleted || 0} קבצים נמחקו בהצלחה`);
      setSelectedFiles(new Set());
      setShowBulkDeleteDialog(false);
      loadFiles();
    } catch (err) {
      console.error('Bulk delete error:', err);
      toast.error('שגיאה במחיקת הקבצים');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const allSelected = files.length > 0 && selectedFiles.size === files.length;
  const someSelected = selectedFiles.size > 0 && selectedFiles.size < files.length;

  return (
    <div className="space-y-6">
      {/* Category Header */}
      <div className="rtl:text-right">
        <h3 className="text-lg font-semibold rtl:text-right">{getCategoryLabel(category)}</h3>
      </div>

      {/* Upload Section */}
      <div className="space-y-3">
        <Label className="rtl:text-right block">
          {isGroupMode ? 'העלאת קובץ לקבוצה' : 'העלאת קובץ חדש'}
        </Label>
        
        {isGroupMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-2 flex items-start gap-2 rtl:flex-row-reverse text-blue-800">
            <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm rtl:text-right">
              הקובץ יישמר ברמת הקבוצה ויהיה זמין לכל חברי הקבוצה.
            </p>
          </div>
        )}

        <Input
          placeholder="תיאור הקובץ (אופציונלי, עד 50 תווים)"
          value={uploadDescription}
          onChange={(e) => setUploadDescription(e.target.value)}
          maxLength={50}
          className="rtl:text-right"
        />
        <p className="text-xs text-gray-500 rtl:text-right">
          {uploadDescription.length}/50 תווים
        </p>
        <FileUploadZone
          onFileSelect={handleFileSelect}
          progress={uploadProgress}
          disabled={false}
          multiple={false}
          compact
        />
      </div>

      {/* Files List - Show for both Client and Group Mode */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium rtl:text-right">
            {isGroupMode ? 'קבצי קבוצה' : 'קבצים'} ({files.length})
          </h4>
          {/* Select All / Deselect All */}
          {files.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={allSelected ? deselectAllFiles : selectAllFiles}
              className="flex items-center gap-2 rtl:flex-row-reverse"
            >
              {allSelected ? (
                <>
                  <Square className="h-4 w-4" />
                  בטל בחירה
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4" />
                  בחר הכל
                </>
              )}
            </Button>
          )}
        </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg rtl:text-right text-red-600">
              {error}
            </div>
          ) : files.length === 0 ? (
            <div className="p-8 bg-gray-50 border border-gray-200 rounded-lg text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 rtl:text-right">אין קבצים בקטגוריה זו</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className={`p-4 bg-white border rounded-lg hover:border-gray-300 transition-colors ${
                    selectedFiles.has(file.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox for selection */}
                    <Checkbox
                      checked={selectedFiles.has(file.id)}
                      onCheckedChange={() => toggleFileSelection(file.id)}
                      className="mt-1 flex-shrink-0"
                    />
                    <FileText className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />

                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => handleDownload(file)}
                        className="font-medium rtl:text-right truncate hover:text-blue-600 hover:underline text-left w-full"
                      >
                        {file.file_name}
                      </button>

                      {editingFileId === file.id ? (
                        <div className="mt-2 space-y-2">
                          <Input
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            maxLength={50}
                            placeholder="תיאור הקובץ"
                            className="rtl:text-right"
                          />
                          <p className="text-xs text-gray-500 rtl:text-right">
                            {editingDescription.length}/50 תווים
                          </p>
                          <div className="flex gap-2 rtl:space-x-reverse">
                            <Button
                              size="sm"
                              onClick={() => saveEditDescription(file.id)}
                              className="rtl:flex-row-reverse"
                            >
                              <Save className="h-4 w-4 ml-1" />
                              שמור
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={cancelEditDescription}
                              className="rtl:flex-row-reverse"
                            >
                              <X className="h-4 w-4 ml-1" />
                              ביטול
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-gray-600 rtl:text-right mt-1">
                            {file.description || 'אין תיאור'}
                          </p>
                          <p className="text-xs text-gray-400 rtl:text-right mt-1">
                            {formatFileSize(file.file_size)} • {new Date(file.created_at).toLocaleDateString('he-IL')}
                          </p>
                        </>
                      )}
                    </div>

                    {editingFileId !== file.id && (
                      <div className="flex gap-2 rtl:space-x-reverse flex-shrink-0">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleDownload(file)}
                          title="הורדה"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => startEditDescription(file)}
                          title="עריכת תיאור"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              title="מחיקה"
                              className="hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rtl:text-right">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="rtl:text-right">מחיקת קובץ</AlertDialogTitle>
                              <AlertDialogDescription className="rtl:text-right">
                                האם אתה בטוח שברצונך למחוק את הקובץ "{file.file_name}"? פעולה זו לא ניתנת לביטול.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="rtl:space-x-reverse">
                              <AlertDialogCancel className="rtl:ml-2">ביטול</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(file.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                מחק
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* Floating Bulk Actions Bar */}
      {selectedFiles.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-4 rtl:flex-row-reverse">
            <span className="text-sm">
              {selectedFiles.size} קבצים נבחרו
            </span>
            <div className="h-4 w-px bg-gray-600" />
            <Button
              variant="ghost"
              size="sm"
              onClick={deselectAllFiles}
              className="text-white hover:text-gray-300 hover:bg-gray-800"
            >
              בטל בחירה
            </Button>
            <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-400 hover:text-red-300 hover:bg-gray-800 flex items-center gap-2 rtl:flex-row-reverse"
                >
                  <Trash2 className="h-4 w-4" />
                  מחק נבחרים
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rtl:text-right">
                <AlertDialogHeader>
                  <AlertDialogTitle className="rtl:text-right">מחיקת קבצים</AlertDialogTitle>
                  <AlertDialogDescription className="rtl:text-right">
                    האם אתה בטוח שברצונך למחוק {selectedFiles.size} קבצים? פעולה זו לא ניתנת לביטול.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="rtl:space-x-reverse">
                  <AlertDialogCancel className="rtl:ml-2" disabled={isBulkDeleting}>ביטול</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleBulkDelete}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={isBulkDeleting}
                  >
                    {isBulkDeleting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        מוחק...
                      </>
                    ) : (
                      `מחק ${selectedFiles.size} קבצים`
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      )}
    </div>
  );
}