/**
 * Billing Letter Builder
 * Form for creating a new billing letter (general charge, not fee-based)
 *
 * Flow: User fills form → Preview dialog → Send/PDF creates the record
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ClientSelector } from '@/components/ClientSelector';
import { ArrowRight, Receipt, Calculator, CalendarDays, Plus, Eye } from 'lucide-react';
import { QuickClientDialog } from './QuickClientDialog';
import { BillingLetterPreviewDialog, type BillingLetterFormData } from './BillingLetterPreviewDialog';
import { toast } from 'sonner';
import { calculateBillingAmounts } from '../types/billing.types';
import type { Client } from '@/services/client.service';
import { formatILS } from '@/lib/formatters';

export function BillingLetterBuilder() {
  const navigate = useNavigate();

  // Form state
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [billingSubject, setBillingSubject] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [amountBeforeVat, setAmountBeforeVat] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [quickClientOpen, setQuickClientOpen] = useState(false);

  // Preview dialog state
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [formDataForPreview, setFormDataForPreview] = useState<BillingLetterFormData | null>(null);

  // Calculate amounts (no discount for billing letters)
  const amounts = useMemo(() => {
    if (!amountBeforeVat || typeof amountBeforeVat !== 'number') {
      return null;
    }
    return calculateBillingAmounts(amountBeforeVat, 0);
  }, [amountBeforeVat]);

  // Form validation
  const isValid = selectedClient && billingSubject.trim() && serviceDescription.trim() && amountBeforeVat && amountBeforeVat > 0;

  /**
   * Open preview dialog instead of saving directly
   * The billing letter is created only when user sends or generates PDF
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid || !selectedClient || !amountBeforeVat) {
      toast.error('נא למלא את כל השדות הנדרשים');
      return;
    }

    // Prepare form data for preview
    setFormDataForPreview({
      client: selectedClient,
      billing_subject: billingSubject.trim(),
      service_description: serviceDescription.trim(),
      amount_before_vat: amountBeforeVat,
      bank_discount_percentage: 0, // No discount for billing letters
      due_date: dueDate || undefined,
      notes: notes.trim() || undefined,
    });

    // Open preview dialog
    setPreviewDialogOpen(true);
  };

  /**
   * Handle successful creation from preview dialog
   */
  const handleBillingLetterCreated = (billingLetterId: string) => {
    navigate(`/collections/billing/${billingLetterId}`);
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

        {/* Billing Subject and Description */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="rtl:text-right">פרטי החיוב</CardTitle>
            <CardDescription className="rtl:text-right">
              נושא ותיאור מפורט של השירות או העבודה שבגינה נשלח החיוב
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Subject (short) */}
            <div>
              <Label htmlFor="billingSubject" className="text-right block mb-2">
                נושא החיוב (מופיע בנדון) *
              </Label>
              <Input
                id="billingSubject"
                value={billingSubject}
                onChange={(e) => setBillingSubject(e.target.value)}
                className="text-right"
                dir="rtl"
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                נושא קצר שיופיע בכותרת המכתב (עד 100 תווים)
              </p>
            </div>

            {/* Description (detailed) */}
            <div>
              <Label htmlFor="serviceDescription" className="text-right block mb-2">
                תוכן המכתב *
              </Label>
              <Textarea
                id="serviceDescription"
                value={serviceDescription}
                onChange={(e) => setServiceDescription(e.target.value)}
                className="min-h-[120px] text-right"
                dir="rtl"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">
                המלל המפורט שיופיע בגוף המכתב
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Amount */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="rtl:text-right flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              סכום לחיוב
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Amount Input */}
            <div>
              <Label htmlFor="amount" className="text-right block mb-2">
                סכום לפני מע"מ (₪) *
              </Label>
              <Input
                id="amount"
                type="number"
                value={amountBeforeVat}
                onChange={handleAmountChange}
                onWheel={(e) => e.currentTarget.blur()}
                min="0"
                step="1"
                className="text-right"
                dir="rtl"
              />
            </div>

            {/* Amount Summary */}
            {amounts && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-left flex-row-reverse">
                  <span className="font-medium">{formatILS(amounts.amountBeforeVat)}</span>
                  <span className="text-gray-600">סכום לפני מע"מ:</span>
                </div>
                <div className="flex justify-between text-left flex-row-reverse">
                  <span className="font-medium">{formatILS(amounts.vatAmount)}</span>
                  <span className="text-gray-600">מע"מ (18%):</span>
                </div>
                <div className="flex justify-between text-left flex-row-reverse border-t border-blue-200 pt-2">
                  <span className="font-bold text-lg">{formatILS(amounts.totalAmount)}</span>
                  <span className="text-gray-600">סה"כ לתשלום כולל מע"מ:</span>
                </div>
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
                className="text-right"
                dir="rtl"
                style={{ textAlign: 'right' }}
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
          >
            ביטול
          </Button>
          <Button type="submit" disabled={!isValid}>
            <Eye className="h-4 w-4 ml-2" />
            תצוגה מקדימה
          </Button>
        </div>
      </form>

      {/* Preview Dialog - billing letter is created here */}
      {formDataForPreview && (
        <BillingLetterPreviewDialog
          open={previewDialogOpen}
          onOpenChange={setPreviewDialogOpen}
          formData={formDataForPreview}
          onCreated={handleBillingLetterCreated}
        />
      )}
    </div>
  );
}

BillingLetterBuilder.displayName = 'BillingLetterBuilder';
