/**
 * Collection Reports Page
 * Shows various reports for collection management with export capabilities
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowRight,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Users,
  Banknote,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { formatILS, formatIsraeliDate } from '@/lib/formatters';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ReportRow {
  client_id: string;
  client_name: string;
  company_name_hebrew?: string;
  contact_email?: string;
  amount_original: number;
  amount_after_discount?: number;
  payment_method?: string;
  letter_sent_date: string;
  days_since_sent: number;
  status: string;
}

interface AgingBucket {
  label: string;
  range: string;
  min_days: number;
  max_days: number;
  count: number;
  total_amount: number;
  percentage: number;
}

interface CollectionSummary {
  total_sent: number;
  total_amount_sent: number;
  total_collected: number;
  total_pending: number;
  collection_rate: number;
  clients_paid: number;
  clients_pending: number;
}

type ReportType = 'unpaid' | 'summary' | 'aging';

export const CollectionReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [reportType, setReportType] = useState<ReportType>('unpaid');
  const [loading, setLoading] = useState(false);
  const [unpaidClients, setUnpaidClients] = useState<ReportRow[]>([]);
  const [summary, setSummary] = useState<CollectionSummary | null>(null);
  const [agingBuckets, setAgingBuckets] = useState<AgingBucket[]>([]);

  // Fetch report data
  const fetchReportData = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tenantId = user.user_metadata?.tenant_id;
      if (!tenantId) return;

      // Fetch unpaid clients
      const { data: unpaidData } = await supabase
        .from('collection_dashboard_view')
        .select('*')
        .eq('tenant_id', tenantId)
        .not('payment_status', 'in', '("paid","cancelled")')
        .order('letter_sent_date', { ascending: true });

      const now = new Date();
      const unpaidRows: ReportRow[] = (unpaidData || []).map((row) => ({
        client_id: row.client_id,
        client_name: row.company_name,
        company_name_hebrew: row.company_name_hebrew,
        contact_email: row.contact_email,
        amount_original: Number(row.amount_original),
        amount_after_discount: row.amount_after_selected_discount
          ? Number(row.amount_after_selected_discount)
          : undefined,
        payment_method: row.payment_method_selected,
        letter_sent_date: row.letter_sent_date,
        days_since_sent: Math.floor(
          (now.getTime() - new Date(row.letter_sent_date).getTime()) / (1000 * 60 * 60 * 24)
        ),
        status: row.payment_status,
      }));

      setUnpaidClients(unpaidRows);

      // Calculate summary
      const { data: allFees } = await supabase
        .from('fee_calculations')
        .select('status, total_amount, partial_payment_amount')
        .eq('tenant_id', tenantId)
        .not('status', 'eq', 'draft');

      if (allFees) {
        const total_amount_sent = allFees.reduce((sum, f) => sum + Number(f.total_amount), 0);
        const total_collected = allFees
          .filter((f) => f.status === 'paid')
          .reduce((sum, f) => sum + Number(f.total_amount), 0);
        const total_pending = total_amount_sent - total_collected;
        const clients_paid = allFees.filter((f) => f.status === 'paid').length;
        const clients_pending = allFees.filter((f) => f.status !== 'paid' && f.status !== 'cancelled').length;

        setSummary({
          total_sent: allFees.length,
          total_amount_sent,
          total_collected,
          total_pending,
          collection_rate: total_amount_sent > 0 ? (total_collected / total_amount_sent) * 100 : 0,
          clients_paid,
          clients_pending,
        });
      }

      // Calculate aging buckets
      const agingDefs: Omit<AgingBucket, 'count' | 'total_amount' | 'percentage'>[] = [
        { label: '0-7 ימים', range: '0-7', min_days: 0, max_days: 7 },
        { label: '8-14 ימים', range: '8-14', min_days: 8, max_days: 14 },
        { label: '15-30 ימים', range: '15-30', min_days: 15, max_days: 30 },
        { label: '31-60 ימים', range: '31-60', min_days: 31, max_days: 60 },
        { label: '60+ ימים', range: '60+', min_days: 61, max_days: 999999 },
      ];

      const totalPending = unpaidRows.reduce((sum, r) => sum + (r.amount_after_discount || r.amount_original), 0);

      const buckets: AgingBucket[] = agingDefs.map((def) => {
        const matching = unpaidRows.filter(
          (r) => r.days_since_sent >= def.min_days && r.days_since_sent <= def.max_days
        );
        const bucketAmount = matching.reduce((sum, r) => sum + (r.amount_after_discount || r.amount_original), 0);
        return {
          ...def,
          count: matching.length,
          total_amount: bucketAmount,
          percentage: totalPending > 0 ? (bucketAmount / totalPending) * 100 : 0,
        };
      });

      setAgingBuckets(buckets);
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  // Export to Excel (CSV)
  const exportToExcel = () => {
    try {
      let csvContent = '';
      let filename = '';

      if (reportType === 'unpaid') {
        csvContent = 'שם לקוח,אימייל,סכום מקורי,סכום לגביה,אמצעי תשלום,תאריך משלוח,ימים,סטטוס\n';
        unpaidClients.forEach((row) => {
          csvContent += `"${row.company_name_hebrew || row.client_name}","${row.contact_email || ''}",${row.amount_original},${row.amount_after_discount || row.amount_original},"${row.payment_method || 'לא נבחר'}","${formatIsraeliDate(row.letter_sent_date)}",${row.days_since_sent},"${row.status}"\n`;
        });
        filename = `unpaid_clients_${new Date().toISOString().split('T')[0]}.csv`;
      } else if (reportType === 'summary' && summary) {
        csvContent = 'מדד,ערך\n';
        csvContent += `סה"כ מכתבים נשלחו,${summary.total_sent}\n`;
        csvContent += `סה"כ סכום נשלח,${summary.total_amount_sent}\n`;
        csvContent += `סה"כ נגבה,${summary.total_collected}\n`;
        csvContent += `סה"כ ממתין,${summary.total_pending}\n`;
        csvContent += `אחוז גביה,${summary.collection_rate.toFixed(1)}%\n`;
        csvContent += `לקוחות ששילמו,${summary.clients_paid}\n`;
        csvContent += `לקוחות ממתינים,${summary.clients_pending}\n`;
        filename = `collection_summary_${new Date().toISOString().split('T')[0]}.csv`;
      } else if (reportType === 'aging') {
        csvContent = 'טווח ימים,מספר לקוחות,סכום,אחוז\n';
        agingBuckets.forEach((bucket) => {
          csvContent += `"${bucket.label}",${bucket.count},${bucket.total_amount},${bucket.percentage.toFixed(1)}%\n`;
        });
        filename = `aging_report_${new Date().toISOString().split('T')[0]}.csv`;
      }

      // Add BOM for Hebrew support in Excel
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();

      toast.success('הקובץ יורד בהצלחה');
    } catch (error) {
      toast.error('שגיאה בייצוא');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="rtl:text-right">
          <h1 className="text-3xl font-bold rtl:text-right">דוחות גביה</h1>
          <p className="text-gray-500 rtl:text-right">צפייה וייצוא דוחות גביה</p>
        </div>
        <div className="flex gap-2 rtl:flex-row-reverse">
          <Button
            variant="outline"
            onClick={fetchReportData}
            disabled={loading}
            className="rtl:flex-row-reverse gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            <span>רענון</span>
          </Button>
          <Button onClick={() => navigate('/collections')} className="rtl:flex-row-reverse gap-2">
            <ArrowRight className="h-4 w-4" />
            <span>חזרה לגביה</span>
          </Button>
        </div>
      </div>

      {/* Report Type Selector */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between rtl:flex-row-reverse">
            <div>
              <CardTitle className="rtl:text-right">בחירת דוח</CardTitle>
              <CardDescription className="rtl:text-right">בחר את סוג הדוח להצגה</CardDescription>
            </div>
            <div className="flex gap-2 rtl:flex-row-reverse">
              <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">לקוחות שטרם שילמו</SelectItem>
                  <SelectItem value="summary">סיכום גביה</SelectItem>
                  <SelectItem value="aging">דוח גיול</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={exportToExcel} className="rtl:flex-row-reverse gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                <span>ייצוא לאקסל</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Report Content */}
      {reportType === 'unpaid' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 rtl:flex-row-reverse">
              <div className="p-2 rounded-lg bg-red-50 text-red-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="rtl:text-right">לקוחות שטרם שילמו</CardTitle>
                <CardDescription className="rtl:text-right">
                  {unpaidClients.length} לקוחות | סה"כ{' '}
                  {formatILS(
                    unpaidClients.reduce(
                      (sum, r) => sum + (r.amount_after_discount || r.amount_original),
                      0
                    )
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="rtl:text-right">שם לקוח</TableHead>
                    <TableHead className="rtl:text-right">סכום</TableHead>
                    <TableHead className="rtl:text-right">אמצעי תשלום</TableHead>
                    <TableHead className="rtl:text-right">תאריך משלוח</TableHead>
                    <TableHead className="rtl:text-right">ימים</TableHead>
                    <TableHead className="rtl:text-right">סטטוס</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unpaidClients.map((row) => (
                    <TableRow key={row.client_id}>
                      <TableCell className="rtl:text-right">
                        <div>
                          <div className="font-medium">{row.company_name_hebrew || row.client_name}</div>
                          <div className="text-xs text-gray-500">{row.contact_email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="rtl:text-right font-medium">
                        {formatILS(row.amount_after_discount || row.amount_original)}
                      </TableCell>
                      <TableCell className="rtl:text-right">
                        {row.payment_method || <span className="text-gray-400">לא נבחר</span>}
                      </TableCell>
                      <TableCell className="rtl:text-right">
                        {formatIsraeliDate(row.letter_sent_date)}
                      </TableCell>
                      <TableCell className="rtl:text-right">
                        <Badge variant={row.days_since_sent > 14 ? 'destructive' : 'secondary'}>
                          {row.days_since_sent} ימים
                        </Badge>
                      </TableCell>
                      <TableCell className="rtl:text-right">
                        <Badge variant="outline">{row.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {unpaidClients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        אין לקוחות ממתינים לתשלום
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {reportType === 'summary' && summary && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between rtl:flex-row-reverse">
                  <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold rtl:text-right">{summary.total_sent}</div>
                <div className="text-sm text-gray-500 rtl:text-right">מכתבים נשלחו</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between rtl:flex-row-reverse">
                  <div className="p-2 rounded-lg bg-green-50 text-green-600">
                    <Banknote className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold rtl:text-right text-green-600">
                  {formatILS(summary.total_collected)}
                </div>
                <div className="text-sm text-gray-500 rtl:text-right">נגבה</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between rtl:flex-row-reverse">
                  <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold rtl:text-right text-orange-600">
                  {formatILS(summary.total_pending)}
                </div>
                <div className="text-sm text-gray-500 rtl:text-right">ממתין</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between rtl:flex-row-reverse">
                  <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    'text-2xl font-bold rtl:text-right',
                    summary.collection_rate >= 80 ? 'text-green-600' : 'text-orange-600'
                  )}
                >
                  {summary.collection_rate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500 rtl:text-right">אחוז גביה</div>
              </CardContent>
            </Card>
          </div>

          {/* Details Table */}
          <Card>
            <CardHeader>
              <CardTitle className="rtl:text-right">פירוט סיכום</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium rtl:text-right">סה"כ סכום מכתבים</TableCell>
                      <TableCell className="rtl:text-right">{formatILS(summary.total_amount_sent)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium rtl:text-right">סה"כ נגבה</TableCell>
                      <TableCell className="rtl:text-right text-green-600">
                        {formatILS(summary.total_collected)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium rtl:text-right">סה"כ ממתין</TableCell>
                      <TableCell className="rtl:text-right text-orange-600">
                        {formatILS(summary.total_pending)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium rtl:text-right">לקוחות ששילמו</TableCell>
                      <TableCell className="rtl:text-right">{summary.clients_paid}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium rtl:text-right">לקוחות ממתינים</TableCell>
                      <TableCell className="rtl:text-right">{summary.clients_pending}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {reportType === 'aging' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 rtl:flex-row-reverse">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="rtl:text-right">דוח גיול חובות</CardTitle>
                <CardDescription className="rtl:text-right">חלוקת חובות לפי ימים מאז המשלוח</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="rtl:text-right">טווח ימים</TableHead>
                    <TableHead className="rtl:text-right">מספר לקוחות</TableHead>
                    <TableHead className="rtl:text-right">סכום</TableHead>
                    <TableHead className="rtl:text-right">אחוז</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agingBuckets.map((bucket) => (
                    <TableRow key={bucket.range}>
                      <TableCell className="rtl:text-right font-medium">{bucket.label}</TableCell>
                      <TableCell className="rtl:text-right">
                        <Badge variant={bucket.count > 0 ? 'default' : 'secondary'}>{bucket.count}</Badge>
                      </TableCell>
                      <TableCell className="rtl:text-right font-medium">
                        {formatILS(bucket.total_amount)}
                      </TableCell>
                      <TableCell className="rtl:text-right">
                        <div className="flex items-center gap-2 rtl:flex-row-reverse">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${bucket.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm">{bucket.percentage.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

CollectionReportsPage.displayName = 'CollectionReportsPage';
