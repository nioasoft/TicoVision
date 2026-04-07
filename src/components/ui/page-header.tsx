import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-border/90 bg-card px-6 py-5 shadow-sm',
        className
      )}
      dir="rtl"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3 text-right">
          {eyebrow ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {eyebrow}
            </div>
          ) : null}
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-foreground text-balance lg:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="max-w-3xl text-sm text-muted-foreground text-pretty">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}
