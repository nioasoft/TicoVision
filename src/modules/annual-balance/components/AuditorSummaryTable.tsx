/**
 * AuditorSummaryTable - Cases grouped by auditor with status breakdown
 * Shows each auditor's total cases and mini badges per status
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { BALANCE_STATUSES, BALANCE_STATUS_CONFIG } from '../types/annual-balance.types';
import type { AuditorSummary } from '../types/annual-balance.types';

interface AuditorSummaryTableProps {
  auditors: AuditorSummary[];
  loading?: boolean;
}

export const AuditorSummaryTable: React.FC<AuditorSummaryTableProps> = ({
  auditors,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="text-right">מבקר</TableHead>
              <TableHead className="text-right w-[80px]">סה״כ</TableHead>
              {BALANCE_STATUSES.map((status) => (
                <TableHead key={status} className="text-center w-[80px]">
                  <span className="text-xs">{BALANCE_STATUS_CONFIG[status].label}</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(3)].map((_, i) => (
              <TableRow key={i}>
                {[...Array(10)].map((_, j) => (
                  <TableCell key={j}>
                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (auditors.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <p className="text-lg">אין מבקרים מוקצים</p>
        <p className="mt-2 text-sm">שייך מבקרים לתיקים כדי לראות את הסיכום</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="text-right">מבקר</TableHead>
            <TableHead className="text-right w-[80px]">סה״כ</TableHead>
            {BALANCE_STATUSES.map((status) => {
              const config = BALANCE_STATUS_CONFIG[status];
              return (
                <TableHead key={status} className="text-center w-[80px]">
                  <span className={cn('text-xs', config.color)}>{config.label}</span>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {auditors.map((auditor, index) => (
            <TableRow
              key={auditor.auditor_id}
              className={index % 2 === 0 ? 'bg-slate-50/50' : 'bg-white'}
            >
              <TableCell className="py-2.5 px-3 text-right text-sm font-medium">
                {auditor.auditor_email}
              </TableCell>
              <TableCell className="py-2.5 px-3 text-right text-sm font-bold">
                {auditor.total}
              </TableCell>
              {BALANCE_STATUSES.map((status) => {
                const count = auditor.byStatus[status] ?? 0;
                const config = BALANCE_STATUS_CONFIG[status];
                return (
                  <TableCell key={status} className="py-2.5 px-3 text-center">
                    {count > 0 ? (
                      <span
                        className={cn(
                          'inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium min-w-[24px]',
                          config.bgColor,
                          config.color
                        )}
                      >
                        {count}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">-</span>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
