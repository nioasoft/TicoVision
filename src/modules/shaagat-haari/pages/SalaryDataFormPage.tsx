/**
 * Shaagat HaAri — Salary Data External Form
 *
 * Public page (no auth). Token-based access.
 * 3-step form:
 *   1. Identity verification (business ID)
 *   2. Salary + deduction data entry + fruit/veg + fixed expenses
 *   3. Summary + confirm
 *
 * Route: /shaagat-haari/salary-form?token={submissionToken}
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MoneyInput } from '@/components/ui/money-input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Shield,
  Users,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ClipboardCheck,
  FileText,
} from 'lucide-react';
import { shaagatPublicService } from '../services/shaagat-public.service';
import { cardcomService } from '@/services/cardcom.service';
import { GRANT_CONSTANTS } from '../lib/grant-constants';

type FormStep =
  | 'loading'
  | 'error'
  | 'verify'
  | 'data'
  | 'summary'
  | 'redirecting_to_payment'
  | 'success';

interface SalaryFormData {
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
  fruit_vegetable_purchases_annual: number | '';
  monthly_fixed_expenses: number | '';
  submitted_by_email: string;
  submitted_by_business_id: string;
  notes: string;
}

const initialFormData: SalaryFormData = {
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
  fruit_vegetable_purchases_annual: '',
  monthly_fixed_expenses: '',
  submitted_by_email: '',
  submitted_by_business_id: '',
  notes: '',
};

export function SalaryDataFormPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [step, setStep] = useState<FormStep>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [clientName, setClientName] = useState('');
  const [salaryPeriod, setSalaryPeriod] = useState('03/2026');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<SalaryFormData>(initialFormData);

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
      setSalaryPeriod(data.salary_period || '03/2026');
      setStep('verify');
    }

    validateToken();
  }, [token]);

  const handleVerify = useCallback(() => {
    if (!formData.submitted_by_email.trim()) {
      toast.error('יש למלא כתובת אימייל');
      return;
    }
    setStep('data');
  }, [formData.submitted_by_email]);

  const handleSubmit = useCallback(async () => {
    if (formData.salary_gross === '' || formData.num_employees === '') {
      toast.error('יש למלא שכר ברוטו וכמות עובדים');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await shaagatPublicService.submitAccountingData(token, {
        salary_gross: formData.salary_gross as number,
        num_employees: formData.num_employees as number,
        miluim_deductions: (formData.miluim_deductions as number) || 0,
        miluim_count: (formData.miluim_count as number) || 0,
        tips_deductions: (formData.tips_deductions as number) || 0,
        tips_count: (formData.tips_count as number) || 0,
        chalat_deductions: (formData.chalat_deductions as number) || 0,
        chalat_count: (formData.chalat_count as number) || 0,
        vacation_deductions: (formData.vacation_deductions as number) || 0,
        vacation_count: (formData.vacation_count as number) || 0,
        fruit_vegetable_purchases_annual: (formData.fruit_vegetable_purchases_annual as number) || 0,
        monthly_fixed_expenses: (formData.monthly_fixed_expenses as number) || 0,
        submitted_by_email: formData.submitted_by_email.trim(),
        submitted_by_business_id: formData.submitted_by_business_id.trim() || undefined,
        notes: formData.notes.trim() || undefined,
      });

      if (!result.success) {
        toast.error(result.error ?? 'שגיאה בשמירת הנתונים');
        return;
      }

      // After successful salary data submit, charge the Shaagat HaAri service
      // fee via Cardcom hosted page. Webhook updates payment status server-side
      // so the accountant can see it in the dashboard.
      setStep('redirecting_to_payment');
      const fee = GRANT_CONSTANTS.SERVICE_FEE.AMOUNT;
      const vat = Math.round(fee * GRANT_CONSTANTS.SERVICE_FEE.VAT_RATE);
      const totalAmount = fee + vat;

      const payment = await cardcomService.createPaymentPage({
        amount: totalAmount,
        productName: `שכ"ט שאגת הארי — ${clientName}`,
        customerName: clientName,
        customerEmail: formData.submitted_by_email.trim(),
        invoiceHead: clientName,
        invoiceDescription: 'שכר טרחה לטיפול במענק שאגת הארי',
        documentType: 1,
      });

      if (payment.error || !payment.data?.url) {
        toast.error('יצירת קישור התשלום נכשלה — שמרנו את הנתונים, ניצור קשר.');
        setStep('success');
        return;
      }

      // Redirect to Cardcom hosted page
      window.location.assign(payment.data.url);
    } catch {
      toast.error('שגיאה בשמירת הנתונים');
    } finally {
      setIsSubmitting(false);
    }
  }, [token, formData, clientName]);

  const formatMoney = (val: number | ''): string => {
    if (val === '' || val === 0) return '—';
    return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val);
  };

  // ─── Loading / Error / Success ───
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

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

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
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
      <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-bold">מעבירים אותך לתשלום…</h2>
            <p className="text-muted-foreground">
              נתוני השכר נשמרו. כעת תועברו לעמוד התשלום של Cardcom להסדרת
              שכר הטרחה לטיפול במענק.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step indicators
  const steps = [
    { key: 'verify', label: 'אימות', icon: Shield },
    { key: 'data', label: 'נתונים', icon: FileText },
    { key: 'summary', label: 'סיכום', icon: ClipboardCheck },
  ];
  const currentIndex = steps.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-background py-8 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">הזנת נתוני שכר — {clientName}</h1>
          <p className="text-muted-foreground mt-1">חודש שכר: {salaryPeriod}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, index) => {
            const Icon = s.icon;
            const isActive = s.key === step;
            const isCompleted = index < currentIndex;
            return (
              <div key={s.key} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  isActive ? 'bg-primary border-primary text-primary-foreground'
                  : isCompleted ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'bg-muted border-border text-muted-foreground'
                }`}>
                  {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span className={`me-2 text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
                {index < steps.length - 1 && (
                  <ChevronLeft className="h-5 w-5 mx-2 text-muted-foreground/50" />
                )}
              </div>
            );
          })}
        </div>

        <Card className="shadow-sm">
          {/* ─── Step 1: Verify Identity ─── */}
          {step === 'verify' && (
            <>
              <CardHeader className="text-right">
                <CardTitle>אימות זהות</CardTitle>
                <CardDescription>הזינו את פרטיכם לאימות</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-right">כתובת אימייל</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.submitted_by_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, submitted_by_email: e.target.value }))}
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessId" className="text-right">
                    ח.פ. / ע.מ. (אופציונלי)
                  </Label>
                  <Input
                    id="businessId"
                    value={formData.submitted_by_business_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, submitted_by_business_id: e.target.value }))}
                    dir="ltr"
                    className="max-w-xs"
                  />
                </div>
                <div className="flex justify-start pt-2">
                  <Button
                    onClick={handleVerify}
                    disabled={!formData.submitted_by_email.trim()}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    המשך
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {/* ─── Step 2: Data Entry ─── */}
          {step === 'data' && (
            <>
              <CardHeader className="text-right">
                <CardTitle>הזנת נתוני שכר עבודה — חודש {salaryPeriod}</CardTitle>
                <CardDescription>טופס 102</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Salary & employees */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-right">
                      שכר ברוטו (₪) <span className="text-red-500">*</span>
                    </Label>
                    <MoneyInput
                      value={formData.salary_gross}
                      onChange={(v) => setFormData(prev => ({ ...prev, salary_gross: v }))}
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-right">
                      כמות עובדים <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.num_employees === '' ? '' : formData.num_employees}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        num_employees: e.target.value === '' ? '' : parseInt(e.target.value) || 0,
                      }))}
                      dir="ltr"
                    />
                  </div>
                </div>

                <Separator />

                {/* Deductions — 4 pairs (amount + count) */}
                <h3 className="font-semibold text-right">ניכויים</h3>

                {/* Chalat */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-right">ניכוי חל&quot;ת (₪)</Label>
                    <MoneyInput
                      value={formData.chalat_deductions}
                      onChange={(v) => setFormData(prev => ({ ...prev, chalat_deductions: v }))}
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-right">כמות עובדים בחל&quot;ת</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.chalat_count === '' ? '' : formData.chalat_count}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        chalat_count: e.target.value === '' ? '' : parseInt(e.target.value) || 0,
                      }))}
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Vacation */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-right">ניכוי פדיון חופשה (₪)</Label>
                    <MoneyInput
                      value={formData.vacation_deductions}
                      onChange={(v) => setFormData(prev => ({ ...prev, vacation_deductions: v }))}
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-right">כמות עובדים בחופשה</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.vacation_count === '' ? '' : formData.vacation_count}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        vacation_count: e.target.value === '' ? '' : parseInt(e.target.value) || 0,
                      }))}
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Miluim */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-right">ניכוי מילואים (₪)</Label>
                    <MoneyInput
                      value={formData.miluim_deductions}
                      onChange={(v) => setFormData(prev => ({ ...prev, miluim_deductions: v }))}
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-right">כמות עובדים במילואים</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.miluim_count === '' ? '' : formData.miluim_count}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        miluim_count: e.target.value === '' ? '' : parseInt(e.target.value) || 0,
                      }))}
                      dir="ltr"
                    />
                  </div>
                </div>

                {/* Tips */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-right">ניכוי טיפים (₪)</Label>
                    <MoneyInput
                      value={formData.tips_deductions}
                      onChange={(v) => setFormData(prev => ({ ...prev, tips_deductions: v }))}
                      min={0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-right">כמות עובדים בטיפים</Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.tips_count === '' ? '' : formData.tips_count}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        tips_count: e.target.value === '' ? '' : parseInt(e.target.value) || 0,
                      }))}
                      dir="ltr"
                    />
                  </div>
                </div>

                <Separator />

                {/* Additional data */}
                <h3 className="font-semibold text-right">נתונים נוספים</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-right">קניות פירות וירקות שנתי (₪)</Label>
                    <MoneyInput
                      value={formData.fruit_vegetable_purchases_annual}
                      onChange={(v) => setFormData(prev => ({ ...prev, fruit_vegetable_purchases_annual: v }))}
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground">
                      לחישוב תשומות מע&quot;מ אפס
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-right">הוצאות קבועות חודשיות (₪)</Label>
                    <MoneyInput
                      value={formData.monthly_fixed_expenses}
                      onChange={(v) => setFormData(prev => ({ ...prev, monthly_fixed_expenses: v }))}
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground">
                      שכירות, ארנונה וכו&apos;
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Notes */}
                <div className="space-y-2">
                  <Label className="text-right">הערות</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="text-right min-h-[80px]"
                    dir="rtl"
                  />
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-2">
                  <Button
                    onClick={() => setStep('summary')}
                    disabled={formData.salary_gross === '' || formData.num_employees === ''}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    סיכום ואישור
                  </Button>
                  <Button variant="outline" onClick={() => setStep('verify')} className="gap-2">
                    חזור
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {/* ─── Step 3: Summary ─── */}
          {step === 'summary' && (
            <>
              <CardHeader className="text-right">
                <CardTitle>סיכום נתונים — {clientName}</CardTitle>
                <CardDescription>אנא בדקו את הנתונים לפני השליחה</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-right text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">שכר ברוטו ({salaryPeriod}):</span>
                    <span className="font-medium">{formatMoney(formData.salary_gross)}</span>

                    <span className="text-muted-foreground">כמות עובדים:</span>
                    <span className="font-medium">{formData.num_employees || '—'}</span>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">ניכוי חל&quot;ת:</span>
                    <span>{formatMoney(formData.chalat_deductions)} ({formData.chalat_count || 0} עובדים)</span>

                    <span className="text-muted-foreground">ניכוי חופשה:</span>
                    <span>{formatMoney(formData.vacation_deductions)} ({formData.vacation_count || 0} עובדים)</span>

                    <span className="text-muted-foreground">ניכוי מילואים:</span>
                    <span>{formatMoney(formData.miluim_deductions)} ({formData.miluim_count || 0} עובדים)</span>

                    <span className="text-muted-foreground">ניכוי טיפים:</span>
                    <span>{formatMoney(formData.tips_deductions)} ({formData.tips_count || 0} עובדים)</span>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">קניות פירות וירקות שנתי:</span>
                    <span>{formatMoney(formData.fruit_vegetable_purchases_annual)}</span>

                    <span className="text-muted-foreground">הוצאות קבועות חודשיות:</span>
                    <span>{formatMoney(formData.monthly_fixed_expenses)}</span>
                  </div>

                  {formData.notes && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-muted-foreground">הערות:</span>
                        <p className="mt-1">{formData.notes}</p>
                      </div>
                    </>
                  )}
                </div>

                <Alert>
                  <AlertDescription className="text-right text-sm">
                    בלחיצה על &quot;שלח נתונים&quot; הנתונים יישלחו למשרד לצורך חישוב המענק.
                  </AlertDescription>
                </Alert>

                {/* Navigation */}
                <div className="flex justify-between pt-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="gap-2"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    שלח נתונים
                  </Button>
                  <Button variant="outline" onClick={() => setStep('data')} disabled={isSubmitting} className="gap-2">
                    חזור לעריכה
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          TicoVision CRM — מענקי שאגת הארי
        </p>
      </div>
    </div>
  );
}

export default SalaryDataFormPage;
