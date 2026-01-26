/**
 * Tico Tickets - Public Ticket Status Page
 * צפייה בסטטוס פנייה - ללא צורך בהתחברות
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Ticket,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageSquare,
  Send,
  User,
  Building2,
  ArrowLeft,
} from 'lucide-react';
import { ticketPublicService } from '../services/ticket-public.service';
import type { PublicTicketView } from '../types/ticket.types';

// Status colors
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: 'bg-primary/10', text: 'text-primary' },
  in_progress: { bg: 'bg-primary/10', text: 'text-primary' },
  on_hold: { bg: 'bg-muted', text: 'text-foreground' },
  in_review: { bg: 'bg-muted', text: 'text-foreground' },
  waiting_client: { bg: 'bg-muted', text: 'text-foreground' },
  completed: { bg: 'bg-muted', text: 'text-foreground' },
};

// Priority labels
const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: 'נמוכה', color: 'text-muted-foreground' },
  normal: { label: 'רגילה', color: 'text-foreground' },
  high: { label: 'גבוהה', color: 'text-primary' },
  urgent: { label: 'דחופה', color: 'text-destructive' },
};

export function PublicTicketStatus() {
  const { token } = useParams<{ token: string }>();

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<PublicTicketView | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);

  // Load ticket
  useEffect(() => {
    async function loadTicket() {
      if (!token) {
        setError('קישור לא תקין');
        setLoading(false);
        return;
      }

      const data = await ticketPublicService.getByToken(token);
      if (data) {
        setTicket(data);
      } else {
        setError('הפנייה לא נמצאה או שהקישור אינו תקף');
      }
      setLoading(false);
    }

    loadTicket();
  }, [token]);

  // Handle reply submit
  const handleSubmitReply = async () => {
    if (!token || !replyContent.trim()) return;

    setSubmittingReply(true);
    try {
      const result = await ticketPublicService.addClientReply(token, replyContent.trim());

      if (result.success) {
        toast.success('התגובה נשלחה בהצלחה');
        setReplyContent('');
        // Reload ticket to show new reply
        const updated = await ticketPublicService.getByToken(token);
        if (updated) setTicket(updated);
      } else {
        toast.error(result.error || 'שגיאה בשליחת התגובה');
      }
    } catch (error) {
      toast.error('שגיאה בשליחת התגובה');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center tico-tickets-theme" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">טוען פנייה...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 tico-tickets-theme" dir="rtl">
        <Card className="max-w-md w-full border-border">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-destructive mb-2">שגיאה</h2>
            <p className="text-muted-foreground">{error || 'הפנייה לא נמצאה'}</p>
            <Button
              variant="outline"
              className="mt-6"
              onClick={() => window.location.href = '/tico-tickets/new'}
            >
              <ArrowLeft className="h-4 w-4 ml-2" />
              פתח פנייה חדשה
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusColors = STATUS_COLORS[ticket.status_key] || STATUS_COLORS.new;
  const priorityInfo = PRIORITY_LABELS[ticket.priority] || PRIORITY_LABELS.normal;
  const isResolved = ticket.status_key === 'completed';

  return (
    <div className="min-h-screen bg-background py-8 px-4 tico-tickets-theme" dir="rtl">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ticket className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">פנייה #{ticket.ticket_number}</h1>
          <p className="text-muted-foreground mt-1">{ticket.tenant_name}</p>
        </div>

        {/* Status card */}
        <Card className="shadow-sm border-border mb-6">
          <CardHeader className="text-right">
            <div className="flex items-center justify-between">
              <Badge className={`${statusColors.bg} ${statusColors.text} border-0`}>
                {ticket.status_name}
              </Badge>
              <CardTitle className="text-xl">{ticket.subject}</CardTitle>
            </div>
            <CardDescription className="flex items-center gap-4 mt-2">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDate(ticket.created_at)}
              </span>
              <span className={priorityInfo.color}>עדיפות: {priorityInfo.label}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>
                {ticket.category_name}
                {ticket.subcategory_name && ` › ${ticket.subcategory_name}`}
              </span>
            </div>

            {/* Description */}
            <div className="bg-muted/40 rounded-lg p-4 text-right whitespace-pre-wrap">
              {ticket.description}
            </div>

            {/* Resolved notice */}
            {isResolved && ticket.resolved_at && (
              <Alert className="bg-primary/10 border-primary/20">
                <CheckCircle className="h-4 w-4 text-primary" />
                <AlertDescription className="text-foreground">
                  פנייה זו הושלמה בתאריך {formatDate(ticket.resolved_at)}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Replies */}
        <Card className="shadow-sm border-border mb-6">
          <CardHeader className="text-right">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              תכתובות ({ticket.replies.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {ticket.replies.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                אין תכתובות עדיין
              </p>
            ) : (
              ticket.replies.map((reply, index) => (
                <div key={reply.id}>
                  {index > 0 && <Separator className="my-4" />}
                  <div
                    className={`rounded-lg p-4 ${
                      reply.is_from_client
                        ? 'bg-primary/10 mr-8'
                        : 'bg-muted/40 ml-8'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">
                        {formatDate(reply.created_at)}
                      </span>
                      <span className="flex items-center gap-1 text-sm font-medium">
                        <User className="h-3 w-3" />
                        {reply.sender_name}
                      </span>
                    </div>
                    <p className="text-right whitespace-pre-wrap">{reply.content}</p>
                  </div>
                </div>
              ))
            )}

            {/* Add reply form */}
            {!isResolved && (
              <>
                <Separator className="my-6" />
                <div className="space-y-4">
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}

                    className="text-right min-h-[100px]"
                    dir="rtl"
                  />
                  <Button
                    onClick={handleSubmitReply}
                    disabled={!replyContent.trim() || submittingReply}
                    className="gap-2"
                  >
                    {submittingReply ? (
                      'שולח...'
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        שלח תגובה
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <Button
            variant="link"
            onClick={() => window.location.href = '/tico-tickets/new'}
          >
            פתח פנייה חדשה
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          TicoVision CRM - מערכת ניהול פניות
        </p>
      </div>
    </div>
  );
}
