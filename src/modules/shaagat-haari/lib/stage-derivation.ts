/**
 * Shaagat HaAri — Stage Derivation
 *
 * Pure function that maps an `InitialFilterRow` (from `shaagat_initial_filter_view`)
 * to the client's current lifecycle Stage and the recommended primary action.
 *
 * Used by the unified dashboard at `/shaagat-haari` to render a stage-aware
 * row badge + smart action button.
 *
 * RULES (priority order — first match wins):
 *   1. Submission paid in full           → 'paid_out'
 *   2. Submission exists, not closed     → 'submitted'
 *   3. Calculation approved by client    → 'approved_pending_submission'
 *   4. Calculation step 4, no approval   → 'awaiting_approval'
 *   5. Shaagat fee PAID                  → 'in_calculation'
 *   6. Accounting form submitted, unpaid → 'pending_payment'
 *   7. Eligible & email sent             → 'eligible_pending_form'
 *   8. Eligible & no email yet           → 'eligible_pending_email'
 *   9. Gray area                         → 'gray_area'
 *  10. Not eligible                      → 'not_eligible'
 *  11. Otherwise                         → 'not_checked'
 */

import type { InitialFilterRow } from '../services/shaagat.service';

export type Stage =
  | 'not_checked'
  | 'not_eligible'
  | 'gray_area'
  | 'eligible_pending_email'
  | 'eligible_pending_form'
  | 'pending_payment'
  | 'in_calculation'
  | 'awaiting_approval'
  | 'approved_pending_submission'
  | 'submitted'
  | 'paid_out';

/**
 * The kind of action to perform from the dashboard row. Each kind maps to a
 * concrete handler in the dashboard page (open dialog, navigate, send email…).
 */
export type StageActionKind =
  | 'check_eligibility'
  | 'recheck'
  | 'send_salary_form'
  | 'send_form_reminder'
  | 'send_payment_reminder'
  | 'open_calculation'
  | 'send_for_client_approval'
  | 'submit_to_tax_authority'
  | 'open_submission'
  | 'view_details';

export interface StagePrimaryAction {
  kind: StageActionKind;
  label: string;
  /** Optional Tailwind override; otherwise the table's default button styles apply. */
  variant?: 'default' | 'outline' | 'secondary';
}

export interface StageInfo {
  stage: Stage;
  /** Hebrew badge label */
  label: string;
  /** Tailwind classes for the badge (background + text) */
  badgeClassName: string;
  /** The single recommended action for this stage */
  primaryAction: StagePrimaryAction;
}

/**
 * Recommended display order for KPI counters and stage filter dropdowns.
 * Mirrors the natural lifecycle progression.
 */
export const STAGE_ORDER: Stage[] = [
  'not_checked',
  'not_eligible',
  'gray_area',
  'eligible_pending_email',
  'eligible_pending_form',
  'pending_payment',
  'in_calculation',
  'awaiting_approval',
  'approved_pending_submission',
  'submitted',
  'paid_out',
];

const STAGE_LABEL: Record<Stage, string> = {
  not_checked: 'טרם נבדק',
  not_eligible: 'לא זכאי',
  gray_area: 'תחום אפור',
  eligible_pending_email: 'זכאי – לא נשלח מייל',
  eligible_pending_form: 'ממתין למילוי טופס שכר',
  pending_payment: 'ממתין לתשלום שכ״ט שאגת הארי',
  in_calculation: 'בחישוב מפורט',
  awaiting_approval: 'ממתין לאישור הלקוח',
  approved_pending_submission: 'אושר – ממתין לשידור',
  submitted: 'שודר לרשות המסים',
  paid_out: 'שולם במלואו',
};

const STAGE_BADGE: Record<Stage, string> = {
  not_checked: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  not_eligible: 'bg-red-100 text-red-800 hover:bg-red-100',
  gray_area: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  eligible_pending_email: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  eligible_pending_form: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  pending_payment: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
  in_calculation: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-100',
  awaiting_approval: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
  approved_pending_submission: 'bg-teal-100 text-teal-800 hover:bg-teal-100',
  submitted: 'bg-sky-100 text-sky-800 hover:bg-sky-100',
  paid_out: 'bg-green-200 text-green-900 hover:bg-green-200',
};

