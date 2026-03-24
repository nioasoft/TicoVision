/**
 * Import Fee Payments from Excel
 *
 * Usage:
 *   npx tsx scripts/import-fees-excel.ts --dry-run    # Preview changes
 *   npx tsx scripts/import-fees-excel.ts              # Apply changes
 */

import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TIKO_TENANT_ID = 'baa88f3b-5998-4440-952f-9fd661a28598';
const TAX_YEAR = 2026;
const VAT_RATE = 0.18;

const isDryRun = process.argv.includes('--dry-run');

const PAYMENT_METHOD_MAP: Record<number, string> = {
  1: 'bank_transfer',
  2: 'cc_single',
  3: 'cc_installments',
  4: 'checks',
};

const PAYMENT_METHOD_HEBREW: Record<number, string> = {
  1: 'העברה בנקאית',
  2: 'אשראי תשלום אחד',
  3: 'אשראי בתשלומים',
  4: "צ'קים",
};

interface PaymentRecord {
  taxId: string;
  companyName: string;
  clientId: string;
  amountWithVat: number;
  amountBeforeVat: number;
  amountVat: number;
  paymentDate: string; // YYYY-MM-DD for DB
  paymentMethod: string;
  paymentMethodHebrew: string;
  type: 'new_fee' | 'existing_fee' | 'group_fee';
  existingFeeId?: string;
  existingAmount?: number;
  groupFeeId?: string;
}

function parseDate(raw: unknown): string | null {
  if (!raw) return null;
  const str = String(raw).trim();

  // Handle DD/MM/YYYY
  const match = str.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    return `${year}-${month}-${day}`;
  }

  // Handle Excel Date objects (serial numbers)
  if (raw instanceof Date) {
    return raw.toISOString().split('T')[0];
  }

  // Handle YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return str;

  return null;
}

function extractCellValue(raw: unknown): unknown {
  // ExcelJS formula cells return { formula: '...', result: value }
  if (raw && typeof raw === 'object' && 'result' in (raw as Record<string, unknown>)) {
    return (raw as Record<string, unknown>).result;
  }
  return raw;
}

function roundUp2(n: number): number {
  return Math.ceil(n * 100) / 100;
}

