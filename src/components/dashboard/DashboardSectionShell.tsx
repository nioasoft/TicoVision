import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface DashboardSectionShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function DashboardSectionShell({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: DashboardSectionShellProps) {
  return (
    <Card
      dir="rtl"
      className={cn(
        'overflow-hidden rounded-2xl border-slate-200 bg-white shadow-sm',
        className
      )}
    >
      <CardHeader className="border-b border-slate-100 bg-slate-50/70 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 text-right">
            <CardTitle className="text-xl font-semibold text-slate-900">{title}</CardTitle>
            {description && <p className="text-sm text-slate-500">{description}</p>}
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </CardHeader>
      <CardContent className={cn('p-6', contentClassName)}>{children}</CardContent>
    </Card>
  );
}
