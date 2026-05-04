import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const { data: auth } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const david = auth?.users?.find(u => u.email === 'davidsi@yaelsoft.com');
  if (!david) { console.log('NOT FOUND in auth.users'); return; }
  console.log('=== auth.users ===');
  console.log('id:', david.id);
  console.log('email:', david.email);
  console.log('email_confirmed_at:', david.email_confirmed_at);
  console.log('last_sign_in_at:', david.last_sign_in_at);
  console.log('banned_until:', (david as any).banned_until);
  console.log('user_metadata:', JSON.stringify(david.user_metadata, null, 2));
  console.log('app_metadata:', JSON.stringify(david.app_metadata, null, 2));

  console.log('\n=== user_tenant_access ===');
  const { data: uta } = await supabase.from('user_tenant_access').select('*').eq('user_id', david.id);
  console.log(JSON.stringify(uta, null, 2));

  console.log('\n=== user_client_assignments ===');
  const { data: uca } = await supabase.from('user_client_assignments').select('*').eq('user_id', david.id);
  console.log(JSON.stringify(uca, null, 2));

  console.log('\n=== super_admins ===');
  const { data: sa } = await supabase.from('super_admins').select('*').eq('user_id', david.id);
  console.log(JSON.stringify(sa, null, 2));
}
main();
