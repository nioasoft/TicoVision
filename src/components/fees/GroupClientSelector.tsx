/**
 * Group/Client Selector Component
 *
 * Toggle between individual client and group selection for fee calculations.
 * When group is selected, all member companies will be included in a combined fee letter.
 */

import { useState, useEffect, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Building2, AlertCircle } from 'lucide-react';
import { ClientService, type Client } from '@/services/client.service';
import { groupFeeService, type ClientGroup } from '@/services/group-fee.service';
import { cn } from '@/lib/utils';
import { useLastClient } from '@/hooks/useLastClient';
import { useLastGroup } from '@/hooks/useLastGroup';

const clientService = new ClientService();

export type SelectionMode = 'client' | 'group';

interface GroupClientSelectorProps {
  year: number;
  mode: SelectionMode;
  onModeChange: (mode: SelectionMode) => void;
  selectedClientId: string | null;
  selectedGroupId: string | null;
  onClientSelect: (client: Client | null) => void;
  onGroupSelect: (group: ClientGroup | null) => void;
  className?: string;
  disabled?: boolean;
}

export function GroupClientSelector({
  year,
  mode,
  onModeChange,
  selectedClientId,
  selectedGroupId,
  onClientSelect,
  onGroupSelect,
  className = '',
  disabled = false
}: GroupClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { getLastClientId, setLastClientId } = useLastClient();
  const { getLastGroupId, setLastGroupId } = useLastGroup();

  // Load clients when component mounts
  useEffect(() => {
    loadClients();
  }, []);

  // Load groups when mode changes to 'group' or year changes
  useEffect(() => {
    if (mode === 'group') {
      loadGroups();
    }
  }, [mode, year]);

  /**
   * Load all active clients
   */
  const loadClients = async () => {
    setIsLoadingClients(true);
    setError(null);

    try {
      const { data, error: fetchError } = await clientService.getClients();

      if (fetchError) throw fetchError;

      if (data && data.clients) {
        // Filter only active clients and sort by Hebrew name
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
      setIsLoadingClients(false);
    }
  };

  /**
   * Load all groups with member counts
   */
  const loadGroups = async () => {
    setIsLoadingGroups(true);
    setError(null);

    try {
      const { data, error: fetchError } = await groupFeeService.getAvailableGroups(year);

      if (fetchError) throw fetchError;

      if (data) {
        // Sort by Hebrew name
        const sorted = data.sort((a, b) => {
          return (a.group_name_hebrew || '').localeCompare(b.group_name_hebrew || '', 'he');
        });

        setGroups(sorted);
      }
    } catch (err) {
      console.error('Error loading groups:', err);
      setError('שגיאה בטעינת רשימת הקבוצות');
    } finally {
      setIsLoadingGroups(false);
    }
  };

  /**
   * Handle mode change (client/group toggle)
   */
  const handleModeChange = (newMode: string) => {
    const modeValue = newMode as SelectionMode;
    onModeChange(modeValue);

    // Clear selection when switching modes
    if (modeValue === 'client') {
      onGroupSelect(null);
    } else {
      onClientSelect(null);
    }
  };

  /**
   * Handle client selection
   */
  const handleClientSelect = (clientId: string) => {
    const selectedClient = clients.find(c => c.id === clientId);
    if (selectedClient) {
      setLastClientId(clientId); // Save as last used client
    }
    onClientSelect(selectedClient || null);
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
   * Sort groups - last selected group first, then alphabetically
   */
  const sortedGroups = useMemo(() => {
    const lastId = getLastGroupId();
    if (!lastId || groups.length === 0) return groups;

    return [...groups].sort((a, b) => {
      // Last group always first
      if (a.id === lastId) return -1;
      if (b.id === lastId) return 1;
      // Alphabetical for the rest
      return (a.group_name_hebrew || '').localeCompare(b.group_name_hebrew || '', 'he');
    });
  }, [groups, getLastGroupId]);

  /**
   * Handle group selection
   */
  const handleGroupSelect = (groupId: string) => {
    const selectedGroup = groups.find(g => g.id === groupId);
    if (selectedGroup) {
      setLastGroupId(groupId); // Save as last used group
    }
    onGroupSelect(selectedGroup || null);
  };

  /**
   * Get display name for a client
   */
  const getClientDisplayName = (client: Client): string => {
    const name = client.company_name_hebrew || client.company_name;
    const taxId = client.tax_id ? ` - ${client.tax_id}` : '';
    return `${name}${taxId}`;
  };

  /**
   * Get display name for a group
   */
  const getGroupDisplayName = (group: ClientGroup): string => {
    const memberCount = group.member_count || group.clients?.length || 0;
    return `${group.group_name_hebrew} (${memberCount} חברות)`;
  };

  const isLoading = mode === 'client' ? isLoadingClients : isLoadingGroups;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Mode Toggle */}
      <div className="flex flex-col gap-2">
        <Label className="text-right">בחירת לקוח/קבוצה</Label>
        <Tabs
          value={mode}
          onValueChange={handleModeChange}
          className="w-full"
          dir="rtl"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger
              value="client"
              className="flex items-center gap-2"
              disabled={disabled}
            >
              <Building2 className="h-4 w-4" />
              לקוח בודד
            </TabsTrigger>
            <TabsTrigger
              value="group"
              className="flex items-center gap-2"
              disabled={disabled}
            >
              <Users className="h-4 w-4" />
              קבוצה
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Selection Area */}
      <div>
        {error && (
          <div className="flex items-center gap-2 p-3 border border-red-200 rounded-md bg-red-50 text-red-600 text-sm text-right mb-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 p-3 border rounded-md bg-gray-50">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-gray-600">
              {mode === 'client' ? 'טוען לקוחות...' : 'טוען קבוצות...'}
            </span>
          </div>
        ) : mode === 'client' ? (
          /* Client Selector */
          <Combobox
            options={sortedClients.map((client) => ({
              value: client.id,
              label: getClientDisplayName(client),
            }))}
            value={selectedClientId || undefined}
            onValueChange={handleClientSelect}
            placeholder="בחר לקוח מהרשימה..."
            searchPlaceholder="חיפוש לפי שם או ח.פ..."
            emptyText="לא נמצא לקוח"
            disabled={disabled}
          />
        ) : (
          /* Group Selector */
          <div className="space-y-2">
            <Combobox
              options={sortedGroups.map((group) => ({
                value: group.id,
                label: getGroupDisplayName(group),
              }))}
              value={selectedGroupId || undefined}
              onValueChange={handleGroupSelect}
              placeholder="בחר קבוצה מהרשימה..."
              searchPlaceholder="חיפוש קבוצה..."
              emptyText="לא נמצאה קבוצה"
              disabled={disabled}
            />

            {groups.length === 0 && !isLoadingGroups && (
              <p className="text-sm text-gray-500 text-right">
                אין קבוצות לקוחות במערכת.{' '}
                <a href="/client-groups" className="text-blue-600 hover:underline">
                  צור קבוצה חדשה
                </a>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Mode Description */}
      <div className="text-sm text-gray-500 text-right">
        {mode === 'client' ? (
          <p>מכתב שכר טרחה יישלח ללקוח הנבחר בלבד</p>
        ) : (
          <p>מכתב שכר טרחה משולב יישלח לכל חברות הקבוצה</p>
        )}
      </div>
    </div>
  );
}