const STAGE_ACTION: Record<Stage, StagePrimaryAction> = {
  not_checked: { kind: 'check_eligibility', label: 'בדוק זכאות', variant: 'default' },
  not_eligible: { kind: 'recheck', label: 'בדוק שוב', variant: 'outline' },
  gray_area: { kind: 'recheck', label: 'בדוק שוב', variant: 'outline' },
  eligible_pending_email: { kind: 'send_salary_form', label: 'שלח טופס שכר', variant: 'default' },
  eligible_pending_form: { kind: 'send_form_reminder', label: 'תזכורת ללקוח', variant: 'outline' },
  pending_payment: { kind: 'send_payment_reminder', label: 'תזכורת תשלום', variant: 'outline' },
  in_calculation: { kind: 'open_calculation', label: 'פתח חישוב', variant: 'default' },
  awaiting_approval: { kind: 'send_for_client_approval', label: 'שלח לאישור הלקוח', variant: 'default' },
  approved_pending_submission: { kind: 'submit_to_tax_authority', label: 'שדר לרשות', variant: 'default' },
  submitted: { kind: 'open_submission', label: 'פתח שידור', variant: 'outline' },
  paid_out: { kind: 'view_details', label: 'פרטים', variant: 'outline' },
};

function determineStage(row: InitialFilterRow): Stage {
  // Lifecycle is checked from the latest stage backwards: the most progressed
  // signal wins regardless of earlier flags being inconsistent.

  // 11 → paid_out
  if (
    row.submission_status === 'FULL_PAYMENT' ||
    row.submission_status === 'CLOSED'
  ) {
    return 'paid_out';
  }

  // 10 → submitted (any submission row that hasn't reached full payment)
  if (row.submission_id) {
    return 'submitted';
  }

  // 9 → approved_pending_submission
  if (row.client_approved === true) {
    return 'approved_pending_submission';
  }

  // 8 → awaiting_approval (calc done, no client approval yet)
  if (row.calculation_step === 4) {
    return 'awaiting_approval';
  }

  // 7 → in_calculation (paid Shaagat fee, calc not done)
  if (row.shaagat_fee_payment_status === 'PAID') {
    return 'in_calculation';
  }

  // 6 → pending_payment (client filled accounting form, fee not paid)
  if (row.accounting_submission_id) {
    return 'pending_payment';
  }

  // 5 → eligible_pending_form (eligible, email sent, no form yet)
  if (row.eligibility_status === 'ELIGIBLE' && row.email_sent === true) {
    return 'eligible_pending_form';
  }

  // 4 → eligible_pending_email (eligible, no email)
  if (row.eligibility_status === 'ELIGIBLE') {
    return 'eligible_pending_email';
  }

  // 3 → gray area
  if (row.eligibility_status === 'GRAY_AREA') {
    return 'gray_area';
  }

  // 2 → not eligible
  if (row.eligibility_status === 'NOT_ELIGIBLE') {
    return 'not_eligible';
  }

  // 1 → not yet checked
  return 'not_checked';
}

/**
 * Maps a dashboard row to its current stage + UI hints.
 *
 * Pure & side-effect-free. Safe to call inline from React renders.
 */
export function deriveStage(row: InitialFilterRow): StageInfo {
  const stage = determineStage(row);
  return {
    stage,
    label: STAGE_LABEL[stage],
    badgeClassName: STAGE_BADGE[stage],
    primaryAction: STAGE_ACTION[stage],
  };
}

/**
 * Counts rows per stage. Returns a Record with all stages present (zero when
 * empty) — convenient for KPI cards.
 */
export function countByStage(rows: InitialFilterRow[]): Record<Stage, number> {
  const counts: Record<Stage, number> = {
    not_checked: 0,
    not_eligible: 0,
    gray_area: 0,
    eligible_pending_email: 0,
    eligible_pending_form: 0,
    pending_payment: 0,
    in_calculation: 0,
    awaiting_approval: 0,
    approved_pending_submission: 0,
    submitted: 0,
    paid_out: 0,
  };
  for (const row of rows) {
    counts[determineStage(row)] += 1;
  }
  return counts;
}

/**
 * Stages that, taken together, represent "actively in the Shaagat HaAri
 * pipeline" — i.e. eligible AND moving toward submission. Used by the
 * "in process" KPI card.
 */
export const IN_PROCESS_STAGES: ReadonlySet<Stage> = new Set([
  'eligible_pending_email',
  'eligible_pending_form',
  'pending_payment',
  'in_calculation',
  'awaiting_approval',
  'approved_pending_submission',
]);
