/**
 * Process Step Card
 * Reusable visual card for the Process Hub page — shows a step in the grant workflow
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ProcessStepStatus = 'active' | 'completed' | 'pending' | 'warning';

export interface ProcessStepMetric {
  label: string;
  value: string | number;
  highlight?: 'green' | 'blue' | 'orange' | 'red';
}

export interface ProcessStepCardProps {
  step: number;
  title: string;
  description: string;
  icon: string;
  metrics: ProcessStepMetric[];
  status?: ProcessStepStatus;
  onClick?: () => void;
  showArrow?: boolean;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Status config
// ─────────────────────────────────────────────────────────────────────────────

const statusConfig: Record<ProcessStepStatus, {
  border: string;
  headerBg: string;
  badge: string;
  badgeLabel: string;
  ring: string;
}> = {
  active: {
    border: 'border-blue-200',
    headerBg: 'bg-blue-50',
    badge: 'bg-blue-100 text-blue-700',
    badgeLabel: 'פעיל',
    ring: 'ring-blue-400',
  },
  completed: {
    border: 'border-green-200',
    headerBg: 'bg-green-50',
    badge: 'bg-green-100 text-green-700',
    badgeLabel: 'הושלם',
    ring: 'ring-green-400',
  },
  pending: {
    border: 'border-gray-200',
    headerBg: 'bg-gray-50',
    badge: 'bg-gray-100 text-gray-600',
    badgeLabel: 'ממתין',
    ring: 'ring-gray-300',
  },
  warning: {
    border: 'border-orange-200',
    headerBg: 'bg-orange-50',
    badge: 'bg-orange-100 text-orange-700',
    badgeLabel: 'דורש תשומת לב',
    ring: 'ring-orange-400',
  },
};

const highlightClasses: Record<NonNullable<ProcessStepMetric['highlight']>, string> = {
  green:  'text-green-700 font-bold',
  blue:   'text-blue-700 font-bold',
  orange: 'text-orange-700 font-bold',
  red:    'text-red-700 font-bold',
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const ProcessStepCard: React.FC<ProcessStepCardProps> = ({
  step,
  title,
  description,
  icon,
  metrics,
  status = 'pending',
  onClick,
  showArrow = false,
  className,
}) => {
  const config = statusConfig[status];
  const isClickable = Boolean(onClick);

  return (
    <div className="flex items-center gap-1">
      <Card
        className={cn(
          'flex-1 border transition-all',
          config.border,
          isClickable && 'cursor-pointer hover:shadow-md',
          className,
        )}
        onClick={onClick}
      >
        {/* Header */}
        <div className={cn('px-4 py-2.5 rounded-t-lg flex items-center justify-between gap-2', config.headerBg)} dir="rtl">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">{icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono">שלב {step}</span>
                <span className={cn('text-xs rounded-full px-2 py-0.5 font-medium', config.badge)}>
                  {config.badgeLabel}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm leading-tight">{title}</h3>
            </div>
          </div>
          {isClickable && (
            <ArrowLeft className="h-4 w-4 text-gray-400 flex-shrink-0 rtl:rotate-180" />
          )}
        </div>

        {/* Body */}
        <CardContent className="px-4 py-3 space-y-2" dir="rtl">
          <p className="text-xs text-gray-500 leading-relaxed">{description}</p>

          {/* Metrics grid */}
          {metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1 border-t border-gray-100">
              {metrics.map((metric, idx) => (
                <div key={idx} className="flex items-center justify-between gap-1 min-w-0">
                  <span className="text-xs text-gray-500 truncate">{metric.label}</span>
                  <span className={cn(
                    'text-sm tabular-nums flex-shrink-0',
                    metric.highlight ? highlightClasses[metric.highlight] : 'text-gray-800 font-semibold',
                  )}>
                    {metric.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Arrow between steps */}
      {showArrow && (
        <div className="flex-shrink-0 text-gray-300 px-0.5 rtl:rotate-180">
          <ArrowLeft className="h-5 w-5" />
        </div>
      )}
    </div>
  );
};

ProcessStepCard.displayName = 'ProcessStepCard';
