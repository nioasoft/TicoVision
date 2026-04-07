import * as React from 'react';
import { Search, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SearchFieldProps extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  wrapperClassName?: string;
  showClearButton?: boolean;
}

export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  (
    {
      value,
      onChange,
      label,
      className,
      wrapperClassName,
      showClearButton = true,
      placeholder = 'חיפוש',
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn('space-y-2', wrapperClassName)}>
        {label ? (
          <label className="block text-xs font-medium text-muted-foreground rtl:text-right">
            {label}
          </label>
        ) : null}

        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/80" />
          <Input
            ref={ref}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className={cn('pr-10 pl-10', className)}
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
