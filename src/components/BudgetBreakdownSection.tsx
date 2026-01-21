import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { formatILS, formatNumber } from '@/lib/formatters';
import type { BudgetByCategory } from '@/types/dashboard.types';

interface Props {
  breakdown: BudgetByCategory;
  taxYear: number;
}

export function BudgetBreakdownSection({ breakdown, taxYear }: Props) {
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null);
  const [showStandard, setShowStandard] = useState(true); // Toggle for showing standard amounts

  const toggleExpand = (column: string) => {
    setExpandedColumn(expandedColumn === column ? null : column);
  };

  // חישוב סכומים בפועל (ACTUAL - after discounts) לכל קטגוריה
  const auditActualBeforeVat =
    breakdown.audit_external.actual_before_vat +
    breakdown.audit_internal.actual_before_vat +
    breakdown.audit_retainer.actual_before_vat;

  const bookkeepingActualBeforeVat =
    breakdown.bookkeeping_internal.actual_before_vat +
    breakdown.bookkeeping_retainer.actual_before_vat;

  const billingLettersActualBeforeVat = breakdown.billing_letters?.actual_before_vat || 0;

  const grandTotalActualBeforeVat =
    auditActualBeforeVat +
    bookkeepingActualBeforeVat +
    breakdown.freelancers.actual_before_vat +
    billingLettersActualBeforeVat +
    breakdown.exceptions.actual_before_vat;

  // חישוב סכומים תקן (STANDARD - before discounts) לכל קטגוריה
  const auditBeforeVat =
    breakdown.audit_external.before_vat +
    breakdown.audit_internal.before_vat +
    breakdown.audit_retainer.before_vat;

  const bookkeepingBeforeVat =
    breakdown.bookkeeping_internal.before_vat +
    breakdown.bookkeeping_retainer.before_vat;

  const billingLettersBeforeVat = breakdown.billing_letters?.before_vat || 0;

  const grandTotalBeforeVat =
    auditBeforeVat +
    bookkeepingBeforeVat +
    breakdown.freelancers.before_vat +
    billingLettersBeforeVat +
    breakdown.exceptions.before_vat;

  return (
    <div className="space-y-6 mt-8">
      {/* כותרת */}
      <div className="border-b pb-3">
        <h2 className="text-2xl font-bold text-gray-900 rtl:text-right ltr:text-left">
          פירוט תקציב לשנת {taxYear}
        </h2>
        <p className="text-sm text-gray-500 mt-1 rtl:text-right ltr:text-left">
          חלוקה לפי סוגי שירותים ולקוחות
        </p>
      </div>

      {/* 4 עמודות אופקיות */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* 1️⃣ ראיית חשבון */}
        <Card className="hover:shadow-lg transition-shadow border-blue-200">
          <CardHeader className="pb-3 bg-blue-50">
            <CardTitle className="text-lg rtl:text-right ltr:text-left text-blue-700 flex items-center justify-between">
              <span>ראיית חשבון</span>
              <span className="text-2xl">📊</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {/* סכום בפועל - בולט */}
            <div className="text-3xl font-bold text-blue-700 mb-1">
              {formatILS(auditActualBeforeVat)}
            </div>
            {/* סכום תקן - קטן עם toggle */}
            {showStandard && (
              <button
                onClick={() => setShowStandard(false)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-1"
              >
                <Eye className="w-3 h-3" />
                <span>תקן: {formatILS(auditBeforeVat)}</span>
              </button>
            )}
            {!showStandard && (
              <button
                onClick={() => setShowStandard(true)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-1"
              >
                <EyeOff className="w-3 h-3" />
                <span>הצג תקן</span>
              </button>
            )}
            <p className="text-xs text-gray-500">כולל מע"מ: {formatILS(breakdown.audit_total)}</p>

            <button
              onClick={() => toggleExpand('audit')}
              className="w-full mt-4 px-3 py-2 flex items-center justify-between text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            >
              <span>מורכב מ-{' '}
                {breakdown.audit_external.client_count +
                 breakdown.audit_internal.client_count +
                 breakdown.audit_retainer.client_count} לקוחות
              </span>
              {expandedColumn === 'audit' ?
                <ChevronUp size={18} /> :
                <ChevronDown size={18} />
              }
            </button>

            {expandedColumn === 'audit' && (
              <div className="mt-4 space-y-3 text-sm border-t border-blue-100 pt-4">
                {/* חיצוניים */}
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-700">לקוחות חיצוניים</span>
                    <span className="text-blue-700 font-bold">
                      {formatILS(breakdown.audit_external.before_vat)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>כולל מע"מ: {formatILS(breakdown.audit_external.with_vat)}</span>
                    <span>{formatNumber(breakdown.audit_external.client_count)} לקוחות</span>
                  </div>
                </div>

                {/* פנימיים */}
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-700">לקוחות פנימיים</span>
                    <span className="text-blue-700 font-bold">
                      {formatILS(breakdown.audit_internal.before_vat)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>כולל מע"מ: {formatILS(breakdown.audit_internal.with_vat)}</span>
                    <span>{formatNumber(breakdown.audit_internal.client_count)} לקוחות</span>
                  </div>
                </div>

                {/* ריטיינר 1/3 */}
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-700">ריטיינר (1/3)</span>
                    <span className="text-blue-700 font-bold">
                      {formatILS(breakdown.audit_retainer.before_vat)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>כולל מע"מ: {formatILS(breakdown.audit_retainer.with_vat)}</span>
                    <span>{formatNumber(breakdown.audit_retainer.client_count)} לקוחות</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2️⃣ הנהלת חשבונות */}
        <Card className="hover:shadow-lg transition-shadow border-purple-200">
          <CardHeader className="pb-3 bg-purple-50">
            <CardTitle className="text-lg rtl:text-right ltr:text-left text-purple-700 flex items-center justify-between">
              <span>הנהלת חשבונות</span>
              <span className="text-2xl">💼</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {/* סכום בפועל - בולט */}
            <div className="text-3xl font-bold text-purple-700 mb-1">
              {formatILS(bookkeepingActualBeforeVat)}
            </div>
            {/* סכום תקן - קטן עם toggle */}
            {showStandard && (
              <button
                onClick={() => setShowStandard(false)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-1"
              >
                <Eye className="w-3 h-3" />
                <span>תקן: {formatILS(bookkeepingBeforeVat)}</span>
              </button>
            )}
            {!showStandard && (
              <button
                onClick={() => setShowStandard(true)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-1"
              >
                <EyeOff className="w-3 h-3" />
                <span>הצג תקן</span>
              </button>
            )}
            <p className="text-xs text-gray-500">כולל מע"מ: {formatILS(breakdown.bookkeeping_total)}</p>

            <button
              onClick={() => toggleExpand('bookkeeping')}
              className="w-full mt-4 px-3 py-2 flex items-center justify-between text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
            >
              <span>מורכב מ-{' '}
                {breakdown.bookkeeping_internal.client_count +
                 breakdown.bookkeeping_retainer.client_count} לקוחות
              </span>
              {expandedColumn === 'bookkeeping' ?
                <ChevronUp size={18} /> :
                <ChevronDown size={18} />
              }
            </button>

            {expandedColumn === 'bookkeeping' && (
              <div className="mt-4 space-y-3 text-sm border-t border-purple-100 pt-4">
                {/* פנימיים */}
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-700">לקוחות פנימיים</span>
                    <span className="text-purple-700 font-bold">
                      {formatILS(breakdown.bookkeeping_internal.before_vat)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>כולל מע"מ: {formatILS(breakdown.bookkeeping_internal.with_vat)}</span>
                    <span>{formatNumber(breakdown.bookkeeping_internal.client_count)} לקוחות</span>
                  </div>
                </div>

                {/* ריטיינר 2/3 */}
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-700">ריטיינר (2/3)</span>
                    <span className="text-purple-700 font-bold">
                      {formatILS(breakdown.bookkeeping_retainer.before_vat)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>כולל מע"מ: {formatILS(breakdown.bookkeeping_retainer.with_vat)}</span>
                    <span>{formatNumber(breakdown.bookkeeping_retainer.client_count)} לקוחות</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3️⃣ הכנסה חריגה (מכתבי חיוב) */}
        <Card className="hover:shadow-lg transition-shadow border-orange-200">
          <CardHeader className="pb-3 bg-orange-50">
            <CardTitle className="text-lg rtl:text-right ltr:text-left text-orange-700 flex items-center justify-between">
              <span>הכנסה חריגה</span>
              <span className="text-2xl">⚡</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {/* סכום בפועל - בולט */}
            <div className="text-3xl font-bold text-orange-700 mb-1">
              {formatILS(billingLettersActualBeforeVat)}
            </div>
            {/* סכום תקן - קטן עם toggle */}
            {showStandard && (
              <button
                onClick={() => setShowStandard(false)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-1"
              >
                <Eye className="w-3 h-3" />
                <span>תקן: {formatILS(billingLettersBeforeVat)}</span>
              </button>
            )}
            {!showStandard && (
              <button
                onClick={() => setShowStandard(true)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-1"
              >
                <EyeOff className="w-3 h-3" />
                <span>הצג תקן</span>
              </button>
            )}
            <p className="text-xs text-gray-500">כולל מע"מ: {formatILS(breakdown.billing_letters?.with_vat || 0)}</p>

            <button
              onClick={() => toggleExpand('billing')}
              className="w-full mt-4 px-3 py-2 flex items-center justify-between text-sm font-medium text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
            >
              <span>{formatNumber(breakdown.billing_letters?.client_count || 0)} מכתבי חיוב</span>
              {expandedColumn === 'billing' ?
                <ChevronUp size={18} /> :
                <ChevronDown size={18} />
              }
            </button>

            {expandedColumn === 'billing' && (
              <div className="mt-4 text-sm border-t border-orange-100 pt-4">
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-700">סה"כ חיובים</span>
                    <span className="text-orange-700 font-bold">
                      {formatILS(billingLettersBeforeVat)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>כולל מע"מ:</span>
                      <span>{formatILS(breakdown.billing_letters?.with_vat || 0)}</span>
                    </div>
                    <p className="text-gray-500 mt-2">
                      מכתבי חיוב כלליים (לא שכ"ט)
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 4️⃣ עצמאים */}
        <Card className="hover:shadow-lg transition-shadow border-green-200">
          <CardHeader className="pb-3 bg-green-50">
            <CardTitle className="text-lg rtl:text-right ltr:text-left text-green-700 flex items-center justify-between">
              <span>עצמאים</span>
              <span className="text-2xl">👤</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {/* סכום בפועל - בולט */}
            <div className="text-3xl font-bold text-green-700 mb-1">
              {formatILS(breakdown.freelancers.actual_before_vat)}
            </div>
            {/* סכום תקן - קטן עם toggle */}
            {showStandard && (
              <button
                onClick={() => setShowStandard(false)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-1"
              >
                <Eye className="w-3 h-3" />
                <span>תקן: {formatILS(breakdown.freelancers.before_vat)}</span>
              </button>
            )}
            {!showStandard && (
              <button
                onClick={() => setShowStandard(true)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-1"
              >
                <EyeOff className="w-3 h-3" />
                <span>הצג תקן</span>
              </button>
            )}
            <p className="text-xs text-gray-500">כולל מע"מ: {formatILS(breakdown.freelancers.with_vat)}</p>

            <button
              onClick={() => toggleExpand('freelancers')}
              className="w-full mt-4 px-3 py-2 flex items-center justify-between text-sm font-medium text-green-600 hover:bg-green-50 rounded-md transition-colors"
            >
              <span>{formatNumber(breakdown.freelancers.client_count)} לקוחות</span>
              {expandedColumn === 'freelancers' ?
                <ChevronUp size={18} /> :
                <ChevronDown size={18} />
              }
            </button>

            {expandedColumn === 'freelancers' && (
              <div className="mt-4 text-sm border-t border-green-100 pt-4">
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-700">סה"כ הכנסות</span>
                    <span className="text-green-700 font-bold">
                      {formatILS(breakdown.freelancers.before_vat)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>כולל מע"מ:</span>
                      <span>{formatILS(breakdown.freelancers.with_vat)}</span>
                    </div>
                    <p className="text-gray-500 mt-2">
                      כולל ראיית חשבון + הנהלת חשבונות
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* סה"כ תקציב המשרד */}
      <Card className="bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 border-2 border-blue-300 shadow-lg">
        <CardContent className="py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-right">
              <h3 className="text-xl font-bold text-gray-900 mb-1">
                סה"כ תקציב המשרד לשנת {taxYear}
              </h3>
              <p className="text-sm text-gray-600">
                כולל מע"מ: {formatILS(breakdown.grand_total)}
              </p>
            </div>
            <div className="flex flex-col items-center gap-2">
              {/* סכום בפועל - בולט */}
              <div className="text-4xl font-bold text-blue-700">
                {formatILS(grandTotalActualBeforeVat)}
              </div>
              {/* סכום תקן - קטן עם toggle */}
              {showStandard && (
                <button
                  onClick={() => setShowStandard(false)}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                >
                  <Eye className="w-4 h-4" />
                  <span>תקן: {formatILS(grandTotalBeforeVat)}</span>
                </button>
              )}
              {!showStandard && (
                <button
                  onClick={() => setShowStandard(true)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
                >
                  <EyeOff className="w-4 h-4" />
                  <span>הצג תקן</span>
                </button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
