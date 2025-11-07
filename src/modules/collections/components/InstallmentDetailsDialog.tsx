/**
 * Installment Details Dialog
 * Display installment schedule with ability to mark as paid
 */

import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { InstallmentStatusBadge } from '@/components/payments/InstallmentStatusBadge';
import { installmentService } from '@/services/installment.service';
import type { PaymentInstallment } from '@/types/payment.types';
import { formatILS } from '@/lib/formatters';

interface InstallmentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actualPaymentId: string;
  clientName: string;
  onUpdate?: () => void;
}

export function InstallmentDetailsDialog(props: InstallmentDetailsDialogProps) {
  const [installments, setInstallments] = useState<PaymentInstallment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (props.open) {
      loadInstallments();
    }
  }, [props.open, props.actualPaymentId]);

  const loadInstallments = async () => {
    setLoading(true);
    const { data } = await installmentService.getInstallments(props.actualPaymentId);
    setInstallments(data || []);
    setLoading(false);
  };

  const handleMarkPaid = async (installmentId: string) => {
    const { error } = await installmentService.markInstallmentPaid(installmentId, new Date());
    if (error) {
      toast.error('שגיאה בעדכון התשלום');
      return;
    }
    toast.success('התשלום סומן כשולם');
    loadInstallments();
    props.onUpdate?.();
  };

  const summary = useMemo(() => {
    const total = installments.length;
    const paid = installments.filter((i) => i.status === 'paid').length;
    const overdue = installments.filter((i) => i.status === 'overdue').length;
    const totalAmount = installments.reduce((sum, i) => sum + Number(i.installment_amount), 0);
    const paidAmount = installments
      .filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + Number(i.installment_amount), 0);

    return { total, paid, overdue, totalAmount, paidAmount };
  }, [installments]);

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-3xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="rtl:text-right ltr:text-left">
            פירוט תשלומים - {props.clientName}
          </DialogTitle>
          <DialogDescription className="rtl:text-right ltr:text-left">
            {summary.total} תשלומים | {summary.paid} שולמו | {summary.overdue} באיחור
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8 rtl:text-right ltr:text-left">טוען...</div>
        ) : (
          <div className="space-y-4">
            {/* Summary Card */}
            <Card className="p-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="rtl:text-right ltr:text-left">
                  <div className="text-muted-foreground">סה"כ לתשלום</div>
                  <div className="font-medium">{formatILS(summary.totalAmount)}</div>
                </div>
                <div className="rtl:text-right ltr:text-left">
                  <div className="text-muted-foreground">שולם</div>
                  <div className="font-medium text-green-600">{formatILS(summary.paidAmount)}</div>
                </div>
                <div className="rtl:text-right ltr:text-left">
                  <div className="text-muted-foreground">נותר</div>
                  <div className="font-medium">{formatILS(summary.totalAmount - summary.paidAmount)}</div>
                </div>
              </div>
            </Card>

            {/* Installments Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="rtl:text-right ltr:text-left">תשלום</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">תאריך</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">סכום</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">סטטוס</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installments.map((installment) => (
                  <TableRow key={installment.id}>
                    <TableCell className="rtl:text-right ltr:text-left font-medium">
                      {installment.installment_number}
                    </TableCell>
                    <TableCell className="rtl:text-right ltr:text-left">
                      {format(new Date(installment.installment_date), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell className="rtl:text-right ltr:text-left">
                      {formatILS(Number(installment.installment_amount))}
                    </TableCell>
                    <TableCell className="rtl:text-right ltr:text-left">
                      <InstallmentStatusBadge
                        status={installment.status}
                        dueDate={new Date(installment.installment_date)}
                      />
                    </TableCell>
                    <TableCell className="rtl:text-right ltr:text-left">
                      {installment.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkPaid(installment.id)}
                        >
                          סמן כשולם
                        </Button>
                      )}
                      {installment.status === 'paid' && installment.paid_date && (
                        <span className="text-xs text-muted-foreground">
                          שולם ב-{format(new Date(installment.paid_date), 'dd/MM/yyyy')}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => props.onOpenChange(false)}>סגור</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
