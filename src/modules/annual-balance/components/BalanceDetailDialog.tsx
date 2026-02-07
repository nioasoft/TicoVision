/**
 * BalanceDetailDialog - Full detail view/edit of a single balance case
 * Shows timeline, fields, action buttons based on status and role
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Check, Circle, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatIsraeliDate, formatILSInteger } from '@/lib/formatters';
import { BalanceStatusBadge } from './BalanceStatusBadge';
import { annualBalanceService } from '../services/annual-balance.service';
import { useAnnualBalanceStore } from '../store/annualBalanceStore';
import {
  BALANCE_STATUSES,
  BALANCE_STATUS_CONFIG,
  getNextStatus,
  hasBalancePermission,
} from '../types/annual-balance.types';
import type {
  AnnualBalanceSheetWithClient,
  BalanceStatusHistory,
  BalanceStatus,
} from '../types/annual-balance.types';

interface BalanceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balanceCase: AnnualBalanceSheetWithClient | null;
  userRole: string;
  onMarkMaterials: (balanceCase: AnnualBalanceSheetWithClient) => void;
  onAssignAuditor: (balanceCase: AnnualBalanceSheetWithClient) => void;
  onUpdateStatus: (balanceCase: AnnualBalanceSheetWithClient) => void;
  onUpdateAdvances: (balanceCase: AnnualBalanceSheetWithClient) => void;
}

/**
 * Get the timestamp for a given status from the balance case record
 */
function getStatusTimestamp(
  balanceCase: AnnualBalanceSheetWithClient,
  status: BalanceStatus
): string | null {
  switch (status) {
    case 'waiting_for_materials':
      return balanceCase.created_at;
    case 'materials_received':
      return balanceCase.materials_received_at;
    case 'assigned_to_auditor':
      return balanceCase.meeting_date;
    case 'in_progress':
      return balanceCase.work_started_at;
    case 'work_completed':
      return balanceCase.work_completed_at;
    case 'office_approved':
      return balanceCase.office_approved_at;
    case 'report_transmitted':
      return balanceCase.report_transmitted_at;
    case 'advances_updated':
      return balanceCase.advances_updated_at;
    default:
      return null;
  }
}

