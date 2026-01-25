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
import { ClientSelector } from '@/components/ClientSelector';
import { FileDisplayWidget } from '@/components/files/FileDisplayWidget';
import { Checkbox } from '@/components/ui/checkbox';
import type { Client } from '@/services/client.service';
import { TenantContactService } from '@/services/tenant-contact.service';
import type { AssignedContact } from '@/types/tenant-contact.types';

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

// Helper function to get contact type label in Hebrew
const getContactTypeLabel = (contactType: string): string => {
  const labels: Record<string, string> = {
    owner: 'בעלים',
    accountant_manager: 'מנהלת חשבונות',
    secretary: 'מזכירה',
    cfo: 'סמנכ"ל כספים',
    board_member: 'חבר דירקטוריון',
    legal_counsel: 'יועץ משפטי',
    other: 'אחר',
  };
  return labels[contactType] || contactType;
};

export function LetterBuilder() {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplateType>('external_index_only');
  const [variables, setVariables] = useState<Partial<LetterVariables>>({
    company_name: '',
    group_name: '',
    inflation_rate: 4,
    amount_original: 52000,
  });
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [clientContacts, setClientContacts] = useState<AssignedContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  /**
   * Handle client selection - auto-fill fields and load contacts
   */
  const handleClientChange = async (client: Client | null) => {
    setSelectedClient(client);

    if (client) {
      // Auto-fill fields from selected client
      setVariables(prev => ({
        ...prev,
        company_name: client.company_name_hebrew || client.company_name,
        group_name: client.group?.group_name_hebrew || client.group?.group_name || '',
      }));

      // Load contacts for this client
      setIsLoadingContacts(true);
      try {
        // Load all contacts and auto-select emails using centralized function
        const contacts = await TenantContactService.getClientContacts(client.id);
        const autoSelectedEmails = await TenantContactService.getClientEmails(client.id, 'important');

        // Filter contacts to show only those included in auto-selection
        const eligibleContacts = contacts.filter(c => autoSelectedEmails.includes(c.email!));

        setClientContacts(eligibleContacts);
        setSelectedRecipients(autoSelectedEmails);

      } catch (error) {
        console.error('Error loading contacts:', error);
        toast.error('שגיאה בטעינת אנשי קשר');
        setClientContacts([]);
        setSelectedRecipients([]);
      } finally {
        setIsLoadingContacts(false);
      }
    } else {
      // Clear auto-filled values when client is deselected
      setVariables(prev => ({
        ...prev,
        company_name: '',
        group_name: '',
      }));
      setClientContacts([]);
      setSelectedRecipients([]);
    }
  };

  /**
   * Calculate discount amounts based on original amount (before VAT)
   * Discounts are applied to the amount INCLUDING VAT (18%)
   */
  const calculateDiscounts = (original: number, vatRate: number = 0.18) => {
    const formatNumber = (num: number): string => {
      return Math.round(num).toLocaleString('he-IL');
    };

    const amountWithVat = Math.round(original * (1 + vatRate));

    return {
      amount_original: formatNumber(original),
      amount_with_vat: formatNumber(amountWithVat),              // Amount including VAT
      amount_after_bank: formatNumber(amountWithVat * 0.91),     // 9% discount on VAT-inclusive amount
      amount_after_single: formatNumber(amountWithVat * 0.92),   // 8% discount on VAT-inclusive amount
      amount_after_payments: formatNumber(amountWithVat * 0.96), // 4% discount on VAT-inclusive amount
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
      // Validate recipients
      if (selectedRecipients.length === 0) {
        toast.error('נא לבחור לפחות נמען אחד');
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
        check_amount: Math.round((variables.amount_original || 52000) * 1.18 / (variables.num_checks || 8)).toLocaleString('he-IL'),
        check_dates_description: `החל מיום 5.1.${variables.tax_year || nextYear} ועד ליום 5.8.${variables.tax_year || nextYear}`
      };

      
      // Get fresh session token for authorization
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('לא מחובר - אנא התחבר מחדש');
      }

      // Call Supabase Edge Function
      const { error } = await supabase.functions.invoke('send-letter', {
        body: {
          recipientEmails: selectedRecipients, // Array of emails
          recipientName: fullVariables.company_name || 'לקוח יקר',
          templateType: selectedTemplate,
          variables: fullVariables,
          clientId: selectedClient?.id || null,
          feeCalculationId: null
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        throw error;
      }

      toast.success(`מכתב נשלח בהצלחה ל-${selectedRecipients.length} נמענים`);

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
              <SelectTrigger id="template" dir="rtl" className="[&>span]:text-right">
                <SelectValue />
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

            {/* Client Selection - highlighted with yellow background */}
            <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4 -mx-2">
              <ClientSelector
                value={selectedClient?.id || null}
                onChange={handleClientChange}
                label="בחר לקוח"

              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="company_name" className="text-right block">
                  שם חברה {selectedClient && <span className="text-xs text-blue-600">(נבחר אוטומטית)</span>}
                </Label>
                <Input
                  id="company_name"
                  value={variables.company_name || ''}
                  onChange={(e) => setVariables({ ...variables, company_name: e.target.value })}
                  dir="rtl"
                />
              </div>

              <div>
                <Label htmlFor="group_name" className="text-right block">
                  שם קבוצה {selectedClient && <span className="text-xs text-blue-600">(נבחר אוטומטית)</span>}
                </Label>
                <Input
                  id="group_name"
                  value={variables.group_name || ''}
                  onChange={(e) => setVariables({ ...variables, group_name: e.target.value })}
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

          {/* Step 4: Select Recipients */}
          <div className="space-y-4">
            <Label className="text-right block text-base font-semibold">4. בחר נמענים</Label>

            {!selectedClient ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-right">
                  נא לבחור לקוח כדי לראות את רשימת אנשי הקשר
                </AlertDescription>
              </Alert>
            ) : isLoadingContacts ? (
              <div className="text-center py-8 text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                טוען אנשי קשר...
              </div>
            ) : clientContacts.length === 0 ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-right">
                  לא נמצאו אנשי קשר עבור לקוח זה. נא להוסיף אנשי קשר בטופס הלקוח.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="border rounded-lg p-4 max-h-80 overflow-y-auto bg-gray-50">
                  <div className="grid grid-cols-4 gap-3">
                    {clientContacts.map((contact) => {
                      const isRequired = contact.is_primary || contact.contact_type === 'accountant_manager';
                      const isChecked = selectedRecipients.includes(contact.email!);

                      return (
                        <div
                          key={contact.id}
                          className="flex flex-col gap-2 p-2 bg-white hover:bg-gray-50 rounded border"
                        >
                          <div className="flex items-start gap-2">
                            <Checkbox
                              id={`recipient-${contact.id}`}
                              checked={isChecked}
                              disabled={isRequired}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRecipients([...selectedRecipients, contact.email!]);
                                } else {
                                  setSelectedRecipients(selectedRecipients.filter(e => e !== contact.email));
                                }
                              }}
                              className="mt-0.5"
                            />
                            <Label
                              htmlFor={`recipient-${contact.id}`}
                              className="flex-1 cursor-pointer text-right"
                            >
                              <div className="font-medium text-sm truncate">{contact.full_name}</div>
                            </Label>
                          </div>
                          <div className="text-xs text-gray-600 dir-ltr text-right truncate">{contact.email}</div>
                          <div className="text-xs text-gray-500 flex gap-1 justify-end flex-wrap">
                            <span>{getContactTypeLabel(contact.contact_type)}</span>
                            {isRequired && <span className="font-semibold text-blue-600">(חובה)</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="text-sm text-gray-600 text-right">
                  <strong>{selectedRecipients.length}</strong> נמענים נבחרו
                </p>
              </>
            )}

            <Button
              onClick={handleSendEmail}
              disabled={isSendingEmail || selectedRecipients.length === 0}
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
                  שלח מכתב ל-{selectedRecipients.length} נמענים
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

          {/* Client Documents Section */}
          {selectedClient && (
            <div className="space-y-4 border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold rtl:text-right">מסמכי לקוח רלוונטיים</h3>

              {/* Financial Reports */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 rtl:text-right">דוחות כספיים</h4>
                <FileDisplayWidget
                  clientId={selectedClient.id}
                  category="financial_report"
                  variant="compact"
                />
              </div>

              {/* Quotes and Invoices */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700 rtl:text-right">הצעות מחיר וחשבוניות</h4>
                <FileDisplayWidget
                  clientId={selectedClient.id}
                  category="quote_invoice"
                  variant="compact"
                />
              </div>
            </div>
          )}
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
