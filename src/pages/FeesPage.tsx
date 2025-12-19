import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/lib/logger';
import { formatILS } from '@/lib/formatters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MoneyInput } from '@/components/ui/money-input';
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
  Minus,
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
import { BankTransferDiscountCalculator, type BankTransferAmounts } from '@/components/fees/BankTransferDiscountCalculator';
import { CustomPaymentText } from '@/components/fees/CustomPaymentText';
import { GroupClientSelector, type SelectionMode } from '@/components/fees/GroupClientSelector';
import { GroupMembersList } from '@/components/fees/GroupMembersList';
import { groupFeeService, type ClientGroup, type GroupFeeCalculation } from '@/services/group-fee.service';

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
  client_requested_adjustment: number; // NEW: Client requested adjustment (negative values only)
  client_requested_adjustment_note: string; // NEW: Optional note (max 50 chars)
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
  // Retainer fields (for retainer clients - both internal and external)
  retainer_monthly_amount: number;
  retainer_inflation_rate: number;
  retainer_index_manual_adjustment: number; // Manual inflation adjustment in ILS (positive number)
  retainer_index_manual_is_negative: boolean; // Checkbox to mark as negative (reduce index)
  retainer_real_adjustment: number;
  retainer_real_adjustment_reason: string;
  retainer_apply_inflation_index: boolean;
}

