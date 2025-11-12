import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
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
  FolderOpen
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
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
import type { UserRole } from '@/types/user-role';

interface NavigationItem {
  name: string;
  href?: string;
  icon: any;
  allowedRoles: UserRole[];
  showBadge?: boolean;
  submenu?: { name: string; href: string }[];
}

const navigation: NavigationItem[] = [
  { name: 'לוח בקרה', href: '/dashboard', icon: LayoutDashboard, allowedRoles: ['admin'] as UserRole[] },
  {
    name: 'לקוחות',
    icon: Users,
    allowedRoles: ['admin', 'accountant', 'bookkeeper', 'client'] as UserRole[],
    submenu: [
      { name: 'רשימת לקוחות', href: '/clients' },
      { name: 'ניהול קבוצות', href: '/client-groups' },
    ]
  },
  {
    name: 'שכר טרחה',
    icon: Calculator,
    allowedRoles: ['admin'] as UserRole[],
    submenu: [
      { name: 'מעקב שכר טרחה', href: '/fees/tracking' },
      { name: 'חישוב שכר טרחה', href: '/fees/calculate' },
      { name: 'גביית תשלומים', href: '/collections' },
    ]
  },
  {
    name: 'מכתבים',
    icon: FileText,
    allowedRoles: ['admin'] as UserRole[],
    submenu: [
      { name: 'כתיבת מכתבים', href: '/letter-templates' },
      { name: 'היסטוריית מכתבים', href: '/letter-history' },
    ]
  },
  { name: 'מנהל הקבצים', href: '/files', icon: FolderOpen, allowedRoles: ['admin', 'accountant', 'bookkeeper'] as UserRole[] },
  { name: 'משתמשים', href: '/users', icon: UserCog, allowedRoles: ['admin'] as UserRole[], showBadge: true },
  { name: 'הגדרות', href: '/settings', icon: Settings, allowedRoles: ['admin'] as UserRole[] },
];

const getRoleDisplayName = (role: UserRole | null): string => {
  const roleNames: Record<UserRole, string> = {
    'admin': 'מנהל',
    'accountant': 'רואה חשבון',
    'bookkeeper': 'מנהלת חשבונות',
    'client': 'לקוח',
  };
  return role ? roleNames[role] : 'משתמש';
};

export function MainLayout() {
  const { user, signOut, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);

  // Memoize callbacks to prevent unnecessary re-renders
  const checkSuperAdmin = useCallback(async () => {
    const isSuper = await authService.isSuperAdmin();
    setIsSuperAdmin(isSuper);
  }, []);

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
    // Check if super admin
    checkSuperAdmin();

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
  }, [role, checkSuperAdmin, loadPendingCount, consecutiveErrors]);

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

  const filteredNavigation = navigation.filter(
    item => role && item.allowedRoles.includes(role)
  );

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
            <ul className="space-y-2">
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
                <li key={item.href || item.name}>
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
                          {item.submenu.map((subItem) => (
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
                <p className="font-medium">{user?.email}</p>
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
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}