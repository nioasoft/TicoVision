/**
 * SaveStatusIndicator
 * Displays the current auto-save status with appropriate icons and colors
 */

import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Loader2, Check, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SaveStatusInfo } from '../types/protocol.types';

interface SaveStatusIndicatorProps {
  /** Save status information */
  saveStatus: SaveStatusInfo;
  /** Callback for retry button */
  onRetry?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays the current save status:
 * - idle: Shows "נשמר לאחרונה: HH:MM" (gray)
 * - dirty: Shows "יש שינויים שלא נשמרו" (yellow)
 * - saving: Shows "שומר..." with spinner (blue)
 * - saved: Shows "נשמר" with checkmark (green)
 * - error: Shows error message with retry button (red)
 */
export function SaveStatusIndicator({
  saveStatus,
  onRetry,
  className,
}: SaveStatusIndicatorProps) {
  const { status, lastSaved, error } = saveStatus;

  // Status configurations
  const statusConfig = {
    idle: {
      icon: lastSaved ? <Clock className="h-3.5 w-3.5" /> : null,
      text: lastSaved
        ? `נשמר לאחרונה: ${format(lastSaved, 'HH:mm', { locale: he })}`
        : '',
      className: 'text-gray-500',
    },
    dirty: {
      icon: <Clock className="h-3.5 w-3.5" />,
      text: 'יש שינויים שלא נשמרו',
      className: 'text-yellow-600',
    },
    saving: {
      icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
      text: 'שומר...',
      className: 'text-blue-600',
    },
    saved: {
      icon: <Check className="h-3.5 w-3.5" />,
      text: 'נשמר',
      className: 'text-green-600',
    },
    error: {
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      text: 'שגיאה בשמירה',
      className: 'text-red-600',
    },
  };

  const config = statusConfig[status];

  // Don't show anything if idle with no lastSaved
  if (status === 'idle' && !lastSaved) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-sm',
        config.className,
        className
      )}
      dir="rtl"
    >
      {config.icon}
      <span>{config.text}</span>
      {status === 'error' && onRetry && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={onRetry}
        >
          נסה שוב
        </Button>
      )}
      {status === 'error' && error && (
        <span className="text-xs text-red-500 mr-2" title={error.message}>
          ({error.message.slice(0, 30)}...)
        </span>
      )}
    </div>
  );
}
