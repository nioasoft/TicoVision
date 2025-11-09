/**
 * Client Selector Component
 * Reusable component for selecting a client from the database
 * Used in both LetterBuilder and UniversalLetterBuilder
 */

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Loader2 } from 'lucide-react';
import { ClientService, type Client } from '@/services/client.service';

const clientService = new ClientService();

interface ClientSelectorProps {
  value: string | null;
  onChange: (client: Client | null) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function ClientSelector({
  value,
  onChange,
  label = 'בחר לקוח',
  placeholder = 'בחר לקוח מהרשימה...',
  className = ''
}: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load clients on mount
   */
  useEffect(() => {
    loadClients();
  }, []);

  /**
   * Load all active clients
   */
  const loadClients = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await clientService.getClients();

      if (fetchError) throw fetchError;

      if (data && data.clients) {
        // Filter only active clients and sort by Hebrew name or English name
        const activeClients = data.clients.filter(c => c.status === 'active');

        const sorted = activeClients.sort((a, b) => {
          const nameA = a.company_name_hebrew || a.company_name || '';
          const nameB = b.company_name_hebrew || b.company_name || '';
          return nameA.localeCompare(nameB, 'he');
        });

        setClients(sorted);
      }
    } catch (err) {
      console.error('Error loading clients:', err);
      setError('שגיאה בטעינת רשימת הלקוחות');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle client selection
   */
  const handleValueChange = (clientId: string) => {
    const selectedClient = clients.find(c => c.id === clientId);
    onChange(selectedClient || null);
  };

  /**
   * Get display name for a client (used in Combobox options)
   */
  const getClientDisplayName = (client: Client): string => {
    const name = client.company_name_hebrew || client.company_name;
    const taxId = client.tax_id ? ` - ${client.tax_id}` : '';
    return `${name}${taxId}`;
  };

  return (
    <div className={className}>
      {label && (
        <Label className="text-right block mb-2">
          {label} <span className="text-gray-500 text-sm">(אופציונלי)</span>
        </Label>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 p-3 border rounded-md bg-gray-50">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-gray-600">טוען לקוחות...</span>
        </div>
      ) : error ? (
        <div className="p-3 border border-red-200 rounded-md bg-red-50 text-red-600 text-sm text-right">
          {error}
        </div>
      ) : (
        <Combobox
          options={clients.map((client) => ({
            value: client.id,
            label: getClientDisplayName(client),
          }))}
          value={value || undefined}
          onValueChange={handleValueChange}
          placeholder={placeholder}
          searchPlaceholder="חיפוש לפי שם או ח.פ..."
          emptyText="לא נמצא לקוח"
        />
      )}
    </div>
  );
}
