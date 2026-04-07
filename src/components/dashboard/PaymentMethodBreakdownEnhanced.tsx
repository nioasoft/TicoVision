/**
 * PaymentMethodBreakdownEnhanced Component
 * Show payment method breakdown with clickable client lists
 * Each payment method card opens a popup with detailed client breakdown
 */

import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft } from 'lucide-react';
import { dashboardService } from '@/services/dashboard.service';
import { AmountDisplay } from '@/components/payments/AmountDisplay';
import { PaymentMethodBadge } from '@/components/payments/PaymentMethodBadge';
import { ClientListPopup } from './ClientListPopup';
import { getPaymentMethodLabel } from '@/lib/payment-utils';
import type { PaymentMethod } from '@/types/collection.types';
import { DashboardSectionShell } from './DashboardSectionShell';

interface PaymentMethodBreakdownEnhancedProps {
  year: number;
}

interface PaymentMethodGroup {
  method: PaymentMethod;
  count: number;
  clients: Array<{
    clientId: string;
    clientName: string;
    originalAmount: number;
    expectedAmount: number;
    actualAmount: number;
  }>;
  totalBeforeVat: number;
  totalWithVat: number;
}

export function PaymentMethodBreakdownEnhanced({ year }: PaymentMethodBreakdownEnhancedProps) {
  const [data, setData] = useState<PaymentMethodGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodGroup | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  const loadData = async () => {
    setLoading(true);
    const { data: breakdown } = await dashboardService.getPaymentMethodBreakdownWithClients(year);
    setData(breakdown || []);
    setLoading(false);
  };

  const handleMethodClick = (method: PaymentMethodGroup) => {
    setSelectedMethod(method);
    setPopupOpen(true);
  };

  const totalAmount = data.reduce((sum, m) => sum + m.totalBeforeVat, 0);

  if (loading) {
    return (
      <DashboardSectionShell title="פירוט לפי אמצעי תשלום" description={`שנת מס ${year}`}>
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </DashboardSectionShell>
    );
  }

  return (
    <>
      <DashboardSectionShell
        title="פירוט לפי אמצעי תשלום"
        description={`התפלגות הגבייה לפי אמצעי תשלום לשנת המס ${year}`}
      >
        <div className="space-y-3">
          {data.map((method) => (
            <button
              type="button"
              key={method.method}
              className="group w-full rounded-2xl border border-slate-200 bg-white p-4 text-right transition-all hover:border-slate-300 hover:bg-slate-50/70 hover:shadow-sm"
              onClick={() => handleMethodClick(method)}
            >
              <div className="mb-3 flex items-center justify-between">
                <ChevronLeft className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:-translate-x-1" />
                <div className="flex items-center gap-3">
                  <PaymentMethodBadge method={method.method} />
                  <span className="text-sm text-slate-500">
                    {method.count} לקוחות
                  </span>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <AmountDisplay
                  beforeVat={method.totalBeforeVat}
                  withVat={method.totalWithVat}
                  size="lg"
                  variant="stacked"
                />
                <div className="text-right md:text-left">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    חלק יחסי
                  </div>
                  <div className="mt-1 text-lg font-semibold text-slate-900 tabular-nums">
                    {totalAmount > 0 ? ((method.totalBeforeVat / totalAmount) * 100).toFixed(1) : '0.0'}%
                  </div>
                </div>
              </div>

              {/* Progress bar showing percentage of total */}
              {totalAmount > 0 && (
                <div className="mt-3">
                  <Progress
                    value={(method.totalBeforeVat / totalAmount) * 100}
                    className="h-2"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    {((method.totalBeforeVat / totalAmount) * 100).toFixed(1)}% מסך התשלומים
                  </p>
                </div>
              )}
            </button>
          ))}
        </div>

        {data.length === 0 && (
          <div className="py-8 text-center text-slate-500">אין נתונים להצגה</div>
        )}
      </DashboardSectionShell>

      {/* Client List Popup */}
      {selectedMethod && (
        <ClientListPopup
          open={popupOpen}
          onOpenChange={setPopupOpen}
          title={`${getPaymentMethodLabel(selectedMethod.method)} - ${selectedMethod.count} לקוחות`}
          clients={selectedMethod.clients}
          totalBeforeVat={selectedMethod.totalBeforeVat}
          totalWithVat={selectedMethod.totalWithVat}
        />
      )}
    </>
  );
}
