/**
 * Collection Filters Component
 * Filters for status, payment method, time range, amount, and alerts
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="status-filter" className="rtl:text-right ltr:text-left block">
              סטטוס
            </Label>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => onFiltersChange({ status: value as typeof filters.status })}
            >
              <SelectTrigger id="status-filter" className="rtl:text-right ltr:text-left">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rtl:text-right ltr:text-left">
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="sent_not_opened">נשלח - לא נפתח</SelectItem>
                <SelectItem value="opened_not_selected">נפתח - לא בחר</SelectItem>
                <SelectItem value="selected_not_paid">בחר - לא שילם</SelectItem>
                <SelectItem value="partial_paid">שולם חלקית</SelectItem>
                <SelectItem value="paid">שולם במלואו</SelectItem>
                <SelectItem value="disputed">במחלוקת</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method Filter */}
          <div className="space-y-2">
            <Label htmlFor="payment-method-filter" className="rtl:text-right ltr:text-left block">
              אופן תשלום
            </Label>
            <Select
              value={filters.payment_method || 'all'}
              onValueChange={(value) => onFiltersChange({ payment_method: value as typeof filters.payment_method })}
            >
              <SelectTrigger id="payment-method-filter" className="rtl:text-right ltr:text-left">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rtl:text-right ltr:text-left">
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="bank_transfer">העברה בנקאית</SelectItem>
                <SelectItem value="cc_single">כ.אשראי תשלום אחד</SelectItem>
                <SelectItem value="cc_installments">כ.אשראי תשלומים</SelectItem>
                <SelectItem value="checks">המחאות</SelectItem>
                <SelectItem value="not_selected">לא בחר</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Time Range Filter */}
          <div className="space-y-2">
            <Label htmlFor="time-range-filter" className="rtl:text-right ltr:text-left block">
              זמן משליחה
            </Label>
            <Select
              value={filters.time_range || 'all'}
              onValueChange={(value) => onFiltersChange({ time_range: value as typeof filters.time_range })}
            >
              <SelectTrigger id="time-range-filter" className="rtl:text-right ltr:text-left">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rtl:text-right ltr:text-left">
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="0-7">0-7 ימים</SelectItem>
                <SelectItem value="8-14">8-14 ימים</SelectItem>
                <SelectItem value="15-30">15-30 ימים</SelectItem>
                <SelectItem value="31-60">31-60 ימים</SelectItem>
                <SelectItem value="60+">60+ ימים</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount Range Filter */}
          <div className="space-y-2">
            <Label htmlFor="amount-range-filter" className="rtl:text-right ltr:text-left block">
              טווח סכום
            </Label>
            <Select
              value={filters.amount_range || 'all'}
              onValueChange={(value) => onFiltersChange({ amount_range: value as typeof filters.amount_range })}
            >
              <SelectTrigger id="amount-range-filter" className="rtl:text-right ltr:text-left">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rtl:text-right ltr:text-left">
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="up_to_10k">עד ₪10,000</SelectItem>
                <SelectItem value="10k-50k">₪10,000 - ₪50,000</SelectItem>
                <SelectItem value="50k+">₪50,000+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Alert Type Filter */}
          <div className="space-y-2">
            <Label htmlFor="alert-type-filter" className="rtl:text-right ltr:text-left block">
              סוג התראה
            </Label>
            <Select
              value={filters.alert_type || 'all'}
              onValueChange={(value) => onFiltersChange({ alert_type: value as typeof filters.alert_type })}
            >
              <SelectTrigger id="alert-type-filter" className="rtl:text-right ltr:text-left">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rtl:text-right ltr:text-left">
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="not_opened_7d">לא נפתח 7+ ימים</SelectItem>
                <SelectItem value="no_selection_14d">לא בחר 14+ ימים</SelectItem>
                <SelectItem value="abandoned_cart">נטש Cardcom</SelectItem>
                <SelectItem value="checks_overdue">המחאות באיחור</SelectItem>
                <SelectItem value="has_dispute">במחלוקת</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Reset Button */}
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={onReset} className="rtl:flex-row-reverse gap-2">
            <FilterX className="h-4 w-4" />
            <span className="rtl:text-right ltr:text-left">אפס מסננים</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

CollectionFilters.displayName = 'CollectionFilters';
