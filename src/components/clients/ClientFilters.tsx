import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
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
  accountantNames?: string[];
  onSearchChange: (query: string) => void;
  onFilterChange: (filters: Partial<ClientFiltersType>) => void;
  onReset: () => void;
}

export const ClientFilters = React.memo<ClientFiltersProps>(({
  searchQuery,
  filters,
  accountantNames = [],
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
    (filters.groupId && filters.groupId !== 'all') ||
    (filters.balanceStatus && filters.balanceStatus !== 'all') ||
    (filters.accountantName && filters.accountantName !== 'all') ||
    (filters.internalExternal && filters.internalExternal !== 'all') ||
    filters.tab !== 'all';

  // Compact trigger styles - smaller text, consistent sizing
  const filterTriggerClass = "h-8 text-xs !bg-white border border-gray-300 rounded-md hover:!bg-white focus:!bg-white data-[state=open]:!bg-white [&>span]:truncate";

  return (
    <div className="flex flex-wrap gap-2 items-end">
      {/* Search Bar */}
      <div className="relative flex-1 min-w-[240px] max-w-[380px]">
        <label className="block text-[11px] font-medium text-gray-500 mb-1 mr-1">חיפוש</label>
        <div className="relative">
          <Search className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder=""
            className="pr-8 h-8 text-xs !bg-white border !border-blue-400 rounded-md"
            dir="rtl"
          />
        </div>
      </div>

      {/* Client Status Filter */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1 mr-1">סטטוס לקוח</label>
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) => onFilterChange({ status: value })}
        >
          <SelectTrigger className={`w-[110px] ${filterTriggerClass}`}>
            <SelectValue placeholder="כל הלקוחות" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הלקוחות</SelectItem>
            <SelectItem value="active">פעילים</SelectItem>
            <SelectItem value="adhoc">חריגים</SelectItem>
            <SelectItem value="inactive">לא פעילים</SelectItem>
            <SelectItem value="pending">ממתינים</SelectItem>
            <SelectItem value="unknown">לא ידוע</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Company Status Filter */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1 mr-1">סטטוס חברה</label>
        <Select
          value={filters.companyStatus}
          onValueChange={(value) => onFilterChange({ companyStatus: value })}
        >
          <SelectTrigger className={`w-[110px] ${filterTriggerClass}`}>
            <SelectValue placeholder="פעילה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            <SelectItem value="active">פעילה</SelectItem>
            <SelectItem value="inactive">רדומה</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Client Type Filter */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1 mr-1">סוג לקוח</label>
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
      </div>

      {/* Company Subtype Filter */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1 mr-1">תת-סוג</label>
        <Select
          value={filters.companySubtype}
          onValueChange={(value) => onFilterChange({ companySubtype: value })}
        >
          <SelectTrigger className={`w-[130px] ${filterTriggerClass}`}>
            <SelectValue placeholder="כל תתי הסוגים" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל תתי הסוגים</SelectItem>
            <SelectItem value="commercial_restaurant">מסחרי - מסעדות</SelectItem>
            <SelectItem value="commercial_other">מסחרי - אחר</SelectItem>
            <SelectItem value="realestate">נדל&quot;ן</SelectItem>
            <SelectItem value="holdings">החזקות</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Group Filter */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1 mr-1">קבוצה</label>
        <Select
          value={filters.groupId}
          onValueChange={(value) => onFilterChange({ groupId: value })}
        >
          <SelectTrigger className={`w-[120px] ${filterTriggerClass}`}>
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
      </div>

      {/* Balance Status Filter */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1 mr-1">סטטוס מאזן</label>
        <Select
          value={filters.balanceStatus || 'all'}
          onValueChange={(value) => onFilterChange({ balanceStatus: value })}
        >
          <SelectTrigger className={`w-[130px] ${filterTriggerClass}`}>
            <SelectValue placeholder="כל המאזנים" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל המאזנים</SelectItem>
            <SelectItem value="waiting_for_materials">ממתין לחומרים</SelectItem>
            <SelectItem value="materials_received">חומרים התקבלו</SelectItem>
            <SelectItem value="assigned_to_auditor">הועבר למבקר</SelectItem>
            <SelectItem value="in_progress">בעבודה</SelectItem>
            <SelectItem value="review">בבדיקה</SelectItem>
            <SelectItem value="revision_needed">נדרש תיקון</SelectItem>
            <SelectItem value="advances_updated">מקדמות עודכנו</SelectItem>
            <SelectItem value="completed">הושלם</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Accountant Name Filter */}
      {accountantNames.length > 0 && (
        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-1 mr-1">מנהל חשבונות</label>
          <Select
            value={filters.accountantName || 'all'}
            onValueChange={(value) => onFilterChange({ accountantName: value })}
          >
            <SelectTrigger className={`w-[130px] ${filterTriggerClass}`}>
              <SelectValue placeholder="כל מנהלי החשבונות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל מנהלי החשבונות</SelectItem>
              {accountantNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Internal/External Bookkeeping Filter */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1 mr-1">הנה&quot;ח</label>
        <Select
          value={filters.internalExternal || 'all'}
          onValueChange={(value) => onFilterChange({ internalExternal: value })}
        >
          <SelectTrigger className={`w-[100px] ${filterTriggerClass}`}>
            <SelectValue placeholder={'כל הנה"ח'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הנה&quot;ח</SelectItem>
            <SelectItem value="internal">פנימי</SelectItem>
            <SelectItem value="external">חיצוני</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reset Filters Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onReset}
        className={`h-8 px-3 text-xs rounded-md !bg-white border border-gray-300 hover:!bg-gray-50 ${
          hasActiveFilters ? 'text-[#395BF7]' : 'text-gray-500'
        }`}
        disabled={!hasActiveFilters}
      >
        איפוס
      </Button>
    </div>
  );
});

ClientFilters.displayName = 'ClientFilters';
