import { useState } from 'react';
import { UserPlus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers } from '@/hooks/useUsers';
import { UsersTable } from '@/components/users/UsersTable';
import { RegistrationsTable } from '@/components/users/RegistrationsTable';
import {
  AddUserDialog,
  EditUserDialog,
  ResetPasswordDialog,
  DeleteUserDialog,
} from '@/components/users/UserDialogs';
import {
  ApproveRegistrationDialog,
  RejectRegistrationDialog,
  RegistrationDetailsDialog,
  DeleteRegistrationDialog,
} from '@/components/users/RegistrationDialogs';
import { ClientAssignmentDialog } from '@/components/users/ClientAssignmentDialog';
import type { User } from '@/services/user.service';
import type { PendingRegistration } from '@/services/registration.service';
import type { UserRole } from '@/types/user-role';

export function UsersPage() {
  const { role: currentUserRole, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('users');

  const {
    // State
    users,
    registrations,
    rejectedRegistrations,
    availableClients,
    loading,
    pendingCount,
    rejectedCount,

    // Search & Filters
    searchTerm,
    selectedRole,
    registrationSearchTerm,
    clientSearchTerm,
    groupSearchTerm,
    filteredUsers,
    filteredRegistrations,
    filteredClients,
    filteredGroups,
    setSearchTerm,
    setSelectedRole,
    setRegistrationSearchTerm,
    setClientSearchTerm,
    setGroupSearchTerm,

    // CRUD Operations
    createUser,
    updateUser,
    deleteUser,
    resetPassword,

    // Client Assignments
    selectedClients,
    primaryClientId,
    setSelectedClients,
    setPrimaryClientId,
    loadUserAssignments,
    saveClientAssignments,

    // Group Assignments
    selectedGroups,
    handleGroupToggle,

    // Registration Management
    approveRegistration,
    rejectRegistration,
    deleteRegistration,
  } = useUsers();

  // Check if current user can manage users
  const canManage = currentUserRole === 'admin';

  // Dialog states - Users
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAssignClientsDialog, setShowAssignClientsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Dialog states - Registrations
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDeleteRegDialog, setShowDeleteRegDialog] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<PendingRegistration | null>(null);

  // User Handlers
  const handleOpenAddDialog = () => {
    setShowAddDialog(true);
  };

  const handleOpenEditDialog = (user: User) => {
    setSelectedUser(user);
    setShowEditDialog(true);
  };

  const handleOpenResetPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setShowResetPasswordDialog(true);
  };

  const handleOpenDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setShowDeleteDialog(true);
  };

  const handleOpenAssignClientsDialog = async (user: User) => {
    setSelectedUser(user);
    await loadUserAssignments(user.id);
    setShowAssignClientsDialog(true);
  };

  const handleClientToggle = (clientId: string) => {
    setSelectedClients((prev) =>
      prev.includes(clientId) ? prev.filter((id) => id !== clientId) : [...prev, clientId]
    );
  };

  const handleSaveClientAssignments = async () => {
    if (!selectedUser) return;
    await saveClientAssignments(selectedUser.id);
  };

  // Registration Handlers
  const handleOpenApproveDialog = (registration: PendingRegistration) => {
    setSelectedRegistration(registration);
    setShowApproveDialog(true);
  };

  const handleOpenRejectDialog = (registration: PendingRegistration) => {
    setSelectedRegistration(registration);
    setShowRejectDialog(true);
  };

  const handleOpenDetailsDialog = (registration: PendingRegistration) => {
    setSelectedRegistration(registration);
    setShowDetailsDialog(true);
  };

  const handleOpenDeleteRegDialog = (registration: PendingRegistration) => {
    setSelectedRegistration(registration);
    setShowDeleteRegDialog(true);
  };

  const handleApproveRegistration = async (role: UserRole) => {
    if (!selectedRegistration) return false;
    const success = await approveRegistration(selectedRegistration.id, role);
    if (success) {
      setShowApproveDialog(false);
      setSelectedRegistration(null);
    }
    return success;
  };

  const handleRejectRegistration = async (reason: string) => {
    if (!selectedRegistration) return false;
    const success = await rejectRegistration(selectedRegistration.id, reason);
    if (success) {
      setShowRejectDialog(false);
      setSelectedRegistration(null);
    }
    return success;
  };

  const handleDeleteRegistration = async () => {
    if (!selectedRegistration) return;
    const success = await deleteRegistration(selectedRegistration.id);
    if (success) {
      setShowDeleteRegDialog(false);
      setSelectedRegistration(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    const success = await deleteUser(selectedUser.id);
    if (success) {
      setShowDeleteDialog(false);
      setSelectedUser(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">טוען...</p>
        </div>
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">
          אין לך הרשאה לצפות בדף זה
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">ניהול משתמשים</h1>
        <Button onClick={handleOpenAddDialog}>
          <UserPlus className="ml-2 h-4 w-4" />
          הוסף משתמש
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        {/* Tabs and Search in same row */}
        <div className="flex gap-3 items-center flex-wrap">
          <TabsList className="flex-nowrap">
            <TabsTrigger value="users">משתמשים פעילים ({users.length})</TabsTrigger>
            <TabsTrigger value="registrations">
              בקשות הרשמה ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="rejected">נדחו ({rejectedCount})</TabsTrigger>
          </TabsList>
          
          {/* Search and Role Filter - only show for users tab */}
          {activeTab === 'users' && (
            <div className="flex gap-3 items-center flex-row-reverse flex-1 min-w-0">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                  dir="rtl"
                  placeholder="חפש משתמשים..."
                />
              </div>
              <Select value={selectedRole} onValueChange={(value) => setSelectedRole(value as UserRole | 'all')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל התפקידים</SelectItem>
                  <SelectItem value="admin">מנהל מערכת</SelectItem>
                  <SelectItem value="accountant">רואה חשבון</SelectItem>
                  <SelectItem value="bookkeeper">מנהלת חשבונות</SelectItem>
                  <SelectItem value="client">לקוח</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Active Users Tab */}
        <TabsContent value="users">
          <UsersTable
            users={filteredUsers}
            loading={loading}
            searchTerm={searchTerm}
            selectedRole={selectedRole}
            onSearchChange={setSearchTerm}
            onRoleChange={setSelectedRole}
            onEdit={handleOpenEditDialog}
            onResetPassword={handleOpenResetPasswordDialog}
            onAssignClients={handleOpenAssignClientsDialog}
            onDelete={handleOpenDeleteDialog}
            hideSearchAndFilters={true}
          />
        </TabsContent>

        {/* Pending Registrations Tab */}
        <TabsContent value="registrations">
          <RegistrationsTable
            registrations={filteredRegistrations}
            mode="pending"
            loading={loading}
            onApprove={handleOpenApproveDialog}
            onReject={handleOpenRejectDialog}
            onViewDetails={handleOpenDetailsDialog}
            onDelete={handleOpenDeleteRegDialog}
          />
        </TabsContent>

        {/* Rejected Registrations Tab */}
        <TabsContent value="rejected">
          <RegistrationsTable
            registrations={rejectedRegistrations}
            mode="rejected"
            loading={loading}
            onViewDetails={handleOpenDetailsDialog}
            onDelete={handleOpenDeleteRegDialog}
          />
        </TabsContent>
      </Tabs>

      {/* User Dialogs */}
      <AddUserDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSubmit={createUser}
      />

      <EditUserDialog
        open={showEditDialog}
        user={selectedUser}
        onClose={() => {
          setShowEditDialog(false);
          setSelectedUser(null);
        }}
        onSubmit={(data) => selectedUser ? updateUser(selectedUser.id, data) : Promise.resolve(false)}
      />

      <ResetPasswordDialog
        open={showResetPasswordDialog}
        user={selectedUser}
        onClose={() => {
          setShowResetPasswordDialog(false);
          setSelectedUser(null);
        }}
        onSubmit={(password) => selectedUser ? resetPassword(selectedUser.id, password) : Promise.resolve(false)}
      />

      <DeleteUserDialog
        open={showDeleteDialog}
        user={selectedUser}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedUser(null);
        }}
        onConfirm={handleDeleteUser}
      />

      <ClientAssignmentDialog
        open={showAssignClientsDialog}
        user={selectedUser}
        clients={filteredClients}
        selectedClients={selectedClients}
        primaryClientId={primaryClientId}
        searchTerm={clientSearchTerm}
        groups={filteredGroups}
        selectedGroups={selectedGroups}
        groupSearchTerm={groupSearchTerm}
        onClose={() => {
          setShowAssignClientsDialog(false);
          setSelectedUser(null);
        }}
        onSearchChange={setClientSearchTerm}
        onGroupSearchChange={setGroupSearchTerm}
        onClientToggle={handleClientToggle}
        onGroupToggle={handleGroupToggle}
        onPrimaryChange={setPrimaryClientId}
        onSave={handleSaveClientAssignments}
      />

      {/* Registration Dialogs */}
      <ApproveRegistrationDialog
        open={showApproveDialog}
        registration={selectedRegistration}
        onClose={() => {
          setShowApproveDialog(false);
          setSelectedRegistration(null);
        }}
        onSubmit={handleApproveRegistration}
      />

      <RejectRegistrationDialog
        open={showRejectDialog}
        registration={selectedRegistration}
        onClose={() => {
          setShowRejectDialog(false);
          setSelectedRegistration(null);
        }}
        onSubmit={handleRejectRegistration}
      />

      <RegistrationDetailsDialog
        open={showDetailsDialog}
        registration={selectedRegistration}
        onClose={() => {
          setShowDetailsDialog(false);
          setSelectedRegistration(null);
        }}
      />

      <DeleteRegistrationDialog
        open={showDeleteRegDialog}
        registration={selectedRegistration}
        onClose={() => {
          setShowDeleteRegDialog(false);
          setSelectedRegistration(null);
        }}
        onConfirm={handleDeleteRegistration}
      />
    </div>
  );
}
