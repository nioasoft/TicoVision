/**
 * Collection Table Enhanced
 * Extended version with expandable rows and actual payment entry
 * This file enhances the existing CollectionTable with new payment tracking features
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Eye, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CollectionExpandableRow } from './CollectionExpandableRow';
import { ActualPaymentEntryDialog } from './ActualPaymentEntryDialog';
import { InstallmentDetailsDialog } from './InstallmentDetailsDialog';
import type { CollectionRow } from '@/types/collection.types';
import { Badge } from '@/components/ui/badge';
import { formatILS } from '@/lib/formatters';

interface CollectionRowEnhancedProps {
  row: CollectionRow;
  isSelected: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onRecordPayment: () => void;
  onViewInstallments?: () => void;
  onRefresh: () => void;
  // Original handlers
  onToggleSelect: (feeId: string) => void;
  onMarkAsPaid: (row: CollectionRow) => void;
  onMarkPartialPayment: (row: CollectionRow) => void;
  onSendReminder: (row: CollectionRow) => void;
  onLogInteraction: (row: CollectionRow) => void;
  onViewHistory: (row: CollectionRow) => void;
}

/**
 * Enhanced row with expand/collapse and new action buttons
 */
export function CollectionRowEnhanced({
  row,
  isExpanded,
  onToggleExpand,
  onRecordPayment,
  onViewInstallments,
  onRefresh,
}: CollectionRowEnhancedProps) {
  return (
    <>
      {/* Main Row - Keep existing table row structure, add expand button */}
      <tr className="hover:bg-gray-50 cursor-pointer" onClick={onToggleExpand}>
        <td className="py-2 px-3">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </td>
        {/* ... Rest of existing columns ... */}
        <td className="py-2 px-3 rtl:text-right ltr:text-left">
          <div className="flex items-center gap-1 rtl:flex-row-reverse">
            {/* File count badge if has attachments */}
            {(row as Record<string, unknown>).attachment_count && Number((row as Record<string, unknown>).attachment_count) > 0 && (
              <Badge variant="secondary" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                {Number((row as Record<string, unknown>).attachment_count)}
              </Badge>
            )}

            {/* Record payment button if not paid */}
            {row.payment_status !== 'paid' && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onRecordPayment();
                }}
                className="h-7 text-xs rtl:flex-row-reverse"
              >
                <Plus className="h-3 w-3" />
                <span>רשום תשלום</span>
              </Button>
            )}

            {/* View installments if has installments */}
            {(row as Record<string, unknown>).num_installments && onViewInstallments && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewInstallments();
                }}
                className="h-7 text-xs"
              >
                <Eye className="h-3 w-3" />
              </Button>
            )}
          </div>
        </td>
      </tr>

      {/* Expandable Row */}
      {isExpanded && (
        <tr>
          <td colSpan={9}>
            <CollectionExpandableRow
              feeCalculationId={row.fee_calculation_id}
              actualPaymentId={(row as Record<string, unknown>).actual_payment_id as string | undefined}
              clientName={row.company_name_hebrew || row.client_name}
            />
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * Hook to manage enhanced table state
 */
export function useEnhancedCollectionTable(onRefresh: () => void) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [paymentDialogRow, setPaymentDialogRow] = useState<CollectionRow | null>(null);
  const [installmentsDialogRow, setInstallmentsDialogRow] = useState<CollectionRow | null>(null);

  const toggleRowExpansion = (feeId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(feeId)) {
      newExpanded.delete(feeId);
    } else {
      newExpanded.add(feeId);
    }
    setExpandedRows(newExpanded);
  };

  const openPaymentDialog = (row: CollectionRow) => {
    setPaymentDialogRow(row);
  };

  const closePaymentDialog = () => {
    setPaymentDialogRow(null);
  };

  const openInstallmentsDialog = (row: CollectionRow) => {
    setInstallmentsDialogRow(row);
  };

  const closeInstallmentsDialog = () => {
    setInstallmentsDialogRow(null);
  };

  const handlePaymentSuccess = () => {
    closePaymentDialog();
    onRefresh();
  };

  const handleInstallmentUpdate = () => {
    onRefresh();
  };

  return {
    expandedRows,
    toggleRowExpansion,
    paymentDialogRow,
    openPaymentDialog,
    closePaymentDialog,
    installmentsDialogRow,
    openInstallmentsDialog,
    closeInstallmentsDialog,
    handlePaymentSuccess,
    handleInstallmentUpdate,
  };
}

/**
 * Render payment dialog
 */
export function PaymentEntryDialogWrapper({
  row,
  onClose,
  onSuccess,
}: {
  row: CollectionRow | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  if (!row) return null;

  return (
    <ActualPaymentEntryDialog
      open={true}
      onOpenChange={onClose}
      feeCalculationId={row.fee_calculation_id}
      clientName={row.company_name_hebrew || row.client_name}
      clientId={row.client_id}
      originalAmount={row.amount_original}
      expectedAmount={row.amount_after_discount || row.amount_original}
      expectedDiscount={row.discount_percent}
      paymentMethodSelected={row.payment_method_selected}
      onSuccess={onSuccess}
    />
  );
}

/**
 * Render installments dialog
 */
export function InstallmentsDialogWrapper({
  row,
  onClose,
  onUpdate,
}: {
  row: CollectionRow | null;
  onClose: () => void;
  onUpdate: () => void;
}) {
  if (!row || !(row as Record<string, unknown>).actual_payment_id) return null;

  return (
    <InstallmentDetailsDialog
      open={true}
      onOpenChange={onClose}
      actualPaymentId={(row as Record<string, unknown>).actual_payment_id as string}
      clientName={row.company_name_hebrew || row.client_name}
      onUpdate={onUpdate}
    />
  );
}
