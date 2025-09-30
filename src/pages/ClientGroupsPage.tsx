import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users, ChevronDown, ChevronUp, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { clientService, type ClientGroup, type Client } from '@/services';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export default function ClientGroupsPage() {
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupClients, setGroupClients] = useState<Map<string, Client[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ClientGroup | null>(null);
  const [formData, setFormData] = useState({
    group_name: '',
    group_name_hebrew: '',
    primary_owner: '',
    secondary_owners: [] as string[],
    combined_billing: true,
    combined_letters: true,
    notes: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const response = await clientService.getGroups();
      if (response.data) {
        setGroups(response.data);
      }
      if (response.error) {
        toast({
          title: 'שגיאה בטעינת קבוצות',
          description: response.error.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading groups:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בטעינת הקבוצות',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadGroupClients = async (groupId: string) => {
    const response = await clientService.getClientsByGroup(groupId);
    if (response.data) {
      setGroupClients(prev => new Map(prev).set(groupId, response.data));
    }
  };

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
        // Load clients for this group if not already loaded
        if (!groupClients.has(groupId)) {
          loadGroupClients(groupId);
        }
      }
      return newSet;
    });
  };

  const handleAddGroup = async () => {
    const response = await clientService.createGroup(formData);
    if (response.error) {
      toast({
        title: 'שגיאה',
        description: response.error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'קבוצה נוספה בהצלחה',
      description: `${formData.group_name} נוספה למערכת`,
    });

    setIsAddDialogOpen(false);
    resetForm();
    loadGroups();
  };

  const handleUpdateGroup = async () => {
    if (!selectedGroup) return;

    const response = await clientService.updateGroup(selectedGroup.id, formData);
    
    if (response.error) {
      toast({
        title: 'שגיאה',
        description: response.error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'קבוצה עודכנה בהצלחה',
      description: `הפרטים של ${formData.group_name} עודכנו`,
    });

    setIsEditDialogOpen(false);
    setSelectedGroup(null);
    resetForm();
    loadGroups();
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;

    const response = await clientService.deleteGroup(selectedGroup.id);
    
    if (response.error) {
      toast({
        title: 'שגיאה',
        description: response.error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'קבוצה נמחקה',
      description: `${selectedGroup.group_name} הוסרה מהמערכת`,
    });

    setIsDeleteDialogOpen(false);
    setSelectedGroup(null);
    loadGroups();
  };

  const resetForm = () => {
    setFormData({
      group_name: '',
      group_name_hebrew: '',
      primary_owner: '',
      secondary_owners: [],
      combined_billing: true,
      combined_letters: true,
      notes: '',
    });
  };

  const openEditDialog = (group: ClientGroup) => {
    setSelectedGroup(group);
    setFormData({
      group_name: group.group_name,
      group_name_hebrew: group.group_name_hebrew || '',
      primary_owner: group.primary_owner,
      secondary_owners: group.secondary_owners || [],
      combined_billing: group.combined_billing,
      combined_letters: group.combined_letters,
      notes: group.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (group: ClientGroup) => {
    setSelectedGroup(group);
    setIsDeleteDialogOpen(true);
  };

  const handleSecondaryOwnersChange = (value: string) => {
    const owners = value.split(',').map(o => o.trim()).filter(o => o);
    setFormData({ ...formData, secondary_owners: owners });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">ניהול קבוצות לקוחות</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="ml-2 h-4 w-4" />
          הוסף קבוצה חדשה
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">סך הכל קבוצות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{groups.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">קבוצות עם חיוב מאוחד</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {groups.filter(g => g.combined_billing).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">קבוצות עם מכתבים מאוחדים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {groups.filter(g => g.combined_letters).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Groups List */}
      <div className="border rounded-lg">
        {loading ? (
          <div className="p-8 text-center">טוען נתונים...</div>
        ) : groups.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            לא נמצאו קבוצות. לחץ על "הוסף קבוצה חדשה" כדי ליצור קבוצה ראשונה.
          </div>
        ) : (
          <div className="divide-y">
            {groups.map((group) => {
              const clients = groupClients.get(group.id) || [];
              const isExpanded = expandedGroups.has(group.id);
              
              return (
                <Collapsible
                  key={group.id}
                  open={isExpanded}
                  onOpenChange={() => toggleGroupExpansion(group.id)}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="p-0 h-auto">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                            <Users className="h-4 w-4" />
                            <div className="text-right">
                              <div className="font-medium">{group.group_name}</div>
                              {group.group_name_hebrew && (
                                <div className="text-sm text-muted-foreground">
                                  {group.group_name_hebrew}
                                </div>
                              )}
                            </div>
                          </div>
                        </Button>
                      </CollapsibleTrigger>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                          {group.combined_billing && (
                            <Badge variant="outline">חיוב מאוחד</Badge>
                          )}
                          {group.combined_letters && (
                            <Badge variant="outline">מכתבים מאוחדים</Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          בעל שליטה: {group.primary_owner}
                        </div>
                        
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(group)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openDeleteDialog(group)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <CollapsibleContent className="mt-4">
                      {group.secondary_owners && group.secondary_owners.length > 0 && (
                        <div className="mb-2 text-sm">
                          <span className="font-medium">בעלי מניות נוספים: </span>
                          {group.secondary_owners.join(', ')}
                        </div>
                      )}
                      
                      {group.notes && (
                        <div className="mb-2 text-sm text-muted-foreground">
                          הערות: {group.notes}
                        </div>
                      )}
                      
                      <div className="mt-4">
                        <div className="text-sm font-medium mb-2">
                          חברות בקבוצה ({clients.length})
                        </div>
                        {clients.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>שם החברה</TableHead>
                                <TableHead>ת.ז / ח.פ</TableHead>
                                <TableHead>סטטוס</TableHead>
                                <TableHead>סוג</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {clients.map((client) => (
                                <TableRow key={client.id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Building2 className="h-4 w-4" />
                                      {client.company_name}
                                    </div>
                                  </TableCell>
                                  <TableCell>{client.tax_id}</TableCell>
                                  <TableCell>
                                    <Badge variant={
                                      client.status === 'active' ? 'default' :
                                      client.status === 'inactive' ? 'secondary' : 'destructive'
                                    }>
                                      {client.status === 'active' ? 'פעיל' :
                                       client.status === 'inactive' ? 'לא פעיל' : 'ממתין'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {client.client_type === 'company' ? 'חברה' :
                                     client.client_type === 'freelancer' ? 'עצמאי' : 'שכיר בעל שליטה'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            אין חברות משויכות לקבוצה זו
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Group Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>הוספת קבוצה חדשה</DialogTitle>
            <DialogDescription>
              צור קבוצה חדשה לניהול מאוחד של חברות קשורות
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="group_name">שם הקבוצה (אנגלית) *</Label>
                <Input
                  id="group_name"
                  value={formData.group_name}
                  onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="group_name_hebrew">שם הקבוצה (עברית)</Label>
                <Input
                  id="group_name_hebrew"
                  value={formData.group_name_hebrew}
                  onChange={(e) => setFormData({ ...formData, group_name_hebrew: e.target.value })}
                  dir="rtl"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="primary_owner">בעל שליטה ראשי *</Label>
              <Input
                id="primary_owner"
                value={formData.primary_owner}
                onChange={(e) => setFormData({ ...formData, primary_owner: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="secondary_owners">בעלי מניות נוספים (מופרדים בפסיק)</Label>
              <Input
                id="secondary_owners"
                value={formData.secondary_owners.join(', ')}
                onChange={(e) => handleSecondaryOwnersChange(e.target.value)}
                placeholder="יוסי כהן, רונית לוי, דוד ישראלי"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="combined_billing"
                  checked={formData.combined_billing}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, combined_billing: checked })
                  }
                />
                <Label htmlFor="combined_billing" className="mr-2">
                  חיוב מאוחד לקבוצה
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="combined_letters"
                  checked={formData.combined_letters}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, combined_letters: checked })
                  }
                />
                <Label htmlFor="combined_letters" className="mr-2">
                  שליחת מכתבים מאוחדת
                </Label>
              </div>
            </div>
            
            <div>
              <Label htmlFor="notes">הערות</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddDialogOpen(false);
              resetForm();
            }}>
              ביטול
            </Button>
            <Button onClick={handleAddGroup}>
              הוסף קבוצה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>עריכת פרטי קבוצה</DialogTitle>
            <DialogDescription>
              עדכן את פרטי הקבוצה
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_group_name">שם הקבוצה (אנגלית) *</Label>
                <Input
                  id="edit_group_name"
                  value={formData.group_name}
                  onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_group_name_hebrew">שם הקבוצה (עברית)</Label>
                <Input
                  id="edit_group_name_hebrew"
                  value={formData.group_name_hebrew}
                  onChange={(e) => setFormData({ ...formData, group_name_hebrew: e.target.value })}
                  dir="rtl"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit_primary_owner">בעל שליטה ראשי *</Label>
              <Input
                id="edit_primary_owner"
                value={formData.primary_owner}
                onChange={(e) => setFormData({ ...formData, primary_owner: e.target.value })}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="edit_secondary_owners">בעלי מניות נוספים (מופרדים בפסיק)</Label>
              <Input
                id="edit_secondary_owners"
                value={formData.secondary_owners.join(', ')}
                onChange={(e) => handleSecondaryOwnersChange(e.target.value)}
                placeholder="יוסי כהן, רונית לוי, דוד ישראלי"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit_combined_billing"
                  checked={formData.combined_billing}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, combined_billing: checked })
                  }
                />
                <Label htmlFor="edit_combined_billing" className="mr-2">
                  חיוב מאוחד לקבוצה
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit_combined_letters"
                  checked={formData.combined_letters}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, combined_letters: checked })
                  }
                />
                <Label htmlFor="edit_combined_letters" className="mr-2">
                  שליחת מכתבים מאוחדת
                </Label>
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit_notes">הערות</Label>
              <Textarea
                id="edit_notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false);
              setSelectedGroup(null);
              resetForm();
            }}>
              ביטול
            </Button>
            <Button onClick={handleUpdateGroup}>
              עדכן קבוצה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תמחק את הקבוצה {selectedGroup?.group_name} לצמיתות.
              כל החברות שמשויכות לקבוצה יישארו במערכת אך לא יהיו משויכות לקבוצה.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setSelectedGroup(null);
            }}>
              ביטול
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup}>
              מחק קבוצה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}