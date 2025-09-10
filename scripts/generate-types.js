#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const execAsync = promisify(exec);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

async function generateTypes() {
  try {
    console.log('🔄 Generating TypeScript types from Supabase...');
    
    const projectId = SUPABASE_URL.match(/https:\/\/(.+?)\.supabase\.co/)?.[1];
    
    if (!projectId) {
      console.error('❌ Could not extract project ID from Supabase URL');
      process.exit(1);
    }

    const command = `npx supabase gen types typescript --project-id ${projectId} > src/types/database.types.ts`;
    
    await execAsync(command);
    console.log('✅ TypeScript types generated successfully!');
    console.log('📁 Types saved to: src/types/database.types.ts');
  } catch (error) {
    console.error('❌ Failed to generate types:', error.message);
    process.exit(1);
  }
}

generateTypes();