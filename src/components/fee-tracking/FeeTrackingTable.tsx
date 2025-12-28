/**
 * Fee Tracking Table Component
 * Table with grouped headers, zebra striping, and column separators
 * Design pattern matches Collection Dashboard for consistency
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Calculator,
  Eye,
  Mail,
  Edit2,
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronLeft,
  UserCheck,
} from 'lucide-react';
import type { FeeTrackingRow, FeeTrackingEnhancedRow, PaymentStatus } from '@/types/fee-tracking.types';
import { formatILS } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { PaymentMethodBadge } from '@/components/payments/PaymentMethodBadge';
import { FeeTrackingExpandedRow } from './FeeTrackingExpandedRow';

interface FeeTrackingTableProps {
  clients: FeeTrackingRow[];
  enhancedData: FeeTrackingEnhancedRow[];
  loading?: boolean;
  // Selection
  selectedClients: Set<string>;
  onSelectClient: (clientId: string, checked: boolean | 'indeterminate') => void;
  onSelectAll: (checked: boolean | 'indeterminate') => void;
  // Expanded rows
  expandedRows: Set<string>;
  onToggleRow: (feeId: string) => void;
  // Actions
  onCalculate: (clientId: string) => void;
  onPreviewLetter: (calculationId: string) => void;
  onSendLetter: (calculationId: string) => void;
  onEditCalculation: (calculationId: string, clientId: string) => void;
  onSendReminder: (letterId: string) => void;
  onViewLetter: (letterId: string) => void;
  onMarkAsPaid: (calculationId: string) => void;
}

/**
 * Status badge component
 */
const StatusBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  switch (status) {
    case 'not_calculated':
      return (
        <Badge variant="destructive" className="gap-0.5 text-[10px] py-0 px-1.5">
          <XCircle className="h-2.5 w-2.5" />
          לא חושב
        </Badge>
      );
    case 'not_sent':
      return (
        <Badge variant="secondary" className="gap-0.5 bg-orange-100 text-orange-800 text-[10px] py-0 px-1.5">
          <AlertTriangle className="h-2.5 w-2.5" />
          חושב, לא נשלח
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="secondary" className="gap-0.5 bg-yellow-100 text-yellow-800 text-[10px] py-0 px-1.5">
          <Clock className="h-2.5 w-2.5" />
          ממתין
        </Badge>
      );
    case 'partial_paid':
      return (
        <Badge variant="secondary" className="gap-0.5 bg-blue-100 text-blue-800 text-[10px] py-0 px-1.5">
          <Clock className="h-2.5 w-2.5" />
          שולם חלקית
        </Badge>
      );
    case 'paid':
      return (
        <Badge variant="secondary" className="gap-0.5 bg-green-100 text-green-800 text-[10px] py-0 px-1.5">
          <CheckCircle2 className="h-2.5 w-2.5" />
          שולם
        </Badge>
      );
    default:
      return null;
  }
};

/**
 * Action buttons component
 */
const ActionButtons: React.FC<{
  client: FeeTrackingRow;
  onCalculate: (clientId: string) => void;
  onPreviewLetter: (calculationId: string) => void;
  onSendLetter: (calculationId: string) => void;
  onEditCalculation: (calculationId: string, clientId: string) => void;
  onSendReminder: (letterId: string) => void;
  onViewLetter: (letterId: string) => void;
  onMarkAsPaid: (calculationId: string) => void;
}> = ({
  client,
  onCalculate,
  onPreviewLetter,
  onSendLetter,
  onEditCalculation,
  onSendReminder,
  onViewLetter,
  onMarkAsPaid,
}) => {
  const { payment_status, calculation_id, letter_id, client_id } = client;

  switch (payment_status) {
    case 'not_calculated':
      return (
        <Button
          size="sm"
          variant="default"
          className="h-7 px-2 text-xs"
          onClick={() => onCalculate(client_id)}
        >
          <Calculator className="h-3 w-3 mr-1" />
          חשב
        </Button>
      );

    case 'not_sent':
      return (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => calculation_id && onPreviewLetter(calculation_id)}
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="default"
            className="h-7 px-2 text-xs"
            onClick={() => calculation_id && onSendLetter(calculation_id)}
          >
            <Mail className="h-3 w-3 mr-1" />
            שלח
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => calculation_id && onEditCalculation(calculation_id, client_id)}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        </div>
      );

    case 'pending':
    case 'partial_paid':
      return (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => letter_id && onSendReminder(letter_id)}
          >
            <Bell className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => letter_id && onViewLetter(letter_id)}
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="default"
            className="h-7 px-2 text-xs"
            onClick={() => calculation_id && onMarkAsPaid(calculation_id)}
          >
            <CheckCircle2 className="h-3 w-3" />
          </Button>
        </div>
      );

    case 'paid':
      return (
        <div className="text-green-600 flex items-center gap-1">
          <CheckCircle2 className="h-4 w-4" />
        </div>
      );

    default:
      return null;
  }
};

