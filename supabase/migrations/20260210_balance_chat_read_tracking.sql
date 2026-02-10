-- ============================================================================
-- Balance Chat Read Tracking (denormalized unread counters)
-- Phase 6: Read Tracking for balance-scoped chat system
-- ============================================================================

-- 1. Create tracking table
CREATE TABLE balance_chat_read_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  balance_id UUID NOT NULL REFERENCES annual_balance_sheets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  unread_count INTEGER NOT NULL DEFAULT 0,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_bcrt_tenant_balance_user UNIQUE (tenant_id, balance_id, user_id)
);

-- 2. Indexes
-- Partial index for badge queries: find all balances with unread messages for a user
CREATE INDEX idx_bcrt_user_unread ON balance_chat_read_tracking(tenant_id, user_id)
  WHERE unread_count > 0;

-- FK index for trigger UPDATE performance (finds all tracking rows for a balance)
CREATE INDEX idx_bcrt_balance ON balance_chat_read_tracking(balance_id);

-- 3. RLS
ALTER TABLE balance_chat_read_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bcrt_select_own"
  ON balance_chat_read_tracking FOR SELECT
  USING (
    tenant_id = (SELECT get_current_tenant_id())
    AND user_id = (SELECT auth.uid())
  );

CREATE POLICY "bcrt_insert_own"
  ON balance_chat_read_tracking FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT get_current_tenant_id())
    AND user_id = (SELECT auth.uid())
  );

CREATE POLICY "bcrt_update_own"
  ON balance_chat_read_tracking FOR UPDATE
  USING (
    tenant_id = (SELECT get_current_tenant_id())
    AND user_id = (SELECT auth.uid())
  );

-- No DELETE policy: tracking rows should not be deleted by users

-- 4. Updated_at trigger (reuse existing function)
CREATE TRIGGER trigger_bcrt_updated_at
  BEFORE UPDATE ON balance_chat_read_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Unread increment trigger function (SECURITY DEFINER to update OTHER users' rows)
CREATE OR REPLACE FUNCTION increment_balance_chat_unread()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  -- Increment unread_count for all tracked users of this balance
  -- except the sender of the message
  UPDATE balance_chat_read_tracking
  SET
    unread_count = unread_count + 1,
    updated_at = NOW()
  WHERE balance_id = NEW.balance_id
    AND tenant_id = NEW.tenant_id
    AND user_id != NEW.user_id;

  RETURN NEW;
END;
$$;

-- 6. Trigger on balance_chat_messages (only for non-deleted messages)
CREATE TRIGGER trigger_increment_chat_unread
  AFTER INSERT ON balance_chat_messages
  FOR EACH ROW
  WHEN (NEW.is_deleted = false)
  EXECUTE FUNCTION increment_balance_chat_unread();

-- 7. Add to Realtime publication (needed for Phase 7 live badge updates)
ALTER PUBLICATION supabase_realtime ADD TABLE balance_chat_read_tracking;
