-- Create letter_components table for headers and footers
CREATE TABLE IF NOT EXISTS public.letter_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('header', 'footer')),
  name TEXT NOT NULL,
  content_html TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX idx_letter_components_tenant_id ON public.letter_components(tenant_id);
CREATE INDEX idx_letter_components_type ON public.letter_components(type);
CREATE INDEX idx_letter_components_default ON public.letter_components(is_default) WHERE is_default = true;

-- Add RLS policies
ALTER TABLE public.letter_components ENABLE ROW LEVEL SECURITY;

-- Policy for viewing components (tenant isolation)
CREATE POLICY "letter_components_tenant_isolation" ON public.letter_components
  FOR ALL
  USING (tenant_id = (SELECT public.get_current_tenant_id()));

-- Add missing columns to letter_templates if not exists
ALTER TABLE public.letter_templates 
ADD COLUMN IF NOT EXISTS header_template_id UUID REFERENCES public.letter_components(id),
ADD COLUMN IF NOT EXISTS footer_template_id UUID REFERENCES public.letter_components(id),
ADD COLUMN IF NOT EXISTS is_editable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS original_file_path TEXT;

-- Update letter_templates to use enum for template_type
DO $$ 
BEGIN
  -- Only alter if column is not already using the enum
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'letter_templates' 
    AND column_name = 'template_type' 
    AND data_type = 'USER-DEFINED'
  ) THEN
    -- Column already uses enum, do nothing
    NULL;
  ELSE
    -- First drop the CHECK constraint if it exists
    ALTER TABLE public.letter_templates 
    DROP CONSTRAINT IF EXISTS letter_templates_template_type_check;
    
    -- Then alter the column to use the enum
    ALTER TABLE public.letter_templates 
    ALTER COLUMN template_type TYPE letter_template_type 
    USING template_type::letter_template_type;
  END IF;
END $$;

-- Add comment
COMMENT ON TABLE public.letter_components IS 'Reusable headers and footers for letter templates';

-- Create update trigger
CREATE TRIGGER update_letter_components_updated_at 
  BEFORE UPDATE ON public.letter_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();