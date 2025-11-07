/**
 * Collection Expandable Row
 * Expandable row showing files, history, installments, and notes
 * Displays in tabs for organized information access
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import { FileAttachmentList } from '@/components/payments/FileAttachmentList';
import { InstallmentStatusBadge } from '@/components/payments/InstallmentStatusBadge';
import { actualPaymentService } from '@/services/actual-payment.service';
import type { ActualPaymentDetails } from '@/services/actual-payment.service';
import { formatILS } from '@/lib/formatters';

interface CollectionExpandableRowProps {
  feeCalculationId: string;
  actualPaymentId?: string;
  clientName: string;
}

export function CollectionExpandableRow(props: CollectionExpandableRowProps) {
  const [activeTab, setActiveTab] = useState('files');
  const [paymentDetails, setPaymentDetails] = useState<ActualPaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaymentDetails();
  }, [props.feeCalculationId]);

  const loadPaymentDetails = async () => {
    if (!props.actualPaymentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data } = await actualPaymentService.getPaymentDetails(props.feeCalculationId);
    setPaymentDetails(data);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground rtl:text-right ltr:text-left">
        טוען...
      </div>
    );
  }

  if (!paymentDetails) {
    return (
      <div className="p-4 text-center text-muted-foreground rtl:text-right ltr:text-left">
        אין נתונים זמינים
      </div>
    );
  }

  const fileCount = paymentDetails.attachments.length;
  const installmentCount = paymentDetails.installments.length;

  return (
    <div className="p-4 bg-muted/50 border-t">
      <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="files" className="rtl:text-right ltr:text-left">
            קבצים ({fileCount})
          </TabsTrigger>
          <TabsTrigger value="installments" className="rtl:text-right ltr:text-left">
            תשלומים ({installmentCount})
          </TabsTrigger>
          <TabsTrigger value="deviation" className="rtl:text-right ltr:text-left">
            סטייה
          </TabsTrigger>
          <TabsTrigger value="notes" className="rtl:text-right ltr:text-left">
            הערות
          </TabsTrigger>
        </TabsList>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-2">
          {fileCount > 0 ? (
            <FileAttachmentList
              attachmentIds={paymentDetails.payment.attachmentIds || []}
              readonly={true}
            />
          ) : (
            <div className="text-center text-muted-foreground py-4 rtl:text-right ltr:text-left">
              אין קבצים מצורפים
            </div>
          )}
        </TabsContent>

        {/* Installments Tab */}
        <TabsContent value="installments">
          {installmentCount > 0 ? (
            <Card className="p-4 space-y-3">
              <div className="grid grid-cols-3 gap-4 text-sm rtl:text-right ltr:text-left">
                <div>
                  <div className="text-muted-foreground">סה"כ תשלומים</div>
                  <div className="font-medium text-lg">{installmentCount}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">שולמו</div>
                  <div className="font-medium text-lg text-green-600">
                    {paymentDetails.installments.filter((i) => i.status === 'paid').length}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">באיחור</div>
                  <div className="font-medium text-lg text-red-600">
                    {paymentDetails.installments.filter((i) => i.status === 'overdue').length}
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t">
                {paymentDetails.installments.slice(0, 5).map((installment) => (
                  <div
                    key={installment.id}
                    className="flex justify-between items-center text-sm rtl:flex-row ltr:flex-row-reverse"
                  >
                    <span className="rtl:text-right ltr:text-left">
                      תשלום {installment.installmentNumber} -{' '}
                      {format(new Date(installment.installmentDate), 'dd/MM/yyyy')}
                    </span>
                    <div className="flex items-center gap-2 rtl:flex-row-reverse">
                      <span className="font-medium">
                        {formatILS(Number(installment.installmentAmount))}
                      </span>
                      <InstallmentStatusBadge
                        status={installment.status}
                        dueDate={new Date(installment.installmentDate)}
                      />
                    </div>
                  </div>
                ))}
                {installmentCount > 5 && (
                  <div className="text-xs text-muted-foreground text-center pt-2">
                    ועוד {installmentCount - 5} תשלומים...
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <div className="text-center text-muted-foreground py-4 rtl:text-right ltr:text-left">
              אין תשלומים
            </div>
          )}
        </TabsContent>

        {/* Deviation Tab */}
        <TabsContent value="deviation">
          {paymentDetails.deviation ? (
            <Card className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm rtl:text-right ltr:text-left">
                <div>
                  <div className="text-muted-foreground">סכום מצופה</div>
                  <div className="font-medium text-lg">
                    {formatILS(Number(paymentDetails.deviation.expectedAmount))}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">סכום ששולם</div>
                  <div className="font-medium text-lg">
                    {formatILS(Number(paymentDetails.deviation.actualAmount))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground rtl:text-right ltr:text-left">
                    סטייה:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {formatILS(Math.abs(Number(paymentDetails.deviation.deviationAmount)))}
                    </span>
                    <Badge
                      variant={
                        paymentDetails.deviation.alertLevel === 'critical'
                          ? 'destructive'
                          : paymentDetails.deviation.alertLevel === 'warning'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {Number(paymentDetails.deviation.deviationPercent).toFixed(2)}%
                    </Badge>
                  </div>
                </div>

                {paymentDetails.deviation.alertMessage && (
                  <div className="text-sm text-muted-foreground rtl:text-right ltr:text-left">
                    {paymentDetails.deviation.alertMessage}
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <div className="text-center text-muted-foreground py-4 rtl:text-right ltr:text-left">
              אין סטייה בתשלום
            </div>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          <Card className="p-4">
            <div className="text-sm rtl:text-right ltr:text-left whitespace-pre-wrap">
              {paymentDetails.payment.notes || 'אין הערות'}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
