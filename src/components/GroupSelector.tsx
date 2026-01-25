/**
 * Group Selector Component
 * Reusable component for selecting a client group
 */

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Loader2 } from 'lucide-react';
import { clientService, type ClientGroup } from '@/services/client.service';

interface GroupSelectorProps {
  value: string | null;
  onChange: (group: ClientGroup | null) => void;
  label?: string;
  className?: string;
}

export function GroupSelector({
  value,
  onChange,
  label = 'בחר קבוצה',
  className = ''
}: GroupSelectorProps) {
  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await clientService.getGroups();

      if (fetchError) throw fetchError;

      if (data) {
        setGroups(data);
      }
    } catch (err) {
      console.error('Error loading groups:', err);
      setError('שגיאה בטעינת רשימת הקבוצות');
    } finally {
      setIsLoading(false);
    }
  };

  const handleValueChange = (groupId: string) => {
    const selectedGroup = groups.find(g => g.id === groupId);
    onChange(selectedGroup || null);
  };

  return (
    <div className={className}>
      {label && (
        <Label className="text-right block mb-2">
          {label}
        </Label>
      )}

      {isLoading ? (
        <div className="flex items-center gap-2 p-3 border rounded-md bg-gray-50">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-gray-600">טוען קבוצות...</span>
        </div>
      ) : error ? (
        <div className="p-3 border border-red-200 rounded-md bg-red-50 text-red-600 text-sm text-right">
          {error}
        </div>
      ) : (
        <Combobox
          options={groups.map((group) => ({
            value: group.id,
            label: group.group_name_hebrew,
          }))}
          value={value || undefined}
          onValueChange={handleValueChange}


          emptyText="לא נמצאה קבוצה"
        />
      )}
    </div>
  );
}
