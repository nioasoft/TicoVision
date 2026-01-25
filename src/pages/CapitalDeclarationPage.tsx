/**
 * CapitalDeclarationPage - Create Capital Declaration Letters
 *
 * Purpose: Generate capital declaration (הצהרת הון) letters with document upload portal
 * URL: /capital-declaration
 * Features:
 * - Contact input with autocomplete (saves to database)
 * - Optional client/group link for history
 * - Preview and PDF generation
 * - Copy portal link for client
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  FileText,
  Eye,
  Download,
  Loader2,
  Users,
  User,
  Copy,
  Check,
  Link,
  Calendar,
} from 'lucide-react';
import { ContactAutocompleteInput } from '@/components/ContactAutocompleteInput';
import { SharePdfPanel } from '@/components/foreign-workers/SharePdfPanel';
import { Combobox } from '@/components/ui/combobox';
import { TemplateService } from '@/modules/letters/services/template.service';
import { capitalDeclarationService } from '@/services/capital-declaration.service';
import TenantContactService from '@/services/tenant-contact.service';
import { clientService } from '@/services';
import { groupFeeService, type ClientGroup } from '@/services/group-fee.service';
import {
  createInitialDeclarationForm,
  validateDeclarationForm,
  getAvailableTaxYears,
  formatDeclarationDate,
  type CreateDeclarationForm,
} from '@/types/capital-declaration.types';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/services/client.service';

const templateService = new TemplateService();

export function CapitalDeclarationPage() {
  // Form state
  const [formState, setFormState] = useState<CreateDeclarationForm>(createInitialDeclarationForm());

  // Recipient mode: none, client, or group (optional link for history)
  const [recipientMode, setRecipientMode] = useState<'none' | 'client' | 'group'>('none');

  // Client/Group data
  const [clients, setClients] = useState<Client[]>([]);
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ClientGroup | null>(null);

  // UI state
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [portalLinkCopied, setPortalLinkCopied] = useState(false);

  // PDF sharing state
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [generatedPdfName, setGeneratedPdfName] = useState<string>('');
  const [generatedLetterId, setGeneratedLetterId] = useState<string | null>(null);
  const [generatedHtmlContent, setGeneratedHtmlContent] = useState<string>('');
  const [generatedSubject, setGeneratedSubject] = useState<string>('');

  // Portal link
  const [portalLink, setPortalLink] = useState<string>('');
  const [declarationId, setDeclarationId] = useState<string | null>(null);

  // Available tax years
  const taxYears = getAvailableTaxYears();

  // Load clients on mount
  useEffect(() => {
    loadClients();
    loadGroups();
  }, []);

  // Update form when client/group changes
  useEffect(() => {
    if (recipientMode === 'client' && selectedClient) {
      setFormState(prev => ({
        ...prev,
        client_id: selectedClient.id,
        group_id: null,
      }));
    } else if (recipientMode === 'group' && selectedGroup) {
      setFormState(prev => ({
        ...prev,
        client_id: null,
        group_id: selectedGroup.id,
      }));
    } else {
      setFormState(prev => ({
        ...prev,
        client_id: null,
        group_id: null,
      }));
    }
  }, [selectedClient, selectedGroup, recipientMode]);

  // Update declaration date when tax year changes
  useEffect(() => {
    setFormState(prev => ({
      ...prev,
      declaration_date: `${prev.tax_year}-12-31`,
    }));
  }, [formState.tax_year]);

  const loadClients = async () => {
    setIsLoadingClients(true);
    try {
      const { data, error } = await clientService.getLetterRecipients();
      if (error) throw error;
      if (data) {
        const sorted = data.sort((a, b) =>
          (a.company_name || '').localeCompare(b.company_name || '', 'he')
        );
        setClients(sorted);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('שגיאה בטעינת לקוחות');
    } finally {
      setIsLoadingClients(false);
    }
  };

  const loadGroups = async () => {
    setIsLoadingGroups(true);
    try {
      const currentYear = new Date().getFullYear();
      const { data, error } = await groupFeeService.getAvailableGroups(currentYear);
      if (error) throw error;
      if (data) {
        const sorted = data.sort((a, b) =>
          (a.group_name_hebrew || '').localeCompare(b.group_name_hebrew || '', 'he')
        );
        setGroups(sorted);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  // Validation
  const { valid: isFormValid, errors: validationErrors } = validateDeclarationForm(formState);

  // Preview document
  const handlePreview = async () => {
    if (!isFormValid) {
      validationErrors.forEach(err => toast.error(err));
      return;
    }

    setGenerating(true);
    try {
      // Generate preview using template service (with full header, body, footer composition)
      const letterVariables = {
        contact_name: formState.contact_name,
        tax_year: String(formState.tax_year),
        declaration_date: formatDeclarationDate(formState.declaration_date),
        portal_link: portalLink || '#',
        letter_date: new Date().toLocaleDateString('he-IL'),
        document_date: formState.declaration_date,
        company_name: formState.contact_name,
        subject: formState.subject,
      };

      const result = await templateService.generateCapitalDeclarationDocument(
        formState.client_id,
        formState.group_id,
        letterVariables,
        { previewOnly: true }
      );

      if (result.error || !result.data) {
        throw result.error || new Error('Failed to generate preview');
      }

      // Replace CID with web paths for browser preview (bullets, signature, etc.)
      const htmlForPreview = templateService.replaceCidWithWebPaths(result.data.generated_content_html);

      setPreviewHtml(htmlForPreview);
      setPreviewOpen(true);
    } catch (error) {
      console.error('Error loading preview:', error);
      toast.error('שגיאה בטעינת תצוגה מקדימה');
    } finally {
      setGenerating(false);
    }
  };

  // Create declaration and generate PDF
  const handleCreateDeclaration = async () => {
    if (!isFormValid) {
      validationErrors.forEach(err => toast.error(err));
      return;
    }

    setGenerating(true);

    try {
      // 1. Save contact if needed (using createOrGet pattern)
      let contactId: string | undefined;
      if (formState.contact_email || formState.contact_phone) {
        const contact = await TenantContactService.createOrGet({
          full_name: formState.contact_name,
          email: formState.contact_email || null,
          phone: formState.contact_phone || null,
          phone_secondary: formState.contact_phone_secondary || null,
          contact_type: 'other',
        });
        contactId = contact?.id;
      }

      // 1.5 Handle alternate recipient contact creation
      let recipientContactId: string | undefined;
      if (formState.recipient_mode === 'alternate' &&
          (formState.recipient_email || formState.recipient_phone)) {
        const recipientContact = await TenantContactService.createOrGet({
          full_name: formState.recipient_name,
          email: formState.recipient_email || null,
          phone: formState.recipient_phone || null,
          phone_secondary: formState.recipient_phone_secondary || null,
          contact_type: 'other',
        });
        recipientContactId = recipientContact?.id;
      }

      // 2. Create declaration record
      const { data: declaration, error: createError } = await capitalDeclarationService.create(
        formState,
        contactId,
        recipientContactId
      );

      if (createError || !declaration) {
        throw createError || new Error('שגיאה ביצירת הצהרה');
      }

      setDeclarationId(declaration.id);

      // 3. Generate portal link
      const link = capitalDeclarationService.getPortalLink(declaration.public_token);
      setPortalLink(link);

      // 4. Generate letter via template service
      const letterVariables = {
        contact_name: formState.contact_name,
        tax_year: String(formState.tax_year),
        declaration_date: formatDeclarationDate(formState.declaration_date),
        portal_link: link,
        letter_date: new Date().toLocaleDateString('he-IL'),
        document_date: formState.declaration_date,
        company_name: formState.contact_name,
        subject: formState.subject,
      };

      const result = await templateService.generateCapitalDeclarationDocument(
        formState.client_id,
        formState.group_id,
        letterVariables
      );

      if (result.error) {
        throw result.error;
      }

      // 5. Link letter to declaration
      if (result.data?.id) {
        await capitalDeclarationService.linkLetter(declaration.id, result.data.id);
        setGeneratedLetterId(result.data.id);
        setGeneratedHtmlContent(result.data.generated_content_html || '');
        setGeneratedSubject(result.data.subject || formState.subject);

        // 6. Generate PDF
        const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-pdf', {
          body: { letterId: result.data.id },
        });

        if (pdfError || !pdfData?.success) {
          console.error('PDF generation error:', pdfError);
          toast.warning('ההצהרה נוצרה, אך הייתה שגיאה ביצירת PDF');
        } else {
          const pdfFileName = `הצהרת הון - ${formState.contact_name}.pdf`;
          setGeneratedPdfUrl(pdfData.pdfUrl);
          setGeneratedPdfName(pdfFileName);
          setShowSharePanel(true);
        }
      }

      // 7. Update status to 'sent'
      await capitalDeclarationService.updateStatus(declaration.id, 'sent');

      toast.success('הצהרת הון נוצרה בהצלחה!');
    } catch (error) {
      console.error('Error creating declaration:', error);
      toast.error('שגיאה ביצירת הצהרת הון');
    } finally {
      setGenerating(false);
    }
  };

  // Copy portal link
  const handleCopyPortalLink = async () => {
    if (!portalLink) return;
    await navigator.clipboard.writeText(portalLink);
    setPortalLinkCopied(true);
    toast.success('הלינק הועתק ללוח');
    setTimeout(() => setPortalLinkCopied(false), 2000);
  };

  // Handle recipient mode change (main vs alternate)
  const handleRecipientModeChange = (mode: 'main' | 'alternate') => {
    setFormState(prev => ({
      ...prev,
      recipient_mode: mode,
      // Clear alternate fields when switching to main
      ...(mode === 'main' && {
        recipient_name: '',
        recipient_email: '',
        recipient_phone: '',
        recipient_phone_secondary: '',
      })
    }));
  };

  return (
    <div className="container mx-auto py-6 px-4" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-right">
            <FileText className="h-6 w-6" />
            יצירת הצהרת הון
          </CardTitle>
          <CardDescription className="text-right">
            יצירת מכתב הצהרת הון עם פורטל להעלאת מסמכים ללקוח
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Contact Input Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <Label className="text-lg font-semibold">פרטי נמען</Label>
            <ContactAutocompleteInput
              label="איש קשר"
              nameValue={formState.contact_name}
              emailValue={formState.contact_email}
              phoneValue={formState.contact_phone}
              phoneSecondaryValue={formState.contact_phone_secondary}
              onNameChange={(value) => setFormState(prev => ({ ...prev, contact_name: value }))}
              onEmailChange={(value) => setFormState(prev => ({ ...prev, contact_email: value }))}
              onPhoneChange={(value) => setFormState(prev => ({ ...prev, contact_phone: value }))}
              onPhoneSecondaryChange={(value) => setFormState(prev => ({ ...prev, contact_phone_secondary: value }))}
              required
              namePlaceholder="שם מלא"
              emailPlaceholder="כתובת אימייל"
              phonePlaceholder="מספר טלפון"
              phoneSecondaryPlaceholder="טלפון נוסף"
            />
          </div>

          {/* Recipient Selection Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <Label className="text-lg font-semibold text-right block">מי יקבל את המכתב?</Label>
            <RadioGroup
              value={formState.recipient_mode}
              onValueChange={(value) => handleRecipientModeChange(value as 'main' | 'alternate')}
              className="space-y-3"
              dir="rtl"
            >
              <div className="flex items-center gap-2 justify-end flex-row-reverse">
                <RadioGroupItem value="main" id="recipient-main" />
                <Label htmlFor="recipient-main" className="cursor-pointer">
                  שלח לנמען הראשי {formState.contact_name && `(${formState.contact_name})`}
                </Label>
              </div>
              <div className="flex items-center gap-2 justify-end flex-row-reverse">
                <RadioGroupItem value="alternate" id="recipient-alternate" />
                <Label htmlFor="recipient-alternate" className="cursor-pointer">
                  שלח לאיש קשר אחר
                </Label>
              </div>
            </RadioGroup>

            {/* Alternate recipient input */}
            {formState.recipient_mode === 'alternate' && (
              <div className="pr-6 pt-2 border-r-2 border-primary/20">
                <ContactAutocompleteInput
                  label="פרטי נמען חלופי"
                  nameValue={formState.recipient_name}
                  emailValue={formState.recipient_email}
                  phoneValue={formState.recipient_phone}
                  phoneSecondaryValue={formState.recipient_phone_secondary}
                  onNameChange={(value) => setFormState(prev => ({ ...prev, recipient_name: value }))}
                  onEmailChange={(value) => setFormState(prev => ({ ...prev, recipient_email: value }))}
                  onPhoneChange={(value) => setFormState(prev => ({ ...prev, recipient_phone: value }))}
                  onPhoneSecondaryChange={(value) => setFormState(prev => ({ ...prev, recipient_phone_secondary: value }))}
                  required
                  namePlaceholder="שם מלא"
                  emailPlaceholder="כתובת אימייל"
                  phonePlaceholder="מספר טלפון"
                  phoneSecondaryPlaceholder="טלפון נוסף"
                />
              </div>
            )}
          </div>

          {/* Tax Year and Date Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>שנת מס</Label>
              <Select
                value={String(formState.tax_year)}
                onValueChange={(value) => setFormState(prev => ({ ...prev, tax_year: Number(value) }))}
              >
                <SelectTrigger className="text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {taxYears.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>תאריך הצהרה</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={formState.declaration_date}
                  onChange={(e) => setFormState(prev => ({ ...prev, declaration_date: e.target.value }))}
                  dir="ltr"
                  className="text-left"
                />
              </div>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label>נושא המכתב</Label>
            <Input
              value={formState.subject}
              onChange={(e) => setFormState(prev => ({ ...prev, subject: e.target.value }))}
              className="text-right"
              dir="rtl"
            />
          </div>

          {/* Optional: Link to Client/Group */}
          <div className="space-y-4 p-4 border rounded-lg">
            <Label className="text-lg font-semibold">קישור להיסטוריה (אופציונלי)</Label>
            <p className="text-sm text-muted-foreground">
              ניתן לקשר את ההצהרה ללקוח או קבוצה כדי שתופיע בהיסטוריית המכתבים שלהם
            </p>

            <RadioGroup
              value={recipientMode}
              onValueChange={(value) => {
                setRecipientMode(value as 'none' | 'client' | 'group');
                setSelectedClient(null);
                setSelectedGroup(null);
              }}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="none" id="mode-none" />
                <Label htmlFor="mode-none" className="cursor-pointer">ללא קישור</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="client" id="mode-client" />
                <Label htmlFor="mode-client" className="cursor-pointer flex items-center gap-1">
                  <User className="h-4 w-4" />
                  לקוח
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="group" id="mode-group" />
                <Label htmlFor="mode-group" className="cursor-pointer flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  קבוצה
                </Label>
              </div>
            </RadioGroup>

            {recipientMode === 'client' && (
              <Combobox
                options={clients.map((c) => ({
                  value: c.id,
                  label: c.company_name,
                }))}
                value={selectedClient?.id || ''}
                onValueChange={(value) => {
                  const client = clients.find((c) => c.id === value);
                  setSelectedClient(client || null);
                }}


                emptyText="לא נמצאו לקוחות"
                disabled={isLoadingClients}
              />
            )}

            {recipientMode === 'group' && (
              <Combobox
                options={groups.map((g) => ({
                  value: g.id,
                  label: g.group_name_hebrew || g.group_name || '',
                }))}
                value={selectedGroup?.id || ''}
                onValueChange={(value) => {
                  const group = groups.find((g) => g.id === value);
                  setSelectedGroup(group || null);
                }}


                emptyText="לא נמצאו קבוצות"
                disabled={isLoadingGroups}
              />
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>הערות (אופציונלי)</Label>
            <Textarea
              value={formState.notes}
              onChange={(e) => setFormState(prev => ({ ...prev, notes: e.target.value }))}
              className="text-right"
              dir="rtl"
              rows={3}
            />
          </div>

          {/* Portal Link (shown after creation) */}
          {portalLink && (
            <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950 space-y-3">
              <Label className="text-lg font-semibold flex items-center gap-2 text-green-700 dark:text-green-300">
                <Link className="h-5 w-5" />
                לינק לפורטל הלקוח
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={portalLink}
                  readOnly
                  className="font-mono text-sm bg-white dark:bg-gray-900"
                  dir="ltr"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyPortalLink}
                >
                  {portalLinkCopied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                שלח לינק זה ללקוח. הלקוח יוכל להעלות מסמכים דרך הפורטל ללא צורך בהתחברות.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 justify-end">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={!isFormValid || generating}
            >
              <Eye className="h-4 w-4 ml-2" />
              תצוגה מקדימה
            </Button>

            <Button
              onClick={handleCreateDeclaration}
              disabled={!isFormValid || generating || !!declarationId}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  יוצר...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 ml-2" />
                  {declarationId ? 'הצהרה נוצרה' : 'צור הצהרה ו-PDF'}
                </>
              )}
            </Button>
          </div>

          {/* Share PDF Panel - Inline after generating PDF */}
          {generatedPdfUrl && generatedLetterId && (
            <SharePdfPanel
              show={showSharePanel}
              onHide={() => setShowSharePanel(false)}
              pdfUrl={generatedPdfUrl}
              pdfName={generatedPdfName}
              clientName={formState.contact_name}
              clientId={formState.client_id || undefined}
              htmlContent={generatedHtmlContent}
              letterId={generatedLetterId}
              defaultSubject={generatedSubject}
              defaultEmail={
                formState.recipient_mode === 'alternate'
                  ? formState.recipient_email || undefined
                  : formState.contact_email || undefined
              }
              defaultEmailType="html"
              savePdfToFolder={!!formState.client_id}
              fileCategory="letters"
            />
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>תצוגה מקדימה</DialogTitle>
            <DialogDescription>
              זוהי תצוגה מקדימה של המכתב. לחץ על "צור הצהרה" ליצירת PDF.
            </DialogDescription>
          </DialogHeader>
          <div
            className="prose prose-sm max-w-none bg-white p-8 border rounded-lg"
            dir="rtl"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </DialogContent>
      </Dialog>

    </div>
  );
}

export default CapitalDeclarationPage;
