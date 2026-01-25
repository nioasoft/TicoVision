import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { AlertCircle } from 'lucide-react';
import { ClientSelector } from '@/components/ClientSelector';
import { ContactAutocompleteInput } from '@/components/ContactAutocompleteInput';
import type { Client, CreateClientDto } from '@/services';
import { clientService } from '@/services';
import {
  validateIsraeliPostalCode,
  formatIsraeliTaxId,
  stripTaxIdFormatting,
} from '@/lib/validators';

interface FreelancerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  freelancer?: Client | null;
  onSubmit: (data: CreateClientDto) => Promise<{ success: boolean; freelancerId?: string }>;
  onClose: () => void;
}

interface FreelancerFormData {
  full_name: string; // This will be saved as company_name
  tax_id: string;
  phone: string;
  email: string;
  address: {
    street: string;
    city: string;
    postal_code: string;
  };
  is_passive_income: boolean;
  linked_company_id: string | null;
}

const INITIAL_FORM_DATA: FreelancerFormData = {
  full_name: '',
  tax_id: '',
  phone: '',
  email: '',
  address: {
    street: '',
    city: '',
    postal_code: '',
  },
  is_passive_income: false,
  linked_company_id: null,
};

export function FreelancerFormDialog({
  open,
  onOpenChange,
  freelancer,
  onSubmit,
  onClose,
}: FreelancerFormDialogProps) {
  const mode = freelancer ? 'edit' : 'add';
  const [formData, setFormData] = useState<FreelancerFormData>(INITIAL_FORM_DATA);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taxIdExists, setTaxIdExists] = useState(false);
  const [isCheckingTaxId, setIsCheckingTaxId] = useState(false);
  const taxIdCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load freelancer data when editing
  useEffect(() => {
    if (mode === 'edit' && freelancer) {
      setFormData({
        full_name: freelancer.company_name,
        tax_id: formatIsraeliTaxId(freelancer.tax_id),
        phone: freelancer.phone || freelancer.contact_phone || '',
        email: freelancer.email || freelancer.contact_email || '',
        address: freelancer.address || { street: '', city: '', postal_code: '' },
        is_passive_income: (freelancer as Client & { is_passive_income?: boolean }).is_passive_income || false,
        linked_company_id: (freelancer as Client & { linked_company_id?: string }).linked_company_id || null,
      });
      setHasUnsavedChanges(false);
    } else {
      setFormData(INITIAL_FORM_DATA);
      setHasUnsavedChanges(false);
    }
    setTaxIdExists(false);
  }, [mode, freelancer, open]);

  // Check for duplicate tax ID
  const checkTaxIdExists = useCallback(async (taxId: string) => {
    const strippedTaxId = stripTaxIdFormatting(taxId);
    if (strippedTaxId.length !== 9) {
      setTaxIdExists(false);
      return;
    }

    // Don't check if editing and tax ID hasn't changed
    if (mode === 'edit' && freelancer && strippedTaxId === freelancer.tax_id) {
      setTaxIdExists(false);
      return;
    }

    setIsCheckingTaxId(true);
    try {
      const response = await clientService.checkTaxIdExists(strippedTaxId);
      setTaxIdExists(response.data?.exists || false);
    } catch (error) {
      setTaxIdExists(false);
    } finally {
      setIsCheckingTaxId(false);
    }
  }, [mode, freelancer]);

  // Handle form field changes
  const handleFormChange = useCallback(
    (field: keyof FreelancerFormData, value: string | boolean | null) => {
      setFormData((prev) => {
        const newData = { ...prev };

        if (field === 'address') {
          return prev; // Address is handled separately
        }

        (newData as Record<string, unknown>)[field] = value;
        return newData;
      });
      setHasUnsavedChanges(true);

      // Check tax ID for duplicates
      if (field === 'tax_id' && typeof value === 'string') {
        if (taxIdCheckTimeoutRef.current) {
          clearTimeout(taxIdCheckTimeoutRef.current);
        }
        taxIdCheckTimeoutRef.current = setTimeout(() => {
          checkTaxIdExists(value);
        }, 500);
      }
    },
    [checkTaxIdExists]
  );

  const handleAddressChange = useCallback(
    (field: 'street' | 'city' | 'postal_code', value: string) => {
      setFormData((prev) => ({
        ...prev,
        address: { ...prev.address, [field]: value },
      }));
      setHasUnsavedChanges(true);
    },
    []
  );

  // Validate form
  const validateForm = useCallback((): string | null => {
    if (!formData.full_name.trim()) {
      return 'נא להזין שם מלא';
    }

    const strippedTaxId = stripTaxIdFormatting(formData.tax_id);
    if (!strippedTaxId || strippedTaxId.length !== 9) {
      return 'נא להזין תעודת זהות תקינה (9 ספרות)';
    }

    if (taxIdExists) {
      return 'תעודת זהות זו כבר קיימת במערכת';
    }

    if (!formData.phone.trim()) {
      return 'נא להזין מספר טלפון';
    }

    if (!formData.email.trim()) {
      return 'נא להזין כתובת אימייל';
    }

    if (formData.address.postal_code && !validateIsraeliPostalCode(formData.address.postal_code)) {
      return 'מיקוד לא תקין';
    }

    return null;
  }, [formData, taxIdExists]);

  // Handle form submission
  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert to CreateClientDto format
      const clientData: CreateClientDto = {
        company_name: formData.full_name, // Name = company name for freelancers
        tax_id: stripTaxIdFormatting(formData.tax_id),
        contact_name: formData.full_name,
        contact_email: formData.email,
        contact_phone: formData.phone,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        client_type: 'freelancer',
        status: 'active',
        is_passive_income: formData.is_passive_income,
        linked_company_id: formData.linked_company_id,
        // Default values for required fields
        pays_fees: true,
        is_retainer: false,
        internal_external: 'internal',
        collection_responsibility: 'tiko',
      };

      const result = await onSubmit(clientData);
      if (result.success) {
        setHasUnsavedChanges(false);
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle close with unsaved changes check
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const handleConfirmClose = useCallback(() => {
    setShowExitConfirm(false);
    setHasUnsavedChanges(false);
    onClose();
  }, [onClose]);

  const validationError = validateForm();

  return (
    <>
      <Dialog open={open} onOpenChange={(newOpen) => {
        if (!newOpen) {
          handleClose();
        } else {
          onOpenChange(newOpen);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="rtl:text-right">
              {mode === 'add' ? 'הוספת עצמאי חדש' : 'עריכת עצמאי'}
            </DialogTitle>
            <DialogDescription className="rtl:text-right">
              {mode === 'add'
                ? 'הזן את פרטי העצמאי'
                : `עריכת פרטי ${freelancer?.company_name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Contact Info with Autocomplete */}
            <ContactAutocompleteInput
              label="פרטי העצמאי"
              nameValue={formData.full_name}
              emailValue={formData.email}
              phoneValue={formData.phone}
              onNameChange={(value) => handleFormChange('full_name', value)}
              onEmailChange={(value) => handleFormChange('email', value)}
              onPhoneChange={(value) => handleFormChange('phone', value)}
              namePlaceholder="שם פרטי ושם משפחה"
              emailPlaceholder="כתובת אימייל"
              phonePlaceholder="מספר טלפון"
              required
            />

            {/* Tax ID - Separate field */}
            <div className="space-y-2">
              <Label htmlFor="tax_id" className="rtl:text-right">
                תעודת זהות 
              </Label>
              <Input
                id="tax_id"
                value={formData.tax_id}
                onChange={(e) => {
                  const formatted = formatIsraeliTaxId(e.target.value);
                  handleFormChange('tax_id', formatted);
                }}

                className="rtl:text-right font-mono max-w-xs"
                dir="ltr"
              />
              {taxIdExists && (
                <p className="text-sm text-destructive">תעודת זהות זו כבר קיימת במערכת</p>
              )}
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label className="rtl:text-right">כתובת</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  value={formData.address.street}
                  onChange={(e) => handleAddressChange('street', e.target.value)}

                  className="rtl:text-right"
                />
                <Input
                  value={formData.address.city}
                  onChange={(e) => handleAddressChange('city', e.target.value)}

                  className="rtl:text-right"
                />
                <Input
                  value={formData.address.postal_code}
                  onChange={(e) => handleAddressChange('postal_code', e.target.value)}

                  className="rtl:text-right"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Passive Income Checkbox */}
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <Checkbox
                id="is_passive_income"
                checked={formData.is_passive_income}
                onCheckedChange={(checked) => handleFormChange('is_passive_income', checked === true)}
              />
              <div>
                <Label htmlFor="is_passive_income" className="rtl:text-right cursor-pointer">
                  הכנסה פסיבית בלבד
                </Label>
                <p className="text-sm text-muted-foreground rtl:text-right">
                  סמן אם העצמאי מקבל הכנסה משכר דירה בלבד ואינו עצמאי פעיל
                </p>
              </div>
            </div>

            {/* Link to Company */}
            <div className="space-y-2">
              <Label className="rtl:text-right">קישור לחברה (אופציונלי)</Label>
              <ClientSelector
                value={formData.linked_company_id}
                onChange={(company) => handleFormChange('linked_company_id', company?.id || null)}

                filterType="company"
              />
              <p className="text-sm text-muted-foreground rtl:text-right">
                אם העצמאי קשור לחברה מסוימת, ניתן לקשר אותו כאן
              </p>
            </div>

            {/* Validation Error */}
            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="flex-row-reverse gap-2">
            <Button onClick={handleClose} variant="outline">
              ביטול
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !!validationError}
            >
              {isSubmitting ? 'שומר...' : mode === 'add' ? 'הוסף עצמאי' : 'שמור שינויים'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Confirmation */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="rtl:text-right">שינויים לא נשמרו</AlertDialogTitle>
            <AlertDialogDescription className="rtl:text-right">
              יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לצאת?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>המשך עריכה</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>צא בלי לשמור</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
