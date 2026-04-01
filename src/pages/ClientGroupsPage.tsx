import { useState, useEffect, useMemo } from 'react';
import { logger } from '@/lib/logger';
import { Plus, Edit, Trash2, Users, Building2, AlertCircle, Search } from 'lucide-react';
import { GoogleDriveIcon } from '@/components/icons/GoogleDriveIcon';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { clientService, type ClientGroup, type Client } from '@/services';
import { AddClientsToGroupDialog } from '@/components/groups/AddClientsToGroupDialog';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { useClients } from '@/hooks/useClients';
import { ContactsManager } from '@/components/ContactsManager';
import TenantContactService from '@/services/tenant-contact.service';
import type { AssignedGroupContact, CreateTenantContactDto } from '@/types/tenant-contact.types';
import { useAuth } from '@/contexts/AuthContext';
import { Combobox } from '@/components/ui/combobox';
import { ISRAELI_CITIES_SORTED } from '@/data/israeli-cities';

// Helper function to clean address data
const cleanAddressData = (address?: { street?: string; city?: string; postal_code?: string }) => {
  if (!address) return null;

  const cleanedAddress: { street?: string; city?: string; postal_code?: string } = {};

  if (address.street?.trim()) cleanedAddress.street = address.street.trim();
  if (address.city?.trim()) cleanedAddress.city = address.city.trim();
  if (address.postal_code?.trim()) cleanedAddress.postal_code = address.postal_code.trim();

  // If all fields are empty, return null
  if (Object.keys(cleanedAddress).length === 0) return null;

  return cleanedAddress;
};

