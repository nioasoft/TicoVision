/**
 * AttendeeSelector
 * Component for selecting meeting attendees from 3 sources:
 * 1. Client contacts (from tenant_contacts)
 * 2. Office employees (from user_tenant_access)
 * 3. External (free text)
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, UserPlus, Building2, User, X, Briefcase } from 'lucide-react';
import { TenantContactService } from '@/services/tenant-contact.service';
import { userService } from '@/services/user.service';
import type { User as UserType } from '@/services/user.service';
import type { AssignedContact } from '@/types/tenant-contact.types';
import type { CreateAttendeeDto, AttendeeSourceType } from '../types/protocol.types';

interface AttendeeSelectorProps {
  clientId: string | null;
  groupId: string | null;
  attendees: CreateAttendeeDto[];
  onChange: (attendees: CreateAttendeeDto[]) => void;
}

interface ContactOption {
  id: string;
  name: string;
  role: string | null;
  type: 'contact';
}

interface EmployeeOption {
  id: string;
  name: string;
  role: string | null;
  type: 'employee';
}

type AttendeeOption = ContactOption | EmployeeOption;

export function AttendeeSelector({
  clientId,
  groupId,
  attendees,
  onChange,
}: AttendeeSelectorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sourceType, setSourceType] = useState<AttendeeSourceType>('contact');
  const [contacts, setContacts] = useState<AssignedContact[]>([]);
  const [employees, setEmployees] = useState<UserType[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [externalName, setExternalName] = useState('');
  const [externalRole, setExternalRole] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch contacts and employees
  const fetchOptions = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch client contacts if clientId is provided
      if (clientId) {
        const contactsData = await TenantContactService.getClientContacts(clientId);
        setContacts(contactsData);
      } else if (groupId) {
        // For groups, we'll use group contacts
        const groupContacts = await TenantContactService.getGroupContacts(groupId);
        // Map to AssignedContact format
        setContacts(groupContacts as unknown as AssignedContact[]);
      }

      // Fetch employees - only accountants and admins (per user request)
      const { data } = await userService.getUsers();
      if (data) {
        setEmployees(data.users.filter((u) =>
          u.is_active && (u.role === 'admin' || u.role === 'accountant')
        ));
      }
    } finally {
      setLoading(false);
    }
  }, [clientId, groupId]);

  useEffect(() => {
    if (dialogOpen) {
      fetchOptions();
    }
  }, [dialogOpen, fetchOptions]);

  // Get available options based on source type
  const getAvailableOptions = (): AttendeeOption[] => {
    if (sourceType === 'contact') {
      return contacts.map((c) => ({
        id: c.id,
        name: c.full_name,
        role: c.job_title || c.role_at_client || null,
        type: 'contact' as const,
      }));
    } else if (sourceType === 'employee') {
      return employees.map((e) => ({
        id: e.id,
        name: e.full_name,
        role: userService.getRoleDisplayName(e.role),
        type: 'employee' as const,
      }));
    }
    return [];
  };

  // Check if an attendee is already added
  const isAlreadyAdded = (id: string, type: AttendeeSourceType): boolean => {
    return attendees.some((a) => {
      if (type === 'contact') return a.contact_id === id;
      if (type === 'employee') return a.user_id === id;
      return false;
    });
  };

  // Add attendee
  const handleAdd = () => {
    if (sourceType === 'external') {
      if (!externalName.trim()) return;

      const newAttendee: CreateAttendeeDto = {
        source_type: 'external',
        display_name: externalName.trim(),
        role_title: externalRole.trim() || null,
      };

      onChange([...attendees, newAttendee]);
      setExternalName('');
      setExternalRole('');
    } else {
      if (!selectedOption) return;

      const options = getAvailableOptions();
      const selected = options.find((o) => o.id === selectedOption);
      if (!selected) return;

      const newAttendee: CreateAttendeeDto = {
        source_type: sourceType,
        contact_id: sourceType === 'contact' ? selected.id : null,
        user_id: sourceType === 'employee' ? selected.id : null,
        display_name: selected.name,
        role_title: selected.role,
      };

      onChange([...attendees, newAttendee]);
      setSelectedOption('');
    }
  };

  // Remove attendee
  const handleRemove = (index: number) => {
    const newAttendees = [...attendees];
    newAttendees.splice(index, 1);
    onChange(newAttendees);
  };

  // Get icon for source type
  const getSourceIcon = (type: AttendeeSourceType) => {
    switch (type) {
      case 'contact':
        return <User className="h-3 w-3" />;
      case 'employee':
        return <Building2 className="h-3 w-3" />;
      case 'external':
        return <Briefcase className="h-3 w-3" />;
    }
  };

  // Get badge color for source type
  const getSourceBadgeVariant = (type: AttendeeSourceType): 'default' | 'secondary' | 'outline' => {
    switch (type) {
      case 'contact':
        return 'default';
      case 'employee':
        return 'secondary';
      case 'external':
        return 'outline';
    }
  };

  const availableOptions = getAvailableOptions();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-row-reverse">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 flex-row-reverse"
        >
          <UserPlus className="h-4 w-4" />
          הוסף משתתף
        </Button>
        <h3 className="text-lg font-semibold text-right flex items-center gap-2 flex-row-reverse">
          <Users className="h-5 w-5" />
          משתתפים
        </h3>
      </div>

      {/* Attendees List */}
      {attendees.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <Users className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p>לא נבחרו משתתפים</p>
          <p className="text-sm">לחץ על &quot;הוסף משתתף&quot; להוספת משתתפים לפגישה</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attendees.map((attendee, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              dir="rtl"
            >
              <div className="flex items-center gap-3 flex-row-reverse">
                <Badge variant={getSourceBadgeVariant(attendee.source_type)} className="flex items-center gap-1">
                  {getSourceIcon(attendee.source_type)}
                  {attendee.source_type === 'contact' && 'איש קשר'}
                  {attendee.source_type === 'employee' && 'עובד משרד'}
                  {attendee.source_type === 'external' && 'חיצוני'}
                </Badge>
                <div className="text-right">
                  <p className="font-medium">{attendee.display_name}</p>
                  {attendee.role_title && (
                    <p className="text-sm text-gray-500">{attendee.role_title}</p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(index)}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add Attendee Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">הוסף משתתף</DialogTitle>
            <DialogDescription className="text-right">
              בחר משתתף מאנשי הקשר של הלקוח, עובדי המשרד, או הוסף משתתף חיצוני
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Source Type Selection */}
            <div className="space-y-2">
              <Label className="text-right block">מקור</Label>
              <Select
                value={sourceType}
                onValueChange={(v) => {
                  setSourceType(v as AttendeeSourceType);
                  setSelectedOption('');
                  setExternalName('');
                  setExternalRole('');
                }}
                dir="rtl"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="contact">
                    <div className="flex items-center gap-2 flex-row-reverse">
                      <User className="h-4 w-4" />
                      אנשי קשר מהלקוח
                    </div>
                  </SelectItem>
                  <SelectItem value="employee">
                    <div className="flex items-center gap-2 flex-row-reverse">
                      <Building2 className="h-4 w-4" />
                      עובדי המשרד
                    </div>
                  </SelectItem>
                  <SelectItem value="external">
                    <div className="flex items-center gap-2 flex-row-reverse">
                      <Briefcase className="h-4 w-4" />
                      משתתף חיצוני
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Contact/Employee Selection */}
            {sourceType !== 'external' && (
              <div className="space-y-2">
                <Label className="text-right block">
                  {sourceType === 'contact' ? 'איש קשר' : 'עובד'}
                </Label>
                {loading ? (
                  <div className="text-center py-4 text-gray-500">טוען...</div>
                ) : availableOptions.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    {sourceType === 'contact'
                      ? 'אין אנשי קשר זמינים ללקוח זה'
                      : 'אין עובדים זמינים'}
                  </div>
                ) : (
                  <ScrollArea className="h-48 border rounded-md">
                    <div className="p-2 space-y-1">
                      {availableOptions.map((option) => {
                        const alreadyAdded = isAlreadyAdded(option.id, sourceType);
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => !alreadyAdded && setSelectedOption(option.id)}
                            disabled={alreadyAdded}
                            className={`w-full text-right p-2 rounded-md transition-colors ${
                              selectedOption === option.id
                                ? 'bg-primary text-primary-foreground'
                                : alreadyAdded
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'hover:bg-gray-100'
                            }`}
                          >
                            <p className="font-medium">{option.name}</p>
                            {option.role && (
                              <p className="text-sm opacity-70">{option.role}</p>
                            )}
                            {alreadyAdded && (
                              <Badge variant="secondary" className="mt-1">
                                כבר נוסף
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            {/* External Attendee Fields */}
            {sourceType === 'external' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="external_name" className="text-right block">
                    שם מלא
                  </Label>
                  <Input
                    id="external_name"
                    value={externalName}
                    onChange={(e) => setExternalName(e.target.value)}
                    placeholder="הקלד שם המשתתף"
                    className="text-right"
                    dir="rtl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="external_role" className="text-right block">
                    תפקיד (אופציונלי)
                  </Label>
                  <Input
                    id="external_role"
                    value={externalRole}
                    onChange={(e) => setExternalRole(e.target.value)}
                    placeholder="תפקיד המשתתף"
                    className="text-right"
                    dir="rtl"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter className="flex-row-reverse gap-2 sm:justify-start">
            <Button
              onClick={handleAdd}
              disabled={
                sourceType === 'external'
                  ? !externalName.trim()
                  : !selectedOption
              }
            >
              הוסף
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
