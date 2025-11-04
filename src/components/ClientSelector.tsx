/**
 * Client Selector Component
 * Reusable component for selecting a client from the database
 * Used in both LetterBuilder and UniversalLetterBuilder
 */

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Search } from 'lucide-react';
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
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  /**
   * Load clients on mount
   */
  useEffect(() => {
    loadClients();
  }, []);

  /**
   * Filter clients when search query changes
   */
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredClients(clients);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = clients.filter(client => {
      const name = (client.company_name_hebrew || client.company_name || '').toLowerCase();
      const commercial = (client.commercial_name || '').toLowerCase();
      const taxId = (client.tax_id || '').toLowerCase();

      return name.includes(query) ||
             commercial.includes(query) ||
             taxId.includes(query);
    });

    setFilteredClients(filtered);
  }, [searchQuery, clients]);

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
        setFilteredClients(sorted);
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
    if (clientId === 'none') {
      onChange(null);
      return;
    }

    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient) {
      onChange(selectedClient);
    }
  };

  /**
   * Get display name for a client
   */
  const getClientDisplayName = (client: Client): string => {
    const name = client.company_name_hebrew || client.company_name;
    const commercial = client.commercial_name ? ` (${client.commercial_name})` : '';
    return `${name}${commercial}`;
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
        <Select value={value || 'none'} onValueChange={handleValueChange}>
          <SelectTrigger dir="rtl" className="w-full [&>span]:text-right">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {/* Search input */}
            <div className="p-2 border-b sticky top-0 bg-white z-10">
              <div className="relative">
                <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="חפש לקוח..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-8"
                  dir="rtl"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            {/* Clear selection option */}
            <SelectItem value="none" className="text-right">
              <span className="text-gray-500 italic">ללא בחירה (הקלד ידנית)</span>
            </SelectItem>

            {/* Client list */}
            {filteredClients.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                לא נמצאו לקוחות
              </div>
            ) : (
              filteredClients.map((client) => (
                <SelectItem key={client.id} value={client.id} className="text-right">
                  <div className="flex flex-col items-end">
                    <span className="font-medium">{getClientDisplayName(client)}</span>
                    {client.tax_id && (
                      <span className="text-xs text-gray-500">ח.פ: {client.tax_id}</span>
                    )}
                  </div>
                </SelectItem>
              ))
            )}

            {/* Show count */}
            {searchQuery && filteredClients.length > 0 && (
              <div className="p-2 text-xs text-gray-500 text-center border-t">
                נמצאו {filteredClients.length} תוצאות
              </div>
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
