/**
 * Rename Yael client company_name to canonical form: "יעל תכנה ומערכות בע"מ"
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const YAEL_CLIENT_ID = 'f742db38-aae0-4a9f-bd17-4dee58ad9765';
const NEW_NAME = 'יעל תכנה ומערכות בע"מ';

async function main() {
  const { data: before } = await supabase
    .from('clients')
    .select('id, company_name, tax_id')
    .eq('id', YAEL_CLIENT_ID)
    .single();
  console.log('Before:', before);

  const { error } = await supabase
    .from('clients')
    .update({ company_name: NEW_NAME })
    .eq('id', YAEL_CLIENT_ID);
  if (error) { console.error('Update failed:', error); process.exit(1); }

  const { data: after } = await supabase
    .from('clients')
    .select('id, company_name, tax_id')
    .eq('id', YAEL_CLIENT_ID)
    .single();
  console.log('After:', after);
  console.log('\n✅ Renamed.');
}
main().catch(e => { console.error(e); process.exit(1); });
