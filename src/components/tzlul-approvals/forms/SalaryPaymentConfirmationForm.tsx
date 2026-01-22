import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { SalaryPaymentConfirmationVariables } from '@/types/tzlul-approvals.types';

interface SalaryPaymentConfirmationFormProps {
  value: Partial<SalaryPaymentConfirmationVariables>;
  onChange: (data: Partial<SalaryPaymentConfirmationVariables>) => void;
  disabled?: boolean;
}

const LOCAL_STORAGE_KEY = 'tzlul_tender_number';

export function SalaryPaymentConfirmationForm({ value, onChange, disabled }: SalaryPaymentConfirmationFormProps) {
  // Load tender number from localStorage on mount
  useEffect(() => {
    const savedTenderNumber = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedTenderNumber && !value.tender_number) {
      onChange({ ...value, tender_number: savedTenderNumber });
    }
  }, []);

  // Save tender number to localStorage when it changes
  const handleTenderNumberChange = (newValue: string) => {
    onChange({ ...value, tender_number: newValue });
    if (newValue) {
      localStorage.setItem(LOCAL_STORAGE_KEY, newValue);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">אישור רו"ח בדבר תשלום השכר</CardTitle>
          <CardDescription className="text-right">
            אישור רו"ח בדבר תשלום השכר לעובדי החברה
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Local Authority */}
            <div className="space-y-2">
              <Label htmlFor="local-authority" className="text-right block">
                רשות מקומית 
              </Label>
              <Input
                id="local-authority"
                type="text"
                placeholder="לדוגמה: עיריית כפר יונה"
                value={value.local_authority || ''}
                onChange={(e) => onChange({ ...value, local_authority: e.target.value })}
                disabled={disabled}
                className="text-right rtl:text-right"
                dir="rtl"
              />
            </div>

            {/* Tender Number */}
            <div className="space-y-2">
              <Label htmlFor="tender-number" className="text-right block">
                מספר מכרז 
              </Label>
              <Input
                id="tender-number"
                type="text"
                placeholder="לדוגמה: שנ6/2022/"
                value={value.tender_number || ''}
                onChange={(e) => handleTenderNumberChange(e.target.value)}
                disabled={disabled}
                className="text-right rtl:text-right"
                dir="rtl"
              />
              <p className="text-xs text-gray-500 text-right">
                מספר המכרז נשמר אוטומטית לשימוש חוזר
              </p>
            </div>

            {/* Period Start */}
            <div className="space-y-2">
              <Label htmlFor="period-start" className="text-right block">
                מחודש 
              </Label>
              <Input
                id="period-start"
                type="text"
                placeholder="MM/YY לדוגמה: 09/25"
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
                placeholder="MM/YY לדוגמה: 09/25"
                value={value.period_end || ''}
                onChange={(e) => onChange({ ...value, period_end: e.target.value })}
                disabled={disabled}
                className="text-right rtl:text-right"
                dir="rtl"
              />
            </div>
          </div>

          {/* Fixed Recipient Info */}
          <div className="p-4 bg-gray-50 rounded-md border">
            <Label className="text-right block font-medium mb-2">נמען קבוע</Label>
            <div className="text-sm text-gray-600 text-right space-y-1">
              <p>החברה למשק וכלכלה של השלטון המקומי בע"מ</p>
              <p>היחידה לאכיפת זכויות עובדים</p>
              <p>בפקס מס': 03-5010922</p>
              <p>טל' לאישור 03-5046070</p>
            </div>
          </div>

          {/* Note about attachment */}
          <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
            <p className="text-sm text-blue-800 text-right">
              <strong>שימו לב:</strong> המכתב מתייחס לטבלת עובדים כנספח א'. יש לצרף את הנספח בנפרד.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
