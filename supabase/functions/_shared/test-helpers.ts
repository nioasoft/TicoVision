/**
 * Test Helpers for Collection Reminder Engine
 * Utilities for testing reminder engine and alert monitor
 *
 * Usage:
 * ```typescript
 * import { createTestFee, createTestReminderRule } from '../_shared/test-helpers.ts';
 *
 * const feeId = await createTestFee(supabase, tenantId, clientId, 7);
 * const ruleId = await createTestReminderRule(supabase, tenantId, 'no_open', 7);
 * ```
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

type SupabaseClient = ReturnType<typeof createClient>;

/**
 * Create a test fee calculation
 * @param daysAgo - How many days ago the fee was created (for testing reminders)
 */
export async function createTestFee(
  supabase: SupabaseClient,
  tenantId: string,
  clientId: string,
  daysAgo: number = 0
): Promise<string> {
  const createdAt = new Date();
  createdAt.setDate(createdAt.getDate() - daysAgo);

  const { data, error } = await supabase
    .from('fee_calculations')
    .insert({
      tenant_id: tenantId,
      client_id: clientId,
      year: new Date().getFullYear(),
      base_amount: 10000,
      total_amount: 10000,
      status: 'sent',
      created_at: createdAt.toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create test fee: ${error.message}`);
  }

  console.log(`✅ Test fee created: ${data.id} (${daysAgo} days ago)`);
  return data.id;
}

/**
 * Create a test generated letter
 */
export async function createTestLetter(
  supabase: SupabaseClient,
  tenantId: string,
  clientId: string,
  feeId: string,
  options: {
    opened?: boolean;
    daysAgoSent?: number;
    daysAgoOpened?: number;
  } = {}
): Promise<string> {
  const sentDate = new Date();
  sentDate.setDate(sentDate.getDate() - (options.daysAgoSent || 0));

  const openedDate = options.opened && options.daysAgoOpened !== undefined
    ? new Date(sentDate.getTime() + (options.daysAgoOpened * 24 * 60 * 60 * 1000))
    : null;

  const { data, error } = await supabase
    .from('generated_letters')
    .insert({
      tenant_id: tenantId,
      client_id: clientId,
      fee_calculation_id: feeId,
      template_id: 'test-template',
      generated_content_html: '<html><body>Test letter</body></html>',
      sent_at: sentDate.toISOString(),
      opened_at: openedDate?.toISOString() || null,
      open_count: options.opened ? 1 : 0,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create test letter: ${error.message}`);
  }

  console.log(`✅ Test letter created: ${data.id} (sent ${options.daysAgoSent || 0} days ago)`);
  return data.id;
}

/**
 * Create a test reminder rule
 */
