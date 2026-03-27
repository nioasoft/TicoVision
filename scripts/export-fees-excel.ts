/**
 * Export Paying Clients with Fee Status for Bulk Payment Recording
 *
 * Usage:
 *   npx tsx scripts/export-fees-excel.ts
 *
 * Output: fees_bulk_payment.xlsx in project root
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

const STATUS_HEBREW: Record<string, string> = {
  draft: 'טיוטה',
  sent: 'נשלח',
  paid: 'שולם',
  overdue: 'באיחור',
  cancelled: 'בוטל',
  partial_paid: 'שולם חלקית',
};

const GRAY_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFF2F2F2' },
};

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF4472C4' },
};

const EDITABLE_HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF70AD47' },
};

const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 12,
};

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

async function main() {
  console.log(`Fetching fee tracking data for ${TAX_YEAR} (via RPC)...`);

  // Use the same RPC as the UI for consistent numbers
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_fee_tracking_data', {
    p_tenant_id: TIKO_TENANT_ID,
    p_tax_year: TAX_YEAR,
  });

  if (rpcError) {
    console.error('Failed to fetch tracking data:', rpcError.message);
    process.exit(1);
  }

  // Apply same group_calculation override as the UI service layer
  const rows = (rpcData ?? []).map((row: Record<string, unknown>) => {
    let paymentStatus = row.payment_status as string;
    if (row.group_calculation_id && paymentStatus !== 'paid_by_other') {
      const groupStatus = row.group_calculation_status as string;
      if (groupStatus === 'paid') paymentStatus = 'paid';
      else if (groupStatus === 'sent') paymentStatus = row.group_letter_sent_at ? 'pending' : 'not_sent';
      else if (groupStatus === 'draft') paymentStatus = 'not_sent';
    }
    return { ...row, payment_status: paymentStatus };
  });

  // Split by status
  const withoutFee = rows.filter((r) => r.payment_status === 'not_calculated');
  const withFeeNotSent = rows.filter((r) => r.payment_status === 'not_sent');
  const withFeePending = rows.filter((r) => r.payment_status === 'pending');
  const partialPaid = rows.filter((r) => r.payment_status === 'partial_paid');
  const paid = rows.filter((r) => r.payment_status === 'paid');
  const paidByOther = rows.filter((r) => r.payment_status === 'paid_by_other');

  // Unpaid = not_sent + pending + partial_paid (have calculation, not fully paid)
  const withFeeUnpaid = [...withFeeNotSent, ...withFeePending, ...partialPaid];

  // Fetch group fee calculations for the group section
  const { data: groupFees } = await supabase
    .from('group_fee_calculations')
    .select('id, group_id, total_final_amount_with_vat, status')
    .eq('tenant_id', TIKO_TENANT_ID)
    .eq('year', TAX_YEAR)
    .not('status', 'eq', 'paid');

  const { data: groups } = await supabase
    .from('client_groups')
    .select('id, group_name_hebrew')
    .eq('tenant_id', TIKO_TENANT_ID);

  const groupNameMap = new Map(groups?.map((g) => [g.id, g.group_name_hebrew]) ?? []);

  console.log(`Total: ${rows.length} clients`);
  console.log(`  - ${withoutFee.length} not calculated (לא חושב)`);
  console.log(`  - ${withFeeUnpaid.length} with calculation, unpaid`);
  console.log(`  - ${paid.length} paid (excluded)`);
  console.log(`  - ${paidByOther.length} paid by other (excluded)`);
  console.log(`  - ${groupFees?.length ?? 0} group fee calculations (unpaid)`);

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TicoVision CRM';
  workbook.created = new Date();

  // ── Sheet 1: Payments ──
  const sheet = workbook.addWorksheet(`תשלומים ${TAX_YEAR}`, {
    views: [{ rightToLeft: true }],
  });

  sheet.columns = [
    { header: "מס' ח.פ./ע.מ.", key: 'tax_id', width: 16 },
    { header: 'שם חברה', key: 'company_name', width: 30 },
    { header: 'סוג', key: 'type', width: 14 },
    { header: 'סכום חישוב קיים', key: 'existing_amount', width: 16 },
    { header: 'סטטוס חישוב', key: 'existing_status', width: 14 },
    { header: 'סכום ששולם (כולל מע"מ)', key: 'amount_paid', width: 22 },
    { header: 'תאריך תשלום', key: 'payment_date', width: 16 },
    { header: 'אמצעי תשלום', key: 'payment_method', width: 14 },
  ];

  // Style headers
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    const isEditable = colNumber >= 6;
    cell.fill = isEditable ? EDITABLE_HEADER_FILL : HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.border = THIN_BORDER;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  headerRow.height = 24;

  // Add "without fee" section
  for (const r of withoutFee) {
    const row = sheet.addRow({
      tax_id: r.tax_id ?? '',
      company_name: r.client_name ?? '',
      type: 'ללא חישוב',
      existing_amount: '',
      existing_status: '',
      amount_paid: null,
      payment_date: null,
      payment_method: null,
    });
    styleDataRow(row);
  }

  // Add "with fee unpaid" section
  for (const r of withFeeUnpaid) {
    const amount = r.calculation_amount ?? r.payment_amount ?? '';
    const status = r.calculation_status as string ?? '';
    const row = sheet.addRow({
      tax_id: r.tax_id ?? '',
      company_name: r.client_name ?? '',
      type: 'יש חישוב',
      existing_amount: amount,
      existing_status: STATUS_HEBREW[status] ?? status,
      amount_paid: null,
      payment_date: null,
      payment_method: null,
    });
    styleDataRow(row);
  }

  // Add "group fee" section
  for (const gf of groupFees ?? []) {
    const groupName = groupNameMap.get(gf.group_id) ?? '';
    const row = sheet.addRow({
      tax_id: `group:${gf.id}`,
      company_name: groupName,
      type: 'קבוצה',
      existing_amount: gf.total_final_amount_with_vat ?? '',
      existing_status: gf.status ? (STATUS_HEBREW[gf.status] ?? gf.status) : '',
      amount_paid: null,
      payment_date: null,
      payment_method: null,
    });
    styleDataRow(row);
    // Highlight group rows
    row.getCell(2).font = { bold: true };
    row.getCell(3).font = { bold: true, color: { argb: 'FF4472C4' } };
  }

  // Freeze header
  sheet.views = [{ state: 'frozen', ySplit: 1, rightToLeft: true }];

  // ── Sheet 2: Legend ──
  const legendSheet = workbook.addWorksheet('מקרא', {
    views: [{ rightToLeft: true }],
  });

  legendSheet.columns = [
    { width: 10 },
    { width: 20 },
    { width: 25 },
  ];

  // Payment methods
  const pmTitle = legendSheet.addRow(['אמצעי תשלום']);
  pmTitle.font = { bold: true, size: 14 };
  pmTitle.getCell(1).fill = HEADER_FILL;
  pmTitle.getCell(1).font = { ...HEADER_FONT, size: 14 };

  const pmHeader = legendSheet.addRow(['מספר', 'ערך באנגלית', 'תיאור בעברית']);
  pmHeader.font = { bold: true };
  pmHeader.eachCell((cell) => {
    cell.border = THIN_BORDER;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } };
  });

  const methodRows = [
    [1, 'bank_transfer', 'העברה בנקאית'],
    [2, 'cc_single', 'אשראי תשלום אחד'],
    [3, 'cc_installments', 'אשראי בתשלומים'],
    [4, 'checks', "צ'קים"],
  ];

  for (const mr of methodRows) {
    const row = legendSheet.addRow(mr);
    row.eachCell((cell) => { cell.border = THIN_BORDER; });
  }

  legendSheet.addRow([]);

  // Date format note
  const dateNote = legendSheet.addRow(['פורמט תאריך']);
  dateNote.font = { bold: true, size: 14 };
  dateNote.getCell(1).fill = HEADER_FILL;
  dateNote.getCell(1).font = { ...HEADER_FONT, size: 14 };

  const dateExample = legendSheet.addRow(['DD/MM/YYYY', '', 'לדוגמה: 15/01/2026']);
  dateExample.eachCell((cell) => { cell.border = THIN_BORDER; });

  // Save
  const outputPath = path.join(process.cwd(), 'fees_bulk_payment.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`\nExported to: ${outputPath}`);
}

function styleDataRow(row: ExcelJS.Row) {
  // Read-only cells (columns 1-5)
  for (const colNum of [1, 2, 3, 4, 5]) {
    const cell = row.getCell(colNum);
    cell.fill = GRAY_FILL;
    cell.border = THIN_BORDER;
  }
  // Editable cells (columns 6-8)
  for (const colNum of [6, 7, 8]) {
    const cell = row.getCell(colNum);
    cell.border = THIN_BORDER;
    cell.alignment = { horizontal: 'center' };
  }
  // Center amount column
  row.getCell(4).alignment = { horizontal: 'center' };
  row.getCell(5).alignment = { horizontal: 'center' };
}

main().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
