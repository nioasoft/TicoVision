import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  User,
  Calculator,
  FileText,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
  UserPlus,
  Shield,
  CreditCard,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Receipt,
  MailPlus,
  MessageSquarePlus,
  Building2,
  FileSignature,
  ScrollText,
  HelpCircle,
  Ticket,
  ListFilter,
  Scale,
  MessageCircle,
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { registrationService } from '@/services/registration.service';
import TenantSwitcher from '@/components/TenantSwitcher';
import { authService } from '@/services/auth.service';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types/user-role';
import { ChatPanel } from '@/modules/chat/components/ChatPanel';
import { UnreadBadge } from '@/modules/chat/components/UnreadBadge';
import { useChatStore } from '@/modules/chat/store/chatStore';

interface SubmenuItem {
  name: string;
  href: string;
  menuKey: string; // Permission key for dynamic permission checks
  allowedRoles?: UserRole[]; // Fallback if not specified, inherits from parent
}

interface NavigationItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  menuKey: string; // Permission key for dynamic permission checks
  allowedRoles: UserRole[]; // Fallback for static checks
  showBadge?: boolean;
  submenu?: SubmenuItem[];
}

const navigation: NavigationItem[] = [
  { name: 'לוח בקרה', href: '/dashboard', icon: LayoutDashboard, menuKey: 'dashboard', allowedRoles: ['admin'] as UserRole[] },
  {
    name: 'לקוחות',
    icon: Users,
    menuKey: 'clients',
    allowedRoles: ['admin', 'bookkeeper', 'client'] as UserRole[],
    submenu: [
      { name: 'חברה בודדת', href: '/clients', menuKey: 'clients:list' },
      { name: 'קבוצת חברות', href: '/client-groups', menuKey: 'clients:groups', allowedRoles: ['admin'] as UserRole[] },
      { name: 'עצמאים', href: '/freelancers', menuKey: 'clients:freelancers' },
      { name: 'אנשי קשר', href: '/contacts', menuKey: 'contacts', allowedRoles: ['admin'] as UserRole[] },
    ]
  },
  { name: 'פרוטוקולים', href: '/protocols', icon: ScrollText, menuKey: 'protocols', allowedRoles: ['admin', 'accountant'] as UserRole[] },
  {
    name: 'שכר טרחה',
    icon: Calculator,
    menuKey: 'fees',
    allowedRoles: ['admin'] as UserRole[],
    submenu: [
      { name: 'מעקב שכר טרחה', href: '/fees/tracking', menuKey: 'fees:tracking' },
      { name: 'חישוב שכר טרחה', href: '/fees/calculate', menuKey: 'fees:calculate' },
      { name: 'גביית תשלומים', href: '/collections', menuKey: 'fees:collections' },
    ]
  },
  {
    name: 'מכתבים מילוליים',
    icon: FileText,
    menuKey: 'letters',
    allowedRoles: ['admin'] as UserRole[],
    submenu: [
      { name: 'כתיבת מכתבים', href: '/letter-templates', menuKey: 'letters:templates' },
      { name: 'סימולציית מכתבים', href: '/component-simulator', menuKey: 'letters:simulator' },
      { name: 'היסטוריית מכתבים', href: '/documents', menuKey: 'letters:history' },
    ]
  },
  {
    name: 'מכתבי הזנה לטובת אוטומציה',
    icon: ScrollText,
    menuKey: 'documents',
    allowedRoles: ['admin', 'accountant', 'bookkeeper'] as UserRole[],
    submenu: [
      { name: 'אישורי עובדים זרים', href: '/foreign-workers', menuKey: 'documents:foreign-workers' },
      { name: 'אישורים חברת צלול', href: '/tzlul-approvals', menuKey: 'documents:tzlul-approvals' },
      { name: 'מכתבים אוטומטיים', href: '/auto-letters', menuKey: 'documents:auto-letters' },
    ]
  },
  {
    name: 'הצהרת הון',
    icon: FileSignature,
    menuKey: 'capital-declaration',
    allowedRoles: ['admin', 'accountant'] as UserRole[],
    submenu: [
      { name: 'יצירת הצהרה', href: '/capital-declaration', menuKey: 'capital-declaration:create' },
      { name: 'ניהול הצהרות', href: '/capital-declarations', menuKey: 'capital-declaration:manage' },
    ]
  },
  { name: 'מערכת שליטה בדוחות', href: '/annual-balance', icon: Scale, menuKey: 'annual-balance', allowedRoles: ['admin', 'accountant', 'bookkeeper'] as UserRole[] },
  { name: 'רשימות תפוצה', href: '/broadcast', icon: ListFilter, menuKey: 'broadcast', allowedRoles: ['admin'] as UserRole[] },
  { name: 'Tico Tickets', href: '/tico-tickets', icon: Ticket, menuKey: 'tico-tickets', allowedRoles: ['admin', 'accountant'] as UserRole[] },
  { name: 'מנהל הקבצים', href: '/files', icon: FolderOpen, menuKey: 'files', allowedRoles: ['admin', 'bookkeeper'] as UserRole[] },
  { name: 'משתמשים', href: '/users', icon: UserCog, menuKey: 'users', allowedRoles: ['admin'] as UserRole[], showBadge: true },
  { name: 'הגדרות', href: '/settings', icon: Settings, menuKey: 'settings', allowedRoles: ['admin'] as UserRole[] },
  { name: 'עזרה והדרכה', href: '/help', icon: HelpCircle, menuKey: 'help', allowedRoles: ['admin', 'accountant'] as UserRole[] },
];