export async function createTestReminderRule(
  supabase: SupabaseClient,
  tenantId: string,
  reminderType: 'no_open' | 'no_selection' | 'abandoned_cart' | 'checks_overdue',
  daysSince: number
): Promise<string> {
  const rules = {
    no_open: {
      name: `Test: Not Opened - ${daysSince}d`,
      trigger_conditions: {
        days_since_sent: daysSince,
        payment_status: ['sent'],
        opened: false,
        payment_method_selected: null,
      },
      actions: {
        send_email: true,
        email_template: 'reminder_no_open_7d',
        notify_admin: true,
        include_mistake_button: true,
      },
    },
    no_selection: {
      name: `Test: No Selection - ${daysSince}d`,
      trigger_conditions: {
        days_since_sent: daysSince,
        payment_status: ['sent'],
        opened: true,
        payment_method_selected: null,
      },
      actions: {
        send_email: true,
        email_template: 'reminder_no_selection_14d',
        notify_admin: true,
        include_mistake_button: true,
      },
    },
    abandoned_cart: {
      name: `Test: Abandoned Cardcom - ${daysSince}d`,
      trigger_conditions: {
        payment_method_selected: ['cc_single', 'cc_installments'],
        completed_payment: false,
        days_since_selection: daysSince,
      },
      actions: {
        send_email: true,
        email_template: 'reminder_abandoned_cart_2d',
        notify_admin: false,
        include_mistake_button: false,
      },
    },
    checks_overdue: {
      name: `Test: Checks Overdue - ${daysSince}d`,
      trigger_conditions: {
        payment_method_selected: 'checks',
        payment_status: ['sent'],
        days_since_selection: daysSince,
      },
      actions: {
        send_email: true,
        email_template: 'reminder_checks_overdue_30d',
        notify_admin: true,
        include_mistake_button: true,
      },
    },
  };

  const rule = rules[reminderType];

  const { data, error } = await supabase
    .from('reminder_rules')
    .insert({
      tenant_id: tenantId,
      name: rule.name,
      description: `Test rule for ${reminderType}`,
      trigger_conditions: rule.trigger_conditions,
      actions: rule.actions,
      is_active: true,
      priority: 10,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create test reminder rule: ${error.message}`);
  }

  console.log(`✅ Test reminder rule created: ${data.id}`);
  return data.id;
}

/**
 * Create a test payment method selection
 */
export async function createTestPaymentSelection(
  supabase: SupabaseClient,
  tenantId: string,
  clientId: string,
  feeId: string,
  letterId: string,
  method: 'bank_transfer' | 'cc_single' | 'cc_installments' | 'checks',
  options: {
    completed?: boolean;
    daysAgoSelected?: number;
  } = {}
): Promise<string> {
  const selectedDate = new Date();
  selectedDate.setDate(selectedDate.getDate() - (options.daysAgoSelected || 0));

  const discounts: Record<string, number> = {
    bank_transfer: 9,
    cc_single: 8,
    cc_installments: 4,
    checks: 0,
  };

  const { data, error } = await supabase
    .from('payment_method_selections')
    .insert({
      tenant_id: tenantId,
      client_id: clientId,
      fee_calculation_id: feeId,
      generated_letter_id: letterId,
      selected_method: method,
      original_amount: 10000,
      discount_percent: discounts[method],
      amount_after_discount: 10000 * (1 - discounts[method] / 100),
      selected_at: selectedDate.toISOString(),
      completed_payment: options.completed || false,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create test payment selection: ${error.message}`);
  }

  console.log(`✅ Test payment selection created: ${data.id} (${method})`);
  return data.id;
}

/**
 * Create a test payment dispute
 */
