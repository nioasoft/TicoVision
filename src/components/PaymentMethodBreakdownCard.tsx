import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Banknote, FileText, HelpCircle } from 'lucide-react';
import { formatILS, formatNumber } from '@/lib/formatters';
import type { PaymentMethodBreakdown } from '@/types/dashboard.types';

interface Props {
  breakdown: PaymentMethodBreakdown;
  taxYear: number;
}

export function PaymentMethodBreakdownCard({ breakdown, taxYear }: Props) {
  // חישוב סה"כ לקוחות וסכום
  const totalClients =
    breakdown.bank_transfer.count +
    breakdown.cc_single.count +
    breakdown.cc_installments.count +
    breakdown.checks.count +
    breakdown.not_selected.count;

  const totalAmount =
    breakdown.bank_transfer.amount +
    breakdown.cc_single.amount +
    breakdown.cc_installments.amount +
    breakdown.checks.amount +
    breakdown.not_selected.amount;

  return (
    <Card className="border-2 border-indigo-300 shadow-lg">
      <CardHeader className="pb-3 bg-gradient-to-l from-indigo-50 to-blue-50">
        <CardTitle className="text-xl rtl:text-right ltr:text-left text-indigo-700 flex items-center justify-between">
          <span>פירוט אמצעי תשלום - {taxYear}</span>
          <span className="text-2xl">💳</span>
        </CardTitle>
        <p className="text-sm text-gray-500 rtl:text-right ltr:text-left">
          התפלגות לקוחות לפי שיטת תשלום
        </p>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* העברה בנקאית - 9% */}
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Banknote className="w-5 h-5 text-green-700" />
              </div>
              <div className="rtl:text-right ltr:text-left">
                <div className="font-semibold text-gray-900">העברה בנקאית</div>
                <div className="text-xs text-green-700 font-medium">הנחה: 9%</div>
              </div>
            </div>
            <div className="rtl:text-left ltr:text-right">
              <div className="text-lg font-bold text-green-700">
                {formatILS(breakdown.bank_transfer.amount)}
              </div>
              <div className="text-xs text-gray-500">
                {formatNumber(breakdown.bank_transfer.count)} לקוחות
              </div>
            </div>
          </div>

          {/* כרטיס אשראי תשלום יחיד - 8% */}
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <CreditCard className="w-5 h-5 text-blue-700" />
              </div>
              <div className="rtl:text-right ltr:text-left">
                <div className="font-semibold text-gray-900">כרטיס אשראי - תשלום יחיד</div>
                <div className="text-xs text-blue-700 font-medium">הנחה: 8%</div>
              </div>
            </div>
            <div className="rtl:text-left ltr:text-right">
              <div className="text-lg font-bold text-blue-700">
                {formatILS(breakdown.cc_single.amount)}
              </div>
              <div className="text-xs text-gray-500">
                {formatNumber(breakdown.cc_single.count)} לקוחות
              </div>
            </div>
          </div>

          {/* כרטיס אשראי תשלומים - 4% */}
          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-full">
                <CreditCard className="w-5 h-5 text-purple-700" />
              </div>
              <div className="rtl:text-right ltr:text-left">
                <div className="font-semibold text-gray-900">כרטיס אשראי - תשלומים</div>
                <div className="text-xs text-purple-700 font-medium">הנחה: 4%</div>
              </div>
            </div>
            <div className="rtl:text-left ltr:text-right">
              <div className="text-lg font-bold text-purple-700">
                {formatILS(breakdown.cc_installments.amount)}
              </div>
              <div className="text-xs text-gray-500">
                {formatNumber(breakdown.cc_installments.count)} לקוחות
              </div>
            </div>
          </div>

          {/* המחאות - 0% */}
          <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-full">
                <FileText className="w-5 h-5 text-orange-700" />
              </div>
              <div className="rtl:text-right ltr:text-left">
                <div className="font-semibold text-gray-900">המחאות</div>
                <div className="text-xs text-orange-700 font-medium">ללא הנחה</div>
              </div>
            </div>
            <div className="rtl:text-left ltr:text-right">
              <div className="text-lg font-bold text-orange-700">
                {formatILS(breakdown.checks.amount)}
              </div>
              <div className="text-xs text-gray-500">
                {formatNumber(breakdown.checks.count)} לקוחות
              </div>
            </div>
          </div>

          {/* לא נבחר */}
          {breakdown.not_selected.count > 0 && (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-full">
                  <HelpCircle className="w-5 h-5 text-gray-600" />
                </div>
                <div className="rtl:text-right ltr:text-left">
                  <div className="font-semibold text-gray-900">לא נבחר עדיין</div>
                  <div className="text-xs text-gray-500">ממתינים לבחירה</div>
                </div>
              </div>
              <div className="rtl:text-left ltr:text-right">
                <div className="text-lg font-bold text-gray-700">
                  {formatILS(breakdown.not_selected.amount)}
                </div>
                <div className="text-xs text-gray-500">
                  {formatNumber(breakdown.not_selected.count)} לקוחות
                </div>
              </div>
            </div>
          )}
        </div>

        {/* סה"כ */}
        <div className="mt-6 pt-4 border-t-2 border-indigo-200">
          <div className="flex justify-between items-center">
            <div className="rtl:text-right ltr:text-left">
              <div className="text-lg font-bold text-gray-900">סה"כ</div>
              <div className="text-xs text-gray-500">{formatNumber(totalClients)} לקוחות</div>
            </div>
            <div className="text-2xl font-bold text-indigo-700">
              {formatILS(totalAmount)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
