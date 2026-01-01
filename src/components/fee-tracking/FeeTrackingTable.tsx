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
  Users,
  Send,
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
  // Group actions
  onPreviewGroupLetter?: (groupId: string, groupCalculationId: string) => void;
  onSendGroupLetter?: (groupId: string, groupCalculationId: string) => void;
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
    case 'paid_by_other':
      return (
        <Badge variant="secondary" className="gap-0.5 bg-purple-100 text-purple-800 text-[10px] py-0 px-1.5">
          <UserCheck className="h-2.5 w-2.5" />
          משולם ע"י אחר
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
  onPreviewGroupLetter,
  onSendGroupLetter,
}) => {
  // Get enhanced row data by calculation ID
  const getEnhancedRow = (calculationId: string | undefined): FeeTrackingEnhancedRow | null => {
    if (!calculationId) return null;
    return enhancedData.find((row) => row.fee_calculation_id === calculationId) || null;
  };

  // State for expanded groups
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set());

  // Toggle group expansion
  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  // Group clients by group_id
  type GroupedData = {
    type: 'group';
    groupId: string;
    groupName: string;
    members: FeeTrackingRow[];
    aggregateStatus: PaymentStatus;
    // Group fee calculation data
    groupCalculationId?: string | null;
    groupAuditBeforeVat?: number | null;
    groupAuditWithVat?: number | null;
    groupBookkeepingBeforeVat?: number | null;
    groupBookkeepingWithVat?: number | null;
    groupCalculationStatus?: string | null;
    groupLetterSentAt?: Date | null;
    // Aggregated member sums (when no group calculation)
    memberSumAuditBeforeVat?: number;
    memberSumAuditWithVat?: number;
    memberSumBookkeepingBeforeVat?: number;
    memberSumBookkeepingWithVat?: number;
  } | {
    type: 'client';
    client: FeeTrackingRow;
  };

  const groupedClients: GroupedData[] = React.useMemo(() => {
    const groups = new Map<string, FeeTrackingRow[]>();
    const standalone: FeeTrackingRow[] = [];

    // Separate grouped and standalone clients
    clients.forEach((client) => {
      if (client.group_id) {
        const existing = groups.get(client.group_id) || [];
        existing.push(client);
        groups.set(client.group_id, existing);
      } else {
        standalone.push(client);
      }
    });

    const result: GroupedData[] = [];

    // Add groups
    groups.forEach((members, groupId) => {
      // Extract group fee calculation data from first member (all members have same group data)
      const firstMember = members[0];

      // Determine status for the group
      // Priority: Use group fee calculation status if exists, otherwise aggregate from members
      let aggregateStatus: PaymentStatus = 'not_calculated';

      if (firstMember?.group_calculation_id) {
        // Group has its own fee calculation - use that status
        const groupStatus = firstMember.group_calculation_status;
        if (groupStatus === 'paid') {
          aggregateStatus = 'paid';
        } else if (groupStatus === 'sent') {
          aggregateStatus = firstMember.group_letter_sent_at ? 'pending' : 'not_sent';
        } else if (groupStatus === 'draft') {
          aggregateStatus = 'not_sent'; // Has calculation but not sent
        }
      } else {
        // No group calculation - aggregate from individual members
        const statuses = members.map((m) => m.payment_status);
        if (statuses.every((s) => s === 'paid' || s === 'paid_by_other')) aggregateStatus = 'paid';
        else if (statuses.some((s) => s === 'partial_paid')) aggregateStatus = 'partial_paid';
        else if (statuses.some((s) => s === 'pending')) aggregateStatus = 'pending';
        else if (statuses.every((s) => s === 'not_sent')) aggregateStatus = 'not_sent';
        else if (statuses.every((s) => s === 'not_calculated')) aggregateStatus = 'not_calculated';
      }

      // Calculate aggregated sums from members (for when no group calculation exists)
      let memberSumAuditBeforeVat = 0;
      let memberSumAuditWithVat = 0;
      let memberSumBookkeepingBeforeVat = 0;
      let memberSumBookkeepingWithVat = 0;

      members.forEach((member) => {
        const enhanced = enhancedData.find((e) => e.fee_calculation_id === member.calculation_id);
        if (enhanced) {
          memberSumAuditBeforeVat += enhanced.actual_before_vat || enhanced.original_before_vat || 0;
          memberSumAuditWithVat += enhanced.actual_with_vat || enhanced.original_with_vat || 0;
          memberSumBookkeepingBeforeVat += enhanced.bookkeeping_before_vat || 0;
          memberSumBookkeepingWithVat += enhanced.bookkeeping_with_vat || 0;
        }
      });

      result.push({
        type: 'group',
        groupId,
        groupName: firstMember?.group_name || 'קבוצה',
        members,
        aggregateStatus,
        // Group fee calculation data
        groupCalculationId: firstMember?.group_calculation_id,
        groupAuditBeforeVat: firstMember?.group_audit_before_vat,
        groupAuditWithVat: firstMember?.group_audit_with_vat,
        groupBookkeepingBeforeVat: firstMember?.group_bookkeeping_before_vat,
        groupBookkeepingWithVat: firstMember?.group_bookkeeping_with_vat,
        groupCalculationStatus: firstMember?.group_calculation_status,
        groupLetterSentAt: firstMember?.group_letter_sent_at,
        // Aggregated member sums
        memberSumAuditBeforeVat: memberSumAuditBeforeVat > 0 ? memberSumAuditBeforeVat : undefined,
        memberSumAuditWithVat: memberSumAuditWithVat > 0 ? memberSumAuditWithVat : undefined,
        memberSumBookkeepingBeforeVat: memberSumBookkeepingBeforeVat > 0 ? memberSumBookkeepingBeforeVat : undefined,
        memberSumBookkeepingWithVat: memberSumBookkeepingWithVat > 0 ? memberSumBookkeepingWithVat : undefined,
      });
    });

    // Add standalone clients
    standalone.forEach((client) => {
      result.push({ type: 'client', client });
    });

    // Sort by name
    result.sort((a, b) => {
      const nameA = a.type === 'group' ? a.groupName : (a.client.client_name_hebrew || a.client.client_name);
      const nameB = b.type === 'group' ? b.groupName : (b.client.client_name_hebrew || b.client.client_name);
      return nameA.localeCompare(nameB, 'he');
    });

    return result;
  }, [clients, enhancedData]);

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
          {groupedClients.map((item, index) => {
            const isEven = index % 2 === 0;

            // Render GROUP row
            if (item.type === 'group') {
              const isGroupExpanded = expandedGroups.has(item.groupId);
              return (
                <React.Fragment key={`group-${item.groupId}`}>
                  {/* Group Header Row */}
                  <TableRow
                    className={cn(
                      'cursor-pointer transition-colors border-b border-slate-100',
                      'bg-indigo-50/50 hover:bg-indigo-100/70',
                      isGroupExpanded && 'bg-indigo-100/50'
                    )}
                    onClick={() => toggleGroupExpansion(item.groupId)}
                  >
                    {/* Checkbox - disabled for groups */}
                    <TableCell className="py-2.5 px-3 border-l border-slate-100">
                      <Checkbox disabled />
                    </TableCell>

                    {/* Expand Icon */}
                    <TableCell className="py-2.5 px-3 border-l border-slate-100">
                      {isGroupExpanded ? (
                        <ChevronDown className="h-4 w-4 text-indigo-600" />
                      ) : (
                        <ChevronLeft className="h-4 w-4 text-indigo-400" />
                      )}
                    </TableCell>

                    {/* Group Name */}
                    <TableCell className="font-semibold py-2.5 px-3 text-sm border-l border-slate-100">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-indigo-600" />
                        <span className="rtl:text-right text-indigo-800">{item.groupName}</span>
                        <Badge variant="outline" className="text-xs bg-indigo-100 text-indigo-700 border-indigo-200">
                          {item.members.length} חברות
                        </Badge>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell className="py-2.5 px-3 border-l border-slate-100">
                      <StatusBadge status={item.aggregateStatus} />
                    </TableCell>

                    {/* Group fee amounts - show TOTAL (group + members) when both exist */}
                    <TableCell className="py-2.5 px-3 text-sm rtl:text-right bg-blue-50/30 border-l border-slate-100">
                      {(item.groupAuditBeforeVat || item.memberSumAuditBeforeVat)
                        ? formatILS((item.groupAuditBeforeVat || 0) + (item.memberSumAuditBeforeVat || 0))
                        : '-'}
                    </TableCell>
                    <TableCell className="py-2.5 px-3 text-sm rtl:text-right font-medium bg-blue-50/30 border-l border-slate-100">
                      {(item.groupAuditWithVat || item.memberSumAuditWithVat)
                        ? formatILS((item.groupAuditWithVat || 0) + (item.memberSumAuditWithVat || 0))
                        : '-'}
                    </TableCell>
                    <TableCell className="py-2.5 px-3 text-sm rtl:text-right bg-emerald-50/30 border-l border-slate-100">
                      {(item.groupBookkeepingBeforeVat || item.memberSumBookkeepingBeforeVat)
                        ? formatILS((item.groupBookkeepingBeforeVat || 0) + (item.memberSumBookkeepingBeforeVat || 0))
                        : '-'}
                    </TableCell>
                    <TableCell className="py-2.5 px-3 text-sm rtl:text-right font-medium bg-emerald-50/30 border-l border-slate-100">
                      {(item.groupBookkeepingWithVat || item.memberSumBookkeepingWithVat)
                        ? formatILS((item.groupBookkeepingWithVat || 0) + (item.memberSumBookkeepingWithVat || 0))
                        : '-'}
                    </TableCell>

                    {/* Payment Method */}
                    <TableCell className="py-2.5 px-3 border-l border-slate-100">-</TableCell>

                    {/* Group Actions */}
                    <TableCell className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                      {item.groupCalculationId ? (
                        <div className="flex items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => onPreviewGroupLetter?.(item.groupId, item.groupCalculationId!)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>תצוגה מקדימה</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-blue-600"
                                  onClick={() => onSendGroupLetter?.(item.groupId, item.groupCalculationId!)}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>שלח מכתב קבוצה</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>

                  {/* Group Members (when expanded) */}
                  {isGroupExpanded && item.members.map((member, memberIndex) => {
                    const enhancedRow = getEnhancedRow(member.calculation_id);
                    const isClientExpanded = member.calculation_id && expandedRows.has(member.calculation_id);

                    return (
                      <React.Fragment key={member.client_id}>
                        <TableRow
                          className={cn(
                            'cursor-pointer transition-colors border-b border-slate-100',
                            'bg-slate-50/80 hover:bg-slate-100/70',
                            isClientExpanded && 'bg-slate-100/50'
                          )}
                          onClick={() => member.calculation_id && onToggleRow(member.calculation_id)}
                        >
                          {/* Checkbox */}
                          <TableCell className="py-2 px-3 border-l border-slate-100" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedClients.has(member.client_id)}
                              onCheckedChange={(checked) => onSelectClient(member.client_id, checked)}
                              disabled={member.payment_status === 'not_calculated'}
                            />
                          </TableCell>

                          {/* Expand Icon */}
                          <TableCell className="py-2 px-3 border-l border-slate-100">
                            {member.calculation_id ? (
                              isClientExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                              ) : (
                                <ChevronLeft className="h-3.5 w-3.5 text-slate-400" />
                              )
                            ) : null}
                          </TableCell>

                          {/* Client Name - indented */}
                          <TableCell className="font-medium py-2 px-3 text-sm border-l border-slate-100">
                            <div className="flex items-center gap-2 pr-4">
                              <span className="text-slate-400">└</span>
                              <span className="rtl:text-right">{member.client_name_hebrew || member.client_name}</span>
                            </div>
                          </TableCell>

                          {/* Status */}
                          <TableCell className="py-2 px-3 border-l border-slate-100">
                            <StatusBadge status={member.payment_status} />
                          </TableCell>

                          {/* Amounts */}
                          <TableCell className="py-2 px-3 text-sm rtl:text-right bg-blue-50/30 border-l border-slate-100">
                            {enhancedRow?.actual_before_vat ? formatILS(enhancedRow.actual_before_vat) : enhancedRow?.original_before_vat ? formatILS(enhancedRow.original_before_vat) : '-'}
                          </TableCell>
                          <TableCell className="py-2 px-3 text-sm rtl:text-right font-medium bg-blue-50/30 border-l border-slate-100">
                            {enhancedRow?.actual_with_vat ? formatILS(enhancedRow.actual_with_vat) : enhancedRow?.original_with_vat ? formatILS(enhancedRow.original_with_vat) : '-'}
                          </TableCell>
                          <TableCell className="py-2 px-3 text-sm rtl:text-right bg-emerald-50/30 border-l border-slate-100">
                            {enhancedRow?.bookkeeping_before_vat ? formatILS(enhancedRow.bookkeeping_before_vat) : '-'}
                          </TableCell>
                          <TableCell className="py-2 px-3 text-sm rtl:text-right font-medium bg-emerald-50/30 border-l border-slate-100">
                            {enhancedRow?.bookkeeping_with_vat ? formatILS(enhancedRow.bookkeeping_with_vat) : '-'}
                          </TableCell>

                          {/* Payment Method */}
                          <TableCell className="py-2 px-3 border-l border-slate-100">
                            <PaymentMethodBadge method={enhancedRow?.actual_payment_method || member.payment_method_selected || null} />
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="py-2 px-3" onClick={(e) => e.stopPropagation()}>
                            <ActionButtons
                              client={member}
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

                        {/* Expanded Row for member */}
                        {isClientExpanded && member.calculation_id && (
                          <TableRow>
                            <TableCell colSpan={10} className="p-0 bg-slate-50">
                              <FeeTrackingExpandedRow
                                feeCalculationId={member.calculation_id}
                                clientName={member.client_name_hebrew || member.client_name}
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            }

            // Render standalone CLIENT row
            const client = item.client;
            const enhancedRow = getEnhancedRow(client.calculation_id);
            const isExpanded = client.calculation_id && expandedRows.has(client.calculation_id);

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
                  <TableCell className="py-2.5 px-3 border-l border-slate-100" onClick={(e) => e.stopPropagation()}>
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
                              <Badge variant="outline" className="text-xs px-1.5 py-0.5 gap-1 bg-purple-50 text-purple-700 border-purple-200 cursor-help">
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
                    {enhancedRow?.actual_before_vat ? formatILS(enhancedRow.actual_before_vat) : enhancedRow?.original_before_vat ? formatILS(enhancedRow.original_before_vat) : '-'}
                  </TableCell>

                  {/* Audit Fee - With VAT */}
                  <TableCell className="py-2.5 px-3 text-sm rtl:text-right font-medium bg-blue-50/30 border-l border-slate-100">
                    {enhancedRow?.actual_with_vat ? formatILS(enhancedRow.actual_with_vat) : enhancedRow?.original_with_vat ? formatILS(enhancedRow.original_with_vat) : '-'}
                  </TableCell>

                  {/* Bookkeeping - Before VAT */}
                  <TableCell className="py-2.5 px-3 text-sm rtl:text-right bg-emerald-50/30 border-l border-slate-100">
                    {enhancedRow?.bookkeeping_before_vat ? formatILS(enhancedRow.bookkeeping_before_vat) : '-'}
                  </TableCell>

                  {/* Bookkeeping - With VAT */}
                  <TableCell className="py-2.5 px-3 text-sm rtl:text-right font-medium bg-emerald-50/30 border-l border-slate-100">
                    {enhancedRow?.bookkeeping_with_vat ? formatILS(enhancedRow.bookkeeping_with_vat) : '-'}
                  </TableCell>

                  {/* Payment Method */}
                  <TableCell className="py-2.5 px-3 border-l border-slate-100">
                    <PaymentMethodBadge method={enhancedRow?.actual_payment_method || client.payment_method_selected || null} />
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
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
