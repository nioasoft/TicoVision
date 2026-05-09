/**
 * Shaagat HaAri Dashboard — Unified Page
 * Route: /shaagat-haari
 *
 * Single page for the entire Shaagat HaAri lifecycle. Lists every active client
 * for the tenant alongside their current pipeline Stage. Each row exposes a
 * single primary action that changes based on the stage:
 *
 *   טרם נבדק                  → "בדוק זכאות"           (QuickEligibilityDialog)
 *   זכאי – לא נשלח מייל       → "שלח טופס שכר"         (token + email)
 *   ממתין למילוי טופס שכר    → "תזכורת ללקוח"
 *   ממתין תשלום שכ"ט שאגתי  → "תזכורת תשלום"
 *   בחישוב מפורט             → "פתח חישוב"            (DetailedCalculationPage)
 *   חישוב הושלם              → "שלח לאישור הלקוח"
 *   אושר ע"י לקוח            → "שדר לרשות"
 *   שודר                       → "פתח שידור"            (TaxSubmissionsPage)
 *   שולם במלואו              → "פרטים"
 *
 * Secondary actions per row (⋯ menu):
 *   - סיווגי סיווג אחרים   → /shaagat-haari/eligibility/:clientId  (deep wizard)
 *   - היסטוריה              → /shaagat-haari/client/:clientId/history
 *   - סמן לא רלוונטי / החזר רלוונטיות
 */

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SearchField } from '@/components/ui/search-field';
import { Separator } from '@/components/ui/separator';
import {
  Award,
  Filter,
  Loader2,
  Map,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useShaagatStore } from '../store/shaagatStore';
import { shaagatService } from '../services/shaagat.service';
import { shaagatEmailService } from '../services/shaagat-email.service';
import { GRANT_CONSTANTS } from '../lib/grant-constants';
import { calculateEligibility } from '../lib/grant-calculations';
import {
  IN_PROCESS_STAGES,
  deriveStage,
} from '../lib/stage-derivation';
import {
  UnifiedClientsTable,
  type UnifiedClientsTableActions,
} from '../components/UnifiedClientsTable';
import {
  StageKPICards,
  type KPICardKey,
} from '../components/StageKPICards';
import {
  QuickEligibilityDialog,
  type QuickEligibilitySaveInput,
} from '../components/QuickEligibilityDialog';
import {
  AlphaFilterBar,
  type AlphaFilterValue,
  countsByAlpha,
  firstAlphaKey,
} from '../components/AlphaFilterBar';
import type { InitialFilterRow } from '../services/shaagat.service';
import type { StageActionKind } from '../lib/stage-derivation';

