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
import { useFreelancers } from '@/hooks/useFreelancers';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { FreelancerFilters } from '@/components/freelancers/FreelancerFilters';
import { FreelancersTable } from '@/components/freelancers/FreelancersTable';
import { FreelancerFormDialog } from '@/components/freelancers/FreelancerFormDialog';
import type { Client } from '@/services';

export default function FreelancersPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const { isMenuVisible } = usePermissions();
  const canCreateFreelancer = isMenuVisible('clients:create');

  const {
    // State
    freelancers,
    selectedFreelancers,
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
    createFreelancer,
    updateFreelancer,
    deleteFreelancer,

    // Selection & Pagination
    toggleFreelancerSelection,
    toggleSelectAll,
    clearSelection,
    setCurrentPage,
    nextPage,
    previousPage,
  } = useFreelancers();

  // Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFreelancer, setSelectedFreelancer] = useState<Client | null>(null);

  // Handlers
  const handleOpenAddDialog = () => {
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (freelancer: Client) => {
    setSelectedFreelancer(freelancer);
    setIsEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = (freelancer: Client) => {
    setSelectedFreelancer(freelancer);
    setIsDeleteDialogOpen(true);
  };

  const handleCloseAddDialog = () => {
    setIsAddDialogOpen(false);
  };

  const handleCloseEditDialog = () => {
    setIsEditDialogOpen(false);
    setSelectedFreelancer(null);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setSelectedFreelancer(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedFreelancer) return;

    const success = await deleteFreelancer(selectedFreelancer);
    if (success) {
      handleCloseDeleteDialog();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold rtl:text-right">עצמאים</h1>
          <p className="text-muted-foreground rtl:text-right">ניהול עצמאים ובעלי הכנסה פסיבית</p>
        </div>
        {canCreateFreelancer && (
          <Button onClick={handleOpenAddDialog}>
            <Plus className="h-4 w-4 ml-2" />
            עצמאי חדש
          </Button>
        )}
      </div>

      {/* Filters */}
      <FreelancerFilters
        searchQuery={searchQuery}
        filters={filters}
        onSearchChange={setSearchQuery}
        onFilterChange={setFilters}
        onResetFilters={resetFilters}
      />

      {/* Table */}
      <FreelancersTable
        freelancers={freelancers}
        selectedFreelancers={selectedFreelancers}
        loading={loading}
        currentPage={currentPage}
        totalPages={totalPages}
        onToggleSelection={toggleFreelancerSelection}
        onToggleSelectAll={toggleSelectAll}
        onEdit={handleOpenEditDialog}
        onDelete={handleOpenDeleteDialog}
        onPageChange={setCurrentPage}
        onNextPage={nextPage}
        onPreviousPage={previousPage}
        isAdmin={isAdmin}
      />

      {/* Add Dialog */}
      <FreelancerFormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSubmit={createFreelancer}
        onClose={handleCloseAddDialog}
      />

      {/* Edit Dialog */}
      {selectedFreelancer && (
        <FreelancerFormDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          freelancer={selectedFreelancer}
          onSubmit={async (data) => {
            const success = await updateFreelancer(selectedFreelancer.id, data, selectedFreelancer);
            return { success };
          }}
          onClose={handleCloseEditDialog}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="rtl:text-right">מחיקת עצמאי</AlertDialogTitle>
            <AlertDialogDescription className="rtl:text-right">
              האם אתה בטוח שברצונך למחוק את {selectedFreelancer?.company_name}?
              <br />
              פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
