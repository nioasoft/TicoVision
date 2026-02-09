-- ============================================================================
-- Balance Chat Messages (per-balance-sheet internal chat)
-- Phase 1: Database Foundation for balance-scoped chat system
-- ============================================================================

-- Table definition
CREATE TABLE IF NOT EXISTS balance_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  balance_id UUID NOT NULL REFERENCES annual_balance_sheets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 5000),
  message_type TEXT NOT NULL DEFAULT 'user' CHECK (message_type IN ('user', 'system')),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
-- Primary query pattern: fetch messages for a balance, ordered by time
CREATE INDEX idx_bcm_tenant_balance_created
  ON balance_chat_messages(tenant_id, balance_id, created_at);

-- Foreign key indexes (performance for JOIN operations)
CREATE INDEX idx_bcm_balance_id ON balance_chat_messages(balance_id);
CREATE INDEX idx_bcm_user_id ON balance_chat_messages(user_id);

-- Partial index for common query (exclude soft-deleted messages)
CREATE INDEX idx_bcm_active_messages
  ON balance_chat_messages(tenant_id, balance_id, created_at)
  WHERE is_deleted = false;

-- Enable Row Level Security
ALTER TABLE balance_chat_messages ENABLE ROW LEVEL SECURITY;

-- SELECT: all active tenant users can read messages
CREATE POLICY "bcm_select_own_tenant"
  ON balance_chat_messages FOR SELECT
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = balance_chat_messages.tenant_id
          AND uta.is_active = true
      )
    )
  );

-- INSERT: all active tenant users can send messages (enforces user_id = auth.uid())
CREATE POLICY "bcm_insert_own_tenant"
  ON balance_chat_messages FOR INSERT
  WITH CHECK (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      user_id = auth.uid() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = balance_chat_messages.tenant_id
          AND uta.is_active = true
      )
    )
  );

-- UPDATE: admin/accountant only (for soft-delete operations)
CREATE POLICY "bcm_update_admin_accountant"
  ON balance_chat_messages FOR UPDATE
  USING (
    is_super_admin(auth.uid()) OR (
      tenant_id = get_current_tenant_id() AND
      EXISTS (
        SELECT 1 FROM user_tenant_access uta
        WHERE uta.user_id = auth.uid()
          AND uta.tenant_id = balance_chat_messages.tenant_id
          AND uta.role IN ('admin', 'accountant')
          AND uta.is_active = true
      )
    )
  );

-- No DELETE policy (soft delete only, hard delete impossible via RLS)

-- Add to Realtime publication for live message delivery (Phase 4)
ALTER PUBLICATION supabase_realtime ADD TABLE balance_chat_messages;
