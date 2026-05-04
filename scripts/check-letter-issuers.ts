/**
 * Find who actually generated income_confirmation / bank_approvals letters historically.
 * The DB knows the truth - if Landora bookkeepers have been issuing them, we'll find their user_id.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TIKO = 'baa88f3b-5998-4440-952f-9fd661a28598';

async function main() {
  console.log('=== generated_letters by template_type LIKE bank/income ===');
  const { data: letters, error } = await supabase
    .from('generated_letters')
    .select('id, template_type, document_type_id, created_by, created_at, status')
    .eq('tenant_id', TIKO)
    .or('template_type.ilike.%bank%,template_type.ilike.%income%,document_type_id.ilike.%income%,document_type_id.ilike.%bank%')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) console.error(error);

  const userIds = Array.from(new Set((letters ?? []).map(l => l.created_by).filter(Boolean)));
  const { data: auth } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map(auth?.users?.map(u => [u.id, u.email ?? '']) ?? []);

  const enriched = (letters ?? []).map(l => ({
    when: l.created_at?.slice(0, 10),
    email: emailMap.get(l.created_by!) ?? '?',
    template_type: l.template_type,
    document_type_id: l.document_type_id,
    status: l.status,
  }));
  console.table(enriched);

  console.log('\n=== Distinct issuers (by email) for bank/income letters ===');
  const counts = new Map<string, number>();
  for (const r of enriched) {
    counts.set(r.email, (counts.get(r.email) ?? 0) + 1);
  }
  console.table(Array.from(counts.entries()).map(([email, count]) => ({ email, count })));

  console.log('\n=== Sample of distinct template_type values to know what bank-approvals look like ===');
  const { data: distinctTypes } = await supabase
    .from('generated_letters')
    .select('template_type')
    .eq('tenant_id', TIKO)
    .limit(2000);
  const typeSet = new Set((distinctTypes ?? []).map(d => d.template_type));
  console.log(Array.from(typeSet).sort());
}

main().catch(e => { console.error(e); process.exit(1); });
