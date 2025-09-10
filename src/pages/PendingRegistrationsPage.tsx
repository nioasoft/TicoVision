import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { 
  UserPlus, 
  UserX, 
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Building,
  Phone,
  Mail,
  Hash,
  MessageSquare,
  Search
} from 'lucide-react';
import { registrationService } from '@/services/registration.service';
import { clientService } from '@/services/client.service';
import type { PendingRegistration } from '@/services/registration.service';
import type { Client } from '@/services/client.service';
import { userService } from '@/services/user.service';

export function PendingRegistrationsPage() {
  const [registrations, setRegistrations] = useState<PendingRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'all'>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Dialog states
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<PendingRegistration | null>(null);
  
  // Approval form state
  const [tempPassword, setTempPassword] = useState('');
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  
  // Rejection form state
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    loadRegistrations();
    loadClients();
  }, [statusFilter]);

  const loadRegistrations = async () => {
    setLoading(true);
    const response = statusFilter === 'pending' 
      ? await registrationService.getPendingRegistrations()
      : await registrationService.getAllRegistrations();
      
    if (response.error) {
      toast.error('שגיאה בטעינת בקשות ההרשמה');
    } else if (response.data) {
      setRegistrations(response.data);
    }
    setLoading(false);
  };

  const loadClients = async () => {
    const response = await clientService.getClients();
    if (response.data) {
      setAvailableClients(response.data.clients);
    }
  };

  const handleApprove = async () => {
    if (!selectedRegistration || !tempPassword) {
      toast.error('אנא הזן סיסמה זמנית למשתמש');
      return;
    }

    const response = await registrationService.approveRegistration(
      selectedRegistration.id,
      tempPassword,
      selectedClients
    );

    if (response.error) {
      toast.error('שגיאה באישור הבקשה');
      console.error(response.error);
    } else {
      toast.success('הבקשה אושרה בהצלחה! המשתמש יכול כעת להתחבר למערכת');
      setShowApproveDialog(false);
      setSelectedRegistration(null);
      setTempPassword('');
      setSelectedClients([]);
      loadRegistrations();
    }
  };

  const handleReject = async () => {
    if (!selectedRegistration || !rejectionReason) {
      toast.error('אנא הזן סיבת דחייה');
      return;
    }

    const response = await registrationService.rejectRegistration(
      selectedRegistration.id,
      rejectionReason
    );

    if (response.error) {
      toast.error('שגיאה בדחיית הבקשה');
    } else {
      toast.success('הבקשה נדחתה');
      setShowRejectDialog(false);
      setSelectedRegistration(null);
      setRejectionReason('');
      loadRegistrations();
    }
  };

  const openApproveDialog = (registration: PendingRegistration) => {
    setSelectedRegistration(registration);
    setTempPassword('');
    setSelectedClients([]);
    
    // Auto-select client if tax ID matches
    if (registration.requested_role === 'client' && registration.tax_id) {
      const matchingClient = availableClients.find(c => c.tax_id === registration.tax_id);
      if (matchingClient) {
        setSelectedClients([matchingClient.id]);
      }
    }
    
    setShowApproveDialog(true);
  };

  const openRejectDialog = (registration: PendingRegistration) => {
    setSelectedRegistration(registration);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  const openDetailsDialog = (registration: PendingRegistration) => {
    setSelectedRegistration(registration);
    setShowDetailsDialog(true);
  };

  const toggleClientSelection = (clientId: string) => {
    setSelectedClients(prev => 
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap: Record<string, string> = {
      'client': 'לקוח',
      'accountant': 'רואה חשבון',
      'bookkeeper': 'מנהלת חשבונות',
      'admin': 'מנהל מערכת'
    };
    return roleMap[role] || role;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="h-3 w-3 ml-1" />ממתין</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600"><CheckCircle className="h-3 w-3 ml-1" />אושר</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600"><XCircle className="h-3 w-3 ml-1" />נדחה</Badge>;
      default:
        return null;
    }
  };

  // Filter registrations
  const filteredRegistrations = registrations.filter(reg => {
    const matchesSearch = 
      reg.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (reg.company_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (reg.tax_id?.includes(searchTerm));
    return matchesSearch;
  });

  // Filter clients for dialog
  const filteredClients = availableClients.filter(client =>
    client.company_name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    client.company_name_hebrew?.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    client.tax_id.includes(clientSearchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">בקשות הרשמה</h1>
          <p className="text-gray-500 mt-1">ניהול ואישור בקשות הרשמה למערכת</p>
        </div>
        <Badge variant="outline" className="text-lg px-3 py-1">
          {filteredRegistrations.filter(r => r.status === 'pending').length} ממתינות
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="חיפוש לפי שם, אימייל, חברה או מספר ח.פ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as 'pending' | 'all')}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">ממתינות בלבד</SelectItem>
                <SelectItem value="all">כל הבקשות</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Registrations Table */}
      <Card>
        <CardHeader>
          <CardTitle>רשימת בקשות ({filteredRegistrations.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-gray-500">טוען...</p>
          ) : filteredRegistrations.length === 0 ? (
            <p className="text-center py-8 text-gray-500">אין בקשות הרשמה</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם מלא</TableHead>
                  <TableHead>אימייל</TableHead>
                  <TableHead>תפקיד מבוקש</TableHead>
                  <TableHead>חברה/משרד</TableHead>
                  <TableHead>תאריך הגשה</TableHead>
                  <TableHead>סטטוס</TableHead>
                  <TableHead>פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell className="font-medium">{reg.full_name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {reg.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getRoleDisplayName(reg.requested_role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {reg.company_name && (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          {reg.company_name}
                        </div>
                      )}
                      {reg.tax_id && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Hash className="h-3 w-3" />
                          {reg.tax_id}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(reg.created_at).toLocaleDateString('he-IL')}
                    </TableCell>
                    <TableCell>{getStatusBadge(reg.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDetailsDialog(reg)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {reg.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-600"
                              onClick={() => openApproveDialog(reg)}
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              onClick={() => openRejectDialog(reg)}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>אישור בקשת הרשמה</DialogTitle>
            <DialogDescription>
              אישור הבקשה של {selectedRegistration?.full_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="temp-password">סיסמה זמנית למשתמש *</Label>
              <Input
                id="temp-password"
                type="text"
                placeholder="הזן סיסמה זמנית..."
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
              />
              <p className="text-sm text-gray-500">
                המשתמש יקבל סיסמה זו במייל ויתבקש לשנות אותה בכניסה הראשונה
              </p>
            </div>

            {selectedRegistration?.requested_role !== 'admin' && (
              <div className="grid gap-2">
                <Label>שיוך ללקוחות</Label>
                <div className="relative mb-2">
                  <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="חיפוש לקוחות..."
                    value={clientSearchTerm}
                    onChange={(e) => setClientSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
                <div className="border rounded-md max-h-60 overflow-y-auto p-2 space-y-2">
                  {filteredClients.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-2">אין לקוחות זמינים</p>
                  ) : (
                    filteredClients.map((client) => (
                      <div key={client.id} className="flex items-center space-x-2 space-x-reverse hover:bg-gray-50 p-2 rounded">
                        <Checkbox
                          id={`client-${client.id}`}
                          checked={selectedClients.includes(client.id)}
                          onCheckedChange={() => toggleClientSelection(client.id)}
                        />
                        <Label
                          htmlFor={`client-${client.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div>
                            <span className="font-medium">{client.company_name}</span>
                            {client.company_name_hebrew && (
                              <span className="text-gray-500 mr-2">({client.company_name_hebrew})</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            ח.פ: {client.tax_id}
                          </div>
                        </Label>
                      </div>
                    ))
                  )}
                </div>
                {selectedRegistration?.requested_role === 'client' && selectedRegistration?.tax_id && (
                  <p className="text-sm text-blue-600">
                    {selectedClients.length > 0 
                      ? `נמצאה התאמה אוטומטית לפי מספר ח.פ ${selectedRegistration.tax_id}`
                      : `לא נמצאה התאמה למספר ח.פ ${selectedRegistration.tax_id}`}
                  </p>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleApprove} disabled={!tempPassword}>
              אשר בקשה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>דחיית בקשת הרשמה</DialogTitle>
            <DialogDescription>
              דחיית הבקשה של {selectedRegistration?.full_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="rejection-reason">סיבת הדחייה *</Label>
              <Textarea
                id="rejection-reason"
                placeholder="הזן את הסיבה לדחיית הבקשה..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              ביטול
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason}>
              דחה בקשה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>פרטי בקשת הרשמה</DialogTitle>
          </DialogHeader>
          
          {selectedRegistration && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">שם מלא</Label>
                  <p className="font-medium">{selectedRegistration.full_name}</p>
                </div>
                <div>
                  <Label className="text-gray-500">אימייל</Label>
                  <p className="font-medium">{selectedRegistration.email}</p>
                </div>
                <div>
                  <Label className="text-gray-500">טלפון</Label>
                  <p className="font-medium">{selectedRegistration.phone || '-'}</p>
                </div>
                <div>
                  <Label className="text-gray-500">תפקיד מבוקש</Label>
                  <p className="font-medium">{getRoleDisplayName(selectedRegistration.requested_role)}</p>
                </div>
                {selectedRegistration.company_name && (
                  <div>
                    <Label className="text-gray-500">חברה/משרד</Label>
                    <p className="font-medium">{selectedRegistration.company_name}</p>
                  </div>
                )}
                {selectedRegistration.tax_id && (
                  <div>
                    <Label className="text-gray-500">מספר ח.פ</Label>
                    <p className="font-medium">{selectedRegistration.tax_id}</p>
                  </div>
                )}
              </div>
              
              {selectedRegistration.message && (
                <div>
                  <Label className="text-gray-500">הודעה</Label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-md">
                    {selectedRegistration.message}
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">תאריך הגשה</Label>
                  <p className="font-medium">
                    {new Date(selectedRegistration.created_at).toLocaleString('he-IL')}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">סטטוס</Label>
                  <div className="mt-1">{getStatusBadge(selectedRegistration.status)}</div>
                </div>
              </div>
              
              {selectedRegistration.rejection_reason && (
                <div>
                  <Label className="text-gray-500">סיבת דחייה</Label>
                  <p className="mt-1 p-3 bg-red-50 rounded-md text-red-700">
                    {selectedRegistration.rejection_reason}
                  </p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}