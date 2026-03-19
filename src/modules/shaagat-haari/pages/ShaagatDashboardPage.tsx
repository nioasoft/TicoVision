/**
 * Shaagat HaAri Dashboard — Main Page
 * Route: /shaagat-haari
 *
 * NOTE: Service and store imports are stubbed — wire up when shaagatStore is ready.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Award, Map, AlertTriangle } from 'lucide-react';
import { GrantKPICards, type GrantDashboardStats, type GrantKPIFilter } from '../components/GrantKPICards';
import { GrantFilters, type GrantFiltersState, type EligibilityFilterStatus } from '../components/GrantFilters';
import { GrantTable, type GrantTableRow, type GrantTableActions } from '../components/GrantTable';
import type { TrackType, ReportingType } from '../types/shaagat.types';

// ─────────────────────────────────────────────────────────────────────────────
// Mock data — replace with useShaagatStore() when store is ready
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_STATS: GrantDashboardStats = {
  total_clients: 87,
  email_sent: 72,
  requested_check: 54,
  eligible: 41,
  fee_paid: 38,
  calculation_completed: 29,
  client_approved: 24,
  submitted: 18,
  total_expected_grants: 4_230_000,
  total_received_grants: 1_150_000,
  upcoming_deadlines: 5,
  unpaid_advances: 3,
  open_objections: 2,
};

const MOCK_ROWS: GrantTableRow[] = [
  {
    eligibility_check_id: '1',
    client_id: 'c1',
    company_name: 'מסעדות כהן בע"מ',
    tax_id: '514123456',
    track_type: 'standard',
    reporting_type: 'monthly',
    eligibility_status: 'ELIGIBLE',
    decline_percentage: 38.5,
    payment_status: 'PAID',
    email_sent: true,
    calculation_id: 'calc1',
    calculation_completed: true,
    final_grant_amount: 124_800,
    client_approved: true,
    calculation_step: 4,
    submission_id: 'sub1',
    submission_status: 'IN_REVIEW',
    submission_number: '2026-1234567',
    is_relevant: true,
  },
  {
    eligibility_check_id: '2',
    client_id: 'c2',
    company_name: 'גרין טק מוצרים ירוקים',
    tax_id: '302456789',
    track_type: 'northern',
    reporting_type: 'bimonthly',
    eligibility_status: 'ELIGIBLE',
    decline_percentage: 65.2,
    payment_status: 'PAID',
    email_sent: true,
    calculation_id: 'calc2',
    calculation_completed: false,
    final_grant_amount: null,
    client_approved: null,
    calculation_step: 2,
    submission_id: null,
    submission_status: null,
    submission_number: null,
    is_relevant: true,
  },
  {
    eligibility_check_id: '3',
    client_id: 'c3',
    company_name: 'מרכז יופי ורדה',
    tax_id: '215987654',
    track_type: 'small',
    reporting_type: 'monthly',
    eligibility_status: 'NOT_ELIGIBLE',
    decline_percentage: 18.3,
    payment_status: null,
    email_sent: true,
    calculation_id: null,
    calculation_completed: null,
    final_grant_amount: null,
    client_approved: null,
    calculation_step: null,
    submission_id: null,
    submission_status: null,
    submission_number: null,
    is_relevant: true,
  },
  {
    eligibility_check_id: '4',
    client_id: 'c4',
    company_name: 'קבלני צפון שמואלי',
    tax_id: '511234567',
    track_type: 'contractor',
    reporting_type: 'monthly',
    eligibility_status: 'GRAY_AREA',
    decline_percentage: 22.8,
    payment_status: null,
    email_sent: false,
    calculation_id: null,
    calculation_completed: null,
    final_grant_amount: null,
    client_approved: null,
    calculation_step: null,
    submission_id: null,
    submission_status: null,
    submission_number: null,
    is_relevant: true,
  },
  {
    eligibility_check_id: '5',
    client_id: 'c5',
    company_name: 'מחסני דרום פריסה',
    tax_id: '514765432',
    track_type: 'standard',
    reporting_type: 'bimonthly',
    eligibility_status: 'ELIGIBLE',
    decline_percentage: 47.1,
    payment_status: 'UNPAID',
    email_sent: true,
    calculation_id: null,
    calculation_completed: null,
    final_grant_amount: null,
    client_approved: null,
    calculation_step: null,
    submission_id: null,
    submission_status: null,
    submission_number: null,
    is_relevant: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Deadline Alerts Strip
// ─────────────────────────────────────────────────────────────────────────────

interface DeadlineItem {
  company_name: string;
  type: string;
  due_date: string;
}

const MOCK_DEADLINES: DeadlineItem[] = [
  { company_name: 'מסעדות כהן', type: 'קביעת זכאות', due_date: '25/04/2026' },
  { company_name: 'גרין טק', type: 'מקדמה 60%', due_date: '28/04/2026' },
  { company_name: 'אופטיקה לוי', type: 'תשלום מלא', due_date: '03/05/2026' },
];

const DeadlineAlertsStrip: React.FC<{ deadlines: DeadlineItem[] }> = ({ deadlines }) => {
  if (deadlines.length === 0) return null;
  return (
    <Alert className="border-yellow-200 bg-yellow-50" dir="rtl">
      <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
      <AlertDescription>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="font-semibold text-yellow-800">דדליינים קרובים:</span>
          {deadlines.map((d, i) => (
            <span key={i} className="text-yellow-700">
              {d.company_name} — {d.type}{' '}
              <span className="font-medium">{d.due_date}</span>
            </span>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: GrantFiltersState = {
  search: '',
  eligibilityStatus: 'all',
  trackType: 'all',
  reportingType: 'all',
  showIrrelevant: false,
};

export const ShaagatDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  // TODO: Replace with useShaagatStore() when available
  const [loading] = useState(false);
  const [statsLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const stats = MOCK_STATS;
  const allRows = MOCK_ROWS;

  const [filters, setFilters] = useState<GrantFiltersState>(DEFAULT_FILTERS);
  const [kpiFilter, setKpiFilter] = useState<GrantKPIFilter>('all');

  // Apply filters client-side (replace with server-side when store ready)
  const filteredRows = useMemo(() => {
    let result = [...allRows];

    // Relevance
    if (!filters.showIrrelevant) {
      result = result.filter((r) => r.is_relevant);
    }

    // KPI funnel filter
    if (kpiFilter === 'email_sent')            result = result.filter((r) => r.email_sent);
    else if (kpiFilter === 'eligible')         result = result.filter((r) => r.eligibility_status === 'ELIGIBLE');
    else if (kpiFilter === 'fee_paid')         result = result.filter((r) => r.payment_status === 'PAID');
    else if (kpiFilter === 'calculation_completed') result = result.filter((r) => r.calculation_completed);
    else if (kpiFilter === 'client_approved')  result = result.filter((r) => r.client_approved === true);
    else if (kpiFilter === 'submitted')        result = result.filter((r) => Boolean(r.submission_id));

    // Text search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.company_name.toLowerCase().includes(q) ||
          r.tax_id.includes(q),
      );
    }

    // Status filter
    if (filters.eligibilityStatus !== 'all') {
      const s = filters.eligibilityStatus as EligibilityFilterStatus;
      if (s === 'ELIGIBLE' || s === 'NOT_ELIGIBLE' || s === 'GRAY_AREA') {
        result = result.filter((r) => r.eligibility_status === s);
      } else if (s === 'fee_pending') {
        result = result.filter((r) => r.payment_status === 'UNPAID');
      } else if (s === 'fee_paid') {
        result = result.filter((r) => r.payment_status === 'PAID');
      } else if (s === 'calculation_done') {
        result = result.filter((r) => r.calculation_completed === true);
      } else if (s === 'submitted') {
        result = result.filter((r) => Boolean(r.submission_id));
      }
    }

    // Track filter
    if (filters.trackType !== 'all') {
      result = result.filter((r) => r.track_type === (filters.trackType as TrackType));
    }

    // Reporting type filter
    if (filters.reportingType !== 'all') {
      result = result.filter((r) => r.reporting_type === (filters.reportingType as ReportingType));
    }

    return result;
  }, [allRows, filters, kpiFilter]);

  const handleKpiFilterClick = useCallback((filter: GrantKPIFilter) => {
    setKpiFilter((prev) => (prev === filter ? 'all' : filter));
  }, []);

  const handleExport = useCallback(() => {
    // TODO: implement Excel export via XLSX
    console.log('Export', filteredRows);
  }, [filteredRows]);

  const tableActions: GrantTableActions = {
    onEligibilityCheck: (row) => navigate(`/shaagat-haari/eligibility/${row.client_id}`),
    onCalculate: (row) => navigate(`/shaagat-haari/calculation/${row.eligibility_check_id}`),
    onSendEmail: (row) => {
      // TODO: open send email dialog
      console.log('Send email to', row.company_name);
    },
    onViewHistory: (row) => navigate(`/shaagat-haari/client/${row.client_id}/history`),
    onToggleRelevance: (row) => {
      // TODO: call store toggleRelevance()
      console.log('Toggle relevance for', row.company_name);
    },
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-screen-2xl mx-auto px-4 py-6 space-y-4">

        {/* Page header */}
        <div className="flex items-center justify-between" dir="rtl">
          <div className="flex items-center gap-3">
            <Award className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">מענקי שאגת הארי</h1>
              <p className="text-sm text-gray-500">ניהול תהליך מענקי פיצוי — כל לקוחות המשרד</p>
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
              onClick={() => { /* TODO: refresh */ }}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              רענן
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive" dir="rtl">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* KPI Cards */}
        <GrantKPICards
          stats={stats}
          loading={statsLoading}
          selectedFilter={kpiFilter}
          onFilterClick={handleKpiFilterClick}
        />

        {/* Deadline alerts */}
        <DeadlineAlertsStrip deadlines={MOCK_DEADLINES} />

        {/* Filters + Table */}
        <Card className="border-gray-200">
          <CardContent className="pt-4 pb-2 px-4 space-y-3">
            <GrantFilters
              filters={filters}
              onChange={(f) => {
                setFilters(f);
                setKpiFilter('all');
              }}
              onExport={handleExport}
              resultCount={filteredRows.length}
            />
            <GrantTable
              rows={filteredRows}
              loading={loading}
              actions={tableActions}
            />

            {/* Pagination placeholder */}
            <div className="flex items-center justify-center py-2 text-xs text-gray-400">
              {filteredRows.length} תוצאות מוצגות
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ShaagatDashboardPage;
