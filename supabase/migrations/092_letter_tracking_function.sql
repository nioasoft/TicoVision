-- Migration 092: Letter Tracking Function
-- RPC function to increment letter opens
-- Used by public LetterViewerV2 page

CREATE OR REPLACE FUNCTION increment_letter_opens(letter_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE generated_letters
  SET
    open_count = COALESCE(open_count, 0) + 1,
    last_opened_at = NOW()
  WHERE id = letter_id;
END;
$$;

-- Grant public access (needed for public viewer)
GRANT EXECUTE ON FUNCTION increment_letter_opens TO anon, authenticated;

COMMENT ON FUNCTION increment_letter_opens IS 'Increment open count for public letter viewer - used by LetterViewerV2 page';
