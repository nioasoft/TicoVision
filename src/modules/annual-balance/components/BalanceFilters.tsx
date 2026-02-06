/**
 * BalanceFilters - Filter bar for annual balance dashboard
 * Includes search, status, auditor, and year filters
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
      <div className="relative">
        <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
        <Input
          type="text"
          placeholder="חיפוש לפי שם חברה או ח.פ."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="h-8 w-[200px] text-xs pr-8 pl-7 border-gray-200 bg-white rtl:text-right"
        />
        {searchValue && (
          <button
            onClick={handleClearSearch}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            type="button"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Year Filter */}
      <Select
        value={String(filters.year)}
        onValueChange={(value) => onFiltersChange({ year: Number(value) })}
      >
        <SelectTrigger className="h-8 w-auto min-w-[100px] text-xs border-gray-200 bg-white">
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
        <SelectTrigger className="h-8 w-auto min-w-[130px] text-xs border-gray-200 bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rtl:text-right">
          <SelectItem value="all">סטטוס: הכל</SelectItem>
          {BALANCE_STATUSES.map((status) => (
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
          <SelectTrigger className="h-8 w-auto min-w-[130px] text-xs border-gray-200 bg-white">
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
          className="h-8 px-2 text-xs text-gray-500 hover:text-gray-700"
        >
          <FilterX className="h-3.5 w-3.5 ml-1" />
          איפוס
        </Button>
      )}
    </div>
  );
};
