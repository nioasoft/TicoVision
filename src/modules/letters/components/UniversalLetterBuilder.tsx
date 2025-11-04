/**
 * Universal Letter Builder Component
 * Build custom letters from plain text with Markdown-like syntax
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Eye, Mail, Save, AlertCircle, Loader2, FileText, Trash2 } from 'lucide-react';
import { TemplateService } from '../services/template.service';
import { supabase } from '@/lib/supabase';
import { ClientSelector } from '@/components/ClientSelector';
import { clientService } from '@/services';
import type { Client, ClientContact } from '@/services/client.service';

const templateService = new TemplateService();

// Example Markdown text for guidance
const EXAMPLE_TEXT = `הנדון: עדכון חשבונאות שנתי לשנת {{year}}

בפתח הדברים:
* אנו מודים לכם על אמונכם במשרדנו
* שמחנו לשרת אותכם בשנה האחרונה

ולגופו של עניין:
הננו להודיעך כי החל מתאריך {{letter_date}}, נעבור לשיטת עבודה חדשה.
המשרד שלנו ממשיך לעמוד לרשותך בכל עת.

בברכה,
צוות המשרד`;

interface SavedTemplate {
  id: string;
  name: string;
  description: string | null;
  plain_text: string;
  includes_payment: boolean;
  subject: string | null;
  created_at: string;
}

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

export function UniversalLetterBuilder() {
  // State - Client selection
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // State - Text content
  const [plainText, setPlainText] = useState('');
  const [companyName, setCompanyName] = useState('');

  // State - Configuration
  const [includesPayment, setIncludesPayment] = useState(false);
  const [amount, setAmount] = useState<number>(50000);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  // State - Saved templates
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // State - UI
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // State - Recipients
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [clientContacts, setClientContacts] = useState<ClientContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');

  /**
   * Load saved templates on mount
   */
  useEffect(() => {
    loadSavedTemplates();
  }, []);

  /**
   * Load saved custom templates
   */
  const loadSavedTemplates = async () => {
    try {
      const { data, error } = await templateService.getCustomBodies();
      if (error) throw error;
      if (data) {
        setSavedTemplates(data);
      }
    } catch (error) {
      console.error('Error loading saved templates:', error);
      toast.error('שגיאה בטעינת תבניות שמורות');
    }
  };

  /**
   * Handle client selection - auto-fill fields and load contacts
   */
  const handleClientChange = async (client: Client | null) => {
    setSelectedClient(client);

    if (client) {
      // Auto-fill fields from selected client
      setCompanyName(client.company_name_hebrew || client.company_name);

      // Load contacts for this client
      setIsLoadingContacts(true);
      try {
        const { data: contacts, error } = await clientService.getContacts(client.id);

        if (error) {
          toast.error('שגיאה בטעינת אנשי קשר');
          setClientContacts([]);
          setSelectedRecipients([]);
          return;
        }

        // Filter contacts based on email preferences
        // Fee letters are "important", so include 'all' and 'important_only'
        const eligibleContacts = (contacts || []).filter(contact =>
          contact.email &&
          (contact.email_preference === 'all' || contact.email_preference === 'important_only')
        );

        setClientContacts(eligibleContacts);

        // Auto-select all eligible recipients
        const autoSelectedEmails = eligibleContacts.map(c => c.email!);
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
      setCompanyName('');
      setClientContacts([]);
      setSelectedRecipients([]);
    }
  };

  /**
   * Load template from saved list
   */
  const handleLoadTemplate = (templateId: string) => {
    const template = savedTemplates.find(t => t.id === templateId);
    if (template) {
      setPlainText(template.plain_text);
      setIncludesPayment(template.includes_payment);
      setEmailSubject(template.subject || '');
      setSelectedTemplateId(templateId);
      toast.success(`תבנית "${template.name}" נטענה`);
    }
  };

  /**
   * Delete saved template
   */
  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק תבנית זו?')) return;

    try {
      const { error } = await templateService.deleteCustomBody(templateId);
      if (error) throw error;

      toast.success('התבנית נמחקה בהצלחה');
      loadSavedTemplates();

      // Clear selection if deleted template was selected
      if (selectedTemplateId === templateId) {
        setSelectedTemplateId('');
        setPlainText('');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('שגיאה במחיקת התבנית');
    }
  };

  /**
   * Calculate discount amounts
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
    if (!plainText.trim()) {
      toast.error('נא להזין טקסט למכתב');
      return;
    }

    setIsLoadingPreview(true);
    try {
      // Build variables
      const variables: Record<string, string | number> = {
        company_name: companyName,
        group_name: selectedClient?.group?.group_name_hebrew || selectedClient?.group?.group_name || ''
      };

      // Add email subject if provided
      if (emailSubject.trim()) {
        variables.subject = emailSubject;
      }

      // Add payment variables if needed
      if (includesPayment) {
        const discounts = calculateDiscounts(amount);
        Object.assign(variables, discounts);
      }

      const { data, error } = await templateService.previewCustomLetter({
        plainText,
        variables,
        includesPayment
      });

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
   * Send email via Edge Function
   */
  const handleSendEmail = async () => {
    if (!plainText.trim()) {
      toast.error('נא להזין טקסט למכתב');
      return;
    }

    if (selectedRecipients.length === 0) {
      toast.error('נא לבחור לפחות נמען אחד');
      return;
    }

    if (!emailSubject.trim()) {
      toast.error('נא להזין נושא למייל');
      return;
    }

    setIsSendingEmail(true);
    try {
      // Build variables
      const variables: Record<string, string | number> = {
        company_name: companyName,
        group_name: selectedClient?.group?.group_name_hebrew || selectedClient?.group?.group_name || ''
      };

      // Add email subject if provided
      if (emailSubject.trim()) {
        variables.subject = emailSubject;
      }

      // Add payment variables if needed
      if (includesPayment) {
        const discounts = calculateDiscounts(amount);
        Object.assign(variables, discounts);
      }

      // Send via Edge Function - it will parse, build, send, and save
      const { data, error } = await supabase.functions.invoke('send-letter', {
        body: {
          recipientEmails: selectedRecipients, // Array of emails
          recipientName: companyName,
          customText: plainText,
          variables,
          includesPayment,
          saveAsTemplate: saveAsTemplate ? {
            name: templateName,
            description: templateDescription,
            subject: emailSubject || undefined
          } : undefined,
          clientId: selectedClient?.id || null
        }
      });

      if (error) throw error;

      toast.success(`מכתב נשלח בהצלחה ל-${selectedRecipients.length} נמענים`);

      // Reload templates if saved
      if (saveAsTemplate) {
        await loadSavedTemplates();
      }

    } catch (error) {
      console.error('❌ Error sending email:', error);
      toast.error(error instanceof Error ? error.message : 'שגיאה בשליחת מייל');
    } finally {
      setIsSendingEmail(false);
    }
  };

  /**
   * Load example text
   */
  const handleLoadExample = () => {
    setPlainText(EXAMPLE_TEXT);
    toast.success('טקסט לדוגמה נטען');
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Saved Templates Section */}
      {savedTemplates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-right">תבניות שמורות</CardTitle>
            <CardDescription className="text-right">
              טען תבנית קיימת או התחל מחדש
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Select value={selectedTemplateId} onValueChange={handleLoadTemplate}>
                <SelectTrigger dir="rtl" className="flex-1">
                  <SelectValue placeholder="בחר תבנית שמורה..." />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  {savedTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} {template.includes_payment && '(עם תשלום)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplateId && (
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleDeleteTemplate(selectedTemplateId)}
                  title="מחק תבנית"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Builder Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-right">בונה מכתבים אוניברסלי</CardTitle>
          <CardDescription className="text-right">
            כתוב מכתב בטקסט פשוט עם סימוני Markdown והמערכת תעצב אותו אוטומטית
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Client Selection and Variables */}
          <div className="space-y-2">
            <Label className="text-right block text-base font-semibold">
              1. בחר לקוח והזן פרטים
            </Label>

            {/* Client Selection */}
            <ClientSelector
              value={selectedClient?.id || null}
              onChange={handleClientChange}
              label="בחר לקוח"
              placeholder="בחר לקוח או הקלד ידנית למטה..."
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="company_name" className="text-right block">
                  שם חברה {selectedClient && <span className="text-xs text-blue-600">(נבחר אוטומטית)</span>}
                </Label>
                <Input
                  id="company_name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="מסעדת האחים"
                  dir="rtl"
                />
              </div>
              <div>
                <Label htmlFor="email_subject" className="text-right block">
                  נושא המייל <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email_subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="שכר טרחתנו לשנת המס 2026"
                  dir="rtl"
                  required
                />
              </div>
            </div>
          </div>

          {/* Step 2: Write Content */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-right block text-base font-semibold">
                2. כתוב את תוכן המכתב
              </Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadExample}
              >
                <FileText className="h-4 w-4 ml-2" />
                טען דוגמה
              </Button>
            </div>
            <Textarea
              value={plainText}
              onChange={(e) => setPlainText(e.target.value)}
              placeholder={EXAMPLE_TEXT}
              className="min-h-[300px] font-mono text-sm"
              dir="rtl"
            />
            <div className="text-xs text-gray-500 text-right space-y-1">
              <p><strong>חוקי עיצוב:</strong></p>
              <p>• <code>הנדון: [טקסט]</code> - נושא המכתב (כחול, גדול)</p>
              <p>• <code>[טקסט]:</code> - כותרת סעיף (שורה שמסתיימת ב-:)</p>
              <p>• <code>* [טקסט]</code> או <code>- [טקסט]</code> - נקודת bullet</p>
              <p>• <code>[טקסט רגיל]</code> - פסקה רגילה</p>
              <p className="mt-2"><strong>עיצוב טקסט:</strong></p>
              <p>• <code>**טקסט**</code> - מודגש (בולד)</p>
              <p>• <code>##טקסט##</code> - אדום מודגש</p>
              <p>• <code>###טקסט###</code> - כחול מודגש</p>
              <p>• <code>__טקסט__</code> - קו תחתון</p>
              <p className="mt-2">• משתנים: <code>{'{{company_name}}'}</code>, <code>{'{{letter_date}}'}</code>, <code>{'{{year}}'}</code></p>
            </div>
          </div>

          {/* Step 3: Payment Section */}
          <div className="space-y-4">
            <Label className="text-right block text-base font-semibold">
              3. הגדרות תשלום (אופציונלי)
            </Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="includes_payment"
                checked={includesPayment}
                onCheckedChange={(checked) => setIncludesPayment(checked as boolean)}
              />
              <Label htmlFor="includes_payment" className="text-right cursor-pointer">
                כלול סעיף תשלום (4 כפתורי תשלום עם הנחות)
              </Label>
            </div>
            {includesPayment && (
              <div>
                <Label htmlFor="amount" className="text-right block">
                  סכום מקורי (₪)
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="50000"
                />
                <p className="text-xs text-gray-500 text-right mt-1">
                  הנחות: 9% העברה בנקאית, 8% תשלום יחיד, 4% תשלומים
                </p>
              </div>
            )}
          </div>

          {/* Step 4: Save as Template */}
          <div className="space-y-4">
            <Label className="text-right block text-base font-semibold">
              4. שמירה כתבנית (אופציונלי)
            </Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="save_template"
                checked={saveAsTemplate}
                onCheckedChange={(checked) => setSaveAsTemplate(checked as boolean)}
              />
              <Label htmlFor="save_template" className="text-right cursor-pointer">
                שמור כתבנית לשימוש חוזר
              </Label>
            </div>
            {saveAsTemplate && (
              <div className="space-y-2">
                <div>
                  <Label htmlFor="template_name" className="text-right block">
                    שם התבנית *
                  </Label>
                  <Input
                    id="template_name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="מכתב עדכון שנתי"
                    dir="rtl"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="template_description" className="text-right block">
                    תיאור (אופציונלי)
                  </Label>
                  <Input
                    id="template_description"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="מכתב סטנדרטי לעדכון לקוחות"
                    dir="rtl"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Step 5: Actions */}
          <div className="space-y-4">
            <Label className="text-right block text-base font-semibold">5. פעולות</Label>

            {/* Preview Button */}
            <Button
              onClick={handlePreview}
              disabled={isLoadingPreview || !plainText.trim()}
              size="lg"
              variant="outline"
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

            {/* Recipients Section */}
            <div className="space-y-4">
              <Label className="text-right block font-semibold">בחר נמענים</Label>

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
                  <div className="border rounded-lg p-4 space-y-2 max-h-60 overflow-y-auto bg-gray-50">
                    {clientContacts.map((contact) => {
                      const isRequired = contact.is_primary || contact.contact_type === 'accountant_manager';
                      const isChecked = selectedRecipients.includes(contact.email!);

                      return (
                        <div
                          key={contact.id}
                          className="flex items-start gap-3 p-3 bg-white hover:bg-gray-50 rounded border"
                        >
                          <Checkbox
                            id={`universal-recipient-${contact.id}`}
                            checked={isChecked}
                            disabled={isRequired}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedRecipients([...selectedRecipients, contact.email!]);
                              } else {
                                setSelectedRecipients(selectedRecipients.filter(e => e !== contact.email));
                              }
                            }}
                            className="mt-1"
                          />
                          <Label
                            htmlFor={`universal-recipient-${contact.id}`}
                            className="flex-1 cursor-pointer text-right"
                          >
                            <div className="font-medium text-base">{contact.full_name}</div>
                            <div className="text-sm text-gray-600 dir-ltr text-right">{contact.email}</div>
                            <div className="text-xs text-gray-500 flex gap-2 justify-end mt-1">
                              <span>{getContactTypeLabel(contact.contact_type)}</span>
                              {isRequired && <span className="font-semibold text-blue-600">(חובה)</span>}
                            </div>
                          </Label>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-sm text-gray-600 text-right">
                    <strong>{selectedRecipients.length}</strong> נמענים נבחרו
                  </p>
                </>
              )}
            </div>

            <Button
              onClick={handleSendEmail}
              disabled={isSendingEmail || !plainText.trim() || selectedRecipients.length === 0}
              size="lg"
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
                  {saveAsTemplate
                    ? `שלח מכתב ושמור תבנית ל-${selectedRecipients.length} נמענים`
                    : `שלח מכתב ל-${selectedRecipients.length} נמענים`}
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
                <li>כתוב טקסט פשוט עם סימוני Markdown (*, -, :)</li>
                <li>המערכת ממירה אוטומטית לעיצוב מקצועי (פונטים, צבעים, רווחים)</li>
                <li>תוכל לשמור כתבנית לשימוש חוזר</li>
                <li>Header ו-Footer מתווספים אוטומטית</li>
                <li>סעיף תשלום אופציונלי עם 4 כפתורים והנחות</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">תצוגה מקדימה - מכתב מותאם אישית</DialogTitle>
            <DialogDescription className="text-right">
              המכתב המלא כולל: Header, Custom Body{includesPayment && ', Payment Section'}, Footer
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
