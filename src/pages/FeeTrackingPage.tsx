/**
 * Fee Tracking Page (מעקב שכר טרחה)
 * Shows all clients and their fee calculation/letter/payment status for a tax year
 *
 * Critical feature to ensure NO clients are missed:
 * - Track who has calculations vs who doesn't
 * - Track who received letters vs who didn't
 * - Track payment status
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, Mail, X } from 'lucide-react';
import { feeTrackingService } from '@/services/fee-tracking.service';
import type {
  FeeTrackingRow,
  FeeTrackingKPIs,
  FeeTrackingEnhancedRow,
  TrackingFilter,
  BatchSendState,
  BatchQueueItem,
} from '@/types/fee-tracking.types';
import type { PaymentMethod } from '@/types/payment.types';
import { LetterViewDialog } from '@/modules/letters/components/LetterViewDialog';
import { LetterPreviewDialog } from '@/modules/letters/components/LetterPreviewDialog';
import { FeeTrackingKPICards } from '@/components/fee-tracking/FeeTrackingKPICards';
import { FeeTrackingFilters } from '@/components/fee-tracking/FeeTrackingFilters';
import { FeeTrackingTable } from '@/components/fee-tracking/FeeTrackingTable';

export function FeeTrackingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [loading, setLoading] = useState(true);
  // Default to current year (2026), with localStorage persistence
  const [selectedYear, setSelectedYear] = useState(() => {
    const saved = localStorage.getItem('feeTrackingSelectedYear');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 2020 && parsed <= 2030) {
        return parsed;
      }
    }
    return new Date().getFullYear(); // Default: current year
  });
  const [kpis, setKpis] = useState<FeeTrackingKPIs | null>(null);
  const [clients, setClients] = useState<FeeTrackingRow[]>([]);
  const [filteredClients, setFilteredClients] = useState<FeeTrackingRow[]>([]);

  // Enhanced data for expandable rows
  const [enhancedData, setEnhancedData] = useState<FeeTrackingEnhancedRow[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Multi-select for batch operations
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());

  // Filters
  const [statusFilter, setStatusFilter] = useState<TrackingFilter>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod | 'all' | 'not_selected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState<TrackingFilter>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Letter view dialog
  const [viewLetterDialogOpen, setViewLetterDialogOpen] = useState(false);
  const [selectedLetterId, setSelectedLetterId] = useState<string | null>(null);

  // Letter preview dialog (for sending)
  const [letterDialogOpen, setLetterDialogOpen] = useState(false);
  const [selectedFeeId, setSelectedFeeId] = useState<string | null>(null);
  const [selectedClientIdForLetter, setSelectedClientIdForLetter] = useState<string | null>(null);

  // Group letter dialog
  const [selectedGroupForLetter, setSelectedGroupForLetter] = useState<{
    groupId: string;
    groupCalculationId: string;
  } | null>(null);

  // Batch send state
  const [batchState, setBatchState] = useState<BatchSendState>({
    isActive: false,
    queue: [],
    currentIndex: 0,
    results: { sent: [], skipped: [] },
  });

  // Current client in batch queue
  const currentBatchClient = batchState.isActive && batchState.currentIndex < batchState.queue.length
    ? batchState.queue[batchState.currentIndex]
    : null;

  // Available years
  const currentYear = new Date().getFullYear();
  const availableYears = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  // Members count
  const membersCount = clients.filter(c => c.payment_role === 'member').length;

  // Load data on mount and when year changes
  useEffect(() => {
    loadTrackingData();
    // Save selected year to localStorage
    localStorage.setItem('feeTrackingSelectedYear', selectedYear.toString());
  }, [selectedYear]);

  // Apply filters when data or filters change
  useEffect(() => {
    applyFilters();
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [clients, statusFilter, paymentMethodFilter, searchQuery]);

  /**
   * Load tracking data from service
   */
  const loadTrackingData = async () => {
    setLoading(true);
    try {
      // Load regular tracking data for KPIs and basic view
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

      // Load enhanced data for expandable rows
      const enhancedResponse = await feeTrackingService.getEnhancedTrackingData(
        selectedYear
      );

      if (enhancedResponse.data) {
        setEnhancedData(enhancedResponse.data);
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
   * Toggle expanded row
   */
  const toggleRow = (feeId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(feeId)) {
      newExpanded.delete(feeId);
    } else {
      newExpanded.add(feeId);
    }
    setExpandedRows(newExpanded);
  };

  /**
   * Handle filter change (from card click or select dropdown)
   */
  const handleFilterChange = (filter: TrackingFilter) => {
    setStatusFilter(filter);
    setSelectedCard(filter);
  };

  /**
   * Reset all filters
   */
  const resetFilters = () => {
    setStatusFilter('all');
    setSelectedCard('all');
    setPaymentMethodFilter('all');
    setSearchQuery('');
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
   */
  const getPageNumbers = (): (number | string)[] => {
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
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
          case 'members':
            return client.payment_role === 'member';
          default:
            return true;
        }
      });
    }

    // Payment method filter
    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter((client) => {
        if (paymentMethodFilter === 'not_selected') {
          return !client.payment_method_selected;
        }
        return client.payment_method_selected === paymentMethodFilter;
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
   * Action handlers
   */
  const handleCalculate = (clientId: string) => {
    navigate(`/fees/calculate?client=${clientId}&year=${selectedYear}`);
  };

  const handlePreviewLetter = (calculationId: string) => {
    const client = clients.find(c => c.calculation_id === calculationId);
    if (client) {
      setSelectedFeeId(calculationId);
      setSelectedClientIdForLetter(client.client_id);
      setLetterDialogOpen(true);
    }
  };

  const handleSendLetter = async (calculationId: string) => {
    const client = clients.find(c => c.calculation_id === calculationId);
    if (client) {
      setSelectedFeeId(calculationId);
      setSelectedClientIdForLetter(client.client_id);
      setLetterDialogOpen(true);
    }
  };

  // Group letter handlers
  const handlePreviewGroupLetter = (groupId: string, groupCalculationId: string) => {
    setSelectedGroupForLetter({ groupId, groupCalculationId });
    setLetterDialogOpen(true);
  };

  const handleSendGroupLetter = (groupId: string, groupCalculationId: string) => {
    setSelectedGroupForLetter({ groupId, groupCalculationId });
    setLetterDialogOpen(true);
  };

  const handleEditCalculation = (calculationId: string, clientId: string) => {
    navigate(`/fees/calculate?client=${clientId}&year=${selectedYear}&edit=${calculationId}`);
  };

  const handleSendReminder = async (letterId: string) => {
    toast({
      title: 'שליחת תזכורת',
      description: 'פונקציה זו תיושם בשלב הבא',
    });
  };

  const handleViewLetter = (letterId: string) => {
    setSelectedLetterId(letterId);
    setViewLetterDialogOpen(true);
  };

  const handleMarkAsPaid = (calculationId: string) => {
    navigate(`/collections?markPaid=${calculationId}`);
  };

  /**
   * Multi-select handlers
   */
  const handleSelectClient = (clientId: string, checked: boolean | 'indeterminate') => {
    const newSelected = new Set(selectedClients);
    if (checked === true) {
      newSelected.add(clientId);
    } else {
      newSelected.delete(clientId);
    }
    setSelectedClients(newSelected);
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      const eligibleClients = paginatedClients
        .filter((c) => c.payment_status !== 'not_calculated')
        .map((c) => c.client_id);
      setSelectedClients(new Set(eligibleClients));
    } else {
      setSelectedClients(new Set());
    }
  };

  /**
   * Start batch send process
   */
  const startBatchSend = useCallback(() => {
    if (selectedClients.size === 0) {
      toast({
        title: 'לא נבחרו לקוחות',
        description: 'יש לבחור לפחות לקוח אחד לשליחה',
        variant: 'destructive',
      });
      return;
    }

    const queue: BatchQueueItem[] = [];
    for (const clientId of selectedClients) {
      const client = clients.find(c => c.client_id === clientId);
      if (client?.calculation_id && client.payment_status !== 'not_calculated') {
        queue.push({
          client_id: client.client_id,
          calculation_id: client.calculation_id,
          client_name: client.client_name_hebrew || client.client_name,
        });
      }
    }

    if (queue.length === 0) {
      toast({
        title: 'אין לקוחות מתאימים',
        description: 'כל הלקוחות שנבחרו חסרים חישוב שכר טרחה',
        variant: 'destructive',
      });
      return;
    }

    setBatchState({
      isActive: true,
      queue,
      currentIndex: 0,
      results: { sent: [], skipped: [] },
    });
    setLetterDialogOpen(true);
  }, [selectedClients, clients, toast]);

  /**
   * Handle successful email sent (callback from dialog)
   */
  const handleBatchEmailSent = useCallback(() => {
    if (!batchState.isActive || !currentBatchClient) return;

    setBatchState(prev => ({
      ...prev,
      results: {
        ...prev.results,
        sent: [...prev.results.sent, currentBatchClient.client_id],
      },
    }));
  }, [batchState.isActive, currentBatchClient]);

  /**
   * Finish batch send and show summary
   */
  const finishBatchSend = useCallback(() => {
    const { sent, skipped } = batchState.results;

    if (sent.length > 0 && skipped.length === 0) {
      toast({ title: 'השליחה הושלמה בהצלחה', description: `נשלחו ${sent.length} מכתבים` });
    } else if (sent.length > 0) {
      toast({ title: 'השליחה הושלמה', description: `נשלחו ${sent.length} מכתבים, ${skipped.length} דולגו` });
    } else if (skipped.length > 0) {
      toast({ title: 'השליחה בוטלה', description: `כל ${skipped.length} הלקוחות דולגו`, variant: 'destructive' });
    }

    setBatchState({
      isActive: false,
      queue: [],
      currentIndex: 0,
      results: { sent: [], skipped: [] },
    });
    setSelectedClients(new Set());
    loadTrackingData();
  }, [batchState.results, toast]);

  /**
   * Handle dialog close - move to next client or finish
   */
  const handleBatchDialogClose = useCallback((open: boolean) => {
    if (open) {
      setLetterDialogOpen(true);
      return;
    }

    setLetterDialogOpen(false);

    if (!batchState.isActive) {
      setSelectedFeeId(null);
      setSelectedClientIdForLetter(null);
      loadTrackingData();
      return;
    }

    const wasJustSent = batchState.results.sent.includes(currentBatchClient?.client_id || '');

    if (!wasJustSent && currentBatchClient) {
      setBatchState(prev => ({
        ...prev,
        results: {
          ...prev.results,
          skipped: [...prev.results.skipped, currentBatchClient.client_id],
        },
      }));
    }

    const nextIndex = batchState.currentIndex + 1;

    if (nextIndex < batchState.queue.length) {
      setBatchState(prev => ({ ...prev, currentIndex: nextIndex }));
      setTimeout(() => setLetterDialogOpen(true), 150);
    } else {
      finishBatchSend();
    }
  }, [batchState, currentBatchClient, finishBatchSend]);

  /**
   * Cancel batch send
   */
  const cancelBatchSend = useCallback(() => {
    setLetterDialogOpen(false);
    finishBatchSend();
  }, [finishBatchSend]);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="rtl:text-right ltr:text-left">
          <h1 className="text-3xl font-bold rtl:text-right ltr:text-left">מעקב שכר טרחה</h1>
          <p className="text-gray-500 rtl:text-right ltr:text-left">
            מעקב מלא אחר חישובים, מכתבים ותשלומים לכל הלקוחות
          </p>
        </div>
        <Button
          variant="outline"
          onClick={loadTrackingData}
          disabled={loading}
          className="rtl:flex-row-reverse gap-2"
        >
          <RefreshCw className={loading ? 'animate-spin h-4 w-4' : 'h-4 w-4'} />
          <span className="rtl:text-right ltr:text-left">רענון נתונים</span>
        </Button>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <FeeTrackingKPICards
          kpis={kpis}
          membersCount={membersCount}
          loading={loading}
          selectedCard={selectedCard}
          onCardClick={handleFilterChange}
        />
      )}

      {/* Filters */}
      {kpis && (
        <FeeTrackingFilters
          statusFilter={statusFilter}
          yearFilter={selectedYear}
          paymentMethodFilter={paymentMethodFilter}
          searchQuery={searchQuery}
          kpis={kpis}
          membersCount={membersCount}
          availableYears={availableYears}
          onStatusChange={handleFilterChange}
          onYearChange={setSelectedYear}
          onPaymentMethodChange={setPaymentMethodFilter}
          onSearchChange={setSearchQuery}
          onReset={resetFilters}
        />
      )}

      {/* Results Info */}
      <div className="flex justify-end items-center">
        <div className="text-sm text-gray-500 rtl:text-right ltr:text-left">
          עמוד {currentPage} מתוך {totalPages || 1} ({filteredClients.length} רשומות)
        </div>
      </div>

      {/* Table */}
      <FeeTrackingTable
        clients={paginatedClients}
        enhancedData={enhancedData}
        loading={loading}
        selectedClients={selectedClients}
        onSelectClient={handleSelectClient}
        onSelectAll={handleSelectAll}
        expandedRows={expandedRows}
        onToggleRow={toggleRow}
        onCalculate={handleCalculate}
        onPreviewLetter={handlePreviewLetter}
        onSendLetter={handleSendLetter}
        onEditCalculation={handleEditCalculation}
        onSendReminder={handleSendReminder}
        onViewLetter={handleViewLetter}
        onMarkAsPaid={handleMarkAsPaid}
        onPreviewGroupLetter={handlePreviewGroupLetter}
        onSendGroupLetter={handleSendGroupLetter}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border rounded-lg bg-white">
          {/* Left: Results info */}
          <div className="text-xs text-gray-500">
            מציג {startIndex + 1}-{Math.min(endIndex, filteredClients.length)} מתוך{' '}
            {filteredClients.length} לקוחות
          </div>

          {/* Center: Page numbers */}
          <div className="flex items-center gap-1">
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

      {/* Letter View Dialog */}
      <LetterViewDialog
        open={viewLetterDialogOpen}
        onOpenChange={setViewLetterDialogOpen}
        letterId={selectedLetterId}
        onResend={() => {
          toast({
            title: 'שליחה מחדש',
            description: 'פונקציה זו תיושם בשלב הבא',
          });
        }}
      />

      {/* Letter Preview Dialog (for sending) */}
      <LetterPreviewDialog
        open={letterDialogOpen}
        onOpenChange={batchState.isActive ? handleBatchDialogClose : (open) => {
          setLetterDialogOpen(open);
          if (!open) {
            setSelectedFeeId(null);
            setSelectedClientIdForLetter(null);
            setSelectedGroupForLetter(null);
            loadTrackingData();
          }
        }}
        // Individual fee calculation props
        feeId={batchState.isActive ? currentBatchClient?.calculation_id || null : selectedFeeId}
        clientId={batchState.isActive ? currentBatchClient?.client_id || null : selectedClientIdForLetter}
        // Group fee calculation props
        groupId={selectedGroupForLetter?.groupId || null}
        groupFeeCalculationId={selectedGroupForLetter?.groupCalculationId || null}
        onEmailSent={batchState.isActive ? handleBatchEmailSent : () => {
          toast({ title: 'הצלחה', description: 'המכתב נשלח בהצלחה' });
          loadTrackingData();
        }}
      />

      {/* Batch Send Progress Indicator */}
      {batchState.isActive && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white rounded-lg shadow-xl px-6 py-3 flex items-center gap-4 rtl:flex-row-reverse">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 animate-pulse" />
            <span className="font-medium">
              שולח {batchState.currentIndex + 1}/{batchState.queue.length}
            </span>
          </div>
          <div className="text-sm opacity-90">
            {currentBatchClient?.client_name}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-200">{batchState.results.sent.length} נשלחו</span>
            {batchState.results.skipped.length > 0 && (
              <span className="text-yellow-200">{batchState.results.skipped.length} דולגו</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-blue-700"
            onClick={cancelBatchSend}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Floating Action Bar for Batch Operations */}
      {selectedClients.size > 0 && !batchState.isActive && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white border rounded-lg shadow-xl px-6 py-4 flex items-center gap-4 rtl:flex-row-reverse">
          <span className="font-medium text-sm">{selectedClients.size} לקוחות נבחרו</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedClients(new Set())}
          >
            <X className="h-4 w-4" />
          </Button>
          <Button onClick={startBatchSend}>
            <Mail className="h-4 w-4 ml-2" />
            שלח מכתבים ({selectedClients.size})
          </Button>
        </div>
      )}
    </div>
  );
}
