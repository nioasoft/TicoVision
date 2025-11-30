
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envPath = path.resolve(process.cwd(), '.env');

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ Credentials missing');
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function runOptimization() {
  console.log('🚀 Applying Performance Indexes...');
  
  const sqlPath = path.resolve(process.cwd(), 'supabase/migrations/20251129180000_optimize_performance_indexes.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // Split by semicolon to run statements one by one (safer for some clients, though postgres.js usually handles blocks)
  // However, Supabase-js doesn't expose a raw 'query' method on the client itself easily without extensions.
  // The standard way via API is creating a stored procedure or using pg directly.
  // BUT: We can use the 'rpc' hack if we had an 'exec_sql' function, which is risky.
  
  // Alternative: Since we have the CLI installed, we can try `supabase db execute`.
  // BUT the previous CLI command failed on sync issues.
  
  // BEST APPROACH for one-off safety without messing with migrations history:
  // Use `pg` (node-postgres) directly if available, OR ask user to run in dashboard.
  
  // WAIT! I don't want to install `pg` just for this.
  // I will assume the project might NOT have `exec_sql` RPC.
  
  console.log('ℹ️  Since CLI sync failed, I will try to use the CLI directly to execute this specific file without syncing history.');
  
  // We can pipe the file content to `supabase db reset`? NO!
  // We can use `psql` if installed.
  
  // Let's try the CLI raw database connection string if we can find it? No.
  
  console.log('⚠️  Automatic execution via JS client is limited without "exec_sql" RPC.');
  console.log('👍 Please run the following command manually in your terminal:');
  console.log(`
npx supabase db reset --no-confirmation --db-url "${url}"  <--- NO! This resets DB.`);
  
  // Actually, I'll stop here and offer the user the SQL content to run in Dashboard, 
  // OR I can try to find the connection string from `npx supabase status`? No, that's local.
  
  // Let's try to see if `supabase db push` can be forced? No.
}

// I will perform a different strategy:
// Since I failed to push via CLI due to history, 
// I will output the SQL content clearly for the user, OR 
// I can try to use `npx supabase migration repair` blindly? Dangerous.

console.log('SQL File is ready at: supabase/migrations/20251129180000_optimize_performance_indexes.sql');
