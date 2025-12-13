/**
 * Contact Form Dialog Component
 * Add/Edit contact with client assignments management
 */

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Unlink, Check, X } from 'lucide-react';
import { SignatureUpload } from '@/components/SignatureUpload';
import { fileUploadService } from '@/services/file-upload.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import type {
  TenantContact,
  ContactSearchResult,
  CreateTenantContactDto,
  UpdateTenantContactDto,
  ClientContactAssignment,
  UpdateAssignmentDto,
} from '@/types/tenant-contact.types';
import type { ContactType } from '@/services/client.service';

const EMAIL_PREFERENCE_LABELS: Record<string, string> = {
  all: 'כל המיילים',
  important_only: 'חשובים בלבד',
  none: 'ללא מיילים',
};

interface ContactWithAssignments {
  contact: TenantContact;
  assignments: Array<ClientContactAssignment & {
    client: { id: string; company_name: string; company_name_hebrew: string | null };
  }>;
}

interface ContactFormDialogProps {
  open: boolean;
  mode: 'add' | 'edit';
  contact?: ContactSearchResult | null;
  contactDetails?: ContactWithAssignments | null;
  loadingDetails?: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTenantContactDto | UpdateTenantContactDto) => Promise<{ success: boolean; contact?: TenantContact }>;
  onUpdateAssignment?: (assignmentId: string, data: UpdateAssignmentDto) => Promise<boolean>;
  onUnassignFromClient?: (assignmentId: string) => Promise<boolean>;
}

interface FormData {
  full_name: string;
  job_title: string;
  email: string;
  phone: string;
  phone_secondary: string;
  contact_type: ContactType;
  notes: string;
}

const INITIAL_FORM_DATA: FormData = {
  full_name: '',
  job_title: '',
  email: '',
  phone: '',
  phone_secondary: '',
  contact_type: 'other',
  notes: '',
};

