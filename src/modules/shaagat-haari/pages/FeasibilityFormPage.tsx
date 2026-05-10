/**
 * Shaagat HaAri — Feasibility Check External Form (Step 0)
 *
 * Public page (no auth). Token-based access via URL parameter.
 * Flow:
 *   1. Load form via token → show company name + tax ID (readonly)
 *   2. Client enters base + comparison revenue
 *   3. "Check feasibility" → uses calculateEligibility() for instant result
 *   4. If feasible: "כן, תטפלו לי" → payment explanation → Cardcom
 *   5. If not: "No feasibility" message → end
 *
 * Route: /shaagat-haari/feasibility?token={publicToken}
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MoneyInput } from '@/components/ui/money-input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  ArrowLeft,
  Shield,
  Calculator,
  Loader2,
  AlertTriangle,
  CreditCard,
  Building2,
} from 'lucide-react';
import { shaagatPublicService } from '../services/shaagat-public.service';
import { calculateEligibility } from '../lib/grant-calculations';
import { GRANT_CONSTANTS } from '../lib/grant-constants';
import type { EligibilityResult } from '../types/shaagat.types';

type FormStep = 'loading' | 'error' | 'input' | 'result_positive' | 'result_negative' | 'result_gray' | 'payment_info' | 'submitted';

export function FeasibilityFormPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [step, setStep] = useState<FormStep>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  // Client info (readonly, from token)
  const [clientName, setClientName] = useState('');
  const [clientTaxId, setClientTaxId] = useState('');

  // Form data
  const [revenueBase, setRevenueBase] = useState<number | ''>('');
  const [revenueComparison, setRevenueComparison] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Result data from calculateEligibility()
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setErrorMessage('קישור לא תקין — חסר טוקן');
      setStep('error');
      return;
    }

    async function validateToken() {
      const data = await shaagatPublicService.getFeasibilityByToken(token);
      if (!data) {
        setErrorMessage('הקישור פג תוקף או אינו תקין');
        setStep('error');
        return;
      }
      if (data.is_submitted) {
        setClientName(data.client_name);
        setStep('submitted');
        return;
      }
      setClientName(data.client_name);
      setClientTaxId(data.client_tax_id);
      setStep('input');
    }

    validateToken();
  }, [token]);

  const handleCheckFeasibility = useCallback(async () => {
    if (revenueBase === '' || revenueComparison === '') {
      toast.error('יש למלא את שני שדות המחזור');
      return;
    }
    if (revenueBase <= 0) {
      toast.error('מחזור הבסיס חייב להיות חיובי');
      return;
    }

    // Use the official calculateEligibility() — single source of truth
    const result = calculateEligibility({
      revenueBase: revenueBase as number,
      revenueComparison: revenueComparison as number,
      capitalRevenuesBase: 0,
      capitalRevenuesComparison: 0,
      selfAccountingRevenuesBase: 0,
      selfAccountingRevenuesComparison: 0,
      reportingType: 'monthly', // feasibility uses monthly thresholds by default
      annualRevenue: (revenueBase as number) * 12, // rough estimate for validation
    });

    setEligibilityResult(result);

    // Persist to DB
    setIsSubmitting(true);
    try {
      const hasFeasibility = result.eligibilityStatus === 'ELIGIBLE' || result.eligibilityStatus === 'GRAY_AREA';

      const submitResult = await shaagatPublicService.submitFeasibility(
        token,
        revenueBase as number,
        revenueComparison as number,
        result.declinePercentage,
        hasFeasibility
      );

      if (!submitResult.success) {
        toast.error('שגיאה בשליחת הנתונים');
        return;
      }

      if (result.eligibilityStatus === 'ELIGIBLE') {
        setStep('result_positive');
      } else if (result.eligibilityStatus === 'GRAY_AREA') {
        setStep('result_gray');
      } else {
        setStep('result_negative');
      }
    } catch {
      toast.error('שגיאה בשליחת הנתונים');
    } finally {
      setIsSubmitting(false);
    }
  }, [token, revenueBase, revenueComparison]);

  const handleInterested = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const success = await shaagatPublicService.markInterested(token);
      if (success) {
        setStep('payment_info');
      } else {
        toast.error('שגיאה בשמירת הנתונים');
      }
    } catch {
      toast.error('שגיאה בשמירת הנתונים');
    } finally {
      setIsSubmitting(false);
    }
  }, [token]);

  const serviceFeeWithVat = Math.round(
    GRANT_CONSTANTS.SERVICE_FEE.AMOUNT * (1 + GRANT_CONSTANTS.SERVICE_FEE.VAT_RATE)
  );

  // ─── Loading ───
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">טוען...</p>
        </div>
      </div>
    );
  }

  // ─── Error ───
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">שגיאה</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Already submitted ───
  if (step === 'submitted') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-xl font-bold">הטופס כבר הוגש</h2>
            <p className="text-muted-foreground">
              נתוני ההיתכנות עבור <strong>{clientName}</strong> כבר נשלחו.
              <br />
              המשרד יצור אתכם קשר בהקדם.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4" dir="rtl">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">בדיקת היתכנות למענק &quot;שאגת הארי&quot;</h1>
          <p className="text-muted-foreground mt-2">
            בדיקה מהירה לבחינת זכאות ראשונית לפיצוי
          </p>
        </div>

        {/* Client Info Banner (readonly) */}
        {(clientName || clientTaxId) && (
          <div className="bg-muted/50 rounded-lg p-4 mb-6 flex items-center gap-3 text-right">
            <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1">
              {clientName && <p className="font-semibold">{clientName}</p>}
              {clientTaxId && <p className="text-sm text-muted-foreground">ח.פ./ע.מ.: {clientTaxId}</p>}
            </div>
          </div>
        )}

        <Card className="shadow-sm">
          {/* ─── Revenue Input ─── */}
          {step === 'input' && (
            <>
              <CardHeader className="text-right">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  הזנת נתוני מחזור
                </CardTitle>
                <CardDescription>
                  הזינו את נתוני המחזור שלכם לבדיקת היתכנות ראשונית
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="revenueBase" className="text-right">
                    מחזור תקופת בסיס (₪)
                  </Label>
                  <MoneyInput
                    value={revenueBase}
                    onChange={setRevenueBase}
                    min={0}
                    className="text-left"
                  />
                  <p className="text-xs text-muted-foreground">
                    מחזור העסקאות שדווח למע&quot;מ בתקופת הבסיס
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="revenueComparison" className="text-right">
                    מחזור תקופת השוואה (₪)
                  </Label>
                  <MoneyInput
                    value={revenueComparison}
                    onChange={setRevenueComparison}
                    min={0}
                    className="text-left"
                  />
                  <p className="text-xs text-muted-foreground">
                    מחזור העסקאות שדווח למע&quot;מ בתקופת ההשוואה
                  </p>
                </div>

                <Button
                  onClick={handleCheckFeasibility}
                  disabled={isSubmitting || revenueBase === '' || revenueComparison === ''}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Calculator className="h-4 w-4" />
                  )}
                  בדוק היתכנות
                </Button>
              </CardContent>
            </>
          )}

          {/* ─── Positive Result (ELIGIBLE) ─── */}
          {step === 'result_positive' && eligibilityResult && (
            <>
              <CardHeader className="text-right">
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-5 w-5" />
                  יש היתכנות לזכאות!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-right text-green-800">
                    <strong>שיעור ירידה: {eligibilityResult.declinePercentage.toFixed(1)}%</strong>
                    <br />
                    שיעור פיצוי משוער: <Badge variant="secondary">{eligibilityResult.compensationRate}%</Badge>
                    <br />
                    הנתונים מצביעים על ירידה במחזור שעשויה לזכות אתכם בפיצוי.
                  </AlertDescription>
                </Alert>

                <p className="text-sm text-muted-foreground text-right">
                  תוצאה זו הינה בדיקה ראשונית בלבד.
                  משרדנו יבצע בדיקה מלאה ומדויקת לקביעת הזכאות הסופית וגובה הפיצוי.
                </p>

                <Button
                  onClick={handleInterested}
                  disabled={isSubmitting}
                  className="w-full gap-2"
                  size="lg"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowLeft className="h-4 w-4" />
                  )}
                  כן, תטפלו לי בזה
                </Button>
              </CardContent>
            </>
          )}

          {/* ─── Gray Area Result ─── */}
          {step === 'result_gray' && eligibilityResult && (
            <>
              <CardHeader className="text-right">
                <CardTitle className="flex items-center gap-2 text-yellow-700">
                  <AlertTriangle className="h-5 w-5" />
                  תחום גבולי — נדרשת בדיקה נוספת
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-right text-yellow-800">
                    <strong>שיעור ירידה: {eligibilityResult.declinePercentage.toFixed(1)}%</strong>
                    <br />
                    הנתונים מצביעים על מצב גבולי הדורש בדיקה נוספת.
                  </AlertDescription>
                </Alert>

                <p className="text-sm text-muted-foreground text-right">
                  נציג מטעם המשרד ייצור אתכם קשר בקרוב לצורך הבהרות נוספות.
                </p>

                <Button
                  onClick={handleInterested}
                  disabled={isSubmitting}
                  className="w-full gap-2"
                  size="lg"
                  variant="outline"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowLeft className="h-4 w-4" />
                  )}
                  כן, אני מעוניין/ת לבדוק
                </Button>
              </CardContent>
            </>
          )}

          {/* ─── Negative Result ─── */}
          {step === 'result_negative' && eligibilityResult && (
            <>
              <CardHeader className="text-right">
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <XCircle className="h-5 w-5" />
                  אין היתכנות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-red-50 border-red-200">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-right text-red-800">
                    <strong>שיעור שינוי: {Math.abs(eligibilityResult.declinePercentage).toFixed(1)}%</strong>
                    <br />
                    {eligibilityResult.declinePercentage <= 0
                      ? 'לא נרשמה ירידה במחזור — אין זכאות לפיצוי.'
                      : `שיעור הירידה נמוך מהסף המינימלי (${GRANT_CONSTANTS.MONTHLY_THRESHOLDS.MIN_THRESHOLD}%) הנדרש לזכאות.`
                    }
                  </AlertDescription>
                </Alert>

                <p className="text-sm text-muted-foreground text-right">
                  תוצאה זו מבוססת על הנתונים שהוזנו. אם יש לכם שאלות,
                  צרו קשר עם המשרד.
                </p>
              </CardContent>
            </>
          )}

          {/* ─── Payment Info ─── */}
          {step === 'payment_info' && (
            <>
              <CardHeader className="text-right">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  דמי טיפול
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/50 rounded-lg p-4 text-right space-y-3">
                  <p className="text-sm leading-relaxed">
                    משרדנו לא גבה, לא גובה ולא יגבה שכרי טרחה חריגים
                    (אחוזים מהפיצוי כמו נציגים אחרים).
                  </p>
                  <p className="text-sm leading-relaxed">
                    אולם מניסיון העבר, הטיפול בנושאים אלו מייצר הוצאות בעין.
                  </p>
                  <p className="text-sm font-semibold">
                    דמי הטיפול (בלבד) יסתכמו לסה&quot;כ של{' '}
                    <span className="text-primary">
                      {GRANT_CONSTANTS.SERVICE_FEE.AMOUNT.toLocaleString('he-IL')} ₪
                    </span>{' '}
                    בתוספת מע&quot;מ (סה&quot;כ {serviceFeeWithVat.toLocaleString('he-IL')} ₪).
                  </p>
                </div>

                <Alert>
                  <AlertDescription className="text-right text-sm">
                    לאחר התשלום, המשרד יתחיל בבדיקת הזכאות המלאה שלכם
                    ויצור אתכם קשר לגבי השלבים הבאים.
                  </AlertDescription>
                </Alert>

                <Button
                  className="w-full gap-2"
                  size="lg"
                  onClick={() => {
                    // Cardcom payment link will be provided by the backend
                    // For now, show a toast
                    toast.info('מעבר לעמוד התשלום...');
                    // In production: window.location.href = paymentLink
                  }}
                >
                  <CreditCard className="h-4 w-4" />
                  לתשלום דמי טיפול
                </Button>
              </CardContent>
            </>
          )}
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          TicoVision CRM — מענקי שאגת הארי
        </p>
      </div>
    </div>
  );
}

export default FeasibilityFormPage;
