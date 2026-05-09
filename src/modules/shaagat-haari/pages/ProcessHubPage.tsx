/**
 * Process Hub Page
 * Route: /shaagat-haari/process
 *
 * Visual 5-step process map for the Shaagat HaAri grant workflow.
 * Each card shows live KPIs and navigates to the relevant section.
 *
 * NOTE: Stats are stubbed — wire up via useShaagatStore() when ready.
 */

import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, Award } from 'lucide-react';
import { ProcessStepCard, type ProcessStepCardProps } from '../components/ProcessStepCard';
import { formatILSInteger } from '@/lib/formatters';
import { useShaagatStore } from '../store/shaagatStore';
import { countByStage, IN_PROCESS_STAGES } from '../lib/stage-derivation';

// ─────────────────────────────────────────────────────────────────────────────
// Stats shape used locally (some derived from rows, some from RPC)
// ─────────────────────────────────────────────────────────────────────────────

interface HubStats {
  total_clients: number;
  email_sent: number;
  feasibility_completed: number;
  eligible: number;
  fee_paid: number;
  calculation_completed: number;
  client_approved: number;
  submitted: number;
  in_review: number;
  advance_received: number;
  total_expected: number;
  total_received: number;
  open_objections: number;
  upcoming_deadlines: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Step definitions
// ─────────────────────────────────────────────────────────────────────────────

type StepDef = Omit<ProcessStepCardProps, 'onClick'> & { route: string };

function buildSteps(s: HubStats): StepDef[] {
  return [
    {
      step: 1,
      title: 'סינון ראשוני',
      description: 'מעבר על כל הלקוחות הפעילים, הזנת מחזור 03-04/26 מול 03-04/25, סיווג זכאי / תחום אפור / לא זכאי',
      icon: '📋',
      route: '/shaagat-haari',
      status: 'active',
      metrics: [
        { label: 'כל הלקוחות',     value: s.total_clients },
        { label: 'נשלח מייל',      value: s.email_sent, highlight: 'blue' },
        { label: 'ביצעו היתכנות',  value: s.feasibility_completed },
        { label: 'ביקשו טיפול',    value: s.eligible, highlight: 'green' },
      ],
      showArrow: true,
    },
    {
      step: 2,
      title: 'בדיקת זכאות מלאה',
      description: 'סיווג מסלול, נתונים מורחבים, שליחת מייל תוצאה',
      icon: '✅',
      route: '/shaagat-haari/eligibility',
      status: 'active',
      metrics: [
        { label: 'זכאים',         value: s.eligible,   highlight: 'green' },
        { label: 'לא זכאים',      value: Math.max(s.total_clients - s.eligible - 0, 0) },
        { label: 'תחום אפור',     value: 0, highlight: 'orange' },
        { label: 'שילמו שכ״ט',   value: s.fee_paid, highlight: 'blue' },
      ],
      showArrow: true,
    },
    {
      step: 3,
      title: 'חישוב מענק',
      description: 'איסוף נתוני שכר והוצאות, הפעלת מחשבון, שליחה ללקוח לאישור',
      icon: '🧮',
      route: '/shaagat-haari/calculations',
      status: 'active',
      metrics: [
        { label: 'נוצרו חישובים',   value: s.fee_paid },
        { label: 'הושלמו',          value: s.calculation_completed, highlight: 'blue' },
        { label: 'אישרו',           value: s.client_approved, highlight: 'green' },
        { label: 'צפי ממוצע',       value: `${formatILSInteger(s.total_expected / Math.max(s.calculation_completed, 1))}` },
      ],
      showArrow: true,
    },
    {
      step: 4,
      title: 'הגשה לרשות המסים',
      description: 'שידור מקוון, תיעוד מספר אישור וצילום, מעקב קבלת מקדמה',
      icon: '📋',
      route: '/shaagat-haari/submissions',
      status: s.submitted > 0 ? 'active' : 'pending',
      metrics: [
        { label: 'שודרו',            value: s.submitted, highlight: 'blue' },
        { label: 'בבדיקה',           value: s.in_review },
        { label: 'מקדמה התקבלה',    value: s.advance_received, highlight: 'green' },
        { label: 'דדליינים קרובים', value: s.upcoming_deadlines, highlight: s.upcoming_deadlines > 0 ? 'orange' : undefined },
      ],
      showArrow: true,
    },
    {
      step: 5,
      title: 'מעקב תשלומים',
      description: 'מעקב קבלת תשלום מלא, ניהול השגות וערעורים, סגירת תיק',
      icon: '💰',
      route: '/shaagat-haari/tracking',
      status: s.open_objections > 0 ? 'warning' : 'pending',
      metrics: [
        { label: 'צפי כולל',          value: formatILSInteger(s.total_expected) },
        { label: 'התקבל',             value: formatILSInteger(s.total_received), highlight: 'green' },
        { label: 'השגות פתוחות',      value: s.open_objections, highlight: s.open_objections > 0 ? 'red' : undefined },
        { label: 'תשלום מלא',        value: '—' },
      ],
      showArrow: false,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary bar
// ─────────────────────────────────────────────────────────────────────────────

const SummaryBar: React.FC<{ stats: HubStats }> = ({ stats }) => {
  const collectionRate =
    stats.total_expected > 0
      ? Math.round((stats.total_received / stats.total_expected) * 100)
      : 0;
  return (
    <Card className="border-gray-200">
      <CardContent className="py-3 px-4" dir="rtl">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">סה״כ מענקים צפויים:</span>
            <span className="font-bold text-blue-700 text-base tabular-nums">
              {formatILSInteger(stats.total_expected)}
            </span>
          </div>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2">
            <span className="text-gray-500">התקבל עד כה:</span>
            <span className="font-bold text-green-700 text-base tabular-nums">
              {formatILSInteger(stats.total_received)}
            </span>
          </div>
          <Separator orientation="vertical" className="h-5" />
          <div className="flex items-center gap-2">
            <span className="text-gray-500">שיעור גבייה:</span>
            <span className="font-bold text-gray-800 text-base">
              {collectionRate}%
            </span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs">
              {stats.submitted} לקוחות שודרו מתוך {stats.eligible} זכאים
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export const ProcessHubPage: React.FC = () => {
  const navigate = useNavigate();

  const initialFilterRows = useShaagatStore((s) => s.initialFilterRows);
  const fetchInitialFilterRows = useShaagatStore(
    (s) => s.fetchInitialFilterRows
  );

  useEffect(() => {
    void fetchInitialFilterRows();
  }, [fetchInitialFilterRows]);

  const stats = useMemo<HubStats>(() => {
    const counts = countByStage(initialFilterRows);
    const inProcess = [...IN_PROCESS_STAGES].reduce(
      (sum, stage) => sum + counts[stage],
      0
    );
    const advanceReceived = initialFilterRows.filter(
      (r) => r.advance_received === true
    ).length;
    const totalExpected = initialFilterRows.reduce(
      (sum, r) => sum + (r.expected_amount ?? 0),
      0
    );
    const totalReceived = initialFilterRows.reduce(
      (sum, r) => sum + (r.received_amount ?? 0),
      0
    );
    return {
      total_clients: initialFilterRows.length,
      email_sent: initialFilterRows.filter((r) => r.email_sent).length,
      feasibility_completed: counts.eligible_pending_email + counts.eligible_pending_form + inProcess,
      eligible:
        counts.eligible_pending_email +
        counts.eligible_pending_form +
        counts.pending_payment +
        counts.in_calculation +
        counts.awaiting_approval +
        counts.approved_pending_submission +
        counts.submitted +
        counts.paid_out,
      fee_paid:
        counts.in_calculation +
        counts.awaiting_approval +
        counts.approved_pending_submission +
        counts.submitted +
        counts.paid_out,
      calculation_completed:
        counts.awaiting_approval +
        counts.approved_pending_submission +
        counts.submitted +
        counts.paid_out,
      client_approved:
        counts.approved_pending_submission +
        counts.submitted +
        counts.paid_out,
      submitted: counts.submitted + counts.paid_out,
      in_review: initialFilterRows.filter(
        (r) => r.submission_status === 'IN_REVIEW'
      ).length,
      advance_received: advanceReceived,
      total_expected: totalExpected,
      total_received: totalReceived,
      open_objections: initialFilterRows.filter(
        (r) => r.submission_status === 'OBJECTIONS'
      ).length,
      // Pending deadlines is best shown when we wire submission deadline data;
      // for now, keep it 0 — the dashboard already surfaces the warning row by row.
      upcoming_deadlines: 0,
    };
  }, [initialFilterRows]);

  const steps = useMemo(() => buildSteps(stats), [stats]);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between" dir="rtl">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/shaagat-haari')}
              className="gap-1.5"
            >
              <ArrowRight className="h-4 w-4" />
              חזרה לדשבורד
            </Button>
            <Separator orientation="vertical" className="h-5" />
            <Award className="h-5 w-5 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">מפת תהליך — שאגת הארי</h1>
              <p className="text-sm text-gray-500">מעקב אחרי 5 שלבי התהליך עם KPIs עדכניים</p>
            </div>
          </div>
        </div>

        {/* Summary bar */}
        <SummaryBar stats={stats} />

        {/* Process steps — horizontal scrollable on mobile, grid on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {steps.map((step) => (
            <ProcessStepCard
              key={step.step}
              step={step.step}
              title={step.title}
              description={step.description}
              icon={step.icon}
              metrics={step.metrics}
              status={step.status}
              onClick={() => navigate(step.route)}
              showArrow={false}
            />
          ))}
        </div>

        {/* Flow arrows — desktop only */}
        <div className="hidden md:flex items-center justify-between px-4 -mt-1">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex-1 flex justify-center">
              <ArrowRight className="h-5 w-5 text-gray-300 rtl:rotate-180" />
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-gray-500" dir="rtl">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
            פעיל
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            הושלם
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
            דורש תשומת לב
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-300" />
            ממתין
          </span>
          <span className="ms-auto">לחיצה על כרטיס → מעבר לעמוד הרלוונטי</span>
        </div>
      </div>
    </div>
  );
};

export default ProcessHubPage;
