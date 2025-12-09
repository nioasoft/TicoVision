import { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '@/lib/logger';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { userService, type User, type CreateUserData, type UpdateUserData } from '@/services/user.service';
import { registrationService, type PendingRegistration, type UserClientAssignment } from '@/services/registration.service';
import { clientService, type Client } from '@/services/client.service';
import { userClientAssignmentService, type AssignableGroup } from '@/services/user-client-assignment.service';
import type { UserRole } from '@/types/user-role';

export interface UseUsersReturn {
  // State
  users: User[];
  registrations: PendingRegistration[];
  rejectedRegistrations: PendingRegistration[];
  availableClients: Client[];
  availableGroups: AssignableGroup[];
  userAssignments: UserClientAssignment[];
  loading: boolean;
  pendingCount: number;
  rejectedCount: number;

  // Search & Filters
  searchTerm: string;
  selectedRole: UserRole | 'all';
  registrationSearchTerm: string;
  clientSearchTerm: string;
  groupSearchTerm: string;
  filteredUsers: User[];
  filteredRegistrations: PendingRegistration[];
  filteredClients: Client[];
  filteredGroups: AssignableGroup[];

  setSearchTerm: (term: string) => void;
  setSelectedRole: (role: UserRole | 'all') => void;
  setRegistrationSearchTerm: (term: string) => void;
  setClientSearchTerm: (term: string) => void;
  setGroupSearchTerm: (term: string) => void;

  // CRUD Operations
  loadUsers: () => Promise<void>;
  createUser: (data: CreateUserData) => Promise<boolean>;
  updateUser: (userId: string, data: UpdateUserData) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  resetPassword: (userId: string, newPassword: string) => Promise<boolean>;

  // Client Assignments
  selectedClients: string[];
  primaryClientId: string | undefined;
  setSelectedClients: (clients: string[]) => void;
  setPrimaryClientId: (clientId: string | undefined) => void;
  loadUserAssignments: (userId: string) => Promise<void>;
  saveClientAssignments: (userId: string) => Promise<boolean>;

  // Group Assignments
  selectedGroups: string[];
  setSelectedGroups: (groups: string[]) => void;
  handleGroupToggle: (groupId: string) => void;

  // Registration Management
  loadRegistrations: () => Promise<void>;
  loadRejectedRegistrations: () => Promise<void>;
  approveRegistration: (regId: string, role: UserRole) => Promise<boolean>;
  rejectRegistration: (regId: string, reason: string) => Promise<boolean>;
  deleteRegistration: (regId: string) => Promise<boolean>;
}

export function useUsers(): UseUsersReturn {
  const { toast: uiToast } = useToast();

  // State
  const [users, setUsers] = useState<User[]>([]);
  const [registrations, setRegistrations] = useState<PendingRegistration[]>([]);
  const [rejectedRegistrations, setRejectedRegistrations] = useState<PendingRegistration[]>([]);
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [availableGroups, setAvailableGroups] = useState<AssignableGroup[]>([]);
  const [userAssignments, setUserAssignments] = useState<UserClientAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');
  const [registrationSearchTerm, setRegistrationSearchTerm] = useState('');
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [groupSearchTerm, setGroupSearchTerm] = useState('');

  // Client Assignment
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [primaryClientId, setPrimaryClientId] = useState<string | undefined>();

  // Group Assignment
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);

  // Debounce search terms
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const debouncedRegistrationSearchTerm = useDebounce(registrationSearchTerm, 300);
  const debouncedClientSearchTerm = useDebounce(clientSearchTerm, 300);
  const debouncedGroupSearchTerm = useDebounce(groupSearchTerm, 300);

  // Computed - Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.full_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        user.phone?.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchesRole = selectedRole === 'all' || user.role === selectedRole;
      return matchesSearch && matchesRole;
    });
  }, [users, debouncedSearchTerm, selectedRole]);

  // Computed - Filtered Registrations
  const filteredRegistrations = useMemo(() => {
    return registrations.filter((reg) =>
      reg.email.toLowerCase().includes(debouncedRegistrationSearchTerm.toLowerCase()) ||
      reg.full_name?.toLowerCase().includes(debouncedRegistrationSearchTerm.toLowerCase())
    );
  }, [registrations, debouncedRegistrationSearchTerm]);

  // Computed - Filtered Clients
  const filteredClients = useMemo(() => {
    return availableClients.filter((client) =>
      client.company_name.toLowerCase().includes(debouncedClientSearchTerm.toLowerCase())
    );
  }, [availableClients, debouncedClientSearchTerm]);

  // Computed - Filtered Groups
  const filteredGroups = useMemo(() => {
    return availableGroups.filter((group) =>
      group.group_name_hebrew.toLowerCase().includes(debouncedGroupSearchTerm.toLowerCase()) ||
      group.primary_owner.toLowerCase().includes(debouncedGroupSearchTerm.toLowerCase())
    );
  }, [availableGroups, debouncedGroupSearchTerm]);

  // Load data on mount
  useEffect(() => {
    loadUsers();
    loadClients();
    loadRegistrations();
    loadRejectedRegistrations();
  }, []);

  // Load users
  const loadUsers = useCallback(async () => {
    setLoading(true);
    const response = await userService.getUsers();
    if (response.error) {
      uiToast({
        title: 'שגיאה',
        description: 'לא ניתן לטעון את רשימת המשתמשים',
        variant: 'destructive',
      });
    } else if (response.data) {
      setUsers(response.data.users);
    }
    setLoading(false);
  }, [uiToast]);

  // Create user
  const createUser = useCallback(async (data: CreateUserData): Promise<boolean> => {
    const response = await userService.createUser(data);
    if (response.error) {
      uiToast({
        title: 'שגיאה',
        description: response.error.message,
        variant: 'destructive',
      });
      return false;
    }

    uiToast({
      title: 'משתמש נוצר בהצלחה',
      description: `${data.full_name} נוסף למערכת`,
    });

    await loadUsers();
    return true;
  }, [uiToast, loadUsers]);

  // Update user
  const updateUser = useCallback(async (userId: string, data: UpdateUserData): Promise<boolean> => {
    const response = await userService.updateUser(userId, data);
    if (response.error) {
      uiToast({
        title: 'שגיאה',
        description: response.error.message,
        variant: 'destructive',
      });
      return false;
    }

    uiToast({
      title: 'משתמש עודכן בהצלחה',
      description: 'פרטי המשתמש עודכנו',
    });

    await loadUsers();
    return true;
  }, [uiToast, loadUsers]);

  // Delete user
  const deleteUser = useCallback(async (userId: string): Promise<boolean> => {
    const response = await userService.deleteUser(userId);
    if (response.error) {
      uiToast({
        title: 'שגיאה',
        description: response.error.message,
        variant: 'destructive',
      });
      return false;
    }

    uiToast({
      title: 'משתמש נמחק',
      description: 'המשתמש הוסר מהמערכת',
    });

    await loadUsers();
    return true;
  }, [uiToast, loadUsers]);

  // Reset password
  const resetPassword = useCallback(async (userId: string, newPassword: string): Promise<boolean> => {
    const response = await userService.resetUserPassword(userId, newPassword);
    if (response.error) {
      uiToast({
        title: 'שגיאה',
        description: response.error.message,
        variant: 'destructive',
      });
      return false;
    }

    uiToast({
      title: 'סיסמה אופסה',
      description: 'הסיסמה עודכנה בהצלחה',
    });

    return true;
  }, [uiToast]);

  // Load clients
  const loadClients = useCallback(async () => {
    const response = await clientService.getClients();
    if (response.data) {
      setAvailableClients(response.data.clients);
    }
  }, []);

  // Load user client and group assignments
  const loadUserAssignments = useCallback(async (userId: string) => {
    // Load client assignments
    const clientResponse = await registrationService.getUserClientAssignments(userId);
    if (clientResponse.data) {
      setUserAssignments(clientResponse.data);
      setSelectedClients(clientResponse.data.map((a) => a.client_id));
      const primary = clientResponse.data.find((a) => a.is_primary);
      setPrimaryClientId(primary?.client_id);
    }

    // Load group assignments
    const groupResponse = await userClientAssignmentService.getGroupsWithAssignmentStatus(userId);
    if (groupResponse.data) {
      setAvailableGroups(groupResponse.data);
      setSelectedGroups(groupResponse.data.filter(g => g.is_assigned).map(g => g.id));
    }
  }, []);

  // Save client and group assignments
  const saveClientAssignments = useCallback(async (userId: string): Promise<boolean> => {
    // Save client assignments
    const clientResponse = await registrationService.assignClientsToUser(
      userId,
      selectedClients,
      primaryClientId
    );
    if (clientResponse.error) {
      toast.error('שגיאה בשמירת שיוך לקוחות');
      return false;
    }

    // Save group assignments
    const groupResponse = await userClientAssignmentService.updateGroupAssignments(
      userId,
      selectedGroups
    );
    if (groupResponse.error) {
      toast.error('שגיאה בשמירת שיוך קבוצות');
      return false;
    }

    toast.success('שיוך לקוחות וקבוצות נשמר בהצלחה');
    return true;
  }, [selectedClients, primaryClientId, selectedGroups]);

  // Toggle group selection
  const handleGroupToggle = useCallback((groupId: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  }, []);

  // Load registrations
  const loadRegistrations = useCallback(async () => {
    const response = await registrationService.getPendingRegistrations();
    if (response.error) {
      toast.error('שגיאה בטעינת בקשות ההרשמה');
    } else if (response.data) {
      setRegistrations(response.data);
      const pending = response.data.filter((r) => r.status === 'pending');
      setPendingCount(pending.length);
    }
  }, []);

  // Load rejected registrations
  const loadRejectedRegistrations = useCallback(async () => {
    const response = await registrationService.getRejectedRegistrations();
    if (response.error) {
      toast.error('שגיאה בטעינת בקשות נדחות');
    } else if (response.data) {
      setRejectedRegistrations(response.data);
      setRejectedCount(response.data.length);
    }
  }, []);

  // Approve registration
  const approveRegistration = useCallback(async (regId: string, role: UserRole): Promise<boolean> => {
    // Pass role to service - it will override requested_role
    const response = await registrationService.approveRegistration(regId, role);
    if (response.error) {
      toast.error('שגיאה באישור הבקשה');
      return false;
    }

    toast.success('הבקשה אושרה בהצלחה');
    await loadRegistrations();
    await loadUsers();
    return true;
  }, [loadRegistrations, loadUsers]);

  // Reject registration
  const rejectRegistration = useCallback(async (regId: string, reason: string): Promise<boolean> => {
    const response = await registrationService.rejectRegistration(regId, reason);
    if (response.error) {
      toast.error('שגיאה בדחיית הבקשה');
      return false;
    }

    toast.success('הבקשה נדחתה');
    await loadRegistrations();
    await loadRejectedRegistrations();
    return true;
  }, [loadRegistrations, loadRejectedRegistrations]);

  // Delete registration
  const deleteRegistration = useCallback(async (regId: string): Promise<boolean> => {
    const response = await registrationService.deleteRegistration(regId);
    if (response.error) {
      toast.error('שגיאה במחיקת הבקשה');
      return false;
    }

    toast.success('הבקשה נמחקה');
    await loadRejectedRegistrations();
    return true;
  }, [loadRejectedRegistrations]);

  return {
    // State
    users,
    registrations,
    rejectedRegistrations,
    availableClients,
    availableGroups,
    userAssignments,
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
    loadUsers,
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
    setSelectedGroups,
    handleGroupToggle,

    // Registration Management
    loadRegistrations,
    loadRejectedRegistrations,
    approveRegistration,
    rejectRegistration,
    deleteRegistration,
  };
}
