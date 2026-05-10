# Legacy System Reference - Shaagat HaAri Grants Module

**System Location**: `/Users/asafbenatia/asi_soft/tico/kalvia-crm-system/`

**Last Updated**: 2025-08-20 (Legacy system snapshot)

---

## 1. File-by-File Mapping

### Frontend Architecture
- **Location**: `frontend/src/`
- **Framework**: React + Material-UI (MUI) + TypeScript
- **Build**: Create React App (Not Vite)

#### Key Pages (Module Mapping)

| Old Path | Purpose | Maps to New System | Notes |
|----------|---------|-------------------|-------|
| `ClientsPage.tsx` | Client management list | `/modules/clients/` | Shows all clients with rich table UI |
| `EligibilityCheckPage.tsx` | Initial eligibility form | `eligibility-check` feature | Classification (regular/ngo) + revenue comparison |
| `EligibilityDashboard.tsx` | Dashboard for checks | Dashboard/Process Hub | KPI cards, timeline, status tracking |
| `EligibilityDetailPage.tsx` | Single check detail view | Detail view panel | Shows all check data, status, next steps |
| `GrantCalculationPage.tsx` | Simple grant calc | `/modules/grants/calculate` | Revenue decline % → compensation rate |
| `GrantDetailedCalculationPage.tsx` | 4-step wizard for detailed calc | `/modules/grants/detailed` | Fixed/salary expenses → grant amounts |
| `BankDetailsPage.tsx` | Bank account form | `/modules/grants/bank-details` | Bank name, branch, account, holder |
| `BankDetailsFormPage.tsx` | Bank form submission | (same as above) | Validation and submission |
| `GrantApprovalPage.tsx` | Approval workflow | (not yet in new) | Approval status tracking |
| `AccountingDataFormPage.tsx` | Tax data collection form | `accounting-data` feature | Form 102, expenses, salary data |
| `TaxAuthorityManagementPage.tsx` | Tax submission tracking | `/modules/tax-authority/` | Complex state machine for tax submissions |
| `PaymentPage.tsx` | Payment gateway | `/modules/payments/` | Credit card, bank transfer, Bit |
| `EmailsPage.tsx` | Email management | Email service integration | Sends and logs emails |
| `EmailCampaignPage.tsx` | Bulk email campaigns | Broadcast module (planned) | Email editor, recipient selection |
| `DocumentsPage.tsx` | File manager | `/modules/files/` | File upload/download management |
| `TimelinePage.tsx` | Client activity timeline | Timeline/activity log | Shows all client events chronologically |
| `TemplatesPage.tsx` | Email/letter templates | `/modules/templates/` | Template management and preview |
| `DashboardPage.tsx` | Main dashboard | Dashboard page | Overview, KPIs, quick actions |
| `ReportsPage.tsx` | Analytics & reports | (planned for Phase 2+) | Minimal in legacy system |
| `BackupsPage.tsx` | Data backup management | (admin feature) | Database backup utilities |
| `PostCalculationManagementPage.tsx` | Post-decision admin | Admin panel | Internal management of completed cases |

#### Key Components

| Component | Path | Purpose |
|-----------|------|---------|
| `TaxAuthorityLettersDrawer.tsx` | components/ | Tax submission letter generation |
| `TaxAuthorityDashboard.tsx` | components/ | Tax workflow sidebar |
| `AccountingDataDialog.tsx` | components/ | Form 102 data entry |
| `ViewAccountingDataDialog.tsx` | components/ | View existing accounting data |
| `FileUploadDialog.tsx` | components/ | File upload modal |
| `EmailCampaign/EmailEditor.tsx` | components/ | Rich HTML email editor |
| `EmailCampaign/RecipientSelector.tsx` | components/ | Multi-select for email recipients |
| `timeline/` components | components/timeline/ | Timeline event cards and filters |

---

## 2. Database Schema (Legacy System)

### Core Tables

