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
  ChevronLeft,
  ChevronRight,
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
  Search,
  Contact,
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
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
  menuKey: string;
  allowedRoles?: UserRole[];
}

interface NavigationItem {
  name: string;
  href?: string;
  icon: React.ElementType;
  menuKey: string;
  allowedRoles: UserRole[];
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
  // Default to collapsed state as per Figma design
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [unassignedBalanceCount, setUnassignedBalanceCount] = useState(0);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  const loadPendingCount = useCallback(async () => {
    if (document.hidden) return;
    if (!navigator.onLine) return;

    const response = await registrationService.getPendingRegistrations(true);

    if (response.data) {
      setPendingCount(response.data.length);
      setConsecutiveErrors(0);
    } else if (response.error) {
      setConsecutiveErrors(prev => prev + 1);
    }
  }, []);

  useEffect(() => {
    if (role === 'admin') {
      loadPendingCount();

      const baseInterval = 30000;
      const maxInterval = 300000;
      const currentInterval = Math.min(
        maxInterval,
        baseInterval * Math.pow(2, consecutiveErrors)
      );

      const interval = setInterval(loadPendingCount, currentInterval);

      const handleVisibilityChange = () => {
        if (!document.hidden) {
          loadPendingCount();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

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

  const filteredNavigation = useMemo(() => {
    if (permissionsLoading) return [];

    return navigation.filter(item => {
      if (isSuperAdmin) return true;
      return isMenuVisible(item.menuKey);
    });
  }, [isMenuVisible, isSuperAdmin, permissionsLoading]);

  // Sidebar width - collapsed by default (icons only)
  const sidebarWidth = sidebarCollapsed ? 'w-[70px]' : 'w-64';
  const mainMargin = sidebarCollapsed ? 'lg:mr-[70px]' : 'lg:mr-64';

  // Restricted user layout
  if (isRestrictedUser) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <header className="bg-white shadow-sm border-b sticky top-0 z-50">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">TicoVision</span>
              <span className="text-sm text-muted-foreground">AI</span>
            </div>
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
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Blue, collapsed by default */}
      <aside className={cn(
        "fixed top-0 right-0 z-50 h-full bg-[#395BF7] transform transition-all duration-200 ease-in-out lg:translate-x-0",
        sidebarWidth,
        sidebarOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Navigation - Icons only when collapsed */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1">
              {/* Super Admin Link */}
              {isSuperAdmin && (
                <li className="border-b border-white/20 pb-2 mb-2">
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <NavLink
                          to="/super-admin"
                          className={({ isActive }) =>
                            cn(
                              "flex items-center justify-center mx-2 p-3 rounded-lg transition-colors",
                              isActive
                                ? "bg-white text-[#395BF7]"
                                : "text-white hover:bg-white/10"
                            )
                          }
                          onClick={() => setSidebarOpen(false)}
                        >
                          <Shield className="h-5 w-5" />
                        </NavLink>
                      </TooltipTrigger>
                      {sidebarCollapsed && (
                        <TooltipContent side="left">
                          <p>Super Admin</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </li>
              )}

              {filteredNavigation.map((item) => {
                const isActive = item.href
                  ? location.pathname === item.href
                  : item.submenu?.some((sub) => location.pathname === sub.href);

                const hasBadge = (item.showBadge && pendingCount > 0) ||
                  (item.menuKey === 'annual-balance' && unassignedBalanceCount > 0);

                const badgeCount = item.showBadge ? pendingCount :
                  item.menuKey === 'annual-balance' ? unassignedBalanceCount : 0;

                return (
                  <li key={item.href || item.name} className="border-b border-white/20 last:border-b-0">
                    <TooltipProvider delayDuration={0}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <NavLink
                            to={item.href || (item.submenu?.[0]?.href ?? '#')}
                            className={cn(
                              "relative flex items-center justify-center mx-2 p-3 rounded-lg transition-colors",
                              isActive
                                ? "bg-white text-[#395BF7]"
                                : "text-white hover:bg-white/10"
                            )}
                            onClick={() => setSidebarOpen(false)}
                          >
                            <item.icon className="h-5 w-5" />
                            {hasBadge && badgeCount > 0 && (
                              <span className="absolute -top-1 -left-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
                                {badgeCount}
                              </span>
                            )}
                          </NavLink>
                        </TooltipTrigger>
                        {sidebarCollapsed && (
                          <TooltipContent side="left">
                            <p>{item.name}</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User avatar at bottom */}
          <div className="border-t border-white/20 p-3">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                {sidebarCollapsed && (
                  <TooltipContent side="left">
                    <p>התנתק</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn("transition-all duration-200", mainMargin)}>
        {/* Top bar - Clean white header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="flex items-center justify-between px-6 py-4">
            {/* Right side - Logo and title */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-3">
                <img
                  src="/brand/tico_logo_transparent.png"
                  alt="TICO"
                  className="h-8 w-auto"
                />
                <span className="text-gray-500 hidden sm:inline">מערכת ניהול משרד רואי חשבון</span>
              </div>
            </div>

            {/* Center - Search */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="search"
                  placeholder="חיפוש"
                  className="pl-10"
                  style={{ borderRadius: '9999px', backgroundColor: 'white', borderColor: '#d1d5db' }}
                  dir="rtl"
                />
              </div>
            </div>

            {/* Left side - User info + Chat */}
            <div className="flex items-center gap-3">
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
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-gray-900">
                  {user?.user_metadata?.full_name || user?.email}
                </p>
                <p className="text-xs text-gray-500">{getRoleDisplayName(role)}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-black flex items-center justify-center text-white font-medium">
                {(user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()}
              </div>
            </div>
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
