/**
 * Ticket Filters - סינון פניות
 */

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, X, Filter, AlertTriangle, User, Building2, Inbox, UserCircle, Users, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SupportTicketCategory, AssignableUser } from '../types/ticket.types';
import { getAssigneeColors } from '../utils/assigneeColors';

export type QuickFilter = 'all' | 'mine' | 'unassigned' | 'urgent' | 'leads';

export interface TicketFilters {
  search: string;
  priority: string;
  categoryId: string;
  assignedTo: string;
  clientMatch: 'all' | 'matched' | 'unmatched';
  quickFilter: QuickFilter;
}

interface TicketFiltersProps {
  filters: TicketFilters;
  onFiltersChange: (filters: TicketFilters) => void;
  categories: SupportTicketCategory[];
  assignees: AssignableUser[];
  currentUserId?: string;
}

const QUICK_FILTERS: { id: QuickFilter; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'הכל', icon: Inbox },
  { id: 'mine', label: 'שלי', icon: UserCircle },
  { id: 'unassigned', label: 'לא משויך', icon: Users },
  { id: 'urgent', label: 'דחופות', icon: Flame },
  { id: 'leads', label: 'לידים', icon: User },
];

export function TicketFiltersComponent({
  filters,
  onFiltersChange,
  categories,
  assignees,
  currentUserId,
}: TicketFiltersProps) {
  const updateFilter = <K extends keyof TicketFilters>(
    key: K,
    value: TicketFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const setQuickFilter = (quickFilter: QuickFilter) => {
    // Reset other filters when selecting a quick filter
    onFiltersChange({
      search: filters.search, // Keep search
      priority: 'all',
      categoryId: 'all',
      assignedTo: 'all',
      clientMatch: 'all',
      quickFilter,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      priority: 'all',
      categoryId: 'all',
      assignedTo: 'all',
      clientMatch: 'all',
      quickFilter: 'all',
    });
  };

  const activeFiltersCount = [
    filters.search,
    filters.priority !== 'all' ? filters.priority : '',
    filters.categoryId !== 'all' ? filters.categoryId : '',
    filters.assignedTo !== 'all' ? filters.assignedTo : '',
    filters.clientMatch !== 'all' ? filters.clientMatch : '',
  ].filter(Boolean).length;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Quick Filter Tabs - Primary navigation */}
      <div className="flex items-center bg-muted/60 p-0.5 rounded-lg">
        {QUICK_FILTERS.map((qf) => {
          const Icon = qf.icon;
          const isActive = filters.quickFilter === qf.id;
          const isDisabled = qf.id === 'mine' && !currentUserId;

          return (
            <button
              key={qf.id}
              onClick={() => !isDisabled && setQuickFilter(qf.id)}
              disabled={isDisabled}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
                isDisabled && 'opacity-40 cursor-not-allowed'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {qf.label}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="h-6 w-px bg-border" />

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="חיפוש..."
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          className="pr-8 h-8 text-sm w-[160px] bg-background"
        />
      </div>

      {/* Compact Dropdowns */}
      <Select
        value={filters.priority}
        onValueChange={(v) => updateFilter('priority', v)}
      >
        <SelectTrigger className="h-8 text-xs w-[120px] bg-background">
          <SelectValue placeholder="עדיפות" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">כל העדיפויות</SelectItem>
          <SelectItem value="urgent">דחופה</SelectItem>
          <SelectItem value="high">גבוהה</SelectItem>
          <SelectItem value="normal">רגילה</SelectItem>
          <SelectItem value="low">נמוכה</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.categoryId}
        onValueChange={(v) => updateFilter('categoryId', v)}
      >
        <SelectTrigger className="h-8 text-xs w-[130px] bg-background">
          <SelectValue placeholder="קטגוריה" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">כל הקטגוריות</SelectItem>
          {categories
            .filter(c => c.level === 1)
            .map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.assignedTo}
        onValueChange={(v) => updateFilter('assignedTo', v)}
      >
        <SelectTrigger className="h-8 text-xs w-[130px] bg-background">
          <SelectValue placeholder="משויך ל..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">כל המשתמשים</SelectItem>
          <SelectItem value="unassigned">לא משויך</SelectItem>
          {assignees.map((user) => {
            const colors = getAssigneeColors(user.id);
            return (
              <SelectItem key={user.id} value={user.id}>
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: colors.bg }}
                  />
                  <span>{user.name}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Clear filters button - only show when filters active */}
      {activeFiltersCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5 ml-1" />
          נקה ({activeFiltersCount})
        </Button>
      )}
    </div>
  );
}
