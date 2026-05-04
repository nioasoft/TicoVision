/**
 * Find what letters Landora bookkeepers + Iris actually generated.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TIKO = 'baa88f3b-5998-4440-952f-9fd661a28598';
const TARGET_EMAILS = [
  'iris@nir-group.com',
  'dana@landora.co.il',
  'galit@landora.co.il',
  'natalie@landora.co.il',
  'revital@landora.co.il',
  'rivka@landora.co.il',
  'zipora@landora.co.il',
];

async function main() {
  const { data: auth } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const users = (auth?.users ?? []).filter(u => u.email && TARGET_EMAILS.includes(u.email));
  const userIds = users.map(u => u.id);
  const emailMap = new Map(users.map(u => [u.id, u.email!]));

  console.log('=== generated_letters by these users ===');
  const { data: letters } = await supabase
    .from('generated_letters')
    .select('id, template_type, document_type_id, status, created_at, created_by, letter_name')
    .eq('tenant_id', TIKO)
    .in('created_by', userIds)
    .order('created_at', { ascending: false })
    .limit(200);
  const rows = (letters ?? []).map(l => ({
    when: l.created_at?.slice(0, 10),
    email: emailMap.get(l.created_by!),
    template_type: l.template_type,
    document_type_id: l.document_type_id,
    letter_name: l.letter_name,
    status: l.status,
  }));
  console.table(rows);

  console.log('\n=== Distinct template_types these users used ===');
  const distinct = new Map<string, number>();
  for (const r of rows) {
    distinct.set(r.template_type ?? '(null)', (distinct.get(r.template_type ?? '(null)') ?? 0) + 1);
  }
  console.table(Array.from(distinct.entries()).map(([t, c]) => ({ template_type: t, count: c })));

  console.log('\n=== ANY letter type containing "income" or "אישור" or "הכנס" issued by ANYONE ===');
  const { data: anyIncome } = await supabase
    .from('generated_letters')
    .select('template_type, document_type_id, letter_name')
    .eq('tenant_id', TIKO)
    .or('letter_name.ilike.%הכנס%,letter_name.ilike.%אישור%,template_type.ilike.%income%,document_type_id.ilike.%income%')
    .limit(500);
  const incomeTypes = new Map<string, number>();
  for (const l of anyIncome ?? []) {
    const k = `${l.template_type ?? ''} | ${l.document_type_id ?? ''} | ${l.letter_name ?? ''}`;
    incomeTypes.set(k, (incomeTypes.get(k) ?? 0) + 1);
  }
  console.table(Array.from(incomeTypes.entries()).map(([k, c]) => ({ key: k, count: c })));
}

main().catch(e => { console.error(e); process.exit(1); });
