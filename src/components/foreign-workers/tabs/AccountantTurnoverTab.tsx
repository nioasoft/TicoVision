import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Save, RefreshCw } from 'lucide-react';
import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { toast } from 'sonner';
import type { AccountantTurnoverVariables, MonthlyTurnover } from '@/types/foreign-workers.types';
import { useMonthRange } from '@/contexts/MonthRangeContext';
import { monthlyDataService, MonthlyDataService } from '@/services/monthly-data.service';
import { MonthRangeInitializer } from '@/components/foreign-workers/shared';

interface AccountantTurnoverTabProps {
  value: Partial<AccountantTurnoverVariables>;
  onChange: (data: Partial<AccountantTurnoverVariables>) => void;
  disabled?: boolean;
  clientId?: string | null;
  branchId?: string | null;
}

export interface AccountantTurnoverTabRef {
  save: () => Promise<boolean>;
}

export const AccountantTurnoverTab = forwardRef<AccountantTurnoverTabRef, AccountantTurnoverTabProps>(
  function AccountantTurnoverTab({ value, onChange, disabled, clientId, branchId }, ref) {
  const { range, displayMonths, isLoading: isLoadingRange, initializeRange } = useMonthRange();

  // Local state for month data keyed by month ISO string
  const [monthData, setMonthData] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load data from database when range changes
  useEffect(() => {
    if (!branchId || !range) {
      setMonthData(new Map());
      return;
    }

    loadData();
  }, [branchId, range]);

  // Sync with parent component when monthData changes
  useEffect(() => {
    if (!range || !displayMonths) return;

    // Use the displayed months (user selected)
    const monthsToReport = displayMonths;

    const monthlyTurnover: MonthlyTurnover[] = monthsToReport.map(date => ({
      month: MonthlyDataService.dateToHebrew(date),
      amount: monthData.get(MonthlyDataService.dateToMonthKey(date)) || 0
    }));

    // Calculate total turnover for displayed months only
    const totalTurnoverValue = monthlyTurnover.reduce((sum, m) => sum + m.amount, 0);

    // Format period dates as MM/YYYY for TurnoverApprovalTab
    const formatPeriod = (date: Date) => {
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${month}/${year}`;
    };

    onChange({
      ...value,
      monthly_turnover: monthlyTurnover,
      total_turnover: totalTurnoverValue,
      period_start: formatPeriod(monthsToReport[0]),
      period_end: formatPeriod(monthsToReport[monthsToReport.length - 1])
    });
  }, [monthData, range, displayMonths]);

  const loadData = useCallback(async () => {
    if (!branchId) return;

    setIsLoading(true);
    try {
      const { data, error } = await monthlyDataService.getBranchMonthlyReports(
        branchId,
        'accountant_turnover',
        50 // Load more months to support extended history
      );

      if (error) {
        toast.error('שגיאה בטעינת נתונים');
        console.error('Error loading turnover data:', error);
        return;
      }

      const newMap = new Map<string, number>();
      data?.forEach(report => {
        if (report.turnover_amount !== null && report.turnover_amount !== undefined) {
          newMap.set(report.month_date, Number(report.turnover_amount));
        }
      });
      setMonthData(newMap);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error loading turnover data:', error);
      toast.error('שגיאה בטעינת נתונים');
    } finally {
      setIsLoading(false);
    }
  }, [branchId]);

  const handleAmountChange = (monthKey: string, amount: number | '') => {
    const newMap = new Map(monthData);
    newMap.set(monthKey, amount);
    setMonthData(newMap);
    setHasUnsavedChanges(true);
  };

  const handleSave = async (): Promise<boolean> => {
    if (!branchId || !clientId || !range) {
      toast.error('לא נבחר סניף');
      return false;
    }

    setIsSaving(true);
    try {
      // Build records to upsert
      const records = range.months.map(date => {
        const val = monthData.get(MonthlyDataService.dateToMonthKey(date));
        return {
          month_date: MonthlyDataService.dateToMonthKey(date),
          turnover_amount: typeof val === 'number' ? val : 0
        };
      });

      const { error } = await monthlyDataService.bulkUpsertBranchMonthlyReports(
        branchId,
        clientId,
        'accountant_turnover',
        records
      );

      if (error) {
        toast.error('שגיאה בשמירת נתונים');
        console.error('Error saving turnover data:', error);
        return false;
      }

      setHasUnsavedChanges(false);
      toast.success('הנתונים נשמרו בהצלחה');
      return true;
    } catch (error) {
      console.error('Error saving turnover data:', error);
      toast.error('שגיאה בשמירת נתונים');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Expose save function to parent via ref
  useImperativeHandle(ref, () => ({
    save: async () => {
      if (!hasUnsavedChanges) return true; // Nothing to save
      return await handleSave();
    }
  }), [hasUnsavedChanges, branchId, clientId, range, monthData]);

  // Calculate total - ONLY for displayed months (not all loaded data)
  const totalTurnover = displayMonths
    ? displayMonths.reduce((sum, date) => {
        const val = monthData.get(MonthlyDataService.dateToMonthKey(date));
        return sum + (typeof val === 'number' ? val : 0);
      }, 0)
    : 0;

  // If no range exists, show initializer
  if (!isLoadingRange && !range && branchId) {
    return (
      <div className="space-y-6" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle className="text-right">דוח מחזורים רו"ח</CardTitle>
            <CardDescription className="text-right">
              אישור המסכם את הדיווחים למע"מ ב-12 החודשים
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MonthRangeInitializer
              onInitialize={initializeRange}
              isLoading={isLoadingRange}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-right">דוח מחזורים רו"ח</CardTitle>
              <CardDescription className="text-right">
                אישור המסכם את הדיווחים למע"מ ב-12 החודשים
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={isLoading || !clientId}
              >
                <RefreshCw className={`h-4 w-4 ml-1 ${isLoading ? 'animate-spin' : ''}`} />
                רענן
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !hasUnsavedChanges || !clientId}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 ml-1 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 ml-1" />
                )}
                שמור
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Loading State */}
          {isLoading || isLoadingRange ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !range ? (
            <div className="p-4 text-center text-muted-foreground">
              יש לבחור לקוח לצפייה בנתונים
            </div>
          ) : (
            <>
              {/* Monthly Turnover Table */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-right">מחזורים חודשיים ({displayMonths?.length || 0} חודשים)</h4>
                  {hasUnsavedChanges && (
                    <span className="text-sm text-amber-600">* יש שינויים שלא נשמרו</span>
                  )}
                </div>

                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-right font-medium">חודש דיווח</th>
                        <th className="px-4 py-2 text-right font-medium">סכום (ללא מע"מ)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayMonths?.map((date) => {
                        const monthKey = MonthlyDataService.dateToMonthKey(date);
                        const val = monthData.get(monthKey);
                        // Show empty string if missing, otherwise show the value (even if 0)
                        const amount = val !== undefined ? val : '';

                        return (
                          <tr key={monthKey} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-2">
                              <span className="text-gray-700 font-medium">
                                {MonthlyDataService.dateToHebrew(date)}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <MoneyInput
                                value={amount}
                                onChange={(value) => handleAmountChange(monthKey, value)}
                                disabled={disabled}
                                className="text-right rtl:text-right w-32"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-blue-50 border-t-2">
                      <tr>
                        <td className="px-4 py-3 text-right font-bold">
                          סה"כ
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">
                          ₪{totalTurnover.toLocaleString('he-IL')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800 text-right">
                  <strong>הערה:</strong> הנתונים נשמרים בבסיס הנתונים. לחץ "שמור" לשמירת שינויים.
                  ניתן לנהל את טווח החודשים באמצעות כפתור הטווח למעלה.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
});
