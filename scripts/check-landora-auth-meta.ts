/**
 * Check auth.users.user_metadata.role for landora bookkeepers + Iris.
 * useAuth() reads role from JWT (auth metadata), which can differ from user_tenant_access.role.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TARGETS = [
  'iris@nir-group.com',
  'dana@landora.co.il',
  'galit@landora.co.il',
  'natalie@landora.co.il',
  'revital@landora.co.il',
  'rivka@landora.co.il',
  'zipora@landora.co.il',
];

async function main() {
  const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const found = data?.users?.filter(u => u.email && TARGETS.includes(u.email)) ?? [];
  const rows = found.map(u => ({
    email: u.email,
    auth_role: u.user_metadata?.role,
    auth_tenant_id: u.user_metadata?.tenant_id,
    full_name: u.user_metadata?.full_name,
  }));
  console.table(rows);
}

main().catch(e => { console.error(e); process.exit(1); });
