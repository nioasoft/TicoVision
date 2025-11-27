/**
 * BranchManagementDialog
 * Dialog for managing client branches in the Foreign Workers module.
 * Allows adding, editing, and deleting branches.
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { Plus, Pencil, Trash2, Star, Loader2 } from 'lucide-react';
import { BranchService } from '@/services/branch.service';
import type { BranchWithDisplayName, CreateBranchDto, UpdateBranchDto } from '@/types/branch.types';
import { useToast } from '@/hooks/use-toast';

interface BranchManagementDialogProps {
  /** The client ID to manage branches for */
  clientId: string;
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog closes */
  onClose: () => void;
  /** Callback when branches are updated */
  onBranchesUpdated?: () => void;
}

type EditMode = 'none' | 'add' | 'edit';

export function BranchManagementDialog({
  clientId,
  isOpen,
  onClose,
  onBranchesUpdated,
}: BranchManagementDialogProps) {
  const { toast } = useToast();

  // State
  const [branches, setBranches] = useState<BranchWithDisplayName[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [editingBranch, setEditingBranch] = useState<BranchWithDisplayName | null>(null);
  const [formData, setFormData] = useState({ name: '', is_default: false });
  const [deleteConfirm, setDeleteConfirm] = useState<BranchWithDisplayName | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load branches when dialog opens
  useEffect(() => {
    if (isOpen && clientId) {
      loadBranches();
    }
  }, [isOpen, clientId]);

  // Load branches from server
  const loadBranches = async () => {
    setIsLoading(true);
    try {
      const branchList = await BranchService.getClientBranches(clientId);
      setBranches(branchList);
    } catch (error) {
      console.error('Error loading branches:', error);
      toast({
        variant: 'destructive',
        title: 'שגיאה בטעינת סניפים',
        description: 'לא ניתן לטעון את רשימת הסניפים',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Start adding new branch
  const handleAddClick = () => {
    setEditMode('add');
    setEditingBranch(null);
    setFormData({ name: '', is_default: branches.length === 0 });
  };

  // Start editing branch
  const handleEditClick = (branch: BranchWithDisplayName) => {
    setEditMode('edit');
    setEditingBranch(branch);
    setFormData({ name: branch.name, is_default: branch.is_default });
  };

  // Cancel editing
  const handleCancel = () => {
    setEditMode('none');
    setEditingBranch(null);
    setFormData({ name: '', is_default: false });
  };

  // Save branch (add or update)
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        variant: 'destructive',
        title: 'שגיאה',
        description: 'יש להזין שם סניף',
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editMode === 'add') {
        const dto: CreateBranchDto = {
          client_id: clientId,
          name: formData.name.trim(),
          is_default: formData.is_default,
        };
        const { error } = await BranchService.createBranch(dto);
        if (error) {
          toast({
            variant: 'destructive',
            title: 'שגיאה ביצירת סניף',
            description: error,
          });
          return;
        }
        toast({
          title: 'סניף נוצר בהצלחה',
          description: `הסניף "${formData.name}" נוסף`,
        });
      } else if (editMode === 'edit' && editingBranch) {
        const dto: UpdateBranchDto = {
          name: formData.name.trim(),
          is_default: formData.is_default,
        };
        const { error } = await BranchService.updateBranch(editingBranch.id, dto);
        if (error) {
          toast({
            variant: 'destructive',
            title: 'שגיאה בעדכון סניף',
            description: error,
          });
          return;
        }
        toast({
          title: 'סניף עודכן בהצלחה',
          description: `הסניף "${formData.name}" עודכן`,
        });
      }

      handleCancel();
      await loadBranches();
      onBranchesUpdated?.();
    } finally {
      setIsSaving(false);
    }
  };

  // Delete branch
  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setIsSaving(true);
    try {
      const { error } = await BranchService.deleteBranch(deleteConfirm.id);
      if (error) {
        toast({
          variant: 'destructive',
          title: 'שגיאה במחיקת סניף',
          description: error,
        });
        return;
      }
      toast({
        title: 'סניף נמחק בהצלחה',
        description: `הסניף "${deleteConfirm.name}" נמחק`,
      });
      setDeleteConfirm(null);
      await loadBranches();
      onBranchesUpdated?.();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">ניהול סניפים</DialogTitle>
            <DialogDescription className="text-right">
              ניהול סניפים ומיקומים עבור הלקוח. כל סניף יכול לנהל עובדים זרים בנפרד.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add/Edit Form */}
            {editMode !== 'none' && (
              <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                <h4 className="font-medium text-right">
                  {editMode === 'add' ? 'הוספת סניף חדש' : 'עריכת סניף'}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="branch-name" className="text-right block">
                      שם הסניף <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="branch-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="לדוגמה: סניף תל אביב"
                      className="text-right"
                      dir="rtl"
                    />
                  </div>
                  <div className="flex items-center justify-between pt-6">
                    <Label htmlFor="is-default" className="text-right">
                      סניף ראשי
                    </Label>
                    <Switch
                      id="is-default"
                      checked={formData.is_default}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                    ביטול
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        שומר...
                      </>
                    ) : (
                      editMode === 'add' ? 'הוסף סניף' : 'שמור שינויים'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Branches Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : branches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                אין סניפים להצגה. לחץ על "הוסף סניף" כדי ליצור סניף חדש.
              </div>
            ) : (
              <Table dir="rtl">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שם הסניף</TableHead>
                    <TableHead className="text-center">סטטוס</TableHead>
                    <TableHead className="text-center w-[100px]">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="text-right font-medium">
                        {branch.name}
                      </TableCell>
                      <TableCell className="text-center">
                        {branch.is_default && (
                          <Badge variant="default" className="gap-1">
                            <Star className="h-3 w-3" />
                            ראשי
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(branch)}
                            disabled={editMode !== 'none'}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm(branch)}
                            disabled={editMode !== 'none' || branches.length <= 1}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter className="flex-row-reverse justify-between">
            <Button variant="outline" onClick={onClose}>
              סגור
            </Button>
            <Button onClick={handleAddClick} disabled={editMode !== 'none'}>
              <Plus className="h-4 w-4 ml-2" />
              הוסף סניף
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">מחיקת סניף</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              האם אתה בטוח שברצונך למחוק את הסניף "{deleteConfirm?.name}"?
              <br />
              <span className="text-destructive">
                פעולה זו אינה הפיכה ותמחק את כל הנתונים הקשורים לסניף זה.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  מוחק...
                </>
              ) : (
                'מחק סניף'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
