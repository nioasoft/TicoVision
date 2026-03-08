import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
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
import { useClients, type WorkflowTab } from '@/hooks/useClients';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { ClientFilters } from '@/components/clients/ClientFilters';
import { ClientsTable } from '@/components/clients/ClientsTable';
import { ClientFormDialog } from '@/components/clients/ClientFormDialog';
import { cn } from '@/lib/utils';
import type { Client } from '@/services';

const WORKFLOW_TABS: { value: WorkflowTab; label: string }[] = [
  { value: 'all', label: 'הכל' },
  { value: 'balance_24', label: 'מאזן 24' },
  { value: 'balance_25', label: 'מאזן 25' },
  { value: 'fee_paid', label: 'שכ"ט שולם סופי' },
  { value: 'fee_partial', label: 'שכ"ט שולם חלקי' },
  { value: 'fee_unpaid', label: 'שכ"ט לא שולם' },
  { value: 'fee_exempt', label: 'לא משלם' },
];

export default function ClientsPage() {
  const { role } = useAuth();
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
    loading,
    currentPage,
    totalPages,

    // Status map
    clientStatusMap,

    // Tab counts
    tabCounts,

    // Sorting
    sortField,
    sortOrder,
    toggleSort,

    // Accountant names
    accountantNames,

    // Balance status per year
    balanceStatusByYear,
    taxYear,
    previousTaxYear,

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

    // Pagination
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

  const handleGroupFilter = (groupId: string) => {
    setFilters({ groupId });
  };

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-gray-600">
          <Users className="h-5 w-5" />
          <span>לקוחות</span>
        </div>

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <h1 className="text-4xl lg:text-5xl font-bold text-black">ניהול לקוחות</h1>

          <div className="flex items-center gap-3 flex-row-reverse rtl:flex-row">
            {canCreateClient && (
              <Button
                variant="outline"
                onClick={handleOpenAddDialog}
                className="border-[#395BF7] text-[#395BF7] hover:bg-[#395BF7]/10 rounded-full"
              >
                <Plus className="ml-2 h-4 w-4" />
                הוסף לקוח חדש
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Workflow Tabs */}
      <div className="bg-gray-100 rounded-lg p-1.5 flex flex-wrap gap-1">
        {WORKFLOW_TABS.map((tab) => {
          const count = tabCounts[tab.value];
          const isActive = filters.tab === tab.value;

          return (
            <button
              key={tab.value}
              onClick={() => setFilters({ tab: tab.value })}
              className={cn(
                'px-5 py-2.5 rounded-md text-sm font-medium transition-all',
                isActive
                  ? 'bg-[#395BF7] text-white shadow-sm'
                  : 'bg-transparent text-gray-600 hover:bg-white hover:shadow-sm'
              )}
            >
              {tab.label}
              <span className={cn(
                'mr-1.5 text-xs',
                isActive ? 'text-white/80' : 'text-gray-400'
              )}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and Filters */}
      <ClientFilters
        searchQuery={searchQuery}
        filters={filters}
        accountantNames={accountantNames}
        onSearchChange={setSearchQuery}
        onFilterChange={setFilters}
        onReset={resetFilters}
      />

      {/* Clients Table */}
      <ClientsTable
        clients={clients}
        loading={loading}
        clientStatusMap={clientStatusMap}
        balanceStatusByYear={balanceStatusByYear}
        taxYear={taxYear}
        previousTaxYear={previousTaxYear}
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={toggleSort}
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

    </div>
  );
}
