import { useState, useEffect, useCallback } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Check, Smartphone, Phone, PhoneCall } from 'lucide-react';
import TenantContactService from '@/services/tenant-contact.service';
import type { ContactType } from '@/services/client.service';
import type { TenantContact } from '@/types/tenant-contact.types';
import { cn } from '@/lib/utils';
import { formatPhoneNumber } from '@/lib/formatters';

interface ContactAutocompleteInputProps {
  label: string;
  nameValue: string;
  emailValue: string;
  phoneValue: string;
  phoneSecondaryValue?: string;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onPhoneSecondaryChange?: (value: string) => void;
  contactType: ContactType;
  required?: boolean;
  disabled?: boolean;
  namePlaceholder?: string;
  emailPlaceholder?: string;
  phonePlaceholder?: string;
  phoneSecondaryPlaceholder?: string;
}

export function ContactAutocompleteInput({
  label,
  nameValue,
  emailValue,
  phoneValue,
  phoneSecondaryValue = '',
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onPhoneSecondaryChange,
  contactType,
  required = false,
  disabled = false,
  namePlaceholder = '',
  emailPlaceholder = '',
  phonePlaceholder = '',
  phoneSecondaryPlaceholder = '',
}: ContactAutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<TenantContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFromList, setSelectedFromList] = useState(false);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setContacts([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await TenantContactService.searchContacts({
          query: searchQuery,
          contact_type: contactType,
          limit: 10,
        });
        setContacts(results);
      } catch (error) {
        console.error('Error searching contacts:', error);
        setContacts([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, contactType]);

  // Handle contact selection from list
  const handleSelectContact = useCallback(
    (contact: TenantContact) => {
      onNameChange(contact.full_name);
      onEmailChange(contact.email || '');
      onPhoneChange(contact.phone || '');
      if (onPhoneSecondaryChange) {
        onPhoneSecondaryChange(contact.phone_secondary || '');
      }
      setSelectedFromList(true);
      setOpen(false);
      setSearchQuery('');
    },
    [onNameChange, onEmailChange, onPhoneChange, onPhoneSecondaryChange]
  );

  // Track when user types manually (not from list)
  const handleNameChange = useCallback(
    (value: string) => {
      onNameChange(value);
      setSearchQuery(value);
      setSelectedFromList(false);

      // Open autocomplete if typing
      if (value.length >= 2) {
        setOpen(true);
      }
    },
    [onNameChange]
  );

  const handleEmailChange = useCallback(
    (value: string) => {
      onEmailChange(value);
      setSelectedFromList(false);
    },
    [onEmailChange]
  );

  const handlePhoneChange = useCallback(
    (value: string) => {
      onPhoneChange(value);
      setSelectedFromList(false);
    },
    [onPhoneChange]
  );

  const handlePhoneSecondaryChange = useCallback(
    (value: string) => {
      if (onPhoneSecondaryChange) {
        onPhoneSecondaryChange(value);
        setSelectedFromList(false);
      }
    },
    [onPhoneSecondaryChange]
  );

  return (
    <div className="space-y-4">
      {label && (
        <div className="flex items-center gap-2 rtl:justify-end">
          <h3 className="text-sm font-semibold text-right">{label}</h3>
          {selectedFromList && (
            <span className="flex items-center gap-1 text-sm text-green-600 rtl:flex-row-reverse">
              <Check className="h-4 w-4" />
              <span>נבחר מהמאגר</span>
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-4 gap-4">
        {/* Name field with autocomplete */}
        <div className="relative">
          <Label htmlFor={`${label}-name`} className="text-right block mb-2 rtl:text-right">
            שם מלא {required && '*'}
          </Label>
          <div className="relative">
            <Input
              id={`${label}-name`}
              value={nameValue}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => {
                if (nameValue.length >= 2) {
                  setOpen(true);
                }
              }}
              placeholder={namePlaceholder}
              disabled={disabled}
              className="rtl:text-right"
              dir="rtl"
            />
            {/* Autocomplete dropdown */}
            {open && contacts.length > 0 && (
              <div className="absolute z-[9999] w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md">
                <Command shouldFilter={false}>
                  <CommandEmpty className="py-6 text-center text-sm rtl:text-right">
                    {loading ? 'טוען...' : 'לא נמצאו אנשי קשר'}
                  </CommandEmpty>
                  <CommandGroup className="max-h-[300px] overflow-y-auto">
                    {contacts.map((contact) => (
                      <CommandItem
                        key={contact.id}
                        value={`${contact.full_name} ${contact.email || ''} ${contact.phone || ''}`}
                        onSelect={() => handleSelectContact(contact)}
                        className="flex items-center gap-2 cursor-pointer rtl:flex-row-reverse"
                      >
                        <Check
                          className={cn(
                            'h-4 w-4',
                            nameValue === contact.full_name && emailValue === (contact.email || '')
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

        {/* Email field */}
        <div>
          <Label htmlFor={`${label}-email`} className="text-right block mb-2 rtl:text-right">
            דוא"ל {required && '*'}
          </Label>
          <Input
            id={`${label}-email`}
            type="email"
            value={emailValue}
            onChange={(e) => handleEmailChange(e.target.value)}
            placeholder={emailPlaceholder}
            disabled={disabled}
            className="rtl:text-right"
            dir="rtl"
          />
        </div>

        {/* Phone field */}
        <div>
          <Label htmlFor={`${label}-phone`} className="text-right flex items-center justify-end gap-1 mb-2 rtl:text-right rtl:flex-row-reverse">
            <Smartphone className="h-4 w-4" />
            {required && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id={`${label}-phone`}
            type="tel"
            value={phoneValue}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder={phonePlaceholder}
            disabled={disabled}
            className="rtl:text-right"
            dir="rtl"
          />
        </div>

        {/* Phone Secondary field */}
        <div>
          <Label htmlFor={`${label}-phone-secondary`} className="text-right flex items-center justify-end gap-1 mb-2 rtl:text-right rtl:flex-row-reverse">
            <PhoneCall className="h-4 w-4" />
          </Label>
          <Input
            id={`${label}-phone-secondary`}
            type="tel"
            value={phoneSecondaryValue}
            onChange={(e) => handlePhoneSecondaryChange(e.target.value)}
            placeholder={phoneSecondaryPlaceholder}
            disabled={disabled}
            className="rtl:text-right"
            dir="rtl"
          />
        </div>
      </div>
    </div>
  );
}
