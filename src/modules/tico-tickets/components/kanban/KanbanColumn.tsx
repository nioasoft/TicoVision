/**
 * Kanban Column - עמודת סטטוס
 */

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { KanbanCard } from './KanbanCard';
import type { TicketWithDetails, KanbanColumn as KanbanColumnType } from '../../types/ticket.types';

interface KanbanColumnProps {
  column: KanbanColumnType;
  tickets: TicketWithDetails[];
  onTicketClick: (ticket: TicketWithDetails) => void;
}

export function KanbanColumn({ column, tickets, onTicketClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <div
      className={cn(
        'flex flex-col w-[300px] min-w-[300px] bg-muted/30 rounded-lg border transition-colors',
        isOver && 'bg-primary/5 border-primary/50'
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-3 border-b"
        style={{ borderBottomColor: column.color }}
      >
        <Badge
          variant="secondary"
          className="text-xs"
          style={{
            backgroundColor: `${column.color}20`,
            color: column.color,
          }}
        >
          {tickets.length}
        </Badge>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{column.name_hebrew || column.name}</h3>
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: column.color }}
          />
        </div>
      </div>

      {/* Cards container */}
      <ScrollArea className="flex-1 p-2">
        <div
          ref={setNodeRef}
          className="space-y-2 min-h-[100px]"
        >
          <SortableContext
            items={tickets.map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {tickets.map((ticket) => (
              <KanbanCard
                key={ticket.id}
                ticket={ticket}
                onClick={onTicketClick}
              />
            ))}
          </SortableContext>

          {tickets.length === 0 && (
            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
              אין פניות
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
