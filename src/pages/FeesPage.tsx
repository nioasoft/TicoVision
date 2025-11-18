import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { formatILS } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Calculator,
  TrendingUp,
  Coins,
  FileText,
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Info,
  CheckCircle2,
  Edit2,
  Eye,
  Loader2,
  Percent
} from 'lucide-react';
import { clientService, type Client } from '@/services/client.service';
import { feeService, type FeeCalculation, type CreateFeeCalculationDto } from '@/services/fee.service';
import { ClientInfoCard } from '@/components/ClientInfoCard';
import { FileDisplayWidget } from '@/components/files/FileDisplayWidget';
import { LetterPreviewDialog } from '@/modules/letters/components/LetterPreviewDialog';
import { selectLetterTemplate, type LetterSelectionResult } from '@/modules/letters/utils/letter-selector';
import type { LetterTemplateType } from '@/modules/letters/types/letter.types';

// 11 Template options (for manual letter selection)
const TEMPLATE_OPTIONS: { value: LetterTemplateType; label: string }[] = [
  { value: 'external_index_only', label: 'A - חיצוניים - שינוי מדד בלבד' },
  { value: 'external_real_change', label: 'B - חיצוניים - שינוי ריאלי' },
  { value: 'external_as_agreed', label: 'C - חיצוניים - כמוסכם' },
  { value: 'internal_audit_index', label: 'D1 - פנימי ראיית חשבון - שינוי מדד' },
  { value: 'internal_audit_real', label: 'D2 - פנימי ראיית חשבון - שינוי ריאלי' },
  { value: 'internal_audit_agreed', label: 'D3 - פנימי ראיית חשבון - כמוסכם' },
  { value: 'retainer_index', label: 'E1 - ריטיינר - שינוי מדד' },
  { value: 'retainer_real', label: 'E2 - ריטיינר - שינוי ריאלי' },
  { value: 'internal_bookkeeping_index', label: 'F1 - פנימי הנהלת חשבונות - שינוי מדד' },
  { value: 'internal_bookkeeping_real', label: 'F2 - פנימי הנהלת חשבונות - שינוי ריאלי' },
  { value: 'internal_bookkeeping_agreed', label: 'F3 - פנימי הנהלת חשבונות - כמוסכם' },
];

interface FeeCalculatorForm {
  client_id: string;
  year: number;
  isNewClient: boolean;
  previous_year_amount: number;
  previous_year_discount: number;
  previous_year_amount_after_discount: number;
  previous_year_amount_with_vat: number;
  previous_year_amount_with_vat_before_discount: number; // NEW: Base amount with VAT, before discount
  base_amount: number;
  inflation_rate: number;
  index_manual_adjustment: number; // NEW: Manual inflation adjustment in ILS (can be negative)
  real_adjustment: number;
  real_adjustment_reason: string;
  discount_percentage: number;
  apply_inflation_index: boolean;
  notes: string;
  // Bookkeeping fields (for internal clients only)
  bookkeeping_base_amount: number;
  bookkeeping_inflation_rate: number;
  bookkeeping_real_adjustment: number;
  bookkeeping_real_adjustment_reason: string;
  bookkeeping_discount_percentage: number;
  bookkeeping_apply_inflation_index: boolean;
}

