import { useState, useEffect, useRef, useMemo } from 'react';
import { logger } from '@/lib/logger';
import { Plus, Edit, Trash2, Users, ChevronDown, ChevronUp, Building2, ExternalLink, FileImage, AlertCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { clientService, type ClientGroup, type Client } from '@/services';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AddClientsToGroupDialog } from '@/components/groups/AddClientsToGroupDialog';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { useClients } from '@/hooks/useClients';
import { ContactsManager } from '@/components/ContactsManager';
import TenantContactService from '@/services/tenant-contact.service';
import type { AssignedGroupContact, CreateTenantContactDto } from '@/types/tenant-contact.types';
import { useAuth } from '@/contexts/AuthContext';
import { Combobox } from '@/components/ui/combobox';
import { ISRAELI_CITIES_SORTED } from '@/data/israeli-cities';

export default function ClientGroupsPage() {
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
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
    canva_link: '',
    notes: '',
    address: {
      street: '',
      city: '',
      postal_code: '',
    },
  });
  const [groupNameExists, setGroupNameExists] = useState(false);
  const [isCheckingGroupName, setIsCheckingGroupName] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const groupNameCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
    loadGroups();
  }, []);

  // Check for duplicate group name (debounced)
  useEffect(() => {
    // Only check when adding (not editing) and when dialog is open
    if (!isAddDialogOpen) {
      setGroupNameExists(false);
      return;
    }

    // Clear previous timeout
    if (groupNameCheckTimeoutRef.current) {
      clearTimeout(groupNameCheckTimeoutRef.current);
    }

    // Need at least 2 characters
    if (formData.group_name_hebrew.trim().length < 2) {
      setGroupNameExists(false);
      setIsCheckingGroupName(false);
      return;
    }

    // Debounced check
    setIsCheckingGroupName(true);
    groupNameCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const exists = await clientService.checkGroupNameExists(formData.group_name_hebrew.trim());
        setGroupNameExists(exists);
      } catch (error) {
        logger.error('Error checking group name existence:', error);
        setGroupNameExists(false);
      } finally {
        setIsCheckingGroupName(false);
      }
    }, 500);

    return () => {
      if (groupNameCheckTimeoutRef.current) {
        clearTimeout(groupNameCheckTimeoutRef.current);
      }
    };
  }, [formData.group_name_hebrew, isAddDialogOpen]);

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
          description: response.error.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Error loading groups:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בטעינת הקבוצות',
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

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
        // Load clients for this group if not already loaded
        if (!groupClients.has(groupId)) {
          loadGroupClients(groupId);
        }
      }
      return newSet;
    });
  };

  const handleAddGroup = async () => {
    // Check for duplicate group name before submitting
    if (groupNameExists) {
      toast({
        title: 'שגיאה',
        description: 'קבוצה עם שם זה כבר קיימת במערכת',
        variant: 'destructive',
      });
      return;
    }

    // Create the group
    const response = await clientService.createGroup(formData);
    if (response.error || !response.data) {
      toast({
        title: 'שגיאה',
        description: response.error?.message || 'לא ניתן ליצור קבוצה',
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
    const groupData = {
      ...formData,
      primary_owner: primaryContact?.full_name || '',
    };

    const response = await clientService.updateGroup(selectedGroup.id, groupData);

    if (response.error) {
      toast({
        title: 'שגיאה',
        description: response.error.message,
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
        title: 'שגיאה',
        description: response.error.message,
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
      canva_link: '',
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
      canva_link: group.canva_link || '',
      notes: group.notes || '',
      address: group.address || { street: '', city: '', postal_code: '' },
    });

    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (group: ClientGroup) => {
    setSelectedGroup(group);
    setIsDeleteDialogOpen(true);
  };

  const openAddClientsDialog = (group: ClientGroup) => {
    setSelectedGroupForAdding(group);
    setIsAddClientsDialogOpen(true);
  };

  const handleAddClientsSuccess = () => {
    setIsAddClientsDialogOpen(false);
    // Refresh the clients for this group
    if (selectedGroupForAdding) {
      loadGroupClients(selectedGroupForAdding.id);
    }
    setSelectedGroupForAdding(null);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClientForEdit(client);
    setIsEditClientDialogOpen(true);
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
          title: 'שגיאה',
          description: 'לא ניתן ליצור איש קשר',
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
        title: 'שגיאה',
        description: 'לא ניתן להוסיף איש קשר',
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
        title: 'שגיאה',
        description: 'לא ניתן לעדכן איש קשר',
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
        title: 'שגיאה',
        description: 'לא ניתן להסיר איש קשר',
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
        title: 'שגיאה',
        description: 'לא ניתן להגדיר כבעל שליטה ראשי',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">ניהול קבוצות לקוחות</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="ml-2 h-4 w-4" />
          הוסף קבוצה חדשה
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש לפי שם קבוצה או בעל שליטה..."
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
              const isExpanded = expandedGroups.has(group.id);
              
              return (
                <Collapsible
                  key={group.id}
                  open={isExpanded}
                  onOpenChange={() => toggleGroupExpansion(group.id)}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-0 h-auto">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                            <Users className="h-4 w-4" />
                            <div className="text-right">
                              <div className="font-medium">{group.group_name_hebrew}</div>
                            </div>
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-muted-foreground">
                          בעל שליטה: {group.primary_owner}
                        </div>

                        {/* Link buttons */}
                        <div className="flex gap-1">
                          {group.company_structure_link && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(group.company_structure_link, '_blank')}
                              title="מצגת החזקות"
                            >
                              <Building2 className="h-4 w-4 text-blue-500" />
                              <span className="mr-1">מצגת החזקות</span>
                            </Button>
                          )}
                          {group.canva_link && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(group.canva_link, '_blank')}
                              title="Canva"
                            >
                              <FileImage className="h-4 w-4 text-purple-500" />
                              <span className="mr-1">Canva</span>
                            </Button>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(group)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDeleteDialog(group)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <CollapsibleContent className="mt-4">
                      {group.secondary_owners && group.secondary_owners.length > 0 && (
                        <div className="mb-2 text-sm">
                          <span className="font-medium">בעלי מניות נוספים: </span>
                          {group.secondary_owners.join(', ')}
                        </div>
                      )}
                      
                      {group.notes && (
                        <div className="mb-2 text-sm text-muted-foreground">
                          הערות: {group.notes}
                        </div>
                      )}
                      
                      <div className="mt-4">
                        <div className="flex justify-between items-center mb-4">
                          <div className="text-sm font-medium">
                            חברות בקבוצה ({clients.length})
                          </div>
                          <Button
                            size="sm"
                            onClick={() => openAddClientsDialog(group)}
                          >
                            <Plus className="ml-2 h-4 w-4" />
                            הוסף לקוחות לקבוצה
                          </Button>
                        </div>
                        {clients.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>שם החברה</TableHead>
                                <TableHead>ת.ז / ח.פ</TableHead>
                                <TableHead>סטטוס</TableHead>
                                <TableHead>סוג</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {clients.map((client) => (
                                <TableRow
                                  key={client.id}
                                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                                  onClick={() => handleEditClient(client)}
                                >
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Building2 className="h-4 w-4" />
                                      {client.company_name}
                                    </div>
                                  </TableCell>
                                  <TableCell>{client.tax_id}</TableCell>
                                  <TableCell>
                                    <Badge variant={
                                      client.status === 'active' ? 'default' :
                                      client.status === 'inactive' ? 'secondary' : 'destructive'
                                    }>
                                      {client.status === 'active' ? 'פעיל' :
                                       client.status === 'inactive' ? 'לא פעיל' : 'ממתין'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {client.client_type === 'company' ? 'חברה' :
                                     client.client_type === 'freelancer' ? 'עצמאי' : 'שכיר בעל שליטה'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            אין חברות משויכות לקבוצה זו
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
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
                required
                className={groupNameExists ? 'border-red-500' : ''}
              />
              {groupNameExists && (
                <Alert variant="destructive" className="mt-2 py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="rtl:text-right mr-2">
                    קבוצה עם שם זה כבר קיימת במערכת
                  </AlertDescription>
                </Alert>
              )}
              {isCheckingGroupName && (
                <p className="text-xs text-gray-500 mt-1 rtl:text-right">
                  בודק...
                </p>
              )}
            </div>

            {/* Address Section */}
            <div className="grid grid-cols-3 gap-4">
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
                  placeholder="שם הרחוב ומספר"
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
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, city: value }
                    })
                  }
                  placeholder="בחר עיר"
                  searchPlaceholder="חפש עיר..."
                  emptyText="לא נמצאה עיר"
                />
              </div>
              <div>
                <Label htmlFor="address_postal_code">מיקוד</Label>
                <Input
                  id="address_postal_code"
                  value={formData.address?.postal_code || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setFormData({
                      ...formData,
                      address: { ...formData.address, postal_code: value }
                    });
                  }}
                  maxLength={7}
                  dir="ltr"
                  placeholder="1234567"
                />
              </div>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="rtl:text-right mr-2 text-blue-800">
                אנשי קשר ובעלי שליטה יתווספו בשלב הבא
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_structure_link">לינק למצגת החזקות (אופציונלי)</Label>
                <Input
                  id="company_structure_link"
                  type="url"
                  value={formData.company_structure_link}
                  onChange={(e) => setFormData({ ...formData, company_structure_link: e.target.value })}
                  placeholder="https://..."
                  dir="ltr"
                />
              </div>
              <div>
                <Label htmlFor="canva_link">לינק ל-Canva (אופציונלי)</Label>
                <Input
                  id="canva_link"
                  type="url"
                  value={formData.canva_link}
                  onChange={(e) => setFormData({ ...formData, canva_link: e.target.value })}
                  placeholder="https://..."
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
            <div className="grid grid-cols-3 gap-4">
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
                  placeholder="שם הרחוב ומספר"
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
                  onChange={(value) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, city: value }
                    })
                  }
                  placeholder="בחר עיר"
                  searchPlaceholder="חפש עיר..."
                  emptyText="לא נמצאה עיר"
                />
              </div>
              <div>
                <Label htmlFor="edit_address_postal_code">מיקוד</Label>
                <Input
                  id="edit_address_postal_code"
                  value={formData.address?.postal_code || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setFormData({
                      ...formData,
                      address: { ...formData.address, postal_code: value }
                    });
                  }}
                  maxLength={7}
                  dir="ltr"
                  placeholder="1234567"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_company_structure_link">לינק למצגת החזקות (אופציונלי)</Label>
                <Input
                  id="edit_company_structure_link"
                  type="url"
                  value={formData.company_structure_link}
                  onChange={(e) => setFormData({ ...formData, company_structure_link: e.target.value })}
                  placeholder="https://..."
                  dir="ltr"
                />
              </div>
              <div>
                <Label htmlFor="edit_canva_link">לינק ל-Canva (אופציונלי)</Label>
                <Input
                  id="edit_canva_link"
                  type="url"
                  value={formData.canva_link}
                  onChange={(e) => setFormData({ ...formData, canva_link: e.target.value })}
                  placeholder="https://..."
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
          <DialogFooter>
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
            const response = await clientService.updateClient(
              selectedClientForEdit.id,
              data
            );
            if (response.error) {
              toast({
                title: 'שגיאה',
                description: response.error.message,
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
        />
      )}
    </div>
  );
}