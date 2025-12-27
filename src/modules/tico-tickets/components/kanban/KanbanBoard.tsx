/**
 * Kanban Board - לוח ראשי עם drag & drop
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KanbanColumn } from './KanbanColumn';
import type { TicketWithDetails, KanbanColumn as KanbanColumnType } from '../../types/ticket.types';

interface KanbanBoardProps {
  columns: KanbanColumnType[];
  tickets: TicketWithDetails[];
  onStatusChange: (ticketId: string, newStatusId: string) => Promise<void>;
  onTicketClick: (ticket: TicketWithDetails) => void;
  isLoading?: boolean;
}

export function KanbanBoard({
  columns,
  tickets,
  onStatusChange,
  onTicketClick,
  isLoading,
}: KanbanBoardProps) {
  const [activeTicket, setActiveTicket] = useState<TicketWithDetails | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to show the first columns (New, In Progress) in RTL
  useEffect(() => {
    if (scrollContainerRef.current && !isLoading) {
      // In RTL, scroll to the right to show the first columns
      scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
    }
  }, [isLoading, columns.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group tickets by status
  const ticketsByStatus = useCallback(() => {
    const grouped: Record<string, TicketWithDetails[]> = {};
    columns.forEach(col => {
      grouped[col.id] = [];
    });
    tickets.forEach(ticket => {
      if (grouped[ticket.status_id]) {
        grouped[ticket.status_id].push(ticket);
      }
    });
    return grouped;
  }, [columns, tickets]);

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = tickets.find(t => t.id === event.active.id);
    if (ticket) {
      setActiveTicket(ticket);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTicket(null);

    const { active, over } = event;
    if (!over) return;

    const ticketId = active.id as string;
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    // Find the column we're dropping into
    // over.id could be either a column id or another ticket id
    let newStatusId: string | null = null;

    // Check if dropped on a column
    const column = columns.find(c => c.id === over.id);
    if (column) {
      newStatusId = column.id;
    } else {
      // Dropped on another ticket - find its column
      const overTicket = tickets.find(t => t.id === over.id);
      if (overTicket) {
        newStatusId = overTicket.status_id;
      }
    }

    if (newStatusId && newStatusId !== ticket.status_id) {
      await onStatusChange(ticketId, newStatusId);
    }
  };

  const grouped = ticketsByStatus();

  if (isLoading) {
    return (
      <div className="flex gap-4 p-4 overflow-x-auto">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="w-[300px] min-w-[300px] h-[400px] bg-muted/30 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        ref={scrollContainerRef}
        className="w-full overflow-x-auto"
        dir="rtl"
      >
        <div className="flex gap-4 p-4 min-w-max">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tickets={grouped[column.id] || []}
              onTicketClick={onTicketClick}
            />
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeTicket && (
          <Card className="w-[280px] shadow-xl rotate-3 opacity-90">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-xs">
                  #{activeTicket.ticket_number}
                </Badge>
              </div>
              <p className="font-medium text-sm line-clamp-2 text-right">
                {activeTicket.subject}
              </p>
            </CardContent>
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
}
