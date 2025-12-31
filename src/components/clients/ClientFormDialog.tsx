import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FolderOpen } from 'lucide-react';
import { UnsavedChangesIndicator } from '@/components/ui/unsaved-changes-indicator';
import { SignatureUpload } from '@/components/SignatureUpload';
import { ContactsManager } from '@/components/ContactsManager';
import { PhoneNumbersManager } from '@/components/PhoneNumbersManager';
import { ContactAutocompleteInput } from '@/components/ContactAutocompleteInput';
import { FileDisplayWidget } from '@/components/files/FileDisplayWidget';
import type {
  Client,
  CreateClientDto,
  ClientType,
  CompanyStatus,
  CompanySubtype,
  ClientContact,
  CreateClientContactDto,
  ClientPhone,
  CreateClientPhoneDto,
  ClientGroup,
  PaymentRole,
} from '@/services';
import { clientService, TenantContactService } from '@/services';
import type { TenantContact } from '@/types/tenant-contact.types';
import { PAYMENT_ROLE_LABELS, PAYMENT_ROLE_DESCRIPTIONS } from '@/lib/labels';
import {
  validateIsraeliPostalCode,
  formatIsraeliPhone,
  formatIsraeliLandline,
  formatIsraeliTaxId,
  stripTaxIdFormatting,
} from '@/lib/validators';
import { PdfImportButton } from './PdfImportButton';
import type { ExtractedCompanyData } from '@/services/company-extraction.service';
import { fileUploadService } from '@/services/file-upload.service';

interface ClientFormDialogProps {
  open: boolean;
  mode: 'add' | 'edit';
  client: Client | null;
  contacts: ClientContact[];
  phones: ClientPhone[];
  onClose: () => void;
  onSubmit: (data: CreateClientDto) => Promise<boolean | { success: boolean; clientId?: string }>;
  onLoadContacts?: (clientId: string) => Promise<void>;
  onAddContact?: (clientId: string, contactData: CreateClientContactDto) => Promise<boolean>;
  onUpdateContact?: (clientId: string, contactId: string, contactData: Partial<CreateClientContactDto>) => Promise<boolean>;
  onDeleteContact?: (clientId: string, contactId: string) => Promise<boolean>;
  onSetPrimaryContact?: (clientId: string, contactId: string) => Promise<boolean>;
  onLoadPhones?: (clientId: string) => Promise<void>;
  onAddPhone?: (clientId: string, phoneData: CreateClientPhoneDto) => Promise<boolean>;
  onUpdatePhone?: (phoneId: string, phoneData: Partial<CreateClientPhoneDto>) => Promise<boolean>;
  onDeletePhone?: (phoneId: string) => Promise<boolean>;
  onSetPrimaryPhone?: (phoneId: string) => Promise<boolean>;
}

const INITIAL_FORM_DATA: CreateClientDto = {
  company_name: '',
  commercial_name: '', // NEW: שם מסחרי
  tax_id: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  contact_phone_secondary: '',
  // Accountant fields (required)
  accountant_name: '',
  accountant_email: '',
  accountant_phone: '',
  accountant_phone_secondary: '',
  address: {
    street: '',
    city: '',
    postal_code: '',
  },
  status: 'active',
  internal_external: 'internal',
  collection_responsibility: 'tiko',
  notes: '',
  google_drive_link: '',
  client_type: 'company',
  company_status: 'active',
  company_subtype: undefined,
  pays_fees: true, // NEW DEFAULT: true instead of false
  is_retainer: false, // NEW: לקוח ריטיינר - default false
  group_id: null,
  payment_role: 'independent', // NEW: תפקיד תשלום - default independent
  payer_client_id: null, // NEW: לקוח שמשלם על לקוח זה
};

