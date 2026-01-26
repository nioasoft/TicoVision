/**
 * Tico Tickets - Dashboard
 * לוח Kanban לניהול פניות
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Settings, Ticket } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { KanbanBoard } from '../components/kanban';
import { TicketFiltersComponent, type TicketFilters, type QuickFilter } from '../components/TicketFilters';
import { TicketDetailSheet } from '../components/TicketDetailSheet';
import { ticketService } from '../services/ticket.service';
import type {
  TicketWithDetails,
  SupportTicketStatus,
  SupportTicketCategory,
  AssignableUser,
  KanbanColumn,
} from '../types/ticket.types';

export function TicketDashboard() {
  const navigate = useNavigate();
  const visibleStatusKeys = ['new', 'in_progress', 'in_review', 'completed'];
  const allowedStatusKeys = [...visibleStatusKeys, 'archived'];
  // State
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [allTickets, setAllTickets] = useState<TicketWithDetails[]>([]);
  const [categories, setCategories] = useState<SupportTicketCategory[]>([]);
  const [assignees, setAssignees] = useState<AssignableUser[]>([]);
  const [statuses, setStatuses] = useState<SupportTicketStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<TicketWithDetails | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [collapsedTicketIds, setCollapsedTicketIds] = useState<Set<string>>(new Set());

  // Current user
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();

  // Filters
  const [filters, setFilters] = useState<TicketFilters>({
    search: '',
    priority: 'all',
    categoryId: 'all',
    assignedTo: 'all',
    clientMatch: 'all',
    quickFilter: 'all',
  });

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id);
    };
    getCurrentUser();
  }, []);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashboardResult, categoriesData, assigneesData, statusesData] = await Promise.all([
        ticketService.getDashboardData(undefined, undefined, { statusKeys: visibleStatusKeys }),
        ticketService.getCategories(),
        ticketService.getAssignableUsers(),
        ticketService.getStatuses(),
      ]);

      if (dashboardResult.data) {
        const rawColumns: KanbanColumn[] = dashboardResult.data.columns || [];
        const visibleColumns = rawColumns.filter((col: KanbanColumn) => visibleStatusKeys.includes(col.key));
        const orderedColumns = visibleStatusKeys
          .map(key => visibleColumns.find((col: KanbanColumn) => col.key === key))
          .filter((col): col is KanbanColumn => Boolean(col));
        setColumns(orderedColumns);
        const tickets = orderedColumns.flatMap(col => col.tickets || []);
        setAllTickets(tickets);
      }
      // Unwrap ServiceResponse objects
      if (categoriesData.data) setCategories(categoriesData.data);
      if (assigneesData.data) setAssignees(assigneesData.data);
      if (statusesData.data) {
        const rawStatuses: SupportTicketStatus[] = statusesData.data;
        const visibleStatuses = rawStatuses.filter((status: SupportTicketStatus) =>
          allowedStatusKeys.includes(status.key)
        );
        setStatuses(visibleStatuses);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      const dashboardResult = await ticketService.getDashboardData(undefined, undefined, {
        statusKeys: visibleStatusKeys,
      });
      if (dashboardResult.data) {
        const rawColumns: KanbanColumn[] = dashboardResult.data.columns || [];
        const visibleColumns = rawColumns.filter((col: KanbanColumn) => visibleStatusKeys.includes(col.key));
        const orderedColumns = visibleStatusKeys
          .map(key => visibleColumns.find((col: KanbanColumn) => col.key === key))
          .filter((col): col is KanbanColumn => Boolean(col));
        setColumns(orderedColumns);
        const tickets = orderedColumns.flatMap(col => col.tickets || []);
        setAllTickets(tickets);
      }
    } catch (error) {
      toast.error('שגיאה ברענון');
    } finally {
      setRefreshing(false);
    }
  };

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return allTickets.filter(ticket => {
      // Quick filter - applied first
      if (filters.quickFilter !== 'all') {
        switch (filters.quickFilter) {
          case 'mine':
            if (!currentUserId || ticket.assigned_to !== currentUserId) return false;
            break;
          case 'unassigned':
            if (ticket.assigned_to) return false;
            break;
          case 'urgent':
            if (ticket.priority !== 'urgent') return false;
            break;
          case 'leads':
            if (ticket.matched_client_id) return false; // Only unmatched = leads
            break;
        }
      }

      // Search
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matches =
          ticket.subject.toLowerCase().includes(search) ||
          ticket.ticket_number.toLowerCase().includes(search) ||
          ticket.submitter_name?.toLowerCase().includes(search) ||
          ticket.submitter_email?.toLowerCase().includes(search);
        if (!matches) return false;
      }

      // Priority
      if (filters.priority !== 'all' && ticket.priority !== filters.priority) {
        return false;
      }

      // Category
      if (filters.categoryId !== 'all' && ticket.category_id !== filters.categoryId) {
        return false;
      }

      // Assignee
      if (filters.assignedTo !== 'all') {
        if (filters.assignedTo === 'unassigned' && ticket.assigned_to) {
          return false;
        }
        if (filters.assignedTo !== 'unassigned' && ticket.assigned_to !== filters.assignedTo) {
          return false;
        }
      }

      // Client match
      if (filters.clientMatch !== 'all') {
        if (filters.clientMatch === 'matched' && !ticket.matched_client_id) {
          return false;
        }
        if (filters.clientMatch === 'unmatched' && ticket.matched_client_id) {
          return false;
        }
      }

      return true;
    });
  }, [allTickets, filters, currentUserId]);

  // Convert columns to use filtered tickets
  const displayColumns = useMemo<KanbanColumn[]>(() => {
    return columns.map(col => ({
      ...col,
      id: col.id,
      key: col.key,
      name: col.name || col.name_hebrew || '',
      color: col.color || '#6B7280',
      order: col.column_order,
    }));
  }, [columns]);

  // Handle status change via drag
  const handleStatusChange = useCallback(async (ticketId: string, newStatusId: string) => {
    try {
      // Optimistic update
      setAllTickets(prev =>
        prev.map(t =>
          t.id === ticketId ? { ...t, status_id: newStatusId } : t
        )
      );

      await ticketService.updateStatus(ticketId, newStatusId);
      toast.success('הסטטוס עודכן');
    } catch (error) {
      toast.error('שגיאה בעדכון סטטוס');
      refreshData(); // Revert on error
    }
  }, []);

  // Handle ticket click
  const handleTicketClick = useCallback((ticket: TicketWithDetails) => {
    setSelectedTicket(ticket);
    setSheetOpen(true);
  }, []);

  const handleToggleCollapse = useCallback((ticketId: string) => {
    setCollapsedTicketIds(prev => {
      const next = new Set(prev);
      if (next.has(ticketId)) {
        next.delete(ticketId);
      } else {
        next.add(ticketId);
      }
      return next;
    });
  }, []);

  // Stats
  const stats = useMemo(() => {
    const total = allTickets.length;
    const urgent = allTickets.filter(t => t.priority === 'urgent').length;
    const unassigned = allTickets.filter(t => !t.assigned_to).length;
    const newLeads = allTickets.filter(t => t.is_new_lead).length;
    return { total, urgent, unassigned, newLeads };
  }, [allTickets]);

  return (
    <div
      className="tico-tickets-theme h-full flex flex-col bg-background text-foreground rtl:text-right ltr:text-left"
      dir="rtl"
    >
      {/* Header - Compact single row */}
      <div className="px-4 py-3 border-b bg-card/50">
        <div className="flex items-center justify-between gap-4">
          {/* Right side - Title & Stats */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Ticket className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">פניות</h1>
            </div>

            {/* Inline Stats */}
            <div className="hidden sm:flex items-center gap-3 text-sm text-muted-foreground">
              <span><span className="font-medium text-foreground">{stats.total}</span> פניות</span>
              {stats.urgent > 0 && (
                <span className="text-destructive"><span className="font-medium">{stats.urgent}</span> דחופות</span>
              )}
              {stats.unassigned > 0 && (
                <span><span className="font-medium">{stats.unassigned}</span> ממתינות</span>
              )}
            </div>
          </div>

          {/* Left side - Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => navigate('/tico-tickets/new')}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">פנייה חדשה</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={refreshData}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => navigate('/tico-tickets/settings')}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="px-4 py-2 border-b bg-muted/30">
        <TicketFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          categories={categories}
          assignees={assignees}
          currentUserId={currentUserId}
        />
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden tico-tickets-board">
        <KanbanBoard
          columns={displayColumns}
          tickets={filteredTickets}
          onStatusChange={handleStatusChange}
          onTicketClick={handleTicketClick}
          collapsedTicketIds={collapsedTicketIds}
          onToggleCollapse={handleToggleCollapse}
          expectedColumnCount={visibleStatusKeys.length}
          isLoading={loading}
        />
      </div>

      {/* Ticket Detail Sheet */}
      <TicketDetailSheet
        ticket={selectedTicket}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        statuses={statuses}
        assignees={assignees}
        onUpdate={() => {
          refreshData();
          // Update selected ticket
          if (selectedTicket) {
            const updated = allTickets.find(t => t.id === selectedTicket.id);
            if (updated) setSelectedTicket(updated);
          }
        }}
      />
    </div>
  );
}

export default TicketDashboard;
