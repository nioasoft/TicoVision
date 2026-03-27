import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const TENANT = 'baa88f3b-5998-4440-952f-9fd661a28598';
const LANDORA_GROUP = '1e74e1d8-708e-4eb6-94ca-049fe2ea8718';

const METHOD_HEB: Record<string, string> = {
  bank_transfer: 'העברה', cc_single: 'אשראי', cc_installments: 'תשלומים', checks: "צ'קים",
};

const GRAY: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
const BLUE: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
const GREEN: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
const HFONT: Partial<ExcelJS.Font> = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
const B: Partial<ExcelJS.Borders> = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

async function main() {
  const { data: clients } = await supabase
    .from('clients')
    .select('id, tax_id, company_name, payment_role')
    .eq('tenant_id', TENANT)
    .eq('group_id', LANDORA_GROUP)
    .eq('status', 'active')
    .order('company_name');

  const clientIds = (clients ?? []).map(c => c.id);

  const { data: feeCalcs } = await supabase
    .from('fee_calculations')
    .select('id, client_id, calculated_with_vat, total_amount, status')
    .eq('tenant_id', TENANT)
    .eq('year', 2026)
    .in('client_id', clientIds);

  const feeByClient = new Map((feeCalcs ?? []).map(f => [f.client_id, f]));

  const feeIds = (feeCalcs ?? []).map(f => f.id).filter(Boolean);
  const { data: payments } = await supabase
    .from('actual_payments')
    .select('fee_calculation_id, amount_paid, payment_date, payment_method')
    .in('fee_calculation_id', feeIds);

  const payByFee = new Map((payments ?? []).map(p => [p.fee_calculation_id, p]));

  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('קבוצת לאנדורה', { views: [{ rightToLeft: true }] });

  sheet.columns = [
    { header: "ח.פ.", key: 'tax_id', width: 14 },
    { header: 'שם חברה', key: 'name', width: 30 },
    { header: 'תפקיד', key: 'role', width: 12 },
    { header: 'סכום חישוב', key: 'calc_amount', width: 14 },
    { header: 'סטטוס', key: 'status', width: 12 },
    { header: 'שולם', key: 'paid_amount', width: 14 },
    { header: 'תאריך תשלום', key: 'paid_date', width: 14 },
    { header: 'אמצעי', key: 'method', width: 12 },
    { header: 'סכום נכון (כולל מע"מ)', key: 'correct_amount', width: 20 },
    { header: 'תאריך תשלום חדש', key: 'new_date', width: 16 },
    { header: 'אמצעי תשלום (1-4)', key: 'new_method', width: 16 },
    { header: 'הערות', key: 'notes', width: 20 },
  ];

  const hr = sheet.getRow(1);
  hr.eachCell((cell, col) => {
    cell.fill = col >= 9 ? GREEN : BLUE;
    cell.font = HFONT;
    cell.border = B;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  hr.height = 22;

  const statusHeb: Record<string, string> = { paid: 'שולם', sent: 'נשלח', draft: 'טיוטה' };

  for (const c of clients ?? []) {
    const fee = feeByClient.get(c.id);
    const pay = fee ? payByFee.get(fee.id) : null;

    const row = sheet.addRow({
      tax_id: c.tax_id,
      name: c.company_name,
      role: c.payment_role === 'member' ? 'חלק מקבוצה' : 'משלם לבד',
      calc_amount: fee ? Number(fee.calculated_with_vat ?? fee.total_amount) : '',
      status: fee ? (statusHeb[fee.status] ?? fee.status) : 'ללא חישוב',
      paid_amount: pay ? Number(pay.amount_paid) : '',
      paid_date: pay?.payment_date ?? '',
      method: pay ? (METHOD_HEB[pay.payment_method] ?? pay.payment_method) : '',
      correct_amount: null,
      new_date: null,
      new_method: null,
      notes: null,
    });

    for (let col = 1; col <= 8; col++) {
      row.getCell(col).fill = GRAY;
      row.getCell(col).border = B;
    }
    for (let col = 9; col <= 12; col++) {
      row.getCell(col).border = B;
      row.getCell(col).alignment = { horizontal: 'center' };
    }
  }

  sheet.views = [{ state: 'frozen', ySplit: 1, rightToLeft: true }];

  const out = path.join(process.cwd(), 'landora_group.xlsx');
  await wb.xlsx.writeFile(out);
  console.log(`Exported ${clients?.length} clients to: ${out}`);
}

main().catch(console.error);