export function FeesPage() {
  const [activeTab, setActiveTab] = useState<'previous' | 'current' | 'results'>('previous');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientDetails, setSelectedClientDetails] = useState<Client | null>(null);
  const [relatedCompanies, setRelatedCompanies] = useState<Client[]>([]);
  const [feeCalculations, setFeeCalculations] = useState<FeeCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [previousYearDataSaved, setPreviousYearDataSaved] = useState(false);
  const [savingPreviousData, setSavingPreviousData] = useState(false);
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);
  const [formData, setFormData] = useState<FeeCalculatorForm>({
    client_id: '',
    year: new Date().getFullYear() + 1, // Default: next year (tax year being calculated)
    isNewClient: false,
    previous_year_amount: 0,
    previous_year_discount: 0,
    previous_year_amount_after_discount: 0,
    previous_year_amount_with_vat: 0,
    previous_year_amount_with_vat_before_discount: 0,
    base_amount: 0,
    inflation_rate: 3.0,
    index_manual_adjustment: 0,
    real_adjustment: 0,
    real_adjustment_reason: '',
    discount_percentage: 0,
    apply_inflation_index: true,
    notes: '',
    // Bookkeeping fields (for internal clients only)
    bookkeeping_base_amount: 0,
    bookkeeping_inflation_rate: 3.0,
    bookkeeping_real_adjustment: 0,
    bookkeeping_real_adjustment_reason: '',
    bookkeeping_discount_percentage: 0,
    bookkeeping_apply_inflation_index: true
  });
  const [calculationResults, setCalculationResults] = useState<{
    inflation_adjustment: number;
    inflation_adjustment_auto: number;
    index_manual_adjustment: number;
    real_adjustment: number;
    adjusted_amount: number;
    discount_amount: number;
    final_amount: number;
    vat_amount: number;
    total_with_vat: number;
    year_over_year_change: number;
  } | null>(null);
  const [bookkeepingCalculationResults, setBookkeepingCalculationResults] = useState<{
    inflation_adjustment: number;
    real_adjustment: number;
    discount_amount: number;
    final_amount: number;
    vat_amount: number;
    total_with_vat: number;
  } | null>(null);
  const [letterPreviewOpen, setLetterPreviewOpen] = useState(false);
  const [currentFeeId, setCurrentFeeId] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [autoSelectedLetters, setAutoSelectedLetters] = useState<LetterSelectionResult | null>(null);
  const [selectedPrimaryTemplate, setSelectedPrimaryTemplate] = useState<LetterTemplateType | null>(null);
  const [selectedSecondaryTemplate, setSelectedSecondaryTemplate] = useState<LetterTemplateType | null>(null);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
  const [isSavingAndPreview, setIsSavingAndPreview] = useState(false);
  const { toast } = useToast();

  /**
   * Calculate previous year fields based on amount and discount
   * Only call this when user manually inputs data, NOT when loading from database
   */
  const calculatePreviousYearFields = (amount: number, discount: number) => {
    if (!amount || amount === 0) {
      return {
        previous_year_amount_with_vat_before_discount: 0,
        previous_year_amount_after_discount: 0,
        previous_year_amount_with_vat: 0
      };
    }

    const baseWithVat = amount * 1.18; // Base + 18% VAT (before discount)
    const afterDiscount = amount * (1 - discount / 100);
    const withVat = afterDiscount * 1.18; // Final with VAT

    return {
      previous_year_amount_with_vat_before_discount: parseFloat(baseWithVat.toFixed(2)),
      previous_year_amount_after_discount: parseFloat(afterDiscount.toFixed(2)),
      previous_year_amount_with_vat: parseFloat(withVat.toFixed(2))
    };
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Load previous year data and client details when client or tax year changes
    const loadClientData = async () => {
      if (formData.client_id) {
        // Run sequentially to avoid race conditions
        await loadPreviousYearData(formData.client_id);
        await loadDraftCalculation(formData.client_id);
        await loadClientDetails(formData.client_id);
      } else {
        // Clear all client-related data when no client selected
        setSelectedClientDetails(null);
        setRelatedCompanies([]);
        setCurrentDraftId(null);

        // Reset previous year data
        setFormData(prev => ({
          ...prev,
          previous_year_amount: 0,
          previous_year_discount: 0,
          previous_year_amount_after_discount: 0,
          previous_year_amount_with_vat: 0,
          previous_year_amount_with_vat_before_discount: 0
        }));
      }
    };

    loadClientData();
  }, [formData.client_id, formData.year]); // Re-load when tax year changes

  useEffect(() => {
    // Auto-calculate when form data changes
    if (formData.base_amount > 0) {
      const results = calculateFeeAmounts();
      setCalculationResults(results);
    }
  }, [
    formData.base_amount,
    formData.inflation_rate,
    formData.real_adjustment,
    formData.discount_percentage,
    formData.apply_inflation_index,
    formData.index_manual_adjustment,
    formData.previous_year_amount_with_vat,
    // Bookkeeping dependencies for internal clients
    formData.bookkeeping_base_amount,
    formData.bookkeeping_inflation_rate,
    formData.bookkeeping_real_adjustment,
    formData.bookkeeping_discount_percentage,
    formData.bookkeeping_apply_inflation_index,
    selectedClientDetails?.internal_external
  ]);

  useEffect(() => {
    // Auto-calculate letter selection when calculation completes
    if (calculationResults && selectedClientDetails) {
      const autoSelection = selectLetterTemplate({
        clientType: selectedClientDetails.internal_external,
        isRetainer: selectedClientDetails.is_retainer,
        applyInflation: formData.apply_inflation_index,
        hasRealAdjustment: formData.real_adjustment > 0,
        bookkeepingApplyInflation: formData.bookkeeping_apply_inflation_index,
        bookkeepingHasRealAdjustment: formData.bookkeeping_real_adjustment > 0,
      });

      setAutoSelectedLetters(autoSelection);
      setSelectedPrimaryTemplate(autoSelection.primaryTemplate);
      setSelectedSecondaryTemplate(autoSelection.secondaryTemplate || null);
    }
  }, [calculationResults, selectedClientDetails, formData.apply_inflation_index, formData.real_adjustment, formData.bookkeeping_apply_inflation_index, formData.bookkeeping_real_adjustment]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load clients
      const clientsResponse = await clientService.list({ page: 1, pageSize: 1000 });
      if (clientsResponse.data) {
        setClients(clientsResponse.data.clients);
      }

      // Load recent fee calculations
      const feesResponse = await feeService.list({ page: 1, pageSize: 20 });
      if (feesResponse.data) {
        setFeeCalculations(feesResponse.data.fees || []);
      }
    } catch (error) {
      logger.error('Error loading data:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בטעינת הנתונים',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPreviousYearData = async (clientId: string) => {
    try {
      // Load previous year data (year - 1) for the selected tax year
      const response = await feeService.getLatestFeeByClient(clientId, formData.year - 1);
      if (response.data) {
        // Load previous year's data
        // Use final_amount (calculated result) if available, otherwise base_amount (manual entry)
        const baseAmount = response.data.final_amount || response.data.base_amount || 0;
        const discountPercent = response.data.previous_year_discount || 0;

        // Calculate missing fields for backward compatibility with old data
        // Old records (before migration) won't have these calculated fields
        const calculatedFields = calculatePreviousYearFields(baseAmount, discountPercent);

        setFormData(prev => ({
          ...prev,
          previous_year_amount: baseAmount,
          previous_year_discount: discountPercent,
          // Use database values if they exist (not null/undefined), otherwise use calculated values
          // Using ?? (nullish coalescing) instead of || to properly handle 0 values
          previous_year_amount_after_discount: response.data.previous_year_amount_after_discount ?? calculatedFields.previous_year_amount_after_discount,
          previous_year_amount_with_vat: response.data.previous_year_amount_with_vat ?? response.data.total_amount ?? calculatedFields.previous_year_amount_with_vat,
          previous_year_amount_with_vat_before_discount: response.data.previous_year_amount_with_vat_before_discount ?? calculatedFields.previous_year_amount_with_vat_before_discount,
          // Auto-populate base amount for current year calculation
          // This provides a starting point - user can modify if needed
          // If a draft exists, loadDraftCalculation will override this value
          base_amount: baseAmount,
          // Auto-populate bookkeeping base amount if exists (for internal clients)
          bookkeeping_base_amount: response.data.bookkeeping_calculation?.final_amount || 0
        }));
        setPreviousYearDataSaved(true); // Data exists in DB
        toast({
          title: 'נטענו נתוני שנה קודמת',
          description: 'נתונים משנה קודמת נטענו בהצלחה',
        });
      } else {
        // No previous data found - reset to empty
        setPreviousYearDataSaved(false);

        // Clear previous year fields when no data exists
        setFormData(prev => ({
          ...prev,
          previous_year_amount: 0,
          previous_year_discount: 0,
          previous_year_amount_after_discount: 0,
          previous_year_amount_with_vat: 0,
          previous_year_amount_with_vat_before_discount: 0
        }));
      }
    } catch (error) {
      logger.error('Error loading previous year data:', error);

      // Clear previous year fields on error to avoid showing stale data
      setFormData(prev => ({
        ...prev,
        previous_year_amount: 0,
        previous_year_discount: 0,
        previous_year_amount_after_discount: 0,
        previous_year_amount_with_vat: 0,
        previous_year_amount_with_vat_before_discount: 0
      }));
    }
  };

  const loadDraftCalculation = async (clientId: string) => {
    try {
      // First try to find draft (unsent calculation)
      let response = await feeService.getDraftCalculation(clientId, formData.year);

      // If no draft found, try to find any calculation (including sent/calculated)
      // This handles the case where user sent letters and then returns to the client
      if (!response.data) {
        response = await feeService.getLatestCalculationForYear(clientId, formData.year);
      }

      if (response.data) {
        const draft = response.data;
        setCurrentDraftId(draft.id);

        // Fill form with draft data (preserve previous_year_amount from loadPreviousYearData)
        setFormData(prev => ({
          ...prev,
          base_amount: draft.base_amount || prev.base_amount,
          inflation_rate: draft.inflation_rate || prev.inflation_rate,
          real_adjustment: draft.real_adjustment || 0,
          real_adjustment_reason: draft.real_adjustment_reason || '',
          discount_percentage: draft.discount_percentage || 0,
          apply_inflation_index: draft.apply_inflation_index ?? prev.apply_inflation_index,
          notes: draft.notes || '',
          // Keep previous year data from loadPreviousYearData
          previous_year_amount: prev.previous_year_amount,
          previous_year_discount: prev.previous_year_discount,
          previous_year_amount_with_vat: prev.previous_year_amount_with_vat,
          // Load bookkeeping data if exists (for internal clients)
          bookkeeping_base_amount: draft.bookkeeping_calculation?.base_amount || 0,
          bookkeeping_inflation_rate: draft.bookkeeping_calculation?.inflation_rate || 3.0,
          bookkeeping_real_adjustment: draft.bookkeeping_calculation?.real_adjustment || 0,
          bookkeeping_real_adjustment_reason: draft.bookkeeping_calculation?.real_adjustment_reason || '',
          bookkeeping_discount_percentage: draft.bookkeeping_calculation?.discount_percentage || 0,
          bookkeeping_apply_inflation_index: draft.bookkeeping_calculation?.apply_inflation_index ?? true,
        }));

        toast({
          title: 'נטען חישוב קודם',
          description: draft.status === 'draft' ? 'חישוב שטרם נשלח נטען מהמערכת' : 'חישוב קיים נטען מהמערכת',
        });
      } else {
        setCurrentDraftId(null);
      }
    } catch (error) {
      logger.error('Error loading draft calculation:', error);
    }
  };

  const loadClientDetails = async (clientId: string) => {
    try {
      // Load full client details with group
      const clientResponse = await clientService.getById(clientId);
      if (clientResponse.data) {
        setSelectedClientDetails(clientResponse.data);

        // If client has a group, load related companies
        if (clientResponse.data.group_id) {
          const relatedResponse = await clientService.getRelatedCompanies(clientResponse.data.group_id);
          if (relatedResponse.data) {
            // Filter out the current client from related companies
            const others = relatedResponse.data.filter(c => c.id !== clientId);
            setRelatedCompanies(others);
          }
        }
      }
    } catch (error) {
      logger.error('Error loading client details:', error);
    }
  };

  const handleSavePreviousYearData = async () => {
    if (!formData.client_id) {
      toast({
        title: 'שגיאה',
        description: 'נא לבחור לקוח',
        variant: 'destructive',
      });
      return;
    }

    setSavingPreviousData(true);
    try {
      // Save the current year data (which becomes "previous year" for next year's calculation)
      const saveData: CreateFeeCalculationDto = {
        client_id: formData.client_id,
        year: formData.year - 1, // Save as previous year (e.g., saving 2025 data for tax year 2026 calculation)
        base_amount: formData.previous_year_amount, // Use this amount as the base
        previous_year_discount: formData.previous_year_discount || 0,
        previous_year_amount_with_vat: formData.previous_year_amount_with_vat,
        previous_year_amount_with_vat_before_discount: formData.previous_year_amount_with_vat_before_discount, // NEW FIELD!
        inflation_rate: 0, // No inflation for historical data
        real_adjustment: 0,
        apply_inflation_index: false, // Don't apply inflation to historical data
        notes: 'נתוני שנה קודמת'
      };

      const response = await feeService.createFeeCalculation(saveData);
      
      if (response.error) {
        toast({
          title: 'שגיאה',
          description: response.error.message,
          variant: 'destructive',
        });
        return;
      }

      setPreviousYearDataSaved(true);

      // Reload previous year data to display it immediately
      await loadPreviousYearData(formData.client_id);

      toast({
        title: 'הצלחה',
        description: 'נתוני שנה קודמת נשמרו בהצלחה',
      });
    } catch (error) {
      logger.error('Error saving previous year data:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בשמירת הנתונים',
        variant: 'destructive',
      });
    } finally {
      setSavingPreviousData(false);
    }
  };

  /**
   * View previous calculation - skip to results tab with existing calculation
   */
  const viewPreviousCalculation = async () => {
    if (!formData.client_id) {
      toast({
        title: 'שגיאה',
        description: 'נא לבחור לקוח תחילה',
        variant: 'destructive'
      });
      return;
    }

    setIsLoadingPrevious(true);

    try {
      // 1. Load latest calculation (draft or sent)
      const response = await feeService.getLatestCalculationForYear(
        formData.client_id,
        formData.year
      );

      if (!response.data) {
        toast({
          title: 'לא נמצא חישוב',
          description: 'לא נמצא חישוב קיים עבור הלקוח בשנה זו',
          variant: 'destructive'
        });
        return;
      }

      const calc = response.data;

      // 2. Fill all form fields with existing calculation
      setFormData({
        ...formData,
        base_amount: calc.base_amount || 0,
        apply_inflation_index: calc.apply_inflation_index || false,
        inflation_rate: calc.inflation_rate || 3,
        real_adjustment: calc.real_adjustment || 0,
        real_adjustment_reason: calc.real_adjustment_reason || '',
        notes: calc.notes || '',
        previous_year_amount: calc.previous_year_data?.amount || 0,
        previous_year_discount: calc.previous_year_data?.discount || 0,
      });

      // 3. Calculate results
      const results = feeService.calculateFeeAmounts({
        base_amount: calc.base_amount || 0,
        apply_inflation_index: calc.apply_inflation_index || false,
        inflation_rate: calc.inflation_rate || 3,
        real_adjustment: calc.real_adjustment || 0,
        previous_year_amount_with_vat: calc.previous_year_data?.amount_with_vat || 0,
      });
      setCalculationResults(results);

      // 4. If internal client, calculate bookkeeping too
      if (selectedClientDetails?.client_type === 'internal' && calc.bookkeeping_calculation) {
        const bookkeepingResults = feeService.calculateFeeAmounts({
          base_amount: calc.bookkeeping_calculation.monthly_amount || 0,
          apply_inflation_index: calc.bookkeeping_calculation.apply_inflation_index || false,
          inflation_rate: calc.bookkeeping_calculation.inflation_rate || 3,
          real_adjustment: calc.bookkeeping_calculation.real_adjustment || 0,
          previous_year_amount_with_vat: 0,
        });
        setBookkeepingCalculationResults(bookkeepingResults);
      }

      // 5. Set current draft ID for editing
      setCurrentDraftId(calc.id);

      // 6. Jump to results tab
      setActiveTab('results');

      toast({
        title: 'הצלחה!',
        description: 'החישוב הקודם נטען בהצלחה',
      });
    } catch (error) {
      console.error('Error loading previous calculation:', error);
      toast({
        title: 'שגיאה',
        description: 'לא הצלחנו לטעון את החישוב הקודם',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingPrevious(false);
    }
  };

  const calculateFeeAmounts = () => {
    const inflationRate = formData.apply_inflation_index ? (formData.inflation_rate || 3.0) : 0;
    const realAdjustment = formData.real_adjustment || 0;
    const discountPercentage = formData.discount_percentage || 0;

    // Step 1a: Apply automatic inflation adjustment (only if checkbox is checked)
    const inflationAdjustmentAuto = formData.base_amount * (inflationRate / 100);

    // Step 1b: Add manual index adjustment (only if inflation is enabled)
    const indexManualAdjustment = formData.apply_inflation_index ? (formData.index_manual_adjustment || 0) : 0;

    // Step 1c: Total inflation adjustment (auto + manual)
    const inflationAdjustment = inflationAdjustmentAuto + indexManualAdjustment;

    // Step 2: Add real adjustment
    const adjustedAmount = formData.base_amount + inflationAdjustment + realAdjustment;

    // Step 3: Apply discount
    const discountAmount = adjustedAmount * (discountPercentage / 100);
    const finalAmount = adjustedAmount - discountAmount;

    // Step 4: Calculate VAT (18% in Israel)
    const vatAmount = finalAmount * 0.18;
    const totalWithVat = finalAmount + vatAmount;

    // Calculate year-over-year change
    const yearOverYearChange = formData.previous_year_amount_with_vat > 0
      ? ((totalWithVat - formData.previous_year_amount_with_vat) / formData.previous_year_amount_with_vat * 100)
      : 0;

    // Calculate bookkeeping amounts (for internal clients)
    let bookkeepingResults = null;
    if (selectedClientDetails?.internal_external === 'internal' && formData.bookkeeping_base_amount > 0) {
      const bkInflationRate = formData.bookkeeping_apply_inflation_index ? (formData.bookkeeping_inflation_rate || 3.0) : 0;
      const bkRealAdjustment = formData.bookkeeping_real_adjustment || 0;
      const bkDiscountPercentage = formData.bookkeeping_discount_percentage || 0;

      const bkInflationAdjustment = formData.bookkeeping_base_amount * (bkInflationRate / 100);
      const bkAdjustedAmount = formData.bookkeeping_base_amount + bkInflationAdjustment + bkRealAdjustment;
      const bkDiscountAmount = bkAdjustedAmount * (bkDiscountPercentage / 100);
      const bkFinalAmount = bkAdjustedAmount - bkDiscountAmount;
      const bkVatAmount = bkFinalAmount * 0.18;
      const bkTotalWithVat = bkFinalAmount + bkVatAmount;

      bookkeepingResults = {
        inflation_adjustment: bkInflationAdjustment,
        real_adjustment: bkRealAdjustment,
        discount_amount: bkDiscountAmount,
        final_amount: bkFinalAmount,
        vat_amount: bkVatAmount,
        total_with_vat: bkTotalWithVat,
      };
    }

    // Update bookkeeping state
    setBookkeepingCalculationResults(bookkeepingResults);

    return {
      inflation_adjustment: inflationAdjustment,
      inflation_adjustment_auto: inflationAdjustmentAuto,
      index_manual_adjustment: indexManualAdjustment,
      real_adjustment: realAdjustment,
      adjusted_amount: adjustedAmount,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      vat_amount: vatAmount,
      total_with_vat: totalWithVat,
      year_over_year_change: yearOverYearChange
    };
  };

  const handleSaveCalculationOnly = async () => {
    if (!formData.client_id || !formData.base_amount) {
      toast({
        title: 'שגיאה',
        description: 'נא למלא את כל השדות החובה',
        variant: 'destructive',
      });
      return;
    }

    try {
      const createData: CreateFeeCalculationDto = {
        client_id: formData.client_id,
        year: formData.year,
        previous_year_amount: formData.previous_year_amount,
        previous_year_discount: formData.previous_year_discount,
        base_amount: formData.base_amount,
        inflation_rate: formData.inflation_rate,
        real_adjustment: formData.real_adjustment,
        real_adjustment_reason: formData.real_adjustment_reason,
        discount_percentage: formData.discount_percentage,
        apply_inflation_index: formData.apply_inflation_index,
        notes: formData.notes,
        // Bookkeeping fields (for internal clients only)
        bookkeeping_base_amount: formData.bookkeeping_base_amount,
        bookkeeping_inflation_rate: formData.bookkeeping_inflation_rate,
        bookkeeping_real_adjustment: formData.bookkeeping_real_adjustment,
        bookkeeping_real_adjustment_reason: formData.bookkeeping_real_adjustment_reason,
        bookkeeping_discount_percentage: formData.bookkeeping_discount_percentage,
        bookkeeping_apply_inflation_index: formData.bookkeeping_apply_inflation_index
      };

      // Check if updating existing draft or creating new
      if (currentDraftId) {
        // Update existing draft
        const response = await feeService.updateFeeCalculation(
          currentDraftId,
          createData
        );

        if (response.error) {
          toast({
            title: 'שגיאה',
            description: response.error.message,
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'הצלחה',
          description: 'החישוב נשמר בהצלחה. ניתן לשלוח מכתב מאוחר יותר מדף מעקב שכר טרחה.',
        });
      } else {
        // Create new calculation (no existing draft)
        const response = await feeService.createFeeCalculation(createData);

        if (response.error) {
          toast({
            title: 'שגיאה',
            description: response.error.message,
            variant: 'destructive',
          });
          return;
        }

        // Track the new draft
        if (response.data) {
          setCurrentDraftId(response.data.id);
          toast({
            title: 'הצלחה',
            description: 'החישוב נשמר בהצלחה. ניתן לשלוח מכתב מאוחר יותר מדף מעקב שכר טרחה.',
          });
        }
      }

      // Reset form after successful save (user can continue to next client)
      resetForm();
      loadInitialData();
    } catch (error) {
      logger.error('Error saving calculation:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בשמירת החישוב',
        variant: 'destructive',
      });
    }
  };

  const handleSaveCalculation = async () => {
    if (!formData.client_id || !formData.base_amount) {
      toast({
        title: 'שגיאה',
        description: 'נא למלא את כל השדות החובה',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingAndPreview(true);
    try {
      const createData: CreateFeeCalculationDto = {
        client_id: formData.client_id,
        year: formData.year,
        previous_year_amount: formData.previous_year_amount,
        previous_year_discount: formData.previous_year_discount,
        base_amount: formData.base_amount,
        inflation_rate: formData.inflation_rate,
        real_adjustment: formData.real_adjustment,
        real_adjustment_reason: formData.real_adjustment_reason,
        discount_percentage: formData.discount_percentage,
        apply_inflation_index: formData.apply_inflation_index,
        notes: formData.notes,
        // Bookkeeping fields (for internal clients only)
        bookkeeping_base_amount: formData.bookkeeping_base_amount,
        bookkeeping_inflation_rate: formData.bookkeeping_inflation_rate,
        bookkeeping_real_adjustment: formData.bookkeeping_real_adjustment,
        bookkeeping_real_adjustment_reason: formData.bookkeeping_real_adjustment_reason,
        bookkeeping_discount_percentage: formData.bookkeeping_discount_percentage,
        bookkeeping_apply_inflation_index: formData.bookkeeping_apply_inflation_index
      };

      // Check if updating existing draft or creating new
      if (currentDraftId) {
        // Update existing draft instead of creating new one
        const response = await feeService.updateFeeCalculation(
          currentDraftId,
          createData
        );

        if (response.error) {
          toast({
            title: 'שגיאה',
            description: response.error.message,
            variant: 'destructive',
          });
          return;
        }

        // Open letter preview dialog
        if (response.data) {
          setCurrentFeeId(response.data.id);
          setLetterPreviewOpen(true);
        }
      } else {
        // Create new calculation (no existing draft)
        const response = await feeService.createFeeCalculation(createData);

        if (response.error) {
          toast({
            title: 'שגיאה',
            description: response.error.message,
            variant: 'destructive',
          });
          return;
        }

        // Open letter preview dialog and track the new draft
        if (response.data) {
          setCurrentFeeId(response.data.id);
          setCurrentDraftId(response.data.id);
          setLetterPreviewOpen(true);
        }
      }
    } catch (error) {
      logger.error('Error saving calculation:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בשמירת החישוב',
        variant: 'destructive',
      });
    } finally {
      setIsSavingAndPreview(false);
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      year: new Date().getFullYear() + 1, // Default: next year (tax year being calculated)
      isNewClient: false,
      previous_year_amount: 0,
      previous_year_discount: 0,
      previous_year_amount_after_discount: 0,
      previous_year_amount_with_vat: 0,
      previous_year_amount_with_vat_before_discount: 0,
      base_amount: 0,
      inflation_rate: 3.0,
      real_adjustment: 0,
      real_adjustment_reason: '',
      discount_percentage: 0,
      apply_inflation_index: true,
      notes: '',
      bookkeeping_base_amount: 0,
      bookkeeping_inflation_rate: 3.0,
      bookkeeping_real_adjustment: 0,
      bookkeeping_real_adjustment_reason: '',
      bookkeeping_discount_percentage: 0,
      bookkeeping_apply_inflation_index: true
    });
    setCalculationResults(null);
    setActiveTab('previous');
    setPreviousYearDataSaved(false);
  };

  const selectedClient = clients.find(c => c.id === formData.client_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-gray-500">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 rtl:text-right ltr:text-left">חישוב שכר טרחה לשנת מס {formData.year}</h1>
          <p className="text-gray-500 mt-1 rtl:text-right ltr:text-left">חישוב שכר טרחה שנתי עם התאמות מדד ותוספות</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={resetForm}>
            <Plus className="h-4 w-4 ml-2" />
            חישוב חדש
          </Button>
          {calculationResults && (
            <Button onClick={handleSaveCalculation}>
              <Calculator className="h-4 w-4 ml-2" />
              שמור חישוב
            </Button>
          )}
        </div>
      </div>

      {/* Main Calculator Card */}
      <Card className="col-span-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 rtl:text-right ltr:text-left">
              <Calculator className="h-5 w-5" />
              מחשבון שכר טרחה
            </CardTitle>
            {selectedClient && (
              <Badge variant="outline" className="text-sm">
                {selectedClient.company_name}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Tab Navigation */}
          <div className="flex mb-6 border-b">
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === 'previous'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('previous')}
            >
              נתוני שנת {formData.year - 1} (שנה קודמת)
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === 'current'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('current')}
            >
              חישוב לשנת מס {formData.year}
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === 'results'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('results')}
              disabled={!calculationResults}
            >
              תוצאות החישוב
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'previous' && (
            <div className="space-y-6">
              <div className="rtl:text-right ltr:text-left">
                <h3 className="text-lg font-semibold mb-2">נתוני שנת {formData.year - 1} (שנה קודמת)</h3>
                <p className="text-sm text-gray-600 mb-4 flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  הזן את הנתונים ששולמו עבור שנת {formData.year - 1}. נתונים אלו ישמשו בסיס לחישוב שכר הטרחה לשנת מס {formData.year}.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {/* Tax Year Selection - First Field */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <Label htmlFor="tax_year" className="text-base font-semibold text-blue-900">
                      שנת מס לחישוב *
                    </Label>
                    <Select
                      value={formData.year.toString()}
                      onValueChange={async (value) => {
                        const newYear = parseInt(value);
                        setFormData({ ...formData, year: newYear });

                        // Reload previous year data if client is selected
                        if (formData.client_id) {
                          await loadPreviousYearData(formData.client_id);
                        } else {
                          setPreviousYearDataSaved(false);
                        }
                      }}
                    >
                      <SelectTrigger className="mt-2 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026, 2027].map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-blue-700 mt-2">
                      בחר את שנת המס עבורה מבוצע החישוב
                    </p>
                  </div>

                  {/* File uploads removed - all file management done in File Manager (/files) */}

                  <div>
                    <Label htmlFor="client">בחירת לקוח *</Label>
                    <Combobox
                      options={clients.map((client) => ({
                        value: client.id,
                        label: `${client.company_name} - ${client.tax_id}`,
                      }))}
                      value={formData.client_id}
                      onValueChange={(value) => {
                        setFormData({ ...formData, client_id: value });
                        setPreviousYearDataSaved(false); // Reset saved state when changing client
                      }}
                      placeholder="בחר לקוח"
                      searchPlaceholder="חיפוש לפי שם או ח.פ..."
                      emptyText="לא נמצא לקוח"
                    />
                  </div>

                  {/* Client Info Card */}
                  {selectedClientDetails && (
                    <ClientInfoCard
                      client={selectedClientDetails}
                      relatedCompanies={relatedCompanies}
                    />
                  )}

                  {/* New Client Checkbox */}
                  {formData.client_id && (
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Checkbox
                          id="isNewClient"
                          checked={formData.isNewClient}
                          onCheckedChange={(checked) => {
                            setFormData({ ...formData, isNewClient: checked as boolean });
                            if (checked) {
                              // Set previous year to 0 for new clients
                              setFormData(prev => ({
                                ...prev,
                                isNewClient: true,
                                previous_year_amount: 0,
                                previous_year_discount: 0,
                                previous_year_amount_after_discount: 0,
                                previous_year_amount_with_vat: 0
                              }));
                              setPreviousYearDataSaved(true); // Allow progression
                            } else {
                              setPreviousYearDataSaved(false); // Require data entry
                            }
                          }}
                        />
                        <Label htmlFor="isNewClient" className="text-base font-semibold text-blue-900 cursor-pointer">
                          לקוח חדש (אין נתוני שנה קודמת)
                        </Label>
                      </div>
                      <p className="text-xs text-blue-700 mt-2 rtl:text-right ltr:text-left">
                        סמן אם זהו לקוח חדש ללא נתוני שנה קודמת. המערכת תשתמש ב-0 כסכום בסיס.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Previous Year Data - Card-Based Layout */}
                  <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50 space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-2 pb-3 border-b border-gray-300">
                      <span className="text-lg">📊</span>
                      <h3 className="text-lg font-semibold text-gray-800">נתוני שנה קודמת</h3>
                    </div>

                    {/* Row 1: Base amounts (before and after VAT) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Card 1: Base Amount BEFORE VAT (input) */}
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <Label htmlFor="previous_amount" className="text-sm font-medium rtl:text-right ltr:text-left">
                              סכום בסיס (לפני הנחה, לפני מע"מ)
                            </Label>
                            <Coins className="h-6 w-6 text-blue-500" />
                          </div>
                          <Input
                            id="previous_amount"
                            type="number"
                            value={formData.previous_year_amount ?? ''}
                            onChange={(e) => {
                              const newAmount = parseFloat(e.target.value) || 0;
                              const calculated = calculatePreviousYearFields(newAmount, formData.previous_year_discount);
                              setFormData({
                                ...formData,
                                previous_year_amount: newAmount,
                                ...calculated
                              });
                            }}
                            disabled={formData.isNewClient}
                            className={`text-lg ${formData.isNewClient ? 'opacity-50 bg-gray-100' : ''}`}
                            placeholder="0"
                          />
                          <p className="text-xs text-gray-500 mt-2 rtl:text-right ltr:text-left">
                            זרימה: לפני מע"מ
                          </p>
                        </CardContent>
                      </Card>

                      {/* Card 2: Base Amount AFTER VAT (auto-calculated) - NEW! */}
                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="rtl:text-right ltr:text-left">
                              <p className="text-sm font-medium text-gray-700">סכום בסיס (לפני הנחה, כולל מע"מ)</p>
                            </div>
                            <FileText className="h-6 w-6 text-green-500" />
                          </div>
                          <div className="text-2xl font-bold text-green-700">
                            {formatILS(formData.previous_year_amount_with_vat_before_discount || 0)}
                          </div>
                          <p className="text-xs text-gray-600 mt-2 rtl:text-right ltr:text-left">
                            חושב אוטומטית: +18% מע"מ
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Row 2: Discount */}
                    <div className="grid grid-cols-1 gap-4">
                      {/* Card 3: Discount Percentage (input) */}
                      <Card className="bg-purple-50 border-purple-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <Label htmlFor="previous_discount" className="text-sm font-medium rtl:text-right ltr:text-left">
                              הנחה (%)
                            </Label>
                            <Percent className="h-6 w-6 text-purple-500" />
                          </div>
                          <div className="relative">
                            <Input
                              id="previous_discount"
                              type="number"
                              value={formData.previous_year_discount ?? ''}
                              onChange={(e) => {
                                const newDiscount = parseFloat(e.target.value) || 0;
                                const calculated = calculatePreviousYearFields(formData.previous_year_amount, newDiscount);
                                setFormData({
                                  ...formData,
                                  previous_year_discount: newDiscount,
                                  ...calculated
                                });
                              }}
                              min="0"
                              max="100"
                              step="0.1"
                              disabled={formData.isNewClient}
                              className={`text-lg ${formData.isNewClient ? 'opacity-50 bg-gray-100' : ''} pr-8`}
                              placeholder="0"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none font-semibold">
                              %
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Row 3: Final amounts (after discount, with/without VAT) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Card 4: After Discount BEFORE VAT (auto-calculated) */}
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="rtl:text-right ltr:text-left">
                              <p className="text-sm text-gray-600 font-medium">אחרי הנחה (לפני מע"מ)</p>
                              <p className="text-2xl font-bold text-blue-700 mt-1">
                                {formatILS(formData.previous_year_amount_after_discount || 0)}
                              </p>
                            </div>
                            <Calculator className="h-8 w-8 text-blue-500" />
                          </div>
                          <p className="text-xs text-gray-600 mt-2 rtl:text-right ltr:text-left">
                            זרימה: לפני מע"מ
                          </p>
                        </CardContent>
                      </Card>

                      {/* Card 5: Total WITH VAT (auto-calculated - FINAL) */}
                      <Card className="bg-primary/10 border-primary">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="rtl:text-right ltr:text-left">
                              <p className="text-sm text-gray-600 font-medium">סך הכל כולל מע"מ</p>
                              <p className="text-2xl font-bold text-primary mt-1">
                                {formatILS(formData.previous_year_amount_with_vat || 0)}
                              </p>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-primary" />
                          </div>
                          <p className="text-xs text-gray-600 mt-2 rtl:text-right ltr:text-left">
                            סכום סופי - אחרי הנחה כולל מע"מ
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Bookkeeping Card Widget - Outside the previous year container */}
                  {formData.client_id && (
                    <div className="space-y-2 border-2 border-blue-200 rounded-lg p-4 bg-blue-50">
                      <Label className="text-sm font-medium text-blue-900">כרטיס הנהלת חשבונות</Label>
                      <div className="border rounded-lg p-3 bg-white">
                        <FileDisplayWidget
                          clientId={formData.client_id}
                          category="bookkeeping_card"
                          variant="compact"
                        />
                      </div>
                      <p className="text-xs text-blue-600">
                        קבצים מתוך מנהל הקבצים בקטגוריה "כרטיס הנהח"ש"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-center gap-4 items-center">
                <Button
                  onClick={() => {
                    if (previousYearDataSaved) {
                      // Show warning for overwrite
                      setShowOverwriteWarning(true);
                    } else {
                      // First save - no warning
                      handleSavePreviousYearData();
                    }
                  }}
                  disabled={!formData.client_id || savingPreviousData || formData.isNewClient}
                  variant={previousYearDataSaved ? "outline" : "default"}
                >
                  {savingPreviousData ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                      שומר...
                    </>
                  ) : previousYearDataSaved ? (
                    <>
                      <Edit2 className="h-4 w-4 ml-2" />
                      עדכן נתונים
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 ml-2" />
                      שמור נתוני שנה קודמת
                    </>
                  )}
                </Button>

                {/* View Previous Calculation Button - only show if client selected and has calculation */}
                {formData.client_id && currentDraftId && (
                  <Button
                    variant="default"
                    onClick={viewPreviousCalculation}
                    disabled={isLoadingPrevious}
                  >
                    {isLoadingPrevious ? (
                      <>
                        <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        טוען חישוב...
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 ml-2" />
                        צפה בחישוב קודם
                      </>
                    )}
                  </Button>
                )}

                <Button
                  onClick={() => setActiveTab('current')}
                  disabled={!previousYearDataSaved && !formData.isNewClient}
                  title={!previousYearDataSaved && !formData.isNewClient ? "יש לשמור את נתוני השנה הקודמת לפני המשך או לסמן 'לקוח חדש'" : ""}
                >
                  המשך לחישוב נוכחי
                  <ChevronLeft className="h-4 w-4 mr-2" />
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'current' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4 rtl:text-right ltr:text-left">חישוב שכר טרחה לשנת מס {formData.year}</h3>

              {/* Previous Year Data Indicator */}
              {previousYearDataSaved && formData.previous_year_amount_with_vat > 0 && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between rtl:flex-row-reverse">
                      <div className="flex items-center gap-3 rtl:flex-row-reverse">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div className="rtl:text-right ltr:text-left">
                          <p className="font-semibold text-green-900">
                            נתוני שנת {formData.year - 1} נשמרו בהצלחה
                          </p>
                          <p className="text-sm text-green-700">
                            סכום כולל מע"מ: {formatILS(formData.previous_year_amount_with_vat)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab('previous')}
                        className="rtl:ml-0 rtl:mr-auto ltr:mr-0 ltr:ml-auto"
                      >
                        <Edit2 className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                        ערוך
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="base_amount">סכום בסיס לפני הנחה ולפני מע״מ *</Label>
                    <Input
                      id="base_amount"
                      type="number"
                      value={formData.base_amount}
                      onChange={(e) => setFormData({ ...formData, base_amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="inflation_rate">אחוז מדד</Label>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="apply_inflation"
                          checked={formData.apply_inflation_index}
                          onCheckedChange={(checked) => 
                            setFormData({ ...formData, apply_inflation_index: checked as boolean })
                          }
                        />
                        <Label htmlFor="apply_inflation" className="text-sm font-normal cursor-pointer">
                          החל מדד
                        </Label>
                      </div>
                    </div>
                    <Input
                      id="inflation_rate"
                      type="number"
                      value={formData.inflation_rate}
                      onChange={(e) => setFormData({ ...formData, inflation_rate: parseFloat(e.target.value) || 3.0 })}
                      step="0.1"
                      placeholder="3.0"
                      disabled={!formData.apply_inflation_index}
                      className={!formData.apply_inflation_index ? 'opacity-50' : ''}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {formData.apply_inflation_index ? `מדד של ${formData.inflation_rate}% יוחל` : 'מדד לא יוחל'}
                    </p>
                  </div>

                  {/* NEW FIELD: Manual Index Adjustment */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="index_manual_adjustment">התאמת מדד</Label>
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <Checkbox
                          id="index_adjustment_negative"
                          checked={formData.index_manual_adjustment < 0}
                          onCheckedChange={(checked) => {
                            const absValue = Math.abs(formData.index_manual_adjustment);
                            setFormData({
                              ...formData,
                              index_manual_adjustment: checked ? -absValue : absValue
                            });
                          }}
                          disabled={!formData.apply_inflation_index}
                        />
                        <Label htmlFor="index_adjustment_negative" className="text-sm font-normal cursor-pointer">
                          ערך שלילי
                        </Label>
                      </div>
                    </div>
                    <Input
                      id="index_manual_adjustment"
                      type="number"
                      value={Math.abs(formData.index_manual_adjustment) || 0}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        const isNegative = formData.index_manual_adjustment < 0;
                        setFormData({
                          ...formData,
                          index_manual_adjustment: isNegative ? -value : value
                        });
                      }}
                      step="100"
                      placeholder="0"
                      min="0"
                      disabled={!formData.apply_inflation_index}
                      className={!formData.apply_inflation_index ? 'opacity-50' : ''}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      סכום בשקלים להתאמה
                    </p>
                  </div>

                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="real_adjustment">תוספת ריאלית</Label>
                    <Input
                      id="real_adjustment"
                      type="number"
                      value={formData.real_adjustment}
                      onChange={(e) => setFormData({ ...formData, real_adjustment: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="adjustment_reason">סיבת התוספת הריאלית</Label>
                    <Textarea
                      id="adjustment_reason"
                      value={formData.real_adjustment_reason}
                      onChange={(e) => setFormData({ ...formData, real_adjustment_reason: e.target.value })}
                      placeholder="תיאור הסיבה לתוספת..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">הערות</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="הערות נוספות..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Bookkeeping Section (Internal Clients Only) */}
              {selectedClientDetails?.internal_external === 'internal' && (
                <div className="mt-8 pt-8 border-t-2 border-gray-200">
                  <div className="mb-4 rtl:text-right ltr:text-left">
                    <h4 className="text-lg font-semibold text-primary flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      חישוב הנהלת חשבונות (מכתב F)
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      חישוב נפרד עבור שכר טרחה הנהלת חשבונות - 12 המחאות
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="bookkeeping_base_amount">סכום חודשי הנהלת חשבונות (יוכפל ב-12) *</Label>
                        <Input
                          id="bookkeeping_base_amount"
                          type="number"
                          value={formData.bookkeeping_base_amount}
                          onChange={(e) => setFormData({ ...formData, bookkeeping_base_amount: parseFloat(e.target.value) || 0 })}
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="bookkeeping_inflation_rate">אחוז מדד הנהלת חשבונות</Label>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="bookkeeping_apply_inflation"
                              checked={formData.bookkeeping_apply_inflation_index}
                              onCheckedChange={(checked) =>
                                setFormData({ ...formData, bookkeeping_apply_inflation_index: checked as boolean })
                              }
                            />
                            <Label htmlFor="bookkeeping_apply_inflation" className="text-sm font-normal cursor-pointer">
                              החל מדד
                            </Label>
                          </div>
                        </div>
                        <Input
                          id="bookkeeping_inflation_rate"
                          type="number"
                          value={formData.bookkeeping_inflation_rate}
                          onChange={(e) => setFormData({ ...formData, bookkeeping_inflation_rate: parseFloat(e.target.value) || 3.0 })}
                          step="0.1"
                          placeholder="3.0"
                          disabled={!formData.bookkeeping_apply_inflation_index}
                          className={!formData.bookkeeping_apply_inflation_index ? 'opacity-50' : ''}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="bookkeeping_real_adjustment">תוספת ריאלית הנהלת חשבונות</Label>
                        <Input
                          id="bookkeeping_real_adjustment"
                          type="number"
                          value={formData.bookkeeping_real_adjustment}
                          onChange={(e) => setFormData({ ...formData, bookkeeping_real_adjustment: parseFloat(e.target.value) || 0 })}
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <Label htmlFor="bookkeeping_adjustment_reason">סיבת התוספת הריאלית (הנהלת חשבונות)</Label>
                        <Textarea
                          id="bookkeeping_adjustment_reason"
                          value={formData.bookkeeping_real_adjustment_reason}
                          onChange={(e) => setFormData({ ...formData, bookkeeping_real_adjustment_reason: e.target.value })}
                          placeholder="תיאור הסיבה לתוספת..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveTab('previous')}>
                  <ChevronRight className="h-4 w-4 ml-2" />
                  חזור לנתוני שנה קודמת
                </Button>
                <Button 
                  onClick={() => setActiveTab('results')} 
                  disabled={!calculationResults}
                >
                  צפה בתוצאות
                  <ChevronLeft className="h-4 w-4 mr-2" />
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'results' && calculationResults && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">תוצאות החישוב</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">סכום בסיס לפני הנחה ולפני מע״מ</p>
                        <p className="text-lg font-semibold">{formatILS(formData.base_amount)}</p>
                      </div>
                      <Coins className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">
                          התאמת מדד {formData.apply_inflation_index ? `(${formData.inflation_rate}%)` : '(לא מוחל)'}
                        </p>
                        <p className="text-lg font-semibold text-green-600">
                          {formData.apply_inflation_index ? `+${formatILS(calculationResults.inflation_adjustment_auto)}` : '₪0'}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* NEW CARD: Manual Index Adjustment - shown when inflation is applied */}
                {formData.apply_inflation_index && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">התאמת מדד ידנית</p>
                          <p className={`text-lg font-semibold ${
                            formData.index_manual_adjustment >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formData.index_manual_adjustment >= 0 ? '+' : ''}
                            {formatILS(formData.index_manual_adjustment)}
                          </p>
                        </div>
                        <TrendingUp className={`h-8 w-8 ${
                          formData.index_manual_adjustment >= 0 ? 'text-green-500' : 'text-red-500'
                        }`} />
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">תוספת ריאלית</p>
                        <p className="text-lg font-semibold text-green-600">
                          +{formatILS(calculationResults.real_adjustment)}
                        </p>
                      </div>
                      <Plus className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">מע"מ (18%)</p>
                        <p className="text-lg font-semibold">{formatILS(calculationResults.vat_amount)}</p>
                      </div>
                      <FileText className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2 lg:col-span-1">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">סך הכל כולל מע"מ</p>
                        <p className="text-2xl font-bold text-primary">
                          {formatILS(calculationResults.total_with_vat)}
                        </p>
                      </div>
                      <Calculator className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>

                {/* NEW CARD: Required Amount Before Discount and VAT */}
                <Card className="md:col-span-6 bg-green-50 border-2 border-green-300">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <p className="text-lg font-semibold text-green-800 mb-2">
                        הסכום הנדרש לפני הנחה ולפני מע"מ לשנת המס {formData.year} הוא:
                      </p>
                      <p className="text-3xl font-bold text-green-700">
                        {formatILS(calculationResults.adjusted_amount)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">פירוט החישוב:</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>סכום בסיס לפני הנחה ולפני מע״מ:</span>
                    <span>{formatILS(formData.base_amount)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>+ התאמת מדד {formData.apply_inflation_index ? `(${formData.inflation_rate}%)` : '(לא מוחל)'}:</span>
                    <span>{formData.apply_inflation_index ? `+${formatILS(calculationResults.inflation_adjustment_auto)}` : '₪0'}</span>
                  </div>
                  {/* NEW LINE: Manual Index Adjustment - only if not zero */}
                  {formData.apply_inflation_index && formData.index_manual_adjustment !== 0 && (
                    <div className={`flex justify-between ${formData.index_manual_adjustment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <span>+ התאמת מדד ידנית:</span>
                      <span>{formData.index_manual_adjustment >= 0 ? '+' : ''}{formatILS(formData.index_manual_adjustment)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-green-600">
                    <span>+ תוספת ריאלית:</span>
                    <span>+{formatILS(calculationResults.real_adjustment)}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>סך הכל לפני מע"מ:</span>
                    <span>{formatILS(calculationResults.final_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>+ מע"מ (18%):</span>
                    <span>+{formatILS(calculationResults.vat_amount)}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-bold text-lg">
                    <span>סך הכל כולל מע"מ:</span>
                    <span>{formatILS(calculationResults.total_with_vat)}</span>
                  </div>
                </div>
              </div>

              {/* Bookkeeping Results - Internal Clients Only */}
              {selectedClientDetails?.internal_external === 'internal' && bookkeepingCalculationResults && (
                <div className="mt-8 pt-8 border-t-2 border-gray-200">
                  <h4 className="text-lg font-semibold text-primary mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    תוצאות חישוב הנהלת חשבונות (מכתב F)
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-500">סכום בסיס הנהלת חשבונות</p>
                            <p className="text-lg font-semibold">{formatILS(formData.bookkeeping_base_amount)}</p>
                          </div>
                          <Coins className="h-8 w-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-500">
                              התאמת מדד {formData.bookkeeping_apply_inflation_index ? `(${formData.bookkeeping_inflation_rate}%)` : '(לא מוחל)'}
                            </p>
                            <p className="text-lg font-semibold text-green-600">
                              {formData.bookkeeping_apply_inflation_index ? `+${formatILS(bookkeepingCalculationResults.inflation_adjustment)}` : '₪0'}
                            </p>
                          </div>
                          <TrendingUp className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-500">תוספת ריאלית</p>
                            <p className="text-lg font-semibold text-green-600">
                              +{formatILS(bookkeepingCalculationResults.real_adjustment)}
                            </p>
                          </div>
                          <Plus className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-500">סך הכל לפני מע"מ</p>
                            <p className="text-lg font-semibold">{formatILS(bookkeepingCalculationResults.final_amount)}</p>
                          </div>
                          <Calculator className="h-8 w-8 text-orange-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-500">מע"מ (18%)</p>
                            <p className="text-lg font-semibold">{formatILS(bookkeepingCalculationResults.vat_amount)}</p>
                          </div>
                          <FileText className="h-8 w-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="lg:col-span-1">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-500">סך הכל כולל מע"מ</p>
                            <p className="text-2xl font-bold text-primary">
                              {formatILS(bookkeepingCalculationResults.total_with_vat)}
                            </p>
                          </div>
                          <Calculator className="h-8 w-8 text-primary" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg mt-4">
                    <h5 className="font-semibold mb-2 text-blue-900">פירוט חישוב הנהלת חשבונות:</h5>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>סכום בסיס:</span>
                        <span>{formatILS(formData.bookkeeping_base_amount)}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>+ התאמת מדד {formData.bookkeeping_apply_inflation_index ? `(${formData.bookkeeping_inflation_rate}%)` : '(לא מוחל)'}:</span>
                        <span>{formData.bookkeeping_apply_inflation_index ? `+${formatILS(bookkeepingCalculationResults.inflation_adjustment)}` : '₪0'}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>+ תוספת ריאלית:</span>
                        <span>+{formatILS(bookkeepingCalculationResults.real_adjustment)}</span>
                      </div>
                      <hr className="my-2" />
                      <div className="flex justify-between font-semibold">
                        <span>סך הכל לפני מע"מ:</span>
                        <span>{formatILS(bookkeepingCalculationResults.final_amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>+ מע"מ (18%):</span>
                        <span>+{formatILS(bookkeepingCalculationResults.vat_amount)}</span>
                      </div>
                      <hr className="my-2" />
                      <div className="flex justify-between font-bold text-lg">
                        <span>סך הכל כולל מע"מ:</span>
                        <span>{formatILS(bookkeepingCalculationResults.total_with_vat)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Letter Selection */}
              {autoSelectedLetters && (
                <div className="mb-6">
                  {autoSelectedLetters.secondaryTemplate ? (
                    // Internal client - 2 letters
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                        <Label className="text-base font-semibold mb-2 block text-right">
                          מכתב ראשי - ראיית חשבון
                        </Label>
                        <Select
                          value={selectedPrimaryTemplate || autoSelectedLetters.primaryTemplate}
                          onValueChange={(value) => setSelectedPrimaryTemplate(value as LetterTemplateType)}
                        >
                          <SelectTrigger className="text-right">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TEMPLATE_OPTIONS
                              .filter(opt => opt.value.startsWith('internal_audit'))
                              .map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-purple-700 mt-2 text-right">
                          ברירת מחדל: <strong>{TEMPLATE_OPTIONS.find(t => t.value === autoSelectedLetters.primaryTemplate)?.label}</strong>
                        </p>
                      </div>

                      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                        <Label className="text-base font-semibold mb-2 block text-right">
                          מכתב שני - הנהלת חשבונות
                        </Label>
                        <Select
                          value={selectedSecondaryTemplate || autoSelectedLetters.secondaryTemplate}
                          onValueChange={(value) => setSelectedSecondaryTemplate(value as LetterTemplateType)}
                        >
                          <SelectTrigger className="text-right">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TEMPLATE_OPTIONS
                              .filter(opt => opt.value.startsWith('internal_bookkeeping'))
                              .map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-green-700 mt-2 text-right">
                          ברירת מחדל: <strong>{TEMPLATE_OPTIONS.find(t => t.value === autoSelectedLetters.secondaryTemplate)?.label}</strong>
                        </p>
                      </div>
                    </div>
                  ) : (
                    // External or retainer client - 1 letter
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <Label className="text-base font-semibold mb-2 block text-right">
                        בחירת מכתב
                      </Label>
                      <Select
                        value={selectedPrimaryTemplate || autoSelectedLetters.primaryTemplate}
                        onValueChange={(value) => setSelectedPrimaryTemplate(value as LetterTemplateType)}
                      >
                        <SelectTrigger className="text-right">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TEMPLATE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-blue-700 mt-2 text-right">
                        ברירת מחדל: <strong>{TEMPLATE_OPTIONS.find(t => t.value === autoSelectedLetters.primaryTemplate)?.label}</strong>
                        <br />
                        המערכת בחרה אוטומטית לפי סוג הלקוח והחישוב. ניתן לבחור מכתב אחר.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={() => setActiveTab('current')}>
                  <ChevronRight className="h-4 w-4 ml-2" />
                  חזור לעריכה
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleSaveCalculationOnly}>
                    <FileText className="h-4 w-4 ml-2" />
                    שמור חישוב בלבד
                  </Button>
                  <Button onClick={handleSaveCalculation} disabled={isSavingAndPreview}>
                    {isSavingAndPreview ? (
                      <>
                        <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        שומר ופותח מכתב...
                      </>
                    ) : (
                      <>
                        <Calculator className="h-4 w-4 ml-2" />
                        שמור וצפה במכתב
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Letter Preview Dialog */}
      <LetterPreviewDialog
        open={letterPreviewOpen}
        onOpenChange={(open) => {
          setLetterPreviewOpen(open);
          if (!open) {
            // Dialog closed (with or without sending)
            // Keep client and calculation data, show results tab
            setCurrentDraftId(null);
            setActiveTab('results');
            loadInitialData();
          }
        }}
        feeId={currentFeeId}
        clientId={formData.client_id || null}
        manualPrimaryOverride={selectedPrimaryTemplate}
        manualSecondaryOverride={selectedSecondaryTemplate}
        onEmailSent={() => {
          toast({
            title: 'הצלחה',
            description: 'המכתב נשלח בהצלחה ללקוח',
          });
          setCurrentDraftId(null);
          resetForm();
          loadInitialData();
          setLetterPreviewOpen(false);
        }}
      />

      {/* Overwrite Warning Dialog */}
      <AlertDialog open={showOverwriteWarning} onOpenChange={setShowOverwriteWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="rtl:text-right ltr:text-left">
              עדכון נתוני שנה קודמת
            </AlertDialogTitle>
            <AlertDialogDescription className="rtl:text-right ltr:text-left">
              נתוני שנת {formData.year - 1} כבר קיימים במערכת.
              האם אתה בטוח שברצונך לדרוס אותם?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={() => setShowOverwriteWarning(false)}>
              ביטול
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowOverwriteWarning(false);
              handleSavePreviousYearData();
            }}>
              כן, עדכן נתונים
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}