/**
 * Client Selector Component
 * Reusable component for selecting a client from the database
 * Used in both LetterBuilder and UniversalLetterBuilder
 *
 * filterByAssignment: When true, bookkeepers see only their assigned clients
 */

import { useState, useEffect, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Loader2 } from 'lucide-react';
import { ClientService, type Client } from '@/services/client.service';
import { userClientAssignmentService } from '@/services/user-client-assignment.service';
import { useAuth } from '@/contexts/AuthContext';
import { useLastClient } from '@/hooks/useLastClient';

const clientService = new ClientService();

interface ClientSelectorProps {
  value: string | null;
  onChange: (client: Client | null) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  /** When true, non-admin users see only their assigned clients */
  filterByAssignment?: boolean;
}

export function ClientSelector({
  value,
  onChange,
  label = 'בחר לקוח',
  placeholder = 'בחר לקוח מהרשימה...',
  className = '',
  filterByAssignment = false
}: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { role } = useAuth();
  const { getLastClientId, setLastClientId } = useLastClient();

  /**
   * Load clients on mount
   */
  useEffect(() => {
    loadClients();
  }, [filterByAssignment, role]);

  /**
   * Load clients - all for admin, assigned only for bookkeeper when filterByAssignment is true
   */
  const loadClients = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // If filterByAssignment is enabled and user is not admin, get only accessible clients
      if (filterByAssignment && role !== 'admin') {
        const { data: accessibleClients, error: accessError } =
          await userClientAssignmentService.getAccessibleClients();

        if (accessError) throw accessError;

        if (accessibleClients) {
          // Need to fetch full client data for each accessible client
          const { data: allClientsData, error: fetchError } = await clientService.getClients();
          if (fetchError) throw fetchError;

          if (allClientsData && allClientsData.clients) {
            // Filter only accessible clients that are active
            const accessibleIds = new Set(accessibleClients.map(c => c.id));
            const filteredClients = allClientsData.clients.filter(
              c => accessibleIds.has(c.id) && c.status === 'active'
            );

            const sorted = filteredClients.sort((a, b) => {
              const nameA = a.company_name_hebrew || a.company_name || '';
              const nameB = b.company_name_hebrew || b.company_name || '';
              return nameA.localeCompare(nameB, 'he');
            });

            setClients(sorted);
          }
        }
      } else {
        // Admin or filterByAssignment is false - get all clients
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
    if (selectedClient) {
      setLastClientId(clientId); // Save as last used client
    }
    onChange(selectedClient || null);
  };

  /**
   * Sort clients - last selected client first, then alphabetically
   */
  const sortedClients = useMemo(() => {
    const lastId = getLastClientId();
    if (!lastId || clients.length === 0) return clients;

    return [...clients].sort((a, b) => {
      // Last client always first
      if (a.id === lastId) return -1;
      if (b.id === lastId) return 1;
      // Alphabetical for the rest
      const nameA = a.company_name_hebrew || a.company_name || '';
      const nameB = b.company_name_hebrew || b.company_name || '';
      return nameA.localeCompare(nameB, 'he');
    });
  }, [clients, getLastClientId]);

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
        <Label className="text-right block mb-2 text-base">
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
          options={sortedClients.map((client) => ({
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
