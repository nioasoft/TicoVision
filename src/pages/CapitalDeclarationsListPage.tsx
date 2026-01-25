/**
 * Capital Declarations List Page (ניהול הצהרות הון)
 * Work dashboard for managing capital declarations with priority, assignment, and communication tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';
import {
  RefreshCw,
  Search,
  FileText,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Settings,
  Mail,
  Loader2,
} from 'lucide-react';
import { capitalDeclarationService } from '@/services/capital-declaration.service';
import { capitalDeclarationReminderService } from '@/services/capital-declaration-reminder.service';
import {
  PriorityBadge,
  AssignAccountantSelect,
  LateSubmissionIndicator,
  SubmissionScreenshotLink,
  PenaltyStatusBadge,
  WeeklyReportBanner,
  ReminderSettingsCard,
} from '@/components/capital-declarations';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type {
  DeclarationWithCounts,
  CapitalDeclarationStatus,
  DeclarationPriority,
} from '@/types/capital-declaration.types';
import {
  DECLARATION_STATUS_LABELS,
  DECLARATION_STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_ROW_COLORS,
  getAvailableTaxYears,
  formatDeclarationDate,
} from '@/types/capital-declaration.types';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { he } from 'date-fns/locale';

/**
 * Calculate days remaining and determine color class
 */
function getDaysRemaining(dateString: string): { days: number; colorClass: string; label: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dateString);
  dueDate.setHours(0, 0, 0, 0);

  const days = differenceInDays(dueDate, today);

  let colorClass: string;
  let label: string;

  if (days < 0) {
    // Overdue
    colorClass = 'text-red-600 font-medium';
    label = `באיחור ${Math.abs(days)} ימים`;
  } else if (days === 0) {
    colorClass = 'text-red-600 font-medium';
    label = 'היום!';
  } else if (days <= 7) {
    colorClass = 'text-red-600';
    label = `${days} ימים`;
  } else if (days <= 14) {
    colorClass = 'text-orange-500';
    label = `${days} ימים`;
  } else if (days <= 30) {
    colorClass = 'text-yellow-600';
    label = `${days} ימים`;
  } else {
    colorClass = 'text-green-600';
    label = `${days} ימים`;
  }

  return { days, colorClass, label };
}

