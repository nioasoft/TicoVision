/**
 * Kanban Card - כרטיס פנייה בלוח
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Clock,
  User,
  Building2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TicketWithDetails } from '../../types/ticket.types';

// Priority config
const PRIORITY_CONFIG = {
  low: { label: 'נמוכה', color: 'bg-gray-100 text-gray-700', icon: null },
  normal: { label: 'רגילה', color: 'bg-blue-100 text-blue-700', icon: null },
  high: { label: 'גבוהה', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  urgent: { label: 'דחופה', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

interface KanbanCardProps {
  ticket: TicketWithDetails;
  onClick: (ticket: TicketWithDetails) => void;
}

export function KanbanCard({ ticket, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityConfig = PRIORITY_CONFIG[ticket.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.normal;
  const PriorityIcon = priorityConfig.icon;

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'היום';
    if (diffDays === 1) return 'אתמול';
    if (diffDays < 7) return `לפני ${diffDays} ימים`;
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'cursor-grab active:cursor-grabbing transition-all hover:shadow-md border-r-4',
        isDragging && 'opacity-50 shadow-lg rotate-2',
        ticket.priority === 'urgent' && 'border-r-red-500',
        ticket.priority === 'high' && 'border-r-orange-500',
        ticket.priority === 'normal' && 'border-r-blue-500',
        ticket.priority === 'low' && 'border-r-gray-300'
      )}
      onClick={() => onClick(ticket)}
    >
      <CardContent className="p-3 space-y-2">
        {/* Header: Ticket number + Priority */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {PriorityIcon && <PriorityIcon className="h-4 w-4 text-current" />}
            <Badge variant="outline" className={cn('text-xs', priorityConfig.color)}>
              {priorityConfig.label}
            </Badge>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            #{ticket.ticket_number}
          </span>
        </div>

        {/* Subject */}
        <p className="font-medium text-sm line-clamp-2 text-right">
          {ticket.subject}
        </p>

        {/* Category */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Building2 className="h-3 w-3" />
          <span className="truncate">
            {ticket.category_name}
            {ticket.subcategory_name && ` / ${ticket.subcategory_name}`}
          </span>
        </div>

        {/* Footer: Assignee + Date */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatDate(ticket.created_at)}</span>
          </div>

          {ticket.assigned_to ? (
            <div className="flex items-center gap-1">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[10px] bg-primary/10">
                  {ticket.assignee_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs truncate max-w-[80px]">
                {ticket.assignee_name || 'משויך'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>לא משויך</span>
            </div>
          )}
        </div>

        {/* Client match indicator */}
        {ticket.matched_client_id ? (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            <span className="truncate">{ticket.client_name || 'לקוח מזוהה'}</span>
          </div>
        ) : ticket.is_new_lead && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <AlertCircle className="h-3 w-3" />
            <span>ליד חדש</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