export function ContactFormDialog({
  open,
  mode,
  contact,
  contactDetails,
  loadingDetails,
  onClose,
  onSubmit,
  onUpdateAssignment,
  onUnassignFromClient,
}: ContactFormDialogProps) {
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showUnassignConfirm, setShowUnassignConfirm] = useState<string | null>(null);

  // Editing role state for assignments
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRoleValue, setEditingRoleValue] = useState('');

  // Signature state
  const [signaturePath, setSignaturePath] = useState<string | null>(null);

  // Load contact data when editing
  useEffect(() => {
    if (mode === 'edit' && contact) {
      setFormData({
        full_name: contact.full_name || '',
        job_title: contact.job_title || '',
        email: contact.email || '',
        phone: contact.phone || '',
        phone_secondary: contact.phone_secondary || '',
        contact_type: contact.contact_type || 'other',
        notes: contact.notes || '',
      });
      // Load signature path from contact details
      setSignaturePath(contactDetails?.contact?.signature_path || null);
      setHasUnsavedChanges(false);
    } else if (mode === 'add') {
      setFormData(INITIAL_FORM_DATA);
      setSignaturePath(null);
      setHasUnsavedChanges(false);
    }
  }, [mode, contact, contactDetails, open]);

  // Handle form field change
  const handleFieldChange = useCallback((field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  // Confirm close
  const handleConfirmClose = useCallback(() => {
    setShowCloseConfirm(false);
    setHasUnsavedChanges(false);
    onClose();
  }, [onClose]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!formData.full_name.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const data: CreateTenantContactDto | UpdateTenantContactDto = {
        full_name: formData.full_name.trim(),
        job_title: formData.job_title.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        phone_secondary: formData.phone_secondary.trim() || null,
        contact_type: formData.contact_type,
        notes: formData.notes.trim() || null,
      };

      const result = await onSubmit(data);
      if (result.success) {
        setHasUnsavedChanges(false);
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, onSubmit, onClose]);

  // Handle unassign from client
  const handleUnassign = useCallback(async (assignmentId: string) => {
    if (onUnassignFromClient) {
      await onUnassignFromClient(assignmentId);
    }
    setShowUnassignConfirm(null);
  }, [onUnassignFromClient]);

  // Handle start editing role
  const handleStartEditRole = useCallback((assignmentId: string, currentRole: string | null) => {
    setEditingRoleId(assignmentId);
    setEditingRoleValue(currentRole || '');
  }, []);

  // Handle save role
  const handleSaveRole = useCallback(async (assignmentId: string) => {
    if (onUpdateAssignment) {
      await onUpdateAssignment(assignmentId, {
        role_at_client: editingRoleValue.trim() || null,
      });
    }
    setEditingRoleId(null);
    setEditingRoleValue('');
  }, [onUpdateAssignment, editingRoleValue]);

  // Handle cancel edit role
  const handleCancelEditRole = useCallback(() => {
    setEditingRoleId(null);
    setEditingRoleValue('');
  }, []);

  // Handle signature upload
  const handleSignatureUpload = useCallback(async (file: File) => {
    if (!contact?.id) return;
    const result = await fileUploadService.uploadContactSignature(file, contact.id);
    if (result.data) {
      setSignaturePath(result.data);
    } else if (result.error) {
      throw result.error;
    }
  }, [contact?.id]);

  // Handle signature delete
  const handleSignatureDelete = useCallback(async () => {
    if (!contact?.id) return;
    const result = await fileUploadService.deleteContactSignature(contact.id);
    if (result.data) {
      setSignaturePath(null);
    } else if (result.error) {
      throw result.error;
    }
  }, [contact?.id]);

  const isFormValid = formData.full_name.trim().length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">
              {mode === 'add' ? 'הוספת איש קשר חדש' : 'עריכת איש קשר'}
            </DialogTitle>
            <DialogDescription className="text-right">
              {mode === 'add'
                ? 'הזן את פרטי איש הקשר החדש'
                : 'ערוך את פרטי איש הקשר'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-blue-600 text-right">פרטים בסיסיים</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-right block">
                    שם מלא <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleFieldChange('full_name', e.target.value)}
                    placeholder="שם מלא"
                    dir="rtl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="job_title" className="text-right block">
                    תפקיד
                  </Label>
                  <Input
                    id="job_title"
                    value={formData.job_title}
                    onChange={(e) => handleFieldChange('job_title', e.target.value)}
                    placeholder="תפקיד"
                    dir="rtl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-right block">
                    אימייל
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    placeholder="example@email.com"
                    dir="ltr"
                    className="text-left"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_type" className="text-right block">
                    סוג איש קשר
                  </Label>
                  <Select
                    value={formData.contact_type}
                    onValueChange={(value) => handleFieldChange('contact_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר סוג" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">בעלים</SelectItem>
                      <SelectItem value="accountant_manager">מנהל/ת חשבונות</SelectItem>
                      <SelectItem value="secretary">מזכיר/ה</SelectItem>
                      <SelectItem value="cfo">סמנכ"ל כספים</SelectItem>
                      <SelectItem value="board_member">חבר דירקטוריון</SelectItem>
                      <SelectItem value="legal_counsel">יועץ משפטי</SelectItem>
                      <SelectItem value="other">אחר</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-right block">
                    טלפון ראשי
                  </Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    placeholder=""
                    dir="ltr"
                    className="text-left"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone_secondary" className="text-right block">
                    טלפון משני
                  </Label>
                  <Input
                    id="phone_secondary"
                    value={formData.phone_secondary}
                    onChange={(e) => handleFieldChange('phone_secondary', e.target.value)}
                    placeholder=""
                    dir="ltr"
                    className="text-left"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-right block">
                  הערות
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleFieldChange('notes', e.target.value)}
                  placeholder="הערות נוספות..."
                  dir="rtl"
                  rows={3}
                />
              </div>

              {/* Signature Upload - Edit mode only */}
              {mode === 'edit' && contact && (
                <SignatureUpload
                  currentSignaturePath={signaturePath}
                  onUpload={handleSignatureUpload}
                  onDelete={handleSignatureDelete}
                  label="חתימה"
                />
              )}
            </div>

            {/* Client Assignments Section (Edit mode only) */}
            {mode === 'edit' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-blue-600 text-right">לקוחות מקושרים</h3>

                {loadingDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="mr-2 text-muted-foreground">טוען...</span>
                  </div>
                ) : contactDetails?.assignments && contactDetails.assignments.length > 0 ? (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">לקוח</TableHead>
                          <TableHead className="text-right">תפקיד אצל הלקוח</TableHead>
                          <TableHead className="text-right">ראשי</TableHead>
                          <TableHead className="text-right">העדפת מייל</TableHead>
                          <TableHead className="text-left">פעולות</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contactDetails.assignments.map((assignment) => (
                          <TableRow key={assignment.id}>
                            <TableCell className="text-right font-medium">
                              {assignment.client.company_name_hebrew || assignment.client.company_name}
                            </TableCell>
                            <TableCell className="text-right">
                              {editingRoleId === assignment.id ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={editingRoleValue}
                                    onChange={(e) => setEditingRoleValue(e.target.value)}
                                    className="h-8 w-32"
                                    dir="rtl"
                                    autoFocus
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSaveRole(assignment.id)}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Check className="h-4 w-4 text-green-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancelEditRole}
                                    className="h-8 w-8 p-0"
                                  >
                                    <X className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <span
                                  className="cursor-pointer hover:underline"
                                  onClick={() => handleStartEditRole(assignment.id, assignment.role_at_client)}
                                >
                                  {assignment.role_at_client || '-'}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {assignment.is_primary ? (
                                <Badge variant="default">ראשי</Badge>
                              ) : (
                                <Badge variant="secondary">משני</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {EMAIL_PREFERENCE_LABELS[assignment.email_preference] || assignment.email_preference}
                            </TableCell>
                            <TableCell className="text-left">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowUnassignConfirm(assignment.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Unlink className="h-4 w-4 ml-1" />
                                נתק
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    איש הקשר לא מקושר לאף לקוח
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 rtl:space-x-reverse">
            <Button variant="outline" onClick={handleClose}>
              ביטול
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  שומר...
                </>
              ) : mode === 'add' ? (
                'הוסף איש קשר'
              ) : (
                'שמור שינויים'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close confirmation dialog */}
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">יש שינויים שלא נשמרו</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              האם אתה בטוח שברצונך לסגור? השינויים שלא נשמרו יאבדו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="rtl:space-x-reverse gap-2">
            <AlertDialogCancel>המשך עריכה</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>
              סגור בכל זאת
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unassign confirmation dialog */}
      <AlertDialog open={!!showUnassignConfirm} onOpenChange={() => setShowUnassignConfirm(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">נתק מלקוח</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              האם אתה בטוח שברצונך לנתק את איש הקשר מהלקוח?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="rtl:space-x-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showUnassignConfirm && handleUnassign(showUnassignConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              נתק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
