/**
 * Export Partial-Paid Clients for Review
 * Shows clients where actual payment differs from calculated amount
 *
 * Usage: npx tsx scripts/export-partial-paid.ts
 */

import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TIKO_TENANT_ID = 'baa88f3b-5998-4440-952f-9fd661a28598';

const METHOD_HEBREW: Record<string, string> = {
  bank_transfer: 'העברה בנקאית',
  cc_single: 'אשראי',
  cc_installments: 'תשלומים',
  checks: "צ'קים",
};

const GRAY: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
const GREEN_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' }, left: { style: 'thin' },
  bottom: { style: 'thin' }, right: { style: 'thin' },
};

async function main() {
  const { data, error } = await supabase.rpc('get_fee_tracking_data', {
    p_tenant_id: TIKO_TENANT_ID,
    p_tax_year: 2026,
  });

  if (error) { console.error(error.message); process.exit(1); }

  // Get actual payments for partial_paid clients
  const partialClients = (data ?? []).filter((r: Record<string, unknown>) => r.payment_status === 'partial_paid');
  console.log(`Found ${partialClients.length} partial-paid clients`);

  // Fetch actual payment details
  const calcIds = partialClients.map((r: Record<string, unknown>) => r.calculation_id).filter(Boolean);
  const { data: payments } = await supabase
    .from('actual_payments')
    .select('fee_calculation_id, amount_paid, payment_date, payment_method')
    .in('fee_calculation_id', calcIds);

  const paymentByFeeId = new Map(
    (payments ?? []).map((p) => [p.fee_calculation_id, p])
  );

  // Also get full fee calc details
  const { data: feeCalcs } = await supabase
    .from('fee_calculations')
    .select('id, calculated_with_vat, total_amount')
    .in('id', calcIds);

  const feeById = new Map((feeCalcs ?? []).map((f) => [f.id, f]));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('שולם חלקית', { views: [{ rightToLeft: true }] });

  sheet.columns = [
    { header: "ח.פ./ע.מ.", key: 'tax_id', width: 14 },
    { header: 'שם חברה', key: 'company_name', width: 30 },
    { header: 'סכום חישוב', key: 'expected', width: 14 },
    { header: 'סכום ששולם', key: 'actual_paid', width: 14 },
    { header: 'הפרש', key: 'difference', width: 14 },
    { header: 'תאריך תשלום', key: 'payment_date', width: 14 },
    { header: 'אמצעי', key: 'payment_method', width: 14 },
    { header: 'סכום מאושר (כולל מע"מ)', key: 'approved_amount', width: 22 },
  ];

  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell, col) => {
    cell.fill = col === 8 ? GREEN_FILL : HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.border = BORDER;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  headerRow.height = 24;

  for (const client of partialClients) {
    const fee = feeById.get(client.calculation_id);
    const payment = paymentByFeeId.get(client.calculation_id);
    const expected = Number(fee?.calculated_with_vat ?? fee?.total_amount ?? 0);
    const actual = Number(payment?.amount_paid ?? 0);

    const row = sheet.addRow({
      tax_id: client.tax_id ?? '',
      company_name: client.client_name ?? '',
      expected,
      actual_paid: actual,
      difference: Math.round((expected - actual) * 100) / 100,
      payment_date: payment?.payment_date ?? '',
      payment_method: METHOD_HEBREW[payment?.payment_method] ?? payment?.payment_method ?? '',
      approved_amount: null,
    });

    for (const col of [1, 2, 3, 4, 5, 6, 7]) {
      row.getCell(col).fill = GRAY;
      row.getCell(col).border = BORDER;
    }
    row.getCell(8).border = BORDER;
    row.getCell(8).alignment = { horizontal: 'center' };

    // Color difference
    const diff = expected - actual;
    if (diff > 0) {
      row.getCell(5).font = { color: { argb: 'FFCC0000' } }; // underpaid - red
    } else {
      row.getCell(5).font = { color: { argb: 'FF008800' } }; // overpaid - green
    }
  }

  sheet.views = [{ state: 'frozen', ySplit: 1, rightToLeft: true }];

  const outputPath = path.join(process.cwd(), 'partial_paid_review.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Exported to: ${outputPath}`);
}

main().catch(console.error);
