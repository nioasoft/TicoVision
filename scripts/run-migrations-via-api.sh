#!/bin/bash

# Script to run collection migrations via Supabase REST API
# Uses service_role key to execute SQL directly

SUPABASE_URL="https://zbqfeebrhberddvfkuhe.supabase.co"
SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpicWZlZWJyaGJlcmRkdmZrdWhlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk4MDQyMiwiZXhwIjoyMDcyNTU2NDIyfQ.iyAVwpODcdfzffkc3xBeGFE45ciTzC_KTjJgCJq_ItA"

echo "🔧 Running collection system migrations..."
echo ""

# Read the combined migration file
SQL_CONTENT=$(cat /tmp/run_collection_migrations.sql)

# Execute via Supabase REST API
curl -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": $(jq -Rs . <<< "$SQL_CONTENT")}"

echo ""
echo "✅ Migration execution completed"
