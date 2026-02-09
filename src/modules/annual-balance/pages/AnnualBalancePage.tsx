/**
 * Annual Balance Page - Main dashboard for the annual balance sheets module
 * Composes KPI cards, filters, data table, auditor summary, and workflow dialogs
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipProvider } from '@/components/ui/tooltip';
import { RefreshCw, CalendarPlus, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { ConfirmAssignmentDialog } from '../components/ConfirmAssignmentDialog';
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
  const [confirmAssignmentOpen, setConfirmAssignmentOpen] = useState(false);
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

  const handleQuickAction = useCallback((row: AnnualBalanceSheetWithClient, actionType: string) => {
    setSelectedCase(row);

    switch (actionType) {
      case 'waiting_for_materials':
        setMarkMaterialsOpen(true);
        break;
      case 'materials_received':
        setAssignAuditorOpen(true);
        break;
      case 'confirm_assignment':
        setConfirmAssignmentOpen(true);
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

  // Compute completion percentage
  const completionPct = useMemo(() => {
    if (!dashboardStats || dashboardStats.totalCases === 0) return 0;
    const done = (dashboardStats.byStatus.report_transmitted ?? 0) + (dashboardStats.byStatus.advances_updated ?? 0);
    return Math.round((done / dashboardStats.totalCases) * 100);
  }, [dashboardStats]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4" dir="rtl">
        {/* Header card */}
        <Card className="rounded-xl border bg-card shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">
                  מאזנים שנתיים {filters.year}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {dashboardStats ? `${dashboardStats.totalCases} תיקים` : 'טוען...'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="default"
                  className="h-9"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw className={cn('h-4 w-4 ml-1.5', refreshing && 'animate-spin')} />
                  רענן
                </Button>
                {canOpenYear && (
                  <Button size="default" className="h-9" onClick={() => setOpenYearDialogOpen(true)}>
                    <CalendarPlus className="h-4 w-4 ml-1.5" />
                    פתח שנה
                  </Button>
                )}
              </div>
            </div>
            {/* Completion progress bar */}
            {dashboardStats && dashboardStats.totalCases > 0 && (
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>התקדמות כוללת</span>
                  <span className="tabular-nums font-medium">{completionPct}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-500"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error display */}
        {error && (
          <Card className="rounded-xl border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="rounded-full bg-destructive/10 p-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium text-destructive">שגיאה בטעינת נתונים</p>
                <p className="text-xs text-destructive/80 mt-0.5">{error.message}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <BalanceKPICards
          stats={dashboardStats}
          loading={loading}
          selectedStatus={filters.status}
          onStatusClick={handleStatusCardClick}
        />

        {/* Unified Tabs + Table card */}
        <Card className="rounded-xl border bg-card shadow-sm overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'all' | 'by-auditor')}
          >
            {/* Tab header */}
            <div className="flex items-center justify-end border-b px-4 py-2.5">
              <TabsList className="bg-muted/50">
                <TabsTrigger
                  value="by-auditor"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  לפי מבקר
                </TabsTrigger>
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
                >
                  כל התיקים
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="all" className="m-0">
              {/* Filters row */}
              <div className="border-b px-4 py-3">
                <BalanceFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  onReset={resetFilters}
                  auditors={dashboardStats?.byAuditor ?? []}
                />
              </div>

              {/* Table (renders inside the card) */}
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

            <TabsContent value="by-auditor" className="m-0">
              <AuditorSummaryTable
                auditors={dashboardStats?.byAuditor ?? []}
                loading={loading}
              />
            </TabsContent>
          </Tabs>
        </Card>

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

        <ConfirmAssignmentDialog
          open={confirmAssignmentOpen}
          onOpenChange={setConfirmAssignmentOpen}
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
    </TooltipProvider>
  );
}
