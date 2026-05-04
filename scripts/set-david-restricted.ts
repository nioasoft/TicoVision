/**
 * Switch davidsi@yaelsoft.com to a restricted user pinned to /yael-approvals.
 * This is the pattern Tzlul uses: ProtectedRoute + YaelApprovalsPage both
 * fast-path on isRestrictedUser, and AuthContext sets isRestrictedUser when
 * role='restricted' AND permissions.restricted_route is set.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const TIKO = 'baa88f3b-5998-4440-952f-9fd661a28598';
const EMAIL = 'davidsi@yaelsoft.com';
const ROUTE = '/yael-approvals';

async function main() {
  const { data: auth } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const david = auth?.users?.find(u => u.email === EMAIL);
  if (!david) { console.error('user not found'); process.exit(1); }

  // 1. Update user_tenant_access row: role='restricted', set restricted_route + extra_menus
  const newPerms = {
    restricted_route: ROUTE,
    extra_menus: ['documents', 'documents:yael-approvals'],
  };
  const { error: utaErr } = await supabase
    .from('user_tenant_access')
    .update({ role: 'restricted', permissions: newPerms })
    .eq('user_id', david.id)
    .eq('tenant_id', TIKO);
  if (utaErr) { console.error('uta update failed:', utaErr); process.exit(1); }

  // 2. Update auth.users metadata so the JWT carries role='restricted' and tenant_id
  const { error: metaErr } = await supabase.auth.admin.updateUserById(david.id, {
    user_metadata: { ...(david.user_metadata || {}), role: 'restricted', tenant_id: TIKO },
    app_metadata: { ...(david.app_metadata || {}), role: 'restricted', tenant_id: TIKO },
  });
  if (metaErr) { console.error('meta update failed:', metaErr); process.exit(1); }

  // 3. Verify
  const { data: verifyUta } = await supabase
    .from('user_tenant_access')
    .select('role, permissions')
    .eq('user_id', david.id)
    .eq('tenant_id', TIKO)
    .single();
  console.log('user_tenant_access:', JSON.stringify(verifyUta, null, 2));

  const { data: verifyAuth } = await supabase.auth.admin.getUserById(david.id);
  console.log('user_metadata:', JSON.stringify(verifyAuth?.user?.user_metadata, null, 2));
  console.log('app_metadata:', JSON.stringify(verifyAuth?.user?.app_metadata, null, 2));

  console.log('\n✅ Done. David must log out and log in again for JWT/role refresh.');
}
main().catch(e => { console.error(e); process.exit(1); });
