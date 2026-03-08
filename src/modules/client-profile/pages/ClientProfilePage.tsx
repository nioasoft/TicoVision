/**
 * ClientProfilePage - Single scrollable client profile
 * Shows all client data in organized card sections (no tabs)
 */

import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useClientProfile } from '../hooks/useClientProfile';
import { ClientProfileHero } from '../components/ClientProfileHero';
import { FinancialSummaryStrip } from '../components/FinancialSummaryStrip';
import { FeeHistoryCard } from '../components/FeeHistoryCard';
import { LettersCard } from '../components/LettersCard';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { ContactInfoCard } from '../components/ContactInfoCard';
import { ClientDetailsCard } from '../components/ClientDetailsCard';
import { DocumentsSummaryCard } from '../components/DocumentsSummaryCard';
import { MarkMaterialsDialog } from '@/modules/annual-balance/components/MarkMaterialsDialog';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { clientService } from '@/services';
import type { CreateClientDto, CreateClientContactDto, CreateClientPhoneDto } from '@/services';

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const userRole = role || '';

  const {
    client,
    contacts,
    phones,
    balanceSheets,
    feeCalculations,
    actualPayments,
    letters,
    interactions,
    loading,
    error,
    refresh,
  } = useClientProfile(id);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [markMaterialsOpen, setMarkMaterialsOpen] = useState(false);

  const handleEdit = useCallback(() => {
    setEditDialogOpen(true);
  }, []);

  const handleEditSubmit = useCallback(async (data: CreateClientDto) => {
    if (!client) return false;
    const result = await clientService.update(client.id, data);
    if (result.error) return false;
    setEditDialogOpen(false);
    refresh();
    return true;
  }, [client, refresh]);

  const handleAddContact = useCallback(async (clientId: string, contactData: CreateClientContactDto) => {
    const result = await clientService.addContact(clientId, contactData);
    if (!result.error) refresh();
    return !result.error;
  }, [refresh]);

  const handleUpdateContact = useCallback(async (clientId: string, assignmentId: string, data: Partial<CreateClientContactDto>) => {
    const result = await clientService.updateContact(assignmentId, data);
    if (!result.error) refresh();
    return !result.error;
  }, [refresh]);

  const handleDeleteContact = useCallback(async (clientId: string, assignmentId: string) => {
    const result = await clientService.deleteContact(assignmentId);
    if (!result.error) refresh();
    return !result.error;
  }, [refresh]);

  const handleSetPrimaryContact = useCallback(async (clientId: string, contactId: string) => {
    const result = await clientService.setPrimaryContact(contactId);
    if (!result.error) refresh();
    return !result.error;
  }, [refresh]);

  const handleAddPhone = useCallback(async (clientId: string, phoneData: CreateClientPhoneDto) => {
    const result = await clientService.addClientPhone(clientId, phoneData);
    if (!result.error) refresh();
    return !result.error;
  }, [refresh]);

  const handleUpdatePhone = useCallback(async (phoneId: string, data: Partial<CreateClientPhoneDto>) => {
    const result = await clientService.updateClientPhone(phoneId, data);
    if (!result.error) refresh();
    return !result.error;
  }, [refresh]);

  const handleDeletePhone = useCallback(async (phoneId: string) => {
    const result = await clientService.deleteClientPhone(phoneId);
    if (!result.error) refresh();
    return !result.error;
  }, [refresh]);

  const handleSetPrimaryPhone = useCallback(async (phoneId: string) => {
    const result = await clientService.setPrimaryPhone(phoneId);
    if (!result.error) refresh();
    return !result.error;
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" dir="rtl">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4" dir="rtl">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-destructive">{error || 'לקוח לא נמצא'}</p>
        <Button variant="outline" onClick={() => navigate('/clients')}>
          חזור לרשימת לקוחות
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8" dir="rtl">
      {/* Section 1: Hero Header */}
      <ClientProfileHero client={client} contacts={contacts} onEdit={handleEdit} />

      {/* Section 2: Financial KPI Strip */}
      <FinancialSummaryStrip
        feeCalculations={feeCalculations}
        actualPayments={actualPayments}
        balanceSheets={balanceSheets}
        clientType={client.client_type}
      />

      {/* Section 3: Two-column detail grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          <FeeHistoryCard feeCalculations={feeCalculations} />
          <LettersCard letters={letters} />
          <ActivityTimeline interactions={interactions} />
        </div>

        {/* Side column */}
        <div className="space-y-4">
          <ContactInfoCard client={client} contacts={contacts} phones={phones} />
          <ClientDetailsCard client={client} />
          <DocumentsSummaryCard clientId={client.id} />
        </div>
      </div>

      {/* Edit Dialog */}
      <ClientFormDialog
        open={editDialogOpen}
        mode="edit"
        client={client}
        contacts={contacts}
        phones={phones}
        onClose={() => setEditDialogOpen(false)}
        onSubmit={handleEditSubmit}
        onLoadContacts={async (clientId) => {
          await clientService.getClientContacts(clientId);
        }}
        onAddContact={handleAddContact}
        onUpdateContact={handleUpdateContact}
        onDeleteContact={handleDeleteContact}
        onSetPrimaryContact={handleSetPrimaryContact}
        onLoadPhones={async (clientId) => {
          await clientService.getClientPhones(clientId);
        }}
        onAddPhone={handleAddPhone}
        onUpdatePhone={handleUpdatePhone}
        onDeletePhone={handleDeletePhone}
        onSetPrimaryPhone={handleSetPrimaryPhone}
        userRole={userRole}
      />

      {/* Mark Materials Dialog */}
      <MarkMaterialsDialog
        open={markMaterialsOpen}
        onOpenChange={setMarkMaterialsOpen}
        balanceCase={null}
        userRole={userRole}
      />
    </div>
  );
}
