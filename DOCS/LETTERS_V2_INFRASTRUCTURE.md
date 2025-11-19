# Letters V2 Infrastructure Documentation

## Overview
This document describes the infrastructure setup for the Letters V2 system, which provides a unified letter generation and management system with PDF support.

## Database Changes (Migration 091)

### New Columns in `generated_letters` table:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `system_version` | TEXT | 'v1' | Which system generated the letter (v1 or v2) |
| `version_number` | INT | 1 | Version number for edited letters |
| `is_latest` | BOOLEAN | true | True if this is the latest version |
| `parent_letter_id` | UUID | NULL | Reference to original letter for edits |
| `pdf_url` | TEXT | NULL | URL to generated PDF in Storage |
| `rendering_engine` | TEXT | 'legacy' | Rendering engine used (legacy or unified) |

### New Indexes:
- `idx_letters_v2_system` - Efficient V2 letter queries
- `idx_letters_v2_versions` - Track letter versions
- `idx_letters_v2_latest_by_tenant` - Find latest letters by tenant

## Supabase Storage Buckets

### Required Buckets (Create Manually):

1. **letter-assets-v2** (Public)
   - Purpose: Store logo images, icons for V2 letters
   - Access: Public
   - File size limit: 5MB
   - Allowed types: image/png, image/jpeg, image/svg+xml

2. **letter-pdfs** (Public)
   - Purpose: Store generated PDF documents
   - Access: Public
   - File size limit: 10MB
   - Allowed types: application/pdf

### Create Buckets via CLI:
```bash
npx supabase storage create letter-assets-v2 --public
npx supabase storage create letter-pdfs --public
```

## Environment Variables

Add to `.env.local`:

```env
# Letters V2 Configuration
VITE_LETTERS_V2_ENABLED=true
VITE_SUPABASE_LETTER_ASSETS_BUCKET=letter-assets-v2
VITE_SUPABASE_LETTER_PDFS_BUCKET=letter-pdfs

# PDF Generation
VITE_PDF_GENERATION_ENABLED=true
```

## Asset Upload Script

### Usage:
```bash
# Upload all brand assets to Supabase Storage
npm run upload-assets-v2
```

### Assets to Upload:
- `Tico_logo_png_new.png` - Main TICO logo
- `Tico_franco_co.png` - Franco company logo
- `tagline.png` - DARE TO THINK · COMMIT TO DELIVER
- `Bullet_star_blue.png` - Blue star bullet
- `bullet-star.png` - Regular star bullet
- `tico_logo_240.png` - Smaller TICO logo
- `franco-logo-hires.png` - High resolution Franco logo

### Script Location:
`scripts/upload-letter-assets-v2.ts`

## Setup Steps

### 1. Apply Database Migration
```bash
npx supabase db push
```

### 2. Create Storage Buckets
Use Supabase Dashboard or CLI commands above

### 3. Upload Assets
```bash
npm run upload-assets-v2
```

### 4. Verify Setup
```sql
-- Check new columns exist
SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'generated_letters'
AND column_name IN (
  'system_version',
  'version_number',
  'is_latest',
  'parent_letter_id',
  'pdf_url',
  'rendering_engine'
);

-- Check indexes
SELECT indexname
FROM pg_indexes
WHERE tablename = 'generated_letters'
AND indexname LIKE 'idx_letters_v2%';
```

## V1 vs V2 Compatibility

### V1 Letters (Existing System):
- `system_version = 'v1'`
- `rendering_engine = 'legacy'`
- Continue to work as before
- No PDF generation
- Use template system with variable replacement

### V2 Letters (New System):
- `system_version = 'v2'`
- `rendering_engine = 'unified'`
- Support PDF generation
- Store PDFs in Storage
- Support versioning and edits
- Assets loaded from Supabase Storage

## Migration Strategy

1. **Phase 1**: Infrastructure (Current)
   - Database columns ✅
   - Storage buckets ✅
   - Environment variables ✅
   - Asset upload script ✅

2. **Phase 2**: Implementation
   - Unified template service
   - PDF generation
   - Letter builder UI

3. **Phase 3**: Migration
   - Gradual migration from V1 to V2
   - Both systems run in parallel
   - No breaking changes

## Monitoring

### Check V2 Letters:
```sql
-- Count V2 letters
SELECT
  system_version,
  COUNT(*) as count
FROM generated_letters
WHERE tenant_id = 'your-tenant-id'
GROUP BY system_version;

-- Latest V2 letters
SELECT
  id,
  created_at,
  template_type,
  pdf_url,
  version_number
FROM generated_letters
WHERE system_version = 'v2'
AND is_latest = true
ORDER BY created_at DESC
LIMIT 10;
```

## Troubleshooting

### Storage Bucket Issues:
- Ensure buckets are created with correct names
- Check public access is enabled
- Verify CORS settings if needed

### Asset Upload Failures:
- Check `.env.local` has correct credentials
- Ensure service role key is set
- Verify files exist in `public/brand/`

### PDF Generation Issues:
- Check `VITE_PDF_GENERATION_ENABLED=true`
- Verify Storage bucket permissions
- Check file size limits (10MB for PDFs)

## Security Considerations

1. **RLS Policies**: Existing tenant-based RLS applies to V2
2. **Storage Security**: Public buckets for assets/PDFs (safe for public access)
3. **Service Role**: Only used for admin operations (asset upload)
4. **Tenant Isolation**: All V2 operations respect tenant boundaries

## Next Steps

After infrastructure is set up:
1. Implement unified template service
2. Create PDF generation module
3. Build letter builder UI
4. Test with sample letters
5. Gradual rollout to production