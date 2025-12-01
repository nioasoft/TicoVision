import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useClients } from '@/hooks/useClients';
import { useAuth } from '@/contexts/AuthContext';
import { ClientFilters } from '@/components/clients/ClientFilters';
import { BulkActionsBar } from '@/components/clients/BulkActionsBar';
import { ClientsTable } from '@/components/clients/ClientsTable';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import type { Client } from '@/services';

export default function ClientsPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const { isMenuVisible } = usePermissions();
  const canCreateClient = isMenuVisible('clients:create');

  const {
    // State
    clients,
    selectedClients,
    loading,
    currentPage,
    totalPages,

    // Search & Filters
    searchQuery,
    filters,
    setSearchQuery,
    setFilters,
    resetFilters,

    // CRUD Operations
    createClient,
    updateClient,
    deleteClient,

    // Bulk Operations
    bulkUpdateStatus,

    // Selection & Pagination
    toggleClientSelection,
    toggleSelectAll,
    clearSelection,
    setCurrentPage,
    nextPage,
    previousPage,

    // Contact Management
    clientContacts,
    loadClientContacts,
    addContact,
    updateContact,
    deleteContact,
    setPrimaryContact,
  } = useClients();

  // Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Handlers
  const handleOpenAddDialog = () => {
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (client: Client) => {
    setSelectedClient(client);
    setIsEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = (client: Client) => {
    setSelectedClient(client);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseAddDialog = () => {
    setIsAddDialogOpen(false);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedClient(null);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedClient(null);
  };

  const handleAddClient = async (data: Parameters<typeof createClient>[0]) => {
    const success = await createClient(data);
    if (success) {
      handleCloseAddDialog();
    }
    return success;
  };

  const handleUpdateClient = async (data: Parameters<typeof createClient>[0]) => {
    if (!selectedClient) return false;
    const success = await updateClient(selectedClient.id, data, selectedClient);
    if (success) {
      handleCloseEditDialog();
    }
    return success;
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;
    const success = await deleteClient(selectedClient);
    if (success) {
      handleCloseDeleteDialog();
    }
  };

  const handleBulkActivate = () => bulkUpdateStatus('active');
  const handleBulkDeactivate = () => bulkUpdateStatus('inactive');

  const handleGroupFilter = (groupId: string) => {
    setFilters({ groupId });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">ניהול לקוחות</h1>
        {canCreateClient && (
          <Button onClick={handleOpenAddDialog}>
            <Plus className="ml-2 h-4 w-4" />
            הוסף לקוח חדש
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <ClientFilters
        searchQuery={searchQuery}
        filters={filters}
        onSearchChange={setSearchQuery}
        onFilterChange={setFilters}
        onReset={resetFilters}
      />

      {/* Bulk Actions - Admin only */}
      {isAdmin && (
        <BulkActionsBar
          selectedCount={selectedClients.length}
          onActivate={handleBulkActivate}
          onDeactivate={handleBulkDeactivate}
          onClearSelection={clearSelection}
        />
      )}

      {/* Clients Table */}
      <ClientsTable
        clients={clients}
        selectedClients={selectedClients}
        loading={loading}
        isAdmin={isAdmin}
        onSelectAll={toggleSelectAll}
        onToggleSelect={toggleClientSelection}
        onEdit={handleOpenEditDialog}
        onDelete={handleOpenDeleteDialog}
        onGroupFilter={handleGroupFilter}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={previousPage} disabled={currentPage === 1}>
            הקודם
          </Button>
          <span className="flex items-center px-4">
            עמוד {currentPage} מתוך {totalPages}
          </span>
          <Button variant="outline" onClick={nextPage} disabled={currentPage === totalPages}>
            הבא
          </Button>
        </div>
      )}

      {/* Add Client Dialog */}
      <ClientFormDialog
        open={isAddDialogOpen}
        mode="add"
        client={null}
        contacts={[]}
        onClose={handleCloseAddDialog}
        onSubmit={handleAddClient}
      />

      {/* Edit Client Dialog */}
      <ClientFormDialog
        open={isEditDialogOpen}
        mode="edit"
        client={selectedClient}
        contacts={clientContacts}
        onClose={handleCloseEditDialog}
        onSubmit={handleUpdateClient}
        onLoadContacts={loadClientContacts}
        onAddContact={addContact}
        onUpdateContact={updateContact}
        onDeleteContact={deleteContact}
        onSetPrimaryContact={setPrimaryContact}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="rtl:text-right ltr:text-left">האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription className="rtl:text-right ltr:text-left">
              פעולה זו תמחק את הלקוח {selectedClient?.company_name} לצמיתות. לא ניתן לבטל
              פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="rtl:space-x-reverse ltr:space-x-2">
            <AlertDialogCancel onClick={handleCloseDeleteDialog}>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient}>מחק לקוח</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
