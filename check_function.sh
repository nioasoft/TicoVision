#!/bin/bash

SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpicWZlZWJyaGJlcmRkdmZrdWhlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk4MDQyMiwiZXhwIjoyMDcyNTU2NDIyfQ.iyAVwpODcdfzffkc3xBeGFE45ciTzC_KTjJgCJq_ItA"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpicWZlZWJyaGJlcmRkdmZrdWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5ODA0MjIsImV4cCI6MjA3MjU1NjQyMn0.-u0QSiTYUOVC-vFcggkYU0Qke-0amfRrivfH17Xo1Yc"
DB_URL="https://zbqfeebrhberddvfkuhe.supabase.co"

echo "=== Checking if create_user_with_role function exists ==="
curl -s "${DB_URL}/rest/v1/rpc/create_user_with_role" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -X POST \
  -d '{"p_email": "test@example.com"}' | jq '.' 2>/dev/null || echo "Function might not exist or returned error"

echo -e "\n=== Listing all available RPC functions ==="
curl -s "${DB_URL}/rest/v1/" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" | jq '.definitions | keys' 2>/dev/null || echo "Could not fetch schema"
