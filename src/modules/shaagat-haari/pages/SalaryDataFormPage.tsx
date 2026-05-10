/**
 * Shaagat HaAri — Salary Data External Form (Public)
 *
 * Token-based public form sent to clients via email. Collects:
 *   1. Identity verification (email + business ID, validated against the client)
 *   2. Primary salary month (e.g. 03/2026) — Form 102 numbers + deductions
 *   3. Secondary salary month (e.g. 04/2026) — same shape, JSONB on the row
 *   4. Summary + redirect to Cardcom for the service fee
 *
 * Route: /shaagat-haari/salary-form?token={submissionToken}
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MoneyInput } from '@/components/ui/money-input';
import { toast } from 'sonner';
import {
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Shield,
  Users,
  Loader2,
  AlertTriangle,
  ClipboardCheck,
  FileText,
  CalendarDays,
} from 'lucide-react';
import { shaagatPublicService } from '../services/shaagat-public.service';
import { cardcomService } from '@/services/cardcom.service';
import { GRANT_CONSTANTS } from '../lib/grant-constants';
import { FormRow, FormSection, CountInput } from '../components/FormRow';
import { cn } from '@/lib/utils';

type FormStep =
  | 'loading'
  | 'error'
  | 'verify'
  | 'data_primary'
  | 'data_secondary'
  | 'summary'
  | 'redirecting_to_payment'
  | 'success';

interface MonthData {
  salary_gross: number | '';
  num_employees: number | '';
  miluim_deductions: number | '';
  miluim_count: number | '';
  tips_deductions: number | '';
  tips_count: number | '';
  chalat_deductions: number | '';
  chalat_count: number | '';
  vacation_deductions: number | '';
  vacation_count: number | '';
}

interface SharedFormData {
  fruit_vegetable_purchases_annual: number | '';
  monthly_fixed_expenses: number | '';
  submitted_by_email: string;
  submitted_by_business_id: string;
  notes: string;
}

const initialMonth: MonthData = {
  salary_gross: '',
  num_employees: '',
  miluim_deductions: '',
  miluim_count: '',
  tips_deductions: '',
  tips_count: '',
  chalat_deductions: '',
  chalat_count: '',
  vacation_deductions: '',
  vacation_count: '',
};

const initialShared: SharedFormData = {
  fruit_vegetable_purchases_annual: '',
  monthly_fixed_expenses: '',
  submitted_by_email: '',
  submitted_by_business_id: '',
  notes: '',
};

function formatMoney(val: number | ''): string {
  if (val === '' || val === 0) return '—';
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(val);
}

export function SalaryDataFormPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [step, setStep] = useState<FormStep>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientTaxId, setClientTaxId] = useState('');
  const [primaryPeriod, setPrimaryPeriod] = useState('03/2026');
  const [secondaryPeriod, setSecondaryPeriod] = useState<string | null>(
    '04/2026'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [primaryMonth, setPrimaryMonth] = useState<MonthData>(initialMonth);
  const [secondaryMonth, setSecondaryMonth] =
    useState<MonthData>(initialMonth);
  const [shared, setShared] = useState<SharedFormData>(initialShared);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setErrorMessage('קישור לא תקין — חסר טוקן');
      setStep('error');
      return;
    }

    async function validateToken() {
      const data = await shaagatPublicService.getAccountingFormByToken(token);
      if (!data) {
        setErrorMessage('הקישור פג תוקף או אינו תקין');
        setStep('error');
        return;
      }
      if (data.is_submitted) {
        setClientName(data.client_name);
        setStep('success');
        return;
      }
      setClientName(data.client_name);
      setClientTaxId(data.client_tax_id || '');
      setPrimaryPeriod(data.salary_period || '03/2026');
      setSecondaryPeriod(data.secondary_period);
      setStep('verify');
    }

    validateToken();
  }, [token]);

  const handleVerify = useCallback(() => {
    if (!shared.submitted_by_email.trim()) {
      toast.error('יש למלא כתובת אימייל');
      return;
    }
    const enteredTaxId = shared.submitted_by_business_id.trim();
    if (!enteredTaxId) {
      toast.error('יש למלא ח.פ. / ע.מ. לאימות');
      return;
    }
    if (clientTaxId && enteredTaxId !== clientTaxId) {
      toast.error('מספר ח.פ. / ע.מ. אינו תואם לפרטי הלקוח');
      return;
    }
    setStep('data_primary');
  }, [shared.submitted_by_email, shared.submitted_by_business_id, clientTaxId]);

  const isPrimaryMonthValid =
    primaryMonth.salary_gross !== '' && primaryMonth.num_employees !== '';
  const isSecondaryMonthValid =
    !secondaryPeriod ||
    (secondaryMonth.salary_gross !== '' && secondaryMonth.num_employees !== '');

  const handleSubmit = useCallback(async () => {
    if (!isPrimaryMonthValid) {
      toast.error('יש למלא שכר ברוטו וכמות עובדים לחודש הראשון');
      return;
    }
    if (secondaryPeriod && !isSecondaryMonthValid) {
      toast.error('יש למלא שכר ברוטו וכמות עובדים לחודש השני');
      return;
    }

    setIsSubmitting(true);
    try {
      const numericMonth = (m: MonthData) => ({
        salary_gross: (m.salary_gross as number) || 0,
        num_employees: (m.num_employees as number) || 0,
        miluim_deductions: (m.miluim_deductions as number) || 0,
        miluim_count: (m.miluim_count as number) || 0,
        tips_deductions: (m.tips_deductions as number) || 0,
        tips_count: (m.tips_count as number) || 0,
        chalat_deductions: (m.chalat_deductions as number) || 0,
        chalat_count: (m.chalat_count as number) || 0,
        vacation_deductions: (m.vacation_deductions as number) || 0,
        vacation_count: (m.vacation_count as number) || 0,
      });

      const result = await shaagatPublicService.submitAccountingData(token, {
        ...numericMonth(primaryMonth),
        fruit_vegetable_purchases_annual:
          (shared.fruit_vegetable_purchases_annual as number) || 0,
        monthly_fixed_expenses: (shared.monthly_fixed_expenses as number) || 0,
        submitted_by_email: shared.submitted_by_email.trim(),
        submitted_by_business_id:
          shared.submitted_by_business_id.trim() || undefined,
        notes: shared.notes.trim() || undefined,
        secondary_month: secondaryPeriod
          ? numericMonth(secondaryMonth)
          : undefined,
      });

      if (!result.success) {
        toast.error(result.error ?? 'שגיאה בשמירת הנתונים');
        return;
      }

      // Charge service fee via Cardcom hosted page.
      setStep('redirecting_to_payment');
      const fee = GRANT_CONSTANTS.SERVICE_FEE.AMOUNT;
      const vat = Math.round(fee * GRANT_CONSTANTS.SERVICE_FEE.VAT_RATE);
      const totalAmount = fee + vat;

      const payment = await cardcomService.createPaymentPage({
        amount: totalAmount,
        productName: `שכ"ט שאגת הארי — ${clientName}`,
        customerName: clientName,
        customerEmail: shared.submitted_by_email.trim(),
        invoiceHead: clientName,
        invoiceDescription: 'שכר טרחה לטיפול במענק שאגת הארי',
        documentType: 1,
      });

      if (payment.error || !payment.data?.url) {
        toast.error(
          'יצירת קישור התשלום נכשלה — שמרנו את הנתונים, ניצור קשר.'
        );
        setStep('success');
        return;
      }

      window.location.assign(payment.data.url);
    } catch {
      toast.error('שגיאה בשמירת הנתונים');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    token,
    primaryMonth,
    secondaryMonth,
    shared,
    secondaryPeriod,
    clientName,
    isPrimaryMonthValid,
    isSecondaryMonthValid,
  ]);

  // ─── Loading / Error / Success / Redirect ───
  if (step === 'loading') {
    return (
      <div
        className="min-h-screen bg-gray-50 flex items-center justify-center"
        dir="rtl"
      >
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div
        className="min-h-screen bg-gray-50 flex items-center justify-center px-4"
        dir="rtl"
      >
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

  if (step === 'success') {
    return (
      <div
        className="min-h-screen bg-gray-50 flex items-center justify-center px-4"
        dir="rtl"
      >
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <h2 className="text-xl font-bold">הנתונים נשלחו בהצלחה!</h2>
            <p className="text-muted-foreground">
              נתוני השכר עבור <strong>{clientName}</strong> התקבלו.
              <br />
              המשרד יעבד את הנתונים ויצור קשר בהמשך.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'redirecting_to_payment') {
    return (
      <div
        className="min-h-screen bg-gray-50 flex items-center justify-center px-4"
        dir="rtl"
      >
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-bold">מעבירים אותך לתשלום…</h2>
            <p className="text-muted-foreground">
              נתוני השכר נשמרו. כעת תועברו לעמוד התשלום של Cardcom להסדרת שכר
              הטרחה לטיפול במענק.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Step indicators (4 stages) ───
  const steps: { key: FormStep; label: string; icon: typeof Shield }[] = [
    { key: 'verify', label: 'אימות', icon: Shield },
    { key: 'data_primary', label: primaryPeriod, icon: FileText },
    ...(secondaryPeriod
      ? [
          {
            key: 'data_secondary' as FormStep,
            label: secondaryPeriod,
            icon: CalendarDays,
          },
        ]
      : []),
    { key: 'summary', label: 'סיכום', icon: ClipboardCheck },
  ];
  const currentIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            הזנת נתוני שכר — {clientName}
          </h1>
          {secondaryPeriod ? (
            <p className="text-sm text-gray-500 mt-1">
              שני חודשים: {primaryPeriod} + {secondaryPeriod}
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">חודש: {primaryPeriod}</p>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1 mb-6 flex-wrap">
          {steps.map((s, index) => {
            const Icon = s.icon;
            const isActive = s.key === step;
            const isCompleted = index < currentIndex;
            return (
              <div key={s.key} className="flex items-center">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors',
                    isActive
                      ? 'bg-primary border-primary text-primary-foreground'
                      : isCompleted
                        ? 'bg-primary/10 border-primary/40 text-primary'
                        : 'bg-white border-gray-200 text-gray-400'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={cn(
                    'me-2 text-xs font-medium',
                    isActive ? 'text-gray-900' : 'text-gray-500'
                  )}
                >
                  {s.label}
                </span>
                {index < steps.length - 1 && (
                  <div className="w-6 h-px bg-gray-200 mx-1" />
                )}
              </div>
            );
          })}
        </div>

        <Card className="shadow-sm">
          {/* ─── Step 1: Verify Identity ─── */}
          {step === 'verify' && (
            <>
              <CardHeader className="text-right pb-3">
                <CardTitle className="text-lg">אימות זהות</CardTitle>
                <CardDescription className="text-xs">
                  הזינו את פרטיכם לאימות
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-right text-sm">
                    כתובת אימייל
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={shared.submitted_by_email}
                    onChange={(e) =>
                      setShared((p) => ({
                        ...p,
                        submitted_by_email: e.target.value,
                      }))
                    }
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessId" className="text-right text-sm">
                    ח.פ. / ע.מ.
                  </Label>
                  <Input
                    id="businessId"
                    value={shared.submitted_by_business_id}
                    onChange={(e) =>
                      setShared((p) => ({
                        ...p,
                        submitted_by_business_id: e.target.value,
                      }))
                    }
                    dir="ltr"
                    className="max-w-xs"
                    placeholder="9 ספרות"
                  />
                  <p className="text-[11px] text-gray-400">לאימות זהותך</p>
                </div>
                <div className="flex justify-start pt-2">
                  <Button
                    onClick={handleVerify}
                    disabled={
                      !shared.submitted_by_email.trim() ||
                      !shared.submitted_by_business_id.trim()
                    }
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    המשך
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {/* ─── Step 2 & 3: Per-month data entry ─── */}
          {(step === 'data_primary' || step === 'data_secondary') &&
            (() => {
              const isPrimary = step === 'data_primary';
              const period = isPrimary ? primaryPeriod : secondaryPeriod ?? '';
              const month = isPrimary ? primaryMonth : secondaryMonth;
              const setMonth = isPrimary ? setPrimaryMonth : setSecondaryMonth;
              const showSharedFields = isPrimary; // annual + notes only on primary

              return (
                <>
                  <CardHeader className="text-right pb-3">
                    <CardTitle className="text-lg">
                      נתוני שכר — חודש {period}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      טופס 102 — שכר וניכויים
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <FormSection title="שכר ועובדים" labelWidth={100}>
                      <FormRow label="שכר ברוטו" required>
                        <MoneyInput
                          value={month.salary_gross}
                          onChange={(v) =>
                            setMonth((p) => ({ ...p, salary_gross: v }))
                          }
                          min={0}
                          className="max-w-[160px]"
                        />
                        <span className="text-xs text-gray-400">₪</span>
                      </FormRow>
                      <FormRow label="כמות עובדים" required>
                        <CountInput
                          value={month.num_employees}
                          onChange={(v) =>
                            setMonth((p) => ({ ...p, num_employees: v }))
                          }
                        />
                      </FormRow>
                    </FormSection>

                    <FormSection title="ניכויים" cols={1} labelWidth={140}>
                      <FormRow
                        label='ניכוי חל"ת'
                        trailing={
                          <CountInput
                            value={month.chalat_count}
                            onChange={(v) =>
                              setMonth((p) => ({ ...p, chalat_count: v }))
                            }
                            className="w-[64px]"
                          />
                        }
                      >
                        <MoneyInput
                          value={month.chalat_deductions}
                          onChange={(v) =>
                            setMonth((p) => ({ ...p, chalat_deductions: v }))
                          }
                          min={0}
                          className="max-w-[140px]"
                        />
                      </FormRow>
                      <FormRow
                        label="ניכוי פדיון חופשה"
                        trailing={
                          <CountInput
                            value={month.vacation_count}
                            onChange={(v) =>
                              setMonth((p) => ({ ...p, vacation_count: v }))
                            }
                            className="w-[64px]"
                          />
                        }
                      >
                        <MoneyInput
                          value={month.vacation_deductions}
                          onChange={(v) =>
                            setMonth((p) => ({ ...p, vacation_deductions: v }))
                          }
                          min={0}
                          className="max-w-[140px]"
                        />
                      </FormRow>
                      <FormRow
                        label="ניכוי מילואים"
                        trailing={
                          <CountInput
                            value={month.miluim_count}
                            onChange={(v) =>
                              setMonth((p) => ({ ...p, miluim_count: v }))
                            }
                            className="w-[64px]"
                          />
                        }
                      >
                        <MoneyInput
                          value={month.miluim_deductions}
                          onChange={(v) =>
                            setMonth((p) => ({ ...p, miluim_deductions: v }))
                          }
                          min={0}
                          className="max-w-[140px]"
                        />
                      </FormRow>
                      <FormRow
                        label="ניכוי טיפים"
                        trailing={
                          <CountInput
                            value={month.tips_count}
                            onChange={(v) =>
                              setMonth((p) => ({ ...p, tips_count: v }))
                            }
                            className="w-[64px]"
                          />
                        }
                      >
                        <MoneyInput
                          value={month.tips_deductions}
                          onChange={(v) =>
                            setMonth((p) => ({ ...p, tips_deductions: v }))
                          }
                          min={0}
                          className="max-w-[140px]"
                        />
                      </FormRow>
                      <p className="text-[11px] text-gray-400 text-right py-1.5">
                        סכום ניכוי בש&quot;ח · מספר עובדים בעמודה השמאלית
                      </p>
                    </FormSection>

                    {showSharedFields && (
                      <FormSection title="נתונים נוספים" cols={1} labelWidth={180}>
                        <FormRow
                          label="קניות פירות וירקות שנתי"
                          hint='לחישוב תשומות מע"מ אפס'
                        >
                          <MoneyInput
                            value={shared.fruit_vegetable_purchases_annual}
                            onChange={(v) =>
                              setShared((p) => ({
                                ...p,
                                fruit_vegetable_purchases_annual: v,
                              }))
                            }
                            min={0}
                            className="max-w-[160px]"
                          />
                          <span className="text-xs text-gray-400">₪</span>
                        </FormRow>
                        <FormRow
                          label="הוצאות קבועות חודשיות"
                          hint="שכירות, ארנונה וכו'"
                        >
                          <MoneyInput
                            value={shared.monthly_fixed_expenses}
                            onChange={(v) =>
                              setShared((p) => ({
                                ...p,
                                monthly_fixed_expenses: v,
                              }))
                            }
                            min={0}
                            className="max-w-[160px]"
                          />
                          <span className="text-xs text-gray-400">₪</span>
                        </FormRow>
                      </FormSection>
                    )}

                    {showSharedFields && (
                      <div className="space-y-1.5">
                        <Label className="text-right text-[11px] font-semibold tracking-wide text-gray-500">
                          הערות
                        </Label>
                        <Textarea
                          value={shared.notes}
                          onChange={(e) =>
                            setShared((p) => ({ ...p, notes: e.target.value }))
                          }
                          className="text-right min-h-[60px] text-sm"
                          dir="rtl"
                        />
                      </div>
                    )}

                    {/* Navigation: חזור on RIGHT, primary on LEFT */}
                    <div className="flex justify-between pt-1">
                      <Button
                        variant="outline"
                        onClick={() =>
                          isPrimary ? setStep('verify') : setStep('data_primary')
                        }
                        className="gap-2"
                      >
                        <ArrowRight className="h-4 w-4" />
                        חזור
                      </Button>
                      {isPrimary ? (
                        <Button
                          onClick={() =>
                            secondaryPeriod
                              ? setStep('data_secondary')
                              : setStep('summary')
                          }
                          disabled={!isPrimaryMonthValid}
                          className="gap-2"
                        >
                          {secondaryPeriod
                            ? `המשך לחודש ${secondaryPeriod}`
                            : 'סיכום ואישור'}
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setStep('summary')}
                          disabled={!isSecondaryMonthValid}
                          className="gap-2"
                        >
                          סיכום ואישור
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </>
              );
            })()}

          {/* ─── Step 4: Summary ─── */}
          {step === 'summary' && (
            <>
              <CardHeader className="text-right pb-3">
                <CardTitle className="text-lg">
                  סיכום נתונים — {clientName}
                </CardTitle>
                <CardDescription className="text-xs">
                  בדקו את הנתונים לפני השליחה
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <SummaryMonth
                  period={primaryPeriod}
                  month={primaryMonth}
                  isPrimary
                />
                {secondaryPeriod && (
                  <SummaryMonth
                    period={secondaryPeriod}
                    month={secondaryMonth}
                  />
                )}
                <SummaryShared shared={shared} />

                <Alert className="text-right">
                  <AlertDescription className="text-xs">
                    בלחיצה על &quot;שלח נתונים&quot; הנתונים יישלחו למשרד לחישוב
                    המענק ותועברו לעמוד התשלום.
                  </AlertDescription>
                </Alert>

                <div className="flex justify-between pt-1">
                  <Button
                    variant="outline"
                    onClick={() =>
                      secondaryPeriod
                        ? setStep('data_secondary')
                        : setStep('data_primary')
                    }
                    disabled={isSubmitting}
                    className="gap-2"
                  >
                    <ArrowRight className="h-4 w-4" />
                    חזור לעריכה
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="gap-2"
                  >
                    שלח נתונים
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-[11px] text-gray-400 mt-5">
          TicoVision CRM — מענקי שאגת הארי
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-b-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  );
}

function SummaryMonth({
  period,
  month,
  isPrimary,
}: {
  period: string;
  month: MonthData;
  isPrimary?: boolean;
}) {
  return (
    <section className="rounded-md border border-gray-200 bg-white">
      <header className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-700">
          חודש {period}
        </span>
        {isPrimary && (
          <span className="text-[10px] text-gray-400">חודש ראשון</span>
        )}
      </header>
      <div className="px-3">
        <SummaryRow label="שכר ברוטו" value={formatMoney(month.salary_gross)} />
        <SummaryRow label="כמות עובדים" value={month.num_employees || '—'} />
        <SummaryRow
          label='ניכוי חל"ת'
          value={
            <>
              {formatMoney(month.chalat_deductions)}{' '}
              <span className="text-gray-400 text-xs">
                ({month.chalat_count || 0} עובדים)
              </span>
            </>
          }
        />
        <SummaryRow
          label="ניכוי חופשה"
          value={
            <>
              {formatMoney(month.vacation_deductions)}{' '}
              <span className="text-gray-400 text-xs">
                ({month.vacation_count || 0} עובדים)
              </span>
            </>
          }
        />
        <SummaryRow
          label="ניכוי מילואים"
          value={
            <>
              {formatMoney(month.miluim_deductions)}{' '}
              <span className="text-gray-400 text-xs">
                ({month.miluim_count || 0} עובדים)
              </span>
            </>
          }
        />
        <SummaryRow
          label="ניכוי טיפים"
          value={
            <>
              {formatMoney(month.tips_deductions)}{' '}
              <span className="text-gray-400 text-xs">
                ({month.tips_count || 0} עובדים)
              </span>
            </>
          }
        />
      </div>
    </section>
  );
}

function SummaryShared({ shared }: { shared: SharedFormData }) {
  return (
    <section className="rounded-md border border-gray-200 bg-white">
      <header className="px-3 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-700">
          נתונים נוספים
        </span>
      </header>
      <div className="px-3">
        <SummaryRow
          label="פירות וירקות שנתי"
          value={formatMoney(shared.fruit_vegetable_purchases_annual)}
        />
        <SummaryRow
          label="הוצאות קבועות חודשיות"
          value={formatMoney(shared.monthly_fixed_expenses)}
        />
        {shared.notes && (
          <div className="py-2 text-right text-sm">
            <span className="text-gray-500 text-xs">הערות:</span>
            <p className="text-gray-900 mt-1 text-sm">{shared.notes}</p>
          </div>
        )}
      </div>
    </section>
  );
}

export default SalaryDataFormPage;
