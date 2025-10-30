import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react';
import { authService, type TenantWithSettings } from '@/services/auth.service';
import { useNavigate } from 'react-router-dom';

interface TenantDisplay extends Omit<TenantWithSettings, 'settings'> {
  userRole?: string;
  isPrimary?: boolean;
  settings?: {
    logo_url?: string;
    company_name?: string;
    billing_plan?: string;
  };
}

export default function TenantSwitcher() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tenants, setTenants] = useState<TenantDisplay[]>([]);
  const [currentTenant, setCurrentTenant] = useState<TenantDisplay | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      
      // Check if super admin
      const isSuper = await authService.isSuperAdmin();
      setIsSuperAdmin(isSuper);

      // Get user's tenants
      const { tenants: userTenants, error } = await authService.getUserTenants();
      if (error) {
        logger.error('Error loading tenants:', error);
        return;
      }

      // Map and transform tenants
      const mappedTenants: TenantDisplay[] = userTenants.map(tenant => ({
        ...tenant,
        settings: tenant.settings as TenantDisplay['settings'] | undefined,
      }));

      setTenants(mappedTenants);

      // Get current tenant
      const { tenant: current } = await authService.getUserTenant();
      if (current) {
        setCurrentTenant({
          ...current,
          settings: current.settings as TenantDisplay['settings'] | undefined,
        });
      } else if (mappedTenants.length > 0) {
        // Set first tenant as current if none selected
        setCurrentTenant(mappedTenants[0]);
      }
    } catch (error) {
      logger.error('Error loading tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTenantSwitch = async (tenantId: string) => {
    try {
      const { success, error } = await authService.switchTenant(tenantId);
      if (error) {
        logger.error('Error switching tenant:', error);
        return;
      }
      
      if (success) {
        // The page will reload automatically from authService
      }
    } catch (error) {
      logger.error('Error switching tenant:', error);
    }
  };

  const handleCreateTenant = () => {
    navigate('/super-admin/tenants/new');
    setOpen(false);
  };

  const getTenantInitials = (tenant: TenantDisplay) => {
    return tenant.name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getBillingPlanBadge = (plan?: string) => {
    const planLabels: Record<string, string> = {
      starter: 'Starter',
      professional: 'Pro',
      enterprise: 'Enterprise'
    };
    
    const planVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
      starter: 'outline',
      professional: 'default',
      enterprise: 'secondary'
    };

    return {
      label: planLabels[plan || 'starter'] || plan,
      variant: planVariants[plan || 'starter'] || 'outline'
    };
  };

  if (loading) {
    return (
      <Button variant="outline" disabled className="w-[250px] justify-between">
        <Building2 className="ml-2 h-4 w-4" />
        טוען...
      </Button>
    );
  }

  if (tenants.length === 0) {
    return null;
  }

  // If only one tenant and not super admin, don't show switcher
  if (tenants.length === 1 && !isSuperAdmin) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{currentTenant?.name}</span>
      </div>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="בחר עסק"
          className="w-[250px] justify-between"
        >
          <div className="flex items-center gap-2 truncate">
            {currentTenant ? (
              <>
                <Avatar className="h-5 w-5">
                  <AvatarImage src={currentTenant.settings?.logo_url} />
                  <AvatarFallback className="text-xs">
                    {getTenantInitials(currentTenant)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{currentTenant.name}</span>
              </>
            ) : (
              <>
                <Building2 className="h-4 w-4" />
                <span>בחר עסק</span>
              </>
            )}
          </div>
          <ChevronsUpDown className="mr-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[250px]" align="start">
        <DropdownMenuLabel>עסקים זמינים</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {tenants.map((tenant) => {
            const plan = getBillingPlanBadge(tenant.settings?.billing_plan);
            return (
              <DropdownMenuItem
                key={tenant.id}
                onClick={() => handleTenantSwitch(tenant.id)}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={tenant.settings?.logo_url} />
                      <AvatarFallback className="text-xs">
                        {getTenantInitials(tenant)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {tenant.name}
                      </span>
                      {tenant.userRole && (
                        <span className="text-xs text-muted-foreground">
                          {tenant.userRole}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {tenant.isPrimary && (
                      <Badge variant="secondary" className="text-xs">
                        ראשי
                      </Badge>
                    )}
                    <Badge variant={plan?.variant || 'outline'} className="text-xs">
                      {plan?.label || 'Starter'}
                    </Badge>
                    {currentTenant?.id === tenant.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
        
        {isSuperAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleCreateTenant} className="cursor-pointer">
              <Plus className="ml-2 h-4 w-4" />
              צור עסק חדש
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => navigate('/super-admin')} 
              className="cursor-pointer text-primary"
            >
              <Building2 className="ml-2 h-4 w-4" />
              Super Admin Dashboard
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}