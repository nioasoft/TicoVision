/**
 * MonthLimitBadge
 * Shows current month count and provides controls to extend the range
 * - Displays X/14 months used
 * - Buttons to add months to past or future
 * - Visual indicator when near limit
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';
import { useMonthRange } from '@/contexts/MonthRangeContext';
import { MAX_MONTHS } from '@/services/monthly-data.service';
import { MonthlyDataService } from '@/services/monthly-data.service';

interface MonthLimitBadgeProps {
  className?: string;
}

export function MonthLimitBadge({ className }: MonthLimitBadgeProps) {
  const { range, extendRange, isLoading } = useMonthRange();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [monthsToAdd, setMonthsToAdd] = useState('1');

  if (!range) {
    return null;
  }

  const { monthCount } = range;
  const isAtLimit = monthCount >= MAX_MONTHS;
  const isNearLimit = monthCount >= MAX_MONTHS - 2;

  // Badge color based on count
  const getBadgeVariant = () => {
    if (isAtLimit) return 'destructive';
    if (isNearLimit) return 'secondary';
    return 'outline';
  };

  const handleExtend = async (direction: 'past' | 'future') => {
    const count = parseInt(monthsToAdd, 10);
    await extendRange(direction, count);
    setPopoverOpen(false);
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={className}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin ml-2" />
          ) : (
            <Calendar className="h-4 w-4 ml-2" />
          )}
          <Badge variant={getBadgeVariant()} className="ml-2">
            {monthCount}/{MAX_MONTHS}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {MonthlyDataService.dateToHebrew(range.startMonth)} - {MonthlyDataService.dateToHebrew(range.endMonth)}
          </span>
          <ChevronDown className="h-4 w-4 mr-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80" dir="rtl">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">ניהול טווח חודשים</h4>
            {isAtLimit && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="h-3 w-3 ml-1" />
                במגבלה
              </Badge>
            )}
          </div>

          {/* Current range display */}
          <div className="p-3 bg-muted rounded-lg text-center">
            <div className="text-sm text-muted-foreground mb-1">טווח נוכחי</div>
            <div className="font-medium">
              {MonthlyDataService.dateToHebrew(range.startMonth)} - {MonthlyDataService.dateToHebrew(range.endMonth)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {monthCount} חודשים מתוך {MAX_MONTHS} מקסימום
            </div>
          </div>

          {/* Extend controls */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">הוסף</span>
              <Select value={monthsToAdd} onValueChange={setMonthsToAdd}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">חודשים</span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleExtend('past')}
                disabled={isLoading}
              >
                <ChevronRight className="h-4 w-4 ml-1" />
                לעבר
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleExtend('future')}
                disabled={isLoading}
              >
                לעתיד
                <ChevronLeft className="h-4 w-4 mr-1" />
              </Button>
            </div>
          </div>

          {/* Warning */}
          {isAtLimit && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700">
              <AlertCircle className="h-3 w-3 inline ml-1" />
              הגעת למגבלת 14 חודשים. הוספת חודשים חדשים תמחק נתונים ישנים.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Month Range Initializer
 * Component for initializing the month range when no data exists
 */
interface MonthRangeInitializerProps {
  onInitialize: (startDate: Date) => void;
  isLoading?: boolean;
}

export function MonthRangeInitializer({ onInitialize, isLoading }: MonthRangeInitializerProps) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    // Default to 12 months ago from current month
    const date = new Date();
    date.setMonth(date.getMonth() - 11);
    date.setDate(1);
    return date;
  });

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  const months = [
    { value: 0, label: 'ינואר' },
    { value: 1, label: 'פברואר' },
    { value: 2, label: 'מרץ' },
    { value: 3, label: 'אפריל' },
    { value: 4, label: 'מאי' },
    { value: 5, label: 'יוני' },
    { value: 6, label: 'יולי' },
    { value: 7, label: 'אוגוסט' },
    { value: 8, label: 'ספטמבר' },
    { value: 9, label: 'אוקטובר' },
    { value: 10, label: 'נובמבר' },
    { value: 11, label: 'דצמבר' },
  ];

  const handleYearChange = (yearStr: string) => {
    const newDate = new Date(selectedMonth);
    newDate.setFullYear(parseInt(yearStr, 10));
    setSelectedMonth(newDate);
  };

  const handleMonthChange = (monthStr: string) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(parseInt(monthStr, 10));
    setSelectedMonth(newDate);
  };

  // Calculate end date preview
  const endDate = new Date(selectedMonth);
  endDate.setMonth(endDate.getMonth() + 11);

  return (
    <div className="p-6 bg-muted/50 rounded-lg border-2 border-dashed" dir="rtl">
      <div className="text-center space-y-4">
        <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
        <div>
          <h3 className="font-medium text-lg">אתחול טווח חודשים</h3>
          <p className="text-sm text-muted-foreground mt-1">
            בחר את החודש הראשון לטווח. המערכת תיצור 12 חודשים מחודש זה.
          </p>
        </div>

        <div className="flex justify-center gap-3">
          <Select
            value={selectedMonth.getMonth().toString()}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value.toString()}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedMonth.getFullYear().toString()}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground">
          טווח: {MonthlyDataService.dateToHebrew(selectedMonth)} - {MonthlyDataService.dateToHebrew(endDate)}
        </div>

        <Button
          onClick={() => onInitialize(selectedMonth)}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
              מאתחל...
            </>
          ) : (
            'צור טווח חודשים'
          )}
        </Button>
      </div>
    </div>
  );
}
