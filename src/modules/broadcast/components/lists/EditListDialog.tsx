/**
 * Edit Distribution List Dialog
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
import type { DistributionList } from '../../types/broadcast.types';

interface EditListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  list: DistributionList;
}

export const EditListDialog: React.FC<EditListDialogProps> = ({
  open,
  onOpenChange,
  list,
}) => {
  const {
    allActiveClients,
    selectedList,
    fetchListWithMembers,
    updateList,
    setListMembers,
  } = useBroadcastStore();

  const [name, setName] = useState(list.name);
  const [description, setDescription] = useState(list.description || '');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load list members when dialog opens
  useEffect(() => {
    if (open && list.id) {
      setIsLoading(true);
      setName(list.name);
      setDescription(list.description || '');
      fetchListWithMembers(list.id).then(() => {
        setIsLoading(false);
      });
    }
  }, [open, list.id, list.name, list.description, fetchListWithMembers]);

  // Set selected clients when list members are loaded
  useEffect(() => {
    if (selectedList && selectedList.id === list.id) {
      setSelectedClients(selectedList.members.map((m) => m.client_id));
    }
  }, [selectedList, list.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('נא להזין שם לרשימה');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update list metadata
      await updateList(list.id, name.trim(), description.trim() || undefined);

      // Update members
      await setListMembers(list.id, selectedClients);

      toast.success('רשימת התפוצה עודכנה בהצלחה');
      onOpenChange(false);
    } catch {
      toast.error('שגיאה בעדכון הרשימה');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" dir="rtl">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="rtl:text-right">עריכת רשימת תפוצה</DialogTitle>
              <DialogDescription className="rtl:text-right">
                עדכן את פרטי הרשימה ואת חברי הרשימה
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
                  תיאור
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
                    שומר...
                  </>
                ) : (
                  'שמור שינויים'
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
