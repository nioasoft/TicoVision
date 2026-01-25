import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { HealthBenefitsVariables, HealthBenefitsInvoice } from '@/types/tzlul-approvals.types';

interface HealthBenefitsFormProps {
  value: Partial<HealthBenefitsVariables>;
  onChange: (data: Partial<HealthBenefitsVariables>) => void;
  disabled?: boolean;
}

export function HealthBenefitsForm({ value, onChange, disabled }: HealthBenefitsFormProps) {
  const handleAddInvoice = () => {
    onChange({
      ...value,
      invoices: [...(value.invoices || []), { invoice_number: '', amount: 0 }]
    });
  };

  const handleRemoveInvoice = (index: number) => {
    if ((value.invoices?.length || 0) > 1) {
      onChange({
        ...value,
        invoices: value.invoices?.filter((_, i) => i !== index)
      });
    }
  };

  const handleInvoiceChange = (index: number, field: keyof HealthBenefitsInvoice, newValue: string | number) => {
    const newInvoices = [...(value.invoices || [])];
    newInvoices[index] = {
      ...newInvoices[index],
      [field]: newValue
    };
    onChange({ ...value, invoices: newInvoices });
  };

  // Calculate total amount for display
  const totalAmount = (value.invoices || []).reduce((sum, inv) => sum + (inv.amount || 0), 0);

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">חוות דעת הבראה/מחלה/ותק</CardTitle>
          <CardDescription className="text-right">
            חוות דעת רו"ח לעניין תשלומים והפרשות בגין דמי הבראה, מחלה ותוספת ותק
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
            <p className="text-xs text-gray-500 text-right">
              ברירת מחדל: רשות שדות התעופה – גשר אלנבי
            </p>
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
            <p className="text-xs text-gray-500 text-right">
              ברירת מחדל: 2022/070/0002/00
            </p>
          </div>

          {/* Invoices */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-right">חשבוניות </Label>
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
            <div className="space-y-3">
              {(value.invoices || [{ invoice_number: '', amount: 0 }]).map((invoice, index) => (
                <div key={index} className="flex gap-3 items-end p-3 bg-gray-50 rounded-md">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-gray-600">מספר חשבונית</Label>
                    <Input
                      value={invoice.invoice_number}
                      onChange={(e) => handleInvoiceChange(index, 'invoice_number', e.target.value)}
                      disabled={disabled}
                      className="text-right rtl:text-right"
                      dir="rtl"

                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-gray-600">סכום (ש"ח)</Label>
                    <Input
                      type="number"
                      value={invoice.amount || ''}
                      onChange={(e) => handleInvoiceChange(index, 'amount', parseFloat(e.target.value) || 0)}
                      disabled={disabled}
                      className="text-right rtl:text-right"
                      dir="rtl"

                    />
                  </div>
                  {(value.invoices?.length || 0) > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveInvoice(index)}
                      disabled={disabled}
                      className="text-red-500 hover:text-red-700 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {/* Total display */}
            {totalAmount > 0 && (
              <div className="text-sm text-gray-600 text-right mt-2">
                סה"כ: <strong>{totalAmount.toLocaleString('he-IL')}</strong> ש"ח
              </div>
            )}
          </div>

          {/* Document Preview Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2 text-right">תוכן המסמך:</h4>
            <p className="text-sm text-blue-800 text-right">
              חוות דעת על תחשיב תשלומים והפרשות בגין דמי הבראה, מחלה ותוספת ותק בחודש{' '}
              <strong>{value.month_year || '_'}</strong>
              {(value.invoices?.length || 0) > 0 && value.invoices?.some(inv => inv.amount > 0) && (
                <>
                  {' '}בסך של{' '}
                  {value.invoices
                    ?.filter(inv => inv.invoice_number && inv.amount > 0)
                    .map((inv, idx, arr) => (
                      <span key={idx}>
                        <strong>{inv.amount.toLocaleString('he-IL')}</strong> ש"ח בחשבונית מספר <strong>{inv.invoice_number}</strong>
                        {idx < arr.length - 1 ? ' ו' : ''}
                      </span>
                    ))}
                </>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
