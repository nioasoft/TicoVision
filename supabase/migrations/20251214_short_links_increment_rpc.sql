-- RPC function to increment short link click count atomically
-- Used by the 's' Edge Function for click tracking

CREATE OR REPLACE FUNCTION public.increment_short_link_click(p_short_code TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE short_links
    SET
        click_count = click_count + 1,
        last_clicked_at = now()
    WHERE short_code = p_short_code;
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION public.increment_short_link_click(TEXT) TO service_role;
