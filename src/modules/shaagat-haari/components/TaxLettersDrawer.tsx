/**
 * Tax Letters Drawer
 * Slide-in drawer showing all incoming/outgoing letters for a submission.
 * Supports adding new letters, marking as handled, tracking response deadlines.
 */

import React, { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Mail,
  MailOpen,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Paperclip,
} from 'lucide-react';
import { formatIsraeliDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TaxLetterType =
  | 'OBJECTION'
  | 'REJECTION'
  | 'PARTIAL_APPROVAL'
  | 'FULL_APPROVAL'
  | 'INFO_REQUEST'
  | 'INFO_RESPONSE'
  | 'APPEAL_SUBMITTED'
  | 'ADVANCE_RECEIVED'
  | 'DETERMINATION'
  | 'OTHER';

export type TaxLetterStatus = 'PENDING' | 'HANDLED' | 'EXPIRED' | 'INFO_ONLY';
export type TaxLetterDirection = 'incoming' | 'outgoing';

export interface TaxLetter {
  id: string;
  submission_id: string;
  direction: TaxLetterDirection;
  type: TaxLetterType;
  received_date: string;
  response_due_date: string | null;
  status: TaxLetterStatus;
  reference_number: string | null;
  amount: number | null;
  notes: string | null;
  file_url: string | null;
  response_sent_date: string | null;
  response_reference_number: string | null;
  response_notes: string | null;
  created_at: string;
}

export interface NewLetterForm {
  direction: TaxLetterDirection;
  type: TaxLetterType;
  received_date: string;
  response_due_date: string;
  reference_number: string;
  amount: string;
  notes: string;
}

interface TaxLettersDrawerProps {
  open: boolean;
  onClose: () => void;
  submissionId: string;
  companyName: string;
  letters: TaxLetter[];
  onAddLetter?: (form: NewLetterForm) => Promise<void>;
  onMarkHandled?: (letterId: string, responseNotes: string) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Label maps
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<TaxLetterType, string> = {
  OBJECTION:        'השגה',
  REJECTION:        'דחייה',
  PARTIAL_APPROVAL: 'אישור חלקי',
  FULL_APPROVAL:    'אישור מלא',
  INFO_REQUEST:     'בקשת מידע',
  INFO_RESPONSE:    'תגובה לבקשת מידע',
  APPEAL_SUBMITTED: 'ערעור הוגש',
  ADVANCE_RECEIVED: 'מקדמה התקבלה',
  DETERMINATION:    'קביעת זכאות',
  OTHER:            'אחר',
};

const TYPE_COLORS: Record<TaxLetterType, string> = {
  OBJECTION:        'bg-orange-100 text-orange-700',
  REJECTION:        'bg-red-100 text-red-700',
  PARTIAL_APPROVAL: 'bg-blue-100 text-blue-700',
  FULL_APPROVAL:    'bg-green-100 text-green-700',
  INFO_REQUEST:     'bg-yellow-100 text-yellow-700',
  INFO_RESPONSE:    'bg-sky-100 text-sky-700',
  APPEAL_SUBMITTED: 'bg-purple-100 text-purple-700',
  ADVANCE_RECEIVED: 'bg-emerald-100 text-emerald-700',
  DETERMINATION:    'bg-indigo-100 text-indigo-700',
  OTHER:            'bg-gray-100 text-gray-700',
};

const STATUS_CONFIG: Record<TaxLetterStatus, { label: string; icon: React.ElementType; className: string }> = {
  PENDING:   { label: 'ממתין לטיפול', icon: Clock,        className: 'bg-yellow-100 text-yellow-700' },
  HANDLED:   { label: 'טופל',         icon: CheckCircle2, className: 'bg-green-100 text-green-700' },
  EXPIRED:   { label: 'פג תוקף',      icon: XCircle,      className: 'bg-red-100 text-red-700' },
  INFO_ONLY: { label: 'למידע בלבד',   icon: AlertCircle,  className: 'bg-gray-100 text-gray-600' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Deadline urgency helper
// ─────────────────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function DeadlineBadge({ date }: { date: string | null }) {
  if (!date) return null;
  const days = daysUntil(date);
  if (days < 0)  return <span className="text-xs font-medium text-red-600">פג ({Math.abs(days)} ימים)</span>;
  if (days <= 7)  return <span className="text-xs font-medium text-red-600">{days} ימים</span>;
  if (days <= 21) return <span className="text-xs font-medium text-orange-600">{days} ימים</span>;
  return <span className="text-xs text-gray-500">{formatIsraeliDate(date)}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Letter card
// ─────────────────────────────────────────────────────────────────────────────

const LetterCard: React.FC<{
  letter: TaxLetter;
  onMarkHandled?: (id: string, notes: string) => Promise<void>;
}> = ({ letter, onMarkHandled }) => {
  const [handlingOpen, setHandlingOpen] = useState(false);
  const [responseNotes, setResponseNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const statusCfg = STATUS_CONFIG[letter.status];
  const StatusIcon = statusCfg.icon;

  const handleSave = async () => {
    if (!onMarkHandled) return;
    setSaving(true);
    try {
      await onMarkHandled(letter.id, responseNotes);
      setHandlingOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          'border rounded-lg p-3 space-y-2',
          letter.direction === 'incoming' ? 'border-blue-100 bg-blue-50/40' : 'border-green-100 bg-green-50/40',
        )}
        dir="rtl"
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {letter.direction === 'incoming'
              ? <ArrowDownLeft className="h-4 w-4 text-blue-500 flex-shrink-0" />
              : <ArrowUpRight className="h-4 w-4 text-green-600 flex-shrink-0" />}
            <span className={cn('text-xs rounded-full px-2 py-0.5 font-medium', TYPE_COLORS[letter.type])}>
              {TYPE_LABELS[letter.type]}
            </span>
          </div>
          <span className={cn('inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5', statusCfg.className)}>
            <StatusIcon className="h-3 w-3" />
            {statusCfg.label}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span>תאריך: {formatIsraeliDate(letter.received_date)}</span>
          {letter.reference_number && <span>אסמכתא: {letter.reference_number}</span>}
          {letter.amount != null && (
            <span className="font-medium text-gray-700">סכום: ₪{letter.amount.toLocaleString('he-IL')}</span>
          )}
        </div>

        {/* Response deadline */}
        {letter.response_due_date && letter.status === 'PENDING' && (
          <div className="flex items-center gap-1.5 text-xs">
            <Clock className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-gray-500">מועד תגובה:</span>
            <DeadlineBadge date={letter.response_due_date} />
          </div>
        )}

        {/* Notes */}
        {letter.notes && (
          <p className="text-xs text-gray-600 bg-white/70 rounded px-2 py-1">{letter.notes}</p>
        )}

        {/* File link */}
        {letter.file_url && (
          <a
            href={letter.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
          >
            <Paperclip className="h-3 w-3" />
            צפייה בקובץ
          </a>
        )}

        {/* Mark handled button */}
        {letter.status === 'PENDING' && onMarkHandled && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs mt-1"
            onClick={() => setHandlingOpen(true)}
          >
            סמן כטופל
          </Button>
        )}

        {/* Response info if handled */}
        {letter.status === 'HANDLED' && letter.response_sent_date && (
          <div className="text-xs text-green-700 bg-green-50 rounded px-2 py-1">
            נשלחה תגובה ב-{formatIsraeliDate(letter.response_sent_date)}
            {letter.response_notes && <span>: {letter.response_notes}</span>}
          </div>
        )}
      </div>

      {/* Mark handled dialog */}
      <AlertDialog open={handlingOpen} onOpenChange={setHandlingOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>סימון מכתב כטופל</AlertDialogTitle>
            <AlertDialogDescription>
              הוסף הערות על הטיפול שבוצע (אופציונלי)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="הערות טיפול..."
            value={responseNotes}
            onChange={(e) => setResponseNotes(e.target.value)}
            className="text-right min-h-[80px]"
            dir="rtl"
          />
          <AlertDialogFooter className="flex gap-2 rtl:flex-row-reverse">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'שומר...' : 'סמן כטופל'}
            </Button>
            <Button variant="outline" onClick={() => setHandlingOpen(false)}>
              ביטול
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Add letter form
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_FORM: NewLetterForm = {
  direction: 'incoming',
  type: 'OTHER',
  received_date: new Date().toISOString().split('T')[0],
  response_due_date: '',
  reference_number: '',
  amount: '',
  notes: '',
};

const AddLetterForm: React.FC<{
  onSave: (form: NewLetterForm) => Promise<void>;
  onCancel: () => void;
}> = ({ onSave, onCancel }) => {
  const [form, setForm] = useState<NewLetterForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof NewLetterForm>(key: K, val: NewLetterForm[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-3 bg-gray-50" dir="rtl">
      <h4 className="text-sm font-semibold text-gray-700">הוספת מכתב חדש</h4>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">כיוון</Label>
          <Select value={form.direction} onValueChange={(v) => update('direction', v as TaxLetterDirection)}>
            <SelectTrigger className="text-right h-8 text-sm" dir="rtl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="incoming">נכנס (מרשות המסים)</SelectItem>
              <SelectItem value="outgoing">יוצא (מהמשרד)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">סוג מכתב</Label>
          <Select value={form.type} onValueChange={(v) => update('type', v as TaxLetterType)}>
            <SelectTrigger className="text-right h-8 text-sm" dir="rtl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {(Object.keys(TYPE_LABELS) as TaxLetterType[]).map((t) => (
                <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">תאריך קבלה</Label>
          <Input
            type="date"
            value={form.received_date}
            onChange={(e) => update('received_date', e.target.value)}
            className="h-8 text-sm text-right"
            dir="rtl"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">מועד תגובה (אופציונלי)</Label>
          <Input
            type="date"
            value={form.response_due_date}
            onChange={(e) => update('response_due_date', e.target.value)}
            className="h-8 text-sm text-right"
            dir="rtl"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">מספר אסמכתא</Label>
          <Input
            value={form.reference_number}
            onChange={(e) => update('reference_number', e.target.value)}
            className="h-8 text-sm text-right"
            dir="rtl"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs">סכום (₪)</Label>
          <Input
            type="number"
            value={form.amount}
            onChange={(e) => update('amount', e.target.value)}
            className="h-8 text-sm text-right"
            dir="rtl"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">הערות</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          className="text-right min-h-[60px] text-sm"
          dir="rtl"
        />
      </div>

      <div className="flex gap-2 justify-start rtl:flex-row-reverse">
        <Button size="sm" onClick={handleSave} disabled={saving || !form.received_date}>
          {saving ? 'שומר...' : 'הוסף מכתב'}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          ביטול
        </Button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main drawer
// ─────────────────────────────────────────────────────────────────────────────

export const TaxLettersDrawer: React.FC<TaxLettersDrawerProps> = ({
  open,
  onClose,
  companyName,
  letters,
  onAddLetter,
  onMarkHandled,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);

  const pendingCount = letters.filter((l) => l.status === 'PENDING').length;
  const incoming = letters.filter((l) => l.direction === 'incoming');
  const outgoing = letters.filter((l) => l.direction === 'outgoing');

  const handleAdd = async (form: NewLetterForm) => {
    await onAddLetter?.(form);
    setShowAddForm(false);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="left" className="w-full sm:w-[520px] overflow-y-auto" dir="rtl">
        <SheetHeader className="pb-3">
          <SheetTitle className="flex items-center gap-2 text-right" dir="rtl">
            <Mail className="h-5 w-5 text-blue-600" />
            <div>
              <div className="text-base">מכתבים — {companyName}</div>
              {pendingCount > 0 && (
                <div className="text-xs font-normal text-orange-600">
                  {pendingCount} מכתב{pendingCount > 1 ? 'ים' : ''} ממתין לטיפול
                </div>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4" dir="rtl">
          {/* Add letter button */}
          {onAddLetter && !showAddForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="gap-1.5 w-full"
            >
              <Plus className="h-4 w-4" />
              הוסף מכתב
            </Button>
          )}

          {showAddForm && (
            <AddLetterForm onSave={handleAdd} onCancel={() => setShowAddForm(false)} />
          )}

          {/* Incoming letters */}
          {incoming.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                <ArrowDownLeft className="h-4 w-4 text-blue-500" />
                מכתבים נכנסים ({incoming.length})
              </div>
              {incoming.map((letter) => (
                <LetterCard key={letter.id} letter={letter} onMarkHandled={onMarkHandled} />
              ))}
            </div>
          )}

          {incoming.length > 0 && outgoing.length > 0 && <Separator />}

          {/* Outgoing letters */}
          {outgoing.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                <ArrowUpRight className="h-4 w-4 text-green-600" />
                מכתבים יוצאים ({outgoing.length})
              </div>
              {outgoing.map((letter) => (
                <LetterCard key={letter.id} letter={letter} onMarkHandled={onMarkHandled} />
              ))}
            </div>
          )}

          {letters.length === 0 && !showAddForm && (
            <div className="text-center py-8 text-gray-400" dir="rtl">
              <MailOpen className="h-10 w-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">אין מכתבים עדיין</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

TaxLettersDrawer.displayName = 'TaxLettersDrawer';
