import React from 'react';
import { Edit, Trash2, MoreHorizontal, KeyRound, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/utils';
import type { User } from '@/services/user.service';

interface UsersTableProps {
  users: User[];
  selectedUsers: string[];
  loading: boolean;
  onSelectAll: () => void;
  onToggleSelect: (userId: string) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onResetPassword: (user: User) => void;
  onAssignClients: (user: User) => void;
}

interface UserRowProps {
  user: User;
  isSelected: boolean;
  onToggleSelect: (userId: string) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  onResetPassword: (user: User) => void;
  onAssignClients: (user: User) => void;
}

// Memoized row component to prevent unnecessary re-renders
const UserRow = React.memo<UserRowProps>(
  ({ user, isSelected, onToggleSelect, onEdit, onDelete, onResetPassword, onAssignClients }) => {
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
        <TableCell className="w-12">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(user.id)}
          />
        </TableCell>
        <TableCell className="font-medium min-w-[180px] rtl:text-right ltr:text-left">
          {user.full_name}
        </TableCell>
        <TableCell className="w-48 rtl:text-right ltr:text-left">{user.email}</TableCell>
        <TableCell className="w-32 rtl:text-right ltr:text-left">{user.phone || '-'}</TableCell>
        <TableCell className="w-32 rtl:text-right ltr:text-left">{getRoleLabel(user.role)}</TableCell>
        <TableCell className="w-24 rtl:text-right ltr:text-left">{getStatusBadge(user.is_active)}</TableCell>
        <TableCell className="w-32 rtl:text-right ltr:text-left">
          {user.last_login ? formatDate(user.last_login) : 'אף פעם'}
        </TableCell>
        <TableCell className="w-32 rtl:text-right ltr:text-left">
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
  selectedUsers,
  loading,
  onSelectAll,
  onToggleSelect,
  onEdit,
  onDelete,
  onResetPassword,
  onAssignClients,
}) => {
  const allSelected = selectedUsers.length === users.length && users.length > 0;

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox checked={allSelected} onCheckedChange={onSelectAll} />
            </TableHead>
            <TableHead className="min-w-[180px] rtl:text-right ltr:text-left">שם מלא</TableHead>
            <TableHead className="w-48 rtl:text-right ltr:text-left">אימייל</TableHead>
            <TableHead className="w-32 rtl:text-right ltr:text-left">טלפון</TableHead>
            <TableHead className="w-32 rtl:text-right ltr:text-left">תפקיד</TableHead>
            <TableHead className="w-24 rtl:text-right ltr:text-left">סטטוס</TableHead>
            <TableHead className="w-32 rtl:text-right ltr:text-left">כניסה אחרונה</TableHead>
            <TableHead className="w-32 rtl:text-right ltr:text-left">פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center rtl:text-right ltr:text-left">
                טוען נתונים...
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center rtl:text-right ltr:text-left">
                לא נמצאו משתמשים
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isSelected={selectedUsers.includes(user.id)}
                onToggleSelect={onToggleSelect}
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
  );
});

UsersTable.displayName = 'UsersTable';