export function FeesPage() {
  const [activeTab, setActiveTab] = useState<'previous' | 'current' | 'results'>('previous');
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientDetails, setSelectedClientDetails] = useState<Client | null>(null);
  const [relatedCompanies, setRelatedCompanies] = useState<Client[]>([]);
  const [feeCalculations, setFeeCalculations] = useState<FeeCalculation[]>([]);
  const [loading, setLoading] = useState(true);

  // Group mode state
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('client');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ClientGroup | null>(null);
  const [groupCalculation, setGroupCalculation] = useState<GroupFeeCalculation | null>(null);
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
    client_requested_adjustment: 0,
    client_requested_adjustment_note: '',
    discount_percentage: 0,
    apply_inflation_index: true,
    notes: '',
    // Bookkeeping fields (for internal clients only)
    bookkeeping_base_amount: 0,
    bookkeeping_inflation_rate: 3.0,
    bookkeeping_real_adjustment: 0,
    bookkeeping_real_adjustment_reason: '',
    bookkeeping_discount_percentage: 0,
    bookkeeping_apply_inflation_index: true,
    // Retainer fields (for retainer clients - both internal and external)
    retainer_monthly_amount: 0,
    retainer_inflation_rate: 3.0,
    retainer_index_manual_adjustment: 0,
    retainer_index_manual_is_negative: false,
    retainer_real_adjustment: 0,
    retainer_real_adjustment_reason: '',
    retainer_apply_inflation_index: true
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
  const [retainerCalculationResults, setRetainerCalculationResults] = useState<{
    inflation_adjustment: number;
    index_manual_adjustment: number;
    real_adjustment: number;
    discount_amount: number;
    final_amount: number;
    vat_amount: number;
    total_with_vat: number;
  } | null>(null);
  const [letterPreviewOpen, setLetterPreviewOpen] = useState(false);
  const [currentFeeId, setCurrentFeeId] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  // Group letter preview state
  const [currentGroupFeeCalculationId, setCurrentGroupFeeCalculationId] = useState<string | null>(null);
  const [autoSelectedLetters, setAutoSelectedLetters] = useState<LetterSelectionResult | null>(null);
  const [selectedPrimaryTemplate, setSelectedPrimaryTemplate] = useState<LetterTemplateType | null>(null);
  const [selectedSecondaryTemplate, setSelectedSecondaryTemplate] = useState<LetterTemplateType | null>(null);
  const [isLoadingPrevious, setIsLoadingPrevious] = useState(false);
  const [isSavingAndPreview, setIsSavingAndPreview] = useState(false);

  // Bank Transfer Only Option
  const [bankTransferOnly, setBankTransferOnly] = useState(false);
  const [bankTransferDiscount, setBankTransferDiscount] = useState<number>(9);
  const [bankTransferAmounts, setBankTransferAmounts] = useState<BankTransferAmounts | null>(null);

  // Custom Payment Text (HTML from TipTap editor)
  const [customPaymentText, setCustomPaymentText] = useState<string>('');

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

  /**
   * Handler for Bank Transfer Only option changes
   * Wrapped in useCallback to prevent infinite re-renders in BankTransferDiscountCalculator
   */
  const handleBankTransferOnlyChange = useCallback((enabled: boolean, discount: number, amounts: BankTransferAmounts | null) => {
    setBankTransferOnly(enabled);
    setBankTransferDiscount(discount);
    setBankTransferAmounts(amounts);
  }, []); // Empty deps array - setState functions are always stable

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Load data when selection or tax year changes
    const loadData = async () => {
      if (selectionMode === 'client' && formData.client_id) {
        // Run sequentially to avoid race conditions
        await loadPreviousYearData(formData.client_id);
        await loadDraftCalculation(formData.client_id);
        await loadClientDetails(formData.client_id);
      } else if (selectionMode === 'group' && selectedGroupId) {
        await loadGroupCalculation(selectedGroupId);
      } else {
        // Clear all client/group-related data when no selection
        setSelectedClientDetails(null);
        setRelatedCompanies([]);
        setCurrentDraftId(null);
        setGroupCalculation(null);

        // Reset form data to defaults (except year)
        setFormData(prev => ({
          ...prev,
          client_id: '',
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
          client_requested_adjustment: 0,
          client_requested_adjustment_note: '',
          discount_percentage: 0,
          apply_inflation_index: true,
          notes: '',
          bookkeeping_base_amount: 0,
          bookkeeping_inflation_rate: 3.0,
          bookkeeping_real_adjustment: 0,
          bookkeeping_real_adjustment_reason: '',
          bookkeeping_discount_percentage: 0,
          bookkeeping_apply_inflation_index: true,
          retainer_monthly_amount: 0,
          retainer_inflation_rate: 3.0,
          retainer_index_manual_adjustment: 0,
          retainer_index_manual_is_negative: false,
          retainer_real_adjustment: 0,
          retainer_real_adjustment_reason: '',
          retainer_apply_inflation_index: true
        }));
      }
    };

    loadData();
  }, [formData.client_id, formData.year, selectionMode, selectedGroupId]);

  useEffect(() => {
    // Auto-calculate when form data changes
    if (formData.base_amount > 0 || formData.retainer_monthly_amount > 0) {
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
    formData.client_requested_adjustment,
    formData.client_requested_adjustment_note,
    formData.previous_year_amount_with_vat,
    // Bookkeeping dependencies for internal clients
    formData.bookkeeping_base_amount,
    formData.bookkeeping_inflation_rate,
    formData.bookkeeping_real_adjustment,
    formData.bookkeeping_discount_percentage,
    formData.bookkeeping_apply_inflation_index,
    // Retainer dependencies
    formData.retainer_monthly_amount,
    formData.retainer_inflation_rate,
    formData.retainer_real_adjustment,
    formData.retainer_apply_inflation_index,
    selectedClientDetails?.internal_external,
    selectedClientDetails?.is_retainer
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
          previous_year_amount: '',
          previous_year_discount: '',
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
        previous_year_amount: '',
        previous_year_discount: '',
        previous_year_amount_after_discount: 0,
        previous_year_amount_with_vat: 0,
        previous_year_amount_with_vat_before_discount: 0
      }));
    }
  };

  const loadDraftCalculation = async (clientId: string) => {
    try {
      // ONLY load draft calculations - do NOT load sent/paid (prevents loading old data)
      const response = await feeService.getDraftCalculation(clientId, formData.year);

      if (response.data) {
        const draft = response.data;
        setCurrentDraftId(draft.id);

        // Debug logging to verify correct data
        console.log('🔍 [LoadDraft] טעינת draft:', {
          id: draft.id,
          status: draft.status,
          client_adjustment: draft.client_requested_adjustment,
          client_adjustment_note: draft.client_requested_adjustment_note
        });

        // Fill form with draft data (preserve previous_year_amount from loadPreviousYearData)
        setFormData(prev => ({
          ...prev,
          base_amount: draft.base_amount || prev.base_amount,
          inflation_rate: draft.inflation_rate || prev.inflation_rate,
          index_manual_adjustment: draft.index_manual_adjustment || 0,
          real_adjustment: draft.real_adjustment || 0,
          real_adjustment_reason: draft.real_adjustment_reason || '',
          client_requested_adjustment: draft.client_requested_adjustment || 0,
          client_requested_adjustment_note: draft.client_requested_adjustment_note || '',
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
          // Load retainer data if exists (for retainer clients)
          retainer_monthly_amount: draft.retainer_calculation?.monthly_amount || 0,
          retainer_inflation_rate: draft.retainer_calculation?.inflation_rate || 3.0,
          retainer_index_manual_adjustment: draft.retainer_calculation?.index_manual_adjustment || 0,
          retainer_index_manual_is_negative: draft.retainer_calculation?.index_manual_is_negative ?? false,
          retainer_real_adjustment: draft.retainer_calculation?.real_adjustment || 0,
          retainer_real_adjustment_reason: draft.retainer_calculation?.real_adjustment_reason || '',
          retainer_apply_inflation_index: draft.retainer_calculation?.apply_inflation_index ?? true,
        }));

        // Load custom payment text if exists
        setCustomPaymentText(draft.custom_payment_text || '');

        toast({
          title: 'נטען חישוב קודם',
          description: 'חישוב שטרם נשלח נטען מהמערכת',
        });
      } else {
        // No draft found - try to load latest sent/calculated for reference
        setCurrentDraftId(null);

        console.log('🔍 [LoadDraft] אין draft - מנסה לטעון חישוב שנשלח');

        // NEW: Try to load sent/calculated calculation to populate form
        const latestResponse = await feeService.getLatestCalculationForYear(clientId, formData.year);

        if (latestResponse.data) {
          const latest = latestResponse.data;
          console.log('📋 [LoadLatest] נטען חישוב שנשלח:', {
            id: latest.id,
            status: latest.status,
            inflation_rate: latest.inflation_rate
          });

          // Fill form with sent data (same logic as draft, just from 'latest')
          // Don't set currentDraftId - user will create a new draft if they save
          setFormData(prev => ({
            ...prev,
            base_amount: latest.base_amount || prev.base_amount,
            inflation_rate: latest.inflation_rate || prev.inflation_rate,
            index_manual_adjustment: latest.index_manual_adjustment || 0,
            real_adjustment: latest.real_adjustment || 0,
            real_adjustment_reason: latest.real_adjustment_reason || '',
            client_requested_adjustment: latest.client_requested_adjustment || 0,
            client_requested_adjustment_note: latest.client_requested_adjustment_note || '',
            discount_percentage: latest.discount_percentage || 0,
            apply_inflation_index: latest.apply_inflation_index ?? prev.apply_inflation_index,
            notes: latest.notes || '',
            // Keep previous year data from loadPreviousYearData
            previous_year_amount: prev.previous_year_amount,
            previous_year_discount: prev.previous_year_discount,
            previous_year_amount_with_vat: prev.previous_year_amount_with_vat,
            // Load bookkeeping data if exists (for internal clients)
            bookkeeping_base_amount: latest.bookkeeping_calculation?.base_amount || 0,
            bookkeeping_inflation_rate: latest.bookkeeping_calculation?.inflation_rate || 3.0,
            bookkeeping_real_adjustment: latest.bookkeeping_calculation?.real_adjustment || 0,
            bookkeeping_real_adjustment_reason: latest.bookkeeping_calculation?.real_adjustment_reason || '',
            bookkeeping_discount_percentage: latest.bookkeeping_calculation?.discount_percentage || 0,
            bookkeeping_apply_inflation_index: latest.bookkeeping_calculation?.apply_inflation_index ?? true,
            // Load retainer data if exists (for retainer clients)
            retainer_monthly_amount: latest.retainer_calculation?.monthly_amount || 0,
            retainer_inflation_rate: latest.retainer_calculation?.inflation_rate || 3.0,
            retainer_index_manual_adjustment: latest.retainer_calculation?.index_manual_adjustment || 0,
            retainer_index_manual_is_negative: latest.retainer_calculation?.index_manual_is_negative ?? false,
            retainer_real_adjustment: latest.retainer_calculation?.real_adjustment || 0,
            retainer_real_adjustment_reason: latest.retainer_calculation?.real_adjustment_reason || '',
            retainer_apply_inflation_index: latest.retainer_calculation?.apply_inflation_index ?? true,
          }));

          // Load custom payment text if exists
          setCustomPaymentText(latest.custom_payment_text || '');

          toast({
            title: 'נטען חישוב קודם',
            description: 'חישוב שנשלח ללקוח נטען לעיון. שמירה תיצור חישוב חדש.',
          });
        } else {
          // No calculation found at all - reset client adjustment fields
          console.log('🔍 [LoadDraft] אין חישוב כלל - מנקה שדות');
          setFormData(prev => ({
            ...prev,
            client_requested_adjustment: 0,
            client_requested_adjustment_note: ''
          }));
          // Clear custom payment text
          setCustomPaymentText('');
        }
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

  /**
   * Load group calculation for the selected group and year
   */
  const loadGroupCalculation = async (groupId: string) => {
    try {
      console.log('🔄 [FeesPage] loadGroupCalculation called', { groupId, year: formData.year });
      
      let updates: Partial<FeeCalculatorForm> = {};

      // 1. Fetch Previous Year Data (year - 1)
      try {
        const prevResponse = await groupFeeService.getGroupCalculation(groupId, formData.year - 1);
        if (prevResponse.data) {
          const base = prevResponse.data.audit_base_amount || 0;
          const discount = prevResponse.data.audit_discount_percentage || 0;
          const calculated = calculatePreviousYearFields(base, discount);
          
          updates = {
            ...updates,
            previous_year_amount: base,
            previous_year_discount: discount,
            previous_year_amount_after_discount: calculated.previous_year_amount_after_discount,
            previous_year_amount_with_vat: calculated.previous_year_amount_with_vat,
            previous_year_amount_with_vat_before_discount: calculated.previous_year_amount_with_vat_before_discount,
          };
        } else {
             // FALLBACK: Try aggregated data from individual clients
             console.log('⚠️ [FeesPage] No group calculation found for previous year, trying aggregation.');
             const aggResponse = await groupFeeService.getAggregatedGroupData(groupId, formData.year - 1);
             
             if (aggResponse.data) {
                 const base = aggResponse.data.base_amount || 0;
                 const totalWithVat = aggResponse.data.total_with_vat;
                 const discountAmount = aggResponse.data.discount_amount;
                 
                 // Calculate blended discount percentage
                 let discountPercent = 0;
                 if (base > 0 && discountAmount > 0) {
                     discountPercent = (discountAmount / base) * 100;
                 }
                 
                 // Back-calculate "amount_after_discount" from totalWithVat
                 const totalBeforeVat = totalWithVat / 1.18;
                 
                 updates = {
                    ...updates,
                    previous_year_amount: base,
                    previous_year_discount: parseFloat(discountPercent.toFixed(2)),
                    previous_year_amount_after_discount: parseFloat(totalBeforeVat.toFixed(2)),
                    previous_year_amount_with_vat: totalWithVat,
                    previous_year_amount_with_vat_before_discount: parseFloat((base * 1.18).toFixed(2))
                 };
                 
                 toast({
                    title: 'נטענו נתוני שנה קודמת (אגרגציה)',
                    description: 'סוכמו נתוני החיובים הנפרדים של חברי הקבוצה משנה קודמת',
                 });
             } else {
                 updates = {
                    ...updates,
                    previous_year_amount: 0,
                    previous_year_discount: 0,
                    previous_year_amount_after_discount: 0,
                    previous_year_amount_with_vat: 0,
                    previous_year_amount_with_vat_before_discount: 0,
                 };
             }
        }
      } catch (error) {
        console.error('Error loading previous group calculation:', error);
      }

      // 2. Fetch Current Year Data
      const response = await groupFeeService.getGroupCalculation(groupId, formData.year);
      console.log('📦 [FeesPage] loadGroupCalculation response:', response);

      if (response.data) {
        console.log('✅ [FeesPage] Found group calculation data:', response.data);
        setGroupCalculation(response.data);
        
        const currentYearFields = {
          base_amount: response.data.audit_base_amount ?? 0,
          inflation_rate: response.data.audit_inflation_rate || 3.0,
          apply_inflation_index: response.data.audit_apply_inflation_index ?? true,
          index_manual_adjustment: response.data.audit_index_manual_adjustment || 0,
          real_adjustment: response.data.audit_real_adjustment || 0,
          real_adjustment_reason: response.data.audit_real_adjustment_reason || '',
          discount_percentage: response.data.audit_discount_percentage ?? 0,
          client_requested_adjustment: response.data.client_requested_adjustment || 0,
          client_requested_adjustment_note: response.data.client_requested_adjustment_note || '',
          // Bookkeeping fields
          bookkeeping_base_amount: response.data.bookkeeping_base_amount || 0,
          bookkeeping_inflation_rate: response.data.bookkeeping_inflation_rate || 3.0,
          bookkeeping_apply_inflation_index: response.data.bookkeeping_apply_inflation_index ?? true,
          bookkeeping_real_adjustment: response.data.bookkeeping_real_adjustment || 0,
          bookkeeping_real_adjustment_reason: response.data.bookkeeping_real_adjustment_reason || '',
          bookkeeping_discount_percentage: response.data.bookkeeping_discount_percentage || 0,
          notes: response.data.notes || ''
        };
        
        updates = { ...updates, ...currentYearFields };
        
        setPreviousYearDataSaved(true); 
        
        toast({
          title: 'נטען חישוב קבוצתי',
          description: 'נתוני חישוב קיימים נטענו בהצלחה',
        });
      } else {
        console.log('⚠️ [FeesPage] No group calculation found, resetting form.');
        setGroupCalculation(null);
        setPreviousYearDataSaved(true);
        
        const resetFields = {
          base_amount: 0,
          inflation_rate: 3.0,
          index_manual_adjustment: 0,
          real_adjustment: 0,
          real_adjustment_reason: '',
          client_requested_adjustment: 0,
          client_requested_adjustment_note: '',
          discount_percentage: 0,
          apply_inflation_index: true,
          notes: '',
          bookkeeping_base_amount: 0,
          bookkeeping_inflation_rate: 3.0,
          bookkeeping_real_adjustment: 0,
          bookkeeping_real_adjustment_reason: '',
          bookkeeping_discount_percentage: 0,
          bookkeeping_apply_inflation_index: true,
          retainer_monthly_amount: 0,
          retainer_inflation_rate: 3.0,
          retainer_index_manual_adjustment: 0,
          retainer_index_manual_is_negative: false,
          retainer_real_adjustment: 0,
          retainer_real_adjustment_reason: '',
          retainer_apply_inflation_index: true
        };
        
        updates = { ...updates, ...resetFields };
      }
      
      // Apply all updates at once
      setFormData(prev => ({ ...prev, ...updates }));

    } catch (error) {
      logger.error('Error loading group calculation:', error);
      console.error('❌ [FeesPage] Error loading group calculation:', error);
      setGroupCalculation(null);
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
        client_requested_adjustment: calc.client_requested_adjustment || 0,
        client_requested_adjustment_note: calc.client_requested_adjustment_note || '',
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
        client_requested_adjustment: calc.client_requested_adjustment || 0,
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
    // Helper to safely parse numeric inputs that might be strings/empty
    const safeParse = (val: number | string): number => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      return parseFloat(val) || 0;
    };

    const baseAmount = safeParse(formData.base_amount);
    const inflationRate = formData.apply_inflation_index ? (formData.inflation_rate || 3.0) : 0;
    const realAdjustment = safeParse(formData.real_adjustment);
    const clientAdjustment = safeParse(formData.client_requested_adjustment);
    const discountPercentage = safeParse(formData.discount_percentage);

    // Step 1a: Apply automatic inflation adjustment (only if checkbox is checked)
    const inflationAdjustmentAuto = baseAmount * (inflationRate / 100);

    // Step 1b: Add manual index adjustment (only if inflation is enabled)
    const indexManualAdjustmentRaw = safeParse(formData.index_manual_adjustment);
    const indexManualAdjustment = formData.apply_inflation_index ? indexManualAdjustmentRaw : 0;

    // Step 1c: Total inflation adjustment (auto + manual)
    const inflationAdjustment = inflationAdjustmentAuto + indexManualAdjustment;

    // Step 2: Add real adjustment + client requested adjustment
    const adjustedAmount = baseAmount + inflationAdjustment + realAdjustment + clientAdjustment;

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

    // Calculate bookkeeping amounts (for internal clients - not retainer)
    let bookkeepingResults = null;
    const bkBaseAmount = safeParse(formData.bookkeeping_base_amount);
    
    if (selectedClientDetails?.internal_external === 'internal' && !selectedClientDetails?.is_retainer && bkBaseAmount > 0) {
      const bkInflationRate = formData.bookkeeping_apply_inflation_index ? (formData.bookkeeping_inflation_rate || 3.0) : 0;
      const bkRealAdjustment = safeParse(formData.bookkeeping_real_adjustment);
      const bkDiscountPercentage = safeParse(formData.bookkeeping_discount_percentage);

      const bkInflationAdjustment = bkBaseAmount * (bkInflationRate / 100);
      const bkAdjustedAmount = bkBaseAmount + bkInflationAdjustment + bkRealAdjustment;
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

    // Calculate retainer amounts (for retainer clients - replaces both audit and bookkeeping)
    let retainerResults = null;
    const rtMonthlyAmount = safeParse(formData.retainer_monthly_amount);
    
    if (selectedClientDetails?.is_retainer && rtMonthlyAmount > 0) {
      // Retainer: monthly amount × 12 = annual base
      const annualRetainerBase = rtMonthlyAmount * 12;
      const rtInflationRate = formData.retainer_apply_inflation_index ? (formData.retainer_inflation_rate || 3.0) : 0;
      const rtRealAdjustment = safeParse(formData.retainer_real_adjustment);

      // Calculate automatic inflation adjustment
      const rtInflationAdjustment = annualRetainerBase * (rtInflationRate / 100);

      // Calculate manual index adjustment (with negative support via checkbox)
      const rtManualAdjustmentRaw = safeParse(formData.retainer_index_manual_adjustment);
      const rtManualAdjustment = formData.retainer_apply_inflation_index
        ? (formData.retainer_index_manual_is_negative
            ? -rtManualAdjustmentRaw
            : rtManualAdjustmentRaw)
        : 0;

      const rtAdjustedAmount = annualRetainerBase + rtInflationAdjustment + rtManualAdjustment + rtRealAdjustment;
      const rtFinalAmount = rtAdjustedAmount; // No discount for retainer
      const rtVatAmount = rtFinalAmount * 0.18;
      const rtTotalWithVat = rtFinalAmount + rtVatAmount;

      retainerResults = {
        inflation_adjustment: rtInflationAdjustment,
        index_manual_adjustment: rtManualAdjustment,
        real_adjustment: rtRealAdjustment,
        discount_amount: 0,
        final_amount: rtFinalAmount,
        vat_amount: rtVatAmount,
        total_with_vat: rtTotalWithVat,
      };
    }

    // Update bookkeeping and retainer states
    setBookkeepingCalculationResults(bookkeepingResults);
    setRetainerCalculationResults(retainerResults);

    return {
      inflation_adjustment: inflationAdjustment,
      inflation_adjustment_auto: inflationAdjustmentAuto,
      index_manual_adjustment: indexManualAdjustment,
      real_adjustment: realAdjustment,
      client_requested_adjustment: clientAdjustment,
      adjusted_amount: adjustedAmount,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      vat_amount: vatAmount,
      total_with_vat: totalWithVat,
      year_over_year_change: yearOverYearChange
    };
  };

  const handleSaveCalculationOnly = async () => {
    // Check client type for different validation
    const isRetainerClient = selectedClientDetails?.is_retainer;

    // Validate selection based on mode (client or group)
    if (selectionMode === 'client' && !formData.client_id) {
      toast({
        title: 'שגיאה',
        description: 'נא לבחור לקוח',
        variant: 'destructive',
      });
      return;
    }

    if (selectionMode === 'group' && !selectedGroupId) {
      toast({
        title: 'שגיאה',
        description: 'נא לבחור קבוצה',
        variant: 'destructive',
      });
      return;
    }

    // Different required fields based on mode
    if (selectionMode === 'client') {
      // Client mode validation
      if (isRetainerClient) {
        if (!formData.retainer_monthly_amount || formData.retainer_monthly_amount <= 0) {
          toast({
            title: 'שגיאה',
            description: 'נא למלא סכום רטיינר חודשי',
            variant: 'destructive',
          });
          return;
        }
      } else {
        if (!formData.base_amount || formData.base_amount <= 0) {
          toast({
            title: 'שגיאה',
            description: 'נא למלא סכום בסיס',
            variant: 'destructive',
          });
          return;
        }
      }
    } else {
      // Group mode validation - require base amount
      if (!formData.base_amount || formData.base_amount <= 0) {
        toast({
          title: 'שגיאה',
          description: 'נא למלא סכום בסיס לקבוצה',
          variant: 'destructive',
        });
        return;
      }
    }

    try {
      // GROUP MODE: Save to group_fee_calculations
      if (selectionMode === 'group' && selectedGroupId) {
        const groupInput = {
          group_id: selectedGroupId,
          year: formData.year,
          audit_base_amount: formData.base_amount, // Ensure this uses the form data
          audit_inflation_rate: formData.inflation_rate,
          audit_apply_inflation_index: formData.apply_inflation_index,
          audit_index_manual_adjustment: formData.index_manual_adjustment,
          audit_real_adjustment: formData.real_adjustment,
          audit_real_adjustment_reason: formData.real_adjustment_reason,
          audit_discount_percentage: formData.discount_percentage,
          bookkeeping_base_amount: formData.bookkeeping_base_amount,
          bookkeeping_inflation_rate: formData.bookkeeping_inflation_rate,
          bookkeeping_apply_inflation_index: formData.bookkeeping_apply_inflation_index,
          bookkeeping_real_adjustment: formData.bookkeeping_real_adjustment,
          bookkeeping_real_adjustment_reason: formData.bookkeeping_real_adjustment_reason,
          bookkeeping_discount_percentage: formData.bookkeeping_discount_percentage,
          client_requested_adjustment: formData.client_requested_adjustment,
          client_requested_adjustment_note: formData.client_requested_adjustment_note,
          notes: formData.notes,
          custom_payment_text: customPaymentText || null
        };

        const response = await groupFeeService.saveGroupCalculation(groupInput);

        if (response.error) {
          toast({
            title: 'שגיאה',
            description: response.error.message,
            variant: 'destructive',
          });
          return;
        }

        if (response.data) {
          setGroupCalculation(response.data);
          toast({
            title: 'הצלחה',
            description: 'חישוב קבוצתי נשמר בהצלחה',
          });
          
          // Reload the data to ensure UI is in sync
          await loadGroupCalculation(selectedGroupId);
        }
        return;
      }

      // CLIENT MODE: Save to fee_calculations (existing logic)
      const createData: CreateFeeCalculationDto = {
        client_id: formData.client_id,
        year: formData.year,
        previous_year_amount: formData.previous_year_amount,
        previous_year_discount: formData.previous_year_discount,
        base_amount: formData.base_amount,
        inflation_rate: formData.inflation_rate,
        index_manual_adjustment: formData.index_manual_adjustment,
        real_adjustment: formData.real_adjustment,
        real_adjustment_reason: formData.real_adjustment_reason,
        client_requested_adjustment: formData.client_requested_adjustment,
        client_requested_adjustment_note: formData.client_requested_adjustment_note,
        discount_percentage: formData.discount_percentage,
        apply_inflation_index: formData.apply_inflation_index,
        notes: formData.notes,
        // Bookkeeping fields (for internal clients only)
        bookkeeping_base_amount: formData.bookkeeping_base_amount,
        bookkeeping_inflation_rate: formData.bookkeeping_inflation_rate,
        bookkeeping_real_adjustment: formData.bookkeeping_real_adjustment,
        bookkeeping_real_adjustment_reason: formData.bookkeeping_real_adjustment_reason,
        bookkeeping_discount_percentage: formData.bookkeeping_discount_percentage,
        bookkeeping_apply_inflation_index: formData.bookkeeping_apply_inflation_index,
        // Retainer fields (for retainer clients - both internal and external)
        retainer_monthly_amount: formData.retainer_monthly_amount,
        retainer_inflation_rate: formData.retainer_inflation_rate,
        retainer_index_manual_adjustment: formData.retainer_index_manual_adjustment,
        retainer_index_manual_is_negative: formData.retainer_index_manual_is_negative,
        retainer_real_adjustment: formData.retainer_real_adjustment,
        retainer_real_adjustment_reason: formData.retainer_real_adjustment_reason,
        retainer_apply_inflation_index: formData.retainer_apply_inflation_index,
        // Custom payment text (HTML) - appears above payment section in letter
        custom_payment_text: customPaymentText || null
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
    // Check client type for different validation
    const isRetainerClient = selectedClientDetails?.is_retainer;

    // Validate selection based on mode (client or group)
    if (selectionMode === 'client' && !formData.client_id) {
      toast({
        title: 'שגיאה',
        description: 'נא לבחור לקוח',
        variant: 'destructive',
      });
      return;
    }

    if (selectionMode === 'group' && !selectedGroupId) {
      toast({
        title: 'שגיאה',
        description: 'נא לבחור קבוצה',
        variant: 'destructive',
      });
      return;
    }

    // Different required fields based on mode
    if (selectionMode === 'client') {
      // Client mode validation
      if (isRetainerClient) {
        if (!formData.retainer_monthly_amount || formData.retainer_monthly_amount <= 0) {
          toast({
            title: 'שגיאה',
            description: 'נא למלא סכום רטיינר חודשי',
            variant: 'destructive',
          });
          return;
        }
      } else {
        if (!formData.base_amount || formData.base_amount <= 0) {
          toast({
            title: 'שגיאה',
            description: 'נא למלא סכום בסיס',
            variant: 'destructive',
          });
          return;
        }
      }
    } else {
      // Group mode validation - require base amount
      if (!formData.base_amount || formData.base_amount <= 0) {
        toast({
          title: 'שגיאה',
          description: 'נא למלא סכום בסיס לקבוצה',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSavingAndPreview(true);
    try {
      // GROUP MODE: Save to group_fee_calculations
      if (selectionMode === 'group' && selectedGroupId) {
        const groupInput = {
          group_id: selectedGroupId,
          year: formData.year,
          audit_base_amount: formData.base_amount,
          audit_inflation_rate: formData.inflation_rate,
          audit_apply_inflation_index: formData.apply_inflation_index,
          audit_index_manual_adjustment: formData.index_manual_adjustment,
          audit_real_adjustment: formData.real_adjustment,
          audit_real_adjustment_reason: formData.real_adjustment_reason,
          audit_discount_percentage: formData.discount_percentage,
          bookkeeping_base_amount: formData.bookkeeping_base_amount,
          bookkeeping_inflation_rate: formData.bookkeeping_inflation_rate,
          bookkeeping_apply_inflation_index: formData.bookkeeping_apply_inflation_index,
          bookkeeping_real_adjustment: formData.bookkeeping_real_adjustment,
          bookkeeping_real_adjustment_reason: formData.bookkeeping_real_adjustment_reason,
          bookkeeping_discount_percentage: formData.bookkeeping_discount_percentage,
          client_requested_adjustment: formData.client_requested_adjustment,
          client_requested_adjustment_note: formData.client_requested_adjustment_note,
          bank_transfer_only: bankTransferOnly,
          bank_transfer_discount_percentage: bankTransferOnly ? bankTransferDiscount : undefined,
          notes: formData.notes,
          custom_payment_text: customPaymentText || null
        };

        const response = await groupFeeService.saveGroupCalculation(groupInput);

        if (response.error) {
          toast({
            title: 'שגיאה',
            description: response.error.message,
            variant: 'destructive',
          });
          return;
        }

        if (response.data) {
          setGroupCalculation(response.data);
          // Open group letter preview dialog
          setLetterPreviewOpen(false);
          setTimeout(() => {
            setCurrentGroupFeeCalculationId(response.data.id);
            setCurrentFeeId(null); // Clear client fee ID
            setLetterPreviewOpen(true);
          }, 100);
        }
        return;
      }

      // CLIENT MODE: Save to fee_calculations (existing logic)
      const createData: CreateFeeCalculationDto = {
        client_id: formData.client_id,
        year: formData.year,
        previous_year_amount: formData.previous_year_amount,
        previous_year_discount: formData.previous_year_discount,
        base_amount: formData.base_amount,
        inflation_rate: formData.inflation_rate,
        index_manual_adjustment: formData.index_manual_adjustment,
        real_adjustment: formData.real_adjustment,
        real_adjustment_reason: formData.real_adjustment_reason,
        client_requested_adjustment: formData.client_requested_adjustment,
        client_requested_adjustment_note: formData.client_requested_adjustment_note,
        discount_percentage: formData.discount_percentage,
        apply_inflation_index: formData.apply_inflation_index,
        notes: formData.notes,
        // Bookkeeping fields (for internal clients only)
        bookkeeping_base_amount: formData.bookkeeping_base_amount,
        bookkeeping_inflation_rate: formData.bookkeeping_inflation_rate,
        bookkeeping_real_adjustment: formData.bookkeeping_real_adjustment,
        bookkeeping_real_adjustment_reason: formData.bookkeeping_real_adjustment_reason,
        bookkeeping_discount_percentage: formData.bookkeeping_discount_percentage,
        bookkeeping_apply_inflation_index: formData.bookkeeping_apply_inflation_index,
        // Retainer fields (for retainer clients - both internal and external)
        retainer_monthly_amount: formData.retainer_monthly_amount,
        retainer_inflation_rate: formData.retainer_inflation_rate,
        retainer_index_manual_adjustment: formData.retainer_index_manual_adjustment,
        retainer_index_manual_is_negative: formData.retainer_index_manual_is_negative,
        retainer_real_adjustment: formData.retainer_real_adjustment,
        retainer_real_adjustment_reason: formData.retainer_real_adjustment_reason,
        retainer_apply_inflation_index: formData.retainer_apply_inflation_index,
        // Bank Transfer Only Option
        bank_transfer_only: bankTransferOnly,
        bank_transfer_discount_percentage: bankTransferOnly ? bankTransferDiscount : undefined,
        bank_transfer_amount_before_vat: bankTransferAmounts?.afterDiscountNoVat,
        bank_transfer_amount_with_vat: bankTransferAmounts?.afterDiscountWithVat,
        // Custom payment text (HTML) - appears above payment section in letter
        custom_payment_text: customPaymentText || null
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

        // Open letter preview dialog - force reload by closing first
        if (response.data) {
          setLetterPreviewOpen(false);
          setTimeout(() => {
            setCurrentFeeId(response.data.id);
            setLetterPreviewOpen(true);
          }, 100);
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

        // Open letter preview dialog and track the new draft - force reload by closing first
        if (response.data) {
          setLetterPreviewOpen(false);
          setTimeout(() => {
            setCurrentFeeId(response.data.id);
            setCurrentDraftId(response.data.id);
            setLetterPreviewOpen(true);
          }, 100);
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
    // Simple and reliable: refresh page to reset ALL state
    window.location.reload();
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

                  {/* Group/Client Selector - Toggle between individual and group mode */}
                  <GroupClientSelector
                    year={formData.year}
                    mode={selectionMode}
                    onModeChange={(mode) => {
                      setSelectionMode(mode);
                      // Clear selections when switching modes
                      if (mode === 'client') {
                        setSelectedGroupId(null);
                        setSelectedGroup(null);
                        setGroupCalculation(null);
                      } else {
                        setFormData(prev => ({ ...prev, client_id: '' }));
                        setSelectedClientDetails(null);
                        setRelatedCompanies([]);
                      }
                      setPreviousYearDataSaved(false);
                    }}
                    selectedClientId={formData.client_id || null}
                    selectedGroupId={selectedGroupId}
                    onClientSelect={(client) => {
                      if (client) {
                        setFormData({ ...formData, client_id: client.id });
                      } else {
                        setFormData({ ...formData, client_id: '' });
                      }
                      setPreviousYearDataSaved(false);
                    }}
                    onGroupSelect={(group) => {
                      setSelectedGroupId(group?.id || null);
                      setSelectedGroup(group);
                      if (!group) {
                        setGroupCalculation(null);
                      }
                      setPreviousYearDataSaved(false);
                    }}
                  />

                  {/* Group Members List - Show when group is selected */}
                  {selectionMode === 'group' && selectedGroupId && (
                    <GroupMembersList
                      groupId={selectedGroupId}
                      compact={false}
                      showHeader={true}
                    />
                  )}

                  {/* Client Info Card - Show only in client mode */}
                  {selectionMode === 'client' && selectedClientDetails && (
                    <ClientInfoCard
                      client={selectedClientDetails}
                      relatedCompanies={relatedCompanies}
                    />
                  )}

                  {/* New Client Checkbox - Only show in client mode */}
                  {selectionMode === 'client' && formData.client_id && (
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
                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <Label htmlFor="previous_amount" className="text-sm font-medium rtl:text-right ltr:text-left">
                              סכום בסיס (לפני הנחה, לפני מע"מ)
                            </Label>
                            <Coins className="h-6 w-6 text-blue-500" />
                          </div>
                          <MoneyInput
                            value={formData.previous_year_amount === 0 ? '' : formData.previous_year_amount}
                            onChange={(newAmount) => {
                              // Calculate dependent fields using 0 for empty amount
                              const calcAmount = typeof newAmount === 'number' ? newAmount : 0;
                              const calcDiscount = typeof formData.previous_year_discount === 'number' ? formData.previous_year_discount : 0;
                              const calculated = calculatePreviousYearFields(calcAmount, calcDiscount);

                              setFormData({
                                ...formData,
                                previous_year_amount: newAmount,
                                ...calculated
                              });
                            }}
                            disabled={formData.isNewClient}
                            className={`text-lg ${formData.isNewClient ? 'opacity-50 bg-gray-100' : ''}`}
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
                              value={formData.previous_year_discount === 0 ? '' : formData.previous_year_discount}
                              onChange={(e) => {
                                const val = e.target.value;
                                const newDiscount = val === '' ? '' : parseFloat(val);
                                // Calculate dependent fields using 0 for empty discount
                                const calcAmount = typeof formData.previous_year_amount === 'number' ? formData.previous_year_amount : 0;
                                const calcDiscount = typeof newDiscount === 'number' ? newDiscount : 0;
                                const calculated = calculatePreviousYearFields(calcAmount, calcDiscount);
                                
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
                              placeholder=""
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

                {/* View Previous Calculation Button - show if client selected (works with draft OR sent calculations) */}
                {formData.client_id && (
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

              {/* Retainer Section - Unified calculation for retainer clients */}
              {selectedClientDetails?.is_retainer ? (
                <div className="space-y-6">
                  <div className="mb-4 rtl:text-right ltr:text-left">
                    <h4 className="text-lg font-semibold text-purple-700 flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      חישוב ריטיינר - שכר טרחה משולב (מכתב E)
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      חישוב משולב של ראיית חשבון, הנהלת חשבונות וחשבות שכר - סכום חודשי + התאמת מדד
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="retainer_monthly_amount">סכום חודשי ריטיינר (יוכפל ב-12) *</Label>
                        <MoneyInput
                          value={formData.retainer_monthly_amount === 0 ? '' : formData.retainer_monthly_amount}
                          onChange={(value) => setFormData({ ...formData, retainer_monthly_amount: value })}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          הזן סכום חודשי - המערכת תכפיל ב-12 לחישוב שנתי
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="retainer_inflation_rate">אחוז מדד</Label>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="retainer_apply_inflation"
                              checked={formData.retainer_apply_inflation_index}
                              onCheckedChange={(checked) =>
                                setFormData({ ...formData, retainer_apply_inflation_index: checked as boolean })
                              }
                            />
                            <Label htmlFor="retainer_apply_inflation" className="text-sm font-normal cursor-pointer">
                              החל מדד
                            </Label>
                          </div>
                        </div>
                        <Input
                          id="retainer_inflation_rate"
                          type="number"
                          value={formData.retainer_inflation_rate === 0 ? '' : formData.retainer_inflation_rate}
                          onChange={(e) => setFormData({ ...formData, retainer_inflation_rate: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                          step="0.1"
                          placeholder=""
                          disabled={!formData.retainer_apply_inflation_index}
                          className={!formData.retainer_apply_inflation_index ? 'opacity-50' : ''}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label htmlFor="retainer_index_manual_adjustment">תוספת מדד ידנית (₪)</Label>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="retainer_index_manual_is_negative"
                              checked={formData.retainer_index_manual_is_negative}
                              onCheckedChange={(checked) =>
                                setFormData({ ...formData, retainer_index_manual_is_negative: checked as boolean })
                              }
                              disabled={!formData.retainer_apply_inflation_index}
                            />
                            <Label htmlFor="retainer_index_manual_is_negative" className="text-sm font-normal cursor-pointer">
                              הפחת מדד
                            </Label>
                          </div>
                        </div>
                        <MoneyInput
                          value={formData.retainer_index_manual_adjustment === 0 ? '' : formData.retainer_index_manual_adjustment}
                          onChange={(value) => setFormData({ ...formData, retainer_index_manual_adjustment: value })}
                          disabled={!formData.retainer_apply_inflation_index}
                          className={!formData.retainer_apply_inflation_index ? 'opacity-50' : ''}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {formData.retainer_index_manual_is_negative ? 'סכום שיופחת מהמדד' : 'סכום שיתווסף למדד'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="retainer_real_adjustment">תוספת ריאלית</Label>
                        <MoneyInput
                          value={formData.retainer_real_adjustment === 0 ? '' : formData.retainer_real_adjustment}
                          onChange={(value) => setFormData({ ...formData, retainer_real_adjustment: value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="retainer_adjustment_reason">סיבת התוספת הריאלית</Label>
                        <Textarea
                          id="retainer_adjustment_reason"
                          value={formData.retainer_real_adjustment_reason}
                          onChange={(e) => setFormData({ ...formData, retainer_real_adjustment_reason: e.target.value })}
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Regular Audit Section (Non-Retainer Clients) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="base_amount">סכום בסיס לפני הנחה ולפני מע״מ *</Label>
                    <MoneyInput
                      value={formData.base_amount === 0 ? '' : formData.base_amount}
                      onChange={(value) => setFormData({ ...formData, base_amount: value })}
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
                      value={formData.inflation_rate === 0 ? '' : formData.inflation_rate}
                      onChange={(e) => setFormData({ ...formData, inflation_rate: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      step="0.1"
                      placeholder=""
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
                    <MoneyInput
                      value={formData.index_manual_adjustment === 0 ? '' : Math.abs(formData.index_manual_adjustment)}
                      onChange={(value) => {
                        const numValue = typeof value === 'number' ? value : 0;
                        const isNegative = typeof formData.index_manual_adjustment === 'number' && formData.index_manual_adjustment < 0;
                        setFormData({
                          ...formData,
                          index_manual_adjustment: value === '' ? '' : (isNegative ? -numValue : numValue)
                        });
                      }}
                      min={0}
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
                    <MoneyInput
                      value={formData.real_adjustment === 0 ? '' : formData.real_adjustment}
                      onChange={(value) => setFormData({ ...formData, real_adjustment: value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="adjustment_reason">סיבת התוספת הריאלית</Label>
                    <Textarea
                      id="adjustment_reason"
                      value={formData.real_adjustment_reason}
                      onChange={(e) => setFormData({ ...formData, real_adjustment_reason: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="client_requested_adjustment" className="text-right">
                      תיקון שכר טרחה לבקשת הלקוח (ש"ח)
                      <span className="text-xs text-gray-500 mr-2">רק ערכים שליליים</span>
                    </Label>
                    <MoneyInput
                      value={formData.client_requested_adjustment === 0 ? '' : Math.abs(formData.client_requested_adjustment)}
                      onChange={(value) => {
                        // Always store as negative since this is a reduction
                        const numValue = typeof value === 'number' ? -value : '';
                        setFormData({ ...formData, client_requested_adjustment: numValue });
                      }}
                      className="text-right"
                    />
                  </div>

                  {formData.client_requested_adjustment < 0 && (
                    <div>
                      <Label htmlFor="client_adjustment_note" className="text-right">
                        הערה לתיקון (אופציונלי - עד 50 תווים)
                      </Label>
                      <Input
                        id="client_adjustment_note"
                        type="text"
                        maxLength={50}
                        value={formData.client_requested_adjustment_note || ''}
                        onChange={(e) => setFormData({ ...formData, client_requested_adjustment_note: e.target.value })}
                        className="text-right"
                      />
                      <p className="text-xs text-gray-500 mt-1 text-right">
                        {formData.client_requested_adjustment_note?.length || 0}/50 תווים
                      </p>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="notes">הערות</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              {/* Bookkeeping Section (Internal Clients Only - Not Retainer) */}
              {selectedClientDetails?.internal_external === 'internal' && !selectedClientDetails?.is_retainer && (
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
                        <MoneyInput
                          value={formData.bookkeeping_base_amount === 0 ? '' : formData.bookkeeping_base_amount}
                          onChange={(value) => setFormData({ ...formData, bookkeeping_base_amount: value })}
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
                          value={formData.bookkeeping_inflation_rate === 0 ? '' : formData.bookkeeping_inflation_rate}
                          onChange={(e) => setFormData({ ...formData, bookkeeping_inflation_rate: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                          step="0.1"
                          placeholder=""
                          disabled={!formData.bookkeeping_apply_inflation_index}
                          className={!formData.bookkeeping_apply_inflation_index ? 'opacity-50' : ''}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="bookkeeping_real_adjustment">תוספת ריאלית הנהלת חשבונות</Label>
                        <MoneyInput
                          value={formData.bookkeeping_real_adjustment === 0 ? '' : formData.bookkeeping_real_adjustment}
                          onChange={(value) => setFormData({ ...formData, bookkeeping_real_adjustment: value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="bookkeeping_adjustment_reason">סיבת התוספת הריאלית (הנהלת חשבונות)</Label>
                        <Textarea
                          id="bookkeeping_adjustment_reason"
                          value={formData.bookkeeping_real_adjustment_reason}
                          onChange={(e) => setFormData({ ...formData, bookkeeping_real_adjustment_reason: e.target.value })}
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
                </>
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

          {activeTab === 'results' && (
            <>
            {calculationResults && !selectedClientDetails?.is_retainer && (
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

                {/* Client Requested Adjustment - shown when negative */}
                {formData.client_requested_adjustment < 0 && (
                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="w-full">
                          <p className="text-sm text-red-600 font-semibold">תיקון לבקשת הלקוח</p>
                          <p className="text-lg font-semibold text-red-600">
                            {formatILS(formData.client_requested_adjustment)}
                          </p>
                          {formData.client_requested_adjustment_note && (
                            <p className="text-xs text-red-500 mt-1">
                              {formData.client_requested_adjustment_note}
                            </p>
                          )}
                        </div>
                        <Minus className="h-8 w-8 text-red-500 flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                )}

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
                      <p className="text-2xl font-semibold text-green-800">
                        הסכום הנדרש עבור שירותי ראיית חשבון לפני הנחה ולפני מע"מ לשנת המס {formData.year} הוא: {formatILS(calculationResults.adjusted_amount)}
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
                  {/* Client Requested Adjustment - only if negative */}
                  {formData.client_requested_adjustment < 0 && (
                    <div className="flex justify-between text-red-600 font-semibold">
                      <span>- תיקון לבקשת הלקוח:</span>
                      <span>{formatILS(formData.client_requested_adjustment)}</span>
                    </div>
                  )}
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

              {/* Bookkeeping Results - Internal Clients Only (Not Retainer) */}
              {selectedClientDetails?.internal_external === 'internal' && !selectedClientDetails?.is_retainer && bookkeepingCalculationResults && (
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

                  {/* NEW CARD: Required Amount for Bookkeeping Services */}
                  <Card className="md:col-span-6 bg-green-50 border-2 border-green-300 mt-4">
                    <CardContent className="p-6">
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-green-800">
                          הסכום הנדרש עבור שירותי הנהלת חשבונות לפני הנחה ולפני מע"מ לשנת המס {formData.year} הוא: {formatILS(bookkeepingCalculationResults.final_amount)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

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
            </div>
          )}

            {/* Retainer Results - Retainer Clients Only */}
            {selectedClientDetails?.is_retainer && retainerCalculationResults && (
              <div className="space-y-6">
              <h4 className="text-lg font-semibold text-purple-700 mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                תוצאות חישוב ריטיינר (מכתב E)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">סכום חודשי בסיס</p>
                        <p className="text-lg font-semibold">{formatILS(formData.retainer_monthly_amount)}</p>
                        <p className="text-xs text-gray-400 mt-1">שנתי: {formatILS(formData.retainer_monthly_amount * 12)}</p>
                      </div>
                      <Coins className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">
                          התאמת מדד {formData.retainer_apply_inflation_index ? `(${formData.retainer_inflation_rate}%)` : '(לא מוחל)'}
                        </p>
                        <p className="text-lg font-semibold text-green-600">
                          {formData.retainer_apply_inflation_index ? `+${formatILS(retainerCalculationResults.inflation_adjustment)}` : '₪0'}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                {/* Manual Index Adjustment - Only show if not zero */}
                {retainerCalculationResults.index_manual_adjustment !== 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-500">תוספת מדד ידנית</p>
                          <p className={`text-lg font-semibold ${retainerCalculationResults.index_manual_adjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {retainerCalculationResults.index_manual_adjustment > 0 ? '+' : ''}{formatILS(retainerCalculationResults.index_manual_adjustment)}
                          </p>
                        </div>
                        {retainerCalculationResults.index_manual_adjustment > 0 ? (
                          <ArrowUp className="h-8 w-8 text-green-500" />
                        ) : (
                          <ArrowDown className="h-8 w-8 text-red-500" />
                        )}
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
                          +{formatILS(retainerCalculationResults.real_adjustment)}
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
                        <p className="text-lg font-semibold">{formatILS(retainerCalculationResults.final_amount)}</p>
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
                        <p className="text-lg font-semibold">{formatILS(retainerCalculationResults.vat_amount)}</p>
                      </div>
                      <FileText className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">סך הכל כולל מע"מ</p>
                        <p className="text-2xl font-bold text-purple-700">
                          {formatILS(retainerCalculationResults.total_with_vat)}
                        </p>
                      </div>
                      <Calculator className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="md:col-span-6 bg-purple-50 border-2 border-purple-300 mt-4">
                <CardContent className="p-6">
                  <div className="text-center">
                    <p className="text-2xl font-semibold text-purple-800">
                      הסכום הנדרש עבור שירותי ריטיינר לפני מע"מ לשנת המס {formData.year} הוא: {formatILS(retainerCalculationResults.final_amount)}
                    </p>
                    <p className="text-sm text-purple-600 mt-2">
                      (סכום חודשי: {formatILS(retainerCalculationResults.final_amount / 12)})
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-purple-50 p-4 rounded-lg mt-4">
                <h5 className="font-semibold mb-2 text-purple-900">פירוט חישוב ריטיינר:</h5>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>סכום חודשי:</span>
                    <span>{formatILS(formData.retainer_monthly_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>× 12 חודשים:</span>
                    <span>{formatILS(formData.retainer_monthly_amount * 12)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>+ התאמת מדד {formData.retainer_apply_inflation_index ? `(${formData.retainer_inflation_rate}%)` : '(לא מוחל)'}:</span>
                    <span>{formData.retainer_apply_inflation_index ? `+${formatILS(retainerCalculationResults.inflation_adjustment)}` : '₪0'}</span>
                  </div>
                  {retainerCalculationResults.index_manual_adjustment !== 0 && (
                    <div className={`flex justify-between ${retainerCalculationResults.index_manual_adjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      <span>{retainerCalculationResults.index_manual_adjustment > 0 ? '+' : '-'} תוספת מדד ידנית:</span>
                      <span>{retainerCalculationResults.index_manual_adjustment > 0 ? '+' : ''}{formatILS(retainerCalculationResults.index_manual_adjustment)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-green-600">
                    <span>+ תוספת ריאלית:</span>
                    <span>+{formatILS(retainerCalculationResults.real_adjustment)}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>סך הכל לפני מע"מ:</span>
                    <span>{formatILS(retainerCalculationResults.final_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>+ מע"מ (18%):</span>
                    <span>+{formatILS(retainerCalculationResults.vat_amount)}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-bold text-lg">
                    <span>סך הכל כולל מע"מ:</span>
                    <span>{formatILS(retainerCalculationResults.total_with_vat)}</span>
                  </div>
                  <div className="flex justify-between text-purple-600 font-semibold mt-2">
                    <span>סכום חודשי כולל מע"מ:</span>
                    <span>{formatILS(retainerCalculationResults.total_with_vat / 12)}</span>
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

            {/* Custom Payment Text - Manual text to add above payment section */}
            {calculationResults && (
              <div className="mt-6">
                <CustomPaymentText
                  value={customPaymentText}
                  onChange={setCustomPaymentText}
                />
              </div>
            )}

            {/* Bank Transfer Only Option */}
            {calculationResults && (
              <div className="mt-6">
                <BankTransferDiscountCalculator
                  baseAmount={calculationResults.final_amount}
                  onBankTransferOnlyChange={handleBankTransferOnlyChange}
                />
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
            </>
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
        groupId={selectedGroupId}
        groupFeeCalculationId={currentGroupFeeCalculationId}
        manualPrimaryOverride={selectedPrimaryTemplate}
        manualSecondaryOverride={selectedSecondaryTemplate}
        onEmailSent={() => {
          toast({
            title: 'הצלחה',
            description: selectionMode === 'group' ? 'המכתב הקבוצתי נשלח בהצלחה' : 'המכתב נשלח בהצלחה ללקוח',
          });
          setCurrentDraftId(null);
          setCurrentGroupFeeCalculationId(null);
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