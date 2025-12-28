/**
 * Collection Filters Component
 * Compact inline filters for status, payment method, time range, amount, and alerts
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilterX } from 'lucide-react';
import type { CollectionFilters } from '@/types/collection.types';

interface CollectionFiltersProps {
  filters: CollectionFilters;
  onFiltersChange: (filters: Partial<CollectionFilters>) => void;
  onReset: () => void;
}

export const CollectionFilters: React.FC<CollectionFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
}) => {
  // Check if any filter is active (not 'all')
  const hasActiveFilters =
    (filters.status && filters.status !== 'all') ||
    (filters.payment_method && filters.payment_method !== 'all') ||
    (filters.time_range && filters.time_range !== 'all') ||
    (filters.amount_range && filters.amount_range !== 'all') ||
    (filters.alert_type && filters.alert_type !== 'all');

  return (
    <div className="flex flex-wrap items-center gap-2" dir="rtl">
      {/* Status Filter */}
      <Select
        value={filters.status || 'all'}
        onValueChange={(value) => onFiltersChange({ status: value as typeof filters.status })}
      >
        <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs border-gray-200 bg-white">
          <SelectValue placeholder="סטטוס" />
        </SelectTrigger>
        <SelectContent className="rtl:text-right">
          <SelectItem value="all">סטטוס: הכל</SelectItem>
          <SelectItem value="pending">כל הממתינים</SelectItem>
          <SelectItem value="sent_not_opened">נשלח - לא נפתח</SelectItem>
          <SelectItem value="opened_not_selected">נפתח - לא בחר</SelectItem>
          <SelectItem value="selected_not_paid">בחר - לא שילם</SelectItem>
          <SelectItem value="partial_paid">שולם חלקית</SelectItem>
          <SelectItem value="paid">שולם במלואו</SelectItem>
          <SelectItem value="disputed">במחלוקת</SelectItem>
        </SelectContent>
      </Select>

      {/* Payment Method Filter */}
      <Select
        value={filters.payment_method || 'all'}
        onValueChange={(value) => onFiltersChange({ payment_method: value as typeof filters.payment_method })}
      >
        <SelectTrigger className="h-8 w-auto min-w-[130px] text-xs border-gray-200 bg-white">
          <SelectValue placeholder="אופן תשלום" />
        </SelectTrigger>
        <SelectContent className="rtl:text-right">
          <SelectItem value="all">תשלום: הכל</SelectItem>
          <SelectItem value="bank_transfer">העברה בנקאית</SelectItem>
          <SelectItem value="cc_single">אשראי - תשלום אחד</SelectItem>
          <SelectItem value="cc_installments">אשראי - תשלומים</SelectItem>
          <SelectItem value="checks">המחאות</SelectItem>
          <SelectItem value="not_selected">לא בחר</SelectItem>
        </SelectContent>
      </Select>

      {/* Time Range Filter */}
      <Select
        value={filters.time_range || 'all'}
        onValueChange={(value) => onFiltersChange({ time_range: value as typeof filters.time_range })}
      >
        <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs border-gray-200 bg-white">
          <SelectValue placeholder="זמן" />
        </SelectTrigger>
        <SelectContent className="rtl:text-right">
          <SelectItem value="all">זמן: הכל</SelectItem>
          <SelectItem value="0-7">0-7 ימים</SelectItem>
          <SelectItem value="8-14">8-14 ימים</SelectItem>
          <SelectItem value="15-30">15-30 ימים</SelectItem>
          <SelectItem value="31-60">31-60 ימים</SelectItem>
          <SelectItem value="60+">60+ ימים</SelectItem>
        </SelectContent>
      </Select>

      {/* Amount Range Filter */}
      <Select
        value={filters.amount_range || 'all'}
        onValueChange={(value) => onFiltersChange({ amount_range: value as typeof filters.amount_range })}
      >
        <SelectTrigger className="h-8 w-auto min-w-[110px] text-xs border-gray-200 bg-white">
          <SelectValue placeholder="סכום" />
        </SelectTrigger>
        <SelectContent className="rtl:text-right">
          <SelectItem value="all">סכום: הכל</SelectItem>
          <SelectItem value="up_to_10k">עד ₪10,000</SelectItem>
          <SelectItem value="10k-50k">₪10K - ₪50K</SelectItem>
          <SelectItem value="50k+">₪50,000+</SelectItem>
        </SelectContent>
      </Select>

      {/* Alert Type Filter */}
      <Select
        value={filters.alert_type || 'all'}
        onValueChange={(value) => onFiltersChange({ alert_type: value as typeof filters.alert_type })}
      >
        <SelectTrigger className="h-8 w-auto min-w-[120px] text-xs border-gray-200 bg-white">
          <SelectValue placeholder="התראה" />
        </SelectTrigger>
        <SelectContent className="rtl:text-right">
          <SelectItem value="all">התראה: הכל</SelectItem>
          <SelectItem value="not_opened_7d">לא נפתח 7+ ימים</SelectItem>
          <SelectItem value="no_selection_14d">לא בחר 14+ ימים</SelectItem>
          <SelectItem value="abandoned_cart">עגלה נטושה</SelectItem>
          <SelectItem value="checks_overdue">המחאות באיחור</SelectItem>
          <SelectItem value="has_dispute">במחלוקת</SelectItem>
        </SelectContent>
      </Select>

      {/* Reset Button - only show if filters are active */}
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

CollectionFilters.displayName = 'CollectionFilters';
