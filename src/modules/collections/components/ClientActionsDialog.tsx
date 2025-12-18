/**
 * Client Actions Dialog
 * Centered dialog that opens when clicking a client row
 * Contains all actions and expandable row tabs
 */

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import {
  CheckCircle,
  Coins,
  Mail,
  MessageSquare,
  History,
  Calendar,
  MessageCircle,
  Phone,
  Building2,
} from 'lucide-react';
import type { CollectionRow } from '@/types/collection.types';
import { formatILS, formatIsraeliDate, getStatusLabel, getStatusVariant } from '@/lib/formatters';
import { PaymentMethodBadge, DiscountBadge } from '@/components/payments/PaymentMethodBadge';
import { FileAttachmentList } from '@/components/payments/FileAttachmentList';
import { InstallmentStatusBadge } from '@/components/payments/InstallmentStatusBadge';
import { actualPaymentService } from '@/services/actual-payment.service';
import type { ActualPaymentDetails } from '@/services/actual-payment.service';

interface ClientActionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: CollectionRow | null;
  onMarkAsPaid: (row: CollectionRow) => void;
  onMarkPartialPayment: (row: CollectionRow) => void;
  onSendReminder: (row: CollectionRow) => void;
  onSendWhatsApp: (row: CollectionRow) => void;
  onLogInteraction: (row: CollectionRow) => void;
  onViewHistory: (row: CollectionRow) => void;
  onRecordPromise: (row: CollectionRow) => void;
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'green' | 'blue';
}

const ActionButton: React.FC<ActionButtonProps> = ({ icon, label, onClick, variant = 'default' }) => {
  const variantClasses = {
    default: 'hover:bg-gray-100 border-gray-200',
    green: 'hover:bg-green-50 border-green-200 text-green-700',
    blue: 'hover:bg-blue-50 border-blue-200 text-blue-700',
  };

  return (
    <Button
      variant="outline"
      className={`h-auto py-3 px-4 flex flex-col items-center gap-2 ${variantClasses[variant]}`}
      onClick={onClick}
    >
      {icon}
      <span className="text-xs rtl:text-right ltr:text-left">{label}</span>
    </Button>
  );
};

