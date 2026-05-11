/**
 * Onboard a restricted user for a single-client approvals page.
 *
 * Sets up everything a restricted user needs in one shot:
 *   1. Verifies the user exists in auth.users
 *   2. Verifies the client exists (resolves by company_name or UUID)
 *   3. Inserts user_tenant_access row (or updates existing) with:
 *        role='restricted', is_active=true,
 *        permissions={ restricted_route, display_name }
 *   4. Inserts user_client_assignments row (skips if exists)
 *
 * RLS for generated_letters since 2026-05-11 (migration
 * 20260511_fix_restricted_users_letter_policies.sql) reads
 * user_client_assignments, so steps 3+4 are all that's needed for the
 * user to create/update/view letters for their assigned client.
 *
 * Usage:
 *   npx tsx scripts/onboard-restricted-user.ts \
 *     --email <user@example.com> \
 *     --client "<company_name OR client uuid>" \
 *     --route /yael-approvals \
 *     --label "אישורים חברת יעל"
 *
 * Example:
 *   npx tsx scripts/onboard-restricted-user.ts \
 *     --email davidsi@yaelsoft.com \
 *     --client "יעל תכנה ומערכות בע\"מ" \
 *     --route /yael-approvals \
 *     --label "אישורים חברת יעל"
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const TIKO_TENANT_ID = 'baa88f3b-5998-4440-952f-9fd661a28598';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Args {
  email: string;
  client: string;
  route: string;
  label: string;
  tenantId: string;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const email = get('--email');
  const client = get('--client');
  const route = get('--route');
  const label = get('--label');
  const tenantId = get('--tenant') ?? TIKO_TENANT_ID;
  if (!email || !client || !route || !label) {
    console.error(
      'Usage: npx tsx scripts/onboard-restricted-user.ts --email <e> --client <name|uuid> --route </path> --label "<hebrew label>" [--tenant <uuid>]'
    );
    process.exit(1);
  }
  return { email, client, route, label, tenantId };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findUserId(email: string): Promise<string> {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`auth.users lookup failed: ${error.message}`);
  const user = data?.users?.find(u => u.email === email);
  if (!user) throw new Error(`User ${email} not found in auth.users`);
  return user.id;
}

async function findClientId(clientArg: string, tenantId: string): Promise<{ id: string; name: string }> {
  if (UUID_RE.test(clientArg)) {
    const { data, error } = await supabase
      .from('clients')
      .select('id, company_name')
      .eq('id', clientArg)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (error || !data) throw new Error(`Client ${clientArg} not found in tenant ${tenantId}`);
    return { id: data.id, name: data.company_name };
  }
  const { data, error } = await supabase
    .from('clients')
    .select('id, company_name')
    .eq('tenant_id', tenantId)
    .eq('company_name', clientArg);
  if (error) throw new Error(`Client lookup failed: ${error.message}`);
  if (!data || data.length === 0) throw new Error(`No client named "${clientArg}" in tenant ${tenantId}`);
  if (data.length > 1) {
    throw new Error(
      `Ambiguous: ${data.length} clients named "${clientArg}". Pass --client <uuid> instead. Candidates: ${data.map(c => c.id).join(', ')}`
    );
  }
  return { id: data[0].id, name: data[0].company_name };
}

async function upsertTenantAccess(userId: string, tenantId: string, route: string, label: string) {
  const { data: existing } = await supabase
    .from('user_tenant_access')
    .select('id, role, is_active, permissions')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  const permissions = { restricted_route: route, display_name: label };

  if (existing) {
    const { error } = await supabase
      .from('user_tenant_access')
      .update({ role: 'restricted', is_active: true, permissions })
      .eq('id', existing.id);
    if (error) throw new Error(`user_tenant_access update failed: ${error.message}`);
    console.log(`✓ Updated user_tenant_access (was role=${existing.role})`);
  } else {
    const { error } = await supabase
      .from('user_tenant_access')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        role: 'restricted',
        is_active: true,
        is_primary: true,
        permissions,
      });
    if (error) throw new Error(`user_tenant_access insert failed: ${error.message}`);
    console.log(`✓ Inserted user_tenant_access`);
  }
}

async function ensureClientAssignment(userId: string, clientId: string, tenantId: string) {
  const { data: existing } = await supabase
    .from('user_client_assignments')
    .select('id')
    .eq('user_id', userId)
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (existing) {
    console.log(`✓ user_client_assignments row already exists (id: ${existing.id})`);
    return;
  }

  const { error } = await supabase
    .from('user_client_assignments')
    .insert({
      user_id: userId,
      client_id: clientId,
      tenant_id: tenantId,
      assigned_by: userId,
      assigned_at: new Date().toISOString(),
      is_primary: false,
      notes: 'Restricted user onboarding',
    });
  if (error) throw new Error(`user_client_assignments insert failed: ${error.message}`);
  console.log(`✓ Inserted user_client_assignments`);
}

async function main() {
  const args = parseArgs();
  console.log(`Onboarding restricted user "${args.email}" -> "${args.client}" -> ${args.route}`);

  const userId = await findUserId(args.email);
  const client = await findClientId(args.client, args.tenantId);
  console.log(`  user_id:   ${userId}`);
  console.log(`  client_id: ${client.id} (${client.name})`);
  console.log(`  tenant_id: ${args.tenantId}`);

  await upsertTenantAccess(userId, args.tenantId, args.route, args.label);
  await ensureClientAssignment(userId, client.id, args.tenantId);

  console.log('\n✅ Done. User must log out and log in to refresh their JWT.');
}

main().catch(e => {
  console.error('\n❌', e.message);
  process.exit(1);
});
