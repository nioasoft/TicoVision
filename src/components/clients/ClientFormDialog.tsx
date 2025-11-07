import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FileUploadSection } from '@/components/files';
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
import { ContactsManager } from '@/components/ContactsManager';
import { PhoneNumbersManager } from '@/components/PhoneNumbersManager';
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
import { clientService } from '@/services';
import { PAYMENT_ROLE_LABELS, PAYMENT_ROLE_DESCRIPTIONS } from '@/lib/labels';
import {
  validateIsraeliPostalCode,
  formatIsraeliPhone,
} from '@/lib/validators';

interface ClientFormDialogProps {
  open: boolean;
  mode: 'add' | 'edit';
  client: Client | null;
  contacts: ClientContact[];
  phones: ClientPhone[];
  onClose: () => void;
  onSubmit: (data: CreateClientDto) => Promise<boolean>;
  onLoadContacts?: (clientId: string) => Promise<void>;
  onAddContact?: (clientId: string, contactData: CreateClientContactDto) => Promise<boolean>;
  onUpdateContact?: (contactId: string, contactData: Partial<CreateClientContactDto>) => Promise<boolean>;
  onDeleteContact?: (contactId: string) => Promise<boolean>;
  onSetPrimaryContact?: (contactId: string) => Promise<boolean>;
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
  // Accountant fields (required)
  accountant_name: '',
  accountant_email: '',
  accountant_phone: '',
  address: {
    street: '',
    city: '',
    postal_code: '',
  },
  status: 'active',
  internal_external: 'internal',
  collection_responsibility: 'tiko',
  notes: '',
  client_type: 'company',
  company_status: 'active',
  company_subtype: undefined,
  pays_fees: true, // NEW DEFAULT: true instead of false
  is_retainer: false, // NEW: לקוח ריטיינר - default false
  group_id: undefined,
  payment_role: 'independent', // NEW: תפקיד תשלום - default independent
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