export default function ClientGroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [expandedGroups] = useState<Set<string>>(new Set());
  const [groupClients, setGroupClients] = useState<Map<string, Client[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddClientsDialogOpen, setIsAddClientsDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ClientGroup | null>(null);
  const [selectedGroupForAdding, setSelectedGroupForAdding] = useState<ClientGroup | null>(null);
  const [isEditClientDialogOpen, setIsEditClientDialogOpen] = useState(false);
  const [selectedClientForEdit, setSelectedClientForEdit] = useState<Client | null>(null);
  const [groupContacts, setGroupContacts] = useState<AssignedGroupContact[]>([]);
  const [formData, setFormData] = useState({
    group_name_hebrew: '',
    combined_billing: true,
    combined_letters: true,
    company_structure_link: '',
    google_drive_link: '',
    notes: '',
    address: {
      street: '',
      city: '',
      postal_code: '',
    },
  });
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  // Filter groups based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups;
    const query = searchQuery.toLowerCase();
    return groups.filter(
      (group) =>
        group.group_name_hebrew.toLowerCase().includes(query) ||
        group.primary_owner?.toLowerCase().includes(query) ||
        group.notes?.toLowerCase().includes(query)
    );
  }, [groups, searchQuery]);

  // Use clients hook for contact management in edit dialog
  const {
    clientContacts,
    loadClientContacts,
    addContact,
    updateContact,
    deleteContact,
    setPrimaryContact,
  } = useClients();

  useEffect(() => {
    loadGroups().then(() => {
      // Load client counts for all groups
    });
  }, []);

  // Load clients for all groups after groups are loaded
  useEffect(() => {
    if (groups.length > 0) {
      groups.forEach((g) => {
        if (!groupClients.has(g.id)) {
          loadGroupClients(g.id);
        }
      });
    }
  }, [groups]);

  // Group name duplicate check removed - no restrictions on group creation

  const loadGroups = async () => {
    setLoading(true);
    try {
      const response = await clientService.getGroups();
      if (response.data) {
        setGroups(response.data);
      }
      if (response.error) {
        toast({
          title: 'שגיאה בטעינת קבוצות',
          description: response.error.message || 'לא הצלחנו לטעון את הקבוצות',
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error loading groups:', error);
      toast({
        title: 'שגיאה בטעינת קבוצות',
        description: 'לא הצלחנו לטעון את הקבוצות. נסה לרענן את הדף.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadGroupClients = async (groupId: string) => {
    const response = await clientService.getClientsByGroup(groupId);
    if (response.data) {
      setGroupClients(prev => new Map(prev).set(groupId, response.data));
    }
  };

  const handleAddGroup = async () => {
    // Clean address data before sending
    const cleanedData = {
      ...formData,
      address: cleanAddressData(formData.address),
    };

    // Create the group
    const response = await clientService.createGroup(cleanedData);
    if (response.error || !response.data) {
      toast({
        title: 'שגיאה ביצירת קבוצה',
        description: response.error?.message || 'לא הצלחנו ליצור את הקבוצה. נסה שוב.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'קבוצה נוספה בהצלחה',
      description: `${formData.group_name_hebrew} נוספה למערכת. כעת ניתן להוסיף אנשי קשר.`,
    });

    setIsAddDialogOpen(false);
    resetForm();
    await loadGroups();

    // Open edit dialog to add contacts
    openEditDialog(response.data);
  };

  const handleUpdateGroup = async () => {
    if (!selectedGroup) return;

    // Get primary owner name from contacts (managed by ContactsManager)
    const primaryContact = groupContacts.find(c => c.is_primary);

    // Clean address data before sending
    const cleanedData = {
      ...formData,
      primary_owner: primaryContact?.full_name || '',
      address: cleanAddressData(formData.address),
    };

    const response = await clientService.updateGroup(selectedGroup.id, cleanedData);

    if (response.error) {
      toast({
        title: 'שגיאה בעדכון קבוצה',
        description: response.error.message || 'לא הצלחנו לעדכן את הקבוצה. נסה שוב.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'קבוצה עודכנה בהצלחה',
      description: `הפרטים של ${formData.group_name_hebrew} עודכנו`,
    });

    setIsEditDialogOpen(false);
    setSelectedGroup(null);
    resetForm();
    loadGroups();
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;

    const response = await clientService.deleteGroup(selectedGroup.id);

    if (response.error) {
      toast({
        title: 'שגיאה במחיקת קבוצה',
        description: response.error.message || 'לא הצלחנו למחוק את הקבוצה. נסה שוב.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'קבוצה נמחקה',
      description: `${selectedGroup.group_name_hebrew} הוסרה מהמערכת`,
    });

    setIsDeleteDialogOpen(false);
    setSelectedGroup(null);
    loadGroups();
  };

  const resetForm = () => {
    setFormData({
      group_name_hebrew: '',
      combined_billing: true,
      combined_letters: true,
      company_structure_link: '',
      google_drive_link: '',
      notes: '',
      address: {
        street: '',
        city: '',
        postal_code: '',
      },
    });
    setGroupContacts([]);
  };

  const openEditDialog = async (group: ClientGroup) => {
    setSelectedGroup(group);

    // Load group contacts (managed by ContactsManager)
    const contacts = await TenantContactService.getGroupContacts(group.id);
    setGroupContacts(contacts);

    setFormData({
      group_name_hebrew: group.group_name_hebrew,
      combined_billing: group.combined_billing,
      combined_letters: group.combined_letters,
      company_structure_link: group.company_structure_link || '',
      google_drive_link: group.google_drive_link || '',
      notes: group.notes || '',
      address: group.address || { street: '', city: '', postal_code: '' },
    });

    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (group: ClientGroup) => {
    setSelectedGroup(group);
    setIsDeleteDialogOpen(true);
  };

  const handleAddClientsSuccess = () => {
    setIsAddClientsDialogOpen(false);
    // Refresh the clients for this group
    if (selectedGroupForAdding) {
      loadGroupClients(selectedGroupForAdding.id);
    }
    setSelectedGroupForAdding(null);
  };

  // Group Contacts Handlers
  const handleAddGroupContact = async (contactData: CreateTenantContactDto) => {
    if (!selectedGroup) return;

    try {
      // Check if trying to add as primary when there's already a primary
      if (contactData.is_primary) {
        const existingPrimary = groupContacts.find(c => c.is_primary);
        if (existingPrimary) {
          toast({
            title: 'לא ניתן להגדיר כבעל שליטה ראשי',
            description: `${existingPrimary.full_name} כבר מוגדר כבעל שליטה ראשי. יש להסיר אותו קודם או להוסיף את איש הקשר החדש ללא סימון כראשי.`,
            variant: 'destructive',
          });
          return;
        }
      }

      // Create or get contact
      const contact = await TenantContactService.createOrGet(contactData);
      if (!contact) {
        toast({
          title: 'שגיאה ביצירת איש קשר',
          description: 'לא הצלחנו ליצור את איש הקשר. נסה שוב.',
          variant: 'destructive',
        });
        return;
      }

      // Assign to group
      await TenantContactService.assignToGroup({
        group_id: selectedGroup.id,
        contact_id: contact.id,
        is_primary: contactData.is_primary ?? false,
        notes: contactData.notes,
      });

      // Reload contacts
      const updatedContacts = await TenantContactService.getGroupContacts(selectedGroup.id);
      setGroupContacts(updatedContacts);

      toast({
        title: 'הצלחה',
        description: 'איש קשר נוסף לקבוצה',
      });
    } catch (error) {
      logger.error('Error adding group contact:', error);
      toast({
        title: 'שגיאה בהוספת איש קשר',
        description: 'לא הצלחנו להוסיף את איש הקשר לקבוצה. נסה שוב.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateGroupContact = async (assignmentId: string, updates: Partial<CreateTenantContactDto>) => {
    try {
      // Find the contact to get the contact_id
      const contact = groupContacts.find(c => c.assignment_id === assignmentId);
      logger.info('handleUpdateGroupContact called:', { assignmentId, updates, contact, groupContacts });

      if (!contact) {
        throw new Error('Contact not found');
      }

      // Update the contact details in tenant_contacts
      logger.info('Updating contact details:', { contactId: contact.id, updates });
      const updateResult = await TenantContactService.update(contact.id, {
        full_name: updates.full_name,
        email: updates.email,
        phone: updates.phone,
        phone_secondary: updates.phone_secondary,
        contact_type: updates.contact_type,
      });
      logger.info('Update result:', updateResult);

      // Update the assignment (is_primary, notes)
      await TenantContactService.updateGroupAssignment(assignmentId, {
        is_primary: updates.is_primary,
        notes: updates.notes,
      });

      // Reload contacts
      if (selectedGroup) {
        const updatedContacts = await TenantContactService.getGroupContacts(selectedGroup.id);
        setGroupContacts(updatedContacts);
      }

      toast({
        title: 'הצלחה',
        description: 'פרטי איש הקשר עודכנו',
      });
    } catch (error) {
      logger.error('Error updating group contact:', error);
      toast({
        title: 'שגיאה בעדכון איש קשר',
        description: 'לא הצלחנו לעדכן את פרטי איש הקשר. נסה שוב.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteGroupContact = async (assignmentId: string) => {
    try {
      await TenantContactService.unassignFromGroup(assignmentId);

      // Reload contacts
      if (selectedGroup) {
        const updatedContacts = await TenantContactService.getGroupContacts(selectedGroup.id);
        setGroupContacts(updatedContacts);
      }

      toast({
        title: 'הצלחה',
        description: 'איש קשר הוסר מהקבוצה',
      });
    } catch (error) {
      logger.error('Error deleting group contact:', error);
      toast({
        title: 'שגיאה בהסרת איש קשר',
        description: 'לא הצלחנו להסיר את איש הקשר מהקבוצה. נסה שוב.',
        variant: 'destructive',
      });
    }
  };

  const handleSetPrimaryGroupContact = async (assignmentId: string) => {
    try {
      await TenantContactService.setGroupPrimary(assignmentId);

      // Reload contacts and update group's primary_owner field
      if (selectedGroup) {
        const updatedContacts = await TenantContactService.getGroupContacts(selectedGroup.id);
        setGroupContacts(updatedContacts);

        // Find the new primary and update the group record
        const newPrimary = updatedContacts.find(c => c.is_primary);
        if (newPrimary) {
          await clientService.updateGroup(selectedGroup.id, {
            primary_owner: newPrimary.full_name,
          });
          // Reload groups to reflect the change in the list
          await loadGroups();
        }
      }

      toast({
        title: 'הצלחה',
        description: 'בעל שליטה ראשי עודכן',
      });
    } catch (error) {
      logger.error('Error setting primary group contact:', error);
      toast({
        title: 'שגיאה בעדכון בעל שליטה',
        description: 'לא הצלחנו להגדיר את איש הקשר כבעל שליטה ראשי. נסה שוב.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">ניהול קבוצות לקוחות</h1>
          <p className="text-sm text-muted-foreground/60 mt-0.5 italic">The Band — Stronger Together</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input

          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">סך הכל קבוצות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">קבוצות עם חיוב מאוחד</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {groups.filter(g => g.combined_billing).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">קבוצות עם מכתבים מאוחדים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {groups.filter(g => g.combined_letters).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Groups List */}
      <div className="border rounded-lg">
        {loading ? (
          <div className="p-8 text-center">טוען נתונים...</div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchQuery ? 'לא נמצאו קבוצות התואמות את החיפוש' : 'לא נמצאו קבוצות. לחץ על "הוסף קבוצה חדשה" כדי ליצור קבוצה ראשונה.'}
          </div>
        ) : (
          <div className="divide-y">
            {filteredGroups.map((group) => {
              const clients = groupClients.get(group.id) || [];

              return (
                <div
                  key={group.id}
                  className="p-4 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => navigate(`/client-groups/${group.id}`)}
                >
                  <div className="flex items-start justify-between">
                    {/* Right side: name + details */}
                    <div className="flex-1 min-w-0">
                      {/* Row 1: Group name + member count */}
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-medium text-base">{group.group_name_hebrew}</span>
                        <Badge variant="outline" className="text-xs">
                          {clients.length} חברות
                        </Badge>
                      </div>

                      {/* Row 2: Owner + badges + Drive */}
                      <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground mt-1.5 ps-6">
                        {group.primary_owner && (
                          <span>בעל שליטה: <span className="font-medium text-foreground">{group.primary_owner}</span></span>
                        )}
                        {group.secondary_owners && group.secondary_owners.length > 0 && (
                          <span className="text-xs">+{group.secondary_owners.length} בעלי מניות</span>
                        )}
                        {group.combined_billing && (
                          <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                            חיוב מאוחד
                          </Badge>
                        )}
                        {group.combined_letters && (
                          <Badge variant="outline" className="text-xs bg-sky-50 text-sky-700 border-sky-200">
                            מכתבים מאוחדים
                          </Badge>
                        )}
                        {group.google_drive_link && (
                          <a
                            href={group.google_drive_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-900 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <GoogleDriveIcon className="h-4 w-4" />
                            Drive
                          </a>
                        )}
                        {group.company_structure_link && (
                          <a
                            href={group.company_structure_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Building2 className="h-3.5 w-3.5" />
                            מצגת
                          </a>
                        )}
                      </div>

                      {/* Row 3: Notes (if any) */}
                      {group.notes && (
                        <div className="mt-1 ps-6 text-xs text-muted-foreground truncate max-w-xl">
                          {group.notes}
                        </div>
                      )}
                    </div>

                    {/* Left side: action buttons */}
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(group)}
                        title="עריכה"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDeleteDialog(group)}
                          title="מחיקה"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Group Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>הוספת קבוצה חדשה</DialogTitle>
            <DialogDescription>
              צור קבוצה חדשה לניהול מאוחד של חברות קשורות
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="group_name_hebrew">שם הקבוצה (עברית) *</Label>
              <Input
                id="group_name_hebrew"
                value={formData.group_name_hebrew}
                onChange={(e) => setFormData({ ...formData, group_name_hebrew: e.target.value })}
                dir="rtl"
              />
            </div>

            {/* Address Section */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="address_street">רחוב</Label>
                <Input
                  id="address_street"
                  value={formData.address?.street || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value }
                    })
                  }
                  dir="rtl"
                />
              </div>
              <div>
                <Label htmlFor="address_city">עיר</Label>
                <Combobox
                  options={ISRAELI_CITIES_SORTED.map((city) => ({
                    value: city,
                    label: city,
                  }))}
                  value={formData.address?.city || ''}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, city: value }
                    })
                  }


                  emptyText="לא נמצאה עיר"
                />
              </div>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="rtl:text-right mr-2 text-blue-800">
                אנשי קשר ובעלי שליטה יתווספו בשלב הבא
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="company_structure_link">לינק למצגת החזקות</Label>
                <Input
                  id="company_structure_link"
                  type="url"
                  value={formData.company_structure_link}
                  onChange={(e) => setFormData({ ...formData, company_structure_link: e.target.value })}
                  dir="ltr"
                />
              </div>
              <div>
                <Label htmlFor="google_drive_link">לינק ל-Google Drive</Label>
                <Input
                  id="google_drive_link"
                  type="url"
                  value={formData.google_drive_link}
                  onChange={(e) => setFormData({ ...formData, google_drive_link: e.target.value })}
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">הערות</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false);
              resetForm();
            }}>
              ביטול
            </Button>
            <Button onClick={handleAddGroup}>
              הוסף קבוצה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>עריכת פרטי קבוצה</DialogTitle>
            <DialogDescription>
              עדכן את פרטי הקבוצה
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="edit_group_name_hebrew">שם הקבוצה (עברית) *</Label>
              <Input
                id="edit_group_name_hebrew"
                value={formData.group_name_hebrew}
                onChange={(e) => setFormData({ ...formData, group_name_hebrew: e.target.value })}
                dir="rtl"
                required
              />
            </div>

            {/* Address Section */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_address_street">רחוב</Label>
                <Input
                  id="edit_address_street"
                  value={formData.address?.street || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value }
                    })
                  }
                  dir="rtl"
                />
              </div>
              <div>
                <Label htmlFor="edit_address_city">עיר</Label>
                <Combobox
                  options={ISRAELI_CITIES_SORTED.map((city) => ({
                    value: city,
                    label: city,
                  }))}
                  value={formData.address?.city || ''}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, city: value }
                    })
                  }


                  emptyText="לא נמצאה עיר"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit_company_structure_link">לינק למצגת החזקות</Label>
                <Input
                  id="edit_company_structure_link"
                  type="url"
                  value={formData.company_structure_link}
                  onChange={(e) => setFormData({ ...formData, company_structure_link: e.target.value })}
                  dir="ltr"
                />
              </div>
              <div>
                <Label htmlFor="edit_google_drive_link">לינק ל-Google Drive</Label>
                <Input
                  id="edit_google_drive_link"
                  type="url"
                  value={formData.google_drive_link}
                  onChange={(e) => setFormData({ ...formData, google_drive_link: e.target.value })}
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit_notes">הערות</Label>
              <Textarea
                id="edit_notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            {/* Group Contacts Manager */}
            {selectedGroup && (
              <div className="mt-6 pt-6 border-t-2">
                <h3 className="text-lg font-semibold mb-4 rtl:text-right ltr:text-left">
                  בעלי שליטה ובעלי מניות
                </h3>
                <ContactsManager
                  resourceType="group"
                  contacts={groupContacts}
                  onAdd={handleAddGroupContact}
                  onUpdate={handleUpdateGroupContact}
                  onDelete={handleDeleteGroupContact}
                  onSetPrimary={handleSetPrimaryGroupContact}
                />
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedGroup(null);
                resetForm();
                setIsAddDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 ms-1.5" />
              קבוצה חדשה
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedGroup(null);
                resetForm();
              }}>
                ביטול
              </Button>
              <Button onClick={handleUpdateGroup}>
                עדכן קבוצה
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את הקבוצה {selectedGroup?.group_name_hebrew} לצמיתות.
              כל החברות שמשויכות לקבוצה יישארו במערכת אך לא יהיו משויכות לקבוצה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setSelectedGroup(null);
            }}>
              ביטול
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup}>
              מחק קבוצה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Clients to Group Dialog */}
      {selectedGroupForAdding && (
        <AddClientsToGroupDialog
          open={isAddClientsDialogOpen}
          groupId={selectedGroupForAdding.id}
          groupName={selectedGroupForAdding.group_name_hebrew}
          onClose={() => {
            setIsAddClientsDialogOpen(false);
            setSelectedGroupForAdding(null);
          }}
          onSuccess={handleAddClientsSuccess}
        />
      )}

      {/* Edit Client Dialog */}
      {selectedClientForEdit && (
        <ClientFormDialog
          open={isEditClientDialogOpen}
          mode="edit"
          client={selectedClientForEdit}
          contacts={clientContacts}
          phones={[]}
          onClose={() => {
            setIsEditClientDialogOpen(false);
            setSelectedClientForEdit(null);
          }}
          onSubmit={async (data) => {
            const response = await clientService.update(
              selectedClientForEdit.id,
              data
            );
            if (response.error) {
              toast({
                title: 'שגיאה בעדכון לקוח',
                description: response.error.message || 'לא הצלחנו לעדכן את פרטי הלקוח. נסה שוב.',
                variant: 'destructive',
              });
              return false;
            }
            toast({
              title: 'לקוח עודכן בהצלחה',
              description: `${data.company_name} עודכן`,
            });
            // Refresh all expanded groups to show updated data
            expandedGroups.forEach((groupId) => {
              loadGroupClients(groupId);
            });
            return true;
          }}
          onLoadContacts={loadClientContacts}
          onAddContact={addContact}
          onUpdateContact={updateContact}
          onDeleteContact={deleteContact}
          onSetPrimaryContact={setPrimaryContact}
          userRole={role || ''}
        />
      )}
    </div>
  );
}
