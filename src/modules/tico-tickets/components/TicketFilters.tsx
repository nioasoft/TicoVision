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
import { Search, X, Filter, AlertTriangle, User, Building2 } from 'lucide-react';
import type { SupportTicketCategory, AssignableUser } from '../types/ticket.types';

export interface TicketFilters {
  search: string;
  priority: string;
  categoryId: string;
  assignedTo: string;
  clientMatch: 'all' | 'matched' | 'unmatched';
}

interface TicketFiltersProps {
  filters: TicketFilters;
  onFiltersChange: (filters: TicketFilters) => void;
  categories: SupportTicketCategory[];
  assignees: AssignableUser[];
}

export function TicketFiltersComponent({
  filters,
  onFiltersChange,
  categories,
  assignees,
}: TicketFiltersProps) {
  const updateFilter = <K extends keyof TicketFilters>(
    key: K,
    value: TicketFilters[K]
  ) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      priority: 'all',
      categoryId: 'all',
      assignedTo: 'all',
      clientMatch: 'all',
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
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 ml-1" />
              נקה הכל
            </Button>
          )}
          {activeFiltersCount > 0 && (
            <Badge variant="secondary">{activeFiltersCount} פילטרים פעילים</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">סינון</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative lg:col-span-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input

            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pr-9 text-right"
          />
        </div>

        {/* Priority */}
        <Select
          value={filters.priority}
          onValueChange={(v) => updateFilter('priority', v)}
        >
          <SelectTrigger className="text-right">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל העדיפויות</SelectItem>
            <SelectItem value="urgent">דחופה</SelectItem>
            <SelectItem value="high">גבוהה</SelectItem>
            <SelectItem value="normal">רגילה</SelectItem>
            <SelectItem value="low">נמוכה</SelectItem>
          </SelectContent>
        </Select>

        {/* Category */}
        <Select
          value={filters.categoryId}
          onValueChange={(v) => updateFilter('categoryId', v)}
        >
          <SelectTrigger className="text-right">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <SelectValue />
            </div>
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

        {/* Assignee */}
        <Select
          value={filters.assignedTo}
          onValueChange={(v) => updateFilter('assignedTo', v)}
        >
          <SelectTrigger className="text-right">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל המשתמשים</SelectItem>
            <SelectItem value="unassigned">לא משויך</SelectItem>
            {assignees.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Client Match */}
        <Select
          value={filters.clientMatch}
          onValueChange={(v) => updateFilter('clientMatch', v as TicketFilters['clientMatch'])}
        >
          <SelectTrigger className="text-right">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הפניות</SelectItem>
            <SelectItem value="matched">לקוחות מזוהים</SelectItem>
            <SelectItem value="unmatched">לידים חדשים</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
