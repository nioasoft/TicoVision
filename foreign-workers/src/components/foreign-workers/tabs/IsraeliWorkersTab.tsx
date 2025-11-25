import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Calculator } from 'lucide-react';
import { useState, useEffect } from 'react';
import type { IsraeliWorkersVariables, MonthlyWorkers } from '@/types/foreign-workers.types';

interface IsraeliWorkersTabProps {
  value: Partial<IsraeliWorkersVariables>;
  onChange: (data: Partial<IsraeliWorkersVariables>) => void;
  disabled?: boolean;
}

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export function IsraeliWorkersTab({ value, onChange, disabled }: IsraeliWorkersTabProps) {
  const [israeliWorkers, setIsraeliWorkers] = useState<MonthlyWorkers[]>(
    value.israeli_workers || []
  );
  const [averageWorkers, setAverageWorkers] = useState<number>(value.average_workers || 0);

  useEffect(() => {
    // Calculate average automatically
    if (israeliWorkers.length > 0) {
      const total = israeliWorkers.reduce((sum, row) => sum + row.employee_count, 0);
      const avg = Math.round((total / israeliWorkers.length) * 10) / 10; // Round to 1 decimal
      setAverageWorkers(avg);

      onChange({
        ...value,
        israeli_workers: israeliWorkers,
        average_workers: avg
      });
    }
  }, [israeliWorkers]);

  const addMonth = () => {
    const newMonth: MonthlyWorkers = {
      month: '',
      employee_count: 0
    };
    setIsraeliWorkers([...israeliWorkers, newMonth]);
  };

  const removeMonth = (index: number) => {
    setIsraeliWorkers(israeliWorkers.filter((_, i) => i !== index));
  };

  const updateMonth = (index: number, field: keyof MonthlyWorkers, value: string | number) => {
    const updated = [...israeliWorkers];
    if (field === 'month') {
      updated[index].month = value as string;
    } else if (field === 'employee_count') {
      updated[index].employee_count = typeof value === 'number' ? value : parseInt(value as string, 10) || 0;
    }
    setIsraeliWorkers(updated);
  };

  const generateDefaultMonths = () => {
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

    const months: MonthlyWorkers[] = [];

    // Last 12 months
    for (let i = 10; i < 12; i++) {
      months.push({
        month: `${HEBREW_MONTHS[i]} ${lastYear}`,
        employee_count: 0
      });
    }
    for (let i = 0; i < 10; i++) {
      months.push({
        month: `${HEBREW_MONTHS[i]} ${currentYear}`,
        employee_count: 0
      });
    }

    setIsraeliWorkers(months);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">דוח עובדים ישראליים</CardTitle>
          <CardDescription className="text-right">
            מספר העובדים הישראליים שהועסקו ב-12 חודשים
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Generate Button */}
          {israeliWorkers.length === 0 && (
            <Button
              onClick={generateDefaultMonths}
              disabled={disabled}
              variant="outline"
              className="w-full"
            >
              <Plus className="ml-2 h-4 w-4" />
              צור 12 חודשים אוטומטית
            </Button>
          )}

          {/* Monthly Workers Table */}
          {israeliWorkers.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-right">עובדים לפי חודש ({israeliWorkers.length}/12)</h4>
                <Button
                  onClick={addMonth}
                  disabled={disabled || israeliWorkers.length >= 12}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="ml-1 h-3 w-3" />
                  הוסף חודש
                </Button>
              </div>

              <div className="border rounded-md overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-right font-medium">חודש</th>
                      <th className="px-4 py-2 text-right font-medium">מספר עובדים</th>
                      <th className="px-4 py-2 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {israeliWorkers.map((row, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2">
                          <Input
                            value={row.month}
                            onChange={(e) => updateMonth(index, 'month', e.target.value)}
                            placeholder="לדוגמה: ינואר 2025"
                            disabled={disabled}
                            className="text-right rtl:text-right"
                            dir="rtl"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Input
                            type="number"
                            min="0"
                            value={row.employee_count}
                            onChange={(e) => updateMonth(index, 'employee_count', e.target.value)}
                            placeholder="0"
                            disabled={disabled}
                            className="text-right rtl:text-right"
                            dir="rtl"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <Button
                            onClick={() => removeMonth(index)}
                            disabled={disabled}
                            variant="ghost"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </td>
                      </tr>
                    ))}
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
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {israeliWorkers.length !== 12 && (
                <p className="text-sm text-yellow-600 text-right">
                  מומלץ למלא בדיוק 12 חודשים לחישוב ממוצע מדויק
                </p>
              )}
            </div>
          )}

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800 text-right">
              <strong>הערה:</strong> הממוצע מחושב אוטומטית על ידי המערכת בהתבסס על כל החודשים שהוזנו.
              ממוצע זה יופיע בדוח הסופי.
            </p>
          </div>

          {/* Validation */}
          {israeliWorkers.length === 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                יש למלא לפחות חודש אחד
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
