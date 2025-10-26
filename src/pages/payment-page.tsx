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
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600">טוען דף תשלום מאובטח...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-purple-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">T</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">TICO</h1>
                <p className="text-sm text-gray-600">תשלום מאובטח</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-green-600">
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
            <Card className="p-6 bg-white shadow-lg">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-purple-600" />
                סיכום תשלום
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">פריט</p>
                  <p className="text-base font-medium text-gray-900">{paymentDetails?.description}</p>
                </div>

                {paymentDetails?.clientName && (
                  <div>
                    <p className="text-sm text-gray-600">לכבוד</p>
                    <p className="text-base font-medium text-gray-900">{paymentDetails.clientName}</p>
                  </div>
                )}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">סכום לתשלום</span>
                    <span className="text-2xl font-bold text-purple-600">
                      ₪{paymentDetails?.amount.toLocaleString('he-IL')}
                    </span>
                  </div>
                </div>

                {/* Security Features */}
                <div className="border-t pt-4 space-y-2">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">אבטחת מידע</h3>
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>הצפנת SSL 256-bit</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>תקן PCI DSS Level 1</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>מאובטח ע"י Cardcom</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Payment Form */}
          <div className="md:col-span-2">
            <Card className="p-6 bg-white shadow-lg">
              <h2 className="text-xl font-bold text-gray-900 mb-6 text-right">פרטי תשלום</h2>

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
                  <p className="text-gray-600">שגיאה בטעינת דף התשלום</p>
                  <Button
                    onClick={() => window.location.reload()}
                    className="mt-4 bg-purple-600 hover:bg-purple-700"
                  >
                    נסה שנית
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>© 2025 TICO - מערכת CRM לרואי חשבון</p>
          <p className="mt-1 italic text-xs">DARE TO THINK · COMMIT TO DELIVER</p>
        </div>
      </div>
    </div>
  );
}
