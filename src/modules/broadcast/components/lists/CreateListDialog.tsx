/**
 * Create Distribution List Dialog
 */

import React, { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useBroadcastStore } from '../../store/broadcastStore';
import { ClientMultiSelect } from './ClientMultiSelect';
import { toast } from 'sonner';

interface CreateListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateListDialog: React.FC<CreateListDialogProps> = ({ open, onOpenChange }) => {
  const { allActiveClients, createList } = useBroadcastStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setSelectedClients([]);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('נא להזין שם לרשימה');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createList(name.trim(), description.trim() || undefined, selectedClients);
      if (result) {
        toast.success('רשימת התפוצה נוצרה בהצלחה');
        onOpenChange(false);
      } else {
        toast.error('שגיאה ביצירת הרשימה');
      }
    } catch {
      toast.error('שגיאה ביצירת הרשימה');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="rtl:text-right">יצירת רשימת תפוצה חדשה</DialogTitle>
            <DialogDescription className="rtl:text-right">
              צור רשימה מותאמת אישית של לקוחות לשליחת הפצות
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="rtl:text-right">
                שם הרשימה *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}

                className="rtl:text-right"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="rtl:text-right">
                תיאור (אופציונלי)
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}

                className="rtl:text-right resize-none"
                rows={2}
              />
            </div>

            {/* Client Selection */}
            <div className="space-y-2">
              <Label className="rtl:text-right">
                לקוחות ({selectedClients.length} נבחרו)
              </Label>
              <ClientMultiSelect
                clients={allActiveClients}
                selectedIds={selectedClients}
                onChange={setSelectedClients}
              />
            </div>
          </div>

          <DialogFooter className="rtl:space-x-reverse">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              ביטול
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  יוצר...
                </>
              ) : (
                'צור רשימה'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
