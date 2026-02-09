/**
 * UpdateAdvancesDialog - Update tax advances amount and optional letter link
 * Available to accountant and admin roles
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { annualBalanceService } from '../services/annual-balance.service';
import { useAnnualBalanceStore } from '../store/annualBalanceStore';
import { updateAdvancesSchema } from '../types/validation';
import type { AnnualBalanceSheetWithClient } from '../types/annual-balance.types';

interface UpdateAdvancesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balanceCase: AnnualBalanceSheetWithClient | null;
}

export const UpdateAdvancesDialog: React.FC<UpdateAdvancesDialogProps> = ({
  open,
  onOpenChange,
  balanceCase,
}) => {
  const [amount, setAmount] = useState('');
  const [selectedLetterId, setSelectedLetterId] = useState('');
  const [letters, setLetters] = useState<Array<{ id: string; subject: string; created_at: string }>>([]);
  const [loadingLetters, setLoadingLetters] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshData, updateAdvanceRate } = useAnnualBalanceStore();

  // Advance rate fields
  const [taxAmount, setTaxAmount] = useState('');
  const [turnover, setTurnover] = useState('');
  const [currentRate, setCurrentRate] = useState('');

  useEffect(() => {
    if (open && balanceCase) {
      if (balanceCase.new_advances_amount) {
        setAmount(String(balanceCase.new_advances_amount));
      }
      if (balanceCase.advances_letter_id) {
        setSelectedLetterId(balanceCase.advances_letter_id);
      }
      // Pre-fill advance rate fields
      if (balanceCase.tax_amount != null) setTaxAmount(String(balanceCase.tax_amount));
      if (balanceCase.turnover != null) setTurnover(String(balanceCase.turnover));
      if (balanceCase.current_advance_rate != null) setCurrentRate(String(balanceCase.current_advance_rate * 100));
      // Fetch letters for this client
      fetchLetters(balanceCase.client_id);
    }
  }, [open, balanceCase]);

  const fetchLetters = async (clientId: string) => {
    setLoadingLetters(true);
    try {
      const { data } = await supabase
        .from('generated_letters')
        .select('id, subject, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(50);
      setLetters(data ?? []);
    } catch {
      // Silently fail - letter link is optional
    }
    setLoadingLetters(false);
  };

  const handleSubmit = async () => {
    if (!balanceCase) return;

    const numAmount = parseFloat(amount);

    // Zod validation
    const validation = updateAdvancesSchema.safeParse({
      amount: numAmount,
      letterId: selectedLetterId || undefined,
    });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Save advance rate fields if provided
      const numTaxAmount = parseFloat(taxAmount);
      const numTurnover = parseFloat(turnover);
      const numCurrentRate = parseFloat(currentRate) / 100; // Convert from % to decimal
      if (!isNaN(numTaxAmount) && !isNaN(numTurnover) && !isNaN(numCurrentRate)) {
        await updateAdvanceRate(balanceCase.id, {
          taxAmount: numTaxAmount,
          turnover: numTurnover,
          currentAdvanceRate: numCurrentRate,
        });
      }

      const result = await annualBalanceService.updateAdvances(
        balanceCase.id,
        numAmount,
        selectedLetterId || undefined
      );

      if (result.error) {
        setError(result.error.message);
        setSubmitting(false);
        return;
      }

      // Also advance status to advances_updated if at report_transmitted
      if (balanceCase.status === 'report_transmitted') {
        await annualBalanceService.updateStatus(balanceCase.id, 'advances_updated');
      }

      await refreshData();
      onOpenChange(false);
    } catch {
      setError('שגיאה בעדכון מקדמות');
    }
    setSubmitting(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setAmount('');
    setSelectedLetterId('');
    setLetters([]);
    setTaxAmount('');
    setTurnover('');
    setCurrentRate('');
    setError(null);
  };

  // Compute calculated rate for display
  const numTaxAmountDisplay = parseFloat(taxAmount);
  const numTurnoverDisplay = parseFloat(turnover);
  const numCurrentRateDisplay = parseFloat(currentRate);
  const calculatedRate = (!isNaN(numTaxAmountDisplay) && !isNaN(numTurnoverDisplay) && numTurnoverDisplay > 0)
    ? (numTaxAmountDisplay / numTurnoverDisplay * 100)
    : null;
  const hasAlert = calculatedRate !== null && !isNaN(numCurrentRateDisplay) && calculatedRate > numCurrentRateDisplay;

  if (!balanceCase) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">עדכון מקדמות</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            {balanceCase.client?.company_name} ({balanceCase.client?.tax_id})
          </div>

          {/* Advance rate calculation section */}
          <div className="space-y-3 rounded-md border bg-muted/30 p-3">
            <p className="text-sm font-medium">חישוב שיעור מקדמה:</p>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">חובת מס (₪):</label>
              <Input
                type="number"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
                min="0"
                step="0.01"
                className="rtl:text-right"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">מחזור (₪):</label>
              <Input
                type="number"
                value={turnover}
                onChange={(e) => setTurnover(e.target.value)}
                min="0"
                step="0.01"
                className="rtl:text-right"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">שיעור מקדמה נוכחי (%):</label>
              <Input
                type="number"
                value={currentRate}
                onChange={(e) => setCurrentRate(e.target.value)}
                min="0"
                max="100"
                step="0.01"
                className="rtl:text-right"
              />
            </div>

            {calculatedRate !== null && (
              <div className={cn(
                'rounded-md border p-3',
                hasAlert ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
              )}>
                <p className={cn('text-sm font-medium', hasAlert ? 'text-red-800' : 'text-green-800')}>
                  שיעור מחושב: {calculatedRate.toFixed(2)}%
                </p>
                {hasAlert && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <p className="text-sm text-red-800">שיעור מחושב גבוה מהשיעור הנוכחי - נדרש עדכון מקדמות!</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">סכום מקדמות חדש (₪):</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="0"
              step="0.01"
              className="rtl:text-right"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">קישור למכתב (אופציונלי):</label>
            <Select
              value={selectedLetterId}
              onValueChange={(val) => setSelectedLetterId(val === 'none' ? '' : val)}
              disabled={loadingLetters}
            >
              <SelectTrigger className="rtl:text-right">
                <SelectValue placeholder={loadingLetters ? 'טוען מכתבים...' : 'בחר מכתב'} />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="none">ללא מכתב</SelectItem>
                {letters.map((letter) => (
                  <SelectItem key={letter.id} value={letter.id}>
                    {letter.subject || 'מכתב'} - {new Date(letter.created_at).toLocaleDateString('he-IL')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 rtl:flex-row-reverse">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            ביטול
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !amount}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            עדכן מקדמות
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
