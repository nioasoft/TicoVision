/**
 * Kanban Column - עמודת סטטוס
 */

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KanbanCard } from './KanbanCard';
import type { TicketWithDetails, KanbanColumn as KanbanColumnType } from '../../types/ticket.types';

interface KanbanColumnProps {
  column: KanbanColumnType & { wip_limit?: number | null; warn_at_percent?: number };
  tickets: TicketWithDetails[];
  onTicketClick: (ticket: TicketWithDetails) => void;
  collapsedTicketIds: Set<string>;
  onToggleCollapse: (ticketId: string) => void;
}

const STATUS_TONE: Record<string, { badge: string; dot: string }> = {
  new: { badge: 'bg-primary/10 text-primary', dot: 'bg-primary' },
  in_progress: { badge: 'bg-muted text-foreground', dot: 'bg-muted-foreground' },
  in_review: { badge: 'bg-muted text-foreground', dot: 'bg-muted-foreground' },
  completed: { badge: 'bg-muted text-foreground', dot: 'bg-muted-foreground' },
};

export function KanbanColumn({
  column,
  tickets,
  onTicketClick,
  collapsedTicketIds,
  onToggleCollapse,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  // WIP limit calculations
  const wipLimit = column.wip_limit;
  const warnAtPercent = column.warn_at_percent ?? 80;
  const ticketCount = tickets.length;
  const isOverLimit = wipLimit !== null && wipLimit !== undefined && ticketCount > wipLimit;
  const isNearLimit = wipLimit !== null && wipLimit !== undefined && !isOverLimit &&
    ticketCount >= Math.floor(wipLimit * (warnAtPercent / 100));

  return (
    <div
      className={cn(
        'tico-kanban-column flex flex-col flex-1 min-w-[260px] max-w-[360px] transition-colors',
        isOver && 'tico-kanban-column--over',
        isOverLimit && 'ring-2 ring-destructive'
      )}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between p-3 border-b border-border',
        isOverLimit && 'bg-destructive/10',
        isNearLimit && !isOverLimit && 'bg-yellow-500/10'
      )}>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{column.name_hebrew || column.name}</h3>
          <div
            className={cn(
              'w-3 h-3 rounded-full',
              STATUS_TONE[column.key]?.dot || 'bg-muted-foreground'
            )}
          />
          {(isOverLimit || isNearLimit) && (
            <AlertTriangle className={cn(
              'h-4 w-4',
              isOverLimit ? 'text-destructive' : 'text-yellow-500'
            )} />
          )}
        </div>
        <div className="flex items-center gap-1">
          <Badge
            variant="secondary"
            className={cn(
              'text-xs font-medium',
              isOverLimit && 'bg-destructive/20 text-destructive',
              isNearLimit && !isOverLimit && 'bg-yellow-500/20 text-yellow-700',
              !isOverLimit && !isNearLimit && (STATUS_TONE[column.key]?.badge || 'bg-muted text-foreground')
            )}
          >
            {ticketCount}
            {wipLimit !== null && wipLimit !== undefined && `/${wipLimit}`}
          </Badge>
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
                isCollapsed={collapsedTicketIds.has(ticket.id)}
                onToggleCollapse={onToggleCollapse}
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
