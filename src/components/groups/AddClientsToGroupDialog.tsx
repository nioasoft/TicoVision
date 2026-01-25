import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { clientService, type Client, type PaymentRole } from '@/services';
import { PAYMENT_ROLE_LABELS } from '@/lib/labels';

interface AddClientsToGroupDialogProps {
  open: boolean;
  groupId: string;
  groupName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddClientsToGroupDialog({
  open,
  groupId,
  groupName,
  onClose,
  onSuccess,
}: AddClientsToGroupDialogProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, PaymentRole>>({});
  const [assigningClients, setAssigningClients] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Load clients
  useEffect(() => {
    if (open) {
      loadClients();
      // Reset states when dialog opens
      setSearchTerm('');
      setSelectedRoles({});
      setAssigningClients(new Set());
    }
  }, [open, showUnassignedOnly]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const response = showUnassignedOnly
        ? await clientService.getUnassignedClients()
        : await clientService.list();

      if (response.data) {
        // Filter out clients that are already in this group
        const availableClients = response.data.filter(
          (client) => client.group_id !== groupId
        );
        setClients(availableClients);
        setFilteredClients(availableClients);

        // Initialize all clients with default 'member' role
        const initialRoles: Record<string, PaymentRole> = {};
        availableClients.forEach((client) => {
          initialRoles[client.id] = 'member';
        });
        setSelectedRoles(initialRoles);
      }

      if (response.error) {
        toast({
          title: 'שגיאה בטעינת לקוחות',
          description: response.error.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בטעינת רשימת הלקוחות',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter clients based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredClients(clients);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = clients.filter((client) => {
      return (
        client.company_name?.toLowerCase().includes(term) ||
        client.company_name_hebrew?.toLowerCase().includes(term) ||
        client.tax_id?.includes(term)
      );
    });

    setFilteredClients(filtered);
  }, [searchTerm, clients]);

  const handleRoleChange = useCallback((clientId: string, role: PaymentRole) => {
    setSelectedRoles((prev) => ({
      ...prev,
      [clientId]: role,
    }));
  }, []);

  const handleAssignClient = async (client: Client) => {
    const role = selectedRoles[client.id] || 'member';

    // Add to assigning set
    setAssigningClients((prev) => new Set(prev).add(client.id));

    try {
      const response = await clientService.assignClientToGroup(
        client.id,
        groupId,
        role
      );

      if (response.error) {
        toast({
          title: 'שגיאה בהוספת לקוח',
          description: response.error.message,
          variant: 'destructive',
        });
        // Remove from assigning set on error
        setAssigningClients((prev) => {
          const newSet = new Set(prev);
          newSet.delete(client.id);
          return newSet;
        });
        return;
      }

      toast({
        title: 'לקוח נוסף בהצלחה',
        description: `${client.company_name} נוסף לקבוצה "${groupName}"`,
      });

      // Remove client from list
      setClients((prev) => prev.filter((c) => c.id !== client.id));
      setFilteredClients((prev) => prev.filter((c) => c.id !== client.id));

      // Remove from assigning set
      setAssigningClients((prev) => {
        const newSet = new Set(prev);
        newSet.delete(client.id);
        return newSet;
      });
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בהוספת הלקוח לקבוצה',
        variant: 'destructive',
      });
      // Remove from assigning set on error
      setAssigningClients((prev) => {
        const newSet = new Set(prev);
        newSet.delete(client.id);
        return newSet;
      });
    }
  };

  const handleClose = () => {
    onClose();
    // Trigger success callback to refresh parent component
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="rtl:text-right ltr:text-left">
          <DialogTitle className="rtl:text-right ltr:text-left">
            הוספת לקוחות לקבוצה: {groupName}
          </DialogTitle>
          <DialogDescription className="rtl:text-right ltr:text-left">
            חפש לקוחות והוסף אותם לקבוצה זו
          </DialogDescription>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input

                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 rtl:text-right ltr:text-left"
                dir="rtl"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="unassigned"
              checked={showUnassignedOnly}
              onCheckedChange={(checked) => setShowUnassignedOnly(checked as boolean)}
            />
            <Label
              htmlFor="unassigned"
              className="text-sm font-normal cursor-pointer mr-2 rtl:text-right ltr:text-left"
            >
              הצג רק לקוחות שלא משוייכים לקבוצה
            </Label>
          </div>
        </div>

        {/* Clients Table */}
        <div className="border rounded-lg">
          {loading ? (
            <div className="p-8 text-center">טוען נתונים...</div>
          ) : filteredClients.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {searchTerm
                ? 'לא נמצאו לקוחות התואמים לחיפוש'
                : showUnassignedOnly
                ? 'כל הלקוחות משוייכים לקבוצות'
                : 'אין לקוחות זמינים'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="rtl:text-right ltr:text-left">שם החברה</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">שם עברי</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">ת.ז / ח.פ</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">סטטוס</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">תפקיד תשלום</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => {
                  const isAssigning = assigningClients.has(client.id);
                  return (
                    <TableRow key={client.id}>
                      <TableCell className="rtl:text-right ltr:text-left">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {client.company_name}
                        </div>
                      </TableCell>
                      <TableCell className="rtl:text-right ltr:text-left">
                        {client.company_name_hebrew || '-'}
                      </TableCell>
                      <TableCell className="rtl:text-right ltr:text-left">{client.tax_id}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            client.status === 'active'
                              ? 'default'
                              : client.status === 'inactive'
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {client.status === 'active'
                            ? 'פעיל'
                            : client.status === 'inactive'
                            ? 'לא פעיל'
                            : 'ממתין'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={selectedRoles[client.id] || 'member'}
                          onValueChange={(value) =>
                            handleRoleChange(client.id, value as PaymentRole)
                          }
                          disabled={isAssigning}
                        >
                          <SelectTrigger className="w-[180px] rtl:text-right ltr:text-left">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="member" className="rtl:text-right ltr:text-left">
                              <span className="rtl:text-right ltr:text-left">
                                {PAYMENT_ROLE_LABELS.member}
                              </span>
                            </SelectItem>
                            <SelectItem value="primary_payer" className="rtl:text-right ltr:text-left">
                              <span className="rtl:text-right ltr:text-left">
                                {PAYMENT_ROLE_LABELS.primary_payer}
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleAssignClient(client)}
                          disabled={isAssigning}
                        >
                          {isAssigning ? (
                            'מוסיף...'
                          ) : (
                            <>
                              <Plus className="ml-2 h-4 w-4" />
                              הוסף לקבוצה
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Footer Info */}
        <div className="text-sm text-muted-foreground rtl:text-right ltr:text-left">
          מציג {filteredClients.length} לקוחות זמינים
        </div>
      </DialogContent>
    </Dialog>
  );
}
