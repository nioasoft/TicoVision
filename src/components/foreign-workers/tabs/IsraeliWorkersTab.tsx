import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Calculator, Loader2, Save, RefreshCw } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { toast } from 'sonner';
import type { IsraeliWorkersVariables, MonthlyWorkers } from '@/types/foreign-workers.types';
import { useMonthRange } from '@/contexts/MonthRangeContext';
import { monthlyDataService, MonthlyDataService } from '@/services/monthly-data.service';
import { MonthRangeInitializer } from '@/components/foreign-workers/shared';

interface IsraeliWorkersTabProps {
  value: Partial<IsraeliWorkersVariables>;
  onChange: (data: Partial<IsraeliWorkersVariables>) => void;
  disabled?: boolean;
  clientId?: string | null;
  branchId?: string | null;
}

export interface IsraeliWorkersTabRef {
  save: () => Promise<boolean>;
}

export const IsraeliWorkersTab = forwardRef<IsraeliWorkersTabRef, IsraeliWorkersTabProps>(
  function IsraeliWorkersTab({ value, onChange, disabled, clientId, branchId }, ref) {
  const { range, displayMonths, isLoading: isLoadingRange, initializeRange } = useMonthRange();

  // Local state for month data keyed by month ISO string
  const [monthData, setMonthData] = useState<Map<string, number>>(new Map());
  // State for tracking inactive months (where business was closed/not opened)
  const [inactiveMonths, setInactiveMonths] = useState<Set<string>>(new Set());
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load data from database when range changes
  useEffect(() => {
    if (!branchId || !range) {
      setMonthData(new Map());
      setInactiveMonths(new Set());
      return;
    }

    loadData();
  }, [branchId, range]);

  // Calculate average - only include active months
  const averageWorkers = useMemo(() => {
    // Filter out inactive months and get values
    const activeValues: number[] = [];
    
    // We iterate over the *displayed* months to calculate average for what the user sees
    if (displayMonths) {
      displayMonths.forEach(date => {
        const monthKey = MonthlyDataService.dateToMonthKey(date);
        
        // Skip inactive months
        if (inactiveMonths.has(monthKey)) return;
        
        // Use 0 if no data for an active month
        const count = monthData.get(monthKey) || 0;
        activeValues.push(count);
      });
    } else {
      // Fallback if no display months (shouldn't happen when calc runs)
      monthData.forEach((val, key) => {
        if (!inactiveMonths.has(key)) {
          activeValues.push(val);
        }
      });
    }

    if (activeValues.length === 0) return 0;
    
    const total = activeValues.reduce((sum, val) => sum + val, 0);
    return Math.round((total / activeValues.length) * 10) / 10;
  }, [monthData, inactiveMonths, displayMonths]);

  // Sync with parent component when data changes
  useEffect(() => {
    if (!range || !displayMonths) return;

    const monthsToReport = displayMonths;

    const israeliWorkers: MonthlyWorkers[] = monthsToReport.map(date => {
      const monthKey = MonthlyDataService.dateToMonthKey(date);
      // If inactive, we could send null or special flag, but existing type expects number.
      // For the document generation, we might need 0, but the average calculation is the key part.
      // We'll send the actual number (0 if inactive) but the average will be correct.
      return {
        month: MonthlyDataService.dateToHebrew(date),
        employee_count: monthData.get(monthKey) || 0
      };
    });

    onChange({
      ...value,
      israeli_workers: israeliWorkers,
      average_workers: averageWorkers
    });
  }, [monthData, inactiveMonths, range, displayMonths, averageWorkers]);

  const loadData = useCallback(async () => {
    if (!branchId) return;

    setIsLoading(true);
    try {
      const { data, error } = await monthlyDataService.getBranchMonthlyReports(
        branchId,
        'israeli_workers',
        50 // Load more months to support extended history
      );

      if (error) {
        toast.error('שגיאה בטעינת נתונים');
        console.error('Error loading workers data:', error);
        return;
      }

      const newMap = new Map<string, number>();
      const newInactiveSet = new Set<string>();
      
      data?.forEach(report => {
        // If employee_count is NULL, it means inactive/not opened (based on our new convention)
        if (report.employee_count === null || report.employee_count === undefined) {
          newInactiveSet.add(report.month_date);
        } else {
          newMap.set(report.month_date, report.employee_count);
        }
      });
      
      setMonthData(newMap);
      setInactiveMonths(newInactiveSet);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error loading workers data:', error);
      toast.error('שגיאה בטעינת נתונים');
    } finally {
      setIsLoading(false);
    }
  }, [branchId]);

  // Load data when component mounts (after key change causes remount)
  useEffect(() => {
    loadData();
  }, []);

  const handleCountChange = (monthKey: string, count: number) => {
    const newMap = new Map(monthData);
    newMap.set(monthKey, count);
    setMonthData(newMap);
    
    // If setting a value, ensure it's not marked as inactive
    if (inactiveMonths.has(monthKey)) {
      const newInactive = new Set(inactiveMonths);
      newInactive.delete(monthKey);
      setInactiveMonths(newInactive);
    }
    
    setHasUnsavedChanges(true);
  };

  const handleInactiveChange = (monthKey: string, isInactive: boolean) => {
    const newInactive = new Set(inactiveMonths);
    const newMap = new Map(monthData);
    
    if (isInactive) {
      newInactive.add(monthKey);
      // Clear the value when marking as inactive
      newMap.delete(monthKey);
    } else {
      newInactive.delete(monthKey);
      // Set default 0 when marking as active
      newMap.set(monthKey, 0);
    }
    
    setInactiveMonths(newInactive);
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
        const monthKey = MonthlyDataService.dateToMonthKey(date);
        const isInactive = inactiveMonths.has(monthKey);
        
        return {
          month_date: monthKey,
          // Send NULL (undefined in TS for optional field) if inactive, otherwise the number
          // Note: BulkClientReportRecord defines employee_count as optional (number | undefined)
          employee_count: isInactive ? undefined : (monthData.get(monthKey) || 0)
        };
      });

      const { error } = await monthlyDataService.bulkUpsertBranchMonthlyReports(
        branchId,
        clientId,
        'israeli_workers',
        records
      );

      if (error) {
        toast.error('שגיאה בשמירת נתונים');
        console.error('Error saving workers data:', error);
        return false;
      }

      setHasUnsavedChanges(false);
      toast.success('הנתונים נשמרו בהצלחה');
      return true;
    } catch (error) {
      console.error('Error saving workers data:', error);
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
  }), [hasUnsavedChanges, branchId, clientId, range, monthData, inactiveMonths]);

  // If no range exists, show initializer
  if (!isLoadingRange && !range && branchId) {
    return (
      <div className="space-y-6" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle className="text-right">דוח עובדים ישראליים</CardTitle>
            <CardDescription className="text-right">
              מספר העובדים הישראליים שהועסקו ב-12 חודשים
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
              <CardTitle className="text-right">דוח עובדים ישראליים</CardTitle>
              <CardDescription className="text-right">
                מספר העובדים הישראליים שהועסקו ב-12 חודשים
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
              {/* Monthly Workers Table */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-right">עובדים לפי חודש ({displayMonths?.length || 0} חודשים)</h4>
                  {hasUnsavedChanges && (
                    <span className="text-sm text-amber-600">* יש שינויים שלא נשמרו</span>
                  )}
                </div>

                <div className="border rounded-md overflow-hidden">
                  <table className="w-full">
                                        <thead className="bg-gray-50">
                                          <tr>
                                            <th className="px-4 py-2 text-right font-medium">חודש</th>
                                            <th className="px-4 py-2 text-right font-medium">מספר עובדים</th>
                                            <th className="px-4 py-2 text-right font-medium">לא פעיל / טרם נפתח</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {displayMonths?.map((date) => {
                                            const monthKey = MonthlyDataService.dateToMonthKey(date);
                                            const count = monthData.get(monthKey);
                                            const isInactive = inactiveMonths.has(monthKey);
                                            // Display value: empty string if inactive, otherwise count (including 0)
                                            const displayValue = isInactive ? '' : (count !== undefined ? count : 0);
                    
                                            return (
                                              <tr key={monthKey} className={`border-t hover:bg-gray-50 ${isInactive ? 'bg-gray-50' : ''}`}>
                                                <td className="px-4 py-2">
                                                  <span className={`font-medium ${isInactive ? 'text-gray-400' : 'text-gray-700'}`}>
                                                    {MonthlyDataService.dateToHebrew(date)}
                                                  </span>
                                                </td>
                                                <td className="px-4 py-2">
                                                  <Input
                                                    type="number"
                                                    min="0"
                                                    value={displayValue}
                                                    onChange={(e) => handleCountChange(monthKey, parseInt(e.target.value, 10) || 0)}
                                                    placeholder={isInactive ? '-' : '0'}
                                                    disabled={disabled || isInactive}
                                                    className={`text-right rtl:text-right w-24 ${isInactive ? 'bg-gray-100 text-gray-400' : ''}`}
                                                    dir="rtl"
                                                  />
                                                </td>
                                                <td className="px-4 py-2">
                                                  <div className="flex items-center gap-2">
                                                    <Checkbox
                                                      id={`inactive-${monthKey}`}
                                                      checked={isInactive}
                                                      onCheckedChange={(checked) => handleInactiveChange(monthKey, checked === true)}
                                                      disabled={disabled}
                                                    />
                                                    <Label
                                                      htmlFor={`inactive-${monthKey}`}
                                                      className={`text-sm cursor-pointer ${isInactive ? 'text-gray-600' : 'text-gray-400'}`}
                                                    >
                                                      לא פעיל
                                                    </Label>
                                                  </div>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                        <tfoot className="bg-blue-50 border-t-2">
                                          <tr>
                                            <td className="px-4 py-3 text-right font-bold" colSpan={3}>
                                              <Calculator className="inline ml-2 h-4 w-4" />
                                              ממוצע (לחודשים פעילים בלבד)
                                            </td>
                                          </tr>
                                        </tfoot>                  </table>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800 text-right">
                  <strong>הערה:</strong> סמן "לא פעיל" בחודשים בהם העסק היה סגור או טרם נפתח. חודשים אלו לא ייכללו בחישוב הממוצע.
                  <br />
                  הממוצע מחושב אוטומטית על ידי המערכת בהתבסס על החודשים הפעילים בלבד.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
});
