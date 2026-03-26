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
import { Loader2 } from 'lucide-react';

interface UnsavedChangesDialogProps {
  open: boolean;
  onStay: () => void;
  onLeave: () => void;
  onSaveAndLeave?: () => void;
  saving?: boolean;
}

/**
 * RTL Hebrew confirmation dialog shown when navigating away with unsaved changes.
 * Used with useUnsavedChangesGuard hook.
 */
export function UnsavedChangesDialog({
  open,
  onStay,
  onLeave,
  onSaveAndLeave,
  saving = false,
}: UnsavedChangesDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onStay()}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle className="rtl:text-right ltr:text-left">
            יציאה ללא שמירה?
          </AlertDialogTitle>
          <AlertDialogDescription className="rtl:text-right ltr:text-left">
            יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לצאת?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="rtl:space-x-reverse">
          <AlertDialogCancel onClick={onStay}>המשך עריכה</AlertDialogCancel>
          {onSaveAndLeave && (
            <AlertDialogAction
              onClick={onSaveAndLeave}
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              שמור וצא
            </AlertDialogAction>
          )}
          <AlertDialogAction
            onClick={onLeave}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            צא ללא שמירה
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
