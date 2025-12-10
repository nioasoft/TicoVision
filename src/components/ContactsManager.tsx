import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Star, Mail, MailX, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ContactAutocompleteInput } from '@/components/ContactAutocompleteInput';
import { Command, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import TenantContactService from '@/services/tenant-contact.service';
import type { TenantContact } from '@/types/tenant-contact.types';
import { cn } from '@/lib/utils';
import { formatPhoneNumber } from '@/lib/formatters';
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
  resourceType?: 'client' | 'group'; // 'client' = default, 'group' = for groups
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
  resourceType = 'client', // Default to 'client' for backward compatibility
  contacts,
  onAdd,
  onUpdate,
  onDelete,
  onSetPrimary,
}: ContactsManagerProps) {
  // Debug: log contacts received
  console.log('ContactsManager received contacts:', contacts);

  // Dynamic labels based on resource type
  const primaryContactLabel = resourceType === 'group' ? 'בעל שליטה ראשי' : 'איש קשר ראשי';
  const setPrimaryLabel = resourceType === 'group' ? 'הגדר כבעל שליטה ראשי' : 'הגדר כאיש קשר ראשי';
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ClientContact | null>(null);
  const [formData, setFormData] = useState<CreateClientContactDto>({
    contact_type: 'other',
    full_name: '',
    email: '',
    phone: '',
    phone_secondary: '',
    email_preference: 'all',
    is_primary: false,
    notes: '',
  });

  // Autocomplete state for Add dialog
  const [searchQuery, setSearchQuery] = useState('');
  const [searchContacts, setSearchContacts] = useState<TenantContact[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [selectedFromList, setSelectedFromList] = useState(false);

  // Debounced search for contacts
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchContacts([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await TenantContactService.searchContacts({
          query: searchQuery,
          limit: 10,
        });
        setSearchContacts(results);
      } catch (error) {
        console.error('Error searching contacts:', error);
        setSearchContacts([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle contact selection from autocomplete
  const handleSelectContact = useCallback((contact: TenantContact) => {
    setFormData({
      ...formData,
      full_name: contact.full_name,
      email: contact.email || '',
      phone: contact.phone || '',
      phone_secondary: contact.phone_secondary || '',
      contact_type: contact.contact_type,
    });
    setSelectedFromList(true);
    setAutocompleteOpen(false);
    setSearchQuery('');
  }, [formData]);

  // Handle manual name change
  const handleNameChange = useCallback((value: string) => {
    setFormData({ ...formData, full_name: value });
    setSearchQuery(value);
    setSelectedFromList(false);

    // Open autocomplete if typing
    if (value.length >= 2) {
      setAutocompleteOpen(true);
    }
  }, [formData]);

  const resetForm = () => {
    setFormData({
      contact_type: 'other',
      full_name: '',
      email: '',
      phone: '',
      phone_secondary: '',
      email_preference: 'all',
      is_primary: false,
      notes: '',
    });
    setSearchQuery('');
    setSearchContacts([]);
    setAutocompleteOpen(false);
    setSelectedFromList(false);
  };

  const handleAdd = async () => {
    // Validation: Both email and phone are required
    if (!formData.email || !formData.phone) {
      alert('חובה למלא גם אימייל וגם טלפון');
      return;
    }

    await onAdd(formData);
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleEdit = async () => {
    if (!selectedContact) return;

    // Validation: Both email and phone are required
    if (!formData.email || !formData.phone) {
      alert('חובה למלא גם אימייל וגם טלפון');
      return;
    }

    // For groups, use assignment_id if available, otherwise use contact id
    const updateId = selectedContact.assignment_id || selectedContact.id;
    await onUpdate(updateId, formData);
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
      phone_secondary: contact.phone_secondary || '',
      email_preference: contact.email_preference || 'all',
      is_primary: contact.is_primary,
      notes: contact.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (contact: ClientContact) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את איש הקשר?')) {
      // For groups, use assignment_id if available
      const deleteId = contact.assignment_id || contact.id;
      await onDelete(deleteId);
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
                          {resourceType === 'group' ? 'ראשי' : 'ראשי'}
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {contactTypeLabels[contact.contact_type]}
                      </Badge>
                      {resourceType === 'client' && (() => {
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
                            {formatPhoneNumber(contact.phone)}
                          </a>
                        </div>
                      )}
                      {contact.phone_secondary && (
                        <div>
                          <span className="font-medium">קווי:</span>{' '}
                          <a href={`tel:${contact.phone_secondary}`} className="text-blue-600 hover:underline" dir="ltr">
                            {formatPhoneNumber(contact.phone_secondary)}
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
                        onClick={() => onSetPrimary(contact.assignment_id || contact.id)}
                        title={setPrimaryLabel}
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
                      onClick={() => handleDelete(contact)}
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
        <DialogContent className="max-w-4xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="rtl:text-right">הוספת איש קשר חדש</DialogTitle>
            <DialogDescription className="rtl:text-right">הזן את פרטי איש הקשר החדש</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Row 1: Contact Type, Name with Autocomplete, Email, Phone, Phone Secondary */}
            <div className="grid grid-cols-5 gap-3">
              <div>
                <Label htmlFor="add_contact_type" className="text-right block mb-2">
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
                <Label htmlFor="add_full_name" className="text-right block mb-2">
                  שם מלא *
                  {selectedFromList && (
                    <span className="mr-2 text-sm text-green-600 font-normal">
                      <Check className="inline h-3 w-3 ml-1" />
                      נבחר מהמאגר
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    id="add_full_name"
                    value={formData.full_name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onFocus={() => {
                      if (formData.full_name.length >= 2) {
                        setAutocompleteOpen(true);
                      }
                    }}
                    required
                    dir="rtl"
                    className="rtl:text-right"
                  />
                  {/* Autocomplete dropdown */}
                  {autocompleteOpen && searchContacts.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md">
                      <Command shouldFilter={false}>
                        <CommandEmpty className="py-6 text-center text-sm rtl:text-right">
                          {searchLoading ? 'טוען...' : 'לא נמצאו אנשי קשר'}
                        </CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-y-auto">
                          {searchContacts.map((contact) => (
                            <CommandItem
                              key={contact.id}
                              value={`${contact.full_name} ${contact.email || ''} ${contact.phone || ''}`}
                              onSelect={() => handleSelectContact(contact)}
                              className="flex items-center gap-2 cursor-pointer rtl:flex-row-reverse"
                            >
                              <Check
                                className={cn(
                                  'h-4 w-4',
                                  formData.full_name === contact.full_name && formData.email === (contact.email || '')
                                    ? 'opacity-100'
                                    : 'opacity-0'
                                )}
                              />
                              <div className="flex-1 rtl:text-right">
                                <div className="font-medium">{contact.full_name}</div>
                                <div className="flex gap-2 text-xs text-muted-foreground rtl:flex-row-reverse rtl:justify-end">
                                  {contact.email && <span>{contact.email}</span>}
                                  {contact.phone && <span dir="ltr">{formatPhoneNumber(contact.phone)}</span>}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground rtl:text-right">
                  התחל להקליד לבחירה מהמאגר או מלא ידנית
                </p>
              </div>
              <div>
                <Label htmlFor="add_email" className="text-right block mb-2">
                  אימייל *
                </Label>
                <Input
                  id="add_email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  dir="ltr"
                />
              </div>
              <div>
                <Label htmlFor="add_phone" className="text-right block mb-2">
                  טלפון נייד *
                </Label>
                <Input
                  id="add_phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  required
                  dir="ltr"
                />
              </div>
              <div>
                <Label htmlFor="add_phone_secondary" className="text-right block mb-2">
                  טלפון קווי
                </Label>
                <Input
                  id="add_phone_secondary"
                  type="tel"
                  value={formData.phone_secondary}
                  onChange={(e) =>
                    setFormData({ ...formData, phone_secondary: e.target.value })
                  }
                  dir="ltr"
                />
              </div>
            </div>

            {/* Row 2: Email Preferences (span full width), Primary Contact Checkbox */}
            <div className="grid grid-cols-5 gap-3">
              {resourceType === 'client' && (
                <div className="col-span-4">
                  <Label className="text-right block mb-3">העדפות מייל</Label>
                  <RadioGroup
                    value={formData.email_preference}
                    onValueChange={(value: EmailPreference) =>
                      setFormData({ ...formData, email_preference: value })
                    }
                    className="flex gap-6"
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
              )}
              <div className={cn("flex items-center gap-2", resourceType === 'group' && "col-span-5")}>
                <Checkbox
                  id="add_is_primary"
                  checked={formData.is_primary}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_primary: checked as boolean })
                  }
                />
                <Label htmlFor="add_is_primary" className="cursor-pointer">
                  {primaryContactLabel}
                </Label>
              </div>
            </div>

            {/* Row 3: Notes (span full width) */}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label htmlFor="add_notes" className="text-right block mb-2">
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
                  className="rtl:text-right"
                />
              </div>
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
        <DialogContent className="max-w-4xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="rtl:text-right">עריכת איש קשר</DialogTitle>
            <DialogDescription className="rtl:text-right">עדכן את פרטי איש הקשר</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Row 1: Contact Type, Name, Email, Phone, Phone Secondary */}
            <div className="grid grid-cols-5 gap-3">
              <div>
                <Label htmlFor="edit_contact_type" className="text-right block mb-2">
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
                <Label htmlFor="edit_full_name" className="text-right block mb-2">
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
                  className="rtl:text-right"
                />
              </div>
              <div>
                <Label htmlFor="edit_email" className="text-right block mb-2">
                  אימייל *
                </Label>
                <Input
                  id="edit_email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  dir="ltr"
                />
              </div>
              <div>
                <Label htmlFor="edit_phone" className="text-right block mb-2">
                  טלפון נייד *
                </Label>
                <Input
                  id="edit_phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  required
                  dir="ltr"
                />
              </div>
              <div>
                <Label htmlFor="edit_phone_secondary" className="text-right block mb-2">
                  טלפון קווי
                </Label>
                <Input
                  id="edit_phone_secondary"
                  type="tel"
                  value={formData.phone_secondary}
                  onChange={(e) =>
                    setFormData({ ...formData, phone_secondary: e.target.value })
                  }
                  dir="ltr"
                />
              </div>
            </div>

            {/* Row 2: Email Preferences (span full width), Primary Contact Checkbox */}
            <div className="grid grid-cols-5 gap-3">
              {resourceType === 'client' && (
                <div className="col-span-4">
                  <Label className="text-right block mb-3">העדפות מייל</Label>
                  <RadioGroup
                    value={formData.email_preference}
                    onValueChange={(value: EmailPreference) =>
                      setFormData({ ...formData, email_preference: value })
                    }
                    className="flex gap-6"
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
              )}
              <div className={cn("flex items-center gap-2", resourceType === 'group' && "col-span-5")}>
                <Checkbox
                  id="edit_is_primary"
                  checked={formData.is_primary}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_primary: checked as boolean })
                  }
                />
                <Label htmlFor="edit_is_primary" className="cursor-pointer">
                  {primaryContactLabel}
                </Label>
              </div>
            </div>

            {/* Row 3: Notes (span full width) */}
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label htmlFor="edit_notes" className="text-right block mb-2">
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
                  className="rtl:text-right"
                />
              </div>
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