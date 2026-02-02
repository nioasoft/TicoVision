import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Users } from 'lucide-react';
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
import { usePermissions } from '@/hooks/usePermissions';
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
  const navigate = useNavigate();

  const handleViewClient = useCallback((client: { id: string }) => {
    navigate(`/clients/${client.id}`);
  }, [navigate]);

  // Exclude freelancers - they have their own page at /freelancers
  const {
    // State
    clients,
    selectedClients,
    loading,
    currentPage,
    totalPages,

    // Client type counts
    clientTypeCounts,
    totalClientCount,

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
  } = useClients({ excludeFreelancers: true });

  // Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);

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
    const result = await createClient(data);
    if (result.success) {
      handleCloseAddDialog();
    }
    return result;
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

  const handleOpenBulkDeleteDialog = () => {
    if (selectedClients.length > 0) {
      setIsBulkDeleteDialogOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section - Similar to Figma */}
      <div className="space-y-2">
        {/* Subtitle with icon */}
        <div className="flex items-center gap-2 text-gray-600">
          <Users className="h-5 w-5" />
          <span>לקוחות</span>
        </div>

        {/* Main Title and Action Buttons Row */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <h1 className="text-4xl lg:text-5xl font-bold text-black">ניהול לקוחות</h1>

          <div className="flex items-center gap-3 flex-row-reverse rtl:flex-row">
            {/* Add Client Button - First (on the left in RTL) */}
            {canCreateClient && (
              <Button
                variant="outline"
                onClick={handleOpenAddDialog}
                className="border-[#395BF7] text-[#395BF7] hover:bg-[#395BF7]/10 rounded-lg"
              >
                <Plus className="ml-2 h-4 w-4" />
                הוסף לקוח חדש
              </Button>
            )}

            {/* Delete Clients Button */}
            {isAdmin && (
              <Button
                variant="outline"
                onClick={handleOpenBulkDeleteDialog}
                disabled={selectedClients.length === 0}
                className="border-black text-black hover:bg-gray-100 rounded-lg disabled:opacity-50"
              >
                <Trash2 className="ml-2 h-4 w-4" />
                מחיקת לקוחות
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <ClientFilters
        searchQuery={searchQuery}
        filters={filters}
        onSearchChange={setSearchQuery}
        onFilterChange={setFilters}
        onReset={resetFilters}
      />

      {/* Bulk Actions - Admin only (now minimal, main actions in header) */}
      {isAdmin && selectedClients.length > 0 && (
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
        onView={handleViewClient}
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
        userRole={role || ''}
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

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="rtl:text-right ltr:text-left">האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription className="rtl:text-right ltr:text-left">
              פעולה זו תמחק {selectedClients.length} לקוחות לצמיתות. לא ניתן לבטל
              פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="rtl:space-x-reverse ltr:space-x-2">
            <AlertDialogCancel onClick={() => setIsBulkDeleteDialogOpen(false)}>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                // TODO: Implement bulk delete
                setIsBulkDeleteDialogOpen(false);
                clearSelection();
              }}
            >
              מחק {selectedClients.length} לקוחות
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
