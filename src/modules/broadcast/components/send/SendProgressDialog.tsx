/**
 * Send Progress Dialog
 * Shows progress while broadcast is being sent
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { useBroadcastStore } from '../../store/broadcastStore';
import { cn } from '@/lib/utils';

interface SendProgressDialogProps {
  open: boolean;
  broadcastId: string;
  onComplete: () => void;
}

export const SendProgressDialog: React.FC<SendProgressDialogProps> = ({
  open,
  broadcastId,
  onComplete,
}) => {
  const { sendProgress, pollProgress, clearSendProgress } = useBroadcastStore();
  const [isPolling, setIsPolling] = useState(true);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start polling when dialog opens
  useEffect(() => {
    if (open && broadcastId) {
      setIsPolling(true);

      const poll = async () => {
        const progress = await pollProgress(broadcastId);
        if (progress && (progress.status === 'completed' || progress.status === 'failed' || progress.status === 'cancelled')) {
          setIsPolling(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
          }
        }
      };

      // Initial poll
      poll();

      // Set up polling interval
      pollIntervalRef.current = setInterval(poll, 2000); // Poll every 2 seconds

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
        }
      };
    }
  }, [open, broadcastId, pollProgress]);

  // Cleanup on close
  useEffect(() => {
    if (!open) {
      clearSendProgress();
    }
  }, [open, clearSendProgress]);

  const status = sendProgress?.status || 'sending';
  const total = sendProgress?.total || 0;
  const sent = sendProgress?.sent || 0;
  const failed = sendProgress?.failed || 0;
  const progress = sendProgress?.progress_percent || 0;

  const isComplete = status === 'completed' || status === 'failed' || status === 'cancelled';
  const hasErrors = failed > 0;

  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-12 w-12 text-green-500" />;
      case 'failed':
        return <XCircle className="h-12 w-12 text-destructive" />;
      case 'cancelled':
        return <AlertCircle className="h-12 w-12 text-amber-500" />;
      default:
        return <Loader2 className="h-12 w-12 text-primary animate-spin" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return hasErrors ? 'ההפצה הושלמה עם שגיאות' : 'ההפצה הושלמה בהצלחה!';
      case 'failed':
        return 'ההפצה נכשלה';
      case 'cancelled':
        return 'ההפצה בוטלה';
      default:
        return 'שולח מיילים...';
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        dir="rtl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="rtl:text-right">שליחת הפצה</DialogTitle>
          <DialogDescription className="rtl:text-right">
            {isComplete ? 'סיכום השליחה' : 'נא להמתין לסיום השליחה'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Status Icon */}
          <div className="flex justify-center">{getStatusIcon()}</div>

          {/* Status Text */}
          <div className="text-center">
            <p className={cn(
              "text-lg font-medium",
              status === 'completed' && !hasErrors && "text-green-600",
              status === 'completed' && hasErrors && "text-amber-600",
              status === 'failed' && "text-destructive",
              status === 'cancelled' && "text-amber-600"
            )}>
              {getStatusText()}
            </p>
          </div>

          {/* Progress Bar */}
          {!isComplete && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">
                {progress}% הושלם
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-muted-foreground">{total}</div>
              <div className="text-xs text-muted-foreground">סה"כ</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{sent}</div>
              <div className="text-xs text-muted-foreground">נשלחו</div>
            </div>
            <div>
              <div className={cn(
                "text-2xl font-bold",
                failed > 0 ? "text-destructive" : "text-muted-foreground"
              )}>
                {failed}
              </div>
              <div className="text-xs text-muted-foreground">נכשלו</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        {isComplete && (
          <div className="flex justify-center">
            <Button onClick={onComplete} size="lg">
              סגור
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
