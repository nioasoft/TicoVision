/**
 * Deadline Timeline
 * Visual timeline of all legal deadlines for a tax submission.
 * Shows 21/150/240 days milestones with urgency color coding.
 */

import React from 'react';
import { CheckCircle2, Clock, AlertCircle, Circle } from 'lucide-react';
import { formatIsraeliDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SubmissionDeadlines {
  submission_date: string | null;
  documents_due_date: string | null;     // +30 days
  advance_due_date: string | null;       // +21 days — מקדמה 60%
  determination_due_date: string | null; // +150 days
  full_payment_due_date: string | null;  // +8 months
  objection_due_date: string | null;     // +90 days from determination
  advance_received: boolean;
  advance_received_at: string | null;
}

interface DeadlineMilestone {
  label: string;
  sublabel: string;
  date: string | null;
  completed: boolean;
  completedAt?: string | null;
  daysFromSubmission: number;
}

interface DeadlineTimelineProps {
  deadlines: SubmissionDeadlines;
  compact?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Urgency helpers
// ─────────────────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

type Urgency = 'overdue' | 'critical' | 'warning' | 'upcoming' | 'future' | 'done';

function getUrgency(date: string | null, completed: boolean): Urgency {
  if (completed) return 'done';
  const days = daysUntil(date);
  if (days === null) return 'future';
  if (days < 0)   return 'overdue';
  if (days <= 7)  return 'critical';
  if (days <= 21) return 'warning';
  if (days <= 45) return 'upcoming';
  return 'future';
}

const URGENCY_STYLES: Record<Urgency, { dot: string; text: string; badge: string }> = {
  done:     { dot: 'bg-green-500',  text: 'text-green-700',  badge: 'bg-green-100 text-green-700' },
  overdue:  { dot: 'bg-red-500',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700' },
  critical: { dot: 'bg-red-400',    text: 'text-red-600',    badge: 'bg-red-50 text-red-600' },
  warning:  { dot: 'bg-orange-400', text: 'text-orange-600', badge: 'bg-orange-50 text-orange-600' },
  upcoming: { dot: 'bg-yellow-400', text: 'text-yellow-600', badge: 'bg-yellow-50 text-yellow-600' },
  future:   { dot: 'bg-gray-300',   text: 'text-gray-400',   badge: 'bg-gray-50 text-gray-500' },
};

function UrgencyDayLabel({ date, completed }: { date: string | null; completed: boolean }) {
  if (completed) return <CheckCircle2 className="h-3.5 w-3.5 text-green-600 inline" />;
  const days = daysUntil(date);
  if (days === null) return <span className="text-xs text-gray-400">—</span>;
  if (days < 0) return <span className="text-xs font-semibold text-red-600">פג לפני {Math.abs(days)} ימים</span>;
  if (days === 0) return <span className="text-xs font-semibold text-red-600">היום!</span>;
  return <span className="text-xs font-medium text-gray-500">{days} ימים</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Milestone row
// ─────────────────────────────────────────────────────────────────────────────

const MilestoneRow: React.FC<{
  milestone: DeadlineMilestone;
  isLast: boolean;
}> = ({ milestone, isLast }) => {
  const urgency = getUrgency(milestone.date, milestone.completed);
  const styles = URGENCY_STYLES[urgency];

  return (
    <div className="flex gap-3" dir="rtl">
      {/* Timeline spine */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={cn('w-3 h-3 rounded-full mt-0.5 flex-shrink-0 ring-2 ring-white', styles.dot)} />
        {!isLast && <div className="w-0.5 bg-gray-200 flex-1 mt-1 min-h-[20px]" />}
      </div>

      {/* Content */}
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <span className={cn('text-sm font-medium', styles.text)}>{milestone.label}</span>
            <span className="text-xs text-gray-400 ms-1">+{milestone.daysFromSubmission}י׳</span>
            <p className="text-xs text-gray-500 mt-0.5">{milestone.sublabel}</p>
          </div>
          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
            {milestone.date && (
              <span className="text-xs text-gray-600">{formatIsraeliDate(milestone.date)}</span>
            )}
            <UrgencyDayLabel date={milestone.date} completed={milestone.completed} />
          </div>
        </div>
        {milestone.completed && milestone.completedAt && (
          <p className="text-xs text-green-600 mt-0.5">הושלם: {formatIsraeliDate(milestone.completedAt)}</p>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export const DeadlineTimeline: React.FC<DeadlineTimelineProps> = ({ deadlines, compact = false }) => {
  const milestones: DeadlineMilestone[] = [
    {
      label: 'מקדמה 60%',
      sublabel: 'מקדמה ראשונית מרשות המסים',
      date: deadlines.advance_due_date,
      completed: deadlines.advance_received,
      completedAt: deadlines.advance_received_at,
      daysFromSubmission: 21,
    },
    {
      label: 'הגשת מסמכים',
      sublabel: 'מסמכים נדרשים להגשה',
      date: deadlines.documents_due_date,
      completed: false,
      daysFromSubmission: 30,
    },
    {
      label: 'קביעת זכאות',
      sublabel: 'החלטה על אחוז הפיצוי',
      date: deadlines.determination_due_date,
      completed: false,
      daysFromSubmission: 150,
    },
    {
      label: 'תשלום מלא',
      sublabel: 'קבלת סכום הפיצוי המלא',
      date: deadlines.full_payment_due_date,
      completed: false,
      daysFromSubmission: 240,
    },
  ];

  if (deadlines.objection_due_date) {
    milestones.push({
      label: 'מועד הגשת השגה',
      sublabel: '90 ימים מהחלטת הרשות',
      date: deadlines.objection_due_date,
      completed: false,
      daysFromSubmission: 240,
    });
  }

  if (compact) {
    // Compact: show only upcoming/overdue items
    const now = Date.now();
    const relevant = milestones.filter((m) => {
      if (m.completed) return false;
      if (!m.date) return false;
      return new Date(m.date).getTime() - now < 60 * 24 * 60 * 60 * 1000; // within 60 days
    });

    if (relevant.length === 0) return null;

    return (
      <div className="space-y-1" dir="rtl">
        {relevant.map((m, i) => {
          const urgency = getUrgency(m.date, m.completed);
          const styles = URGENCY_STYLES[urgency];
          const days = daysUntil(m.date);
          return (
            <div key={i} className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs', styles.badge)}>
              <AlertCircle className="h-3 w-3" />
              {m.label}: {days !== null && days < 0 ? `פג` : `${days}י׳`}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div dir="rtl" className="py-2">
      {deadlines.submission_date && (
        <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
          <Circle className="h-3 w-3 text-blue-500 fill-blue-500" />
          <span className="font-medium text-gray-700">תאריך שידור:</span>
          <span>{formatIsraeliDate(deadlines.submission_date)}</span>
        </div>
      )}
      <div>
        {milestones.map((m, i) => (
          <MilestoneRow key={i} milestone={m} isLast={i === milestones.length - 1} />
        ))}
      </div>
    </div>
  );
};

DeadlineTimeline.displayName = 'DeadlineTimeline';
