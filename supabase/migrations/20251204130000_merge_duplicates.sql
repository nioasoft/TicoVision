-- Migration: Merge duplicate clients and groups
-- Date: 2024-12-04
-- Description: Merges duplicate records that were accidentally created
-- NOTE: This migration was executed manually via MCP tool

-- ============================================
-- PART 1: Merge duplicate client "אורון שורץ החזקות בע"מ"
-- ============================================
-- Keep: db7fa930-84e6-4f1c-afbe-54795d761c7a (3 fees, 3 letters)
-- Delete: 90ea33b8-787e-490d-8faa-28c1d0844248 (1 fee, 1 letter)

UPDATE fee_calculations
SET client_id = 'db7fa930-84e6-4f1c-afbe-54795d761c7a'
WHERE client_id = '90ea33b8-787e-490d-8faa-28c1d0844248';

UPDATE generated_letters
SET client_id = 'db7fa930-84e6-4f1c-afbe-54795d761c7a'
WHERE client_id = '90ea33b8-787e-490d-8faa-28c1d0844248';

UPDATE clients
SET group_id = '208565c2-5bca-4013-b879-8c116fbff289'
WHERE id = 'db7fa930-84e6-4f1c-afbe-54795d761c7a'
  AND group_id IS NULL;

DELETE FROM clients
WHERE id = '90ea33b8-787e-490d-8faa-28c1d0844248';

-- ============================================
-- PART 2: Merge duplicate group "קבוצת קיסו"
-- ============================================
-- Keep: 17b54a14-362c-4e2e-9e16-7099f3097382 (older)
-- Delete: a04966ae-e5af-4737-aab7-dc382d92f8b9 (newer)

DELETE FROM group_fee_calculations
WHERE group_id = 'a04966ae-e5af-4737-aab7-dc382d92f8b9';

UPDATE clients
SET group_id = '17b54a14-362c-4e2e-9e16-7099f3097382'
WHERE group_id = 'a04966ae-e5af-4737-aab7-dc382d92f8b9';

DELETE FROM client_groups
WHERE id = 'a04966ae-e5af-4737-aab7-dc382d92f8b9';

-- ============================================
-- PART 3: Fix placeholder tax_id conflict
-- ============================================
-- "לקוחות בהמתנה" had same tax_id as "קבוצת לה טייבל"
UPDATE clients
SET tax_id = '515555556'
WHERE id = '1367d2f9-0966-4eec-9a48-06078ec3a47e';
