import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { RecipientLinesInput } from '../RecipientLinesInput';
import type { EmployeePaymentsVariables, EmployeePaymentRow } from '@/types/tzlul-approvals.types';

interface EmployeePaymentsFormProps {
  value: Partial<EmployeePaymentsVariables>;
  onChange: (data: Partial<EmployeePaymentsVariables>) => void;
  disabled?: boolean;
}

const emptyEmployee: EmployeePaymentRow = {
  name: '',
  id_number: '',
  month: '',
  amount: 0,
  payment_date: ''
};

export function EmployeePaymentsForm({ value, onChange, disabled }: EmployeePaymentsFormProps) {
  const employees = value.employees_table || [];

  const handleAddEmployee = () => {
    onChange({
      ...value,
      employees_table: [...employees, { ...emptyEmployee }]
    });
  };

  const handleRemoveEmployee = (index: number) => {
    onChange({
      ...value,
      employees_table: employees.filter((_, i) => i !== index)
    });
  };

  const handleEmployeeChange = (index: number, field: keyof EmployeePaymentRow, fieldValue: string | number) => {
    const newEmployees = [...employees];
    newEmployees[index] = { ...newEmployees[index], [field]: fieldValue };
    onChange({ ...value, employees_table: newEmployees });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">אישור תשלומים לעובדים</CardTitle>
          <CardDescription className="text-right">
            אישור רו"ח בדבר תשלום השכר לעובדי החברה
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Recipient Lines */}
          <RecipientLinesInput
            value={value.recipient_lines || ['החברה למשק וכלכלה של השלטון המקומי בע"מ', 'היחידה לאכיפת זכויות עובדים']}
            onChange={(lines) => onChange({ ...value, recipient_lines: lines })}
            disabled={disabled}
            label="נמען (לכבוד)"
          />

          <div className="grid grid-cols-2 gap-4">
            {/* Tender Number */}
            <div className="space-y-2">
              <Label htmlFor="tender-number" className="text-right block">
                מספר מכרז 
              </Label>
              <Input
                id="tender-number"
                type="text"
                value={value.tender_number || ''}
                onChange={(e) => onChange({ ...value, tender_number: e.target.value })}
                disabled={disabled}
                className="text-right rtl:text-right"
                dir="rtl"
              />
            </div>

            {/* Municipality Name */}
            <div className="space-y-2">
              <Label htmlFor="municipality" className="text-right block">
                שם הרשות 
              </Label>
              <Input
                id="municipality"
                type="text"
                value={value.municipality_name || ''}
                onChange={(e) => onChange({ ...value, municipality_name: e.target.value })}
                disabled={disabled}
                className="text-right rtl:text-right"
                dir="rtl"
              />
            </div>

            {/* Period Start */}
            <div className="space-y-2">
              <Label htmlFor="period-start" className="text-right block">
                מחודש 
              </Label>
              <Input
                id="period-start"
                type="text"
                value={value.period_start || ''}
                onChange={(e) => onChange({ ...value, period_start: e.target.value })}
                disabled={disabled}
                className="text-right rtl:text-right"
                dir="rtl"
              />
            </div>

            {/* Period End */}
            <div className="space-y-2">
              <Label htmlFor="period-end" className="text-right block">
                עד חודש 
              </Label>
              <Input
                id="period-end"
                type="text"
                value={value.period_end || ''}
                onChange={(e) => onChange({ ...value, period_end: e.target.value })}
                disabled={disabled}
                className="text-right rtl:text-right"
                dir="rtl"
              />
            </div>
          </div>

          {/* Employees Table */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-right font-medium">טבלת עובדים</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddEmployee}
                disabled={disabled}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                הוסף עובד
              </Button>
            </div>

            {employees.length === 0 ? (
              <div className="p-4 border border-dashed rounded-md text-center text-gray-500">
                לחץ על "הוסף עובד" כדי להתחיל להזין נתונים
              </div>
            ) : (
              <div className="space-y-4">
                {employees.map((emp, index) => (
                  <div key={index} className="p-4 border rounded-md space-y-3 bg-gray-50">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">עובד {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveEmployee(index)}
                        disabled={disabled}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        value={emp.name}
                        onChange={(e) => handleEmployeeChange(index, 'name', e.target.value)}
                        disabled={disabled}
                        className="text-right rtl:text-right"
                        dir="rtl"
                      />
                      <Input
                        value={emp.id_number}
                        onChange={(e) => handleEmployeeChange(index, 'id_number', e.target.value)}
                        disabled={disabled}
                        className="text-right rtl:text-right"
                        dir="rtl"
                      />
                      <Input
                        value={emp.month}
                        onChange={(e) => handleEmployeeChange(index, 'month', e.target.value)}
                        disabled={disabled}
                        className="text-right rtl:text-right"
                        dir="rtl"
                      />
                      <Input
                        type="number"
                        value={emp.amount || ''}
                        onChange={(e) => handleEmployeeChange(index, 'amount', parseFloat(e.target.value) || 0)}
                        disabled={disabled}
                        className="text-right rtl:text-right"
                        dir="rtl"
                      />
                      <Input
                        value={emp.payment_date}
                        onChange={(e) => handleEmployeeChange(index, 'payment_date', e.target.value)}
                        disabled={disabled}
                        className="text-right rtl:text-right col-span-2"
                        dir="rtl"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
