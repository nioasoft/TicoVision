/**
 * MonthRangeContext
 * Provides shared month range state for Foreign Workers tabs
 * - Tab 1: Accountant Turnover
 * - Tab 2: Israeli Workers
 * - Tab 5: Salary Report
 *
 * All tabs share the same month range (14-month rolling window)
 *
 * NOTE: This context now works with branches instead of clients.
 * Each branch has its own month range and data.
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { monthlyDataService, MonthlyDataService, MAX_MONTHS, DEFAULT_INITIAL_MONTHS } from '@/services/monthly-data.service';
import type { MonthRange, DeletionPreview } from '@/types/monthly-data.types';
import { useToast } from '@/hooks/use-toast';

// ==============================================
// TYPES
// ==============================================

interface PendingDeletion {
  monthsToDelete: Date[];
  preview: DeletionPreview;
  newStartMonth: Date;
  newEndMonth: Date;
}

interface MonthRangeContextState {
  /** Current month range (null if no data exists) */
  range: MonthRange | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Currently selected branch ID */
  branchId: string | null;
  /** Currently selected client ID (for reference) */
  clientId: string | null;
  /** Pending deletion (waiting for confirmation) */
  pendingDeletion: PendingDeletion | null;
}

interface MonthRangeContextActions {
  /** Set the active branch and client IDs */
  setBranchId: (branchId: string | null, clientId: string | null) => void;
  /** @deprecated Use setBranchId instead */
  setClientId: (clientId: string | null) => void;
  /** Load or refresh month range for current branch */
  loadMonthRange: () => Promise<void>;
  /** Initialize range with default 12 months from a start date */
  initializeRange: (startDate: Date) => Promise<void>;
  /** Extend range by adding months (handles 14-month limit) */
  extendRange: (direction: 'past' | 'future', monthCount: number) => Promise<void>;
  /** Confirm pending deletion */
  confirmDeletion: () => Promise<void>;
  /** Cancel pending deletion */
  cancelDeletion: () => void;
  /** Clear context state */
  reset: () => void;
}

type MonthRangeContextValue = MonthRangeContextState & MonthRangeContextActions;

// ==============================================
// CONTEXT
// ==============================================

const MonthRangeContext = createContext<MonthRangeContextValue | undefined>(undefined);

// ==============================================
// PROVIDER
// ==============================================

interface MonthRangeProviderProps {
  children: React.ReactNode;
  initialBranchId?: string;
  initialClientId?: string;
}

