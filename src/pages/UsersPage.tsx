import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { 
  UserPlus, 
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
  Building
} from 'lucide-react';
import { userService } from '@/services/user.service';
import type { User, CreateUserData, UpdateUserData } from '@/services/user.service';
import type { UserRole } from '@/types/user-role';
import { useAuth } from '@/contexts/AuthContext';
import { registrationService } from '@/services/registration.service';
import { clientService } from '@/services/client.service';
import type { Client } from '@/services/client.service';
import type { UserClientAssignment } from '@/services/registration.service';

export function UsersPage() {
  const { toast } = useToast();
  const { role: currentUserRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showAssignClientsDialog, setShowAssignClientsDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Client assignment states
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [userAssignments, setUserAssignments] = useState<UserClientAssignment[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [primaryClientId, setPrimaryClientId] = useState<string | undefined>();
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  
  // Form data
  const [formData, setFormData] = useState<CreateUserData>({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'client',
  });
  const [newPassword, setNewPassword] = useState('');

  // Check if current user can manage users
  const canManage = currentUserRole === 'admin';

  useEffect(() => {
    loadUsers();
    loadClients();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    const response = await userService.getUsers();
    if (response.error) {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לטעון את רשימת המשתמשים',
        variant: 'destructive',
      });
    } else if (response.data) {
      setUsers(response.data.users);
    }
    setLoading(false);
  };

  const loadClients = async () => {
    const response = await clientService.getClients();
    if (response.data) {
      setAvailableClients(response.data.clients);
    }
  };

  const loadUserAssignments = async (userId: string) => {
    const response = await registrationService.getUserClientAssignments(userId);
    if (response.data) {
      setUserAssignments(response.data);
      setSelectedClients(response.data.map(a => a.client_id));
      const primary = response.data.find(a => a.is_primary);
      setPrimaryClientId(primary?.client_id);
    }
  };

  const handleAddUser = async () => {
    if (!formData.email || !formData.password || !formData.full_name) {
      toast({
        title: 'שגיאה',
        description: 'נא למלא את כל השדות החובה',
        variant: 'destructive',
      });
      return;
    }

    const response = await userService.createUser(formData);
    if (response.error) {
      toast({
        title: 'שגיאה',
        description: response.error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'הצלחה',
        description: 'המשתמש נוסף בהצלחה',
      });
      setShowAddDialog(false);
      setFormData({
        email: '',
        password: '',
        full_name: '',
        phone: '',
        role: 'client',
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
      toast({
        title: 'שגיאה',
        description: response.error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'הצלחה',
        description: 'פרטי המשתמש עודכנו בהצלחה',
      });
      setShowEditDialog(false);
      setSelectedUser(null);
      loadUsers();
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק משתמש זה?')) return;

    const response = await userService.deleteUser(userId);
    if (response.error) {
      toast({
        title: 'שגיאה',
        description: response.error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'הצלחה',
        description: 'המשתמש נמחק בהצלחה',
      });
      loadUsers();
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;

    const response = await userService.resetUserPassword(selectedUser.id, newPassword);
    if (response.error) {
      toast({
        title: 'שגיאה',
        description: response.error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'הצלחה',
        description: 'הסיסמה אופסה בהצלחה',
      });
      setShowResetPasswordDialog(false);
      setSelectedUser(null);
      setNewPassword('');
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: '',
      full_name: user.full_name,
      phone: user.phone || '',
      role: user.role,
    });
    setShowEditDialog(true);
  };

  const openResetPasswordDialog = (user: User) => {
    setSelectedUser(user);
    setNewPassword('');
    setShowResetPasswordDialog(true);
  };

  const openAssignClientsDialog = async (user: User) => {
    setSelectedUser(user);
    setSelectedClients([]);
    setPrimaryClientId(undefined);
    setClientSearchTerm('');
    
    // Load user's current assignments
    await loadUserAssignments(user.id);
    
    setShowAssignClientsDialog(true);
  };

  const handleAssignClients = async () => {
    if (!selectedUser) return;

    const response = await registrationService.assignClientsToUser(
      selectedUser.id,
      selectedClients,
      primaryClientId
    );

    if (response.error) {
      toast({
        title: 'שגיאה',
        description: 'לא ניתן לעדכן שיוכי לקוחות',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'הצלחה',
        description: 'שיוכי הלקוחות עודכנו בהצלחה',
      });
      setShowAssignClientsDialog(false);
      setSelectedUser(null);
      setSelectedClients([]);
      setPrimaryClientId(undefined);
    }
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => {
      const newSelection = prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId];
      
      // If unselecting primary client, clear primary
      if (!newSelection.includes(clientId) && primaryClientId === clientId) {
        setPrimaryClientId(undefined);
      }
      
      return newSelection;
    });
  };

  // Filter users based on search and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ניהול משתמשים</h1>
          <p className="text-gray-500 mt-1">ניהול הרשאות וגישה למערכת</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowAddDialog(true)}>
            <UserPlus className="h-4 w-4 ml-2" />
            הוסף משתמש
          </Button>
        )}
      </div>

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
              onValueChange={(value) => setSelectedRole(value as UserRole | 'all')}
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
          <CardTitle>רשימת משתמשים ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-gray-500">טוען...</p>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center py-8 text-gray-500">לא נמצאו משתמשים</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם מלא</TableHead>
                  <TableHead>אימייל</TableHead>
                  <TableHead>טלפון</TableHead>
                  <TableHead>תפקיד</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>כניסה אחרונה</TableHead>
                  {canManage && <TableHead>פעולות</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {user.phone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        <Shield className="h-3 w-3 ml-1" />
                        {userService.getRoleDisplayName(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.is_active ? (
                        <Badge variant="outline" className="text-green-600">
                          <CheckCircle className="h-3 w-3 ml-1" />
                          פעיל
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600">
                          <XCircle className="h-3 w-3 ml-1" />
                          לא פעיל
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.last_login 
                        ? new Date(user.last_login).toLocaleDateString('he-IL')
                        : 'טרם התחבר'}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        <div className="flex gap-2">
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
                          {user.role !== 'admin' && (
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

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הוספת משתמש חדש</DialogTitle>
            <DialogDescription>
              הזן את פרטי המשתמש החדש
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">אימייל *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">סיסמה *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="full_name">שם מלא *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">טלפון</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">תפקיד *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
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
            <DialogDescription>
              עדכן את פרטי המשתמש
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit_full_name">שם מלא</Label>
              <Input
                id="edit_full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_phone">טלפון</Label>
              <Input
                id="edit_phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_role">תפקיד</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as UserRole })}
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
      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
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
            <Button variant="outline" onClick={() => setShowResetPasswordDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleResetPassword}>אפס סיסמה</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Clients Dialog */}
      <Dialog open={showAssignClientsDialog} onOpenChange={setShowAssignClientsDialog}>
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
                  .filter(client => 
                    client.company_name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                    client.company_name_hebrew?.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                    client.tax_id.includes(clientSearchTerm)
                  )
                  .map((client) => (
                    <div key={client.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
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
                                <span className="text-gray-500 mr-2">({client.company_name_hebrew})</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              ח.פ: {client.tax_id}
                            </div>
                          </div>
                        </div>
                      </Label>
                      {selectedClients.includes(client.id) && selectedUser?.role === 'accountant' && (
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
                {availableClients.filter(client => 
                  client.company_name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
                  client.tax_id.includes(clientSearchTerm)
                ).length === 0 && (
                  <p className="text-center text-gray-500 py-4">לא נמצאו לקוחות</p>
                )}
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-md">
              <p className="text-sm text-blue-700">
                <strong>לקוחות נבחרים:</strong> {selectedClients.length}
                {primaryClientId && (
                  <span className="mr-2">
                    (לקוח ראשי: {availableClients.find(c => c.id === primaryClientId)?.company_name})
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
                  {userAssignments.map(assignment => (
                    <li key={assignment.id}>
                      • {assignment.client?.company_name}
                      {assignment.is_primary && ' (ראשי)'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignClientsDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleAssignClients}>
              שמור שיוכים
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}