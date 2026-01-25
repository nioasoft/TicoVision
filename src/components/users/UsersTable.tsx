import React from 'react';
import { Edit, Trash2, MoreHorizontal, KeyRound, Users, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/utils';
import type { User } from '@/services/user.service';
import type { UserRole } from '@/types/user-role';

interface UsersTableProps {
  users: User[];
  loading: boolean;
  searchTerm: string;
  selectedRole: UserRole | 'all';
  onSearchChange: (term: string) => void;
  onRoleChange: (role: UserRole | 'all') => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onResetPassword: (user: User) => void;
  onAssignClients: (user: User) => void;
}

interface UserRowProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onResetPassword: (user: User) => void;
  onAssignClients: (user: User) => void;
}

// Memoized row component to prevent unnecessary re-renders
const UserRow = React.memo<UserRowProps>(
  ({ user, onEdit, onDelete, onResetPassword, onAssignClients }) => {
    const getStatusBadge = (isActive: boolean) => {
      return (
        <Badge variant={isActive ? 'default' : 'secondary'}>
          {isActive ? 'פעיל' : 'לא פעיל'}
        </Badge>
      );
    };

    const getRoleLabel = (role: string) => {
      const labels: Record<string, string> = {
        admin: 'מנהל מערכת',
        accountant: 'רואה חשבון',
        bookkeeper: 'מנהלת חשבונות',
        client: 'לקוח',
      };
      return labels[role] || role;
    };

    return (
      <TableRow key={user.id}>
        <TableCell className="font-medium w-48 text-right">
          {user.full_name}
        </TableCell>
        <TableCell className="w-48 text-right">{user.email}</TableCell>
        <TableCell className="w-32 text-right">{user.phone || '-'}</TableCell>
        <TableCell className="w-32 text-right">{getRoleLabel(user.role)}</TableCell>
        <TableCell className="w-24 text-right">{getStatusBadge(user.is_active)}</TableCell>
        <TableCell className="w-32 text-right">
          {user.last_login ? formatDate(user.last_login) : 'אף פעם'}
        </TableCell>
        <TableCell className="w-32 text-right">
          <div className="flex gap-2 rtl:flex-row-reverse ltr:flex-row">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(user)}
              className="flex items-center gap-1"
            >
              <Edit className="h-3 w-3" />
              <span className="rtl:mr-1 ltr:ml-1">ערוך</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" dir="rtl">
                <DropdownMenuLabel className="rtl:text-right ltr:text-left">פעולות נוספות</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onResetPassword(user)}
                  className="rtl:text-right ltr:text-left"
                >
                  <KeyRound className="rtl:ml-2 ltr:mr-2 h-4 w-4" />
                  איפוס סיסמה
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAssignClients(user)}
                  className="rtl:text-right ltr:text-left"
                >
                  <Users className="rtl:ml-2 ltr:mr-2 h-4 w-4" />
                  שיוך לקוחות
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 rtl:text-right ltr:text-left"
                  onClick={() => onDelete(user)}
                >
                  <Trash2 className="rtl:ml-2 ltr:mr-2 h-4 w-4" />
                  מחק
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>
    );
  }
);

UserRow.displayName = 'UserRow';

export const UsersTable = React.memo<UsersTableProps>(({
  users,
  loading,
  searchTerm,
  selectedRole,
  onSearchChange,
  onRoleChange,
  onEdit,
  onDelete,
  onResetPassword,
  onAssignClients,
}) => {
  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex gap-3 items-center flex-row-reverse">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input

            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pr-10"
            dir="rtl"
          />
        </div>
        <Select value={selectedRole} onValueChange={(value) => onRoleChange(value as UserRole | 'all')}>
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

      {/* Table */}
      <div className="border rounded-lg" dir="rtl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-48 text-right">שם מלא</TableHead>
              <TableHead className="w-48 text-right">אימייל</TableHead>
              <TableHead className="w-32 text-right">טלפון</TableHead>
              <TableHead className="w-32 text-right">תפקיד</TableHead>
              <TableHead className="w-24 text-right">סטטוס</TableHead>
              <TableHead className="w-32 text-right">כניסה אחרונה</TableHead>
              <TableHead className="w-32 text-left">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  טוען נתונים...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  לא נמצאו משתמשים
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onResetPassword={onResetPassword}
                  onAssignClients={onAssignClients}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
});

UsersTable.displayName = 'UsersTable';
