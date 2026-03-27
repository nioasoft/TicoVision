import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const TENANT = 'baa88f3b-5998-4440-952f-9fd661a28598';
const isDryRun = process.argv.includes('--dry-run');

const METHOD_MAP: Record<number, string> = { 1: 'bank_transfer', 2: 'cc_single', 3: 'cc_installments', 4: 'checks' };
const METHOD_HEB: Record<number, string> = { 1: 'העברה', 2: 'אשראי', 3: 'תשלומים', 4: "צ'קים" };

function val(raw: unknown): unknown {
  if (raw && typeof raw === 'object' && 'result' in (raw as Record<string, unknown>)) return (raw as Record<string, unknown>).result;
  return raw;
}

function parseDate(raw: unknown): string | null {
  if (!raw) return null;
  if (raw instanceof Date) return raw.toISOString().split('T')[0];
  const str = String(raw).trim();
  const m = str.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return str;
  return null;
}

async function main() {
  const filePath = path.join(process.cwd(), 'landora_group.xlsx');
  console.log(isDryRun ? '=== DRY RUN ===' : '=== APPLYING ===');

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const sheet = wb.getWorksheet(1);
  if (!sheet) { console.error('No sheet'); process.exit(1); }

  // Fetch clients
  const { data: clients } = await supabase.from('clients').select('id, tax_id, company_name').eq('tenant_id', TENANT);
  const clientByTaxId = new Map((clients ?? []).map(c => [c.tax_id, c]));

  // Fetch existing fees
  const { data: fees } = await supabase.from('fee_calculations').select('id, client_id, status, calculated_with_vat, total_amount').eq('tenant_id', TENANT).eq('year', 2026);
  const feeByClient = new Map((fees ?? []).map(f => [f.client_id, f]));

  let updated = 0, created = 0, skipped = 0, failed = 0;

  sheet.eachRow((row, n) => {
    if (n === 1) return;
    const taxId = String(val(row.getCell(1).value) ?? '').trim();
    const companyName = String(val(row.getCell(2).value) ?? '').trim();
    const correctAmountRaw = val(row.getCell(9).value);
    const newDateRaw = val(row.getCell(10).value);
    const newMethodRaw = val(row.getCell(11).value);
    const notes = String(val(row.getCell(12).value) ?? '').trim();

    if (!correctAmountRaw || String(correctAmountRaw).trim() === '') { skipped++; return; }

    const amount = Number(correctAmountRaw);
    if (isNaN(amount) || amount <= 0) { console.error(`Row ${n} [${taxId}]: invalid amount "${correctAmountRaw}"`); failed++; return; }

    const client = clientByTaxId.get(taxId);
    if (!client) { console.error(`Row ${n}: tax_id "${taxId}" not found`); failed++; return; }

    const fee = feeByClient.get(client.id);
    const newDate = parseDate(newDateRaw);
    const hasPaid = !!newDate; // No date = not paid, just set amount

    let paymentMethod = 'bank_transfer';
    if (hasPaid) {
      const existingMethod = String(val(row.getCell(8).value) ?? '').trim();
      if (newMethodRaw && String(newMethodRaw).trim()) {
        const num = Number(newMethodRaw);
        if (METHOD_MAP[num]) paymentMethod = METHOD_MAP[num];
      } else if (existingMethod.includes('העברה')) paymentMethod = 'bank_transfer';
      else if (existingMethod.includes('אשראי')) paymentMethod = 'cc_single';
      else if (existingMethod.includes('צ')) paymentMethod = 'checks';
    }

    const beforeVat = Math.round((amount / 1.18) * 100) / 100;
    const vat = Math.round((amount - beforeVat) * 100) / 100;

    const type = fee ? (fee.status === 'paid' ? 'update_paid' : 'update_unpaid') : 'new';
    const action = hasPaid ? 'חישוב + תשלום' : 'חישוב בלבד';
    console.log(`[${taxId}] ${companyName} → ${type}: ₪${amount} | ${action}${hasPaid ? ` | ${newDate} | ${paymentMethod}` : ''}${notes ? ` | ${notes}` : ''}`);

    if (!isDryRun) {
      // Queue for async processing
      (async () => {
        try {
          let feeId = fee?.id;

          const feeStatus = hasPaid ? 'paid' : 'draft';

          if (!feeId) {
            // Create fee
            const { data: newFee, error } = await supabase.from('fee_calculations').insert({
              tenant_id: TENANT, client_id: client.id, year: 2026,
              base_amount: beforeVat, calculated_base_amount: beforeVat, final_amount: beforeVat,
              vat_amount: vat, total_amount: amount, calculated_before_vat: beforeVat, calculated_with_vat: amount,
              inflation_adjustment: 0, inflation_rate: 0, apply_inflation_index: false,
              status: feeStatus, payment_date: hasPaid ? newDate : null,
              notes: notes || 'קבוצת לאנדורה - הוזן ידנית',
            }).select('id').single();
            if (error) { console.error(`  Fee create failed: ${error.message}`); return; }
            feeId = newFee.id;
          } else {
            // Update fee amounts
            await supabase.from('fee_calculations').update({
              calculated_with_vat: amount, total_amount: amount, calculated_before_vat: beforeVat,
              vat_amount: vat, final_amount: beforeVat, base_amount: beforeVat,
              ...(hasPaid ? { status: 'paid', payment_date: newDate } : {}),
            }).eq('id', feeId);
          }

          // Only create/update payment if paid
          if (hasPaid) {
            const { data: existingPayment } = await supabase.from('actual_payments')
              .select('id').eq('fee_calculation_id', feeId).limit(1);

            if (existingPayment?.length) {
              await supabase.from('actual_payments').update({
                amount_paid: amount, amount_before_vat: beforeVat, amount_vat: vat, amount_with_vat: amount,
                payment_date: newDate, payment_method: paymentMethod,
              }).eq('id', existingPayment[0].id);
            } else {
              const { data: newPay, error: payErr } = await supabase.from('actual_payments').insert({
                tenant_id: TENANT, client_id: client.id, fee_calculation_id: feeId,
                amount_paid: amount, amount_before_vat: beforeVat, amount_vat: vat, amount_with_vat: amount,
                payment_date: newDate, payment_method: paymentMethod,
                notes: notes || 'קבוצת לאנדורה - הוזן ידנית',
              }).select('id').single();
              if (payErr) { console.error(`  Payment create failed: ${payErr.message}`); return; }
              await supabase.from('fee_calculations').update({ actual_payment_id: newPay.id }).eq('id', feeId);
            }
          }
        } catch (err) { console.error(`  Error [${taxId}]:`, err); }
      })();
    }

    if (type === 'new') created++; else updated++;
  });

  // Wait for async operations
  if (!isDryRun) await new Promise(r => setTimeout(r, 5000));

  console.log(`\nSummary: ${created} new, ${updated} updated, ${skipped} skipped, ${failed} failed`);
}

main().catch(console.error);
