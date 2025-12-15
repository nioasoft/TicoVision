import { useState, useEffect } from 'react';
import { DocumentsSidebar } from '../components/DocumentsSidebar';
import { DocumentsView } from '../components/DocumentsView';
import { DocumentPreview } from '../components/DocumentPreview';
import { useDocuments } from '../hooks/useDocuments';
import type { FolderItem, ViewMode, DocFile } from '../types';
import { PDFGenerationService } from '@/modules/letters-v2/services/pdf-generation.service';
import { letterHistoryService } from '@/services/letter-history.service';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const pdfService = new PDFGenerationService();

export default function DocumentsHubPage() {
  const navigate = useNavigate();
  
  // State
  const [currentFolder, setCurrentFolder] = useState<FolderItem>({
    id: 'recent',
    type: 'recent',
    name: 'אחרונים'
  });
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Data Hook
  const { documents, isLoading, refresh } = useDocuments(currentFolder);

  // Auto-select first document when documents load
  useEffect(() => {
    if (documents.length > 0 && !selectedFileId) {
      setSelectedFileId(documents[0].id);
    }
  }, [documents, selectedFileId]);

  // Computed
  const selectedFile = documents.find(d => d.id === selectedFileId) || null;

  // Handlers
  const handleSelectFile = (file: DocFile) => {
    setSelectedFileId(file.id);
  };

  const handleEdit = (file: DocFile) => {
    // Navigate to editor with state
    navigate('/letter-templates', {
      state: { editLetterId: file.id }
    });
  };

  const handleDelete = async (file: DocFile) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק מסמך זה?')) return;
    
    try {
      if (file.status === 'draft' || file.status === 'saved') {
         // It's technically a "generated letter" in DB, but we treat it as draft deletion if not sent
         const { error } = await letterHistoryService.deleteLetter(file.id);
         if (error) throw error;
         toast.success('המסמך נמחק בהצלחה');
         refresh();
         setSelectedFileId(null);
      } else {
         toast.error('לא ניתן למחוק מסמך שנשלח');
      }
    } catch (err) {
      console.error(err);
      toast.error('שגיאה במחיקת המסמך');
    }
  };

  const handleDownload = async (file: DocFile) => {
    try {
      toast.info('מכין להורדה...');
      // Force regeneration to ensure latest version
      const url = await pdfService.getOrGeneratePDF(file.id, true);
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
      toast.error('שגיאה בהורדת הקובץ');
    }
  };

  const handleSend = (file: DocFile) => {
      // Re-use the ResendDialog logic or navigate to history page? 
      // For now, let's just open the editor which has send capability
      // Or we can implement a specific send dialog later.
      handleEdit(file);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full bg-slate-50 overflow-hidden" dir="rtl">
      
      {/* 1. Sidebar (Navigation) */}
      <div className="w-64 flex-shrink-0 h-full">
        <DocumentsSidebar 
          currentFolder={currentFolder} 
          onSelectFolder={(folder) => {
            setCurrentFolder(folder);
            setSelectedFileId(null); // Clear selection on folder change
          }}
        />
      </div>

      {/* 2. Main Content (Grid/List) */}
      <div className="flex-1 min-w-0 h-full border-r border-l">
        <DocumentsView 
          currentFolder={currentFolder}
          documents={documents}
          isLoading={isLoading}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          selectedFileId={selectedFileId}
          onSelectFile={handleSelectFile}
        />
      </div>

      {/* 3. Preview Pane (Details) */}
      <div className="w-80 flex-shrink-0 h-full bg-white hidden xl:block transition-all duration-300">
        <DocumentPreview 
          file={selectedFile}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDownload={handleDownload}
          onSend={handleSend}
        />
      </div>

    </div>
  );
}