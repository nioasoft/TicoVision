import React, { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Building2,
  Users,
  Coins,
  Activity,
  Settings,
  Plus,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Shield
} from 'lucide-react';
import { SuperAdminService, type TenantWithDetails, type GlobalStats } from '@/services/super-admin.service';
import type { Database } from '@/types/supabase';

type TenantActivityLog = Database['public']['Tables']['tenant_activity_logs']['Row'];
import { authService } from '@/services/auth.service';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '@/lib/utils';
import TenantSwitcher from '@/components/TenantSwitcher';

const superAdminService = new SuperAdminService();

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [tenants, setTenants] = useState<TenantWithDetails[]>([]);
  const [recentActivity, setRecentActivity] = useState<TenantActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Debounce search query to reduce re-renders
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    checkAccess();
    loadDashboardData();
  }, []);

  const checkAccess = async () => {
    const isSuperAdmin = await authService.isSuperAdmin();
    if (!isSuperAdmin) {
      navigate('/dashboard');
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load global stats
      const globalStats = await superAdminService.getGlobalStats();
      setStats(globalStats);

      // Load all tenants
      const allTenants = await superAdminService.listAllTenants();
      setTenants(allTenants);

      // Load recent activity
      const activity = await superAdminService.getGlobalActivityLogs(50);
      setRecentActivity(activity);
    } catch (error) {
      logger.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = () => {
    navigate('/super-admin/tenants/new');
  };

  const handleTenantClick = (tenantId: string) => {
    navigate(`/super-admin/tenants/${tenantId}`);
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
    tenant.settings?.company_email?.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">טוען נתוני Super Admin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">ניהול מרכזי של כל העסקים במערכת</p>
        </div>
        <div className="flex gap-2">
          <TenantSwitcher />
          <Button onClick={handleCreateTenant}>
            <Plus className="ml-2 h-4 w-4" />
            עסק חדש
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">סה"כ עסקים</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTenants || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeTenants || 0} פעילים
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">משתמשים</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              בכל העסקים
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">לקוחות</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
            <p className="text-xs text-muted-foreground">
              סה"כ במערכת
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">הכנסות</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              ממוצע {formatCurrency(stats?.averageRevenuePerTenant || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="tenants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tenants">עסקים</TabsTrigger>
          <TabsTrigger value="activity">פעילות אחרונה</TabsTrigger>
          <TabsTrigger value="analytics">אנליטיקס</TabsTrigger>
          <TabsTrigger value="settings">הגדרות</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="space-y-4">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"

                className="w-full pr-8 p-2 border rounded-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="ml-2 h-4 w-4" />
              סינון
            </Button>
          </div>

          {/* Tenants Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTenants.map((tenant) => (
              <Card 
                key={tenant.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleTenantClick(tenant.id)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{tenant.name}</CardTitle>
                      <CardDescription>
                        {tenant.settings?.company_email}
                      </CardDescription>
                    </div>
                    <Badge variant={
                      tenant.subscription?.status === 'active' ? 'default' :
                      tenant.subscription?.status === 'trialing' ? 'secondary' :
                      'destructive'
                    }>
                      {tenant.subscription?.status || 'לא פעיל'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{tenant.userCount} משתמשים</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      <span>{tenant.clientCount} לקוחות</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      <span>{tenant.settings?.billing_plan || 'starter'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>נוצר {new Date(tenant.created_at).toLocaleDateString('he-IL')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>פעילות אחרונה במערכת</CardTitle>
              <CardDescription>50 האירועים האחרונים</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {recentActivity.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 pb-4 border-b">
                      <div className="mt-1">
                        {log.status === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : log.status === 'failure' ? (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{log.action}</span>
                          <Badge variant="outline" className="text-xs">
                            {log.tenants?.name}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {log.user_email} • {new Date(log.created_at).toLocaleString('he-IL')}
                        </p>
                        {log.resource_type && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {log.resource_type}: {log.resource_name || log.resource_id}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>צמיחת עסקים</CardTitle>
                <CardDescription>מגמת הוספת עסקים חדשים</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12" />
                  <span className="mr-2">גרף יוצג כאן</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>הכנסות לפי תוכנית</CardTitle>
                <CardDescription>התפלגות הכנסות לפי סוג מנוי</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <TrendingUp className="h-12 w-12" />
                  <span className="mr-2">גרף יוצג כאן</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>הגדרות Super Admin</CardTitle>
              <CardDescription>ניהול הרשאות ותצורת מערכת</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/super-admin/permissions')}
              >
                <Shield className="ml-2 h-4 w-4" />
                ניהול הרשאות תפקידים
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="ml-2 h-4 w-4" />
                ניהול משתמשי Super Admin
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="ml-2 h-4 w-4" />
                הגדרות מערכת גלובליות
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="ml-2 h-4 w-4" />
                תוכניות מנוי ומחירון
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="ml-2 h-4 w-4" />
                ניהול תבניות ברירת מחדל
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}