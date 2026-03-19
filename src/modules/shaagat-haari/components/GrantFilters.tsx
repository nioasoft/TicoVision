/**
 * Grant Filters Bar
 * Search + status/track/reporting type filters for the grant table
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Search, X, Download } from 'lucide-react';
import type { TrackType, ReportingType } from '../types/shaagat.types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type EligibilityFilterStatus =
  | 'all'
  | 'ELIGIBLE'
  | 'NOT_ELIGIBLE'
  | 'GRAY_AREA'
  | 'fee_pending'
  | 'fee_paid'
  | 'calculation_done'
  | 'submitted';

export interface GrantFiltersState {
  search: string;
  eligibilityStatus: EligibilityFilterStatus;
  trackType: TrackType | 'all';
  reportingType: ReportingType | 'all';
  showIrrelevant: boolean;
}

interface GrantFiltersProps {
  filters: GrantFiltersState;
  onChange: (filters: GrantFiltersState) => void;
  onExport?: () => void;
  exportLoading?: boolean;
  resultCount?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Label maps
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<EligibilityFilterStatus, string> = {
  all: 'כל הסטטוסים',
  ELIGIBLE: 'זכאים',
  NOT_ELIGIBLE: 'לא זכאים',
  GRAY_AREA: 'תחום אפור',
  fee_pending: 'ממתין לתשלום שכ״ט',
  fee_paid: 'שילמו שכ״ט',
  calculation_done: 'חישוב הושלם',
  submitted: 'שודר',
};

const TRACK_LABELS: Record<TrackType | 'all', string> = {
  all: 'כל המסלולים',
  standard: 'רגיל',
  small: 'קטנים',
  cash_basis: 'מזומן',
  new_business: 'עסק חדש',
  northern: 'צפון',
  contractor: 'קבלנים',
};

const REPORTING_LABELS: Record<ReportingType | 'all', string> = {
  all: 'כל סוגי הדיווח',
  monthly: 'חודשי',
  bimonthly: 'דו-חודשי',
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const GrantFilters: React.FC<GrantFiltersProps> = ({
  filters,
  onChange,
  onExport,
  exportLoading = false,
  resultCount,
}) => {
  const update = <K extends keyof GrantFiltersState>(key: K, value: GrantFiltersState[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const hasActiveFilters =
    filters.search !== '' ||
    filters.eligibilityStatus !== 'all' ||
    filters.trackType !== 'all' ||
    filters.reportingType !== 'all';

  const handleClear = () => {
    onChange({
      search: '',
      eligibilityStatus: 'all',
      trackType: 'all',
      reportingType: 'all',
      showIrrelevant: filters.showIrrelevant,
    });
  };

  return (
    <div className="space-y-2" dir="rtl">
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="חיפוש לפי שם או ח.פ."
            value={filters.search}
            onChange={(e) => update('search', e.target.value)}
            className="pe-9 text-right"
            dir="rtl"
          />
        </div>

        {/* Status filter */}
        <Select
          value={filters.eligibilityStatus}
          onValueChange={(v) => update('eligibilityStatus', v as EligibilityFilterStatus)}
        >
          <SelectTrigger className="w-[180px] text-right" dir="rtl">
            <SelectValue placeholder="סטטוס" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {(Object.keys(STATUS_LABELS) as EligibilityFilterStatus[]).map((key) => (
              <SelectItem key={key} value={key}>
                {STATUS_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Track filter */}
        <Select
          value={filters.trackType}
          onValueChange={(v) => update('trackType', v as TrackType | 'all')}
        >
          <SelectTrigger className="w-[150px] text-right" dir="rtl">
            <SelectValue placeholder="מסלול" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {(Object.keys(TRACK_LABELS) as (TrackType | 'all')[]).map((key) => (
              <SelectItem key={key} value={key}>
                {TRACK_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Reporting type filter */}
        <Select
          value={filters.reportingType}
          onValueChange={(v) => update('reportingType', v as ReportingType | 'all')}
        >
          <SelectTrigger className="w-[160px] text-right" dir="rtl">
            <SelectValue placeholder="סוג דיווח" />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {(Object.keys(REPORTING_LABELS) as (ReportingType | 'all')[]).map((key) => (
              <SelectItem key={key} value={key}>
                {REPORTING_LABELS[key]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1 text-gray-500">
            <X className="h-4 w-4" />
            נקה סינון
          </Button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Export */}
        {onExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={exportLoading}
            className="gap-1.5"
            dir="rtl"
          >
            <Download className="h-4 w-4" />
            {exportLoading ? 'מייצא...' : 'ייצוא לאקסל'}
          </Button>
        )}
      </div>

      {/* Relevance toggle + result count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="show-irrelevant"
            checked={filters.showIrrelevant}
            onCheckedChange={(checked) => update('showIrrelevant', Boolean(checked))}
          />
          <Label htmlFor="show-irrelevant" className="text-sm text-gray-600 cursor-pointer">
            הצג גם לקוחות לא רלוונטיים
          </Label>
        </div>
        {resultCount !== undefined && (
          <span className="text-xs text-gray-400">{formatNumber(resultCount)} רשומות</span>
        )}
      </div>
    </div>
  );
};

GrantFilters.displayName = 'GrantFilters';

// Helper
function formatNumber(n: number): string {
  return n.toLocaleString('he-IL');
}