export const ClientActionsDialog: React.FC<ClientActionsDialogProps> = ({
  open,
  onOpenChange,
  row,
  onMarkAsPaid,
  onMarkPartialPayment,
  onSendReminder,
  onSendWhatsApp,
  onLogInteraction,
  onViewHistory,
  onRecordPromise,
}) => {
  const [activeTab, setActiveTab] = useState('files');
  const [paymentDetails, setPaymentDetails] = useState<ActualPaymentDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Load payment details when row changes
  useEffect(() => {
    if (row && open) {
      loadPaymentDetails();
    }
  }, [row?.fee_calculation_id, open]);

  const loadPaymentDetails = async () => {
    if (!row) return;

    setDetailsLoading(true);
    const { data } = await actualPaymentService.getPaymentDetails(row.fee_calculation_id);
    setPaymentDetails(data);
    setDetailsLoading(false);
  };

  if (!row) return null;

  const clientName = row.company_name_hebrew || row.client_name;
  const fileCount = paymentDetails?.attachments.length || 0;
  const installmentCount = paymentDetails?.installments.length || 0;

  const handleAction = (action: (row: CollectionRow) => void) => {
    action(row);
    // Keep the dialog open - the action dialogs will handle closing
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl rtl:text-right ltr:text-left">{clientName}</DialogTitle>
        </DialogHeader>

        {/* Client Info Section */}
        <div className="space-y-3 border-b pb-4">
          {/* Contact Info */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {row.contact_email && (
              <div className="flex items-center gap-1 rtl:flex-row-reverse">
                <Mail className="h-3.5 w-3.5" />
                <span>{row.contact_email}</span>
              </div>
            )}
            {row.contact_phone && (
              <div className="flex items-center gap-1 rtl:flex-row-reverse">
                <Phone className="h-3.5 w-3.5" />
                <span>{row.contact_phone}</span>
              </div>
            )}
          </div>

          {/* Amount Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 rtl:text-right ltr:text-left">סכום מקורי</div>
              <div className="font-semibold text-lg rtl:text-right ltr:text-left">{formatILS(row.amount_original)}</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 rtl:text-right ltr:text-left">לאחר הנחה</div>
              <div className="font-semibold text-lg text-blue-600 rtl:text-right ltr:text-left">
                {row.amount_after_discount ? formatILS(row.amount_after_discount) : '-'}
              </div>
              {row.discount_percent > 0 && (
                <DiscountBadge discountPercent={row.discount_percent} className="text-[10px] mt-1" />
              )}
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 rtl:text-right ltr:text-left">שיטת תשלום</div>
              <div className="mt-1">
                <PaymentMethodBadge method={row.payment_method_selected || null} className="text-[10px]" />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 rtl:text-right ltr:text-left">סטטוס</div>
              <Badge variant={getStatusVariant(row.payment_status as Parameters<typeof getStatusVariant>[0])} className="mt-1 text-[10px]">
                {getStatusLabel(row.payment_status as Parameters<typeof getStatusLabel>[0])}
              </Badge>
            </div>
          </div>

          {/* Date Info */}
          <div className="text-xs text-gray-500 rtl:text-right ltr:text-left">
            נשלח: {formatIsraeliDate(row.letter_sent_date)} ({row.days_since_sent} ימים)
          </div>
        </div>

        {/* Action Buttons Section */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm rtl:text-right ltr:text-left">פעולות</h3>
          <div className="grid grid-cols-3 gap-2">
            <ActionButton
              icon={<CheckCircle className="h-5 w-5 text-green-600" />}
              label="סימון כשולם"
              onClick={() => handleAction(onMarkAsPaid)}
              variant="green"
            />
            <ActionButton
              icon={<Coins className="h-5 w-5 text-blue-600" />}
              label="תשלום חלקי"
              onClick={() => handleAction(onMarkPartialPayment)}
              variant="blue"
            />
            <ActionButton
              icon={<Mail className="h-5 w-5" />}
              label="תזכורת במייל"
              onClick={() => handleAction(onSendReminder)}
            />
            <ActionButton
              icon={<MessageCircle className="h-5 w-5 text-green-600" />}
              label="WhatsApp"
              onClick={() => handleAction(onSendWhatsApp)}
              variant="green"
            />
            <ActionButton
              icon={<MessageSquare className="h-5 w-5" />}
              label="רישום אינטראקציה"
              onClick={() => handleAction(onLogInteraction)}
            />
            <ActionButton
              icon={<Calendar className="h-5 w-5" />}
              label="הבטחת תשלום"
              onClick={() => handleAction(onRecordPromise)}
            />
          </div>
          <Button
            variant="outline"
            className="w-full flex items-center justify-center gap-2 rtl:flex-row-reverse"
            onClick={() => handleAction(onViewHistory)}
          >
            <History className="h-4 w-4" />
            <span>הצגת היסטוריה</span>
          </Button>
        </div>

        {/* Tabs Section (from Expandable Row) */}
        <div className="border-t pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="files" className="rtl:text-right ltr:text-left text-xs">
                קבצים ({fileCount})
              </TabsTrigger>
              <TabsTrigger value="installments" className="rtl:text-right ltr:text-left text-xs">
                תשלומים ({installmentCount})
              </TabsTrigger>
              <TabsTrigger value="deviation" className="rtl:text-right ltr:text-left text-xs">
                סטייה
              </TabsTrigger>
              <TabsTrigger value="notes" className="rtl:text-right ltr:text-left text-xs">
                הערות
              </TabsTrigger>
            </TabsList>

            {detailsLoading ? (
              <div className="py-8 text-center text-gray-500 rtl:text-right ltr:text-left">טוען...</div>
            ) : !paymentDetails ? (
              <div className="py-8 text-center text-gray-500 rtl:text-right ltr:text-left">אין נתונים זמינים</div>
            ) : (
              <>
                {/* Files Tab */}
                <TabsContent value="files" className="space-y-2 min-h-[120px]">
                  {fileCount > 0 ? (
                    <FileAttachmentList
                      attachmentIds={paymentDetails.payment.attachmentIds || []}
                      readonly={true}
                    />
                  ) : (
                    <div className="text-center text-gray-500 py-8 rtl:text-right ltr:text-left">
                      אין קבצים מצורפים
                    </div>
                  )}
                </TabsContent>

                {/* Installments Tab */}
                <TabsContent value="installments" className="min-h-[120px]">
                  {installmentCount > 0 ? (
                    <Card className="p-4 space-y-3">
                      <div className="grid grid-cols-3 gap-4 text-sm rtl:text-right ltr:text-left">
                        <div>
                          <div className="text-gray-500">סה"כ תשלומים</div>
                          <div className="font-medium text-lg">{installmentCount}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">שולמו</div>
                          <div className="font-medium text-lg text-green-600">
                            {paymentDetails.installments.filter((i) => i.status === 'paid').length}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">באיחור</div>
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
                          <div className="text-xs text-gray-500 text-center pt-2">
                            ועוד {installmentCount - 5} תשלומים...
                          </div>
                        )}
                      </div>
                    </Card>
                  ) : (
                    <div className="text-center text-gray-500 py-8 rtl:text-right ltr:text-left">
                      אין תשלומים
                    </div>
                  )}
                </TabsContent>

                {/* Deviation Tab */}
                <TabsContent value="deviation" className="min-h-[120px]">
                  {paymentDetails.deviation ? (
                    <Card className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-sm rtl:text-right ltr:text-left">
                        <div>
                          <div className="text-gray-500">סכום מצופה</div>
                          <div className="font-medium text-lg">
                            {formatILS(Number(paymentDetails.deviation.expectedAmount))}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">סכום ששולם</div>
                          <div className="font-medium text-lg">
                            {formatILS(Number(paymentDetails.deviation.actualAmount))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500 rtl:text-right ltr:text-left">
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
                          <div className="text-sm text-gray-500 rtl:text-right ltr:text-left">
                            {paymentDetails.deviation.alertMessage}
                          </div>
                        )}
                      </div>
                    </Card>
                  ) : (
                    <div className="text-center text-gray-500 py-8 rtl:text-right ltr:text-left">
                      אין סטייה בתשלום
                    </div>
                  )}
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent value="notes" className="min-h-[120px]">
                  <Card className="p-4">
                    <div className="text-sm rtl:text-right ltr:text-left whitespace-pre-wrap">
                      {paymentDetails.payment.notes || 'אין הערות'}
                    </div>
                  </Card>
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

ClientActionsDialog.displayName = 'ClientActionsDialog';
