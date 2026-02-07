/**
 * BalanceFilters - Filter bar for annual balance dashboard
 * Includes search, status, auditor, and year filters with bigger controls
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FilterX, Search, X } from 'lucide-react';
import { BALANCE_STATUS_CONFIG, BALANCE_STATUSES } from '../types/annual-balance.types';
import type { BalanceFilters as BalanceFiltersType, AuditorSummary } from '../types/annual-balance.types';

interface BalanceFiltersProps {
  filters: BalanceFiltersType;
  onFiltersChange: (filters: Partial<BalanceFiltersType>) => void;
  onReset: () => void;
  auditors: AuditorSummary[];
}

export const BalanceFilters: React.FC<BalanceFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
  auditors,
}) => {
  const [searchValue, setSearchValue] = useState(filters.search || '');

  // Sync local state when filters.search changes externally (e.g., reset)
  useEffect(() => {
    setSearchValue(filters.search || '');
  }, [filters.search]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== (filters.search || '')) {
        onFiltersChange({ search: searchValue || undefined });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue, filters.search, onFiltersChange]);

  const handleClearSearch = useCallback(() => {
    setSearchValue('');
    onFiltersChange({ search: undefined });
  }, [onFiltersChange]);

  const hasActiveFilters =
    (filters.search && filters.search.trim() !== '') ||
    filters.status ||
    filters.auditor_id;

  // Generate year options: current year down to 5 years ago
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  return (
    <div className="flex flex-wrap items-center gap-2" dir="rtl">
      {/* Search Input */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="חיפוש לפי שם חברה או ח.פ."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="h-9 text-sm pr-9 pl-9 rounded-lg border-gray-200 bg-white rtl:text-right"
        />
        {searchValue && (
          <button
            onClick={handleClearSearch}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Vertical divider */}
      <div className="h-5 w-px bg-border" />

      {/* Year Filter */}
      <Select
        value={String(filters.year)}
        onValueChange={(value) => onFiltersChange({ year: Number(value) })}
      >
        <SelectTrigger className="h-9 w-auto min-w-[110px] text-sm rounded-lg border-gray-200 bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rtl:text-right">
          {yearOptions.map((year) => (
            <SelectItem key={year} value={String(year)}>
              מאזני {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select
        value={filters.status || 'all'}
        onValueChange={(value) =>
          onFiltersChange({ status: value === 'all' ? undefined : (value as BalanceFiltersType['status']) })
        }
      >
        <SelectTrigger className="h-9 w-auto min-w-[140px] text-sm rounded-lg border-gray-200 bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rtl:text-right">
          <SelectItem value="all">סטטוס: הכל</SelectItem>
          {BALANCE_STATUSES.filter((status) => status !== 'office_approved').map((status) => (
            <SelectItem key={status} value={status}>
              {BALANCE_STATUS_CONFIG[status].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Auditor Filter */}
      {auditors.length > 0 && (
        <Select
          value={filters.auditor_id || 'all'}
          onValueChange={(value) =>
            onFiltersChange({ auditor_id: value === 'all' ? undefined : value })
          }
        >
          <SelectTrigger className="h-9 w-auto min-w-[140px] text-sm rounded-lg border-gray-200 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rtl:text-right">
            <SelectItem value="all">מבקר: הכל</SelectItem>
            {auditors.map((auditor) => (
              <SelectItem key={auditor.auditor_id} value={auditor.auditor_id}>
                {auditor.auditor_email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Reset Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-9 px-3 text-sm text-muted-foreground hover:text-foreground"
        >
          <FilterX className="h-4 w-4 ml-1.5" />
          איפוס
        </Button>
      )}
    </div>
  );
};
