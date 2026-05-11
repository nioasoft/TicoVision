-- Migration: Make restricted-user letter policies data-driven via user_client_assignments
-- Date: 2026-05-11
-- Context:
--   Previous policies hardcoded client_id = '14e45b8b-...' (צלול ניקיון).
--   This blocked any other restricted user (e.g. David @ יעל תכנה) from creating/updating letters
--   for their assigned client, causing 42501 on INSERT and silent failures on UPDATE
--   (USING clause filtered the row → 0 rows affected, no error raised).

DROP POLICY IF EXISTS "restricted_users_create_letters" ON generated_letters;
DROP POLICY IF EXISTS "restricted_users_update_letters" ON generated_letters;
DROP POLICY IF EXISTS "restricted_users_view_letters" ON generated_letters;

CREATE POLICY "restricted_users_create_letters"
ON generated_letters
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    JOIN user_client_assignments uca
      ON uca.user_id = uta.user_id
     AND uca.tenant_id = uta.tenant_id
    WHERE uta.user_id = auth.uid()
      AND uta.tenant_id = generated_letters.tenant_id
      AND uta.role = 'restricted'
      AND uta.is_active = true
      AND uca.client_id = generated_letters.client_id
  )
);

CREATE POLICY "restricted_users_update_letters"
ON generated_letters
FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    JOIN user_client_assignments uca
      ON uca.user_id = uta.user_id
     AND uca.tenant_id = uta.tenant_id
    WHERE uta.user_id = auth.uid()
      AND uta.tenant_id = generated_letters.tenant_id
      AND uta.role = 'restricted'
      AND uta.is_active = true
      AND uca.client_id = generated_letters.client_id
  )
)
WITH CHECK (
  tenant_id = (SELECT get_current_tenant_id())
);

CREATE POLICY "restricted_users_view_letters"
ON generated_letters
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM user_tenant_access uta
    JOIN user_client_assignments uca
      ON uca.user_id = uta.user_id
     AND uca.tenant_id = uta.tenant_id
    WHERE uta.user_id = auth.uid()
      AND uta.tenant_id = generated_letters.tenant_id
      AND uta.role = 'restricted'
      AND uta.is_active = true
      AND uca.client_id = generated_letters.client_id
  )
);

COMMENT ON POLICY "restricted_users_create_letters" ON generated_letters IS
'Restricted users can create letters for any client they have in user_client_assignments (data-driven, no hardcoded IDs).';
COMMENT ON POLICY "restricted_users_update_letters" ON generated_letters IS
'Restricted users can update letters for any client they have in user_client_assignments.';
COMMENT ON POLICY "restricted_users_view_letters" ON generated_letters IS
'Restricted users can view letters for any client they have in user_client_assignments.';