    // Load client data when editing
    useEffect(() => {
      if (mode === 'edit' && client) {
        setFormData({
          company_name: client.company_name,
          commercial_name: client.commercial_name || '', // NEW
          tax_id: client.tax_id,
          contact_name: client.contact_name,
          contact_email: client.contact_email || '',
          contact_phone: client.contact_phone || '',
          // Accountant fields - will be populated from contacts if available
          accountant_name: '',
          accountant_email: '',
          accountant_phone: '',
          address: client.address || { street: '', city: '', postal_code: '' },
          status: client.status,
          internal_external: client.internal_external || 'internal',
          collection_responsibility: client.collection_responsibility || 'tiko',
          notes: client.notes || '',
          client_type: client.client_type || 'company',
          company_status: client.company_status || 'active',
          company_subtype: client.company_subtype || undefined,
          pays_fees: client.pays_fees || false,
          is_retainer: client.is_retainer || false, // NEW: טעינת סטטוס ריטיינר
          group_id: client.group_id || undefined, // NEW: טעינת קבוצה
          payment_role: client.payment_role || 'independent', // NEW: טעינת תפקיד תשלום
        });
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
      if (!formData.commercial_name?.trim()) errors.push('שם מסחרי');
      if (!formData.contact_name?.trim()) errors.push('שם איש קשר');
      if (!formData.contact_email?.trim()) errors.push('אימייל איש קשר');
      if (!formData.contact_phone?.trim()) errors.push('טלפון איש קשר');
      if (!formData.address?.street?.trim()) errors.push('כתובת');
      if (!formData.address?.city?.trim()) errors.push('עיר');
      if (!formData.address?.postal_code?.trim()) errors.push('מיקוד');

      // Accountant validation - ONLY in add mode
      if (mode === 'add') {
        if (!formData.accountant_name?.trim()) errors.push('שם מנהלת חשבונות');
        if (!formData.accountant_email?.trim()) errors.push('אימייל מנהלת חשבונות');
        if (!formData.accountant_phone?.trim()) errors.push('טלפון מנהלת חשבונות');
      }

      // Format validation
      if (formData.tax_id && !/^\d{9}$/.test(formData.tax_id)) {
        errors.push('מספר מזהה חייב להכיל 9 ספרות בדיוק');
      }

      if (formData.address?.postal_code && !validateIsraeliPostalCode(formData.address.postal_code)) {
        errors.push('מיקוד חייב להכיל 7 ספרות בדיוק');
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (formData.contact_email && !emailRegex.test(formData.contact_email)) {
        errors.push('אימייל איש קשר לא תקין');
      }
      if (mode === 'add' && formData.accountant_email && !emailRegex.test(formData.accountant_email)) {
        errors.push('אימייל מנהלת חשבונות לא תקין');
      }

      return { valid: errors.length === 0, errors };
    }, [formData, mode]);

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
        const success = await onSubmit(formData);
        if (success) {
          setFormData(INITIAL_FORM_DATA);
          setHasUnsavedChanges(false);
        }
      } finally {
        setIsSubmitting(false);
      }
    }, [formData, onSubmit, validateForm]);

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
      onClose();
    }, [onClose]);

    return (
      <>
        <Dialog open={open} onOpenChange={handleClose}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>
                {mode === 'add' ? 'הוספת לקוח חדש' : 'עריכת פרטי לקוח'}
              </DialogTitle>
              <DialogDescription>
                {mode === 'add' ? 'הזן את פרטי הלקוח החדש' : 'עדכן את פרטי הלקוח'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-4 py-4">
              {/* Row 1: Tax ID, Company Name, Commercial Name (3 cols) */}
              <div>
                <Label htmlFor="tax_id" className="text-right block mb-2">
                  מספר מזהה (9 ספרות) *
                </Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => handleFormChange('tax_id', e.target.value)}
                  onKeyDown={handleKeyDown}
                  maxLength={9}
                  pattern="\d{9}"
                  required
                  dir="ltr"
                />
              </div>

              <div>
                <Label htmlFor="company_name" className="text-right block mb-2">
                  שם החברה פורמלי *
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
                  שם מסחרי <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="commercial_name"
                  value={formData.commercial_name || ''}
                  onChange={(e) => handleFormChange('commercial_name', e.target.value)}
                  onKeyDown={handleKeyDown}
                  required
                  dir="rtl"
                />
              </div>

              {/* Row 2: Contact Name, Phone, Email (3 cols) */}
              <div>
                <Label htmlFor="contact_name" className="text-right block mb-2">
                  שם איש קשר מהותי *
                </Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => handleFormChange('contact_name', e.target.value)}
                  onKeyDown={handleKeyDown}
                  required
                  dir="rtl"
                />
              </div>

              <div>
                <Label htmlFor="contact_phone" className="text-right block mb-2">
                  טלפון <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => {
                    const formatted = formatIsraeliPhone(e.target.value);
                    handleFormChange('contact_phone', formatted);
                  }}
                  onKeyDown={handleKeyDown}
                  type="tel"
                  required
                  dir="ltr"
                  placeholder="050-1234567"
                />
              </div>

              <div>
                <Label htmlFor="contact_email" className="text-right block mb-2">
                  אימייל *
                </Label>
                <Input
                  id="contact_email"
                  value={formData.contact_email}
                  onChange={(e) => handleFormChange('contact_email', e.target.value)}
                  onKeyDown={handleKeyDown}
                  type="email"
                  required
                  dir="ltr"
                />
              </div>

              {/* Row 3: Address, City, Postal Code (3 cols) */}
              <div>
                <Label htmlFor="address_street" className="text-right block mb-2">
                  כתובת <span className="text-red-500">*</span>
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
                  required
                  dir="rtl"
                />
              </div>

              <div>
                <Label htmlFor="address_city" className="text-right block mb-2">
                  עיר <span className="text-red-500">*</span>
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
                  required
                  dir="rtl"
                />
              </div>

              <div>
                <Label htmlFor="address_postal_code" className="text-right block mb-2">
                  מיקוד (7 ספרות) <span className="text-red-500">*</span>
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
                  placeholder="1234567"
                />
                {formData.address?.postal_code &&
                 !validateIsraeliPostalCode(formData.address.postal_code) && (
                  <p className="text-xs text-red-500 mt-1 rtl:text-right">
                    מיקוד ישראלי חייב להכיל 7 ספרות בדיוק
                  </p>
                )}
              </div>

              {/* Row 4: Group, Payment Role (if selected), Accounting Management (3 cols) */}
              <div>
                <Label htmlFor="group_id" className="text-right block mb-2">
                  קבוצה <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.group_id || 'NO_GROUP'}
                  onValueChange={(value) => {
                    handleFormChange('group_id', value === 'NO_GROUP' ? undefined : value);
                    if (value && value !== 'NO_GROUP' && !formData.payment_role) {
                      handleFormChange('payment_role', 'member');
                    }
                    if (!value || value === 'NO_GROUP') {
                      handleFormChange('payment_role', 'independent');
                    }
                  }}
                  required
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

              {/* Row 8: Accountant Details - ONLY IN ADD MODE */}
              {mode === 'add' && (
                <div className="col-span-3 border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold mb-4 text-right">מנהלת חשבונות (חובה)</h3>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="accountant_name" className="text-right block mb-2">
                        שם מלא *
                      </Label>
                      <Input
                        id="accountant_name"
                        value={formData.accountant_name}
                        onChange={(e) => handleFormChange('accountant_name', e.target.value)}
                        onKeyDown={handleKeyDown}
                        required
                        dir="rtl"
                        placeholder="שם מלא"
                      />
                    </div>

                    <div>
                      <Label htmlFor="accountant_email" className="text-right block mb-2">
                        אימייל *
                      </Label>
                      <Input
                        id="accountant_email"
                        value={formData.accountant_email}
                        onChange={(e) => handleFormChange('accountant_email', e.target.value)}
                        onKeyDown={handleKeyDown}
                        type="email"
                        required
                        dir="ltr"
                        placeholder="accountant@example.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="accountant_phone" className="text-right block mb-2">
                        טלפון *
                      </Label>
                      <Input
                        id="accountant_phone"
                        value={formData.accountant_phone}
                        onChange={(e) => {
                          const formatted = formatIsraeliPhone(e.target.value);
                          handleFormChange('accountant_phone', formatted);
                        }}
                        onKeyDown={handleKeyDown}
                        type="tel"
                        required
                        dir="ltr"
                        placeholder="050-1234567"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Explanation in edit mode - where to edit accountant */}
              {mode === 'edit' && (
                <div className="col-span-3 border-t pt-4 mt-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 rtl:text-right">
                      💡 <strong>עריכת פרטי מנהלת חשבונות:</strong> לעריכת פרטי מנהלת החשבונות,
                      גלול למטה לסקשן "אנשי קשר". מנהלת החשבונות מופיעה שם עם תג "מנהלת חשבונות".
                    </p>
                  </div>
                </div>
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

              {/* Row 10: File Attachments (full width) */}
              <div className="col-span-3 border-t pt-4 mt-4">
                <Label className="text-base font-semibold mb-3 block rtl:text-right">
                  קבצים מצורפים
                </Label>
                <FileUploadSection
                  clientId={mode === 'edit' ? client?.id : undefined}
                  uploadContext="client_form"
                />
              </div>

              {/* Contact Management (Edit Mode Only) */}
              {mode === 'edit' && client && onAddContact && onUpdateContact && onDeleteContact && onSetPrimaryContact && (
                <div className="col-span-3 border-t pt-4 mt-4">
                  <ContactsManager
                    contacts={contacts}
                    onAdd={(contactData) => onAddContact(client.id, contactData)}
                    onUpdate={onUpdateContact}
                    onDelete={onDeleteContact}
                    onSetPrimary={onSetPrimaryContact}
                  />
                </div>
              )}

              {/* Phone Management */}
              {mode === 'edit' && client && onAddPhone && onUpdatePhone && onDeletePhone && onSetPrimaryPhone ? (
                <div className="col-span-3 border-t pt-4 mt-4">
                  <PhoneNumbersManager
                    phones={phones}
                    onAdd={(phoneData) => onAddPhone(client.id, phoneData)}
                    onUpdate={onUpdatePhone}
                    onDelete={onDeletePhone}
                    onSetPrimary={onSetPrimaryPhone}
                  />
                </div>
              ) : mode === 'add' ? (
                <div className="col-span-3 border-t pt-4 mt-4">
                  <p className="text-sm text-gray-500 rtl:text-right">
                    הוספת מספרי טלפון תתאפשר לאחר יצירת הלקוח
                  </p>
                </div>
              ) : null}
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
