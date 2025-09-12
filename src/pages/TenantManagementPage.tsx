import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building2, 
  Users, 
  Settings,
  Activity,
  DollarSign,
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle,
  Clock,
  Mail,
  Phone,
  Globe,
  Palette,
  Database,
  Shield
} from 'lucide-react';
import { TenantManagementService } from '@/services/tenant-management.service';
import { SuperAdminService } from '@/services/super-admin.service';
import { authService } from '@/services/auth.service';
import { formatCurrency } from '@/lib/utils';

const tenantService = new TenantManagementService();
const superAdminService = new SuperAdminService();

export default function TenantManagementPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenant, setTenant] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    checkAccess();
    if (id) {
      loadTenantData();
    }
  }, [id]);

  const checkAccess = async () => {
    const isSuperAdmin = await authService.isSuperAdmin();
    if (!isSuperAdmin) {
      navigate('/dashboard');
    }
  };

  const loadTenantData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      
      // Load tenant details
      const details = await tenantService.getTenantDetails(id);
      setSettings(details.settings);
      setSubscription(details.subscription);
      
      // Load tenant stats
      const tenantStats = await superAdminService.getTenantStats(id);
      setStats(tenantStats);
      
      // Load users
      const tenantUsers = await tenantService.getTenantUsers(id);
      setUsers(Array.isArray(tenantUsers) ? tenantUsers : []);
      
      // Load activity logs
      const logs = await tenantService.getTenantActivityLogs(id, { limit: 50 });
      setActivityLogs(Array.isArray(logs) ? logs : []);
      
      // Get basic tenant info
      const allTenants = await superAdminService.listAllTenants();
      const currentTenant = allTenants.find(t => t.id === id);
      setTenant(currentTenant);
    } catch (error) {
      console.error('Error loading tenant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!id) return;
    
    try {
      setSaving(true);
      
      // Update tenant settings
      await tenantService.updateTenantBranding(id, {
        logoUrl: settings?.logo_url,
        primaryColor: settings?.primary_color,
        secondaryColor: settings?.secondary_color,
        accentColor: settings?.accent_color
      });
      
      // Update features
      await tenantService.updateTenantFeatures(id, settings?.features || {});
      
      // Update limits
      await tenantService.updateTenantLimits(id, settings?.limits || {});
      
      alert('הגדרות נשמרו בהצלחה!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('שגיאה בשמירת ההגדרות');
    } finally {
      setSaving(false);
    }
  };

  const handleSuspendTenant = async () => {
    if (!id) return;
    
    if (confirm('האם אתה בטוח שברצונך להשהות את העסק?')) {
      try {
        await superAdminService.suspendTenant(id, 'Suspended by Super Admin');
        await loadTenantData();
        alert('העסק הושהה בהצלחה');
      } catch (error) {
        console.error('Error suspending tenant:', error);
      }
    }
  };

  const handleActivateTenant = async () => {
    if (!id) return;
    
    try {
      await superAdminService.activateTenant(id);
      await loadTenantData();
      alert('העסק הופעל בהצלחה');
    } catch (error) {
      console.error('Error activating tenant:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">טוען נתוני עסק...</p>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">עסק לא נמצא</h2>
          <Button onClick={() => navigate('/super-admin')}>
            חזור ל-Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/super-admin')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{tenant.name}</h1>
            <p className="text-muted-foreground">ניהול עסק</p>
          </div>
        </div>
        <div className="flex gap-2">
          {subscription?.status === 'suspended' ? (
            <Button onClick={handleActivateTenant} variant="default">
              הפעל עסק
            </Button>
          ) : (
            <Button onClick={handleSuspendTenant} variant="destructive">
              השהה עסק
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">משתמשים</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeUsers || 0} פעילים
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">לקוחות</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">הכנסות</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.revenue || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">סטטוס</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={
              subscription?.status === 'active' ? 'default' :
              subscription?.status === 'trialing' ? 'secondary' :
              'destructive'
            }>
              {subscription?.status || 'לא פעיל'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {subscription?.plan_name || settings?.billing_plan}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">הגדרות</TabsTrigger>
          <TabsTrigger value="users">משתמשים</TabsTrigger>
          <TabsTrigger value="billing">בילינג</TabsTrigger>
          <TabsTrigger value="activity">פעילות</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>הגדרות עסק</CardTitle>
              <CardDescription>ניהול הגדרות ומיתוג</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Company Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">פרטי חברה</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">שם החברה</Label>
                    <Input
                      id="company_name"
                      value={settings?.company_name || ''}
                      onChange={(e) => setSettings({...settings, company_name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_email">אימייל</Label>
                    <Input
                      id="company_email"
                      type="email"
                      value={settings?.company_email || ''}
                      onChange={(e) => setSettings({...settings, company_email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_phone">טלפון</Label>
                    <Input
                      id="company_phone"
                      value={settings?.company_phone || ''}
                      onChange={(e) => setSettings({...settings, company_phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="custom_domain">דומיין מותאם</Label>
                    <Input
                      id="custom_domain"
                      value={settings?.custom_domain || ''}
                      onChange={(e) => setSettings({...settings, custom_domain: e.target.value})}
                      placeholder="example.com"
                    />
                  </div>
                </div>
              </div>

              {/* Branding */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">מיתוג</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="primary_color">צבע ראשי</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primary_color"
                        type="color"
                        value={settings?.primary_color || '#3b82f6'}
                        onChange={(e) => setSettings({...settings, primary_color: e.target.value})}
                        className="w-20"
                      />
                      <Input
                        value={settings?.primary_color || '#3b82f6'}
                        onChange={(e) => setSettings({...settings, primary_color: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondary_color">צבע משני</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondary_color"
                        type="color"
                        value={settings?.secondary_color || '#10b981'}
                        onChange={(e) => setSettings({...settings, secondary_color: e.target.value})}
                        className="w-20"
                      />
                      <Input
                        value={settings?.secondary_color || '#10b981'}
                        onChange={(e) => setSettings({...settings, secondary_color: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accent_color">צבע דגש</Label>
                    <div className="flex gap-2">
                      <Input
                        id="accent_color"
                        type="color"
                        value={settings?.accent_color || '#f59e0b'}
                        onChange={(e) => setSettings({...settings, accent_color: e.target.value})}
                        className="w-20"
                      />
                      <Input
                        value={settings?.accent_color || '#f59e0b'}
                        onChange={(e) => setSettings({...settings, accent_color: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">תכונות</h3>
                <div className="space-y-2">
                  {Object.entries(settings?.features || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <Label htmlFor={key} className="font-normal">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Label>
                      <Switch
                        id={key}
                        checked={value as boolean}
                        onCheckedChange={(checked) => 
                          setSettings({
                            ...settings,
                            features: {...settings?.features, [key]: checked}
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Limits */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">מגבלות</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(settings?.limits || {}).map(([key, value]) => (
                    <div key={key} className="space-y-2">
                      <Label htmlFor={key}>
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Label>
                      <Input
                        id={key}
                        type="number"
                        value={value as number}
                        onChange={(e) => 
                          setSettings({
                            ...settings,
                            limits: {...settings?.limits, [key]: parseInt(e.target.value)}
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Button onClick={handleSaveSettings} disabled={saving}>
                <Save className="ml-2 h-4 w-4" />
                {saving ? 'שומר...' : 'שמור הגדרות'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>משתמשים</CardTitle>
              <CardDescription>{users.length} משתמשים עם גישה לעסק</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.userId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{user.email}</p>
                      <p className="text-sm text-muted-foreground">
                        {user.role} • {user.isPrimary && 'ראשי • '}
                        {user.isActive ? 'פעיל' : 'לא פעיל'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.lastAccessedAt && (
                        <span className="text-xs text-muted-foreground">
                          גישה אחרונה: {new Date(user.lastAccessedAt).toLocaleDateString('he-IL')}
                        </span>
                      )}
                      <Badge variant={user.isActive ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>מנוי ובילינג</CardTitle>
              <CardDescription>ניהול תוכנית ותשלומים</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>תוכנית</Label>
                  <p className="text-lg font-medium">{subscription?.plan_name || 'Starter'}</p>
                </div>
                <div>
                  <Label>סטטוס</Label>
                  <Badge variant={
                    subscription?.status === 'active' ? 'default' :
                    subscription?.status === 'trialing' ? 'secondary' :
                    'destructive'
                  }>
                    {subscription?.status || 'לא פעיל'}
                  </Badge>
                </div>
                <div>
                  <Label>מחיר למחזור</Label>
                  <p className="text-lg font-medium">
                    {formatCurrency(subscription?.price_per_cycle || 0)}
                  </p>
                </div>
                <div>
                  <Label>מחזור חיוב</Label>
                  <p className="text-lg font-medium">{subscription?.billing_cycle || 'חודשי'}</p>
                </div>
                {subscription?.trial_end_date && (
                  <div>
                    <Label>תקופת ניסיון מסתיימת</Label>
                    <p className="text-lg font-medium">
                      {new Date(subscription.trial_end_date).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                )}
                {subscription?.next_billing_date && (
                  <div>
                    <Label>חיוב הבא</Label>
                    <p className="text-lg font-medium">
                      {new Date(subscription.next_billing_date).toLocaleDateString('he-IL')}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Current Usage */}
              <div>
                <h4 className="font-semibold mb-2">שימוש נוכחי</h4>
                <div className="space-y-2">
                  {Object.entries(subscription?.current_usage || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-sm text-muted-foreground">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <span className="font-medium">{value as any}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>פעילות אחרונה</CardTitle>
              <CardDescription>50 האירועים האחרונים</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {activityLogs.map((log) => (
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
                          {log.action_category && (
                            <Badge variant="outline" className="text-xs">
                              {log.action_category}
                            </Badge>
                          )}
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
      </Tabs>
    </div>
  );
}