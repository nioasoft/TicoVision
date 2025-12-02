import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import type { User, CreateUserData, UpdateUserData, UserPermissions } from '@/services/user.service';
import type { UserRole } from '@/types/user-role';

// Add User Dialog Props
interface AddUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserData) => Promise<boolean>;
}

// Edit User Dialog Props
interface EditUserDialogProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSubmit: (data: UpdateUserData) => Promise<boolean>;
}

// Reset Password Dialog Props
interface ResetPasswordDialogProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSubmit: (newPassword: string) => Promise<boolean>;
}

// Delete User Dialog Props
interface DeleteUserDialogProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const INITIAL_ADD_FORM: CreateUserData = {
  email: '',
  password: '',
  full_name: '',
  phone: '',
  role: 'client',
  permissions: {
    see_all_clients: false,
  },
};

const INITIAL_EDIT_FORM: UpdateUserData = {
  full_name: '',
  phone: '',
  role: 'client',
  is_active: true,
  permissions: {
    see_all_clients: false,
  },
};

// Add User Dialog
export const AddUserDialog = React.memo<AddUserDialogProps>(({ open, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<CreateUserData>(INITIAL_ADD_FORM);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setFormData(INITIAL_ADD_FORM);
      setHasUnsavedChanges(false);
    }
  }, [open]);

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
        setFormData(INITIAL_ADD_FORM);
        setHasUnsavedChanges(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit]);

  const handleFormChange = useCallback(<K extends keyof CreateUserData>(
    field: K,
    value: CreateUserData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  }, []);

  const handleExitConfirm = useCallback(() => {
    setFormData(INITIAL_ADD_FORM);
    setHasUnsavedChanges(false);
    setShowExitConfirm(false);
    onClose();
  }, [onClose]);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">הוספת משתמש חדש</DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              הזן את פרטי המשתמש החדש
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Email */}
            <div>
              <Label htmlFor="email" className="text-right block rtl:text-right ltr:text-left">
                אימייל *
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                required
                dir="ltr"
              />
            </div>

            {/* Password */}
            <div>
              <Label htmlFor="password" className="text-right block rtl:text-right ltr:text-left">
                סיסמה *
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleFormChange('password', e.target.value)}
                required
                dir="ltr"
              />
            </div>

            {/* Full Name & Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name" className="text-right block rtl:text-right ltr:text-left">
                  שם מלא *
                </Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleFormChange('full_name', e.target.value)}
                  required
                  dir="rtl"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-right block rtl:text-right ltr:text-left">
                  טלפון
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleFormChange('phone', e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <Label htmlFor="role" className="text-right block rtl:text-right ltr:text-left">
                תפקיד *
              </Label>
              <Select
                value={formData.role}
                onValueChange={(value: UserRole) => handleFormChange('role', value)}
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
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              ביטול
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'שומר...' : 'הוסף משתמש'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Confirmation */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="rtl:text-right ltr:text-left">יש שינויים שלא נשמרו</AlertDialogTitle>
            <AlertDialogDescription className="rtl:text-right ltr:text-left">
              האם אתה בטוח שברצונך לצאת? כל השינויים שביצעת יאבדו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="rtl:space-x-reverse ltr:space-x-2">
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
});

AddUserDialog.displayName = 'AddUserDialog';

