/**
 * Tax Submissions Page
 * Route: /shaagat-haari/submissions
 *
 * Table of all tax submissions with:
 * - Mandatory submission_number + screenshot (enforced in form)
 * - Deadline tracking (21/30/150/240 days)
 * - Tax letters drawer
 * - Status updates
 * - Payment tracking (advance + full payment)
 * - Objection/appeal workflow
 *
 * NOTE: Store/service calls are stubbed — wire up when shaagatStore is ready.
 */

import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowRight,
  Award,
  Mail,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronDown,
  Camera,
  Hash,
} from 'lucide-react';
import { formatILSInteger, formatIsraeliDate, formatPercentage } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { DeadlineTimeline, type SubmissionDeadlines } from '../components/DeadlineTimeline';
import { TaxLettersDrawer, type TaxLetter, type NewLetterForm } from '../components/TaxLettersDrawer';
import { NextDeadlineBadge } from '../components/NextDeadlineBadge';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type SubmissionStatus =
  | 'SUBMITTED'
  | 'IN_REVIEW'
  | 'OBJECTIONS'
  | 'PARTIAL_PAYMENT'
  | 'FULL_PAYMENT'
  | 'CLOSED';

export interface TaxSubmissionRow {
  id: string;
  client_id: string;
  company_name: string;
  tax_id: string;
  submission_number: string;
  submission_screenshot_url: string;
  submission_date: string | null;
  status: SubmissionStatus;
  expected_amount: number | null;
  approved_amount: number | null;  // סכום מאושר ע"י רשות המסים
  received_amount: number;
  advance_received: boolean;
  advance_amount: number;
  advance_received_at: string | null;
  is_closed: boolean;
  pending_letters_count: number;
  // Deadlines
  documents_due_date: string | null;
  advance_due_date: string | null;
  determination_due_date: string | null;
  full_payment_due_date: string | null;
  objection_due_date: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock data — replace with store when ready
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_SUBMISSIONS: TaxSubmissionRow[] = [
  {
    id: 'sub1',
    client_id: 'c1',
    company_name: 'מסעדות כהן בע"מ',
    tax_id: '514123456',
    submission_number: '2026-1234567',
    submission_screenshot_url: 'https://example.com/screenshot1.png',
    submission_date: '2026-03-01',
    status: 'IN_REVIEW',
    expected_amount: 124_800,
    approved_amount: null,
    received_amount: 0,
    advance_received: false,
    advance_amount: 0,
    advance_received_at: null,
    is_closed: false,
    pending_letters_count: 2,
    documents_due_date: '2026-03-31',
    advance_due_date: '2026-03-22',
    determination_due_date: '2026-07-29',
    full_payment_due_date: '2026-11-01',
    objection_due_date: null,
  },
  {
    id: 'sub2',
    client_id: 'c2',
    company_name: 'גרין טק מוצרים ירוקים',
    tax_id: '302456789',
    submission_number: '2026-7654321',
    submission_screenshot_url: 'https://example.com/screenshot2.png',
    submission_date: '2026-02-15',
    status: 'PARTIAL_PAYMENT',
    expected_amount: 287_500,
    approved_amount: 287_500,
    received_amount: 172_500,
    advance_received: true,
    advance_amount: 172_500,
    advance_received_at: '2026-03-08',
    is_closed: false,
    pending_letters_count: 0,
    documents_due_date: '2026-03-17',
    advance_due_date: '2026-03-08',
    determination_due_date: '2026-07-15',
    full_payment_due_date: '2026-10-15',
    objection_due_date: null,
  },
  {
    id: 'sub3',
    client_id: 'c3',
    company_name: 'אחים לוי בנייה',
    tax_id: '511987654',
    submission_number: '2026-1122334',
    submission_screenshot_url: 'https://example.com/screenshot3.png',
    submission_date: '2026-02-01',
    status: 'OBJECTIONS',
    expected_amount: 390_000,
    approved_amount: 312_000,
    received_amount: 156_000,
    advance_received: true,
    advance_amount: 156_000,
    advance_received_at: '2026-02-22',
    is_closed: false,
    pending_letters_count: 1,
    documents_due_date: '2026-03-03',
    advance_due_date: '2026-02-22',
    determination_due_date: '2026-07-01',
    full_payment_due_date: '2026-10-01',
    objection_due_date: '2026-10-01',
  },
];

const MOCK_LETTERS: Record<string, TaxLetter[]> = {
  sub1: [
    {
      id: 'l1',
      submission_id: 'sub1',
      direction: 'incoming',
      type: 'INFO_REQUEST',
      received_date: '2026-03-10',
      response_due_date: '2026-03-25',
      status: 'PENDING',
      reference_number: 'REQ-2026-001',
      amount: null,
      notes: 'נדרש להמציא דוחות חשבוניות לשנת 2025',
      file_url: null,
      response_sent_date: null,
      response_reference_number: null,
      response_notes: null,
      created_at: '2026-03-10',
    },
    {
      id: 'l2',
      submission_id: 'sub1',
      direction: 'incoming',
      type: 'ADVANCE_RECEIVED',
      received_date: '2026-03-05',
      response_due_date: null,
      status: 'INFO_ONLY',
      reference_number: null,
      amount: 74_880,
      notes: 'מקדמה 60% התקבלה',
      file_url: null,
      response_sent_date: null,
      response_reference_number: null,
      response_notes: null,
      created_at: '2026-03-05',
    },
  ],
  sub3: [
    {
      id: 'l3',
      submission_id: 'sub3',
      direction: 'incoming',
      type: 'REJECTION',
      received_date: '2026-03-01',
      response_due_date: '2026-03-30',
      status: 'PENDING',
      reference_number: 'REJ-2026-042',
      amount: null,
      notes: 'דחייה חלקית — לא הוכרו הוצאות שכר. יש להגיש השגה.',
      file_url: null,
      response_sent_date: null,
      response_reference_number: null,
      response_notes: null,
      created_at: '2026-03-01',
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Status display helpers
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SubmissionStatus, { label: string; className: string }> = {
  SUBMITTED:       { label: 'הוגש',           className: 'bg-blue-100 text-blue-700' },
  IN_REVIEW:       { label: 'בבדיקה',         className: 'bg-indigo-100 text-indigo-700' },
  OBJECTIONS:      { label: 'השגות',           className: 'bg-orange-100 text-orange-700' },
  PARTIAL_PAYMENT: { label: 'מקדמה התקבלה',   className: 'bg-teal-100 text-teal-700' },
  FULL_PAYMENT:    { label: 'שולם מלא',        className: 'bg-green-100 text-green-700' },
  CLOSED:          { label: 'סגור',            className: 'bg-gray-100 text-gray-600' },
};

// `NextDeadlineBadge` lives in components/NextDeadlineBadge.tsx (shared with
// the unified dashboard's StageDetailsCell).

// ─────────────────────────────────────────────────────────────────────────────
// Status update dialog
// ─────────────────────────────────────────────────────────────────────────────

interface StatusUpdateDialogProps {
  open: boolean;
  row: TaxSubmissionRow | null;
  onClose: () => void;
  onSave: (id: string, status: SubmissionStatus, receivedAmount: number, notes: string) => Promise<void>;
}

const StatusUpdateDialog: React.FC<StatusUpdateDialogProps> = ({ open, row, onClose, onSave }) => {
  const [status, setStatus] = useState<SubmissionStatus>('IN_REVIEW');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (row) {
      setStatus(row.status);
      setReceivedAmount(row.received_amount > 0 ? String(row.received_amount) : '');
      setNotes('');
    }
  }, [row]);

  const handleSave = async () => {
    if (!row) return;
    setSaving(true);
    try {
      await onSave(row.id, status, Number(receivedAmount) || 0, notes);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-right">עדכון סטטוס — {row.company_name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-sm">סטטוס הגשה</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as SubmissionStatus)}>
              <SelectTrigger className="text-right" dir="rtl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {(Object.keys(STATUS_CONFIG) as SubmissionStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_CONFIG[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(status === 'PARTIAL_PAYMENT' || status === 'FULL_PAYMENT') && (
            <div className="space-y-1">
              <Label className="text-sm">סכום שהתקבל (₪)</Label>
              <Input
                type="number"
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                className="text-right"
                dir="rtl"
                placeholder="0"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-sm">הערות (אופציונלי)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-right min-h-[80px]"
              dir="rtl"
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 rtl:flex-row-reverse">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'שומר...' : 'שמור'}
          </Button>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Deadline details sheet
// ─────────────────────────────────────────────────────────────────────────────

const DeadlineSheet: React.FC<{
  open: boolean;
  row: TaxSubmissionRow | null;
  onClose: () => void;
}> = ({ open, row, onClose }) => {
  if (!row) return null;

  const deadlines: SubmissionDeadlines = {
    submission_date: row.submission_date,
    documents_due_date: row.documents_due_date,
    advance_due_date: row.advance_due_date,
    determination_due_date: row.determination_due_date,
    full_payment_due_date: row.full_payment_due_date,
    objection_due_date: row.objection_due_date,
    advance_received: row.advance_received,
    advance_received_at: row.advance_received_at,
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="left" className="w-full sm:w-[400px] overflow-y-auto" dir="rtl">
        <SheetHeader className="pb-3">
          <SheetTitle className="text-right">
            <div className="text-base">ציר זמן — {row.company_name}</div>
            <div className="text-xs font-normal text-gray-500 mt-0.5">
              מספר בקשה: {row.submission_number}
            </div>
          </SheetTitle>
        </SheetHeader>
        <DeadlineTimeline deadlines={deadlines} />
      </SheetContent>
    </Sheet>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// KPI cards — status counts + money totals
// ─────────────────────────────────────────────────────────────────────────────

interface StatusKPICardProps {
  label: string;
  count: number;
  color: string;
  isSelected: boolean;
  onClick: () => void;
}

const StatusKPICard: React.FC<StatusKPICardProps> = ({ label, count, color, isSelected, onClick }) => (
  <Card
    className={cn(
      'cursor-pointer transition-all border hover:shadow-sm flex-1 min-w-[90px]',
      isSelected ? `ring-2 ring-offset-1 ring-current ${color}` : 'border-gray-200',
    )}
    onClick={onClick}
  >
    <CardContent className="py-2 px-3 text-center" dir="rtl">
      <div className={cn('text-2xl font-bold tabular-nums', color)}>{count}</div>
      <div className="text-xs text-gray-500 mt-0.5 truncate">{label}</div>
    </CardContent>
  </Card>
);

const SubmissionKPICards: React.FC<{
  allRows: TaxSubmissionRow[];
  activeTab: SubmissionStatus | 'all';
  onTabChange: (t: SubmissionStatus | 'all') => void;
}> = ({ allRows, activeTab, onTabChange }) => {
  const counts: Record<SubmissionStatus | 'all', number> = {
    all:             allRows.length,
    SUBMITTED:       allRows.filter((r) => r.status === 'SUBMITTED').length,
    IN_REVIEW:       allRows.filter((r) => r.status === 'IN_REVIEW').length,
    OBJECTIONS:      allRows.filter((r) => r.status === 'OBJECTIONS').length,
    PARTIAL_PAYMENT: allRows.filter((r) => r.status === 'PARTIAL_PAYMENT').length,
    FULL_PAYMENT:    allRows.filter((r) => r.status === 'FULL_PAYMENT').length,
    CLOSED:          allRows.filter((r) => r.status === 'CLOSED').length,
  };

  const totalExpected  = allRows.reduce((s, r) => s + (r.expected_amount ?? 0), 0);
  const totalApproved  = allRows.reduce((s, r) => s + (r.approved_amount ?? 0), 0);
  const totalReceived  = allRows.reduce((s, r) => s + r.received_amount, 0);
  const totalBalance   = totalApproved - totalReceived;
  const pendingLetters = allRows.reduce((s, r) => s + r.pending_letters_count, 0);

  const statusCards: { key: SubmissionStatus | 'all'; label: string; color: string }[] = [
    { key: 'all',             label: 'הכל',      color: 'text-gray-700' },
    { key: 'SUBMITTED',       label: 'הוגשו',    color: 'text-blue-600' },
    { key: 'IN_REVIEW',       label: 'בבדיקה',   color: 'text-indigo-600' },
    { key: 'OBJECTIONS',      label: 'השגות',    color: 'text-orange-600' },
    { key: 'PARTIAL_PAYMENT', label: 'מקדמה',    color: 'text-teal-600' },
    { key: 'FULL_PAYMENT',    label: 'שולם מלא', color: 'text-green-600' },
    { key: 'CLOSED',          label: 'סגורים',   color: 'text-gray-400' },
  ];

  const moneyItems = [
    { label: 'מבוקש',  value: formatILSInteger(totalExpected), color: 'text-gray-800' },
    { label: 'מאושר',  value: formatILSInteger(totalApproved), color: 'text-blue-700' },
    { label: 'שולם',   value: formatILSInteger(totalReceived), color: 'text-green-700' },
    { label: 'יתרה',   value: formatILSInteger(totalBalance),  color: totalBalance > 0 ? 'text-orange-600' : 'text-gray-400' },
    { label: 'מכתבים פתוחים', value: String(pendingLetters),  color: pendingLetters > 0 ? 'text-red-600' : 'text-gray-400' },
  ];

  return (
    <div className="space-y-2" dir="rtl">
      {/* Status count cards */}
      <div className="flex gap-2 flex-wrap">
        {statusCards.map(({ key, label, color }) => (
          <StatusKPICard
            key={key}
            label={label}
            count={counts[key]}
            color={color}
            isSelected={activeTab === key}
            onClick={() => onTabChange(key)}
          />
        ))}
      </div>

      {/* Money summary bar */}
      <Card className="border-gray-200">
        <CardContent className="py-2.5 px-4">
          <div className="flex flex-wrap items-center gap-6" dir="rtl">
            {moneyItems.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">{item.label}:</span>
                <span className={cn('text-sm font-bold tabular-nums', item.color)}>{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export const TaxSubmissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Optional deep-link from the unified dashboard: filter to a single client.
  const clientIdFilter = searchParams.get('clientId');

  // TODO: Replace with useShaagatStore()
  const [loading] = useState(false);
  const submissions = MOCK_SUBMISSIONS;

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<SubmissionStatus | 'all'>('all');

  // Resolve the client name for the banner (best-effort from rows we have).
  const focusedClient = useMemo(() => {
    if (!clientIdFilter) return null;
    const row = submissions.find((r) => r.client_id === clientIdFilter);
    return row ? { id: row.client_id, name: row.company_name } : { id: clientIdFilter, name: null };
  }, [clientIdFilter, submissions]);

  const clearClientFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('clientId');
    setSearchParams(next);
  };

  // Dialog states
  const [statusDialog, setStatusDialog] = useState<{ open: boolean; row: TaxSubmissionRow | null }>({ open: false, row: null });
  const [deadlineSheet, setDeadlineSheet] = useState<{ open: boolean; row: TaxSubmissionRow | null }>({ open: false, row: null });
  const [lettersDrawer, setLettersDrawer] = useState<{ open: boolean; row: TaxSubmissionRow | null }>({ open: false, row: null });

  const filtered = useMemo(() => {
    let result = [...submissions];
    if (clientIdFilter) result = result.filter((r) => r.client_id === clientIdFilter);
    if (activeTab !== 'all') result = result.filter((r) => r.status === activeTab);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) => r.company_name.toLowerCase().includes(q) || r.tax_id.includes(q) || r.submission_number.includes(q),
      );
    }
    return result;
  }, [submissions, activeTab, search, clientIdFilter]);

  // Stub handlers
  const handleStatusSave = async (id: string, status: SubmissionStatus, receivedAmount: number, notes: string) => {
    console.log('Save status', { id, status, receivedAmount, notes });
    // TODO: store.updateSubmissionStatus(...)
  };

  const handleAddLetter = async (form: NewLetterForm) => {
    console.log('Add letter', form);
    // TODO: store.addTaxLetter(...)
  };

  const handleMarkHandled = async (letterId: string, responseNotes: string) => {
    console.log('Mark handled', { letterId, responseNotes });
    // TODO: store.markLetterHandled(...)
  };

  const currentLetters = lettersDrawer.row
    ? (MOCK_LETTERS[lettersDrawer.row.id] ?? [])
    : [];

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between" dir="rtl">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate('/shaagat-haari')} className="gap-1.5">
                <ArrowRight className="h-4 w-4" />
                חזרה
              </Button>
              <Award className="h-5 w-5 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">מעקב שידורים לרשות המסים</h1>
                <p className="text-sm text-gray-500">ניהול הגשות, מועדים, מכתבים ותשלומים</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => {}} disabled={loading} className="gap-1.5">
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              רענן
            </Button>
          </div>

          {/* Single-client filter banner (deep-linked from dashboard) */}
          {focusedClient && (
            <Alert className="border-blue-200 bg-blue-50" dir="rtl">
              <AlertDescription className="flex items-center justify-between gap-3 text-sm">
                <span>
                  מציג שידור עבור:{' '}
                  <strong>
                    {focusedClient.name ?? `לקוח ${focusedClient.id.slice(0, 8)}`}
                  </strong>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-blue-700 hover:bg-blue-100"
                  onClick={clearClientFilter}
                >
                  חזור לכל השידורים
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* KPI cards + tabs */}
          <SubmissionKPICards
            allRows={submissions}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Filters */}
          <Card className="border-gray-200">
            <CardContent className="pt-4 pb-3 px-4 space-y-3">
              <div className="flex flex-wrap gap-2 items-center" dir="rtl">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    placeholder="חיפוש לפי שם, ח.פ. או מספר בקשה"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pe-9 text-right"
                    dir="rtl"
                  />
                </div>
                <span className="text-xs text-gray-400 tabular-nums">
                  {filtered.length} הגשות
                  {activeTab !== 'all' && (
                    <span className="ms-1 font-medium text-gray-600">
                      ({STATUS_CONFIG[activeTab as SubmissionStatus].label})
                    </span>
                  )}
                </span>
              </div>

              {/* Table */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="text-right font-semibold text-gray-700 ps-4">חברה</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">מספר בקשה</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">תאריך</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">סטטוס</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">מבוקש</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">מאושר</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">שולם</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">יתרה</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">דד"ל הבא</TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">מכתבים</TableHead>
                      <TableHead className="text-center font-semibold text-gray-700 pe-4">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-10 text-gray-400 text-sm">
                          לא נמצאו הגשות
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((row) => {
                        const statusCfg = STATUS_CONFIG[row.status];
                        const receivedPct = row.expected_amount
                          ? Math.round((row.received_amount / row.expected_amount) * 100)
                          : 0;

                        const balance = (row.approved_amount ?? 0) - row.received_amount;

                        return (
                          <TableRow key={row.id} className="hover:bg-gray-50">
                            {/* Company */}
                            <TableCell className="ps-4">
                              <div className="font-medium text-gray-900 text-sm">{row.company_name}</div>
                              <div className="text-xs text-gray-400 font-mono">{row.tax_id}</div>
                            </TableCell>

                            {/* Submission number + screenshot */}
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <Hash className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                <span className="text-sm font-mono text-gray-700">{row.submission_number}</span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <a
                                      href={row.submission_screenshot_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 hover:text-blue-700"
                                    >
                                      <Camera className="h-3.5 w-3.5" />
                                    </a>
                                  </TooltipTrigger>
                                  <TooltipContent dir="rtl">צפייה בצילום ההגשה</TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>

                            {/* Date */}
                            <TableCell className="text-sm text-gray-600">
                              {row.submission_date ? formatIsraeliDate(row.submission_date) : '—'}
                            </TableCell>

                            {/* Status */}
                            <TableCell>
                              <span className={cn(
                                'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                                statusCfg.className,
                              )}>
                                {statusCfg.label}
                              </span>
                            </TableCell>

                            {/* מבוקש — expected */}
                            <TableCell className="tabular-nums text-sm text-gray-700">
                              {row.expected_amount != null ? formatILSInteger(row.expected_amount) : '—'}
                            </TableCell>

                            {/* מאושר — approved */}
                            <TableCell className="tabular-nums text-sm text-blue-700 font-medium">
                              {row.approved_amount != null ? formatILSInteger(row.approved_amount) : '—'}
                            </TableCell>

                            {/* שולם — received */}
                            <TableCell>
                              {row.received_amount > 0 ? (
                                <div className="space-y-0.5">
                                  <div className="text-sm font-medium text-green-700 tabular-nums">
                                    {formatILSInteger(row.received_amount)}
                                  </div>
                                  <div className="text-xs text-gray-400">{receivedPct}%</div>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">—</span>
                              )}
                            </TableCell>

                            {/* יתרה — balance */}
                            <TableCell className={cn(
                              'tabular-nums text-sm font-medium',
                              balance > 0 ? 'text-orange-600' : 'text-gray-400',
                            )}>
                              {row.approved_amount != null
                                ? (balance > 0 ? formatILSInteger(balance) : '—')
                                : '—'}
                            </TableCell>

                            {/* Next deadline */}
                            <TableCell>
                              <NextDeadlineBadge data={row} />
                            </TableCell>

                            {/* Letters */}
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 gap-1 text-xs"
                                onClick={() => setLettersDrawer({ open: true, row })}
                              >
                                <Mail className="h-3.5 w-3.5" />
                                {row.pending_letters_count > 0 ? (
                                  <span className="text-orange-600 font-semibold">{row.pending_letters_count}</span>
                                ) : (
                                  <span className="text-gray-400">0</span>
                                )}
                              </Button>
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="pe-4">
                              <div className="flex items-center gap-1 justify-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => setStatusDialog({ open: true, row })}
                                    >
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent dir="rtl">עדכון סטטוס</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => setDeadlineSheet({ open: true, row })}
                                    >
                                      <Clock className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent dir="rtl">ציר זמן מועדים</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => navigate(`/shaagat-haari/client/${row.client_id}/history`)}
                                    >
                                      <ExternalLink className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent dir="rtl">היסטוריית לקוח</TooltipContent>
                                </Tooltip>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <StatusUpdateDialog
        open={statusDialog.open}
        row={statusDialog.row}
        onClose={() => setStatusDialog({ open: false, row: null })}
        onSave={handleStatusSave}
      />

      <DeadlineSheet
        open={deadlineSheet.open}
        row={deadlineSheet.row}
        onClose={() => setDeadlineSheet({ open: false, row: null })}
      />

      <TaxLettersDrawer
        open={lettersDrawer.open}
        onClose={() => setLettersDrawer({ open: false, row: null })}
        submissionId={lettersDrawer.row?.id ?? ''}
        companyName={lettersDrawer.row?.company_name ?? ''}
        letters={currentLetters}
        onAddLetter={handleAddLetter}
        onMarkHandled={handleMarkHandled}
      />
    </TooltipProvider>
  );
};

export default TaxSubmissionsPage;
