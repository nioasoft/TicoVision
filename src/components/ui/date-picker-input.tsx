/**
 * DatePickerInput - ISO-string-friendly date picker with year & month dropdowns.
 *
 * Wraps shadcn Calendar inside a Popover with separate Year/Month selects
 * above the grid for quick navigation (useful for future first-report dates,
 * certificate validity, etc).
 *
 * Why we override classNames inline: the shared calendar.tsx in this repo
 * was written for react-day-picker v8 (keys like `head_row`, `nav_button`)
 * but the installed version is v9 (keys like `weekdays`, `button_next`).
 * The mismatched defaults render weekday labels squished. We supply
 * v9-correct classNames here and use `fixedWeeks` so the calendar height
 * stays constant when navigating months — this keeps Radix's collision
 * detection stable (no mid-interaction side flips) while still letting
 * it flip the popover above the trigger when near the viewport bottom.
 *
 * Value contract: ISO date string (YYYY-MM-DD) or empty string.
 */

import { useEffect, useMemo, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button, buttonVariants } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatIsraeliDate } from '@/lib/formatters';

interface DatePickerInputProps {
  /** ISO date string YYYY-MM-DD, or empty string for unset */
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
  /** Earliest year shown in dropdown (default: current - 5) */
  fromYear?: number;
  /** Latest year shown in dropdown (default: current + 10) */
  toYear?: number;
}

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

function toDate(value: string): Date | undefined {
  if (!value) return undefined;
  const parts = value.split('-');
  if (parts.length !== 3) return undefined;
  const [y, m, d] = parts.map((p) => Number(p));
  if (!y || !m || !d) return undefined;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}

function toIsoString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// react-day-picker v9 classNames (project's shared calendar.tsx targets v8)
const V9_CLASS_NAMES = {
  months: 'flex flex-col',
  month: 'space-y-2',
  month_caption: 'flex justify-center pt-1 relative items-center h-8',
  caption_label: 'text-sm font-medium',
  nav: 'flex items-center justify-between absolute inset-x-1 top-1',
  button_previous: cn(
    buttonVariants({ variant: 'outline' }),
    'h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100'
  ),
  button_next: cn(
    buttonVariants({ variant: 'outline' }),
    'h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100'
  ),
  month_grid: 'w-full border-collapse mt-2',
  weekdays: 'flex',
  weekday:
    'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem] flex items-center justify-center',
  week: 'flex w-full mt-1',
  day: 'h-9 w-9 text-center text-sm p-0 relative',
  day_button: cn(
    buttonVariants({ variant: 'ghost' }),
    'h-9 w-9 p-0 font-normal aria-selected:opacity-100'
  ),
  selected:
    'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
  today: 'bg-accent text-accent-foreground',
  outside: 'text-muted-foreground opacity-50',
  disabled: 'text-muted-foreground opacity-30',
  hidden: 'invisible',
};

export function DatePickerInput({
  value,
  onChange,
  disabled,
  placeholder = 'בחר תאריך',
  id,
  className,
  fromYear,
  toYear,
}: DatePickerInputProps) {
  const currentYear = new Date().getFullYear();
  const yearRange = useMemo(() => {
    const start = fromYear ?? currentYear - 5;
    const end = toYear ?? currentYear + 10;
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [fromYear, toYear, currentYear]);

  const selectedDate = toDate(value);
  const [displayMonth, setDisplayMonth] = useState<Date>(selectedDate ?? new Date());

  useEffect(() => {
    if (selectedDate) setDisplayMonth(selectedDate);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const setYear = (year: string) => {
    setDisplayMonth(new Date(Number(year), displayMonth.getMonth(), 1));
  };
  const setMonth = (month: string) => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), Number(month), 1));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full h-9 justify-start text-right font-normal rtl:flex-row-reverse',
            !selectedDate && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="ml-2 h-4 w-4 shrink-0" />
          <span className="flex-1 text-right">
            {selectedDate ? formatIsraeliDate(selectedDate) : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        side="bottom"
        sideOffset={4}
        collisionPadding={8}
        dir="ltr"
      >
        <div className="flex items-center gap-2 p-3 border-b" dir="rtl">
          <Select value={String(displayMonth.getMonth())} onValueChange={setMonth}>
            <SelectTrigger className="h-8 w-[110px] text-right" dir="rtl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HEBREW_MONTHS.map((name, idx) => (
                <SelectItem key={idx} value={String(idx)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(displayMonth.getFullYear())} onValueChange={setYear}>
            <SelectTrigger className="h-8 w-[90px] text-right" dir="rtl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearRange.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(d) => {
            if (d) onChange(toIsoString(d));
          }}
          month={displayMonth}
          onMonthChange={setDisplayMonth}
          fixedWeeks
          showOutsideDays
          classNames={V9_CLASS_NAMES}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
