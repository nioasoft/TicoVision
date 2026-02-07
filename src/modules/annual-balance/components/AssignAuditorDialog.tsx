/**
 * AssignAuditorDialog - Select auditor (assignment date is auto-set)
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { annualBalanceService } from '../services/annual-balance.service';
import { useAnnualBalanceStore } from '../store/annualBalanceStore';
import { assignAuditorSchema } from '../types/validation';
import type { AnnualBalanceSheetWithClient } from '../types/annual-balance.types';

interface AuditorOption {
  userId: string;
  email: string;
  name: string;
}

interface AssignAuditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balanceCase: AnnualBalanceSheetWithClient | null;
}

export const AssignAuditorDialog: React.FC<AssignAuditorDialogProps> = ({
  open,
  onOpenChange,
  balanceCase,
}) => {
  const [auditorId, setAuditorId] = useState('');
  const [auditors, setAuditors] = useState<AuditorOption[]>([]);
  const [loadingAuditors, setLoadingAuditors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshData } = useAnnualBalanceStore();

  // Fetch available auditors (accountant role users in tenant)
  useEffect(() => {
    if (!open) return;

    const fetchAuditors = async () => {
      setLoadingAuditors(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const tenantId = user?.user_metadata?.tenant_id;
        if (!tenantId) return;

        const { data: accessData } = await supabase
          .from('user_tenant_access')
          .select('user_id, role')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .eq('role', 'accountant');

        if (!accessData) return;

        const auditorList: AuditorOption[] = [];
        for (const access of accessData) {
          try {
            const { data: authUser } = await supabase.rpc('get_user_with_auth', {
              p_user_id: access.user_id,
            });
            if (authUser && authUser.length > 0) {
              const fullName = authUser[0].full_name || '';
              auditorList.push({
                userId: access.user_id,
                email: authUser[0].email,
                name: fullName || authUser[0].email,
              });
            }
          } catch {
            auditorList.push({
              userId: access.user_id,
              email: access.user_id,
              name: access.user_id,
            });
          }
        }
        setAuditors(auditorList);
      } catch {
        setError('שגיאה בטעינת רשימת מבקרים');
      }
      setLoadingAuditors(false);
    };

    fetchAuditors();

    // Pre-fill if auditor already assigned
    if (balanceCase?.auditor_id) {
      setAuditorId(balanceCase.auditor_id);
    }
  }, [open, balanceCase]);

  const handleSubmit = async () => {
    if (!balanceCase) return;

    // Zod validation
    const validation = assignAuditorSchema.safeParse({ auditorId });
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const result = await annualBalanceService.assignAuditor(
        balanceCase.id,
        auditorId
      );

      if (result.error) {
        setError(result.error.message);
        setSubmitting(false);
        return;
      }

      await refreshData();
      onOpenChange(false);
    } catch {
      setError('שגיאה בשיוך מבקר');
    }
    setSubmitting(false);
  };

  const handleClose = () => {
    onOpenChange(false);
    setAuditorId('');
    setError(null);
  };

  if (!balanceCase) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">שיוך מבקר</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            {balanceCase.client?.company_name} ({balanceCase.client?.tax_id})
          </div>

          {/* Auditor Select */}
          <div className="space-y-2">
            <label className="text-sm font-medium">מבקר:</label>
            {loadingAuditors ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>טוען רשימת מבקרים...</span>
              </div>
            ) : (
              <Select value={auditorId} onValueChange={setAuditorId}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר מבקר" />
                </SelectTrigger>
                <SelectContent className="rtl:text-right">
                  {auditors.map((auditor) => (
                    <SelectItem key={auditor.userId} value={auditor.userId}>
                      {auditor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
          <Button
            onClick={handleSubmit}
            disabled={submitting || !auditorId}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
            שייך מבקר
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
