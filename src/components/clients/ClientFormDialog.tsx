import React, { useState, useEffect, useCallback } from 'react';
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
} from '@/services';

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
          address: client.address || { street: '', city: '', postal_code: '' },
          status: client.status,
          internal_external: client.internal_external || 'internal',
          collection_responsibility: client.collection_responsibility || 'tiko',
          notes: client.notes || '',
          client_type: client.client_type || 'company',
          company_status: client.company_status || 'active',
          company_subtype: client.company_subtype || undefined,
          pays_fees: client.pays_fees || false,
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

    const handleClose = useCallback(() => {
      if (hasUnsavedChanges) {
        setShowExitConfirm(true);
      } else {
        onClose();
      }
    }, [hasUnsavedChanges, onClose]);

    const handleSubmit = useCallback(async () => {
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
    }, [formData, onSubmit]);

    const handleFormChange = useCallback(<K extends keyof CreateClientDto>(
      field: K,
      value: CreateClientDto[K]
    ) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setHasUnsavedChanges(true);
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>
                {mode === 'add' ? 'הוספת לקוח חדש' : 'עריכת פרטי לקוח'}
              </DialogTitle>
              <DialogDescription>
                {mode === 'add' ? 'הזן את פרטי הלקוח החדש' : 'עדכן את פרטי הלקוח'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Company Name */}
              <div>
                <Label htmlFor="company_name" className="text-right block">
                  שם החברה פורמלי *
                </Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => handleFormChange('company_name', e.target.value)}
                  required
                  dir="rtl"
                />
              </div>

              {/* Commercial Name (NEW) */}
              <div>
                <Label htmlFor="commercial_name" className="text-right block">
                  שם מסחרי
                </Label>
                <Input
                  id="commercial_name"
                  value={formData.commercial_name || ''}
                  onChange={(e) => handleFormChange('commercial_name', e.target.value)}
                  dir="rtl"
                />
              </div>

              {/* Tax ID & Contact Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tax_id" className="text-right block">
                    מספר מזהה (9 ספרות) *
                  </Label>
                  <Input
                    id="tax_id"
                    value={formData.tax_id}
                    onChange={(e) => handleFormChange('tax_id', e.target.value)}
                    maxLength={9}
                    pattern="\d{9}"
                    required
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label htmlFor="contact_name" className="text-right block">
                    שם איש קשר *
                  </Label>
                  <Input
                    id="contact_name"
                    value={formData.contact_name}
                    onChange={(e) => handleFormChange('contact_name', e.target.value)}
                    required
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contact_phone" className="text-right block">
                    טלפון
                  </Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => handleFormChange('contact_phone', e.target.value)}
                    type="tel"
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label htmlFor="contact_email" className="text-right block">
                    אימייל *
                  </Label>
                  <Input
                    id="contact_email"
                    value={formData.contact_email}
                    onChange={(e) => handleFormChange('contact_email', e.target.value)}
                    type="email"
                    required
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Address & City */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="address_street" className="text-right block">
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
                    dir="rtl"
                  />
                </div>
                <div>
                  <Label htmlFor="address_city" className="text-right block">
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
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Client Type & Company Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client_type" className="text-right block">
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
                {formData.client_type === 'company' && (
                  <div>
                    <Label htmlFor="company_status" className="text-right block">
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
                )}
              </div>

              {/* Company Subtype (only for active companies) */}
              {formData.client_type === 'company' && formData.company_status === 'active' && (
                <div>
                  <Label htmlFor="company_subtype" className="text-right block">
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
              )}

              {/* Internal/External & Collection Responsibility */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="internal_external" className="text-right block">
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
                <div>
                  <Label htmlFor="collection_responsibility" className="text-right block">
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
              </div>

              {/* Checkboxes */}
              <div className="mt-6">
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
                      משלם ישירות
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500 rtl:text-right mt-1 rtl:mr-6">
                    אם לא מסומן, הלקוח לא יקבל מכתבי שכר טרחה אוטומטית
                  </p>
                </div>
              </div>

              {/* Status */}
              <div>
                <Label htmlFor="status" className="text-right block">
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

              {/* Notes */}
              <div>
                <Label htmlFor="notes" className="text-right block">
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

              {/* Contact Management (Edit Mode Only) */}
              {mode === 'edit' && client && onAddContact && onUpdateContact && onDeleteContact && onSetPrimaryContact && (
                <div className="border-t pt-4 mt-4">
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
                <div className="border-t pt-4 mt-4">
                  <PhoneNumbersManager
                    phones={phones}
                    onAdd={(phoneData) => onAddPhone(client.id, phoneData)}
                    onUpdate={onUpdatePhone}
                    onDelete={onDeletePhone}
                    onSetPrimary={onSetPrimaryPhone}
                  />
                </div>
              ) : mode === 'add' ? (
                <div className="border-t pt-4 mt-4">
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
