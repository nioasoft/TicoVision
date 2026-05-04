/**
 * Grant David (davidsi@yaelsoft.com) per-user access to yael-approvals
 * (אישורים לחברת יעל תכנה ומערכות) via the extra_menus mechanism in
 * user_tenant_access.permissions.
 *
 * Usage: npx tsx scripts/grant-david-yael-approvals.ts
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

// Menus required to actually USE yael-approvals:
// - documents (parent menu)
// - documents:yael-approvals (the menu itself, route: /yael-approvals)
const EXTRA_MENUS = [
  'documents',
  'documents:yael-approvals',
];

async function main() {
  // Find David user_id
  const { data: auth } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const david = auth?.users?.find(u => u.email === DAVID_EMAIL);
  if (!david) {
    console.error(`User ${DAVID_EMAIL} not found in auth.users`);
    process.exit(1);
  }
  console.log(`David user_id: ${david.id}`);

  // Read current permissions
  const { data: existing, error: readErr } = await supabase
    .from('user_tenant_access')
    .select('id, permissions, role, is_active')
    .eq('user_id', david.id)
    .eq('tenant_id', TIKO)
    .eq('is_active', true)
    .maybeSingle();
  if (readErr || !existing) {
    console.error('Could not read existing user_tenant_access row:', readErr);
    console.error('David may not be linked to the Tiko tenant. Aborting.');
    process.exit(1);
  }
  console.log(`Current role: ${existing.role}`);
  console.log('Current permissions:', JSON.stringify(existing.permissions, null, 2));

  // Merge: keep existing keys, union extra_menus with new ones
  const currentPerms = (existing.permissions ?? {}) as Record<string, unknown>;
  const currentExtra = Array.isArray(currentPerms.extra_menus)
    ? (currentPerms.extra_menus as string[])
    : [];
  const mergedExtra = Array.from(new Set([...currentExtra, ...EXTRA_MENUS]));
  const newPerms = { ...currentPerms, extra_menus: mergedExtra };

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
  console.log('\nDavid must log out and log in again for changes to take effect (cache: 5 min).');
}

main().catch(e => { console.error(e); process.exit(1); });
