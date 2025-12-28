/**
 * Late Submission Indicator Component
 * Visual indicator showing that a declaration was submitted late
 * Shows warning style if penalty data not yet entered
 */

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PenaltyStatus } from '@/types/capital-declaration.types';

interface LateSubmissionIndicatorProps {
  wasSubmittedLate: boolean;
  penaltyStatus?: PenaltyStatus | null;
  size?: 'sm' | 'default';
  showWarning?: boolean;
}

export function LateSubmissionIndicator({
  wasSubmittedLate,
  penaltyStatus,
  size = 'default',
  showWarning = true,
}: LateSubmissionIndicatorProps) {
  if (!wasSubmittedLate) {
    return null;
  }

  const hasPenaltyData = penaltyStatus != null;
  const needsPenaltyUpdate = showWarning && !hasPenaltyData;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'gap-1 cursor-default',
              needsPenaltyUpdate
                ? 'bg-orange-100 text-orange-800 border-orange-300 animate-pulse'
                : 'bg-amber-100 text-amber-800 border-amber-300',
              size === 'sm' && 'text-xs px-1.5 py-0.5'
            )}
          >
            {needsPenaltyUpdate ? (
              <AlertTriangle className={cn('h-3 w-3', size === 'sm' && 'h-2.5 w-2.5')} />
            ) : (
              <Clock className={cn('h-3 w-3', size === 'sm' && 'h-2.5 w-2.5')} />
            )}
            <span>הוגש באיחור</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="rtl:text-right">
          {needsPenaltyUpdate
            ? 'הוגש באיחור - יש לעדכן פרטי קנס אם התקבל'
            : 'ההצהרה הוגשה לאחר המועד'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
