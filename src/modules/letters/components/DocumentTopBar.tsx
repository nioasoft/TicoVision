/**
 * DocumentTopBar - Google Docs-style sticky header for the letter editor.
 * Provides file management controls: back, editable name, save status,
 * file menu, preview, and save button.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowRight,
  Save,
  Eye,
  FileDown,
  FilePlus,
  FolderOpen,
  Copy,
  Trash2,
  Loader2,
  Check,
  Clock,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

interface DocumentTopBarProps {
  letterName: string;
  onNameChange: (name: string) => void;
  saveStatus: 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
  lastSavedAt?: Date;
  onSave: () => void;
  onSaveAsCopy: () => void;
  onNew: () => void;
  onOpenPicker: () => void;
  onBack: () => void;
  onPreview: () => void;
  onGeneratePDF: () => void;
  onDelete?: () => void;
  isSaving: boolean;
  savedLetterId: string | null;
}

function SaveStatusIndicator({
  saveStatus,
  lastSavedAt,
}: {
  saveStatus: DocumentTopBarProps['saveStatus'];
  lastSavedAt?: Date;
}) {
  switch (saveStatus) {
    case 'idle':
      if (lastSavedAt) {
        return (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            <span>
              {'נשמר לאחרונה: '}
              {format(lastSavedAt, 'HH:mm', { locale: he })}
            </span>
          </span>
        );
      }
      return null;

    case 'dirty':
      return (
        <span className="flex items-center gap-1.5 text-xs text-yellow-600">
          <span className="h-2 w-2 rounded-full bg-yellow-500" />
          <span>שינויים שלא נשמרו</span>
        </span>
      );

    case 'saving':
      return (
        <span className="flex items-center gap-1 text-xs text-blue-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>שומר...</span>
        </span>
      );

    case 'saved':
      return (
        <span className="flex items-center gap-1 text-xs text-green-600">
          <Check className="h-3 w-3" />
          <span>נשמר</span>
        </span>
      );

    case 'error':
      return (
        <span className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="h-3 w-3" />
          <span>שגיאה בשמירה</span>
        </span>
      );

    default:
      return null;
  }
}

export function DocumentTopBar({
  letterName,
  onNameChange,
  saveStatus,
  lastSavedAt,
  onSave,
  onSaveAsCopy,
  onNew,
  onOpenPicker,
  onBack,
  onPreview,
  onGeneratePDF,
  onDelete,
  isSaving,
  savedLetterId,
}: DocumentTopBarProps) {
  const [localName, setLocalName] = useState(letterName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external letterName changes into local state
  useEffect(() => {
    setLocalName(letterName);
  }, [letterName]);

  const commitName = useCallback(() => {
    const trimmed = localName.trim();
    if (trimmed && trimmed !== letterName) {
      onNameChange(trimmed);
    } else if (!trimmed) {
      // Revert to previous name if user cleared the field
      setLocalName(letterName);
    }
  }, [localName, letterName, onNameChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setLocalName(letterName);
      inputRef.current?.blur();
    }
  };

  return (
    <div
      dir="rtl"
      className="sticky top-0 z-40 flex h-[52px] items-center gap-3 border-b border-gray-200 bg-white px-4 py-2"
    >
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="shrink-0 px-2"
        title="חזרה"
      >
        <ArrowRight className="h-4 w-4" />
      </Button>

      {/* Editable document name */}
      <Input
        ref={inputRef}
        value={localName}
        onChange={(e) => setLocalName(e.target.value)}
        onBlur={commitName}
        onKeyDown={handleKeyDown}
        placeholder="מכתב ללא שם"
        className={cn(
          'w-[300px] border-none bg-transparent px-2 py-1 text-lg font-medium shadow-none',
          'focus-visible:ring-0 focus-visible:border-b focus-visible:border-blue-400 focus-visible:rounded-none'
        )}
      />

      {/* Save status indicator */}
      <SaveStatusIndicator saveStatus={saveStatus} lastSavedAt={lastSavedAt} />

      {/* Spacer */}
      <div className="flex-1" />

      {/* File menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1 text-sm">
            קובץ
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent dir="rtl" align="end" className="w-56">
          <DropdownMenuItem onClick={onNew}>
            <FilePlus className="me-2 h-4 w-4" />
            מכתב חדש
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenPicker}>
            <FolderOpen className="me-2 h-4 w-4" />
            פתח מכתב...
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={onSave}>
            <Save className="me-2 h-4 w-4" />
            <span className="flex-1">שמור</span>
            <kbd className="ms-auto text-xs tracking-widest text-muted-foreground">
              ⌘S
            </kbd>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSaveAsCopy}>
            <Copy className="me-2 h-4 w-4" />
            שמור כהעתק
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={onGeneratePDF}>
            <FileDown className="me-2 h-4 w-4" />
            הורד PDF
          </DropdownMenuItem>

          {savedLetterId && onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="me-2 h-4 w-4" />
                מחק מכתב
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Preview button */}
      <Button variant="outline" size="sm" onClick={onPreview} className="gap-1.5">
        <Eye className="h-4 w-4" />
        תצוגה מקדימה
      </Button>

      {/* Save button */}
      <Button
        size="sm"
        onClick={onSave}
        disabled={isSaving}
        className="gap-1.5"
      >
        {isSaving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        שמור
      </Button>
    </div>
  );
}
