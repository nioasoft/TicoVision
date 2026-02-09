# Technology Stack

**Analysis Date:** 2026-02-09

## Languages

**Primary:**
- TypeScript 5.8.3 - Full codebase with strict mode; all source files are `.ts` or `.tsx`

**Secondary:**
- JavaScript (ES2020 target) - Configuration files and build tooling

## Runtime

**Environment:**
- Node.js v22.16.0 - Local development and edge function execution
- Browser: Modern browsers (ES2020 target)

**Package Manager:**
- npm 10.9.2
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 19.1.1 - Component library and UI framework
- Vite 7.1.2 - Build tool and dev server (port 5173, fallback 5174)
- React Router DOM 7.8.2 - Client-side routing

**UI & Components:**
- shadcn/ui (Radix UI base) - Component library; installed via individual Radix packages
- Tailwind CSS 4.1.13 - Utility-first styling with custom theme
- Tailwind RTL Plugin 0.9.0 - Right-to-left layout support for Hebrew UI

**Styling:**
- PostCSS 8.5.6 - CSS processing
- Autoprefixer 10.4.21 - Browser compatibility
- Tailwind Merge 3.3.1 - Merge Tailwind classes
- Tailwind Animate 1.0.7 - Animation utilities

**Text Editing:**
- Lexical 0.39.0 - Rich text editor library (with extensions for code, lists, tables, HTML)
- TipTap 3.10.5+ (with multiple extensions) - Alternative rich text editor
- ProseMirror View 1.41.4 - Collaborative editor engine

**Forms & Validation:**
- React Hook Form 7.62.0 - Form state management
- Zod 4.1.5 - TypeScript-first schema validation

**State Management:**
- Zustand 5.0.8 - Client-side state management (alternative to Redux)

**Testing:**
- Playwright 1.55.0 - E2E and browser testing

**PDF & Document Processing:**
- PDF Lib 1.17.1 - PDF generation and manipulation
- PDF Lib Fontkit 1.1.1 - Font support for PDF generation
- pdfjs-dist 5.4.449 - PDF rendering in browser
- react-pdf 10.3.0 - React component for PDF display
- PagedJS 0.4.3 - Paged media processor for print CSS
- DOMPurify (isomorphic) 2.31.0 - HTML sanitization

**Data Visualization:**
- Recharts 3.2.0 - React charting library

**File Management:**
- react-dropzone 14.3.8 - Drag-and-drop file upload
- react-easy-crop 5.5.6 - Image cropping tool
- Sharp 0.34.5 - Image processing
- React Day Picker 9.11.1 - Date picker component

**Utilities:**
- date-fns 4.1.0 - Date formatting and manipulation
- Lucide React 0.543.0 - Icon library
- cmdk 1.1.1 - Command palette component
- class-variance-authority 0.7.1 - CSS class composition
- clsx 2.1.1 - Conditional class name joining
- Sonner 2.0.7 - Toast notifications
- next-themes 0.4.6 - Theme switching (dark mode)

**DnD (Drag & Drop):**
- dnd-kit 6.3.1+ - Drag and drop library with sortable, core, utilities

**Linting & Code Quality:**
- ESLint 9.33.0 - Code linting with flat config
- @eslint/js 9.33.0 - ESLint config
- TypeScript ESLint 8.39.1 - TypeScript linting rules
- ESLint Plugin React Hooks 5.2.0 - React hooks linting
- ESLint Plugin React Refresh 0.4.20 - Fast refresh linting

**Development:**
- TSX 4.20.6 - TypeScript execution (for scripts)
- dotenv 17.2.3 - Environment variable loading

## Key Dependencies

**Critical:**

- `@supabase/supabase-js` 2.57.2 - Supabase client for database, auth, storage, edge functions, RPC calls
- `@sendgrid/mail` 8.1.6 - SendGrid email service integration

**Optional (Present in package.json):**

- `@types/ioredis` 4.28.10 - Redis type definitions (present but Redis not actively used based on code)

## Configuration

**Environment:**

Required variables (see `.env.example`):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key for client-side auth
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for secure operations
- `VITE_CARDCOM_ENV` - Cardcom environment (test/production)
- `VITE_CARDCOM_TERMINAL` - Cardcom terminal number
- `VITE_CARDCOM_USERNAME` - Cardcom username
- `VITE_CARDCOM_API_KEY` - Cardcom API key
- `SENDGRID_API_KEY` / `VITE_SENDGRID_API_KEY` - SendGrid API key
- `REDIS_URL` - Redis URL (optional, defined in example)
- `SENTRY_DSN` - Sentry error tracking (optional, defined in example)
- `DATADOG_API_KEY` - Datadog monitoring (optional, defined in example)

**Build:**

- `vite.config.ts` - Vite configuration with React plugin, path aliases (`@/`), dependency optimization
- `tsconfig.json` - TypeScript configuration referencing `tsconfig.app.json` and `tsconfig.node.json`
- `tailwind.config.js` - Tailwind CSS with Hebrew fonts (Assistant, Heebo), RTL plugin, dark mode
- `postcss.config.js` - PostCSS configuration
- `eslint.config.js` - ESLint flat config

**Custom Fonts:**

- Assistant - Primary sans-serif font (Hebrew and English)
- Heebo - Hebrew alternative font

## Platform Requirements

**Development:**

- Node.js 22.x or compatible
- npm 10.x
- .env.local file with required credentials
- Modern browser for local testing

**Production:**

- Deployment: Supabase (serverless functions) or Vercel/static hosting for frontend
- Supabase project with configured RLS policies
- Cardcom merchant account (Israeli payment gateway)
- SendGrid account for email delivery
- Browser: Modern browsers supporting ES2020

---

*Stack analysis: 2026-02-09*
