import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchField } from '@/components/ui/search-field';
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

  const labelClassName = 'mr-1 mb-2 block text-xs font-medium text-muted-foreground';
  const filterRowClassName = 'flex flex-wrap items-end gap-x-4 gap-y-4';
  const filterItemClassName = 'w-full sm:w-auto';
  const filterTriggerClass =
    'h-10 min-w-[108px] rounded-xl border-border bg-background text-sm shadow-xs hover:bg-background data-[state=open]:bg-background [&>span]:truncate';

  return (
    <div className="rounded-2xl border border-border/90 bg-card p-4 shadow-sm">
      <div className="space-y-4">
        <div className={filterRowClassName}>
          {/* Search Bar */}
          <div className="w-full min-w-[300px] flex-1 lg:max-w-[560px]">
            <SearchField
              label="חיפוש"
              value={searchQuery}
              onChange={onSearchChange}
              className="h-10"
            />
          </div>

        {/* Client Status Filter */}
        <div className={filterItemClassName}>
          <label className={labelClassName}>סטטוס לקוח</label>
          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => onFilterChange({ status: value })}
          >
            <SelectTrigger className={`w-[124px] ${filterTriggerClass}`}>
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
        <div className={filterItemClassName}>
          <label className={labelClassName}>סטטוס חברה</label>
          <Select
            value={filters.companyStatus}
            onValueChange={(value) => onFilterChange({ companyStatus: value })}
          >
            <SelectTrigger className={`w-[124px] ${filterTriggerClass}`}>
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
        <div className={filterItemClassName}>
          <label className={labelClassName}>סוג לקוח</label>
          <Select
            value={filters.clientType}
            onValueChange={(value) => onFilterChange({ clientType: value })}
          >
            <SelectTrigger className={`w-[138px] ${filterTriggerClass}`}>
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
        <div className={filterItemClassName}>
          <label className={labelClassName}>תת-סוג</label>
          <Select
            value={filters.companySubtype}
            onValueChange={(value) => onFilterChange({ companySubtype: value })}
          >
            <SelectTrigger className={`w-[146px] ${filterTriggerClass}`}>
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
        <div className={filterItemClassName}>
          <label className={labelClassName}>קבוצה</label>
          <Select
            value={filters.groupId}
            onValueChange={(value) => onFilterChange({ groupId: value })}
          >
            <SelectTrigger className={`w-[140px] ${filterTriggerClass}`}>
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
        <div className={filterItemClassName}>
          <label className={labelClassName}>סטטוס מאזן</label>
          <Select
            value={filters.balanceStatus || 'all'}
            onValueChange={(value) => onFilterChange({ balanceStatus: value })}
          >
            <SelectTrigger className={`w-[146px] ${filterTriggerClass}`}>
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
        </div>

        <div className={filterRowClassName}>
          {accountantNames.length > 0 && (
            <div className={filterItemClassName}>
              <label className={labelClassName}>מנהל חשבונות</label>
              <Select
                value={filters.accountantName || 'all'}
                onValueChange={(value) => onFilterChange({ accountantName: value })}
              >
                <SelectTrigger className={`w-[150px] ${filterTriggerClass}`}>
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
          <div className={filterItemClassName}>
            <label className={labelClassName}>הנה&quot;ח</label>
            <Select
              value={filters.internalExternal || 'all'}
              onValueChange={(value) => onFilterChange({ internalExternal: value })}
            >
              <SelectTrigger className={`w-[116px] ${filterTriggerClass}`}>
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
            variant={hasActiveFilters ? 'brandOutline' : 'soft'}
            size="sm"
            onClick={onReset}
            className="h-10 rounded-xl px-4 text-sm"
            disabled={!hasActiveFilters}
          >
            איפוס
          </Button>
        </div>
      </div>
    </div>
  );
});

ClientFilters.displayName = 'ClientFilters';
