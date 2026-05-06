/**
 * Shaagat HaAri — Detailed Calculation Wizard (4 Steps)
 *
 * Protected page (requires auth). Accessed from the dashboard.
 * Route: /shaagat-haari/calculations/:checkId
 *
 * Step 1: Business data (readonly from eligibility check)
 * Step 2: Fixed expenses (7 types breakdown + VAT inputs + zero VAT inputs)
 * Step 3: Salary data (auto-load from accounting form, editable)
 * Step 4: Final calculation (auto: expenses + salary + caps + small track comparison)
 *
 * Uses calculateGrant() from grant-calculations.ts as single source of truth.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MoneyInput } from '@/components/ui/money-input';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Calculator,
  Loader2,
  Building2,
  ClipboardCheck,
  Users,
  Receipt,
  Send,
  Award,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { useShaagatStore } from '../store/shaagatStore';
import { shaagatService } from '../services/shaagat.service';
import {
  calculateFixedExpensesGrant,
  calculateSalaryGrant,
  calculateGrant,
} from '../lib/grant-calculations';
import type { DetailedCalculation } from '../services/shaagat.service';
import type { GrantBreakdown } from '../types/shaagat.types';

type WizardStep = 1 | 2 | 3 | 4;

// Track type labels in Hebrew
const TRACK_LABELS: Record<string, string> = {
  standard: 'רגיל',
  small: 'קטנים',
  cash_basis: 'מזומן',
  new_business: 'עסק חדש',
  northern: 'צפון',
  contractor: 'קבלנים',
};

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  regular: 'עסק רגיל',
  ngo: 'עמותה / מלכ"ר',
};

const REPORTING_TYPE_LABELS: Record<string, string> = {
  monthly: 'חד-חודשי',
  bimonthly: 'דו-חודשי',
};

function formatMoney(val: number): string {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val);
}

export function DetailedCalculationPage() {
  const { checkId } = useParams<{ checkId: string }>();
  const navigate = useNavigate();

  const {
    activeCalculation,
    calculationLoading,
    fetchCalculationForEligibility,
    createDetailedCalculation,
    updateCalculationStep,
    sendCalculationToClient,
  } = useShaagatStore();

  // Local state
  const [eligibilityCheck, setEligibilityCheck] = useState<{
    id: string;
    client_id: string;
    track_type: string;
    business_type: string;
    reporting_type: string;
    compensation_rate: number;
    decline_percentage: number;
    annual_revenue: number;
    annual_revenue_2022: number | null;
    revenue_base_period: number;
    revenue_comparison_period: number;
    client: { company_name: string; tax_id: string };
  } | null>(null);

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [breakdown, setBreakdown] = useState<GrantBreakdown | null>(null);

  // ─── Step 2: Expenses state ───
  const [vatInputs, setVatInputs] = useState<number | ''>(0);
  const [zeroVatInputs, setZeroVatInputs] = useState<number | ''>(0);
  const [inputsMonths, setInputsMonths] = useState(12);
  const [useEnhancedRate, setUseEnhancedRate] = useState(false);
  const [expenseRent, setExpenseRent] = useState<number | ''>(0);
  const [expenseElectricity, setExpenseElectricity] = useState<number | ''>(0);
  const [expenseWater, setExpenseWater] = useState<number | ''>(0);
  const [expensePhoneInternet, setExpensePhoneInternet] = useState<number | ''>(0);
  const [expenseInsurance, setExpenseInsurance] = useState<number | ''>(0);
  const [expenseMaintenance, setExpenseMaintenance] = useState<number | ''>(0);
  const [expenseOtherFixed, setExpenseOtherFixed] = useState<number | ''>(0);
  const [expenseOtherDescription, setExpenseOtherDescription] = useState('');

  // ─── Step 3: Salary state ───
  const [salaryGross, setSalaryGross] = useState<number | ''>(0);
  const [numEmployees, setNumEmployees] = useState<number | ''>(0);
  const [miluimDeductions, setMiluimDeductions] = useState<number | ''>(0);
  const [tipsDeductions, setTipsDeductions] = useState<number | ''>(0);
  const [chalatDeductions, setChalatDeductions] = useState<number | ''>(0);
  const [vacationDeductions, setVacationDeductions] = useState<number | ''>(0);
  const [miluimCount, setMiluimCount] = useState<number | ''>(0);
  const [tipsCount, setTipsCount] = useState<number | ''>(0);
  const [chalatCount, setChalatCount] = useState<number | ''>(0);
  const [vacationCount, setVacationCount] = useState<number | ''>(0);
  const [salaryDataLoaded, setSalaryDataLoaded] = useState(false);

  // ─── Load eligibility check + existing calculation ───
  useEffect(() => {
    if (!checkId) return;

    async function loadData() {
      setIsLoading(true);

      // 1. Load eligibility check
      const ecResult = await shaagatService.getEligibilityCheckById(checkId);
      if (ecResult.error || !ecResult.data) {
        toast.error('שגיאה בטעינת נתוני הזכאות');
        navigate('/shaagat-haari');
        return;
      }

      const ec = ecResult.data;
      setEligibilityCheck({
        id: ec.id,
        client_id: ec.client_id,
        track_type: ec.track_type,
        business_type: ec.business_type,
        reporting_type: ec.reporting_type,
        compensation_rate: ec.compensation_rate,
        decline_percentage: ec.decline_percentage,
        annual_revenue: ec.annual_revenue,
        annual_revenue_2022: ec.annual_revenue_2022,
        revenue_base_period: ec.revenue_base_period,
        revenue_comparison_period: ec.revenue_comparison_period,
        client: ec.client,
      });

      // 2. Load existing calculation or create new
      await fetchCalculationForEligibility(checkId);

      setIsLoading(false);
    }

    loadData();
  }, [checkId, navigate, fetchCalculationForEligibility]);

  // ─── Hydrate form from existing calculation ───
  useEffect(() => {
    if (!activeCalculation) return;

    const calc = activeCalculation;
    setCurrentStep(Math.min(calc.calculation_step, 4) as WizardStep);

    // Step 2 data
    if (calc.calculation_step >= 2) {
      setVatInputs(calc.vat_inputs || 0);
      setZeroVatInputs(calc.zero_vat_inputs || 0);
      setInputsMonths(calc.inputs_months || 12);
      setUseEnhancedRate(calc.use_enhanced_rate);
      setExpenseRent(calc.expense_rent || 0);
      setExpenseElectricity(calc.expense_electricity || 0);
      setExpenseWater(calc.expense_water || 0);
      setExpensePhoneInternet(calc.expense_phone_internet || 0);
      setExpenseInsurance(calc.expense_insurance || 0);
      setExpenseMaintenance(calc.expense_maintenance || 0);
      setExpenseOtherFixed(calc.expense_other_fixed || 0);
      setExpenseOtherDescription(calc.expense_other_description || '');
    }

    // Step 3 data
    if (calc.calculation_step >= 3) {
      setSalaryGross(calc.salary_gross || 0);
      setNumEmployees(calc.num_employees || 0);
      setMiluimDeductions(calc.miluim_deductions || 0);
      setTipsDeductions(calc.tips_deductions || 0);
      setChalatDeductions(calc.chalat_deductions || 0);
      setVacationDeductions(calc.vacation_deductions || 0);
      setMiluimCount(calc.miluim_count || 0);
      setTipsCount(calc.tips_count || 0);
      setChalatCount(calc.chalat_count || 0);
      setVacationCount(calc.vacation_count || 0);
    }
  }, [activeCalculation]);

  // ─── Create calculation if none exists ───
  const ensureCalculationExists = useCallback(async (): Promise<DetailedCalculation | null> => {
    if (activeCalculation) return activeCalculation;
    if (!eligibilityCheck) return null;

    const calc = await createDetailedCalculation({
      eligibility_check_id: eligibilityCheck.id,
      client_id: eligibilityCheck.client_id,
      track_type: eligibilityCheck.track_type as DetailedCalculation['track_type'],
      business_type: eligibilityCheck.business_type as DetailedCalculation['business_type'],
      reporting_type: eligibilityCheck.reporting_type as DetailedCalculation['reporting_type'],
      compensation_rate: eligibilityCheck.compensation_rate,
      decline_percentage: eligibilityCheck.decline_percentage,
      annual_revenue: eligibilityCheck.annual_revenue,
      revenue_base_period: eligibilityCheck.revenue_base_period,
      revenue_comparison_period: eligibilityCheck.revenue_comparison_period,
    });

    return calc;
  }, [activeCalculation, eligibilityCheck, createDetailedCalculation]);

  // ─── Auto-load salary data from accounting submission ───
  const handleLoadSalaryData = useCallback(async () => {
    if (!eligibilityCheck) return;

    const result = await shaagatService.getAccountingSubmissionByClient(eligibilityCheck.client_id);
    if (result.error || !result.data) {
      toast.error('לא נמצאו נתוני שכר שהוגשו');
      return;
    }

    const d = result.data;
    setSalaryGross(d.salary_gross ?? 0);
    setNumEmployees(d.num_employees ?? 0);
    setMiluimDeductions(d.miluim_deductions ?? 0);
    setMiluimCount(d.miluim_count ?? 0);
    setTipsDeductions(d.tips_deductions ?? 0);
    setTipsCount(d.tips_count ?? 0);
    setChalatDeductions(d.chalat_deductions ?? 0);
    setChalatCount(d.chalat_count ?? 0);
    setVacationDeductions(d.vacation_deductions ?? 0);
    setVacationCount(d.vacation_count ?? 0);
    setSalaryDataLoaded(true);
    toast.success('נתוני השכר נטענו בהצלחה');
  }, [eligibilityCheck]);

  // ─── Computed: total actual fixed expenses ───
  const totalActualFixedExpenses = useMemo(() =>
    (Number(expenseRent) || 0) +
    (Number(expenseElectricity) || 0) +
    (Number(expenseWater) || 0) +
    (Number(expensePhoneInternet) || 0) +
    (Number(expenseInsurance) || 0) +
    (Number(expenseMaintenance) || 0) +
    (Number(expenseOtherFixed) || 0),
    [expenseRent, expenseElectricity, expenseWater, expensePhoneInternet, expenseInsurance, expenseMaintenance, expenseOtherFixed]
  );

  // ─── Live preview: fixed expenses grant ───
  const fixedExpensesPreview = useMemo(() => {
    if (!eligibilityCheck || vatInputs === '' || vatInputs === 0) return null;
    return calculateFixedExpensesGrant({
      vatInputs: Number(vatInputs) || 0,
      zeroVatInputs: Number(zeroVatInputs) || 0,
      compensationRate: eligibilityCheck.compensation_rate,
      inputsMonths,
      useEnhancedRate,
    });
  }, [eligibilityCheck, vatInputs, zeroVatInputs, inputsMonths, useEnhancedRate]);

  // ─── Live preview: salary grant ───
  const salaryPreview = useMemo(() => {
    if (!eligibilityCheck || salaryGross === '' || salaryGross === 0) return null;
    return calculateSalaryGrant({
      salaryGross: Number(salaryGross) || 0,
      tipsDeductions: Number(tipsDeductions) || 0,
      miluimDeductions: Number(miluimDeductions) || 0,
      chalatDeductions: Number(chalatDeductions) || 0,
      vacationDeductions: Number(vacationDeductions) || 0,
      totalEmployees: Number(numEmployees) || 0,
      tipsCount: Number(tipsCount) || 0,
      miluimCount: Number(miluimCount) || 0,
      chalatCount: Number(chalatCount) || 0,
      vacationCount: Number(vacationCount) || 0,
      businessType: eligibilityCheck.business_type as 'regular' | 'ngo',
      declinePercentage: eligibilityCheck.decline_percentage,
      reportingType: eligibilityCheck.reporting_type as 'monthly' | 'bimonthly',
    });
  }, [eligibilityCheck, salaryGross, tipsDeductions, miluimDeductions, chalatDeductions, vacationDeductions, numEmployees, tipsCount, miluimCount, chalatCount, vacationCount]);

  // ─── Save step 2 ───
  const handleSaveStep2 = useCallback(async () => {
    setIsSaving(true);
    try {
      const calc = await ensureCalculationExists();
      if (!calc) { toast.error('שגיאה ביצירת חישוב'); return; }

      await updateCalculationStep(calc.id, {
        step: 2,
        vat_inputs: Number(vatInputs) || 0,
        zero_vat_inputs: Number(zeroVatInputs) || 0,
        inputs_months: inputsMonths,
        use_enhanced_rate: useEnhancedRate,
        expense_rent: Number(expenseRent) || 0,
        expense_electricity: Number(expenseElectricity) || 0,
        expense_water: Number(expenseWater) || 0,
        expense_phone_internet: Number(expensePhoneInternet) || 0,
        expense_insurance: Number(expenseInsurance) || 0,
        expense_maintenance: Number(expenseMaintenance) || 0,
        expense_other_fixed: Number(expenseOtherFixed) || 0,
        expense_other_description: expenseOtherDescription || undefined,
      });

      setCurrentStep(3);
      toast.success('נתוני הוצאות נשמרו');
    } catch { toast.error('שגיאה בשמירה'); } finally { setIsSaving(false); }
  }, [ensureCalculationExists, updateCalculationStep, vatInputs, zeroVatInputs, inputsMonths, useEnhancedRate, expenseRent, expenseElectricity, expenseWater, expensePhoneInternet, expenseInsurance, expenseMaintenance, expenseOtherFixed, expenseOtherDescription]);

  // ─── Save step 3 ───
  const handleSaveStep3 = useCallback(async () => {
    if (!activeCalculation) return;
    setIsSaving(true);
    try {
      await updateCalculationStep(activeCalculation.id, {
        step: 3,
        salary_gross: Number(salaryGross) || 0,
        num_employees: Number(numEmployees) || 0,
        miluim_deductions: Number(miluimDeductions) || 0,
        tips_deductions: Number(tipsDeductions) || 0,
        chalat_deductions: Number(chalatDeductions) || 0,
        vacation_deductions: Number(vacationDeductions) || 0,
        miluim_count: Number(miluimCount) || 0,
        tips_count: Number(tipsCount) || 0,
        chalat_count: Number(chalatCount) || 0,
        vacation_count: Number(vacationCount) || 0,
      });

      setCurrentStep(4);
      toast.success('נתוני שכר נשמרו');
    } catch { toast.error('שגיאה בשמירה'); } finally { setIsSaving(false); }
  }, [activeCalculation, updateCalculationStep, salaryGross, numEmployees, miluimDeductions, tipsDeductions, chalatDeductions, vacationDeductions, miluimCount, tipsCount, chalatCount, vacationCount]);

  // ─── Calculate and save step 4 ───
  const handleCalculateAndSave = useCallback(async () => {
    if (!activeCalculation || !eligibilityCheck) return;
    setIsSaving(true);
    try {
      const result = calculateGrant({
        trackType: eligibilityCheck.track_type as GrantBreakdown['eligibility']['eligibilityStatus'] extends string ? never : 'standard',
        reportingType: eligibilityCheck.reporting_type as 'monthly' | 'bimonthly',
        businessType: eligibilityCheck.business_type as 'regular' | 'ngo',
        eligibility: {
          revenueBase: eligibilityCheck.revenue_base_period,
          revenueComparison: eligibilityCheck.revenue_comparison_period,
          capitalRevenuesBase: 0,
          capitalRevenuesComparison: 0,
          selfAccountingRevenuesBase: 0,
          selfAccountingRevenuesComparison: 0,
          reportingType: eligibilityCheck.reporting_type as 'monthly' | 'bimonthly',
          annualRevenue: eligibilityCheck.annual_revenue,
        },
        fixedExpenses: {
          vatInputs: Number(vatInputs) || 0,
          zeroVatInputs: Number(zeroVatInputs) || 0,
          compensationRate: eligibilityCheck.compensation_rate,
          inputsMonths,
          useEnhancedRate,
        },
        salary: {
          salaryGross: Number(salaryGross) || 0,
          tipsDeductions: Number(tipsDeductions) || 0,
          miluimDeductions: Number(miluimDeductions) || 0,
          chalatDeductions: Number(chalatDeductions) || 0,
          vacationDeductions: Number(vacationDeductions) || 0,
          totalEmployees: Number(numEmployees) || 0,
          tipsCount: Number(tipsCount) || 0,
          miluimCount: Number(miluimCount) || 0,
          chalatCount: Number(chalatCount) || 0,
          vacationCount: Number(vacationCount) || 0,
          businessType: eligibilityCheck.business_type as 'regular' | 'ngo',
          declinePercentage: eligibilityCheck.decline_percentage,
          reportingType: eligibilityCheck.reporting_type as 'monthly' | 'bimonthly',
        },
        annualRevenue2022: eligibilityCheck.annual_revenue_2022 ?? undefined,
      });

      setBreakdown(result);

      await updateCalculationStep(activeCalculation.id, {
        step: 4,
        breakdown: result,
      });

      toast.success('החישוב הושלם בהצלחה');
    } catch { toast.error('שגיאה בחישוב'); } finally { setIsSaving(false); }
  }, [activeCalculation, eligibilityCheck, vatInputs, zeroVatInputs, inputsMonths, useEnhancedRate, salaryGross, tipsDeductions, miluimDeductions, chalatDeductions, vacationDeductions, numEmployees, tipsCount, miluimCount, chalatCount, vacationCount, updateCalculationStep]);

  // Auto-calculate on step 4 entry
  useEffect(() => {
    if (currentStep === 4 && !breakdown && activeCalculation && !activeCalculation.is_completed) {
      handleCalculateAndSave();
    }
  }, [currentStep, breakdown, activeCalculation, handleCalculateAndSave]);

  // ─── Send to client ───
  const handleSendToClient = useCallback(async () => {
    if (!activeCalculation) return;
    setIsSending(true);
    try {
      const success = await sendCalculationToClient(activeCalculation.id);
      if (success) {
        toast.success('התוצאות נשלחו ללקוח');
      } else {
        toast.error('שגיאה בשליחה');
      }
    } catch { toast.error('שגיאה בשליחה'); } finally { setIsSending(false); }
  }, [activeCalculation, sendCalculationToClient]);

  // ─── Step indicator ───
  const steps = [
    { num: 1, label: 'נתוני עסק', icon: Building2 },
    { num: 2, label: 'הוצאות קבועות', icon: Receipt },
    { num: 3, label: 'נתוני שכר', icon: Users },
    { num: 4, label: 'חישוב סופי', icon: Calculator },
  ];

  if (isLoading || calculationLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!eligibilityCheck) {
    return (
      <div className="text-center py-16">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-xl font-bold">לא נמצאו נתוני זכאות</h2>
        <Button variant="outline" onClick={() => navigate('/shaagat-haari')} className="mt-4">
          חזרה לדשבורד
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6" />
            חישוב מענק מפורט
          </h1>
          <p className="text-muted-foreground mt-1">
            {eligibilityCheck.client.company_name} | {eligibilityCheck.client.tax_id}
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/shaagat-haari')}>
          חזרה לדשבורד
        </Button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-1 sm:gap-2">
        {steps.map((s, index) => {
          const Icon = s.icon;
          const isActive = s.num === currentStep;
          const isCompleted = s.num < currentStep;
          return (
            <div key={s.num} className="flex items-center">
              <button
                onClick={() => { if (isCompleted) setCurrentStep(s.num as WizardStep); }}
                disabled={!isCompleted && !isActive}
                className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 transition-colors ${
                  isActive ? 'bg-primary border-primary text-primary-foreground'
                  : isCompleted ? 'bg-primary/10 border-primary/40 text-primary cursor-pointer'
                  : 'bg-muted border-border text-muted-foreground'
                }`}
              >
                {isCompleted ? <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" /> : <Icon className="h-4 w-4 sm:h-5 sm:w-5" />}
              </button>
              <span className={`me-1 sm:me-2 text-xs sm:text-sm font-medium hidden sm:inline ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-6 sm:w-10 h-0.5 mx-1 ${s.num < currentStep ? 'bg-primary/40' : 'bg-border'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* STEP 1: Business Data (readonly) */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {currentStep === 1 && (
        <Card>
          <CardHeader className="text-right">
            <CardTitle>נתוני עסק (מבדיקת זכאות)</CardTitle>
            <CardDescription>נתונים אלו נקבעו בשלב בדיקת הזכאות ואינם ניתנים לעריכה</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-right">
              <div>
                <Label className="text-muted-foreground text-xs">מסלול</Label>
                <p className="font-medium">{TRACK_LABELS[eligibilityCheck.track_type] || eligibilityCheck.track_type}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">סוג עסק</Label>
                <p className="font-medium">{BUSINESS_TYPE_LABELS[eligibilityCheck.business_type]}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">סוג דיווח</Label>
                <p className="font-medium">{REPORTING_TYPE_LABELS[eligibilityCheck.reporting_type]}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">מחזור שנתי</Label>
                <p className="font-medium">{formatMoney(eligibilityCheck.annual_revenue)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">שיעור ירידה</Label>
                <p className="font-medium">{eligibilityCheck.decline_percentage.toFixed(1)}%</p>
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">שיעור פיצוי</Label>
                <Badge>{eligibilityCheck.compensation_rate}%</Badge>
              </div>
            </div>

            <div className="flex justify-start pt-4">
              <Button onClick={() => setCurrentStep(2)} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                המשך להוצאות קבועות
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* STEP 2: Fixed Expenses */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {currentStep === 2 && (
        <Card>
          <CardHeader className="text-right">
            <CardTitle>הוצאות קבועות ותשומות</CardTitle>
            <CardDescription>הזינו את נתוני התשומות ופירוט ההוצאות הקבועות</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* VAT Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>תשומות שנתיות — מע&quot;מ רגיל (₪)</Label>
                <MoneyInput value={vatInputs} onChange={setVatInputs} min={0} />
              </div>
              <div className="space-y-2">
                <Label>תשומות שנתיות — מע&quot;מ אפס (₪)</Label>
                <MoneyInput value={zeroVatInputs} onChange={setZeroVatInputs} min={0} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>חודשים לממוצע</Label>
                <Input type="number" min={1} max={12} value={inputsMonths} onChange={(e) => setInputsMonths(parseInt(e.target.value) || 12)} dir="ltr" className="max-w-[100px]" />
                <p className="text-xs text-muted-foreground">12 ברגיל, פחות לעסקים חדשים</p>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Checkbox checked={useEnhancedRate} onCheckedChange={(c) => setUseEnhancedRate(c === true)} id="enhanced" />
                <Label htmlFor="enhanced" className="cursor-pointer">מכפיל x2 (הוצאות קבועות בפועל גבוהות)</Label>
              </div>
            </div>

            <Separator />

            {/* 7 Expense Categories */}
            <h3 className="font-semibold text-right">פירוט הוצאות קבועות (7 סוגים)</h3>
            <p className="text-xs text-muted-foreground text-right">
              פירוט ההוצאות משמש להחלטה האם להפעיל מכפיל x2. הנוסחה עצמה משתמשת בתשומות הממוצעות.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-sm">שכר דירה</Label>
                <MoneyInput value={expenseRent} onChange={setExpenseRent} min={0} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">חשמל</Label>
                <MoneyInput value={expenseElectricity} onChange={setExpenseElectricity} min={0} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">מים</Label>
                <MoneyInput value={expenseWater} onChange={setExpenseWater} min={0} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">טלפון / אינטרנט</Label>
                <MoneyInput value={expensePhoneInternet} onChange={setExpensePhoneInternet} min={0} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">ביטוח</Label>
                <MoneyInput value={expenseInsurance} onChange={setExpenseInsurance} min={0} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">אחזקה</Label>
                <MoneyInput value={expenseMaintenance} onChange={setExpenseMaintenance} min={0} />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">אחר</Label>
                <MoneyInput value={expenseOtherFixed} onChange={setExpenseOtherFixed} min={0} />
                {(Number(expenseOtherFixed) > 0) && (
                  <Input value={expenseOtherDescription} onChange={(e) => setExpenseOtherDescription(e.target.value)} className="text-right text-sm mt-1" dir="rtl" />
                )}
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-right text-sm">
              <span className="text-muted-foreground">סה&quot;כ הוצאות קבועות בפועל: </span>
              <span className="font-semibold">{formatMoney(totalActualFixedExpenses)}</span>
              {fixedExpensesPreview && (
                <>
                  <span className="text-muted-foreground mx-2">|</span>
                  <span className="text-muted-foreground">מענק הוצאות משוער: </span>
                  <span className="font-semibold text-primary">{formatMoney(fixedExpensesPreview.fixedExpensesGrant)}</span>
                </>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <Button onClick={handleSaveStep2} disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeft className="h-4 w-4" />}
                שמור והמשך לשכר
              </Button>
              <Button variant="outline" onClick={() => setCurrentStep(1)} className="gap-2">
                חזור <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* STEP 3: Salary Data */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {currentStep === 3 && (
        <Card>
          <CardHeader className="text-right">
            <CardTitle>נתוני שכר</CardTitle>
            <CardDescription>הזינו נתוני שכר מטופס 102 או טענו מטופס שהוגש</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Auto-load button */}
            <Alert>
              <Download className="h-4 w-4" />
              <AlertDescription className="text-right flex items-center justify-between">
                <span>ניתן לטעון נתונים מטופס רו&quot;ח/מנהלת חשבונות שהוגש</span>
                <Button variant="outline" size="sm" onClick={handleLoadSalaryData} className="gap-1 ms-3">
                  <Download className="h-3 w-3" />
                  טען נתונים
                </Button>
              </AlertDescription>
            </Alert>

            {salaryDataLoaded && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-right text-green-800">
                  נתוני השכר נטענו מהטופס שהוגש. ניתן לערוך לפני השמירה.
                </AlertDescription>
              </Alert>
            )}

            {/* Salary + employees */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>שכר ברוטו (₪) <span className="text-red-500">*</span></Label>
                <MoneyInput value={salaryGross} onChange={setSalaryGross} min={0} />
              </div>
              <div className="space-y-2">
                <Label>כמות עובדים <span className="text-red-500">*</span></Label>
                <Input type="number" min={0} value={numEmployees === '' ? '' : numEmployees} onChange={(e) => setNumEmployees(e.target.value === '' ? '' : parseInt(e.target.value) || 0)} dir="ltr" />
              </div>
            </div>

            <Separator />
            <h3 className="font-semibold text-right">ניכויים</h3>

            {/* 4 deduction pairs */}
            {[
              { label: 'חל"ת', amount: chalatDeductions, setAmount: setChalatDeductions, count: chalatCount, setCount: setChalatCount },
              { label: 'פדיון חופשה', amount: vacationDeductions, setAmount: setVacationDeductions, count: vacationCount, setCount: setVacationCount },
              { label: 'מילואים', amount: miluimDeductions, setAmount: setMiluimDeductions, count: miluimCount, setCount: setMiluimCount },
              { label: 'טיפים', amount: tipsDeductions, setAmount: setTipsDeductions, count: tipsCount, setCount: setTipsCount },
            ].map((d) => (
              <div key={d.label} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm">ניכוי {d.label} (₪)</Label>
                  <MoneyInput value={d.amount} onChange={d.setAmount} min={0} />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">כמות עובדים ב{d.label}</Label>
                  <Input type="number" min={0} value={d.count === '' ? '' : d.count} onChange={(e) => d.setCount(e.target.value === '' ? '' : parseInt(e.target.value) || 0)} dir="ltr" />
                </div>
              </div>
            ))}

            {salaryPreview && (
              <div className="bg-muted/50 rounded-lg p-3 text-right text-sm">
                <span className="text-muted-foreground">מענק שכר משוער: </span>
                <span className="font-semibold text-primary">{formatMoney(salaryPreview.salaryGrant)}</span>
                {salaryPreview.salaryGrantBeforeCap !== salaryPreview.salaryGrant && (
                  <span className="text-xs text-muted-foreground ms-2">
                    (לפני תקרה: {formatMoney(salaryPreview.salaryGrantBeforeCap)})
                  </span>
                )}
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button onClick={handleSaveStep3} disabled={isSaving || salaryGross === '' || numEmployees === ''} className="gap-2">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeft className="h-4 w-4" />}
                שמור וחשב
              </Button>
              <Button variant="outline" onClick={() => setCurrentStep(2)} className="gap-2">
                חזור <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* STEP 4: Final Calculation */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {currentStep === 4 && (
        <Card>
          <CardHeader className="text-right">
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              תוצאות חישוב מענק
            </CardTitle>
            <CardDescription>
              {eligibilityCheck.client.company_name} | {eligibilityCheck.client.tax_id}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isSaving && !breakdown ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ms-3 text-muted-foreground">מחשב...</span>
              </div>
            ) : breakdown ? (
              <>
                {/* Fixed Expenses Grant */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-right space-y-2">
                  <h3 className="font-semibold text-blue-900">מענק הוצאות קבועות</h3>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <span className="text-blue-700">ממוצע חודשי תשומות:</span>
                    <span>{formatMoney(breakdown.fixedExpenses.monthlyAvgInputs)}</span>
                    <span className="text-blue-700">מקדם אפקטיבי:</span>
                    <span>{breakdown.fixedExpenses.effectiveRate}%</span>
                  </div>
                  <p className="text-lg font-bold text-blue-900">
                    {formatMoney(breakdown.fixedExpenses.fixedExpensesGrant)}
                  </p>
                </div>

                {/* Salary Grant */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-right space-y-2">
                  <h3 className="font-semibold text-purple-900">מענק שכר</h3>
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    <span className="text-purple-700">שכר מותאם:</span>
                    <span>{formatMoney(breakdown.salary.adjustedSalary)}</span>
                    <span className="text-purple-700">ירידה אפקטיבית:</span>
                    <span>{breakdown.salary.effectiveDecline.toFixed(1)}%</span>
                    <span className="text-purple-700">תקרת שכר:</span>
                    <span>{formatMoney(breakdown.salary.salaryCap)}</span>
                  </div>
                  <p className="text-lg font-bold text-purple-900">
                    {formatMoney(breakdown.salary.salaryGrant)}
                  </p>
                </div>

                <Separator />

                {/* Total + Cap */}
                <div className="bg-muted/50 rounded-lg p-4 text-right space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">סה&quot;כ לפני תקרה:</span>
                    <span>{formatMoney(breakdown.totalGrant)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">תקרת מענק:</span>
                    <span>{formatMoney(breakdown.grantCap)}</span>
                  </div>
                  {breakdown.contractorAdjustedGrant !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">מכפיל קבלנים (x0.68):</span>
                      <span>{formatMoney(breakdown.contractorAdjustedGrant)}</span>
                    </div>
                  )}
                  {breakdown.smallBusinessGrant !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">מסלול קטנים (השוואה):</span>
                      <span>{formatMoney(breakdown.smallBusinessGrant)}</span>
                    </div>
                  )}
                </div>

                {/* Final Amount */}
                <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-5 text-center">
                  <p className="text-muted-foreground text-sm">סך כל מענק סופי</p>
                  <p className="text-3xl font-bold text-primary mt-1">
                    {formatMoney(breakdown.recommendedAmount)}
                  </p>
                  {breakdown.smallBusinessGrant !== undefined && breakdown.recommendedAmount === breakdown.smallBusinessGrant && (
                    <Badge variant="secondary" className="mt-2">נלקח מסלול קטנים (הגבוה מבין השניים)</Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  {!activeCalculation?.is_sent_to_client ? (
                    <Button onClick={handleSendToClient} disabled={isSending} className="flex-1 gap-2" size="lg">
                      {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      שלח תוצאות ללקוח
                    </Button>
                  ) : (
                    <Alert className="flex-1 bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-right text-green-800">
                        התוצאות נשלחו ללקוח
                        {activeCalculation?.client_approved !== null && (
                          <span className="ms-2">
                            {activeCalculation.client_approved
                              ? '— הלקוח אישר'
                              : '— הלקוח דחה'}
                          </span>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>שגיאה בחישוב. נסו לחזור לשלבים הקודמים ולבדוק את הנתונים.</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setCurrentStep(3)} className="gap-2">
                חזור לנתוני שכר <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default DetailedCalculationPage;
