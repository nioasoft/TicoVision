# TicoVision App

## Project Overview

**TicoVision** is a comprehensive React-based web application designed for business management, accounting, and compliance reporting. Its core functionality revolves around managing clients, tracking fees, handling collections, and generating regulatory approval documents for foreign workers in Israel.

The application serves multiple user roles including Admins, Accountants, Bookkeepers, and Clients, with strict role-based access control. It leverages Supabase for its backend infrastructure, including database, authentication, and serverless edge functions for tasks like PDF generation.

## Key Features

*   **Foreign Workers Module:** A specialized system for generating 5 mandatory regulatory documents:
    1.  Accountant Turnover Report (דוח מחזורים רו"ח)
    2.  Israeli Workers Report (דוח עובדים ישראליים)
    3.  Living Business 2025 (עסק חי 2025)
    4.  Turnover/Costs Approval (אישור מחזור/עלויות)
    5.  Salary Report (דוח שכר)
*   **Document Generation:** Automated PDF generation using HTML templates and Supabase Edge Functions (Browserless).
*   **Client & Branch Management:** Hierarchical management of companies (clients) and their specific branches.
*   **Fee Tracking & Collections:** Systems for calculating fees, tracking payments, and managing debt collections.
*   **File Manager:** Centralized system for managing uploaded documents and generated reports.
*   **Letter Builder:** A rich-text editor (Tiptap) for creating and managing letter templates.

## Tech Stack

*   **Frontend:** React 19, TypeScript, Vite
*   **Styling:** Tailwind CSS, Radix UI (Shadcn UI), Lucide Icons
*   **State Management:** Zustand, React Context
*   **Forms & Validation:** React Hook Form, Zod
*   **Backend:** Supabase (PostgreSQL, Auth, Edge Functions)
*   **Routing:** React Router DOM

## Project Structure

*   `src/components`: Reusable UI components.
    *   `src/components/ui`: Base UI primitives (buttons, inputs, etc.), likely based on Shadcn UI.
    *   `src/components/foreign-workers`: Components specific to the Foreign Workers module.
*   `src/pages`: Top-level route components (e.g., `ForeignWorkersPage`, `ClientsPage`).
*   `src/services`: API service layers for interacting with Supabase (e.g., `monthly-data.service.ts`).
*   `src/contexts`: Global state providers (`AuthContext`, `MonthRangeContext`).
*   `src/types`: TypeScript definitions and interfaces (Database & App types).
*   `src/modules`: Encapsulated feature modules (e.g., `collections`).
*   `templates`: HTML templates used for generating PDF documents.
*   `supabase`: Supabase configuration, migrations, and edge functions.

## Database & Performance

### Core Schema Highlights
*   **Multi-tenancy:** All major tables include `tenant_id` for strict data isolation via RLS policies.
*   **Vertical Partitioning:** Monthly data (reports, salaries) is stored as individual rows per month/branch, enabling efficient range queries and aggregations.
*   **JSONB Usage:** Flexible data storage for letter variables (`generated_letters.variables_used`) and client metadata.

### Performance Indexes
To ensure scalability, the following composite indexes are implemented:
1.  **Monthly Reports:** `(tenant_id, branch_id, report_type, month_date DESC)` - Critical for dashboard loading.
2.  **Worker Data:** `(tenant_id, branch_id, worker_id, month_date DESC)` - Optimizes salary report generation.
3.  **Generated Letters:** `(tenant_id, client_id, created_at DESC)` - Speeds up file manager and history views.
4.  **Audit Logs:** `(tenant_id, created_at DESC)` - Essential for log viewing and security audits.
5.  **Fee Calculations:** `(tenant_id, client_id, year DESC)` - Optimizes fee tracking dashboards.

### Migration Management
*   **Syncing:** Always pull remote changes before pushing: `npx supabase db pull`.
*   **Conflicts:** If `db push` fails due to history mismatch, verify schema state and consider manual execution of specific migration files via the Supabase Dashboard SQL Editor to avoid data loss.

## Building and Running

### Prerequisites
*   Node.js (latest LTS recommended)
*   NPM
*   Supabase CLI (optional but recommended for backend tasks)

### Development
Start the development server with hot reload:
```bash
npm run dev
```
*Note: This script also syncs local templates to the public directory.*

### Production Build
Build the application for production:
```bash
npm run build
```
This command compiles the TypeScript code and copies the PDF templates to the dist folder.

### Other Commands
*   `npm run lint`: Run ESLint.
*   `npm run typecheck`: Run TypeScript type checking.
*   `npm run deploy-pdf-function`: Deploy the PDF generation function to Supabase.

## Development Conventions

*   **Strict Typing:** All data structures, especially those related to domain entities (like Foreign Workers), must have strict TypeScript interfaces defined in `src/types`.
*   **Service Layer:** Direct Supabase calls should be abstracted into service classes (e.g., `MonthlyDataService`) rather than being made directly in components.
*   **Role-Based Access:** All protected routes must be wrapped with `RoleBasedRoute` to ensure security.
*   **Lazy Loading:** Route components are lazy-loaded to optimize initial bundle size. New pages should follow this pattern in `App.tsx`.
*   **Template Management:** PDF templates are HTML files stored in `templates/` and are synced to `public/` for development.

## Key Workflows

### Foreign Workers Document Generation
1.  **Data Entry:** Users input monthly data (turnover, salaries, worker counts) via the `ForeignWorkersPage`.
2.  **Persistence:** Data is saved to `client_monthly_reports` or `foreign_worker_monthly_data` tables via `MonthlyDataService`.
3.  **Generation:** When "Generate PDF" is clicked, data is merged with an HTML template.
4.  **PDF Creation:** The HTML is sent to the `generate-pdf` Edge Function, which returns a PDF file.
5.  **Storage:** The PDF is saved to Supabase Storage and logged in the File Manager.