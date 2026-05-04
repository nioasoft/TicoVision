import * as React from 'react';
import { Search, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SearchFieldProps extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  labelClassName?: string;
  wrapperClassName?: string;
  showClearButton?: boolean;
}

export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  (
    {
      value,
      onChange,
      label,
      labelClassName,
      className,
      wrapperClassName,
      style,
      showClearButton = true,
      placeholder = '',
      ...props
    },
    ref
  ) => {
    const visibleLabel = label ?? 'חיפוש';

    return (
      <div className={cn('space-y-2', wrapperClassName)}>
        <label className={cn('block text-base font-semibold text-foreground rtl:text-right', labelClassName)}>
          {visibleLabel}
        </label>

        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/80" />
          <Input
            ref={ref}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className={cn(
              'search-box pr-10 pl-10 border-2 border-yellow-400 !bg-yellow-100 ![background-color:#fef9c3] outline outline-2 outline-yellow-400',
              className
            )}
            style={{ backgroundColor: '#fef9c3', ...style }}
            dir="rtl"
            {...props}
          />
          {showClearButton && value ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="נקה חיפוש"
              className="absolute left-1 top-1/2 size-8 -translate-y-1/2 rounded-full text-muted-foreground hover:bg-muted"
              onClick={() => onChange('')}
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
    );
  }
);

SearchField.displayName = 'SearchField';
