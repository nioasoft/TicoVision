/**
 * ClientProfilePage - Unified client profile at /clients/:id
 * Aggregates all client data in a tabbed layout
 */

import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useClientProfile } from '../hooks/useClientProfile';
import { ClientProfileHeader } from '../components/ClientProfileHeader';
import { ClientOverviewTab } from '../components/ClientOverviewTab';
import { ClientFilesTab } from '../components/ClientFilesTab';
import { ClientBalanceTab } from '@/modules/annual-balance/components/ClientBalanceTab';
import { ContactsManager } from '@/components/ContactsManager';
import { PhoneNumbersManager } from '@/components/PhoneNumbersManager';
import { MarkMaterialsDialog } from '@/modules/annual-balance/components/MarkMaterialsDialog';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { clientService } from '@/services';
import type { AnnualBalanceSheetWithClient } from '@/modules/annual-balance/types/annual-balance.types';
import type { CreateClientDto, CreateClientContactDto, CreateClientPhoneDto } from '@/services';

export default function ClientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const userRole = role || '';

  const { client, contacts, phones, balanceSheets, loading, error, refresh } = useClientProfile(id);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [markMaterialsCase, setMarkMaterialsCase] = useState<AnnualBalanceSheetWithClient | null>(null);
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
    const result = await clientService.addClientContact(clientId, contactData);
    if (!result.error) refresh();
    return !result.error;
  }, [refresh]);

  const handleUpdateContact = useCallback(async (clientId: string, contactId: string, data: Partial<CreateClientContactDto>) => {
    const result = await clientService.updateClientContact(clientId, contactId, data);
    if (!result.error) refresh();
    return !result.error;
  }, [refresh]);

  const handleDeleteContact = useCallback(async (clientId: string, contactId: string) => {
    const result = await clientService.deleteClientContact(clientId, contactId);
    if (!result.error) refresh();
    return !result.error;
  }, [refresh]);

  const handleSetPrimaryContact = useCallback(async (clientId: string, contactId: string) => {
    const result = await clientService.setPrimaryContact(clientId, contactId);
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

  const showBalanceTab = client.client_type === 'company' || client.client_type === 'partnership';

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header Card */}
      <Card className="rounded-xl border bg-card shadow-sm">
        <CardContent className="p-6">
          <ClientProfileHeader client={client} onEdit={handleEdit} />
        </CardContent>
      </Card>

      {/* Tabbed Content */}
      <Card className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Tabs defaultValue="overview" dir="rtl">
          <div className="border-b px-4 py-2.5">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="overview" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                סקירה
              </TabsTrigger>
              <TabsTrigger value="contacts" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                אנשי קשר
              </TabsTrigger>
              {showBalanceTab && (
                <TabsTrigger value="balance" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                  מאזנים
                </TabsTrigger>
              )}
              <TabsTrigger value="files" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
                מסמכים
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="p-4 m-0">
            <ClientOverviewTab
              client={client}
              contacts={contacts}
              balanceSheets={balanceSheets}
            />
          </TabsContent>

          <TabsContent value="contacts" className="p-4 m-0">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-3">אנשי קשר</h3>
                <ContactsManager
                  contacts={contacts}
                  onAdd={(data) => handleAddContact(client.id, data)}
                  onUpdate={(contactId, data) => handleUpdateContact(client.id, contactId, data)}
                  onDelete={(contactId) => handleDeleteContact(client.id, contactId)}
                  onSetPrimary={(contactId) => handleSetPrimaryContact(client.id, contactId)}
                />
              </div>
              <div>
                <h3 className="text-sm font-medium mb-3">מספרי טלפון</h3>
                <PhoneNumbersManager
                  phones={phones}
                  onAdd={(data) => handleAddPhone(client.id, data)}
                  onUpdate={handleUpdatePhone}
                  onDelete={handleDeletePhone}
                  onSetPrimary={handleSetPrimaryPhone}
                />
              </div>
            </div>
          </TabsContent>

          {showBalanceTab && (
            <TabsContent value="balance" className="p-4 m-0">
              <ClientBalanceTab
                clientId={client.id}
                clientName={client.company_name}
                clientTaxId={client.tax_id}
                userRole={userRole}
                onMarkMaterials={(balanceCase) => {
                  setMarkMaterialsCase(balanceCase);
                  setMarkMaterialsOpen(true);
                }}
              />
            </TabsContent>
          )}

          <TabsContent value="files" className="p-4 m-0">
            <ClientFilesTab clientId={client.id} />
          </TabsContent>
        </Tabs>
      </Card>

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
        balanceCase={markMaterialsCase}
        userRole={userRole}
      />
    </div>
  );
}
