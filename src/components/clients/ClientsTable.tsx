import React from 'react';
import { Edit, Trash2, MessageCircle, Mail } from 'lucide-react';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Client } from '@/services';
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
  onView?: (client: Client) => void;
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
  onView?: (client: Client) => void;
  onGroupFilter?: (groupId: string) => void;
}

// Memoized row component to prevent unnecessary re-renders
const ClientRow = React.memo<ClientRowProps>(
  ({ client, isSelected, canEdit, canDelete, onToggleSelect, onEdit, onDelete, onView, onGroupFilter }) => {
    const getStatusBadge = (status: string) => {
      // Adhoc clients have a special purple badge
      if (status === 'adhoc') {
        return (
          <Badge className="bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-100">
            חד-פעמי
          </Badge>
        );
      }

      const styles: Record<string, string> = {
        active: 'bg-[#96ECAA] text-green-800 border-transparent hover:bg-[#96ECAA]',
        inactive: 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100',
        pending: 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
      };
      const labels: Record<string, string> = {
        active: 'פעיל',
        inactive: 'לא פעיל',
        pending: 'ממתין',
      };
      return (
        <Badge className={`${styles[status] || styles.active} border`}>
          {labels[status] || status}
        </Badge>
      );
    };

    return (
      <TableRow className="border-b border-[#F4F4F4] hover:bg-gray-50/50">
        <TableCell className="w-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(client.id)}
          />
        </TableCell>
        <TableCell className="font-medium">
          <div
            onClick={() => (onView || onEdit)(client)}
            className="cursor-pointer hover:text-[#395BF7] transition-colors"
          >
            <div className="font-medium">{client.company_name}</div>
            {client.company_name_hebrew && (
              <div className="text-sm text-gray-500">{client.company_name_hebrew}</div>
            )}
          </div>
        </TableCell>
        <TableCell className="text-gray-600">{client.tax_id}</TableCell>
        <TableCell>
          {client.group ? (
            <Badge
              variant="outline"
              className="text-xs cursor-pointer hover:bg-gray-100 transition-colors border-[#CECECE] bg-transparent"
              onClick={() => onGroupFilter?.(client.group_id!)}
            >
              {client.group.group_name_hebrew || client.group.group_name}
            </Badge>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </TableCell>
        <TableCell className="text-gray-700">{client.contact_name || '-'}</TableCell>
        <TableCell>
          {client.contact_phone ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={`https://wa.me/972${client.contact_phone.replace(/^0/, '').replace(/-/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#395BF7] hover:underline inline-flex items-center gap-1"
                    dir="ltr"
                  >
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    {client.contact_phone}
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>שלח הודעת וואטסאפ</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </TableCell>
        <TableCell>
          {client.contact_email ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={`mailto:${client.contact_email}`}
                    className="text-[#395BF7] hover:underline inline-flex items-center gap-1 truncate max-w-[200px]"
                    dir="ltr"
                  >
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{client.contact_email}</span>
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>שלח מייל</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </TableCell>
        <TableCell>{getStatusBadge(client.status)}</TableCell>
        <TableCell>
          <div className="flex items-center gap-1 rtl:space-x-reverse">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-[#395BF7] hover:bg-[#395BF7]/10"
                    onClick={() => onEdit(client)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{canEdit ? 'ערוך' : 'צפה'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {canDelete && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => onDelete(client)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>מחק</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
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
  isAdmin,
  onSelectAll,
  onToggleSelect,
  onEdit,
  onDelete,
  onView,
  onGroupFilter,
}) => {
  const { isMenuVisible } = usePermissions();
  const canEdit = isMenuVisible('clients:edit');
  const canDelete = isMenuVisible('clients:delete');
  const allSelected = selectedClients.length === clients.length && clients.length > 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-[#CECECE] bg-white hover:bg-white">
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={onSelectAll} />
            </TableHead>
            <TableHead className="font-semibold text-gray-900">שם החברה</TableHead>
            <TableHead className="font-semibold text-gray-900">ח.ז / ח.פ</TableHead>
            <TableHead className="font-semibold text-gray-900">קבוצה</TableHead>
            <TableHead className="font-semibold text-gray-900">איש קשר</TableHead>
            <TableHead className="font-semibold text-gray-900">טלפון</TableHead>
            <TableHead className="font-semibold text-gray-900">אימייל</TableHead>
            <TableHead className="font-semibold text-gray-900">סטטוס</TableHead>
            <TableHead className="font-semibold text-gray-900">פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                טוען נתונים...
              </TableCell>
            </TableRow>
          ) : clients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-gray-500">
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
                onView={onView}
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