async function main() {
  const filePath = path.join(process.cwd(), 'fees_bulk_payment.xlsx');

  console.log(isDryRun ? '=== DRY RUN ===' : '=== APPLYING CHANGES ===');
  console.log(`Reading: ${filePath}`);
  console.log(`Tax year: ${TAX_YEAR}\n`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet(`תשלומים ${TAX_YEAR}`);
  if (!sheet) {
    console.error(`Sheet "תשלומים ${TAX_YEAR}" not found`);
    process.exit(1);
  }

  // Fetch clients
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, tax_id, company_name')
    .eq('tenant_id', TIKO_TENANT_ID);

  if (clientsError) {
    console.error('Failed to fetch clients:', clientsError.message);
    process.exit(1);
  }

  const clientByTaxId = new Map(
    (clients ?? []).map((c) => [c.tax_id, c])
  );

  // Fetch existing fee calculations
  const { data: fees, error: feesError } = await supabase
    .from('fee_calculations')
    .select('id, client_id, total_amount, calculated_with_vat, status')
    .eq('tenant_id', TIKO_TENANT_ID)
    .eq('year', TAX_YEAR);

  if (feesError) {
    console.error('Failed to fetch fees:', feesError.message);
    process.exit(1);
  }

  const feeByClientId = new Map(
    (fees ?? []).map((f) => [f.client_id, f])
  );

  const records: PaymentRecord[] = [];
  const errors: string[] = [];
  let skipped = 0;

  // Process rows
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const taxId = String(row.getCell(1).value ?? '').trim();
    const companyName = String(row.getCell(2).value ?? '').trim();
    const amountRaw = extractCellValue(row.getCell(6).value);
    const dateRaw = extractCellValue(row.getCell(7).value);
    const methodRaw = extractCellValue(row.getCell(8).value);

    // Handle group rows
    const isGroup = taxId.startsWith('group:');

    // Skip if no amount
    if (amountRaw == null || String(amountRaw).trim() === '') {
      skipped++;
      return;
    }

    const amount = Number(amountRaw);
    if (isNaN(amount) || amount <= 0) {
      errors.push(`Row ${rowNumber} [${taxId}]: invalid amount "${amountRaw}"`);
      return;
    }

    // Validate date
    const paymentDate = parseDate(dateRaw);
    if (!paymentDate) {
      errors.push(`Row ${rowNumber} [${taxId}]: invalid or missing date "${dateRaw}" (use DD/MM/YYYY)`);
      return;
    }

    // Validate payment method
    const methodNum = Number(methodRaw);
    if (!PAYMENT_METHOD_MAP[methodNum]) {
      errors.push(`Row ${rowNumber} [${taxId}]: invalid or missing payment method "${methodRaw}" (use 1-4)`);
      return;
    }

    // Calculate VAT breakdown (must satisfy: before_vat + vat = with_vat exactly)
    const amountWithVat = Math.round(amount * 100) / 100;
    const amountBeforeVat = Math.round((amount / (1 + VAT_RATE)) * 100) / 100;
    const amountVat = Math.round((amountWithVat - amountBeforeVat) * 100) / 100;

    // Handle group rows separately
    if (isGroup) {
      const groupFeeId = taxId.replace('group:', '');
      records.push({
        taxId,
        companyName,
        clientId: '',
        amountWithVat,
        amountBeforeVat,
        amountVat,
        paymentDate,
        paymentMethod: PAYMENT_METHOD_MAP[methodNum],
        paymentMethodHebrew: PAYMENT_METHOD_HEBREW[methodNum],
        type: 'group_fee',
        groupFeeId,
      });
      return;
    }

    // Find client
    const client = clientByTaxId.get(taxId);
    if (!client) {
      errors.push(`Row ${rowNumber}: tax_id "${taxId}" not found`);
      return;
    }

    // Check if existing fee
    const existingFee = feeByClientId.get(client.id);

    // Skip already paid (idempotent re-runs)
    if (existingFee?.status === 'paid') {
      skipped++;
      return;
    }

    const isExisting = !!existingFee;

    records.push({
      taxId,
      companyName,
      clientId: client.id,
      amountWithVat,
      amountBeforeVat,
      amountVat,
      paymentDate,
      paymentMethod: PAYMENT_METHOD_MAP[methodNum],
      paymentMethodHebrew: PAYMENT_METHOD_HEBREW[methodNum],
      type: isExisting ? 'existing_fee' : 'new_fee',
      existingFeeId: isExisting ? existingFee.id : undefined,
      existingAmount: existingFee?.calculated_with_vat ?? existingFee?.total_amount ?? undefined,
    });
  });

  // Print summary
  const newFees = records.filter((r) => r.type === 'new_fee');
  const existingFees = records.filter((r) => r.type === 'existing_fee');
  const groupFees = records.filter((r) => r.type === 'group_fee');

  if (newFees.length > 0) {
    console.log(`\nNew fee + payment (${newFees.length}):\n`);
    for (const r of newFees) {
      console.log(`  [${r.taxId}] ${r.companyName}`);
      console.log(`    ₪${r.amountWithVat} (לפני מע"מ: ₪${r.amountBeforeVat}) | ${r.paymentDate} | ${r.paymentMethodHebrew}`);
    }
  }

  if (existingFees.length > 0) {
    console.log(`\nExisting fee → mark paid (${existingFees.length}):\n`);
    for (const r of existingFees) {
      console.log(`  [${r.taxId}] ${r.companyName}`);
      console.log(`    חישוב קיים: ₪${r.existingAmount ?? '?'} → שולם: ₪${r.amountWithVat} | ${r.paymentDate} | ${r.paymentMethodHebrew}`);
    }
  }

  if (groupFees.length > 0) {
    console.log(`\nGroup fee → mark paid (${groupFees.length}):\n`);
    for (const r of groupFees) {
      console.log(`  ${r.companyName}`);
      console.log(`    שולם: ₪${r.amountWithVat} | ${r.paymentDate} | ${r.paymentMethodHebrew}`);
    }
  }

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    for (const e of errors) {
      console.log(`  ${e}`);
    }
  }

  console.log(`\nSummary: ${newFees.length} new fee+payment, ${existingFees.length} existing fee→paid, ${groupFees.length} group→paid, ${skipped} skipped, ${errors.length} errors`);

  // Apply
  if (!isDryRun && records.length > 0) {
    console.log('\nApplying changes...');
    let success = 0;
    let failed = 0;

    for (const r of records) {
      try {
        // Scenario C: Group fee → update group_fee_calculations
        if (r.type === 'group_fee' && r.groupFeeId) {
          const { error: groupError } = await supabase
            .from('group_fee_calculations')
            .update({
              status: 'paid',
              payment_date: r.paymentDate,
              payment_method: r.paymentMethod,
              amount_paid: r.amountWithVat,
            })
            .eq('id', r.groupFeeId)
            .eq('tenant_id', TIKO_TENANT_ID);

          if (groupError) {
            console.error(`  Failed to update group [${r.companyName}]: ${groupError.message}`);
            failed++;
          } else {
            success++;
          }
          continue;
        }

        let feeId = r.existingFeeId;

        // Scenario A: Create new fee_calculation
        if (r.type === 'new_fee') {
          const { data: newFee, error: feeError } = await supabase
            .from('fee_calculations')
            .insert({
              tenant_id: TIKO_TENANT_ID,
              client_id: r.clientId,
              year: TAX_YEAR,
              base_amount: r.amountBeforeVat,
              calculated_base_amount: r.amountBeforeVat,
              final_amount: r.amountBeforeVat,
              vat_amount: r.amountVat,
              total_amount: r.amountWithVat,
              calculated_before_vat: r.amountBeforeVat,
              calculated_with_vat: r.amountWithVat,
              inflation_adjustment: 0,
              inflation_rate: 0,
              apply_inflation_index: false,
              status: 'paid',
              payment_date: r.paymentDate,
              notes: 'תשלום שהתקבל לפני המערכת - הוזן ידנית',
            })
            .select('id')
            .single();

          if (feeError) {
            console.error(`  Failed to create fee [${r.taxId}]: ${feeError.message}`);
            failed++;
            continue;
          }
          feeId = newFee.id;
        }

        if (!feeId) {
          console.error(`  No fee ID for [${r.taxId}]`);
          failed++;
          continue;
        }

        // Create actual_payment
        const { data: payment, error: paymentError } = await supabase
          .from('actual_payments')
          .insert({
            tenant_id: TIKO_TENANT_ID,
            client_id: r.clientId,
            fee_calculation_id: feeId,
            amount_paid: r.amountWithVat,
            amount_before_vat: r.amountBeforeVat,
            amount_vat: r.amountVat,
            amount_with_vat: r.amountWithVat,
            payment_date: r.paymentDate,
            payment_method: r.paymentMethod,
            notes: 'תשלום שהתקבל לפני המערכת - הוזן ידנית',
          })
          .select('id')
          .single();

        if (paymentError) {
          console.error(`  Failed to create payment [${r.taxId}]: ${paymentError.message}`);
          failed++;
          continue;
        }

        // Link payment to fee and mark as paid
        const { error: linkError } = await supabase
          .from('fee_calculations')
          .update({
            actual_payment_id: payment.id,
            status: 'paid',
            payment_date: r.paymentDate,
          })
          .eq('id', feeId)
          .eq('tenant_id', TIKO_TENANT_ID);

        if (linkError) {
          console.error(`  Failed to link payment [${r.taxId}]: ${linkError.message}`);
          failed++;
          continue;
        }

        success++;
      } catch (err) {
        console.error(`  Unexpected error [${r.taxId}]:`, err);
        failed++;
      }
    }

    console.log(`\nDone: ${success} recorded, ${failed} failed`);
  } else if (isDryRun && records.length > 0) {
    console.log('\nThis was a dry run. Run without --dry-run to apply changes.');
  }
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
