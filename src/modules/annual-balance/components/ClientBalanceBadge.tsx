/**
 * ClientBalanceBadge - Small color badge for client card/list
 * Fetches current year balance status for a client and displays it.
 * Click navigates to the annual balance page filtered by client.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { annualBalanceService } from '../services/annual-balance.service';
import { BALANCE_STATUS_CONFIG } from '../types/annual-balance.types';
import type { BalanceStatus, AnnualBalanceSheet } from '../types/annual-balance.types';

interface ClientBalanceBadgeProps {
  clientId: string;
  year?: number;
  className?: string;
}

export function ClientBalanceBadge({ clientId, year, className }: ClientBalanceBadgeProps) {
  const navigate = useNavigate();
  const currentYear = year ?? new Date().getFullYear();
  const [record, setRecord] = useState<AnnualBalanceSheet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchStatus = async () => {
      setLoading(true);
      const result = await annualBalanceService.getByClientId(clientId);
      if (cancelled) return;

      if (result.data) {
        // Find the record for the current year
        const yearRecord = result.data.find((r) => r.year === currentYear);
        setRecord(yearRecord ?? null);
      }
      setLoading(false);
    };

    fetchStatus();
    return () => { cancelled = true; };
  }, [clientId, currentYear]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/annual-balance?client_id=${clientId}`);
  };

  if (loading) {
    return <Loader2 className={cn('h-3 w-3 animate-spin text-gray-400', className)} />;
  }

  if (!record) {
    return <span className={cn('text-xs text-gray-400', className)}>-</span>;
  }

  const config = BALANCE_STATUS_CONFIG[record.status as BalanceStatus];

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap',
        'cursor-pointer hover:opacity-80 transition-opacity',
        config.bgColor,
        config.color,
        className
      )}
      title={`מאזן ${currentYear}: ${config.label}`}
    >
      {config.label}
    </button>
  );
}
