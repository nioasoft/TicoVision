/**
 * Log Communication Dialog Component
 * Dialog to record a new communication (phone call, note, etc.)
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Mail, Phone, MessageCircle, FileText } from 'lucide-react';
import { capitalDeclarationService } from '@/services/capital-declaration.service';
import { toast } from 'sonner';
import type {
  DeclarationCommunicationType,
  CommunicationDirection,
  CreateCommunicationDto,
} from '@/types/capital-declaration.types';
import { COMMUNICATION_TYPE_LABELS } from '@/types/capital-declaration.types';

interface LogCommunicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  declarationId: string;
  onSuccess?: () => void;
  defaultType?: DeclarationCommunicationType;
}

const TYPE_ICONS: Record<DeclarationCommunicationType, React.ReactNode> = {
  letter: <Mail className="h-4 w-4" />,
  phone_call: <Phone className="h-4 w-4" />,
  whatsapp: <MessageCircle className="h-4 w-4" />,
  note: <FileText className="h-4 w-4" />,
};

export function LogCommunicationDialog({
  open,
  onOpenChange,
  declarationId,
  onSuccess,
  defaultType = 'phone_call',
}: LogCommunicationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    type: DeclarationCommunicationType;
    direction: CommunicationDirection;
    subject: string;
    content: string;
    outcome: string;
  }>({
    type: defaultType,
    direction: 'outbound',
    subject: '',
    content: '',
    outcome: '',
  });

  const handleSubmit = async () => {
    setLoading(true);

    const dto: CreateCommunicationDto = {
      declaration_id: declarationId,
      communication_type: formData.type,
      direction: formData.direction,
      subject: formData.subject || undefined,
      content: formData.content || undefined,
      outcome: formData.outcome || undefined,
    };

    const { error } = await capitalDeclarationService.logCommunication(dto);

    setLoading(false);

    if (error) {
      toast.error('שגיאה בשמירת התקשורת');
      return;
    }

    toast.success('התקשורת נשמרה בהצלחה');
    onOpenChange(false);
    onSuccess?.();

    // Reset form
    setFormData({
      type: defaultType,
      direction: 'outbound',
      subject: '',
      content: '',
      outcome: '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] rtl:text-right" dir="rtl">
        <DialogHeader>
          <DialogTitle>תיעוד תקשורת</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Communication Type */}
          <div className="space-y-2">
            <Label>סוג תקשורת</Label>
            <Select
              value={formData.type}
              onValueChange={(val) =>
                setFormData((prev) => ({
                  ...prev,
                  type: val as DeclarationCommunicationType,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  ['phone_call', 'whatsapp', 'note', 'letter'] as DeclarationCommunicationType[]
                ).map((type) => (
                  <SelectItem key={type} value={type}>
                    <span className="flex items-center gap-2 rtl:flex-row-reverse">
                      {TYPE_ICONS[type]}
                      {COMMUNICATION_TYPE_LABELS[type]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Direction */}
          <div className="space-y-2">
            <Label>כיוון</Label>
            <RadioGroup
              value={formData.direction}
              onValueChange={(val) =>
                setFormData((prev) => ({
                  ...prev,
                  direction: val as CommunicationDirection,
                }))
              }
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <RadioGroupItem value="outbound" id="outbound" />
                <Label htmlFor="outbound" className="font-normal cursor-pointer">
                  יוצא (אלינו ללקוח)
                </Label>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <RadioGroupItem value="inbound" id="inbound" />
                <Label htmlFor="inbound" className="font-normal cursor-pointer">
                  נכנס (מהלקוח אלינו)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">נושא (אופציונלי)</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, subject: e.target.value }))
              }
              placeholder="למשל: תזכורת להעלאת מסמכים"
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">תוכן (אופציונלי)</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, content: e.target.value }))
              }
              placeholder="פרטי השיחה/ההודעה..."
              rows={3}
            />
          </div>

          {/* Outcome */}
          <div className="space-y-2">
            <Label htmlFor="outcome">תוצאה/סיכום (אופציונלי)</Label>
            <Input
              id="outcome"
              value={formData.outcome}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, outcome: e.target.value }))
              }
              placeholder="למשל: הלקוח התחייב להעלות עד יום ראשון"
            />
          </div>
        </div>

        <DialogFooter className="rtl:flex-row-reverse">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ביטול
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            שמור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
