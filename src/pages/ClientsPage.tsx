import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Download, Upload, Filter, CheckSquare, Square, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { clientService, type Client, type CreateClientDto, type UpdateClientDto } from '@/services';
import { formatDate } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState<CreateClientDto>({
    company_name: '',
    tax_id: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    address: {
      street: '',
      city: '',
      postal_code: ''
    },
    status: 'active',
    internal_external: 'internal',
    collection_responsibility: 'tiko',
    notes: '',
  });
  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    pending: 0,
  });
  const [totalClients, setTotalClients] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const { toast } = useToast();

  useEffect(() => {
    loadClients();
    loadStatistics();
  }, [searchQuery, statusFilter, currentPage]);

  const loadClients = async () => {
    setLoading(true);
    try {
      let response;
      
      if (searchQuery) {
        response = await clientService.search(searchQuery);
        if (response.data) {
          setClients(response.data);
          setTotalClients(response.data.length);
        }
      } else {
        const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined;
        response = await clientService.list(
          { page: currentPage, pageSize, sortBy: 'created_at', sortOrder: 'desc' },
          filters
        );
        if (response.data) {
          setClients(response.data.clients);
          setTotalClients(response.data.total);
        }
      }

      if (response.error) {
        toast({
          title: 'שגיאה בטעינת לקוחות',
          description: response.error.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בטעינת הלקוחות',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    const response = await clientService.getStatistics();
    if (response.data) {
      setStatistics(response.data);
    }
  };

  const handleAddClient = async () => {
    const response = await clientService.create(formData);
    if (response.error) {
      toast({
        title: 'שגיאה',
        description: response.error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'לקוח נוסף בהצלחה',
      description: `${formData.company_name} נוסף למערכת`,
    });

    setIsAddDialogOpen(false);
    resetForm();
    loadClients();
    loadStatistics();
  };

  const handleUpdateClient = async () => {
    if (!selectedClient) return;

    const updateData: UpdateClientDto = { ...formData };
    const response = await clientService.update(selectedClient.id, updateData);
    
    if (response.error) {
      toast({
        title: 'שגיאה',
        description: response.error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'לקוח עודכן בהצלחה',
      description: `הפרטים של ${formData.company_name} עודכנו`,
    });

    setIsEditDialogOpen(false);
    setSelectedClient(null);
    resetForm();
    loadClients();
  };

  const handleDeleteClient = async () => {
    if (!selectedClient) return;

    const response = await clientService.delete(selectedClient.id);
    
    if (response.error) {
      toast({
        title: 'שגיאה',
        description: response.error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'לקוח נמחק',
      description: `${selectedClient.company_name} הוסר מהמערכת`,
    });

    setIsDeleteDialogOpen(false);
    setSelectedClient(null);
    loadClients();
    loadStatistics();
  };

  const handleBulkStatusUpdate = async (status: 'active' | 'inactive' | 'pending') => {
    if (selectedClients.length === 0) {
      toast({
        title: 'שגיאה',
        description: 'אנא בחר לקוחות לעדכון',
        variant: 'destructive',
      });
      return;
    }

    const response = await clientService.bulkUpdateStatus(selectedClients, status);
    
    if (response.error) {
      toast({
        title: 'שגיאה',
        description: response.error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'סטטוס עודכן',
      description: `סטטוס עודכן עבור ${selectedClients.length} לקוחות`,
    });

    setSelectedClients([]);
    loadClients();
    loadStatistics();
  };

  const handleExportToExcel = () => {
    // TODO: Implement Excel export
    toast({
      title: 'ייצוא לExcel',
      description: 'הפונקציה תהיה זמינה בקרוב',
    });
  };

  const handleImportFromExcel = () => {
    // TODO: Implement Excel import
    toast({
      title: 'ייבוא מExcel',
      description: 'הפונקציה תהיה זמינה בקרוב',
    });
  };

  const resetForm = () => {
    setFormData({
      company_name: '',
      tax_id: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      address: {
        street: '',
        city: '',
        postal_code: ''
      },
      status: 'active',
      internal_external: 'internal',
      collection_responsibility: 'tiko',
      notes: '',
    });
  };

  const openEditDialog = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      company_name: client.company_name,
      tax_id: client.tax_id,
      contact_name: client.contact_name,
      contact_email: client.contact_email,
      contact_phone: client.contact_phone || '',
      address: client.address || { street: '', city: '', postal_code: '' },
      status: client.status,
      internal_external: client.internal_external || 'internal',
      collection_responsibility: client.collection_responsibility || 'tiko',
      notes: client.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (client: Client) => {
    setSelectedClient(client);
    setIsDeleteDialogOpen(true);
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedClients.length === clients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(clients.map(c => c.id));
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      active: 'default',
      inactive: 'secondary',
      pending: 'destructive',
    };
    const labels: Record<string, string> = {
      active: 'פעיל',
      inactive: 'לא פעיל',
      pending: 'ממתין',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const totalPages = Math.ceil(totalClients / pageSize);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">ניהול לקוחות</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="ml-2 h-4 w-4" />
          הוסף לקוח חדש
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">סך הכל לקוחות</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">לקוחות פעילים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statistics.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">לקוחות לא פעילים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{statistics.inactive}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">ממתינים לאישור</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{statistics.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="חיפוש לפי שם, ת.ז, או איש קשר..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="סינון לפי סטטוס" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            <SelectItem value="active">פעיל</SelectItem>
            <SelectItem value="inactive">לא פעיל</SelectItem>
            <SelectItem value="pending">ממתין</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleImportFromExcel}>
          <Upload className="ml-2 h-4 w-4" />
          ייבוא מExcel
        </Button>
        <Button variant="outline" onClick={handleExportToExcel}>
          <Download className="ml-2 h-4 w-4" />
          ייצוא לExcel
        </Button>
      </div>

      {/* Bulk Actions */}
      {selectedClients.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-between">
          <span className="text-sm">{selectedClients.length} לקוחות נבחרו</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleBulkStatusUpdate('active')}>
              הפעל
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkStatusUpdate('inactive')}>
              השבת
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedClients([])}>
              ביטול בחירה
            </Button>
          </div>
        </div>
      )}

      {/* Clients Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedClients.length === clients.length && clients.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>שם החברה</TableHead>
              <TableHead>ת.ז / ח.פ</TableHead>
              <TableHead>איש קשר</TableHead>
              <TableHead>טלפון</TableHead>
              <TableHead>אימייל</TableHead>
              <TableHead>סטטוס</TableHead>
              <TableHead>תאריך הוספה</TableHead>
              <TableHead className="text-left">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  טוען נתונים...
                </TableCell>
              </TableRow>
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  לא נמצאו לקוחות
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedClients.includes(client.id)}
                      onCheckedChange={() => toggleClientSelection(client.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      <div>{client.company_name}</div>
                      {client.company_name_hebrew && (
                        <div className="text-sm text-gray-500">{client.company_name_hebrew}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{client.tax_id}</TableCell>
                  <TableCell>{client.contact_name}</TableCell>
                  <TableCell>{client.contact_phone || '-'}</TableCell>
                  <TableCell>{client.contact_email || '-'}</TableCell>
                  <TableCell>{getStatusBadge(client.status)}</TableCell>
                  <TableCell>{formatDate(client.created_at)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>פעולות</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openEditDialog(client)}>
                          <Edit className="ml-2 h-4 w-4" />
                          ערוך
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => openDeleteDialog(client)}
                        >
                          <Trash2 className="ml-2 h-4 w-4" />
                          מחק
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            הקודם
          </Button>
          <span className="flex items-center px-4">
            עמוד {currentPage} מתוך {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            הבא
          </Button>
        </div>
      )}

      {/* Add Client Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>הוספת לקוח חדש</DialogTitle>
            <DialogDescription>
              הזן את פרטי הלקוח החדש
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="company_name">שם החברה (אנגלית) *</Label>
                <Input
                  id="company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="company_name_hebrew">שם החברה (עברית)</Label>
                <Input
                  id="company_name_hebrew"
                  value={formData.company_name_hebrew}
                  onChange={(e) => setFormData({ ...formData, company_name_hebrew: e.target.value })}
                  dir="rtl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tax_id">ת.ז / ח.פ (9 ספרות) *</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  maxLength={9}
                  pattern="\d{9}"
                  required
                />
              </div>
              <div>
                <Label htmlFor="contact_name">שם איש קשר *</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_phone">טלפון</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  type="tel"
                />
              </div>
              <div>
                <Label htmlFor="contact_email">אימייל</Label>
                <Input
                  id="contact_email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  type="email"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_address">כתובת</Label>
                <Input
                  id="contact_address"
                  value={formData.contact_address}
                  onChange={(e) => setFormData({ ...formData, contact_address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="contact_city">עיר</Label>
                <Input
                  id="contact_city"
                  value={formData.contact_city}
                  onChange={(e) => setFormData({ ...formData, contact_city: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">סטטוס</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'active' | 'inactive' | 'pending') =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">פעיל</SelectItem>
                  <SelectItem value="inactive">לא פעיל</SelectItem>
                  <SelectItem value="pending">ממתין</SelectItem>
                </SelectContent>
              </Select>
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
            <Button onClick={handleAddClient}>
              הוסף לקוח
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>עריכת פרטי לקוח</DialogTitle>
            <DialogDescription>
              עדכן את פרטי הלקוח
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_company_name">שם החברה (אנגלית) *</Label>
                <Input
                  id="edit_company_name"
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_company_name_hebrew">שם החברה (עברית)</Label>
                <Input
                  id="edit_company_name_hebrew"
                  value={formData.company_name_hebrew}
                  onChange={(e) => setFormData({ ...formData, company_name_hebrew: e.target.value })}
                  dir="rtl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_tax_id">ת.ז / ח.פ (9 ספרות) *</Label>
                <Input
                  id="edit_tax_id"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  maxLength={9}
                  pattern="\d{9}"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_contact_name">שם איש קשר *</Label>
                <Input
                  id="edit_contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_contact_phone">טלפון</Label>
                <Input
                  id="edit_contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  type="tel"
                />
              </div>
              <div>
                <Label htmlFor="edit_contact_email">אימייל</Label>
                <Input
                  id="edit_contact_email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  type="email"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_contact_address">כתובת</Label>
                <Input
                  id="edit_contact_address"
                  value={formData.contact_address}
                  onChange={(e) => setFormData({ ...formData, contact_address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit_contact_city">עיר</Label>
                <Input
                  id="edit_contact_city"
                  value={formData.contact_city}
                  onChange={(e) => setFormData({ ...formData, contact_city: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit_status">סטטוס</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'active' | 'inactive' | 'pending') =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">פעיל</SelectItem>
                  <SelectItem value="inactive">לא פעיל</SelectItem>
                  <SelectItem value="pending">ממתין</SelectItem>
                </SelectContent>
              </Select>
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
              setSelectedClient(null);
              resetForm();
            }}>
              ביטול
            </Button>
            <Button onClick={handleUpdateClient}>
              עדכן לקוח
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
              פעולה זו תמחק את הלקוח {selectedClient?.company_name} לצמיתות.
              לא ניתן לבטל פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setIsDeleteDialogOpen(false);
              setSelectedClient(null);
            }}>
              ביטול
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient}>
              מחק לקוח
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}