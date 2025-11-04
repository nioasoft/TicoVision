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
import { Button } from '@/components/ui/button';
import { DollarSign, FileText, Users, TrendingUp, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { dashboardService } from '@/services/dashboard.service';
import { BudgetDetailDialog } from '@/components/BudgetDetailDialog';
import { formatILS, formatNumber, formatPercentage } from '@/lib/formatters';
import type { DashboardData } from '@/types/dashboard.types';

export function DashboardPage() {
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() + 1); // Default: next year (tax year)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);

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
      const response = await dashboardService.getDashboardData(selectedYear);
      if (response.error) {
        console.error('Error loading dashboard data:', response.error);
        return;
      }
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
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

      {/* KPI Cards */}
      {!isLoading && dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. תקן תקציב */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 rtl:text-right ltr:text-left">
                תקן תקציב לשנת מס {selectedYear}
              </CardTitle>
              <div className="p-2 rounded-lg bg-blue-100">
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">
                  {formatILS(dashboardData.budget_standard.total_with_vat)}
                </div>
                <p className="text-xs text-gray-500">
                  כולל מע"מ 18%
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsBudgetDialogOpen(true)}
                  className="w-full mt-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Info className="h-3 w-3 ml-1" />
                  לחץ לפירוט מלא
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 2. לקוחות שקיבלו מכתבים */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 rtl:text-right ltr:text-left">
                מכתבים נשלחו
              </CardTitle>
              <div className="p-2 rounded-lg bg-purple-100">
                <FileText className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatNumber(dashboardData.letter_stats.clients_sent_count)}
              </div>
              <p className="text-xs text-gray-500 mt-1">לקוחות קיבלו מכתבים</p>
            </CardContent>
          </Card>

          {/* 3. תשלומים - שילמו */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 rtl:text-right ltr:text-left">
                לקוחות ששילמו
              </CardTitle>
              <div className="p-2 rounded-lg bg-green-100">
                <Users className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-green-700">
                  {formatNumber(dashboardData.payment_stats.clients_paid_count)}
                </div>
                <p className="text-xs text-gray-500">
                  סכום: {formatILS(dashboardData.payment_stats.amount_collected)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 4. אחוז גביה */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 rtl:text-right ltr:text-left">
                אחוז גביה
              </CardTitle>
              <div className="p-2 rounded-lg bg-yellow-100">
                <TrendingUp className="h-4 w-4 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div
                  className={cn(
                    'text-2xl font-bold',
                    dashboardData.payment_stats.collection_rate_percent >= 80
                      ? 'text-green-700'
                      : dashboardData.payment_stats.collection_rate_percent >= 50
                      ? 'text-yellow-700'
                      : 'text-red-700'
                  )}
                >
                  {formatPercentage(dashboardData.payment_stats.collection_rate_percent)}
                </div>
                <p className="text-xs text-gray-500">
                  {formatNumber(dashboardData.payment_stats.clients_pending_count)} לקוחות
                  ממתינים
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !dashboardData && (
        <div className="text-center py-12">
          <p className="text-gray-500">אין נתונים להצגה עבור שנת מס {selectedYear}</p>
        </div>
      )}

      {/* Placeholder for Future Content */}
      {!isLoading && dashboardData && (
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

      {/* Budget Detail Dialog */}
      {dashboardData && (
        <BudgetDetailDialog
          open={isBudgetDialogOpen}
          onOpenChange={setIsBudgetDialogOpen}
          budget={dashboardData.budget_standard}
          taxYear={selectedYear}
        />
      )}
    </div>
  );
}
