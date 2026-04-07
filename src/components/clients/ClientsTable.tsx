import React from 'react';
import { Edit, Trash2, MessageCircle, Mail, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { GoogleDriveIcon } from '@/components/icons/GoogleDriveIcon';
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

const BALANCE_STATUS_LABELS: Record<
  string,
  { label: string; variant: 'warning' | 'info' | 'neutral' | 'danger' | 'success' | 'brand' }
> = {
  waiting_for_materials: { label: 'ממתין לחומרים', variant: 'warning' },
  materials_received: { label: 'חומרים התקבלו', variant: 'info' },
  assigned_to_auditor: { label: 'הועבר למבקר', variant: 'neutral' },
  in_progress: { label: 'בעבודה', variant: 'brand' },
  review: { label: 'בבדיקה', variant: 'neutral' },
  revision_needed: { label: 'נדרש תיקון', variant: 'danger' },
  advances_updated: { label: 'מקדמות עודכנו', variant: 'success' },
  completed: { label: 'הושלם', variant: 'success' },
};

interface ClientsTableProps {
  clients: Client[];
  loading: boolean;
  clientStatusMap?: Record<string, ClientStatusSummary>;
  balanceStatusByYear?: Record<string, { [year: number]: string }>;
  taxYear?: number;
  previousTaxYear?: number;
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
  balancePrevYear?: string | null;
  balanceCurrYear?: string | null;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onView?: (client: Client) => void;
  onGroupFilter?: (groupId: string) => void;
}

// Memoized row component to prevent unnecessary re-renders
const BalanceCell: React.FC<{ status?: string | null }> = ({ status }) => {
  const config = status ? BALANCE_STATUS_LABELS[status] : null;
  if (!config) return <span className="text-gray-400 text-[10px]">-</span>;
  return (
    <Badge
      variant={config.variant}
      className="inline-flex max-w-[88px] justify-center px-2 py-1 text-[10px] leading-tight"
    >
      {config.label}
    </Badge>
  );
};

const ClientRow = React.memo<ClientRowProps>(
  ({ client, canEdit, canDelete, statusInfo, balancePrevYear, balanceCurrYear, onEdit, onDelete, onView, onGroupFilter }) => {

    return (
      <TableRow className="hover:bg-muted/40">
        {/* Company Name */}
        <TableCell className="font-medium">
          <div
            onClick={() => (onView || onEdit)(client)}
            className="cursor-pointer transition-colors hover:text-primary"
          >
            <div className="font-medium">{client.company_name}</div>
            {client.company_name_hebrew && client.company_name_hebrew !== client.company_name && (
              <div className="text-sm text-muted-foreground">{client.company_name_hebrew}</div>
            )}
          </div>
        </TableCell>
        {/* Tax ID */}
        <TableCell className="border-r border-border text-muted-foreground tabular-nums" dir="ltr">
          {client.tax_id}
        </TableCell>
        {/* Group */}
        <TableCell className="border-r border-border">
          {client.group ? (
            <Badge
              variant="brand"
              className="cursor-pointer text-xs transition-colors hover:bg-primary/15"
              onClick={() => onGroupFilter?.(client.group_id!)}
            >
              {client.group.group_name_hebrew || client.group.group_name}
            </Badge>
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </TableCell>
        {/* Contact Name */}
        <TableCell className="border-r border-border text-foreground/85">{client.contact_name || '-'}</TableCell>
        {/* Phone */}
        <TableCell className="border-r border-border">
          {client.contact_phone ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={`https://wa.me/972${client.contact_phone.replace(/^0/, '').replace(/-/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-foreground/85 hover:text-primary"
                    dir="ltr"
                  >
                    <MessageCircle className="h-4 w-4 text-primary" />
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
        <TableCell className="border-r border-border">
          {client.contact_email ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={`mailto:${client.contact_email}`}
                    className="inline-flex max-w-[200px] items-center gap-1 truncate text-foreground/85 hover:text-primary"
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
        <TableCell className="w-12 border-r border-border">
          {client.google_drive_link ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={client.google_drive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    <GoogleDriveIcon className="h-4 w-4" />
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Google Drive</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </TableCell>
        {/* Fee Status */}
        <TableCell className="border-r border-border">
          <FeeStatusIndicator status={statusInfo?.fee_status || null} />
        </TableCell>
        {/* Balance Previous Year */}
        <TableCell className="border-r border-border">
          <BalanceCell status={balancePrevYear} />
        </TableCell>
        {/* Balance Current Year */}
        <TableCell className="border-r border-border">
          <BalanceCell status={balanceCurrYear} />
        </TableCell>
        {/* Actions */}
        <TableCell className="border-r border-border">
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={canEdit ? 'ערוך לקוח' : 'צפה בלקוח'}
                    className="h-8 w-8 text-muted-foreground hover:bg-primary/10 hover:text-primary"
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
                      aria-label="מחק לקוח"
                      className="h-8 w-8 text-muted-foreground hover:bg-red-50 hover:text-red-600"
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
  balanceStatusByYear = {},
  taxYear,
  previousTaxYear,
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
      ? <ArrowUp className="h-3.5 w-3.5 text-primary" />
      : <ArrowDown className="h-3.5 w-3.5 text-primary" />;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-border/90 bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/35 hover:bg-muted/35">
            <TableHead
              className="cursor-pointer select-none font-semibold text-foreground hover:bg-muted/60"
              onClick={() => onSortChange?.('company_name')}
            >
              <div className="flex items-center gap-1">
                שם החברה
                {getSortIcon('company_name')}
              </div>
            </TableHead>
            <TableHead className="border-r border-border font-semibold text-foreground">ח.ז/ח.פ</TableHead>
            <TableHead className="border-r border-border font-semibold text-foreground">קבוצה</TableHead>
            <TableHead className="border-r border-border font-semibold text-foreground">איש קשר</TableHead>
            <TableHead className="border-r border-border font-semibold text-foreground">טלפון</TableHead>
            <TableHead className="border-r border-border font-semibold text-foreground">אימייל</TableHead>
            <TableHead className="w-12 border-r border-border font-semibold text-foreground">Drive</TableHead>
            <TableHead className="border-r border-border font-semibold text-foreground">שכ&quot;ט</TableHead>
            <TableHead className="border-r border-border font-semibold text-foreground">מאזן {previousTaxYear ? String(previousTaxYear).slice(2) : ''}</TableHead>
            <TableHead className="border-r border-border font-semibold text-foreground">מאזן {taxYear ? String(taxYear).slice(2) : ''}</TableHead>
            <TableHead className="border-r border-border font-semibold text-foreground">פעולות</TableHead>
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
                balancePrevYear={previousTaxYear ? balanceStatusByYear[client.id]?.[previousTaxYear] : null}
                balanceCurrYear={taxYear ? balanceStatusByYear[client.id]?.[taxYear] : null}
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
