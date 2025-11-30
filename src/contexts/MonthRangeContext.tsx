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
  /** Currently displayed months (12 months or less) */
  displayMonths: Date[] | null;
  /** Starting index for display months within the full range */
  displayStartIndex: number;
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
  /** Extend range by adding months (no limit) */
  extendRange: (direction: 'past' | 'future', monthCount: number, targetStartIndex?: number) => Promise<void>;
  /** Delete months from the start of the range (oldest months) */
  deleteMonthsFromStart: (count: number) => Promise<void>;
  /** Delete months from the end of the range (newest months) */
  deleteMonthsFromEnd: (count: number) => Promise<void>;
  /** Set the display start index (for selecting which 12 months to show) */
  setDisplayStartIndex: (index: number) => void;
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
  const [displayMonths, setDisplayMonths] = useState<Date[] | null>(null);
  const [displayStartIndex, setDisplayStartIndexState] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<PendingDeletion | null>(null);

  // Helper: Calculate display months based on range and start index
  const calculateDisplayMonths = useCallback((currentRange: MonthRange | null, startIndex: number) => {
    if (!currentRange || currentRange.monthCount === 0) {
      return null;
    }

    const monthsToShow = Math.min(12, currentRange.monthCount - startIndex);
    return currentRange.months.slice(startIndex, startIndex + monthsToShow);
  }, []);

  // Set branch ID (and client ID)
  const setBranchId = useCallback((newBranchId: string | null, newClientId: string | null) => {
    setBranchIdState(newBranchId);
    setClientIdState(newClientId);
    // Reset state when branch changes
    setRange(null);
    setDisplayMonths(null); // Clear displayed months immediately
    setDisplayStartIndexState(0); // Reset start index
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
      let { data, error: loadError } = await monthlyDataService.getBranchMonthRange(branchId);

      if (loadError) {
        setError(loadError.message);
        toast({
          variant: 'destructive',
          title: 'שגיאה בטעינת טווח חודשים',
          description: loadError.message,
        });
        return;
      }

      // If no range exists, initialize with default 12 months ending in current month
      if (!data) {
        if (!clientId) {
          // Should not happen as branchId implies clientId usually, but safe guard
          setRange(null);
          return;
        }

        const today = new Date();
        const endMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startMonth = new Date(endMonth);
        startMonth.setMonth(startMonth.getMonth() - (DEFAULT_INITIAL_MONTHS - 1));

        console.log('No range found, auto-initializing:', { startMonth, endMonth });

        const { data: newData, error: initError } = await monthlyDataService.setBranchMonthRange(
          branchId,
          clientId,
          startMonth,
          endMonth
        );

        if (initError) {
          console.error('Error auto-initializing range:', initError);
          // Fallback to empty state but don't show error to user to avoid confusion
          setRange(null);
          return;
        }

        data = newData;
      }

      // Set the full range
      setRange(data);

      // Calculate display months (last 12 months by default)
      if (data) {
        const totalMonths = data.monthCount;
        const startIndex = Math.max(0, totalMonths - 12);
        setDisplayStartIndexState(startIndex);
        setDisplayMonths(calculateDisplayMonths(data, startIndex));
      }
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
  const extendRange = useCallback(async (direction: 'past' | 'future', monthCount: number, targetStartIndex?: number) => {
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

      // Save directly (no limit check - unlimited months allowed in DB)
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

      // Update display months too
      if (data) {
        const totalMonths = data.monthCount;
        // Use targetStartIndex if provided, otherwise default to showing the last 12 months
        const startIndex = targetStartIndex !== undefined 
          ? Math.max(0, Math.min(targetStartIndex, totalMonths - 1))
          : Math.max(0, totalMonths - 12);
          
        setDisplayStartIndexState(startIndex);
        setDisplayMonths(calculateDisplayMonths(data, startIndex));
      }

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
  }, [branchId, clientId, range, toast, calculateDisplayMonths]);

  // Delete months from the start of the range (oldest months)
  const deleteMonthsFromStart = useCallback(async (count: number) => {
    if (!branchId || !clientId || !range) {
      setError('לא נבחר סניף או לא קיים טווח חודשים');
      return;
    }

    if (count <= 0 || count >= range.monthCount) {
      setError('מספר חודשים לא תקין');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Calculate new start month (move forward by 'count' months)
      const newStartMonth = new Date(range.startMonth);
      newStartMonth.setMonth(newStartMonth.getMonth() + count);

      // End month stays the same
      const newEndMonth = new Date(range.endMonth);

      // Update the range
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
          title: 'שגיאה במחיקת חודשים',
          description: saveError.message,
        });
        return;
      }

      setRange(data);
      toast({
        title: 'חודשים נמחקו',
        description: `נמחקו ${count} חודשים מההתחלה`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'שגיאה לא ידועה';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [branchId, clientId, range, toast]);

  // Delete months from the end of the range (newest months)
  const deleteMonthsFromEnd = useCallback(async (count: number) => {
    if (!branchId || !clientId || !range) {
      setError('לא נבחר סניף או לא קיים טווח חודשים');
      return;
    }

    if (count <= 0 || count >= range.monthCount) {
      setError('מספר חודשים לא תקין');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Start month stays the same
      const newStartMonth = new Date(range.startMonth);

      // Calculate new end month (move backward by 'count' months)
      const newEndMonth = new Date(range.endMonth);
      newEndMonth.setMonth(newEndMonth.getMonth() - count);

      // Update the range
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
          title: 'שגיאה במחיקת חודשים',
          description: saveError.message,
        });
        return;
      }

      setRange(data);
      toast({
        title: 'חודשים נמחקו',
        description: `נמחקו ${count} חודשים מהסוף`,
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

  // Helper to set display start index
  const setDisplayStartIndex = useCallback((index: number) => {
    setDisplayStartIndexState(index);
    if (range) {
      setDisplayMonths(calculateDisplayMonths(range, index));
    }
  }, [range, calculateDisplayMonths]);

  // Context value
  const value: MonthRangeContextValue = {
    // State
    range,
    displayMonths,
    displayStartIndex,
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
    deleteMonthsFromStart,
    deleteMonthsFromEnd,
    setDisplayStartIndex,
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
 * Get Hebrew month headers for display (returns only displayed months, not all months in range)
 */
export function useMonthHeaders() {
  const { displayMonths } = useMonthRange();

  if (!displayMonths) {
    return [];
  }

  return displayMonths.map(date => ({
    date,
    key: MonthlyDataService.dateToMonthKey(date),
    hebrew: MonthlyDataService.dateToHebrew(date),
    mmYear: MonthlyDataService.dateToMMYear(date),
  }));
}
