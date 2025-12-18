/**
 * Bulk Actions Bar Component
 * Floating action bar that appears when multiple rows are selected
 * Provides bulk operations like send reminder, mark as paid, add note
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Mail,
  CheckCircle,
  MessageSquare,
  X,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { collectionService } from '@/services/collection.service';
import { cn } from '@/lib/utils';

interface BulkActionsBarProps {
  selectedCount: number;
  selectedIds: string[];
  onClearSelection: () => void;
  onActionComplete: () => void;
}

type ReminderType = 'gentle' | 'payment_selection' | 'payment_request' | 'urgent';

const REMINDER_OPTIONS: { value: ReminderType; label: string; description: string }[] = [
  { value: 'gentle', label: 'תזכורת עדינה', description: 'לא פתחו את המכתב' },
  { value: 'payment_selection', label: 'בחירת אמצעי תשלום', description: 'פתחו אך לא בחרו' },
  { value: 'payment_request', label: 'בקשת תשלום', description: 'בחרו אך לא שילמו' },
  { value: 'urgent', label: 'תזכורת דחופה', description: 'איחור משמעותי' },
];

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  selectedIds,
  onClearSelection,
  onActionComplete,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'markPaid' | 'reminder' | null>(null);
  const [selectedReminderType, setSelectedReminderType] = useState<ReminderType>('gentle');
  const [noteContent, setNoteContent] = useState('');

  // Don't render if no items selected
  if (selectedCount === 0) {
    return null;
  }

  const handleSendReminders = async () => {
    setIsProcessing(true);
    try {
      const result = await collectionService.bulkSendReminders(selectedIds, selectedReminderType);

      if (result.error) {
        toast.error('שגיאה בשליחת תזכורות', { description: result.error.message });
        return;
      }

      const { success, failed } = result.data!;
      if (failed.length === 0) {
        toast.success(`נשלחו ${success.length} תזכורות בהצלחה`);
      } else {
        toast.warning(`נשלחו ${success.length} תזכורות, ${failed.length} נכשלו`);
      }

      onClearSelection();
      onActionComplete();
    } catch (error) {
      toast.error('שגיאה בשליחת תזכורות');
    } finally {
      setIsProcessing(false);
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };

  const handleMarkAsPaid = async () => {
    setIsProcessing(true);
    try {
      const result = await collectionService.bulkMarkAsPaid(selectedIds);

      if (result.error) {
        toast.error('שגיאה בסימון כשולם', { description: result.error.message });
        return;
      }

      const { success, failed } = result.data!;
      if (failed.length === 0) {
        toast.success(`סומנו ${success.length} רשומות כשולמו`);
      } else {
        toast.warning(`סומנו ${success.length} רשומות, ${failed.length} נכשלו`);
      }

      onClearSelection();
      onActionComplete();
    } catch (error) {
      toast.error('שגיאה בסימון כשולם');
    } finally {
      setIsProcessing(false);
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) {
      toast.error('יש להזין תוכן להערה');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await collectionService.bulkAddNote(selectedIds, noteContent);

      if (result.error) {
        toast.error('שגיאה בהוספת הערות', { description: result.error.message });
        return;
      }

      const { success, failed } = result.data!;
      if (failed.length === 0) {
        toast.success(`נוספו ${success.length} הערות בהצלחה`);
      } else {
        toast.warning(`נוספו ${success.length} הערות, ${failed.length} נכשלו`);
      }

      setNoteContent('');
      setShowNoteDialog(false);
      onClearSelection();
      onActionComplete();
    } catch (error) {
      toast.error('שגיאה בהוספת הערות');
    } finally {
      setIsProcessing(false);
    }
  };

  const openConfirmDialog = (action: 'markPaid' | 'reminder') => {
    setConfirmAction(action);
    setShowConfirmDialog(true);
  };

  return (
    <>
      {/* Floating Action Bar */}
      <div
        className={cn(
          'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
          'bg-white border border-gray-200 rounded-lg shadow-lg',
          'px-4 py-3 flex items-center gap-4 rtl:flex-row-reverse',
          'animate-in slide-in-from-bottom-5 duration-300'
        )}
      >
        {/* Selection Count */}
        <div className="flex items-center gap-2 rtl:flex-row-reverse border-l rtl:border-l-0 rtl:border-r pl-4 rtl:pl-0 rtl:pr-4">
          <span className="font-medium text-sm rtl:text-right">{selectedCount} נבחרו</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Send Reminder Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="rtl:flex-row-reverse gap-2"
              disabled={isProcessing}
            >
              <Mail className="h-4 w-4" />
              <span className="rtl:text-right">שלח תזכורת</span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-56 rtl:text-right">
            {REMINDER_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => {
                  setSelectedReminderType(option.value);
                  openConfirmDialog('reminder');
                }}
                className="flex flex-col items-start rtl:items-end gap-0.5"
              >
                <span className="font-medium rtl:text-right">{option.label}</span>
                <span className="text-xs text-gray-500 rtl:text-right">{option.description}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mark as Paid */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => openConfirmDialog('markPaid')}
          disabled={isProcessing}
          className="rtl:flex-row-reverse gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          <span className="rtl:text-right">סמן כשולם</span>
        </Button>

        {/* Add Note */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowNoteDialog(true)}
          disabled={isProcessing}
          className="rtl:flex-row-reverse gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          <span className="rtl:text-right">הוסף הערה</span>
        </Button>

        {/* Loading Indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-gray-500">מעבד...</span>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-[400px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="rtl:text-right">
              {confirmAction === 'markPaid' ? 'סימון כשולם' : 'שליחת תזכורות'}
            </DialogTitle>
            <DialogDescription className="rtl:text-right">
              {confirmAction === 'markPaid'
                ? `האם לסמן ${selectedCount} רשומות כשולמו?`
                : `האם לשלוח תזכורת מסוג "${REMINDER_OPTIONS.find((o) => o.value === selectedReminderType)?.label}" ל-${selectedCount} לקוחות?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="rtl:flex-row-reverse gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isProcessing}
            >
              ביטול
            </Button>
            <Button
              onClick={confirmAction === 'markPaid' ? handleMarkAsPaid : handleSendReminders}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  מעבד...
                </>
              ) : (
                'אישור'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="rtl:text-right">הוספת הערה ל-{selectedCount} לקוחות</DialogTitle>
            <DialogDescription className="rtl:text-right">
              ההערה תתווסף לכל הלקוחות הנבחרים
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="הזן את תוכן ההערה..."
              className="min-h-[120px] rtl:text-right"
              dir="rtl"
            />
          </div>
          <DialogFooter className="rtl:flex-row-reverse gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowNoteDialog(false);
                setNoteContent('');
              }}
              disabled={isProcessing}
            >
              ביטול
            </Button>
            <Button onClick={handleAddNote} disabled={isProcessing || !noteContent.trim()}>
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  שומר...
                </>
              ) : (
                'הוסף הערה'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

BulkActionsBar.displayName = 'BulkActionsBar';