export const ClientFormDialog = React.memo<ClientFormDialogProps>(
  ({
    open,
    mode,
    client,
    contacts,
    phones,
    onClose,
    onSubmit,
    onLoadContacts,
    onAddContact,
    onUpdateContact,
    onDeleteContact,
    onSetPrimaryContact,
    onLoadPhones,
    onAddPhone,
    onUpdatePhone,
    onDeletePhone,
    onSetPrimaryPhone,
  }) => {
    const [formData, setFormData] = useState<CreateClientDto>(INITIAL_FORM_DATA);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [groups, setGroups] = useState<ClientGroup[]>([]); // NEW: רשימת קבוצות
    const [payerClients, setPayerClients] = useState<Client[]>([]); // לקוחות שיכולים לשלם
    const [importedPdfFile, setImportedPdfFile] = useState<File | null>(null); // PDF file to save after client creation
    const [taxIdExists, setTaxIdExists] = useState(false); // NEW: בדיקת כפילות מספר עוסק
    const [isCheckingTaxId, setIsCheckingTaxId] = useState(false);
    const taxIdCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Signature/stamp state
    const [signaturePath, setSignaturePath] = useState<string | null>(null);

    // Load client data when editing
    useEffect(() => {
      if (mode === 'edit' && client) {
        setFormData({
          company_name: client.company_name,
          commercial_name: client.commercial_name || '', // NEW
          tax_id: formatIsraeliTaxId(client.tax_id), // Format for display
          contact_name: client.contact_name,
          contact_email: client.contact_email || '',
          contact_phone: client.contact_phone || '',
          contact_phone_secondary: client.contact_phone_secondary || '',
          // Accountant fields - will be populated from contacts if available
          accountant_name: '',
          accountant_email: '',
          accountant_phone: '',
          accountant_phone_secondary: '',
          address: client.address || { street: '', city: '', postal_code: '' },
          status: client.status,
          internal_external: client.internal_external || 'internal',
          collection_responsibility: client.collection_responsibility || 'tiko',
          notes: client.notes || '',
          google_drive_link: client.google_drive_link || '',
          client_type: client.client_type || 'company',
          company_status: client.company_status || 'active',
          company_subtype: client.company_subtype || undefined,
          pays_fees: client.pays_fees || false,
          is_retainer: client.is_retainer || false, // NEW: טעינת סטטוס ריטיינר
          group_id: client.group_id || undefined, // NEW: טעינת קבוצה
          payment_role: client.payment_role || 'independent', // NEW: טעינת תפקיד תשלום
          payer_client_id: client.payer_client_id || null, // NEW: לקוח שמשלם
        });
        // Load signature path
        setSignaturePath(client.signature_path || null);
        setHasUnsavedChanges(false);

        // Load contacts for edit mode
        if (onLoadContacts) {
          onLoadContacts(client.id);
        }

        // Load phones for edit mode
        if (onLoadPhones) {
          onLoadPhones(client.id);
        }
      } else {
        setFormData(INITIAL_FORM_DATA);
        setHasUnsavedChanges(false);
      }
    }, [mode, client, onLoadContacts]);

    // Load groups list
    useEffect(() => {
      const loadGroups = async () => {
        const response = await clientService.getGroups();
        if (response.data) {
          setGroups(response.data);
        }
      };

      loadGroups();
    }, []);

    // Load payer clients (clients that can pay for other clients)
    useEffect(() => {
      const loadPayerClients = async () => {
        const response = await clientService.list();
        if (response.data?.clients) {
          // Filter to only clients that can be payers:
          // - Not the current client (if editing)
          // - Not already a 'member' (who can't pay for others)
          // - Must be active
          const eligible = response.data.clients.filter(
            (c) =>
              c.id !== client?.id &&
              c.payment_role !== 'member' &&
              c.status === 'active'
          );
          setPayerClients(eligible);
        }
      };

      loadPayerClients();
    }, [client?.id]);

    // Check for duplicate tax_id in add mode (debounced)
    useEffect(() => {
      // Only check in add mode
      if (mode !== 'add') {
        setTaxIdExists(false);
        return;
      }

      // Clear previous timeout
      if (taxIdCheckTimeoutRef.current) {
        clearTimeout(taxIdCheckTimeoutRef.current);
      }

      // Strip formatting and check if we have 9 digits
      const plainTaxId = stripTaxIdFormatting(formData.tax_id);
      if (plainTaxId.length !== 9) {
        setTaxIdExists(false);
        setIsCheckingTaxId(false);
        return;
      }

      // Debounced check
      setIsCheckingTaxId(true);
      taxIdCheckTimeoutRef.current = setTimeout(async () => {
        try {
          const exists = await clientService.checkTaxIdExists(plainTaxId);
          setTaxIdExists(exists);
        } catch (error) {
          console.error('Error checking tax_id existence:', error);
          setTaxIdExists(false);
        } finally {
          setIsCheckingTaxId(false);
        }
      }, 500); // 500ms debounce

      return () => {
        if (taxIdCheckTimeoutRef.current) {
          clearTimeout(taxIdCheckTimeoutRef.current);
        }
      };
    }, [formData.tax_id, mode]);

    const handleClose = useCallback(() => {
      if (hasUnsavedChanges) {
        setShowExitConfirm(true);
      } else {
        onClose();
      }
    }, [hasUnsavedChanges, onClose]);

    // Validate form before submission
    const validateForm = useCallback((): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      // Required fields validation
      if (!formData.tax_id?.trim()) errors.push('מספר מזהה');
      if (!formData.company_name?.trim()) errors.push('שם החברה');
      if (!formData.contact_name?.trim()) errors.push('שם איש קשר');
      if (!formData.contact_email?.trim()) errors.push('אימייל איש קשר');
      if (!formData.contact_phone?.trim()) errors.push('טלפון איש קשר');

      // Accountant validation - OPTIONAL in add mode
      // Can be added later via contacts management
      // (No validation needed - fields are optional)

      // Check for duplicate tax_id (only in add mode)
      if (mode === 'add' && taxIdExists) {
        errors.push('לקוח עם מספר עוסק זה כבר קיים במערכת');
      }

      // Format validation - strip formatting before checking
      if (formData.tax_id) {
        const plainTaxId = stripTaxIdFormatting(formData.tax_id);
        if (!/^\d{9}$/.test(plainTaxId)) {
          errors.push('מספר מזהה חייב להכיל 9 ספרות בדיוק');
        }
      }

      if (formData.address?.postal_code?.trim() && !validateIsraeliPostalCode(formData.address.postal_code)) {
        errors.push('מיקוד חייב להכיל 7 ספרות בדיוק');
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (formData.contact_email && !emailRegex.test(formData.contact_email)) {
        errors.push('אימייל איש קשר לא תקין');
      }

      return { valid: errors.length === 0, errors };
    }, [formData, mode, taxIdExists]);

    const handleSubmit = useCallback(async () => {
      // Validate form first
      const { valid, errors } = validateForm();

      if (!valid) {
        // Show error alert with missing fields
        alert(
          `❌ לא ניתן לשמור - שדות חובה חסרים או לא תקינים:\n\n${errors.map(e => `• ${e}`).join('\n')}`
        );
        return;
      }

      setIsSubmitting(true);
      try {
        // Strip tax_id formatting before submitting
        const submissionData = {
          ...formData,
          tax_id: stripTaxIdFormatting(formData.tax_id),
        };

        // Submit the client data (contact fields will be auto-saved by client.service)
        const result = await onSubmit(submissionData);

        // Handle both old (boolean) and new ({ success, clientId }) return types
        const success = typeof result === 'boolean' ? result : result.success;
        const clientId = typeof result === 'object' ? result.clientId : undefined;

        if (success) {
          // If we have a PDF file and a client ID, upload it to company_registry
          if (mode === 'add' && importedPdfFile && clientId) {
            try {
              console.log('Uploading PDF to company_registry for client:', clientId);
              await fileUploadService.uploadFileToCategory(
                importedPdfFile,
                clientId,
                'company_registry',
                'תמצית רשם חברות'
              );
              console.log('PDF uploaded successfully');
            } catch (uploadError) {
              console.error('Failed to upload PDF:', uploadError);
              // Don't fail the whole operation if PDF upload fails
            }
          }

          setFormData(INITIAL_FORM_DATA);
          setImportedPdfFile(null);
          setHasUnsavedChanges(false);
        }
      } finally {
        setIsSubmitting(false);
      }
    }, [formData, onSubmit, validateForm, mode, importedPdfFile]);

    const handleFormChange = useCallback(<K extends keyof CreateClientDto>(
      field: K,
      value: CreateClientDto[K]
    ) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setHasUnsavedChanges(true);
    }, []);

    // Handle Enter key press - move to next field
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();

        // Find the dialog container (no form wrapper in this component)
        const dialogContent = e.currentTarget.closest('[role="dialog"]');
        if (!dialogContent) return;

        // Find all focusable elements (Input, Select/Combobox, Textarea)
        const focusableElements = Array.from(
          dialogContent.querySelectorAll<HTMLElement>(
            'input:not([disabled]):not([type="hidden"]), button[role="combobox"]:not([disabled]), textarea:not([disabled])'
          )
        );

        const currentIndex = focusableElements.indexOf(e.currentTarget as HTMLElement);
        const nextElement = focusableElements[currentIndex + 1];

        if (nextElement) {
          nextElement.focus();

          // If it's a shadcn/ui Select (combobox), click to open dropdown
          if (nextElement.getAttribute('role') === 'combobox') {
            nextElement.click();
          }
        }
      }
    }, []);

    const handleExitConfirm = useCallback(() => {
      setFormData(INITIAL_FORM_DATA);
      setHasUnsavedChanges(false);
      setShowExitConfirm(false);
      setSignaturePath(null);
      onClose();
    }, [onClose]);

    // Handle signature upload
    const handleSignatureUpload = useCallback(async (file: File) => {
      if (!client?.id) return;
      const result = await fileUploadService.uploadClientSignature(file, client.id);
      if (result.data) {
        setSignaturePath(result.data);
      } else if (result.error) {
        throw result.error;
      }
    }, [client?.id]);

    // Handle signature delete
    const handleSignatureDelete = useCallback(async () => {
      if (!client?.id) return;
      const result = await fileUploadService.deleteClientSignature(client.id);
      if (result.data) {
        setSignaturePath(null);
      } else if (result.error) {
        throw result.error;
      }
    }, [client?.id]);

    // Handle PDF file upload (data extraction is disabled)
    const handlePdfDataExtracted = useCallback((data: ExtractedCompanyData | null, file: File) => {
      // Data extraction via Claude API is disabled
      // Just save the file reference for later upload to file manager
      console.log('PDF file selected for upload:', file.name);
      setImportedPdfFile(file);
      setHasUnsavedChanges(true);
    }, []);

    return (
      <>
        <Dialog open={open} onOpenChange={handleClose}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <UnsavedChangesIndicator show={hasUnsavedChanges} />
            <DialogHeader>
              <DialogTitle>
                {mode === 'add' ? 'הוספת לקוח חדש' : 'עריכת פרטי לקוח'}
              </DialogTitle>
              <DialogDescription>
                {mode === 'add' ? 'הזן את פרטי הלקוח החדש' : 'עדכן את פרטי הלקוח'}
              </DialogDescription>
            </DialogHeader>

            {/* Google Drive Button - Edit mode only, when link exists */}
            {mode === 'edit' && client?.google_drive_link && (
              <div className="mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(client.google_drive_link, '_blank')}
                  className="gap-2"
                >
                  <FolderOpen className="h-4 w-4 text-green-600" />
                  Google Drive
                </Button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 py-4">
              {/* PDF Import Section - Only in Add mode */}
              {mode === 'add' && (
                <div className="col-span-3 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                  <PdfImportButton
                    onDataExtracted={handlePdfDataExtracted}
                    disabled={isSubmitting}
                  />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 rtl:text-right">
                      העלה PDF מרשם החברות - יישמר בתיקיית הלקוח לאחר יצירת הלקוח
                    </p>
                    {importedPdfFile && (
                      <p className="text-xs text-green-600 font-medium rtl:text-right mt-1">
                        ✓ קובץ נבחר: {importedPdfFile.name}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Category Header: Company Details */}
              <div className="col-span-3 mb-2">
                <h3 className="text-lg font-semibold text-blue-700 border-b-2 border-blue-200 pb-2 rtl:text-right">
                  פרטי הרשומה
                </h3>
              </div>

              {/* Row 1: Tax ID, Company Name, Commercial Name (3 cols) */}
              <div>
                <Label htmlFor="tax_id" className="text-right block mb-2">
                  מספר מזהה (XX-XXXXXX-X)
                </Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => {
                    const formatted = formatIsraeliTaxId(e.target.value);
                    handleFormChange('tax_id', formatted);
                  }}
                  onKeyDown={handleKeyDown}
                  maxLength={11}
                  placeholder=""
                  required
                  dir="ltr"
                  className={taxIdExists ? 'border-red-500' : ''}
                />
                {taxIdExists && (
                  <Alert variant="destructive" className="mt-2 py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="rtl:text-right mr-2">
                      לקוח עם מספר עוסק זה כבר קיים במערכת
                    </AlertDescription>
                  </Alert>
                )}
                {isCheckingTaxId && (
                  <p className="text-xs text-gray-500 mt-1 rtl:text-right">
                    בודק...
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="company_name" className="text-right block mb-2">
                  שם פורמלי
                </Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleFormChange('company_name', e.target.value)}
                  onKeyDown={handleKeyDown}
                  required
                  dir="rtl"
                />
              </div>

              <div>
                <Label htmlFor="commercial_name" className="text-right block mb-2">
                  שם מסחרי
                </Label>
                <Input
                  id="commercial_name"
                  value={formData.commercial_name || ''}
                  onChange={(e) => handleFormChange('commercial_name', e.target.value)}
                  onKeyDown={handleKeyDown}
                  dir="rtl"
                />
              </div>

              {/* Category Header: Address Details */}
              <div className="col-span-3 mt-4 mb-2">
                <h3 className="text-lg font-semibold text-blue-700 border-b-2 border-blue-200 pb-2 rtl:text-right">
                  פרטי כתובת
                </h3>
              </div>

              {/* Row 2: Address, City, Postal Code (3 cols) */}
              <div>
                <Label htmlFor="address_street" className="text-right block mb-2">
                  כתובת
                </Label>
                <Input
                  id="address_street"
                  value={formData.address?.street || ''}
                  onChange={(e) =>
                    handleFormChange('address', {
                      ...formData.address,
                      street: e.target.value
                    })
                  }
                  onKeyDown={handleKeyDown}
                  dir="rtl"
                />
              </div>

              <div>
                <Label htmlFor="address_city" className="text-right block mb-2">
                  עיר
                </Label>
                <Input
                  id="address_city"
                  value={formData.address?.city || ''}
                  onChange={(e) =>
                    handleFormChange('address', {
                      ...formData.address,
                      city: e.target.value
                    })
                  }
                  onKeyDown={handleKeyDown}
                  dir="rtl"
                />
              </div>

              <div>
                <Label htmlFor="address_postal_code" className="text-right block mb-2">
                  מיקוד (7 ספרות)
                </Label>
                <Input
                  id="address_postal_code"
                  value={formData.address?.postal_code || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, ''); // Only digits
                    handleFormChange('address', {
                      ...formData.address,
                      postal_code: value
                    });
                  }}
                  onKeyDown={handleKeyDown}
                  maxLength={7}
                  pattern="\d{7}"
                  required
                  dir="ltr"
                />
                {formData.address?.postal_code &&
                 !validateIsraeliPostalCode(formData.address.postal_code) && (
                  <p className="text-xs text-red-500 mt-1 rtl:text-right">
                    מיקוד ישראלי חייב להכיל 7 ספרות בדיוק
                  </p>
                )}
              </div>

              {/* Category Header: Primary Contact */}
              <div className="col-span-3 mt-4 mb-2">
                <h3 className="text-lg font-semibold text-blue-700 border-b-2 border-blue-200 pb-2 rtl:text-right">
                  איש קשר מהותי (בעל הבית)
                </h3>
              </div>

              {/* Row 3: Primary Contact (Owner) with Autocomplete (3 cols) */}
              <div className="col-span-3">
                <ContactAutocompleteInput
                  label=""
                  nameValue={formData.contact_name}
                  emailValue={formData.contact_email}
                  phoneValue={formData.contact_phone}
                  phoneSecondaryValue={formData.contact_phone_secondary}
                  onNameChange={(value) => handleFormChange('contact_name', value)}
                  onEmailChange={(value) => handleFormChange('contact_email', value)}
                  onPhoneChange={(value) => {
                    const formatted = formatIsraeliPhone(value);
                    handleFormChange('contact_phone', formatted);
                  }}
                  onPhoneSecondaryChange={(value) => {
                    const formatted = formatIsraeliLandline(value);
                    handleFormChange('contact_phone_secondary', formatted);
                  }}
                  contactType="owner"
                  required={true}
                  namePlaceholder="שם מלא"
                  emailPlaceholder="דוא״ל"
                  phonePlaceholder=""
                  phoneSecondaryPlaceholder=""
                />
              </div>

              {/* Category Header: Additional Information */}
              <div className="col-span-3 mt-4 mb-2">
                <h3 className="text-lg font-semibold text-blue-700 border-b-2 border-blue-200 pb-2 rtl:text-right">
                  פרטים נוספים
                </h3>
              </div>

              {/* Row 4: Group, Payment Role (if selected), Accounting Management (3 cols) */}
              <div>
                <Label htmlFor="group_id" className="text-right block mb-2">
                  קבוצה
                </Label>
                <Select
                  value={formData.group_id || 'NO_GROUP'}
                  onValueChange={(value) => {
                    handleFormChange('group_id', value === 'NO_GROUP' ? null : value);
                    if (value && value !== 'NO_GROUP' && !formData.payment_role) {
                      handleFormChange('payment_role', 'member');
                    }
                    if (!value || value === 'NO_GROUP') {
                      handleFormChange('payment_role', 'independent');
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר קבוצה" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NO_GROUP">ללא קבוצה</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.group_name_hebrew}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Role - conditional if group selected */}
              {formData.group_id ? (
                <div>
                  <Label htmlFor="payment_role" className="text-right block mb-2">
                    תפקיד תשלום בקבוצה *
                  </Label>
                  <Select
                    value={formData.payment_role || 'member'}
                    onValueChange={(value: PaymentRole) =>
                      handleFormChange('payment_role', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="independent">
                        <div className="text-right">
                          <div className="font-medium">{PAYMENT_ROLE_LABELS.independent}</div>
                          <div className="text-xs text-gray-500">
                            {PAYMENT_ROLE_DESCRIPTIONS.independent}
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="member">
                        <div className="text-right">
                          <div className="font-medium">{PAYMENT_ROLE_LABELS.member}</div>
                          <div className="text-xs text-gray-500">
                            {PAYMENT_ROLE_DESCRIPTIONS.member}
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="primary_payer">
                        <div className="text-right">
                          <div className="font-medium">{PAYMENT_ROLE_LABELS.primary_payer}</div>
                          <div className="text-xs text-gray-500">
                            {PAYMENT_ROLE_DESCRIPTIONS.primary_payer}
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div></div>
              )}

              {/* Payer Client Selection - for clients paid by another client */}
              <div className="col-span-3 mt-4 mb-2">
                <h3 className="text-lg font-semibold text-blue-700 border-b-2 border-blue-200 pb-2 rtl:text-right">
                  אחריות תשלום שכ"ט
                </h3>
              </div>

              <div className="col-span-3 space-y-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="is_paid_by_another"
                    checked={formData.payment_role === 'member' && !formData.group_id}
                    onCheckedChange={(checked) => {
                      if (!checked) {
                        handleFormChange('payer_client_id', null);
                        handleFormChange('payment_role', 'independent');
                      } else {
                        handleFormChange('payment_role', 'member');
                      }
                    }}
                  />
                  <Label htmlFor="is_paid_by_another" className="cursor-pointer">
                    משולם על ידי לקוח אחר
                  </Label>
                </div>

                {formData.payment_role === 'member' && !formData.group_id && (
                  <div className="pr-6">
                    <Label className="text-right block mb-2">בחר לקוח משלם *</Label>
                    <Select
                      value={formData.payer_client_id || ''}
                      onValueChange={(value) => handleFormChange('payer_client_id', value || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר לקוח..." />
                      </SelectTrigger>
                      <SelectContent>
                        {payerClients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.company_name_hebrew || c.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1 rtl:text-right">
                      הלקוח הנבחר ישלם את שכר הטרחה עבור לקוח זה
                    </p>
                  </div>
                )}
              </div>

              {/* Accounting Management, Client Type row */}
              <div>
                <Label htmlFor="internal_external" className="text-right block mb-2">
                  הנהלת חשבונות
                </Label>
                <Select
                  value={formData.internal_external}
                  onValueChange={(value: 'internal' | 'external') =>
                    handleFormChange('internal_external', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">פנימי</SelectItem>
                    <SelectItem value="external">חיצוני</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Row 5: Client Type, Company Status (conditional), Company Subtype (conditional) - 3 cols */}
              <div>
                <Label htmlFor="client_type" className="text-right block mb-2">
                  סוג לקוח *
                </Label>
                <Select
                  value={formData.client_type}
                  onValueChange={(value: ClientType) => {
                    handleFormChange('client_type', value);
                    if (value !== 'company') {
                      handleFormChange('company_subtype', undefined);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">חברה</SelectItem>
                    <SelectItem value="freelancer">עצמאי</SelectItem>
                    <SelectItem value="salary_owner">שכיר בעל שליטה</SelectItem>
                    <SelectItem value="partnership">שותפות</SelectItem>
                    <SelectItem value="nonprofit">עמותה</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.client_type === 'company' ? (
                <div>
                  <Label htmlFor="company_status" className="text-right block mb-2">
                    סטטוס חברה
                  </Label>
                  <Select
                    value={formData.company_status}
                    onValueChange={(value: CompanyStatus) =>
                      handleFormChange('company_status', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">פעילה</SelectItem>
                      <SelectItem value="inactive">רדומה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div></div>
              )}

              {formData.client_type === 'company' && formData.company_status === 'active' ? (
                <div>
                  <Label htmlFor="company_subtype" className="text-right block mb-2">
                    תת סוג חברה
                  </Label>
                  <Select
                    value={formData.company_subtype || ''}
                    onValueChange={(value: CompanySubtype) =>
                      handleFormChange('company_subtype', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר תת סוג" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="commercial_restaurant">מסחרית מסעדה</SelectItem>
                      <SelectItem value="commercial_other">מסחרית אחר</SelectItem>
                      <SelectItem value="realestate">נדל״ן</SelectItem>
                      <SelectItem value="holdings">החזקות</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div></div>
              )}

              {/* Row 6: Folder Responsibility, Status, Checkboxes (4 cols in one row) */}
              <div className="col-span-3 grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="collection_responsibility" className="text-right block mb-2">
                    אחריות/אמא לתיק
                  </Label>
                  <Select
                    value={formData.collection_responsibility}
                    onValueChange={(value: 'tiko' | 'shani') =>
                      handleFormChange('collection_responsibility', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tiko">תיקו</SelectItem>
                      <SelectItem value="shani">שני</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status" className="text-right block mb-2">
                    סטטוס
                  </Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: 'active' | 'inactive' | 'pending') =>
                      handleFormChange('status', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">פעיל</SelectItem>
                      <SelectItem value="inactive">לא פעיל</SelectItem>
                      <SelectItem value="pending">ממתין</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="pays_fees"
                      checked={formData.pays_fees}
                      onCheckedChange={(checked) =>
                        handleFormChange('pays_fees', checked as boolean)
                      }
                    />
                    <Label htmlFor="pays_fees" className="cursor-pointer">
                      משלם
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500 rtl:text-right mt-1">
                    אם לא מסומן, הלקוח לא יקבל מכתבי שכר טרחה אוטומטית
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="is_retainer"
                      checked={formData.is_retainer || false}
                      onCheckedChange={(checked) =>
                        handleFormChange('is_retainer', checked as boolean)
                      }
                    />
                    <Label htmlFor="is_retainer" className="cursor-pointer">
                      לקוח ריטיינר
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500 rtl:text-right mt-1">
                    לקוחות ריטיינר מקבלים מכתבים מסוג E1/E2
                  </p>
                </div>
              </div>

              {/* Row 8: Accountant Contact with Autocomplete (Add mode only) */}
              {mode === 'add' && (
                <>
                  {/* Category Header: Accountant Manager */}
                  <div className="col-span-3 mt-4 mb-2">
                    <h3 className="text-lg font-semibold text-blue-700 border-b-2 border-blue-200 pb-2 rtl:text-right">
                      מנהלת חשבונות
                    </h3>
                  </div>

                  <div className="col-span-3">
                    <ContactAutocompleteInput
                      label=""
                    nameValue={formData.accountant_name}
                    emailValue={formData.accountant_email}
                    phoneValue={formData.accountant_phone}
                    phoneSecondaryValue={formData.accountant_phone_secondary}
                    onNameChange={(value) => handleFormChange('accountant_name', value)}
                    onEmailChange={(value) => handleFormChange('accountant_email', value)}
                    onPhoneChange={(value) => {
                      const formatted = formatIsraeliPhone(value);
                      handleFormChange('accountant_phone', formatted);
                    }}
                    onPhoneSecondaryChange={(value) => {
                      const formatted = formatIsraeliLandline(value);
                      handleFormChange('accountant_phone_secondary', formatted);
                    }}
                    contactType="accountant_manager"
                    required={false}
                    namePlaceholder="שם מנהלת חשבונות (אופציונלי)"
                    emailPlaceholder="דוא״ל"
                    phonePlaceholder=""
                    phoneSecondaryPlaceholder=""
                  />
                  </div>
                </>
              )}

              {/* Row 9: Notes (full width) */}
              <div className="col-span-3">
                <Label htmlFor="notes" className="text-right block mb-2">
                  הערות
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  rows={3}
                  dir="rtl"
                />
              </div>

              {/* Row 10: Google Drive Link */}
              <div className="col-span-3">
                <Label htmlFor="google_drive_link" className="text-right block mb-2">
                  לינק ל-Google Drive
                </Label>
                <Input
                  id="google_drive_link"
                  type="url"
                  value={formData.google_drive_link || ''}
                  onChange={(e) => handleFormChange('google_drive_link', e.target.value)}
                  dir="ltr"
                />
              </div>

              {/* Company Stamp - Edit mode only */}
              {mode === 'edit' && client && (
                <div className="col-span-3">
                  <SignatureUpload
                    currentSignaturePath={signaturePath}
                    onUpload={handleSignatureUpload}
                    onDelete={handleSignatureDelete}
                    label="חותמת החברה"
                  />
                </div>
              )}

              {/* File uploads are now managed through the centralized File Manager (/files)
                  This keeps all client documents organized in one place with 7 categories:
                  - רשם החברות (company_registry)
                  - דוח כספי מבוקר (financial_report)
                  - כרטיס הנהח"ש (bookkeeping_card)
                  - הצעת מחיר / תעודת חיוב (quote_invoice)
                  - אסמכתאות תשלום 2026 (payment_proof_2026)
                  - מצגת החזקות (holdings_presentation)
                  - כללי (general)
              */}

              {/* Contact Management (Edit Mode Only) */}
              {mode === 'edit' && client && onAddContact && onUpdateContact && onDeleteContact && onSetPrimaryContact && (
                <>
                  <div className="col-span-3 mt-4 mb-2">
                    <h3 className="text-lg font-semibold text-blue-700 border-b-2 border-blue-200 pb-2 rtl:text-right">
                      אנשי קשר נוספים
                    </h3>
                  </div>
                  <div className="col-span-3">
                    <ContactsManager
                    contacts={contacts}
                    onAdd={(contactData) => onAddContact(client.id, contactData)}
                    onUpdate={(contactId, data) => onUpdateContact?.(client.id, contactId, data) ?? Promise.resolve(false)}
                    onDelete={(contactId) => onDeleteContact?.(client.id, contactId) ?? Promise.resolve(false)}
                    onSetPrimary={(contactId) => onSetPrimaryContact?.(client.id, contactId) ?? Promise.resolve(false)}
                  />
                  </div>
                </>
              )}

              {/* Phone Management */}
              {mode === 'edit' && client && onAddPhone && onUpdatePhone && onDeletePhone && onSetPrimaryPhone ? (
                <>
                  <div className="col-span-3 mt-4 mb-2">
                    <h3 className="text-lg font-semibold text-blue-700 border-b-2 border-blue-200 pb-2 rtl:text-right">
                      מספרי טלפון
                    </h3>
                  </div>
                  <div className="col-span-3">
                    <PhoneNumbersManager
                    phones={phones}
                    onAdd={(phoneData) => onAddPhone(client.id, phoneData)}
                    onUpdate={onUpdatePhone}
                    onDelete={onDeletePhone}
                    onSetPrimary={onSetPrimaryPhone}
                  />
                  </div>
                </>
              ) : mode === 'add' ? (
                <div className="col-span-3 mt-6">
                  <p className="text-sm text-gray-500 rtl:text-right">
                    הוספת מספרי טלפון תתאפשר לאחר יצירת הלקוח
                  </p>
                </div>
              ) : null}

              {/* Company Registry Files (Edit Mode Only) */}
              {mode === 'edit' && client && (
                <>
                  <div className="col-span-3 mt-4 mb-2">
                    <h3 className="text-lg font-semibold text-blue-700 border-b-2 border-blue-200 pb-2 rtl:text-right">
                      מסמכי רשם החברות
                    </h3>
                  </div>
                  <div className="col-span-3">
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <FileDisplayWidget
                        clientId={client.id}
                        category="company_registry"
                        variant="compact"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                ביטול
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'שומר...' : mode === 'add' ? 'הוסף לקוח' : 'עדכן לקוח'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Unsaved Changes Confirmation Dialog */}
        <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>יש שינויים שלא נשמרו</AlertDialogTitle>
              <AlertDialogDescription>
                האם אתה בטוח שברצונך לצאת? כל השינויים שביצעת יאבדו.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowExitConfirm(false)}>
                המשך עריכה
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleExitConfirm}>
                צא ללא שמירה
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }
);

ClientFormDialog.displayName = 'ClientFormDialog';
