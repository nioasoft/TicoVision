/**
 * GroupProfilePage - Single scrollable group profile
 * Shows all group data in organized card sections (mirrors ClientProfilePage)
 */

import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { clientService } from '@/services';
import TenantContactService from '@/services/tenant-contact.service';
import { ContactsManager } from '@/components/ContactsManager';
import { useGroupProfile } from '../hooks/useGroupProfile';
import { GroupProfileHero } from '../components/GroupProfileHero';
import { GroupSummaryStrip } from '../components/GroupSummaryStrip';
import { GroupMembersCard } from '../components/GroupMembersCard';
import { GroupFeeHistoryCard } from '../components/GroupFeeHistoryCard';
import { GroupContactsCard } from '../components/GroupContactsCard';
import { GroupDetailsCard } from '../components/GroupDetailsCard';
import { LettersCard } from '@/modules/client-profile/components/LettersCard';
import { AddClientsToGroupDialog } from '@/components/groups/AddClientsToGroupDialog';
import type { CreateTenantContactDto } from '@/types/tenant-contact.types';
import type { PaymentRole } from '@/services';

export default function GroupProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [addClientsOpen, setAddClientsOpen] = useState(false);
  const [contactsDialogOpen, setContactsDialogOpen] = useState(false);

  const {
    group,
    members,
    contacts,
    feeCalculations,
    letters,
    loading,
    error,
    refresh,
  } = useGroupProfile(id);

  const handleEdit = () => {
    navigate('/client-groups');
  };

  // Payment role change handler
  const handlePaymentRoleChange = useCallback(async (clientId: string, newRole: PaymentRole) => {
    const result = await clientService.update(clientId, { payment_role: newRole });
    if (result.error) {
      toast({
        title: 'שגיאה בעדכון תפקיד תשלום',
        description: result.error.message || 'נסה שוב',
        variant: 'destructive',
      });
    } else {
      refresh();
    }
  }, [refresh, toast]);

  // Contact handlers
  const handleAddContact = useCallback(async (contactData: CreateTenantContactDto) => {
    if (!group) return;
    const contact = await TenantContactService.createOrGet(contactData);
    if (!contact) {
      toast({ title: 'שגיאה ביצירת איש קשר', variant: 'destructive' });
      return;
    }
    await TenantContactService.assignToGroup({
      group_id: group.id,
      contact_id: contact.id,
      is_primary: contactData.is_primary ?? false,
      notes: contactData.notes,
    });
    toast({ title: 'איש קשר נוסף לקבוצה' });
    refresh();
  }, [group, refresh, toast]);

  const handleUpdateContact = useCallback(async (assignmentId: string, updates: Partial<CreateTenantContactDto>) => {
    const contact = contacts.find(c => c.assignment_id === assignmentId);
    if (!contact) return;
    await TenantContactService.update(contact.id, {
      full_name: updates.full_name,
      email: updates.email,
      phone: updates.phone,
      phone_secondary: updates.phone_secondary,
      contact_type: updates.contact_type,
    });
    await TenantContactService.updateGroupAssignment(assignmentId, {
      is_primary: updates.is_primary,
      notes: updates.notes,
    });
    toast({ title: 'פרטי איש הקשר עודכנו' });
    refresh();
  }, [contacts, refresh, toast]);

  const handleDeleteContact = useCallback(async (assignmentId: string) => {
    await TenantContactService.unassignFromGroup(assignmentId);
    toast({ title: 'איש קשר הוסר מהקבוצה' });
    refresh();
  }, [refresh, toast]);

  const handleSetPrimaryContact = useCallback(async (assignmentId: string) => {
    await TenantContactService.setGroupPrimary(assignmentId);
    if (group) {
      const updatedContacts = await TenantContactService.getGroupContacts(group.id);
      const newPrimary = updatedContacts.find(c => c.is_primary);
      if (newPrimary) {
        await clientService.updateGroup(group.id, { primary_owner: newPrimary.full_name });
      }
    }
    toast({ title: 'בעל שליטה ראשי עודכן' });
    refresh();
  }, [group, refresh, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" dir="rtl">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4" dir="rtl">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{error || 'קבוצה לא נמצאה'}</p>
        <Button variant="outline" onClick={() => navigate('/client-groups')}>
          חזור לרשימת קבוצות
        </Button>
      </div>
    );
  }

  // Map AssignedGroupContact to ClientContact shape for ContactsManager
  const contactsForManager = contacts.map(c => ({
    id: c.assignment_id,
    client_id: group.id,
    contact_id: c.id,
    full_name: c.full_name,
    email: c.email,
    phone: c.phone,
    phone_secondary: c.phone_secondary,
    contact_type: c.contact_type,
    is_primary: c.is_primary,
    notes: c.assignment_notes,
    job_title: c.job_title,
    email_preference: 'all' as const,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }));

  return (
    <div className="space-y-4 pb-8" dir="rtl">
      {/* Section 1: Hero Header */}
      <GroupProfileHero group={group} memberCount={members.length} onEdit={handleEdit} />

      {/* Section 2: KPI Strip */}
      <GroupSummaryStrip feeCalculations={feeCalculations} members={members} />

      {/* Section 3: Two-column detail grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          <GroupMembersCard
            members={members}
            onAddClients={() => setAddClientsOpen(true)}
            onPaymentRoleChange={handlePaymentRoleChange}
          />
          <GroupFeeHistoryCard feeCalculations={feeCalculations} />
          <LettersCard letters={letters} />
        </div>

        {/* Side column */}
        <div className="space-y-4">
          <GroupContactsCard
            contacts={contacts}
            onManageContacts={() => setContactsDialogOpen(true)}
          />
          <GroupDetailsCard group={group} />
        </div>
      </div>

      {/* Add Clients Dialog */}
      <AddClientsToGroupDialog
        open={addClientsOpen}
        groupId={group.id}
        groupName={group.group_name_hebrew}
        onClose={() => setAddClientsOpen(false)}
        onSuccess={() => {
          setAddClientsOpen(false);
          refresh();
        }}
      />

      {/* Manage Contacts Dialog */}
      <Dialog open={contactsDialogOpen} onOpenChange={setContactsDialogOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>ניהול אנשי קשר — {group.group_name_hebrew}</DialogTitle>
          </DialogHeader>
          <ContactsManager
            resourceType="group"
            contacts={contactsForManager}
            onAdd={handleAddContact}
            onUpdate={handleUpdateContact}
            onDelete={handleDeleteContact}
            onSetPrimary={handleSetPrimaryContact}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
