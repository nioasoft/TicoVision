import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import type { Client } from '@/types/client.types';
import type { ForeignWorkerSharedData } from '@/types/foreign-workers.types';

interface SharedDataFormProps {
  value: Partial<ForeignWorkerSharedData>;
  onChange: (data: Partial<ForeignWorkerSharedData>) => void;
  selectedClientId: string | null;
  onClientSelect: (clientId: string | null) => void;
}

export function SharedDataForm({
  value,
  onChange,
  selectedClientId,
  onClientSelect
}: SharedDataFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    value.document_date ? new Date(value.document_date) : undefined
  );

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const valueRef = useRef(value);
  valueRef.current = value;

  // Load clients on mount
  useEffect(() => {
    loadClients();
  }, []);

  // Update form when client changes
  useEffect(() => {
    if (selectedClientId) {
      const client = clients.find((c) => c.id === selectedClientId);
      if (client) {
        onChangeRef.current({
          ...valueRef.current,
          company_name: client.company_name,
          tax_id: client.tax_id
        });
      }
    }
  }, [selectedClientId, clients]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      const tenantId = user.user?.user_metadata?.tenant_id;

      if (!tenantId) {
        console.error('No tenant ID found');
        return;
      }

      const { data, error } = await supabase
        .from('clients')
        .select('id, company_name, tax_id, contact_name')
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .order('company_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      // Format as YYYY-MM-DD
      const formatted = format(date, 'yyyy-MM-dd');
      onChange({
        ...value,
        document_date: formatted
      });
    }
  };

  const handleAccountantNameChange = (accountantName: string) => {
    onChange({
      ...value,
      accountant_name: accountantName
    });
  };

  return (
    <Card className="w-full" dir="rtl">
      <CardHeader>
        <CardTitle className="text-right">נתונים משותפים</CardTitle>
        <CardDescription className="text-right">
          נתונים אלו ישמשו עבור כל המסמכים
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Client Selector */}
        <div className="space-y-2">
          <Label htmlFor="client-select" className="text-right block">
            בחר לקוח <span className="text-red-500">*</span>
          </Label>
          <select
            id="client-select"
            value={selectedClientId || ''}
            onChange={(e) => onClientSelect(e.target.value || null)}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-right rtl:text-right ltr:text-left focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">-- בחר לקוח --</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.company_name} ({client.tax_id})
              </option>
            ))}
          </select>
        </div>

        {/* Display selected client details */}
        {selectedClientId && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-md">
            <div className="space-y-1">
              <Label className="text-sm text-gray-600 text-right block">שם החברה</Label>
              <p className="font-medium text-right">{value.company_name}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-sm text-gray-600 text-right block">ח.פ</Label>
              <p className="font-medium text-right">{value.tax_id}</p>
            </div>
          </div>
        )}

        {/* Document Date */}
        <div className="space-y-2">
          <Label htmlFor="document-date" className="text-right block">
            תאריך המסמך <span className="text-red-500">*</span>
          </Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="document-date"
                variant="outline"
                className={cn(
                  'w-full justify-start text-right font-normal rtl:flex-row-reverse',
                  !selectedDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="ml-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, 'PPP', { locale: he })
                ) : (
                  <span>בחר תאריך</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                initialFocus
                locale={he}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Accountant Name */}
        <div className="space-y-2">
          <Label htmlFor="accountant-name" className="text-right block">
            שם רואה החשבון <span className="text-red-500">*</span>
          </Label>
          <Input
            id="accountant-name"
            type="text"
            value={value.accountant_name || ''}
            onChange={(e) => handleAccountantNameChange(e.target.value)}
            placeholder="לדוגמה: אברהם כהן"
            className="text-right rtl:text-right ltr:text-left"
            dir="rtl"
          />
          <p className="text-sm text-gray-500 text-right">
            השם יופיע בחתימה בתחתית המסמך
          </p>
        </div>

        {/* Validation Message */}
        {(!selectedClientId || !value.document_date || !value.accountant_name) && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800 text-right">
              יש למלא את כל השדות המסומנים ב-<span className="text-red-500">*</span> לפני מעבר לטאבים
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
