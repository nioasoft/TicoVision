/**
 * Deviation Confirmation Dialog
 * Shown when saving a payment with deviation > DEVIATION_AUTO_APPROVE_THRESHOLD_ILS
 * Asks user to approve as final payment or record as partial
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Coins } from 'lucide-react';
import { formatILS } from '@/lib/formatters';

interface DeviationConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviationAmount: number;
  expectedAmount: number;
  actualAmount: number;
  isOverpayment: boolean;
  loading?: boolean;
  onApproveAsFinal: () => void;
  onRecordAsPartial: () => void;
}

export const DeviationConfirmationDialog: React.FC<DeviationConfirmationDialogProps> = ({
  open,
  onOpenChange,
  deviationAmount,
  expectedAmount,
  actualAmount,
  isOverpayment,
  loading = false,
  onApproveAsFinal,
  onRecordAsPartial,
}) => {
  const absDeviation = Math.abs(deviationAmount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="rtl:text-right ltr:text-left flex items-center gap-2 rtl:flex-row-reverse">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            סטייה בתשלום
          </DialogTitle>
          <DialogDescription className="rtl:text-right ltr:text-left">
            נמצאה סטייה בין הסכום הצפוי לסכום ששולם
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amounts comparison */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 rtl:text-right ltr:text-left">סכום צפוי</div>
              <div className="font-semibold text-lg rtl:text-right ltr:text-left">{formatILS(expectedAmount)}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 rtl:text-right ltr:text-left">סכום ששולם</div>
              <div className="font-semibold text-lg rtl:text-right ltr:text-left">{formatILS(actualAmount)}</div>
            </div>
          </div>

          {/* Deviation alert */}
          <Alert variant={isOverpayment ? 'default' : 'destructive'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="rtl:text-right ltr:text-left">
              {isOverpayment
                ? `ללקוח יש עודף של ${formatILS(absDeviation)}`
                : `חסר סכום של ${formatILS(absDeviation)}`}
            </AlertDescription>
          </Alert>

          {/* Action explanation */}
          <div className="text-sm text-gray-600 rtl:text-right ltr:text-left space-y-2">
            <p>
              <strong>תשלום סופי</strong> - הסכום ששולם ({formatILS(actualAmount)}) יירשם כתשלום סופי.
              {!isOverpayment && ` היתרה של ${formatILS(absDeviation)} תימחק.`}
            </p>
            <p>
              <strong>תשלום חלקי</strong> - הסכום ששולם יירשם כתשלום חלקי.
              {!isOverpayment && ` יתרה לגבייה: ${formatILS(absDeviation)}.`}
            </p>
          </div>
        </div>

        <DialogFooter className="rtl:flex-row-reverse gap-2 sm:gap-2">
          <Button
            onClick={onApproveAsFinal}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 gap-2 rtl:flex-row-reverse"
          >
            <CheckCircle className="h-4 w-4" />
            {loading ? 'שומר...' : 'אשר כתשלום סופי'}
          </Button>
          {!isOverpayment && (
            <Button
              variant="outline"
              onClick={onRecordAsPartial}
              disabled={loading}
              className="border-orange-300 text-orange-700 hover:bg-orange-50 gap-2 rtl:flex-row-reverse"
            >
              <Coins className="h-4 w-4" />
              רשום כתשלום חלקי
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
