import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { UniversalLetterBuilder } from '@/modules/letters/components/UniversalLetterBuilder';
import { DocumentTopBar } from '@/modules/letters/components/DocumentTopBar';
import { DocumentPickerDialog } from '@/modules/letters/components/DocumentPickerDialog';
import type { LetterBuilderHandle } from '@/modules/letters/components/UniversalLetterBuilder';
import { toast } from 'sonner';

export function LetterTemplatesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const builderRef = useRef<LetterBuilderHandle>(null);

  // Editor state (synced from UniversalLetterBuilder via onStateChange)
  const [letterName, setLetterName] = useState('');
  const [savedLetterId, setSavedLetterId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Compute save status for top bar
  const saveStatus = isSaving ? 'saving' as const
    : isDirty ? 'dirty' as const
    : savedLetterId && lastSavedAt ? 'saved' as const
    : 'idle' as const;

  // Handle navigation from history page with edit intent
  useEffect(() => {
    const state = location.state as { editLetterId?: string } | null;
    if (state?.editLetterId) {
      // Will be handled by UniversalLetterBuilder's editLetterId prop
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Sync state from builder
  const handleStateChange = useCallback((state: {
    letterName: string;
    savedLetterId: string | null;
    isDirty: boolean;
    isSaving: boolean;
    lastSavedAt: Date | null;
  }) => {
    setLetterName(state.letterName);
    setSavedLetterId(state.savedLetterId);
    setIsDirty(state.isDirty);
    setIsSaving(state.isSaving);
    if (state.lastSavedAt) setLastSavedAt(state.lastSavedAt);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S → Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        builderRef.current?.save();
      }
      // Ctrl+Shift+S → Save As Copy
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        builderRef.current?.saveAsCopy();
      }
      // Ctrl+O → Open picker
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        setPickerOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle opening a letter from the picker
  const handleOpenLetter = useCallback((letterId: string) => {
    builderRef.current?.loadLetter(letterId);
    setPickerOpen(false);
  }, []);

  // Handle "New Letter"
  const handleNew = useCallback(() => {
    if (isDirty) {
      // Could show confirmation, but for now just warn
      if (!window.confirm('יש שינויים שלא נשמרו. להמשיך?')) return;
    }
    builderRef.current?.resetForNew();
    setLetterName('');
    setSavedLetterId(null);
    setIsDirty(false);
    setLastSavedAt(null);
  }, [isDirty]);

  // Handle name change from top bar
  const handleNameChange = useCallback((name: string) => {
    setLetterName(name);
    // The builder will also need to know - this is synced via the ref or props
  }, []);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!savedLetterId) return;
    if (!window.confirm('למחוק את המכתב?')) return;
    // TODO: Call delete service
    toast.success('המכתב נמחק');
    builderRef.current?.resetForNew();
  }, [savedLetterId]);

  const editLetterId = (location.state as { editLetterId?: string } | null)?.editLetterId || null;

  return (
    <div dir="rtl" className="flex flex-col h-[calc(100vh-80px)]">
      {/* Docs-style top bar */}
      <DocumentTopBar
        letterName={letterName}
        onNameChange={handleNameChange}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt || undefined}
        onSave={() => builderRef.current?.save()}
        onSaveAsCopy={() => builderRef.current?.saveAsCopy()}
        onNew={handleNew}
        onOpenPicker={() => setPickerOpen(true)}
        onBack={() => navigate('/letter-history')}
        onPreview={() => builderRef.current?.preview()}
        onGeneratePDF={() => builderRef.current?.generatePDF()}
        onDelete={savedLetterId ? handleDelete : undefined}
        isSaving={isSaving}
        savedLetterId={savedLetterId}
      />

      {/* Editor content */}
      <div className="flex-1 overflow-auto">
        <UniversalLetterBuilder
          ref={builderRef}
          editLetterId={editLetterId}
          onStateChange={handleStateChange}
        />
      </div>

      {/* Document picker dialog */}
      <DocumentPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleOpenLetter}
        currentLetterId={savedLetterId}
      />
    </div>
  );
}
