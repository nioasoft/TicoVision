import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  FileText,
  Calendar,
  Plus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { clientService, type Client } from '@/services/client.service';
import { feeService, type FeeCalculation, type CreateFeeCalculationDto } from '@/services/fee.service';

interface FeeCalculatorForm {
  client_id: string;
  year: number;
  previous_year_amount: number;
  previous_year_discount: number;
  base_amount: number;
  inflation_rate: number;
  real_adjustment: number;
  real_adjustment_reason: string;
  discount_percentage: number;
  notes: string;
}

export function FeesPage() {
  const [activeTab, setActiveTab] = useState<'previous' | 'current' | 'results'>('previous');
  const [clients, setClients] = useState<Client[]>([]);
  const [feeCalculations, setFeeCalculations] = useState<FeeCalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<FeeCalculatorForm>({
    client_id: '',
    year: new Date().getFullYear(),
    previous_year_amount: 0,
    previous_year_discount: 0,
    base_amount: 0,
    inflation_rate: 3.0,
    real_adjustment: 0,
    real_adjustment_reason: '',
    discount_percentage: 0,
    notes: ''
  });
  const [calculationResults, setCalculationResults] = useState<{
    inflation_adjustment: number;
    real_adjustment: number;
    discount_amount: number;
    final_amount: number;
    vat_amount: number;
    total_with_vat: number;
  } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Auto-calculate when form data changes
    if (formData.base_amount > 0) {
      const results = calculateFeeAmounts();
      setCalculationResults(results);
    }
  }, [formData.base_amount, formData.inflation_rate, formData.real_adjustment, formData.discount_percentage]);

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
      console.error('Error loading data:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בטעינת הנתונים',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateFeeAmounts = () => {
    const inflationRate = formData.inflation_rate || 3.0;
    const realAdjustment = formData.real_adjustment || 0;
    const discountPercentage = formData.discount_percentage || 0;

    // Step 1: Apply inflation adjustment
    const inflationAdjustment = formData.base_amount * (inflationRate / 100);
    
    // Step 2: Add real adjustment
    const adjustedAmount = formData.base_amount + inflationAdjustment + realAdjustment;
    
    // Step 3: Apply discount
    const discountAmount = adjustedAmount * (discountPercentage / 100);
    const finalAmount = adjustedAmount - discountAmount;
    
    // Step 4: Calculate VAT (18% in Israel)
    const vatAmount = finalAmount * 0.18;
    const totalWithVat = finalAmount + vatAmount;

    return {
      inflation_adjustment: inflationAdjustment,
      real_adjustment: realAdjustment,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      vat_amount: vatAmount,
      total_with_vat: totalWithVat
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

      const response = await feeService.createFeeCalculation(createData);
      
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
        description: 'חישוב שכר הטרחה נשמר בהצלחה',
      });

      // Reset form and reload data
      resetForm();
      loadInitialData();
    } catch (error) {
      console.error('Error saving calculation:', error);
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
      base_amount: 0,
      inflation_rate: 3.0,
      real_adjustment: 0,
      real_adjustment_reason: '',
      discount_percentage: 0,
      notes: ''
    });
    setCalculationResults(null);
    setActiveTab('previous');
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
          <h1 className="text-3xl font-bold text-gray-900">מערכת חישוב שכר טרחה</h1>
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
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              מחשבון שכר טרחה {formData.year}
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
              נתוני שנה קודמת
            </button>
            <button
              className={`px-4 py-2 font-medium ${
                activeTab === 'current' 
                  ? 'border-b-2 border-primary text-primary' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('current')}
            >
              חישוב שנה נוכחית
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
              <h3 className="text-lg font-semibold mb-4">בחירת לקוח ונתוני שנה קודמת</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="client">בחירת לקוח *</Label>
                    <Select
                      value={formData.client_id}
                      onValueChange={(value) => setFormData({ ...formData, client_id: value })}
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

                  <div>
                    <Label htmlFor="year">שנת החישוב</Label>
                    <Input
                      id="year"
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                      min="2020"
                      max="2030"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="previous_amount">סכום שנה קודמת</Label>
                    <Input
                      id="previous_amount"
                      type="number"
                      value={formData.previous_year_amount}
                      onChange={(e) => setFormData({ ...formData, previous_year_amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="previous_discount">הנחה שנה קודמת (%)</Label>
                    <Input
                      id="previous_discount"
                      type="number"
                      value={formData.previous_year_discount}
                      onChange={(e) => setFormData({ ...formData, previous_year_discount: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setActiveTab('current')}>
                  המשך לחישוב נוכחי
                  <ChevronLeft className="h-4 w-4 mr-2" />
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'current' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold mb-4">חישוב שנה נוכחית</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="base_amount">סכום בסיס *</Label>
                    <Input
                      id="base_amount"
                      type="number"
                      value={formData.base_amount}
                      onChange={(e) => setFormData({ ...formData, base_amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <Label htmlFor="inflation_rate">אחוז מדד (%)</Label>
                    <Input
                      id="inflation_rate"
                      type="number"
                      value={formData.inflation_rate}
                      onChange={(e) => setFormData({ ...formData, inflation_rate: parseFloat(e.target.value) || 3.0 })}
                      step="0.1"
                      placeholder="3.0"
                    />
                    <p className="text-sm text-gray-500 mt-1">ברירת מחדל: 3%</p>
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">סכום בסיס</p>
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
                        <p className="text-sm text-gray-500">התאמת מדד ({formData.inflation_rate}%)</p>
                        <p className="text-lg font-semibold text-green-600">
                          +{formatCurrency(calculationResults.inflation_adjustment)}
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
                    <span>סכום בסיס:</span>
                    <span>{formatCurrency(formData.base_amount)}</span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>+ התאמת מדד ({formData.inflation_rate}%):</span>
                    <span>+{formatCurrency(calculationResults.inflation_adjustment)}</span>
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

      {/* Recent Calculations */}
      {feeCalculations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>חישובים אחרונים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {feeCalculations.map((calc) => (
                <div key={calc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{calc.year}</p>
                    <p className="text-sm text-gray-500">לקוח: {calc.client?.company_name || calc.client?.company_name_hebrew || calc.client_id}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">{formatCurrency(calc.total_amount || calc.final_amount || 0)}</p>
                    <Badge variant="outline">{calc.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}