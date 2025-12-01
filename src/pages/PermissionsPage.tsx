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

// Role display configuration with stronger colors
const ROLES: { key: UserRole; label: string; description: string; color: string; cardBorder: string }[] = [
  { key: 'admin', label: 'מנהל', description: 'גישה מלאה למערכת', color: 'bg-red-500 text-white', cardBorder: 'border-red-400' },
  { key: 'accountant', label: 'רואה חשבון', description: 'עובדים זרים בלבד', color: 'bg-blue-500 text-white', cardBorder: 'border-blue-400' },
  { key: 'bookkeeper', label: 'מנהלת חשבונות', description: 'לקוחות וקבצים', color: 'bg-green-500 text-white', cardBorder: 'border-green-400' },
  { key: 'client', label: 'לקוח', description: 'צפייה בלבד', color: 'bg-gray-500 text-white', cardBorder: 'border-gray-400' },
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
          <h1 className="text-3xl font-bold flex items-center gap-2 text-gray-900">
            <Shield className="h-8 w-8 text-blue-600" />
            ניהול הרשאות תפקידים
          </h1>
          <p className="text-gray-600 mt-1">
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
            <Card key={role.key} className={cn('border-2', role.cardBorder)}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  {role.label}
                  <Badge className={role.color}>{role.key}</Badge>
                </CardTitle>
                <CardDescription className="text-gray-600">{role.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {enabledCount} / {totalCount}
                </div>
                <div className="text-sm text-gray-600">הרשאות פעילות</div>
                {role.key !== 'admin' && (
                  <Button
                    variant="outline"
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
      <Card className="border-2 border-gray-200">
        <CardHeader>
          <CardTitle className="text-xl text-gray-900">מטריצת הרשאות</CardTitle>
          <CardDescription className="text-gray-600">
            סמן או בטל סימון כדי לשנות הרשאות. ניתן להרחיב או לצמצם הרשאות לכל תפקיד (למעט מנהל).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-4 bg-gray-100 p-1">
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
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="border-2 border-gray-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-gray-700">מקרא</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Checkbox checked disabled className="h-5 w-5 border-2 border-green-500 data-[state=checked]:bg-green-500" />
              <span className="text-gray-700 font-medium">הרשאה פעילה (ניתן לשינוי)</span>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox disabled className="h-5 w-5 border-2 border-gray-400" />
              <span className="text-gray-700 font-medium">הרשאה לא פעילה</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded border-2 border-yellow-500 bg-yellow-100 ring-2 ring-yellow-400 ring-offset-1" />
              <span className="text-gray-700 font-medium">שינוי ממתין לשמירה</span>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox disabled checked className="h-5 w-5 border-2 border-gray-400 data-[state=checked]:bg-gray-400" />
              <span className="text-gray-700 font-medium">נעול (admin / לא בברירת מחדל)</span>
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
}

function PermissionsTable({
  permissions,
  matrix,
  roles,
  getEffectiveValue,
  togglePermission,
  getPermissionLabel,
}: PermissionsTableProps) {
  return (
    <div className="rounded-md border-2 border-gray-300">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-100">
            <TableHead className="text-right w-[200px] font-bold text-gray-900 border-b-2 border-gray-300">הרשאה</TableHead>
            {roles.map(role => (
              <TableHead key={role.key} className="text-center w-[130px] border-b-2 border-gray-300">
                <Badge className={cn('font-medium px-3 py-1', role.color)}>{role.label}</Badge>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {permissions.map((menuKey, idx) => {
            const perm = ALL_PERMISSIONS.find(p => p.menu === menuKey);
            const isSubmenu = perm?.parent;
            return (
              <TableRow key={menuKey} className={cn(idx % 2 === 0 ? 'bg-white' : 'bg-gray-50', 'hover:bg-blue-50')}>
                <TableCell className={cn('text-right font-medium text-gray-800 border-l border-gray-200', isSubmenu && 'pr-8 text-gray-600')}>
                  {getPermissionLabel(menuKey)}
                </TableCell>
                {roles.map(role => {
                  const isEnabled = getEffectiveValue(role.key, menuKey);
                  // Allow editing for any non-admin role (can enable or disable anything)
                  const canEdit = role.key !== 'admin';
                  const hasChange =
                    isEnabled !== (matrix[role.key]?.[menuKey] ?? false) && role.key !== 'admin';

                  return (
                    <TableCell key={role.key} className="text-center border-l border-gray-200">
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
                            'h-5 w-5 border-2',
                            isEnabled && canEdit && 'border-green-500 data-[state=checked]:bg-green-500',
                            isEnabled && role.key === 'admin' && 'border-gray-400 data-[state=checked]:bg-gray-400',
                            !isEnabled && canEdit && 'border-gray-400',
                            !isEnabled && !canEdit && 'border-gray-300 opacity-40',
                            hasChange && 'ring-2 ring-yellow-400 ring-offset-2',
                            canEdit && 'cursor-pointer hover:border-green-600'
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
