/**
 * Broadcast Detail Dialog
 * Shows detailed stats and recipient list for a broadcast
 */

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Eye,
  EyeOff,
} from 'lucide-react';
import { broadcastService } from '../../services/broadcast.service';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import type { BroadcastDetails, RecipientStatus } from '../../types/broadcast.types';

interface BroadcastDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  broadcastId: string;
}

const statusConfig: Record<RecipientStatus, { icon: React.ElementType; color: string }> = {
  pending: { icon: Clock, color: 'text-muted-foreground' },
  sent: { icon: CheckCircle2, color: 'text-green-600' },
  failed: { icon: XCircle, color: 'text-destructive' },
  skipped: { icon: EyeOff, color: 'text-amber-500' },
};

export const BroadcastDetailDialog: React.FC<BroadcastDetailDialogProps> = ({
  open,
  onOpenChange,
  broadcastId,
}) => {
  const [details, setDetails] = useState<BroadcastDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && broadcastId) {
      setLoading(true);
      broadcastService.getDetails(broadcastId).then(({ data }) => {
        setDetails(data);
        setLoading(false);
      });
    }
  }, [open, broadcastId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="rtl:text-right">
            {loading ? 'טוען...' : details?.name || 'פרטי הפצה'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : details ? (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
              <StatCard
                label="סה״כ נמענים"
                value={details.recipient_count}
                icon={Mail}
              />
              <StatCard
                label="נשלחו"
                value={details.stats.sent}
                icon={CheckCircle2}
                iconColor="text-green-600"
              />
              <StatCard
                label="נכשלו"
                value={details.stats.failed}
                icon={XCircle}
                iconColor={details.stats.failed > 0 ? 'text-destructive' : 'text-muted-foreground'}
              />
              <StatCard
                label="אחוז פתיחה"
                value={`${details.stats.open_rate}%`}
                icon={Eye}
                iconColor={details.stats.open_rate > 0 ? 'text-primary' : 'text-muted-foreground'}
              />
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">נושא: </span>
                <span className="font-medium">{details.subject}</span>
              </div>
              <div>
                <span className="text-muted-foreground">רשימה: </span>
                <span className="font-medium">
                  {details.list_type === 'all' ? 'כל הלקוחות' : details.list_name || '—'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">נוצר: </span>
                <span className="font-medium">
                  {format(new Date(details.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                </span>
              </div>
              {details.completed_at && (
                <div>
                  <span className="text-muted-foreground">הסתיים: </span>
                  <span className="font-medium">
                    {format(new Date(details.completed_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                  </span>
                </div>
              )}
            </div>

            {/* Recipients Table */}
            <div className="space-y-2">
              <h3 className="font-medium rtl:text-right">נמענים ({details.recipients.length})</h3>
              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="rtl:text-right w-[40px]">סטטוס</TableHead>
                      <TableHead className="rtl:text-right">שם</TableHead>
                      <TableHead className="rtl:text-right">אימייל</TableHead>
                      <TableHead className="rtl:text-right">נשלח</TableHead>
                      <TableHead className="rtl:text-right">נפתח</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {details.recipients.map((recipient) => {
                      const statusInfo = statusConfig[recipient.status];
                      const StatusIcon = statusInfo.icon;

                      return (
                        <TableRow key={recipient.id}>
                          <TableCell>
                            <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                          </TableCell>
                          <TableCell className="rtl:text-right font-medium">
                            {recipient.recipient_name || '—'}
                          </TableCell>
                          <TableCell className="rtl:text-right font-mono text-xs">
                            {recipient.email}
                          </TableCell>
                          <TableCell className="rtl:text-right text-xs">
                            {recipient.sent_at
                              ? format(new Date(recipient.sent_at), 'HH:mm', { locale: he })
                              : '—'}
                          </TableCell>
                          <TableCell className="rtl:text-right">
                            {recipient.opened_at ? (
                              <Badge variant="outline" className="text-xs">
                                <Eye className="h-3 w-3 ml-1" />
                                {recipient.open_count}x
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            לא נמצאו פרטים
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  iconColor?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, iconColor = 'text-muted-foreground' }) => (
  <div className="bg-muted/30 rounded-lg p-4 text-center">
    <Icon className={`h-5 w-5 mx-auto mb-2 ${iconColor}`} />
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
);
