/**
 * Letter Builder Component
 * Build letters from file-based templates (Header + Body + Payment + Footer)
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Eye, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { TemplateService } from '../services/template.service';
import type { LetterTemplateType, LetterVariables } from '../types/letter.types';
import { supabase } from '@/lib/supabase';

const templateService = new TemplateService();

// 11 Template options
const TEMPLATE_OPTIONS: { value: LetterTemplateType; label: string }[] = [
  { value: 'external_index_only', label: 'A - חיצוניים - שינוי מדד בלבד' },
  { value: 'external_real_change', label: 'B - חיצוניים - שינוי ריאלי' },
  { value: 'external_as_agreed', label: 'C - חיצוניים - כמוסכם' },
  { value: 'internal_audit_index', label: 'D1 - פנימי ראיית חשבון - שינוי מדד' },
  { value: 'internal_audit_real', label: 'D2 - פנימי ראיית חשבון - שינוי ריאלי' },
  { value: 'internal_audit_agreed', label: 'D3 - פנימי ראיית חשבון - כמוסכם' },
  { value: 'retainer_index', label: 'E1 - ריטיינר - שינוי מדד' },
  { value: 'retainer_real', label: 'E2 - ריטיינר - שינוי ריאלי' },
  { value: 'internal_bookkeeping_index', label: 'F1 - פנימי הנהלת חשבונות - שינוי מדד' },
  { value: 'internal_bookkeeping_real', label: 'F2 - פנימי הנהלת חשבונות - שינוי ריאלי' },
  { value: 'internal_bookkeeping_agreed', label: 'F3 - פנימי הנהלת חשבונות - כמוסכם' },
];

export function LetterBuilder() {
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplateType>('external_index_only');
  const [variables, setVariables] = useState<Partial<LetterVariables>>({
    company_name: 'מסעדת האחים',
    group_name: 'קבוצת מסעדות ישראליות',
    inflation_rate: 4,
    amount_original: 52000,
  });
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('Benatia.Asaf@gmail.com');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  /**
   * Calculate discount amounts based on original amount
   */
  const calculateDiscounts = (original: number) => {
    const formatNumber = (num: number): string => {
      return Math.round(num).toLocaleString('he-IL');
    };

    return {
      amount_original: formatNumber(original),
      amount_after_bank: formatNumber(original * 0.91),     // 9% discount
      amount_after_single: formatNumber(original * 0.92),   // 8% discount
      amount_after_payments: formatNumber(original * 0.96), // 4% discount
    };
  };

  /**
   * Preview letter
   */
  const handlePreview = async () => {
    setIsLoadingPreview(true);
    try {
      // Add calculated discounts
      const discounts = calculateDiscounts(variables.amount_original || 52000);

      const fullVariables: Partial<LetterVariables> = {
        ...variables,
        ...discounts,
      };

      const { data, error } = await templateService.previewLetterFromFiles(
        selectedTemplate,
        fullVariables
      );

      if (error) throw error;
      if (data) {
        setPreviewHtml(data.html);
        setIsPreviewOpen(true);
      }
    } catch (error) {
      console.error('Error previewing letter:', error);
      toast.error('שגיאה בטעינת תצוגה מקדימה');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  /**
   * Send email via Supabase Edge Function
   */
  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      // Validate email
      if (!recipientEmail || !recipientEmail.includes('@')) {
        toast.error('נא להזין כתובת מייל תקינה');
        return;
      }

      // Calculate discounts
      const discounts = calculateDiscounts(variables.amount_original || 52000);

      // Add automatic variables
      const currentYear = new Date().getFullYear();
      const nextYear = currentYear + 1;

      const fullVariables: Partial<LetterVariables> = {
        ...variables,
        ...discounts,
        letter_date: variables.letter_date || new Intl.DateTimeFormat('he-IL').format(new Date()),
        year: variables.year || nextYear,
        previous_year: variables.previous_year || currentYear,
        tax_year: variables.tax_year || nextYear,
        num_checks: variables.num_checks || 8,
        check_dates_description: `החל מיום 5.1.${nextYear} ועד ליום 5.8.${nextYear}`
      };

      console.log('📧 Sending letter via Edge Function...');

      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('send-letter', {
        body: {
          recipientEmail,
          recipientName: fullVariables.company_name || 'לקוח יקר',
          templateType: selectedTemplate,
          variables: fullVariables,
          clientId: null, // TODO: Add client selection
          feeCalculationId: null
        }
      });

      if (error) {
        throw error;
      }

      console.log('✅ Email sent successfully:', data);
      toast.success(`מכתב נשלח בהצלחה ל-${recipientEmail}`);

    } catch (error) {
      console.error('❌ Error sending email:', error);
      toast.error(error instanceof Error ? error.message : 'שגיאה בשליחת מייל');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">בניית מכתב מרכיבים קיימים</CardTitle>
          <CardDescription className="text-right">
            בחר סוג מכתב, הזן פרטים, וצפה בתצוגה מקדימה או שלח למייל
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Select Template */}
          <div className="space-y-2">
            <Label htmlFor="template" className="text-right block text-base font-semibold">
              1. בחר סוג מכתב
            </Label>
            <Select value={selectedTemplate} onValueChange={(value) => setSelectedTemplate(value as LetterTemplateType)}>
              <SelectTrigger id="template" dir="rtl">
                <SelectValue placeholder="בחר סוג מכתב" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {TEMPLATE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Fill Variables */}
          <div className="space-y-4">
            <Label className="text-right block text-base font-semibold">2. הזן פרטים</Label>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="company_name" className="text-right block">
                  שם חברה
                </Label>
                <Input
                  id="company_name"
                  value={variables.company_name || ''}
                  onChange={(e) => setVariables({ ...variables, company_name: e.target.value })}
                  placeholder="מסעדת האחים"
                  dir="rtl"
                />
              </div>

              <div>
                <Label htmlFor="group_name" className="text-right block">
                  שם קבוצה (אופציונלי)
                </Label>
                <Input
                  id="group_name"
                  value={variables.group_name || ''}
                  onChange={(e) => setVariables({ ...variables, group_name: e.target.value })}
                  placeholder="קבוצת מסעדות ישראליות"
                  dir="rtl"
                />
              </div>

              <div>
                <Label htmlFor="inflation_rate" className="text-right block">
                  שיעור עליית מדד (%)
                </Label>
                <Input
                  id="inflation_rate"
                  type="number"
                  value={variables.inflation_rate || 4}
                  onChange={(e) => setVariables({ ...variables, inflation_rate: Number(e.target.value) })}
                  placeholder="4"
                />
              </div>

              <div>
                <Label htmlFor="amount_original" className="text-right block">
                  סכום מקורי (₪)
                </Label>
                <Input
                  id="amount_original"
                  type="number"
                  value={variables.amount_original || 52000}
                  onChange={(e) => setVariables({ ...variables, amount_original: Number(e.target.value) })}
                  placeholder="52000"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Preview */}
          <div className="space-y-2">
            <Label className="text-right block text-base font-semibold">3. תצוגה מקדימה</Label>
            <Button
              onClick={handlePreview}
              disabled={isLoadingPreview}
              size="lg"
              className="w-full"
            >
              {isLoadingPreview ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  טוען...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  הצג תצוגה מקדימה
                </>
              )}
            </Button>
          </div>

          {/* Step 4: Send Email */}
          <div className="space-y-4">
            <Label className="text-right block text-base font-semibold">4. שליחת מייל</Label>
            <div>
              <Label htmlFor="recipient_email" className="text-right block">
                מייל נמען
              </Label>
              <Input
                id="recipient_email"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="example@email.com"
                dir="ltr"
              />
            </div>
            <Button
              onClick={handleSendEmail}
              disabled={isSendingEmail || !recipientEmail}
              size="lg"
              variant="default"
              className="w-full"
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  שולח...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  שלח מכתב למייל
                </>
              )}
            </Button>
          </div>

          {/* Info Box */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-right">
              <strong>איך זה עובד?</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>המערכת בונה מכתב מ-4 רכיבים: Header + Body + Payment + Footer</li>
                <li>כל הטקסטים מגיעים מקבצי HTML קיימים (templates/bodies/)</li>
                <li>המערכת ממלאת אוטומטית: תאריך, שנה, תאריכי המחאות</li>
                <li>היא מחשבת הנחות: 9% העברה בנקאית, 8% תשלום יחיד, 4% תשלומים</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">
              תצוגה מקדימה - {TEMPLATE_OPTIONS.find(t => t.value === selectedTemplate)?.label}
            </DialogTitle>
            <DialogDescription className="text-right">
              המכתב המלא כולל: Header, Body, Payment Section, Footer
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-white" style={{ minHeight: '400px' }}>
            <div
              dangerouslySetInnerHTML={{ __html: previewHtml }}
              className="select-text"
              style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              סגור
            </Button>
            <Button onClick={handleSendEmail} disabled={isSendingEmail}>
              {isSendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  שולח...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  שלח למייל
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
