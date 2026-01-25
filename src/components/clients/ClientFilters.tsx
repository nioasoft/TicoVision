import React, { useState, useEffect } from 'react';
import { Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ClientFilters as ClientFiltersType } from '@/hooks/useClients';
import { clientService, type ClientGroup } from '@/services';

interface ClientFiltersProps {
  searchQuery: string;
  filters: ClientFiltersType;
  onSearchChange: (query: string) => void;
  onFilterChange: (filters: Partial<ClientFiltersType>) => void;
  onReset: () => void;
}

export const ClientFilters = React.memo<ClientFiltersProps>(({
  searchQuery,
  filters,
  onSearchChange,
  onFilterChange,
  onReset,
}) => {
  const [groups, setGroups] = useState<ClientGroup[]>([]);

  // Load groups on mount
  useEffect(() => {
    const loadGroups = async () => {
      const response = await clientService.getGroups();
      if (response.data) {
        setGroups(response.data);
      }
    };
    loadGroups();
  }, []);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input

          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pr-10"
          dir="rtl"
        />
      </div>

      {/* Filter Selects */}
      <div className="flex gap-3 items-center flex-wrap">
        {/* Client Status Filter (active, inactive, pending, adhoc) */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => onFilterChange({ status: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הלקוחות</SelectItem>
            <SelectItem value="active">פעילים</SelectItem>
            <SelectItem value="adhoc">חריגים/חד-פעמיים</SelectItem>
            <SelectItem value="inactive">לא פעילים</SelectItem>
            <SelectItem value="pending">ממתינים</SelectItem>
          </SelectContent>
        </Select>

        {/* Company Status Filter */}
        <Select
          value={filters.companyStatus}
          onValueChange={(value) => onFilterChange({ companyStatus: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            <SelectItem value="active">פעילה</SelectItem>
            <SelectItem value="inactive">לא פעילה</SelectItem>
          </SelectContent>
        </Select>

        {/* Client Type Filter */}
        <Select
          value={filters.clientType}
          onValueChange={(value) => onFilterChange({ clientType: value })}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסוגים</SelectItem>
            <SelectItem value="company">חברה</SelectItem>
            <SelectItem value="freelancer">עצמאי</SelectItem>
            <SelectItem value="salary_owner">שכיר בעל שליטה</SelectItem>
          </SelectContent>
        </Select>

        {/* Company Subtype Filter */}
        <Select
          value={filters.companySubtype}
          onValueChange={(value) => onFilterChange({ companySubtype: value })}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל תתי הסוגים</SelectItem>
            <SelectItem value="commercial_restaurant">מסחרי - מסעדות</SelectItem>
            <SelectItem value="commercial_other">מסחרי - אחר</SelectItem>
            <SelectItem value="realestate">נדל"ן</SelectItem>
            <SelectItem value="holdings">החזקות</SelectItem>
          </SelectContent>
        </Select>

        {/* Group Filter */}
        <Select
          value={filters.groupId}
          onValueChange={(value) => onFilterChange({ groupId: value })}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הקבוצות</SelectItem>
            <SelectItem value="none">ללא קבוצה</SelectItem>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.group_name_hebrew || group.group_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Reset Filters Button */}
        <Button variant="outline" size="sm" onClick={onReset} className="text-gray-600">
          <Filter className="ml-2 h-4 w-4" />
          איפוס סינונים
        </Button>
      </div>
    </div>
  );
});

ClientFilters.displayName = 'ClientFilters';
