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
} from 'lucide-react';
import { capitalDeclarationService } from '@/services/capital-declaration.service';
import {
  PriorityBadge,
  AssignAccountantSelect,
} from '@/components/capital-declarations';
import { useAuth } from '@/contexts/AuthContext';
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
  const isAdmin = role === 'admin';

  // State
  const [loading, setLoading] = useState(true);
  const [declarations, setDeclarations] = useState<DeclarationWithCounts[]>([]);
  const [totalDeclarations, setTotalDeclarations] = useState(0);
  const [accountants, setAccountants] = useState<{ id: string; name: string; email: string }[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CapitalDeclarationStatus | 'all'>('all');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<DeclarationPriority | 'all'>('all');
  const [assignedFilter, setAssignedFilter] = useState<string | 'all'>('all');
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    waiting: 0,
    sent: 0,
    in_progress: 0,
    completed: 0,
    critical: 0,
    urgent: 0,
  });

  /**
   * Load data on mount and when filters change
   */
  useEffect(() => {
    loadData();
  }, [searchQuery, statusFilter, yearFilter, priorityFilter, assignedFilter, currentPage]);

  /**
   * Load available years and accountants on mount
   */
  useEffect(() => {
    loadAvailableYears();
    loadAccountants();
  }, []);

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
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // For non-admin users, filter by their own assignments
      const assignedTo = !isAdmin
        ? user?.id
        : assignedFilter !== 'all'
          ? assignedFilter
          : undefined;

      const { data, error } = await capitalDeclarationService.getDashboard({
        page: currentPage,
        pageSize,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        year: yearFilter !== 'all' ? yearFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        assignedTo,
        searchQuery: searchQuery || undefined,
      });

      if (error) throw error;

      setDeclarations(data?.declarations || []);
      setTotalDeclarations(data?.total || 0);

      // Calculate stats from current data
      const allDeclarations = data?.declarations || [];
      setStats({
        total: data?.total || 0,
        waiting: allDeclarations.filter((d) => d.status === 'waiting').length,
        sent: allDeclarations.filter((d) => d.status === 'sent').length,
        in_progress: allDeclarations.filter((d) => d.status === 'in_progress').length,
        completed: allDeclarations.filter((d) => d.status === 'completed').length,
        critical: allDeclarations.filter((d) => d.priority === 'critical').length,
        urgent: allDeclarations.filter((d) => d.priority === 'urgent').length,
      });
    } catch (error) {
      console.error('Error loading declarations:', error);
      toast.error('שגיאה בטעינת ההצהרות');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, yearFilter, priorityFilter, assignedFilter, currentPage, pageSize, isAdmin, user?.id]);

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
   * Reset filters
   */
  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setYearFilter('all');
    setPriorityFilter('all');
    setAssignedFilter('all');
    setCurrentPage(1);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight rtl:text-right ltr:text-left">
            לוח עבודה - הצהרות הון
          </h1>
          <p className="text-muted-foreground rtl:text-right ltr:text-left">
            {isAdmin ? 'מעקב אחר כל ההצהרות' : 'ההצהרות המשויכות אליך'}
          </p>
        </div>
        <Button onClick={() => navigate('/capital-declaration')}>
          <Plus className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
          יצירת הצהרה חדשה
        </Button>
      </div>

      {/* Statistics Cards - Compact & Clickable */}
      <div className="grid gap-2 grid-cols-4 md:grid-cols-7">
        <Card
          className={cn(
            "p-3 cursor-pointer transition-all hover:shadow-md",
            statusFilter === 'all' && priorityFilter === 'all' && "ring-2 ring-primary"
          )}
          onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); setCurrentPage(1); }}
        >
          <div className="text-xs text-muted-foreground rtl:text-right">סה"כ</div>
          <div className="text-xl font-bold rtl:text-right">{stats.total}</div>
        </Card>

        <Card
          className={cn(
            "p-3 cursor-pointer transition-all hover:shadow-md border-red-200 bg-red-50",
            priorityFilter === 'critical' && "ring-2 ring-red-500"
          )}
          onClick={() => { setPriorityFilter('critical'); setStatusFilter('all'); setCurrentPage(1); }}
        >
          <div className="text-xs text-red-600 rtl:text-right">בהול</div>
          <div className="text-xl font-bold text-red-700 rtl:text-right">{stats.critical}</div>
        </Card>

        <Card
          className={cn(
            "p-3 cursor-pointer transition-all hover:shadow-md border-orange-200 bg-orange-50",
            priorityFilter === 'urgent' && "ring-2 ring-orange-500"
          )}
          onClick={() => { setPriorityFilter('urgent'); setStatusFilter('all'); setCurrentPage(1); }}
        >
          <div className="text-xs text-orange-600 rtl:text-right">דחוף</div>
          <div className="text-xl font-bold text-orange-700 rtl:text-right">{stats.urgent}</div>
        </Card>

        <Card
          className={cn(
            "p-3 cursor-pointer transition-all hover:shadow-md",
            statusFilter === 'waiting' && "ring-2 ring-slate-500"
          )}
          onClick={() => { setStatusFilter('waiting'); setPriorityFilter('all'); setCurrentPage(1); }}
        >
          <div className="text-xs text-muted-foreground rtl:text-right">ממתינים</div>
          <div className="text-xl font-bold text-slate-600 rtl:text-right">{stats.waiting}</div>
        </Card>

        <Card
          className={cn(
            "p-3 cursor-pointer transition-all hover:shadow-md",
            statusFilter === 'sent' && "ring-2 ring-blue-500"
          )}
          onClick={() => { setStatusFilter('sent'); setPriorityFilter('all'); setCurrentPage(1); }}
        >
          <div className="text-xs text-muted-foreground rtl:text-right">נשלחו</div>
          <div className="text-xl font-bold text-blue-600 rtl:text-right">{stats.sent}</div>
        </Card>

        <Card
          className={cn(
            "p-3 cursor-pointer transition-all hover:shadow-md",
            statusFilter === 'in_progress' && "ring-2 ring-yellow-500"
          )}
          onClick={() => { setStatusFilter('in_progress'); setPriorityFilter('all'); setCurrentPage(1); }}
        >
          <div className="text-xs text-muted-foreground rtl:text-right">בתהליך</div>
          <div className="text-xl font-bold text-yellow-600 rtl:text-right">{stats.in_progress}</div>
        </Card>

        <Card
          className={cn(
            "p-3 cursor-pointer transition-all hover:shadow-md",
            statusFilter === 'completed' && "ring-2 ring-green-500"
          )}
          onClick={() => { setStatusFilter('completed'); setPriorityFilter('all'); setCurrentPage(1); }}
        >
          <div className="text-xs text-muted-foreground rtl:text-right">הושלמו</div>
          <div className="text-xl font-bold text-green-600 rtl:text-right">{stats.completed}</div>
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
                placeholder="חיפוש לפי שם או מייל..."
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
                <SelectValue placeholder="דחיפות" />
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
                <SelectValue placeholder="סטטוס" />
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

            {isAdmin && (
              <Select
                value={assignedFilter}
                onValueChange={(value) => {
                  setAssignedFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[160px] rtl:text-right">
                  <SelectValue placeholder="רו&quot;ח מטפל" />
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
            )}

            <Select
              value={yearFilter === 'all' ? 'all' : String(yearFilter)}
              onValueChange={(value) => {
                setYearFilter(value === 'all' ? 'all' : Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[130px] rtl:text-right">
                <SelectValue placeholder="שנת מס" />
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
                    <TableHead className="rtl:text-right w-[70px] py-2">דחיפות</TableHead>
                    <TableHead className="rtl:text-right py-2">איש קשר</TableHead>
                    <TableHead className="rtl:text-right w-[60px] py-2">שנה</TableHead>
                    <TableHead className="rtl:text-right w-[90px] py-2">סטטוס</TableHead>
                    {isAdmin && <TableHead className="rtl:text-right w-[90px] py-2">מטפל</TableHead>}
                    <TableHead className="rtl:text-right w-[90px] py-2">יעד מס</TableHead>
                    <TableHead className="rtl:text-right w-[90px] py-2">יעד משרד</TableHead>
                    <TableHead className="rtl:text-right w-[50px] py-2 text-center">מסמך</TableHead>
                    <TableHead className="rtl:text-right w-[100px] py-2">תקשורת</TableHead>
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
                      <TableCell className="py-2">
                        <div className="rtl:text-right">
                          <div className="font-medium text-sm">{declaration.contact_name}</div>
                          {declaration.client_name && (
                            <div className="text-xs text-muted-foreground truncate max-w-[150px]">
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
                            placeholder="לא משויך"
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
    </div>
  );
}
