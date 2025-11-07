/**
 * PaymentMethodBreakdownEnhanced Component
 * Show payment method breakdown with clickable client lists
 * Each payment method card opens a popup with detailed client breakdown
 */

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft } from 'lucide-react';
import { dashboardService } from '@/services/dashboard.service';
import { AmountDisplay } from '@/components/payments/AmountDisplay';
import { PaymentMethodBadge } from '@/components/payments/PaymentMethodBadge';
import { ClientListPopup } from './ClientListPopup';
import { getPaymentMethodLabel } from '@/lib/payment-utils';
import type { PaymentMethod } from '@/types/collection.types';

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
      <Card className="p-6" dir="rtl">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6" dir="rtl">
        <h2 className="text-2xl font-bold mb-6 text-right">פירוט לפי אמצעי תשלום</h2>

        <div className="space-y-4">
          {data.map((method) => (
            <div
              key={method.method}
              className="group cursor-pointer hover:bg-muted/50 p-4 rounded-lg transition-colors border"
              onClick={() => handleMethodClick(method)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <PaymentMethodBadge method={method.method} />
                  <span className="text-sm text-muted-foreground">
                    {method.count} לקוחות
                  </span>
                </div>
                <ChevronLeft className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              </div>

              <AmountDisplay
                beforeVat={method.totalBeforeVat}
                withVat={method.totalWithVat}
              />

              {/* Progress bar showing percentage of total */}
              {totalAmount > 0 && (
                <div className="mt-2">
                  <Progress
                    value={(method.totalBeforeVat / totalAmount) * 100}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {((method.totalBeforeVat / totalAmount) * 100).toFixed(1)}% מסך התשלומים
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {data.length === 0 && (
          <div className="text-center text-muted-foreground py-8">אין נתונים להצגה</div>
        )}
      </Card>

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
