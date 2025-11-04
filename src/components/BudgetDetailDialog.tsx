import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { BudgetStandard } from '@/types/dashboard.types';
import type { ClientBudgetRow } from '@/services/dashboard.service';
import { dashboardService } from '@/services/dashboard.service';
import { formatILS } from '@/lib/formatters';
import { BudgetBreakdownTable } from './BudgetBreakdownTable';

interface BudgetDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: BudgetStandard;
  taxYear: number;
}

/**
 * Dialog לפירוט תקן תקציב
 * מציג פירוט מלא של שכר טרחה + הנהלת חשבונות לפני ואחרי מע"מ
 * כולל tabs עם פירוט לקוחות
 */
export function BudgetDetailDialog({
  open,
  onOpenChange,
  budget,
  taxYear,
}: BudgetDetailDialogProps) {
  const [auditBreakdown, setAuditBreakdown] = useState<ClientBudgetRow[]>([]);
  const [bookkeepingBreakdown, setBookkeepingBreakdown] = useState<ClientBudgetRow[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [isLoadingBookkeeping, setIsLoadingBookkeeping] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

  // Load breakdown data when dialog opens or tab changes
  useEffect(() => {
    if (!open) return;

    const loadBreakdown = async () => {
      // Load audit breakdown
      if (activeTab === 'audit' && auditBreakdown.length === 0) {
        setIsLoadingAudit(true);
        const response = await dashboardService.getBudgetBreakdown(taxYear, 'audit');
        if (response.data) {
          setAuditBreakdown(response.data);
        }
        setIsLoadingAudit(false);
      }

      // Load bookkeeping breakdown
      if (activeTab === 'bookkeeping' && bookkeepingBreakdown.length === 0) {
        setIsLoadingBookkeeping(true);
        const response = await dashboardService.getBudgetBreakdown(taxYear, 'bookkeeping');
        if (response.data) {
          setBookkeepingBreakdown(response.data);
        }
        setIsLoadingBookkeeping(false);
      }
    };

    loadBreakdown();
  }, [open, activeTab, taxYear, auditBreakdown.length, bookkeepingBreakdown.length]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setActiveTab('summary');
      setAuditBreakdown([]);
      setBookkeepingBreakdown([]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto rtl:text-right ltr:text-left">
        <DialogHeader className="rtl:text-right ltr:text-left">
          <DialogTitle className="text-2xl rtl:text-right ltr:text-left">
            תקן תקציב לשנת {taxYear}
          </DialogTitle>
          <DialogDescription className="rtl:text-right ltr:text-left">
            פירוט מלא של חישובי שכר הטרחה והנהלת החשבונות
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary">סיכום</TabsTrigger>
            <TabsTrigger value="audit">שכר טרחה - לקוחות</TabsTrigger>
            <TabsTrigger value="bookkeeping">הנהלת חשבונות - לקוחות</TabsTrigger>
          </TabsList>

          {/* Tab 1: Summary */}
          <TabsContent value="summary" className="space-y-6 py-4">
            {/* שכר טרחה */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-blue-700 rtl:text-right ltr:text-left">
                שכר טרחה
              </h3>
              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">לפני מע"מ:</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatILS(budget.audit_before_vat)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">כולל מע"מ (18%):</span>
                  <span className="text-lg font-semibold text-blue-700">
                    {formatILS(budget.audit_with_vat)}
                  </span>
                </div>
              </div>
            </div>

            {/* הנהלת חשבונות */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-purple-700 rtl:text-right ltr:text-left">
                הנהלת חשבונות
              </h3>
              <div className="bg-purple-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">לפני מע"מ:</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatILS(budget.bookkeeping_before_vat)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">כולל מע"מ (18%):</span>
                  <span className="text-lg font-semibold text-purple-700">
                    {formatILS(budget.bookkeeping_with_vat)}
                  </span>
                </div>
              </div>
            </div>

            {/* Separator */}
            <div className="border-t-2 border-gray-300"></div>

            {/* סה"כ תקן תקציב */}
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-gray-900 rtl:text-right ltr:text-left">
                סה"כ תקן תקציב
              </h3>
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-lg space-y-2 border-2 border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">לפני מע"מ:</span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatILS(budget.total_before_vat)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    כולל מע"מ (18%):
                  </span>
                  <span className="text-2xl font-bold text-blue-700">
                    {formatILS(budget.total_with_vat)}
                  </span>
                </div>
              </div>
            </div>

            {/* הערה */}
            <div className="text-xs text-gray-500 rtl:text-right ltr:text-left border-t pt-3">
              <p>
                * תקן התקציב מחושב מסך כל חישובי שכר הטרחה והנהלת החשבונות עבור שנת {taxYear}
              </p>
              <p className="mt-1">* אחוז מע"מ: 18% (תקף לשנת 2025 ואילך)</p>
            </div>
          </TabsContent>

          {/* Tab 2: Audit Breakdown */}
          <TabsContent value="audit" className="py-4">
            <BudgetBreakdownTable
              data={auditBreakdown}
              type="audit"
              isLoading={isLoadingAudit}
            />
          </TabsContent>

          {/* Tab 3: Bookkeeping Breakdown */}
          <TabsContent value="bookkeeping" className="py-4">
            <BudgetBreakdownTable
              data={bookkeepingBreakdown}
              type="bookkeeping"
              isLoading={isLoadingBookkeeping}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
