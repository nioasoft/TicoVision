import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatILS } from '@/lib/formatters';

interface BankTransferDiscountCalculatorProps {
  baseAmount: number; // סכום בסיס לפני כל הנחה (כבר כולל מדד והתאמות)
  onBankTransferOnlyChange: (enabled: boolean, discount: number, amounts: BankTransferAmounts | null) => void;
}

export interface BankTransferAmounts {
  beforeDiscount: number;      // לפני הנחה (לפני מע"מ)
  afterDiscountNoVat: number;   // אחרי הנחה (לפני מע"מ)
  afterDiscountWithVat: number; // אחרי הנחה (כולל מע"מ)
}

export function BankTransferDiscountCalculator({
  baseAmount,
  onBankTransferOnlyChange,
}: BankTransferDiscountCalculatorProps) {
  const [enabled, setEnabled] = useState(false);
  const [discount, setDiscount] = useState<number>(9); // ברירת מחדל 9% כמו העברה בנקאית רגילה
  const [amounts, setAmounts] = useState<BankTransferAmounts | null>(null);

  // חישוב הסכומים בזמן אמת
  useEffect(() => {
    if (enabled && baseAmount > 0) {
      const beforeDiscount = baseAmount; // לפני הנחה, לפני מע"מ
      const discountAmount = beforeDiscount * (discount / 100);
      const afterDiscountNoVat = beforeDiscount - discountAmount;
      const afterDiscountWithVat = afterDiscountNoVat * 1.18; // הוספת מע"מ 18%

      const calculatedAmounts: BankTransferAmounts = {
        beforeDiscount,
        afterDiscountNoVat,
        afterDiscountWithVat,
      };

      setAmounts(calculatedAmounts);
      onBankTransferOnlyChange(true, discount, calculatedAmounts);
    } else {
      setAmounts(null);
      onBankTransferOnlyChange(false, 0, null);
    }
  }, [enabled, discount, baseAmount, onBankTransferOnlyChange]);

  const handleCheckboxChange = (checked: boolean) => {
    setEnabled(checked);
  };

  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 15) {
      setDiscount(value);
    }
  };

  return (
    <div className="space-y-4">
      {/* Checkbox */}
      <div className="flex items-center gap-3 justify-start mb-6 bg-green-50 p-4 rounded-lg border border-green-200">
        <div className="bg-white p-1 rounded shadow-sm border border-gray-300">
          <Checkbox
            id="bank-transfer-only"
            checked={enabled}
            onCheckedChange={handleCheckboxChange}
          />
        </div>
        <Label
          htmlFor="bank-transfer-only"
          className="text-base font-medium cursor-pointer"
        >
          החלף אזור תשלום קבוע בהעברה בנקאית
        </Label>
      </div>

      {/* Input + תצוגת סכומים */}
      {enabled && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6 space-y-4">
            {/* בחירת אחוז הנחה */}
            <div className="flex items-center gap-3" dir="rtl">
              <Label htmlFor="bank-discount" className="text-right">
                אחוז הנחה:
              </Label>
              <span>%</span>
              <Input
                id="bank-discount"
                type="number"
                min="0"
                max="15"
                step="0.5"
                value={discount}
                onChange={handleDiscountChange}
                className="w-24 text-center"
              />
              <span className="text-sm text-muted-foreground text-right">
                (0-15%)
              </span>
            </div>

            {/* תצוגת סכומים מחושבים */}
            {amounts && (
              <div className="space-y-3 pt-4 border-t border-blue-300">
                <h4 className="font-semibold text-blue-900 text-right">
                  סכומים מחושבים:
                </h4>

                <div className="grid grid-cols-1 gap-3">
                  {/* לפני הנחה */}
                  <div className="flex justify-between items-center bg-white p-3 rounded-md" dir="rtl">
                    <span className="text-sm text-right">
                      סכום לפני הנחה (לפני מע"מ):
                    </span>
                    <span className="font-semibold text-lg">
                      {formatILS(amounts.beforeDiscount)}
                    </span>
                  </div>

                  {/* אחרי הנחה לפני מע"מ */}
                  <div className="flex justify-between items-center bg-white p-3 rounded-md" dir="rtl">
                    <span className="text-sm text-right">
                      סכום אחרי {discount}% הנחה (לפני מע"מ):
                    </span>
                    <span className="font-semibold text-lg text-blue-600">
                      {formatILS(amounts.afterDiscountNoVat)}
                    </span>
                  </div>

                  {/* אחרי הנחה כולל מע"מ */}
                  <div className="flex justify-between items-center bg-blue-100 p-3 rounded-md border-2 border-blue-400" dir="rtl">
                    <span className="text-sm font-semibold text-right">
                      סכום לתשלום (כולל מע"מ):
                    </span>
                    <span className="font-bold text-xl text-blue-700">
                      {formatILS(amounts.afterDiscountWithVat)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
