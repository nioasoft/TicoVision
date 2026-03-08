import React from 'react';
import { Edit, Trash2, MessageCircle, Mail, FolderOpen, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import type { ClientStatusSummary } from '@/services/client.service';
import { usePermissions } from '@/hooks/usePermissions';
import { FeeStatusIndicator } from './FeeStatusIndicator';

const BALANCE_STATUS_LABELS: Record<string, { label: string; className: string }> = {
  waiting_for_materials: { label: 'ממתין לחומרים', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  materials_received: { label: 'חומרים התקבלו', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  assigned_to_auditor: { label: 'הועבר למבקר', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  in_progress: { label: 'בעבודה', className: 'bg-orange-100 text-orange-800 border-orange-200' },
  review: { label: 'בבדיקה', className: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  revision_needed: { label: 'נדרש תיקון', className: 'bg-red-100 text-red-800 border-red-200' },
  advances_updated: { label: 'מקדמות עודכנו', className: 'bg-green-100 text-green-800 border-green-200' },
  completed: { label: 'הושלם', className: 'bg-green-100 text-green-800 border-green-200' },
};

interface ClientsTableProps {
  clients: Client[];
  loading: boolean;
  clientStatusMap?: Record<string, ClientStatusSummary>;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (field: string) => void;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onView?: (client: Client) => void;
  onGroupFilter?: (groupId: string) => void;
}

interface ClientRowProps {
  client: Client;
  canEdit: boolean;
  canDelete: boolean;
  statusInfo?: ClientStatusSummary;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onView?: (client: Client) => void;
  onGroupFilter?: (groupId: string) => void;
}

// Memoized row component to prevent unnecessary re-renders
const ClientRow = React.memo<ClientRowProps>(
  ({ client, canEdit, canDelete, statusInfo, onEdit, onDelete, onView, onGroupFilter }) => {
    const getStatusBadge = (status: string) => {
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

    const balanceConfig = statusInfo?.balance_status ? BALANCE_STATUS_LABELS[statusInfo.balance_status] : null;

    return (
      <TableRow className="border-b border-gray-200 hover:bg-gray-50/50">
        {/* Company Name */}
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
        {/* Tax ID */}
        <TableCell className="text-gray-600 border-r border-gray-200">{client.tax_id}</TableCell>
        {/* Group */}
        <TableCell className="border-r border-gray-200">
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
        {/* Contact Name */}
        <TableCell className="text-gray-700 border-r border-gray-200">{client.contact_name || '-'}</TableCell>
        {/* Phone */}
        <TableCell className="border-r border-gray-200">
          {client.contact_phone ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={`https://wa.me/972${client.contact_phone.replace(/^0/, '').replace(/-/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-700 hover:text-[#395BF7] inline-flex items-center gap-1"
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
        {/* Email */}
        <TableCell className="border-r border-gray-200">
          {client.contact_email ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={`mailto:${client.contact_email}`}
                    className="text-gray-700 hover:text-[#395BF7] inline-flex items-center gap-1 truncate max-w-[200px]"
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
        {/* Drive */}
        <TableCell className="w-12 border-r border-gray-200">
          {client.google_drive_link ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={client.google_drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700 transition-colors"
                  >
                    <FolderOpen className="h-4 w-4" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Google Drive</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </TableCell>
        {/* Status */}
        <TableCell className="border-r border-gray-200">{getStatusBadge(client.status)}</TableCell>
        {/* Fee Status */}
        <TableCell className="border-r border-gray-200">
          <FeeStatusIndicator status={statusInfo?.fee_status || null} />
        </TableCell>
        {/* Balance */}
        <TableCell className="border-r border-gray-200">
          {balanceConfig ? (
            <Badge className={`text-xs border ${balanceConfig.className}`}>
              {balanceConfig.label}
            </Badge>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </TableCell>
        {/* Actions */}
        <TableCell>
          <div className="flex items-center gap-1">
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
  loading,
  clientStatusMap = {},
  sortField,
  sortOrder,
  onSortChange,
  onEdit,
  onDelete,
  onView,
  onGroupFilter,
}) => {
  const { isMenuVisible } = usePermissions();
  const canEdit = isMenuVisible('clients:edit');
  const canDelete = isMenuVisible('clients:delete');

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5 text-[#395BF7]" />
      : <ArrowDown className="h-3.5 w-3.5 text-[#395BF7]" />;
  };

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-[#CECECE] bg-white hover:bg-white">
            <TableHead
              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-50 select-none"
              onClick={() => onSortChange?.('company_name')}
            >
              <div className="flex items-center gap-1">
                שם החברה
                {getSortIcon('company_name')}
              </div>
            </TableHead>
            <TableHead className="font-semibold text-gray-900 border-r border-gray-200">ח.ז/ח.פ</TableHead>
            <TableHead className="font-semibold text-gray-900 border-r border-gray-200">קבוצה</TableHead>
            <TableHead className="font-semibold text-gray-900 border-r border-gray-200">איש קשר</TableHead>
            <TableHead className="font-semibold text-gray-900 border-r border-gray-200">טלפון</TableHead>
            <TableHead className="font-semibold text-gray-900 border-r border-gray-200">אימייל</TableHead>
            <TableHead className="font-semibold text-gray-900 w-12 border-r border-gray-200">Drive</TableHead>
            <TableHead className="font-semibold text-gray-900 border-r border-gray-200">סטטוס</TableHead>
            <TableHead className="font-semibold text-gray-900 border-r border-gray-200">שכ&quot;ט</TableHead>
            <TableHead className="font-semibold text-gray-900 border-r border-gray-200">מאזן</TableHead>
            <TableHead className="font-semibold text-gray-900">פעולות</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                טוען נתונים...
              </TableCell>
            </TableRow>
          ) : clients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                לא נמצאו לקוחות
              </TableCell>
            </TableRow>
          ) : (
            clients.map((client) => (
              <ClientRow
                key={client.id}
                client={client}
                canEdit={canEdit}
                canDelete={canDelete}
                statusInfo={clientStatusMap[client.id]}
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
