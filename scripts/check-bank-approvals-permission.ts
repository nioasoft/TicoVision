/**
 * Check who has access to bank_approvals (אישור הכנסות) in auto-letters.
 * Also fetches Iris (iris@nir-group.com) details and any document_permissions overrides.
 *
 * Usage: npx tsx scripts/check-bank-approvals-permission.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TIKO_TENANT_ID = 'baa88f3b-5998-4440-952f-9fd661a28598';

async function main() {
  console.log('=== 1. tenant_settings.features.role_overrides ===');
  const { data: tenantSettings, error: tsErr } = await supabase
    .from('tenant_settings')
    .select('tenant_id, features')
    .eq('tenant_id', TIKO_TENANT_ID)
    .maybeSingle();
  if (tsErr) console.error('tenant_settings error:', tsErr);
  console.log(JSON.stringify(tenantSettings?.features?.role_overrides ?? null, null, 2));

  console.log('\n=== 2. document_permissions overrides ===');
  const { data: docPerms, error: dpErr } = await supabase
    .from('document_permissions')
    .select('*')
    .eq('tenant_id', TIKO_TENANT_ID);
  if (dpErr) console.error('document_permissions error:', dpErr);
  console.log(JSON.stringify(docPerms, null, 2));

  console.log('\n=== 3. Iris user details ===');
  const { data: irisAuth, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) console.error('auth list error:', authErr);
  const iris = irisAuth?.users?.find(u => u.email === 'iris@nir-group.com');
  if (!iris) {
    console.log('Iris not found in auth.users');
  } else {
    console.log('Iris auth id:', iris.id);
    const { data: irisUta } = await supabase
      .from('user_tenant_access')
      .select('*')
      .eq('user_id', iris.id);
    console.log('Iris user_tenant_access rows:', JSON.stringify(irisUta, null, 2));
  }

  console.log('\n=== 4. All active users in tenant (role + permissions) ===');
  const { data: allUsers, error: usersErr } = await supabase
    .from('user_tenant_access')
    .select('user_id, role, is_active, permissions')
    .eq('tenant_id', TIKO_TENANT_ID)
    .eq('is_active', true);
  if (usersErr) console.error('users error:', usersErr);

  const userIds = (allUsers ?? []).map(u => u.user_id);
  const emailMap = new Map<string, string>();
  for (const u of irisAuth?.users ?? []) {
    if (userIds.includes(u.id)) emailMap.set(u.id, u.email ?? '');
  }

  const enriched = (allUsers ?? []).map(u => ({
    email: emailMap.get(u.user_id) ?? '?',
    role: u.role,
    permissions: u.permissions,
  }));
  enriched.sort((a, b) => a.role.localeCompare(b.role) || a.email.localeCompare(b.email));
  console.table(enriched);

  console.log('\n=== 5. Users with non-empty permissions JSON ===');
  console.table(enriched.filter(u => u.permissions && Object.keys(u.permissions).length > 0));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
