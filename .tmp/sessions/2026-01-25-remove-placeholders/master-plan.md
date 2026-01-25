# Master Plan: Remove Placeholders From Active UI

## Architecture
- Scope: Active UI in `src/` only (exclude `*.backup`, `letters_backup`, `public/`)
- Goal: Remove all `placeholder` attributes from inputs, textareas, search fields, and `SelectValue`
- Validation: Re-scan `src/` for `placeholder=` after each component update

## Components (Dependency Order)
1. Inventory & Scan
   - Identify active files in `src/` containing `placeholder=`
   - Group by area (pages/modules/components)

2. Core UI Components (shared)
   - Remove placeholders in shared components used across pages/modules

3. Feature Modules
   - Broadcast
   - Letters (v1 + v2)
   - Collections
   - Protocols
   - Documents
   - Billing
   - Tickets

4. Pages
   - Auto Letters
   - Company Onboarding
   - Capital Declarations
   - Letter History
   - Files Manager
   - Settings
   - Client Groups
   - Super Admin

## Status
- Inventory & Scan: pending
- Core UI Components: pending
- Feature Modules: pending
- Pages: pending
