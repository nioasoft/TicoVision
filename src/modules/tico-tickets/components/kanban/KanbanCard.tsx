/**
 * Kanban Card - כרטיס פנייה בלוח
 */

import { useSortable } from '@dnd-kit/sortable';
import type { MouseEvent } from 'react';
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
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TicketWithDetails } from '../../types/ticket.types';
import { getAssigneeColors } from '../../utils/assigneeColors';

// Priority config
const PRIORITY_CONFIG = {
  low: { label: 'נמוכה', color: 'bg-muted text-muted-foreground', icon: null },
  normal: { label: 'רגילה', color: 'bg-muted text-foreground', icon: null },
  high: { label: 'גבוהה', color: 'bg-primary/10 text-primary', icon: AlertTriangle },
  urgent: { label: 'דחופה', color: 'bg-destructive/10 text-destructive', icon: AlertCircle },
};

interface KanbanCardProps {
  ticket: TicketWithDetails;
  onClick: (ticket: TicketWithDetails) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: (ticketId: string) => void;
}

export function KanbanCard({ ticket, onClick, isCollapsed, onToggleCollapse }: KanbanCardProps) {
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
  const assigneeColors = getAssigneeColors(ticket.assigned_to);
  const isCompleted = ticket.status?.key === 'completed' || Boolean(ticket.resolved_at);

  const handleToggleCollapse = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggleCollapse?.(ticket.id);
  };

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
        'tico-kanban-card cursor-grab active:cursor-grabbing transition-shadow border-r-2',
        isDragging && 'opacity-60 shadow-md',
        isCompleted && 'bg-muted/40 border-muted opacity-80',
        ticket.priority === 'urgent' && 'border-r-destructive',
        ticket.priority === 'high' && 'border-r-primary',
        ticket.priority === 'normal' && 'border-r-primary/40',
        ticket.priority === 'low' && 'border-r-border'
      )}
      onClick={() => onClick(ticket)}
    >
      <CardContent className={cn('p-3', isCollapsed ? 'space-y-2' : 'space-y-2')}>
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              {PriorityIcon && <PriorityIcon className="h-4 w-4 text-current" />}
              <Badge variant="outline" className={cn('text-xs', priorityConfig.color)}>
                {priorityConfig.label}
              </Badge>
              {isCompleted && (
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                  הושלם
                </Badge>
              )}
            </div>
          )}
          <button
            type="button"
            className="rounded-full border border-border p-1 text-muted-foreground hover:text-foreground"
            onClick={handleToggleCollapse}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label={isCollapsed ? 'הרחב כרטיס' : 'כווץ כרטיס'}
          >
            {isCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
        </div>

        <p
          className={cn(
            'font-medium text-sm text-right',
            isCollapsed ? 'line-clamp-1' : 'line-clamp-2',
            isCompleted && 'text-muted-foreground'
          )}
        >
          {ticket.subject}
        </p>

        {!isCollapsed && (
          <>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" />
              <span className="truncate">
                {ticket.category_name}
                {ticket.subcategory_name && ` / ${ticket.subcategory_name}`}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(ticket.created_at)}</span>
                </div>
                {ticket.reply_count !== undefined && ticket.reply_count > 0 && (
                  <div className="flex items-center gap-1 text-xs text-primary">
                    <MessageSquare className="h-3 w-3" />
                    <span>{ticket.reply_count}</span>
                  </div>
                )}
              </div>

              {ticket.assigned_to ? (
                <div className="flex items-center gap-1">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback
                      className="text-[10px]"
                      style={{
                        backgroundColor: assigneeColors.bg,
                        color: assigneeColors.text,
                        border: `1px solid ${assigneeColors.border}`,
                      }}
                    >
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

            {ticket.matched_client_id ? (
              <div className="flex items-center gap-1 text-xs text-primary">
                <CheckCircle2 className="h-3 w-3" />
                <span className="truncate">{ticket.client_name || 'לקוח מזוהה'}</span>
              </div>
            ) : ticket.is_new_lead && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <AlertCircle className="h-3 w-3" />
                <span>ליד חדש</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
