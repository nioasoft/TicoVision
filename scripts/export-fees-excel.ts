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
  console.log(`Fetching paying clients for ${TAX_YEAR}...`);

  // Fetch active paying clients
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, tax_id, company_name, payment_role')
    .eq('tenant_id', TIKO_TENANT_ID)
    .in('payment_role', ['independent', 'primary_payer'])
    .eq('status', 'active')
    .order('company_name');

  if (clientsError) {
    console.error('Failed to fetch clients:', clientsError.message);
    process.exit(1);
  }

  // Fetch ALL fee_calculations for the year (to know who has one and who's paid)
  const { data: allFees, error: feesError } = await supabase
    .from('fee_calculations')
    .select('id, client_id, total_amount, calculated_with_vat, final_amount, status')
    .eq('tenant_id', TIKO_TENANT_ID)
    .eq('year', TAX_YEAR);

  if (feesError) {
    console.error('Failed to fetch fee calculations:', feesError.message);
    process.exit(1);
  }

  const feeByClientId = new Map(
    (allFees ?? []).map((f) => [f.client_id, f])
  );

  // Split into three groups
  const withoutFee: typeof clients = [];
  const withFee: typeof clients = [];
  let alreadyPaid = 0;

  for (const client of clients ?? []) {
    const fee = feeByClientId.get(client.id);
    if (fee?.status === 'paid') {
      alreadyPaid++;
      continue; // Skip already paid
    }
    if (fee) {
      withFee.push(client);
    } else {
      withoutFee.push(client);
    }
  }

  // Fetch unpaid group fee calculations
  const { data: groupFees, error: groupFeesError } = await supabase
    .from('group_fee_calculations')
    .select('id, group_id, total_final_amount_with_vat, status')
    .eq('tenant_id', TIKO_TENANT_ID)
    .eq('year', TAX_YEAR)
    .not('status', 'eq', 'paid');

  if (groupFeesError) {
    console.error('Failed to fetch group fees:', groupFeesError.message);
    process.exit(1);
  }

  // Fetch group names
  const { data: groups, error: groupsError } = await supabase
    .from('client_groups')
    .select('id, group_name_hebrew')
    .eq('tenant_id', TIKO_TENANT_ID);

  if (groupsError) {
    console.error('Failed to fetch groups:', groupsError.message);
    process.exit(1);
  }

  const groupNameMap = new Map(groups?.map((g) => [g.id, g.group_name_hebrew]) ?? []);

  console.log(`Found ${clients?.length ?? 0} paying clients:`);
  console.log(`  - ${withoutFee.length} without fee calculation`);
  console.log(`  - ${withFee.length} with fee calculation (unpaid)`);
  console.log(`  - ${alreadyPaid} already paid (excluded)`);
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
  for (const client of withoutFee) {
    const row = sheet.addRow({
      tax_id: client.tax_id ?? '',
      company_name: client.company_name ?? '',
      type: 'ללא חישוב',
      existing_amount: '',
      existing_status: '',
      amount_paid: null,
      payment_date: null,
      payment_method: null,
    });
    styleDataRow(row);
  }

  // Add "with fee" section
  for (const client of withFee) {
    const fee = feeByClientId.get(client.id);
    const amount = fee?.calculated_with_vat ?? fee?.total_amount ?? fee?.final_amount ?? '';
    const row = sheet.addRow({
      tax_id: client.tax_id ?? '',
      company_name: client.company_name ?? '',
      type: 'יש חישוב',
      existing_amount: amount,
      existing_status: fee?.status ? (STATUS_HEBREW[fee.status] ?? fee.status) : '',
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