#### `kalvia_grant` (Main grant record)
```sql
CREATE TABLE kalvia_grant (
  id UUID PRIMARY KEY,
  client_id UUID,

  -- Eligibility Check Data
  eligibility_check_id UUID,
  business_type TEXT ('regular' | 'ngo'),
  reporting_type TEXT ('monthly' | 'bi_monthly'),
  revenue_2023 DECIMAL(15,2),
  revenue_2025 DECIMAL(15,2),
  revenue_decline_percentage DECIMAL(5,2),

  -- Payment & Status
  payment_status TEXT,
  payment_method TEXT,
  payment_date TIMESTAMPTZ,

  -- Bank Details (submitted after payment)
  bank_name TEXT,
  bank_branch TEXT ('003', '902', etc),
  account_number TEXT (6-9 digits),
  account_holder_name TEXT,
  bank_details_submitted_at TIMESTAMPTZ,

  -- Accounting Data (from Form 102)
  fixed_expenses DECIMAL(15,2),
  salary_expenses DECIMAL(15,2),
  avg_inputs DECIMAL(12,2),
  zero_vat_inputs DECIMAL(12,2),
  salary_june_2025 DECIMAL(12,2),

  -- Deductions
  miluim_deductions DECIMAL(12,2),
  tips_deductions DECIMAL(12,2),
  chalat_deductions DECIMAL(12,2),
  vacation_deductions DECIMAL(12,2),

  -- Grant Calculations
  fixed_expenses_grant DECIMAL(15,2),
  salary_grant DECIMAL(15,2),
  total_grant DECIMAL(15,2),
  grant_cap DECIMAL(15,2),
  final_grant_amount DECIMAL(15,2),

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### `eligibility_checks`
```sql
CREATE TABLE eligibility_checks (
  id UUID PRIMARY KEY,
  client_id UUID,

  -- Classification Input
  business_type TEXT,
  reporting_type TEXT,

  -- Revenue Data
  base_revenue DECIMAL(15,2),
  current_revenue DECIMAL(15,2),
  decline_percentage DECIMAL(5,2),

  -- Eligibility Result
  status TEXT ('ELIGIBLE' | 'NOT_ELIGIBLE' | 'GRAY_AREA'),
  compensation_rate DECIMAL(5,2),

  -- Payment
  payment_status TEXT,

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### `detailed_grant_calculations`
```sql
CREATE TABLE detailed_grant_calculations (
  id UUID PRIMARY KEY,
  kalvia_grant_id UUID,

  -- Fixed Expenses Section
  fixed_expenses DECIMAL(15,2),
  compensation_rate DECIMAL(5,2),
  fixed_expenses_grant DECIMAL(15,2),

  -- Salary Expenses Section
  salary_expenses DECIMAL(15,2),
  salary_june_2025 DECIMAL(15,2),
  salary_multiplier DECIMAL(3,2),  -- 1.25 or 1.325
  salary_grant DECIMAL(15,2),

  -- Totals
  total_grant DECIMAL(15,2),
  grant_cap DECIMAL(15,2),
  final_amount DECIMAL(15,2),

  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### `eligibility_email_logs`
```sql
CREATE TABLE eligibility_email_logs (
  id UUID PRIMARY KEY,
  eligibility_check_id UUID,

  email_address TEXT,
  email_type TEXT,
  status TEXT ('sent' | 'failed' | 'bounced'),
  sent_at TIMESTAMPTZ,
  response_data JSONB
);
```

#### `payment_transactions`
```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY,
  eligibility_check_id UUID,

  amount DECIMAL(15,2),
  currency TEXT ('ILS'),
  method TEXT ('credit_card' | 'bank_transfer' | 'bit'),
  status TEXT ('pending' | 'completed' | 'failed'),

  transaction_id TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## 3. Calculation Formulas & Logic

### Eligibility Check Calculation
**File**: `grant_calculator.tsx` lines 33-104

```javascript
// Revenue Decline Percentage
revenueDecline = ((baseRevenue - currentRevenue) / baseRevenue) * 100

// Eligibility Thresholds
- Regular business: ≥20% decline = ELIGIBLE
- NGO: ≥20% decline = ELIGIBLE
- <20% decline = NOT_ELIGIBLE
- Compensation rate based on decline percentage
```

### Grant Calculation (Simple)
**File**: `grant_calculator.tsx` lines 105-133

```javascript
// Fixed Expenses Grant
fixedExpensesGrant = avgExpenses * (compensationRate / 100)

// Salary Grant
multiplier = businessType === 'ngo' ? 1.325 : 1.25
salaryGrant = salary * multiplier * 0.75 * (revenueDecline / 100)

// Total
totalGrant = fixedExpensesGrant + salaryGrant

// Cap
finalGrant = Math.min(totalGrant, 600000)  // ₪600,000 cap
```

### Detailed Grant Calculation
**File**: `GrantDetailedCalculationPage.tsx` (77KB file)

**Known Bug**: The salary calculation uses 0.75 multiplier which may not be correct per all scenarios.

```javascript
// Step 1: Fixed Expenses (from Form 102)
- Get avg_inputs from "דיווחי מעמ" (VAT forms 8/2023-9/2022)
- Get zero_vat_inputs (inputs without VAT charged)
- Compensation = avg_inputs * (compensationRate / 100)

// Step 2: Salary Expenses (from Form 102, Line 26)
- salary_june_2025 from employee payroll
- minus deductions:
  - miluim_deductions (IDF reserves)
  - tips_deductions
  - chalat_deductions (employees on Chalet leave)
  - vacation_deductions (employees on vacation)
- net_salary = salary_june_2025 - all_deductions

// Step 3: Salary Grant Calculation
- multiplier = businessType === 'ngo' ? 1.325 : 1.25
- salary_grant = net_salary * multiplier * (declinePercentage / 100)

// Step 4: Total & Cap
- total = fixed_expenses_grant + salary_grant
- final = min(total, 600000)
```

**⚠️ CRITICAL BUG FOUND**: The legacy system uses hardcoded `0.75` multiplier in salary calculations in some places, but the Form 102 detailed calculation doesn't use this. Inconsistency between two calculation methods.

---

## 4. Email Templates (All Types)

**File**: `/backend/src/sendgridService.ts` (2060 lines)

### Email Types Sent by System

#### 1. **ELIGIBLE Notification**
- **Trigger**: After successful eligibility check → ELIGIBLE status
- **Recipients**: All provided emails for the client
- **Subject**: `{clientName} - מזל טוב! תוצאות בדיקת זכאות לפיצוי "עם כלביא"`
- **Template Function**: `createEligibleTemplate()`
- **Content Includes**:
  - Hebrew RTL formatting
  - Revenue comparison (2023 vs 2025)
  - Decline percentage
  - Compensation rate
  - Payment link (if available)
  - Next steps instructions

#### 2. **NOT_ELIGIBLE Notification**
- **Trigger**: After eligibility check → NOT_ELIGIBLE status
- **Recipients**: All provided emails
- **Subject**: `{clientName} - תוצאות בדיקת זכאות לפיצוי "עם כלביא"`
- **Template Function**: `createNotEligibleTemplate()`
- **Content Includes**:
  - Explanation of why not eligible
  - Revenue comparison
  - Decline percentage (below 20%)
  - Appeal process information

#### 3. **GRAY_AREA Notification**
- **Trigger**: Edge cases or unclear eligibility
- **Recipients**: All provided emails
- **Subject**: `{clientName} - תוצאות בדיקת זכאות לפיצוי "עם כלביא"`
- **Template Function**: `createGrayAreaTemplate()`
- **Content**: Instructions to contact support for manual review

#### 4. **Grant Calculation Completion**
- **Trigger**: After simple grant calculation
- **Subject**: `חישוב המענק הושלם - {clientName}`
- **Template Function**: `createGrantCalculationTemplate()`
- **Content Includes**:
  - Grant amount calculated
  - Next steps (payment required)
  - Bank details form link

#### 5. **Detailed Grant Calculation**
- **Trigger**: After 4-step detailed calculation completed
- **Subject**: `חישוב מענק מפורט - {clientName}`
- **Template Function**: `createDetailedGrantCalculationTemplate()`
- **Content Includes**:
  - Fixed expenses grant breakdown
  - Salary grant breakdown
  - Total grant amount
  - Form 102 data summary
  - Bank details submission link

#### 6. **Submission Confirmation**
- **Trigger**: After bank details and all docs submitted
- **Subject**: `הודעה על שידור הפיצוי לו הנכם זכאים בגין נזקי מלחמת "עם כלביא"`
- **Template Function**: `createSubmissionConfirmationTemplate()`
- **Content**:
  - Submission date
  - Request number
  - Grant amount confirmed
  - Expected processing timeline

#### 7. **Payment Receipt**
- **Trigger**: After payment completed
- **Template Function**: `createPaymentConfirmationTemplate()`
- **Content**:
  - Payment amount (₪1,500 service fee)
  - Payment method
  - Transaction ID
  - Next steps

### Email Template HTML Structure
All templates use:
- **Language**: Hebrew
- **Direction**: RTL (`dir="rtl"`)
- **Font**: RUVIK, Arial fallback
- **Max Width**: 900px
- **Colors**:
  - Primary: #2c3e50 (dark grey)
  - Accent: #3498db (blue)
  - Success: #27ae60 (green)
  - Background: white/light grey (#fafafa, #fdfdfd)
- **Styling**:
  - Flexbox for layout
  - Border-right (instead of border-left) for RTL
  - `!important` directives for direction/text-align
  - Box shadows for depth
  - Border radius for modern look

### Key Email Metadata
```javascript
{
  from: 'shani@franco.co.il',  // Authenticated sender
  bcc: 'francokelavi@gmail.com',  // Hidden copy for tracking

  headers: {
    'X-Priority': '1',
    'Content-Language': 'he',
    'X-Mailer': 'Kalvia CRM Email System'
  },

  categories: ['kalvia-crm', 'eligibility-notification'],
  customArgs: {
    'system': 'kalvia_crm',
    'email_type': 'eligibility_check',
    'language': 'hebrew'
  },

  // Disable SendGrid link tracking to prevent URL wrapping
  trackingSettings: {
    clickTracking: { enable: false },
    openTracking: { enable: false },
    subscriptionTracking: { enable: false }
  }
}
```

---

## 5. External Form Flows

### Bank Details Form
**Page**: `BankDetailsPage.tsx` (408 lines)

**Fields**:
- Bank Name (free text) - Examples: בנק לאומי, בנק הפועלים, מזרחי טפחות
- Branch Number (3-4 digits) - Example: 902
- Account Number (6-9 digits) - Example: 1234567
- Account Holder Name (free text, company name as registered in bank)

**Validation**:
```typescript
bank_name: required, non-empty
bank_branch: required, exactly 3-4 digits regex: /^\d{3,4}$/
account_number: required, 6-9 digits regex: /^\d{6,9}$/
account_holder_name: required, non-empty
```

**Flow**:
1. User fills form on public link
2. Validation on client & server
3. POST to `/api/eligibility-checks/{checkId}/bank-details`
4. On success: Email sent with detailed calculation summary
5. Form disabled after submission (immutable)

### Accounting Data Form (Form 102)
**Page**: `AccountingDataFormPage.tsx` (29KB)

**Data Collected**:
- Average monthly inputs (from VAT forms 8/2023-9/2022)
- Zero VAT inputs
- Salary for June 2025 (from payroll)
- Deductions:
  - Military reserve deductions
  - Tips deductions
  - Chalet leave deductions
  - Vacation deductions

**Validation**: Each field is numeric with min/max bounds

### Payment Page
**Page**: `PaymentPage.tsx` (300+ lines)

**Payment Methods Supported**:
1. **Credit Card** (כרטיס אשראי)
   - Card number, expiry, CVV, holder name
   - Integration: (Not shown in code, likely Cardcom/external gateway)

2. **Bank Transfer** (העברה בנקאית)
   - Display static bank account details
   - Manual transfer confirmation

3. **Bit** (ביט)
   - Israel's instant payment system
   - Mobile payment link

**Amount**: Fixed ₪1,500 (שכר טרחה לבדיקת זכאות מענק כלביא)

**Flow**:
1. Show payment summary
2. User selects payment method
3. Process payment (2000ms simulated delay)
4. PUT to `/api/eligibility-checks/{id}/payment-status`
5. On success: Redirect to detailed calculation
6. Send payment confirmation email

---

## 6. Tax Submission Workflow

**Page**: `TaxAuthorityManagementPage.tsx` (72KB, complex state machine)

### Status Flow Diagram
```
PENDING
  ↓
ELIGIBILITY_CHECK_COMPLETED
  ↓
PAYMENT_RECEIVED
  ↓
BANK_DETAILS_SUBMITTED
  ↓
ACCOUNTING_DATA_RECEIVED
  ↓
DOCUMENTS_VERIFIED
  ↓
READY_FOR_TAX_SUBMISSION
  ↓
TAX_AUTHORITY_SUBMITTED (POST to tax authority API)
  ↓
TAX_AUTHORITY_ACKNOWLEDGED (Response from tax authority)
  ↓
APPROVED (Confirmed by tax authority)
or
REJECTED (Tax authority denies)
```

### Tax Authority API Endpoints (Inferred from code)
- `POST /api/tax-authority/submit` - Submit complete application
- `GET /api/tax-authority/status/{id}` - Check submission status
- `GET /api/tax-authority/tracking/{requestNumber}` - Track by request number

### Letters Generated During Tax Submission
1. **Eligibility Letter** - Proof of eligibility check result
2. **Grant Calculation Letter** - Detailed calculation breakdown
3. **Bank Details Letter** - Bank account confirmation
4. **Accounting Data Letter** - Form 102 summary
5. **Final Submission Letter** - Complete application package

### Submission Statuses
- `pending` - Initial state
- `submitted` - Sent to tax authority (timestamp recorded)
- `acknowledged` - Tax authority received (with response date)
- `approved` - Granted (final grant amount confirmed)
- `rejected` - Denied (reason stored in DB)
- `appealable` - Decision can be appealed

---

## 7. UI Patterns & Design System

### Key UI Patterns Found

#### Status Badge System
```typescript
enum StatusBadge {
  'ELIGIBLE' → Green badge + checkmark icon
  'NOT_ELIGIBLE' → Red badge + X icon
  'GRAY_AREA' → Orange badge + info icon
  'PAYMENT_PENDING' → Yellow badge
  'TAX_SUBMITTED' → Blue badge
  'TAX_APPROVED' → Green badge
  'TAX_REJECTED' → Red badge
}
```

#### Timeline Component
- Vertical timeline of events
- Event types: check, payment, submission, approval
- Expandable event details
- Filter by status/date range
- **Problem**: Slow with large datasets (no pagination)

#### Dialog/Modal Pattern
```typescript
<Dialog open={showDialog}>
  <DialogTitle>Title</DialogTitle>
  <DialogContent>
    Form or content
  </DialogContent>
  <DialogActions>
    <Button>Cancel</Button>
    <Button variant="contained">Save</Button>
  </DialogActions>
</Dialog>
```

#### Data Table Patterns
- **ClientsPage**: 50+ columns, very wide table
- **Problem**: No proper responsive design, breaks on mobile
- Sorting, filtering, pagination
- Row actions (edit, delete, view details)

#### Form Patterns
- Required fields marked with `*`
- Validation on blur
- Error messages below field
- Submit button disabled during loading
- Loading spinner in button text

#### Navigation
- No routing library abstraction (direct React Router)
- Deep linking issues with modal dialogs
- Back button doesn't properly restore state
- **Problem**: Complex state management needed

### Design System Issues
- **No shadcn/ui** - Uses Material-UI (MUI) exclusively
- **No Tailwind** - Uses MUI sx prop for styling
- **Hebrew/RTL**: Inconsistent across components
  - Some components flip correctly
  - Dropdown positioning broken in RTL
  - Modal positioning issues
- **No design tokens** - Colors hardcoded throughout
- **No component library** - Each page reimplements common UI

---

## 8. Known Bugs & Issues

### Critical Bugs
1. **Salary Calculation Inconsistency** (file: `grant_calculator.tsx` + `GrantDetailedCalculationPage.tsx`)
   - Simple calc uses: `salary * 1.25 * 0.75 * declineRate`
   - Detailed calc: `salary * multiplier * (declineRate / 100)`
   - **Difference**: The `0.75` multiplier exists only in simple calc
   - **Impact**: Two different grant amounts for same input
   - **Fix**: Verify with business which is correct

2. **RTL Email Formatting** (file: `sendgridService.ts` lines 300-400)
   - Using `!important` directives excessively
   - Some clients (Outlook, Gmail) ignore dir="rtl"
   - Body text wrapping issues on mobile
   - **Fix**: Test with all major email clients

3. **Timeline Performance** (file: `TimelinePage.tsx`)
   - No pagination - loads all events
   - Slows to crawl with >500 events
   - No virtual scrolling
   - **Fix**: Add pagination or virtual scroll

4. **Bank Details Validation** (file: `BankDetailsPage.tsx` line 94-96)
   - Branch validation: `/^\d{3,4}$/` is too strict
   - Some Israeli banks use 6-digit branch codes
   - **Fix**: Support 3-6 digit branch codes

### UI/UX Issues
1. **No mobile responsiveness** - Forms completely broken on mobile
2. **Deep linking broken** - Modals don't restore state on navigation
3. **Form submissions hang** - No timeout on API calls
4. **Email template responsiveness** - Wide tables don't wrap on mobile
5. **No dark mode** - Legacy system only supports light theme
6. **Accessibility**: No ARIA labels, keyboard navigation broken

### Data Integrity Issues
1. **No audit trail** - Edits don't record who changed what
2. **No soft deletes** - Data permanently deleted
3. **No data validation** - Some numeric fields can be negative
4. **Duplicate submissions** - No idempotency keys

### Security Issues
1. **Payment page simulation** - Doesn't actually process payments
2. **No rate limiting** - API can be spammed
3. **No CSRF protection** - Forms vulnerable
4. **Passwords stored?** - Auth context unclear
5. **No input sanitization** - XSS risk in email templates

---

## 9. Calculation Engine Deep Dive

### Key Constants & Business Rules

```javascript
// Grant Eligibility
MINIMUM_DECLINE_PERCENTAGE = 20%  // Must lose ≥20% revenue

// Multipliers by Business Type
REGULAR_BUSINESS_MULTIPLIER = 1.25
NGO_MULTIPLIER = 1.325

// Salary Calculation
SALARY_CALCULATION_FACTOR = 0.75  // ⚠️ INCONSISTENT

// Grant Cap
MAXIMUM_GRANT = ₪600,000

// Payment/Service Fee
SERVICE_FEE = ₪1,500  // One-time fee for eligibility check

// Compensation Rates (Inferred from decline %)
- 20-30% decline → ~25% compensation
- 30-50% decline → ~50% compensation
- >50% decline → ~100% compensation (capped at max grant)
```

### Complex Calculation Example

**Scenario**: Regular business, 35% revenue decline

```
Input:
  - Fixed expenses: ₪100,000/month average
  - Salary (June 2025): ₪200,000
  - Revenue decline: 35%
  - Business type: regular
  - No deductions

Calculation (Detailed Method):
  1. Compensation rate for 35% decline = 50%
  2. Fixed expenses grant = ₪100,000 × 50% = ₪50,000

  3. Salary grant = ₪200,000 × 1.25 × 35% = ₪87,500

  4. Total = ₪50,000 + ₪87,500 = ₪137,500

  5. Final (no deductions) = ₪137,500

Output: ₪137,500 grant (below ₪600,000 cap)
```

### Form 102 Integration (Accounting Data)
The legacy system collects Form 102 (Israeli tax form) data:
- **Section A**: Inputs (תשומות) - Raw materials purchased
  - `avg_inputs`: Average over 12 months
  - `zero_vat_inputs`: Inputs purchased without VAT charge
- **Section B**: Employees and Salary
  - `salary_june_2025`: Total wages for June 2025
  - Deductions subtracted from this
- **Section C**: Fixed Assets & Depreciation

**Key Integration Point**: Form 102 data flows directly into grant calculation without additional processing.

---

## 10. Israeli Banks List

**File**: `BankDetailsPage.tsx` line 323 (hardcoded examples)

Dropdown values (from placeholder text):
- בנק לאומי (Bank Leumi)
- בנק הפועלים (Bank HaPoalim)
- מזרחי טפחות (Mizrahi Tefahot)

**Note**: Legacy system doesn't validate against known banks list. Accepts any free-text input.

**Known Israeli Banks** (from other sources in codebase):
```
Bank Codes:
  001 - בנק לאומי
  002 - בנק הפועלים
  003 - בנק דיסקונט
  004 - בנק לאומי למשכנתאות
  005 - בנק חשמונאי
  006 - בנק אגד
  007 - בנק דואר / פוסטל בנק
  008 - בנק מרכזי
  009 - בנק הקבע
  010 - מזרחי טפחות
  ...
```

**Branch Numbers**: 3-4 digit routing numbers specific to bank location

**Account Numbers**: 6-9 digits, varies by bank

---

## 11. Payment Text & Hebrew Messaging

### Service Fee Explanation
**Payment Page**: "שכר טרחה לבדיקת זכאות מענק כלביא"
- **Translation**: "Professional fee for Shaagat HaAri grant eligibility check"
- **Amount**: Fixed ₪1,500
- **When**: After initial eligibility check completed
- **Required**: Must pay before proceeding to detailed calculation

### Email Subject Lines (Hebrew)

| Template | Subject |
|----------|---------|
| Eligible | `{name} - מזל טוב! תוצאות בדיקת זכאות לפיצוי "עם כלביא"` |
| Not Eligible | `{name} - תוצאות בדיקת זכאות לפיצוי "עם כלביא"` |
| Gray Area | `{name} - תוצאות בדיקת זכאות לפיצוי "עם כלביא"` |
| Grant Calc | `חישוב המענק הושלם - {name}` |
| Detailed Calc | `חישוב מענק מפורט - {name}` |
| Submission | `הודעה על שידור הפיצוי לו הנכם זכאים בגין נזקי מלחמת "עם כלביא"` |

### Common Hebrew Terms Used
- **מענק** (Manu'ak) - Grant
- **זכאות** (Zachaut) - Eligibility
- **עם כלביא** (Im Kalvia) - "With Kalvia" (proper name)
- **פיצוי** (Pituy) - Compensation
- **תקבול** (Takbul) - Revenue
- **הוצאה** (Hotza'a) - Expense
- **שכר** (Sachar) - Salary/wage
- **תשומות** (Tashumot) - Inputs (VAT form term)
- **מעמ** (Maam) - VAT (Value Added Tax)
- **בנק** (Bank) - Bank
- **סניף** (Snif) - Branch
- **חשבון** (Cheshbon) - Account

---

## 12. API Endpoints (Inferred from Code)

### Eligibility Endpoints
- `GET /api/eligibility-checks?client_id={id}` - Fetch check by client
- `POST /api/eligibility-checks` - Create new check
- `GET /api/eligibility-checks/{id}` - Get single check
- `PUT /api/eligibility-checks/{id}` - Update check
- `PUT /api/eligibility-checks/{id}/payment-status` - Update payment
- `PUT /api/eligibility-checks/{id}/bank-details` - Save bank details
- `POST /api/eligibility-checks/{id}/send-detailed-email` - Send email

### Grant Endpoints
- `POST /api/grants` - Create grant record
- `GET /api/grants/{clientId}/complete-data` - Full grant data for PDF
- `PUT /api/grants/{id}` - Update grant

### Tax Authority Endpoints
- `POST /api/tax-authority/submit` - Submit application
- `GET /api/tax-authority/status/{id}` - Check status
- `GET /api/tax-authority/tracking/{requestNumber}` - Track submission

### Email Endpoints
- `POST /api/send-email` - Send custom email
- `POST /api/send-batch-email` - Bulk email campaign
- `GET /api/email-logs` - Get email history

### File Endpoints
- `POST /api/files/upload` - Upload file
- `GET /api/files/{id}` - Download file
- `DELETE /api/files/{id}` - Delete file

---

## 13. Technology Stack Summary

### Frontend
- **React 18** (not 19)
- **Material-UI (MUI)** for components
- **React Router** for navigation
- **TypeScript** (strict mode)
- **Axios** (likely, from import patterns)
- **Context API** for state (not Redux)
- **No TailwindCSS** - pure MUI sx prop

### Backend
- **Node.js** + TypeScript
- **Express.js** (inferred from error patterns)
- **SendGrid** for email
- **Supabase** (PostgreSQL backend)
- **No ORM visible** - raw queries or SDK

### Database
- **PostgreSQL** (Supabase)
- **UUID** primary keys
- **TIMESTAMPTZ** for dates
- **DECIMAL(15,2)** for financial amounts

### Deployment
- **Frontend**: Likely Vercel or Netlify
- **Backend**: Node.js on Heroku or similar
- **Database**: Supabase Cloud

---

## 14. Integration Points with New System

### Data Migration Path
1. **Extract** all `kalvia_grant`, `eligibility_checks`, `detailed_grant_calculations` records
2. **Transform** status enum values to match new system
3. **Map** old column names to new schema
4. **Validate** financial calculations in new engine
5. **Load** into Supabase with RLS policies

### Feature Replication Priority
1. **Must Have**: Eligibility check calculation (20% decline threshold)
2. **Must Have**: Grant calculation (fixed + salary sections)
3. **Should Have**: Form 102 data collection (accounting data)
4. **Should Have**: Bank details form
5. **Nice to Have**: Tax authority workflow
6. **Nice to Have**: Email templates (can redesign)

### Code Reuse Candidates
- Calculation formulas (with bug fixes)
- Bank validation regex (fix to support 3-6 digits)
- Email template HTML structure (convert to new templates)
- Form validation schemas (convert to Zod)

### Breaking Changes in New System
- **No Material-UI** - Convert to shadcn/ui
- **No RTL !important overrides** - Use Tailwind logical properties
- **RLS policies** - All queries filtered by tenant_id
- **Service-based architecture** - No direct component API calls
- **TypeScript strict** - No `any` types

---

## 15. Testing & QA Notes

### Critical Test Cases (from legacy bugs)
1. Test salary calculation with zero deductions
2. Test with 20% decline edge case (boundary)
3. Test with >100% decline (should cap at max grant)
4. Test email HTML rendering in Outlook, Gmail, Apple Mail (RTL)
5. Test bank branch validation with various formats
6. Test form submission idempotency (double-submit prevention)
7. Test timeline performance with 500+ events

### Known Test Failures in Legacy
- Mobile responsiveness completely broken
- Email template links wrap on mobile
- Deep linking to nested modals doesn't work
- Concurrent requests cause race conditions
- No backup/recovery from incomplete submissions

---

## Summary for Development Team

**What to Keep**: Calculation formulas (with bug fixes), email flow logic, database schema design

**What to Redesign**: UI layer (MUI → shadcn/ui), RTL handling (use Tailwind logical props), API architecture (add RLS), error handling (add proper logging)

**What to Avoid**: Deep nesting of modals, unlimited data loading, hardcoded constants, `!important` CSS overrides

**Reference Files to Review**:
- `/grant_calculator.tsx` - Core calculation logic
- `/sendgridService.ts` - Email templates
- `GrantDetailedCalculationPage.tsx` - 4-step wizard pattern
- `TaxAuthorityManagementPage.tsx` - State machine for workflows
