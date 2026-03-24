/**
 * Export Clients to Excel for Bulk Payment Role & Status Update
 *
 * Usage:
 *   npx tsx scripts/export-clients-excel.ts
 *
 * Output: clients_bulk_update.xlsx in project root
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

const PAYMENT_ROLE_MAP: Record<string, number> = {
  independent: 1,
  member: 2,
  primary_payer: 3,
};

const STATUS_MAP: Record<string, number> = {
  active: 1,
  inactive: 2,
  pending: 3,
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
  console.log('Fetching clients...');

  // Fetch all clients for tenant
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, tax_id, company_name, payment_role, status, group_id')
    .eq('tenant_id', TIKO_TENANT_ID)
    .order('company_name');

  if (clientsError) {
    console.error('Failed to fetch clients:', clientsError.message);
    process.exit(1);
  }

  // Fetch groups for name lookup
  const { data: groups, error: groupsError } = await supabase
    .from('client_groups')
    .select('id, group_name_hebrew')
    .eq('tenant_id', TIKO_TENANT_ID);

  if (groupsError) {
    console.error('Failed to fetch groups:', groupsError.message);
    process.exit(1);
  }

  const groupMap = new Map(groups?.map((g) => [g.id, g.group_name_hebrew]) ?? []);

  // Sort: group members first (by group name), then rest (by company name)
  const sorted = [...(clients ?? [])].sort((a, b) => {
    const aHasGroup = !!a.group_id;
    const bHasGroup = !!b.group_id;

    if (aHasGroup && !bHasGroup) return -1;
    if (!aHasGroup && bHasGroup) return 1;

    if (aHasGroup && bHasGroup) {
      const aGroupName = groupMap.get(a.group_id) ?? '';
      const bGroupName = groupMap.get(b.group_id) ?? '';
      const groupCompare = aGroupName.localeCompare(bGroupName, 'he');
      if (groupCompare !== 0) return groupCompare;
    }

    return (a.company_name ?? '').localeCompare(b.company_name ?? '', 'he');
  });

  console.log(`Found ${sorted.length} clients (${groups?.length ?? 0} groups)`);

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TicoVision CRM';
  workbook.created = new Date();

  // ── Sheet 1: Clients ──
  const clientsSheet = workbook.addWorksheet('לקוחות', {
    views: [{ rightToLeft: true }],
  });

  // Define columns
  clientsSheet.columns = [
    { header: "מס' ח.פ./ע.מ.", key: 'tax_id', width: 16 },
    { header: 'שם חברה', key: 'company_name', width: 30 },
    { header: 'שם קבוצה', key: 'group_name', width: 20 },
    { header: 'תפקיד תשלום נוכחי', key: 'current_payment_role', width: 18 },
    { header: 'תפקיד תשלום חדש', key: 'new_payment_role', width: 18 },
    { header: 'סטטוס נוכחי', key: 'current_status', width: 14 },
    { header: 'סטטוס חדש', key: 'new_status', width: 14 },
    { header: 'שיוך לקבוצה חדש', key: 'new_group', width: 22 },
  ];

  // Style headers
  const headerRow = clientsSheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    const isEditable = colNumber === 5 || colNumber === 7 || colNumber === 8;
    cell.fill = isEditable ? EDITABLE_HEADER_FILL : HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.border = THIN_BORDER;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  headerRow.height = 24;

  // Add data rows
  for (const client of sorted) {
    const row = clientsSheet.addRow({
      tax_id: client.tax_id ?? '',
      company_name: client.company_name ?? '',
      group_name: client.group_id ? (groupMap.get(client.group_id) ?? '') : '',
      current_payment_role: PAYMENT_ROLE_MAP[client.payment_role] ?? '',
      new_payment_role: null,
      current_status: STATUS_MAP[client.status] ?? '',
      new_status: null,
      new_group: null,
    });

    // Style read-only cells (columns 1-4, 6)
    for (const colNum of [1, 2, 3, 4, 6]) {
      const cell = row.getCell(colNum);
      cell.fill = GRAY_FILL;
      cell.border = THIN_BORDER;
    }

    // Style editable cells (columns 5, 7, 8)
    for (const colNum of [5, 7, 8]) {
      const cell = row.getCell(colNum);
      cell.border = THIN_BORDER;
      cell.alignment = { horizontal: 'center' };
    }

    // Center number columns
    for (const colNum of [4, 6]) {
      row.getCell(colNum).alignment = { horizontal: 'center' };
    }
  }

  // Freeze header row
  clientsSheet.views = [{ state: 'frozen', ySplit: 1, rightToLeft: true }];

  // ── Sheet 2: Legend ──
  const legendSheet = workbook.addWorksheet('מקרא', {
    views: [{ rightToLeft: true }],
  });

  legendSheet.columns = [
    { width: 10 },
    { width: 20 },
    { width: 25 },
  ];

  // Payment Role legend
  const prTitle = legendSheet.addRow(['תפקיד תשלום']);
  prTitle.font = { bold: true, size: 14 };
  prTitle.getCell(1).fill = HEADER_FILL;
  prTitle.getCell(1).font = { ...HEADER_FONT, size: 14 };

  const prHeader = legendSheet.addRow(['מספר', 'ערך באנגלית', 'תיאור בעברית']);
  prHeader.font = { bold: true };
  prHeader.eachCell((cell) => {
    cell.border = THIN_BORDER;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } };
  });

  const paymentRoleRows = [
    [1, 'independent', 'משלם לבד'],
    [2, 'member', 'חלק מקבוצה'],
    [3, 'primary_payer', 'משלם ראשי'],
  ];

  for (const prRow of paymentRoleRows) {
    const row = legendSheet.addRow(prRow);
    row.eachCell((cell) => { cell.border = THIN_BORDER; });
  }

  // Spacer
  legendSheet.addRow([]);

  // Status legend
  const sTitle = legendSheet.addRow(['סטטוס']);
  sTitle.font = { bold: true, size: 14 };
  sTitle.getCell(1).fill = HEADER_FILL;
  sTitle.getCell(1).font = { ...HEADER_FONT, size: 14 };

  const sHeader = legendSheet.addRow(['מספר', 'ערך באנגלית', 'תיאור בעברית']);
  sHeader.font = { bold: true };
  sHeader.eachCell((cell) => {
    cell.border = THIN_BORDER;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } };
  });

  const statusRows = [
    [1, 'active', 'פעיל'],
    [2, 'inactive', 'לא פעיל'],
    [3, 'pending', 'ממתין'],
  ];

  for (const sRow of statusRows) {
    const row = legendSheet.addRow(sRow);
    row.eachCell((cell) => { cell.border = THIN_BORDER; });
  }

  // Spacer
  legendSheet.addRow([]);

  // Groups list
  const gTitle = legendSheet.addRow(['קבוצות קיימות']);
  gTitle.font = { bold: true, size: 14 };
  gTitle.getCell(1).fill = HEADER_FILL;
  gTitle.getCell(1).font = { ...HEADER_FONT, size: 14 };

  const gHeader = legendSheet.addRow(['#', 'שם קבוצה']);
  gHeader.font = { bold: true };
  gHeader.eachCell((cell) => {
    cell.border = THIN_BORDER;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } };
  });

  const sortedGroups = [...(groups ?? [])].sort((a, b) =>
    (a.group_name_hebrew ?? '').localeCompare(b.group_name_hebrew ?? '', 'he')
  );
  for (let i = 0; i < sortedGroups.length; i++) {
    const row = legendSheet.addRow([i + 1, sortedGroups[i].group_name_hebrew]);
    row.eachCell((cell) => { cell.border = THIN_BORDER; });
  }

  // Save
  const outputPath = path.join(process.cwd(), 'clients_bulk_update.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Exported ${sorted.length} clients to: ${outputPath}`);
}

main().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
