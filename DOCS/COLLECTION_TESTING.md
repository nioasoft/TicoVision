# Collection System - Testing Plan

**Version**: 1.0
**Last Updated**: January 2025
**Status**: In Progress

---

## 📋 Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [E2E Tests](#e2e-tests)
5. [Performance Tests](#performance-tests)
6. [Security Tests](#security-tests)
7. [Manual Testing](#manual-testing)
8. [Test Data](#test-data)
9. [CI/CD Integration](#cicd-integration)

---

## Testing Strategy

### Testing Pyramid

```
              /\
             /  \
            / E2E \          10% - Full user flows
           /______\
          /        \
         /Integration\       30% - API & Services
        /____________\
       /              \
      /  Unit Tests    \     60% - Business logic
     /_________________ \
```

### Coverage Goals

| Type | Target Coverage | Current |
|------|----------------|---------|
| Unit Tests | >80% | 0% |
| Integration Tests | >70% | 0% |
| E2E Tests | Critical flows | 0% |
| Overall | >75% | 0% |

### Testing Tools

- **Unit & Integration**: Vitest
- **E2E**: Playwright
- **Performance**: Custom scripts + Playwright
- **Security**: Manual + Automated scans
- **Coverage**: c8 (built into Vitest)

---

## Unit Tests

### Test Structure

```typescript
// Example test file structure
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CollectionService } from '@/services/collection.service';

describe('CollectionService', () => {
  let service: CollectionService;

  beforeEach(() => {
    service = new CollectionService();
  });

  describe('getDashboardData', () => {
    it('should return dashboard data with correct structure', async () => {
      // Test implementation
    });

    it('should filter by status correctly', async () => {
      // Test implementation
    });

    it('should handle empty results', async () => {
      // Test implementation
    });
  });
});
```

### Service Tests

#### 1. `collection.service.test.ts`

**File**: `src/services/collection.service.test.ts`

```typescript
describe('CollectionService', () => {
  describe('getDashboardData', () => {
    it('returns correct KPIs', async () => {
      const result = await service.getDashboardData({});
      expect(result.data.kpis.total_expected).toBeGreaterThan(0);
      expect(result.data.kpis.collection_rate).toBeLessThanOrEqual(100);
    });

    it('filters by payment status', async () => {
      const result = await service.getDashboardData({
        filters: { status: 'sent_not_opened' }
      });
      expect(result.data.rows.every(r => !r.letter_opened)).toBe(true);
    });

    it('filters by payment method', async () => {
      const result = await service.getDashboardData({
        filters: { payment_method: 'bank_transfer' }
      });
      expect(result.data.rows.every(
        r => r.payment_method_selected === 'bank_transfer'
      )).toBe(true);
    });

    it('paginates results correctly', async () => {
      const page1 = await service.getDashboardData({
        pagination: { page: 1, page_size: 10 }
      });
      const page2 = await service.getDashboardData({
        pagination: { page: 2, page_size: 10 }
      });

      expect(page1.data.rows).toHaveLength(10);
      expect(page2.data.rows).toHaveLength(10);
      expect(page1.data.rows[0].client_id).not.toBe(page2.data.rows[0].client_id);
    });
  });

  describe('markAsPaid', () => {
    it('updates fee status to paid', async () => {
      const feeId = 'test-fee-id';
      await service.markAsPaid(feeId);

      const fee = await service.getFeeById(feeId);
      expect(fee.data.status).toBe('paid');
      expect(fee.data.payment_date).toBeDefined();
    });

    it('logs the payment action', async () => {
      const feeId = 'test-fee-id';
      await service.markAsPaid(feeId);

      // Verify audit log created
      const logs = await supabase.from('audit_logs')
        .select('*')
        .eq('resource_id', feeId)
        .eq('action', 'mark_as_paid');

      expect(logs.data).toHaveLength(1);
    });

    it('throws error if fee not found', async () => {
      await expect(
        service.markAsPaid('non-existent-id')
      ).rejects.toThrow('Fee not found');
    });
  });

  describe('markPartialPayment', () => {
    it('updates partial payment amount', async () => {
      const feeId = 'test-fee-id';
      const amount = 20000;

      await service.markPartialPayment(feeId, amount);

      const fee = await service.getFeeById(feeId);
      expect(fee.data.status).toBe('partial_paid');
      expect(fee.data.partial_payment_amount).toBe(amount);
    });

    it('marks as paid if partial >= total', async () => {
      const feeId = 'test-fee-id';
      const fee = await service.getFeeById(feeId);
      const totalAmount = fee.data.total_amount;

      await service.markPartialPayment(feeId, totalAmount);

      const updated = await service.getFeeById(feeId);
      expect(updated.data.status).toBe('paid');
    });

    it('throws error if amount exceeds remaining', async () => {
      const feeId = 'test-fee-id';
      const fee = await service.getFeeById(feeId);
      const excessAmount = fee.data.total_amount + 1000;

      await expect(
        service.markPartialPayment(feeId, excessAmount)
      ).rejects.toThrow('Amount exceeds remaining balance');
    });
  });

  describe('addInteraction', () => {
    it('creates interaction record', async () => {
      const interaction = {
        client_id: 'test-client',
        fee_id: 'test-fee',
        type: 'phone_call',
        subject: 'Test call',
        content: 'Called client'
      };

      const result = await service.addInteraction(interaction);
      expect(result.data.interaction_id).toBeDefined();
    });

    it('increments interaction count', async () => {
      const clientId = 'test-client';
      const before = await service.getClientInteractionCount(clientId);

      await service.addInteraction({
        client_id: clientId,
        type: 'note',
        subject: 'Test',
        content: 'Test'
      });

      const after = await service.getClientInteractionCount(clientId);
      expect(after).toBe(before + 1);
    });
  });
});
```

**Coverage Target**: >90%

---

#### 2. `payment-tracking.service.test.ts`

**File**: `src/services/payment-tracking.service.test.ts`

```typescript
describe('PaymentTrackingService', () => {
  describe('recordEmailOpen', () => {
    it('sets opened_at on first open', async () => {
      const letterId = 'test-letter';
      await service.recordEmailOpen(letterId);

      const letter = await supabase.from('generated_letters')
        .select('*')
        .eq('id', letterId)
        .single();

      expect(letter.data.opened_at).toBeDefined();
      expect(letter.data.open_count).toBe(1);
    });

    it('increments open_count on subsequent opens', async () => {
      const letterId = 'test-letter';

      await service.recordEmailOpen(letterId);
      await service.recordEmailOpen(letterId);

      const letter = await supabase.from('generated_letters')
        .select('*')
        .eq('id', letterId)
        .single();

      expect(letter.data.open_count).toBe(2);
    });

    it('does not change opened_at on subsequent opens', async () => {
      const letterId = 'test-letter';

      await service.recordEmailOpen(letterId);
      const firstOpen = await supabase.from('generated_letters')
        .select('opened_at')
        .eq('id', letterId)
        .single();

      await service.recordEmailOpen(letterId);
      const secondOpen = await supabase.from('generated_letters')
        .select('opened_at')
        .eq('id', letterId)
        .single();

      expect(firstOpen.data.opened_at).toBe(secondOpen.data.opened_at);
    });
  });

  describe('recordPaymentSelection', () => {
    it('creates selection record with correct discount', async () => {
      const result = await service.recordPaymentSelection({
        fee_id: 'test-fee',
        method: 'bank_transfer',
        original_amount: 50000
      });

      expect(result.data.discount_percent).toBe(9);
      expect(result.data.amount_after_discount).toBe(45500);
    });

    it('updates fee_calculations with selected method', async () => {
      await service.recordPaymentSelection({
        fee_id: 'test-fee',
        method: 'cc_single',
        original_amount: 50000
      });

      const fee = await supabase.from('fee_calculations')
        .select('*')
        .eq('id', 'test-fee')
        .single();

      expect(fee.data.payment_method_selected).toBe('cc_single');
      expect(fee.data.payment_method_selected_at).toBeDefined();
    });

    it('calculates correct discount for all methods', async () => {
      const testCases = [
        { method: 'bank_transfer', discount: 9 },
        { method: 'cc_single', discount: 8 },
        { method: 'cc_installments', discount: 4 },
        { method: 'checks', discount: 0 }
      ];

      for (const { method, discount } of testCases) {
        const result = await service.recordPaymentSelection({
          fee_id: `test-${method}`,
          method,
          original_amount: 50000
        });

        expect(result.data.discount_percent).toBe(discount);
      }
    });
  });

  describe('recordPaymentCompletion', () => {
    it('marks fee as paid', async () => {
      await service.recordPaymentCompletion({
        fee_id: 'test-fee',
        transaction_id: 'txn-123',
        amount: 45500
      });

      const fee = await supabase.from('fee_calculations')
        .select('*')
        .eq('id', 'test-fee')
        .single();

      expect(fee.data.status).toBe('paid');
      expect(fee.data.payment_date).toBeDefined();
    });

    it('marks selection as completed', async () => {
      const feeId = 'test-fee';

      await service.recordPaymentSelection({
        fee_id: feeId,
        method: 'cc_single',
        original_amount: 50000
      });

      await service.recordPaymentCompletion({
        fee_id: feeId,
        transaction_id: 'txn-123',
        amount: 46000
      });

      const selection = await supabase.from('payment_method_selections')
        .select('*')
        .eq('fee_calculation_id', feeId)
        .single();

      expect(selection.data.completed_payment).toBe(true);
    });
  });
});
```

**Coverage Target**: >85%

---

#### 3. `dispute.service.test.ts`

**File**: `src/services/dispute.service.test.ts`

```typescript
describe('DisputeService', () => {
  describe('createDispute', () => {
    it('creates dispute record', async () => {
      const dispute = {
        fee_id: 'test-fee',
        client_id: 'test-client',
        reason: 'שילמתי בהעברה',
        claimed_amount: 45500,
        claimed_date: '2025-01-10',
        claimed_method: 'העברה בנקאית'
      };

      const result = await service.createDispute(dispute);
      expect(result.data.dispute_id).toBeDefined();
      expect(result.data.status).toBe('pending');
    });

    it('sends notification to Sigal', async () => {
      const emailSpy = vi.spyOn(emailService, 'send');

      await service.createDispute({
        fee_id: 'test-fee',
        client_id: 'test-client',
        reason: 'Test dispute'
      });

      expect(emailSpy).toHaveBeenCalledWith({
        to: 'sigal@franco.co.il',
        subject: expect.stringContaining('לקוח טוען ששילם'),
        template: 'dispute_notification'
      });
    });
  });

  describe('resolveDispute', () => {
    it('resolves dispute as paid', async () => {
      const disputeId = 'test-dispute';

      await service.resolveDispute(disputeId, {
        status: 'resolved_paid',
        notes: 'מצאנו את התשלום'
      });

      const dispute = await supabase.from('payment_disputes')
        .select('*')
        .eq('id', disputeId)
        .single();

      expect(dispute.data.status).toBe('resolved_paid');
      expect(dispute.data.resolved_at).toBeDefined();
    });

    it('updates fee status when resolved as paid', async () => {
      const disputeId = 'test-dispute';
      const feeId = 'test-fee';

      await service.resolveDispute(disputeId, {
        status: 'resolved_paid',
        notes: 'Confirmed'
      });

      const fee = await supabase.from('fee_calculations')
        .select('*')
        .eq('id', feeId)
        .single();

      expect(fee.data.status).toBe('paid');
    });

    it('does not update fee when resolved as unpaid', async () => {
      const disputeId = 'test-dispute';
      const feeId = 'test-fee';

      const before = await supabase.from('fee_calculations')
        .select('status')
        .eq('id', feeId)
        .single();

      await service.resolveDispute(disputeId, {
        status: 'resolved_unpaid',
        notes: 'לא מצאנו'
      });

      const after = await supabase.from('fee_calculations')
        .select('status')
        .eq('id', feeId)
        .single();

      expect(before.data.status).toBe(after.data.status);
    });
  });
});
```

**Coverage Target**: >85%

---

#### 4. `reminder.service.test.ts`

**File**: `src/services/reminder.service.test.ts`

```typescript
describe('ReminderService', () => {
  describe('sendManualReminder', () => {
    it('sends email with correct template', async () => {
      const emailSpy = vi.spyOn(emailService, 'send');

      await service.sendManualReminder({
        fee_id: 'test-fee',
        template_id: 'reminder_no_selection_14d'
      });

      expect(emailSpy).toHaveBeenCalledWith({
        template: 'reminder_no_selection_14d',
        variables: expect.objectContaining({
          client_name: expect.any(String),
          amount: expect.any(Number)
        })
      });
    });

    it('creates reminder record', async () => {
      const feeId = 'test-fee';

      await service.sendManualReminder({
        fee_id: feeId,
        template_id: 'reminder_no_selection_14d'
      });

      const reminder = await supabase.from('payment_reminders')
        .select('*')
        .eq('fee_calculation_id', feeId)
        .order('sent_at', { ascending: false })
        .limit(1)
        .single();

      expect(reminder.data).toBeDefined();
      expect(reminder.data.template_used).toBe('reminder_no_selection_14d');
    });

    it('increments reminder count', async () => {
      const feeId = 'test-fee';

      const before = await supabase.from('fee_calculations')
        .select('reminder_count')
        .eq('id', feeId)
        .single();

      await service.sendManualReminder({
        fee_id: feeId,
        template_id: 'test'
      });

      const after = await supabase.from('fee_calculations')
        .select('reminder_count')
        .eq('id', feeId)
        .single();

      expect(after.data.reminder_count).toBe(before.data.reminder_count + 1);
    });
  });

  describe('getReminderHistory', () => {
    it('returns all reminders for fee', async () => {
      const feeId = 'test-fee';

      const history = await service.getReminderHistory(feeId);

      expect(Array.isArray(history.data)).toBe(true);
      expect(history.data.every(r => r.fee_calculation_id === feeId)).toBe(true);
    });

    it('orders by sent_at DESC', async () => {
      const feeId = 'test-fee';

      const history = await service.getReminderHistory(feeId);

      for (let i = 1; i < history.data.length; i++) {
        const prev = new Date(history.data[i - 1].sent_at);
        const curr = new Date(history.data[i].sent_at);
        expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
      }
    });
  });
});
```

**Coverage Target**: >80%

---

### Running Unit Tests

```bash
# Run all unit tests
npm run test

# Run with coverage
npm run test:coverage

# Run specific test file
npm run test src/services/collection.service.test.ts

# Watch mode
npm run test:watch

# UI mode
npm run test:ui
```

---

## Integration Tests

### Test Structure

Integration tests test the interaction between services, database, and Edge Functions.

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { supabase } from '@/lib/supabase';

describe('Collection Dashboard Integration', () => {
  beforeAll(async () => {
    // Setup test data
  });

  afterAll(async () => {
    // Cleanup test data
  });

  it('complete payment flow works end-to-end', async () => {
    // Test implementation
  });
});
```

### Integration Test Cases

#### 1. Letter Send → Email Open → Payment Flow

**File**: `tests/integration/payment-flow.test.ts`

```typescript
describe('Complete Payment Flow', () => {
  it('tracks letter send to payment completion', async () => {
    // 1. Create fee calculation
    const fee = await createTestFee();

    // 2. Generate letter
    const letter = await templateService.generateLetter(
      'annual_fee',
      fee.client_id,
      { amount: 50000 }
    );

    // 3. Simulate email open
    await fetch(`/api/track-email-open?letter_id=${letter.id}`);

    // Verify letter tracking
    const tracked = await supabase.from('generated_letters')
      .select('*')
      .eq('id', letter.id)
      .single();

    expect(tracked.data.opened_at).toBeDefined();

    // 4. Simulate payment selection
    await fetch(
      `/api/track-payment-selection?fee_id=${fee.id}&method=bank_transfer`
    );

    // Verify selection recorded
    const selection = await supabase.from('payment_method_selections')
      .select('*')
      .eq('fee_calculation_id', fee.id)
      .single();

    expect(selection.data.selected_method).toBe('bank_transfer');

    // 5. Simulate Cardcom webhook (payment completed)
    await fetch('/api/cardcom-webhook', {
      method: 'POST',
      body: createMockCardcomWebhook(fee.id)
    });

    // Verify fee marked as paid
    const updated = await supabase.from('fee_calculations')
      .select('*')
      .eq('id', fee.id)
      .single();

    expect(updated.data.status).toBe('paid');
  });
});
```

---

#### 2. Reminder Engine Flow

**File**: `tests/integration/reminder-engine.test.ts`

```typescript
describe('Reminder Engine', () => {
  it('sends reminders based on rules', async () => {
    // 1. Create test fees
    const fees = await createTestFees([
      { days_since_sent: 7, opened: false },  // Should trigger "no_open_7d"
      { days_since_sent: 14, opened: true, payment_method_selected: null },  // Should trigger "no_selection_14d"
      { days_since_sent: 3, opened: true }  // Should not trigger
    ]);

    // 2. Run reminder engine
    await fetch('/api/cron/reminder-engine', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
    });

    // 3. Verify reminders sent
    const reminders = await supabase.from('payment_reminders')
      .select('*')
      .in('fee_calculation_id', fees.map(f => f.id));

    expect(reminders.data).toHaveLength(2);

    // 4. Verify email sent (mock)
    expect(emailService.send).toHaveBeenCalledTimes(2);
  });
});
```

---

#### 3. Dispute Flow

**File**: `tests/integration/dispute-flow.test.ts`

```typescript
describe('Dispute Flow', () => {
  it('handles dispute from creation to resolution', async () => {
    // 1. Create test fee
    const fee = await createTestFee({ status: 'sent' });

    // 2. Client submits dispute
    const disputeResponse = await fetch('/api/payment-dispute', {
      method: 'POST',
      body: JSON.stringify({
        fee_id: fee.id,
        client_id: fee.client_id,
        reason: 'שילמתי',
        claimed_amount: 45500,
        claimed_date: '2025-01-10'
      })
    });

    expect(disputeResponse.ok).toBe(true);

    // 3. Verify dispute created
    const dispute = await supabase.from('payment_disputes')
      .select('*')
      .eq('fee_calculation_id', fee.id)
      .single();

    expect(dispute.data.status).toBe('pending');

    // 4. Verify Sigal notified
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'sigal@franco.co.il',
        subject: expect.stringContaining('טוען ששילם')
      })
    );

    // 5. Sigal resolves dispute
    await fetch('/api/collection/resolve-dispute', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${USER_TOKEN}` },
      body: JSON.stringify({
        dispute_id: dispute.data.id,
        resolution_status: 'resolved_paid',
        resolution_notes: 'מצאנו את התשלום'
      })
    });

    // 6. Verify fee updated
    const updatedFee = await supabase.from('fee_calculations')
      .select('*')
      .eq('id', fee.id)
      .single();

    expect(updatedFee.data.status).toBe('paid');
  });
});
```

---

### Running Integration Tests

```bash
# Run integration tests
npm run test:integration

# Run with real Supabase instance
SUPABASE_URL=... SUPABASE_KEY=... npm run test:integration
```

---

## E2E Tests

### Test Framework: Playwright

```typescript
import { test, expect } from '@playwright/test';

test.describe('Collection Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Sigal
    await page.goto('/login');
    await page.fill('[name="email"]', 'sigal@franco.co.il');
    await page.fill('[name="password"]', 'test-password');
    await page.click('button[type="submit"]');

    // Navigate to dashboard
    await page.goto('/collections');
  });

  test('should display dashboard correctly', async ({ page }) => {
    // Test implementation
  });
});
```

### E2E Test Cases

#### 1. Dashboard Loading

**File**: `tests/e2e/dashboard.spec.ts`

```typescript
test('dashboard loads with all components', async ({ page }) => {
  // Wait for dashboard to load
  await page.waitForSelector('[data-testid="collection-kpis"]');

  // Verify KPIs displayed
  await expect(page.locator('[data-testid="kpi-total-expected"]')).toBeVisible();
  await expect(page.locator('[data-testid="kpi-collection-rate"]')).toBeVisible();

  // Verify filters displayed
  await expect(page.locator('[data-testid="status-filter"]')).toBeVisible();

  // Verify table displayed
  await expect(page.locator('[data-testid="collection-table"]')).toBeVisible();
});

test('KPIs show correct values', async ({ page }) => {
  const totalExpected = await page.locator('[data-testid="kpi-total-expected"]').textContent();
  expect(totalExpected).toMatch(/₪[\d,]+/);

  const collectionRate = await page.locator('[data-testid="kpi-collection-rate"]').textContent();
  expect(collectionRate).toMatch(/\d+%/);
});
```

---

#### 2. Filters Functionality

**File**: `tests/e2e/filters.spec.ts`

```typescript
test('status filter works', async ({ page }) => {
  // Select "Not opened" filter
  await page.click('[data-testid="status-filter"]');
  await page.click('[data-testid="status-filter-not-opened"]');
  await page.click('[data-testid="apply-filters"]');

  // Wait for table to reload
  await page.waitForLoadState('networkidle');

  // Verify all rows show "לא נפתח"
  const rows = await page.locator('[data-testid="table-row"]').all();
  for (const row of rows) {
    const opened = await row.getAttribute('data-opened');
    expect(opened).toBe('false');
  }
});

test('payment method filter works', async ({ page }) => {
  await page.selectOption('[data-testid="method-filter"]', 'bank_transfer');
  await page.click('[data-testid="apply-filters"]');

  await page.waitForLoadState('networkidle');

  const rows = await page.locator('[data-testid="table-row"]').all();
  for (const row of rows) {
    const method = await row.getAttribute('data-method');
    expect(method).toBe('bank_transfer');
  }
});

test('multiple filters work together', async ({ page }) => {
  await page.selectOption('[data-testid="status-filter"]', 'selected_not_paid');
  await page.selectOption('[data-testid="method-filter"]', 'cc_single');
  await page.click('[data-testid="apply-filters"]');

  await page.waitForLoadState('networkidle');

  const rowCount = await page.locator('[data-testid="table-row"]').count();
  expect(rowCount).toBeGreaterThan(0);
});
```

---

#### 3. Mark as Paid Flow

**File**: `tests/e2e/mark-paid.spec.ts`

```typescript
test('can mark fee as paid', async ({ page }) => {
  // Find first row
  const firstRow = page.locator('[data-testid="table-row"]').first();
  const clientName = await firstRow.getAttribute('data-client-name');

  // Click "Mark as Paid" button
  await firstRow.locator('[data-testid="btn-mark-paid"]').click();

  // Confirm in dialog
  await page.locator('[data-testid="confirm-mark-paid"]').click();

  // Wait for success message
  await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();
  await expect(page.locator('[data-testid="success-toast"]')).toContainText('סומן כשולם');

  // Verify row updated (should disappear from pending list or show "paid" badge)
  // This depends on current filters
});
```

---

#### 4. Partial Payment Flow

**File**: `tests/e2e/partial-payment.spec.ts`

```typescript
test('can mark partial payment', async ({ page }) => {
  const firstRow = page.locator('[data-testid="table-row"]').first();

  // Get original amount
  const originalAmount = await firstRow.locator('[data-testid="amount"]').textContent();

  // Click "Partial Payment"
  await firstRow.locator('[data-testid="btn-partial-payment"]').click();

  // Dialog opens
  await expect(page.locator('[data-testid="partial-payment-dialog"]')).toBeVisible();

  // Enter amount
  await page.fill('[name="amount_paid"]', '20000');
  await page.fill('[name="payment_reference"]', 'Check #123');

  // Submit
  await page.click('[data-testid="submit-partial-payment"]');

  // Wait for success
  await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();

  // Verify row updated
  const updatedAmount = await firstRow.locator('[data-testid="amount-remaining"]').textContent();
  expect(updatedAmount).toContain('25,500'); // Assuming original was 45,500
});
```

---

#### 5. Add Interaction Flow

**File**: `tests/e2e/add-interaction.spec.ts`

```typescript
test('can add interaction', async ({ page }) => {
  const firstRow = page.locator('[data-testid="table-row"]').first();

  // Click "Add Interaction"
  await firstRow.locator('[data-testid="btn-add-interaction"]').click();

  // Dialog opens
  await expect(page.locator('[data-testid="interaction-dialog"]')).toBeVisible();

  // Fill form
  await page.selectOption('[name="interaction_type"]', 'phone_call');
  await page.fill('[name="subject"]', 'התקשרתי ללקוח');
  await page.fill('[name="content"]', 'לא ענה, השארתי הודעה');
  await page.fill('[name="outcome"]', 'לנסות שוב מחר');

  // Submit
  await page.click('[data-testid="submit-interaction"]');

  // Verify success
  await expect(page.locator('[data-testid="success-toast"]')).toBeVisible();

  // Verify interaction count increased
  const count = await firstRow.locator('[data-testid="interaction-count"]').textContent();
  expect(parseInt(count!)).toBeGreaterThan(0);
});
```

---

### Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run specific test file
npm run test:e2e tests/e2e/dashboard.spec.ts

# Run with UI mode
npm run test:e2e -- --ui

# Generate HTML report
npm run test:e2e -- --reporter=html
```

---

## Performance Tests

### Goals

- Dashboard loads in <2s with 1,000 rows
- Reminder engine processes 1,000 rules in <5min
- Email sending 100 clients in <2min

### Test Cases

#### 1. Dashboard Load Performance

**File**: `tests/performance/dashboard-load.test.ts`

```typescript
test('dashboard loads quickly with 1000 clients', async ({ page }) => {
  // Create 1000 test fees (setup)
  await seedTestData(1000);

  // Measure load time
  const start = Date.now();
  await page.goto('/collections');
  await page.waitForSelector('[data-testid="collection-table"]');
  const end = Date.now();

  const loadTime = end - start;
  expect(loadTime).toBeLessThan(2000); // 2 seconds

  console.log(`Dashboard loaded in ${loadTime}ms`);
});

test('filtering is fast', async ({ page }) => {
  await seedTestData(10000);
  await page.goto('/collections');

  const start = Date.now();
  await page.selectOption('[data-testid="status-filter"]', 'sent_not_opened');
  await page.click('[data-testid="apply-filters"]');
  await page.waitForLoadState('networkidle');
  const end = Date.now();

  const filterTime = end - start;
  expect(filterTime).toBeLessThan(1000); // 1 second

  console.log(`Filtering completed in ${filterTime}ms`);
});
```

---

#### 2. Reminder Engine Performance

**File**: `tests/performance/reminder-engine.test.ts`

```typescript
test('processes 1000 rules quickly', async () => {
  // Create 1000 rules
  await seedReminderRules(1000);

  // Create 5000 fees
  await seedTestData(5000);

  const start = Date.now();

  // Run reminder engine
  await fetch('/api/cron/reminder-engine', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SERVICE_ROLE_KEY}` }
  });

  const end = Date.now();
  const executionTime = end - start;

  expect(executionTime).toBeLessThan(5 * 60 * 1000); // 5 minutes

  console.log(`Reminder engine completed in ${executionTime}ms`);
});
```

---

## Security Tests

### Manual Security Checklist

- [ ] **RLS Policies**: All tables have tenant isolation
- [ ] **Authentication**: All endpoints (except tracking) require JWT
- [ ] **Authorization**: Users can only access their tenant's data
- [ ] **Input Validation**: All inputs sanitized
- [ ] **SQL Injection**: No raw SQL with user input
- [ ] **XSS Protection**: All HTML outputs escaped
- [ ] **CSRF Protection**: Tokens validated on state-changing operations
- [ ] **Rate Limiting**: Endpoints have rate limits
- [ ] **Webhook Security**: Cardcom webhook validates IP
- [ ] **Sensitive Data**: API keys not exposed in frontend

### Automated Security Tests

```bash
# Run security audit
npm audit

# Check for vulnerable dependencies
npm audit fix

# Run OWASP dependency check
npm run security:check
```

---

## Manual Testing

### UAT Checklist (with Sigal)

#### Dashboard

- [ ] Dashboard loads quickly
- [ ] All KPIs display correctly
- [ ] KPIs update when filters applied
- [ ] All filters work
- [ ] Table sorts by column
- [ ] Pagination works
- [ ] Hebrew text displays correctly (RTL)
- [ ] Mobile responsive

#### Actions

- [ ] Mark as paid works
- [ ] Partial payment works
- [ ] Add interaction works
- [ ] Send manual reminder works
- [ ] View letter works
- [ ] View history works
- [ ] Resolve dispute works

#### Settings

- [ ] Can update notification settings
- [ ] Can update reminder rules
- [ ] Changes save correctly
- [ ] Alert preferences work

#### Email Templates

- [ ] All reminder emails render correctly
- [ ] Variables replaced correctly
- [ ] Hebrew text displays (RTL)
- [ ] Buttons work
- [ ] Tracking pixel works

---

## Test Data

### Test Client Data

```sql
-- Create test tenant
INSERT INTO tenants (id, name) VALUES ('test-tenant', 'Test Tenant');

-- Create test clients
INSERT INTO clients (id, tenant_id, company_name, company_name_hebrew, tax_id, contact_email)
VALUES
  ('client-1', 'test-tenant', 'ABC Ltd', 'ABC בע״מ', '123456789', 'client1@test.com'),
  ('client-2', 'test-tenant', 'XYZ Ltd', 'XYZ בע״מ', '987654321', 'client2@test.com');

-- Create test fees
INSERT INTO fee_calculations (
  id, tenant_id, client_id, year, base_amount, total_amount, status
)
VALUES
  ('fee-1', 'test-tenant', 'client-1', 2025, 50000, 59000, 'sent'),
  ('fee-2', 'test-tenant', 'client-2', 2025, 30000, 35400, 'paid');

-- Create test letters
INSERT INTO generated_letters (
  id, tenant_id, client_id, fee_calculation_id,
  generated_content_html, sent_at
)
VALUES
  ('letter-1', 'test-tenant', 'client-1', 'fee-1', '<html>...</html>', NOW() - INTERVAL '7 days'),
  ('letter-2', 'test-tenant', 'client-2', 'fee-2', '<html>...</html>', NOW() - INTERVAL '14 days');
```

### Seed Script

```bash
# Seed test data
npm run seed:test

# Seed performance test data (10k rows)
npm run seed:performance

# Clear test data
npm run seed:clear
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Collection System

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:integration
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Test Coverage Report

### Current Coverage (Target)

| Component | Unit | Integration | E2E | Overall |
|-----------|------|-------------|-----|---------|
| Services | >80% | >70% | - | >75% |
| Edge Functions | >70% | >80% | - | >75% |
| UI Components | >60% | - | Critical | >60% |
| **Overall** | **>70%** | **>70%** | **Critical** | **>75%** |

### Generating Coverage Report

```bash
# Generate coverage report
npm run test:coverage

# Open HTML report
open coverage/index.html

# View terminal summary
npm run test:coverage -- --reporter=verbose
```

---

**Last Updated**: January 2025
**Next Review**: After first test run
