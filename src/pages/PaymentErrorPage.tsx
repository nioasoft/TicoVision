import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

/**
 * Payment Error Page
 * Displayed when Cardcom payment fails
 * Matches letter template design (header + footer + styling)
 */
export default function PaymentErrorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Extract error details from URL
  const feeId = searchParams.get('fee_id');
  const responseCode = searchParams.get('ResponseCode');
  const errorMessage = searchParams.get('error');

  useEffect(() => {
    // Log error for debugging
    console.error('❌ Payment Failed:', {
      feeId,
      responseCode,
      errorMessage,
    });
  }, [feeId, responseCode, errorMessage]);

  const handleRetry = () => {
    // User can try again by going back to the fee page
    if (feeId) {
      navigate(`/fees?highlight=${feeId}`);
    } else {
      navigate('/fees');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* Main Card - Matching Letter Design */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">

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

          {/* Error Message */}
          <div className="px-8 py-12 text-center">
            {/* Error Icon */}
            <div className="flex justify-center mb-6">
              <div className="rounded-full bg-red-100 p-4">
                <XCircle className="w-16 h-16 text-red-600" />
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
              התשלום נכשל
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
              מצטערים, התשלום לא הושלם בהצלחה.
            </p>

            {/* Error Details */}
            {errorMessage && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-8 text-right">
                <div
                  className="mb-2"
                  style={{
                    fontFamily: "'Heebo', 'Assistant', sans-serif",
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#2d3748',
                  }}
                >
                  פרטי השגיאה:
                </div>
                <div
                  style={{
                    fontFamily: "'Heebo', 'Assistant', sans-serif",
                    fontSize: '16px',
                    color: '#dc2626',
                    fontWeight: 600,
                  }}
                >
                  {errorMessage}
                </div>
                {responseCode && responseCode !== '0' && (
                  <div
                    style={{
                      fontFamily: "'Heebo', 'Assistant', sans-serif",
                      fontSize: '14px',
                      color: '#71717a',
                      marginTop: '8px',
                    }}
                  >
                    קוד שגיאה: {responseCode}
                  </div>
                )}
              </div>
            )}

            {/* Possible Reasons */}
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
                סיבות אפשריות:
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
                  • פרטי כרטיס האשראי שגויים
                </li>
                <li
                  style={{
                    fontFamily: "'Heebo', 'Assistant', sans-serif",
                    fontSize: '14px',
                    color: '#71717a',
                    lineHeight: 1.6,
                  }}
                >
                  • אין יתרה מספקת בכרטיס
                </li>
                <li
                  style={{
                    fontFamily: "'Heebo', 'Assistant', sans-serif",
                    fontSize: '14px',
                    color: '#71717a',
                    lineHeight: 1.6,
                  }}
                >
                  • הכרטיס חסום או לא פעיל
                </li>
                <li
                  style={{
                    fontFamily: "'Heebo', 'Assistant', sans-serif",
                    fontSize: '14px',
                    color: '#71717a',
                    lineHeight: 1.6,
                  }}
                >
                  • בעיית תקשורת עם חברת האשראי
                </li>
              </ul>
            </div>

            {/* What to do */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-8 text-right">
              <div
                className="mb-3"
                style={{
                  fontFamily: "'Heebo', 'Assistant', sans-serif",
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#2d3748',
                }}
              >
                מה לעשות?
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
                  ✓ ודאו שפרטי הכרטיס נכונים ונסו שוב
                </li>
                <li
                  style={{
                    fontFamily: "'Heebo', 'Assistant', sans-serif",
                    fontSize: '14px',
                    color: '#71717a',
                    lineHeight: 1.6,
                  }}
                >
                  ✓ נסו כרטיס אשראי אחר
                </li>
                <li
                  style={{
                    fontFamily: "'Heebo', 'Assistant', sans-serif",
                    fontSize: '14px',
                    color: '#71717a',
                    lineHeight: 1.6,
                  }}
                >
                  ✓ בחרו באמצעי תשלום אחר (העברה בנקאית, המחאות)
                </li>
                <li
                  style={{
                    fontFamily: "'Heebo', 'Assistant', sans-serif",
                    fontSize: '14px',
                    color: '#71717a',
                    lineHeight: 1.6,
                  }}
                >
                  ✓ צרו קשר עם שירות הלקוחות שלנו לעזרה
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-center flex-wrap">
              <button
                onClick={handleRetry}
                style={{
                  fontFamily: "'Heebo', 'Assistant', sans-serif",
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#ffffff',
                  background: '#395BF7',
                  padding: '12px 32px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px rgba(57, 91, 247, 0.2)',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#2d4ad1';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#395BF7';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                נסה שוב
              </button>

              <button
                onClick={() => navigate('/')}
                style={{
                  fontFamily: "'Heebo', 'Assistant', sans-serif",
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#71717a',
                  background: '#ffffff',
                  padding: '12px 32px',
                  borderRadius: '8px',
                  border: '2px solid #e2e8f0',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#395BF7';
                  e.currentTarget.style.color = '#395BF7';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.color = '#71717a';
                }}
              >
                חזרה לדף הבית
              </button>
            </div>

            {/* Contact Support */}
            <div className="mt-8 text-center">
              <p
                style={{
                  fontFamily: "'Heebo', 'Assistant', sans-serif",
                  fontSize: '14px',
                  color: '#71717a',
                  marginBottom: '8px',
                }}
              >
                צריכים עזרה?
              </p>
              <a
                href="mailto:tico@franco.co.il"
                style={{
                  fontFamily: "'Heebo', 'Assistant', sans-serif",
                  fontSize: '16px',
                  color: '#395BF7',
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                צרו קשר: tico@franco.co.il
              </a>
              <span
                style={{
                  fontFamily: "'Heebo', 'Assistant', sans-serif",
                  fontSize: '16px',
                  color: '#71717a',
                  margin: '0 8px',
                }}
              >
                |
              </span>
              <a
                href="tel:035666170"
                style={{
                  fontFamily: "'Heebo', 'Assistant', sans-serif",
                  fontSize: '16px',
                  color: '#395BF7',
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                03-5666170
              </a>
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
                    color: '#395BF7',
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
