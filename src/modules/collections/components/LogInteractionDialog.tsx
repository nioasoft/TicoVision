/**
 * Log Interaction Dialog
 */

import React, { useState } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { collectionService } from '@/services/collection.service';
import { toast } from 'sonner';
import type { CollectionRow } from '@/types/collection.types';

interface LogInteractionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: CollectionRow | null;
  onSuccess: () => void;
}

export const LogInteractionDialog: React.FC<LogInteractionDialogProps> = ({
  open,
  onOpenChange,
  row,
  onSuccess,
}) => {
  const [interactionType, setInteractionType] = useState<'phone_call' | 'email_sent' | 'meeting' | 'note'>('phone_call');
  const [direction, setDirection] = useState<'outbound' | 'inbound'>('outbound');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [outcome, setOutcome] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!row) return;

    setLoading(true);
    const result = await collectionService.logManualInteraction(row.client_id, {
      client_id: row.client_id,
      fee_id: row.fee_calculation_id,
      interaction_type: interactionType,
      direction,
      subject,
      content: content || undefined,
      outcome: outcome || undefined,
    });

    setLoading(false);

    if (result.error) {
      toast.error('שגיאה', { description: result.error.message });
      return;
    }

    toast.success('האינטראקציה נרשמה בהצלחה');
    onSuccess();
    onOpenChange(false);
    setSubject('');
    setContent('');
    setOutcome('');
  };

  if (!row) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rtl:text-right ltr:text-left max-w-2xl">
        <DialogHeader>
          <DialogTitle className="rtl:text-right ltr:text-left">רישום אינטראקציה עם לקוח</DialogTitle>
          <DialogDescription className="rtl:text-right ltr:text-left">
            לקוח: {row.company_name_hebrew || row.client_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type" className="rtl:text-right ltr:text-left">סוג אינטראקציה</Label>
            <Select value={interactionType} onValueChange={(value: any) => setInteractionType(value)}>
              <SelectTrigger id="type" className="rtl:text-right ltr:text-left">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rtl:text-right ltr:text-left">
                <SelectItem value="phone_call">שיחת טלפון</SelectItem>
                <SelectItem value="email_sent">אימייל שנשלח</SelectItem>
                <SelectItem value="meeting">פגישה</SelectItem>
                <SelectItem value="note">הערה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="rtl:text-right ltr:text-left">כיוון</Label>
            <RadioGroup value={direction} onValueChange={(value: any) => setDirection(value)} className="flex gap-4 rtl:flex-row-reverse">
              <div className="flex items-center gap-2 rtl:flex-row-reverse">
                <RadioGroupItem value="outbound" id="outbound" />
                <Label htmlFor="outbound" className="rtl:text-right ltr:text-left cursor-pointer">יוצא (התקשרתי ללקוח)</Label>
              </div>
              <div className="flex items-center gap-2 rtl:flex-row-reverse">
                <RadioGroupItem value="inbound" id="inbound" />
                <Label htmlFor="inbound" className="rtl:text-right ltr:text-left cursor-pointer">נכנס (הלקוח התקשר אלי)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject" className="rtl:text-right ltr:text-left">נושא</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="למשל: התקשרתי לגבי שכר טרחה 2025"
              required
              className="rtl:text-right ltr:text-left"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content" className="rtl:text-right ltr:text-left">תוכן (אופציונלי)</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="פרטים נוספים על השיחה/פגישה..."
              rows={4}
              className="rtl:text-right ltr:text-left"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="outcome" className="rtl:text-right ltr:text-left">תוצאה (אופציונלי)</Label>
            <Input
              id="outcome"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="למשל: הבטיח לשלם עד סוף החודש"
              className="rtl:text-right ltr:text-left"
            />
          </div>

          <DialogFooter className="rtl:flex-row-reverse gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'שומר...' : 'רישום אינטראקציה'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              ביטול
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
