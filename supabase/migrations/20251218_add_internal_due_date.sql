-- Add internal due date to capital declarations
-- Separating tax authority due date (official deadline) from internal due date (manager set)

-- Rename existing due_date column to be more explicit
ALTER TABLE capital_declarations
  RENAME COLUMN due_date TO tax_authority_due_date;

ALTER TABLE capital_declarations
  RENAME COLUMN due_date_document_path TO tax_authority_due_date_document_path;

-- Add internal due date column (set by manager)
ALTER TABLE capital_declarations
  ADD COLUMN internal_due_date DATE;

-- Add comment for clarity
COMMENT ON COLUMN capital_declarations.tax_authority_due_date IS 'Official due date from tax authority (רשות המיסים)';
COMMENT ON COLUMN capital_declarations.tax_authority_due_date_document_path IS 'Screenshot of tax authority request document';
COMMENT ON COLUMN capital_declarations.internal_due_date IS 'Internal due date set by manager (תאריך יעד פנימי)';
