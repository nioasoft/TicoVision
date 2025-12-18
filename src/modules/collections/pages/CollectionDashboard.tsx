/**
 * Collection Dashboard - Main Page
 * Entry point for Sigal's collection management interface
 */

import React, { useEffect, useState } from 'react';
import { KPICards, type KPICardFilter } from '../components/KPICards';
import { CollectionFilters } from '../components/CollectionFilters';
import { CollectionTable } from '../components/CollectionTable';
import { BulkActionsBar } from '../components/BulkActionsBar';
import { ClientActionsDialog } from '../components/ClientActionsDialog';
import { ActualPaymentEntryDialog } from '../components/ActualPaymentEntryDialog';
import { InstallmentDetailsDialog } from '../components/InstallmentDetailsDialog';
import { LogInteractionDialog } from '../components/LogInteractionDialog';
import { SendReminderDialog } from '../components/SendReminderDialog';
import { SendWhatsAppDialog } from '../components/SendWhatsAppDialog';
import { HistoryDialog } from '../components/HistoryDialog';
import { PromisePaymentDialog } from '../components/PromisePaymentDialog';
import { useCollectionStore } from '../store/collectionStore';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import type { CollectionRow } from '@/types/collection.types';

export const CollectionDashboard: React.FC = () => {
  const {
    dashboardData,
    loading,
    error,
    filters,
    sort,
    pagination,
    selectedRows,
    fetchDashboardData,
    setFilters,
    resetFilters,
    setSort,
    setPagination,
    toggleRowSelection,
    clearSelection,
    selectAll,
    refreshData,
  } = useCollectionStore();

  // Dialog states
  const [clientActionsDialog, setClientActionsDialog] = useState<{
    open: boolean;
    row: CollectionRow | null;
  }>({ open: false, row: null });
  const [paymentEntryDialog, setPaymentEntryDialog] = useState<{ open: boolean; row: CollectionRow | null }>({
    open: false,
    row: null,
  });
  const [installmentDetailsDialog, setInstallmentDetailsDialog] = useState<{
    open: boolean;
    actualPaymentId: string | null;
    clientName: string | null;
  }>({ open: false, actualPaymentId: null, clientName: null });
  const [logInteractionDialog, setLogInteractionDialog] = useState<{
    open: boolean;
    row: CollectionRow | null;
  }>({ open: false, row: null });
  const [sendReminderDialog, setSendReminderDialog] = useState<{
    open: boolean;
    row: CollectionRow | null;
  }>({ open: false, row: null });
  const [historyDialog, setHistoryDialog] = useState<{
    open: boolean;
    row: CollectionRow | null;
  }>({ open: false, row: null });
  const [promiseDialog, setPromiseDialog] = useState<{
    open: boolean;
    row: CollectionRow | null;
  }>({ open: false, row: null });
  const [whatsAppDialog, setWhatsAppDialog] = useState<{
    open: boolean;
    row: CollectionRow | null;
  }>({ open: false, row: null });

  // KPI Card selection state
  const [selectedCard, setSelectedCard] = useState<KPICardFilter>('all');

  // Fetch data on mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handlers
  const handleClientClick = (row: CollectionRow) => {
    setClientActionsDialog({ open: true, row });
  };

  const handlePaymentEntry = (row: CollectionRow) => {
    setPaymentEntryDialog({ open: true, row });
  };

  const handleSendReminder = (row: CollectionRow) => {
    setSendReminderDialog({ open: true, row });
  };

  const handleLogInteraction = (row: CollectionRow) => {
    setLogInteractionDialog({ open: true, row });
  };

  const handleViewHistory = (row: CollectionRow) => {
    setHistoryDialog({ open: true, row });
  };

  const handleRecordPromise = (row: CollectionRow) => {
    setPromiseDialog({ open: true, row });
  };

  const handleSendWhatsApp = (row: CollectionRow) => {
    setWhatsAppDialog({ open: true, row });
  };

  const handleDialogSuccess = async () => {
    await refreshData();
  };

  const handleCardClick = (card: KPICardFilter) => {
    setSelectedCard(card);

    // Map card click to filter change
    switch (card) {
      case 'all':
        setFilters({ status: 'all' });
        break;
      case 'pending':
        setFilters({ status: 'selected_not_paid' });
        break;
      case 'paid':
        setFilters({ status: 'paid' });
        break;
      case 'alerts':
        setFilters({ alert_type: 'not_opened_7d' }); // Or combine all alerts
        break;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="rtl:text-right ltr:text-left">
          <h1 className="text-3xl font-bold rtl:text-right ltr:text-left">מערכת ניהול גביה</h1>
          <p className="text-gray-500 rtl:text-right ltr:text-left">
            מעקב אחר מכתבי שכר טרחה ותשלומים
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refreshData()}
          disabled={loading}
          className="rtl:flex-row-reverse gap-2"
        >
          <RefreshCw className={loading ? 'animate-spin h-4 w-4' : 'h-4 w-4'} />
          <span className="rtl:text-right ltr:text-left">רענון נתונים</span>
        </Button>
      </div>

      {/* KPIs */}
      {dashboardData && (
        <KPICards
          kpis={dashboardData.kpis}
          loading={loading}
          selectedCard={selectedCard}
          onCardClick={handleCardClick}
        />
      )}

      {/* Filters */}
      <CollectionFilters filters={filters} onFiltersChange={setFilters} onReset={resetFilters} />

      {/* Table */}
      {dashboardData && (
        <>
          <div className="flex justify-between items-center rtl:flex-row-reverse">
            <div className="text-sm text-gray-500 rtl:text-right ltr:text-left">
              {selectedRows.length > 0 && (
                <span>
                  נבחרו {selectedRows.length} מתוך {dashboardData.rows.length}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-500 rtl:text-right ltr:text-left">
              עמוד {pagination.page} מתוך {dashboardData.pagination.total_pages} ({dashboardData.pagination.total} רשומות)
            </div>
          </div>

          <CollectionTable
            rows={dashboardData.rows}
            selectedRows={selectedRows}
            loading={loading}
            sort={sort}
            onSort={setSort}
            onSelectAll={selectAll}
            onToggleSelect={toggleRowSelection}
            onClientClick={handleClientClick}
          />

          {/* Pagination */}
          <div className="flex justify-center gap-2 rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={() => setPagination({ page: pagination.page - 1 })}
              disabled={pagination.page === 1 || loading}
            >
              הקודם
            </Button>
            <div className="flex items-center px-4">
              <span className="text-sm rtl:text-right ltr:text-left">
                עמוד {pagination.page} מתוך {dashboardData.pagination.total_pages}
              </span>
            </div>
            <Button
              variant="outline"
              onClick={() => setPagination({ page: pagination.page + 1 })}
              disabled={pagination.page === dashboardData.pagination.total_pages || loading}
            >
              הבא
            </Button>
          </div>
        </>
      )}

      {/* Error State */}
      {error && (
        <div className="border border-red-200 bg-red-50 p-4 rounded-lg rtl:text-right ltr:text-left">
          <div className="font-medium text-red-800">שגיאה בטעינת הנתונים</div>
          <div className="text-sm text-red-600">{error.message}</div>
        </div>
      )}

      {/* Dialogs */}
      <ClientActionsDialog
        open={clientActionsDialog.open}
        onOpenChange={(open) => setClientActionsDialog({ open, row: open ? clientActionsDialog.row : null })}
        row={clientActionsDialog.row}
        onMarkAsPaid={handlePaymentEntry}
        onMarkPartialPayment={handlePaymentEntry}
        onSendReminder={handleSendReminder}
        onSendWhatsApp={handleSendWhatsApp}
        onLogInteraction={handleLogInteraction}
        onViewHistory={handleViewHistory}
        onRecordPromise={handleRecordPromise}
      />
      {paymentEntryDialog.row && (
        <ActualPaymentEntryDialog
          open={paymentEntryDialog.open}
          onOpenChange={(open) => setPaymentEntryDialog({ open, row: null })}
          feeCalculationId={paymentEntryDialog.row.fee_calculation_id}
          clientName={paymentEntryDialog.row.company_name_hebrew || paymentEntryDialog.row.client_name}
          clientId={paymentEntryDialog.row.client_id}
          originalAmount={paymentEntryDialog.row.amount_original}
          expectedAmount={paymentEntryDialog.row.amount_after_discount || paymentEntryDialog.row.amount_original}
          expectedDiscount={paymentEntryDialog.row.discount_percent}
          paymentMethodSelected={paymentEntryDialog.row.payment_method_selected}
          onSuccess={handleDialogSuccess}
        />
      )}
      <InstallmentDetailsDialog
        open={installmentDetailsDialog.open}
        onOpenChange={(open) =>
          setInstallmentDetailsDialog({ open, actualPaymentId: null, clientName: null })
        }
        actualPaymentId={installmentDetailsDialog.actualPaymentId || ''}
        clientName={installmentDetailsDialog.clientName || ''}
        onUpdate={handleDialogSuccess}
      />
      <LogInteractionDialog
        open={logInteractionDialog.open}
        onOpenChange={(open) => setLogInteractionDialog({ open, row: null })}
        row={logInteractionDialog.row}
        onSuccess={handleDialogSuccess}
      />
      <SendReminderDialog
        open={sendReminderDialog.open}
        onOpenChange={(open) => setSendReminderDialog({ open, row: null })}
        row={sendReminderDialog.row}
        onSuccess={handleDialogSuccess}
      />
      <HistoryDialog
        open={historyDialog.open}
        onOpenChange={(open) => setHistoryDialog({ open, row: null })}
        row={historyDialog.row}
      />
      <PromisePaymentDialog
        open={promiseDialog.open}
        onOpenChange={(open) => setPromiseDialog({ open, row: null })}
        row={promiseDialog.row}
        onSuccess={handleDialogSuccess}
      />
      <SendWhatsAppDialog
        open={whatsAppDialog.open}
        onOpenChange={(open) => setWhatsAppDialog({ open, row: null })}
        row={whatsAppDialog.row}
        onSuccess={handleDialogSuccess}
      />

      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedRows.length}
        selectedIds={selectedRows}
        onClearSelection={clearSelection}
        onActionComplete={refreshData}
      />
    </div>
  );
};

CollectionDashboard.displayName = 'CollectionDashboard';
