import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import type { PendingRegistration } from '@/services/registration.service';
import type { UserRole } from '@/types/user-role';
import { formatDate } from '@/lib/utils';

// Approve Registration Dialog Props
interface ApproveRegistrationDialogProps {
  open: boolean;
  registration: PendingRegistration | null;
  onClose: () => void;
  onSubmit: (role: UserRole) => Promise<boolean>;
}

// Reject Registration Dialog Props
interface RejectRegistrationDialogProps {
  open: boolean;
  registration: PendingRegistration | null;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<boolean>;
}

// View Details Dialog Props
interface RegistrationDetailsDialogProps {
  open: boolean;
  registration: PendingRegistration | null;
  onClose: () => void;
}

// Delete Registration Dialog Props
interface DeleteRegistrationDialogProps {
  open: boolean;
  registration: PendingRegistration | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

// Approve Registration Dialog
export const ApproveRegistrationDialog = React.memo<ApproveRegistrationDialogProps>(
  ({ open, registration, onClose, onSubmit }) => {
    const [selectedRole, setSelectedRole] = useState<UserRole>('client');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = useCallback(async () => {
      if (!registration) return;
      setIsSubmitting(true);
      try {
        await onSubmit(selectedRole);
      } finally {
        setIsSubmitting(false);
      }
    }, [registration, selectedRole, onSubmit]);

    const getRoleLabel = (role: string) => {
      const labels: Record<string, string> = {
        admin: 'מנהל מערכת',
        accountant: 'רואה חשבון',
        bookkeeper: 'מנהלת חשבונות',
        client: 'לקוח',
      };
      return labels[role] || role;
    };

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">אישור בקשת הרשמה</DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              בחר תפקיד עבור המשתמש החדש
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <div className="rtl:text-right ltr:text-left">
                <strong>שם מלא:</strong> {registration?.full_name}
              </div>
              <div className="rtl:text-right ltr:text-left">
                <strong>אימייל:</strong> {registration?.email}
              </div>
              <div className="rtl:text-right ltr:text-left">
                <strong>תפקיד מבוקש:</strong>{' '}
                {registration ? getRoleLabel(registration.requested_role) : ''}
              </div>
            </div>

            <div>
              <Label htmlFor="role" className="text-right block rtl:text-right ltr:text-left">
                תפקיד לאישור *
              </Label>
              <Select
                value={selectedRole}
                onValueChange={(value: UserRole) => setSelectedRole(value)}
              >
                <SelectTrigger dir="rtl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="admin">מנהל מערכת</SelectItem>
                  <SelectItem value="accountant">רואה חשבון</SelectItem>
                  <SelectItem value="bookkeeper">מנהלת חשבונות</SelectItem>
                  <SelectItem value="client">לקוח</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="rtl:space-x-reverse ltr:space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              ביטול
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? 'מאשר...' : 'אשר הרשמה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

ApproveRegistrationDialog.displayName = 'ApproveRegistrationDialog';

// Reject Registration Dialog
export const RejectRegistrationDialog = React.memo<RejectRegistrationDialogProps>(
  ({ open, registration, onClose, onSubmit }) => {
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleConfirm = useCallback(async () => {
      if (!registration || !reason.trim()) return;
      setIsSubmitting(true);
      try {
        const success = await onSubmit(reason);
        if (success) {
          setReason('');
        }
      } finally {
        setIsSubmitting(false);
      }
    }, [registration, reason, onSubmit]);

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">דחיית בקשת הרשמה</DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              הזן סיבה לדחיית הבקשה של {registration?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="reason" className="text-right block rtl:text-right ltr:text-left">
                סיבת דחייה *
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                dir="rtl"
                placeholder="למשל: המידע שסופק אינו מלא, לא עומד בקריטריונים..."
              />
            </div>
          </div>

          <DialogFooter className="rtl:space-x-reverse ltr:space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              ביטול
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting || !reason.trim()}
              variant="destructive"
            >
              {isSubmitting ? 'דוחה...' : 'דחה בקשה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

RejectRegistrationDialog.displayName = 'RejectRegistrationDialog';

// View Registration Details Dialog
export const RegistrationDetailsDialog = React.memo<RegistrationDetailsDialogProps>(
  ({ open, registration, onClose }) => {
    const getRoleLabel = (role: string) => {
      const labels: Record<string, string> = {
        admin: 'מנהל מערכת',
        accountant: 'רואה חשבון',
        bookkeeper: 'מנהלת חשבונות',
        client: 'לקוח',
      };
      return labels[role] || role;
    };

    const getStatusLabel = (status: string) => {
      const labels: Record<string, string> = {
        pending: 'ממתינה',
        approved: 'אושרה',
        rejected: 'נדחתה',
      };
      return labels[status] || status;
    };

    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">פרטי בקשת הרשמה</DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              מידע מלא על הבקשה
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-right block font-bold rtl:text-right ltr:text-left">שם מלא</Label>
                <p className="rtl:text-right ltr:text-left">{registration?.full_name}</p>
              </div>
              <div>
                <Label className="text-right block font-bold rtl:text-right ltr:text-left">אימייל</Label>
                <p className="rtl:text-right ltr:text-left">{registration?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-right block font-bold rtl:text-right ltr:text-left">טלפון</Label>
                <p className="rtl:text-right ltr:text-left">{registration?.phone || 'לא צוין'}</p>
              </div>
              <div>
                <Label className="text-right block font-bold rtl:text-right ltr:text-left">שם חברה</Label>
                <p className="rtl:text-right ltr:text-left">{registration?.company_name || 'לא צוין'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-right block font-bold rtl:text-right ltr:text-left">תפקיד מבוקש</Label>
                <p className="rtl:text-right ltr:text-left">
                  {registration ? getRoleLabel(registration.requested_role) : ''}
                </p>
              </div>
              <div>
                <Label className="text-right block font-bold rtl:text-right ltr:text-left">ת.ז / ח.פ</Label>
                <p className="rtl:text-right ltr:text-left">{registration?.tax_id || 'לא צוין'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-right block font-bold rtl:text-right ltr:text-left">סטטוס</Label>
                <p className="rtl:text-right ltr:text-left">
                  {registration ? getStatusLabel(registration.status) : ''}
                </p>
              </div>
              <div>
                <Label className="text-right block font-bold rtl:text-right ltr:text-left">תאריך בקשה</Label>
                <p className="rtl:text-right ltr:text-left">
                  {registration ? formatDate(registration.created_at) : ''}
                </p>
              </div>
            </div>

            {registration?.message && (
              <div>
                <Label className="text-right block font-bold rtl:text-right ltr:text-left">הודעה</Label>
                <p className="p-3 bg-gray-50 rounded-md whitespace-pre-wrap rtl:text-right ltr:text-left">
                  {registration.message}
                </p>
              </div>
            )}

            {registration?.status === 'rejected' && registration.rejection_reason && (
              <div>
                <Label className="text-right block font-bold text-red-600 rtl:text-right ltr:text-left">
                  סיבת דחייה
                </Label>
                <p className="p-3 bg-red-50 text-red-800 rounded-md whitespace-pre-wrap rtl:text-right ltr:text-left">
                  {registration.rejection_reason}
                </p>
              </div>
            )}

            {registration?.status === 'approved' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-right block font-bold rtl:text-right ltr:text-left">אושר על ידי</Label>
                  <p className="rtl:text-right ltr:text-left">{registration.approved_by || 'לא ידוע'}</p>
                </div>
                <div>
                  <Label className="text-right block font-bold rtl:text-right ltr:text-left">תאריך אישור</Label>
                  <p className="rtl:text-right ltr:text-left">
                    {registration.approved_at ? formatDate(registration.approved_at) : 'לא ידוע'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="rtl:space-x-reverse ltr:space-x-2">
            <Button onClick={onClose}>סגור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

RegistrationDetailsDialog.displayName = 'RegistrationDetailsDialog';

// Delete Registration Dialog
export const DeleteRegistrationDialog = React.memo<DeleteRegistrationDialogProps>(
  ({ open, registration, onClose, onConfirm }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirm = useCallback(async () => {
      if (!registration) return;
      setIsDeleting(true);
      try {
        await onConfirm();
      } finally {
        setIsDeleting(false);
      }
    }, [registration, onConfirm]);

    return (
      <AlertDialog open={open} onOpenChange={onClose}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="rtl:text-right ltr:text-left">האם למחוק בקשה זו?</AlertDialogTitle>
            <AlertDialogDescription className="rtl:text-right ltr:text-left">
              האם אתה בטוח שברצונך למחוק את בקשת ההרשמה של{' '}
              <strong>{registration?.full_name}</strong>?
              <br />
              פעולה זו תאפשר למשתמש להירשם מחדש.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="rtl:space-x-reverse ltr:space-x-2">
            <AlertDialogCancel onClick={onClose} disabled={isDeleting}>
              ביטול
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'מוחק...' : 'מחק בקשה'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

DeleteRegistrationDialog.displayName = 'DeleteRegistrationDialog';
