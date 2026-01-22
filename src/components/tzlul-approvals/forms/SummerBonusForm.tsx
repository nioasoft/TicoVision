import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { SummerBonusVariables } from '@/types/tzlul-approvals.types';

interface SummerBonusFormProps {
  value: Partial<SummerBonusVariables>;
  onChange: (data: Partial<SummerBonusVariables>) => void;
  disabled?: boolean;
}

export function SummerBonusForm({ value, onChange, disabled }: SummerBonusFormProps) {
  const handleAddInvoice = () => {
    onChange({
      ...value,
      invoice_numbers: [...(value.invoice_numbers || []), '']
    });
  };

  const handleRemoveInvoice = (index: number) => {
    if ((value.invoice_numbers?.length || 0) > 1) {
      onChange({
        ...value,
        invoice_numbers: value.invoice_numbers?.filter((_, i) => i !== index)
      });
    }
  };

  const handleInvoiceChange = (index: number, newValue: string) => {
    const newInvoices = [...(value.invoice_numbers || [])];
    newInvoices[index] = newValue;
    onChange({ ...value, invoice_numbers: newInvoices });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">חוות דעת מענק קיץ</CardTitle>
          <CardDescription className="text-right">
            חוות דעת רו"ח לעניין תשלומים והפרשות בגין מענק קיץ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Month/Year */}
          <div className="space-y-2">
            <Label htmlFor="month-year" className="text-right block">
              חודש/שנה 
            </Label>
            <Input
              id="month-year"
              type="text"
              value={value.month_year || ''}
              onChange={(e) => onChange({ ...value, month_year: e.target.value })}
              disabled={disabled}
              className="text-right rtl:text-right"
              dir="rtl"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="text-right block">
              מיקום 
            </Label>
            <Input
              id="location"
              type="text"
              value={value.location || ''}
              onChange={(e) => onChange({ ...value, location: e.target.value })}
              disabled={disabled}
              className="text-right rtl:text-right"
              dir="rtl"
            />
          </div>

          {/* Contract Number */}
          <div className="space-y-2">
            <Label htmlFor="contract-number" className="text-right block">
              מספר חוזה 
            </Label>
            <Input
              id="contract-number"
              type="text"
              value={value.contract_number || ''}
              onChange={(e) => onChange({ ...value, contract_number: e.target.value })}
              disabled={disabled}
              className="text-right rtl:text-right"
              dir="rtl"
            />
          </div>

          {/* Total Amount */}
          <div className="space-y-2">
            <Label htmlFor="total-amount" className="text-right block">
              סכום כולל (ש"ח) 
            </Label>
            <Input
              id="total-amount"
              type="number"
              value={value.total_amount || ''}
              onChange={(e) => onChange({ ...value, total_amount: parseFloat(e.target.value) || 0 })}
              disabled={disabled}
              className="text-right rtl:text-right"
              dir="rtl"
            />
          </div>

          {/* Invoice Numbers */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-right">מספרי חשבוניות </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddInvoice}
                disabled={disabled}
                className="gap-1"
              >
                <Plus className="h-4 w-4" />
                הוסף חשבונית
              </Button>
            </div>
            <div className="space-y-2">
              {(value.invoice_numbers || ['']).map((invoice, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    value={invoice}
                    onChange={(e) => handleInvoiceChange(index, e.target.value)}
                    disabled={disabled}
                    className="text-right rtl:text-right flex-1"
                    dir="rtl"
                  />
                  {(value.invoice_numbers?.length || 0) > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveInvoice(index)}
                      disabled={disabled}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Document Preview Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2 text-right">תוכן המסמך:</h4>
            <p className="text-sm text-blue-800 text-right">
              חוות דעת על תחשיב תשלומים והפרשות בגין מענק קיץ בחודש{' '}
              <strong>{value.month_year || '_'}</strong> בסך{' '}
              <strong>{value.total_amount?.toLocaleString('he-IL') || '_'}</strong> ש"ח
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
