/**
 * SendProtocolEmailDialog
 * Dialog for sending protocol PDF via email to client contacts
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Mail, Plus, X, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TenantContactService } from '@/services/tenant-contact.service';
import { protocolService } from '../services/protocol.service';
import type { AssignedContact } from '@/services/tenant-contact.service';

export interface SendProtocolEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  protocolId: string | null;
  clientId: string | null;
  groupId: string | null;
  recipientName: string;
  onSuccess?: () => void;
}

export function SendProtocolEmailDialog({
  open,
  onOpenChange,
  protocolId,
  clientId,
  groupId,
  recipientName,
  onSuccess,
}: SendProtocolEmailDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [contacts, setContacts] = useState<AssignedContact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [additionalEmails, setAdditionalEmails] = useState<string[]>(['']);

  // Load contacts when dialog opens
  useEffect(() => {
    if (open && (clientId || groupId)) {
      loadContacts();
    }
  }, [open, clientId, groupId]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      let contactsData: AssignedContact[] = [];

      if (clientId) {
        contactsData = await TenantContactService.getClientContacts(clientId);
      } else if (groupId) {
        contactsData = await TenantContactService.getGroupContacts(groupId);
      }

      // Filter contacts with email
      const contactsWithEmail = contactsData.filter((c) => c.email);
      setContacts(contactsWithEmail);

      // Auto-select contacts that should receive important emails
      const autoSelected = contactsWithEmail
        .filter((c) => c.receives_important_emails)
        .map((c) => c.email!);
      setSelectedContacts(autoSelected);
    } catch (error) {
      console.error('Failed to load contacts:', error);
      toast({
        title: 'שגיאה',
        description: 'טעינת אנשי הקשר נכשלה',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle contact selection toggle
  const toggleContact = (email: string) => {
    setSelectedContacts((prev) =>
      prev.includes(email)
        ? prev.filter((e) => e !== email)
        : [...prev, email]
    );
  };

  // Handle additional email changes
  const updateAdditionalEmail = (index: number, value: string) => {
    const updated = [...additionalEmails];
    updated[index] = value;
    setAdditionalEmails(updated);
  };

  const addEmailField = () => {
    setAdditionalEmails([...additionalEmails, '']);
  };

  const removeEmailField = (index: number) => {
    setAdditionalEmails(additionalEmails.filter((_, i) => i !== index));
  };

  // Validate email format
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Get all selected emails
  const getAllRecipients = (): string[] => {
    const validAdditional = additionalEmails.filter(
      (e) => e.trim() && isValidEmail(e.trim())
    );
    return [...new Set([...selectedContacts, ...validAdditional])];
  };

  // Handle send
  const handleSend = async () => {
    if (!protocolId) return;

    const recipients = getAllRecipients();
    if (recipients.length === 0) {
      toast({
        title: 'שגיאה',
        description: 'נא לבחור לפחות נמען אחד',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const { error } = await protocolService.sendProtocolByEmail(
        protocolId,
        recipients,
        recipientName
      );

      if (error) {
        throw error;
      }

      toast({
        title: 'הצלחה',
        description: `הפרוטוקול נשלח ל-${recipients.length} נמענים`,
      });

      onSuccess?.();
      onOpenChange(false);

      // Reset state
      setSelectedContacts([]);
      setAdditionalEmails(['']);
    } catch (error) {
      console.error('Error sending protocol:', error);
      toast({
        title: 'שגיאה',
        description: 'שליחת הפרוטוקול נכשלה',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const recipients = getAllRecipients();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right flex items-center gap-2">
            <Mail className="h-5 w-5" />
            שליחת פרוטוקול במייל
          </DialogTitle>
          <DialogDescription className="text-right">
            בחר נמענים לשליחת הפרוטוקול של {recipientName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Registered Contacts */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : contacts.length > 0 ? (
            <div className="space-y-3">
              <Label className="text-right block">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  אנשי קשר רשומים
                </div>
              </Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {contacts.map((contact) => (
                  <div
                    key={contact.email}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                  >
                    <Checkbox
                      id={contact.email!}
                      checked={selectedContacts.includes(contact.email!)}
                      onCheckedChange={() => toggleContact(contact.email!)}
                    />
                    <label
                      htmlFor={contact.email!}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{contact.full_name}</span>
                        {contact.is_primary && (
                          <Badge variant="secondary" className="text-xs">
                            ראשי
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500" dir="ltr">
                        {contact.email}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">
              <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p>אין אנשי קשר עם אימייל</p>
            </div>
          )}

          {/* Additional Emails */}
          <div className="space-y-3">
            <Label className="text-right block">כתובות נוספות</Label>
            <div className="space-y-2">
              {additionalEmails.map((email, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => updateAdditionalEmail(index, e.target.value)}
                    className="flex-1"
                    dir="ltr"
                  />
                  {additionalEmails.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removeEmailField(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEmailField}
                className="w-full"
              >
                <Plus className="h-4 w-4 ml-2" />
                הוסף כתובת נוספת
              </Button>
            </div>
          </div>

          {/* Summary */}
          {recipients.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                הפרוטוקול יישלח ל-{recipients.length} נמענים
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 justify-start">
          <Button
            onClick={handleSend}
            disabled={sending || recipients.length === 0}
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                שולח...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 ml-2" />
                שלח פרוטוקול
              </>
            )}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
