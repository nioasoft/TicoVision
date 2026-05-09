/**
 * QuickEligibilityDialog
 *
 * Step 1 of the new internal Shaagat HaAri flow. The accountant enters two
 * numbers — Mar–Apr 2025 (base) and Mar–Apr 2026 (current) — and we instantly
 * show ELIGIBLE / GRAY_AREA / NOT_ELIGIBLE.
 *
 * Track-specific config (standard / northern / contractor / ...) is decided
 * later in the detailed eligibility check. Here we always treat it as
 * `track_type = 'standard'` and `reporting_type = 'bimonthly'`.
 */

import { useMemo, useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MoneyInput } from '@/components/ui/money-input';
import { CheckCircle2, AlertTriangle, XCircle, Loader2, Info } from 'lucide-react';
import { quickBimonthlyEligibility } from '../lib/grant-calculations';
import { GRANT_CONSTANTS } from '../lib/grant-constants';
import { formatPercentage } from '@/lib/formatters';
import type { EligibilityStatus } from '../types/shaagat.types';

export interface QuickEligibilitySaveInput {
  clientId: string;
  baseRevenue: number;
  comparisonRevenue: number;
  declinePercentage: number;
  status: EligibilityStatus;
}

interface QuickEligibilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientLabel: string;
  /** Persists the eligibility check to DB. Returns true on success. */
  onSave: (input: QuickEligibilitySaveInput) => Promise<boolean>;
}

const STATUS_THEME: Record<
  EligibilityStatus,
  {
    label: string;
    icon: typeof CheckCircle2;
    badgeClass: string;
    bgClass: string;
    textClass: string;
  }
> = {
  ELIGIBLE: {
    label: 'זכאי',
    icon: CheckCircle2,
    badgeClass: 'bg-green-100 text-green-800 hover:bg-green-100',
    bgClass: 'bg-green-50 border-green-200',
    textClass: 'text-green-700',
  },
  GRAY_AREA: {
    label: 'תחום אפור',
    icon: AlertTriangle,
    badgeClass: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    bgClass: 'bg-yellow-50 border-yellow-200',
    textClass: 'text-yellow-700',
  },
  NOT_ELIGIBLE: {
    label: 'לא זכאי',
    icon: XCircle,
    badgeClass: 'bg-red-100 text-red-800 hover:bg-red-100',
    bgClass: 'bg-red-50 border-red-200',
    textClass: 'text-red-700',
  },
};

export function QuickEligibilityDialog({
  open,
  onOpenChange,
  clientId,
  clientLabel,
  onSave,
}: QuickEligibilityDialogProps) {
  const [baseRevenue, setBaseRevenue] = useState<number | ''>('');
  const [comparisonRevenue, setComparisonRevenue] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  const result = useMemo(() => {
    if (typeof baseRevenue !== 'number' || typeof comparisonRevenue !== 'number') {
      return null;
    }
    if (baseRevenue <= 0) return null;
    return quickBimonthlyEligibility(baseRevenue, comparisonRevenue);
  }, [baseRevenue, comparisonRevenue]);

  const reset = useCallback(() => {
    setBaseRevenue('');
    setComparisonRevenue('');
    setSaving(false);
  }, []);

  const handleClose = useCallback(
    (next: boolean) => {
      if (saving) return;
      if (!next) reset();
      onOpenChange(next);
    },
    [onOpenChange, saving, reset]
  );

  const handleSave = useCallback(async () => {
    if (!result) return;
    if (typeof baseRevenue !== 'number' || typeof comparisonRevenue !== 'number') {
      return;
    }
    setSaving(true);
    const ok = await onSave({
      clientId,
      baseRevenue,
      comparisonRevenue,
      declinePercentage: result.declinePercentage,
      status: result.status,
    });
    setSaving(false);
    if (ok) {
      reset();
      onOpenChange(false);
    }
  }, [
    result,
    baseRevenue,
    comparisonRevenue,
    onSave,
    clientId,
    onOpenChange,
    reset,
  ]);

  const theme = result ? STATUS_THEME[result.status] : null;
  const Icon = theme?.icon;

  const period = GRANT_CONSTANTS.INITIAL_FILTER_PERIOD;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent dir="rtl" className="sm:max-w-lg">
        <DialogHeader className="text-right">
          <DialogTitle>בדיקת זכאות ראשונית</DialogTitle>
          <DialogDescription className="rtl:text-right">
            {clientLabel} — השוואת מחזור {period.currentLabel} מול {period.comparisonLabel}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="rtl:text-right">
              מחזור {period.comparisonLabel} (בסיס השוואה)
            </Label>
            <MoneyInput value={baseRevenue} onChange={setBaseRevenue} />
          </div>

          <div className="space-y-2">
            <Label className="rtl:text-right">
              מחזור {period.currentLabel} (תקופה נוכחית)
            </Label>
            <MoneyInput
              value={comparisonRevenue}
              onChange={setComparisonRevenue}
            />
          </div>

          {result && theme && Icon && (
            <Alert
              className={`${theme.bgClass} ${theme.textClass} flex items-start gap-3`}
              dir="rtl"
            >
              <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <AlertDescription className="flex-1 rtl:text-right space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={theme.badgeClass}>{theme.label}</Badge>
                  <span className="font-semibold">
                    ירידה של {formatPercentage(result.declinePercentage)}
                  </span>
                </div>
                {result.status === 'ELIGIBLE' && (
                  <p className="text-sm">
                    מעל סף המינימום של {formatPercentage(result.minThreshold)}.
                    סיווג מסלול סופי ייקבע בעמוד החישוב המפורט.
                  </p>
                )}
                {result.status === 'GRAY_AREA' && (
                  <p className="text-sm">
                    בתחום האפור ({formatPercentage(result.grayAreaMin)}–
                    {formatPercentage(result.minThreshold)}). אפשר לחזור
                    ולתקן את המחזורים אם יש בכך טעם, או להמשיך כרגיל.
                  </p>
                )}
                {result.status === 'NOT_ELIGIBLE' && (
                  <p className="text-sm">
                    מתחת לסף תחום האפור ({formatPercentage(result.grayAreaMin)}).
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {!result && (
            <Alert dir="rtl" className="flex items-start gap-3">
              <Info className="h-5 w-5 mt-0.5 flex-shrink-0 text-gray-500" />
              <AlertDescription className="rtl:text-right text-sm text-gray-600">
                הזן את שני המחזורים כדי לראות את התוצאה.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex gap-2 rtl:flex-row-reverse">
          <Button
            type="button"
            onClick={handleSave}
            disabled={!result || saving}
          >
            {saving && <Loader2 className="ms-2 h-4 w-4 animate-spin" />}
            שמור תוצאה
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={saving}
          >
            ביטול
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default QuickEligibilityDialog;
