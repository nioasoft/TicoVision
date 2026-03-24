/**
 * Import Client Payment Roles & Status from Excel
 *
 * Usage:
 *   npx tsx scripts/import-clients-excel.ts --dry-run    # Preview changes
 *   npx tsx scripts/import-clients-excel.ts              # Apply changes
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

const isDryRun = process.argv.includes('--dry-run');

const PAYMENT_ROLE_REVERSE: Record<number, string> = {
  1: 'independent',
  2: 'member',
  3: 'primary_payer',
};

const STATUS_REVERSE: Record<number, string> = {
  1: 'active',
  2: 'inactive',
  3: 'pending',
};

const PAYMENT_ROLE_HEBREW: Record<number, string> = {
  1: 'משלם לבד',
  2: 'חלק מקבוצה',
  3: 'משלם ראשי',
};

const STATUS_HEBREW: Record<number, string> = {
  1: 'פעיל',
  2: 'לא פעיל',
  3: 'ממתין',
};

interface ChangeRecord {
  taxId: string;
  companyName: string;
  paymentRoleChange?: { from: string; to: string };
  statusChange?: { from: string; to: string };
  groupChange?: { from: string; to: string; newGroupId: string };
}

async function main() {
  const filePath = path.join(process.cwd(), 'clients_bulk_update.xlsx');

  console.log(isDryRun ? '=== DRY RUN ===' : '=== APPLYING CHANGES ===');
  console.log(`Reading: ${filePath}\n`);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.getWorksheet('לקוחות');
  if (!sheet) {
    console.error('Sheet "לקוחות" not found in workbook');
    process.exit(1);
  }

  // Fetch existing clients for matching by tax_id
  const { data: clients, error } = await supabase
    .from('clients')
    .select('id, tax_id, company_name, payment_role, status, group_id')
    .eq('tenant_id', TIKO_TENANT_ID);

  if (error) {
    console.error('Failed to fetch clients:', error.message);
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

  const groupByName = new Map(
    (groups ?? []).map((g) => [g.group_name_hebrew?.trim(), g.id])
  );

  // Typo corrections for group names
  const GROUP_ALIASES: Record<string, string> = {
    'לאנדרה': 'קבוצת לאנדורה',
  };

  function findGroupId(name: string): string | undefined {
    // 1. Exact match
    const exact = groupByName.get(name);
    if (exact) return exact;
    // 2. Check alias
    const aliased = GROUP_ALIASES[name];
    if (aliased) return groupByName.get(aliased);
    // 3. Try prepending "קבוצת "
    const prefixed = `קבוצת ${name}`;
    return groupByName.get(prefixed);
  }
  const groupById = new Map(
    (groups ?? []).map((g) => [g.id, g.group_name_hebrew])
  );

  const clientByTaxId = new Map(
    (clients ?? []).map((c) => [c.tax_id, c])
  );

  const changes: ChangeRecord[] = [];
  const errors: string[] = [];
  let skipped = 0;

  // Process rows (skip header at row 1)
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const taxId = String(row.getCell(1).value ?? '').trim();
    const companyName = String(row.getCell(2).value ?? '').trim();
    const newPaymentRoleRaw = row.getCell(5).value;
    const newStatusRaw = row.getCell(7).value;
    const newGroupRaw = row.getCell(8).value;

    const hasPaymentRole = newPaymentRoleRaw != null && String(newPaymentRoleRaw).trim() !== '';
    const hasStatus = newStatusRaw != null && String(newStatusRaw).trim() !== '';
    const hasGroup = newGroupRaw != null && String(newGroupRaw).trim() !== '';

    // Skip if no changes
    if (!hasPaymentRole && !hasStatus && !hasGroup) {
      skipped++;
      return;
    }

    if (!taxId) {
      errors.push(`Row ${rowNumber}: missing tax_id`);
      return;
    }

    const client = clientByTaxId.get(taxId);
    if (!client) {
      errors.push(`Row ${rowNumber}: tax_id "${taxId}" not found in database`);
      return;
    }

    const change: ChangeRecord = { taxId, companyName };

    // Validate and map payment role
    if (newPaymentRoleRaw != null && String(newPaymentRoleRaw).trim() !== '') {
      const num = Number(newPaymentRoleRaw);
      if (!PAYMENT_ROLE_REVERSE[num]) {
        errors.push(`Row ${rowNumber} [${taxId}]: invalid payment role "${newPaymentRoleRaw}" (must be 1-3)`);
        return;
      }
      const currentNum = Object.entries(PAYMENT_ROLE_REVERSE).find(
        ([, v]) => v === client.payment_role
      )?.[0];
      if (String(num) !== currentNum) {
        change.paymentRoleChange = {
          from: `${client.payment_role} (${PAYMENT_ROLE_HEBREW[Number(currentNum)] ?? '?'})`,
          to: `${PAYMENT_ROLE_REVERSE[num]} (${PAYMENT_ROLE_HEBREW[num]})`,
        };
      }
    }

    // Validate and map status
    if (newStatusRaw != null && String(newStatusRaw).trim() !== '') {
      const num = Number(newStatusRaw);
      if (!STATUS_REVERSE[num]) {
        errors.push(`Row ${rowNumber} [${taxId}]: invalid status "${newStatusRaw}" (must be 1-3)`);
        return;
      }
      const currentNum = Object.entries(STATUS_REVERSE).find(
        ([, v]) => v === client.status
      )?.[0];
      if (String(num) !== currentNum) {
        change.statusChange = {
          from: `${client.status} (${STATUS_HEBREW[Number(currentNum)] ?? '?'})`,
          to: `${STATUS_REVERSE[num]} (${STATUS_HEBREW[num]})`,
        };
      }
    }

    // Validate and map group
    if (hasGroup) {
      const groupName = String(newGroupRaw).trim();
      const groupId = findGroupId(groupName);
      if (!groupId) {
        errors.push(`Row ${rowNumber} [${taxId}]: group "${groupName}" not found (check spelling in legend sheet)`);
        return;
      }
      const currentGroupName = client.group_id ? (groupById.get(client.group_id) ?? 'ללא') : 'ללא';
      if (client.group_id !== groupId) {
        change.groupChange = {
          from: currentGroupName,
          to: groupName,
          newGroupId: groupId,
        };
      }
    }

    // Only add if there's an actual change
    if (change.paymentRoleChange || change.statusChange || change.groupChange) {
      changes.push(change);
    } else {
      skipped++;
    }
  });

  // Print changes
  if (changes.length > 0) {
    console.log(`Changes to apply (${changes.length}):\n`);
    for (const c of changes) {
      const parts: string[] = [];
      if (c.paymentRoleChange) {
        parts.push(`payment_role: ${c.paymentRoleChange.from} → ${c.paymentRoleChange.to}`);
      }
      if (c.statusChange) {
        parts.push(`status: ${c.statusChange.from} → ${c.statusChange.to}`);
      }
      if (c.groupChange) {
        parts.push(`group: ${c.groupChange.from} → ${c.groupChange.to}`);
      }
      console.log(`  [${c.taxId}] ${c.companyName}`);
      for (const p of parts) {
        console.log(`    ${p}`);
      }
    }
  }

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    for (const e of errors) {
      console.log(`  ${e}`);
    }
  }

  console.log(`\nSummary: ${changes.length} to update, ${skipped} skipped, ${errors.length} errors`);

  // Apply changes
  if (!isDryRun && changes.length > 0) {
    console.log('\nApplying changes...');
    let updated = 0;
    let failed = 0;

    for (const c of changes) {
      const client = clientByTaxId.get(c.taxId);
      if (!client) continue;

      const updates: Record<string, string | null> = {};
      if (c.paymentRoleChange) {
        const num = Object.entries(PAYMENT_ROLE_REVERSE).find(
          ([, v]) => c.paymentRoleChange!.to.startsWith(v)
        )?.[0];
        if (num) updates.payment_role = PAYMENT_ROLE_REVERSE[Number(num)];
      }
      if (c.statusChange) {
        const num = Object.entries(STATUS_REVERSE).find(
          ([, v]) => c.statusChange!.to.startsWith(v)
        )?.[0];
        if (num) updates.status = STATUS_REVERSE[Number(num)];
      }
      if (c.groupChange) {
        updates.group_id = c.groupChange.newGroupId;
      }

      const { error: updateError } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', client.id)
        .eq('tenant_id', TIKO_TENANT_ID);

      if (updateError) {
        console.error(`  Failed [${c.taxId}]: ${updateError.message}`);
        failed++;
      } else {
        updated++;
      }
    }

    console.log(`\nDone: ${updated} updated, ${failed} failed`);
  } else if (isDryRun && changes.length > 0) {
    console.log('\nThis was a dry run. Run without --dry-run to apply changes.');
  }
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
