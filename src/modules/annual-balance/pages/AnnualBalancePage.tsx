/**
 * Annual Balance Page - Main page for the annual balance sheets module
 * Placeholder until Phase 4 builds the full dashboard
 */

import { useEffect } from 'react';
import { useAnnualBalanceStore } from '../store/annualBalanceStore';

export default function AnnualBalancePage() {
  const { filters, fetchCases, fetchDashboardStats, loading } = useAnnualBalanceStore();

  useEffect(() => {
    fetchCases();
    fetchDashboardStats();
  }, [fetchCases, fetchDashboardStats]);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">מאזנים שנתיים - {filters.year}</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          <p className="text-lg">דף המאזנים בבנייה - שלב 4</p>
          <p className="mt-2 text-sm">KPI cards, טבלה, ופילטרים יתווספו בשלב הבא</p>
        </div>
      )}
    </div>
  );
}
