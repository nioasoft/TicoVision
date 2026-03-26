import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RotateCcw, X } from 'lucide-react';

interface DraftRecoveryBannerProps {
  savedAt: Date;
  onRestore: () => void;
  onDiscard: () => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
}

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'לפני פחות מדקה';
  if (diffMin < 60) return `לפני ${diffMin} דקות`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `לפני ${diffHours} שעות`;

  return `ב-${date.toLocaleDateString('he-IL')}`;
}

/**
 * Yellow banner shown when a recoverable draft is available.
 * Offers Restore / Discard actions.
 */
export function DraftRecoveryBanner({
  savedAt,
  onRestore,
  onDiscard,
}: DraftRecoveryBannerProps) {
  return (
    <Alert className="bg-amber-50 border-amber-200 mb-4" dir="rtl">
      <AlertDescription className="flex items-center justify-between gap-4">
        <span className="text-amber-800 text-sm">
          נמצאה טיוטה שלא נשמרה מ-{formatTime(savedAt)} ({formatRelative(savedAt)})
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="default"
            onClick={onRestore}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <RotateCcw className="h-3.5 w-3.5 me-1.5" />
            שחזר טיוטה
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDiscard}
            className="text-amber-700 hover:text-amber-900 hover:bg-amber-100"
          >
            <X className="h-3.5 w-3.5 me-1.5" />
            התעלם
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
