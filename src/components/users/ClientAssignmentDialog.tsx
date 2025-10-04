import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { User } from '@/services/user.service';
import type { Client } from '@/services/client.service';

interface ClientAssignmentDialogProps {
  open: boolean;
  user: User | null;
  clients: Client[];
  selectedClients: string[];
  primaryClientId: string | undefined;
  searchTerm: string;
  onClose: () => void;
  onSearchChange: (term: string) => void;
  onClientToggle: (clientId: string) => void;
  onPrimaryChange: (clientId: string) => void;
  onSave: () => Promise<void>;
}

export const ClientAssignmentDialog = React.memo<ClientAssignmentDialogProps>(({
  open,
  user,
  clients,
  selectedClients,
  primaryClientId,
  searchTerm,
  onClose,
  onSearchChange,
  onClientToggle,
  onPrimaryChange,
  onSave,
}) => {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>שיוך לקוחות למשתמש</DialogTitle>
          <DialogDescription>
            שייך לקוחות ל-{user.full_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="חפש לקוח..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pr-10"
              dir="rtl"
            />
          </div>

          {/* Clients List */}
          <ScrollArea className="h-[400px] border rounded-md p-4">
            {clients.length === 0 ? (
              <p className="text-center text-muted-foreground">לא נמצאו לקוחות</p>
            ) : (
              <div className="space-y-3">
                {clients.map((client) => {
                  const isSelected = selectedClients.includes(client.id);
                  const isPrimary = primaryClientId === client.id;

                  return (
                    <div
                      key={client.id}
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Checkbox
                          id={`client-${client.id}`}
                          checked={isSelected}
                          onCheckedChange={() => onClientToggle(client.id)}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={`client-${client.id}`}
                            className="cursor-pointer font-medium"
                          >
                            {client.company_name}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {client.tax_id}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <RadioGroup
                          value={isPrimary ? client.id : ''}
                          onValueChange={() => onPrimaryChange(client.id)}
                        >
                          <div className="flex items-center gap-2">
                            <RadioGroupItem value={client.id} id={`primary-${client.id}`} />
                            <Label
                              htmlFor={`primary-${client.id}`}
                              className="cursor-pointer text-sm"
                            >
                              לקוח ראשי
                            </Label>
                          </div>
                        </RadioGroup>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Summary */}
          <div className="text-sm text-muted-foreground">
            {selectedClients.length} לקוחות נבחרו
            {primaryClientId && selectedClients.includes(primaryClientId) && (
              <span> • לקוח ראשי נבחר</span>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            ביטול
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'שומר...' : 'שמור שיוך'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

ClientAssignmentDialog.displayName = 'ClientAssignmentDialog';
