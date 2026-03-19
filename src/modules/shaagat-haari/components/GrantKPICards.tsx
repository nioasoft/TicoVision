/**
 * Grant KPI Cards
 * Funnel KPI display for Shaagat HaAri dashboard — 4 rows
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Mail,
  CheckCircle2,
  Award,
  CreditCard,
  Calculator,
  ThumbsUp,
  Send,
  TrendingUp,
  Wallet,
  AlertTriangle,
  BanknoteIcon,
  FileSearch,
} from 'lucide-react';
import { formatILSInteger, formatNumber } from '@/lib/formatters';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GrantDashboardStats {
  // Funnel row 1
  total_clients: number;
  email_sent: number;
  requested_check: number;
  eligible: number;
  // Funnel row 2
  fee_paid: number;
  calculation_completed: number;
  client_approved: number;
  submitted: number;
  // Money row 3
  total_expected_grants: number;
  total_received_grants: number;
  // Alerts row 4
  upcoming_deadlines: number;
  unpaid_advances: number;
  open_objections: number;
}

export type GrantKPIFilter =
  | 'all'
  | 'email_sent'
  | 'requested_check'
  | 'eligible'
  | 'fee_paid'
  | 'calculation_completed'
  | 'client_approved'
  | 'submitted'
  | 'upcoming_deadlines'
  | 'unpaid_advances'
  | 'open_objections';

interface GrantKPICardsProps {
  stats: GrantDashboardStats;
  loading?: boolean;
  selectedFilter?: GrantKPIFilter;
  onFilterClick?: (filter: GrantKPIFilter) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

interface FunnelCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: 'blue' | 'indigo' | 'violet' | 'green' | 'teal' | 'cyan' | 'emerald' | 'sky';
  isSelected: boolean;
  onClick: () => void;
  showArrow?: boolean;
}

const colorMap = {
  blue:    { border: 'border-blue-200',    bg: 'bg-blue-50',    text: 'text-blue-700',    icon: 'text-blue-500',    ring: 'ring-blue-400'    },
  indigo:  { border: 'border-indigo-200',  bg: 'bg-indigo-50',  text: 'text-indigo-700',  icon: 'text-indigo-500',  ring: 'ring-indigo-400'  },
  violet:  { border: 'border-violet-200',  bg: 'bg-violet-50',  text: 'text-violet-700',  icon: 'text-violet-500',  ring: 'ring-violet-400'  },
  green:   { border: 'border-green-200',   bg: 'bg-green-50',   text: 'text-green-700',   icon: 'text-green-500',   ring: 'ring-green-400'   },
  teal:    { border: 'border-teal-200',    bg: 'bg-teal-50',    text: 'text-teal-700',    icon: 'text-teal-500',    ring: 'ring-teal-400'    },
  cyan:    { border: 'border-cyan-200',    bg: 'bg-cyan-50',    text: 'text-cyan-700',    icon: 'text-cyan-500',    ring: 'ring-cyan-400'    },
  emerald: { border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'text-emerald-500', ring: 'ring-emerald-400' },
  sky:     { border: 'border-sky-200',     bg: 'bg-sky-50',     text: 'text-sky-700',     icon: 'text-sky-500',     ring: 'ring-sky-400'     },
};

const FunnelCard: React.FC<FunnelCardProps> = ({
  label,
  value,
  icon: Icon,
  color,
  isSelected,
  onClick,
  showArrow = false,
}) => {
  const c = colorMap[color];
  return (
    <div className="flex items-center">
      <Card
        className={cn(
          'cursor-pointer transition-all border hover:shadow-md flex-1',
          c.border,
          isSelected && `ring-2 ring-offset-1 ${c.ring} ${c.bg}`,
        )}
        onClick={onClick}
      >
        <CardContent className="py-2 px-3 flex items-center justify-between gap-2" dir="rtl">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className={cn('h-4 w-4 flex-shrink-0', c.icon)} />
            <span className="text-xs font-medium text-gray-600 truncate">{label}</span>
          </div>
          <span className={cn('text-lg font-bold tabular-nums flex-shrink-0', c.text)}>
            {formatNumber(value)}
          </span>
        </CardContent>
      </Card>
      {showArrow && (
        <span className="text-gray-300 text-sm px-0.5 flex-shrink-0">‹</span>
      )}
    </div>
  );
};

interface MoneyCardProps {
  label: string;
  amount: number;
  icon: React.ElementType;
  valueColor: string;
  iconColor: string;
}

const MoneyCard: React.FC<MoneyCardProps> = ({ label, amount, icon: Icon, valueColor, iconColor }) => (
  <Card className="border-gray-200 flex-1">
    <CardContent className="py-3 px-4 flex items-center justify-between gap-3" dir="rtl">
      <div className="flex items-center gap-2">
        <Icon className={cn('h-5 w-5', iconColor)} />
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className={cn('text-xl font-bold tabular-nums', valueColor)}>
        {formatILSInteger(amount)}
      </span>
    </CardContent>
  </Card>
);

interface AlertCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: 'yellow' | 'orange' | 'red';
  isSelected: boolean;
  onClick: () => void;
}

const alertColorMap = {
  yellow: { border: 'border-yellow-200', bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'text-yellow-500', ring: 'ring-yellow-400' },
  orange: { border: 'border-orange-200', bg: 'bg-orange-50', text: 'text-orange-700', icon: 'text-orange-500', ring: 'ring-orange-400' },
  red:    { border: 'border-red-200',    bg: 'bg-red-50',    text: 'text-red-700',    icon: 'text-red-500',    ring: 'ring-red-400'    },
};

const AlertCard: React.FC<AlertCardProps> = ({ label, value, icon: Icon, color, isSelected, onClick }) => {
  const c = alertColorMap[color];
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all border hover:shadow-md flex-1',
        c.border,
        isSelected && `ring-2 ring-offset-1 ${c.ring} ${c.bg}`,
        value > 0 && 'cursor-pointer',
      )}
      onClick={onClick}
    >
      <CardContent className="py-2 px-3 flex items-center justify-between gap-2" dir="rtl">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', c.icon)} />
          <span className="text-xs font-medium text-gray-600">{label}</span>
        </div>
        <span className={cn('text-base font-bold tabular-nums', value > 0 ? c.text : 'text-gray-400')}>
          {formatNumber(value)}
        </span>
      </CardContent>
    </Card>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Loading skeleton
// ─────────────────────────────────────────────────────────────────────────────

const KPISkeleton: React.FC = () => (
  <div className="space-y-2">
    {[...Array(4)].map((_, row) => (
      <div key={row} className="flex gap-2">
        {[...Array(row === 2 ? 2 : row === 3 ? 3 : 4)].map((_, col) => (
          <Skeleton key={col} className="h-12 flex-1 rounded-lg" />
        ))}
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export const GrantKPICards: React.FC<GrantKPICardsProps> = ({
  stats,
  loading = false,
  selectedFilter = 'all',
  onFilterClick,
}) => {
  if (loading) return <KPISkeleton />;

  const handle = (filter: GrantKPIFilter) => () => onFilterClick?.(filter);

  return (
    <div className="space-y-2" dir="rtl">
      {/* Row 1: Funnel — Outreach */}
      <div className="flex gap-1.5 items-center">
        <FunnelCard
          label="כל הלקוחות"
          value={stats.total_clients}
          icon={Users}
          color="blue"
          isSelected={selectedFilter === 'all'}
          onClick={handle('all')}
          showArrow
        />
        <FunnelCard
          label="נשלח מייל"
          value={stats.email_sent}
          icon={Mail}
          color="indigo"
          isSelected={selectedFilter === 'email_sent'}
          onClick={handle('email_sent')}
          showArrow
        />
        <FunnelCard
          label="ביקשו בדיקה"
          value={stats.requested_check}
          icon={FileSearch}
          color="violet"
          isSelected={selectedFilter === 'requested_check'}
          onClick={handle('requested_check')}
          showArrow
        />
        <FunnelCard
          label="זכאים"
          value={stats.eligible}
          icon={CheckCircle2}
          color="green"
          isSelected={selectedFilter === 'eligible'}
          onClick={handle('eligible')}
        />
      </div>

      {/* Row 2: Funnel — Processing */}
      <div className="flex gap-1.5 items-center">
        <FunnelCard
          label="שילמו שכ״ט"
          value={stats.fee_paid}
          icon={CreditCard}
          color="teal"
          isSelected={selectedFilter === 'fee_paid'}
          onClick={handle('fee_paid')}
          showArrow
        />
        <FunnelCard
          label="חישוב הושלם"
          value={stats.calculation_completed}
          icon={Calculator}
          color="cyan"
          isSelected={selectedFilter === 'calculation_completed'}
          onClick={handle('calculation_completed')}
          showArrow
        />
        <FunnelCard
          label="אישרו"
          value={stats.client_approved}
          icon={ThumbsUp}
          color="sky"
          isSelected={selectedFilter === 'client_approved'}
          onClick={handle('client_approved')}
          showArrow
        />
        <FunnelCard
          label="שודרו"
          value={stats.submitted}
          icon={Send}
          color="emerald"
          isSelected={selectedFilter === 'submitted'}
          onClick={handle('submitted')}
        />
      </div>

      {/* Row 3: Money totals */}
      <div className="flex gap-1.5">
        <MoneyCard
          label="סה״כ מענקים צפויים"
          amount={stats.total_expected_grants}
          icon={TrendingUp}
          iconColor="text-blue-500"
          valueColor="text-blue-700"
        />
        <MoneyCard
          label="סה״כ התקבלו"
          amount={stats.total_received_grants}
          icon={Wallet}
          iconColor="text-green-500"
          valueColor="text-green-700"
        />
      </div>

      {/* Row 4: Alerts */}
      <div className="flex gap-1.5">
        <AlertCard
          label="דדליינים קרובים"
          value={stats.upcoming_deadlines}
          icon={AlertTriangle}
          color="yellow"
          isSelected={selectedFilter === 'upcoming_deadlines'}
          onClick={handle('upcoming_deadlines')}
        />
        <AlertCard
          label="מקדמות שטרם שולמו"
          value={stats.unpaid_advances}
          icon={BanknoteIcon}
          color="orange"
          isSelected={selectedFilter === 'unpaid_advances'}
          onClick={handle('unpaid_advances')}
        />
        <AlertCard
          label="השגות פתוחות"
          value={stats.open_objections}
          icon={Award}
          color="red"
          isSelected={selectedFilter === 'open_objections'}
          onClick={handle('open_objections')}
        />
      </div>
    </div>
  );
};

GrantKPICards.displayName = 'GrantKPICards';
