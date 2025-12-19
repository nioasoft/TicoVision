/**
 * Disputes Page
 * Manage payment disputes from clients claiming "שילמתי"
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { collectionService } from '@/services/collection.service';
import { formatILS, formatIsraeliDate } from '@/lib/formatters';
import { toast } from 'sonner';
import type { PaymentDispute } from '@/types/collection.types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const DisputesPage: React.FC = () => {
  const [disputes, setDisputes] = useState<PaymentDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveDialog, setResolveDialog] = useState<{
    open: boolean;
    dispute: PaymentDispute | null;
  }>({ open: false, dispute: null });
  const [resolution, setResolution] = useState<'resolved_paid' | 'resolved_unpaid' | 'invalid'>(
    'resolved_paid'
  );
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadDisputes();
  }, []);

  const loadDisputes = async () => {
    setLoading(true);
    const result = await collectionService.getDisputedPayments();
    setLoading(false);

    if (result.error) {
      toast.error('שגיאה בטעינת מחלוקות', { description: result.error.message });
      return;
    }

    setDisputes(result.data || []);
  };

  const handleResolve = async () => {
    if (!resolveDialog.dispute) return;

    const result = await collectionService.resolveDispute(
      resolveDialog.dispute.id,
      resolution,
      notes || undefined
    );

    if (result.error) {
      toast.error('שגיאה בפתרון מחלוקת', { description: result.error.message });
      return;
    }

    toast.success('המחלוקת נפתרה בהצלחה');
    setResolveDialog({ open: false, dispute: null });
    setNotes('');
    loadDisputes();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center rtl:flex-row-reverse">
        <div>
          <h1 className="text-3xl font-bold rtl:text-right ltr:text-left">ניהול מחלוקות תשלום</h1>
          <p className="text-gray-500 rtl:text-right ltr:text-left">
            לקוחות שטוענים שכבר שילמו
          </p>
        </div>
        <Button variant="outline" onClick={loadDisputes} disabled={loading}>
          רענון
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="rtl:text-right ltr:text-left">
            מחלוקות פעילות ({disputes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center p-8 rtl:text-right ltr:text-left">טוען...</div>
          ) : disputes.length === 0 ? (
            <div className="text-center p-8 text-gray-500 rtl:text-right ltr:text-left">
              אין מחלוקות פעילות
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="rtl:text-right ltr:text-left">תאריך תביעה</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">לקוח</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">טענה</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">תאריך תשלום נטען</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">סכום נטען</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">אסמכתא</TableHead>
                  <TableHead className="rtl:text-right ltr:text-left">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.map((dispute) => (
                  <TableRow key={dispute.id}>
                    <TableCell className="rtl:text-right ltr:text-left">
                      {formatIsraeliDate(dispute.created_at)}
                    </TableCell>
                    <TableCell className="rtl:text-right ltr:text-left font-medium">
                      {dispute.client_id}
                    </TableCell>
                    <TableCell className="rtl:text-right ltr:text-left">
                      {dispute.dispute_reason || 'לא צוין'}
                    </TableCell>
                    <TableCell className="rtl:text-right ltr:text-left">
                      {dispute.claimed_payment_date
                        ? formatIsraeliDate(dispute.claimed_payment_date)
                        : '-'}
                    </TableCell>
                    <TableCell className="rtl:text-right ltr:text-left">
                      {dispute.claimed_amount ? formatILS(dispute.claimed_amount) : '-'}
                    </TableCell>
                    <TableCell className="rtl:text-right ltr:text-left">
                      {dispute.claimed_reference || '-'}
                    </TableCell>
                    <TableCell className="rtl:text-right ltr:text-left">
                      <Button
                        size="sm"
                        onClick={() => setResolveDialog({ open: true, dispute })}
                        className="rtl:flex-row-reverse"
                      >
                        פתור
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog
        open={resolveDialog.open}
        onOpenChange={(open) => setResolveDialog({ open, dispute: null })}
      >
        <DialogContent className="rtl:text-right ltr:text-left">
          <DialogHeader>
            <DialogTitle className="rtl:text-right ltr:text-left">פתרון מחלוקת</DialogTitle>
            <DialogDescription className="rtl:text-right ltr:text-left">
              בחר תוצאה ורשום הערות
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="rtl:text-right ltr:text-left">תוצאה</Label>
              <Select value={resolution} onValueChange={(value: any) => setResolution(value)}>
                <SelectTrigger className="rtl:text-right ltr:text-left">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rtl:text-right ltr:text-left">
                  <SelectItem value="resolved_paid">אישרתי - שולם</SelectItem>
                  <SelectItem value="resolved_unpaid">לא מצאתי - לא שולם</SelectItem>
                  <SelectItem value="invalid">תביעה לא תקינה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolution-notes" className="rtl:text-right ltr:text-left">
                הערות
              </Label>
              <Textarea
                id="resolution-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="rtl:text-right ltr:text-left"
              />
            </div>
          </div>

          <DialogFooter className="rtl:flex-row-reverse gap-2">
            <Button onClick={handleResolve}>שמור</Button>
            <Button variant="outline" onClick={() => setResolveDialog({ open: false, dispute: null })}>
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

DisputesPage.displayName = 'DisputesPage';
