/**
 * Fee Tracking Filters Component
 * Unified filter bar for fee tracking page
 * Design pattern matches Collection Dashboard for consistency
 */

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FilterX } from 'lucide-react';
import type { TrackingFilter, FeeTrackingKPIs } from '@/types/fee-tracking.types';
import type { PaymentMethod } from '@/types/payment.types';
import { cn } from '@/lib/utils';

interface FeeTrackingFiltersProps {
  // Filter values
  statusFilter: TrackingFilter;
  yearFilter: number;
  paymentMethodFilter: PaymentMethod | 'all' | 'not_selected';
  searchQuery: string;

  // KPIs for showing counts in dropdown
  kpis: FeeTrackingKPIs | null;
  membersCount: number;

  // Available years
  availableYears: number[];

  // Handlers
  onStatusChange: (status: TrackingFilter) => void;
  onYearChange: (year: number) => void;
  onPaymentMethodChange: (method: PaymentMethod | 'all' | 'not_selected') => void;
  onSearchChange: (query: string) => void;
  onReset: () => void;
}

export const FeeTrackingFilters: React.FC<FeeTrackingFiltersProps> = ({
  statusFilter,
  yearFilter,
  paymentMethodFilter,
  searchQuery,
  kpis,
  membersCount,
  availableYears,
  onStatusChange,
  onYearChange,
  onPaymentMethodChange,
  onSearchChange,
  onReset,
}) => {
  // Check if any filter is active (not default)
  const hasActiveFilters =
    statusFilter !== 'all' ||
    paymentMethodFilter !== 'all' ||
    searchQuery.trim() !== '';

  return (
    <div className="flex flex-wrap items-center gap-2" dir="rtl">
      {/* Status Filter */}
      <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as TrackingFilter)}>
        <SelectTrigger className="h-8 w-auto min-w-[150px] text-xs border-gray-200 bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rtl:text-right">
          <SelectItem value="all">סטטוס: הכל ({kpis?.total_clients || 0})</SelectItem>
          <SelectItem value="not_calculated">לא חושב ({kpis?.not_calculated || 0})</SelectItem>
          <SelectItem value="calculated_not_sent">חושב, לא נשלח ({kpis?.calculated_not_sent || 0})</SelectItem>
          <SelectItem value="sent_not_paid">ממתין לתשלום ({kpis?.sent_not_paid || 0})</SelectItem>
          <SelectItem value="paid">שולם ({kpis?.paid || 0})</SelectItem>
          <SelectItem value="members">לא משלם ({membersCount})</SelectItem>
        </SelectContent>
      </Select>

      {/* Year Filter */}
      <Select value={yearFilter.toString()} onValueChange={(v) => onYearChange(parseInt(v))}>
        <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs border-gray-200 bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rtl:text-right">
          {availableYears.map((year) => (
            <SelectItem key={year} value={year.toString()}>
              שנת {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Payment Method Filter */}
      <Select
        value={paymentMethodFilter}
        onValueChange={(v) => onPaymentMethodChange(v as PaymentMethod | 'all' | 'not_selected')}
      >
        <SelectTrigger className="h-8 w-auto min-w-[130px] text-xs border-gray-200 bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rtl:text-right">
          <SelectItem value="all">תשלום: הכל</SelectItem>
          <SelectItem value="not_selected">לא נבחר</SelectItem>
          <SelectItem value="bank_transfer">העברה בנקאית</SelectItem>
          <SelectItem value="cc_single">כ.אשראי אחד</SelectItem>
          <SelectItem value="cc_installments">תשלומים</SelectItem>
          <SelectItem value="checks">צ'קים</SelectItem>
        </SelectContent>
      </Select>

      {/* Search Input */}
      <Input

        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="h-8 w-auto min-w-[200px] max-w-[300px] text-xs border-gray-200 bg-white"
      />

      {/* Reset Button (conditional) */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-8 px-2 text-xs text-gray-500 hover:text-gray-700"
        >
          <FilterX className="h-3.5 w-3.5 ml-1" />
          איפוס
        </Button>
      )}
    </div>
  );
};

FeeTrackingFilters.displayName = 'FeeTrackingFilters';
