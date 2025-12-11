/**
 * Contacts Management Page
 * Admin-only page for managing all tenant contacts
 */

import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContacts } from '@/hooks/useContacts';
import { ContactsTable } from '@/components/contacts/ContactsTable';
import { ContactFormDialog } from '@/components/contacts/ContactFormDialog';
import type { ContactSearchResult } from '@/types/tenant-contact.types';

export default function ContactsPage() {
  const {
    contacts,
    loading,
    currentPage,
    totalPages,
    totalContacts,
    searchQuery,
    filters,
    setSearchQuery,
    setFilters,
    resetFilters,
    createContact,
    updateContact,
    deleteContact,
    selectedContact,
    loadingContact,
    loadContactDetails,
    clearSelectedContact,
    updateAssignment,
    unassignFromClient,
    setCurrentPage,
    nextPage,
    previousPage,
  } = useContacts();

  // Dialog state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactSearchResult | null>(null);

  // Handle edit click
  const handleEdit = useCallback(async (contact: ContactSearchResult) => {
    setEditingContact(contact);
    await loadContactDetails(contact.id);
    setIsEditDialogOpen(true);
  }, [loadContactDetails]);

  // Handle close edit dialog
  const handleCloseEditDialog = useCallback(() => {
    setIsEditDialogOpen(false);
    setEditingContact(null);
    clearSelectedContact();
  }, [clearSelectedContact]);

  // Handle delete
  const handleDelete = useCallback(async (contact: ContactSearchResult) => {
    await deleteContact(contact.id);
  }, [deleteContact]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-right">ניהול אנשי קשר</h1>
          <p className="text-muted-foreground text-right">
            {totalContacts} אנשי קשר במערכת
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 ml-2" />
          הוסף איש קשר
        </Button>
      </div>

      {/* Table with filters */}
      <ContactsTable
        contacts={contacts}
        loading={loading}
        searchQuery={searchQuery}
        filters={filters}
        currentPage={currentPage}
        totalPages={totalPages}
        onSearchChange={setSearchQuery}
        onFilterChange={setFilters}
        onResetFilters={resetFilters}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPageChange={setCurrentPage}
        onNextPage={nextPage}
        onPreviousPage={previousPage}
      />

      {/* Add Dialog */}
      <ContactFormDialog
        open={isAddDialogOpen}
        mode="add"
        onClose={() => setIsAddDialogOpen(false)}
        onSubmit={createContact}
      />

      {/* Edit Dialog */}
      <ContactFormDialog
        open={isEditDialogOpen}
        mode="edit"
        contact={editingContact}
        contactDetails={selectedContact}
        loadingDetails={loadingContact}
        onClose={handleCloseEditDialog}
        onSubmit={async (data) => {
          if (editingContact) {
            const success = await updateContact(editingContact.id, data);
            return { success };
          }
          return { success: false };
        }}
        onUpdateAssignment={updateAssignment}
        onUnassignFromClient={unassignFromClient}
      />
    </div>
  );
}
