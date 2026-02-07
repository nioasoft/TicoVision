/**
 * AuditorSummaryTable - Card-based auditor summary with avatars and mini stacked bars
 * Each auditor gets a card with case count, progress bar, and status chips
 */

import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';
import { BALANCE_STATUSES, BALANCE_STATUS_CONFIG, STATUS_BAR_COLORS } from '../types/annual-balance.types';
import type { AuditorSummary } from '../types/annual-balance.types';

interface AuditorSummaryTableProps {
  auditors: AuditorSummary[];
  loading?: boolean;
}

const VISIBLE_STATUSES = BALANCE_STATUSES.filter((s) => s !== 'office_approved');

/** Extract initials from email */
function getInitials(email: string): string {
  const name = email.split('@')[0];
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Extract username from email */
function getUsername(email: string): string {
  return email.split('@')[0];
}

export const AuditorSummaryTable: React.FC<AuditorSummaryTableProps> = ({
  auditors,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (auditors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <div className="rounded-full bg-muted/40 p-4 mb-4">
          <Users className="h-8 w-8" />
        </div>
        <p className="text-lg font-medium">אין מבקרים מוקצים</p>
        <p className="mt-1 text-sm">שייך מבקרים לתיקים כדי לראות את הסיכום</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4" dir="rtl">
      {auditors.map((auditor) => (
        <div
          key={auditor.auditor_id}
          className="rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow"
        >
          {/* Header: avatar + name + count */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                  {getInitials(auditor.auditor_email)}
                </AvatarFallback>
              </Avatar>
              <div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-sm font-medium cursor-default">
                      {getUsername(auditor.auditor_email)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {auditor.auditor_email}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            <span className="text-sm font-bold tabular-nums">{auditor.total} תיקים</span>
          </div>

          {/* Mini stacked progress bar */}
          {auditor.total > 0 && (
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/30 mb-3">
              {VISIBLE_STATUSES.map((status) => {
                const count = auditor.byStatus[status] ?? 0;
                if (count === 0) return null;
                const pct = (count / auditor.total) * 100;
                const config = BALANCE_STATUS_CONFIG[status];
                return (
                  <Tooltip key={status}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn('h-full', STATUS_BAR_COLORS[status])}
                        style={{ width: `${pct}%` }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {config.label}: {count}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}

          {/* Status count chips (only non-zero) */}
          <div className="flex flex-wrap gap-1.5">
            {VISIBLE_STATUSES.map((status) => {
              const count = auditor.byStatus[status] ?? 0;
              if (count === 0) return null;
              const config = BALANCE_STATUS_CONFIG[status];
              return (
                <span
                  key={status}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium',
                    config.bgColor,
                    config.color
                  )}
                >
                  {config.label}
                  <span className="font-bold tabular-nums">{count}</span>
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
