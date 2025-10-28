/**
 * Collection Dashboard - Main Page
 * Entry point for Sigal's collection management interface
 */

import React, { useEffect, useState } from 'react';
import { KPICards } from '../components/KPICards';
import { CollectionFilters } from '../components/CollectionFilters';
import { CollectionTable } from '../components/CollectionTable';
import { MarkAsPaidDialog } from '../components/MarkAsPaidDialog';
import { PartialPaymentDialog } from '../components/PartialPaymentDialog';
import { LogInteractionDialog } from '../components/LogInteractionDialog';
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
  const [markPaidDialog, setMarkPaidDialog] = useState<{ open: boolean; row: CollectionRow | null }>({
    open: false,
    row: null,
  });
  const [partialPaymentDialog, setPartialPaymentDialog] = useState<{
    open: boolean;
    row: CollectionRow | null;
  }>({ open: false, row: null });
  const [logInteractionDialog, setLogInteractionDialog] = useState<{
    open: boolean;
    row: CollectionRow | null;
  }>({ open: false, row: null });

  // Fetch data on mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handlers
  const handleMarkAsPaid = (row: CollectionRow) => {
    setMarkPaidDialog({ open: true, row });
  };

  const handleMarkPartialPayment = (row: CollectionRow) => {
    setPartialPaymentDialog({ open: true, row });
  };

  const handleSendReminder = (row: CollectionRow) => {
    console.log('Send reminder:', row);
    // TODO: Implement manual reminder dialog
  };

  const handleLogInteraction = (row: CollectionRow) => {
    setLogInteractionDialog({ open: true, row });
  };

  const handleViewHistory = (row: CollectionRow) => {
    console.log('View history:', row);
    // TODO: Implement history dialog
  };

  const handleDialogSuccess = async () => {
    await refreshData();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center rtl:flex-row-reverse">
        <div>
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
      {dashboardData && <KPICards kpis={dashboardData.kpis} loading={loading} />}

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
            onMarkAsPaid={handleMarkAsPaid}
            onMarkPartialPayment={handleMarkPartialPayment}
            onSendReminder={handleSendReminder}
            onLogInteraction={handleLogInteraction}
            onViewHistory={handleViewHistory}
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
      <MarkAsPaidDialog
        open={markPaidDialog.open}
        onOpenChange={(open) => setMarkPaidDialog({ open, row: null })}
        row={markPaidDialog.row}
        onSuccess={handleDialogSuccess}
      />
      <PartialPaymentDialog
        open={partialPaymentDialog.open}
        onOpenChange={(open) => setPartialPaymentDialog({ open, row: null })}
        row={partialPaymentDialog.row}
        onSuccess={handleDialogSuccess}
      />
      <LogInteractionDialog
        open={logInteractionDialog.open}
        onOpenChange={(open) => setLogInteractionDialog({ open, row: null })}
        row={logInteractionDialog.row}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
};

CollectionDashboard.displayName = 'CollectionDashboard';
