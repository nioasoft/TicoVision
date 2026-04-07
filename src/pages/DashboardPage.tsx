import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { dashboardService } from '@/services/dashboard.service';
import { BudgetBreakdownSection } from '@/components/BudgetBreakdownSection';
import { BudgetWithActualsCard } from '@/components/dashboard/BudgetWithActualsCard';
import { PaymentMethodBreakdownEnhanced } from '@/components/dashboard/PaymentMethodBreakdownEnhanced';
import { ClientListPopup } from '@/components/dashboard/ClientListPopup';
import { PageHeader } from '@/components/ui/page-header';
import type { BudgetByCategory } from '@/types/dashboard.types';

export function DashboardPage() {
  // State management
  const [isLoading, setIsLoading] = useState(true);

  // Get saved fiscal year from localStorage, fallback to current year
  const getFiscalYearDefault = () => {
    const saved = localStorage.getItem('dashboard_fiscal_year');
    if (saved) {
      const year = parseInt(saved, 10);
      if (!isNaN(year) && year >= 2020 && year <= 2100) return year;
    }
    return new Date().getFullYear(); // Current year (2026)
  };

  const [selectedYear, setSelectedYear] = useState(getFiscalYearDefault());
  const [budgetBreakdown, setBudgetBreakdown] = useState<BudgetByCategory | null>(null);
  const [budgetPopupType, setBudgetPopupType] = useState<'standard' | 'actuals' | 'remaining' | null>(null);
  const [budgetClients, setBudgetClients] = useState<Array<{
    clientId: string;
    clientName: string;
    originalAmount: number;
    expectedAmount?: number;
    actualAmount?: number;
  }>>([]);
  const [budgetTotals, setBudgetTotals] = useState({ beforeVat: 0, withVat: 0 });

  // Available years for selection (current year - 1 to current year + 2)
  const currentYear = new Date().getFullYear();
  const availableYears = [
    currentYear - 1,
    currentYear,
    currentYear + 1,
    currentYear + 2,
  ];

  // Load dashboard data when year changes
  useEffect(() => {
    loadDashboardData();
  }, [selectedYear]);

  // Save selected year to localStorage
  useEffect(() => {
    localStorage.setItem('dashboard_fiscal_year', selectedYear.toString());
  }, [selectedYear]);

  const loadDashboardData = async () => {
    setIsLoading(true);

    try {
      // טעינת פירוט תקציב מפורט
      const breakdownResponse = await dashboardService.getBudgetByCategory(selectedYear);
      if (breakdownResponse.error) {
        console.error('Error loading budget breakdown:', breakdownResponse.error);
      } else {
        setBudgetBreakdown(breakdownResponse.data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBudgetClick = async (type: 'standard' | 'actuals' | 'remaining') => {
    // Fetch client list for the selected type
    try {
      if (type === 'standard') {
        // Get all clients with their budget standard
        const { data: auditClients } = await dashboardService.getBudgetBreakdown(selectedYear, 'audit');
        const { data: bookkeepingClients } = await dashboardService.getBudgetBreakdown(selectedYear, 'bookkeeping');

        const allClients = [
          ...(auditClients || []).map(c => ({
            clientId: c.client_id,
            clientName: c.client_name,
            originalAmount: c.amount_before_vat,
          })),
          ...(bookkeepingClients || []).map(c => ({
            clientId: c.client_id,
            clientName: c.client_name,
            originalAmount: c.amount_before_vat,
          }))
        ];

        const totalBeforeVat = allClients.reduce((sum, c) => sum + c.originalAmount, 0);
        const totalWithVat = totalBeforeVat * 1.18;

        setBudgetClients(allClients);
        setBudgetTotals({ beforeVat: totalBeforeVat, withVat: totalWithVat });
        setBudgetPopupType(type);
      } else {
        // For actuals and remaining, we'll need to fetch actual payments
        // This will be implemented when we have the actual_payments data
        setBudgetClients([]);
        setBudgetTotals({ beforeVat: 0, withVat: 0 });
        setBudgetPopupType(type);
      }
    } catch (error) {
      console.error('Error loading client list:', error);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader
        eyebrow="סקירה פיננסית"
        title="לוח בקרה"
        description="מבט מרוכז על התקציב, הגבייה והתפלגות אמצעי התשלום לשנת המס הנבחרת."
        actions={
          <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
            <span className="text-sm font-medium text-muted-foreground">שנת מס</span>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-[130px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Loading State */}
      {isLoading && (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
          <p className="text-slate-500">טוען נתונים...</p>
        </div>
      )}

      {/* Budget with Actuals Card - NEW */}
      {!isLoading && (
        <BudgetWithActualsCard
          year={selectedYear}
          onClientListClick={handleBudgetClick}
        />
      )}

      {/* Payment Method Breakdown - ENHANCED */}
      {!isLoading && (
        <PaymentMethodBreakdownEnhanced year={selectedYear} />
      )}

      {/* פירוט תקציב לפי קטגוריות */}
      {!isLoading && budgetBreakdown && (
        <BudgetBreakdownSection
          breakdown={budgetBreakdown}
          taxYear={selectedYear}
        />
      )}

      {/* Empty State */}
      {!isLoading && !budgetBreakdown && (
        <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
          <p className="text-slate-500">אין נתונים להצגה עבור שנת מס {selectedYear}</p>
        </div>
      )}

      {!isLoading && budgetBreakdown && (
        <Card className="rounded-2xl border-slate-200 bg-slate-50/70 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-800 rtl:text-right ltr:text-left">
              אזורים נוספים בדרך
            </CardTitle>
            <CardDescription className="rtl:text-right ltr:text-left">
              בהמשך יתווספו לכאן גרפים, מגמות וכלי ניתוח משלימים עבור הדשבורד.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-500 rtl:text-right ltr:text-left">
              כרגע הדשבורד מתמקד בתקציב, גבייה והתפלגות אמצעי תשלום.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget client list popup */}
      {budgetPopupType && (
        <ClientListPopup
          open={true}
          onOpenChange={() => setBudgetPopupType(null)}
          title={
            budgetPopupType === 'standard' ? 'תקציב תקן - כל הלקוחות' :
            budgetPopupType === 'actuals' ? 'גביה בפועל - לקוחות ששילמו' :
            'יתרה לגביה - לקוחות שטרם שילמו'
          }
          clients={budgetClients}
          totalBeforeVat={budgetTotals.beforeVat}
          totalWithVat={budgetTotals.withVat}
        />
      )}
    </div>
  );
}
