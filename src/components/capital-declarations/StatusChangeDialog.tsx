/**
 * Status Change Dialog
 * Allows accountants to change declaration status with optional notes
 * Special handling for "submitted" status with screenshot upload and late flag
 */

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRight, Loader2, Upload, X, AlertTriangle, FileImage } from 'lucide-react';
import type { CapitalDeclarationStatus, SubmitDeclarationData } from '@/types/capital-declaration.types';
import {
  DECLARATION_STATUS_LABELS,
  DECLARATION_STATUS_COLORS,
} from '@/types/capital-declaration.types';
import { cn } from '@/lib/utils';

interface StatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: CapitalDeclarationStatus;
  onConfirm: (newStatus: CapitalDeclarationStatus, notes?: string) => Promise<void>;
  onSubmit?: (data: SubmitDeclarationData, notes?: string) => Promise<void>;
}

export function StatusChangeDialog({
  open,
  onOpenChange,
  currentStatus,
  onConfirm,
  onSubmit,
}: StatusChangeDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<CapitalDeclarationStatus>(currentStatus);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Submission-specific state
  const [wasSubmittedLate, setWasSubmittedLate] = useState(false);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSubmittedStatus = selectedStatus === 'submitted';

  const handleConfirm = async () => {
    if (selectedStatus === currentStatus) {
      onOpenChange(false);
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSubmittedStatus && onSubmit) {
        // Special handling for submission
        if (!screenshot) {
          // Screenshot is required for submission
          return;
        }

        await onSubmit(
          {
            was_submitted_late: wasSubmittedLate,
            screenshot,
          },
          notes.trim() || undefined
        );
      } else {
        await onConfirm(selectedStatus, notes.trim() || undefined);
      }

      // Reset state
      setNotes('');
      setWasSubmittedLate(false);
      setScreenshot(null);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setSelectedStatus(currentStatus);
      setNotes('');
      setWasSubmittedLate(false);
      setScreenshot(null);
    }
    onOpenChange(newOpen);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        return;
      }
      setScreenshot(file);
    }
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Filter out statuses that don't make sense to select manually
  const availableStatuses = Object.entries(DECLARATION_STATUS_LABELS).filter(
    ([status]) => !['draft', 'sent'].includes(status)
  );

  const canSubmit = selectedStatus !== currentStatus &&
    (!isSubmittedStatus || screenshot !== null);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="rtl:text-right">שינוי סטטוס</DialogTitle>
          <DialogDescription className="rtl:text-right">
            בחר סטטוס חדש והוסף הערות (אופציונלי)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Status */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Badge className={cn(DECLARATION_STATUS_COLORS[currentStatus])}>
              {DECLARATION_STATUS_LABELS[currentStatus]}
            </Badge>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <Badge className={cn(DECLARATION_STATUS_COLORS[selectedStatus])}>
              {DECLARATION_STATUS_LABELS[selectedStatus]}
            </Badge>
          </div>

          {/* Status Selection */}
          <div className="space-y-2">
            <Label htmlFor="status" className="rtl:text-right block">
              סטטוס חדש
            </Label>
            <Select
              value={selectedStatus}
              onValueChange={(value) => setSelectedStatus(value as CapitalDeclarationStatus)}
            >
              <SelectTrigger className="w-full rtl:text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rtl:text-right">
                {availableStatuses.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <Badge className={cn('text-xs', DECLARATION_STATUS_COLORS[value as CapitalDeclarationStatus])}>
                        {label}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Submission-specific fields */}
          {isSubmittedStatus && (
            <div className="space-y-4 p-4 border rounded-lg bg-green-50/50 border-green-200">
              <h4 className="text-sm font-medium text-green-800 flex items-center gap-2">
                <FileImage className="h-4 w-4" />
                פרטי הגשה
              </h4>

              {/* Late submission checkbox */}
              <div className="flex items-center gap-3">
                <Checkbox
                  id="late-submission"
                  checked={wasSubmittedLate}
                  onCheckedChange={(checked) => setWasSubmittedLate(checked === true)}
                />
                <Label
                  htmlFor="late-submission"
                  className="text-sm cursor-pointer flex items-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  הוגש באיחור
                </Label>
              </div>

              {wasSubmittedLate && (
                <Alert className="border-orange-300 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800 text-sm rtl:text-right">
                    לאחר השמירה, יהיה ניתן לעדכן פרטי קנס בדף פרטי ההצהרה
                  </AlertDescription>
                </Alert>
              )}

              {/* Screenshot upload */}
              <div className="space-y-2">
                <Label className="text-sm">
                  צילום הגשה 
                </Label>

                {screenshot ? (
                  <div className="flex items-center gap-2 p-3 bg-white border rounded-lg">
                    <FileImage className="h-5 w-5 text-green-600" />
                    <span className="flex-1 text-sm truncate">{screenshot.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={removeScreenshot}
                      className="h-8 w-8 text-muted-foreground hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      לחץ להעלאת צילום מסך מרשות המסים
                    </span>
                    <span className="text-xs text-muted-foreground">
                      PNG, JPG או PDF
                    </span>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="rtl:text-right block">
              הערות (אופציונלי)
            </Label>
            <Textarea
              id="notes"

              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] rtl:text-right"
              dir="rtl"
            />
          </div>
        </div>

        <DialogFooter className="flex-row-reverse gap-2">
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !canSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                שומר...
              </>
            ) : (
              'שמור שינוי'
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
          >
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
