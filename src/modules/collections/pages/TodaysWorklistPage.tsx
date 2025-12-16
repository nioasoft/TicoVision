/**
 * Today's Worklist Page
 * Shows urgent collection tasks organized by category for easy daily management
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowRight,
  Mail,
  MailWarning,
  Clock,
  AlertTriangle,
  Calendar,
  RefreshCw,
  MoreHorizontal,
  CheckCircle,
  MessageSquare,
  Phone,
} from 'lucide-react';
import { formatILS, formatIsraeliDate } from '@/lib/formatters';
import { collectionService } from '@/services/collection.service';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WorklistCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  items: WorklistItem[];
  loading: boolean;
}

interface WorklistItem {
  fee_calculation_id: string;
  client_id: string;
  client_name: string;
  company_name_hebrew?: string;
  contact_email?: string;
  contact_phone?: string;
  amount: number;
  days_overdue: number;
  promised_date?: string;
  dispute_reason?: string;
}

export const TodaysWorklistPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<WorklistCategory[]>([
    {
      id: 'not_opened',
      title: 'לא פתחו את המכתב',
      description: 'לקוחות שלא פתחו את המייל 7 ימים ומעלה',
      icon: <MailWarning className="h-5 w-5" />,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      items: [],
      loading: true,
    },
    {
      id: 'no_selection',
      title: 'לא בחרו אמצעי תשלום',
      description: 'פתחו את המכתב אך לא בחרו איך לשלם',
      icon: <Clock className="h-5 w-5" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      items: [],
      loading: true,
    },
    {
      id: 'broken_promises',
      title: 'הבטיחו ולא שילמו',
      description: 'לקוחות שהבטיחו לשלם והתאריך עבר',
      icon: <Calendar className="h-5 w-5" />,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      items: [],
      loading: true,
    },
    {
      id: 'disputes',
      title: 'ערעורים פתוחים',
      description: 'לקוחות שטוענים ששילמו',
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      items: [],
      loading: true,
    },
  ]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch data for all categories
  const fetchWorklistData = async () => {
    setRefreshing(true);

    try {
      // Get tenant ID (using the service pattern)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tenantId = user.user_metadata?.tenant_id;
      if (!tenantId) return;

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      // Fetch not opened (7+ days)
      const { data: notOpenedData } = await supabase
        .from('collection_dashboard_view')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('letter_opened_at', null)
        .not('payment_status', 'in', '("paid","cancelled")')
        .lte('letter_sent_date', sevenDaysAgo.toISOString())
        .order('letter_sent_date', { ascending: true });

      // Fetch no selection (14+ days, opened but no selection)
      const { data: noSelectionData } = await supabase
        .from('collection_dashboard_view')
        .select('*')
        .eq('tenant_id', tenantId)
        .not('letter_opened_at', 'is', null)
        .is('payment_method_selected', null)
        .not('payment_status', 'in', '("paid","cancelled")')
        .lte('letter_sent_date', fourteenDaysAgo.toISOString())
        .order('letter_sent_date', { ascending: true });

      // Fetch broken promises
      const promisesResult = await collectionService.getOverduePromises();

      // Fetch disputes
      const { data: disputesData } = await supabase
        .from('payment_disputes')
        .select(`
          id,
          fee_calculation_id,
          client_id,
          dispute_reason,
          claimed_payment_date,
          created_at,
          clients!inner (
            company_name,
            company_name_hebrew,
            contact_email
          ),
          fee_calculations!inner (
            total_amount
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // Update categories
      setCategories((prev) =>
        prev.map((cat) => {
          switch (cat.id) {
            case 'not_opened':
              return {
                ...cat,
                loading: false,
                items: (notOpenedData || []).map((row) => ({
                  fee_calculation_id: row.fee_calculation_id,
                  client_id: row.client_id,
                  client_name: row.company_name,
                  company_name_hebrew: row.company_name_hebrew,
                  contact_email: row.contact_email,
                  amount: Number(row.amount_original),
                  days_overdue: Math.floor(
                    (now.getTime() - new Date(row.letter_sent_date).getTime()) / (1000 * 60 * 60 * 24)
                  ),
                })),
              };
            case 'no_selection':
              return {
                ...cat,
                loading: false,
                items: (noSelectionData || []).map((row) => ({
                  fee_calculation_id: row.fee_calculation_id,
                  client_id: row.client_id,
                  client_name: row.company_name,
                  company_name_hebrew: row.company_name_hebrew,
                  contact_email: row.contact_email,
                  amount: Number(row.amount_original),
                  days_overdue: Math.floor(
                    (now.getTime() - new Date(row.letter_sent_date).getTime()) / (1000 * 60 * 60 * 24)
                  ),
                })),
              };
            case 'broken_promises':
              return {
                ...cat,
                loading: false,
                items: (promisesResult.data || []).map((row: Record<string, unknown>) => {
                  const client = row.clients as Record<string, unknown>;
                  return {
                    fee_calculation_id: row.id as string,
                    client_id: row.client_id as string,
                    client_name: client?.company_name as string,
                    company_name_hebrew: client?.company_name_hebrew as string,
                    contact_email: client?.contact_email as string,
                    amount: Number(row.total_amount),
                    days_overdue: Math.floor(
                      (now.getTime() - new Date(row.promised_payment_date as string).getTime()) /
                        (1000 * 60 * 60 * 24)
                    ),
                    promised_date: row.promised_payment_date as string,
                  };
                }),
              };
            case 'disputes':
              return {
                ...cat,
                loading: false,
                items: (disputesData || []).map((row) => {
                  const client = row.clients as Record<string, unknown>;
                  const fee = row.fee_calculations as Record<string, unknown>;
                  return {
                    fee_calculation_id: row.fee_calculation_id,
                    client_id: row.client_id,
                    client_name: client?.company_name as string,
                    company_name_hebrew: client?.company_name_hebrew as string,
                    contact_email: client?.contact_email as string,
                    amount: Number(fee?.total_amount || 0),
                    days_overdue: Math.floor(
                      (now.getTime() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24)
                    ),
                    dispute_reason: row.dispute_reason,
                  };
                }),
              };
            default:
              return cat;
          }
        })
      );
    } catch (error) {
      console.error('Error fetching worklist data:', error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWorklistData();
  }, []);

  const totalTasks = categories.reduce((sum, cat) => sum + cat.items.length, 0);
  const selectedCategoryData = selectedCategory
    ? categories.find((c) => c.id === selectedCategory)
    : null;

  const handleQuickAction = async (action: string, item: WorklistItem) => {
    switch (action) {
      case 'call':
        if (item.contact_phone) {
          window.open(`tel:${item.contact_phone}`, '_blank');
        } else {
          toast.error('אין מספר טלפון');
        }
        break;
      case 'email':
        navigate(`/collections?filter=fee:${item.fee_calculation_id}`);
        break;
      case 'markPaid':
        try {
          await collectionService.markAsPaid(item.fee_calculation_id, {});
          toast.success('סומן כשולם');
          fetchWorklistData();
        } catch {
          toast.error('שגיאה בסימון כשולם');
        }
        break;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="rtl:text-right">
          <h1 className="text-3xl font-bold rtl:text-right">משימות להיום</h1>
          <p className="text-gray-500 rtl:text-right">
            {totalTasks > 0 ? (
              <>
                יש לך <span className="font-bold text-primary">{totalTasks}</span> משימות לטיפול
              </>
            ) : (
              'אין משימות דחופות - כל הכבוד!'
            )}
          </p>
        </div>
        <div className="flex gap-2 rtl:flex-row-reverse">
          <Button
            variant="outline"
            onClick={fetchWorklistData}
            disabled={refreshing}
            className="rtl:flex-row-reverse gap-2"
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            <span>רענון</span>
          </Button>
          <Button onClick={() => navigate('/collections')} className="rtl:flex-row-reverse gap-2">
            <ArrowRight className="h-4 w-4" />
            <span>למערכת הגביה המלאה</span>
          </Button>
        </div>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {categories.map((category) => (
          <Card
            key={category.id}
            className={cn(
              'cursor-pointer transition-all hover:shadow-md',
              selectedCategory === category.id && 'ring-2 ring-primary'
            )}
            onClick={() =>
              setSelectedCategory(selectedCategory === category.id ? null : category.id)
            }
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between rtl:flex-row-reverse">
                <div className={cn('p-2 rounded-lg', category.bgColor, category.color)}>
                  {category.icon}
                </div>
                <Badge
                  variant={category.items.length > 0 ? 'destructive' : 'secondary'}
                  className="text-lg px-3"
                >
                  {category.loading ? '...' : category.items.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-lg mb-1 rtl:text-right">{category.title}</CardTitle>
              <CardDescription className="rtl:text-right">{category.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selected Category Details */}
      {selectedCategoryData && selectedCategoryData.items.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 rtl:flex-row-reverse">
              <div
                className={cn('p-2 rounded-lg', selectedCategoryData.bgColor, selectedCategoryData.color)}
              >
                {selectedCategoryData.icon}
              </div>
              <div>
                <CardTitle className="rtl:text-right">{selectedCategoryData.title}</CardTitle>
                <CardDescription className="rtl:text-right">
                  {selectedCategoryData.items.length} לקוחות
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
                    <TableHead className="rtl:text-right">ימים</TableHead>
                    {selectedCategory === 'broken_promises' && (
                      <TableHead className="rtl:text-right">תאריך הבטחה</TableHead>
                    )}
                    {selectedCategory === 'disputes' && (
                      <TableHead className="rtl:text-right">סיבת ערעור</TableHead>
                    )}
                    <TableHead className="rtl:text-right w-24">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedCategoryData.items.map((item) => (
                    <TableRow key={item.fee_calculation_id}>
                      <TableCell className="rtl:text-right">
                        <div>
                          <div className="font-medium">
                            {item.company_name_hebrew || item.client_name}
                          </div>
                          <div className="text-xs text-gray-500">{item.contact_email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="rtl:text-right font-medium">
                        {formatILS(item.amount)}
                      </TableCell>
                      <TableCell className="rtl:text-right">
                        <Badge variant={item.days_overdue > 14 ? 'destructive' : 'secondary'}>
                          {item.days_overdue} ימים
                        </Badge>
                      </TableCell>
                      {selectedCategory === 'broken_promises' && (
                        <TableCell className="rtl:text-right">
                          {item.promised_date && formatIsraeliDate(item.promised_date)}
                        </TableCell>
                      )}
                      {selectedCategory === 'disputes' && (
                        <TableCell className="rtl:text-right text-sm">
                          {item.dispute_reason || '-'}
                        </TableCell>
                      )}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rtl:text-right">
                            <DropdownMenuItem
                              onClick={() => handleQuickAction('call', item)}
                              className="rtl:flex-row-reverse gap-2"
                            >
                              <Phone className="h-4 w-4" />
                              <span>התקשר</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleQuickAction('email', item)}
                              className="rtl:flex-row-reverse gap-2"
                            >
                              <Mail className="h-4 w-4" />
                              <span>שלח תזכורת</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleQuickAction('markPaid', item)}
                              className="rtl:flex-row-reverse gap-2"
                            >
                              <CheckCircle className="h-4 w-4" />
                              <span>סמן כשולם</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {totalTasks === 0 && !categories.some((c) => c.loading) && (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <div className="p-4 rounded-full bg-green-100 mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">מעולה! אין משימות דחופות</h3>
            <p className="text-gray-500 mb-4">כל הלקוחות מטופלים כראוי</p>
            <Button variant="outline" onClick={() => navigate('/collections')}>
              עבור למערכת הגביה
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

TodaysWorklistPage.displayName = 'TodaysWorklistPage';
