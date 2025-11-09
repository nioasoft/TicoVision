#!/bin/bash

SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpicWZlZWJyaGJlcmRkdmZrdWhlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk4MDQyMiwiZXhwIjoyMDcyNTU2NDIyfQ.iyAVwpODcdfzffkc3xBeGFE45ciTzC_KTjJgCJq_ItA"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpicWZlZWJyaGJlcmRkdmZrdWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5ODA0MjIsImV4cCI6MjA3MjU1NjQyMn0.-u0QSiTYUOVC-vFcggkYU0Qke-0amfRrivfH17Xo1Yc"
DB_URL="https://zbqfeebrhberddvfkuhe.supabase.co"

echo "=== Checking which migrations have been applied ==="
curl -s "${DB_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: params=single-object" \
  -X POST \
  -d '{"query": "SELECT version, name, inserted_at FROM supabase_migrations.schema_migrations WHERE name LIKE '\''%031%'\'' OR name LIKE '\''%009%'\'' ORDER BY version DESC"}' | jq '.'

echo -e "\n=== Checking function definition directly from pg_proc ==="
curl -s "${DB_URL}/rest/v1/rpc/exec_sql" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: params=single-object" \
  -X POST \
  -d '{"query": "SELECT proname, oidvectortypes(proargtypes) as arg_types, pg_get_functiondef(oid) as definition FROM pg_proc WHERE proname = '\''create_user_with_role'\''"}' | jq '.'
