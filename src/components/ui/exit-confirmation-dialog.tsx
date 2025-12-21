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

interface ExitConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation dialog for exiting without saving
 * Used in conjunction with useUnsavedChanges hook
 */
export function ExitConfirmationDialog({
  open,
  onClose,
  onConfirm,
}: ExitConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
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
          <AlertDialogCancel onClick={onClose}>חזור</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            יציאה ללא שמירה
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
