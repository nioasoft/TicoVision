/**
 * AssignAuditorDialog - Select auditor + meeting date/time
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatIsraeliDate } from '@/lib/formatters';
import { supabase } from '@/lib/supabase';
import { annualBalanceService } from '../services/annual-balance.service';
import { useAnnualBalanceStore } from '../store/annualBalanceStore';
import type { AnnualBalanceSheetWithClient } from '../types/annual-balance.types';

interface AuditorOption {
  userId: string;
  email: string;
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
  const [meetingDate, setMeetingDate] = useState<Date | undefined>(undefined);
  const [meetingTime, setMeetingTime] = useState('');
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
          .in('role', ['accountant', 'admin']);

        if (!accessData) return;

        const auditorList: AuditorOption[] = [];
        for (const access of accessData) {
          try {
            const { data: authUser } = await supabase.rpc('get_user_with_auth', {
              p_user_id: access.user_id,
            });
            if (authUser && authUser.length > 0) {
              auditorList.push({
                userId: access.user_id,
                email: authUser[0].email,
              });
            }
          } catch {
            auditorList.push({
              userId: access.user_id,
              email: access.user_id,
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
    if (balanceCase?.meeting_date) {
      const d = new Date(balanceCase.meeting_date);
      setMeetingDate(d);
      setMeetingTime(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      );
    }
  }, [open, balanceCase]);

  const handleSubmit = async () => {
    if (!balanceCase || !auditorId) return;

    setSubmitting(true);
    setError(null);

    try {
      // Combine date and time
      let meetingDateTime: string | undefined;
      if (meetingDate) {
        const combined = new Date(meetingDate);
        if (meetingTime) {
          const [hours, minutes] = meetingTime.split(':');
          combined.setHours(Number(hours), Number(minutes), 0, 0);
        }
        meetingDateTime = combined.toISOString();
      }

      const result = await annualBalanceService.assignAuditor(
        balanceCase.id,
        auditorId,
        meetingDateTime
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
    setMeetingDate(undefined);
    setMeetingTime('');
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
                      {auditor.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Meeting Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium">תאריך פגישה:</label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-[180px] justify-start text-right font-normal',
                      !meetingDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {meetingDate ? formatIsraeliDate(meetingDate) : 'בחר תאריך'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={meetingDate}
                    onSelect={setMeetingDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Meeting Time */}
              <Input
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="w-[120px]"
                placeholder="שעה"
              />
            </div>
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
