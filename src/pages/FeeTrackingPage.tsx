/**
 * Fee Tracking Page (מעקב שכר טרחה)
 * Shows all clients and their fee calculation/letter/payment status for a tax year
 *
 * Critical feature to ensure NO clients are missed:
 * - Track who has calculations vs who doesn't
 * - Track who received letters vs who didn't
 * - Track payment status
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  RefreshCw,
  Calculator,
  Eye,
  Mail,
  Edit2,
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  FileText,
  Users,
  TrendingUp,
} from 'lucide-react';
import { feeTrackingService } from '@/services/fee-tracking.service';
import type {
  FeeTrackingRow,
  FeeTrackingKPIs,
  TrackingFilter,
  PaymentStatus,
} from '@/types/fee-tracking.types';
import { formatILS, formatNumber, formatPercentage } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export function FeeTrackingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() + 1); // Default: next year
  const [kpis, setKpis] = useState<FeeTrackingKPIs | null>(null);
  const [clients, setClients] = useState<FeeTrackingRow[]>([]);
  const [filteredClients, setFilteredClients] = useState<FeeTrackingRow[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<TrackingFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState<TrackingFilter>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Available years
  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  // Load data on mount and when year changes
  useEffect(() => {
    loadTrackingData();
  }, [selectedYear]);

  // Apply filters when data or filters change
  useEffect(() => {
    applyFilters();
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [clients, statusFilter, searchQuery]);

  /**
   * Load tracking data from service
   */
  const loadTrackingData = async () => {
    setLoading(true);
    try {
      const response = await feeTrackingService.getTrackingData(selectedYear);

      if (response.error) {
        toast({
          title: 'שגיאה בטעינת נתונים',
          description: response.error.message,
          variant: 'destructive',
        });
        return;
      }

      if (response.data) {
        setKpis(response.data.kpis);
        setClients(response.data.clients);
      }
    } catch (error) {
      console.error('Error loading tracking data:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בטעינת הנתונים',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle filter change (from card click or select dropdown)
   */
  const handleFilterChange = (filter: TrackingFilter) => {
    setStatusFilter(filter);
    setSelectedCard(filter);
  };

  /**
   * Pagination calculations
   */
  const totalPages = Math.ceil(filteredClients.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedClients = filteredClients.slice(startIndex, endIndex);

  /**
   * Get page numbers for pagination UI
   * Shows: 1 ... 3 4 5 ... 10 (for current page 4)
   */
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      // Show all pages if 7 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show: 1 ... currentPage-1 currentPage currentPage+1 ... totalPages
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(totalPages - 1, currentPage + 1);
        i++
      ) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  /**
   * Apply filters to client list
   */
  const applyFilters = () => {
    let filtered = [...clients];

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((client) => {
        switch (statusFilter) {
          case 'not_calculated':
            return client.payment_status === 'not_calculated';
          case 'calculated_not_sent':
            return client.payment_status === 'not_sent';
          case 'sent_not_paid':
            return (
              client.payment_status === 'pending' || client.payment_status === 'partial_paid'
            );
          case 'paid':
            return client.payment_status === 'paid';
          default:
            return true;
        }
      });
    }

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (client) =>
          client.client_name.toLowerCase().includes(query) ||
          client.client_name_hebrew?.toLowerCase().includes(query) ||
          client.tax_id.includes(query)
      );
    }

    setFilteredClients(filtered);
  };

  /**
   * Get status badge for payment status (Compact)
   */
  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'not_calculated':
        return (
          <Badge variant="destructive" className="gap-0.5 text-[10px] py-0 px-1.5">
            <XCircle className="h-2.5 w-2.5" />
            לא חושב
          </Badge>
        );
      case 'not_sent':
        return (
          <Badge variant="secondary" className="gap-0.5 bg-orange-100 text-orange-800 text-[10px] py-0 px-1.5">
            <AlertTriangle className="h-2.5 w-2.5" />
            חושב, לא נשלח
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-0.5 bg-yellow-100 text-yellow-800 text-[10px] py-0 px-1.5">
            <Clock className="h-2.5 w-2.5" />
            ממתין לתשלום
          </Badge>
        );
      case 'partial_paid':
        return (
          <Badge variant="secondary" className="gap-0.5 bg-blue-100 text-blue-800 text-[10px] py-0 px-1.5">
            <Clock className="h-2.5 w-2.5" />
            שולם חלקית
          </Badge>
        );
      case 'paid':
        return (
          <Badge variant="secondary" className="gap-0.5 bg-green-100 text-green-800 text-[10px] py-0 px-1.5">
            <CheckCircle2 className="h-2.5 w-2.5" />
            שולם
          </Badge>
        );
    }
  };

  /**
   * Action handlers
   */
  const handleCalculate = (clientId: string) => {
    navigate(`/fees/calculate?client=${clientId}&year=${selectedYear}`);
  };

  const handlePreviewLetter = (calculationId: string) => {
    // TODO: Open LetterPreviewDialog
    toast({
      title: 'תצוגה מקדימה',
      description: 'פונקציה זו תיושם בשלב הבא',
    });
  };

  const handleSendLetter = async (calculationId: string) => {
    // TODO: Send letter directly
    toast({
      title: 'שליחת מכתב',
      description: 'פונקציה זו תיושם בשלב הבא',
    });
  };

  const handleEditCalculation = (calculationId: string, clientId: string) => {
    navigate(`/fees/calculate?client=${clientId}&year=${selectedYear}&edit=${calculationId}`);
  };

  const handleSendReminder = async (letterId: string) => {
    // TODO: Send reminder
    toast({
      title: 'שליחת תזכורת',
      description: 'פונקציה זו תיושם בשלב הבא',
    });
  };

  const handleViewLetter = (letterId: string) => {
    // TODO: View sent letter
    toast({
      title: 'צפייה במכתב',
      description: 'פונקציה זו תיושם בשלב הבא',
    });
  };

  const handleMarkAsPaid = (calculationId: string) => {
    // TODO: Mark as paid
    toast({
      title: 'סימון כשולם',
      description: 'פונקציה זו תיושם בשלב הבא',
    });
  };

  /**
   * Render action buttons based on client status (Compact)
   */
  const renderActions = (client: FeeTrackingRow) => {
    const { payment_status, calculation_id, letter_id, client_id } = client;

    switch (payment_status) {
      case 'not_calculated':
        return (
          <Button
            size="sm"
            variant="default"
            className="h-7 px-2 text-xs"
            onClick={() => handleCalculate(client_id)}
          >
            <Calculator className="h-3 w-3 mr-1" />
            חשב שכר טרחה
          </Button>
        );

      case 'not_sent':
        return (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => calculation_id && handlePreviewLetter(calculation_id)}
            >
              <Eye className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="default"
              className="h-7 px-2 text-xs"
              onClick={() => calculation_id && handleSendLetter(calculation_id)}
            >
              <Mail className="h-3 w-3 mr-1" />
              שלח
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => calculation_id && handleEditCalculation(calculation_id, client_id)}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
          </div>
        );

      case 'pending':
      case 'partial_paid':
        return (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs"
              onClick={() => letter_id && handleSendReminder(letter_id)}
            >
              <Bell className="h-3 w-3 mr-1" />
              תזכורת
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => letter_id && handleViewLetter(letter_id)}
            >
              <Eye className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="default"
              className="h-7 px-2 text-xs"
              onClick={() => calculation_id && handleMarkAsPaid(calculation_id)}
            >
              <CheckCircle2 className="h-3 w-3 mr-1" />
              סמן כשולם
            </Button>
          </div>
        );

      case 'paid':
        return (
          <div className="text-green-600 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center rtl:flex-row-reverse">
        <div className="rtl:text-right ltr:text-left">
          <h1 className="text-3xl font-bold rtl:text-right ltr:text-left">מעקב שכר טרחה</h1>
          <p className="text-gray-500 rtl:text-right ltr:text-left">
            מעקב מלא אחר חישובים, מכתבים ותשלומים לכל הלקוחות
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">שנת מס:</span>
          <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
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
          <Button variant="outline" onClick={loadTrackingData} disabled={loading}>
            <RefreshCw className={loading ? 'animate-spin h-4 w-4' : 'h-4 w-4'} />
          </Button>
        </div>
      </div>

      {/* KPI Cards - Clickable Filters (Compact) */}
      {!loading && kpis && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {/* All Clients - הכל */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-md border-blue-200',
              selectedCard === 'all' && 'ring-2 ring-blue-500 bg-blue-50'
            )}
            onClick={() => handleFilterChange('all')}
          >
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-gray-600 rtl:text-right ltr:text-left flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                  הכל
                </span>
                <span className="text-lg font-bold text-blue-700">
                  {formatNumber(kpis.total_clients)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <p className="text-[10px] text-gray-500">כל הלקוחות</p>
            </CardContent>
          </Card>

          {/* Not Calculated - לא חושב */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-md border-red-200',
              selectedCard === 'not_calculated' && 'ring-2 ring-red-500 bg-red-50'
            )}
            onClick={() => handleFilterChange('not_calculated')}
          >
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-gray-600 rtl:text-right ltr:text-left flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5 text-red-600" />
                  לא חושב
                </span>
                <span className="text-lg font-bold text-red-700">
                  {formatNumber(kpis.not_calculated)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <p className="text-[10px] text-gray-500">לקוחות ללא חישוב</p>
            </CardContent>
          </Card>

          {/* Calculated Not Sent - חושב, לא נשלח */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-md border-orange-200',
              selectedCard === 'calculated_not_sent' && 'ring-2 ring-orange-500 bg-orange-50'
            )}
            onClick={() => handleFilterChange('calculated_not_sent')}
          >
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-gray-600 rtl:text-right ltr:text-left flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-orange-600" />
                  חושב, לא נשלח
                </span>
                <span className="text-lg font-bold text-orange-700">
                  {formatNumber(kpis.calculated_not_sent)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <p className="text-[10px] text-gray-500">מוכנים לשליחה</p>
            </CardContent>
          </Card>

          {/* Sent Not Paid - ממתינים לתשלום */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-md border-yellow-200',
              selectedCard === 'sent_not_paid' && 'ring-2 ring-yellow-500 bg-yellow-50'
            )}
            onClick={() => handleFilterChange('sent_not_paid')}
          >
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-gray-600 rtl:text-right ltr:text-left flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-yellow-600" />
                  ממתינים לתשלום
                </span>
                <span className="text-lg font-bold text-yellow-700">
                  {formatNumber(kpis.sent_not_paid)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <p className="text-[10px] text-gray-500">מכתב נשלח</p>
            </CardContent>
          </Card>

          {/* Paid - שולם */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-md border-green-200',
              selectedCard === 'paid' && 'ring-2 ring-green-500 bg-green-50'
            )}
            onClick={() => handleFilterChange('paid')}
          >
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-gray-600 rtl:text-right ltr:text-left flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  שולם
                </span>
                <span className="text-lg font-bold text-green-700">
                  {formatNumber(kpis.paid)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <p className="text-[10px] text-gray-500">
                {formatPercentage(kpis.completion_percentage)} השלמה
              </p>
            </CardContent>
          </Card>

          {/* Completion Status - לא לחיץ */}
          <Card className="border-gray-200 bg-gray-50">
            <CardHeader className="pb-1">
              <CardTitle className="text-xs text-gray-600 rtl:text-right ltr:text-left flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5 text-gray-600" />
                  אחוז השלמה
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {formatPercentage(kpis.completion_percentage)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <p className="text-[10px] text-gray-500">מכל הלקוחות</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={(v) => handleFilterChange(v as TrackingFilter)}>
              <SelectTrigger className="w-full md:w-[250px]">
                <SelectValue placeholder="סינון לפי סטטוס" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🔵 הכל ({kpis?.total_clients || 0})</SelectItem>
                <SelectItem value="not_calculated">❌ לא חושב ({kpis?.not_calculated || 0})</SelectItem>
                <SelectItem value="calculated_not_sent">⚠️ חושב ולא נשלח ({kpis?.calculated_not_sent || 0})</SelectItem>
                <SelectItem value="sent_not_paid">⏳ ממתין לתשלום ({kpis?.sent_not_paid || 0})</SelectItem>
                <SelectItem value="paid">✅ שולם ({kpis?.paid || 0})</SelectItem>
              </SelectContent>
            </Select>

            {/* Search */}
            <Input
              placeholder="חיפוש לפי שם או ח.פ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-500 mt-4">טוען נתונים...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">לא נמצאו לקוחות</p>
            </div>
          ) : (
            <>
              <Table className="text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="rtl:text-right ltr:text-left py-2 px-3">שם לקוח</TableHead>
                    <TableHead className="rtl:text-right ltr:text-left py-2 px-3">ח.פ</TableHead>
                    <TableHead className="rtl:text-right ltr:text-left py-2 px-3">סטטוס</TableHead>
                    <TableHead className="rtl:text-right ltr:text-left py-2 px-3">סכום</TableHead>
                    <TableHead className="rtl:text-right ltr:text-left py-2 px-3">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedClients.map((client) => (
                    <TableRow key={client.client_id}>
                      <TableCell className="font-medium py-2 px-3 text-sm">
                        {client.client_name_hebrew || client.client_name}
                      </TableCell>
                      <TableCell className="text-gray-600 py-2 px-3 text-xs">{client.tax_id}</TableCell>
                      <TableCell className="py-2 px-3">{getStatusBadge(client.payment_status)}</TableCell>
                      <TableCell className="py-2 px-3 text-sm">
                        {client.calculation_amount ? formatILS(client.calculation_amount) : '-'}
                      </TableCell>
                      <TableCell className="py-2 px-3">{renderActions(client)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  {/* Left: Results info */}
                  <div className="text-xs text-gray-500">
                    מציג {startIndex + 1}-{Math.min(endIndex, filteredClients.length)} מתוך{' '}
                    {filteredClients.length} לקוחות
                  </div>

                  {/* Center: Page numbers */}
                  <div className="flex items-center gap-1">
                    {/* First + Previous */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      ראשון
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      הקודם
                    </Button>

                    {/* Page numbers */}
                    {getPageNumbers().map((page, idx) =>
                      page === '...' ? (
                        <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                          ...
                        </span>
                      ) : (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 w-7 p-0 text-xs"
                          onClick={() => setCurrentPage(page as number)}
                        >
                          {page}
                        </Button>
                      )
                    )}

                    {/* Next + Last */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      הבא
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      אחרון
                    </Button>
                  </div>

                  {/* Right: Page size selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">לקוחות בעמוד:</span>
                    <Select
                      value={pageSize.toString()}
                      onValueChange={(v) => {
                        setPageSize(parseInt(v));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[70px] h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="200">200</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
