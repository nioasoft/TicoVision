/**
 * Tests for the pure stage-derivation logic that powers the unified dashboard.
 * One test per stage — each constructs the minimal row that should resolve to
 * that exact stage and verifies both `stage` and `primaryAction.kind`.
 */

import { describe, it, expect } from 'vitest';
import { deriveStage, countByStage, IN_PROCESS_STAGES } from '../stage-derivation';
import type { Stage } from '../stage-derivation';
import type { InitialFilterRow } from '../../services/shaagat.service';

function makeRow(overrides: Partial<InitialFilterRow> = {}): InitialFilterRow {
  return {
    client_id: 'c1',
    tenant_id: 't1',
    company_name: 'Test',
    company_name_hebrew: 'טסט',
    tax_id: '111',
    client_status: 'active',

    eligibility_check_id: null,
    eligibility_status: null,
    decline_percentage: null,
    compensation_rate: null,
    shaagat_fee_payment_status: null,
    email_sent: null,
    is_relevant: null,
    check_created_at: null,
    track_type: null,
    reporting_type: null,
    business_type: null,

    has_unpaid_annual_retainer: false,
    has_any_current_year_fee: true,

    accounting_submission_id: null,
    accounting_submitted_at: null,

    calculation_id: null,
    calculation_step: null,
    calculation_completed: null,
    client_approved: null,
    client_approved_at: null,
    final_grant_amount: null,

    submission_id: null,
    submission_status: null,
    submission_number: null,
    expected_amount: null,
    received_amount: null,
    advance_received: null,
    submission_is_closed: null,

    ...overrides,
  };
}

