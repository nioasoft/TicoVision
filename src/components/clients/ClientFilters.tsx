import React, { useState, useEffect } from 'react';
import { Search, MoreVertical } from 'lucide-react';
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

  // Check if any filter is active
  const hasActiveFilters =
    searchQuery ||
    (filters.status && filters.status !== 'all') ||
    (filters.companyStatus && filters.companyStatus !== 'all') ||
    (filters.clientType && filters.clientType !== 'all') ||
    (filters.companySubtype && filters.companySubtype !== 'all') ||
    (filters.groupId && filters.groupId !== 'all');

  // Base styles for filter triggers - white background with pill-shaped corners
  const filterTriggerClass = "h-10 bg-white border border-gray-300 rounded-full hover:bg-white focus:bg-white data-[state=open]:bg-white";

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search Bar */}
      <div className="relative flex-1 min-w-[280px] max-w-[450px]">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="חיפוש לפי שם, ת.ז או איש קשר..."
          className="pr-10 h-10 bg-white border border-gray-300 rounded-full"
          dir="rtl"
        />
      </div>

      {/* Client Status Filter */}
      <div className="flex items-center gap-1">
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => onFilterChange({ status: value })}
        >
          <SelectTrigger className={`w-[130px] ${filterTriggerClass}`}>
            <SelectValue placeholder="כל הלקוחות" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הלקוחות</SelectItem>
            <SelectItem value="active">פעילים</SelectItem>
            <SelectItem value="adhoc">חריגים</SelectItem>
            <SelectItem value="inactive">לא פעילים</SelectItem>
            <SelectItem value="pending">ממתינים</SelectItem>
          </SelectContent>
        </Select>
        <MoreVertical className="h-4 w-4 text-gray-400" />
      </div>

      {/* Company Status Filter */}
      <div className="flex items-center gap-1">
        <Select
          value={filters.companyStatus}
          onValueChange={(value) => onFilterChange({ companyStatus: value })}
        >
          <SelectTrigger className={`w-[100px] ${filterTriggerClass}`}>
            <SelectValue placeholder="פעילה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            <SelectItem value="active">פעילה</SelectItem>
            <SelectItem value="inactive">לא פעילה</SelectItem>
          </SelectContent>
        </Select>
        <MoreVertical className="h-4 w-4 text-gray-400" />
      </div>

      {/* Client Type Filter */}
      <div className="flex items-center gap-1">
        <Select
          value={filters.clientType}
          onValueChange={(value) => onFilterChange({ clientType: value })}
        >
          <SelectTrigger className={`w-[120px] ${filterTriggerClass}`}>
            <SelectValue placeholder="כל הסוגים" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסוגים</SelectItem>
            <SelectItem value="company">חברה</SelectItem>
            <SelectItem value="freelancer">עצמאי</SelectItem>
            <SelectItem value="salary_owner">שכיר בעל שליטה</SelectItem>
          </SelectContent>
        </Select>
        <MoreVertical className="h-4 w-4 text-gray-400" />
      </div>

      {/* Company Subtype Filter */}
      <div className="flex items-center gap-1">
        <Select
          value={filters.companySubtype}
          onValueChange={(value) => onFilterChange({ companySubtype: value })}
        >
          <SelectTrigger className={`w-[140px] ${filterTriggerClass}`}>
            <SelectValue placeholder="כל תתי הסוגים" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל תתי הסוגים</SelectItem>
            <SelectItem value="commercial_restaurant">מסחרי - מסעדות</SelectItem>
            <SelectItem value="commercial_other">מסחרי - אחר</SelectItem>
            <SelectItem value="realestate">נדל"ן</SelectItem>
            <SelectItem value="holdings">החזקות</SelectItem>
          </SelectContent>
        </Select>
        <MoreVertical className="h-4 w-4 text-gray-400" />
      </div>

      {/* Group Filter */}
      <div className="flex items-center gap-1">
        <Select
          value={filters.groupId}
          onValueChange={(value) => onFilterChange({ groupId: value })}
        >
          <SelectTrigger className={`w-[130px] ${filterTriggerClass}`}>
            <SelectValue placeholder="כל הקבוצות" />
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
        <MoreVertical className="h-4 w-4 text-gray-400" />
      </div>

      {/* Reset Filters Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        className={`h-10 px-4 rounded-full bg-white border border-gray-300 hover:bg-gray-50 ${
          hasActiveFilters ? 'text-[#395BF7]' : 'text-gray-500'
        }`}
        disabled={!hasActiveFilters}
      >
        איפוס סינונים
      </Button>
    </div>
  );
});

ClientFilters.displayName = 'ClientFilters';
