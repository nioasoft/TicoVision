/**
 * Letter History Page (היסטוריית מכתבים)
 * Shows all sent letters and drafts with search, filter, and action capabilities
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  RefreshCw,
  Search,
  FileText,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { letterHistoryService } from '@/services/letter-history.service';
import type {
  LetterHistoryItem,
  LetterHistoryFilters,
} from '@/services/letter-history.service';
import { LetterHistoryTable } from '@/modules/letters/components/LetterHistoryTable';
import { LetterViewDialog } from '@/modules/letters/components/LetterViewDialog';
import { ResendLetterDialog } from '@/modules/letters/components/ResendLetterDialog';
import { PDFGenerationService } from '@/modules/letters-v2/services/pdf-generation.service';

export function LetterHistoryPage() {
  const navigate = useNavigate();
  const pdfService = new PDFGenerationService();

  // State
  const [activeTab, setActiveTab] = useState<'sent' | 'drafts'>('sent');
  const [loading, setLoading] = useState(true);
  const [sentLetters, setSentLetters] = useState<LetterHistoryItem[]>([]);
  const [draftLetters, setDraftLetters] = useState<LetterHistoryItem[]>([]);
  const [totalSent, setTotalSent] = useState(0);
  const [totalDrafts, setTotalDrafts] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  // Dialogs
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [selectedLetterId, setSelectedLetterId] = useState<string | null>(null);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    drafts: 0,
    opened: 0,
  });

  /**
   * Load data on mount and when filters change
   */
  useEffect(() => {
    loadData();
    loadStatistics();
  }, [activeTab, searchQuery, templateFilter, dateFilter, currentPage]);

  /**
   * Load letter data
   */
  const loadData = async () => {
    setLoading(true);
    try {
      // Build filters
      const filters: LetterHistoryFilters = {
        status: activeTab === 'sent' ? undefined : 'draft',
        searchQuery: searchQuery || undefined,
        templateType: templateFilter !== 'all' ? templateFilter : undefined,
      };

      // Add date filters
      if (dateFilter !== 'all') {
        const now = new Date();
        if (dateFilter === 'today') {
          filters.dateFrom = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now.setDate(now.getDate() - 7));
          filters.dateFrom = weekAgo.toISOString();
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
          filters.dateFrom = monthAgo.toISOString();
        }
      }

      // For sent tab, exclude drafts
      if (activeTab === 'sent') {
        filters.status = 'sent';
      }

      const { data, total, error } = await letterHistoryService.getAllLetters(
        filters,
        { page: currentPage, pageSize },
        { field: 'created_at', direction: 'desc' }
      );

      if (error) throw error;

      if (activeTab === 'sent') {
        setSentLetters(data);
        setTotalSent(total);
      } else {
        setDraftLetters(data);
        setTotalDrafts(total);
      }
    } catch (error) {
      console.error('Error loading letters:', error);
      toast.error('שגיאה בטעינת המכתבים');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load statistics
   */
  const loadStatistics = async () => {
    try {
      const stats = await letterHistoryService.getStatistics();
      if (!stats.error) {
        setStats(stats);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  /**
   * Handle view letter
   */
  const handleViewLetter = (letterId: string) => {
    setSelectedLetterId(letterId);
    setViewDialogOpen(true);
  };

  /**
   * Handle resend letter
   */
  const handleResendLetter = (letterId: string, recipients: string[]) => {
    setSelectedLetterId(letterId);
    setSelectedRecipients(recipients);
    setResendDialogOpen(true);
  };

  /**
   * Handle delete draft
   */
  const handleDeleteDraft = async (letterId: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק טיוטה זו?')) {
      return;
    }

    try {
      const { success, error } = await letterHistoryService.deleteDraft(letterId);

      if (error) throw error;

      toast.success('הטיוטה נמחקה בהצלחה');
      loadData();
      loadStatistics();
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast.error('שגיאה במחיקת הטיוטה');
    }
  };

  /**
   * Handle print letter
   */
  const handlePrintLetter = (letterId: string) => {
    // Open view dialog - it has print functionality
    handleViewLetter(letterId);
  };

  /**
   * Handle edit letter
   */
  const handleEditLetter = (letterId: string) => {
    // Navigate to letter templates page with edit state
    navigate('/letter-templates', {
      state: {
        editLetterId: letterId,
        activeTab: 'universal-builder'
      }
    });
  };

  /**
   * Handle generate PDF
   */
  const handleGeneratePDF = async (letterId: string) => {
    try {
      toast.info('מייצר PDF...');

      const result = await pdfService.generatePDF(letterId);

      if (result.success && result.pdfUrl) {
        toast.success('PDF נוצר בהצלחה');
        // Open PDF in new tab
        window.open(result.pdfUrl, '_blank');
      } else {
        throw new Error(result.error || 'שגיאה ביצירת PDF');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('שגיאה ביצירת PDF');
    }
  };

  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    setCurrentPage(1);
    loadData();
    loadStatistics();
  };

  /**
   * Reset filters
   */
  const resetFilters = () => {
    setSearchQuery('');
    setTemplateFilter('all');
    setDateFilter('all');
    setCurrentPage(1);
  };

  const currentLetters = activeTab === 'sent' ? sentLetters : draftLetters;
  const currentTotal = activeTab === 'sent' ? totalSent : totalDrafts;
  const totalPages = Math.ceil(currentTotal / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight rtl:text-right ltr:text-left">
          היסטוריית מכתבים
        </h1>
        <p className="text-muted-foreground rtl:text-right ltr:text-left">
          צפייה ושליחה מחדש של מכתבים שנשלחו וטיוטות
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              סה"כ מכתבים
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold rtl:text-right ltr:text-left">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              מכתבים שנשלחו
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold rtl:text-right ltr:text-left">{stats.sent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              מכתבים שנפתחו
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 rtl:text-right ltr:text-left">
              {stats.opened}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right ltr:text-left">
              טיוטות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500 rtl:text-right ltr:text-left">
              {stats.drafts}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="rtl:text-right ltr:text-left">מכתבים</CardTitle>
              <CardDescription className="rtl:text-right ltr:text-left">
                ניהול מכתבים שנשלחו וטיוטות
              </CardDescription>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
              רענן
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="חיפוש לפי שם לקוח או נושא..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pr-10 rtl:text-right ltr:text-left"
              />
            </div>

            <Select value={templateFilter} onValueChange={setTemplateFilter}>
              <SelectTrigger className="w-[200px] rtl:text-right ltr:text-left">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rtl:text-right ltr:text-left">
                <SelectItem value="all">כל סוגי המכתבים</SelectItem>
                <SelectItem value="external">חיצוניים</SelectItem>
                <SelectItem value="internal_audit">ביקורת פנימית</SelectItem>
                <SelectItem value="bookkeeping">הנהלת חשבונות</SelectItem>
                <SelectItem value="retainer">רטיינר</SelectItem>
                <SelectItem value="custom">מכתבים מותאמים</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px] rtl:text-right ltr:text-left">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rtl:text-right ltr:text-left">
                <SelectItem value="all">כל התקופה</SelectItem>
                <SelectItem value="today">היום</SelectItem>
                <SelectItem value="week">שבוע אחרון</SelectItem>
                <SelectItem value="month">חודש אחרון</SelectItem>
              </SelectContent>
            </Select>

            {(searchQuery || templateFilter !== 'all' || dateFilter !== 'all') && (
              <Button variant="ghost" onClick={resetFilters}>
                נקה פילטרים
              </Button>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'sent' | 'drafts')}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="sent" className="gap-2">
                <FileText className="h-4 w-4" />
                מכתבים שנשלחו ({stats.sent})
              </TabsTrigger>
              <TabsTrigger value="drafts" className="gap-2">
                <Clock className="h-4 w-4" />
                טיוטות ({stats.drafts})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sent" className="mt-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <LetterHistoryTable
                  letters={currentLetters}
                  onViewLetter={handleViewLetter}
                  onResendLetter={handleResendLetter}
                  onEditLetter={handleEditLetter}
                  onPrintLetter={handlePrintLetter}
                  onGeneratePDF={handleGeneratePDF}
                  isDraftsMode={false}
                />
              )}
            </TabsContent>

            <TabsContent value="drafts" className="mt-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <LetterHistoryTable
                  letters={currentLetters}
                  onViewLetter={handleViewLetter}
                  onResendLetter={handleResendLetter}
                  onEditLetter={handleEditLetter}
                  onDeleteDraft={handleDeleteDraft}
                  onGeneratePDF={handleGeneratePDF}
                  isDraftsMode={true}
                />
              )}
            </TabsContent>
          </Tabs>

          {/* Pagination */}
          {currentTotal > pageSize && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-muted-foreground rtl:text-right ltr:text-left">
                מציג {(currentPage - 1) * pageSize + 1} עד{' '}
                {Math.min(currentPage * pageSize, currentTotal)} מתוך {currentTotal}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <div className="flex items-center px-4 text-sm">
                  עמוד {currentPage} מתוך {totalPages}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <LetterViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        letterId={selectedLetterId}
        onResend={() => {
          setViewDialogOpen(false);
          setResendDialogOpen(true);
        }}
      />

      <ResendLetterDialog
        open={resendDialogOpen}
        onOpenChange={setResendDialogOpen}
        letterId={selectedLetterId}
        originalRecipients={selectedRecipients}
        onSuccess={() => {
          loadData();
          loadStatistics();
        }}
      />
    </div>
  );
}
