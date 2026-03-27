/**
 * Option 1: Trigger Existing Collection Reminder Engine
 *
 * Usage:
 *   npx tsx scripts/trigger-reminders.ts              # Send reminders per rules
 *   npx tsx scripts/trigger-reminders.ts --dry-run    # Show what would be sent (checks rules only)
 */

import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const isDryRun = process.argv.includes('--dry-run');

async function main() {
  console.log(isDryRun ? '=== DRY RUN ===' : '=== SENDING REMINDERS ===');
  console.log(`Calling: ${SUPABASE_URL}/functions/v1/collection-reminder-engine\n`);

  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/collection-reminder-engine`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ dry_run: isDryRun }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error(`Failed (${response.status}):`, text);
    process.exit(1);
  }

  const result = await response.json();
  console.log('Results:');
  console.log(JSON.stringify(result, null, 2));

  if (result.data) {
    const d = result.data;
    console.log(`\nSummary:`);
    console.log(`  Tenants processed: ${d.tenants_processed ?? 0}`);
    console.log(`  Rules processed: ${d.rules_processed ?? 0}`);
    console.log(`  Fees matched: ${d.fees_matched ?? 0}`);
    console.log(`  Reminders sent: ${d.reminders_sent ?? 0}`);
    console.log(`  Emails sent: ${d.emails_sent ?? 0}`);
    console.log(`  Emails failed: ${d.emails_failed ?? 0}`);
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
