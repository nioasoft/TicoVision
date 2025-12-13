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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  Trash2,
  CheckSquare,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { letterHistoryService } from '@/services/letter-history.service';
import type {
  LetterHistoryItem,
  LetterHistoryFilters,
} from '@/services/letter-history.service';
import { LetterHistoryTable } from '@/modules/letters/components/LetterHistoryTable';
import { LetterViewDialog } from '@/modules/letters/components/LetterViewDialog';
import { ResendLetterDialog } from '@/modules/letters/components/ResendLetterDialog';
import { PDFGenerationService } from '@/modules/letters-v2/services/pdf-generation.service';
import { ClientSelector } from '@/components/ClientSelector';
import { Checkbox } from '@/components/ui/checkbox';
import { clientService, type ClientGroup } from '@/services/client.service';
import { Combobox } from '@/components/ui/combobox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Filter, List, Users, Calendar as CalendarListIcon, ArrowUpDown } from 'lucide-react';
import { format, isToday, isYesterday, isThisWeek, isThisMonth, startOfDay } from 'date-fns';
import { he } from 'date-fns/locale';

export function LetterHistoryPage() {
  const navigate = useNavigate();
  const pdfService = new PDFGenerationService();

  // State - 4 tabs: all, drafts, saved, sent
  const [activeTab, setActiveTab] = useState<'all' | 'drafts' | 'saved' | 'sent'>('all');
  const [loading, setLoading] = useState(true);
  const [letters, setLetters] = useState<LetterHistoryItem[]>([]);
  const [totalLetters, setTotalLetters] = useState(0);

  // Group filter
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showOnlyFeeLetters, setShowOnlyFeeLetters] = useState(false); // NEW: Filter for fee letters

  // ⭐ NEW: Advanced filters
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // ⭐ NEW: View mode and sorting
  type ViewMode = 'flat' | 'by_client' | 'by_date';
  const [viewMode, setViewMode] = useState<ViewMode>('flat');
  const [sortField, setSortField] = useState<'created_at' | 'subject' | 'client_name'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  // Dialogs
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [resendDialogOpen, setResendDialogOpen] = useState(false);
  const [selectedLetterId, setSelectedLetterId] = useState<string | null>(null);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);

  // Multi-select for bulk delete (drafts only)
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);

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
  }, [activeTab, searchQuery, templateFilter, dateFilter, showOnlyFeeLetters, selectedClientId, selectedGroupId, selectedStatuses, dateFrom, dateTo, currentPage, sortField, sortDirection]);

  /**
   * Load groups for group filter
   */
  useEffect(() => {
    loadGroups();
  }, []);

  /**
   * Load groups
   */
  const loadGroups = async () => {
    try {
      setIsLoadingGroups(true);
      const { data, error } = await clientService.getGroups();
      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  /**
   * Load letter data
   */
  const loadData = async () => {
    setLoading(true);
    try {
      // Build filters based on activeTab
      const filters: LetterHistoryFilters = {
        searchQuery: searchQuery || undefined,
        templateType: templateFilter !== 'all' ? templateFilter : undefined,
        feeLettersOnly: showOnlyFeeLetters || undefined,
      };

      // Status filter based on tab
      switch (activeTab) {
        case 'all':
          // No status filter - show all
          break;
        case 'drafts':
          filters.status = 'draft';
          break;
        case 'saved':
          filters.status = 'saved';
          break;
        case 'sent':
          filters.status = ['sent_email', 'sent_whatsapp', 'sent_print'];
          break;
      }

      // Client filter
      if (selectedClientId) {
        filters.clientId = selectedClientId;
      }

      // Group filter
      if (selectedGroupId) {
        filters.groupId = selectedGroupId;
      }

      // Status multi-select from advanced filters (overrides tab filter)
      if (selectedStatuses.length > 0) {
        filters.status = selectedStatuses;
      }

      // Date range filter (overrides preset dateFilter if set)
      if (dateFrom) {
        filters.dateFrom = dateFrom.toISOString();
      } else if (dateFilter !== 'all') {
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

      if (dateTo) {
        filters.dateTo = dateTo.toISOString();
      }

      // Load data with sorting
      const { data, total, error } = await letterHistoryService.getAllLetters(
        filters,
        { page: currentPage, pageSize },
        { field: sortField, direction: sortDirection }
      );

      if (error) throw error;

      setLetters(data);
      setTotalLetters(total);
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
   * Toggle select mode (bulk delete)
   */
  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedDraftIds([]); // Clear selections when toggling
  };

  /**
   * Toggle single draft selection
   */
  const toggleDraftSelection = (draftId: string) => {
    setSelectedDraftIds(prev =>
      prev.includes(draftId)
        ? prev.filter(id => id !== draftId)
        : [...prev, draftId]
    );
  };

  /**
   * Select/deselect all drafts
   */
  const toggleSelectAll = () => {
    if (selectedDraftIds.length === letters.length) {
      setSelectedDraftIds([]); // Deselect all
    } else {
      setSelectedDraftIds(letters.map(d => d.id)); // Select all
    }
  };

  /**
   * Delete selected drafts
   */
  const handleBulkDelete = async () => {
    if (selectedDraftIds.length === 0) {
      toast.error('לא נבחרו טיוטות למחיקה');
      return;
    }

    const confirmed = window.confirm(
      `האם אתה בטוח שברצונך למחוק ${selectedDraftIds.length} טיוטות?`
    );

    if (!confirmed) return;

    try {
      setLoading(true);

      // Delete all selected drafts
      const { error } = await supabase
        .from('generated_letters')
        .delete()
        .in('id', selectedDraftIds);

      if (error) throw error;

      toast.success(`${selectedDraftIds.length} טיוטות נמחקו בהצלחה`);
      setSelectedDraftIds([]);
      setIsSelectMode(false);
      loadData();
      loadStatistics();
    } catch (error) {
      console.error('Error deleting drafts:', error);
      toast.error('שגיאה במחיקת טיוטות');
    } finally {
      setLoading(false);
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

      // generatePDF returns the PDF URL directly (not an object)
      const pdfUrl = await pdfService.generatePDF(letterId);

      toast.success('PDF נוצר בהצלחה');
      // Open PDF in new tab
      window.open(pdfUrl, '_blank');
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Show the actual error message
      toast.error(error instanceof Error ? error.message : 'שגיאה ביצירת PDF');
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
    setShowOnlyFeeLetters(false);
    // Reset advanced filters
    setSelectedClientId(null);
    setSelectedGroupId(null);
    setSelectedStatuses([]);
    setDateFrom(undefined);
    setDateTo(undefined);
    setCurrentPage(1);
  };

  const currentLetters = letters;
  const currentTotal = totalLetters;
  const totalPages = Math.ceil(currentTotal / pageSize);

  // Check if we're in a drafts-related tab
  const isDraftsMode = activeTab === 'drafts' || activeTab === 'saved';

  /**
   * ⭐ NEW: Group letters by client
   */
  const groupByClient = (letters: LetterHistoryItem[]) => {
    const grouped = new Map<string, LetterHistoryItem[]>();

    letters.forEach(letter => {
      const clientKey = letter.client_id || 'no-client';
      const clientName = letter.client_name || letter.client_company || 'ללא לקוח';

      if (!grouped.has(clientKey)) {
        grouped.set(clientKey, []);
      }
      grouped.get(clientKey)!.push(letter);
    });

    // Convert to array and sort by client name
    return Array.from(grouped.entries())
      .map(([key, letters]) => ({
        key,
        label: letters[0]?.client_name || letters[0]?.client_company || 'ללא לקוח',
        letters,
        count: letters.length
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'he'));
  };

  /**
   * ⭐ NEW: Group letters by date
   */
  const groupByDate = (letters: LetterHistoryItem[]) => {
    const grouped = new Map<string, LetterHistoryItem[]>();

    letters.forEach(letter => {
      const createdDate = new Date(letter.created_at);
      let dateKey: string;
      let dateLabel: string;

      if (isToday(createdDate)) {
        dateKey = 'today';
        dateLabel = 'היום';
      } else if (isYesterday(createdDate)) {
        dateKey = 'yesterday';
        dateLabel = 'אתמול';
      } else if (isThisWeek(createdDate)) {
        dateKey = 'this-week';
        dateLabel = 'השבוע';
      } else if (isThisMonth(createdDate)) {
        dateKey = 'this-month';
        dateLabel = 'החודש';
      } else {
        const monthKey = format(createdDate, 'yyyy-MM');
        dateKey = monthKey;
        dateLabel = format(createdDate, 'MMMM yyyy', { locale: he });
      }

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(letter);
    });

    // Convert to array with proper ordering
    const order = ['today', 'yesterday', 'this-week', 'this-month'];
    return Array.from(grouped.entries())
      .map(([key, letters]) => ({
        key,
        label: order.includes(key)
          ? (key === 'today' ? 'היום' : key === 'yesterday' ? 'אתמול' : key === 'this-week' ? 'השבוע' : 'החודש')
          : format(new Date(letters[0].created_at), 'MMMM yyyy', { locale: he }),
        letters,
        count: letters.length
      }))
      .sort((a, b) => {
        const aIndex = order.indexOf(a.key);
        const bIndex = order.indexOf(b.key);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        // Sort other months by key (yyyy-MM) descending
        return b.key.localeCompare(a.key);
      });
  };

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

            {/* Client Filter - Visible */}
            <div className="w-[200px]">
              <ClientSelector
                value={selectedClientId}
                onChange={(client) => setSelectedClientId(client?.id || null)}
                placeholder="סינון לפי לקוח..."
              />
            </div>

            {/* Group Filter - Visible */}
            <Select
              value={selectedGroupId || 'all'}
              onValueChange={(value) => setSelectedGroupId(value === 'all' ? null : value)}
            >
              <SelectTrigger className="w-[200px] rtl:text-right ltr:text-left">
                <SelectValue placeholder="סינון לפי קבוצה..." />
              </SelectTrigger>
              <SelectContent className="rtl:text-right ltr:text-left">
                <SelectItem value="all">כל הקבוצות</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.group_name_hebrew || group.group_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Fee Letters Filter Toggle */}
            <div className="flex items-center gap-2 rtl:flex-row-reverse">
              <Switch
                id="fee-letters-filter"
                checked={showOnlyFeeLetters}
                onCheckedChange={setShowOnlyFeeLetters}
              />
              <Label htmlFor="fee-letters-filter" className="cursor-pointer rtl:text-right ltr:text-left">
                הצג רק מכתבי שכר טרחה
              </Label>
            </div>

            {/* ⭐ Advanced Filters Button - Date range and sent status filter */}
            <Popover open={showAdvancedFilters} onOpenChange={setShowAdvancedFilters}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  פילטרים מתקדמים
                  {(selectedStatuses.length > 0 || dateFrom || dateTo) && (
                    <span className="flex h-2 w-2 rounded-full bg-blue-600" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-96 rtl:text-right ltr:text-left" align="end">
                <div className="space-y-4">
                  <h4 className="font-medium">פילטרים מתקדמים</h4>

                  {/* Status Multi-Select (only for sent tab) */}
                  {activeTab === 'sent' && (
                    <div>
                      <Label className="mb-2 block rtl:text-right ltr:text-left">סטטוס שליחה</Label>
                      <div className="space-y-2">
                        {[
                          { value: 'sent_email', label: 'נשלח במייל' },
                          { value: 'sent_whatsapp', label: 'נשלח בWhatsApp' },
                          { value: 'sent_print', label: 'הודפס' },
                        ].map(status => (
                          <div key={status.value} className="flex items-center gap-2 rtl:flex-row-reverse">
                            <Checkbox
                              id={`status-${status.value}`}
                              checked={selectedStatuses.includes(status.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedStatuses([...selectedStatuses, status.value]);
                                } else {
                                  setSelectedStatuses(selectedStatuses.filter(s => s !== status.value));
                                }
                              }}
                            />
                            <Label htmlFor={`status-${status.value}`} className="cursor-pointer rtl:text-right ltr:text-left">
                              {status.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Date Range Picker */}
                  <div className="space-y-2">
                    <Label className="block rtl:text-right ltr:text-left">טווח תאריכים</Label>
                    <div className="grid gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-right font-normal"
                          >
                            <CalendarIcon className="ml-2 h-4 w-4" />
                            {dateFrom ? format(dateFrom, 'dd/MM/yyyy', { locale: he }) : 'תאריך התחלה'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateFrom}
                            onSelect={setDateFrom}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>

                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-right font-normal"
                          >
                            <CalendarIcon className="ml-2 h-4 w-4" />
                            {dateTo ? format(dateTo, 'dd/MM/yyyy', { locale: he }) : 'תאריך סיום'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateTo}
                            onSelect={setDateTo}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Clear Advanced Filters */}
                  {(selectedStatuses.length > 0 || dateFrom || dateTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedStatuses([]);
                        setDateFrom(undefined);
                        setDateTo(undefined);
                      }}
                      className="w-full"
                    >
                      נקה פילטרים מתקדמים
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {(searchQuery || templateFilter !== 'all' || dateFilter !== 'all' || selectedClientId || selectedGroupId || selectedStatuses.length > 0 || dateFrom || dateTo || showOnlyFeeLetters) && (
              <Button variant="ghost" onClick={resetFilters}>
                נקה הכל
              </Button>
            )}
          </div>

          {/* ⭐ NEW: View Mode & Sorting Controls */}
          <div className="mb-4 flex items-center justify-between gap-4 border-t pt-4">
            {/* View Mode Toggles */}
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">תצוגה:</Label>
              <div className="flex gap-1 rounded-lg border p-1">
                <Button
                  variant={viewMode === 'flat' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('flat')}
                  className="gap-2"
                >
                  <List className="h-4 w-4" />
                  רשימה
                </Button>
                <Button
                  variant={viewMode === 'by_client' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('by_client')}
                  className="gap-2"
                >
                  <Users className="h-4 w-4" />
                  לפי לקוח
                </Button>
                <Button
                  variant={viewMode === 'by_date' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('by_date')}
                  className="gap-2"
                >
                  <CalendarListIcon className="h-4 w-4" />
                  לפי תאריך
                </Button>
              </div>
            </div>

            {/* Sorting Controls */}
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">מיון:</Label>
              <Select value={sortField} onValueChange={(value: any) => setSortField(value)}>
                <SelectTrigger className="w-[140px] rtl:text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rtl:text-right">
                  <SelectItem value="created_at">תאריך יצירה</SelectItem>
                  <SelectItem value="subject">נושא</SelectItem>
                  <SelectItem value="client_name">שם לקוח</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                className="gap-2"
              >
                <ArrowUpDown className="h-4 w-4" />
                {sortDirection === 'asc' ? 'עולה' : 'יורד'}
              </Button>
            </div>
          </div>

          {/* 4 Tabs: הכל | טיוטות | שמורים | נשלחו */}
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'all' | 'drafts' | 'saved' | 'sent')}>
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
              <TabsTrigger value="all" className="gap-2">
                <FileText className="h-4 w-4" />
                הכל ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="drafts" className="gap-2">
                <Clock className="h-4 w-4" />
                טיוטות
              </TabsTrigger>
              <TabsTrigger value="saved" className="gap-2">
                <FileText className="h-4 w-4" />
                שמורים
              </TabsTrigger>
              <TabsTrigger value="sent" className="gap-2">
                <FileText className="h-4 w-4" />
                נשלחו ({stats.sent})
              </TabsTrigger>
            </TabsList>

            {/* Single content area for all tabs */}
            <div className="mt-6">
              {/* Bulk actions for drafts */}
              {isDraftsMode && letters.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <Button
                    variant={isSelectMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={toggleSelectMode}
                  >
                    {isSelectMode ? (
                      <>
                        <X className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                        בטל בחירה
                      </>
                    ) : (
                      <>
                        <CheckSquare className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                        בחר טיוטות
                      </>
                    )}
                  </Button>

                  {isSelectMode && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleSelectAll}
                      >
                        {selectedDraftIds.length === letters.length
                          ? 'בטל הכל'
                          : 'בחר הכל'}
                      </Button>

                      {selectedDraftIds.length > 0 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleBulkDelete}
                        >
                          <Trash2 className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                          מחק {selectedDraftIds.length} נבחרו
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}

              {loading ? (
                <div className="flex justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : viewMode === 'flat' ? (
                // ⭐ Flat view - regular table
                <LetterHistoryTable
                  letters={currentLetters}
                  onViewLetter={handleViewLetter}
                  onResendLetter={handleResendLetter}
                  onEditLetter={handleEditLetter}
                  onDeleteDraft={handleDeleteDraft}
                  onGeneratePDF={handleGeneratePDF}
                  isDraftsMode={isDraftsMode}
                  isSelectMode={isSelectMode}
                  selectedIds={selectedDraftIds}
                  onToggleSelect={toggleDraftSelection}
                />
              ) : viewMode === 'by_client' ? (
                // ⭐ Grouped by client
                <div className="space-y-6">
                  {groupByClient(currentLetters).map(group => (
                    <div key={group.key} className="space-y-2">
                      <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">{group.label}</h3>
                        <span className="text-sm text-muted-foreground">({group.count} מכתבים)</span>
                      </div>
                      <LetterHistoryTable
                        letters={group.letters}
                        onViewLetter={handleViewLetter}
                        onResendLetter={handleResendLetter}
                        onEditLetter={handleEditLetter}
                        onDeleteDraft={handleDeleteDraft}
                        onGeneratePDF={handleGeneratePDF}
                        isDraftsMode={isDraftsMode}
                        isSelectMode={isSelectMode}
                        selectedIds={selectedDraftIds}
                        onToggleSelect={toggleDraftSelection}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                // ⭐ Grouped by date
                <div className="space-y-6">
                  {groupByDate(currentLetters).map(group => (
                    <div key={group.key} className="space-y-2">
                      <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
                        <CalendarListIcon className="h-5 w-5 text-muted-foreground" />
                        <h3 className="font-semibold">{group.label}</h3>
                        <span className="text-sm text-muted-foreground">({group.count} מכתבים)</span>
                      </div>
                      <LetterHistoryTable
                        letters={group.letters}
                        onViewLetter={handleViewLetter}
                        onResendLetter={handleResendLetter}
                        onEditLetter={handleEditLetter}
                        onDeleteDraft={handleDeleteDraft}
                        onGeneratePDF={handleGeneratePDF}
                        isDraftsMode={isDraftsMode}
                        isSelectMode={isSelectMode}
                        selectedIds={selectedDraftIds}
                        onToggleSelect={toggleDraftSelection}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
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
