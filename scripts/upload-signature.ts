/**
 * One-time script to upload tico_signature.png to Supabase Storage
 * Run with: npx tsx scripts/upload-signature.ts
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Verify required environment variables
if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = 'letter-assets-v2';
const SOURCE_FILE = path.join(process.cwd(), 'public', 'brand', 'ticonewbigsign.png');
const TARGET_FILE = 'tico_signature.png'; // Keep same name for backward compatibility

async function uploadSignature() {
  console.log('📤 Uploading tico_signature.png...');

  // Check if file exists
  if (!fs.existsSync(SOURCE_FILE)) {
    console.error(`❌ File not found: ${SOURCE_FILE}`);
    process.exit(1);
  }

  try {
    const fileBuffer = fs.readFileSync(SOURCE_FILE);
    const fileStats = fs.statSync(SOURCE_FILE);

    console.log(`📦 File size: ${(fileStats.size / 1024).toFixed(2)} KB`);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(TARGET_FILE, fileBuffer, {
        contentType: 'image/png',
        upsert: true, // Overwrite if exists
        cacheControl: '3600'
      });

    if (error) {
      console.error(`❌ Upload failed:`, error.message);
      process.exit(1);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(TARGET_FILE);

    console.log(`✅ Upload successful!`);
    console.log(`🔗 URL: ${publicUrlData.publicUrl}`);
  } catch (err) {
    console.error(`❌ Error:`, err);
    process.exit(1);
  }
}

uploadSignature();
