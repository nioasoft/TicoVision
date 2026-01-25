/**
 * Billing Letter Builder
 * Form for creating a new billing letter (general charge, not fee-based)
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { ClientSelector } from '@/components/ClientSelector';
import { Loader2, ArrowRight, Receipt, Calculator, Percent, CalendarDays, Plus } from 'lucide-react';
import { QuickClientDialog } from './QuickClientDialog';
import { toast } from 'sonner';
import { billingLetterService } from '../services/billing-letter.service';
import { calculateBillingAmounts } from '../types/billing.types';
import type { Client } from '@/services/client.service';
import { formatILS } from '@/lib/formatters';

export function BillingLetterBuilder() {
  const navigate = useNavigate();

  // Form state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [serviceDescription, setServiceDescription] = useState('');
  const [amountBeforeVat, setAmountBeforeVat] = useState<number | ''>('');
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickClientOpen, setQuickClientOpen] = useState(false);

  // Calculate amounts
  const amounts = useMemo(() => {
    if (!amountBeforeVat || typeof amountBeforeVat !== 'number') {
      return null;
    }
    return calculateBillingAmounts(amountBeforeVat, discountPercentage);
  }, [amountBeforeVat, discountPercentage]);

  // Form validation
  const isValid = selectedClient && serviceDescription.trim() && amountBeforeVat && amountBeforeVat > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid || !selectedClient || !amountBeforeVat) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await billingLetterService.create({
        client_id: selectedClient.id,
        service_description: serviceDescription.trim(),
        amount_before_vat: amountBeforeVat,
        bank_discount_percentage: discountPercentage,
        due_date: dueDate || undefined,
        notes: notes.trim() || undefined,
      });

      if (error) throw error;

      toast.success('מכתב החיוב נוצר בהצלחה');
      navigate(`/collections/billing/${data?.id}`);
    } catch (err) {
      console.error('Error creating billing letter:', err);
      toast.error('שגיאה ביצירת מכתב החיוב');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setAmountBeforeVat('');
      return;
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setAmountBeforeVat(numValue);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl">
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
        <h1 className="text-3xl font-bold rtl:text-right">מכתב חיוב חדש</h1>
        <p className="text-gray-500 rtl:text-right mt-2">
          יצירת מכתב חיוב כללי (לא שכר טרחה) עם אפשרות תשלום בהעברה בנקאית
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Client Selection */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="rtl:text-right flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              פרטי הלקוח
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <ClientSelector
                  value={selectedClient?.id || null}
                  onChange={setSelectedClient}
                  label="בחר לקוח"

                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickClientOpen(true)}
                className="whitespace-nowrap"
              >
                <Plus className="h-4 w-4 ml-1" />
                לקוח חדש
              </Button>
            </div>
            {selectedClient && (
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <div className="text-right">
                  <div className="font-medium text-lg">
                    {selectedClient.company_name_hebrew || selectedClient.company_name}
                  </div>
                  {selectedClient.tax_id && (
                    <div className="text-gray-600">ח.פ: {selectedClient.tax_id}</div>
                  )}
                  {selectedClient.status === 'adhoc' && (
                    <div className="text-purple-600 text-sm mt-1">לקוח חד-פעמי</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Client Dialog */}
        <QuickClientDialog
          open={quickClientOpen}
          onOpenChange={setQuickClientOpen}
          onClientCreated={(client) => {
            setSelectedClient(client);
          }}
        />

        {/* Service Description */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="rtl:text-right">תיאור השירות</CardTitle>
            <CardDescription className="rtl:text-right">
              תיאור קצר של השירות או העבודה שבגינה נשלח החיוב
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={serviceDescription}
              onChange={(e) => setServiceDescription(e.target.value)}

              className="min-h-[100px] text-right"
              dir="rtl"
            />
          </CardContent>
        </Card>

        {/* Amount and Discount */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="rtl:text-right flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              סכום והנחה
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Amount */}
            <div>
              <Label htmlFor="amount" className="text-right block mb-2">
                סכום לפני מע"מ (₪)
              </Label>
              <Input
                id="amount"
                type="number"
                value={amountBeforeVat}
                onChange={handleAmountChange}

                min="0"
                step="1"
                className="text-right"
                dir="rtl"
              />
            </div>

            {/* Discount Slider */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-right">הנחה להעברה בנקאית</Label>
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">{discountPercentage}%</span>
                </div>
              </div>
              <Slider
                value={[discountPercentage]}
                onValueChange={(values) => setDiscountPercentage(values[0])}
                min={0}
                max={15}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>15%</span>
                <span>0%</span>
              </div>
            </div>

            {/* Amount Summary */}
            {amounts && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-right">
                  <span className="font-medium">{formatILS(amounts.amountBeforeVat)}</span>
                  <span className="text-gray-600">סכום לפני מע"מ:</span>
                </div>
                <div className="flex justify-between text-right">
                  <span className="font-medium">{formatILS(amounts.vatAmount)}</span>
                  <span className="text-gray-600">מע"מ (18%):</span>
                </div>
                <div className="flex justify-between text-right border-t border-blue-200 pt-2">
                  <span className="font-bold text-lg">{formatILS(amounts.totalAmount)}</span>
                  <span className="text-gray-600">סה"כ כולל מע"מ:</span>
                </div>
                {discountPercentage > 0 && (
                  <>
                    <div className="border-t border-blue-200 pt-2 mt-2">
                      <div className="flex justify-between text-right text-red-600">
                        <span className="font-medium">-{formatILS(amounts.discountAmount)}</span>
                        <span>הנחה ({discountPercentage}%):</span>
                      </div>
                      <div className="flex justify-between text-right mt-1">
                        <span className="font-bold text-lg text-green-700">
                          {formatILS(amounts.amountAfterDiscountWithVat)}
                        </span>
                        <span className="text-gray-600">סכום לתשלום אחרי הנחה:</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Due Date and Notes */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="rtl:text-right flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              פרטים נוספים
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="dueDate" className="text-right block mb-2">
                תאריך יעד לתשלום
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-left"
                dir="ltr"
                style={{ textAlign: 'left' }}
              />
            </div>

            <div>
              <Label htmlFor="notes" className="text-right block mb-2">
                הערות פנימיות
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}

                className="text-right"
                dir="rtl"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/collections')}
            disabled={isSubmitting}
          >
            ביטול
          </Button>
          <Button type="submit" disabled={!isValid || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            צור מכתב חיוב
          </Button>
        </div>
      </form>
    </div>
  );
}

BillingLetterBuilder.displayName = 'BillingLetterBuilder';
