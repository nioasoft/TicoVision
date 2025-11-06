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
import { PaymentMethodBreakdownCard } from '@/components/PaymentMethodBreakdownCard';
import type { BudgetByCategory, PaymentMethodBreakdown } from '@/types/dashboard.types';

export function DashboardPage() {
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() + 1); // Default: next year (tax year)
  const [budgetBreakdown, setBudgetBreakdown] = useState<BudgetByCategory | null>(null);
  const [paymentMethodBreakdown, setPaymentMethodBreakdown] = useState<PaymentMethodBreakdown | null>(null);

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

      // טעינת פירוט אמצעי תשלום
      const paymentMethodResponse = await dashboardService.getPaymentMethodBreakdown(selectedYear);
      if (paymentMethodResponse.error) {
        console.error('Error loading payment method breakdown:', paymentMethodResponse.error);
      } else {
        setPaymentMethodBreakdown(paymentMethodResponse.data);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Year Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 rtl:text-right ltr:text-left">
            לוח בקרה
          </h1>
          <p className="text-gray-500 mt-1 rtl:text-right ltr:text-left">
            סקירה כללית של המערכת
          </p>
        </div>

        {/* Tax Year Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">שנת מס:</span>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-[120px]">
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
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <p className="text-gray-500">טוען נתונים...</p>
        </div>
      )}

      {/* פירוט תקציב לפי קטגוריות */}
      {!isLoading && budgetBreakdown && (
        <BudgetBreakdownSection
          breakdown={budgetBreakdown}
          taxYear={selectedYear}
        />
      )}

      {/* פירוט אמצעי תשלום */}
      {!isLoading && paymentMethodBreakdown && (
        <PaymentMethodBreakdownCard
          breakdown={paymentMethodBreakdown}
          taxYear={selectedYear}
        />
      )}

      {/* Empty State */}
      {!isLoading && !budgetBreakdown && (
        <div className="text-center py-12">
          <p className="text-gray-500">אין נתונים להצגה עבור שנת מס {selectedYear}</p>
        </div>
      )}

      {/* Placeholder for Future Content */}
      {!isLoading && budgetBreakdown && (
        <Card className="border-dashed border-2 border-gray-300">
          <CardHeader>
            <CardTitle className="text-gray-400 rtl:text-right ltr:text-left">
              מקום למודולים נוספים
            </CardTitle>
            <CardDescription className="rtl:text-right ltr:text-left">
              כאן יתווספו גרפים וסטטיסטיקות נוספות בעתיד
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-32 flex items-center justify-center text-gray-400">
              <p className="text-sm">שטח פנוי לתוספות עתידיות</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
