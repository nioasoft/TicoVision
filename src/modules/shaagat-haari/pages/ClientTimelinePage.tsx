/**
 * Client Timeline Page
 * Route: /shaagat-haari/client/:clientId/history
 *
 * Full audit trail for one client: feasibility checks, eligibility, payments,
 * salary forms, calculations, emails, approvals, submissions, tax letters,
 * status changes, file uploads.
 *
 * Source: shaagat_status_history + joins
 * NOTE: Store calls stubbed — wire up when shaagatStore is ready.
 */

import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowRight,
  Mail,
  CheckCircle2,
  XCircle,
  Calculator,
  CreditCard,
  Send,
  FileText,
  UserCheck,
  AlertCircle,
  Building2,
  History,
  Upload,
  RefreshCw,
} from 'lucide-react';
import { formatIsraeliDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TimelineEventType =
  | 'feasibility_sent'
  | 'feasibility_completed'
  | 'fee_payment'
  | 'eligibility_check'
  | 'email_sent'
  | 'salary_form_sent'
  | 'salary_form_received'
  | 'calculation_started'
  | 'calculation_completed'
  | 'calculation_sent_to_client'
  | 'client_approved'
  | 'client_rejected'
  | 'manual_approval'
  | 'submission'
  | 'advance_received'
  | 'tax_letter'
  | 'status_change'
  | 'file_upload'
  | 'note';

export interface TimelineEvent {
  id: string;
  event_type: TimelineEventType;
  timestamp: string;
  title: string;
  description: string | null;
  actor: string | null;      // user name / 'system' / 'client'
  metadata?: Record<string, string | number | boolean | null>;
  amount?: number | null;
  status_from?: string | null;
  status_to?: string | null;
}

type EventCategory = 'all' | 'emails' | 'calculations' | 'payments' | 'submissions' | 'changes';

// ─────────────────────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_CLIENT = { id: 'c1', company_name: 'מסעדות כהן בע"מ', tax_id: '514123456' };

const MOCK_TIMELINE: TimelineEvent[] = [
  {
    id: 'e1',
    event_type: 'feasibility_sent',
    timestamp: '2026-02-10T09:00:00Z',
    title: 'נשלח מייל היתכנות ראשוני',
    description: 'מייל לבדיקת היתכנות נשלח ללקוח עם לינק לטופס',
    actor: 'מיכל לוי',
    metadata: { email: 'cohen@example.com' },
  },
  {
    id: 'e2',
    event_type: 'feasibility_completed',
    timestamp: '2026-02-12T14:30:00Z',
    title: 'לקוח מילא טופס היתכנות',
    description: 'ירידה של 38.5% — יש היתכנות. הלקוח ביקש טיפול.',
    actor: 'לקוח',
    metadata: { decline_pct: 38.5 },
  },
  {
    id: 'e3',
    event_type: 'fee_payment',
    timestamp: '2026-02-12T15:10:00Z',
    title: 'שולמו דמי טיפול',
    description: '1,350 ₪ + מע"מ שולמו דרך Cardcom',
    actor: 'לקוח',
    amount: 1593,
  },
  {
    id: 'e4',
    event_type: 'eligibility_check',
    timestamp: '2026-02-15T10:00:00Z',
    title: 'בדיקת זכאות מלאה בוצעה',
    description: 'מסלול רגיל, חד-חודשי. ירידה 38.5% — זכאי, מקדם 7%.',
    actor: 'דנה כהן',
    metadata: { track: 'standard', decline_pct: 38.5, rate: 7 },
    status_to: 'ELIGIBLE',
  },
  {
    id: 'e5',
    event_type: 'email_sent',
    timestamp: '2026-02-15T10:15:00Z',
    title: 'נשלח מייל זכאות',
    description: 'מייל "מזל טוב — זכאי לפיצוי" עם לינק לפרטי בנק',
    actor: 'דנה כהן',
    metadata: { email_type: 'ELIGIBLE' },
  },
  {
    id: 'e6',
    event_type: 'salary_form_sent',
    timestamp: '2026-02-20T09:00:00Z',
    title: 'נשלח טופס נתוני שכר לרואה חשבון',
    description: 'טופס איסוף נתוני שכר נשלח לרו"ח משה ישראלי',
    actor: 'מיכל לוי',
    metadata: { recipient: 'moshe@accountant.co.il' },
  },
  {
    id: 'e7',
    event_type: 'salary_form_received',
    timestamp: '2026-02-22T11:30:00Z',
    title: 'נתוני שכר התקבלו',
    description: 'שכר ברוטו: ₪85,000, 12 עובדים',
    actor: 'רו"ח חיצוני',
    metadata: { salary_gross: 85000, num_employees: 12 },
  },
  {
    id: 'e8',
    event_type: 'calculation_started',
    timestamp: '2026-02-23T09:00:00Z',
    title: 'חישוב מענק התחיל',
    description: 'Wizard חישוב נפתח — שלב 1/4',
    actor: 'דנה כהן',
  },
  {
    id: 'e9',
    event_type: 'calculation_completed',
    timestamp: '2026-02-23T10:30:00Z',
    title: 'חישוב מענק הושלם',
    description: 'מענק הוצאות: ₪42,300 + מענק שכר: ₪82,500 = סה"כ ₪124,800',
    actor: 'דנה כהן',
    amount: 124800,
  },
  {
    id: 'e10',
    event_type: 'calculation_sent_to_client',
    timestamp: '2026-02-23T11:00:00Z',
    title: 'פירוט מענק נשלח ללקוח',
    description: 'מייל עם פירוט ₪124,800 ולינק לאישור',
    actor: 'דנה כהן',
    amount: 124800,
  },
  {
    id: 'e11',
    event_type: 'client_approved',
    timestamp: '2026-02-25T16:00:00Z',
    title: 'לקוח אישר את המענק',
    description: 'אישור התקבל דרך טופס חיצוני. פרטי בנק הוזנו.',
    actor: 'לקוח',
  },
  {
    id: 'e12',
    event_type: 'submission',
    timestamp: '2026-03-01T09:00:00Z',
    title: 'שודר לרשות המסים',
    description: 'מספר אישור: 2026-1234567',
    actor: 'דנה כהן',
    metadata: { submission_number: '2026-1234567' },
    status_to: 'SUBMITTED',
  },
  {
    id: 'e13',
    event_type: 'status_change',
    timestamp: '2026-03-05T08:00:00Z',
    title: 'סטטוס עודכן',
    description: 'הגשה עברה לסטטוס "בבדיקה"',
    actor: 'מערכת',
    status_from: 'SUBMITTED',
    status_to: 'IN_REVIEW',
  },
  {
    id: 'e14',
    event_type: 'tax_letter',
    timestamp: '2026-03-10T00:00:00Z',
    title: 'מכתב נכנס — בקשת מידע',
    description: 'נדרש להמציא דוחות חשבוניות לשנת 2025. מועד תגובה: 25/03/2026',
    actor: 'רשות המסים',
    metadata: { reference: 'REQ-2026-001', response_due: '2026-03-25' },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Event type config
// ─────────────────────────────────────────────────────────────────────────────

const EVENT_CONFIG: Record<TimelineEventType, {
  icon: React.ElementType;
  color: string;
  dotColor: string;
  category: EventCategory;
}> = {
  feasibility_sent:           { icon: Mail,         color: 'text-blue-600',   dotColor: 'bg-blue-400',    category: 'emails' },
  feasibility_completed:      { icon: CheckCircle2, color: 'text-blue-700',   dotColor: 'bg-blue-500',    category: 'emails' },
  fee_payment:                { icon: CreditCard,   color: 'text-green-700',  dotColor: 'bg-green-500',   category: 'payments' },
  eligibility_check:          { icon: CheckCircle2, color: 'text-green-700',  dotColor: 'bg-green-500',   category: 'changes' },
  email_sent:                 { icon: Mail,         color: 'text-indigo-600', dotColor: 'bg-indigo-400',  category: 'emails' },
  salary_form_sent:           { icon: Send,         color: 'text-cyan-600',   dotColor: 'bg-cyan-400',    category: 'emails' },
  salary_form_received:       { icon: FileText,     color: 'text-cyan-700',   dotColor: 'bg-cyan-500',    category: 'changes' },
  calculation_started:        { icon: Calculator,   color: 'text-purple-600', dotColor: 'bg-purple-400',  category: 'calculations' },
  calculation_completed:      { icon: Calculator,   color: 'text-purple-700', dotColor: 'bg-purple-600',  category: 'calculations' },
  calculation_sent_to_client: { icon: Send,         color: 'text-purple-600', dotColor: 'bg-purple-400',  category: 'calculations' },
  client_approved:            { icon: UserCheck,    color: 'text-green-700',  dotColor: 'bg-green-500',   category: 'changes' },
  client_rejected:            { icon: XCircle,      color: 'text-red-600',    dotColor: 'bg-red-400',     category: 'changes' },
  manual_approval:            { icon: UserCheck,    color: 'text-teal-700',   dotColor: 'bg-teal-500',    category: 'changes' },
  submission:                 { icon: Send,         color: 'text-blue-700',   dotColor: 'bg-blue-600',    category: 'submissions' },
  advance_received:           { icon: CreditCard,   color: 'text-green-700',  dotColor: 'bg-green-500',   category: 'payments' },
  tax_letter:                 { icon: Mail,         color: 'text-orange-600', dotColor: 'bg-orange-400',  category: 'submissions' },
  status_change:              { icon: RefreshCw,    color: 'text-gray-500',   dotColor: 'bg-gray-400',    category: 'changes' },
  file_upload:                { icon: Upload,       color: 'text-gray-600',   dotColor: 'bg-gray-400',    category: 'changes' },
  note:                       { icon: FileText,     color: 'text-gray-500',   dotColor: 'bg-gray-300',    category: 'changes' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Category filter
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<EventCategory, string> = {
  all:          'הכל',
  emails:       'מיילים',
  calculations: 'חישובים',
  payments:     'תשלומים',
  submissions:  'הגשות',
  changes:      'שינויים',
};

// ─────────────────────────────────────────────────────────────────────────────
// Timeline event row
// ─────────────────────────────────────────────────────────────────────────────

const TimelineEventRow: React.FC<{
  event: TimelineEvent;
  isLast: boolean;
}> = ({ event, isLast }) => {
  const cfg = EVENT_CONFIG[event.event_type];
  const Icon = cfg.icon;

  return (
    <div className="flex gap-4" dir="rtl">
      {/* Spine */}
      <div className="flex flex-col items-center flex-shrink-0 w-8">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-white shadow-sm',
          cfg.dotColor,
        )}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        {!isLast && <div className="w-0.5 bg-gray-200 flex-1 mt-1 min-h-[24px]" />}
      </div>

      {/* Content */}
      <div className="pb-6 flex-1 min-w-0 pt-1">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <span className="text-sm font-semibold text-gray-900">{event.title}</span>
            {event.actor && (
              <span className="text-xs text-gray-400 ms-2">
                ·{' '}
                <span className={event.actor === 'לקוח' ? 'text-blue-600' : event.actor === 'מערכת' ? 'text-gray-400' : 'text-gray-600'}>
                  {event.actor}
                </span>
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">
            {formatIsraeliDate(event.timestamp)}
          </span>
        </div>

        {event.description && (
          <p className="text-sm text-gray-600 mt-0.5 leading-relaxed">{event.description}</p>
        )}

        {/* Status change pill */}
        {event.status_from && event.status_to && (
          <div className="flex items-center gap-1.5 mt-1 text-xs">
            <Badge variant="outline" className="text-xs">{event.status_from}</Badge>
            <span className="text-gray-400">→</span>
            <Badge variant="outline" className="text-xs bg-blue-50">{event.status_to}</Badge>
          </div>
        )}

        {/* Amount */}
        {event.amount != null && (
          <div className="text-sm font-semibold text-green-700 mt-0.5 tabular-nums">
            ₪{event.amount.toLocaleString('he-IL')}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export const ClientTimelinePage: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  // TODO: Replace with useShaagatStore().fetchClientTimeline(clientId)
  const client = MOCK_CLIENT;
  const allEvents = MOCK_TIMELINE;
  const loading = false;

  const [category, setCategory] = useState<EventCategory>('all');

  const filtered = useMemo(() => {
    if (category === 'all') return allEvents;
    return allEvents.filter((e) => EVENT_CONFIG[e.event_type].category === category);
  }, [allEvents, category]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: { date: string; events: TimelineEvent[] }[] = [];
    let lastDate = '';
    for (const ev of filtered) {
      const date = ev.timestamp.split('T')[0];
      if (date !== lastDate) {
        groups.push({ date, events: [] });
        lastDate = date;
      }
      groups[groups.length - 1].events.push(ev);
    }
    return groups;
  }, [filtered]);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3" dir="rtl">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5">
            <ArrowRight className="h-4 w-4" />
            חזרה
          </Button>
          <Building2 className="h-5 w-5 text-blue-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">{client.company_name}</h1>
            <p className="text-sm text-gray-500">ח.פ. {client.tax_id} · ציר זמן פעילות</p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap" dir="rtl">
          <History className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">סינון:</span>
          {(Object.keys(CATEGORY_LABELS) as EventCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                'text-xs rounded-full px-3 py-1 border transition-colors',
                category === cat
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300',
              )}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
          <span className="text-xs text-gray-400 ms-auto">{filtered.length} אירועים</span>
        </div>

        {/* Timeline */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <History className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">אין אירועים לפי הסינון הנוכחי</p>
          </div>
        ) : (
          <Card className="border-gray-200">
            <CardContent className="pt-6 pb-2 px-6">
              {grouped.map(({ date, events }, gi) => (
                <div key={date}>
                  {/* Date separator */}
                  <div className="flex items-center gap-3 mb-4 mt-2" dir="rtl">
                    <div className="h-px bg-gray-100 flex-1" />
                    <span className="text-xs font-medium text-gray-400 bg-white px-2">
                      {formatIsraeliDate(date)}
                    </span>
                    <div className="h-px bg-gray-100 flex-1" />
                  </div>
                  {events.map((ev, i) => {
                    const isLastInGroup = i === events.length - 1;
                    const isLastGroup = gi === grouped.length - 1;
                    return (
                      <TimelineEventRow
                        key={ev.id}
                        event={ev}
                        isLast={isLastInGroup && isLastGroup}
                      />
                    );
                  })}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ClientTimelinePage;