export const FeeTrackingTable: React.FC<FeeTrackingTableProps> = ({
  clients,
  enhancedData,
  loading = false,
  selectedClients,
  onSelectClient,
  onSelectAll,
  expandedRows,
  onToggleRow,
  onCalculate,
  onPreviewLetter,
  onSendLetter,
  onEditCalculation,
  onSendReminder,
  onViewLetter,
  onMarkAsPaid,
}) => {
  // Get enhanced row data by calculation ID
  const getEnhancedRow = (calculationId: string | undefined): FeeTrackingEnhancedRow | null => {
    if (!calculationId) return null;
    return enhancedData.find((row) => row.fee_calculation_id === calculationId) || null;
  };

  // Check if all selectable clients are selected
  const selectableClients = clients.filter((c) => c.payment_status !== 'not_calculated');
  const isAllSelected =
    selectableClients.length > 0 &&
    selectableClients.every((c) => selectedClients.has(c.client_id));

  if (loading) {
    return (
      <div className="border border-slate-200 rounded-lg p-8 text-center bg-slate-50">
        <p className="text-slate-500">טוען נתונים...</p>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="border border-slate-200 rounded-lg p-8 text-center bg-slate-50">
        <p className="text-slate-500 rtl:text-right ltr:text-left">לא נמצאו לקוחות</p>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          {/* Row 1: Group Headers */}
          <TableRow className="bg-slate-100 border-b-2 border-slate-200">
            <TableHead rowSpan={2} className="w-10 py-2 px-3 align-bottom border-l border-slate-100">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead rowSpan={2} className="w-8 py-2 px-3 align-bottom border-l border-slate-100"></TableHead>
            <TableHead rowSpan={2} className="rtl:text-right ltr:text-left py-2 px-3 align-bottom font-semibold text-slate-700 border-l border-slate-100">
              שם לקוח
            </TableHead>
            <TableHead rowSpan={2} className="rtl:text-right ltr:text-left py-2 px-3 align-bottom font-semibold text-slate-700 border-l border-slate-100">
              סטטוס
            </TableHead>
            <TableHead colSpan={2} className="text-center py-2 px-3 font-semibold bg-blue-100/70 text-blue-800 border-l border-slate-100">
              שכר טרחה ראיית חשבון
            </TableHead>
            <TableHead colSpan={2} className="text-center py-2 px-3 font-semibold bg-emerald-100/70 text-emerald-800 border-l border-slate-100">
              הנהלת חשבונות חודשי
            </TableHead>
            <TableHead rowSpan={2} className="rtl:text-right ltr:text-left py-2 px-3 align-bottom font-semibold text-slate-700 border-l border-slate-100">
              שיטת תשלום
            </TableHead>
            <TableHead rowSpan={2} className="rtl:text-right ltr:text-left py-2 px-3 align-bottom font-semibold text-slate-700">
              פעולות
            </TableHead>
          </TableRow>
          {/* Row 2: Sub-column Headers */}
          <TableRow className="bg-slate-50 border-b border-slate-200">
            <TableHead className="rtl:text-right ltr:text-left py-1 px-3 text-xs font-medium text-blue-700 bg-blue-50/80 border-l border-slate-100">
              לפני מע"מ
            </TableHead>
            <TableHead className="rtl:text-right ltr:text-left py-1 px-3 text-xs font-medium text-blue-700 bg-blue-50/80 border-l border-slate-100">
              כולל מע"מ
            </TableHead>
            <TableHead className="rtl:text-right ltr:text-left py-1 px-3 text-xs font-medium text-emerald-700 bg-emerald-50/80 border-l border-slate-100">
              לפני מע"מ
            </TableHead>
            <TableHead className="rtl:text-right ltr:text-left py-1 px-3 text-xs font-medium text-emerald-700 bg-emerald-50/80 border-l border-slate-100">
              כולל מע"מ
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client, index) => {
            const enhancedRow = getEnhancedRow(client.calculation_id);
            const isExpanded = client.calculation_id && expandedRows.has(client.calculation_id);
            const isEven = index % 2 === 0;

            return (
              <React.Fragment key={client.client_id}>
                <TableRow
                  className={cn(
                    'cursor-pointer transition-colors border-b border-slate-100',
                    isEven ? 'bg-slate-50/50' : 'bg-white',
                    'hover:bg-slate-100/70',
                    isExpanded && 'bg-slate-100/50'
                  )}
                  onClick={() => client.calculation_id && onToggleRow(client.calculation_id)}
                >
                  {/* Checkbox */}
                  <TableCell
                    className="py-2.5 px-3 border-l border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selectedClients.has(client.client_id)}
                      onCheckedChange={(checked) => onSelectClient(client.client_id, checked)}
                      disabled={client.payment_status === 'not_calculated'}
                    />
                  </TableCell>

                  {/* Expand Icon */}
                  <TableCell className="py-2.5 px-3 border-l border-slate-100">
                    {client.calculation_id ? (
                      isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-500" />
                      ) : (
                        <ChevronLeft className="h-4 w-4 text-slate-400" />
                      )
                    ) : null}
                  </TableCell>

                  {/* Client Name */}
                  <TableCell className="font-medium py-2.5 px-3 text-sm border-l border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="rtl:text-right">{client.client_name_hebrew || client.client_name}</span>
                      {client.payment_role === 'member' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className="text-xs px-1.5 py-0.5 gap-1 bg-purple-50 text-purple-700 border-purple-200 cursor-help"
                              >
                                <UserCheck className="h-3 w-3" />
                                לא משלם
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{client.payer_client_name ? `משולם ע"י: ${client.payer_client_name}` : 'לא הוגדר משלם'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="py-2.5 px-3 border-l border-slate-100">
                    <StatusBadge status={client.payment_status} />
                  </TableCell>

                  {/* Audit Fee - Before VAT */}
                  <TableCell className="py-2.5 px-3 text-sm rtl:text-right bg-blue-50/30 border-l border-slate-100">
                    {enhancedRow?.actual_before_vat
                      ? formatILS(enhancedRow.actual_before_vat)
                      : enhancedRow?.original_before_vat
                      ? formatILS(enhancedRow.original_before_vat)
                      : '-'}
                  </TableCell>

                  {/* Audit Fee - With VAT */}
                  <TableCell className="py-2.5 px-3 text-sm rtl:text-right font-medium bg-blue-50/30 border-l border-slate-100">
                    {enhancedRow?.actual_with_vat
                      ? formatILS(enhancedRow.actual_with_vat)
                      : enhancedRow?.original_with_vat
                      ? formatILS(enhancedRow.original_with_vat)
                      : '-'}
                  </TableCell>

                  {/* Bookkeeping - Before VAT */}
                  <TableCell className="py-2.5 px-3 text-sm rtl:text-right bg-emerald-50/30 border-l border-slate-100">
                    {enhancedRow?.bookkeeping_before_vat
                      ? formatILS(enhancedRow.bookkeeping_before_vat)
                      : '-'}
                  </TableCell>

                  {/* Bookkeeping - With VAT */}
                  <TableCell className="py-2.5 px-3 text-sm rtl:text-right font-medium bg-emerald-50/30 border-l border-slate-100">
                    {enhancedRow?.bookkeeping_with_vat
                      ? formatILS(enhancedRow.bookkeeping_with_vat)
                      : '-'}
                  </TableCell>

                  {/* Payment Method */}
                  <TableCell className="py-2.5 px-3 border-l border-slate-100">
                    <PaymentMethodBadge
                      method={
                        enhancedRow?.actual_payment_method ||
                        client.payment_method_selected ||
                        null
                      }
                    />
                  </TableCell>

                  {/* Actions */}
                  <TableCell
                    className="py-2.5 px-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ActionButtons
                      client={client}
                      onCalculate={onCalculate}
                      onPreviewLetter={onPreviewLetter}
                      onSendLetter={onSendLetter}
                      onEditCalculation={onEditCalculation}
                      onSendReminder={onSendReminder}
                      onViewLetter={onViewLetter}
                      onMarkAsPaid={onMarkAsPaid}
                    />
                  </TableCell>
                </TableRow>

                {/* Expandable Row Content */}
                {isExpanded && client.calculation_id && (
                  <TableRow>
                    <TableCell colSpan={10} className="p-0 bg-slate-50">
                      <FeeTrackingExpandedRow
                        feeCalculationId={client.calculation_id}
                        clientName={client.client_name_hebrew || client.client_name}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

FeeTrackingTable.displayName = 'FeeTrackingTable';
