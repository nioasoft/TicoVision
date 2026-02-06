import React from 'react';
import { Edit, Trash2, MoreHorizontal, MessageCircle, Mail, FolderOpen, Palette } from 'lucide-react';
import { ClientBalanceBadge } from '@/modules/annual-balance/components/ClientBalanceBadge';
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
import { usePermissions } from '@/hooks/usePermissions';

interface ClientsTableProps {
  clients: Client[];
  selectedClients: string[];
  loading: boolean;
  isAdmin?: boolean;
  onSelectAll: () => void;
  onToggleSelect: (clientId: string) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onGroupFilter?: (groupId: string) => void;
}

interface ClientRowProps {
  client: Client;
  isSelected: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onToggleSelect: (clientId: string) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onGroupFilter?: (groupId: string) => void;
}

// Memoized row component to prevent unnecessary re-renders
const ClientRow = React.memo<ClientRowProps>(
  ({ client, isSelected, canEdit, canDelete, onToggleSelect, onEdit, onDelete, onGroupFilter }) => {
    const getStatusBadge = (status: string) => {
      // Adhoc clients have a special purple badge
      if (status === 'adhoc') {
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            חד-פעמי
          </Badge>
        );
      }

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

    return (
      <TableRow key={client.id}>
        <TableCell className="w-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(client.id)}
          />
        </TableCell>
        <TableCell className="font-medium flex-1 min-w-[150px]">
          <div
            onClick={() => onEdit(client)}
            className="cursor-pointer hover:text-blue-600 transition-colors"
          >
            <div>{client.company_name}</div>
            {client.company_name_hebrew && (
              <div className="text-sm text-gray-500">{client.company_name_hebrew}</div>
            )}
          </div>
        </TableCell>
        <TableCell className="w-24">{client.tax_id}</TableCell>
        <TableCell className="w-32 hidden">
          {getClientTypeLabel(client.client_type || 'company')}
        </TableCell>
        <TableCell className="w-32">
          {client.group ? (
            <Badge
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-gray-300 transition-colors"
              onClick={() => onGroupFilter?.(client.group_id!)}
            >
              {client.group.group_name_hebrew || client.group.group_name}
            </Badge>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </TableCell>
        <TableCell className="w-28">{client.contact_name}</TableCell>
        <TableCell className="w-32 align-top">
          {client.contact_phone ? (
            <a
              href={`https://wa.me/972${client.contact_phone.replace(/^0/, '').replace(/-/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
              dir="ltr"
              title="שלח הודעת וואטסאפ"
            >
              <MessageCircle className="h-4 w-4" />
              {client.contact_phone}
            </a>
          ) : (
            '-'
          )}
        </TableCell>
        <TableCell className="flex-1 min-w-[180px] align-top">
          {client.contact_email ? (
            <a
              href={`mailto:${client.contact_email}`}
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
              dir="ltr"
              title="שלח מייל"
            >
              <Mail className="h-4 w-4" />
              {client.contact_email}
            </a>
          ) : (
            '-'
          )}
        </TableCell>
        <TableCell className="w-12">
          {client.google_drive_link && (
            <a
              href={client.google_drive_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-700 transition-colors"
              title="Google Drive"
            >
              <FolderOpen className="h-4 w-4" />
            </a>
          )}
        </TableCell>
        <TableCell className="w-12">
          {client.canva_link && (
            <a
              href={client.canva_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-700 transition-colors"
              title="Canva"
            >
              <Palette className="h-4 w-4" />
            </a>
          )}
        </TableCell>
        <TableCell className="w-20">{getStatusBadge(client.status)}</TableCell>
        <TableCell className="w-20">
          {(client.client_type === 'company' || client.client_type === 'partnership') && (
            <ClientBalanceBadge clientId={client.id} />
          )}
        </TableCell>
        <TableCell className="w-16 text-left">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>פעולות</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(client)}>
                <Edit className="ml-2 h-4 w-4" />
                {canEdit ? 'ערוך' : 'צפה'}
              </DropdownMenuItem>
              {canDelete && (
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => onDelete(client)}
                >
                  <Trash2 className="ml-2 h-4 w-4" />
                  מחק
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
  isAdmin,
  onSelectAll,
  onToggleSelect,
  onEdit,
  onDelete,
  onGroupFilter,
}) => {
  const { isMenuVisible } = usePermissions();
  const canEdit = isMenuVisible('clients:edit');
  const canDelete = isMenuVisible('clients:delete');
  const allSelected = selectedClients.length === clients.length && clients.length > 0;

  return (
    <div className="border rounded-lg">
      <Table className="[&_td]:px-1 [&_th]:px-1">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={onSelectAll} />
            </TableHead>
            <TableHead className="flex-1 min-w-[150px]">שם החברה</TableHead>
            <TableHead className="w-24">ת.ז / ח.פ</TableHead>
            <TableHead className="w-32 hidden">סוג לקוח</TableHead>
            <TableHead className="w-32">קבוצה</TableHead>
            <TableHead className="w-28">איש קשר</TableHead>
            <TableHead className="w-32">טלפון</TableHead>
            <TableHead className="flex-1 min-w-[180px]">אימייל</TableHead>
            <TableHead className="w-12">Drive</TableHead>
            <TableHead className="w-12">Canva</TableHead>
            <TableHead className="w-20">סטטוס</TableHead>
            <TableHead className="w-20">מאזן</TableHead>
            <TableHead className="w-16 text-left">פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={12} className="text-center">
                טוען נתונים...
              </TableCell>
            </TableRow>
          ) : clients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className="text-center">
                לא נמצאו לקוחות
              </TableCell>
            </TableRow>
          ) : (
            clients.map((client) => (
              <ClientRow
                key={client.id}
                client={client}
                isSelected={selectedClients.includes(client.id)}
                canEdit={canEdit}
                canDelete={canDelete}
                onToggleSelect={onToggleSelect}
                onEdit={onEdit}
                onDelete={onDelete}
                onGroupFilter={onGroupFilter}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
});

ClientsTable.displayName = 'ClientsTable';