describe('deriveStage', () => {
  it('returns not_checked when there is no eligibility check', () => {
    const result = deriveStage(makeRow());
    expect(result.stage).toBe('not_checked');
    expect(result.primaryAction.kind).toBe('check_eligibility');
  });

  it('returns not_eligible when the latest check is NOT_ELIGIBLE', () => {
    const result = deriveStage(
      makeRow({ eligibility_check_id: 'e1', eligibility_status: 'NOT_ELIGIBLE' })
    );
    expect(result.stage).toBe('not_eligible');
    expect(result.primaryAction.kind).toBe('recheck');
  });

  it('returns gray_area when the latest check is GRAY_AREA', () => {
    const result = deriveStage(
      makeRow({ eligibility_check_id: 'e1', eligibility_status: 'GRAY_AREA' })
    );
    expect(result.stage).toBe('gray_area');
    expect(result.primaryAction.kind).toBe('recheck');
  });

  it('returns eligible_pending_email when ELIGIBLE and no email yet', () => {
    const result = deriveStage(
      makeRow({
        eligibility_check_id: 'e1',
        eligibility_status: 'ELIGIBLE',
        email_sent: false,
      })
    );
    expect(result.stage).toBe('eligible_pending_email');
    expect(result.primaryAction.kind).toBe('send_salary_form');
  });

  it('returns eligible_pending_form when email sent but no accounting submission', () => {
    const result = deriveStage(
      makeRow({
        eligibility_check_id: 'e1',
        eligibility_status: 'ELIGIBLE',
        email_sent: true,
      })
    );
    expect(result.stage).toBe('eligible_pending_form');
    expect(result.primaryAction.kind).toBe('send_form_reminder');
  });

  it('returns pending_payment when accounting form filled but Shaagat fee unpaid', () => {
    const result = deriveStage(
      makeRow({
        eligibility_check_id: 'e1',
        eligibility_status: 'ELIGIBLE',
        email_sent: true,
        accounting_submission_id: 'a1',
        shaagat_fee_payment_status: 'UNPAID',
      })
    );
    expect(result.stage).toBe('pending_payment');
    expect(result.primaryAction.kind).toBe('send_payment_reminder');
  });

  it('returns in_calculation when Shaagat fee paid and calc not at step 4', () => {
    const result = deriveStage(
      makeRow({
        eligibility_check_id: 'e1',
        eligibility_status: 'ELIGIBLE',
        email_sent: true,
        accounting_submission_id: 'a1',
        shaagat_fee_payment_status: 'PAID',
        calculation_id: 'c1',
        calculation_step: 2,
      })
    );
    expect(result.stage).toBe('in_calculation');
    expect(result.primaryAction.kind).toBe('open_calculation');
  });

  it('returns awaiting_approval when calc finished but client has not approved', () => {
    const result = deriveStage(
      makeRow({
        eligibility_check_id: 'e1',
        eligibility_status: 'ELIGIBLE',
        shaagat_fee_payment_status: 'PAID',
        calculation_id: 'c1',
        calculation_step: 4,
        client_approved: null,
      })
    );
    expect(result.stage).toBe('awaiting_approval');
    expect(result.primaryAction.kind).toBe('send_for_client_approval');
  });

  it('returns approved_pending_submission when client approved but no submission', () => {
    const result = deriveStage(
      makeRow({
        eligibility_check_id: 'e1',
        eligibility_status: 'ELIGIBLE',
        shaagat_fee_payment_status: 'PAID',
        calculation_id: 'c1',
        calculation_step: 4,
        client_approved: true,
      })
    );
    expect(result.stage).toBe('approved_pending_submission');
    expect(result.primaryAction.kind).toBe('submit_to_tax_authority');
  });

  it('returns submitted when a submission exists and is not closed', () => {
    const result = deriveStage(
      makeRow({
        eligibility_check_id: 'e1',
        client_approved: true,
        submission_id: 's1',
        submission_status: 'IN_REVIEW',
      })
    );
    expect(result.stage).toBe('submitted');
    expect(result.primaryAction.kind).toBe('open_submission');
  });

  it('returns paid_out when submission status is FULL_PAYMENT', () => {
    const result = deriveStage(
      makeRow({
        eligibility_check_id: 'e1',
        submission_id: 's1',
        submission_status: 'FULL_PAYMENT',
      })
    );
    expect(result.stage).toBe('paid_out');
    expect(result.primaryAction.kind).toBe('view_details');
  });

  it('returns paid_out when submission status is CLOSED', () => {
    const result = deriveStage(
      makeRow({
        eligibility_check_id: 'e1',
        submission_id: 's1',
        submission_status: 'CLOSED',
      })
    );
    expect(result.stage).toBe('paid_out');
  });
});

describe('countByStage', () => {
  it('returns zero counts for an empty list', () => {
    const counts = countByStage([]);
    for (const stage of Object.keys(counts) as Stage[]) {
      expect(counts[stage]).toBe(0);
    }
  });

  it('aggregates rows by stage', () => {
    const rows = [
      makeRow(),
      makeRow(),
      makeRow({ eligibility_check_id: 'e1', eligibility_status: 'NOT_ELIGIBLE' }),
      makeRow({
        eligibility_check_id: 'e2',
        eligibility_status: 'ELIGIBLE',
        email_sent: true,
      }),
    ];
    const counts = countByStage(rows);
    expect(counts.not_checked).toBe(2);
    expect(counts.not_eligible).toBe(1);
    expect(counts.eligible_pending_form).toBe(1);
  });
});

describe('IN_PROCESS_STAGES', () => {
  it('includes the active pipeline stages but not terminal ones', () => {
    expect(IN_PROCESS_STAGES.has('eligible_pending_email')).toBe(true);
    expect(IN_PROCESS_STAGES.has('in_calculation')).toBe(true);
    expect(IN_PROCESS_STAGES.has('approved_pending_submission')).toBe(true);
    // terminal / pre-pipeline
    expect(IN_PROCESS_STAGES.has('not_checked')).toBe(false);
    expect(IN_PROCESS_STAGES.has('not_eligible')).toBe(false);
    expect(IN_PROCESS_STAGES.has('submitted')).toBe(false);
    expect(IN_PROCESS_STAGES.has('paid_out')).toBe(false);
  });
});