export async function createTestDispute(
  supabase: SupabaseClient,
  tenantId: string,
  clientId: string,
  feeId: string
): Promise<string> {
  const { data, error } = await supabase
    .from('payment_disputes')
    .insert({
      tenant_id: tenantId,
      client_id: clientId,
      fee_calculation_id: feeId,
      dispute_reason: 'שילמתי בהעברה בנקאית',
      claimed_payment_date: new Date().toISOString().split('T')[0],
      claimed_payment_method: 'העברה בנקאית',
      claimed_amount: 9100,
      claimed_reference: 'TEST123456',
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create test dispute: ${error.message}`);
  }

  console.log(`✅ Test dispute created: ${data.id}`);
  return data.id;
}

/**
 * Clean up test data
 */
export async function cleanupTestData(
  supabase: SupabaseClient,
  tenantId: string
): Promise<void> {
  console.log('🧹 Cleaning up test data...');

  // Delete in reverse order of dependencies
  await supabase
    .from('payment_reminders')
    .delete()
    .eq('tenant_id', tenantId)
    .like('fee_calculation_id', '%test%');

  await supabase
    .from('payment_disputes')
    .delete()
    .eq('tenant_id', tenantId);

  await supabase
    .from('payment_method_selections')
    .delete()
    .eq('tenant_id', tenantId);

  await supabase
    .from('generated_letters')
    .delete()
    .eq('tenant_id', tenantId)
    .like('template_id', 'test%');

  await supabase
    .from('fee_calculations')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('base_amount', 10000); // Test fees use 10000

  await supabase
    .from('reminder_rules')
    .delete()
    .eq('tenant_id', tenantId)
    .like('name', 'Test:%');

  console.log('✅ Test data cleaned up');
}

/**
 * Create a complete test scenario
 * Returns all created IDs for verification
 */
export async function createCompleteTestScenario(
  supabase: SupabaseClient,
  tenantId: string,
  clientId: string,
  scenario: 'no_open' | 'no_selection' | 'abandoned_cart' | 'checks_overdue'
): Promise<{
  feeId: string;
  letterId: string;
  ruleId: string;
  selectionId?: string;
}> {
  console.log(`📝 Creating complete test scenario: ${scenario}`);

  switch (scenario) {
    case 'no_open': {
      // Letter sent 7 days ago, not opened
      const feeId = await createTestFee(supabase, tenantId, clientId, 7);
      const letterId = await createTestLetter(supabase, tenantId, clientId, feeId, {
        opened: false,
        daysAgoSent: 7,
      });
      const ruleId = await createTestReminderRule(supabase, tenantId, 'no_open', 7);
      return { feeId, letterId, ruleId };
    }

    case 'no_selection': {
      // Letter sent 14 days ago, opened but no payment selection
      const feeId = await createTestFee(supabase, tenantId, clientId, 14);
      const letterId = await createTestLetter(supabase, tenantId, clientId, feeId, {
        opened: true,
        daysAgoSent: 14,
        daysAgoOpened: 13,
      });
      const ruleId = await createTestReminderRule(supabase, tenantId, 'no_selection', 14);
      return { feeId, letterId, ruleId };
    }

    case 'abandoned_cart': {
      // Selected Cardcom 3 days ago but didn't complete
      const feeId = await createTestFee(supabase, tenantId, clientId, 10);
      const letterId = await createTestLetter(supabase, tenantId, clientId, feeId, {
        opened: true,
        daysAgoSent: 10,
        daysAgoOpened: 9,
      });
      const selectionId = await createTestPaymentSelection(
        supabase,
        tenantId,
        clientId,
        feeId,
        letterId,
        'cc_single',
        { completed: false, daysAgoSelected: 3 }
      );
      const ruleId = await createTestReminderRule(supabase, tenantId, 'abandoned_cart', 3);
      return { feeId, letterId, ruleId, selectionId };
    }

    case 'checks_overdue': {
      // Selected checks 30 days ago but didn't send them
      const feeId = await createTestFee(supabase, tenantId, clientId, 35);
      const letterId = await createTestLetter(supabase, tenantId, clientId, feeId, {
        opened: true,
        daysAgoSent: 35,
        daysAgoOpened: 34,
      });
      const selectionId = await createTestPaymentSelection(
        supabase,
        tenantId,
        clientId,
        feeId,
        letterId,
        'checks',
        { completed: false, daysAgoSelected: 30 }
      );
      const ruleId = await createTestReminderRule(supabase, tenantId, 'checks_overdue', 30);
      return { feeId, letterId, ruleId, selectionId };
    }

    default:
      throw new Error(`Unknown scenario: ${scenario}`);
  }
}

/**
 * Verify reminder was sent
 */
export async function verifyReminderSent(
  supabase: SupabaseClient,
  feeId: string,
  reminderType: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('payment_reminders')
    .select('id')
    .eq('fee_calculation_id', feeId)
    .eq('reminder_type', reminderType)
    .limit(1);

  if (error) {
    console.error('❌ Error verifying reminder:', error);
    return false;
  }

  const sent = data && data.length > 0;
  console.log(sent ? '✅ Reminder sent' : '❌ Reminder not sent');
  return sent;
}

/**
 * Get reminder count for a fee
 */
export async function getReminderCount(
  supabase: SupabaseClient,
  feeId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('fee_calculations')
    .select('reminder_count')
    .eq('id', feeId)
    .single();

  if (error || !data) {
    console.error('❌ Error getting reminder count:', error);
    return 0;
  }

  console.log(`📊 Reminder count for ${feeId}: ${data.reminder_count || 0}`);
  return data.reminder_count || 0;
}
