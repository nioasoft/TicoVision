/**
 * Actual Payment Entry Dialog
 * Main dialog for recording actual payments from clients
 * Features: payment details, VAT calculation, deviation alerts, file upload, installments
 */

import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

import { AmountDisplay, AmountWithVATBreakdown } from '@/components/payments/AmountDisplay';
import { DeviationBadge } from '@/components/payments/DeviationBadge';
import { PaymentMethodBadge } from '@/components/payments/PaymentMethodBadge';
import { FileAttachmentList } from '@/components/payments/FileAttachmentList';

import { actualPaymentService } from '@/services/actual-payment.service';
import { installmentService } from '@/services/installment.service';
import type { PaymentMethod, AlertLevel } from '@/types/payment.types';
import { PAYMENT_METHOD_LABELS } from '@/types/payment.types';
import { formatILS } from '@/lib/formatters';

interface ActualPaymentEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feeCalculationId: string;
  clientName: string;
  clientId: string;
  originalAmount: number;
  expectedAmount: number;
  expectedDiscount: number;
  paymentMethodSelected?: PaymentMethod;
  onSuccess: () => void;
}

export function ActualPaymentEntryDialog(props: ActualPaymentEntryDialogProps) {
  // State
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [amountPaid, setAmountPaid] = useState<number>(props.expectedAmount);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    props.paymentMethodSelected || 'bank_transfer'
  );
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [hasInstallments, setHasInstallments] = useState(false);
  const [numInstallments, setNumInstallments] = useState(8);
  const [attachmentIds, setAttachmentIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculated values
  const vatBreakdown = useMemo(
    () => actualPaymentService.calculateVATAmounts(amountPaid),
    [amountPaid]
  );

  const deviation = useMemo(() => {
    const diff = props.expectedAmount - amountPaid;
    const percent = props.expectedAmount > 0 ? (diff / props.expectedAmount) * 100 : 0;
    return { amount: diff, percent };
  }, [amountPaid, props.expectedAmount]);

  const alertLevel: AlertLevel = useMemo(() => {
    const absPercent = Math.abs(deviation.percent);
    if (absPercent < 1) return 'info';
    if (absPercent < 5) return 'warning';
    return 'critical';
  }, [deviation]);

  // Handle submit
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const finalAmount = typeof amountPaid === 'number' ? amountPaid : 0;
      const paymentData = {
        clientId: props.clientId,
        feeCalculationId: props.feeCalculationId,
        amountPaid: finalAmount,
        paymentDate,
        paymentMethod,
        paymentReference,
        numInstallments: hasInstallments ? numInstallments : undefined,
        attachmentIds,
        notes,
      };

      if (hasInstallments && numInstallments > 0) {
        // Create installments
        const installments = installmentService.generateInstallmentSchedule(
          numInstallments,
          finalAmount,
          paymentDate
        );

        await actualPaymentService.recordPaymentWithInstallments(paymentData, installments);
      } else {
        await actualPaymentService.recordPayment(paymentData);
      }

      toast.success('התשלום נרשם בהצלחה');
      props.onSuccess();
      props.onOpenChange(false);
    } catch (error) {
      toast.error('שגיאה בשמירת התשלום');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (files: File[]) => {
    toast.info('מעלה קבצים...');
    const newIds = files.map((_, index) => `temp-${Date.now()}-${index}`);
    setAttachmentIds([...attachmentIds, ...newIds]);
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="rtl:text-right ltr:text-left">
            הזנת תשלום בפועל - {props.clientName}
          </DialogTitle>
          <DialogDescription className="rtl:text-right ltr:text-left">
            רישום תשלום שהתקבל מהלקוח
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Section */}
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3 rtl:text-right ltr:text-left">
              📊 סיכום חישוב שכר טרחה
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="rtl:text-right ltr:text-left">סכום מקורי:</span>
                <AmountDisplay beforeVat={props.originalAmount} size="sm" />
              </div>
              {props.paymentMethodSelected && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="rtl:text-right ltr:text-left">שיטת תשלום שנבחרה:</span>
                    <PaymentMethodBadge method={props.paymentMethodSelected} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="rtl:text-right ltr:text-left">הנחה מצופה:</span>
                    <span>{props.expectedDiscount}%</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center font-medium pt-2 border-t">
                <span className="rtl:text-right ltr:text-left">סכום מצופה:</span>
                <AmountDisplay beforeVat={props.expectedAmount} size="sm" />
              </div>
            </div>
          </Card>

          {/* Payment Details Form */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium rtl:text-right ltr:text-left">
              💳 פרטי התשלום בפועל
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="paymentDate" className="rtl:text-right ltr:text-left block">
                  תאריך תשלום
                </Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={format(paymentDate, 'yyyy-MM-dd')}
                  onChange={(e) => setPaymentDate(new Date(e.target.value))}
                  className="rtl:text-right ltr:text-left"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amountPaid" className="rtl:text-right ltr:text-left block">
                  סכום ששולם
                </Label>
                <MoneyInput
                  value={amountPaid}
                  onChange={(value) => setAmountPaid(value)}
                  className="rtl:text-right ltr:text-left"
                />
                <div className="text-xs text-muted-foreground rtl:text-right ltr:text-left">
                  <AmountWithVATBreakdown beforeVat={vatBreakdown.beforeVat} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod" className="rtl:text-right ltr:text-left block">
                שיטת תשלום
              </Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger className="rtl:text-right ltr:text-left">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="bank_transfer">{PAYMENT_METHOD_LABELS.bank_transfer} (9%)</SelectItem>
                  <SelectItem value="cc_single">{PAYMENT_METHOD_LABELS.cc_single} (8%)</SelectItem>
                  <SelectItem value="cc_installments">{PAYMENT_METHOD_LABELS.cc_installments} (4%)</SelectItem>
                  <SelectItem value="checks">{PAYMENT_METHOD_LABELS.checks} (0%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference" className="rtl:text-right ltr:text-left block">
                אסמכתא / מספר תנועה
              </Label>
              <Input
                id="reference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="rtl:text-right ltr:text-left"
                placeholder="מספר אסמכתא"
              />
            </div>

            {/* Installments Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 rtl:flex-row-reverse">
                <Checkbox
                  id="hasInstallments"
                  checked={hasInstallments}
                  onCheckedChange={(checked) => setHasInstallments(checked as boolean)}
                />
                <Label htmlFor="hasInstallments" className="cursor-pointer rtl:text-right ltr:text-left">
                  תשלום בתשלומים
                </Label>
              </div>

              {hasInstallments && (
                <div className="pr-6 space-y-2">
                  <Label htmlFor="numInstallments" className="rtl:text-right ltr:text-left block">
                    מספר תשלומים
                  </Label>
                  <Input
                    id="numInstallments"
                    type="number"
                    min={2}
                    max={24}
                    value={numInstallments}
                    onChange={(e) => setNumInstallments(Number(e.target.value))}
                    className="rtl:text-right ltr:text-left"
                  />
                  <p className="text-xs text-muted-foreground rtl:text-right ltr:text-left">
                    סכום לתשלום: {formatILS(Math.ceil((typeof amountPaid === 'number' ? amountPaid : 0) / numInstallments))} × {numInstallments}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* File Upload - Payment Attachments
              NOTE: Payment attachments are transaction-specific, not client-level documents.
              They belong to this specific payment action (receipts, bank confirmations, invoices).
              This is CORRECT - do NOT move to centralized File Manager (/files).
              The File Manager is for client-level documents with categories, not payment proofs.
          */}
          <div className="space-y-2">
            <Label className="rtl:text-right ltr:text-left block">📎 קבצים מצורפים</Label>
            <FileAttachmentList
              attachmentIds={attachmentIds}
              onUpload={handleFileUpload}
              maxFiles={10}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="rtl:text-right ltr:text-left block">
              📝 הערות
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rtl:text-right ltr:text-left"
              placeholder="הערות נוספות..."
              rows={3}
            />
          </div>

          {/* Deviation Alert */}
          {Math.abs(deviation.percent) > 0.1 && (
            <Alert variant={alertLevel === 'critical' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="rtl:text-right ltr:text-left">⚠️ התראת סטייה</AlertTitle>
              <AlertDescription className="rtl:text-right ltr:text-left">
                הלקוח שילם {formatILS(amountPaid)} במקום {formatILS(props.expectedAmount)}
                <br />
                סטייה:{' '}
                <DeviationBadge
                  deviationAmount={deviation.amount}
                  deviationPercent={deviation.percent}
                  alertLevel={alertLevel}
                />
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 rtl:space-x-reverse">
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            ביטול
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'שומר...' : 'שמור תשלום'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
