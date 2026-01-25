import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FreelancerFilters as FreelancerFiltersType } from '@/hooks/useFreelancers';

interface FreelancerFiltersProps {
  searchQuery: string;
  filters: FreelancerFiltersType;
  onSearchChange: (query: string) => void;
  onFilterChange: (filters: Partial<FreelancerFiltersType>) => void;
  onResetFilters: () => void;
}

export function FreelancerFilters({
  searchQuery,
  filters,
  onSearchChange,
  onFilterChange,
  onResetFilters,
}: FreelancerFiltersProps) {
  const hasActiveFilters =
    searchQuery ||
    filters.isPassiveIncome !== 'all' ||
    filters.linkedCompanyId !== 'all';

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input

          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pr-10 rtl:text-right"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Passive Income Filter */}
        <Select
          value={filters.isPassiveIncome}
          onValueChange={(value) => onFilterChange({ isPassiveIncome: value })}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">הכל</SelectItem>
            <SelectItem value="false">פעילים</SelectItem>
            <SelectItem value="true">הכנסה פסיבית</SelectItem>
          </SelectContent>
        </Select>

        {/* Reset Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            נקה פילטרים
          </Button>
        )}
      </div>
    </div>
  );
}
