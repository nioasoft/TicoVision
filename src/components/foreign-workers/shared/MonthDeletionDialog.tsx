/**
 * MonthDeletionDialog
 * Confirmation dialog for deleting old monthly data when extending range
 * Shows preview of data that will be deleted
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Calendar, Trash2, Users, DollarSign, FileText } from 'lucide-react';
import { useMonthRange } from '@/contexts/MonthRangeContext';
import { MonthlyDataService } from '@/services/monthly-data.service';
import { formatILS } from '@/lib/formatters';

export function MonthDeletionDialog() {
  const { pendingDeletion, confirmDeletion, cancelDeletion, isLoading } = useMonthRange();

  if (!pendingDeletion) {
    return null;
  }

  const { monthsToDelete, preview, newStartMonth, newEndMonth } = pendingDeletion;

  // Group reports by type
  const turnoverReports = preview.clientReports.filter(r => r.reportType === 'accountant_turnover');
  const workersReports = preview.clientReports.filter(r => r.reportType === 'israeli_workers');

  // Calculate totals
  const totalTurnover = turnoverReports.reduce((sum, r) => sum + (r.turnoverAmount || 0), 0);
  const totalSalaryData = preview.workerData.reduce((sum, r) => sum + r.salary + r.supplement, 0);

  return (
    <Dialog open={!!pendingDeletion} onOpenChange={(open) => !open && cancelDeletion()}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5" />
            אישור מחיקת נתונים ישנים
          </DialogTitle>
          <DialogDescription>
            הוספת חודשים חדשים תמחק נתונים ישנים כדי לשמור על מגבלת 14 חודשים
          </DialogDescription>
        </DialogHeader>

        {/* Summary */}
        <div className="space-y-4">
          {/* Month range info */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">טווח חדש:</span>
            </div>
            <Badge variant="outline">
              {MonthlyDataService.dateToHebrew(newStartMonth)} - {MonthlyDataService.dateToHebrew(newEndMonth)}
            </Badge>
          </div>

          {/* Months to delete */}
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-red-700">
                חודשים שיימחקו ({monthsToDelete.length}):
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {monthsToDelete.map((date, idx) => (
                <Badge key={idx} variant="destructive" className="text-xs">
                  {MonthlyDataService.dateToHebrew(date)}
                </Badge>
              ))}
            </div>
          </div>

          {/* Data preview tabs */}
          {(preview.summary.totalClientReports > 0 || preview.summary.totalWorkerRecords > 0) && (
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="summary">סיכום</TabsTrigger>
                <TabsTrigger value="turnover" disabled={turnoverReports.length === 0}>
                  מחזור ({turnoverReports.length})
                </TabsTrigger>
                <TabsTrigger value="workers" disabled={workersReports.length === 0}>
                  ישראלים ({workersReports.length})
                </TabsTrigger>
                <TabsTrigger value="salary" disabled={preview.workerData.length === 0}>
                  שכר ({preview.workerData.length})
                </TabsTrigger>
              </TabsList>

              {/* Summary Tab */}
              <TabsContent value="summary" className="mt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <FileText className="h-5 w-5 mx-auto mb-2 text-blue-500" />
                    <div className="text-2xl font-bold text-blue-700">
                      {turnoverReports.length}
                    </div>
                    <div className="text-xs text-blue-600">רשומות מחזור</div>
                    {totalTurnover > 0 && (
                      <div className="text-xs text-blue-500 mt-1">
                        {formatILS(totalTurnover)}
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-purple-50 rounded-lg text-center">
                    <Users className="h-5 w-5 mx-auto mb-2 text-purple-500" />
                    <div className="text-2xl font-bold text-purple-700">
                      {workersReports.length}
                    </div>
                    <div className="text-xs text-purple-600">רשומות ישראלים</div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <DollarSign className="h-5 w-5 mx-auto mb-2 text-green-500" />
                    <div className="text-2xl font-bold text-green-700">
                      {preview.workerData.length}
                    </div>
                    <div className="text-xs text-green-600">רשומות שכר</div>
                    {totalSalaryData > 0 && (
                      <div className="text-xs text-green-500 mt-1">
                        {formatILS(totalSalaryData)}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Turnover Reports Tab */}
              <TabsContent value="turnover" className="mt-4">
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {turnoverReports.map((report, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="text-sm">{MonthlyDataService.dateToHebrew(report.monthDate)}</span>
                        <span className="text-sm font-medium">
                          {formatILS(report.turnoverAmount || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Israeli Workers Tab */}
              <TabsContent value="workers" className="mt-4">
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {workersReports.map((report, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-muted rounded">
                        <span className="text-sm">{MonthlyDataService.dateToHebrew(report.monthDate)}</span>
                        <span className="text-sm font-medium">
                          {report.employeeCount} עובדים
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Salary Data Tab */}
              <TabsContent value="salary" className="mt-4">
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {preview.workerData.map((worker, idx) => (
                      <div key={idx} className="flex justify-between items-center p-2 bg-muted rounded">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{worker.workerName}</span>
                          <span className="text-xs text-muted-foreground">
                            {MonthlyDataService.dateToHebrew(worker.monthDate)}
                          </span>
                        </div>
                        <div className="text-left">
                          <span className="text-sm">
                            {formatILS(worker.salary + worker.supplement)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}

          {/* No data message */}
          {preview.summary.totalClientReports === 0 && preview.summary.totalWorkerRecords === 0 && (
            <div className="p-4 text-center text-muted-foreground">
              אין נתונים לתצוגה מקדימה - החודשים הישנים ריקים
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={cancelDeletion}
            disabled={isLoading}
          >
            ביטול
          </Button>
          <Button
            variant="destructive"
            onClick={confirmDeletion}
            disabled={isLoading}
          >
            {isLoading ? 'מוחק...' : 'מחק והמשך'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