export const BalanceDetailDialog: React.FC<BalanceDetailDialogProps> = ({
  open,
  onOpenChange,
  balanceCase,
  userRole,
  onMarkMaterials,
  onAssignAuditor,
  onUpdateStatus,
  onUpdateAdvances,
}) => {
  const [history, setHistory] = useState<BalanceStatusHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesChanged, setNotesChanged] = useState(false);
  const { refreshData } = useAnnualBalanceStore();

  useEffect(() => {
    if (!open || !balanceCase) return;

    setNotes(balanceCase.notes || '');
    setNotesChanged(false);
    setHistoryError(null);

    const fetchHistory = async () => {
      setLoadingHistory(true);
      const result = await annualBalanceService.getStatusHistory(balanceCase.id);
      if (result.error) {
        setHistoryError('שגיאה בטעינת היסטוריה');
      } else if (result.data) {
        setHistory(result.data);
      }
      setLoadingHistory(false);
    };
    fetchHistory();
  }, [open, balanceCase]);

  const handleSaveNotes = async () => {
    if (!balanceCase) return;
    setSavingNotes(true);
    const result = await annualBalanceService.updateNotes(balanceCase.id, notes);
    if (!result.error) {
      setNotesChanged(false);
      await refreshData();
    }
    setSavingNotes(false);
  };

  if (!balanceCase) return null;

  const currentStatusIndex = BALANCE_STATUSES.indexOf(balanceCase.status);
  const nextStatus = getNextStatus(balanceCase.status);

  // Determine which action button to show
  const getActionButton = () => {
    if (!nextStatus) return null;

    if (balanceCase.status === 'waiting_for_materials' && hasBalancePermission(userRole, 'mark_materials')) {
      return (
        <Button onClick={() => { onOpenChange(false); onMarkMaterials(balanceCase); }}>
          סמן הגיע חומר
        </Button>
      );
    }

    if (balanceCase.status === 'materials_received' && hasBalancePermission(userRole, 'assign_auditor')) {
      return (
        <Button onClick={() => { onOpenChange(false); onAssignAuditor(balanceCase); }}>
          שייך מבקר
        </Button>
      );
    }

    if (balanceCase.status === 'report_transmitted' && hasBalancePermission(userRole, 'change_status')) {
      return (
        <Button onClick={() => { onOpenChange(false); onUpdateAdvances(balanceCase); }}>
          עדכן מקדמות
        </Button>
      );
    }

    if (hasBalancePermission(userRole, 'change_status')) {
      return (
        <Button onClick={() => { onOpenChange(false); onUpdateStatus(balanceCase); }}>
          <ArrowLeft className="h-4 w-4 ml-1" />
          {BALANCE_STATUS_CONFIG[nextStatus].label}
        </Button>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">
            {balanceCase.client?.company_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Header info */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              ח.פ. {balanceCase.client?.tax_id} | שנת {balanceCase.year}
            </div>
            <BalanceStatusBadge status={balanceCase.status} />
          </div>

          {/* Timeline */}
          <div className="space-y-1">
            <h3 className="text-sm font-medium mb-2">מהלך העבודה</h3>
            {loadingHistory ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>טוען היסטוריה...</span>
              </div>
            ) : historyError ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-2">
                <p className="text-xs text-red-800">{historyError}</p>
              </div>
            ) : (
              <div className="space-y-0">
                {BALANCE_STATUSES.map((status, index) => {
                  const config = BALANCE_STATUS_CONFIG[status];
                  const isCompleted = index < currentStatusIndex;
                  const isCurrent = index === currentStatusIndex;
                  const isFuture = index > currentStatusIndex;
                  const timestamp = getStatusTimestamp(balanceCase, status);
                  const historyEntry = history.find((h) => h.to_status === status);

                  return (
                    <div
                      key={status}
                      className={cn(
                        'flex items-start gap-3 py-1.5 ps-2',
                        isCurrent && 'bg-slate-50 rounded-md',
                        isFuture && 'opacity-40'
                      )}
                    >
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {isCompleted ? (
                          <Check className={cn('h-4 w-4', config.color)} />
                        ) : isCurrent ? (
                          <Circle className={cn('h-4 w-4 fill-current', config.color)} />
                        ) : (
                          <Circle className="h-4 w-4 text-gray-300" />
                        )}
                      </div>

                      {/* Label + date */}
                      <div className="flex-1 min-w-0">
                        <span className={cn('text-sm', isFuture ? 'text-gray-400' : 'text-gray-900')}>
                          {config.label}
                        </span>
                        {timestamp && !isFuture && (
                          <span className="text-xs text-muted-foreground mr-2">
                            {formatIsraeliDate(timestamp)}
                          </span>
                        )}
                        {historyEntry?.note && (
                          <p className="text-xs text-muted-foreground mt-0.5">{historyEntry.note}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-3 border-t pt-3">
            <h3 className="text-sm font-medium">פרטים</h3>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {balanceCase.auditor_id && (
                <div>
                  <span className="text-muted-foreground">מבקר:</span>
                  <span className="mr-1 font-medium">
                    {(balanceCase as Record<string, unknown>).auditor_name as string || (balanceCase as Record<string, unknown>).auditor_email as string || balanceCase.auditor_id}
                  </span>
                </div>
              )}

              {balanceCase.meeting_date && (
                <div>
                  <span className="text-muted-foreground">תאריך שיוך:</span>
                  <span className="mr-1">{formatIsraeliDate(balanceCase.meeting_date)}</span>
                </div>
              )}

              {balanceCase.new_advances_amount !== null && balanceCase.new_advances_amount !== undefined && (
                <div>
                  <span className="text-muted-foreground">מקדמות:</span>
                  <span className="mr-1 font-medium">{formatILSInteger(balanceCase.new_advances_amount)}</span>
                </div>
              )}

              <div>
                <span className="text-muted-foreground">מכתב חוב:</span>
                <span className="mr-1">{balanceCase.debt_letter_sent ? 'נשלח' : 'לא'}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">הערות</h3>
              {notesChanged && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="h-7 text-xs"
                >
                  {savingNotes && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
                  שמור
                </Button>
              )}
            </div>
            <Textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setNotesChanged(e.target.value !== (balanceCase.notes || ''));
              }}
              placeholder="הוסף הערות..."
              className="rtl:text-right resize-none"
              rows={3}
            />
          </div>

          {/* Action button */}
          <div className="border-t pt-3 flex justify-end">
            {getActionButton()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
