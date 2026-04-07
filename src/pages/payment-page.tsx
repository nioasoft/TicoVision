/**
 * Custom Payment Page - TICO Branded
 * Uses Cardcom iFrame for secure payment processing
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, Shield, CheckCircle } from 'lucide-react';

interface PaymentDetails {
  amount: number;
  description: string;
  clientName?: string;
  lowProfileId?: string;
}

export default function PaymentPage() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string>('');

  useEffect(() => {
    // Get payment details from URL params
    const amount = parseFloat(searchParams.get('amount') || '0');
    const description = searchParams.get('description') || 'תשלום';
    const clientName = searchParams.get('client') || '';
    const lowProfileId = searchParams.get('lpid') || '';

    setPaymentDetails({
      amount,
      description,
      clientName,
      lowProfileId,
    });

    // If we have a lowProfileId, construct the iframe URL
    if (lowProfileId) {
      setIframeUrl(`https://secure.cardcom.solutions/EA/LPC6/172012/${lowProfileId}?t=24`);
      setLoading(false);
    } else {
      // Create new payment page via API
      createPaymentPage(amount, description);
    }
  }, [searchParams]);

  const createPaymentPage = async (amount: number, description: string) => {
    try {
      // Call our backend API to create Cardcom payment page
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description }),
      });

      const data = await response.json();

      if (data.success) {
        setIframeUrl(data.paymentUrl);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to create payment page:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">טוען דף תשלום מאובטח...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      {/* Header */}
      <div className="border-b border-border/80 bg-background/95 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl border border-primary/15 bg-primary text-white shadow-sm">
                <span className="text-white font-bold text-xl">T</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">TICO</h1>
                <p className="text-sm text-muted-foreground">תשלום מאובטח</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-primary">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-medium">חיבור מאובטח</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Payment Summary */}
          <div className="md:col-span-1">
            <Card className="border-border/90 bg-card p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-foreground">
                <CreditCard className="h-5 w-5 text-primary" />
                סיכום תשלום
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">פריט</p>
                  <p className="text-base font-medium text-foreground">{paymentDetails?.description}</p>
                </div>

                {paymentDetails?.clientName && (
                  <div>
                    <p className="text-sm text-muted-foreground">לכבוד</p>
                    <p className="text-base font-medium text-foreground">{paymentDetails.clientName}</p>
                  </div>
                )}

                <div className="border-t border-border/80 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-foreground">סכום לתשלום</span>
                    <span className="text-2xl font-bold text-primary">
                      ₪{paymentDetails?.amount.toLocaleString('he-IL')}
                    </span>
                  </div>
                </div>

                {/* Security Features */}
                <div className="space-y-2 border-t border-border/80 pt-4">
                  <h3 className="mb-2 text-sm font-semibold text-foreground">אבטחת מידע</h3>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="mt-0.5 h-4 w-4 text-primary" />
                    <span>הצפנת SSL 256-bit</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="mt-0.5 h-4 w-4 text-primary" />
                    <span>תקן PCI DSS Level 1</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="mt-0.5 h-4 w-4 text-primary" />
                    <span>מאובטח ע"י Cardcom</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Payment Form */}
          <div className="md:col-span-2">
            <Card className="border-border/90 bg-card p-6 shadow-sm">
              <h2 className="mb-6 text-right text-xl font-bold text-foreground">פרטי תשלום</h2>

              {/* Cardcom iFrame */}
              {iframeUrl ? (
                <div className="w-full" style={{ minHeight: '500px' }}>
                  <iframe
                    src={iframeUrl}
                    width="100%"
                    height="600"
                    frameBorder="0"
                    style={{ border: 'none', borderRadius: '8px' }}
                    title="Cardcom Payment"
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">שגיאה בטעינת דף התשלום</p>
                  <Button
                    variant="brand"
                    onClick={() => window.location.reload()}
                    className="mt-4"
                  >
                    נסה שנית
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>© 2025 TICO - מערכת CRM לרואי חשבון</p>
          <p className="mt-1 italic text-xs">DARE TO THINK · COMMIT TO DELIVER</p>
        </div>
      </div>
    </div>
  );
}