export function CapitalDeclarationsListPage() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { isSuperAdmin } = usePermissions();
  const isAdmin = role === 'admin';

  // State
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [declarationToDelete, setDeclarationToDelete] = useState<DeclarationWithCounts | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [declarations, setDeclarations] = useState<DeclarationWithCounts[]>([]);
  const [totalDeclarations, setTotalDeclarations] = useState(0);
  const [accountants, setAccountants] = useState<{ id: string; name: string; email: string }[]>([]);

  // Banner and settings state
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);

  // Tab filter (primary) - default shows all except submitted and documents_received
  type TabFilter = 'in_process' | 'not_started' | 'client_complete' | 'urgent' | 'submitted';
  const [activeTab, setActiveTab] = useState<TabFilter>('in_process');

  // Advanced filters (work within the selected tab)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CapitalDeclarationStatus | 'all'>('all');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<DeclarationPriority | 'all'>('all');
  const [assignedFilter, setAssignedFilter] = useState<string | 'all'>('all');
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Statistics for the 5 tabs
  const [stats, setStats] = useState({
    inProcess: 0,      // All except submitted & documents_received (active work)
    notStarted: 0,     // Status = 'waiting' or 'sent'
    clientComplete: 0, // Status = 'documents_received' (client clicked "סיימתי")
    urgent: 0,         // Critical + Urgent (not submitted, not documents_received)
    submitted: 0,      // Submitted only
  });

  /**
   * Load data on mount and when filters change
   */
  useEffect(() => {
    loadData();
  }, [activeTab, searchQuery, statusFilter, yearFilter, priorityFilter, assignedFilter, currentPage]);

  /**
   * Load available years, accountants, and check banner on mount
   */
  useEffect(() => {
    loadAvailableYears();
    loadAccountants();
    checkBannerStatus();
  }, []);

  /**
   * Check if the weekly banner should be shown
   */
  const checkBannerStatus = async () => {
    const { data, error } = await capitalDeclarationReminderService.checkBannerStatus();
    if (!error && data) {
      setShowBanner(data.showBanner);
    }
  };

  /**
   * Dismiss the weekly banner
   */
  const handleDismissBanner = async () => {
    const { error } = await capitalDeclarationReminderService.dismissBanner();
    if (error) {
      toast.error('שגיאה בסגירת ההתראה');
    } else {
      setShowBanner(false);
    }
  };

  /**
   * Send reminders to all eligible clients manually
   */
  const handleSendRemindersToAll = async () => {
    setSendingReminders(true);
    try {
      const { data, error } = await capitalDeclarationReminderService.sendRemindersToAll();
      if (error) {
        toast.error('שגיאה בשליחת תזכורות');
        console.error('Error sending reminders:', error);
      } else if (data) {
        if (data.sent > 0) {
          toast.success(`נשלחו ${data.sent} תזכורות בהצלחה`);
        } else {
          toast.info('אין לקוחות שזקוקים לתזכורת כרגע');
        }
      }
    } catch (error) {
      console.error('Error sending reminders:', error);
      toast.error('שגיאה בשליחת תזכורות');
    } finally {
      setSendingReminders(false);
    }
  };

  /**
   * Load accountants for filter dropdown
   */
  const loadAccountants = async () => {
    const { data } = await capitalDeclarationService.getTenantAccountants();
    if (data) {
      setAccountants(data);
    }
  };

  /**
   * Load declarations data using dashboard method
   * Tab filter is the primary filter, advanced filters work within the tab
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Apply handler filter if selected
      const assignedTo = assignedFilter !== 'all' ? assignedFilter : undefined;

      // Build status filter based on active tab + advanced status filter
      let statusParam: CapitalDeclarationStatus | readonly CapitalDeclarationStatus[] | undefined;
      let priorityParam: DeclarationPriority | DeclarationPriority[] | undefined;
      let excludeStatuses: CapitalDeclarationStatus[] = [];

      // Tab determines the base filter
      switch (activeTab) {
        case 'in_process':
          // All except submitted and documents_received (active work)
          excludeStatuses = ['submitted', 'documents_received'];
          // If user selected a specific status in advanced filter, use it
          if (statusFilter !== 'all' && !excludeStatuses.includes(statusFilter)) {
            statusParam = statusFilter;
          }
          break;
        case 'not_started':
          // 'waiting' or 'sent' - not yet started by client
          statusParam = ['waiting', 'sent'] as const;
          break;
        case 'client_complete':
          // Client clicked "סיימתי" - documents_received
          statusParam = 'documents_received';
          break;
        case 'urgent':
          // Critical + Urgent priorities, exclude submitted and documents_received
          excludeStatuses = ['submitted', 'documents_received'];
          priorityParam = ['critical', 'urgent'];
          // If advanced filter narrows it further
          if (priorityFilter !== 'all') {
            priorityParam = priorityFilter;
          }
          if (statusFilter !== 'all' && !excludeStatuses.includes(statusFilter)) {
            statusParam = statusFilter;
          }
          break;
        case 'submitted':
          // Submitted only
          statusParam = 'submitted';
          break;
      }

      // Apply advanced priority filter (if not in urgent tab which already filters by priority)
      if (activeTab !== 'urgent' && priorityFilter !== 'all') {
        priorityParam = priorityFilter;
      }

      const { data, error } = await capitalDeclarationService.getDashboard({
        page: currentPage,
        pageSize,
        status: statusParam,
        excludeStatus: excludeStatuses.length > 0 ? excludeStatuses : undefined,
        year: yearFilter !== 'all' ? yearFilter : undefined,
        priority: priorityParam,
        assignedTo,
        searchQuery: searchQuery || undefined,
      });

      if (error) throw error;

      setDeclarations(data?.declarations || []);
      setTotalDeclarations(data?.total || 0);

      // Calculate stats for all 4 tabs (independent of current filters)
      // We need to make separate calls or use the total counts from API
      await loadStats();

    } catch (error) {
      console.error('Error loading declarations:', error);
      toast.error('שגיאה בטעינת ההצהרות');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, statusFilter, yearFilter, priorityFilter, assignedFilter, currentPage, pageSize]);

  /**
   * Load statistics counts for tabs (independent of current filters)
   */
  const loadStats = async () => {
    try {
      const { data } = await capitalDeclarationService.getDashboard({
        page: 1,
        pageSize: 1000, // Get all for accurate counts
      });

      const allDeclarations = data?.declarations || [];

      setStats({
        // Active work - exclude submitted and documents_received
        inProcess: allDeclarations.filter((d) =>
          d.status !== 'submitted' && d.status !== 'documents_received'
        ).length,
        // Not started - waiting or sent
        notStarted: allDeclarations.filter((d) =>
          d.status === 'waiting' || d.status === 'sent'
        ).length,
        // Client marked complete - documents_received
        clientComplete: allDeclarations.filter((d) =>
          d.status === 'documents_received'
        ).length,
        // Urgent - critical/urgent, exclude submitted and documents_received
        urgent: allDeclarations.filter((d) =>
          d.status !== 'submitted' &&
          d.status !== 'documents_received' &&
          (d.priority === 'critical' || d.priority === 'urgent')
        ).length,
        // Submitted
        submitted: allDeclarations.filter((d) => d.status === 'submitted').length,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  /**
   * Load available years for filter
   */
  const loadAvailableYears = async () => {
    try {
      const { data, error } = await capitalDeclarationService.getAvailableYears();
      if (error) throw error;
      setAvailableYears(data || getAvailableTaxYears());
    } catch (error) {
      console.error('Error loading years:', error);
      setAvailableYears(getAvailableTaxYears());
    }
  };

  /**
   * Handle priority change
   */
  const handlePriorityChange = async (declarationId: string, priority: DeclarationPriority) => {
    const { error } = await capitalDeclarationService.updatePriority(declarationId, priority);
    if (error) {
      toast.error('שגיאה בעדכון דחיפות');
      return;
    }
    toast.success('הדחיפות עודכנה');
    loadData();
  };

  /**
   * Handle assignment change
   */
  const handleAssignmentChange = async (declarationId: string, userId: string | null) => {
    const { error } = await capitalDeclarationService.updateAssignment(declarationId, userId);
    if (error) {
      toast.error('שגיאה בעדכון שיוך');
      return;
    }
    toast.success('השיוך עודכן');
    loadData();
  };

  /**
   * Reset filters (but keep the tab)
   */
  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setYearFilter('all');
    setPriorityFilter('all');
    setAssignedFilter('all');
    setCurrentPage(1);
  };

  /**
   * Handle tab change - reset advanced filters when switching tabs
   */
  const handleTabChange = (tab: TabFilter) => {
    setActiveTab(tab);
    setStatusFilter('all');
    setPriorityFilter('all');
    setCurrentPage(1);
  };

  /**
   * Handle delete declaration (Super Admin only)
   */
  const handleDeleteClick = (declaration: DeclarationWithCounts, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeclarationToDelete(declaration);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!declarationToDelete) return;

    setDeleting(true);
    try {
      const { error } = await capitalDeclarationService.delete(declarationToDelete.id);
      if (error) throw error;

      toast.success(`הצהרת ההון של ${declarationToDelete.contact_name} נמחקה`);
      setDeleteDialogOpen(false);
      setDeclarationToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting declaration:', error);
      toast.error('שגיאה במחיקת ההצהרה');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(totalDeclarations / pageSize);

  /**
   * Format relative time
   */
  const formatRelativeTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: he });
    } catch {
      return '-';
    }
  };

  const hasActiveFilters =
    searchQuery ||
    statusFilter !== 'all' ||
    yearFilter !== 'all' ||
    priorityFilter !== 'all' ||
    assignedFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Weekly Report Banner */}
      {showBanner && (
        <WeeklyReportBanner onDismiss={handleDismissBanner} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight rtl:text-right ltr:text-left">
            לוח עבודה - הצהרות הון
          </h1>
          <p className="text-muted-foreground rtl:text-right ltr:text-left">
            מעקב אחר כל ההצהרות
          </p>
        </div>
        <div className="flex gap-2 rtl:flex-row-reverse">
          {isAdmin && (
            <>
              <Button
                variant="outline"
                onClick={handleSendRemindersToAll}
                disabled={sendingReminders}
              >
                {sendingReminders ? (
                  <Loader2 className="h-4 w-4 animate-spin rtl:ml-2 ltr:mr-2" />
                ) : (
                  <Mail className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                )}
                {sendingReminders ? 'שולח...' : 'שלח תזכורת לכולם'}
              </Button>
              <Button variant="outline" onClick={() => setShowSettings(!showSettings)}>
                <Settings className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                הגדרות
              </Button>
            </>
          )}
          <Button onClick={() => navigate('/capital-declaration')}>
            <Plus className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
            יצירת הצהרה חדשה
          </Button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && isAdmin && (
        <ReminderSettingsCard />
      )}

      {/* Tab Filter Cards - 5 tabs */}
      <div className="grid gap-3 grid-cols-5">
        {/* בתהליך (In Process) - Default, all except submitted & documents_received */}
        <Card
          className={cn(
            "p-4 cursor-pointer transition-all hover:shadow-md",
            activeTab === 'in_process' && "ring-2 ring-blue-500 bg-blue-50"
          )}
          onClick={() => handleTabChange('in_process')}
        >
          <div className="text-sm text-muted-foreground rtl:text-right">בתהליך</div>
          <div className="text-2xl font-bold rtl:text-right">{stats.inProcess}</div>
        </Card>

        {/* טרם התחילו (Not Started) - waiting or sent */}
        <Card
          className={cn(
            "p-4 cursor-pointer transition-all hover:shadow-md border-slate-200",
            activeTab === 'not_started' ? "ring-2 ring-slate-500 bg-slate-50" : "bg-slate-50/50"
          )}
          onClick={() => handleTabChange('not_started')}
        >
          <div className="text-sm text-slate-600 rtl:text-right">טרם התחילו</div>
          <div className="text-2xl font-bold text-slate-700 rtl:text-right">{stats.notStarted}</div>
        </Card>

        {/* טוענים שסיימו (Client Complete) - documents_received */}
        <Card
          className={cn(
            "p-4 cursor-pointer transition-all hover:shadow-md border-purple-200",
            activeTab === 'client_complete' ? "ring-2 ring-purple-500 bg-purple-50" : "bg-purple-50/50"
          )}
          onClick={() => handleTabChange('client_complete')}
        >
          <div className="text-sm text-purple-600 rtl:text-right">טוענים שסיימו</div>
          <div className="text-2xl font-bold text-purple-700 rtl:text-right">{stats.clientComplete}</div>
        </Card>

        {/* דחופים (Urgent + Critical) */}
        <Card
          className={cn(
            "p-4 cursor-pointer transition-all hover:shadow-md border-red-200",
            activeTab === 'urgent' ? "ring-2 ring-red-500 bg-red-50" : "bg-red-50/50"
          )}
          onClick={() => handleTabChange('urgent')}
        >
          <div className="text-sm text-red-600 rtl:text-right">דחופים</div>
          <div className="text-2xl font-bold text-red-700 rtl:text-right">{stats.urgent}</div>
        </Card>

        {/* הוגשו (Submitted) */}
        <Card
          className={cn(
            "p-4 cursor-pointer transition-all hover:shadow-md border-green-200",
            activeTab === 'submitted' ? "ring-2 ring-green-500 bg-green-50" : "bg-green-50/50"
          )}
          onClick={() => handleTabChange('submitted')}
        >
          <div className="text-sm text-green-600 rtl:text-right">הוגשו</div>
          <div className="text-2xl font-bold text-green-700 rtl:text-right">{stats.submitted}</div>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="rtl:text-right">הצהרות הון</CardTitle>
              <CardDescription className="rtl:text-right">
                ממוין לפי דחיפות ותאריך יעד
              </CardDescription>
            </div>
            <Button onClick={loadData} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
              רענן
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Filters */}
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input

                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pr-10 rtl:text-right"
              />
            </div>

            <Select
              value={priorityFilter}
              onValueChange={(value) => {
                setPriorityFilter(value as DeclarationPriority | 'all');
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[140px] rtl:text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rtl:text-right">
                <SelectItem value="all">כל הדחיפויות</SelectItem>
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as CapitalDeclarationStatus | 'all');
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[160px] rtl:text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rtl:text-right">
                <SelectItem value="all">כל הסטטוסים</SelectItem>
                {Object.entries(DECLARATION_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={assignedFilter}
              onValueChange={(value) => {
                setAssignedFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[160px] rtl:text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rtl:text-right">
                <SelectItem value="all">כל המטפלים</SelectItem>
                <SelectItem value="unassigned">ללא שיוך</SelectItem>
                {accountants.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={yearFilter === 'all' ? 'all' : String(yearFilter)}
              onValueChange={(value) => {
                setYearFilter(value === 'all' ? 'all' : Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[130px] rtl:text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rtl:text-right">
                <SelectItem value="all">כל השנים</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" onClick={resetFilters}>
                נקה פילטרים
              </Button>
            )}
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : declarations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">אין הצהרות הון</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {hasActiveFilters
                  ? 'לא נמצאו תוצאות לחיפוש'
                  : 'לחץ על "יצירת הצהרה חדשה" כדי להתחיל'}
              </p>
              {!hasActiveFilters && (
                <Button onClick={() => navigate('/capital-declaration')}>
                  <Plus className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                  יצירת הצהרה חדשה
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="rtl:text-right w-[60px] py-2">דחיפות</TableHead>
                    <TableHead className="rtl:text-right w-[130px] py-2">איש קשר</TableHead>
                    <TableHead className="rtl:text-right w-[50px] py-2">שנה</TableHead>
                    <TableHead className="rtl:text-right w-[85px] py-2">סטטוס</TableHead>
                    {isAdmin && <TableHead className="rtl:text-right w-[85px] py-2">מטפל</TableHead>}
                    <TableHead className="rtl:text-right w-[85px] py-2">יעד מס</TableHead>
                    <TableHead className="rtl:text-right w-[85px] py-2">יעד משרד</TableHead>
                    <TableHead className="rtl:text-right w-[45px] py-2 text-center">מסמך</TableHead>
                    <TableHead className="rtl:text-right w-[70px] py-2 text-center">הגשה</TableHead>
                    <TableHead className="rtl:text-right w-[100px] py-2">קנס</TableHead>
                    <TableHead className="rtl:text-right w-[90px] py-2">תקשורת</TableHead>
                    {isSuperAdmin && <TableHead className="rtl:text-right w-[40px] py-2"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {declarations.map((declaration) => (
                    <TableRow
                      key={declaration.id}
                      className={cn(
                        'cursor-pointer hover:bg-muted/50 text-xs',
                        PRIORITY_ROW_COLORS[declaration.priority]
                      )}
                      onClick={() => navigate(`/capital-declarations/${declaration.id}`)}
                    >
                      {/* Priority */}
                      <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                        <PriorityBadge
                          priority={declaration.priority}
                          editable={isAdmin}
                          onPriorityChange={(p) => handlePriorityChange(declaration.id, p)}
                          compact
                        />
                      </TableCell>

                      {/* Contact */}
                      <TableCell className="py-2 max-w-[130px]">
                        <div className="rtl:text-right">
                          <div className="font-medium text-sm truncate">{declaration.contact_name}</div>
                          {declaration.client_name && (
                            <div className="text-xs text-muted-foreground truncate">
                              {declaration.client_name}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Tax Year */}
                      <TableCell className="py-2">
                        <span className="font-medium">{declaration.tax_year}</span>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                        <Badge className={cn('text-[10px] px-1.5 py-0', DECLARATION_STATUS_COLORS[declaration.status])}>
                          {DECLARATION_STATUS_LABELS[declaration.status]}
                        </Badge>
                      </TableCell>

                      {/* Assigned (Admin only) */}
                      {isAdmin && (
                        <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                          <AssignAccountantSelect
                            value={declaration.assigned_to}
                            onChange={(userId) => handleAssignmentChange(declaration.id, userId)}

                            className="h-6 text-[10px] w-[80px]"
                          />
                        </TableCell>
                      )}

                      {/* Due Date - Tax Authority */}
                      <TableCell className="py-2">
                        {declaration.tax_authority_due_date ? (
                          <div className="flex flex-col">
                            <span className="text-xs whitespace-nowrap">
                              {formatDeclarationDate(declaration.tax_authority_due_date)}
                            </span>
                            {(() => {
                              const { colorClass, label } = getDaysRemaining(declaration.tax_authority_due_date);
                              return (
                                <span className={cn('text-[10px]', colorClass)}>
                                  {label}
                                </span>
                              );
                            })()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      {/* Due Date - Internal */}
                      <TableCell className="py-2">
                        {declaration.internal_due_date ? (
                          <div className="flex flex-col">
                            <span className="text-xs whitespace-nowrap">
                              {formatDeclarationDate(declaration.internal_due_date)}
                            </span>
                            {(() => {
                              const { colorClass, label } = getDaysRemaining(declaration.internal_due_date);
                              return (
                                <span className={cn('text-[10px]', colorClass)}>
                                  {label}
                                </span>
                              );
                            })()}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      {/* Documents */}
                      <TableCell className="py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <span className="font-medium">{declaration.categories_complete}/6</span>
                      </TableCell>

                      {/* Submission */}
                      <TableCell className="py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        {declaration.status === 'submitted' && (
                          <div className="flex items-center justify-center gap-1">
                            <SubmissionScreenshotLink
                              storagePath={declaration.submission_screenshot_path || null}
                              variant="icon"
                              size="sm"
                            />
                            <LateSubmissionIndicator
                              wasSubmittedLate={declaration.was_submitted_late || false}
                              penaltyStatus={declaration.penalty_status}
                              size="sm"
                              showWarning={false}
                            />
                          </div>
                        )}
                      </TableCell>

                      {/* Penalty */}
                      <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                        {declaration.penalty_status && (
                          <PenaltyStatusBadge
                            status={declaration.penalty_status}
                            amount={declaration.penalty_amount}
                            showAmount
                            size="sm"
                          />
                        )}
                      </TableCell>

                      {/* Last Communication */}
                      <TableCell className="py-2">
                        {declaration.last_communication_at ? (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatRelativeTime(declaration.last_communication_at)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      {/* Delete Button - Super Admin Only */}
                      {isSuperAdmin && (
                        <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={(e) => handleDeleteClick(declaration, e)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalDeclarations > pageSize && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-muted-foreground rtl:text-right">
                מציג {(currentPage - 1) * pageSize + 1} עד{' '}
                {Math.min(currentPage * pageSize, totalDeclarations)} מתוך {totalDeclarations}
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

      {/* Delete Confirmation Dialog - Super Admin Only */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="rtl:text-right">מחיקת הצהרת הון</AlertDialogTitle>
            <AlertDialogDescription className="rtl:text-right">
              האם אתה בטוח שברצונך למחוק את הצהרת ההון של{' '}
              <strong>{declarationToDelete?.contact_name}</strong> לשנת{' '}
              <strong>{declarationToDelete?.tax_year}</strong>?
              <br />
              <span className="text-red-600 font-medium">פעולה זו אינה ניתנת לביטול!</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'מוחק...' : 'מחק'}
            </AlertDialogAction>
            <AlertDialogCancel disabled={deleting}>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
