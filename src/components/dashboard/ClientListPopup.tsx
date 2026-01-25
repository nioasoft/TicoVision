/**
 * ClientListPopup Component
 * Show list of clients contributing to a specific metric with search and sort
 * Used for drilling down into budget, payment, and collection data
 */

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { formatILS } from '@/lib/payment-utils';
import { AmountDisplay } from '@/components/payments/AmountDisplay';
import { PaymentMethodBadge } from '@/components/payments/PaymentMethodBadge';
import { DeviationBadge } from '@/components/payments/DeviationBadge';
import type { PaymentMethod } from '@/types/collection.types';

interface ClientSummary {
  clientId: string;
  clientName: string;
  originalAmount: number;
  expectedAmount?: number;
  actualAmount?: number;
  paymentMethod?: PaymentMethod;
  hasDeviation?: boolean;
  deviationPercent?: number;
}

interface ClientListPopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  clients: ClientSummary[];
  totalBeforeVat: number;
  totalWithVat: number;
}

export function ClientListPopup({
  open,
  onOpenChange,
  title,
  clients,
  totalBeforeVat,
  totalWithVat,
}: ClientListPopupProps) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'amount'>('amount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filteredClients = useMemo(() => {
    let filtered = clients;

    // Filter by search
    if (search) {
      filtered = filtered.filter((c) =>
        c.clientName.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'name') {
        return sortDir === 'asc'
          ? a.clientName.localeCompare(b.clientName, 'he')
          : b.clientName.localeCompare(a.clientName, 'he');
      } else {
        const aAmount = a.actualAmount || a.expectedAmount || a.originalAmount;
        const bAmount = b.actualAmount || b.expectedAmount || b.originalAmount;
        return sortDir === 'asc' ? aAmount - bAmount : bAmount - aAmount;
      }
    });

    return filtered;
  }, [clients, search, sortBy, sortDir]);

  const hasExpectedAmount = clients.some((c) => c.expectedAmount !== undefined);
  const hasActualAmount = clients.some((c) => c.actualAmount !== undefined);
  const hasPaymentMethod = clients.some((c) => c.paymentMethod !== undefined);
  const hasDeviation = clients.some((c) => c.hasDeviation);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-xl">{title}</DialogTitle>
          <DialogDescription className="text-right">
            סה"כ {clients.length} לקוחות
          </DialogDescription>
        </DialogHeader>

        {/* Summary Card */}
        <Card className="p-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">סה"כ</div>
              <AmountDisplay beforeVat={totalBeforeVat} withVat={totalWithVat} />
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">ממוצע ללקוח</div>
              <div className="font-medium">
                {formatILS(totalBeforeVat / (clients.length || 1))}
              </div>
            </div>
          </div>
        </Card>

        {/* Filters */}
        <div className="flex gap-2">
          <Input

            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-right"
          />
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'name' | 'amount')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="amount">לפי סכום</SelectItem>
              <SelectItem value="name">לפי שם</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
          >
            {sortDir === 'asc' ? (
              <ArrowUp className="h-4 w-4" />
            ) : (
              <ArrowDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Client List */}
        <div className="overflow-y-auto max-h-[400px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="text-right">לקוח</TableHead>
                <TableHead className="text-right">סכום מקורי</TableHead>
                {hasExpectedAmount && <TableHead className="text-right">סכום מצופה</TableHead>}
                {hasActualAmount && <TableHead className="text-right">תשלום בפועל</TableHead>}
                {hasPaymentMethod && <TableHead className="text-right">אמצעי תשלום</TableHead>}
                {hasDeviation && <TableHead className="text-right">סטייה</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.clientId}>
                  <TableCell className="text-right font-medium">{client.clientName}</TableCell>
                  <TableCell className="text-right">{formatILS(client.originalAmount)}</TableCell>
                  {hasExpectedAmount && (
                    <TableCell className="text-right">
                      {client.expectedAmount ? formatILS(client.expectedAmount) : '-'}
                    </TableCell>
                  )}
                  {hasActualAmount && (
                    <TableCell className="text-right">
                      {client.actualAmount ? formatILS(client.actualAmount) : '-'}
                    </TableCell>
                  )}
                  {hasPaymentMethod && (
                    <TableCell className="text-right">
                      {client.paymentMethod && <PaymentMethodBadge method={client.paymentMethod} />}
                    </TableCell>
                  )}
                  {hasDeviation && (
                    <TableCell className="text-right">
                      {client.hasDeviation &&
                        client.deviationPercent !== undefined &&
                        client.expectedAmount !== undefined &&
                        client.actualAmount !== undefined && (
                          <DeviationBadge
                            deviationAmount={client.expectedAmount - client.actualAmount}
                            deviationPercent={client.deviationPercent}
                            alertLevel={
                              Math.abs(client.deviationPercent) > 5
                                ? 'critical'
                                : Math.abs(client.deviationPercent) > 1
                                ? 'warning'
                                : 'info'
                            }
                          />
                        )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center text-muted-foreground py-8">לא נמצאו לקוחות</div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            סגור
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
