import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calculator, Loader2, Save, RefreshCw } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
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
}

export function IsraeliWorkersTab({ value, onChange, disabled, clientId }: IsraeliWorkersTabProps) {
  const { range, isLoading: isLoadingRange, initializeRange } = useMonthRange();

  // Local state for month data keyed by month ISO string
  const [monthData, setMonthData] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load data from database when range changes
  useEffect(() => {
    if (!clientId || !range) {
      setMonthData(new Map());
      return;
    }

    loadData();
  }, [clientId, range]);

  // Calculate average
  const averageWorkers = useMemo(() => {
    const values = Array.from(monthData.values()).filter(v => v > 0);
    if (values.length === 0) return 0;
    const total = values.reduce((sum, val) => sum + val, 0);
    return Math.round((total / values.length) * 10) / 10;
  }, [monthData]);

  // Sync with parent component when monthData changes
  useEffect(() => {
    if (!range) return;

    const israeliWorkers: MonthlyWorkers[] = range.months.map(date => ({
      month: MonthlyDataService.dateToHebrew(date),
      employee_count: monthData.get(MonthlyDataService.dateToMonthKey(date)) || 0
    }));

    onChange({
      ...value,
      israeli_workers: israeliWorkers,
      average_workers: averageWorkers
    });
  }, [monthData, range, averageWorkers]);

  const loadData = useCallback(async () => {
    if (!clientId) return;

    setIsLoading(true);
    try {
      const { data, error } = await monthlyDataService.getClientMonthlyReports(
        clientId,
        'israeli_workers'
      );

      if (error) {
        toast.error('שגיאה בטעינת נתונים');
        console.error('Error loading workers data:', error);
        return;
      }

      const newMap = new Map<string, number>();
      data?.forEach(report => {
        if (report.employee_count !== null && report.employee_count !== undefined) {
          newMap.set(report.month_date, report.employee_count);
        }
      });
      setMonthData(newMap);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error loading workers data:', error);
      toast.error('שגיאה בטעינת נתונים');
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  const handleCountChange = (monthKey: string, count: number) => {
    const newMap = new Map(monthData);
    newMap.set(monthKey, count);
    setMonthData(newMap);
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!clientId || !range) {
      toast.error('לא נבחר לקוח');
      return;
    }

    setIsSaving(true);
    try {
      // Build records to upsert
      const records = range.months.map(date => ({
        month_date: MonthlyDataService.dateToMonthKey(date),
        employee_count: monthData.get(MonthlyDataService.dateToMonthKey(date)) || 0
      }));

      const { error } = await monthlyDataService.bulkUpsertClientMonthlyReports(
        clientId,
        'israeli_workers',
        records
      );

      if (error) {
        toast.error('שגיאה בשמירת נתונים');
        console.error('Error saving workers data:', error);
        return;
      }

      setHasUnsavedChanges(false);
      toast.success('הנתונים נשמרו בהצלחה');
    } catch (error) {
      console.error('Error saving workers data:', error);
      toast.error('שגיאה בשמירת נתונים');
    } finally {
      setIsSaving(false);
    }
  };

  // If no range exists, show initializer
  if (!isLoadingRange && !range && clientId) {
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
                  <h4 className="font-medium text-right">עובדים לפי חודש ({range.monthCount} חודשים)</h4>
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
                      </tr>
                    </thead>
                    <tbody>
                      {range.months.map((date) => {
                        const monthKey = MonthlyDataService.dateToMonthKey(date);
                        const count = monthData.get(monthKey) || 0;

                        return (
                          <tr key={monthKey} className="border-t hover:bg-gray-50">
                            <td className="px-4 py-2">
                              <span className="text-gray-700 font-medium">
                                {MonthlyDataService.dateToHebrew(date)}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                type="number"
                                min="0"
                                value={count || ''}
                                onChange={(e) => handleCountChange(monthKey, parseInt(e.target.value, 10) || 0)}
                                placeholder="הזן מספר"
                                disabled={disabled}
                                className="text-right rtl:text-right w-24"
                                dir="rtl"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-blue-50 border-t-2">
                      <tr>
                        <td className="px-4 py-3 text-right font-bold">
                          <Calculator className="inline ml-2 h-4 w-4" />
                          ממוצע
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">
                          {averageWorkers.toFixed(1)} עובדים
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Info Box */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800 text-right">
                  <strong>הערה:</strong> הממוצע מחושב אוטומטית על ידי המערכת בהתבסס על כל החודשים שהוזנו.
                  הנתונים נשמרים בבסיס הנתונים - לחץ "שמור" לשמירת שינויים.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
