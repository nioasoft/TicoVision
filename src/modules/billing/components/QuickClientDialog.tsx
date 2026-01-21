/**
 * Quick Client Dialog
 * Creates an ad-hoc client with minimal required fields:
 * - Company name (required)
 * - Tax ID (required)
 * - Email (required)
 *
 * The client is created with status: 'adhoc'
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { clientService, type Client } from '@/services/client.service';

interface QuickClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated: (client: Client) => void;
}

export function QuickClientDialog({ open, onOpenChange, onClientCreated }: QuickClientDialogProps) {
  const [companyName, setCompanyName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setCompanyName('');
    setTaxId('');
    setEmail('');
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!companyName.trim()) {
      newErrors.companyName = 'שם החברה הוא שדה חובה';
    }

    if (!taxId.trim()) {
      newErrors.taxId = 'ח.פ הוא שדה חובה';
    } else if (!/^\d{9}$/.test(taxId.trim())) {
      newErrors.taxId = 'ח.פ חייב להכיל 9 ספרות';
    }

    if (!email.trim()) {
      newErrors.email = 'אימייל הוא שדה חובה';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'כתובת אימייל לא תקינה';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if tax ID already exists
      const existingClient = await clientService.getByTaxId(taxId.trim());
      if (existingClient.data) {
        toast.error('לקוח עם ח.פ זה כבר קיים במערכת');
        setErrors({ taxId: 'לקוח עם ח.פ זה כבר קיים במערכת' });
        setIsSubmitting(false);
        return;
      }

      // Create the adhoc client with minimal data
      const { data: client, error } = await clientService.create({
        company_name: companyName.trim(),
        tax_id: taxId.trim(),
        contact_email: email.trim(),
        contact_name: companyName.trim(), // Use company name as contact name for adhoc
        status: 'adhoc',
        client_type: 'company',
        company_status: 'active',
        internal_external: 'external',
        pays_fees: true,
        receives_letters: true,
        collection_responsibility: 'tiko',
        // Minimal address for adhoc clients
        address: {
          street: '-',
          city: '-',
          postal_code: '0000000',
        },
      });

      if (error) {
        throw error;
      }

      if (client) {
        toast.success(`לקוח חד-פעמי "${companyName}" נוצר בהצלחה`);
        resetForm();
        onOpenChange(false);
        onClientCreated(client);
      }
    } catch (err) {
      console.error('Error creating adhoc client:', err);
      const errorMessage = err instanceof Error ? err.message : 'שגיאה ביצירת הלקוח';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 rtl:flex-row-reverse text-right">
            <UserPlus className="h-5 w-5" />
            לקוח חד-פעמי חדש
          </DialogTitle>
          <DialogDescription className="text-right">
            יצירת לקוח מזורז עם פרטים מינימליים. ניתן להשלים את הפרטים בהמשך.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="companyName" className="text-right block">
              שם החברה <span className="text-red-500">*</span>
            </Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="text-right"
              dir="rtl"
              disabled={isSubmitting}
            />
            {errors.companyName && (
              <p className="text-sm text-red-500 text-right">{errors.companyName}</p>
            )}
          </div>

          {/* Tax ID */}
          <div className="space-y-2">
            <Label htmlFor="taxId" className="text-right block">
              ח.פ (מספר עוסק) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="taxId"
              value={taxId}
              onChange={(e) => setTaxId(e.target.value.replace(/\D/g, '').slice(0, 9))}
              className="text-right"
              dir="ltr"
              maxLength={9}
              disabled={isSubmitting}
            />
            {errors.taxId && (
              <p className="text-sm text-red-500 text-right">{errors.taxId}</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-right block">
              אימייל <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-right"
              dir="ltr"
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-sm text-red-500 text-right">{errors.email}</p>
            )}
          </div>

          <DialogFooter className="gap-2 rtl:flex-row-reverse sm:justify-start">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              ביטול
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
              צור לקוח
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

QuickClientDialog.displayName = 'QuickClientDialog';