const getRoleDisplayName = (role: UserRole | null): string => {
  const roleNames: Record<UserRole, string> = {
    'admin': 'מנהל',
    'accountant': 'רואה חשבון',
    'bookkeeper': 'מנהלת חשבונות',
    'client': 'לקוח',
    'restricted': 'משתמש מוגבל',
  };
  return role ? roleNames[role] : 'משתמש';
};

export function MainLayout() {
  const { user, signOut, role, isRestrictedUser } = useAuth();
  const { isMenuVisible, isSuperAdmin, loading: permissionsLoading } = usePermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [unassignedBalanceCount, setUnassignedBalanceCount] = useState(0);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  const loadPendingCount = useCallback(async () => {
    // Skip if tab is not visible (Page Visibility API)
    if (document.hidden) {
      return;
    }

    // Skip if offline (Network Status API)
    if (!navigator.onLine) {
      return;
    }

    // Use silent mode for background polling to reduce console noise
    const response = await registrationService.getPendingRegistrations(true);

    if (response.data) {
      setPendingCount(response.data.length);
      // Reset error counter on success
      setConsecutiveErrors(0);
    } else if (response.error) {
      // Increment error counter for exponential backoff
      setConsecutiveErrors(prev => prev + 1);
    }
  }, []);

  useEffect(() => {
    // Load pending registrations count for admins
    if (role === 'admin') {
      loadPendingCount();

      // Calculate interval with exponential backoff
      // Start: 30s, then 1m, 2m, 4m, max 5m
      const baseInterval = 30000; // 30 seconds
      const maxInterval = 300000; // 5 minutes
      const currentInterval = Math.min(
        maxInterval,
        baseInterval * Math.pow(2, consecutiveErrors)
      );

      // Set up polling with dynamic interval
      const interval = setInterval(loadPendingCount, currentInterval);

      // Resume polling when tab becomes visible
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          // Tab is now visible, load immediately
          loadPendingCount();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Cleanup
      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [role, loadPendingCount, consecutiveErrors]);

  // Load count of balance sheets with materials_received but no auditor assigned
  const loadUnassignedBalanceCount = useCallback(async () => {
    if (document.hidden || !navigator.onLine) return;
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const tenantId = authUser?.user_metadata?.tenant_id;
      if (!tenantId) return;

      const { count } = await supabase
        .from('annual_balance_sheets')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'materials_received');

      setUnassignedBalanceCount(count ?? 0);
    } catch {
      // Silently fail for background polling
    }
  }, []);

  useEffect(() => {
    if (role === 'admin' || role === 'accountant') {
      loadUnassignedBalanceCount();
      const interval = setInterval(loadUnassignedBalanceCount, 60000);
      const handleVisibility = () => { if (!document.hidden) loadUnassignedBalanceCount(); };
      document.addEventListener('visibilitychange', handleVisibility);
      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }
  }, [role, loadUnassignedBalanceCount]);

  // Auto-open submenu if currently on a child page
  useEffect(() => {
    navigation.forEach((item) => {
      if (item.submenu) {
        const isChildActive = item.submenu.some(
          (subItem) => location.pathname === subItem.href
        );
        if (isChildActive) {
          setOpenSubmenu(item.name);
        }
      }
    });
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Filter navigation using dynamic permissions (from DB + defaults)
  const filteredNavigation = useMemo(() => {
    if (permissionsLoading) return [];

    return navigation.filter(item => {
      // Super admin sees everything
      if (isSuperAdmin) return true;

      // Use dynamic permission check from usePermissions hook
      // This checks both defaults AND DB overrides
      return isMenuVisible(item.menuKey);
    });
  }, [isMenuVisible, isSuperAdmin, permissionsLoading]);

  // Restricted user layout - minimal header, no sidebar
  if (isRestrictedUser) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        {/* Simple Header */}
        <header className="bg-white shadow-sm border-b sticky top-0 z-50">
          <div className="flex items-center justify-between px-6 py-4">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">TicoVision</span>
              <span className="text-sm text-muted-foreground">AI</span>
            </div>

            {/* User Info + Logout */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                {user?.user_metadata?.full_name || user?.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span>התנתק</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 right-0 z-50 h-full w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b">
            <h1 className="text-xl font-bold text-primary">TicoVision AI</h1>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Tenant Switcher */}
          {isSuperAdmin && (
            <div className="p-4 border-b">
              <TenantSwitcher />
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1 divide-y divide-gray-100">
              {/* Super Admin Link */}
              {isSuperAdmin && (
                <li>
                  <NavLink
                    to="/super-admin"
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-gray-100 text-gray-700"
                      )
                    }
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Shield className="h-5 w-5" />
                    <span className="flex-1">Super Admin</span>
                    <Badge variant="secondary">SA</Badge>
                  </NavLink>
                </li>
              )}
              
              {filteredNavigation.map((item) => (
                <li key={item.href || item.name} className="py-1 first:pt-0 last:pb-0">
                  {item.submenu ? (
                    // Navigation item with submenu
                    <Collapsible
                      open={openSubmenu === item.name}
                      onOpenChange={(open) => setOpenSubmenu(open ? item.name : null)}
                    >
                      <CollapsibleTrigger asChild>
                        <button
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full",
                            item.submenu.some((sub) => location.pathname === sub.href)
                              ? "bg-primary/10 text-primary"
                              : "hover:bg-gray-100 text-gray-700"
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          <span className="flex-1 text-right">{item.name}</span>
                          {openSubmenu === item.name ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-1">
                        <ul className="space-y-1 pr-6">
                          {item.submenu
                            .filter(subItem => isSuperAdmin || isMenuVisible(subItem.menuKey))
                            .map((subItem) => (
                            <li key={subItem.href}>
                              <NavLink
                                to={subItem.href}
                                className={({ isActive }) =>
                                  cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                    isActive
                                      ? "bg-primary text-primary-foreground"
                                      : "hover:bg-gray-100 text-gray-700"
                                  )
                                }
                                onClick={() => setSidebarOpen(false)}
                              >
                                <span className="flex-1 text-right">{subItem.name}</span>
                              </NavLink>
                            </li>
                          ))}
                        </ul>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    // Regular navigation item (no submenu)
                    <NavLink
                      to={item.href!}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-gray-100 text-gray-700"
                        )
                      }
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="flex-1">{item.name}</span>
                      {item.showBadge && pendingCount > 0 && (
                        <Badge variant="destructive" className="ml-auto">
                          {pendingCount}
                        </Badge>
                      )}
                      {item.menuKey === 'annual-balance' && unassignedBalanceCount > 0 && (
                        <Badge variant="destructive" className="ml-auto">
                          {unassignedBalanceCount}
                        </Badge>
                      )}
                    </NavLink>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* User info & Sign out */}
          <div className="border-t p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm">
                <p className="font-medium">{user?.user_metadata?.full_name || user?.email}</p>
                <p className="text-gray-500 text-xs">{getRoleDisplayName(role)}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              התנתק
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:mr-64">
        {/* Top bar */}
        <header className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold text-gray-800">
              מערכת ניהול משרד רואי חשבון
            </h2>
            {(role === 'admin' || role === 'accountant') && (
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => useChatStore.getState().togglePanel()}
              >
                <MessageCircle className="h-5 w-5" />
                <UnreadBadge />
              </Button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>

      {/* Chat Panel */}
      {(role === 'admin' || role === 'accountant') && <ChatPanel />}
    </div>
  );
}
