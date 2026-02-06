/**
 * Annual Balance Page - Main dashboard for the annual balance sheets module
 * Composes KPI cards, filters, data table, and auditor summary
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
import { hasBalancePermission } from '../types/annual-balance.types';
import type { BalanceStatus } from '../types/annual-balance.types';

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

  const handleRowClick = useCallback(
    // Phase 5 will add BalanceDetailDialog here
    () => {},
    []
  );

  const handleQuickAction = useCallback(
    // Phase 5 will wire up workflow action dialogs here
    () => {},
    []
  );

  const handleOpenYearSuccess = useCallback(() => {
    refreshData();
  }, [refreshData]);

  const canOpenYear = hasBalancePermission(userRole, 'open_year');

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">מאזנים שנתיים</h1>
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
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">כל התיקים</TabsTrigger>
            <TabsTrigger value="by-auditor">לפי מבקר</TabsTrigger>
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

      {/* Open Year Dialog */}
      <OpenYearDialog
        open={openYearDialogOpen}
        onOpenChange={setOpenYearDialogOpen}
        onSuccess={handleOpenYearSuccess}
      />
    </div>
  );
}
