/**
 * Status Change Dialog
 * Allows accountants to change declaration status with optional notes
 */

import { useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowRight, Loader2 } from 'lucide-react';
import type { CapitalDeclarationStatus } from '@/types/capital-declaration.types';
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
}

export function StatusChangeDialog({
  open,
  onOpenChange,
  currentStatus,
  onConfirm,
}: StatusChangeDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<CapitalDeclarationStatus>(currentStatus);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (selectedStatus === currentStatus) {
      onOpenChange(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(selectedStatus, notes.trim() || undefined);
      setNotes('');
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
    }
    onOpenChange(newOpen);
  };

  // Filter out statuses that don't make sense to select manually
  const availableStatuses = Object.entries(DECLARATION_STATUS_LABELS).filter(
    ([status]) => !['draft', 'sent'].includes(status)
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]" dir="rtl">
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

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="rtl:text-right block">
              הערות (אופציונלי)
            </Label>
            <Textarea
              id="notes"
              placeholder="הוסף הערה על השינוי..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px] rtl:text-right"
              dir="rtl"
            />
          </div>
        </div>

        <DialogFooter className="flex-row-reverse gap-2">
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || selectedStatus === currentStatus}
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
