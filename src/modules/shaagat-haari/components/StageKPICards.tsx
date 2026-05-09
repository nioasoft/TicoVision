/**
 * StageKPICards
 *
 * Compact horizontal KPI bar above the unified clients table.
 * Replaces the busy GrantKPICards (3 rows of 4-cards each) with a single
 * scannable strip. Click a card to filter the table.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import {
  AlertOctagon,
  CheckCircle2,
  Clock,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  IN_PROCESS_STAGES,
  countByStage,
  type Stage,
} from '../lib/stage-derivation';
import type { InitialFilterRow } from '../services/shaagat.service';

export type KPICardKey =
  | 'all'
  | 'not_checked'
  | 'in_process'
  | 'submitted'
  | 'paid_out'
  | 'unpaid_retainer';

interface StageKPICardsProps {
  rows: InitialFilterRow[];
  selected: KPICardKey;
  onSelect: (key: KPICardKey) => void;
}

interface CardConfig {
  key: KPICardKey;
  label: string;
  icon: typeof Users;
  /** Tailwind classes when ACTIVE */
  activeClass: string;
  /** Tailwind classes when inactive (resting state) */
  iconClass: string;
}

const CARD_CONFIGS: CardConfig[] = [
  {
    key: 'all',
    label: 'כל הלקוחות',
    icon: Users,
    activeClass: 'border-gray-700 bg-gray-700 text-white',
    iconClass: 'text-gray-500',
  },
  {
    key: 'not_checked',
    label: 'טרם נבדקו',
    icon: Clock,
    activeClass: 'border-gray-600 bg-gray-600 text-white',
    iconClass: 'text-gray-500',
  },
  {
    key: 'in_process',
    label: 'בתהליך',
    icon: ShieldCheck,
    activeClass: 'border-blue-600 bg-blue-600 text-white',
    iconClass: 'text-blue-500',
  },
  {
    key: 'submitted',
    label: 'שודרו',
    icon: Send,
    activeClass: 'border-sky-600 bg-sky-600 text-white',
    iconClass: 'text-sky-500',
  },
  {
    key: 'paid_out',
    label: 'שולמו במלואם',
    icon: CheckCircle2,
    activeClass: 'border-green-700 bg-green-700 text-white',
    iconClass: 'text-green-600',
  },
  {
    key: 'unpaid_retainer',
    label: 'שכ״ט שנתי לא שולם',
    icon: AlertOctagon,
    activeClass: 'border-amber-600 bg-amber-600 text-white',
    iconClass: 'text-amber-500',
  },
];

function pickCount(
  key: KPICardKey,
  counts: Record<Stage, number>,
  totalRows: number,
  unpaidRetainer: number
): number {
  switch (key) {
    case 'all':
      return totalRows;
    case 'not_checked':
      return counts.not_checked;
    case 'in_process':
      return [...IN_PROCESS_STAGES].reduce(
        (sum, stage) => sum + counts[stage],
        0
      );
    case 'submitted':
      return counts.submitted;
    case 'paid_out':
      return counts.paid_out;
    case 'unpaid_retainer':
      return unpaidRetainer;
  }
}

export function StageKPICards({
  rows,
  selected,
  onSelect,
}: StageKPICardsProps) {
  const counts = React.useMemo(() => countByStage(rows), [rows]);
  const unpaidRetainer = React.useMemo(
    () => rows.filter((r) => r.has_unpaid_annual_retainer).length,
    [rows]
  );

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2"
      dir="rtl"
    >
      {CARD_CONFIGS.map((config) => {
        const isActive = selected === config.key;
        const count = pickCount(
          config.key,
          counts,
          rows.length,
          unpaidRetainer
        );
        const Icon = config.icon;
        return (
          <button
            type="button"
            key={config.key}
            onClick={() => onSelect(config.key)}
            className={cn(
              'flex flex-col items-start gap-1 rounded-lg border bg-white px-3 py-2.5 text-right transition-colors hover:bg-gray-50',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              isActive && config.activeClass,
              isActive && 'hover:bg-current'
            )}
          >
            <div className="flex items-center justify-between w-full">
              <Icon
                className={cn(
                  'h-4 w-4',
                  isActive ? 'text-white/80' : config.iconClass
                )}
              />
              <span
                className={cn(
                  'text-xs',
                  isActive ? 'text-white/80' : 'text-gray-500'
                )}
              >
                {config.label}
              </span>
            </div>
            <div
              className={cn(
                'text-2xl font-bold tabular-nums',
                isActive ? 'text-white' : 'text-gray-900'
              )}
            >
              {count}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default StageKPICards;
