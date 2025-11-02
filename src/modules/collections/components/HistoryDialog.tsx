/**
 * History Dialog
 * Shows complete history of payments, reminders, and interactions for a client
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import type { CollectionRow } from '@/types/collection.types';
import { formatIsraeliDate, formatILS } from '@/lib/formatters';
import { DollarSign, Mail, MessageSquare, History, Loader2 } from 'lucide-react';

interface HistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: CollectionRow | null;
}

interface PaymentHistory {
  id: string;
  amount: number;
  payment_date: string;
  payment_reference?: string;
  is_partial: boolean;
  notes?: string;
  created_at: string;
}

interface ReminderHistory {
  id: string;
  reminder_type: string;
  sent_at: string;
  template_used?: string;
  email_opened: boolean;
  email_opened_at?: string;
}

interface InteractionHistory {
  id: string;
  interaction_type: string;
  direction?: string;
  subject: string;
  content?: string;
  outcome?: string;
  interacted_at: string;
  created_by: string;
}

export const HistoryDialog: React.FC<HistoryDialogProps> = ({
  open,
  onOpenChange,
  row,
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [reminderHistory, setReminderHistory] = useState<ReminderHistory[]>([]);
  const [interactionHistory, setInteractionHistory] = useState<InteractionHistory[]>([]);

  useEffect(() => {
    if (open && row) {
      loadHistory();
    }
  }, [open, row]);

  const loadHistory = async () => {
    if (!row) return;

    setLoading(true);

    try {
      // Load reminder history
      const { data: reminders, error: reminderError } = await supabase
        .from('payment_reminders')
        .select('*')
        .eq('fee_calculation_id', row.fee_calculation_id)
        .order('sent_at', { ascending: false });

      if (reminderError) throw reminderError;
      setReminderHistory(reminders || []);

      // Load interaction history
      const { data: interactions, error: interactionError } = await supabase
        .from('client_interactions')
        .select('*')
        .eq('client_id', row.client_id)
        .order('interacted_at', { ascending: false });

      if (interactionError) throw interactionError;
      setInteractionHistory(interactions || []);

      // Payment history is simulated from the current fee calculation
      // In a real system, you'd have a payment_transactions table
      const payments: PaymentHistory[] = [];
      if (row.amount_paid > 0) {
        payments.push({
          id: row.fee_calculation_id,
          amount: row.amount_paid,
          payment_date: new Date().toISOString(),
          is_partial: row.payment_status === 'partial_paid',
          created_at: new Date().toISOString(),
        });
      }
      setPaymentHistory(payments);

    } catch (error) {
      toast.error('שגיאה בטעינת היסטוריה', {
        description: error instanceof Error ? error.message : 'שגיאה לא ידועה',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rtl:text-right ltr:text-left max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="rtl:text-right ltr:text-left flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            היסטוריה מלאה
          </DialogTitle>
          <DialogDescription className="rtl:text-right ltr:text-left">
            לקוח: <span className="font-medium">{row.company_name_hebrew || row.client_name}</span>
            <br />
            מכתב נשלח: <span className="font-medium">{formatIsraeliDate(new Date(row.letter_sent_date))}</span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <Tabs defaultValue="reminders" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="reminders" className="rtl:flex-row-reverse gap-2">
                <Mail className="h-4 w-4" />
                תזכורות ({reminderHistory.length})
              </TabsTrigger>
              <TabsTrigger value="interactions" className="rtl:flex-row-reverse gap-2">
                <MessageSquare className="h-4 w-4" />
                אינטראקציות ({interactionHistory.length})
              </TabsTrigger>
              <TabsTrigger value="payments" className="rtl:flex-row-reverse gap-2">
                <DollarSign className="h-4 w-4" />
                תשלומים ({paymentHistory.length})
              </TabsTrigger>
            </TabsList>

            {/* Reminders Tab */}
            <TabsContent value="reminders" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                {reminderHistory.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    לא נשלחו תזכורות עדיין
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reminderHistory.map((reminder) => (
                      <div key={reminder.id} className="border rounded-lg p-4 rtl:text-right ltr:text-left">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">{getReminderTypeLabel(reminder.reminder_type)}</span>
                          </div>
                          <Badge variant={reminder.email_opened ? 'default' : 'secondary'}>
                            {reminder.email_opened ? 'נפתח' : 'לא נפתח'}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>נשלח: {formatIsraeliDate(new Date(reminder.sent_at))}</div>
                          {reminder.email_opened_at && (
                            <div>נפתח: {formatIsraeliDate(new Date(reminder.email_opened_at))}</div>
                          )}
                          {reminder.template_used && (
                            <div>תבנית: {reminder.template_used}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Interactions Tab */}
            <TabsContent value="interactions" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                {interactionHistory.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    אין אינטראקציות רשומות
                  </div>
                ) : (
                  <div className="space-y-3">
                    {interactionHistory.map((interaction) => (
                      <div key={interaction.id} className="border rounded-lg p-4 rtl:text-right ltr:text-left">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-purple-600" />
                            <span className="font-medium">{interaction.subject}</span>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline">{getInteractionTypeLabel(interaction.interaction_type)}</Badge>
                            {interaction.direction && (
                              <Badge variant="secondary">
                                {interaction.direction === 'outbound' ? 'יוצא' : 'נכנס'}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>תאריך: {formatIsraeliDate(new Date(interaction.interacted_at))}</div>
                          {interaction.content && (
                            <div className="mt-2 text-gray-700">{interaction.content}</div>
                          )}
                          {interaction.outcome && (
                            <div className="mt-2 text-green-700 font-medium">
                              תוצאה: {interaction.outcome}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                {paymentHistory.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    אין תשלומים רשומים
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentHistory.map((payment) => (
                      <div key={payment.id} className="border rounded-lg p-4 rtl:text-right ltr:text-left">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-medium text-lg">{formatILS(payment.amount)}</span>
                          </div>
                          <Badge variant={payment.is_partial ? 'secondary' : 'default'}>
                            {payment.is_partial ? 'תשלום חלקי' : 'תשלום מלא'}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>תאריך תשלום: {formatIsraeliDate(new Date(payment.payment_date))}</div>
                          {payment.payment_reference && (
                            <div>אסמכתא: {payment.payment_reference}</div>
                          )}
                          {payment.notes && (
                            <div className="mt-2 text-gray-700">{payment.notes}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

/**
 * Get Hebrew label for reminder type
 */
function getReminderTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    no_open: 'לא נפתח',
    no_selection: 'לא נבחר אמצעי תשלום',
    abandoned_cart: 'נטש עגלה',
    checks_overdue: 'המחאות באיחור',
  };
  return labels[type] || type;
}

/**
 * Get Hebrew label for interaction type
 */
function getInteractionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    phone_call: 'שיחת טלפון',
    email_sent: 'אימייל',
    meeting: 'פגישה',
    note: 'הערה',
  };
  return labels[type] || type;
}