export const ShaagatDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const initialFilterRows = useShaagatStore((s) => s.initialFilterRows);
  const initialFilterLoading = useShaagatStore((s) => s.initialFilterLoading);
  const fetchInitialFilterRows = useShaagatStore(
    (s) => s.fetchInitialFilterRows
  );
  const markEligibilityEmailSent = useShaagatStore(
    (s) => s.markEligibilityEmailSent
  );
  const setEligibilityRelevance = useShaagatStore(
    (s) => s.setEligibilityRelevance
  );

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [kpiSelection, setKpiSelection] = useState<KPICardKey>('all');
  const [selectedLetter, setSelectedLetter] = useState<AlphaFilterValue>(null);
  const [dialogClient, setDialogClient] = useState<InitialFilterRow | null>(
    null
  );
  const [busyClientId, setBusyClientId] = useState<string | null>(null);
  const [showIrrelevant, setShowIrrelevant] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(searchInput), 250);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    void fetchInitialFilterRows();
  }, [fetchInitialFilterRows]);

  // ─── Filtering ────────────────────────────────────────────────────────────
  const filteredRows = useMemo(() => {
    let result = initialFilterRows;

    if (!showIrrelevant) {
      result = result.filter((r) => r.is_relevant !== false);
    }

    if (debouncedSearch.trim().length > 0) {
      const q = debouncedSearch.trim().toLowerCase();
      result = result.filter(
        (r) =>
          (r.company_name_hebrew?.toLowerCase().includes(q) ?? false) ||
          (r.company_name?.toLowerCase().includes(q) ?? false) ||
          r.tax_id.includes(q)
      );
    }

    if (kpiSelection !== 'all') {
      result = result.filter((row) => {
        const stage = deriveStage(row).stage;
        switch (kpiSelection) {
          case 'not_checked':
            return stage === 'not_checked';
          case 'in_process':
            return IN_PROCESS_STAGES.has(stage);
          case 'submitted':
            return stage === 'submitted';
          case 'paid_out':
            return stage === 'paid_out';
          case 'unpaid_retainer':
            return row.has_unpaid_annual_retainer;
          default:
            return true;
        }
      });
    }

    if (selectedLetter !== null) {
      result = result.filter(
        (row) =>
          firstAlphaKey(row.company_name_hebrew ?? row.company_name) ===
          selectedLetter
      );
    }

    return result;
  }, [
    initialFilterRows,
    debouncedSearch,
    kpiSelection,
    showIrrelevant,
    selectedLetter,
  ]);

  // Counts for the alpha bar are computed against everything visible BEFORE
  // the alpha filter is applied (otherwise the only highlighted letter would
  // be the currently-selected one).
  const alphaCounts = useMemo(() => {
    const base = showIrrelevant
      ? initialFilterRows
      : initialFilterRows.filter((r) => r.is_relevant !== false);
    return countsByAlpha(base);
  }, [initialFilterRows, showIrrelevant]);

  // ─── QuickEligibility save → DB ───────────────────────────────────────────
  const handleSaveEligibility = useCallback(
    async (input: QuickEligibilitySaveInput): Promise<boolean> => {
      const period = GRANT_CONSTANTS.INITIAL_FILTER_PERIOD;

      const eligibilityResult = calculateEligibility({
        revenueBase: input.baseRevenue,
        revenueComparison: input.comparisonRevenue,
        capitalRevenuesBase: 0,
        capitalRevenuesComparison: 0,
        selfAccountingRevenuesBase: 0,
        selfAccountingRevenuesComparison: 0,
        reportingType: period.reportingType,
        annualRevenue: GRANT_CONSTANTS.ANNUAL_REVENUE.MIN,
      });

      const result = await shaagatService.createEligibilityCheck({
        client_id: input.clientId,
        track_type: 'standard',
        business_type: 'regular',
        reporting_type: period.reportingType,
        annual_revenue: 0,
        revenue_base_period: input.baseRevenue,
        revenue_comparison_period: input.comparisonRevenue,
        revenue_base_period_label: period.comparisonLabel,
        revenue_comparison_period_label: period.currentLabel,
        net_revenue_base: eligibilityResult.netRevenueBase,
        net_revenue_comparison: eligibilityResult.netRevenueComparison,
        decline_percentage: eligibilityResult.declinePercentage,
        eligibility_status: input.status,
        compensation_rate: eligibilityResult.compensationRate,
      });

      if (result.error || !result.data) {
        toast.error('שמירת בדיקת הזכאות נכשלה', {
          description: result.error?.message,
        });
        return false;
      }

      toast.success('בדיקת הזכאות נשמרה');
      void fetchInitialFilterRows();
      return true;
    },
    [fetchInitialFilterRows]
  );

  // ─── Send salary form (token + email) ─────────────────────────────────────
  const handleSendSalaryForm = useCallback(
    async (row: InitialFilterRow) => {
      if (!row.eligibility_check_id) {
        toast.error('יש לבדוק זכאות לפני שליחת מייל');
        return;
      }

      setBusyClientId(row.client_id);

      const tokenResult = await shaagatService.createAccountingSubmissionToken(
        row.client_id
      );
      if (tokenResult.error || !tokenResult.data) {
        toast.error('יצירת קישור הטופס נכשלה', {
          description: tokenResult.error?.message,
        });
        setBusyClientId(null);
        return;
      }

      const sendResult = await shaagatEmailService.sendSalaryDataRequestEmail({
        clientId: row.client_id,
        eligibilityCheckId: row.eligibility_check_id,
        submissionToken: tokenResult.data.token,
      });

      if (sendResult.error) {
        toast.error('שליחת המייל נכשלה', {
          description: sendResult.error.message,
        });
        setBusyClientId(null);
        return;
      }

      await markEligibilityEmailSent(row.eligibility_check_id);
      toast.success('המייל נשלח ללקוח');
      setBusyClientId(null);
      void fetchInitialFilterRows();
    },
    [fetchInitialFilterRows, markEligibilityEmailSent]
  );

  // ─── Stage primary action dispatcher ──────────────────────────────────────
  const handlePrimaryAction = useCallback(
    (kind: StageActionKind, row: InitialFilterRow) => {
      switch (kind) {
        case 'check_eligibility':
        case 'recheck':
          setDialogClient(row);
          return;

        case 'send_salary_form':
          void handleSendSalaryForm(row);
          return;

        case 'send_form_reminder':
          void handleSendSalaryForm(row); // reuses the same email/token flow for now
          return;

        case 'send_payment_reminder':
          // Payment reminder is handled in the existing collection flow.
          // For now route the accountant to the client history so they can
          // see the status and follow up manually.
          toast.info('פתח את היסטוריית הלקוח כדי לטפל בתזכורת תשלום');
          navigate(`/shaagat-haari/client/${row.client_id}/history`);
          return;

        case 'open_calculation':
          if (row.eligibility_check_id) {
            navigate(`/shaagat-haari/calculation/${row.eligibility_check_id}`);
          }
          return;

        case 'send_for_client_approval':
          // Existing functionality lives in DetailedCalculationPage step 4.
          if (row.eligibility_check_id) {
            navigate(`/shaagat-haari/calculation/${row.eligibility_check_id}`);
          }
          return;

        case 'submit_to_tax_authority':
          navigate(`/shaagat-haari/submissions?clientId=${row.client_id}`);
          return;

        case 'open_submission':
          navigate(`/shaagat-haari/submissions?clientId=${row.client_id}`);
          return;

        case 'view_details':
          navigate(`/shaagat-haari/client/${row.client_id}/history`);
          return;
      }
    },
    [handleSendSalaryForm, navigate]
  );

  // ─── Secondary actions ────────────────────────────────────────────────────
  const tableActions: UnifiedClientsTableActions = useMemo(
    () => ({
      onPrimaryAction: handlePrimaryAction,
      onOpenDeepWizard: (row) =>
        navigate(`/shaagat-haari/eligibility/${row.client_id}`),
      onViewHistory: (row) =>
        navigate(`/shaagat-haari/client/${row.client_id}/history`),
      onToggleRelevance: async (row) => {
        if (!row.eligibility_check_id) {
          toast.error('יש לבדוק זכאות לפני שניתן לסמן רלוונטיות');
          return;
        }
        const next = row.is_relevant === false;
        await setEligibilityRelevance(row.eligibility_check_id, next);
        toast.success(
          next ? 'הלקוח חזר לרשימה הפעילה' : 'הלקוח סומן כלא רלוונטי'
        );
        void fetchInitialFilterRows();
      },
    }),
    [
      handlePrimaryAction,
      navigate,
      setEligibilityRelevance,
      fetchInitialFilterRows,
    ]
  );

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Award className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                מענקי שאגת הארי
              </h1>
              <p className="text-sm text-gray-500">
                כל לקוחות המשרד — שלב נוכחי לכל לקוח ופעולה אחת מומלצת
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/shaagat-haari/process')}
              className="gap-1.5"
            >
              <Map className="h-4 w-4" />
              מפת תהליך
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchInitialFilterRows()}
              disabled={initialFilterLoading}
              className="gap-1.5"
            >
              {initialFilterLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              רענן
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <StageKPICards
          rows={initialFilterRows}
          selected={kpiSelection}
          onSelect={setKpiSelection}
        />

        {/* Search + filters bar */}
        <Card className="border-gray-200">
          <CardContent className="py-3 px-4" dir="rtl">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[260px]">
                <SearchField
                  value={searchInput}
                  onChange={setSearchInput}
                  label="חיפוש"
                  placeholder="שם חברה או ח.פ."
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 self-center">
                <input
                  type="checkbox"
                  checked={showIrrelevant}
                  onChange={(e) => setShowIrrelevant(e.target.checked)}
                  className="h-4 w-4"
                />
                הצג גם לקוחות לא רלוונטיים
              </label>

              <div className="text-xs text-gray-400 self-center flex items-center gap-1">
                <Filter className="h-3 w-3" />
                {filteredRows.length} מתוך {initialFilterRows.length}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alphabet filter bar */}
        <AlphaFilterBar
          counts={alphaCounts}
          selected={selectedLetter}
          onSelect={setSelectedLetter}
          total={Object.values(alphaCounts).reduce((s, n) => s + n, 0)}
        />

        {/* Table */}
        <UnifiedClientsTable
          rows={filteredRows}
          loading={initialFilterLoading || busyClientId !== null}
          actions={tableActions}
        />
        <div className="mt-1 flex justify-center">
          <Separator className="max-w-[150px]" />
        </div>
      </div>

      {/* Quick eligibility dialog */}
      {dialogClient && (
        <QuickEligibilityDialog
          open={dialogClient !== null}
          onOpenChange={(open) => {
            if (!open) setDialogClient(null);
          }}
          clientId={dialogClient.client_id}
          clientLabel={
            dialogClient.company_name_hebrew ||
            dialogClient.company_name ||
            dialogClient.tax_id
          }
          onSave={handleSaveEligibility}
        />
      )}
    </div>
  );
};

export default ShaagatDashboardPage;
