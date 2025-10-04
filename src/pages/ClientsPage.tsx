import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { useDebounce } from '@/hooks/useDebounce';
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
import { clientService, type Client, type CreateClientDto, type UpdateClientDto, type ClientType, type CompanyStatus, type CompanySubtype, type ClientContact, type CreateClientContactDto } from '@/services';
import { formatDate } from '@/lib/utils';
import { ContactsManager } from '@/components/ContactsManager';
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
  const [companyStatusFilter, setCompanyStatusFilter] = useState<string>('active');
  const [clientTypeFilter, setClientTypeFilter] = useState<string>('all');
  const [companySubtypeFilter, setCompanySubtypeFilter] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [clientContacts, setClientContacts] = useState<ClientContact[]>([]);
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
    client_type: 'company',
    company_status: 'active',
    company_subtype: undefined,
    pays_fees: false,
    receives_letters: true,
  });
  const [totalClients, setTotalClients] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const { toast } = useToast();

  // Debounce search query to reduce API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    loadClients();
  }, [debouncedSearchQuery, companyStatusFilter, clientTypeFilter, companySubtypeFilter, currentPage]);

  const loadClients = async () => {
    setLoading(true);
    try {
      let response;

      if (debouncedSearchQuery) {
        response = await clientService.search(debouncedSearchQuery);
        if (response.data) {
          setClients(response.data);
          setTotalClients(response.data.length);
        }
      } else {
        // Build filters object with all active filters
        const filters: Record<string, string> = {};
        if (companyStatusFilter !== 'all') filters.company_status = companyStatusFilter;
        if (clientTypeFilter !== 'all') filters.client_type = clientTypeFilter;
        if (companySubtypeFilter !== 'all') filters.company_subtype = companySubtypeFilter;

        response = await clientService.list(
          { page: currentPage, pageSize, sortBy: 'created_at', sortOrder: 'desc' },
          Object.keys(filters).length > 0 ? filters : undefined
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
      logger.error('Error loading clients:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בטעינת הלקוחות',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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
  };

  const handleUpdateClient = async () => {
    if (!selectedClient) return;

    // Remove old contact fields - they're managed through client_contacts table now
    const { contact_name, contact_email, contact_phone, ...clientData } = formData;

    // Don't send tax_id if it hasn't changed (to avoid validation on old invalid tax IDs)
    const updateData: UpdateClientDto = { ...clientData };
    if (updateData.tax_id === selectedClient.tax_id) {
      delete updateData.tax_id;
    }

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
    setHasUnsavedChanges(false);
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

  // Contact management functions
  const handleAddContact = async (contactData: CreateClientContactDto) => {
    if (!selectedClient) return;
    const response = await clientService.addContact(selectedClient.id, contactData);
    if (response.error) {
      toast({
        title: 'שגיאה',
        description: response.error.message,
        variant: 'destructive',
      });
      return;
    }
    // Reload contacts
    const contactsResponse = await clientService.getClientContacts(selectedClient.id);
    if (contactsResponse.data) {
      setClientContacts(contactsResponse.data);
    }
    toast({
      title: 'איש קשר נוסף',
      description: `${contactData.full_name} נוסף בהצלחה`,
    });
  };

  const handleUpdateContact = async (contactId: string, contactData: Partial<CreateClientContactDto>) => {
    if (!selectedClient) return;
    const response = await clientService.updateContact(contactId, contactData);
    if (response.error) {
      toast({
        title: 'שגיאה',
        description: response.error.message,
        variant: 'destructive',
      });
      return;
    }
    // Reload contacts
    const contactsResponse = await clientService.getClientContacts(selectedClient.id);
    if (contactsResponse.data) {
      setClientContacts(contactsResponse.data);
    }

    // If updating a primary contact, refresh the client data to update formData
    const updatedClientResponse = await clientService.getById(selectedClient.id);
    if (updatedClientResponse.data) {
      setFormData({
        ...formData,
        contact_name: updatedClientResponse.data.contact_name,
        contact_email: updatedClientResponse.data.contact_email || '',
        contact_phone: updatedClientResponse.data.contact_phone || '',
      });
    }

    toast({
      title: 'איש קשר עודכן',
      description: 'פרטי איש הקשר עודכנו בהצלחה',
    });
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!selectedClient) return;
    const response = await clientService.deleteContact(contactId);
    if (response.error) {
      toast({
        title: 'שגיאה',
        description: response.error.message,
        variant: 'destructive',
      });
      return;
    }
    // Reload contacts
    const contactsResponse = await clientService.getClientContacts(selectedClient.id);
    if (contactsResponse.data) {
      setClientContacts(contactsResponse.data);
    }
    toast({
      title: 'איש קשר נמחק',
      description: 'איש הקשר נמחק בהצלחה',
    });
  };

  const handleSetPrimaryContact = async (contactId: string) => {
    const response = await clientService.setPrimaryContact(contactId);
    if (response.error) {
      toast({
        title: 'שגיאה',
        description: response.error.message,
        variant: 'destructive',
      });
      return;
    }
    // Reload contacts
    if (selectedClient) {
      const contactsResponse = await clientService.getClientContacts(selectedClient.id);
      if (contactsResponse.data) {
        setClientContacts(contactsResponse.data);
      }

      // Refresh the client data to update formData with new primary contact
      const updatedClientResponse = await clientService.getById(selectedClient.id);
      if (updatedClientResponse.data) {
        setFormData({
          ...formData,
          contact_name: updatedClientResponse.data.contact_name,
          contact_email: updatedClientResponse.data.contact_email || '',
          contact_phone: updatedClientResponse.data.contact_phone || '',
        });
      }
    }
    toast({
      title: 'איש קשר ראשי הוגדר',
      description: 'איש הקשר הוגדר כראשי',
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
      client_type: 'company',
      company_status: 'active',
      company_subtype: undefined,
      pays_fees: false,
      receives_letters: true,
    });
    setClientContacts([]);
  };

  const openEditDialog = async (client: Client) => {
    setSelectedClient(client);
    setFormData({
      company_name: client.company_name,
      tax_id: client.tax_id,
      contact_name: client.contact_name,
      contact_email: client.contact_email || '',
      contact_phone: client.contact_phone || '',
      address: client.address || { street: '', city: '', postal_code: '' },
      status: client.status,
      internal_external: client.internal_external || 'internal',
      collection_responsibility: client.collection_responsibility || 'tiko',
      notes: client.notes || '',
      client_type: client.client_type || 'company',
      company_status: client.company_status || 'active',
      company_subtype: client.company_subtype || undefined,
      pays_fees: client.pays_fees || false,
      receives_letters: client.receives_letters !== false,
    });
    setHasUnsavedChanges(false);

    // Load client contacts
    const contactsResponse = await clientService.getClientContacts(client.id);
    if (contactsResponse.data) {
      setClientContacts(contactsResponse.data);
    }

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

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* First Row: Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="חיפוש לפי שם, ת.ז, או איש קשר..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* Second Row: Filters */}
        <div className="flex gap-3 items-center flex-wrap">
          {/* Company Status Filter */}
          <Select value={companyStatusFilter} onValueChange={setCompanyStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="סטטוס חברה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסטטוסים</SelectItem>
              <SelectItem value="active">פעילה</SelectItem>
              <SelectItem value="inactive">לא פעילה</SelectItem>
            </SelectContent>
          </Select>

          {/* Client Type Filter */}
          <Select value={clientTypeFilter} onValueChange={setClientTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="סוג לקוח" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסוגים</SelectItem>
              <SelectItem value="company">חברה</SelectItem>
              <SelectItem value="freelancer">עצמאי</SelectItem>
              <SelectItem value="salary_owner">שכיר בעל שליטה</SelectItem>
            </SelectContent>
          </Select>

          {/* Company Subtype Filter */}
          <Select value={companySubtypeFilter} onValueChange={setCompanySubtypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="תת סוג חברה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל תתי הסוגים</SelectItem>
              <SelectItem value="commercial_restaurant">מסחרי - מסעדות</SelectItem>
              <SelectItem value="commercial_other">מסחרי - אחר</SelectItem>
              <SelectItem value="realestate">נדל"ן</SelectItem>
              <SelectItem value="holdings">החזקות</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Filters Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCompanyStatusFilter('all');
              setClientTypeFilter('all');
              setCompanySubtypeFilter('all');
            }}
            className="text-gray-600"
          >
            <Filter className="ml-2 h-4 w-4" />
            איפוס סינונים
          </Button>
        </div>
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
              <TableHead className="min-w-[200px]">שם החברה</TableHead>
              <TableHead className="w-32">ת.ז / ח.פ</TableHead>
              <TableHead className="w-32">סוג לקוח</TableHead>
              <TableHead className="w-36">איש קשר</TableHead>
              <TableHead className="w-32">טלפון</TableHead>
              <TableHead className="w-48">אימייל</TableHead>
              <TableHead className="w-24">סטטוס</TableHead>
              <TableHead className="w-32">תאריך הוספה</TableHead>
              <TableHead className="w-32 text-left">פעולות</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center">
                  טוען נתונים...
                </TableCell>
              </TableRow>
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center">
                  לא נמצאו לקוחות
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="w-12">
                    <Checkbox
                      checked={selectedClients.includes(client.id)}
                      onCheckedChange={() => toggleClientSelection(client.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium min-w-[200px]">
                    <div>
                      <div>{client.company_name}</div>
                      {client.company_name_hebrew && (
                        <div className="text-sm text-gray-500">{client.company_name_hebrew}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="w-32">{client.tax_id}</TableCell>
                  <TableCell className="w-32">
                    {client.client_type === 'company' ? 'חברה' : 
                     client.client_type === 'freelancer' ? 'עצמאי' : 
                     client.client_type === 'salary_owner' ? 'בעל שליטה שכיר' : client.client_type}
                  </TableCell>
                  <TableCell className="w-36">{client.contact_name}</TableCell>
                  <TableCell className="w-32">{client.contact_phone || '-'}</TableCell>
                  <TableCell className="w-48">{client.contact_email || '-'}</TableCell>
                  <TableCell className="w-24">{getStatusBadge(client.status)}</TableCell>
                  <TableCell className="w-32">{formatDate(client.created_at)}</TableCell>
                  <TableCell className="w-32 text-left">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(client)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="h-3 w-3" />
                        ערוך
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>פעולות נוספות</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => openDeleteDialog(client)}
                          >
                            <Trash2 className="ml-2 h-4 w-4" />
                            מחק
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>הוספת לקוח חדש</DialogTitle>
            <DialogDescription>
              הזן את פרטי הלקוח החדש
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="company_name" className="text-right block">שם החברה *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                required
                dir="rtl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tax_id" className="text-right block">ת.ז / ח.פ (9 ספרות) *</Label>
                <Input
                  id="tax_id"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  maxLength={9}
                  pattern="\d{9}"
                  required
                  dir="ltr"
                />
              </div>
              <div>
                <Label htmlFor="contact_name" className="text-right block">שם איש קשר *</Label>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  required
                  dir="rtl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_phone" className="text-right block">טלפון</Label>
                <Input
                  id="contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  type="tel"
                  dir="ltr"
                />
              </div>
              <div>
                <Label htmlFor="contact_email" className="text-right block">אימייל</Label>
                <Input
                  id="contact_email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  type="email"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contact_address" className="text-right block">כתובת</Label>
                <Input
                  id="contact_address"
                  value={formData.contact_address}
                  onChange={(e) => setFormData({ ...formData, contact_address: e.target.value })}
                  dir="rtl"
                />
              </div>
              <div>
                <Label htmlFor="contact_city" className="text-right block">עיר</Label>
                <Input
                  id="contact_city"
                  value={formData.contact_city}
                  onChange={(e) => setFormData({ ...formData, contact_city: e.target.value })}
                  dir="rtl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="client_type" className="text-right block">סוג לקוח *</Label>
                <Select
                  value={formData.client_type}
                  onValueChange={(value: ClientType) => {
                    setFormData({
                      ...formData,
                      client_type: value,
                      company_subtype: value === 'company' ? formData.company_subtype : undefined
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">חברה</SelectItem>
                    <SelectItem value="freelancer">עצמאי</SelectItem>
                    <SelectItem value="salary_owner">שכיר בעל שליטה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.client_type === 'company' && (
                <div>
                  <Label htmlFor="company_status" className="text-right block">סטטוס חברה</Label>
                  <Select
                    value={formData.company_status}
                    onValueChange={(value: CompanyStatus) =>
                      setFormData({ ...formData, company_status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">פעילה</SelectItem>
                      <SelectItem value="inactive">רדומה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {formData.client_type === 'company' && formData.company_status === 'active' && (
              <div>
                <Label htmlFor="company_subtype" className="text-right block">תת סוג חברה</Label>
                <Select
                  value={formData.company_subtype || ''}
                  onValueChange={(value: CompanySubtype) =>
                    setFormData({ ...formData, company_subtype: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר תת סוג" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commercial_restaurant">מסחרית מסעדה</SelectItem>
                    <SelectItem value="commercial_other">מסחרית אחר</SelectItem>
                    <SelectItem value="realestate">נדל״ן</SelectItem>
                    <SelectItem value="holdings">החזקות</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="internal_external" className="text-right block">הנהלת חשבונות</Label>
                <Select
                  value={formData.internal_external}
                  onValueChange={(value: 'internal' | 'external') =>
                    setFormData({ ...formData, internal_external: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">פנימי</SelectItem>
                    <SelectItem value="external">חיצוני</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="collection_responsibility" className="text-right block">אחריות/אמא לתיק</Label>
                <Select
                  value={formData.collection_responsibility}
                  onValueChange={(value: 'tiko' | 'shani') =>
                    setFormData({ ...formData, collection_responsibility: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tiko">תיקו</SelectItem>
                    <SelectItem value="shani">שני</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="pays_fees"
                  checked={formData.pays_fees}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, pays_fees: checked as boolean })
                  }
                />
                <Label htmlFor="pays_fees" className="cursor-pointer">משלם ישירות</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="receives_letters"
                  checked={formData.receives_letters}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, receives_letters: checked as boolean })
                  }
                />
                <Label htmlFor="receives_letters" className="cursor-pointer">מקבל מכתבים</Label>
              </div>
            </div>
            <div>
              <Label htmlFor="status" className="text-right block">סטטוס</Label>
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
              <Label htmlFor="notes" className="text-right block">הערות</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                dir="rtl"
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
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        if (!open && hasUnsavedChanges) {
          setShowExitConfirm(true);
        } else {
          setIsEditDialogOpen(open);
          if (!open) {
            setSelectedClient(null);
            resetForm();
            setHasUnsavedChanges(false);
          }
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>עריכת פרטי לקוח</DialogTitle>
            <DialogDescription>
              עדכן את פרטי הלקוח
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 mt-2">
            <div>
              <Label htmlFor="edit_company_name" className="text-right block">שם החברה *</Label>
              <Input
                id="edit_company_name"
                value={formData.company_name}
                onChange={(e) => {
                  setFormData({ ...formData, company_name: e.target.value });
                  setHasUnsavedChanges(true);
                }}
                required
                dir="rtl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_tax_id" className="text-right block">ת.ז / ח.פ (9 ספרות) *</Label>
                <Input
                  id="edit_tax_id"
                  value={formData.tax_id}
                  onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  maxLength={9}
                  pattern="\d{9}"
                  required
                  dir="ltr"
                />
              </div>
              <div>
                <Label htmlFor="edit_contact_name" className="text-right block">שם איש קשר *</Label>
                <Input
                  id="edit_contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  required
                  dir="rtl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_contact_phone" className="text-right block">טלפון</Label>
                <Input
                  id="edit_contact_phone"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  type="tel"
                  dir="ltr"
                />
              </div>
              <div>
                <Label htmlFor="edit_contact_email" className="text-right block">אימייל</Label>
                <Input
                  id="edit_contact_email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  type="email"
                  dir="ltr"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_contact_address" className="text-right block">כתובת</Label>
                <Input
                  id="edit_contact_address"
                  value={formData.contact_address}
                  onChange={(e) => setFormData({ ...formData, contact_address: e.target.value })}
                  dir="rtl"
                />
              </div>
              <div>
                <Label htmlFor="edit_contact_city" className="text-right block">עיר</Label>
                <Input
                  id="edit_contact_city"
                  value={formData.contact_city}
                  onChange={(e) => setFormData({ ...formData, contact_city: e.target.value })}
                  dir="rtl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_client_type" className="text-right block">סוג לקוח *</Label>
                <Select
                  value={formData.client_type}
                  onValueChange={(value: ClientType) => {
                    setFormData({ 
                      ...formData, 
                      client_type: value,
                      company_subtype: value === 'company' ? formData.company_subtype : undefined
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">חברה</SelectItem>
                    <SelectItem value="freelancer">עצמאי</SelectItem>
                    <SelectItem value="salary_owner">שכיר בעל שליטה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.client_type === 'company' && (
                <div>
                  <Label htmlFor="edit_company_status" className="text-right block">סטטוס חברה</Label>
                  <Select
                    value={formData.company_status}
                    onValueChange={(value: CompanyStatus) =>
                      setFormData({ ...formData, company_status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">פעילה</SelectItem>
                      <SelectItem value="inactive">רדומה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {formData.client_type === 'company' && formData.company_status === 'active' && (
              <div>
                <Label htmlFor="edit_company_subtype" className="text-right block">תת סוג חברה</Label>
                <Select
                  value={formData.company_subtype || ''}
                  onValueChange={(value: CompanySubtype) =>
                    setFormData({ ...formData, company_subtype: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר תת סוג" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="commercial_restaurant">מסחרית מסעדה</SelectItem>
                    <SelectItem value="commercial_other">מסחרית אחר</SelectItem>
                    <SelectItem value="realestate">נדל״ן</SelectItem>
                    <SelectItem value="holdings">החזקות</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_internal_external" className="text-right block">הנהלת חשבונות</Label>
                <Select
                  value={formData.internal_external}
                  onValueChange={(value: 'internal' | 'external') =>
                    setFormData({ ...formData, internal_external: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">פנימי</SelectItem>
                    <SelectItem value="external">חיצוני</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit_collection_responsibility" className="text-right block">אחריות/אמא לתיק</Label>
                <Select
                  value={formData.collection_responsibility}
                  onValueChange={(value: 'tiko' | 'shani') =>
                    setFormData({ ...formData, collection_responsibility: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tiko">תיקו</SelectItem>
                    <SelectItem value="shani">שני</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit_pays_fees"
                  checked={formData.pays_fees}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, pays_fees: checked as boolean })
                  }
                />
                <Label htmlFor="edit_pays_fees" className="cursor-pointer">משלם ישירות</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit_receives_letters"
                  checked={formData.receives_letters}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, receives_letters: checked as boolean })
                  }
                />
                <Label htmlFor="edit_receives_letters" className="cursor-pointer">מקבל מכתבים</Label>
              </div>
            </div>
            <div>
              <Label htmlFor="edit_status" className="text-right block">סטטוס</Label>
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
              <Label htmlFor="edit_notes" className="text-right block">הערות</Label>
              <Textarea
                id="edit_notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                dir="rtl"
              />
            </div>

            {/* Contact Management Section */}
            {selectedClient && (
              <div className="border-t pt-4 mt-4">
                <ContactsManager
                  contacts={clientContacts}
                  onAdd={handleAddContact}
                  onUpdate={handleUpdateContact}
                  onDelete={handleDeleteContact}
                  onSetPrimary={handleSetPrimaryContact}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              if (hasUnsavedChanges) {
                setShowExitConfirm(true);
              } else {
                setIsEditDialogOpen(false);
                setSelectedClient(null);
                resetForm();
                setHasUnsavedChanges(false);
              }
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

      {/* Unsaved Changes Confirmation Dialog */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>יש שינויים שלא נשמרו</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך לצאת? כל השינויים שביצעת יאבדו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowExitConfirm(false)}>
              המשך עריכה
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setIsEditDialogOpen(false);
              setSelectedClient(null);
              resetForm();
              setHasUnsavedChanges(false);
              setShowExitConfirm(false);
            }}>
              צא ללא שמירה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}