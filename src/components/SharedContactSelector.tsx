/**
 * SharedContactSelector Component
 * Autocomplete selector for shared tenant contacts
 * Allows selecting existing contacts or creating new ones
 */

import { useState, useEffect, useCallback } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import TenantContactService from '@/services/tenant-contact.service';
import type { TenantContact, ContactType } from '@/types/tenant-contact.types';

interface SharedContactSelectorProps {
  value?: TenantContact | null;
  onChange: (contact: TenantContact | null) => void;
  contactType?: ContactType;
  placeholder?: string;
  disabled?: boolean;
  onCreateNew?: () => void; // Callback to open "create new contact" dialog
}

export function SharedContactSelector({
  value,
  onChange,
  contactType,
  placeholder = 'חפש או בחר איש קשר...',
  disabled = false,
  onCreateNew,
}: SharedContactSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounced search
  const searchContacts = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setContacts([]);
        return;
      }

      setLoading(true);
      try {
        const results = await TenantContactService.searchContacts({
          query,
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
    },
    [contactType]
  );

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchContacts(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchContacts]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between rtl:text-right"
        >
          <span className="truncate rtl:text-right ltr:text-left">
            {value ? value.full_name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 rtl:text-right" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="הקלד לחיפוש..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="rtl:text-right"
          />
          <CommandEmpty className="py-6 text-center text-sm rtl:text-right">
            {loading ? (
              <span>מחפש...</span>
            ) : searchQuery.length < 2 ? (
              <span>הקלד לפחות 2 תווים לחיפוש</span>
            ) : (
              <div className="space-y-2">
                <span>לא נמצאו אנשי קשר</span>
                {onCreateNew && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onCreateNew();
                      setOpen(false);
                    }}
                    className="rtl:mr-2"
                  >
                    + צור איש קשר חדש
                  </Button>
                )}
              </div>
            )}
          </CommandEmpty>
          {contacts.length > 0 && (
            <CommandGroup className="max-h-64 overflow-auto">
              {contacts.map((contact) => (
                <CommandItem
                  key={contact.id}
                  value={contact.id}
                  onSelect={() => {
                    onChange(contact.id === value?.id ? null : contact);
                    setOpen(false);
                  }}
                  className="rtl:flex-row-reverse rtl:text-right"
                >
                  <Check
                    className={cn(
                      'ml-2 h-4 w-4',
                      value?.id === contact.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col flex-1">
                    <span className="font-medium">{contact.full_name}</span>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {contact.email && <span>{contact.email}</span>}
                      {contact.phone && <span>{contact.phone}</span>}
                      {contact.client_count > 0 && (
                        <span className="flex items-center gap-1 text-xs text-blue-600">
                          <Users className="h-3 w-3" />
                          {contact.client_count} לקוחות
                        </span>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default SharedContactSelector;
