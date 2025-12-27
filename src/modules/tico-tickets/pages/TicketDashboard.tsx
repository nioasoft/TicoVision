/**
 * Tico Tickets - Dashboard
 * לוח Kanban לניהול פניות
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  Settings,
  Ticket,
} from 'lucide-react';
import { toast } from 'sonner';
import { KanbanBoard } from '../components/kanban';
import { TicketFiltersComponent, type TicketFilters } from '../components/TicketFilters';
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

  // Filters
  const [filters, setFilters] = useState<TicketFilters>({
    search: '',
    priority: 'all',
    categoryId: 'all',
    assignedTo: 'all',
    clientMatch: 'all',
  });

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [dashboardResult, categoriesData, assigneesData, statusesData] = await Promise.all([
        ticketService.getDashboardData(),
        ticketService.getCategories(),
        ticketService.getAssignableUsers(),
        ticketService.getStatuses(),
      ]);

      if (dashboardResult.data) {
        setColumns(dashboardResult.data.columns || []);
        // Extract all tickets from columns
        const tickets = (dashboardResult.data.columns || []).flatMap(col => col.tickets || []);
        setAllTickets(tickets);
      }
      // Unwrap ServiceResponse objects
      if (categoriesData.data) setCategories(categoriesData.data);
      if (assigneesData.data) setAssignees(assigneesData.data);
      if (statusesData.data) setStatuses(statusesData.data);
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
      const dashboardResult = await ticketService.getDashboardData();
      if (dashboardResult.data) {
        setColumns(dashboardResult.data.columns || []);
        const tickets = (dashboardResult.data.columns || []).flatMap(col => col.tickets || []);
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
  }, [allTickets, filters]);

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

  // Stats
  const stats = useMemo(() => {
    const total = allTickets.length;
    const urgent = allTickets.filter(t => t.priority === 'urgent').length;
    const unassigned = allTickets.filter(t => !t.assigned_to).length;
    const newLeads = allTickets.filter(t => t.is_new_lead).length;
    return { total, urgent, unassigned, newLeads };
  }, [allTickets]);

  return (
    <div className="h-full flex flex-col" dir="rtl">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 ml-1 ${refreshing ? 'animate-spin' : ''}`} />
              רענן
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 ml-1" />
              הגדרות
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Tico Tickets
              <Ticket className="h-6 w-6" />
            </h1>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 justify-end mb-4">
          <Badge variant="secondary">{stats.total} פניות</Badge>
          {stats.urgent > 0 && (
            <Badge variant="destructive">{stats.urgent} דחופות</Badge>
          )}
          {stats.unassigned > 0 && (
            <Badge variant="outline">{stats.unassigned} לא משויכות</Badge>
          )}
          {stats.newLeads > 0 && (
            <Badge className="bg-amber-100 text-amber-800">{stats.newLeads} לידים חדשים</Badge>
          )}
        </div>

        {/* Filters */}
        <TicketFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          categories={categories}
          assignees={assignees}
        />
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <KanbanBoard
          columns={displayColumns}
          tickets={filteredTickets}
          onStatusChange={handleStatusChange}
          onTicketClick={handleTicketClick}
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
