/**
 * Grant Iris (iris@nir-group.com) per-user access to bank_approvals (אישור הכנסות)
 * via the new extra_menus mechanism in user_tenant_access.permissions.
 *
 * Usage: npx tsx scripts/grant-iris-bank-approvals.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TIKO = 'baa88f3b-5998-4440-952f-9fd661a28598';
const IRIS_EMAIL = 'iris@nir-group.com';

// Menus required to actually USE auto-letters bank_approvals:
// - documents (parent menu)
// - documents:auto-letters (subnav to /auto-letters)
// - documents:auto-letters:bank_approvals (the category itself)
const EXTRA_MENUS = [
  'documents',
  'documents:auto-letters',
  'documents:auto-letters:bank_approvals',
];

async function main() {
  // Find Iris user_id
  const { data: auth } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const iris = auth?.users?.find(u => u.email === IRIS_EMAIL);
  if (!iris) {
    console.error(`User ${IRIS_EMAIL} not found in auth.users`);
    process.exit(1);
  }
  console.log(`Iris user_id: ${iris.id}`);

  // Read current permissions
  const { data: existing, error: readErr } = await supabase
    .from('user_tenant_access')
    .select('id, permissions')
    .eq('user_id', iris.id)
    .eq('tenant_id', TIKO)
    .eq('is_active', true)
    .maybeSingle();
  if (readErr || !existing) {
    console.error('Could not read existing user_tenant_access row:', readErr);
    process.exit(1);
  }
  console.log('Current permissions:', JSON.stringify(existing.permissions, null, 2));

  // Merge: keep existing keys, replace extra_menus
  const currentPerms = (existing.permissions ?? {}) as Record<string, unknown>;
  const newPerms = { ...currentPerms, extra_menus: EXTRA_MENUS };

  const { error: updateErr } = await supabase
    .from('user_tenant_access')
    .update({ permissions: newPerms })
    .eq('id', existing.id);
  if (updateErr) {
    console.error('Update failed:', updateErr);
    process.exit(1);
  }

  // Verify
  const { data: verified } = await supabase
    .from('user_tenant_access')
    .select('permissions')
    .eq('id', existing.id)
    .single();
  console.log('\n✅ Updated permissions:', JSON.stringify(verified?.permissions, null, 2));
  console.log('\nIris must log out and log in again for changes to take effect (cache: 5 min).');
}

main().catch(e => { console.error(e); process.exit(1); });
