/**
 * Annual Balance Page - Main dashboard for the annual balance sheets module
 * Composes KPI cards, filters, data table, auditor summary, and workflow dialogs
 */

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, CalendarPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAnnualBalanceStore } from '../store/annualBalanceStore';
import { BalanceKPICards } from '../components/BalanceKPICards';
import { BalanceFilters } from '../components/BalanceFilters';
import { BalanceTable } from '../components/BalanceTable';
import { AuditorSummaryTable } from '../components/AuditorSummaryTable';
import { OpenYearDialog } from '../components/OpenYearDialog';
import { MarkMaterialsDialog } from '../components/MarkMaterialsDialog';
import { AssignAuditorDialog } from '../components/AssignAuditorDialog';
import { UpdateStatusDialog } from '../components/UpdateStatusDialog';
import { UpdateAdvancesDialog } from '../components/UpdateAdvancesDialog';
import { BalanceDetailDialog } from '../components/BalanceDetailDialog';
import { hasBalancePermission } from '../types/annual-balance.types';
import type { AnnualBalanceSheetWithClient, BalanceStatus } from '../types/annual-balance.types';

export default function AnnualBalancePage() {
  const { role } = useAuth();
  const userRole = role || '';

  const {
    cases,
    dashboardStats,
    loading,
    error,
    filters,
    pagination,
    activeTab,
    fetchCases,
    fetchDashboardStats,
    setFilters,
    resetFilters,
    setPagination,
    setActiveTab,
    refreshData,
  } = useAnnualBalanceStore();

  const [openYearDialogOpen, setOpenYearDialogOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Dialog state for each workflow action
  const [selectedCase, setSelectedCase] = useState<AnnualBalanceSheetWithClient | null>(null);
  const [markMaterialsOpen, setMarkMaterialsOpen] = useState(false);
  const [assignAuditorOpen, setAssignAuditorOpen] = useState(false);
  const [updateStatusOpen, setUpdateStatusOpen] = useState(false);
  const [updateAdvancesOpen, setUpdateAdvancesOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    fetchCases();
    fetchDashboardStats();
  }, [fetchCases, fetchDashboardStats]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const handleStatusCardClick = useCallback((status: BalanceStatus | undefined) => {
    setFilters({ status });
  }, [setFilters]);

  const handleRowClick = useCallback((row: AnnualBalanceSheetWithClient) => {
    setSelectedCase(row);
    setDetailDialogOpen(true);
  }, []);

  const handleQuickAction = useCallback((row: AnnualBalanceSheetWithClient, currentStatus: string) => {
    setSelectedCase(row);

    switch (currentStatus) {
      case 'waiting_for_materials':
        setMarkMaterialsOpen(true);
        break;
      case 'materials_received':
        setAssignAuditorOpen(true);
        break;
      case 'report_transmitted':
        setUpdateAdvancesOpen(true);
        break;
      default:
        setUpdateStatusOpen(true);
        break;
    }
  }, []);

  const handleOpenYearSuccess = useCallback(() => {
    refreshData();
  }, [refreshData]);

  // Handlers for detail dialog action buttons
  const handleMarkMaterialsFromDetail = useCallback((c: AnnualBalanceSheetWithClient) => {
    setSelectedCase(c);
    setMarkMaterialsOpen(true);
  }, []);

  const handleAssignAuditorFromDetail = useCallback((c: AnnualBalanceSheetWithClient) => {
    setSelectedCase(c);
    setAssignAuditorOpen(true);
  }, []);

  const handleUpdateStatusFromDetail = useCallback((c: AnnualBalanceSheetWithClient) => {
    setSelectedCase(c);
    setUpdateStatusOpen(true);
  }, []);

  const handleUpdateAdvancesFromDetail = useCallback((c: AnnualBalanceSheetWithClient) => {
    setSelectedCase(c);
    setUpdateAdvancesOpen(true);
  }, []);

  const canOpenYear = hasBalancePermission(userRole, 'open_year');

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          מאזנים שנתיים לשנת המס {filters.year}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ml-1 ${refreshing ? 'animate-spin' : ''}`} />
            רענן
          </Button>
          {canOpenYear && (
            <Button size="sm" onClick={() => setOpenYearDialogOpen(true)}>
              <CalendarPlus className="h-4 w-4 ml-1" />
              פתח שנה
            </Button>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{error.message}</p>
        </div>
      )}

      {/* KPI Cards */}
      <BalanceKPICards
        stats={dashboardStats}
        loading={loading}
        selectedStatus={filters.status}
        onStatusClick={handleStatusCardClick}
      />

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'all' | 'by-auditor')}
      >
        <div className="flex items-center justify-end">
          <TabsList>
            <TabsTrigger value="by-auditor">לפי מבקר</TabsTrigger>
            <TabsTrigger value="all">כל התיקים</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="all" className="space-y-3 mt-3">
          {/* Filters */}
          <BalanceFilters
            filters={filters}
            onFiltersChange={setFilters}
            onReset={resetFilters}
            auditors={dashboardStats?.byAuditor ?? []}
          />

          {/* Table */}
          <BalanceTable
            cases={cases}
            loading={loading}
            pagination={pagination}
            onPageChange={(page) => setPagination({ page })}
            onPageSizeChange={(pageSize) => setPagination({ pageSize })}
            onRowClick={handleRowClick}
            onQuickAction={handleQuickAction}
            userRole={userRole}
          />
        </TabsContent>

        <TabsContent value="by-auditor" className="mt-3">
          <AuditorSummaryTable
            auditors={dashboardStats?.byAuditor ?? []}
            loading={loading}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <OpenYearDialog
        open={openYearDialogOpen}
        onOpenChange={setOpenYearDialogOpen}
        onSuccess={handleOpenYearSuccess}
      />

      <MarkMaterialsDialog
        open={markMaterialsOpen}
        onOpenChange={setMarkMaterialsOpen}
        balanceCase={selectedCase}
        userRole={userRole}
      />

      <AssignAuditorDialog
        open={assignAuditorOpen}
        onOpenChange={setAssignAuditorOpen}
        balanceCase={selectedCase}
      />

      <UpdateStatusDialog
        open={updateStatusOpen}
        onOpenChange={setUpdateStatusOpen}
        balanceCase={selectedCase}
        isAdmin={userRole === 'admin'}
      />

      <UpdateAdvancesDialog
        open={updateAdvancesOpen}
        onOpenChange={setUpdateAdvancesOpen}
        balanceCase={selectedCase}
      />

      <BalanceDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        balanceCase={selectedCase}
        userRole={userRole}
        onMarkMaterials={handleMarkMaterialsFromDetail}
        onAssignAuditor={handleAssignAuditorFromDetail}
        onUpdateStatus={handleUpdateStatusFromDetail}
        onUpdateAdvances={handleUpdateAdvancesFromDetail}
      />
    </div>
  );
}
