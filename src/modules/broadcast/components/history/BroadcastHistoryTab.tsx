/**
 * Broadcast History Tab - View past broadcasts
 */

import React, { useState } from 'react';
import { useBroadcastStore } from '../../store/broadcastStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Eye, RefreshCw, History } from 'lucide-react';
import { BroadcastDetailDialog } from './BroadcastDetailDialog';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import type { BroadcastHistoryRow, BroadcastStatus } from '../../types/broadcast.types';

const statusConfig: Record<BroadcastStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'טיוטה', variant: 'secondary' },
  sending: { label: 'בשליחה', variant: 'default' },
  completed: { label: 'הושלם', variant: 'outline' },
  failed: { label: 'נכשל', variant: 'destructive' },
  cancelled: { label: 'בוטל', variant: 'secondary' },
};

export const BroadcastHistoryTab: React.FC = () => {
  const { broadcasts, broadcastsLoading, fetchBroadcasts } = useBroadcastStore();
  const [selectedBroadcast, setSelectedBroadcast] = useState<BroadcastHistoryRow | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const handleViewDetails = (broadcast: BroadcastHistoryRow) => {
    setSelectedBroadcast(broadcast);
    setDetailDialogOpen(true);
  };

  if (broadcastsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold rtl:text-right">היסטוריית הפצות</h2>
          <p className="text-sm text-muted-foreground rtl:text-right">
            צפה בכל ההפצות שנשלחו
          </p>
        </div>
        <Button variant="outline" onClick={fetchBroadcasts}>
          <RefreshCw className="h-4 w-4 ml-2" />
          רענן
        </Button>
      </div>

      {/* Table */}
      {broadcasts.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <History className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">אין היסטוריית הפצות</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                הפצות שתשלח יופיעו כאן
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="rtl:text-right">תאריך</TableHead>
                <TableHead className="rtl:text-right">שם ההפצה</TableHead>
                <TableHead className="rtl:text-right">רשימה</TableHead>
                <TableHead className="text-center">נמענים</TableHead>
                <TableHead className="text-center">נשלח</TableHead>
                <TableHead className="text-center">נפתח</TableHead>
                <TableHead className="text-center">סטטוס</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {broadcasts.map((broadcast) => {
                const status = statusConfig[broadcast.status];
                const openRate = broadcast.total_emails_sent > 0
                  ? Math.round((broadcast.total_emails_opened / broadcast.total_emails_sent) * 100)
                  : 0;

                return (
                  <TableRow key={broadcast.id}>
                    <TableCell className="rtl:text-right">
                      {format(new Date(broadcast.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                    </TableCell>
                    <TableCell className="font-medium rtl:text-right">
                      {broadcast.name}
                    </TableCell>
                    <TableCell className="rtl:text-right">
                      {broadcast.list_type === 'all' ? (
                        <span className="text-muted-foreground">כל הלקוחות</span>
                      ) : (
                        broadcast.list_name || '—'
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {broadcast.recipient_count}
                    </TableCell>
                    <TableCell className="text-center">
                      {broadcast.total_emails_sent}
                      {broadcast.total_emails_failed > 0 && (
                        <span className="text-destructive mr-1">
                          ({broadcast.total_emails_failed} נכשלו)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {broadcast.total_emails_opened}
                      {openRate > 0 && (
                        <span className="text-muted-foreground mr-1">
                          ({openRate}%)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={status.variant}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewDetails(broadcast)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Detail Dialog */}
      {selectedBroadcast && (
        <BroadcastDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          broadcastId={selectedBroadcast.id}
        />
      )}
    </div>
  );
};
