import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { RotateCcw, Loader2, CheckCircle2, UserPlus, Save, RefreshCw, Pencil, User } from 'lucide-react';
import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { toast } from 'sonner';
import type { SalaryReportVariables, WorkerData } from '@/types/foreign-workers.types';
import { ForeignWorkerService } from '@/services/foreign-worker.service';
import type { ForeignWorker } from '@/types/foreign-worker.types';
import { useMonthRange } from '@/contexts/MonthRangeContext';
import { monthlyDataService, MonthlyDataService } from '@/services/monthly-data.service';
import { MonthRangeInitializer } from '@/components/foreign-workers/shared';
import { WorkerEditDialog } from '@/components/foreign-workers/WorkerEditDialog';

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

  // Worker selection state
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  
  // New Worker Form State
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [passportInput, setPassportInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [nationalityInput, setNationalityInput] = useState('');
  
  // Edit Dialog State
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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
      resetCreationForm();
      setSelectedWorkerId(null);
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

  // Sync with parent component when salaryData or selection changes
  // CRITICAL: Only export the SELECTED worker's data to ensure single-worker letters
  useEffect(() => {
    if (!range || !displayMonths) return;

    // Default dates if no worker selected
    const monthsToReport = displayMonths;
    const periodStart = monthsToReport[0].toISOString().split('T')[0];
    const lastMonth = monthsToReport[monthsToReport.length - 1];
    const lastDay = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0).getDate();
    const periodEnd = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    if (!selectedWorkerId || isCreatingNew) {
      // If no worker selected, pass empty list but valid dates
      onChange({
        ...value,
        period_start: periodStart,
        period_end: periodEnd,
        workers_data: []
      });
      return;
    }

    const worker = branchWorkers.find(w => w.id === selectedWorkerId);
    if (!worker) return;

    // Build data for the SINGLE selected worker
    const monthMap = salaryData.get(selectedWorkerId) || new Map();
    const workersData: WorkerData[] = [];

    monthsToReport.forEach(date => {
      const monthKey = MonthlyDataService.dateToMonthKey(date);
      const data = monthMap.get(monthKey) || { salary: 0, supplement: 0 };

      workersData.push({
        id: selectedWorkerId,
        passport_number: worker.passport_number,
        full_name: worker.full_name,
        nationality: worker.nationality || '',
        month: MonthlyDataService.dateToMMYear(date),
        salary: typeof data.salary === 'number' ? data.salary : 0,
        supplement: typeof data.supplement === 'number' ? data.supplement : 0,
      });
    });

    onChange({
      ...value,
      period_start: periodStart,
      period_end: periodEnd,
      workers_data: workersData // Array of 1 worker
    });
  }, [salaryData, range, displayMonths, branchWorkers, selectedWorkerId, isCreatingNew]);

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
        50
      );

      if (error) {
        toast.error('שגיאה בטעינת נתונים');
        console.error('Error loading salary data:', error);
        return;
      }

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

  const resetCreationForm = () => {
    setIsCreatingNew(false);
    setPassportInput('');
    setNameInput('');
    setNationalityInput('');
  };

  const handleWorkerSelect = (value: string) => {
    if (value === NEW_WORKER_VALUE) {
      setSelectedWorkerId(null);
      setIsCreatingNew(true);
    } else {
      setIsCreatingNew(false);
      setSelectedWorkerId(value);
      
      // Initialize salary map for this worker if missing
      if (!salaryData.has(value) && range) {
        const newSalaryData = new Map(salaryData);
        const monthMap = new Map<string, { salary: number; supplement: number }>();
        range.months.forEach(date => {
          monthMap.set(MonthlyDataService.dateToMonthKey(date), { salary: 0, supplement: 0 });
        });
        newSalaryData.set(value, monthMap);
        setSalaryData(newSalaryData);
      }
    }
  };

  const handleCreateWorker = async () => {
    if (!branchId || !clientId) {
      toast.error('יש לבחור סניף');
      return;
    }

    if (!passportInput.trim() || !nameInput.trim()) {
      toast.error('נא למלא שדות חובה');
      return;
    }

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
      await loadBranchWorkers(); // Refresh list
      handleWorkerSelect(result.data.id); // Select the new worker
      toast.success('עובד נוצר בהצלחה');
    }
  };

  const handleSalaryChange = (workerId: string, monthKey: string, field: 'salary' | 'supplement', value: number | '') => {
    const newSalaryData = new Map(salaryData);
    let workerMonths = newSalaryData.get(workerId);

    if (!workerMonths) {
      workerMonths = new Map();
      newSalaryData.set(workerId, workerMonths);
    }

    const current = workerMonths.get(monthKey) || { salary: 0, supplement: 0 };
    workerMonths.set(monthKey, { ...current, [field]: value });
    
    setSalaryData(newSalaryData);
    setHasUnsavedChanges(true);
  };

  const handleSave = async (): Promise<boolean> => {
    if (!branchId || !clientId || !range) return false;

    // Only save the selected worker if one is selected, OR save all modified?
    // User expects "Save" to save everything visible. But we are focusing on single worker.
    // Ideally we save everything in `salaryData` that has changed, but to be safe and efficient,
    // let's iterate all of them or just the selected one. 
    // Given the UI focus, let's save ALL to ensure nothing is lost if they switched workers.
    
    setIsSaving(true);
    try {
      for (const [workerId, monthMap] of salaryData.entries()) {
        const records = Array.from(monthMap.entries()).map(([monthKey, data]) => ({
          month_date: monthKey,
          salary: typeof data.salary === 'number' ? data.salary : 0,
          supplement: typeof data.supplement === 'number' ? data.supplement : 0
        }));

        const { error } = await monthlyDataService.bulkUpsertBranchWorkerMonthlyData(
          branchId,
          clientId,
          workerId,
          records
        );

        if (error) throw error;
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

  useImperativeHandle(ref, () => ({
    save: async () => {
      if (!hasUnsavedChanges) return true;
      return await handleSave();
    }
  }), [hasUnsavedChanges, branchId, clientId, range, salaryData]);

  // Render Logic
  const selectedWorker = branchWorkers.find(w => w.id === selectedWorkerId);
  
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
                בחר עובד להזנת נתוני שכר והפקת דוח
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
                שמור שינויים
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Worker Selection */}
          <div className="p-4 bg-gray-50 border rounded-md space-y-4">
             <div className="flex items-center justify-between">
                <h4 className="font-medium text-right flex items-center gap-2">
                  <User className="h-4 w-4" />
                  בחירת עובד
                </h4>
                {selectedWorker && (
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                     onClick={() => setEditDialogOpen(true)}
                   >
                     <Pencil className="h-3 w-3 ml-1" />
                     ערוך פרטי עובד
                   </Button>
                )}
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>בחר עובד:</Label>
                  <Combobox
                      options={[
                        { value: NEW_WORKER_VALUE, label: '➕ הוסף עובד חדש' },
                        ...branchWorkers.map((worker) => ({
                          value: worker.id,
                          label: `${worker.full_name} - ${worker.passport_number}`,
                        }))
                      ]}
                      value={isCreatingNew ? NEW_WORKER_VALUE : selectedWorkerId || undefined}
                      onValueChange={handleWorkerSelect}
                      placeholder="בחר עובד מהרשימה..."
                      searchPlaceholder="חפש לפי שם או דרכון..."
                      disabled={disabled || !branchId}
                  />
                </div>
                
                {selectedWorker && (
                  <div className="flex items-center gap-4 text-sm text-gray-600 bg-white p-2 rounded border">
                    <div>
                      <span className="font-medium block">מספר דרכון:</span>
                      {selectedWorker.passport_number}
                    </div>
                    <div className="h-8 w-px bg-gray-200"></div>
                    <div>
                      <span className="font-medium block">נתינות:</span>
                      {selectedWorker.nationality || '-'}
                    </div>
                  </div>
                )}
             </div>

             {/* Create New Worker Form */}
             {isCreatingNew && (
                <div className="mt-4 pt-4 border-t border-gray-200 animate-in fade-in slide-in-from-top-2">
                  <h4 className="font-medium mb-3 text-blue-800">פרטי עובד חדש:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                      <div className="space-y-2">
                        <Label>מספר דרכון <span className="text-red-500">*</span></Label>
                        <Input value={passportInput} onChange={e => setPassportInput(e.target.value)} placeholder="מספר דרכון" />
                      </div>
                      <div className="space-y-2">
                        <Label>שם מלא <span className="text-red-500">*</span></Label>
                        <Input value={nameInput} onChange={e => setNameInput(e.target.value)} placeholder="שם מלא" />
                      </div>
                      <div className="space-y-2">
                        <Label>נתינות</Label>
                        <Input value={nationalityInput} onChange={e => setNationalityInput(e.target.value)} placeholder="מדינה" />
                      </div>
                      <Button onClick={handleCreateWorker} disabled={!passportInput || !nameInput}>
                        צור והוסף
                      </Button>
                  </div>
                </div>
             )}
          </div>

          {/* Monthly Data Grid (Single Worker) */}
          {selectedWorkerId && !isCreatingNew && displayMonths && (
            <div className="animate-in fade-in">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-right">
                  נתוני שכר - {selectedWorker?.full_name} ({displayMonths.length} חודשים)
                </h4>
              </div>

              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-right font-medium">חודש</th>
                      <th className="px-4 py-3 text-right font-medium">שכר בסיס (₪)</th>
                      <th className="px-4 py-3 text-right font-medium">תוספת (₪)</th>
                      <th className="px-4 py-3 text-center w-20">איפוס</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {displayMonths.map((date) => {
                      const monthKey = MonthlyDataService.dateToMonthKey(date);
                      const data = salaryData.get(selectedWorkerId)?.get(monthKey) || { salary: 0, supplement: 0 };
                      
                      return (
                        <tr key={monthKey} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2 font-medium bg-gray-50/50">
                            {MonthlyDataService.dateToHebrew(date)}
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              min="0"
                              value={data.salary}
                              onChange={(e) => handleSalaryChange(selectedWorkerId, monthKey, 'salary', e.target.value === '' ? '' : parseFloat(e.target.value))}
                              className="max-w-[150px] text-right"
                              dir="rtl"
                              placeholder=""
                            />
                          </td>
                          <td className="px-4 py-2">
                            <Input
                              type="number"
                              min="0"
                              value={data.supplement}
                              onChange={(e) => handleSalaryChange(selectedWorkerId, monthKey, 'supplement', e.target.value === '' ? '' : parseFloat(e.target.value))}
                              className="max-w-[150px] text-right"
                              dir="rtl"
                              placeholder=""
                            />
                          </td>
                          <td className="px-4 py-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-400 hover:text-red-500"
                              onClick={() => {
                                handleSalaryChange(selectedWorkerId, monthKey, 'salary', 0);
                                handleSalaryChange(selectedWorkerId, monthKey, 'supplement', 0);
                              }}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!selectedWorkerId && !isCreatingNew && (
            <div className="text-center py-12 text-gray-500 bg-gray-50/50 border-2 border-dashed rounded-md">
              <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>בחר עובד מהרשימה כדי להתחיל להזין נתונים</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <WorkerEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        worker={selectedWorker || null}
        onWorkerUpdated={() => {
          loadBranchWorkers(); // Refresh details
          setEditDialogOpen(false);
        }}
      />
    </div>
  );
});