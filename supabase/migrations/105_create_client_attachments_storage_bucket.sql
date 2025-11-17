-- Migration 105: Add RLS Policies for client-attachments Storage Bucket
-- Purpose: Fix file upload issue - add missing RLS policies for client-attachments bucket
-- Date: 2025-11-17
-- Related: Migration 087 (file_manager_categories) created the table
-- Note: The bucket 'client-attachments' already exists (created 2025-11-06)
--       but RLS policies were missing, causing 403 Forbidden on uploads

-- ============================================================================
-- 1. VERIFY STORAGE BUCKET EXISTS
-- ============================================================================

-- The bucket was already created on 2025-11-06 with:
-- - id: 'client-attachments'
-- - public: false
-- - file_size_limit: 1048576 (1MB)
-- - allowed_mime_types: ['image/jpeg', 'image/jpg', 'application/pdf']

-- Verify bucket exists (should return 1 row)
-- SELECT * FROM storage.buckets WHERE id = 'client-attachments';

-- ============================================================================
-- 2. RLS POLICIES ON storage.objects
-- ============================================================================

-- Policy 1: Allow authenticated users to upload files to their tenant folder
-- Files are stored with path: {tenant_id}/{client_id}/{filename}
CREATE POLICY "Users can upload files to their tenant folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-attachments'
  AND (storage.foldername(name))[1] = (
    SELECT tenant_id::text
    FROM user_tenant_access
    WHERE user_id = auth.uid()
    AND is_active = true
    LIMIT 1
  )
);

-- Policy 2: Allow authenticated users to view files from their tenant folder
CREATE POLICY "Users can view files from their tenant folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-attachments'
  AND (storage.foldername(name))[1] = (
    SELECT tenant_id::text
    FROM user_tenant_access
    WHERE user_id = auth.uid()
    AND is_active = true
    LIMIT 1
  )
);

-- Policy 3: Allow authenticated users to delete files from their tenant folder
CREATE POLICY "Users can delete files from their tenant folder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-attachments'
  AND (storage.foldername(name))[1] = (
    SELECT tenant_id::text
    FROM user_tenant_access
    WHERE user_id = auth.uid()
    AND is_active = true
    LIMIT 1
  )
);

-- ============================================================================
-- 3. VERIFICATION & STATUS
-- ============================================================================

-- ✅ MIGRATION COMPLETED SUCCESSFULLY (2025-11-17)
-- All 3 RLS policies created via MCP execute_sql:
-- 1. INSERT policy - "Users can upload files to their tenant folder" ✅
-- 2. SELECT policy - "Users can view files from their tenant folder" ✅
-- 3. DELETE policy - "Users can delete files from their tenant folder" ✅

-- Verification query (run this to confirm):
/*
SELECT
  policyname,
  cmd AS operation,
  CASE
    WHEN roles::text = '{authenticated}' THEN 'authenticated'
    ELSE roles::text
  END as role
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND policyname LIKE '%tenant folder%'
ORDER BY policyname;
*/

-- Expected result (3 rows):
-- 1. "Users can delete files from their tenant folder" | DELETE | authenticated
-- 2. "Users can upload files to their tenant folder"   | INSERT | authenticated
-- 3. "Users can view files from their tenant folder"   | SELECT | authenticated

-- ============================================================================
-- 4. FILE PATH STRUCTURE
-- ============================================================================

-- Files are stored with path: {tenant_id}/{client_id}/{timestamp}-{filename}
-- Example: '123e4567-e89b-12d3-a456-426614174000/client-abc/1700000000000-document.pdf'
--
-- This structure ensures:
-- - Multi-tenant isolation (first folder = tenant_id)
-- - Client organization (second folder = client_id)
-- - Unique filenames (timestamp prefix prevents collisions)
