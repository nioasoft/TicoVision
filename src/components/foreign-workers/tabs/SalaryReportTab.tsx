import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { SalaryReportVariables, WorkerData } from '@/types/foreign-workers.types';

interface SalaryReportTabProps {
  value: Partial<SalaryReportVariables>;
  onChange: (data: Partial<SalaryReportVariables>) => void;
  disabled?: boolean;
}

export function SalaryReportTab({ value, onChange, disabled }: SalaryReportTabProps) {
  const [workersData, setWorkersData] = useState<WorkerData[]>(value.workers_data || []);

  useEffect(() => {
    if (workersData.length > 0) {
      onChange({
        ...value,
        workers_data: workersData
      });
    }
  }, [workersData]);

  const addWorker = () => {
    const newWorker: WorkerData = {
      full_name: '',
      passport_number: '',
      month: '',
      nationality: '',
      salary: 0
    };
    setWorkersData([...workersData, newWorker]);
  };

  const removeWorker = (index: number) => {
    setWorkersData(workersData.filter((_, i) => i !== index));
  };

  const updateWorker = (index: number, field: keyof WorkerData, value: string | number) => {
    const updated = [...workersData];
    if (field === 'salary') {
      updated[index][field] = typeof value === 'number' ? value : parseFloat(value as string) || 0;
    } else {
      updated[index][field] = value as string;
    }
    setWorkersData(updated);
  };

  const handlePeriodChange = (field: 'period_start' | 'period_end', dateValue: string) => {
    onChange({
      ...value,
      [field]: dateValue
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">דוח שכר - מומחים זרים</CardTitle>
          <CardDescription className="text-right">
            דוח מיוחד של רואה חשבון בדבר נתונים על תשלום שכר למומחים זרים
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Period Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period-start" className="text-right block">
                תאריך התחלה <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="period-start"
                  type="date"
                  value={value.period_start || ''}
                  onChange={(e) => handlePeriodChange('period_start', e.target.value)}
                  disabled={disabled}
                  className="text-right rtl:text-right"
                  dir="rtl"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="period-end" className="text-right block">
                תאריך סיום <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="period-end"
                  type="date"
                  value={value.period_end || ''}
                  onChange={(e) => handlePeriodChange('period_end', e.target.value)}
                  disabled={disabled}
                  className="text-right rtl:text-right"
                  dir="rtl"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Workers Data Table */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium text-right">פרטי עובדים ({workersData.length})</h4>
              <Button onClick={addWorker} disabled={disabled} variant="outline" size="sm">
                <Plus className="ml-1 h-3 w-3" />
                הוסף עובד
              </Button>
            </div>

            {workersData.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed rounded-md">
                <p className="text-gray-500 mb-4">לא נוספו עובדים עדיין</p>
                <Button onClick={addWorker} disabled={disabled} variant="outline">
                  <Plus className="ml-2 h-4 w-4" />
                  הוסף עובד ראשון
                </Button>
              </div>
            ) : (
              <div className="border rounded-md overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-right font-medium w-8">#</th>
                      <th className="px-2 py-2 text-right font-medium">שם מלא</th>
                      <th className="px-2 py-2 text-right font-medium">מספר דרכון</th>
                      <th className="px-2 py-2 text-right font-medium">חודש דיווח</th>
                      <th className="px-2 py-2 text-right font-medium">נתינות</th>
                      <th className="px-2 py-2 text-right font-medium">שכר בסיס (₪)</th>
                      <th className="px-2 py-2 w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {workersData.map((worker, index) => (
                      <tr key={index} className="border-t hover:bg-gray-50">
                        <td className="px-2 py-2 text-center text-gray-500">{index + 1}</td>
                        <td className="px-2 py-2">
                          <Input
                            value={worker.full_name}
                            onChange={(e) => updateWorker(index, 'full_name', e.target.value)}
                            placeholder="שם מלא"
                            disabled={disabled}
                            className="text-right rtl:text-right text-sm h-8"
                            dir="rtl"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={worker.passport_number}
                            onChange={(e) => updateWorker(index, 'passport_number', e.target.value)}
                            placeholder="מס' דרכון"
                            disabled={disabled}
                            className="text-right rtl:text-right text-sm h-8"
                            dir="rtl"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={worker.month}
                            onChange={(e) => updateWorker(index, 'month', e.target.value)}
                            placeholder="MM/YYYY"
                            disabled={disabled}
                            className="text-right rtl:text-right text-sm h-8"
                            dir="rtl"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            value={worker.nationality}
                            onChange={(e) => updateWorker(index, 'nationality', e.target.value)}
                            placeholder="נתינות"
                            disabled={disabled}
                            className="text-right rtl:text-right text-sm h-8"
                            dir="rtl"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            type="number"
                            min="0"
                            value={worker.salary}
                            onChange={(e) => updateWorker(index, 'salary', e.target.value)}
                            placeholder="0"
                            disabled={disabled}
                            className="text-right rtl:text-right text-sm h-8"
                            dir="rtl"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <Button
                            onClick={() => removeWorker(index)}
                            disabled={disabled}
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
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
            <h4 className="font-medium text-blue-900 mb-2 text-right">הערות חשובות:</h4>
            <ul className="space-y-1 text-sm text-blue-800 text-right list-disc list-inside">
              <li>הדוח מתייחס לשכר ששולם בפועל לעובדים במהלך התקופה הנבדקת</li>
              <li>חודש הדיווח מתייחס לחודש בו שולם השכר</li>
              <li>שכר בסיס כולל משכורת חודשית בסיסית לפני ניכויים</li>
              <li>תשלומים נוספים (בונוסים, שעות נוספות) יסומנו כ"-" בדוח</li>
            </ul>
          </div>

          {/* Validation */}
          {(!value.period_start || !value.period_end || workersData.length === 0) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                יש למלא תקופת דיווח ולהוסיף לפחות עובד אחד
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
