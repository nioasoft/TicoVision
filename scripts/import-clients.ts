/**
 * Client Import Script from CSV
 *
 * Usage:
 *   npx tsx scripts/import-clients.ts --dry-run    # Preview what will be imported
 *   npx tsx scripts/import-clients.ts              # Execute import
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Verify required environment variables
if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Tiko tenant ID (verified from database)
const TIKO_TENANT_ID = 'baa88f3b-5998-4440-952f-9fd661a28598';

// CSV file path
const CSV_FILE = path.join(process.cwd(), 'clients24_updated.csv');

// Check if dry run
const isDryRun = process.argv.includes('--dry-run');

// ============ Types ============

interface CSVRow {
  name: string;
  taxId: string;
  internalExternal: string;
  accountant: { name: string; email: string; phone: string } | null;
  owners: Array<{ name: string; email: string; phone: string }>;
}

interface ImportStats {
  totalRows: number;
  skippedNoTaxId: number;
  skippedTestRow: number;
  skippedExists: number;
  toImport: number;
  contactsToCreate: number;
  contactsToReuse: number;
  companies: CSVRow[];
}

// ============ Utility Functions ============

function formatPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.toString().replace(/\D/g, '');

  // Israeli mobile numbers: 05X-XXXXXXX (10 digits)
  // If 9 digits and starts with 5, add leading 0
  if (cleaned.length === 9 && cleaned.startsWith('5')) {
    return '0' + cleaned;
  }
  // If 9 digits and doesn't start with 0, add leading 0
  if (cleaned.length === 9 && !cleaned.startsWith('0')) {
    return '0' + cleaned;
  }
  // If already 10 digits, return as is
  if (cleaned.length === 10) {
    return cleaned;
  }
  return cleaned;
}

function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

function parseCSV(content: string): string[][] {
  const lines = content.split('\n');
  const result: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    const row: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    row.push(current.trim());
    result.push(row);
  }

  return result;
}

function parseCSVRow(row: string[]): CSVRow | null {
  const [
    name,
    taxId,
    internalExternal,
    accountantName,
    accountantEmail,
    accountantPhone,
    owner1Name,
    owner1Email,
    owner1Phone,
    owner2Name,
    owner2Email,
    owner2Phone,
    owner3Name,
    owner3Email,
    owner3Phone,
    owner4Name,
    owner4Email,
    owner4Phone,
  ] = row;

  // Skip if no tax ID
  if (!taxId || taxId.trim() === '') {
    return null;
  }

  // Skip test row
  if (taxId === '511111111' || name.includes('אוראל בדיקה')) {
    return null;
  }

  const owners: Array<{ name: string; email: string; phone: string }> = [];

  if (owner1Name?.trim()) {
    owners.push({
      name: owner1Name.trim(),
      email: normalizeEmail(owner1Email),
      phone: formatPhone(owner1Phone),
    });
  }
  if (owner2Name?.trim()) {
    owners.push({
      name: owner2Name.trim(),
      email: normalizeEmail(owner2Email),
      phone: formatPhone(owner2Phone),
    });
  }
  if (owner3Name?.trim()) {
    owners.push({
      name: owner3Name.trim(),
      email: normalizeEmail(owner3Email),
      phone: formatPhone(owner3Phone),
    });
  }
  if (owner4Name?.trim()) {
    owners.push({
      name: owner4Name.trim(),
      email: normalizeEmail(owner4Email),
      phone: formatPhone(owner4Phone),
    });
  }

  return {
    name: name.trim(),
    taxId: taxId.trim(),
    internalExternal: internalExternal?.trim() || 'חיצוני',
    accountant: accountantName?.trim()
      ? {
          name: accountantName.trim(),
          email: normalizeEmail(accountantEmail),
          phone: formatPhone(accountantPhone),
        }
      : null,
    owners,
  };
}

// ============ Database Functions ============

async function checkClientExists(taxId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('clients')
    .select('id')
    .eq('tenant_id', TIKO_TENANT_ID)
    .eq('tax_id', taxId)
    .maybeSingle();

  if (error) {
    console.error(`Error checking tax_id ${taxId}:`, error.message);
    return false;
  }

  return !!data;
}

async function findContactByEmail(email: string): Promise<string | null> {
  if (!email) return null;

  const { data, error } = await supabase
    .from('tenant_contacts')
    .select('id')
    .eq('tenant_id', TIKO_TENANT_ID)
    .ilike('email', email)
    .maybeSingle();

  if (error) {
    console.error(`Error finding contact by email ${email}:`, error.message);
    return null;
  }

  return data?.id || null;
}

async function findContactByPhone(phone: string): Promise<string | null> {
  if (!phone) return null;

  const { data, error } = await supabase
    .from('tenant_contacts')
    .select('id')
    .eq('tenant_id', TIKO_TENANT_ID)
    .eq('phone', phone)
    .maybeSingle();

  if (error) {
    console.error(`Error finding contact by phone ${phone}:`, error.message);
    return null;
  }

  return data?.id || null;
}

async function createContact(
  contact: { name: string; email: string; phone: string },
  contactType: 'owner' | 'accountant_manager'
): Promise<string | null> {
  // Try to find existing by email first
  if (contact.email) {
    const existingId = await findContactByEmail(contact.email);
    if (existingId) return existingId;
  }

  // Try to find by phone
  if (contact.phone) {
    const existingId = await findContactByPhone(contact.phone);
    if (existingId) return existingId;
  }

  // Create new contact
  const { data, error } = await supabase
    .from('tenant_contacts')
    .insert({
      tenant_id: TIKO_TENANT_ID,
      full_name: contact.name,
      email: contact.email || null,
      phone: contact.phone || null,
      contact_type: contactType,
    })
    .select('id')
    .single();

  if (error) {
    console.error(`Error creating contact ${contact.name}:`, error.message);
    return null;
  }

  return data?.id || null;
}

async function createClient(row: CSVRow): Promise<string | null> {
  const primaryContact = row.owners[0] || row.accountant;

  if (!primaryContact) {
    console.error(`No contact info for company ${row.name}`);
    return null;
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({
      tenant_id: TIKO_TENANT_ID,
      company_name: row.name,
      tax_id: row.taxId,
      internal_external: row.internalExternal === 'פנימי' ? 'internal' : 'external',
      contact_name: primaryContact.name,
      contact_email: primaryContact.email || null,
      contact_phone: primaryContact.phone || null,
      client_type: 'company',
      status: 'active',
      company_status: 'active',
    })
    .select('id')
    .single();

  if (error) {
    console.error(`Error creating client ${row.name}:`, error.message);
    return null;
  }

  return data?.id || null;
}

async function assignContactToClient(
  clientId: string,
  contactId: string,
  isPrimary: boolean,
  roleAtClient: string
): Promise<boolean> {
  // Check if assignment already exists
  const { data: existing } = await supabase
    .from('client_contact_assignments')
    .select('id')
    .eq('client_id', clientId)
    .eq('contact_id', contactId)
    .maybeSingle();

  if (existing) {
    return true; // Already assigned
  }

  const { error } = await supabase
    .from('client_contact_assignments')
    .insert({
      client_id: clientId,
      contact_id: contactId,
      is_primary: isPrimary,
      role_at_client: roleAtClient,
      email_preference: 'all',
    });

  if (error) {
    console.error(`Error assigning contact to client:`, error.message);
    return false;
  }

  return true;
}

// ============ Main Functions ============

async function analyzeData(): Promise<ImportStats> {
  console.log('📖 Reading CSV file...');

  if (!fs.existsSync(CSV_FILE)) {
    console.error(`❌ CSV file not found: ${CSV_FILE}`);
    process.exit(1);
  }

  const content = fs.readFileSync(CSV_FILE, 'utf-8');
  const rows = parseCSV(content);

  console.log(`Found ${rows.length} rows (including header)`);

  const stats: ImportStats = {
    totalRows: rows.length - 1, // Exclude header
    skippedNoTaxId: 0,
    skippedTestRow: 0,
    skippedExists: 0,
    toImport: 0,
    contactsToCreate: 0,
    contactsToReuse: 0,
    companies: [],
  };

  // Track unique emails/phones to estimate dedup
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();

  console.log('🔍 Analyzing rows...\n');

  // Skip header (row 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const parsed = parseCSVRow(row);

    if (!parsed) {
      if (!row[1] || row[1].trim() === '') {
        stats.skippedNoTaxId++;
      } else {
        stats.skippedTestRow++;
      }
      continue;
    }

    // Check if client already exists
    const exists = await checkClientExists(parsed.taxId);
    if (exists) {
      stats.skippedExists++;
      continue;
    }

    stats.companies.push(parsed);
    stats.toImport++;

    // Count contacts
    const contacts = [...parsed.owners];
    if (parsed.accountant) {
      contacts.push(parsed.accountant);
    }

    for (const contact of contacts) {
      let willReuse = false;

      if (contact.email) {
        if (seenEmails.has(contact.email)) {
          willReuse = true;
        } else {
          // Check in database
          const existingId = await findContactByEmail(contact.email);
          if (existingId) {
            willReuse = true;
          }
          seenEmails.add(contact.email);
        }
      }

      if (!willReuse && contact.phone) {
        if (seenPhones.has(contact.phone)) {
          willReuse = true;
        } else {
          const existingId = await findContactByPhone(contact.phone);
          if (existingId) {
            willReuse = true;
          }
          seenPhones.add(contact.phone);
        }
      }

      if (willReuse) {
        stats.contactsToReuse++;
      } else {
        stats.contactsToCreate++;
      }
    }
  }

  return stats;
}

async function executeImport(stats: ImportStats): Promise<void> {
  console.log('\n🚀 Starting import...\n');

  let imported = 0;
  let failed = 0;

  for (const company of stats.companies) {
    process.stdout.write(`📦 ${company.name} (${company.taxId})... `);

    // Create client
    const clientId = await createClient(company);
    if (!clientId) {
      console.log('❌ Failed to create client');
      failed++;
      continue;
    }

    // Create and assign contacts
    const contacts: Array<{
      data: { name: string; email: string; phone: string };
      type: 'owner' | 'accountant_manager';
      isPrimary: boolean;
      role: string;
    }> = [];

    // Add owners
    company.owners.forEach((owner, index) => {
      contacts.push({
        data: owner,
        type: 'owner',
        isPrimary: index === 0, // First owner is primary
        role: 'בעל מניות',
      });
    });

    // Add accountant
    if (company.accountant) {
      contacts.push({
        data: company.accountant,
        type: 'accountant_manager',
        isPrimary: company.owners.length === 0, // Primary only if no owners
        role: 'מנהלת חשבונות',
      });
    }

    let contactsAssigned = 0;
    for (const contact of contacts) {
      const contactId = await createContact(contact.data, contact.type);
      if (contactId) {
        const assigned = await assignContactToClient(
          clientId,
          contactId,
          contact.isPrimary,
          contact.role
        );
        if (assigned) {
          contactsAssigned++;
        }
      }
    }

    console.log(`✅ Created with ${contactsAssigned} contacts`);
    imported++;
  }

  console.log('\n========================================');
  console.log('📊 Import Summary');
  console.log('========================================');
  console.log(`✅ Successfully imported: ${imported}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('========================================\n');
}

// ============ Entry Point ============

async function main() {
  console.log('========================================');
  console.log('🏢 TicoVision Client Import Script');
  console.log('========================================\n');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Verify tenant exists
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name')
    .eq('id', TIKO_TENANT_ID)
    .single();

  if (tenantError || !tenant) {
    console.error('❌ Tiko tenant not found!');
    console.error('Please verify TIKO_TENANT_ID is correct');
    process.exit(1);
  }

  console.log(`📍 Target tenant: ${tenant.name}\n`);

  // Analyze data
  const stats = await analyzeData();

  // Print report
  console.log('\n========================================');
  console.log('📊 Analysis Report');
  console.log('========================================');
  console.log(`Total rows in CSV:        ${stats.totalRows}`);
  console.log(`Skipped (no tax ID):      ${stats.skippedNoTaxId}`);
  console.log(`Skipped (test row):       ${stats.skippedTestRow}`);
  console.log(`Skipped (already exists): ${stats.skippedExists}`);
  console.log(`----------------------------------------`);
  console.log(`Companies to import:      ${stats.toImport}`);
  console.log(`Contacts to create:       ${stats.contactsToCreate}`);
  console.log(`Contacts to reuse:        ${stats.contactsToReuse}`);
  console.log('========================================\n');

  if (isDryRun) {
    console.log('✅ Dry run complete. Run without --dry-run to execute import.\n');

    // Show first 5 companies as preview
    console.log('📋 Preview (first 5 companies to import):');
    console.log('----------------------------------------');
    for (const company of stats.companies.slice(0, 5)) {
      console.log(`• ${company.name} (${company.taxId})`);
      console.log(`  Type: ${company.internalExternal}`);
      if (company.accountant) {
        console.log(`  Accountant: ${company.accountant.name}`);
      }
      console.log(`  Owners: ${company.owners.map(o => o.name).join(', ') || 'None'}`);
      console.log('');
    }

    process.exit(0);
  }

  // Execute import
  await executeImport(stats);
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
