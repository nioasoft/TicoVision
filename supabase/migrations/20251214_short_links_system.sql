-- Short Links System
-- Solves Outlook URL breaking issue by shortening payment links from ~250 to ~65 chars
-- Created: 2024-12-14

-- Create short_links table
CREATE TABLE IF NOT EXISTS public.short_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    short_code VARCHAR(8) NOT NULL UNIQUE,
    original_url TEXT NOT NULL,

    -- Context (for analytics and debugging)
    fee_calculation_id UUID REFERENCES fee_calculations(id) ON DELETE SET NULL,
    group_calculation_id UUID REFERENCES group_fee_calculations(id) ON DELETE SET NULL,
    letter_id UUID REFERENCES generated_letters(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    payment_method VARCHAR(20), -- bank_transfer, cc_single, cc_installments, checks

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '365 days'),
    click_count INTEGER DEFAULT 0,
    last_clicked_at TIMESTAMPTZ,

    -- Validation
    CONSTRAINT short_code_format CHECK (short_code ~ '^[A-Za-z0-9]{6,8}$')
);

-- Add comment
COMMENT ON TABLE short_links IS 'URL shortener for email payment links. Solves Outlook link-breaking issue.';

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_short_links_short_code ON short_links(short_code);
CREATE INDEX IF NOT EXISTS idx_short_links_fee_calculation_id ON short_links(fee_calculation_id);
CREATE INDEX IF NOT EXISTS idx_short_links_group_calculation_id ON short_links(group_calculation_id);
CREATE INDEX IF NOT EXISTS idx_short_links_letter_id ON short_links(letter_id);
CREATE INDEX IF NOT EXISTS idx_short_links_expires_at ON short_links(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE short_links ENABLE ROW LEVEL SECURITY;

-- Public read access (needed for redirect - no auth required)
CREATE POLICY "Anyone can read short_links for redirect"
    ON short_links FOR SELECT
    USING (true);

-- Service role can insert (edge functions use service role)
CREATE POLICY "Service role can insert short_links"
    ON short_links FOR INSERT
    WITH CHECK (true);

-- Service role can update (for click tracking)
CREATE POLICY "Service role can update short_links"
    ON short_links FOR UPDATE
    USING (true);

-- Grant permissions
GRANT SELECT ON short_links TO anon;
GRANT SELECT ON short_links TO authenticated;
GRANT ALL ON short_links TO service_role;
