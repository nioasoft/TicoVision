/**
 * Capital Declarations List Page (ניהול הצהרות הון)
 * Admin dashboard for managing all capital declarations
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { toast } from 'sonner';
import {
  RefreshCw,
  Search,
  FileText,
  Plus,
  MoreHorizontal,
  Eye,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Building2,
  Home,
  Shield,
  Car,
  Globe,
  FolderOpen,
  ExternalLink,
  Users,
} from 'lucide-react';
import { capitalDeclarationService } from '@/services/capital-declaration.service';
import type {
  DeclarationWithCounts,
  CapitalDeclarationStatus,
} from '@/types/capital-declaration.types';
import {
  DECLARATION_STATUS_LABELS,
  DECLARATION_STATUS_COLORS,
  DECLARATION_CATEGORIES,
  getAvailableTaxYears,
  formatDeclarationDate,
} from '@/types/capital-declaration.types';

// Category icons mapping
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  bank: <Building2 className="h-4 w-4 text-blue-500" />,
  real_estate: <Home className="h-4 w-4 text-green-500" />,
  insurance: <Shield className="h-4 w-4 text-yellow-500" />,
  vehicles: <Car className="h-4 w-4 text-purple-500" />,
  abroad: <Globe className="h-4 w-4 text-cyan-500" />,
  other: <FolderOpen className="h-4 w-4 text-pink-500" />,
};

export function CapitalDeclarationsListPage() {
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [declarations, setDeclarations] = useState<DeclarationWithCounts[]>([]);
  const [totalDeclarations, setTotalDeclarations] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CapitalDeclarationStatus | 'all'>('all');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [availableYears, setAvailableYears] = useState<number[]>([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [declarationToDelete, setDeclarationToDelete] = useState<string | null>(null);

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    sent: 0,
    in_progress: 0,
    completed: 0,
  });

  /**
   * Load data on mount and when filters change
   */
  useEffect(() => {
    loadData();
  }, [searchQuery, statusFilter, yearFilter, currentPage]);

  /**
   * Load available years on mount
   */
  useEffect(() => {
    loadAvailableYears();
  }, []);

  /**
   * Load declarations data
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await capitalDeclarationService.getAll({
        page: currentPage,
        pageSize,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        year: yearFilter !== 'all' ? yearFilter : undefined,
        searchQuery: searchQuery || undefined,
      });

      if (error) throw error;

      setDeclarations(data?.declarations || []);
      setTotalDeclarations(data?.total || 0);

      // Calculate stats from current data
      const allDeclarations = data?.declarations || [];
      setStats({
        total: data?.total || 0,
        draft: allDeclarations.filter(d => d.status === 'draft').length,
        sent: allDeclarations.filter(d => d.status === 'sent').length,
        in_progress: allDeclarations.filter(d => d.status === 'in_progress').length,
        completed: allDeclarations.filter(d => d.status === 'completed').length,
      });
    } catch (error) {
      console.error('Error loading declarations:', error);
      toast.error('שגיאה בטעינת ההצהרות');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, yearFilter, currentPage, pageSize]);

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
   * Copy portal link to clipboard
   */
  const handleCopyLink = async (token: string) => {
    const link = capitalDeclarationService.getPortalLink(token);
    try {
      await navigator.clipboard.writeText(link);
      toast.success('הלינק הועתק ללוח');
    } catch (error) {
      console.error('Error copying link:', error);
      toast.error('שגיאה בהעתקת הלינק');
    }
  };

  /**
   * Open portal in new tab
   */
  const handleOpenPortal = (token: string) => {
    const link = capitalDeclarationService.getPortalLink(token);
    window.open(link, '_blank');
  };

  /**
   * Delete declaration
   */
  const handleDelete = async () => {
    if (!declarationToDelete) return;

    try {
      const { error } = await capitalDeclarationService.delete(declarationToDelete);
      if (error) throw error;

      toast.success('ההצהרה נמחקה בהצלחה');
      setDeleteDialogOpen(false);
      setDeclarationToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting declaration:', error);
      toast.error('שגיאה במחיקת ההצהרה');
    }
  };

  /**
   * Reset filters
   */
  const resetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setYearFilter('all');
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalDeclarations / pageSize);

  /**
   * Get document count display
   */
  const getDocumentCountDisplay = (declaration: DeclarationWithCounts) => {
    const { document_counts, categories_complete } = declaration;

    return (
      <div className="flex items-center gap-1">
        {DECLARATION_CATEGORIES.map(cat => {
          const count = document_counts.find(c => c.category === cat.key)?.count || 0;
          const hasDocuments = count > 0;
          return (
            <div
              key={cat.key}
              className={`flex items-center justify-center w-6 h-6 rounded ${
                hasDocuments ? 'bg-green-100' : 'bg-gray-100'
              }`}
              title={`${cat.label}: ${count} מסמכים`}
            >
              {CATEGORY_ICONS[cat.key]}
            </div>
          );
        })}
        <span className="text-sm text-muted-foreground mr-2">
          ({categories_complete}/6)
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight rtl:text-right ltr:text-left">
            ניהול הצהרות הון
          </h1>
          <p className="text-muted-foreground rtl:text-right ltr:text-left">
            מעקב אחר הצהרות הון ומסמכים שהועלו
          </p>
        </div>
        <Button onClick={() => navigate('/capital-declaration')}>
          <Plus className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
          יצירת הצהרה חדשה
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right">סה"כ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold rtl:text-right">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right">טיוטות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500 rtl:text-right">{stats.draft}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right">נשלחו</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 rtl:text-right">{stats.sent}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right">בתהליך</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 rtl:text-right">{stats.in_progress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium rtl:text-right">הושלמו</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 rtl:text-right">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="rtl:text-right">הצהרות הון</CardTitle>
              <CardDescription className="rtl:text-right">
                רשימת כל ההצהרות עם מעקב מסמכים
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
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
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
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as CapitalDeclarationStatus | 'all');
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[180px] rtl:text-right">
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

            <Select
              value={yearFilter === 'all' ? 'all' : String(yearFilter)}
              onValueChange={(value) => {
                setYearFilter(value === 'all' ? 'all' : Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[150px] rtl:text-right">
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

            {(searchQuery || statusFilter !== 'all' || yearFilter !== 'all') && (
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
                {searchQuery || statusFilter !== 'all' || yearFilter !== 'all'
                  ? 'לא נמצאו תוצאות לחיפוש'
                  : 'לחץ על "יצירת הצהרה חדשה" כדי להתחיל'}
              </p>
              {!searchQuery && statusFilter === 'all' && yearFilter === 'all' && (
                <Button onClick={() => navigate('/capital-declaration')}>
                  <Plus className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                  יצירת הצהרה חדשה
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="rtl:text-right">איש קשר</TableHead>
                    <TableHead className="rtl:text-right">לקוח/קבוצה</TableHead>
                    <TableHead className="rtl:text-right">שנת מס</TableHead>
                    <TableHead className="rtl:text-right">סטטוס</TableHead>
                    <TableHead className="rtl:text-right">מסמכים</TableHead>
                    <TableHead className="rtl:text-right">גישה לפורטל</TableHead>
                    <TableHead className="rtl:text-right">נוצר</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {declarations.map((declaration) => (
                    <TableRow key={declaration.id}>
                      {/* Contact */}
                      <TableCell>
                        <div className="rtl:text-right">
                          <div className="font-medium">{declaration.contact_name}</div>
                          {declaration.contact_email && (
                            <div className="text-sm text-muted-foreground">
                              {declaration.contact_email}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Client/Group */}
                      <TableCell>
                        <div className="rtl:text-right">
                          {declaration.client_name && (
                            <div className="font-medium">{declaration.client_name}</div>
                          )}
                          {declaration.group_name && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {declaration.group_name}
                            </div>
                          )}
                          {!declaration.client_name && !declaration.group_name && (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>

                      {/* Tax Year */}
                      <TableCell>
                        <div className="rtl:text-right font-medium">{declaration.tax_year}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDeclarationDate(declaration.declaration_date)}
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <Badge className={DECLARATION_STATUS_COLORS[declaration.status]}>
                          {DECLARATION_STATUS_LABELS[declaration.status]}
                        </Badge>
                      </TableCell>

                      {/* Documents */}
                      <TableCell>{getDocumentCountDisplay(declaration)}</TableCell>

                      {/* Portal Access */}
                      <TableCell>
                        {declaration.portal_accessed_at ? (
                          <div className="rtl:text-right">
                            <div className="text-sm text-green-600">נצפה</div>
                            <div className="text-xs text-muted-foreground">
                              {declaration.portal_access_count} פעמים
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">טרם נצפה</span>
                        )}
                      </TableCell>

                      {/* Created */}
                      <TableCell>
                        <div className="text-sm text-muted-foreground rtl:text-right">
                          {new Date(declaration.created_at).toLocaleDateString('he-IL')}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rtl:text-right">
                            <DropdownMenuItem
                              onClick={() => navigate(`/capital-declarations/${declaration.id}`)}
                            >
                              <Eye className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                              צפייה בפרטים
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleCopyLink(declaration.public_token)}
                            >
                              <Copy className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                              העתק לינק לפורטל
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenPortal(declaration.public_token)}
                            >
                              <ExternalLink className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                              פתח פורטל
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setDeclarationToDelete(declaration.id);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                              מחק
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rtl:text-right">
          <AlertDialogHeader>
            <AlertDialogTitle className="rtl:text-right">מחיקת הצהרה</AlertDialogTitle>
            <AlertDialogDescription className="rtl:text-right">
              האם אתה בטוח שברצונך למחוק הצהרה זו? פעולה זו תמחק גם את כל המסמכים המשויכים
              ולא ניתן לשחזר אותה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="rtl:flex-row-reverse rtl:gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
