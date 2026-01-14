/**
 * Weekly Report Banner Component
 * Shows a dismissable banner reminding to pull new capital declarations from tax authority
 * Triggered every Sunday by the weekly report edge function
 */

import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WeeklyReportBannerProps {
  onDismiss: () => void;
  className?: string;
}

export function WeeklyReportBanner({ onDismiss, className }: WeeklyReportBannerProps) {
  return (
    <div
      dir="rtl"
      className={cn(
        'bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-amber-800 font-medium text-right">
            נא למשוך ממס הכנסה הצהרות הון פתוחות ולעדכן במערכת
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 flex-shrink-0"
          aria-label="סגור התראה"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
