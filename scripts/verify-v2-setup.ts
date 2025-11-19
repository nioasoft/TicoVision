/**
 * Script to verify Letters V2 infrastructure setup
 * Run with: npx tsx scripts/verify-v2-setup.ts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

const checkMark = `${colors.green}✓${colors.reset}`;
const crossMark = `${colors.red}✗${colors.reset}`;
const warningMark = `${colors.yellow}⚠${colors.reset}`;

async function verifyDatabaseColumns() {
  console.log(`\n${colors.bold}📊 Checking Database Columns...${colors.reset}`);

  const requiredColumns = [
    'system_version',
    'version_number',
    'is_latest',
    'parent_letter_id',
    'pdf_url',
    'rendering_engine'
  ];

  try {
    // Query to check if columns exist (using a dummy query)
    const { error } = await supabase
      .from('generated_letters')
      .select('id, system_version, version_number, is_latest, parent_letter_id, pdf_url, rendering_engine')
      .limit(1);

    if (error && error.message.includes('column')) {
      console.log(`${crossMark} Some columns are missing. Please run migration 091.`);
      console.log(`   Error: ${error.message}`);
      return false;
    }

    console.log(`${checkMark} All V2 columns exist in generated_letters table`);
    requiredColumns.forEach(col => {
      console.log(`   ${checkMark} ${col}`);
    });
    return true;
  } catch (err) {
    console.log(`${crossMark} Failed to check database columns:`, err);
    return false;
  }
}

async function verifyStorageBuckets() {
  console.log(`\n${colors.bold}🪣 Checking Storage Buckets...${colors.reset}`);

  const requiredBuckets = [
    { name: 'letter-assets-v2', description: 'Letter assets (logos, images)' },
    { name: 'letter-pdfs', description: 'Generated PDF files' }
  ];

  let allBucketsExist = true;

  for (const bucket of requiredBuckets) {
    try {
      // Try to list files in the bucket (will fail if bucket doesn't exist)
      const { error } = await supabase.storage
        .from(bucket.name)
        .list('', { limit: 1 });

      if (error) {
        console.log(`${crossMark} Bucket '${bucket.name}' not found - ${bucket.description}`);
        console.log(`   Create with: npx supabase storage create ${bucket.name} --public`);
        allBucketsExist = false;
      } else {
        console.log(`${checkMark} Bucket '${bucket.name}' exists - ${bucket.description}`);
      }
    } catch (err) {
      console.log(`${crossMark} Error checking bucket '${bucket.name}':`, err);
      allBucketsExist = false;
    }
  }

  return allBucketsExist;
}

async function verifyEnvironmentVariables() {
  console.log(`\n${colors.bold}🔧 Checking Environment Variables...${colors.reset}`);

  const requiredVars = [
    { name: 'VITE_SUPABASE_URL', value: process.env.VITE_SUPABASE_URL },
    { name: 'VITE_SUPABASE_ANON_KEY', value: process.env.VITE_SUPABASE_ANON_KEY },
    { name: 'VITE_LETTERS_V2_ENABLED', value: process.env.VITE_LETTERS_V2_ENABLED },
    { name: 'VITE_SUPABASE_LETTER_ASSETS_BUCKET', value: process.env.VITE_SUPABASE_LETTER_ASSETS_BUCKET },
    { name: 'VITE_SUPABASE_LETTER_PDFS_BUCKET', value: process.env.VITE_SUPABASE_LETTER_PDFS_BUCKET },
    { name: 'VITE_PDF_GENERATION_ENABLED', value: process.env.VITE_PDF_GENERATION_ENABLED }
  ];

  let allVarsSet = true;

  requiredVars.forEach(varDef => {
    if (varDef.value) {
      const displayValue = varDef.name.includes('KEY')
        ? '***' + varDef.value.slice(-4)
        : varDef.value;
      console.log(`${checkMark} ${varDef.name} = ${displayValue}`);
    } else {
      console.log(`${crossMark} ${varDef.name} is not set`);
      allVarsSet = false;
    }
  });

  return allVarsSet;
}

async function verifyUploadedAssets() {
  console.log(`\n${colors.bold}🖼️  Checking Uploaded Assets...${colors.reset}`);

  const bucket = process.env.VITE_SUPABASE_LETTER_ASSETS_BUCKET || 'letter-assets-v2';
  const expectedAssets = [
    'Tico_logo_png_new.png',
    'Tico_franco_co.png',
    'tagline.png',
    'Bullet_star_blue.png',
    'bullet-star.png',
    'tico_logo_240.png',
    'franco-logo-hires.png'
  ];

  try {
    const { data: files, error } = await supabase.storage
      .from(bucket)
      .list('', { limit: 100 });

    if (error) {
      console.log(`${warningMark} Cannot check assets - bucket might not exist`);
      console.log(`   Run: npm run upload-assets-v2`);
      return false;
    }

    const uploadedFiles = files?.map(f => f.name) || [];
    let allAssetsUploaded = true;

    expectedAssets.forEach(asset => {
      if (uploadedFiles.includes(asset)) {
        console.log(`${checkMark} ${asset}`);
      } else {
        console.log(`${crossMark} ${asset} - not uploaded`);
        allAssetsUploaded = false;
      }
    });

    if (!allAssetsUploaded) {
      console.log(`\n   ${warningMark} Some assets missing. Run: npm run upload-assets-v2`);
    }

    return allAssetsUploaded;
  } catch (err) {
    console.log(`${crossMark} Error checking assets:`, err);
    return false;
  }
}

async function main() {
  console.log(`${colors.bold}${colors.blue}==================================`);
  console.log(`Letters V2 Infrastructure Verification`);
  console.log(`==================================${colors.reset}`);

  const results = {
    database: await verifyDatabaseColumns(),
    buckets: await verifyStorageBuckets(),
    env: await verifyEnvironmentVariables(),
    assets: await verifyUploadedAssets()
  };

  console.log(`\n${colors.bold}📋 Summary:${colors.reset}`);
  console.log(`${colors.bold}─────────────────────────────────${colors.reset}`);

  const allPassed = Object.values(results).every(r => r === true);

  Object.entries(results).forEach(([key, passed]) => {
    const icon = passed ? checkMark : crossMark;
    const name = key.charAt(0).toUpperCase() + key.slice(1);
    console.log(`${icon} ${name}: ${passed ? 'Ready' : 'Needs Setup'}`);
  });

  if (allPassed) {
    console.log(`\n${colors.green}${colors.bold}🎉 All infrastructure components are ready!${colors.reset}`);
    console.log(`${colors.green}Letters V2 system is ready for implementation.${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.yellow}${colors.bold}⚠️  Some components need setup.${colors.reset}`);
    console.log(`${colors.yellow}Please follow the instructions above.${colors.reset}`);
    console.log(`\nRefer to: docs/LETTERS_V2_INFRASTRUCTURE.md`);
    process.exit(1);
  }
}

// Run verification
main().catch(err => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});