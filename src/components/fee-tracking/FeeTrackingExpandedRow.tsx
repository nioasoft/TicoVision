/**
 * FeeTrackingExpandedRow Component
 * Expandable row displaying complete payment details, files, installments, and history
 * For use in Fee Tracking Page table
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { AmountDisplay } from '@/components/payments/AmountDisplay';
import { DeviationBadge } from '@/components/payments/DeviationBadge';
import { PaymentMethodBadge } from '@/components/payments/PaymentMethodBadge';
import { InstallmentStatusBadge, InstallmentProgress } from '@/components/payments/InstallmentStatusBadge';
import { FileAttachmentList } from '@/components/payments/FileAttachmentList';
import { feeTrackingService } from '@/services/fee-tracking.service';
import type { ActualPaymentDetails } from '@/services/actual-payment.service';
import { formatILS } from '@/lib/payment-utils';

interface FeeTrackingExpandedRowProps {
  feeCalculationId: string;
  clientName: string;
}

export function FeeTrackingExpandedRow({
  feeCalculationId,
}: FeeTrackingExpandedRowProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [paymentDetails, setPaymentDetails] = useState<ActualPaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentDetails();
  }, [feeCalculationId]);

  const loadPaymentDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: serviceError } = await feeTrackingService.getPaymentDetails(
        feeCalculationId
      );

      if (serviceError) {
        setError(serviceError.message);
        return;
      }

      setPaymentDetails(data);
    } catch (err) {
      setError('אירעה שגיאה בטעינת פרטי התשלום');
      console.error('Error loading payment details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-muted/50 border-t" dir="rtl">
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-500 mt-4">טוען פרטי תשלום...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-muted/50 border-t" dir="rtl">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="rtl:text-right">שגיאה</AlertTitle>
          <AlertDescription className="rtl:text-right">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!paymentDetails) {
    return (
      <div className="p-4 bg-muted/50 border-t" dir="rtl">
        <div className="text-center text-muted-foreground py-8">
          אין פרטי תשלום זמינים עבור חישוב זה
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-muted/50 border-t" dir="rtl">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="rtl:text-right">
            סקירה
          </TabsTrigger>
          <TabsTrigger value="payment" className="rtl:text-right">
            פרטי תשלום
          </TabsTrigger>
          <TabsTrigger value="files" className="rtl:text-right">
            קבצים ({paymentDetails.attachments?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="installments" className="rtl:text-right">
            תשלומים
            {paymentDetails.installments?.length
              ? ` (${paymentDetails.installments.length})`
              : ''}
          </TabsTrigger>
          <TabsTrigger value="history" className="rtl:text-right">
            היסטוריה
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Original Amount Card */}
            <Card className="p-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2 rtl:text-right">
                סכום מקורי
              </h4>
              <AmountDisplay
                beforeVat={paymentDetails.feeCalculation.originalAmount || 0}
                size="lg"
              />
            </Card>

            {/* Expected Amount Card */}
            <Card className="p-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2 rtl:text-right">
                סכום מצופה (אחרי הנחה)
              </h4>
              <div className="space-y-1">
                <AmountDisplay
                  beforeVat={paymentDetails.feeCalculation.expectedAmount || 0}
                  size="lg"
                />
                {paymentDetails.feeCalculation.paymentMethodSelected && (
                  <div className="flex items-center gap-2 rtl:justify-end">
                    <PaymentMethodBadge
                      method={paymentDetails.feeCalculation.paymentMethodSelected}
                    />
                  </div>
                )}
              </div>
            </Card>

            {/* Actual Payment Card */}
            <Card className="p-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2 rtl:text-right">
                תשלום בפועל
              </h4>
              {paymentDetails.payment ? (
                <div className="space-y-1">
                  <AmountDisplay
                    beforeVat={paymentDetails.payment.amount_before_vat}
                    withVat={paymentDetails.payment.amount_with_vat}
                    size="lg"
                  />
                  <p className="text-xs text-muted-foreground rtl:text-right">
                    {format(new Date(paymentDetails.payment.payment_date), 'dd/MM/yyyy')}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground rtl:text-right">טרם שולם</p>
              )}
            </Card>
          </div>

          {/* Deviation Alert */}
          {paymentDetails.deviation && paymentDetails.deviation.deviation_amount && (
            <Alert
              variant={
                paymentDetails.deviation.alert_level === 'critical'
                  ? 'destructive'
                  : 'default'
              }
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="rtl:text-right">
                {paymentDetails.deviation.alert_level === 'critical'
                  ? '⚠️ סטייה משמעותית'
                  : 'סטייה בתשלום'}
              </AlertTitle>
              <AlertDescription className="rtl:text-right">
                {paymentDetails.deviation.alert_message}
                <div className="mt-2">
                  <DeviationBadge
                    deviationAmount={paymentDetails.deviation.deviation_amount}
                    deviationPercent={paymentDetails.deviation.deviation_percent || 0}
                    alertLevel={paymentDetails.deviation.alert_level}
                  />
                </div>
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Payment Details Tab */}
        <TabsContent value="payment" className="space-y-3 mt-4">
          {paymentDetails.payment ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="rtl:text-right block mb-1">תאריך תשלום</Label>
                  <p className="text-sm rtl:text-right">
                    {format(new Date(paymentDetails.payment.payment_date), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div>
                  <Label className="rtl:text-right block mb-1">שיטת תשלום</Label>
                  <PaymentMethodBadge method={paymentDetails.payment.payment_method} />
                </div>
              </div>

              {paymentDetails.payment.payment_reference && (
                <div>
                  <Label className="rtl:text-right block mb-1">אסמכתא</Label>
                  <p className="text-sm rtl:text-right font-mono">
                    {paymentDetails.payment.payment_reference}
                  </p>
                </div>
              )}

              <div>
                <Label className="rtl:text-right block mb-1">פירוט סכומים</Label>
                <Card className="p-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>לפני מע"מ:</span>
                      <span>{formatILS(paymentDetails.payment.amount_before_vat)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>מע"מ (18%):</span>
                      <span>{formatILS(paymentDetails.payment.amount_vat)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span>סה"כ כולל מע"מ:</span>
                      <span>{formatILS(paymentDetails.payment.amount_with_vat)}</span>
                    </div>
                  </div>
                </Card>
              </div>

              {paymentDetails.payment.notes && (
                <div>
                  <Label className="rtl:text-right block mb-1">הערות</Label>
                  <p className="text-sm rtl:text-right bg-muted p-3 rounded">
                    {paymentDetails.payment.notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              טרם נרשם תשלום עבור חישוב זה
            </div>
          )}
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="mt-4">
          {paymentDetails.payment?.attachment_ids &&
          paymentDetails.payment.attachment_ids.length > 0 ? (
            <FileAttachmentList
              attachmentIds={paymentDetails.payment.attachment_ids}
              readonly={true}
            />
          ) : (
            <div className="text-center text-muted-foreground py-8">
              אין קבצים מצורפים
            </div>
          )}
        </TabsContent>

        {/* Installments Tab */}
        <TabsContent value="installments" className="mt-4">
          {paymentDetails.installments && paymentDetails.installments.length > 0 ? (
            <div className="space-y-3">
              <InstallmentProgress
                totalInstallments={paymentDetails.installments.length}
                paidInstallments={
                  paymentDetails.installments.filter((i) => i.status === 'paid').length
                }
                overdueInstallments={
                  paymentDetails.installments.filter((i) => i.status === 'overdue').length
                }
              />

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="rtl:text-right">תשלום</TableHead>
                    <TableHead className="rtl:text-right">תאריך</TableHead>
                    <TableHead className="rtl:text-right">סכום</TableHead>
                    <TableHead className="rtl:text-right">סטטוס</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentDetails.installments.map((inst) => (
                    <TableRow key={inst.id}>
                      <TableCell className="rtl:text-right">
                        {inst.installment_number}
                      </TableCell>
                      <TableCell className="rtl:text-right">
                        {format(new Date(inst.installment_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="rtl:text-right">
                        {formatILS(inst.installment_amount)}
                      </TableCell>
                      <TableCell className="rtl:text-right">
                        <InstallmentStatusBadge
                          status={inst.status}
                          dueDate={new Date(inst.installment_date)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">אין תשלומים</div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <div className="text-center text-muted-foreground py-8">
            היסטוריית שינויים תתווסף בקרוב
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
