/**
 * Billing Letter Preview
 * Page for viewing and managing a billing letter
 *
 * Redesigned with editorial/financial magazine aesthetic
 * - Dramatic amount display as focal point
 * - Clean timeline for letter journey
 * - Sophisticated typography and spacing
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  ArrowRight,
  Send,
  FileText,
  CheckCircle2,
  XCircle,
  Building2,
  Calendar,
  Mail,
  AlertCircle,
  Eye,
  Bell,
  Clock,
  CircleDot,
  Receipt,
  Percent,
} from 'lucide-react';
import { toast } from 'sonner';
import { billingLetterService } from '../services/billing-letter.service';
import { MarkAsSentDialog } from './MarkAsSentDialog';
import { BillingLetterPreviewDialog } from './BillingLetterPreviewDialog';
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
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [isReminderMode, setIsReminderMode] = useState(false);

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

  // Status configuration with colors and icons
  const getStatusConfig = (status: string) => {
    const configs: Record<string, {
      label: string;
      bgColor: string;
      textColor: string;
      borderColor: string;
      icon: typeof CheckCircle2;
    }> = {
      draft: {
        label: 'טיוטה',
        bgColor: 'bg-slate-100',
        textColor: 'text-slate-700',
        borderColor: 'border-slate-200',
        icon: FileText
      },
      sent: {
        label: 'נשלח',
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
        icon: Send
      },
      paid: {
        label: 'שולם',
        bgColor: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        borderColor: 'border-emerald-200',
        icon: CheckCircle2
      },
      cancelled: {
        label: 'בוטל',
        bgColor: 'bg-red-50',
        textColor: 'text-red-700',
        borderColor: 'border-red-200',
        icon: XCircle
      },
    };
    return configs[status] || configs.draft;
  };

  // Build timeline events
  const buildTimeline = () => {
    if (!billingLetter) return [];

    const events: Array<{
      date: Date;
      label: string;
      description?: string;
      icon: typeof CheckCircle2;
      color: string;
    }> = [];

    // Created
    events.push({
      date: new Date(billingLetter.created_at),
      label: 'נוצר',
      icon: CircleDot,
      color: 'text-slate-400',
    });

    // Sent
    if (billingLetter.sent_at) {
      events.push({
        date: new Date(billingLetter.sent_at),
        label: 'נשלח',
        description: billingLetter.sent_manually
          ? SENT_METHOD_LABELS[billingLetter.sent_method || 'manual_other']
          : 'בדוא"ל',
        icon: billingLetter.sent_manually ? FileText : Mail,
        color: 'text-blue-500',
      });
    }

    // Reminders - show if reminders were sent (use updated_at as approximation)
    if (billingLetter.reminder_count > 0) {
      events.push({
        date: new Date(billingLetter.updated_at),
        label: billingLetter.reminder_count === 1
          ? 'נשלחה תזכורת'
          : `נשלחו ${billingLetter.reminder_count} תזכורות`,
        icon: Bell,
        color: 'text-amber-500',
      });
    }

    // Paid
    if (billingLetter.payment_date) {
      events.push({
        date: new Date(billingLetter.payment_date),
        label: 'שולם',
        icon: CheckCircle2,
        color: 'text-emerald-500',
      });
    }

    // Cancelled
    if (billingLetter.status === 'cancelled') {
      events.push({
        date: new Date(billingLetter.updated_at),
        label: 'בוטל',
        icon: XCircle,
        color: 'text-red-500',
      });
    }

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
            <span className="text-slate-500 text-sm">טוען פרטי מכתב חיוב...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !billingLetter) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="h-10 w-10 text-red-400" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-800 mb-2">
              {error || 'מכתב החיוב לא נמצא'}
            </h2>
            <p className="text-slate-500 mb-6">לא הצלחנו לטעון את פרטי המכתב</p>
            <Button variant="outline" onClick={() => navigate('/collections')}>
              <ArrowRight className="h-4 w-4 ml-2" />
              חזרה לגבייה
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const clientName = billingLetter.client.company_name_hebrew || billingLetter.client.company_name;
  const statusConfig = getStatusConfig(billingLetter.status);
  const StatusIcon = statusConfig.icon;
  const timeline = buildTimeline();
  const hasDiscount = billingLetter.bank_discount_percentage > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white" dir="rtl">
      {/* Navigation */}
      <div className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/collections')}
            className="gap-2 text-slate-600 hover:text-slate-900 -mr-2"
          >
            <ArrowRight className="h-4 w-4" />
            <span>חזרה לגבייה</span>
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-6xl">
        {/* Hero Section - Amount Focus */}
        <div className="relative mb-10">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-bl from-slate-100/50 via-transparent to-transparent rounded-3xl -z-10" />

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8 p-8">
            {/* Left: Client & Status */}
            <div className="flex-1 space-y-4">
              {/* Status Badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${statusConfig.bgColor} ${statusConfig.borderColor}`}>
                <StatusIcon className={`h-4 w-4 ${statusConfig.textColor}`} />
                <span className={`text-sm font-medium ${statusConfig.textColor}`}>
                  {statusConfig.label}
                </span>
              </div>

              {/* Title & Client */}
              <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                  מכתב חיוב
                </h1>
                <div className="flex items-center gap-3 text-slate-600">
                  <Building2 className="h-5 w-5 text-slate-400" />
                  <span className="text-lg">{clientName}</span>
                </div>
                <p className="text-sm text-slate-500 mt-1 mr-8">
                  ח.פ: {billingLetter.client.tax_id}
                </p>
              </div>

              {/* Subject */}
              {billingLetter.billing_subject && (
                <div className="pt-2">
                  <span className="text-sm text-slate-500">נושא: </span>
                  <span className="text-slate-800 font-medium">
                    {billingLetter.billing_subject}
                  </span>
                </div>
              )}
            </div>

            {/* Right: Amount Display */}
            <div className="lg:text-left">
              <div className="inline-block">
                {/* Final Amount */}
                <div className={`p-8 rounded-2xl ${
                  billingLetter.status === 'paid'
                    ? 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200'
                    : 'bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200'
                }`}>
                  <div className="text-sm text-slate-500 mb-2">
                    {hasDiscount ? 'סכום לתשלום (אחרי הנחה)' : 'סכום לתשלום'}
                  </div>
                  <div className={`text-5xl font-bold tracking-tight ${
                    billingLetter.status === 'paid' ? 'text-emerald-700' : 'text-slate-900'
                  }`}>
                    {formatILS(hasDiscount ? (billingLetter.amount_after_discount || 0) : billingLetter.total_amount)}
                  </div>

                  {/* Amount breakdown */}
                  <div className="mt-4 pt-4 border-t border-slate-200/60 space-y-1">
                    <div className="flex justify-between text-sm flex-row-reverse">
                      <span className="text-slate-600">{formatILS(billingLetter.amount_before_vat)}</span>
                      <span className="text-slate-500">לפני מע"מ</span>
                    </div>
                    <div className="flex justify-between text-sm flex-row-reverse">
                      <span className="text-slate-600">{formatILS(billingLetter.vat_amount)}</span>
                      <span className="text-slate-500">מע"מ ({billingLetter.vat_rate}%)</span>
                    </div>
                    {hasDiscount && (
                      <div className="flex justify-between text-sm text-emerald-600 flex-row-reverse">
                        <span>-{formatILS(billingLetter.amount_before_vat * (billingLetter.bank_discount_percentage / 100))}</span>
                        <span>הנחה ({billingLetter.bank_discount_percentage}%)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="mb-10 flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          {billingLetter.status === 'draft' && (
            <>
              <Button
                onClick={() => setPreviewDialogOpen(true)}
                className="bg-slate-900 hover:bg-slate-800"
              >
                <Send className="h-4 w-4 ml-2" />
                שלח במייל
              </Button>
              <Button
                variant="outline"
                onClick={() => setPreviewDialogOpen(true)}
              >
                <Eye className="h-4 w-4 ml-2" />
                צפה במכתב
              </Button>
              <Button
                variant="outline"
                onClick={() => setMarkAsSentDialogOpen(true)}
              >
                <FileText className="h-4 w-4 ml-2" />
                סמן כנשלח
              </Button>
            </>
          )}

          {billingLetter.status === 'sent' && (
            <>
              <Button
                onClick={handleMarkAsPaid}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4 ml-2" />
                סמן כשולם
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsReminderMode(true);
                  setPreviewDialogOpen(true);
                }}
                className="border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <Bell className="h-4 w-4 ml-2" />
                שלח תזכורת
                {billingLetter.reminder_count > 0 && (
                  <Badge variant="secondary" className="mr-2 bg-amber-100 text-amber-700 text-xs">
                    {billingLetter.reminder_count}
                  </Badge>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsReminderMode(false);
                  setPreviewDialogOpen(true);
                }}
              >
                <Eye className="h-4 w-4 ml-2" />
                צפה במכתב
              </Button>
              <Separator orientation="vertical" className="h-8 mx-2" />
              <Button
                variant="ghost"
                onClick={handleCancel}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4 ml-2" />
                בטל
              </Button>
            </>
          )}

          {billingLetter.status === 'paid' && (
            <Button
              variant="outline"
              onClick={() => {
                setIsReminderMode(false);
                setPreviewDialogOpen(true);
              }}
            >
              <Eye className="h-4 w-4 ml-2" />
              צפה במכתב
            </Button>
          )}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Billing Details */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-slate-400" />
                  פרטי החיוב
                </h2>
              </div>
              <div className="p-6 space-y-6">
                {/* Subject */}
                {billingLetter.billing_subject && (
                  <div>
                    <label className="text-sm font-medium text-slate-500 block mb-1">
                      נושא החיוב
                    </label>
                    <p className="text-slate-900 text-lg">
                      {billingLetter.billing_subject}
                    </p>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="text-sm font-medium text-slate-500 block mb-2">
                    תיאור מפורט
                  </label>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
                    <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {billingLetter.service_description}
                    </p>
                  </div>
                </div>

                {/* Notes */}
                {billingLetter.notes && (
                  <div>
                    <label className="text-sm font-medium text-slate-500 block mb-2">
                      הערות פנימיות
                    </label>
                    <div className="bg-amber-50/50 rounded-lg p-4 border border-amber-100">
                      <p className="text-slate-600 whitespace-pre-wrap text-sm">
                        {billingLetter.notes}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Amount Breakdown Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Percent className="h-5 w-5 text-slate-400" />
                  פירוט סכומים
                </h2>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center flex-row-reverse">
                    <span className="text-lg font-medium text-slate-900">
                      {formatILS(billingLetter.amount_before_vat)}
                    </span>
                    <span className="text-slate-600">סכום לפני מע"מ</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600 flex-row-reverse">
                    <span>{formatILS(billingLetter.vat_amount)}</span>
                    <span>מע"מ ({billingLetter.vat_rate}%)</span>
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center flex-row-reverse">
                    <span className="text-xl font-semibold text-slate-900">
                      {formatILS(billingLetter.total_amount)}
                    </span>
                    <span className="text-slate-600">סה"כ כולל מע"מ</span>
                  </div>

                  {hasDiscount && (
                    <>
                      <div className="flex justify-between items-center text-emerald-600 bg-emerald-50 -mx-6 px-6 py-3 flex-row-reverse">
                        <span className="font-medium">
                          -{formatILS(billingLetter.amount_before_vat * (billingLetter.bank_discount_percentage / 100))}
                        </span>
                        <span>הנחת תשלום מהיר ({billingLetter.bank_discount_percentage}%)</span>
                      </div>

                      <div className="flex justify-between items-center pt-2 flex-row-reverse">
                        <span className="text-2xl font-bold text-emerald-700">
                          {formatILS(billingLetter.amount_after_discount || 0)}
                        </span>
                        <span className="text-slate-700 font-medium">סכום לתשלום סופי</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Timeline & Info */}
          <div className="space-y-6">
            {/* Timeline Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-slate-400" />
                  ציר זמן
                </h2>
              </div>
              <div className="p-6">
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute top-0 bottom-0 right-[11px] w-0.5 bg-slate-200" />

                  {/* Timeline events */}
                  <div className="space-y-6">
                    {timeline.map((event, index) => {
                      const Icon = event.icon;
                      return (
                        <div key={index} className="relative flex gap-4">
                          {/* Icon */}
                          <div className={`relative z-10 w-6 h-6 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center`}>
                            <Icon className={`h-3 w-3 ${event.color}`} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 pb-2">
                            <div className="font-medium text-slate-900">
                              {event.label}
                            </div>
                            <div className="text-sm text-slate-500">
                              {formatIsraeliDate(event.date)}
                            </div>
                            {event.description && (
                              <div className="text-sm text-slate-400 mt-0.5">
                                {event.description}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Info Card */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-slate-400" />
                  מידע נוסף
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center flex-row-reverse">
                  <span className="text-slate-900">
                    {formatIsraeliDate(new Date(billingLetter.created_at))}
                  </span>
                  <span className="text-sm text-slate-500">תאריך יצירה</span>
                </div>

                {billingLetter.due_date && (
                  <div className="flex justify-between items-center flex-row-reverse">
                    <span className="text-slate-900">
                      {formatIsraeliDate(new Date(billingLetter.due_date))}
                    </span>
                    <span className="text-sm text-slate-500">תאריך יעד</span>
                  </div>
                )}

                {billingLetter.sent_at && (
                  <div className="flex justify-between items-center flex-row-reverse">
                    <div className="flex items-center gap-2 flex-row-reverse">
                      {billingLetter.sent_manually ? (
                        <FileText className="h-4 w-4 text-slate-400" />
                      ) : (
                        <Mail className="h-4 w-4 text-blue-500" />
                      )}
                      <span className="text-slate-900">
                        {billingLetter.sent_manually
                          ? SENT_METHOD_LABELS[billingLetter.sent_method || 'manual_other']
                          : 'דוא"ל'}
                      </span>
                    </div>
                    <span className="text-sm text-slate-500">אופן שליחה</span>
                  </div>
                )}

                {billingLetter.reminder_count > 0 && (
                  <div className="flex justify-between items-center flex-row-reverse">
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                      {billingLetter.reminder_count} תזכורות
                    </Badge>
                    <span className="text-sm text-slate-500">תזכורות שנשלחו</span>
                  </div>
                )}
              </div>
            </div>
          </div>
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

      {/* Letter Preview and Send Dialog */}
      <BillingLetterPreviewDialog
        open={previewDialogOpen}
        onOpenChange={(open) => {
          setPreviewDialogOpen(open);
          if (!open) setIsReminderMode(false);
        }}
        billingLetter={billingLetter}
        onEmailSent={loadBillingLetter}
        isReminder={isReminderMode}
      />
    </div>
  );
}

BillingLetterPreview.displayName = 'BillingLetterPreview';
