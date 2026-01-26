/**
 * Ticket Detail Sheet - צפייה ועריכת פנייה
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  User,
  Building2,
  Send,
  Phone,
  Mail,
  Tag,
  MessageSquare,
  Link2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getAssigneeColors } from '../utils/assigneeColors';
import { ticketService } from '../services/ticket.service';
import type {
  TicketWithDetails,
  SupportTicketStatus,
  AssignableUser,
  SupportTicketReply,
} from '../types/ticket.types';

interface TicketDetailSheetProps {
  ticket: TicketWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statuses: SupportTicketStatus[];
  assignees: AssignableUser[];
  onUpdate: () => void;
}

const STATUS_TONE: Record<string, string> = {
  new: 'bg-primary',
  in_progress: 'bg-muted-foreground',
  in_review: 'bg-muted-foreground',
  completed: 'bg-muted-foreground',
};

export function TicketDetailSheet({
  ticket,
  open,
  onOpenChange,
  statuses,
  assignees,
  onUpdate,
}: TicketDetailSheetProps) {
  const [replies, setReplies] = useState<SupportTicketReply[]>([]);
  const [newReply, setNewReply] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);

  // Load replies when ticket changes
  useEffect(() => {
    if (ticket && open) {
      loadReplies();
    }
  }, [ticket?.id, open]);

  const loadReplies = async () => {
    if (!ticket) return;
    setLoadingReplies(true);
    try {
      const result = await ticketService.getReplies(ticket.id);
      if (result.data) {
        setReplies(result.data);
      }
    } catch (error) {
      console.error('Error loading replies:', error);
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleStatusChange = async (statusId: string) => {
    if (!ticket) return;
    try {
      await ticketService.updateStatus(ticket.id, statusId);
      toast.success('הסטטוס עודכן');
      onUpdate();
    } catch (error) {
      toast.error('שגיאה בעדכון סטטוס');
    }
  };

  const handleAssigneeChange = async (userId: string) => {
    if (!ticket) return;
    try {
      await ticketService.assign(ticket.id, userId === 'unassigned' ? null : userId);
      toast.success('השיוך עודכן');
      onUpdate();
    } catch (error) {
      toast.error('שגיאה בשיוך');
    }
  };

  const handlePriorityChange = async (priority: string) => {
    if (!ticket) return;
    try {
      await ticketService.updatePriority(ticket.id, priority as 'low' | 'normal' | 'high' | 'urgent');
      toast.success('העדיפות עודכנה');
      onUpdate();
    } catch (error) {
      toast.error('שגיאה בעדכון עדיפות');
    }
  };

  const handleSubmitReply = async () => {
    if (!ticket || !newReply.trim()) return;
    setSubmitting(true);
    try {
      await ticketService.addReply(ticket.id, {
        content: newReply.trim(),
        is_internal: isInternal,
      });
      toast.success('התגובה נוספה');
      setNewReply('');
      loadReplies();
    } catch (error) {
      toast.error('שגיאה בהוספת תגובה');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!ticket) return null;

  const archiveStatus = statuses.find(status => status.key === 'archived');
  const completedStatus = statuses.find(status => status.key === 'completed');
  const canArchive = Boolean(
    archiveStatus && completedStatus && ticket.status_id === completedStatus.id
  );
  const isCompleted = ticket.status?.key === 'completed' || Boolean(ticket.resolved_at);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden rtl:text-right" dir="rtl">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center gap-2">
            {isCompleted && (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                הושלם
              </Badge>
            )}
            <DialogTitle className="text-right">{ticket.subject}</DialogTitle>
            <Badge variant="outline" className="font-mono">
              #{ticket.ticket_number}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-80px)]">
          <div className="p-4 space-y-6">
            {/* Quick actions */}
            <div className="grid grid-cols-3 gap-3">
              {/* Status */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground text-right block">סטטוס</label>
                <Select value={ticket.status_id} onValueChange={handleStatusChange}>
                  <SelectTrigger className="text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((status) => (
                      <SelectItem key={status.id} value={status.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'w-2 h-2 rounded-full',
                              STATUS_TONE[status.key] || 'bg-muted-foreground'
                            )}
                          />
                          {status.name_hebrew || status.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground text-right block">משויך ל</label>
                <Select
                  value={ticket.assigned_to || 'unassigned'}
                  onValueChange={handleAssigneeChange}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">לא משויך</SelectItem>
                    {assignees.map((user) => {
                      const colors = getAssigneeColors(user.id);
                      return (
                        <SelectItem key={user.id} value={user.id}>
                          <div className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor: colors.bg,
                                border: `1px solid ${colors.border}`,
                              }}
                            />
                            <span>{user.name}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground text-right block">עדיפות</label>
                <Select value={ticket.priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger className="text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">דחופה</SelectItem>
                    <SelectItem value="high">גבוהה</SelectItem>
                    <SelectItem value="normal">רגילה</SelectItem>
                    <SelectItem value="low">נמוכה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {canArchive && archiveStatus && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleStatusChange(archiveStatus.id)}
              >
                העבר לארכיון
              </Button>
            )}

            <Separator />

            {/* Submitter info */}
            <div className="space-y-3">
              <h4 className="font-medium text-right flex items-center gap-2 justify-end">
                פרטי הפונה
                <User className="h-4 w-4" />
              </h4>
              <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-right">
                <div className="flex items-center justify-end gap-2">
                  <span className="font-medium">{ticket.submitter_name}</span>
                </div>
                {ticket.submitter_email && (
                  <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                    <span>{ticket.submitter_email}</span>
                    <Mail className="h-3 w-3" />
                  </div>
                )}
                {ticket.submitter_phone && (
                  <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                    <span>{ticket.submitter_phone}</span>
                    <Phone className="h-3 w-3" />
                  </div>
                )}
                {ticket.submitter_company_name && (
                  <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                    <span>{ticket.submitter_company_name}</span>
                    <Building2 className="h-3 w-3" />
                  </div>
                )}
              </div>

              {/* Client match status */}
              {ticket.matched_client_id ? (
                <div className="flex items-center justify-end gap-2 text-sm text-primary">
                  <span>משויך ללקוח: {ticket.client_name}</span>
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              ) : ticket.is_new_lead ? (
                <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                  <Button variant="outline" size="sm" className="gap-1">
                    <Link2 className="h-3 w-3" />
                    שייך ללקוח
                  </Button>
                  <span>ליד חדש</span>
                  <AlertCircle className="h-4 w-4" />
                </div>
              ) : null}
            </div>

            <Separator />

            {/* Category */}
            <div className="flex items-center justify-end gap-2 text-sm">
              <span>
                {ticket.category_name}
                {ticket.subcategory_name && ` / ${ticket.subcategory_name}`}
              </span>
              <Tag className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="font-medium text-right">תיאור הפנייה</h4>
              <div className="bg-muted/50 rounded-lg p-3 text-right whitespace-pre-wrap">
                {ticket.description}
              </div>
            </div>

            {/* Dates */}
            <div className="flex items-center justify-end gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                נפתח: {formatDate(ticket.created_at)}
              </span>
              {ticket.resolved_at && (
                <span className="flex items-center gap-1 text-primary">
                  <CheckCircle2 className="h-3 w-3" />
                  הושלם: {formatDate(ticket.resolved_at)}
                </span>
              )}
            </div>

            <Separator />

            {/* Replies */}
            <div className="space-y-4">
              <h4 className="font-medium text-right flex items-center gap-2 justify-end">
                תגובות ({replies.length})
                <MessageSquare className="h-4 w-4" />
              </h4>

              {loadingReplies ? (
                <div className="text-center text-muted-foreground py-4">טוען...</div>
              ) : replies.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">אין תגובות</div>
              ) : (
                <div className="space-y-3">
                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      className={`rounded-lg p-3 ${
                        reply.is_internal
                          ? 'bg-muted/60 border border-border'
                          : reply.is_from_client
                          ? 'bg-primary/10 mr-6'
                          : 'bg-muted/40 ml-6'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(reply.created_at)}
                        </span>
                        <div className="flex items-center gap-2">
                          {reply.is_internal && (
                            <Badge variant="outline" className="text-xs bg-muted text-muted-foreground">
                              פנימי
                            </Badge>
                          )}
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[10px]">
                              {reply.sender_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{reply.sender_name}</span>
                        </div>
                      </div>
                      <p className="text-sm text-right whitespace-pre-wrap">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add reply */}
              <div className="space-y-2">
                <Textarea
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}

                  className="text-right min-h-[80px]"
                  dir="rtl"
                />
                <div className="flex items-center justify-between">
                  <Button
                    onClick={handleSubmitReply}
                    disabled={!newReply.trim() || submitting}
                    className="gap-2"
                  >
                    <Send className="h-4 w-4" />
                    {submitting ? 'שולח...' : 'שלח'}
                  </Button>
                  <label className="flex items-center gap-2 text-sm">
                    <span>הערה פנימית</span>
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
