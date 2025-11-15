/**
 * Script to upload letter assets to Supabase Storage for Letters V2
 * Run with: npm run upload-assets-v2
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Verify required environment variables
if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration
const ASSETS_FOLDER = path.join(process.cwd(), 'public', 'brand');
const BUCKET = process.env.VITE_SUPABASE_LETTER_ASSETS_BUCKET || 'letter-assets-v2';

// List of images to upload for letter templates
const IMAGES_TO_UPLOAD = [
  'Tico_logo_png_new.png',      // Main TICO logo for header
  'Tico_franco_co.png',          // Franco company logo
  'tagline.png',                 // DARE TO THINK · COMMIT TO DELIVER tagline
  'Bullet_star_blue.png',        // Blue star bullet point
  'bullet-star.png',             // Regular star bullet
  'tico_logo_240.png',           // Smaller TICO logo variant
  'franco-logo-hires.png',       // High resolution Franco logo
  'pdf_footer.png',              // PDF footer image (full width A4)
  'header_pdf.png'               // PDF header image (full width A4)
];

/**
 * Upload a single asset to Supabase Storage
 */
async function uploadAsset(fileName: string): Promise<boolean> {
  const filePath = path.join(ASSETS_FOLDER, fileName);

  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${fileName} not found at ${filePath}, skipping...`);
    return false;
  }

  try {
    const fileBuffer = fs.readFileSync(filePath);
    const fileStats = fs.statSync(filePath);

    // Determine content type based on file extension
    const ext = path.extname(fileName).toLowerCase();
    let contentType = 'application/octet-stream';
    if (ext === '.png') contentType = 'image/png';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else if (ext === '.webp') contentType = 'image/webp';

    console.log(`📤 Uploading ${fileName} (${(fileStats.size / 1024).toFixed(2)} KB)...`);

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, fileBuffer, {
        contentType,
        upsert: true, // Overwrite if exists
        cacheControl: '3600' // Cache for 1 hour
      });

    if (error) {
      console.error(`❌ Error uploading ${fileName}:`, error.message);
      return false;
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(fileName);

    console.log(`✅ ${fileName} uploaded successfully`);
    console.log(`   URL: ${publicUrlData.publicUrl}`);

    return true;
  } catch (err) {
    console.error(`❌ Failed to process ${fileName}:`, err);
    return false;
  }
}

/**
 * Main function to upload all assets
 */
async function uploadAllAssets() {
  console.log('🚀 Letters V2 Asset Upload Script');
  console.log('==================================');
  console.log(`📂 Source folder: ${ASSETS_FOLDER}`);
  console.log(`🪣 Target bucket: ${BUCKET}`);
  console.log(`📦 Files to upload: ${IMAGES_TO_UPLOAD.length}`);
  console.log('');

  // Check if source folder exists
  if (!fs.existsSync(ASSETS_FOLDER)) {
    console.error(`❌ Source folder not found: ${ASSETS_FOLDER}`);
    console.error('   Please ensure the brand assets are in public/brand/');
    process.exit(1);
  }

  let successCount = 0;
  let failCount = 0;

  // Upload each asset
  for (const fileName of IMAGES_TO_UPLOAD) {
    const success = await uploadAsset(fileName);
    if (success) successCount++;
    else failCount++;
  }

  // Summary
  console.log('');
  console.log('📊 Upload Summary');
  console.log('================');
  console.log(`✅ Successfully uploaded: ${successCount} files`);
  if (failCount > 0) {
    console.log(`❌ Failed uploads: ${failCount} files`);
  }

  if (successCount === IMAGES_TO_UPLOAD.length) {
    console.log('');
    console.log('🎉 All assets uploaded successfully!');
    console.log('✨ Letters V2 assets are ready to use.');
  } else if (successCount > 0) {
    console.log('');
    console.log('⚠️  Some assets were uploaded, but not all.');
    console.log('   Check the errors above and retry if needed.');
  } else {
    console.log('');
    console.log('❌ No assets were uploaded successfully.');
    console.log('   Please check the configuration and try again.');
    process.exit(1);
  }
}

// Run the upload
uploadAllAssets().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});