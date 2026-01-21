/**
 * Billing Letter Preview
 * Page for viewing and managing a billing letter
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  ArrowRight,
  Send,
  FileText,
  CheckCircle,
  XCircle,
  Building2,
  Receipt,
  Calendar,
  Mail,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { billingLetterService } from '../services/billing-letter.service';
import { MarkAsSentDialog } from './MarkAsSentDialog';
import type { BillingLetterWithClient } from '../types/billing.types';
import { BILLING_STATUS_LABELS, SENT_METHOD_LABELS } from '../types/billing.types';
import { formatILS, formatIsraeliDate } from '@/lib/formatters';

export function BillingLetterPreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [billingLetter, setBillingLetter] = useState<BillingLetterWithClient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markAsSentDialogOpen, setMarkAsSentDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (id) {
      loadBillingLetter();
    }
  }, [id]);

  const loadBillingLetter = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await billingLetterService.getById(id);
      if (fetchError) throw fetchError;
      setBillingLetter(data);
    } catch (err) {
      console.error('Error loading billing letter:', err);
      setError('שגיאה בטעינת מכתב החיוב');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!billingLetter) return;

    setIsSending(true);
    try {
      // TODO: Integrate with actual email sending service
      // For now, we'll just show a message that this feature is coming
      toast.info('שליחה במייל תהיה זמינה בקרוב');

      // In the future, this will:
      // 1. Generate the letter using template service
      // 2. Send via email service
      // 3. Update the billing letter status
    } catch (err) {
      console.error('Error sending email:', err);
      toast.error('שגיאה בשליחת המייל');
    } finally {
      setIsSending(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!billingLetter) return;

    try {
      const { error } = await billingLetterService.markAsPaid(billingLetter.id);
      if (error) throw error;

      toast.success('מכתב החיוב סומן כשולם');
      loadBillingLetter();
    } catch (err) {
      console.error('Error marking as paid:', err);
      toast.error('שגיאה בסימון כשולם');
    }
  };

  const handleCancel = async () => {
    if (!billingLetter) return;

    try {
      const { error } = await billingLetterService.cancel(billingLetter.id);
      if (error) throw error;

      toast.success('מכתב החיוב בוטל');
      loadBillingLetter();
    } catch (err) {
      console.error('Error cancelling:', err);
      toast.error('שגיאה בביטול');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      draft: 'secondary',
      sent: 'default',
      paid: 'default',
      cancelled: 'destructive',
    };

    const colors: Record<string, string> = {
      paid: 'bg-green-100 text-green-800 border-green-200',
      sent: 'bg-blue-100 text-blue-800 border-blue-200',
    };

    return (
      <Badge variant={variants[status]} className={colors[status] || ''}>
        {BILLING_STATUS_LABELS[status as keyof typeof BILLING_STATUS_LABELS] || status}
      </Badge>
    );
  };

  const getSentMethodIcon = () => {
    if (!billingLetter) return null;
    if (!billingLetter.sent_at) return null;

    if (billingLetter.sent_manually) {
      return <FileText className="h-4 w-4 text-gray-500" />;
    }
    return <Mail className="h-4 w-4 text-blue-500" />;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !billingLetter) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{error || 'מכתב החיוב לא נמצא'}</h2>
          <Button variant="outline" onClick={() => navigate('/collections')}>
            חזרה לגבייה
          </Button>
        </div>
      </div>
    );
  }

  const clientName = billingLetter.client.company_name_hebrew || billingLetter.client.company_name;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/collections')}
          className="mb-4 rtl:flex-row-reverse gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          <span>חזרה לגבייה</span>
        </Button>

        <div className="flex items-start justify-between rtl:flex-row-reverse">
          {/* Actions */}
          {billingLetter.status === 'draft' && (
            <div className="flex gap-2 rtl:flex-row-reverse">
              <Button
                variant="outline"
                onClick={() => setMarkAsSentDialogOpen(true)}
              >
                <FileText className="h-4 w-4 ml-2" />
                סמן כנשלח
              </Button>
              <Button onClick={handleSendEmail} disabled={isSending}>
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                ) : (
                  <Send className="h-4 w-4 ml-2" />
                )}
                שלח במייל
              </Button>
            </div>
          )}

          {billingLetter.status === 'sent' && (
            <div className="flex gap-2 rtl:flex-row-reverse">
              <Button variant="outline" onClick={handleCancel}>
                <XCircle className="h-4 w-4 ml-2" />
                בטל
              </Button>
              <Button onClick={handleMarkAsPaid}>
                <CheckCircle className="h-4 w-4 ml-2" />
                סמן כשולם
              </Button>
            </div>
          )}

          <div>
            <div className="flex items-center gap-3">
              {getStatusBadge(billingLetter.status)}
              <h1 className="text-3xl font-bold rtl:text-right">מכתב חיוב</h1>
            </div>
            <p className="text-gray-500 rtl:text-right mt-2">{clientName}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Details */}
          <Card>
            <CardHeader>
              <CardTitle className="rtl:text-right flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                פרטי הלקוח
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-right">
                <div className="font-medium text-lg">{clientName}</div>
                <div className="text-gray-600">ח.פ: {billingLetter.client.tax_id}</div>
              </div>
            </CardContent>
          </Card>

          {/* Service Description */}
          <Card>
            <CardHeader>
              <CardTitle className="rtl:text-right">תיאור השירות</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-right whitespace-pre-wrap">{billingLetter.service_description}</p>
            </CardContent>
          </Card>

          {/* Amount Details */}
          <Card>
            <CardHeader>
              <CardTitle className="rtl:text-right flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                פירוט סכומים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between rtl:flex-row-reverse">
                  <span className="font-medium">{formatILS(billingLetter.amount_before_vat)}</span>
                  <span className="text-gray-600">סכום לפני מע"מ:</span>
                </div>
                <div className="flex justify-between rtl:flex-row-reverse">
                  <span className="font-medium">{formatILS(billingLetter.vat_amount)}</span>
                  <span className="text-gray-600">מע"מ ({billingLetter.vat_rate}%):</span>
                </div>
                <Separator />
                <div className="flex justify-between rtl:flex-row-reverse">
                  <span className="font-bold text-lg">{formatILS(billingLetter.total_amount)}</span>
                  <span className="text-gray-600">סה"כ כולל מע"מ:</span>
                </div>

                {billingLetter.bank_discount_percentage > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between rtl:flex-row-reverse text-red-600">
                      <span className="font-medium">
                        -{formatILS(
                          billingLetter.amount_before_vat * (billingLetter.bank_discount_percentage / 100)
                        )}
                      </span>
                      <span>הנחה ({billingLetter.bank_discount_percentage}%):</span>
                    </div>
                    <div className="flex justify-between rtl:flex-row-reverse bg-green-50 p-3 rounded-md">
                      <span className="font-bold text-lg text-green-700">
                        {formatILS(billingLetter.amount_after_discount || 0)}
                      </span>
                      <span className="text-gray-600">סכום לתשלום אחרי הנחה:</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="rtl:text-right">סטטוס</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center rtl:flex-row-reverse">
                <span className="text-gray-600">סטטוס:</span>
                {getStatusBadge(billingLetter.status)}
              </div>

              {billingLetter.sent_at && (
                <div className="flex justify-between items-center rtl:flex-row-reverse">
                  <div className="flex items-center gap-2">
                    {getSentMethodIcon()}
                    <span>
                      {billingLetter.sent_manually
                        ? SENT_METHOD_LABELS[billingLetter.sent_method || 'manual_other']
                        : 'מייל'}
                    </span>
                  </div>
                  <span className="text-gray-600">נשלח:</span>
                </div>
              )}

              {billingLetter.sent_at && (
                <div className="flex justify-between items-center rtl:flex-row-reverse">
                  <span>{formatIsraeliDate(new Date(billingLetter.sent_at))}</span>
                  <span className="text-gray-600">תאריך שליחה:</span>
                </div>
              )}

              {billingLetter.payment_date && (
                <div className="flex justify-between items-center rtl:flex-row-reverse">
                  <span>{formatIsraeliDate(new Date(billingLetter.payment_date))}</span>
                  <span className="text-gray-600">תאריך תשלום:</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="rtl:text-right flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                תאריכים
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between rtl:flex-row-reverse">
                <span>{formatIsraeliDate(new Date(billingLetter.created_at))}</span>
                <span className="text-gray-600">נוצר:</span>
              </div>

              {billingLetter.due_date && (
                <div className="flex justify-between rtl:flex-row-reverse">
                  <span>{formatIsraeliDate(new Date(billingLetter.due_date))}</span>
                  <span className="text-gray-600">תאריך יעד:</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {billingLetter.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="rtl:text-right">הערות</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-right text-gray-600 whitespace-pre-wrap">
                  {billingLetter.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Mark As Sent Dialog */}
      <MarkAsSentDialog
        open={markAsSentDialogOpen}
        onOpenChange={setMarkAsSentDialogOpen}
        billingLetterId={billingLetter.id}
        clientName={clientName}
        onSuccess={loadBillingLetter}
      />
    </div>
  );
}

BillingLetterPreview.displayName = 'BillingLetterPreview';
