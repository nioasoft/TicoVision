-- Add 'documents_received' status to capital declarations
-- This status is set when client confirms they've finished uploading documents

-- Drop and recreate the CHECK constraint with the new status
ALTER TABLE capital_declarations
DROP CONSTRAINT IF EXISTS capital_declarations_status_check;

ALTER TABLE capital_declarations
ADD CONSTRAINT capital_declarations_status_check
CHECK (status IN (
  'draft', 'sent', 'in_progress', 'waiting_documents',
  'documents_received', 'reviewing', 'in_preparation',
  'pending_approval', 'submitted', 'waiting'
));

-- Create RPC function for public status update (client marking completion)
-- This function is SECURITY DEFINER so it can update the table without authentication
CREATE OR REPLACE FUNCTION public.mark_declaration_complete(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_declaration_id UUID;
  v_tenant_id UUID;
  v_current_status TEXT;
BEGIN
  -- Get declaration by token
  SELECT id, tenant_id, status INTO v_declaration_id, v_tenant_id, v_current_status
  FROM capital_declarations
  WHERE public_token = p_token;

  IF v_declaration_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Only allow marking complete from certain statuses
  IF v_current_status NOT IN ('sent', 'in_progress', 'waiting_documents') THEN
    RETURN FALSE;
  END IF;

  -- Update status
  UPDATE capital_declarations
  SET status = 'documents_received', updated_at = NOW()
  WHERE id = v_declaration_id;

  -- Log status change in history
  INSERT INTO capital_declaration_status_history
    (tenant_id, declaration_id, from_status, to_status, notes, changed_by)
  VALUES
    (v_tenant_id, v_declaration_id, v_current_status, 'documents_received',
     'הלקוח סימן שסיים להעלות מסמכים', NULL);

  RETURN TRUE;
END;
$$;

-- Grant execute permission to anon role for public portal access
GRANT EXECUTE ON FUNCTION public.mark_declaration_complete(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.mark_declaration_complete(TEXT) TO authenticated;