// Edit User Dialog
export const EditUserDialog = React.memo<EditUserDialogProps>(({ open, user, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<UpdateUserData>(INITIAL_EDIT_FORM);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && open) {
      setFormData({
        full_name: user.full_name,
        phone: user.phone || '',
        role: user.role,
        is_active: user.is_active,
        permissions: {
          see_all_clients: user.permissions?.see_all_clients ?? false,
        },
      });
      setHasUnsavedChanges(false);
    } else if (!open) {
      setFormData(INITIAL_EDIT_FORM);
      setHasUnsavedChanges(false);
    }
  }, [user, open]);

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const handleSubmit = useCallback(async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const success = await onSubmit(formData);
      if (success) {
        setHasUnsavedChanges(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [user, formData, onSubmit]);

  const handleFormChange = useCallback(<K extends keyof UpdateUserData>(
    field: K,
    value: UpdateUserData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  }, []);

  const handleExitConfirm = useCallback(() => {
    setFormData(INITIAL_EDIT_FORM);
    setHasUnsavedChanges(false);
    setShowExitConfirm(false);
    onClose();
  }, [onClose]);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">עריכת פרטי משתמש</DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              עדכן את פרטי המשתמש
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Email (Read-only) */}
            <div>
              <Label htmlFor="email_readonly" className="text-right block rtl:text-right ltr:text-left">
                אימייל
              </Label>
              <Input
                id="email_readonly"
                value={user?.email || ''}
                disabled
                dir="ltr"
                className="bg-gray-100"
              />
            </div>

            {/* Full Name & Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="full_name_edit" className="text-right block rtl:text-right ltr:text-left">
                  שם מלא *
                </Label>
                <Input
                  id="full_name_edit"
                  value={formData.full_name}
                  onChange={(e) => handleFormChange('full_name', e.target.value)}
                  required
                  dir="rtl"
                />
              </div>
              <div>
                <Label htmlFor="phone_edit" className="text-right block rtl:text-right ltr:text-left">
                  טלפון
                </Label>
                <Input
                  id="phone_edit"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleFormChange('phone', e.target.value)}
                  dir="ltr"
                />
              </div>
            </div>

            {/* Role & Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="role_edit" className="text-right block rtl:text-right ltr:text-left">
                  תפקיד *
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value: UserRole) => handleFormChange('role', value)}
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
              <div>
                <Label htmlFor="is_active_edit" className="text-right block rtl:text-right ltr:text-left">
                  סטטוס
                </Label>
                <Select
                  value={formData.is_active ? 'active' : 'inactive'}
                  onValueChange={(value) => handleFormChange('is_active', value === 'active')}
                >
                  <SelectTrigger dir="rtl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="active">פעיל</SelectItem>
                    <SelectItem value="inactive">לא פעיל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Client Visibility Permission - Only show for non-admin roles */}
            {formData.role !== 'admin' && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-right block rtl:text-right ltr:text-left font-medium">
                      צפייה בכל הלקוחות
                    </Label>
                    <p className="text-sm text-muted-foreground rtl:text-right ltr:text-left">
                      {formData.permissions?.see_all_clients
                        ? 'המשתמש רואה את כל לקוחות המשרד'
                        : 'המשתמש רואה רק לקוחות שהוקצו לו'}
                    </p>
                  </div>
                  <Switch
                    checked={formData.permissions?.see_all_clients ?? false}
                    onCheckedChange={(checked) =>
                      handleFormChange('permissions', {
                        ...formData.permissions,
                        see_all_clients: checked,
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="rtl:space-x-reverse ltr:space-x-2">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              ביטול
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'שומר...' : 'עדכן משתמש'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Confirmation */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="rtl:text-right ltr:text-left">יש שינויים שלא נשמרו</AlertDialogTitle>
            <AlertDialogDescription className="rtl:text-right ltr:text-left">
              האם אתה בטוח שברצונך לצאת? כל השינויים שביצעת יאבדו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="rtl:space-x-reverse ltr:space-x-2">
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
});

EditUserDialog.displayName = 'EditUserDialog';

// Reset Password Dialog
export const ResetPasswordDialog = React.memo<ResetPasswordDialogProps>(({ open, user, onClose, onSubmit }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setNewPassword('');
      setConfirmPassword('');
      setError('');
    }
  }, [open]);

  const handleSubmit = useCallback(async () => {
    if (!user) return;

    if (newPassword !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }

    if (newPassword.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const success = await onSubmit(newPassword);
      if (success) {
        setNewPassword('');
        setConfirmPassword('');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [user, newPassword, confirmPassword, onSubmit]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="rtl:text-right ltr:text-left">איפוס סיסמה</DialogTitle>
          <DialogDescription className="rtl:text-right ltr:text-left">
            הזן סיסמה חדשה עבור {user?.full_name}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {error && (
            <div className="text-sm text-red-600 rtl:text-right ltr:text-left">{error}</div>
          )}

          <div>
            <Label htmlFor="new_password" className="text-right block rtl:text-right ltr:text-left">
              סיסמה חדשה *
            </Label>
            <Input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              dir="ltr"
            />
          </div>

          <div>
            <Label htmlFor="confirm_password" className="text-right block rtl:text-right ltr:text-left">
              אישור סיסמה *
            </Label>
            <Input
              id="confirm_password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              dir="ltr"
            />
          </div>
        </div>

        <DialogFooter className="rtl:space-x-reverse ltr:space-x-2">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            ביטול
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'מאפס...' : 'אפס סיסמה'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ResetPasswordDialog.displayName = 'ResetPasswordDialog';

// Delete User Dialog
export const DeleteUserDialog = React.memo<DeleteUserDialogProps>(({ open, user, onClose, onConfirm }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  }, [user, onConfirm]);

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="rtl:text-right ltr:text-left">האם למחוק משתמש זה?</AlertDialogTitle>
          <AlertDialogDescription className="rtl:text-right ltr:text-left">
            האם אתה בטוח שברצונך למחוק את המשתמש <strong>{user?.full_name}</strong>?
            <br />
            פעולה זו תשבית את המשתמש ולא ניתן לבטל אותה.
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
            {isDeleting ? 'מוחק...' : 'מחק משתמש'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

DeleteUserDialog.displayName = 'DeleteUserDialog';
