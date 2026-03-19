/**
 * Process Hub Page
 * Route: /shaagat-haari/process
 *
 * Visual 5-step process map for the Shaagat HaAri grant workflow.
 * Each card shows live KPIs and navigates to the relevant section.
 *
 * NOTE: Stats are stubbed — wire up via useShaagatStore() when ready.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, Award } from 'lucide-react';
import { ProcessStepCard, type ProcessStepCardProps } from '../components/ProcessStepCard';
import { formatILSInteger } from '@/lib/formatters';

// ─────────────────────────────────────────────────────────────────────────────
// Mock stats — replace with useShaagatStore() when ready
// ─────────────────────────────────────────────────────────────────────────────

const MOCK = {
  total_clients: 87,
  email_sent: 72,
  feasibility_completed: 54,
  eligible: 41,
  fee_paid: 38,
  calculation_completed: 29,
  client_approved: 24,
  submitted: 18,
  in_review: 12,
  advance_received: 7,
  total_expected: 4_230_000,
  total_received: 1_150_000,
  open_objections: 2,
  upcoming_deadlines: 5,
};

// ─────────────────────────────────────────────────────────────────────────────
// Step definitions
// ─────────────────────────────────────────────────────────────────────────────

type StepDef = Omit<ProcessStepCardProps, 'onClick'> & { route: string };

function buildSteps(): StepDef[] {
  return [
    {
      step: 1,
      title: 'גיוס וסריקה',
      description: 'שליחת מיילים ללקוחות, איסוף נתוני היתכנות ראשוניים, בדיקת רלוונטיות',
      icon: '📧',
      route: '/shaagat-haari?step=outreach',
      status: 'active',
      metrics: [
        { label: 'כל הלקוחות',     value: MOCK.total_clients },
        { label: 'נשלח מייל',      value: MOCK.email_sent, highlight: 'blue' },
        { label: 'ביצעו היתכנות',  value: MOCK.feasibility_completed },
        { label: 'ביקשו טיפול',    value: MOCK.eligible, highlight: 'green' },
      ],
      showArrow: true,
    },
    {
      step: 2,
      title: 'בדיקת זכאות',
      description: 'סיווג עסק, הזנת מחזורים, בדיקת סף ירידה, שליחת מייל תוצאה',
      icon: '✅',
      route: '/shaagat-haari/eligibility',
      status: 'active',
      metrics: [
        { label: 'זכאים',         value: MOCK.eligible,   highlight: 'green' },
        { label: 'לא זכאים',      value: MOCK.total_clients - MOCK.eligible - 8 },
        { label: 'תחום אפור',     value: 8, highlight: 'orange' },
        { label: 'שילמו שכ״ט',   value: MOCK.fee_paid, highlight: 'blue' },
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
        { label: 'נוצרו חישובים',   value: MOCK.fee_paid },
        { label: 'הושלמו',          value: MOCK.calculation_completed, highlight: 'blue' },
        { label: 'אישרו',           value: MOCK.client_approved, highlight: 'green' },
        { label: 'צפי ממוצע',       value: `${formatILSInteger(MOCK.total_expected / MOCK.calculation_completed || 1)}` },
      ],
      showArrow: true,
    },
    {
      step: 4,
      title: 'הגשה לרשות המסים',
      description: 'שידור מקוון, תיעוד מספר אישור וצילום, מעקב קבלת מקדמה',
      icon: '📋',
      route: '/shaagat-haari/submissions',
      status: MOCK.submitted > 0 ? 'active' : 'pending',
      metrics: [
        { label: 'שודרו',            value: MOCK.submitted, highlight: 'blue' },
        { label: 'בבדיקה',           value: MOCK.in_review },
        { label: 'מקדמה התקבלה',    value: MOCK.advance_received, highlight: 'green' },
        { label: 'דדליינים קרובים', value: MOCK.upcoming_deadlines, highlight: MOCK.upcoming_deadlines > 0 ? 'orange' : undefined },
      ],
      showArrow: true,
    },
    {
      step: 5,
      title: 'מעקב תשלומים',
      description: 'מעקב קבלת תשלום מלא, ניהול השגות וערעורים, סגירת תיק',
      icon: '💰',
      route: '/shaagat-haari/tracking',
      status: MOCK.open_objections > 0 ? 'warning' : 'pending',
      metrics: [
        { label: 'צפי כולל',          value: formatILSInteger(MOCK.total_expected) },
        { label: 'התקבל',             value: formatILSInteger(MOCK.total_received), highlight: 'green' },
        { label: 'השגות פתוחות',      value: MOCK.open_objections, highlight: MOCK.open_objections > 0 ? 'red' : undefined },
        { label: 'תשלום מלא',        value: '—' },
      ],
      showArrow: false,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary bar
// ─────────────────────────────────────────────────────────────────────────────

const SummaryBar: React.FC = () => (
  <Card className="border-gray-200">
    <CardContent className="py-3 px-4" dir="rtl">
      <div className="flex flex-wrap items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">סה״כ מענקים צפויים:</span>
          <span className="font-bold text-blue-700 text-base tabular-nums">
            {formatILSInteger(MOCK.total_expected)}
          </span>
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2">
          <span className="text-gray-500">התקבל עד כה:</span>
          <span className="font-bold text-green-700 text-base tabular-nums">
            {formatILSInteger(MOCK.total_received)}
          </span>
        </div>
        <Separator orientation="vertical" className="h-5" />
        <div className="flex items-center gap-2">
          <span className="text-gray-500">שיעור גבייה:</span>
          <span className="font-bold text-gray-800 text-base">
            {Math.round((MOCK.total_received / MOCK.total_expected) * 100)}%
          </span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-xs">
            {MOCK.submitted} לקוחות שודרו מתוך {MOCK.eligible} זכאים
          </span>
        </div>
      </div>
    </CardContent>
  </Card>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export const ProcessHubPage: React.FC = () => {
  const navigate = useNavigate();
  const steps = buildSteps();

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
        <SummaryBar />

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
