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
import { Eye, Mail, Save, AlertCircle, Loader2, FileText, Trash2, Plus, Minus, ArrowUp, ArrowDown, Type, Printer } from 'lucide-react';
import { TemplateService } from '../services/template.service';
import { supabase } from '@/lib/supabase';
import { ClientSelector } from '@/components/ClientSelector';
import { clientService } from '@/services';
import type { Client } from '@/services/client.service';
import { TenantContactService } from '@/services/tenant-contact.service';
import type { AssignedContact } from '@/types/tenant-contact.types';

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

interface UniversalLetterBuilderProps {
  editLetterId?: string | null;
}

export function UniversalLetterBuilder({ editLetterId }: UniversalLetterBuilderProps) {
  // State - Client selection
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // State - Text content
  const [plainText, setPlainText] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [customHeaderLines, setCustomHeaderLines] = useState<import('../types/letter.types').CustomHeaderLine[]>([]);

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
  const [clientContacts, setClientContacts] = useState<AssignedContact[]>([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [manualEmails, setManualEmails] = useState(''); // For general letters without client

  // State - Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editingLetterId, setEditingLetterId] = useState<string | null>(null);
  const [parentLetterId, setParentLetterId] = useState<string | null>(null)

  /**
   * Load saved templates on mount
   */
  useEffect(() => {
    loadSavedTemplates();
  }, []);

  /**
   * Load letter for editing when editLetterId prop is provided
   */
  useEffect(() => {
    if (editLetterId) {
      loadLetterForEdit(editLetterId);
    }
  }, [editLetterId]);

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
   * Validate and parse manual emails (comma or space separated)
   */
  const parseManualEmails = (emailsString: string): string[] => {
    if (!emailsString.trim()) return [];

    // Split by comma, semicolon, or multiple spaces
    const emails = emailsString
      .split(/[,;\s]+/)
      .map(email => email.trim())
      .filter(email => email.length > 0);

    return emails;
  };

  /**
   * Validate email format
   */
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  /**
   * Preview letter
   */
  const handlePreview = async () => {
    if (!plainText.trim()) {
      toast.error('נא להזין טקסט למכתב');
      return;
    }

    // Debug logging
    console.log('🔍 [Preview Debug] customHeaderLines:', customHeaderLines);
    console.log('🔍 [Preview Debug] מספר שורות:', customHeaderLines.length);

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
        includesPayment,
        customHeaderLines // Pass custom header lines to preview
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

    // Determine recipient emails - either from client contacts or manual input
    let recipientEmails: string[] = [];

    if (selectedClient) {
      // Has client - use selected contacts
      if (selectedRecipients.length === 0) {
        toast.error('נא לבחור לפחות נמען אחד מרשימת אנשי הקשר');
        return;
      }
      recipientEmails = selectedRecipients;
    } else {
      // No client - use manual emails
      if (!manualEmails.trim()) {
        toast.error('נא להזין לפחות כתובת מייל אחת');
        return;
      }

      // Parse and validate manual emails
      recipientEmails = parseManualEmails(manualEmails);

      if (recipientEmails.length === 0) {
        toast.error('נא להזין כתובת מייל תקינה');
        return;
      }

      // Validate each email
      const invalidEmails = recipientEmails.filter(email => !isValidEmail(email));
      if (invalidEmails.length > 0) {
        toast.error(`כתובות מייל לא תקינות: ${invalidEmails.join(', ')}`);
        return;
      }
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
          recipientEmails, // Array of emails (from client or manual)
          recipientName: companyName,
          customText: plainText,
          variables,
          includesPayment,
          customHeaderLines, // Pass custom header lines to Edge Function
          saveAsTemplate: saveAsTemplate ? {
            name: templateName,
            description: templateDescription,
            subject: emailSubject || undefined
          } : undefined,
          clientId: selectedClient?.id || null
        }
      });

      if (error) throw error;

      toast.success(`מכתב נשלח בהצלחה ל-${recipientEmails.length} נמענים`);

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
   * Print/Save as PDF from preview dialog
   */
  const handlePrintPreview = () => {
    if (!previewHtml) return;

    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';

    document.body.appendChild(iframe);

    iframe.contentDocument?.open();
    iframe.contentDocument?.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
          @media print {
            body { margin: 0; padding: 0; }
          }
        </style>
      </head>
      <body>
        ${previewHtml}
      </body>
      </html>
    `);
    iframe.contentDocument?.close();

    // Wait for content to load, then print
    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 100);
    };
  };

  /**
   * Load existing letter for editing
   */
  const loadLetterForEdit = async (letterId: string) => {
    try {
      // Fetch letter from generated_letters table
      const { data: letter, error } = await supabase
        .from('generated_letters')
        .select('*')
        .eq('id', letterId)
        .single();

      if (error) throw error;
      if (!letter) {
        toast.error('מכתב לא נמצא');
        return;
      }

      // Set edit mode
      setEditMode(true);
      setEditingLetterId(letterId);
      setParentLetterId(letter.parent_letter_id || letterId);

      // Load basic fields
      setEmailSubject(letter.subject || '');
      setCompanyName(letter.client?.company_name || '');

      // TODO: Parse HTML back to plain text
      // For now, use generated_content_text if available
      if (letter.generated_content_text) {
        setPlainText(letter.generated_content_text);
      } else {
        toast.warning('לא ניתן לטעון את התוכן המקורי של המכתב. ניתן להתחיל מחדש.');
      }

      // Load client if exists
      if (letter.client_id) {
        const client = await clientService.getClientById(letter.client_id);
        setSelectedClient(client);
      }

      // Load recipients
      if (letter.recipient_emails && Array.isArray(letter.recipient_emails)) {
        if (letter.client_id) {
          setSelectedRecipients(letter.recipient_emails);
        } else {
          setManualEmails(letter.recipient_emails.join(', '));
        }
      }

      toast.success('מכתב נטען לעריכה');
    } catch (error) {
      console.error('Error loading letter for edit:', error);
      toast.error('שגיאה בטעינת המכתב לעריכה');
    }
  };

  /**
   * Load example text
   */
  const handleLoadExample = () => {
    setPlainText(EXAMPLE_TEXT);
    toast.success('טקסט לדוגמה נטען');
  };

  /**
   * Custom Header Lines Handlers
   */
  const handleAddTextLine = () => {
    const newLine: import('../types/letter.types').CustomHeaderLine = {
      id: `line-${Date.now()}`,
      type: 'text',
      content: '',
      formatting: {
        bold: true,
        color: 'black',
        underline: false
      },
      order: customHeaderLines.length
    };
    setCustomHeaderLines([...customHeaderLines, newLine]);
  };

  const handleAddSeparatorLine = () => {
    const newLine: import('../types/letter.types').CustomHeaderLine = {
      id: `line-${Date.now()}`,
      type: 'line',
      order: customHeaderLines.length
    };
    setCustomHeaderLines([...customHeaderLines, newLine]);
  };

  const handleDeleteLine = (id: string) => {
    const updated = customHeaderLines
      .filter(line => line.id !== id)
      .map((line, index) => ({ ...line, order: index })); // Re-index
    setCustomHeaderLines(updated);
  };

  const handleMoveLineUp = (id: string) => {
    const index = customHeaderLines.findIndex(line => line.id === id);
    if (index <= 0) return; // Already at top

    const updated = [...customHeaderLines];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];

    // Re-index
    updated.forEach((line, i) => {
      line.order = i;
    });

    setCustomHeaderLines(updated);
  };

  const handleMoveLineDown = (id: string) => {
    const index = customHeaderLines.findIndex(line => line.id === id);
    if (index >= customHeaderLines.length - 1) return; // Already at bottom

    const updated = [...customHeaderLines];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];

    // Re-index
    updated.forEach((line, i) => {
      line.order = i;
    });

    setCustomHeaderLines(updated);
  };

  const handleUpdateLineContent = (id: string, content: string) => {
    setCustomHeaderLines(customHeaderLines.map(line =>
      line.id === id ? { ...line, content } : line
    ));
  };

  const handleUpdateLineFormatting = (
    id: string,
    key: 'bold' | 'underline',
    value: boolean
  ) => {
    setCustomHeaderLines(customHeaderLines.map(line => {
      if (line.id === id && line.formatting) {
        return {
          ...line,
          formatting: { ...line.formatting, [key]: value }
        };
      }
      return line;
    }));
  };

  const handleUpdateLineColor = (
    id: string,
    color: 'red' | 'blue' | 'black'
  ) => {
    setCustomHeaderLines(customHeaderLines.map(line => {
      if (line.id === id && line.formatting) {
        return {
          ...line,
          formatting: { ...line.formatting, color }
        };
      }
      return line;
    }));
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Edit Mode Banner */}
      {editMode && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-right text-blue-800">
            <strong>מצב עריכה:</strong> אתה עורך גרסה חדשה של מכתב קיים.
            {parentLetterId && ' שמירה תיצור גרסה חדשה (version) ותשמור את המקור.'}
          </AlertDescription>
        </Alert>
      )}

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

            {/* Custom Header Lines - Optional Section */}
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-right block font-semibold">
                  שורות נוספות מתחת לשם הלקוח (אופציונלי)
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddTextLine}
                  >
                    <Plus className="h-4 w-4 ml-1" />
                    הוסף שורת טקסט
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddSeparatorLine}
                  >
                    <Minus className="h-4 w-4 ml-1" />
                    הוסף קו מפריד
                  </Button>
                </div>
              </div>

              {customHeaderLines.length === 0 ? (
                <p className="text-sm text-gray-500 text-right">
                  לחץ על "הוסף שורת טקסט" או "הוסף קו מפריד" כדי להוסיף שורות מותאמות שיופיעו במכתב אחרי שם החברה
                </p>
              ) : (
                <div className="space-y-2">
                  {customHeaderLines.map((line, index) => (
                    <div
                      key={line.id}
                      className="flex items-center gap-2 p-3 bg-white border rounded"
                    >
                      {/* Move Up/Down Buttons */}
                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveLineUp(line.id)}
                          disabled={index === 0}
                          title="הזז למעלה"
                          className="h-6 w-6 p-0"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveLineDown(line.id)}
                          disabled={index === customHeaderLines.length - 1}
                          title="הזז למטה"
                          className="h-6 w-6 p-0"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Line Content */}
                      <div className="flex-1">
                        {line.type === 'line' ? (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Minus className="h-4 w-4" />
                            <span className="text-sm">קו מפריד (שחור דק)</span>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Input
                              value={line.content || ''}
                              onChange={(e) => handleUpdateLineContent(line.id, e.target.value)}
                              placeholder="הזן טקסט..."
                              dir="rtl"
                              className="text-right"
                            />

                            {/* Formatting Options */}
                            <div className="flex gap-3 items-center">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`${line.id}-bold`}
                                  checked={line.formatting?.bold || false}
                                  onCheckedChange={(checked) =>
                                    handleUpdateLineFormatting(line.id, 'bold', !!checked)
                                  }
                                />
                                <Label htmlFor={`${line.id}-bold`} className="text-sm cursor-pointer">
                                  בולד
                                </Label>
                              </div>

                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`${line.id}-underline`}
                                  checked={line.formatting?.underline || false}
                                  onCheckedChange={(checked) =>
                                    handleUpdateLineFormatting(line.id, 'underline', !!checked)
                                  }
                                />
                                <Label htmlFor={`${line.id}-underline`} className="text-sm cursor-pointer">
                                  קו תחתון
                                </Label>
                              </div>

                              {/* Color Selection */}
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={line.formatting?.color === 'black' ? 'default' : 'outline'}
                                  onClick={() => handleUpdateLineColor(line.id, 'black')}
                                  className="h-7 px-2"
                                >
                                  שחור
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={line.formatting?.color === 'red' ? 'default' : 'outline'}
                                  onClick={() => handleUpdateLineColor(line.id, 'red')}
                                  className="h-7 px-2 text-red-600"
                                >
                                  אדום
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={line.formatting?.color === 'blue' ? 'default' : 'outline'}
                                  onClick={() => handleUpdateLineColor(line.id, 'blue')}
                                  className="h-7 px-2 text-blue-600"
                                >
                                  כחול
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Delete Button */}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteLine(line.id)}
                        title="מחק שורה"
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
                <div className="space-y-2">
                  <Label htmlFor="manual-emails" className="text-right block">
                    כתובות מייל (הפרד בפסיקים)
                  </Label>
                  <Textarea
                    id="manual-emails"
                    value={manualEmails}
                    onChange={(e) => setManualEmails(e.target.value)}
                    placeholder="example1@email.com, example2@email.com"
                    dir="ltr"
                    rows={3}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 text-right">
                    ניתן להזין מספר כתובות מייל מופרדות בפסיקים, נקודה-פסיק או רווחים
                  </p>
                </div>
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
                  <div className="border rounded-lg p-4 max-h-60 overflow-y-auto bg-gray-50">
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
                                className="mt-0.5"
                              />
                              <Label
                                htmlFor={`universal-recipient-${contact.id}`}
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
          <div className="flex justify-end gap-2 rtl:flex-row-reverse">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              סגור
            </Button>
            <Button variant="outline" onClick={handlePrintPreview}>
              <Printer className="h-4 w-4 ml-2" />
              הדפסה/שמירה ל-PDF
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
