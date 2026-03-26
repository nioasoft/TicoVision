/**
 * DocumentPickerDialog
 * A "File -> Open" dialog for selecting and opening letters from within the editor
 * without navigating away from the current page.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, FileText, Loader2 } from 'lucide-react';
import { letterHistoryService } from '@/services/letter-history.service';
import type { LetterHistoryItem } from '@/services/letter-history.service';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';

interface DocumentPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (letterId: string) => void;
  currentLetterId?: string | null;
}

type StatusTab = 'all' | 'draft' | 'saved' | 'sent';

const PAGE_SIZE = 15;

const statusLabels: Record<string, { label: string; className: string }> = {
  draft: { label: 'טיוטה', className: 'bg-gray-100 text-gray-700' },
  saved: { label: 'שמור', className: 'bg-green-100 text-green-700' },
  sent_email: { label: 'נשלח', className: 'bg-blue-100 text-blue-700' },
  sent_whatsapp: { label: 'נשלח', className: 'bg-blue-100 text-blue-700' },
  sent_print: { label: 'הודפס', className: 'bg-orange-100 text-orange-700' },
  cancelled: { label: 'בוטל', className: 'bg-red-100 text-red-700' },
};

/**
 * Converts a StatusTab value to the filter format expected by the letter history service
 */
function getStatusFilter(tab: StatusTab): string | string[] | undefined {
  switch (tab) {
    case 'draft':
      return 'draft';
    case 'saved':
      return 'saved';
    case 'sent':
      return ['sent_email', 'sent_whatsapp', 'sent_print'];
    case 'all':
    default:
      return undefined;
  }
}

/**
 * Formats a date string as dd/MM HH:mm for compact display in the list
 */
function formatCompactDate(date: string | null | undefined): string {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day}/${month} ${hours}:${minutes}`;
}

export function DocumentPickerDialog({
  open,
  onOpenChange,
  onSelect,
  currentLetterId,
}: DocumentPickerDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [letters, setLetters] = useState<LetterHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const fetchLetters = useCallback(async (search: string, tab: StatusTab) => {
    setIsLoading(true);
    setError(null);

    try {
      const statusFilter = getStatusFilter(tab);
      const result = await letterHistoryService.getAllLetters(
        {
          status: statusFilter,
          searchQuery: search || undefined,
        },
        { page: 1, pageSize: PAGE_SIZE },
        { field: 'updated_at', direction: 'desc' }
      );

      if (result.error) {
        setError('שגיאה בטעינת מכתבים');
        setLetters([]);
        setTotal(0);
      } else {
        setLetters(result.data);
        setTotal(result.total);
      }
    } catch {
      setError('שגיאה בטעינת מכתבים');
      setLetters([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch letters when the dialog opens, or when search/tab changes
  useEffect(() => {
    if (open) {
      fetchLetters(debouncedSearch, activeTab);
    }
  }, [open, debouncedSearch, activeTab, fetchLetters]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setActiveTab('all');
      setLetters([]);
      setTotal(0);
      setError(null);
    }
  }, [open]);

  const handleRowClick = (letterId: string) => {
    onSelect(letterId);
    onOpenChange(false);
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    const config = statusLabels[status];
    if (!config) return null;

    return (
      <Badge variant="secondary" className={cn('text-xs', config.className)}>
        {config.label}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-right">פתח מכתב</DialogTitle>
        </DialogHeader>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם, נושא או לקוח..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pe-10 text-right"
          />
        </div>

        {/* Status tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as StatusTab)}
        >
          <TabsList className="w-full rtl:flex-row-reverse">
            <TabsTrigger value="all" className="flex-1">הכל</TabsTrigger>
            <TabsTrigger value="draft" className="flex-1">טיוטות</TabsTrigger>
            <TabsTrigger value="saved" className="flex-1">שמורים</TabsTrigger>
            <TabsTrigger value="sent" className="flex-1">נשלחו</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Letter list */}
        <div className="flex-1 overflow-y-auto min-h-0 border rounded-md">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="me-2 text-sm text-muted-foreground">טוען...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : letters.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-8 w-8 mb-2" />
              <p className="text-sm">לא נמצאו מכתבים</p>
            </div>
          ) : (
            <div className="divide-y">
              {letters.map((letter) => {
                const isCurrent = currentLetterId === letter.id;
                const letterName = letter.letter_name || 'ללא שם';
                const clientName = letter.client_company || letter.client_name || 'כללי';
                const subject = letter.subject || '';

                return (
                  <button
                    key={letter.id}
                    type="button"
                    onClick={() => handleRowClick(letter.id)}
                    className={cn(
                      'w-full flex items-start gap-3 px-4 py-3 text-right transition-colors',
                      'hover:bg-muted/50 cursor-pointer',
                      isCurrent && 'bg-blue-50 hover:bg-blue-100'
                    )}
                  >
                    <FileText className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {letterName}
                        </span>
                        {isCurrent && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            נוכחי
                          </Badge>
                        )}
                      </div>
                      {subject && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {subject}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {clientName}
                      </span>
                      {getStatusBadge(letter.status)}
                    </div>

                    <div className="text-xs text-muted-foreground shrink-0 mt-0.5 min-w-[70px] text-left">
                      {formatCompactDate(letter.updated_at)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Results count */}
        {!isLoading && !error && letters.length > 0 && (
          <p className="text-xs text-muted-foreground text-right">
            מציג {letters.length} מתוך {total} תוצאות
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
