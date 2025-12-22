-- Add 'general' category to capital_declaration_category enum
-- This allows uploading general documents that don't fit other categories

ALTER TYPE capital_declaration_category ADD VALUE 'general' AFTER 'other';
