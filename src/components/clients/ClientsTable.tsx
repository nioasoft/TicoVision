import React from 'react';
import { Edit, Trash2, MoreHorizontal, Users, Star } from 'lucide-react';
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
import type { Client } from '@/services';
import { PAYMENT_ROLE_LABELS } from '@/lib/labels';

interface ClientsTableProps {
  clients: Client[];
  selectedClients: string[];
  loading: boolean;
  onSelectAll: () => void;
  onToggleSelect: (clientId: string) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}

interface ClientRowProps {
  client: Client;
  isSelected: boolean;
  onToggleSelect: (clientId: string) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}

// Memoized row component to prevent unnecessary re-renders
const ClientRow = React.memo<ClientRowProps>(
  ({ client, isSelected, onToggleSelect, onEdit, onDelete }) => {
    const getStatusBadge = (status: string) => {
      const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
        active: 'default',
        inactive: 'secondary',
        pending: 'destructive',
      };
      const labels: Record<string, string> = {
        active: 'פעיל',
        inactive: 'לא פעיל',
        pending: 'ממתין',
      };
      return (
        <Badge variant={variants[status] || 'default'}>
          {labels[status] || status}
        </Badge>
      );
    };

    const getClientTypeLabel = (clientType: string) => {
      const labels: Record<string, string> = {
        company: 'חברה',
        freelancer: 'עצמאי',
        salary_owner: 'בעל שליטה שכיר',
      };
      return labels[clientType] || clientType;
    };

    const getPaymentRoleIcon = (paymentRole: string) => {
      if (paymentRole === 'primary_payer') {
        return <Star className="h-4 w-4 text-yellow-500 inline mr-1" />;
      }
      if (paymentRole === 'member') {
        return <Users className="h-4 w-4 text-blue-500 inline mr-1" />;
      }
      return null;
    };

    return (
      <TableRow key={client.id}>
        <TableCell className="w-12">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(client.id)}
          />
        </TableCell>
        <TableCell className="font-medium min-w-[200px]">
          <div>
            <div>{client.company_name}</div>
            {client.company_name_hebrew && (
              <div className="text-sm text-gray-500">{client.company_name_hebrew}</div>
            )}
          </div>
        </TableCell>
        <TableCell className="w-32">{client.tax_id}</TableCell>
        <TableCell className="w-32">
          {getClientTypeLabel(client.client_type || 'company')}
        </TableCell>
        <TableCell className="w-48">
          {client.group ? (
            <div className="flex items-center gap-1">
              {getPaymentRoleIcon(client.payment_role)}
              <Badge variant="secondary" className="text-xs">
                {client.group.group_name_hebrew || client.group.group_name}
              </Badge>
            </div>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </TableCell>
        <TableCell className="w-36">{client.contact_name}</TableCell>
        <TableCell className="w-32">{client.contact_phone || '-'}</TableCell>
        <TableCell className="w-48">{client.contact_email || '-'}</TableCell>
        <TableCell className="w-24">{getStatusBadge(client.status)}</TableCell>
        <TableCell className="w-32">{formatDate(client.created_at)}</TableCell>
        <TableCell className="w-32 text-left">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(client)}
              className="flex items-center gap-1"
            >
              <Edit className="h-3 w-3" />
              ערוך
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>פעולות נוספות</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => onDelete(client)}
                >
                  <Trash2 className="ml-2 h-4 w-4" />
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

ClientRow.displayName = 'ClientRow';

export const ClientsTable = React.memo<ClientsTableProps>(({
  clients,
  selectedClients,
  loading,
  onSelectAll,
  onToggleSelect,
  onEdit,
  onDelete,
}) => {
  const allSelected = selectedClients.length === clients.length && clients.length > 0;

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox checked={allSelected} onCheckedChange={onSelectAll} />
            </TableHead>
            <TableHead className="min-w-[200px]">שם החברה</TableHead>
            <TableHead className="w-32">ת.ז / ח.פ</TableHead>
            <TableHead className="w-32">סוג לקוח</TableHead>
            <TableHead className="w-48">קבוצה</TableHead>
            <TableHead className="w-36">איש קשר</TableHead>
            <TableHead className="w-32">טלפון</TableHead>
            <TableHead className="w-48">אימייל</TableHead>
            <TableHead className="w-24">סטטוס</TableHead>
            <TableHead className="w-32">תאריך הוספה</TableHead>
            <TableHead className="w-32 text-left">פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center">
                טוען נתונים...
              </TableCell>
            </TableRow>
          ) : clients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center">
                לא נמצאו לקוחות
              </TableCell>
            </TableRow>
          ) : (
            clients.map((client) => (
              <ClientRow
                key={client.id}
                client={client}
                isSelected={selectedClients.includes(client.id)}
                onToggleSelect={onToggleSelect}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
});

ClientsTable.displayName = 'ClientsTable';
