/**
 * PDF Filing Dialog Component
 * Asks user if they want to save the PDF to client/group folder
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FolderOpen, Loader2, X } from 'lucide-react';
import { fileUploadService } from '@/services/file-upload.service';

export interface PdfFilingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  letterId: string;
  clientId: string | null;
  groupId: string | null;
  clientName?: string;
  groupName?: string;
  pdfUrl: string;
  letterSubject: string;
  onSuccess?: () => void;
}

export function PdfFilingDialog({
  open,
  onOpenChange,
  letterId,
  clientId,
  groupId,
  clientName,
  groupName,
  pdfUrl,
  letterSubject,
  onSuccess,
}: PdfFilingDialogProps) {
  const [isFiling, setIsFiling] = useState(false);

  // Determine destination name
  const destinationName = clientName || groupName || null;
  const hasDestination = clientId || groupId;

  /**
   * Handle file to folder
   */
  const handleFile = async () => {
    if (!hasDestination) {
      toast.error('אין לקוח או קבוצה לשמירת ה-PDF');
      return;
    }

    try {
      setIsFiling(true);

      const result = await fileUploadService.fileLetterPdf({
        letterId,
        clientId,
        groupId,
        pdfUrl,
        letterSubject,
      });

      if (result.error) {
        throw result.error;
      }

      toast.success('PDF נשמר בתיקיית המכתבים בהצלחה');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error filing PDF:', error);
      toast.error('שגיאה בשמירת ה-PDF');
    } finally {
      setIsFiling(false);
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader className="rtl:text-right ltr:text-left">
          <DialogTitle className="flex items-center gap-2 rtl:flex-row-reverse">
            <FolderOpen className="h-5 w-5 text-primary" />
            שמירת PDF בתיקייה
          </DialogTitle>
          <DialogDescription className="rtl:text-right ltr:text-left">
            {hasDestination ? (
              <>
                לשמור את ה-PDF בתיקיית המכתבים של{' '}
                <span className="font-medium text-foreground">{destinationName}</span>?
              </>
            ) : (
              <>
                לא נבחר לקוח או קבוצה. לא ניתן לשמור את ה-PDF בתיקייה.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="sm:justify-start rtl:space-x-reverse gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isFiling}
          >
            <X className="h-4 w-4 ml-2 rtl:ml-0 rtl:mr-2" />
            ביטול
          </Button>
          {hasDestination && (
            <Button
              onClick={handleFile}
              disabled={isFiling}
            >
              {isFiling ? (
                <Loader2 className="h-4 w-4 ml-2 rtl:ml-0 rtl:mr-2 animate-spin" />
              ) : (
                <FolderOpen className="h-4 w-4 ml-2 rtl:ml-0 rtl:mr-2" />
              )}
              שמור בתיקיית לקוח
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
