import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const url = `${process.env.VITE_SUPABASE_URL}/functions/v1/send-batch-reminders`;
  console.log(`Calling: ${url} (dry_run)\n`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ tax_year: 2026, dry_run: true }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(`Error ${res.status}:`, data);
    process.exit(1);
  }

  const stats = data.data;
  console.log(`Total pending: ${stats.total_pending}`);
  console.log(`Would send: ${stats.sent}`);
  console.log(`No letter: ${stats.skipped_no_letter}`);
  console.log(`No email: ${stats.skipped_no_email}`);
  console.log(`Already reminded today: ${stats.skipped_already_reminded}`);
  console.log(`\nDetails:`);
  for (const d of stats.details) {
    console.log(`  [${d.tax_id}] ${d.company_name} → ${d.status}${d.emails ? ` (${d.emails.join(', ')})` : ''}`);
  }
}

main().catch(console.error);
