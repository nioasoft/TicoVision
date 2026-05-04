/**
 * Assign David (davidsi@yaelsoft.com) to the Yael Software Systems client
 * so YaelApprovalsPage's access check passes (in addition to the
 * documents:yael-approvals menu permission already granted).
 *
 * Usage: npx tsx scripts/assign-david-yael-client.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TIKO = 'baa88f3b-5998-4440-952f-9fd661a28598';
const DAVID_EMAIL = 'davidsi@yaelsoft.com';
const YAEL_CLIENT_ID = 'f742db38-aae0-4a9f-bd17-4dee58ad9765'; // יעל תוכנה ומערכות בע"מ

async function main() {
  // Find David
  const { data: auth } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const david = auth?.users?.find(u => u.email === DAVID_EMAIL);
  if (!david) {
    console.error(`User ${DAVID_EMAIL} not found`);
    process.exit(1);
  }
  console.log(`David user_id: ${david.id}`);

  // Verify Yael client exists by hardcoded ID (constant in yael-approvals.types.ts)
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id, company_name')
    .eq('tenant_id', TIKO)
    .eq('id', YAEL_CLIENT_ID)
    .maybeSingle();
  if (clientErr || !client) {
    console.error(`Yael client (${YAEL_CLIENT_ID}) not found:`, clientErr);
    process.exit(1);
  }
  console.log(`Yael client: ${client.company_name} (${client.id})`);

  // Check if assignment already exists
  const { data: existing } = await supabase
    .from('user_client_assignments')
    .select('id')
    .eq('user_id', david.id)
    .eq('client_id', client.id)
    .eq('tenant_id', TIKO)
    .maybeSingle();

  if (existing) {
    console.log(`✅ Assignment already exists (id: ${existing.id})`);
    return;
  }

  // Insert assignment
  const { data: inserted, error: insertErr } = await supabase
    .from('user_client_assignments')
    .insert({
      user_id: david.id,
      client_id: client.id,
      tenant_id: TIKO,
      assigned_by: david.id,
      assigned_at: new Date().toISOString(),
      is_primary: false,
      notes: 'Granted access to Yael approvals module',
    })
    .select()
    .single();

  if (insertErr) {
    console.error('Insert failed:', insertErr);
    process.exit(1);
  }

  console.log('\n✅ Assignment created:', JSON.stringify(inserted, null, 2));
  console.log('\nDavid must log out and log in again (cache: 5 min).');
}

main().catch(e => { console.error(e); process.exit(1); });
