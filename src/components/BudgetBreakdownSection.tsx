import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { formatILS, formatNumber } from '@/lib/formatters';
import type { BudgetByCategory } from '@/types/dashboard.types';

interface Props {
  breakdown: BudgetByCategory;
  taxYear: number;
}

export function BudgetBreakdownSection({ breakdown, taxYear }: Props) {
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null);

  const toggleExpand = (column: string) => {
    setExpandedColumn(expandedColumn === column ? null : column);
  };

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
            <div className="text-3xl font-bold text-blue-700 mb-1">
              {formatILS(breakdown.audit_total)}
            </div>
            <p className="text-xs text-gray-500">כולל מע"מ 18%</p>

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
                      {formatILS(breakdown.audit_external.with_vat)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>לפני מע"מ: {formatILS(breakdown.audit_external.before_vat)}</span>
                    <span>{formatNumber(breakdown.audit_external.client_count)} לקוחות</span>
                  </div>
                </div>

                {/* פנימיים */}
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-700">לקוחות פנימיים</span>
                    <span className="text-blue-700 font-bold">
                      {formatILS(breakdown.audit_internal.with_vat)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>לפני מע"מ: {formatILS(breakdown.audit_internal.before_vat)}</span>
                    <span>{formatNumber(breakdown.audit_internal.client_count)} לקוחות</span>
                  </div>
                </div>

                {/* ריטיינר 1/3 */}
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-700">ריטיינר (1/3)</span>
                    <span className="text-blue-700 font-bold">
                      {formatILS(breakdown.audit_retainer.with_vat)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>לפני מע"מ: {formatILS(breakdown.audit_retainer.before_vat)}</span>
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
            <div className="text-3xl font-bold text-purple-700 mb-1">
              {formatILS(breakdown.bookkeeping_total)}
            </div>
            <p className="text-xs text-gray-500">כולל מע"מ 18%</p>

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
                      {formatILS(breakdown.bookkeeping_internal.with_vat)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>לפני מע"מ: {formatILS(breakdown.bookkeeping_internal.before_vat)}</span>
                    <span>{formatNumber(breakdown.bookkeeping_internal.client_count)} לקוחות</span>
                  </div>
                </div>

                {/* ריטיינר 2/3 */}
                <div className="bg-gray-50 p-3 rounded-md">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-gray-700">ריטיינר (2/3)</span>
                    <span className="text-purple-700 font-bold">
                      {formatILS(breakdown.bookkeeping_retainer.with_vat)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>לפני מע"מ: {formatILS(breakdown.bookkeeping_retainer.before_vat)}</span>
                    <span>{formatNumber(breakdown.bookkeeping_retainer.client_count)} לקוחות</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 3️⃣ חריגים */}
        <Card className="border-orange-200 opacity-60">
          <CardHeader className="pb-3 bg-orange-50">
            <CardTitle className="text-lg rtl:text-right ltr:text-left text-orange-700 flex items-center justify-between">
              <span>חריגים</span>
              <span className="text-2xl">⚡</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="text-3xl font-bold text-gray-400 mb-1">
              ₪0
            </div>
            <p className="text-xs text-gray-400">בקרוב</p>

            <div className="mt-4 px-3 py-2 bg-orange-50 rounded-md flex items-start gap-2">
              <AlertCircle size={16} className="text-orange-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-orange-700">
                הכנסות חריגות יתווספו בגרסה הבאה
              </p>
            </div>
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
            <div className="text-3xl font-bold text-green-700 mb-1">
              {formatILS(breakdown.freelancers.with_vat)}
            </div>
            <p className="text-xs text-gray-500">כולל מע"מ 18%</p>

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
                      {formatILS(breakdown.freelancers.with_vat)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>לפני מע"מ:</span>
                      <span>{formatILS(breakdown.freelancers.before_vat)}</span>
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
                כולל כל הקטגוריות + מע"מ 18%
              </p>
            </div>
            <div className="text-4xl font-bold text-blue-700">
              {formatILS(breakdown.grand_total)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
