import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  Calculator,
  TrendingUp,
  DollarSign,
  FileText,
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Info
} from 'lucide-react';
import { clientService, type Client } from '@/services/client.service';
import { feeService, type FeeCalculation, type CreateFeeCalculationDto } from '@/services/fee.service';
import { ClientInfoCard } from '@/components/ClientInfoCard';
import { LetterPreviewDialog } from '@/modules/letters/components/LetterPreviewDialog';

interface FeeCalculatorForm {
  client_id: string;
  year: number;
  previous_year_amount: number;
  previous_year_discount: number;
  previous_year_amount_with_vat: number;
  base_amount: number;
  inflation_rate: number;
  real_adjustment: number;
  real_adjustment_reason: string;
  discount_percentage: number;
  apply_inflation_index: boolean;
  notes: string;
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
  const [formData, setFormData] = useState<FeeCalculatorForm>({
    client_id: '',
    year: new Date().getFullYear(),
    previous_year_amount: 0,
    previous_year_discount: 0,
    previous_year_amount_with_vat: 0,
    base_amount: 0,
    inflation_rate: 3.0,
    real_adjustment: 0,
    real_adjustment_reason: '',
    discount_percentage: 0,
    apply_inflation_index: true,
    notes: ''
  });
  const [calculationResults, setCalculationResults] = useState<{
    inflation_adjustment: number;
    real_adjustment: number;
    discount_amount: number;
    final_amount: number;
    vat_amount: number;
    total_with_vat: number;
    year_over_year_change: number;
  } | null>(null);
  const [letterPreviewOpen, setLetterPreviewOpen] = useState(false);
  const [currentFeeId, setCurrentFeeId] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Load previous year data and client details when client is selected
    if (formData.client_id) {
      loadPreviousYearData(formData.client_id);
      loadDraftCalculation(formData.client_id);
      loadClientDetails(formData.client_id);
    } else {
      setSelectedClientDetails(null);
      setRelatedCompanies([]);
      setCurrentDraftId(null);
    }
  }, [formData.client_id]);

  useEffect(() => {
    // Auto-calculate previous year VAT amount
    if (formData.previous_year_amount && formData.previous_year_amount > 0) {
      const afterDiscount = formData.previous_year_amount * (1 - (formData.previous_year_discount || 0) / 100);
      const withVat = afterDiscount * 1.18; // 18% VAT
      setFormData(prev => ({ ...prev, previous_year_amount_with_vat: parseFloat(withVat.toFixed(2)) }));
    } else {
      setFormData(prev => ({ ...prev, previous_year_amount_with_vat: 0 }));
    }
  }, [formData.previous_year_amount, formData.previous_year_discount]);

  useEffect(() => {
    // Auto-calculate when form data changes
    if (formData.base_amount > 0) {
      const results = calculateFeeAmounts();
      setCalculationResults(results);
    }
  }, [formData.base_amount, formData.inflation_rate, formData.real_adjustment, formData.discount_percentage, formData.apply_inflation_index, formData.previous_year_amount_with_vat]);

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
      const response = await feeService.getLatestFeeByClient(clientId, formData.year);
      if (response.data) {
        // Load previous year's data
        // Use final_amount (calculated result) if available, otherwise base_amount (manual entry)
        setFormData(prev => ({
          ...prev,
          previous_year_amount: response.data.final_amount || response.data.base_amount || 0,
          previous_year_discount: response.data.discount_percentage || 0,
          previous_year_amount_with_vat: response.data.total_amount || 0
        }));
        setPreviousYearDataSaved(true); // Data exists in DB
        toast({
          title: 'נטענו נתוני שנה קודמת',
          description: 'נתונים משנה קודמת נטענו בהצלחה',
        });
      } else {
        // No previous data found - reset to empty
        setPreviousYearDataSaved(false);
      }
    } catch (error) {
      logger.error('Error loading previous year data:', error);
    }
  };

  const loadDraftCalculation = async (clientId: string) => {
    try {
      const response = await feeService.getDraftCalculation(clientId, formData.year);

      if (response.data) {
        const draft = response.data;
        setCurrentDraftId(draft.id);

        // Fill form with draft data
        setFormData(prev => ({
          ...prev,
          base_amount: draft.base_amount || prev.base_amount,
          inflation_rate: draft.inflation_rate || prev.inflation_rate,
          real_adjustment: draft.real_adjustment || 0,
          real_adjustment_reason: draft.real_adjustment_reason || '',
          discount_percentage: draft.discount_percentage || 0,
          apply_inflation_index: draft.apply_inflation_index ?? prev.apply_inflation_index,
          notes: draft.notes || '',
        }));

        toast({
          title: 'נטען חישוב קודם',
          description: 'חישוב שטרם נשלח נטען מהמערכת',
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
        year: formData.year, // 2025 (current year - will be previous year for 2026 calculation)
        base_amount: formData.previous_year_amount, // Use this amount as the base
        discount_percentage: formData.previous_year_discount || 0,
        previous_year_amount_with_vat: formData.previous_year_amount_with_vat,
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

  const calculateFeeAmounts = () => {
    const inflationRate = formData.apply_inflation_index ? (formData.inflation_rate || 3.0) : 0;
    const realAdjustment = formData.real_adjustment || 0;
    const discountPercentage = formData.discount_percentage || 0;

    // Step 1: Apply inflation adjustment (only if checkbox is checked)
    const inflationAdjustment = formData.base_amount * (inflationRate / 100);
    
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

    return {
      inflation_adjustment: inflationAdjustment,
      real_adjustment: realAdjustment,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      vat_amount: vatAmount,
      total_with_vat: totalWithVat,
      year_over_year_change: yearOverYearChange
    };
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
        notes: formData.notes
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
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      year: new Date().getFullYear(),
      previous_year_amount: 0,
      previous_year_discount: 0,
      previous_year_amount_with_vat: 0,
      base_amount: 0,
      inflation_rate: 3.0,
      real_adjustment: 0,
      real_adjustment_reason: '',
      discount_percentage: 0,
      apply_inflation_index: true,
      notes: ''
    });
    setCalculationResults(null);
    setActiveTab('previous');
    setPreviousYearDataSaved(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
    }).format(amount);
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
          <h1 className="text-3xl font-bold text-gray-900">חישוב שכר טרחה לשנת {formData.year + 1}</h1>
          <p className="text-gray-500 mt-1">חישוב שכר טרחה שנתי עם התאמות מדד ותוספות</p>
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
              נתוני שנת {formData.year} (שנה קודמת)
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === 'current'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('current')}
            >
              חישוב לשנת {formData.year + 1}
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
                <h3 className="text-lg font-semibold mb-2">נתוני שנת {formData.year} (שנה קודמת)</h3>
                <p className="text-sm text-gray-600 mb-4 flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  הזן את הנתונים ששולמו עבור שנת {formData.year}. נתונים אלו ישמשו בסיס לחישוב שכר הטרחה לשנת {formData.year + 1}.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="client">בחירת לקוח *</Label>
                    <Select
                      value={formData.client_id}
                      onValueChange={(value) => {
                        setFormData({ ...formData, client_id: value });
                        setPreviousYearDataSaved(false); // Reset saved state when changing client
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="בחר לקוח" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.company_name} - {client.tax_id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Client Info Card */}
                  {selectedClientDetails && (
                    <ClientInfoCard
                      client={selectedClientDetails}
                      relatedCompanies={relatedCompanies}
                    />
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="previous_amount">סכום בסיס שנה קודמת (לפני מע״מ ולפני הנחות)</Label>
                    <Input
                      id="previous_amount"
                      type="number"
                      value={formData.previous_year_amount || ''}
                      onChange={(e) => setFormData({ ...formData, previous_year_amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="previous_discount">הנחה שנה קודמת (%)</Label>
                    <Input
                      id="previous_discount"
                      type="number"
                      value={formData.previous_year_discount || ''}
                      onChange={(e) => setFormData({ ...formData, previous_year_discount: parseFloat(e.target.value) || 0 })}
                      min="0"
                      max="100"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="previous_vat">סכום שנה קודמת כולל מע"מ (מחושב אוטומטית)</Label>
                    <Input
                      id="previous_vat"
                      type="number"
                      value={formData.previous_year_amount_with_vat || ''}
                      disabled
                      className="font-semibold bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button 
                  onClick={handleSavePreviousYearData}
                  disabled={!formData.client_id || savingPreviousData || previousYearDataSaved}
                  variant={previousYearDataSaved ? "outline" : "default"}
                >
                  {savingPreviousData ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                      שומר...
                    </>
                  ) : previousYearDataSaved ? (
                    <>
                      <FileText className="h-4 w-4 ml-2" />
                      נתונים נשמרו
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 ml-2" />
                      שמור נתוני שנה קודמת
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => setActiveTab('current')}
                  disabled={!previousYearDataSaved}
                  title={!previousYearDataSaved ? "יש לשמור את נתוני השנה הקודמת לפני המשך" : ""}
                >
                  המשך לחישוב נוכחי
                  <ChevronLeft className="h-4 w-4 mr-2" />
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'current' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4 rtl:text-right ltr:text-left">חישוב שכר טרחה לשנת {formData.year + 1}</h3>
              
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

                  <div>
                    <Label htmlFor="discount_percentage">אחוז הנחה (%)</Label>
                    <Input
                      id="discount_percentage"
                      type="number"
                      value={formData.discount_percentage}
                      onChange={(e) => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0 })}
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="0"
                    />
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
              
              {/* Previous Year Comparison */}
              {formData.previous_year_amount_with_vat > 0 && (
                <Card className="mb-6 bg-blue-50 border-blue-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Info className="h-5 w-5 text-blue-600" />
                      השוואה לשנה קודמת
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">שנה קודמת (כולל מע"מ)</p>
                        <p className="text-xl font-bold">{formatCurrency(formData.previous_year_amount_with_vat)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">שנה נוכחית (כולל מע"מ)</p>
                        <p className="text-xl font-bold text-primary">{formatCurrency(calculationResults.total_with_vat)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">שינוי</p>
                        <div className="flex items-center gap-2">
                          {calculationResults.year_over_year_change >= 0 ? (
                            <ArrowUp className="h-5 w-5 text-green-600" />
                          ) : (
                            <ArrowDown className="h-5 w-5 text-red-600" />
                          )}
                          <p className={`text-xl font-bold ${
                            calculationResults.year_over_year_change >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {Math.abs(calculationResults.year_over_year_change).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">סכום בסיס לפני הנחה ולפני מע״מ</p>
                        <p className="text-lg font-semibold">{formatCurrency(formData.base_amount)}</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-blue-500" />
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
                          {formData.apply_inflation_index ? `+${formatCurrency(calculationResults.inflation_adjustment)}` : '₪0'}
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
                          +{formatCurrency(calculationResults.real_adjustment)}
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
                        <p className="text-sm text-gray-500">הנחה ({formData.discount_percentage}%)</p>
                        <p className="text-lg font-semibold text-red-600">
                          -{formatCurrency(calculationResults.discount_amount)}
                        </p>
                      </div>
                      <div className="h-8 w-8 text-red-500">%</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">מע"מ (18%)</p>
                        <p className="text-lg font-semibold">{formatCurrency(calculationResults.vat_amount)}</p>
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
                          {formatCurrency(calculationResults.total_with_vat)}
                        </p>
                      </div>
                      <Calculator className="h-8 w-8 text-primary" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">פירוט החישוב:</h4>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>סכום בסיס לפני הנחה ולפני מע״מ:</span>
                    <span>{formatCurrency(formData.base_amount)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>+ התאמת מדד {formData.apply_inflation_index ? `(${formData.inflation_rate}%)` : '(לא מוחל)'}:</span>
                    <span>{formData.apply_inflation_index ? `+${formatCurrency(calculationResults.inflation_adjustment)}` : '₪0'}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>+ תוספת ריאלית:</span>
                    <span>+{formatCurrency(calculationResults.real_adjustment)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>- הנחה ({formData.discount_percentage}%):</span>
                    <span>-{formatCurrency(calculationResults.discount_amount)}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span>סך הכל לפני מע"מ:</span>
                    <span>{formatCurrency(calculationResults.final_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>+ מע"מ (18%):</span>
                    <span>+{formatCurrency(calculationResults.vat_amount)}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-bold text-lg">
                    <span>סך הכל כולל מע"מ:</span>
                    <span>{formatCurrency(calculationResults.total_with_vat)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveTab('current')}>
                  <ChevronRight className="h-4 w-4 ml-2" />
                  חזור לעריכה
                </Button>
                <Button onClick={handleSaveCalculation}>
                  <Calculator className="h-4 w-4 ml-2" />
                  שמור חישוב
                </Button>
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
            // Draft remains in DB, but clear form for clean state
            setCurrentDraftId(null);
            resetForm();
            loadInitialData();
          }
        }}
        feeId={currentFeeId}
        clientId={formData.client_id || null}
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
    </div>
  );
}