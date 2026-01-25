import React, { useState } from 'react';
import { Search, Users, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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
import type { AssignableGroup } from '@/services/user-client-assignment.service';

interface ClientAssignmentDialogProps {
  open: boolean;
  user: User | null;
  // Client props
  clients: Client[];
  selectedClients: string[];
  primaryClientId: string | undefined;
  searchTerm: string;
  // Group props
  groups: AssignableGroup[];
  selectedGroups: string[];
  groupSearchTerm: string;
  // Callbacks
  onClose: () => void;
  onSearchChange: (term: string) => void;
  onGroupSearchChange: (term: string) => void;
  onClientToggle: (clientId: string) => void;
  onGroupToggle: (groupId: string) => void;
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
  groups,
  selectedGroups,
  groupSearchTerm,
  onClose,
  onSearchChange,
  onGroupSearchChange,
  onClientToggle,
  onGroupToggle,
  onPrimaryChange,
  onSave,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('clients');

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate total clients via groups
  const clientsViaGroups = groups
    .filter(g => selectedGroups.includes(g.id))
    .reduce((sum, g) => sum + g.member_count, 0);

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>שיוך לקוחות וקבוצות למשתמש</DialogTitle>
          <DialogDescription>
            שייך לקוחות או קבוצות ל-{user.full_name}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} dir="rtl">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="clients" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              לקוחות
              {selectedClients.length > 0 && (
                <Badge variant="secondary" className="mr-1">
                  {selectedClients.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="groups" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              קבוצות
              {selectedGroups.length > 0 && (
                <Badge variant="secondary" className="mr-1">
                  {selectedGroups.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Clients Tab */}
          <TabsContent value="clients" className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input

                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pr-10"
                dir="rtl"
              />
            </div>

            {/* Clients List */}
            <ScrollArea className="h-[350px] border rounded-md p-4">
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
          </TabsContent>

          {/* Groups Tab */}
          <TabsContent value="groups" className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input

                value={groupSearchTerm}
                onChange={(e) => onGroupSearchChange(e.target.value)}
                className="pr-10"
                dir="rtl"
              />
            </div>

            {/* Groups List */}
            <ScrollArea className="h-[350px] border rounded-md p-4">
              {groups.length === 0 ? (
                <p className="text-center text-muted-foreground">לא נמצאו קבוצות</p>
              ) : (
                <div className="space-y-3">
                  {groups.map((group) => {
                    const isSelected = selectedGroups.includes(group.id);

                    return (
                      <div
                        key={group.id}
                        className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Checkbox
                            id={`group-${group.id}`}
                            checked={isSelected}
                            onCheckedChange={() => onGroupToggle(group.id)}
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor={`group-${group.id}`}
                              className="cursor-pointer font-medium"
                            >
                              {group.group_name_hebrew}
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {group.primary_owner}
                            </p>
                          </div>
                        </div>

                        <Badge variant="outline">
                          {group.member_count} לקוחות
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Summary */}
        <div className="text-sm text-muted-foreground border-t pt-3 mt-2">
          <div className="flex items-center justify-between">
            <span>
              {selectedClients.length} לקוחות ישירים
              {selectedGroups.length > 0 && (
                <> • {selectedGroups.length} קבוצות ({clientsViaGroups} לקוחות)</>
              )}
            </span>
            {primaryClientId && selectedClients.includes(primaryClientId) && (
              <span className="text-primary">לקוח ראשי נבחר</span>
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
