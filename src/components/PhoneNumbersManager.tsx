import { useState } from 'react';
import { Plus, Edit2, Trash2, Star, Phone, Smartphone, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { ClientPhone, PhoneType, CreateClientPhoneDto } from '@/services';

interface PhoneNumbersManagerProps {
  phones: ClientPhone[];
  onAdd: (phone: CreateClientPhoneDto) => Promise<void>;
  onUpdate: (phoneId: string, phone: Partial<CreateClientPhoneDto>) => Promise<void>;
  onDelete: (phoneId: string) => Promise<void>;
  onSetPrimary: (phoneId: string) => Promise<void>;
}

const phoneTypeLabels: Record<PhoneType, string> = {
  office: 'משרד',
  mobile: 'נייד',
  fax: 'פקס',
};

const phoneTypeIcons: Record<PhoneType, typeof Phone> = {
  office: Phone,
  mobile: Smartphone,
  fax: Printer,
};

export function PhoneNumbersManager({
  phones,
  onAdd,
  onUpdate,
  onDelete,
  onSetPrimary,
}: PhoneNumbersManagerProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState<ClientPhone | null>(null);
  const [formData, setFormData] = useState<CreateClientPhoneDto>({
    phone_type: 'office',
    phone_number: '',
    is_primary: false,
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      phone_type: 'office',
      phone_number: '',
      is_primary: false,
      notes: '',
    });
  };

  const handleAdd = async () => {
    await onAdd(formData);
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleEdit = async () => {
    if (!selectedPhone) return;
    await onUpdate(selectedPhone.id, formData);
    setIsEditDialogOpen(false);
    setSelectedPhone(null);
    resetForm();
  };

  const openEditDialog = (phone: ClientPhone) => {
    setSelectedPhone(phone);
    setFormData({
      phone_type: phone.phone_type,
      phone_number: phone.phone_number,
      is_primary: phone.is_primary,
      notes: phone.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (phoneId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את מספר הטלפון?')) {
      await onDelete(phoneId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">מספרי טלפון</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4 ml-2" />
          הוסף טלפון
        </Button>
      </div>

      {phones.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            אין מספרי טלפון. לחץ על &quot;הוסף טלפון&quot; כדי להוסיף.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {phones.map((phone) => {
            const PhoneIcon = phoneTypeIcons[phone.phone_type];
            return (
              <Card key={phone.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <PhoneIcon className="h-4 w-4 text-gray-500" />
                        <a
                          href={`tel:${phone.phone_number}`}
                          className="font-semibold text-blue-600 hover:underline"
                          dir="ltr"
                        >
                          {phone.phone_number}
                        </a>
                        {phone.is_primary && (
                          <Badge variant="default" className="bg-yellow-500">
                            <Star className="h-3 w-3 ml-1" />
                            ראשי
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {phoneTypeLabels[phone.phone_type]}
                        </Badge>
                      </div>

                      {phone.notes && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">הערות:</span> {phone.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {!phone.is_primary && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onSetPrimary(phone.id)}
                          title="הגדר כטלפון ראשי"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(phone)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(phone.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Phone Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>הוספת מספר טלפון</DialogTitle>
            <DialogDescription>הזן את פרטי מספר הטלפון החדש</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="add_phone_type" className="text-right block">
                סוג טלפון *
              </Label>
              <Select
                value={formData.phone_type}
                onValueChange={(value: PhoneType) =>
                  setFormData({ ...formData, phone_type: value })
                }
              >
                <SelectTrigger id="add_phone_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(phoneTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="add_phone_number" className="text-right block">
                מספר טלפון *
              </Label>
              <Input
                id="add_phone_number"
                type="tel"
                value={formData.phone_number}
                onChange={(e) =>
                  setFormData({ ...formData, phone_number: e.target.value })
                }
                placeholder="050-1234567"
                required
                dir="ltr"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="add_is_primary"
                checked={formData.is_primary}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_primary: checked as boolean })
                }
              />
              <Label htmlFor="add_is_primary" className="cursor-pointer">
                טלפון ראשי
              </Label>
            </div>

            <div>
              <Label htmlFor="add_notes" className="text-right block">
                הערות
              </Label>
              <Textarea
                id="add_notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                dir="rtl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                resetForm();
              }}
            >
              ביטול
            </Button>
            <Button type="button" onClick={handleAdd}>
              הוסף
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Phone Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>עריכת מספר טלפון</DialogTitle>
            <DialogDescription>עדכן את פרטי מספר הטלפון</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="edit_phone_type" className="text-right block">
                סוג טלפון *
              </Label>
              <Select
                value={formData.phone_type}
                onValueChange={(value: PhoneType) =>
                  setFormData({ ...formData, phone_type: value })
                }
              >
                <SelectTrigger id="edit_phone_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(phoneTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit_phone_number" className="text-right block">
                מספר טלפון *
              </Label>
              <Input
                id="edit_phone_number"
                type="tel"
                value={formData.phone_number}
                onChange={(e) =>
                  setFormData({ ...formData, phone_number: e.target.value })
                }
                required
                dir="ltr"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="edit_is_primary"
                checked={formData.is_primary}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_primary: checked as boolean })
                }
              />
              <Label htmlFor="edit_is_primary" className="cursor-pointer">
                טלפון ראשי
              </Label>
            </div>

            <div>
              <Label htmlFor="edit_notes" className="text-right block">
                הערות
              </Label>
              <Textarea
                id="edit_notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                dir="rtl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedPhone(null);
                resetForm();
              }}
            >
              ביטול
            </Button>
            <Button type="button" onClick={handleEdit}>
              עדכן
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
