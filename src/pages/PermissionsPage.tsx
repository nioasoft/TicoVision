/**
 * PermissionsPage
 * Super Admin page for managing role-based permissions
 * Allows toggling menu/route access per role
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Loader2, Shield, Save, RotateCcw, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { usePermissionsAdmin } from '@/hooks/usePermissions';
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '@/services/permissions.service';
import { authService } from '@/services/auth.service';
import type { UserRole } from '@/types/user-role';
import { cn } from '@/lib/utils';

// Role display configuration
const ROLES: { key: UserRole; label: string; description: string; color: string }[] = [
  { key: 'admin', label: 'מנהל', description: 'גישה מלאה למערכת', color: 'bg-red-100 text-red-800' },
  { key: 'accountant', label: 'רואה חשבון', description: 'עובדים זרים בלבד', color: 'bg-blue-100 text-blue-800' },
  { key: 'bookkeeper', label: 'מנהלת חשבונות', description: 'לקוחות וקבצים', color: 'bg-green-100 text-green-800' },
  { key: 'client', label: 'לקוח', description: 'צפייה בלבד', color: 'bg-gray-100 text-gray-800' },
];

// Group permissions by category for display
const PERMISSION_GROUPS = [
  {
    key: 'general',
    label: 'כללי',
    permissions: ['dashboard'],
  },
  {
    key: 'clients',
    label: 'לקוחות',
    permissions: ['clients', 'clients:list', 'clients:groups'],
  },
  {
    key: 'fees',
    label: 'שכר טרחה',
    permissions: ['fees', 'fees:tracking', 'fees:calculate', 'fees:collections'],
  },
  {
    key: 'letters',
    label: 'מכתבים',
    permissions: ['letters', 'letters:templates', 'letters:simulator', 'letters:history'],
  },
  {
    key: 'other',
    label: 'נוסף',
    permissions: ['foreign-workers', 'files', 'users', 'settings'],
  },
];

export default function PermissionsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState<UserRole | null>(null);

  const {
    matrix,
    isSuperAdmin,
    saving,
    hasUnsavedChanges,
    togglePermission,
    saveChanges,
    discardChanges,
    resetPermissions,
    getEffectiveValue,
    refresh,
  } = usePermissionsAdmin();

  // Check super admin access
  useEffect(() => {
    const checkAccess = async () => {
      const isSuper = await authService.isSuperAdmin();
      if (!isSuper) {
        toast.error('אין לך הרשאה לגשת לדף זה');
        navigate('/dashboard');
        return;
      }
      setLoading(false);
    };
    checkAccess();
  }, [navigate]);

  // Handle save
  const handleSave = async () => {
    const success = await saveChanges();
    if (success) {
      toast.success('ההרשאות נשמרו בהצלחה');
    } else {
      toast.error('שגיאה בשמירת ההרשאות');
    }
    setShowSaveDialog(false);
  };

  // Handle reset
  const handleReset = async (role: UserRole) => {
    const success = await resetPermissions(role);
    if (success) {
      toast.success(`ההרשאות של ${ROLES.find(r => r.key === role)?.label} אופסו`);
    } else {
      toast.error('שגיאה באיפוס ההרשאות');
    }
    setShowResetDialog(null);
  };

  // Get permission label
  const getPermissionLabel = (menuKey: string): string => {
    const perm = ALL_PERMISSIONS.find(p => p.menu === menuKey);
    return perm?.label || menuKey;
  };

  // Check if permission is in default for role
  const isInDefault = (role: UserRole, menuKey: string): boolean => {
    return DEFAULT_ROLE_PERMISSIONS[role]?.includes(menuKey) || false;
  };

  if (loading || !matrix) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            ניהול הרשאות תפקידים
          </h1>
          <p className="text-gray-500 mt-1">
            הגדר גישה לתפריטים ודפים לפי תפקיד המשתמש
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
              <AlertTriangle className="h-3 w-3 ml-1" />
              שינויים לא נשמרו
            </Badge>
          )}
          <Button
            variant="outline"
            onClick={discardChanges}
            disabled={!hasUnsavedChanges || saving}
          >
            ביטול שינויים
          </Button>
          <Button
            onClick={() => setShowSaveDialog(true)}
            disabled={!hasUnsavedChanges || saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            ) : (
              <Save className="h-4 w-4 ml-2" />
            )}
            שמור שינויים
          </Button>
        </div>
      </div>

      {/* Role Cards Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {ROLES.map(role => {
          const enabledCount = Object.values(matrix[role.key] || {}).filter(Boolean).length;
          const totalCount = ALL_PERMISSIONS.length;
          return (
            <Card key={role.key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  {role.label}
                  <Badge className={role.color}>{role.key}</Badge>
                </CardTitle>
                <CardDescription>{role.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {enabledCount} / {totalCount}
                </div>
                <div className="text-sm text-gray-500">הרשאות פעילות</div>
                {role.key !== 'admin' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-xs"
                    onClick={() => setShowResetDialog(role.key)}
                  >
                    <RotateCcw className="h-3 w-3 ml-1" />
                    איפוס לברירת מחדל
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Permissions Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>מטריצת הרשאות</CardTitle>
          <CardDescription>
            סמן או בטל סימון כדי לשנות הרשאות. הרשאות מנהל (admin) אינן ניתנות לשינוי.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="all">הכל</TabsTrigger>
              {PERMISSION_GROUPS.map(group => (
                <TabsTrigger key={group.key} value={group.key}>
                  {group.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* All permissions */}
            <TabsContent value="all">
              <PermissionsTable
                permissions={ALL_PERMISSIONS.map(p => p.menu)}
                matrix={matrix}
                roles={ROLES}
                getEffectiveValue={getEffectiveValue}
                togglePermission={togglePermission}
                getPermissionLabel={getPermissionLabel}
                isInDefault={isInDefault}
              />
            </TabsContent>

            {/* Grouped permissions */}
            {PERMISSION_GROUPS.map(group => (
              <TabsContent key={group.key} value={group.key}>
                <PermissionsTable
                  permissions={group.permissions}
                  matrix={matrix}
                  roles={ROLES}
                  getEffectiveValue={getEffectiveValue}
                  togglePermission={togglePermission}
                  getPermissionLabel={getPermissionLabel}
                  isInDefault={isInDefault}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">מקרא</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Checkbox checked disabled className="data-[state=checked]:bg-primary" />
              <span>הרשאה פעילה</span>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox disabled className="opacity-50" />
              <span>הרשאה לא פעילה</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-yellow-400 bg-yellow-50" />
              <span>שינוי ממתין לשמירה</span>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox disabled checked className="opacity-30" />
              <span>לא ניתן לשינוי (admin)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Confirmation Dialog */}
      <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>שמירת שינויים</AlertDialogTitle>
            <AlertDialogDescription>
              האם לשמור את השינויים בהרשאות? השינויים ייכנסו לתוקף מיד.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={handleSave}>שמור</AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={!!showResetDialog} onOpenChange={() => setShowResetDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>איפוס הרשאות</AlertDialogTitle>
            <AlertDialogDescription>
              האם לאפס את ההרשאות של {ROLES.find(r => r.key === showResetDialog)?.label} לברירת
              המחדל?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction onClick={() => showResetDialog && handleReset(showResetDialog)}>
              איפוס
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Permissions Table Component
interface PermissionsTableProps {
  permissions: string[];
  matrix: Record<string, Record<string, boolean>>;
  roles: typeof ROLES;
  getEffectiveValue: (role: UserRole, menuKey: string) => boolean;
  togglePermission: (role: UserRole, menuKey: string, currentValue: boolean) => void;
  getPermissionLabel: (menuKey: string) => string;
  isInDefault: (role: UserRole, menuKey: string) => boolean;
}

function PermissionsTable({
  permissions,
  matrix,
  roles,
  getEffectiveValue,
  togglePermission,
  getPermissionLabel,
  isInDefault,
}: PermissionsTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-right w-[200px]">הרשאה</TableHead>
            {roles.map(role => (
              <TableHead key={role.key} className="text-center w-[120px]">
                <Badge className={cn('font-normal', role.color)}>{role.label}</Badge>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {permissions.map(menuKey => {
            const perm = ALL_PERMISSIONS.find(p => p.menu === menuKey);
            const isSubmenu = perm?.parent;
            return (
              <TableRow key={menuKey}>
                <TableCell className={cn('text-right', isSubmenu && 'pr-8')}>
                  {getPermissionLabel(menuKey)}
                </TableCell>
                {roles.map(role => {
                  const isEnabled = getEffectiveValue(role.key, menuKey);
                  const canEdit = role.key !== 'admin' && isInDefault(role.key, menuKey);
                  const hasChange =
                    isEnabled !== (matrix[role.key]?.[menuKey] ?? false) && role.key !== 'admin';

                  return (
                    <TableCell key={role.key} className="text-center">
                      <div className="flex justify-center">
                        <Checkbox
                          checked={isEnabled}
                          disabled={!canEdit}
                          onCheckedChange={() => {
                            if (canEdit) {
                              togglePermission(role.key, menuKey, isEnabled);
                            }
                          }}
                          className={cn(
                            hasChange && 'ring-2 ring-yellow-400 ring-offset-2',
                            !canEdit && role.key !== 'admin' && 'opacity-30'
                          )}
                        />
                      </div>
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export { PermissionsPage };
