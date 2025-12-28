/**
 * Penalty Status Badge Component
 * Displays penalty status with colored badge
 */

import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertCircle,
  Scale,
  XCircle,
  CheckCircle,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PenaltyStatus } from '@/types/capital-declaration.types';
import {
  PENALTY_STATUS_LABELS,
  PENALTY_STATUS_COLORS,
} from '@/types/capital-declaration.types';

interface PenaltyStatusBadgeProps {
  status: PenaltyStatus;
  amount?: number | null;
  onStatusChange?: (status: PenaltyStatus) => void;
  editable?: boolean;
  showAmount?: boolean;
  size?: 'sm' | 'default';
}

const PENALTY_STATUS_ICONS: Record<PenaltyStatus, React.ReactNode> = {
  received: <AlertCircle className="h-3 w-3" />,
  appeal_submitted: <Scale className="h-3 w-3" />,
  cancelled: <XCircle className="h-3 w-3" />,
  paid_by_client: <CheckCircle className="h-3 w-3" />,
  paid_by_office: <Building2 className="h-3 w-3" />,
};

export function PenaltyStatusBadge({
  status,
  amount,
  onStatusChange,
  editable = false,
  showAmount = false,
  size = 'default',
}: PenaltyStatusBadgeProps) {
  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 cursor-default transition-colors',
        PENALTY_STATUS_COLORS[status],
        editable && 'cursor-pointer hover:opacity-80',
        size === 'sm' && 'text-xs px-1.5 py-0.5'
      )}
    >
      {PENALTY_STATUS_ICONS[status]}
      <span>{PENALTY_STATUS_LABELS[status]}</span>
      {showAmount && amount != null && (
        <span className="font-medium">{formatAmount(amount)}</span>
      )}
      {editable && <ChevronDown className="h-3 w-3 opacity-50" />}
    </Badge>
  );

  if (!editable || !onStatusChange) {
    return badge;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{badge}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="rtl:text-right">
        {(
          [
            'received',
            'appeal_submitted',
            'cancelled',
            'paid_by_client',
            'paid_by_office',
          ] as PenaltyStatus[]
        ).map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => onStatusChange(s)}
            className={cn(
              'gap-2 rtl:flex-row-reverse',
              status === s && 'bg-accent'
            )}
          >
            {PENALTY_STATUS_ICONS[s]}
            <span>{PENALTY_STATUS_LABELS[s]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
