import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { RotateCcw, Loader2, CheckCircle2, UserPlus, Save, RefreshCw } from 'lucide-react';
import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { toast } from 'sonner';
import type { SalaryReportVariables, WorkerData } from '@/types/foreign-workers.types';
import { ForeignWorkerService } from '@/services/foreign-worker.service';
import type { ForeignWorker } from '@/types/foreign-worker.types';
import { useMonthRange } from '@/contexts/MonthRangeContext';
import { monthlyDataService, MonthlyDataService } from '@/services/monthly-data.service';
import { MonthRangeInitializer } from '@/components/foreign-workers/shared';

interface SalaryReportTabProps {
  value: Partial<SalaryReportVariables>;
  onChange: (data: Partial<SalaryReportVariables>) => void;
  disabled?: boolean;
  clientId: string | null;
  branchId: string | null;
}

export interface SalaryReportTabRef {
  save: () => Promise<boolean>;
}

// Special value for "new worker" option
const NEW_WORKER_VALUE = '__NEW_WORKER__';

// Type for salary data keyed by workerId -> monthKey
type SalaryDataMap = Map<string, Map<string, { salary: number; supplement: number }>>;

export const SalaryReportTab = forwardRef<SalaryReportTabRef, SalaryReportTabProps>(
  function SalaryReportTab({ value, onChange, disabled, clientId, branchId }, ref) {
  const { range, displayMonths, isLoading: isLoadingRange, initializeRange } = useMonthRange();

  // Workers list for combobox (branch-specific)
  const [branchWorkers, setBranchWorkers] = useState<ForeignWorker[]>([]);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(false);

  // Salary data keyed by workerId -> monthKey -> {salary, supplement}
  const [salaryData, setSalaryData] = useState<SalaryDataMap>(new Map());

  // Worker input state
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [passportInput, setPassportInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [nationalityInput, setNationalityInput] = useState('');
  const [isNewWorker, setIsNewWorker] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load workers when branch changes
  useEffect(() => {
    if (branchId) {
      loadBranchWorkers();
    } else {
      setBranchWorkers([]);
      resetWorkerFields();
    }
  }, [branchId]);

  // Load salary data when range changes
  useEffect(() => {
    if (!branchId || !range) {
      setSalaryData(new Map());
      return;
    }

    loadSalaryData();
  }, [branchId, range]);

  // Sync with parent component when salaryData changes
  useEffect(() => {
    if (!range || !displayMonths) return;

    // Transform salaryData to WorkerData[] for parent
    const workersData: WorkerData[] = [];
    const monthsToReport = displayMonths;

    salaryData.forEach((monthMap, workerId) => {
      const worker = branchWorkers.find(w => w.id === workerId);
      if (!worker) return;

      monthsToReport.forEach(date => {
        const monthKey = MonthlyDataService.dateToMonthKey(date);
        const data = monthMap.get(monthKey) || { salary: 0, supplement: 0 };

        workersData.push({
          id: workerId,
          passport_number: worker.passport_number,
          full_name: worker.full_name,
          nationality: worker.nationality || '',
          month: MonthlyDataService.dateToMMYear(date),
          salary: data.salary,
          supplement: data.supplement,
        });
      });
    });

    // Set period dates based on displayed range
    const periodStart = monthsToReport[0].toISOString().split('T')[0];
    const lastMonth = monthsToReport[monthsToReport.length - 1];
    const lastDay = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).getDate();
    const periodEnd = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    onChange({
      ...value,
      period_start: periodStart,
      period_end: periodEnd,
      workers_data: workersData
    });
  }, [salaryData, range, displayMonths, branchWorkers]);

  const loadBranchWorkers = async () => {
    if (!branchId) return;

    setIsLoadingWorkers(true);
    try {
      const workers = await ForeignWorkerService.getBranchWorkers(branchId);
      setBranchWorkers(workers);
    } catch (error) {
      console.error('Error loading branch workers:', error);
    } finally {
      setIsLoadingWorkers(false);
    }
  };

  const loadSalaryData = useCallback(async () => {
    if (!branchId) return;

    setIsLoading(true);
    try {
      const { data, error } = await monthlyDataService.getBranchWorkerMonthlyData(
        branchId,
        undefined,
        50 // Load more months to support extended history
      );

      if (error) {
        toast.error('שגיאה בטעינת נתונים');
        console.error('Error loading salary data:', error);
        return;
      }

      // Build the nested map structure
      const newMap: SalaryDataMap = new Map();

      data?.forEach(record => {
        if (!newMap.has(record.worker_id)) {
          newMap.set(record.worker_id, new Map());
        }
        const monthMap = newMap.get(record.worker_id)!;
        monthMap.set(record.month_date, {
          salary: record.salary,
          supplement: record.supplement
        });
      });

      setSalaryData(newMap);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error loading salary data:', error);
      toast.error('שגיאה בטעינת נתונים');
    } finally {
      setIsLoading(false);
    }
  }, [branchId]);

  const resetWorkerFields = () => {
    setSelectedWorkerId(null);
    setPassportInput('');
    setNameInput('');
    setNationalityInput('');
    setIsNewWorker(false);
  };

  // Handle worker selection from combobox
  const handleWorkerSelect = (workerId: string) => {
    if (workerId === NEW_WORKER_VALUE) {
      setSelectedWorkerId(null);
      setPassportInput('');
      setNameInput('');
      setNationalityInput('');
      setIsNewWorker(true);
      return;
    }

    const worker = branchWorkers.find(w => w.id === workerId);
    if (worker) {
      setSelectedWorkerId(worker.id);
      setPassportInput(worker.passport_number);
      setNameInput(worker.full_name);
      setNationalityInput(worker.nationality || '');
      setIsNewWorker(false);
    }
  };

  // Add worker to the salary data
  const handleAddWorker = async () => {
    if (!branchId || !clientId || !range) {
      toast.error('יש לבחור סניף ולאתחל טווח חודשים');
      return;
    }

    if (!passportInput.trim()) {
      toast.error('יש להזין מספר דרכון');
      return;
    }

    if (!nameInput.trim()) {
      toast.error('יש להזין שם מלא');
      return;
    }

    let workerId = selectedWorkerId;
    let workerName = nameInput;
    let workerNationality = nationalityInput;

    // If new worker, save to database first
    if (isNewWorker || !workerId) {
      const result = await ForeignWorkerService.upsertWorker({
        branch_id: branchId,
        client_id: clientId,
        passport_number: passportInput.trim(),
        full_name: nameInput.trim(),
        nationality: nationalityInput.trim() || undefined,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.data) {
        workerId = result.data.id;
        workerName = result.data.full_name;
        workerNationality = result.data.nationality || '';
        loadBranchWorkers(); // Refresh the workers list
        toast.success('עובד חדש נשמר בהצלחה');
      }
    }

    if (!workerId) {
      toast.error('שגיאה ביצירת עובד');
      return;
    }

    // Add worker to salary data with empty months
    const newSalaryData = new Map(salaryData);
    if (!newSalaryData.has(workerId)) {
      const monthMap = new Map<string, { salary: number; supplement: number }>();
      range.months.forEach(date => {
        monthMap.set(MonthlyDataService.dateToMonthKey(date), { salary: 0, supplement: 0 });
      });
      newSalaryData.set(workerId, monthMap);
      setSalaryData(newSalaryData);
      setHasUnsavedChanges(true);
      toast.success(`נוספו ${range.monthCount} חודשים עבור ${workerName}`);
    } else {
      toast.info('עובד זה כבר קיים בדוח');
    }

    // Reset input fields
    resetWorkerFields();
  };

  const handleSalaryChange = (workerId: string, monthKey: string, field: 'salary' | 'supplement', value: number) => {
    const newSalaryData = new Map(salaryData);
    const workerMonths = newSalaryData.get(workerId);

    if (workerMonths) {
      const current = workerMonths.get(monthKey) || { salary: 0, supplement: 0 };
      workerMonths.set(monthKey, { ...current, [field]: value });
      setSalaryData(newSalaryData);
      setHasUnsavedChanges(true);
    }
  };

  const resetRow = (workerId: string, monthKey: string) => {
    handleSalaryChange(workerId, monthKey, 'salary', 0);
    handleSalaryChange(workerId, monthKey, 'supplement', 0);
  };

  const handleSave = async (): Promise<boolean> => {
    if (!branchId || !clientId || !range) {
      toast.error('לא נבחר סניף');
      return false;
    }

    setIsSaving(true);
    try {
      // Save each worker's data
      for (const [workerId, monthMap] of salaryData.entries()) {
        const records = Array.from(monthMap.entries()).map(([monthKey, data]) => ({
          month_date: monthKey,
          salary: data.salary,
          supplement: data.supplement
        }));

        const { error } = await monthlyDataService.bulkUpsertBranchWorkerMonthlyData(
          branchId,
          clientId,
          workerId,
          records
        );

        if (error) {
          toast.error('שגיאה בשמירת נתונים');
          console.error('Error saving salary data:', error);
          return false;
        }
      }

      setHasUnsavedChanges(false);
      toast.success('הנתונים נשמרו בהצלחה');
      return true;
    } catch (error) {
      console.error('Error saving salary data:', error);
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
  }), [hasUnsavedChanges, branchId, clientId, range, salaryData]);

  // If no range exists, show initializer
  if (!isLoadingRange && !range && branchId) {
    return (
      <div className="space-y-6" dir="rtl">
        <Card>
          <CardHeader>
            <CardTitle className="text-right">דוח שכר - מומחים זרים</CardTitle>
            <CardDescription className="text-right">
              הזן נתוני שכר חודשיים לעובדים זרים
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
              <CardTitle className="text-right">דוח שכר - מומחים זרים</CardTitle>
              <CardDescription className="text-right">
                בחר עובד מהרשימה או הוסף חדש להזנת נתוני שכר חודשיים
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadSalaryData}
                disabled={isLoading || !branchId}
              >
                <RefreshCw className={`h-4 w-4 ml-1 ${isLoading ? 'animate-spin' : ''}`} />
                רענן
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !hasUnsavedChanges || !branchId}
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
              {/* Worker Input Row */}
              <div className="p-4 bg-gray-50 border rounded-md space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-right">הוסף עובד לדוח</h4>
                  {selectedWorkerId && !isNewWorker ? (
                    <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                      <CheckCircle2 className="h-3 w-3 ml-1" />
                      עובד מוכר
                    </Badge>
                  ) : isNewWorker && nameInput ? (
                    <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 animate-pulse">
                      <UserPlus className="h-3 w-3 ml-1" />
                      עובד חדש
                    </Badge>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  {/* Worker Selection Combobox */}
                  <div className="space-y-2">
                    <Label className="text-right block">
                      בחר עובד <span className="text-red-500">*</span>
                    </Label>
                    {isLoadingWorkers ? (
                      <div className="flex items-center gap-2 p-2 border rounded-md bg-gray-50 h-10">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-gray-600">טוען...</span>
                      </div>
                    ) : (
                      <Combobox
                        options={[
                          { value: NEW_WORKER_VALUE, label: '➕ הוסף עובד חדש' },
                          ...branchWorkers.map((worker) => ({
                            value: worker.id,
                            label: `${worker.full_name} - ${worker.passport_number}`,
                          }))
                        ]}
                        value={isNewWorker ? NEW_WORKER_VALUE : selectedWorkerId || undefined}
                        onValueChange={handleWorkerSelect}
                        placeholder={branchWorkers.length > 0 ? 'בחר עובד מהרשימה...' : 'אין עובדים - הוסף חדש'}
                        searchPlaceholder="חפש לפי שם או דרכון..."
                        emptyText="לא נמצא עובד"
                        disabled={disabled || !branchId}
                      />
                    )}
                  </div>

                  {/* New worker fields */}
                  {isNewWorker && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-right block">מספר דרכון <span className="text-red-500">*</span></Label>
                        <Input
                          value={passportInput}
                          onChange={(e) => setPassportInput(e.target.value)}
                          placeholder="הזן מספר דרכון"
                          disabled={disabled || !branchId}
                          className="text-right rtl:text-right"
                          dir="rtl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-right block">שם מלא <span className="text-red-500">*</span></Label>
                        <Input
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          placeholder="שם העובד"
                          disabled={disabled || !branchId}
                          className="text-right rtl:text-right"
                          dir="rtl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-right block">נתינות</Label>
                        <Input
                          value={nationalityInput}
                          onChange={(e) => setNationalityInput(e.target.value)}
                          placeholder="מדינה"
                          disabled={disabled || !branchId}
                          className="text-right rtl:text-right"
                          dir="rtl"
                        />
                      </div>
                    </>
                  )}

                  {/* Add Worker Button */}
                  <div>
                    <Button
                      onClick={handleAddWorker}
                      disabled={disabled || !branchId || (isNewWorker ? (!passportInput || !nameInput) : !selectedWorkerId)}
                      className="w-full"
                    >
                      הוסף לדוח
                    </Button>
                  </div>
                </div>
              </div>

              {/* Workers Data Table */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-right">
                    נתוני שכר ({salaryData.size} עובדים, {displayMonths?.length || 0} חודשים)
                  </h4>
                  {hasUnsavedChanges && (
                    <span className="text-sm text-amber-600">* יש שינויים שלא נשמרו</span>
                  )}
                </div>

                {salaryData.size === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed rounded-md">
                    <p className="text-gray-500 mb-2">לא נוספו עובדים עדיין</p>
                    <p className="text-sm text-gray-400">
                      בחר עובד מהרשימה למעלה והוסף לדוח
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-md overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-2 text-right font-medium sticky right-0 bg-gray-50">עובד</th>
                          <th className="px-2 py-2 text-right font-medium">חודש</th>
                          <th className="px-2 py-2 text-right font-medium">שכר בסיס (₪)</th>
                          <th className="px-2 py-2 text-right font-medium">תוספת (₪)</th>
                          <th className="px-2 py-2 w-12 text-center">אפס</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(salaryData.entries()).map(([workerId, monthMap]) => {
                          const worker = branchWorkers.find(w => w.id === workerId);
                          if (!worker) return null;

                          return displayMonths?.map((date, monthIdx) => {
                            const monthKey = MonthlyDataService.dateToMonthKey(date);
                            const data = monthMap.get(monthKey) || { salary: 0, supplement: 0 };

                            return (
                              <tr
                                key={`${workerId}-${monthKey}`}
                                className={`border-t hover:bg-gray-50 ${monthIdx === 0 ? 'border-t-2 border-t-gray-300' : ''}`}
                              >
                                {monthIdx === 0 && (
                                  <td
                                    className="px-2 py-2 sticky right-0 bg-white font-medium"
                                    rowSpan={displayMonths.length}
                                  >
                                    <div className="flex flex-col">
                                      <span>{worker.full_name}</span>
                                      <span className="text-xs text-gray-500">{worker.passport_number}</span>
                                    </div>
                                  </td>
                                )}
                                <td className="px-2 py-2">
                                  <span className="text-gray-700 font-medium">
                                    {MonthlyDataService.dateToHebrew(date)}
                                  </span>
                                </td>
                                <td className="px-2 py-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={data.salary || ''}
                                    onChange={(e) => handleSalaryChange(workerId, monthKey, 'salary', parseInt(e.target.value, 10) || 0)}
                                    placeholder="0"
                                    disabled={disabled}
                                    className="text-right rtl:text-right text-sm h-8 w-24"
                                    dir="rtl"
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={data.supplement || ''}
                                    onChange={(e) => handleSalaryChange(workerId, monthKey, 'supplement', parseInt(e.target.value, 10) || 0)}
                                    placeholder="0"
                                    disabled={disabled}
                                    className="text-right rtl:text-right text-sm h-8 w-24"
                                    dir="rtl"
                                  />
                                </td>
                                <td className="px-2 py-2 text-center">
                                  <Button
                                    onClick={() => resetRow(workerId, monthKey)}
                                    disabled={disabled}
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    title="אפס שכר ותוספת"
                                  >
                                    <RotateCcw className="h-3 w-3 text-gray-500" />
                                  </Button>
                                </td>
                              </tr>
                            );
                          });
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="font-medium text-blue-900 mb-2 text-right">הוראות שימוש:</h4>
                <ul className="space-y-1 text-sm text-blue-800 text-right list-disc list-inside">
                  <li>בחר עובד קיים מהרשימה או לחץ "הוסף עובד חדש"</li>
                  <li>לחץ "הוסף לדוח" כדי להוסיף את העובד עם כל החודשים בטווח</li>
                  <li>מלא את השכר והתוספת לכל חודש</li>
                  <li>לחץ "שמור" לשמירת השינויים בבסיס הנתונים</li>
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
});
