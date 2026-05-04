/**
 * Bulk mark fee_calculations as paid
 * Usage: npx tsx scripts/bulk-mark-paid.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TIKO_TENANT_ID = 'baa88f3b-5998-4440-952f-9fd661a28598';

const METHODS: Record<number, string> = {
  1: 'bank_transfer',
  2: 'cc_single',
  3: 'cc_installments',
  4: 'checks',
};

interface PaymentUpdate {
  kind: 'client' | 'group';
  // For 'client': tax_id. For 'group': group_calculation_id (group_fee_calculations.id)
  key: string;
  company_name: string;
  fee_amount: number;
  payment_amount: number;
  payment_date: string; // ISO YYYY-MM-DD
  method: number;
}

const ALL_UPDATES: PaymentUpdate[] = [
  { kind: 'client', key: '513406868', company_name: 'אג\'נדה בר קפה בע"מ',     fee_amount: 32874,  payment_amount: 32872.00, payment_date: '2026-03-31', method: 2 },
  { kind: 'client', key: '515542009', company_name: 'אדן שירותי תפעול בע"מ',    fee_amount: 15017,  payment_amount: 14416.00, payment_date: '2026-03-10', method: 1 },
  { kind: 'client', key: '517014247', company_name: 'אוסקה יפן בע"מ',           fee_amount: 24544,  payment_amount: 22335.00, payment_date: '2025-12-15', method: 2 },
  { kind: 'client', key: '516543147', company_name: 'אורון שורץ החזקות בע"מ',   fee_amount: 11045,  payment_amount: 10051.00, payment_date: '2025-12-15', method: 2 },
  { kind: 'group',  key: '6ea6db6c-29cf-4be0-a236-2aaaa8ecbace', company_name: 'קבוצת די אן איי בע"מ', fee_amount: 236000, payment_amount: 236000.00, payment_date: '2026-04-10', method: 4 },
  { kind: 'client', key: '515174860', company_name: 'טאוברד בע"מ',              fee_amount: 39533,  payment_amount: 31270.00, payment_date: '2026-04-26', method: 2 },
];

// CLI: --only=key1,key2 to limit
const onlyArg = process.argv.find(a => a.startsWith('--only='));
const onlyKeys = onlyArg ? new Set(onlyArg.slice('--only='.length).split(',').map(s => s.trim())) : null;
const UPDATES: PaymentUpdate[] = onlyKeys ? ALL_UPDATES.filter(u => onlyKeys.has(u.key)) : ALL_UPDATES;

interface Result {
  key: string;
  company_name: string;
  kind: 'client' | 'group';
  status: 'OK' | 'CLIENT_NOT_FOUND' | 'GROUP_NOT_FOUND' | 'NO_FEE' | 'MULTIPLE_FEES' | 'ERROR';
  detail?: string;
  fee_total?: number;
  payment_amount?: number;
  diff?: number;
}

async function processClient(u: PaymentUpdate): Promise<Result> {
  const base = { key: u.key, company_name: u.company_name, kind: 'client' as const };

  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id, company_name')
    .eq('tenant_id', TIKO_TENANT_ID)
    .eq('tax_id', u.key)
    .maybeSingle();

  if (clientErr) return { ...base, status: 'ERROR', detail: clientErr.message };
  if (!client) return { ...base, status: 'CLIENT_NOT_FOUND' };

  const { data: fees, error: feesErr } = await supabase
    .from('fee_calculations')
    .select('id, total_amount, status, year')
    .eq('tenant_id', TIKO_TENANT_ID)
    .eq('client_id', client.id)
    .in('status', ['draft', 'sent', 'overdue', 'partial_paid'])
    .order('year', { ascending: false });

  if (feesErr) return { ...base, status: 'ERROR', detail: feesErr.message };
  if (!fees || fees.length === 0) return { ...base, status: 'NO_FEE' };
  if (fees.length > 1) return { ...base, status: 'MULTIPLE_FEES', detail: `${fees.length} unpaid fees: ${fees.map(f => `${f.year}/${f.status}/${f.total_amount}`).join(', ')}` };

  const fee = fees[0];
  const method = METHODS[u.method];
  const nowIso = new Date().toISOString();

  const { error: updErr } = await supabase
    .from('fee_calculations')
    .update({
      status: 'paid',
      payment_method_selected: method,
      payment_method_selected_at: nowIso,
      payment_date: u.payment_date,
    })
    .eq('id', fee.id);

  if (updErr) return { ...base, status: 'ERROR', detail: updErr.message };

  const feeTotal = Number(fee.total_amount);
  return {
    ...base,
    status: 'OK',
    fee_total: feeTotal,
    payment_amount: u.payment_amount,
    diff: u.payment_amount - feeTotal,
  };
}

async function processGroup(u: PaymentUpdate): Promise<Result> {
  const base = { key: u.key, company_name: u.company_name, kind: 'group' as const };

  const { data: groupCalc, error: gcErr } = await supabase
    .from('group_fee_calculations')
    .select('id, status, total_final_amount_with_vat, group_id')
    .eq('tenant_id', TIKO_TENANT_ID)
    .eq('id', u.key)
    .maybeSingle();

  if (gcErr) return { ...base, status: 'ERROR', detail: gcErr.message };
  if (!groupCalc) return { ...base, status: 'GROUP_NOT_FOUND' };

  const method = METHODS[u.method];

  // Update group_fee_calculations directly. Member fee_calculations (if any) cascade via existing triggers.
  const { error: gUpdErr } = await supabase
    .from('group_fee_calculations')
    .update({
      status: 'paid',
      payment_method: method,
      payment_date: u.payment_date,
      amount_paid: u.payment_amount,
    })
    .eq('id', groupCalc.id);

  if (gUpdErr) return { ...base, status: 'ERROR', detail: gUpdErr.message };

  // Best-effort: cascade to any member fee_calculations linked to this group calc
  const nowIso = new Date().toISOString();
  await supabase
    .from('fee_calculations')
    .update({
      status: 'paid',
      payment_method_selected: method,
      payment_method_selected_at: nowIso,
      payment_date: u.payment_date,
    })
    .eq('tenant_id', TIKO_TENANT_ID)
    .eq('group_calculation_id', groupCalc.id);

  const feeTotal = Number(groupCalc.total_final_amount_with_vat);
  return {
    ...base,
    status: 'OK',
    fee_total: feeTotal,
    payment_amount: u.payment_amount,
    diff: u.payment_amount - feeTotal,
  };
}

async function processOne(u: PaymentUpdate): Promise<Result> {
  return u.kind === 'group' ? processGroup(u) : processClient(u);
}

async function dryCheck(u: PaymentUpdate): Promise<Result> {
  const base = { key: u.key, company_name: u.company_name, kind: u.kind };
  if (u.kind === 'group') {
    const { data, error } = await supabase
      .from('group_fee_calculations')
      .select('id, status, total_final_amount_with_vat')
      .eq('tenant_id', TIKO_TENANT_ID)
      .eq('id', u.key)
      .maybeSingle();
    if (error) return { ...base, status: 'ERROR', detail: error.message };
    if (!data) return { ...base, status: 'GROUP_NOT_FOUND' };
    const total = Number(data.total_final_amount_with_vat);
    return { ...base, status: 'OK', fee_total: total, payment_amount: u.payment_amount, diff: u.payment_amount - total, detail: `current_status=${data.status}` };
  }

  const { data: client, error: cErr } = await supabase
    .from('clients').select('id, company_name')
    .eq('tenant_id', TIKO_TENANT_ID).eq('tax_id', u.key).maybeSingle();
  if (cErr) return { ...base, status: 'ERROR', detail: cErr.message };
  if (!client) return { ...base, status: 'CLIENT_NOT_FOUND' };

  const { data: fees, error: fErr } = await supabase
    .from('fee_calculations')
    .select('id, total_amount, status, year')
    .eq('tenant_id', TIKO_TENANT_ID).eq('client_id', client.id)
    .in('status', ['draft', 'sent', 'overdue', 'partial_paid'])
    .order('year', { ascending: false });
  if (fErr) return { ...base, status: 'ERROR', detail: fErr.message };
  if (!fees?.length) return { ...base, status: 'NO_FEE' };
  if (fees.length > 1) return { ...base, status: 'MULTIPLE_FEES', detail: fees.map(f => `${f.year}/${f.status}/${f.total_amount}`).join(', ') };
  const fee = fees[0];
  return { ...base, status: 'OK', fee_total: Number(fee.total_amount), payment_amount: u.payment_amount, diff: u.payment_amount - Number(fee.total_amount), detail: `year=${fee.year} cur_status=${fee.status}` };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Processing ${UPDATES.length} payment updates...\n`);
  const results: Result[] = [];
  for (const u of UPDATES) {
    const r = dryRun ? await dryCheck(u) : await processOne(u);
    results.push(r);
    const tag = r.status === 'OK' ? '✓' : '✗';
    const extra = r.status === 'OK'
      ? `fee=${r.fee_total} paid=${r.payment_amount} diff=${r.diff} ${r.detail ?? ''}`
      : (r.detail ?? '');
    console.log(`${tag} [${r.kind}] ${r.key}  ${r.company_name}  → ${r.status}  ${extra}`);
  }

  const ok = results.filter(r => r.status === 'OK').length;
  const fail = results.length - ok;
  console.log(`\nDone. OK=${ok}  FAIL=${fail}`);

  if (fail > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
