import { useState, useEffect } from "react";
import { logger } from "@/lib/logger";
import { useDebounce } from "@/hooks/useDebounce";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";
import {
  UserPlus,
  UserX,
  Search,
  Edit,
  Trash2,
  Key,
  Mail,
  Phone,
  Shield,
  CheckCircle,
  XCircle,
  Link,
  Building,
  Clock,
  Hash,
  MessageSquare,
  Eye,
} from "lucide-react";
import { userService } from "@/services/user.service";
import type {
  User,
  CreateUserData,
  UpdateUserData,
} from "@/services/user.service";
import type { UserRole } from "@/types/user-role";
import { useAuth } from "@/contexts/AuthContext";
import { registrationService } from "@/services/registration.service";
import { clientService } from "@/services/client.service";
import type { Client } from "@/services/client.service";
import type {
  UserClientAssignment,
  PendingRegistration,
} from "@/services/registration.service";

export function UsersPage() {
  const { toast: uiToast } = useToast();
  const { role: currentUserRole, user, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [registrations, setRegistrations] = useState<PendingRegistration[]>([]);
  const [rejectedRegistrations, setRejectedRegistrations] = useState<PendingRegistration[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | "all">("all");
  const [registrationSearchTerm, setRegistrationSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"pending" | "all">(
    "pending",
  );

  // Debounce search terms to reduce re-renders
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const debouncedRegistrationSearchTerm = useDebounce(registrationSearchTerm, 300);

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showAssignClientsDialog, setShowAssignClientsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Registration dialogs
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRegistration, setSelectedRegistration] =
    useState<PendingRegistration | null>(null);

  // Approval form state
  const [rejectionReason, setRejectionReason] = useState("");

  // Client assignment states
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [userAssignments, setUserAssignments] = useState<
    UserClientAssignment[]
  >([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [primaryClientId, setPrimaryClientId] = useState<string | undefined>();
  const [clientSearchTerm, setClientSearchTerm] = useState("");

  // Debounce client search term
  const debouncedClientSearchTerm = useDebounce(clientSearchTerm, 300);

  // Form data
  const [formData, setFormData] = useState<CreateUserData>({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "client",
  });
  const [newPassword, setNewPassword] = useState("");

  // Check if current user can manage users
  const canManage = currentUserRole === "admin";

  useEffect(() => {
    // Don't load data while auth is loading or if no user
    if (!authLoading && user) {
      loadUsers();
      loadClients();
      loadRegistrations();
      loadRejectedRegistrations();
    }
  }, [statusFilter, user, authLoading]);

  const loadUsers = async () => {
    setLoading(true);
    const response = await userService.getUsers();
    if (response.error) {
      uiToast({
        title: "שגיאה",
        description: "לא ניתן לטעון את רשימת המשתמשים",
        variant: "destructive",
      });
    } else if (response.data) {
      setUsers(response.data.users);
    }
    setLoading(false);
  };

  const loadRegistrations = async () => {
    const response =
      statusFilter === "pending"
        ? await registrationService.getPendingRegistrations()
        : await registrationService.getAllRegistrations();

    if (response.error) {
      toast.error("שגיאה בטעינת בקשות ההרשמה");
    } else if (response.data) {
      setRegistrations(response.data);
      const pending = response.data.filter((r) => r.status === "pending");
      setPendingCount(pending.length);
    }
  };

  const loadClients = async () => {
    const response = await clientService.getClients();
    if (response.data) {
      setAvailableClients(response.data.clients);
    }
  };

  const loadRejectedRegistrations = async () => {
    const response = await registrationService.getRejectedRegistrations();
    if (response.error) {
      toast.error("שגיאה בטעינת בקשות נדחות");
    } else if (response.data) {
      setRejectedRegistrations(response.data);
      setRejectedCount(response.data.length);
    }
  };

  const loadUserAssignments = async (userId: string) => {
    const response = await registrationService.getUserClientAssignments(userId);
    if (response.data) {
      setUserAssignments(response.data);
      setSelectedClients(response.data.map((a) => a.client_id));
      const primary = response.data.find((a) => a.is_primary);
      setPrimaryClientId(primary?.client_id);
    }
  };

  const handleAddUser = async () => {
    if (!formData.email || !formData.password || !formData.full_name) {
      uiToast({
        title: "שגיאה",
        description: "נא למלא את כל השדות החובה",
        variant: "destructive",
      });
      return;
    }

    const response = await userService.createUser(formData);
    if (response.error) {
      uiToast({
        title: "שגיאה",
        description: response.error.message,
        variant: "destructive",
      });
    } else {
      uiToast({
        title: "הצלחה",
        description: "המשתמש נוסף בהצלחה",
      });
      setShowAddDialog(false);
      setFormData({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        role: "client",
      });
      loadUsers();
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    const updates: UpdateUserData = {
      full_name: formData.full_name,
      phone: formData.phone,
      role: formData.role,
    };

    const response = await userService.updateUser(selectedUser.id, updates);
    if (response.error) {
      uiToast({
        title: "שגיאה",
        description: response.error.message,
        variant: "destructive",
      });
    } else {
      uiToast({
        title: "הצלחה",
        description: "פרטי המשתמש עודכנו בהצלחה",
      });
      setShowEditDialog(false);
      setSelectedUser(null);
      loadUsers();
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("האם אתה בטוח שברצונך למחוק משתמש זה?")) return;

    const response = await userService.deleteUser(userId);
    if (response.error) {
      uiToast({
        title: "שגיאה",
        description: response.error.message,
        variant: "destructive",
      });
    } else {
      uiToast({
        title: "הצלחה",
        description: "המשתמש נמחק בהצלחה",
      });
      loadUsers();
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;

    const response = await userService.resetUserPassword(
      selectedUser.id,
      newPassword,
    );
    if (response.error) {
      uiToast({
        title: "שגיאה",
        description: response.error.message,
        variant: "destructive",
      });
    } else {
      uiToast({
        title: "הצלחה",
        description: "הסיסמה אופסה בהצלחה",
      });
      setShowResetPasswordDialog(false);
      setSelectedUser(null);
      setNewPassword("");
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: "",
      full_name: user.full_name,
      phone: user.phone || "",
      role: user.role,
    });
    setShowEditDialog(true);
  };

  const openResetPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setNewPassword("");
    setShowResetPasswordDialog(true);
  };

  const openAssignClientsDialog = async (user: User) => {
    setSelectedUser(user);
    setSelectedClients([]);
    setPrimaryClientId(undefined);
    setClientSearchTerm("");

    // Load user's current assignments
    await loadUserAssignments(user.id);

    setShowAssignClientsDialog(true);
  };

  const handleAssignClients = async () => {
    if (!selectedUser) return;

    const response = await registrationService.assignClientsToUser(
      selectedUser.id,
      selectedClients,
      primaryClientId,
    );

    if (response.error) {
      uiToast({
        title: "שגיאה",
        description: "לא ניתן לעדכן שיוכי לקוחות",
        variant: "destructive",
      });
    } else {
      uiToast({
        title: "הצלחה",
        description: "שיוכי הלקוחות עודכנו בהצלחה",
      });
      setShowAssignClientsDialog(false);
      setSelectedUser(null);
      setSelectedClients([]);
      setPrimaryClientId(undefined);
    }
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients((prev) => {
      const newSelection = prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId];

      // If unselecting primary client, clear primary
      if (!newSelection.includes(clientId) && primaryClientId === clientId) {
        setPrimaryClientId(undefined);
      }

      return newSelection;
    });
  };

  // Registration handling functions
  const handleApprove = async () => {
    if (!selectedRegistration) {
      toast.error("אנא בחר בקשה לאישור");
      return;
    }

    const response = await registrationService.approveRegistration(
      selectedRegistration.id,
      selectedClients,
    );

    if (response.error) {
      toast.error("שגיאה באישור הבקשה");
      logger.error(response.error);
    } else {
      toast.success("הבקשה אושרה בהצלחה! המשתמש יקבל מייל עם קישור להגדרת סיסמה");
      setShowApproveDialog(false);
      setSelectedRegistration(null);
      setSelectedClients([]);
      loadRegistrations();
      loadUsers();
    }
  };

  const handleReject = async () => {
    if (!selectedRegistration || !rejectionReason) {
      toast.error("אנא הזן סיבת דחייה");
      return;
    }

    const response = await registrationService.rejectRegistration(
      selectedRegistration.id,
      rejectionReason,
    );

    if (response.error) {
      toast.error("שגיאה בדחיית הבקשה");
    } else {
      toast.success("הבקשה נדחתה");
      setShowRejectDialog(false);
      setSelectedRegistration(null);
      setRejectionReason("");
      loadRegistrations();
    }
  };

  const openApproveDialog = (registration: PendingRegistration) => {
    setSelectedRegistration(registration);
    setSelectedClients([]);

    // Auto-select client if tax ID matches
    if (registration.requested_role === "client" && registration.tax_id) {
      const matchingClient = availableClients.find(
        (c) => c.tax_id === registration.tax_id,
      );
      if (matchingClient) {
        setSelectedClients([matchingClient.id]);
      }
    }

    setShowApproveDialog(true);
  };

  const openRejectDialog = (registration: PendingRegistration) => {
    setSelectedRegistration(registration);
    setRejectionReason("");
    setShowRejectDialog(true);
  };

  const openDetailsDialog = (registration: PendingRegistration) => {
    setSelectedRegistration(registration);
    setShowDetailsDialog(true);
  };

  const openDeleteDialog = (registration: PendingRegistration) => {
    setSelectedRegistration(registration);
    setShowDeleteDialog(true);
  };

  const handleDeleteRegistration = async () => {
    if (!selectedRegistration) return;

    const response = await registrationService.deleteRegistration(
      selectedRegistration.id
    );

    if (response.error) {
      toast.error("שגיאה במחיקת הבקשה");
    } else {
      toast.success("הבקשה נמחקה בהצלחה! המשתמש יכול כעת להירשם מחדש");
      setShowDeleteDialog(false);
      setSelectedRegistration(null);
      loadRejectedRegistrations();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="text-yellow-600">
            <Clock className="h-3 w-3 ml-1" />
            ממתין
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="text-green-600">
            <CheckCircle className="h-3 w-3 ml-1" />
            אושר
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="text-red-600">
            <XCircle className="h-3 w-3 ml-1" />
            נדחה
          </Badge>
        );
      default:
        return null;
    }
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      client: "לקוח",
      accountant: "רואה חשבון",
      bookkeeper: "מנהלת חשבונות",
      admin: "מנהל מערכת",
    };
    return roleMap[role] || role;
  };

  // Filter users based on search and role
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  // Filter registrations
  const filteredRegistrations = registrations.filter((reg) => {
    const matchesSearch =
      reg.full_name
        .toLowerCase()
        .includes(debouncedRegistrationSearchTerm.toLowerCase()) ||
      reg.email.toLowerCase().includes(debouncedRegistrationSearchTerm.toLowerCase()) ||
      reg.company_name
        ?.toLowerCase()
        .includes(debouncedRegistrationSearchTerm.toLowerCase()) ||
      reg.tax_id?.includes(debouncedRegistrationSearchTerm);
    return matchesSearch;
  });

  // Filter clients for dialog
  const filteredClients = availableClients.filter(
    (client) =>
      client.company_name
        .toLowerCase()
        .includes(debouncedClientSearchTerm.toLowerCase()) ||
      client.company_name_hebrew
        ?.toLowerCase()
        .includes(debouncedClientSearchTerm.toLowerCase()) ||
      client.tax_id.includes(debouncedClientSearchTerm),
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 text-right">
            ניהול משתמשים
          </h1>
          <p className="text-gray-500 mt-1 text-right">
            ניהול הרשאות וגישה למערכת
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowAddDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            הוסף משתמש
          </Button>
        )}
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="text-right">
            משתמשים פעילים
          </TabsTrigger>
          <TabsTrigger value="registrations" className="text-right relative">
            בקשות ממתינות
            {pendingCount > 0 && (
              <Badge
                variant="destructive"
                className="mr-2 absolute -top-1 -left-1"
              >
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-right relative">
            בקשות נדחות
            {rejectedCount > 0 && (
              <Badge
                variant="secondary"
                className="mr-2 absolute -top-1 -left-1"
              >
                {rejectedCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Active Users Tab */}
        <TabsContent value="users" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="חיפוש לפי שם או אימייל..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                </div>
                <Select
                  value={selectedRole}
                  onValueChange={(value) =>
                    setSelectedRole(value as UserRole | "all")
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="סנן לפי תפקיד" />
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
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-right">
                רשימת משתמשים ({filteredUsers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-gray-500">טוען...</p>
              ) : filteredUsers.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  לא נמצאו משתמשים
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">שם מלא</TableHead>
                      <TableHead className="text-right">אימייל</TableHead>
                      <TableHead className="text-right">טלפון</TableHead>
                      <TableHead className="text-right">תפקיד</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-right">כניסה אחרונה</TableHead>
                      {canManage && (
                        <TableHead className="text-right">פעולות</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium text-right">
                          {user.full_name}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            {user.email}
                            <Mail className="h-4 w-4 text-gray-400" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {user.phone && (
                            <div className="flex items-center gap-2 justify-end">
                              {user.phone}
                              <Phone className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              user.role === "admin" ? "default" : "secondary"
                            }
                          >
                            {userService.getRoleDisplayName(user.role)}
                            <Shield className="h-3 w-3 mr-1" />
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {user.is_active ? (
                            <Badge variant="outline" className="text-green-600">
                              פעיל
                              <CheckCircle className="h-3 w-3 mr-1" />
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600">
                              לא פעיל
                              <XCircle className="h-3 w-3 mr-1" />
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {user.last_login
                            ? new Date(user.last_login).toLocaleDateString(
                                "he-IL",
                              )
                            : "טרם התחבר"}
                        </TableCell>
                        {canManage && (
                          <TableCell>
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditDialog(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openResetPasswordDialog(user)}
                              >
                                <Key className="h-4 w-4" />
                              </Button>
                              {user.role !== "admin" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => openAssignClientsDialog(user)}
                                  title="ניהול שיוכי לקוחות"
                                >
                                  <Link className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Registrations Tab */}
        <TabsContent value="registrations" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="חיפוש לפי שם, אימייל, חברה או מספר ח.פ..."
                      value={registrationSearchTerm}
                      onChange={(e) =>
                        setRegistrationSearchTerm(e.target.value)
                      }
                      className="pr-10"
                    />
                  </div>
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value as "pending" | "all")
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">ממתינות בלבד</SelectItem>
                    <SelectItem value="all">כל הבקשות</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Registrations Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-right">
                רשימת בקשות ({filteredRegistrations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-gray-500">טוען...</p>
              ) : filteredRegistrations.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  אין בקשות הרשמה
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">שם מלא</TableHead>
                      <TableHead className="text-right">אימייל</TableHead>
                      <TableHead className="text-right">תפקיד מבוקש</TableHead>
                      <TableHead className="text-right">חברה/משרד</TableHead>
                      <TableHead className="text-right">תאריך הגשה</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-right">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRegistrations.map((reg) => (
                      <TableRow key={reg.id}>
                        <TableCell className="font-medium text-right">
                          {reg.full_name}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            {reg.email}
                            <Mail className="h-4 w-4 text-gray-400" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">
                            {getRoleDisplayName(reg.requested_role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {reg.company_name && (
                            <div className="flex items-center gap-2 justify-end">
                              {reg.company_name}
                              <Building className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                          {reg.tax_id && (
                            <div className="flex items-center gap-2 text-sm text-gray-500 justify-end">
                              {reg.tax_id}
                              <Hash className="h-3 w-3" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {new Date(reg.created_at).toLocaleDateString("he-IL")}
                        </TableCell>
                        <TableCell className="text-right">
                          {getStatusBadge(reg.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDetailsDialog(reg)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {reg.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-green-600"
                                  onClick={() => openApproveDialog(reg)}
                                >
                                  <UserPlus className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-600"
                                  onClick={() => openRejectDialog(reg)}
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rejected Registrations Tab */}
        <TabsContent value="rejected" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-right">
                בקשות נדחות ({rejectedRegistrations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center py-8 text-gray-500">טוען...</p>
              ) : rejectedRegistrations.length === 0 ? (
                <p className="text-center py-8 text-gray-500">
                  אין בקשות נדחות
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">שם מלא</TableHead>
                      <TableHead className="text-right">אימייל</TableHead>
                      <TableHead className="text-right">תפקיד מבוקש</TableHead>
                      <TableHead className="text-right">תאריך הגשה</TableHead>
                      <TableHead className="text-right">תאריך דחייה</TableHead>
                      <TableHead className="text-right">סיבת דחייה</TableHead>
                      <TableHead className="text-right">פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rejectedRegistrations.map((reg) => (
                      <TableRow key={reg.id}>
                        <TableCell className="font-medium text-right">
                          {reg.full_name}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            {reg.email}
                            <Mail className="h-4 w-4 text-gray-400" />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary">
                            {getRoleDisplayName(reg.requested_role)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {new Date(reg.created_at).toLocaleDateString("he-IL")}
                        </TableCell>
                        <TableCell className="text-right">
                          {reg.approved_at
                            ? new Date(reg.approved_at).toLocaleDateString("he-IL")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right max-w-xs">
                          <div className="truncate" title={reg.rejection_reason || "-"}>
                            {reg.rejection_reason || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDetailsDialog(reg)}
                              title="הצג פרטים"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              onClick={() => openDeleteDialog(reg)}
                              title="מחק לצמיתות"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הוספת משתמש חדש</DialogTitle>
            <DialogDescription>הזן את פרטי המשתמש החדש</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">אימייל *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">סיסמה *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="full_name">שם מלא *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">טלפון</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">תפקיד *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value as UserRole })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">מנהל מערכת</SelectItem>
                  <SelectItem value="accountant">רואה חשבון</SelectItem>
                  <SelectItem value="bookkeeper">מנהלת חשבונות</SelectItem>
                  <SelectItem value="client">לקוח</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleAddUser}>הוסף משתמש</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>עריכת משתמש</DialogTitle>
            <DialogDescription>עדכן את פרטי המשתמש</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_full_name">שם מלא</Label>
              <Input
                id="edit_full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_phone">טלפון</Label>
              <Input
                id="edit_phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_role">תפקיד</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value as UserRole })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">מנהל מערכת</SelectItem>
                  <SelectItem value="accountant">רואה חשבון</SelectItem>
                  <SelectItem value="bookkeeper">מנהלת חשבונות</SelectItem>
                  <SelectItem value="client">לקוח</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleUpdateUser}>עדכן</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={showResetPasswordDialog}
        onOpenChange={setShowResetPasswordDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>איפוס סיסמה</DialogTitle>
            <DialogDescription>
              הזן סיסמה חדשה עבור {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="new_password">סיסמה חדשה</Label>
              <Input
                id="new_password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetPasswordDialog(false)}
            >
              ביטול
            </Button>
            <Button onClick={handleResetPassword}>אפס סיסמה</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Clients Dialog */}
      <Dialog
        open={showAssignClientsDialog}
        onOpenChange={setShowAssignClientsDialog}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>ניהול שיוכי לקוחות</DialogTitle>
            <DialogDescription>
              בחר לקוחות עבור {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>חיפוש לקוחות</Label>
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="חיפוש לפי שם או מספר ח.פ..."
                  value={clientSearchTerm}
                  onChange={(e) => setClientSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>לקוחות זמינים</Label>
              <div className="border rounded-md max-h-80 overflow-y-auto p-2 space-y-2">
                {availableClients
                  .filter(
                    (client) =>
                      client.company_name
                        .toLowerCase()
                        .includes(debouncedClientSearchTerm.toLowerCase()) ||
                      client.company_name_hebrew
                        ?.toLowerCase()
                        .includes(debouncedClientSearchTerm.toLowerCase()) ||
                      client.tax_id.includes(debouncedClientSearchTerm),
                  )
                  .map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded"
                    >
                      <Checkbox
                        id={`assign-client-${client.id}`}
                        checked={selectedClients.includes(client.id)}
                        onCheckedChange={() => toggleClientSelection(client.id)}
                      />
                      <Label
                        htmlFor={`assign-client-${client.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium">
                              {client.company_name}
                              {client.company_name_hebrew && (
                                <span className="text-gray-500 mr-2">
                                  ({client.company_name_hebrew})
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              ח.פ: {client.tax_id}
                            </div>
                          </div>
                        </div>
                      </Label>
                      {selectedClients.includes(client.id) &&
                        selectedUser?.role === "accountant" && (
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="primary-client"
                              checked={primaryClientId === client.id}
                              onChange={() => setPrimaryClientId(client.id)}
                              className="h-4 w-4"
                            />
                            <Label className="text-sm">ראשי</Label>
                          </div>
                        )}
                    </div>
                  ))}
                {availableClients.filter(
                  (client) =>
                    client.company_name
                      .toLowerCase()
                      .includes(debouncedClientSearchTerm.toLowerCase()) ||
                    client.tax_id.includes(debouncedClientSearchTerm),
                ).length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    לא נמצאו לקוחות
                  </p>
                )}
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-700">
                <strong>לקוחות נבחרים:</strong> {selectedClients.length}
                {primaryClientId && (
                  <span className="mr-2">
                    (לקוח ראשי:{" "}
                    {
                      availableClients.find((c) => c.id === primaryClientId)
                        ?.company_name
                    }
                    )
                  </span>
                )}
              </p>
            </div>

            {userAssignments.length > 0 && (
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="text-sm text-gray-700">
                  <strong>שיוכים נוכחיים:</strong>
                </p>
                <ul className="text-sm text-gray-600 mt-1">
                  {userAssignments.map((assignment) => (
                    <li key={assignment.id}>
                      • {assignment.client?.company_name}
                      {assignment.is_primary && " (ראשי)"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAssignClientsDialog(false)}
            >
              ביטול
            </Button>
            <Button onClick={handleAssignClients}>שמור שיוכים</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">אישור בקשת הרשמה</DialogTitle>
            <DialogDescription className="text-right">
              אישור הבקשה של {selectedRegistration?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="bg-blue-50 p-4 rounded-md mb-4">
              <p className="text-sm text-blue-700 text-right">
                <strong>שים לב:</strong> המשתמש יקבל מייל עם קישור להגדרת סיסמה. לאחר הגדרת הסיסמה יוכל להתחבר למערכת.
              </p>
            </div>

            {selectedRegistration?.requested_role !== "admin" && (
              <div className="grid gap-2">
                <Label className="text-right">שיוך ללקוחות</Label>
                <div className="relative mb-2">
                  <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="חיפוש לקוחות..."
                    value={clientSearchTerm}
                    onChange={(e) => setClientSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <div className="border rounded-md max-h-60 overflow-y-auto p-2 space-y-2">
                  {filteredClients.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-2">
                      אין לקוחות זמינים
                    </p>
                  ) : (
                    filteredClients.map((client) => (
                      <div
                        key={client.id}
                        className="flex items-center space-x-2 space-x-reverse hover:bg-gray-50 p-2 rounded"
                      >
                        <Checkbox
                          id={`client-${client.id}`}
                          checked={selectedClients.includes(client.id)}
                          onCheckedChange={() =>
                            toggleClientSelection(client.id)
                          }
                        />
                        <Label
                          htmlFor={`client-${client.id}`}
                          className="flex-1 cursor-pointer text-right"
                        >
                          <div>
                            <span className="font-medium">
                              {client.company_name}
                            </span>
                            {client.company_name_hebrew && (
                              <span className="text-gray-500 mr-2">
                                ({client.company_name_hebrew})
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            ח.פ: {client.tax_id}
                          </div>
                        </Label>
                      </div>
                    ))
                  )}
                </div>
                {selectedRegistration?.requested_role === "client" &&
                  selectedRegistration?.tax_id && (
                    <p className="text-sm text-blue-600 text-right">
                      {selectedClients.length > 0
                        ? `נמצאה התאמה אוטומטית לפי מספר ח.פ ${selectedRegistration.tax_id}`
                        : `לא נמצאה התאמה למספר ח.פ ${selectedRegistration.tax_id}`}
                    </p>
                  )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproveDialog(false)}
            >
              ביטול
            </Button>
            <Button onClick={handleApprove}>
              אשר בקשה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">דחיית בקשת הרשמה</DialogTitle>
            <DialogDescription className="text-right">
              דחיית הבקשה של {selectedRegistration?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rejection-reason" className="text-right">
                סיבת הדחייה *
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="הזן את הסיבה לדחיית הבקשה..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
            >
              ביטול
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason}
            >
              דחה בקשה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">פרטי בקשת הרשמה</DialogTitle>
          </DialogHeader>

          {selectedRegistration && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 text-right">שם מלא</Label>
                  <p className="font-medium text-right">
                    {selectedRegistration.full_name}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500 text-right">אימייל</Label>
                  <p className="font-medium text-right">
                    {selectedRegistration.email}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500 text-right">טלפון</Label>
                  <p className="font-medium text-right">
                    {selectedRegistration.phone || "-"}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500 text-right">
                    תפקיד מבוקש
                  </Label>
                  <p className="font-medium text-right">
                    {getRoleDisplayName(selectedRegistration.requested_role)}
                  </p>
                </div>
                {selectedRegistration.company_name && (
                  <div>
                    <Label className="text-gray-500 text-right">
                      חברה/משרד
                    </Label>
                    <p className="font-medium text-right">
                      {selectedRegistration.company_name}
                    </p>
                  </div>
                )}
                {selectedRegistration.tax_id && (
                  <div>
                    <Label className="text-gray-500 text-right">מספר ח.פ</Label>
                    <p className="font-medium text-right">
                      {selectedRegistration.tax_id}
                    </p>
                  </div>
                )}
              </div>

              {selectedRegistration.message && (
                <div>
                  <Label className="text-gray-500 text-right">הודעה</Label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-md text-right">
                    {selectedRegistration.message}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500 text-right">תאריך הגשה</Label>
                  <p className="font-medium text-right">
                    {new Date(selectedRegistration.created_at).toLocaleString(
                      "he-IL",
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500 text-right">סטטוס</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedRegistration.status)}
                  </div>
                </div>
              </div>

              {selectedRegistration.rejection_reason && (
                <div>
                  <Label className="text-gray-500 text-right">סיבת דחייה</Label>
                  <p className="mt-1 p-3 bg-red-50 rounded-md text-red-700 text-right">
                    {selectedRegistration.rejection_reason}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDetailsDialog(false)}
            >
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">מחיקת בקשה לצמיתות</DialogTitle>
            <DialogDescription className="text-right">
              האם אתה בטוח שברצונך למחוק את הבקשה של {selectedRegistration?.full_name}?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-yellow-50 p-4 rounded-md">
            <p className="text-sm text-yellow-800 text-right">
              <strong>שים לב:</strong> פעולה זו תמחק לצמיתות את הבקשה מהמערכת.
              המשתמש יוכל להירשם מחדש עם כתובת הדוא"ל הזו.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              ביטול
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRegistration}
            >
              מחק לצמיתות
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
