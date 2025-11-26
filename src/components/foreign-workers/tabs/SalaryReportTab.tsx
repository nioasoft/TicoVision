import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { RotateCcw, Calendar, Loader2, CheckCircle2, UserPlus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { SalaryReportVariables, WorkerData } from '@/types/foreign-workers.types';
import { ForeignWorkerService } from '@/services/foreign-worker.service';
import type { ForeignWorker } from '@/types/foreign-worker.types';

interface SalaryReportTabProps {
  value: Partial<SalaryReportVariables>;
  onChange: (data: Partial<SalaryReportVariables>) => void;
  disabled?: boolean;
  clientId: string | null;
}

// Special value for "new worker" option
const NEW_WORKER_VALUE = '__NEW_WORKER__';

export function SalaryReportTab({ value, onChange, disabled, clientId }: SalaryReportTabProps) {
  const [workersData, setWorkersData] = useState<WorkerData[]>(value.workers_data || []);

  // Workers list for combobox
  const [clientWorkers, setClientWorkers] = useState<ForeignWorker[]>([]);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(false);

  // Worker input state
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [passportInput, setPassportInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [nationalityInput, setNationalityInput] = useState('');
  const [renewalMonth, setRenewalMonth] = useState('');
  const [isNewWorker, setIsNewWorker] = useState(false);

  // Load workers when client changes
  useEffect(() => {
    if (clientId) {
      loadClientWorkers();
    } else {
      setClientWorkers([]);
      resetWorkerFields();
    }
  }, [clientId]);

  const loadClientWorkers = async () => {
    if (!clientId) return;

    setIsLoadingWorkers(true);
    try {
      const workers = await ForeignWorkerService.getClientWorkers(clientId);
      setClientWorkers(workers);
    } catch (error) {
      console.error('Error loading client workers:', error);
    } finally {
      setIsLoadingWorkers(false);
    }
  };

  const resetWorkerFields = () => {
    setSelectedWorkerId(null);
    setPassportInput('');
    setNameInput('');
    setNationalityInput('');
    setIsNewWorker(false);
  };

  // Sync workersData with parent
  useEffect(() => {
    onChange({
      ...value,
      workers_data: workersData
    });
  }, [workersData]);

  // Handle worker selection from combobox
  const handleWorkerSelect = (workerId: string) => {
    if (workerId === NEW_WORKER_VALUE) {
      // User wants to add new worker
      setSelectedWorkerId(null);
      setPassportInput('');
      setNameInput('');
      setNationalityInput('');
      setIsNewWorker(true);
      return;
    }

    const worker = clientWorkers.find(w => w.id === workerId);
    if (worker) {
      setSelectedWorkerId(worker.id);
      setPassportInput(worker.passport_number);
      setNameInput(worker.full_name);
      setNationalityInput(worker.nationality || '');
      setIsNewWorker(false);
    }
  };

  // Generate 12 months backwards from renewal month
  const generateMonths = async () => {
    // Validate required fields
    if (!passportInput.trim()) {
      toast.error('יש להזין מספר דרכון');
      return;
    }

    if (!nameInput.trim()) {
      toast.error('יש להזין שם מלא');
      return;
    }

    if (!renewalMonth || !/^\d{2}\/\d{4}$/.test(renewalMonth)) {
      toast.error('יש להזין חודש חידוש בפורמט MM/YYYY');
      return;
    }

    if (!clientId) {
      toast.error('יש לבחור לקוח');
      return;
    }

    const [monthStr, yearStr] = renewalMonth.split('/');
    let month = parseInt(monthStr, 10);
    let year = parseInt(yearStr, 10);

    if (month < 1 || month > 12) {
      toast.error('חודש לא תקין (1-12)');
      return;
    }

    let workerId = selectedWorkerId;
    let workerName = nameInput;
    let workerNationality = nationalityInput;

    // If new worker, save to database first
    if (isNewWorker) {
      const result = await ForeignWorkerService.upsertWorker({
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
        // Update state and refresh workers list
        setSelectedWorkerId(workerId);
        setIsNewWorker(false);
        loadClientWorkers(); // Refresh the workers list
        toast.success('עובד חדש נשמר בהצלחה');
      }
    }

    const rows: WorkerData[] = [];

    for (let i = 0; i < 12; i++) {
      let m = month - i;
      let y = year;

      while (m <= 0) {
        m += 12;
        y--;
      }

      rows.push({
        id: workerId || passportInput, // Use passport as fallback ID
        passport_number: passportInput.trim(),
        full_name: workerName.trim(),
        nationality: workerNationality,
        month: `${String(m).padStart(2, '0')}/${y}`,
        salary: 0,
        supplement: 0,
      });
    }

    setWorkersData(rows);

    // Auto-set period dates based on generated months
    const lastMonth = rows[rows.length - 1].month;
    const firstMonth = rows[0].month;

    // Convert MM/YYYY to YYYY-MM-DD format for period
    const [lastM, lastY] = lastMonth.split('/');
    const [firstM, firstY] = firstMonth.split('/');

    // Get last day of the first month (renewal month)
    const lastDay = new Date(parseInt(firstY), parseInt(firstM), 0).getDate();

    onChange({
      ...value,
      period_start: `${lastY}-${lastM}-01`,
      period_end: `${firstY}-${firstM}-${String(lastDay).padStart(2, '0')}`,
      workers_data: rows
    });

    toast.success(`נוצרו 12 חודשים עבור ${workerName}`);
  };

  const updateWorker = (index: number, field: keyof WorkerData, fieldValue: string | number) => {
    const updated = [...workersData];
    if (field === 'salary' || field === 'supplement') {
      updated[index][field] = typeof fieldValue === 'number' ? fieldValue : parseFloat(fieldValue) || 0;
    } else {
      (updated[index] as Record<string, string | number | boolean | undefined>)[field] = fieldValue;
    }
    setWorkersData(updated);
  };

  // Reset row salary and supplement to 0
  const resetRow = (index: number) => {
    const updated = [...workersData];
    updated[index].salary = 0;
    updated[index].supplement = 0;
    setWorkersData(updated);
  };

  // Format renewal month input (MM/YYYY)
  const handleRenewalMonthChange = (inputValue: string) => {
    // Remove non-digits and slash
    let cleaned = inputValue.replace(/[^\d/]/g, '');

    // Auto-format: after 2 digits, add slash
    if (cleaned.length >= 2 && !cleaned.includes('/')) {
      cleaned = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    }

    // Limit to MM/YYYY format
    if (cleaned.length > 7) {
      cleaned = cleaned.slice(0, 7);
    }

    setRenewalMonth(cleaned);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">דוח שכר - מומחים זרים</CardTitle>
          <CardDescription className="text-right">
            בחר עובד מהרשימה או הוסף חדש, והזן חודש חידוש ליצירת 12 חודשי דיווח
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Worker Input Row - Full Width */}
          <div className="p-4 bg-gray-50 border rounded-md space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-right">פרטי עובד</h4>
              {selectedWorkerId && !isNewWorker ? (
                <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                  <CheckCircle2 className="h-3 w-3 ml-1" />
                  עובד מוכר
                </Badge>
              ) : isNewWorker && nameInput ? (
                <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 animate-pulse">
                  <UserPlus className="h-3 w-3 ml-1" />
                  עובד חדש - יישמר בלחיצה על "צור 12 חודשים"
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
                      // Add "new worker" option at top
                      { value: NEW_WORKER_VALUE, label: '➕ הוסף עובד חדש' },
                      // Then existing workers
                      ...clientWorkers.map((worker) => ({
                        value: worker.id,
                        label: `${worker.full_name} - ${worker.passport_number}`,
                      }))
                    ]}
                    value={isNewWorker ? NEW_WORKER_VALUE : selectedWorkerId || undefined}
                    onValueChange={handleWorkerSelect}
                    placeholder={clientWorkers.length > 0 ? 'בחר עובד מהרשימה...' : 'אין עובדים - הוסף חדש'}
                    searchPlaceholder="חפש לפי שם או דרכון..."
                    emptyText="לא נמצא עובד"
                    disabled={disabled || !clientId}
                  />
                )}
              </div>

              {/* Passport Number - show when new worker selected */}
              {isNewWorker && (
                <div className="space-y-2">
                  <Label className="text-right block">
                    מספר דרכון <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={passportInput}
                    onChange={(e) => setPassportInput(e.target.value)}
                    placeholder="הזן מספר דרכון"
                    disabled={disabled || !clientId}
                    className="text-right rtl:text-right"
                    dir="rtl"
                  />
                </div>
              )}

              {/* Full Name - show when new worker selected */}
              {isNewWorker && (
                <div className="space-y-2">
                  <Label className="text-right block">
                    שם מלא <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="שם העובד"
                    disabled={disabled || !clientId}
                    className="text-right rtl:text-right"
                    dir="rtl"
                  />
                </div>
              )}

              {/* Nationality - show when new worker selected */}
              {isNewWorker && (
                <div className="space-y-2">
                  <Label className="text-right block">נתינות</Label>
                  <Input
                    value={nationalityInput}
                    onChange={(e) => setNationalityInput(e.target.value)}
                    placeholder="מדינה"
                    disabled={disabled || !clientId}
                    className="text-right rtl:text-right"
                    dir="rtl"
                  />
                </div>
              )}

              {/* Renewal Month */}
              <div className="space-y-2">
                <Label className="text-right block">
                  חודש חידוש <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    value={renewalMonth}
                    onChange={(e) => handleRenewalMonthChange(e.target.value)}
                    placeholder="MM/YYYY"
                    disabled={disabled || !clientId}
                    className="text-right rtl:text-right"
                    dir="rtl"
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Generate Button */}
              <div>
                <Button
                  onClick={generateMonths}
                  disabled={disabled || !clientId || !renewalMonth || (isNewWorker ? (!passportInput || !nameInput) : !selectedWorkerId)}
                  className="w-full"
                >
                  צור 12 חודשים
                </Button>
              </div>
            </div>

            {/* Help Text */}
            {!clientId && (
              <p className="text-sm text-amber-600 text-right">
                יש לבחור לקוח תחילה
              </p>
            )}
          </div>

          {/* Workers Data Table */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-right">נתוני שכר חודשיים ({workersData.length} חודשים)</h4>
            </div>

            {workersData.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed rounded-md">
                <p className="text-gray-500 mb-2">לא נוצרו שורות עדיין</p>
                <p className="text-sm text-gray-400">
                  בחר עובד, הזן חודש חידוש ולחץ "צור 12 חודשים"
                </p>
              </div>
            ) : (
              <div className="border rounded-md overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-right font-medium">חודש דיווח</th>
                      <th className="px-2 py-2 text-right font-medium">מספר דרכון</th>
                      <th className="px-2 py-2 text-right font-medium">שם מלא</th>
                      <th className="px-2 py-2 text-right font-medium">נתינות</th>
                      <th className="px-2 py-2 text-right font-medium">שכר בסיס (₪)</th>
                      <th className="px-2 py-2 text-right font-medium">תוספת (₪)</th>
                      <th className="px-2 py-2 w-12 text-center">אפס</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workersData.map((worker, index) => (
                      <tr
                        key={index}
                        className="border-t hover:bg-gray-50"
                      >
                        <td className="px-2 py-2">
                          <span className="text-gray-700 font-medium">
                            {worker.month}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded text-xs">
                            {worker.passport_number}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <span className="text-gray-700">
                            {worker.full_name}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <span className="text-gray-600">
                            {worker.nationality || '-'}
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            min="0"
                            value={worker.salary || ''}
                            onChange={(e) => updateWorker(index, 'salary', e.target.value)}
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
                            value={worker.supplement || ''}
                            onChange={(e) => updateWorker(index, 'supplement', e.target.value)}
                            placeholder="0"
                            disabled={disabled}
                            className="text-right rtl:text-right text-sm h-8 w-24"
                            dir="rtl"
                          />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <Button
                            onClick={() => resetRow(index)}
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
                    ))}
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
              <li>אם עובד חדש - מלא מספר דרכון, שם ונתינות</li>
              <li>הזן את חודש החידוש בפורמט MM/YYYY (לדוגמה: 11/2025)</li>
              <li>לחץ "צור 12 חודשים" ליצירת 12 שורות אחורה מחודש החידוש</li>
              <li>מלא את השכר והתוספת לכל חודש</li>
              <li>לחץ על כפתור האיפוס (⟲) לאיפוס שכר ותוספת ל-0</li>
            </ul>
          </div>

          {/* Validation */}
          {workersData.length === 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                יש להזין פרטי עובד וליצור 12 חודשי דיווח כדי להמשיך
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
