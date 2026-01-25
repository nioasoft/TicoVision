import * as React from 'react';
import { cn } from '@/lib/utils';

interface MoneyInputProps {
  value: number | '';
  onChange: (value: number | '') => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * MoneyInput - Input field with thousands separator formatting
 * Displays: 1,000,000 (with commas)
 * Stores: raw number value
 */
export function MoneyInput({
  value,
  onChange,
  min,
  max,
  disabled,
  className,
}: MoneyInputProps) {
  // Format number with commas using he-IL locale
  const formatValue = (val: number | ''): string => {
    if (val === '' || val === null || val === undefined) return '';
    return new Intl.NumberFormat('he-IL').format(val);
  };

  // Parse formatted string back to number
  const parseValue = (str: string): number | '' => {
    if (!str || str.trim() === '') return '';
    // Remove all non-digit characters except minus sign
    const cleaned = str.replace(/[^\d-]/g, '');
    if (cleaned === '' || cleaned === '-') return '';
    const num = parseInt(cleaned, 10);
    if (isNaN(num)) return '';
    return num;
  };

  const [displayValue, setDisplayValue] = React.useState(() => formatValue(value));

  // Sync display value when external value changes
  React.useEffect(() => {
    setDisplayValue(formatValue(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Allow empty input
    if (inputValue === '') {
      setDisplayValue('');
      onChange('');
      return;
    }

    // Parse the input and validate
    const parsed = parseValue(inputValue);

    if (parsed === '') {
      setDisplayValue('');
      onChange('');
      return;
    }

    // Apply min/max constraints
    let finalValue = parsed;
    if (min !== undefined && parsed < min) {
      finalValue = min;
    }
    if (max !== undefined && parsed > max) {
      finalValue = max;
    }

    // Update display with formatted value
    setDisplayValue(formatValue(finalValue));
    onChange(finalValue);
  };

  const handleBlur = () => {
    // Ensure proper formatting on blur
    setDisplayValue(formatValue(value));
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Select all text on focus for easy replacement
    e.target.select();
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      disabled={disabled}

      className={cn(
        'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
        'file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'rtl:text-right ltr:text-left',
        className
      )}
      dir="ltr" // Numbers should be LTR even in RTL context
    />
  );
}

export default MoneyInput;
