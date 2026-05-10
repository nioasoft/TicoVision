/**
 * DEV ONLY — Mark Shaagat HaAri service fee as PAID for a client (skip Cardcom).
 *
 * Usage:
 *   npx tsx scripts/dev-mark-shaagat-paid.ts <tax_id>
 *
 * Example:
 *   npx tsx scripts/dev-mark-shaagat-paid.ts 514952050
 *
 * Effect:
 *   Finds the latest `shaagat_eligibility_checks` row for the given tax_id and
 *   sets `payment_status = 'PAID'` + `payment_received_at = NOW()`.
 *   Advances the client from stage 6 (`pending_payment`) → 7 (`in_calculation`).
 *
 * Use only on dev/staging. Production payments should go through Cardcom.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const taxId = process.argv[2];
  if (!taxId) {
    console.error('Usage: npx tsx scripts/dev-mark-shaagat-paid.ts <tax_id>');
    process.exit(1);
  }

  // 1) Find client
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id, tax_id, company_name, company_name_hebrew')
    .eq('tax_id', taxId)
    .maybeSingle();

  if (clientErr) {
    console.error('❌ Failed to find client:', clientErr.message);
    process.exit(1);
  }
  if (!client) {
    console.error(`❌ No client with tax_id=${taxId}`);
    process.exit(1);
  }

  console.log(
    `→ Client: ${client.company_name_hebrew || client.company_name} (${client.tax_id})`
  );

  // 2) Find latest eligibility check
  const { data: check, error: checkErr } = await supabase
    .from('shaagat_eligibility_checks')
    .select('id, eligibility_status, payment_status, payment_received_at, created_at')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (checkErr) {
    console.error('❌ Failed to find eligibility check:', checkErr.message);
    process.exit(1);
  }
  if (!check) {
    console.error('❌ No eligibility check found for this client');
    process.exit(1);
  }

  console.log(
    `→ Latest eligibility check: ${check.id}\n` +
      `   status: ${check.eligibility_status}\n` +
      `   payment_status (before): ${check.payment_status}\n` +
      `   created: ${check.created_at}`
  );

  if (check.payment_status === 'PAID') {
    console.log('✓ Already PAID — nothing to do.');
    return;
  }

  // 3) Update
  const { error: updateErr } = await supabase
    .from('shaagat_eligibility_checks')
    .update({
      payment_status: 'PAID',
      payment_received_at: new Date().toISOString(),
    })
    .eq('id', check.id);

  if (updateErr) {
    console.error('❌ Update failed:', updateErr.message);
    process.exit(1);
  }

  console.log('✓ payment_status → PAID');
  console.log('✓ Client should now appear in stage `in_calculation`.');
}

main().catch((err) => {
  console.error('❌ Unhandled error:', err);
  process.exit(1);
});
