import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BRAND_PRIMARY_HEX } from '@/lib/brand';

/**
 * Payment Success Page
 * Displayed after successful Cardcom payment
 * Matches letter template design (header + footer + styling)
 */
export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Extract payment details from URL
  const feeId = searchParams.get('fee_id');
  const responseCode = searchParams.get('ResponseCode');
  const internalDealNumber = searchParams.get('internalDealNumber');
  const terminalnumber = searchParams.get('terminalnumber');
  const lowprofilecode = searchParams.get('lowprofilecode');

  useEffect(() => {
    // Log success for debugging
    console.log('✅ Payment Success:', {
      feeId,
      responseCode,
      internalDealNumber,
      terminalnumber,
      lowprofilecode,
    });
  }, [feeId, responseCode, internalDealNumber, terminalnumber, lowprofilecode]);

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Main Card - Matching Letter Design */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl">

          {/* Header - Matching Letter Template */}
          <div className="text-center px-8 pt-8 pb-0">
            {/* Logo */}
            <div className="mb-5">
              <img
                src="/brand/tico_logo_240.png"
                alt="TICO"
                className="mx-auto"
                style={{ width: '180px', height: '80px' }}
              />
            </div>

            {/* Black thick line with white text - EXACTLY like letters */}
            <div
              className="flex items-center justify-center -mx-8"
              style={{
                backgroundColor: '#000000',
                height: '37px',
                marginTop: '20px',
              }}
            >
              <span
                style={{
                  fontFamily: "'Arial', 'Heebo', sans-serif",
                  fontSize: '18px',
                  fontWeight: 400,
                  color: '#ffffff',
                  lineHeight: '37px',
                }}
              >
                Franco & Co. Certified Public Accountants (Isr.)
              </span>
            </div>
          </div>

          {/* Success Message */}
          <div className="px-8 py-12 text-center">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle2 className="w-16 h-16 text-green-600" />
              </div>
            </div>

            {/* Title */}
            <h1
              className="mb-4"
              style={{
                fontFamily: "'David Libre', 'Heebo', 'Assistant', sans-serif",
                fontSize: '32px',
                fontWeight: 700,
                color: '#000000',
                lineHeight: 1.2,
              }}
            >
              התשלום בוצע בהצלחה!
            </h1>

            {/* Description */}
            <p
              className="mb-8"
              style={{
                fontFamily: "'Heebo', 'Assistant', sans-serif",
                fontSize: '18px',
                color: '#71717a',
                lineHeight: 1.6,
              }}
            >
              תודה רבה. התשלום התקבל במערכת בהצלחה.
            </p>

            {/* Transaction Details */}
            {internalDealNumber && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8 text-right">
                <div
                  className="mb-2"
                  style={{
                    fontFamily: "'Heebo', 'Assistant', sans-serif",
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#2d3748',
                  }}
                >
                  פרטי העסקה:
                </div>
                <div
                  className="mb-1"
                  style={{
                    fontFamily: "'Heebo', 'Assistant', sans-serif",
                    fontSize: '16px',
                    color: BRAND_PRIMARY_HEX,
                    fontWeight: 600,
                  }}
                >
                  מספר עסקה: {internalDealNumber}
                </div>
                {terminalnumber && (
                  <div
                    style={{
                      fontFamily: "'Heebo', 'Assistant', sans-serif",
                      fontSize: '14px',
                      color: '#71717a',
                    }}
                  >
                    מסוף: {terminalnumber}
                  </div>
                )}
              </div>
            )}

            {/* Next Steps */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8 text-right">
              <div
                className="mb-3"
                style={{
                  fontFamily: "'Heebo', 'Assistant', sans-serif",
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#2d3748',
                }}
              >
                מה הלאה?
              </div>
              <ul className="space-y-2 text-right">
                <li
                  style={{
                    fontFamily: "'Heebo', 'Assistant', sans-serif",
                    fontSize: '14px',
                    color: '#71717a',
                    lineHeight: 1.6,
                  }}
                >
                  ✓ חשבונית מס/קבלה תישלח אליכם במייל תוך 24 שעות
                </li>
                <li
                  style={{
                    fontFamily: "'Heebo', 'Assistant', sans-serif",
                    fontSize: '14px',
                    color: '#71717a',
                    lineHeight: 1.6,
                  }}
                >
                  ✓ התשלום עודכן במערכת ונרשם בחשבונכם
                </li>
                <li
                  style={{
                    fontFamily: "'Heebo', 'Assistant', sans-serif",
                    fontSize: '14px',
                    color: '#71717a',
                    lineHeight: 1.6,
                  }}
                >
                  ✓ במידת הצורך, נציגנו יצרו עמכם קשר
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <Button
                variant="brand"
                size="pill"
                className="h-11 px-8 text-base"
                onClick={() => navigate('/')}
              >
                חזרה לדף הבית
              </Button>
            </div>
          </div>

          {/* Footer - Matching Letter Template */}
          <div className="px-8 pb-8">
            {/* Thick black line */}
            <div
              style={{
                borderTop: '13px solid #000000',
                marginBottom: '25px',
              }}
            />

            {/* Contact Details */}
            <div className="flex justify-between items-start mb-8">
              {/* Logo */}
              <div className="w-[30%]">
                <img
                  src="/brand/Tico_franco_co.png"
                  alt="TICO FRANCO & CO"
                  style={{
                    width: '135px',
                    height: '95px',
                    maxHeight: '95px',
                  }}
                />
              </div>

              {/* Contact Info */}
              <div className="w-[45%] text-right">
                <div
                  className="mb-1"
                  style={{
                    fontFamily: "'David Libre', 'Heebo', 'Assistant', sans-serif",
                    fontSize: '16px',
                    lineHeight: 1.8,
                    color: '#71717a',
                  }}
                >
                  ⭐ פרנקו ושות׳ רואי חשבון
                </div>
                <div
                  className="mb-1"
                  style={{
                    fontFamily: "'David Libre', 'Heebo', 'Assistant', sans-serif",
                    fontSize: '16px',
                    lineHeight: 1.8,
                    color: '#71717a',
                  }}
                >
                  📍 שד"ל 3, מגדל אלרוב קומה ראשונה, תל אביב
                </div>
                <div
                  className="mb-1"
                  style={{
                    fontFamily: "'David Libre', 'Heebo', 'Assistant', sans-serif",
                    fontSize: '16px',
                    lineHeight: 1.8,
                    color: '#71717a',
                  }}
                >
                  📞 03-5666170
                </div>
                <div
                  style={{
                    fontFamily: "'David Libre', 'Heebo', 'Assistant', sans-serif",
                    fontSize: '16px',
                    lineHeight: 1.8,
                    color: BRAND_PRIMARY_HEX,
                  }}
                >
                  📧 tico@franco.co.il
                </div>
              </div>
            </div>

            {/* Bottom line */}
            <div
              style={{
                borderTop: '13px solid #000000',
                marginTop: '20px',
              }}
            />
          </div>

        </div>
      </div>
    </div>
  );
}
