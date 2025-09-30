import { useState } from 'react';
import { Plus, Edit2, Trash2, Star, Mail, MailX, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { ClientContact, ContactType, EmailPreference, CreateClientContactDto } from '@/services/client.service';

interface ContactsManagerProps {
  contacts: ClientContact[];
  onAdd: (contact: CreateClientContactDto) => Promise<void>;
  onUpdate: (contactId: string, contact: Partial<CreateClientContactDto>) => Promise<void>;
  onDelete: (contactId: string) => Promise<void>;
  onSetPrimary: (contactId: string) => Promise<void>;
}

const contactTypeLabels: Record<ContactType, string> = {
  owner: 'בעלים',
  accountant_manager: 'מנהלת חשבונות',
  secretary: 'מזכירה',
  cfo: 'סמנכ"ל כספים',
  board_member: 'חבר דירקטוריון',
  legal_counsel: 'יועץ משפטי',
  other: 'אחר',
};

const emailPreferenceLabels: Record<EmailPreference, { label: string; icon: typeof Mail; color: string }> = {
  all: { label: 'כל המיילים', icon: Mail, color: 'text-green-600' },
  important_only: { label: 'חשובים בלבד', icon: AlertCircle, color: 'text-yellow-600' },
  none: { label: 'ללא מיילים', icon: MailX, color: 'text-red-600' },
};

export function ContactsManager({
  contacts,
  onAdd,
  onUpdate,
  onDelete,
  onSetPrimary,
}: ContactsManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ClientContact | null>(null);
  const [formData, setFormData] = useState<CreateClientContactDto>({
    contact_type: 'other',
    full_name: '',
    email: '',
    phone: '',
    email_preference: 'all',
    is_primary: false,
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      contact_type: 'other',
      full_name: '',
      email: '',
      phone: '',
      email_preference: 'all',
      is_primary: false,
      notes: '',
    });
  };

  const handleAdd = async () => {
    await onAdd(formData);
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleEdit = async () => {
    if (!selectedContact) return;
    await onUpdate(selectedContact.id, formData);
    setIsEditDialogOpen(false);
    setSelectedContact(null);
    resetForm();
  };

  const openEditDialog = (contact: ClientContact) => {
    setSelectedContact(contact);
    setFormData({
      contact_type: contact.contact_type,
      full_name: contact.full_name,
      email: contact.email || '',
      phone: contact.phone || '',
      email_preference: contact.email_preference || 'all',
      is_primary: contact.is_primary,
      notes: contact.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (contactId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את איש הקשר?')) {
      await onDelete(contactId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">אנשי קשר</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4 ml-2" />
          הוסף איש קשר
        </Button>
      </div>

      {contacts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            אין אנשי קשר. לחץ על &quot;הוסף איש קשר&quot; כדי להוסיף.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <Card key={contact.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold">{contact.full_name}</h4>
                      {contact.is_primary && (
                        <Badge variant="default" className="bg-yellow-500">
                          <Star className="h-3 w-3 ml-1" />
                          ראשי
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {contactTypeLabels[contact.contact_type]}
                      </Badge>
                      {(() => {
                        const EmailIcon = emailPreferenceLabels[contact.email_preference].icon;
                        return (
                          <Badge variant="secondary" className={emailPreferenceLabels[contact.email_preference].color}>
                            <EmailIcon className="h-3 w-3 ml-1" />
                            {emailPreferenceLabels[contact.email_preference].label}
                          </Badge>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                      {contact.email && (
                        <div>
                          <span className="font-medium">אימייל:</span>{' '}
                          <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline" dir="ltr">
                            {contact.email}
                          </a>
                        </div>
                      )}
                      {contact.phone && (
                        <div>
                          <span className="font-medium">טלפון:</span>{' '}
                          <a href={`tel:${contact.phone}`} className="text-blue-600 hover:underline" dir="ltr">
                            {contact.phone}
                          </a>
                        </div>
                      )}
                    </div>

                    {contact.notes && (
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">הערות:</span> {contact.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {!contact.is_primary && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onSetPrimary(contact.id)}
                        title="הגדר כאיש קשר ראשי"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(contact)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(contact.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Contact Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>הוספת איש קשר חדש</DialogTitle>
            <DialogDescription>הזן את פרטי איש הקשר החדש</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add_contact_type" className="text-right block">
                  סוג איש קשר *
                </Label>
                <Select
                  value={formData.contact_type}
                  onValueChange={(value: ContactType) =>
                    setFormData({ ...formData, contact_type: value })
                  }
                >
                  <SelectTrigger id="add_contact_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(contactTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="add_full_name" className="text-right block">
                  שם מלא *
                </Label>
                <Input
                  id="add_full_name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  required
                  dir="rtl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add_email" className="text-right block">
                  אימייל
                </Label>
                <Input
                  id="add_email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  dir="ltr"
                />
              </div>
              <div>
                <Label htmlFor="add_phone" className="text-right block">
                  טלפון
                </Label>
                <Input
                  id="add_phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <Label className="text-right block mb-3">העדפות מייל</Label>
              <RadioGroup
                value={formData.email_preference}
                onValueChange={(value: EmailPreference) =>
                  setFormData({ ...formData, email_preference: value })
                }
                className="space-y-2"
              >
                {Object.entries(emailPreferenceLabels).map(([value, config]) => {
                  const Icon = config.icon;
                  return (
                    <div key={value} className="flex items-center gap-2">
                      <RadioGroupItem value={value} id={`add-email-${value}`} />
                      <Label htmlFor={`add-email-${value}`} className="cursor-pointer flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        {config.label}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="add_is_primary"
                checked={formData.is_primary}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_primary: checked as boolean })
                }
              />
              <Label htmlFor="add_is_primary" className="cursor-pointer">
                איש קשר ראשי
              </Label>
            </div>

            <div>
              <Label htmlFor="add_notes" className="text-right block">
                הערות
              </Label>
              <Textarea
                id="add_notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                dir="rtl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                resetForm();
              }}
            >
              ביטול
            </Button>
            <Button type="button" onClick={handleAdd}>
              הוסף
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>עריכת איש קשר</DialogTitle>
            <DialogDescription>עדכן את פרטי איש הקשר</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_contact_type" className="text-right block">
                  סוג איש קשר *
                </Label>
                <Select
                  value={formData.contact_type}
                  onValueChange={(value: ContactType) =>
                    setFormData({ ...formData, contact_type: value })
                  }
                >
                  <SelectTrigger id="edit_contact_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(contactTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_full_name" className="text-right block">
                  שם מלא *
                </Label>
                <Input
                  id="edit_full_name"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  required
                  dir="rtl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_email" className="text-right block">
                  אימייל
                </Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  dir="ltr"
                />
              </div>
              <div>
                <Label htmlFor="edit_phone" className="text-right block">
                  טלפון
                </Label>
                <Input
                  id="edit_phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <Label className="text-right block mb-3">העדפות מייל</Label>
              <RadioGroup
                value={formData.email_preference}
                onValueChange={(value: EmailPreference) =>
                  setFormData({ ...formData, email_preference: value })
                }
                className="space-y-2"
              >
                {Object.entries(emailPreferenceLabels).map(([value, config]) => {
                  const Icon = config.icon;
                  return (
                    <div key={value} className="flex items-center gap-2">
                      <RadioGroupItem value={value} id={`edit-email-${value}`} />
                      <Label htmlFor={`edit-email-${value}`} className="cursor-pointer flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        {config.label}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="edit_is_primary"
                checked={formData.is_primary}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_primary: checked as boolean })
                }
              />
              <Label htmlFor="edit_is_primary" className="cursor-pointer">
                איש קשר ראשי
              </Label>
            </div>

            <div>
              <Label htmlFor="edit_notes" className="text-right block">
                הערות
              </Label>
              <Textarea
                id="edit_notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                dir="rtl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedContact(null);
                resetForm();
              }}
            >
              ביטול
            </Button>
            <Button type="button" onClick={handleEdit}>
              עדכן
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}