export function MonthRangeProvider({ children, initialBranchId, initialClientId }: MonthRangeProviderProps) {
  const { toast } = useToast();

  // State
  const [branchId, setBranchIdState] = useState<string | null>(initialBranchId || null);
  const [clientId, setClientIdState] = useState<string | null>(initialClientId || null);
  const [range, setRange] = useState<MonthRange | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);

  // Set branch ID (and client ID)
  const setBranchId = useCallback((newBranchId: string | null, newClientId: string | null) => {
    setBranchIdState(newBranchId);
    setClientIdState(newClientId);
    // Reset state when branch changes
    setRange(null);
    setError(null);
    setPendingDeletion(null);
  }, []);

  // Deprecated: Set client ID only (backward compatibility)
  const setClientId = useCallback((id: string | null) => {
    console.warn('setClientId is deprecated, use setBranchId instead');
    setClientIdState(id);
    // Reset state when client changes
    setRange(null);
    setError(null);
    setPendingDeletion(null);
  }, []);

  // Load month range for current branch
  const loadMonthRange = useCallback(async () => {
    if (!branchId) {
      setRange(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: loadError } = await monthlyDataService.getBranchMonthRange(branchId);

      if (loadError) {
        setError(loadError.message);
        toast({
          variant: 'destructive',
          title: 'שגיאה בטעינת טווח חודשים',
          description: loadError.message,
        });
        return;
      }

      setRange(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'שגיאה לא ידועה';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [branchId, toast]);

  // Initialize range with default months
  const initializeRange = useCallback(async (startDate: Date) => {
    if (!branchId || !clientId) {
      setError('לא נבחר סניף');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Calculate end date (12 months from start)
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + DEFAULT_INITIAL_MONTHS - 1);

      const { data, error: saveError } = await monthlyDataService.setBranchMonthRange(
        branchId,
        clientId,
        startDate,
        endDate
      );

      if (saveError) {
        setError(saveError.message);
        toast({
          variant: 'destructive',
          title: 'שגיאה באתחול טווח חודשים',
          description: saveError.message,
        });
        return;
      }

      setRange(data);
      toast({
        title: 'טווח חודשים אותחל',
        description: `נוצר טווח של ${DEFAULT_INITIAL_MONTHS} חודשים`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'שגיאה לא ידועה';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [branchId, clientId, toast]);

  // Extend range by adding months
  const extendRange = useCallback(async (direction: 'past' | 'future', monthCount: number) => {
    if (!branchId || !clientId || !range) {
      setError('לא נבחר סניף או לא קיים טווח חודשים');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let newStartMonth: Date;
      let newEndMonth: Date;

      if (direction === 'future') {
        // Adding months to the future
        newStartMonth = new Date(range.startMonth);
        newEndMonth = new Date(range.endMonth);
        newEndMonth.setMonth(newEndMonth.getMonth() + monthCount);
      } else {
        // Adding months to the past
        newStartMonth = new Date(range.startMonth);
        newStartMonth.setMonth(newStartMonth.getMonth() - monthCount);
        newEndMonth = new Date(range.endMonth);
      }

      // Check if we exceed max months
      const totalMonths = MonthlyDataService.getMonthCount(newStartMonth, newEndMonth);

      if (totalMonths > MAX_MONTHS) {
        // Need to delete old data
        const monthsToTrim = totalMonths - MAX_MONTHS;
        let trimDate: Date;
        const monthsToDelete: Date[] = [];

        if (direction === 'future') {
          // Trim from the start (oldest months)
          trimDate = new Date(newStartMonth);
          for (let i = 0; i < monthsToTrim; i++) {
            monthsToDelete.push(new Date(trimDate));
            trimDate.setMonth(trimDate.getMonth() + 1);
          }
          newStartMonth = trimDate;
        } else {
          // Trim from the end (newest months) - this is unusual but handle it
          trimDate = new Date(newEndMonth);
          for (let i = 0; i < monthsToTrim; i++) {
            monthsToDelete.unshift(new Date(trimDate));
            trimDate.setMonth(trimDate.getMonth() - 1);
          }
          newEndMonth = trimDate;
        }

        // Get deletion preview
        const { data: preview, error: previewError } = await monthlyDataService.getBranchDeletionPreview(
          branchId,
          direction === 'future' ? newStartMonth : new Date(range.endMonth.getFullYear(), range.endMonth.getMonth() - monthsToTrim + 2, 1)
        );

        if (previewError) {
          setError(previewError.message);
          setIsLoading(false);
          return;
        }

        // If there's data to delete, show confirmation
        if (preview && (preview.summary.totalClientReports > 0 || preview.summary.totalWorkerRecords > 0)) {
          setPendingDeletion({
            monthsToDelete,
            preview,
            newStartMonth,
            newEndMonth,
          });
          setIsLoading(false);
          return;
        }
      }

      // No data to delete or within limits - save directly
      const { data, error: saveError } = await monthlyDataService.setBranchMonthRange(
        branchId,
        clientId,
        newStartMonth,
        newEndMonth
      );

      if (saveError) {
        setError(saveError.message);
        toast({
          variant: 'destructive',
          title: 'שגיאה בעדכון טווח חודשים',
          description: saveError.message,
        });
        return;
      }

      setRange(data);
      toast({
        title: 'טווח חודשים עודכן',
        description: direction === 'future'
          ? `נוספו ${monthCount} חודשים לעתיד`
          : `נוספו ${monthCount} חודשים לעבר`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'שגיאה לא ידועה';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [branchId, clientId, range, toast]);

  // Confirm pending deletion
  const confirmDeletion = useCallback(async () => {
    if (!branchId || !clientId || !pendingDeletion) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Delete old data
      const { error: deleteError } = await monthlyDataService.cleanupBranchData(
        branchId,
        pendingDeletion.newStartMonth
      );

      if (deleteError) {
        setError(deleteError.message);
        toast({
          variant: 'destructive',
          title: 'שגיאה במחיקת נתונים',
          description: deleteError.message,
        });
        return;
      }

      // Update month range
      const { data, error: saveError } = await monthlyDataService.setBranchMonthRange(
        branchId,
        clientId,
        pendingDeletion.newStartMonth,
        pendingDeletion.newEndMonth
      );

      if (saveError) {
        setError(saveError.message);
        toast({
          variant: 'destructive',
          title: 'שגיאה בעדכון טווח חודשים',
          description: saveError.message,
        });
        return;
      }

      setRange(data);
      setPendingDeletion(null);

      toast({
        title: 'נתונים ישנים נמחקו',
        description: `טווח החודשים עודכן ונתונים ישנים נמחקו`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'שגיאה לא ידועה';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [branchId, clientId, pendingDeletion, toast]);

  // Cancel pending deletion
  const cancelDeletion = useCallback(() => {
    setPendingDeletion(null);
  }, []);

  // Reset context
  const reset = useCallback(() => {
    setBranchIdState(null);
    setClientIdState(null);
    setRange(null);
    setError(null);
    setPendingDeletion(null);
  }, []);

  // Use ref to store the latest loadMonthRange function
  // This prevents infinite loops in the useEffect below
  const loadMonthRangeRef = useRef(loadMonthRange);
  useEffect(() => {
    loadMonthRangeRef.current = loadMonthRange;
  }, [loadMonthRange]);

  // Auto-load when branch changes
  // NOTE: We only depend on branchId, not loadMonthRange
  // The ref ensures we always call the latest version of loadMonthRange
  useEffect(() => {
    if (branchId) {
      loadMonthRangeRef.current();
    }
  }, [branchId]);

  // Context value
  const value: MonthRangeContextValue = {
    // State
    range,
    isLoading,
    error,
    branchId,
    clientId,
    pendingDeletion,
    // Actions
    setBranchId,
    setClientId,
    loadMonthRange,
    initializeRange,
    extendRange,
    confirmDeletion,
    cancelDeletion,
    reset,
  };

  return (
    <MonthRangeContext.Provider value={value}>
      {children}
    </MonthRangeContext.Provider>
  );
}

// ==============================================
// HOOK
// ==============================================

export function useMonthRange() {
  const context = useContext(MonthRangeContext);
  if (context === undefined) {
    throw new Error('useMonthRange must be used within a MonthRangeProvider');
  }
  return context;
}

// ==============================================
// UTILITY HOOKS
// ==============================================

/**
 * Get Hebrew month headers for display
 */
export function useMonthHeaders() {
  const { range } = useMonthRange();

  if (!range) {
    return [];
  }

  return range.months.map(date => ({
    date,
    key: MonthlyDataService.dateToMonthKey(date),
    hebrew: MonthlyDataService.dateToHebrew(date),
    mmYear: MonthlyDataService.dateToMMYear(date),
  }));
}
