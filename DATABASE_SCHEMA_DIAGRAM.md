# Database Schema - Actual Payments System

## Entity Relationship Diagram

```
┌─────────────────────┐
│   fee_calculations  │
│─────────────────────│
│ id (PK)             │
│ tenant_id (FK)      │
│ client_id (FK)      │
│ final_amount        │
│ payment_method_     │
│   selected          │
│ amount_after_       │
│   selected_discount │
│ ┌─────────────────┐ │
│ │ NEW COLUMNS:    │ │
│ │ actual_payment_ │ │──┐
│ │   id (FK)       │ │  │
│ │ has_deviation   │ │  │
│ │ deviation_alert_│ │  │
│ │   level         │ │  │
│ └─────────────────┘ │  │
└─────────────────────┘  │
                         │
                         │ Links to
                         ▼
┌──────────────────────────────┐
│     actual_payments          │
│──────────────────────────────│
│ id (PK) ◄────────────────────┤
│ tenant_id (FK)               │
│ client_id (FK)               │
│ fee_calculation_id (FK) ─────┼──► fee_calculations.id
│                              │
│ ┌──────────────────────────┐ │
│ │ VAT BREAKDOWN:           │ │
│ │ amount_paid             │ │
│ │ amount_before_vat       │ │
│ │ amount_vat              │ │
│ │ amount_with_vat         │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ PAYMENT DETAILS:         │ │
│ │ payment_date            │ │
│ │ payment_method          │ │
│ │ payment_reference       │ │
│ │ num_installments        │ │
│ │ attachment_ids[]        │ │
│ │ notes                   │ │
│ └──────────────────────────┘ │
│                              │
│ created_at, updated_at       │
│ created_by, updated_by       │
└──────────────────┬───────────┘
                   │
                   │ Has many
                   ▼
┌──────────────────────────────┐
│   payment_installments       │
│──────────────────────────────│
│ id (PK)                      │
│ tenant_id (FK)               │
│ actual_payment_id (FK) ──────┼──► actual_payments.id
│                              │    (CASCADE DELETE)
│ ┌──────────────────────────┐ │
│ │ INSTALLMENT:             │ │
│ │ installment_number      │ │
│ │ installment_date        │ │
│ │ installment_amount      │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ STATUS:                  │ │
│ │ status (pending/paid/   │ │
│ │         overdue)        │ │
│ │ paid_date               │ │
│ │ notes                   │ │
│ └──────────────────────────┘ │
│                              │
│ created_at                   │
└──────────────────────────────┘

┌──────────────────────────────┐
│    payment_deviations        │
│──────────────────────────────│
│ id (PK)                      │
│ tenant_id (FK)               │
│ client_id (FK)               │
│ fee_calculation_id (FK) ─────┼──► fee_calculations.id
│ actual_payment_id (FK) ──────┼──► actual_payments.id
│                              │
│ ┌──────────────────────────┐ │
│ │ EXPECTED vs ACTUAL:      │ │
│ │ expected_discount_%     │ │
│ │ expected_amount         │ │
│ │ actual_amount           │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ DEVIATION:               │ │
│ │ deviation_amount        │ │
│ │ deviation_percent       │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ ALERT SYSTEM:            │ │
│ │ alert_level             │ │
│ │ alert_message           │ │
│ └──────────────────────────┘ │
│                              │
│ ┌──────────────────────────┐ │
│ │ REVIEW STATUS:           │ │
│ │ reviewed                │ │
│ │ reviewed_by (FK)        │ │
│ │ reviewed_at             │ │
│ │ review_notes            │ │
│ └──────────────────────────┘ │
│                              │
│ created_at                   │
└──────────────────────────────┘
```

## Data Flow

```
1. FEE CALCULATION CREATED
   ┌─────────────────────────┐
   │  fee_calculations       │
   │  - Original amount      │
   │  - Selected discount    │
   │  - Expected amount      │
   └─────────────────────────┘
             │
             │ Client pays
             ▼
2. ACTUAL PAYMENT RECORDED
   ┌─────────────────────────┐
   │  actual_payments        │
   │  - Actual amount        │
   │  - VAT breakdown        │
   │  - Payment method       │
   │  - Payment date         │
   └─────────────────────────┘
             │
             ├──► If installments
             │    ┌──────────────────────┐
             │    │ payment_installments │
             │    │ - Schedule tracking  │
             │    └──────────────────────┘
             │
             │ Calculate deviation
             ▼
3. DEVIATION ANALYSIS
   ┌─────────────────────────┐
   │ calculate_payment_      │
   │   deviation()           │
   │ - Compare expected vs   │
   │   actual                │
   │ - Calculate %           │
   │ - Determine alert level │
   └─────────────────────────┘
             │
             │ If deviation exists
             ▼
4. DEVIATION RECORD CREATED
   ┌─────────────────────────┐
   │  payment_deviations     │
   │  - Alert level          │
   │  - Hebrew message       │
   │  - Needs review         │
   └─────────────────────────┘
             │
             │ Update original record
             ▼
5. FEE CALCULATION UPDATED
   ┌─────────────────────────┐
   │  fee_calculations       │
   │  - actual_payment_id    │
   │  - has_deviation = true │
   │  - deviation_alert_level│
   └─────────────────────────┘
```

## Payment Method Discount Rules

```
┌──────────────────────┬───────────────────┬──────────┐
│   Payment Method     │    Hebrew Name    │ Discount │
├──────────────────────┼───────────────────┼──────────┤
│ bank_transfer        │ העברה בנקאית     │    9%    │ ← Recommended
│ cc_single            │ כ"א תשלום אחד    │    8%    │
│ cc_installments      │ כ"א בתשלומים     │    4%    │
│ checks               │ המחאות            │    0%    │
└──────────────────────┴───────────────────┴──────────┘

Example Calculation:
─────────────────────
Original amount:     ₪10,000 (before VAT)
VAT (18%):          ₪1,800
Total with VAT:     ₪11,800

If client selects bank_transfer (9% discount):
Discount:           ₪900 (9% of ₪10,000)
Expected amount:    ₪9,100
Expected with VAT:  ₪10,738

If client actually pays ₪10,000:
Deviation:          ₪738 overpayment
Deviation %:        8.1%
Alert level:        CRITICAL (>5%)
Message:            "⚠️ סטייה משמעותית: ₪738 (8.1%)! - תשלום עודף"
```

## Alert Level Logic

```
Deviation Calculation:
─────────────────────
deviation_amount = expected_amount - actual_amount
deviation_percent = (deviation_amount / expected_amount) × 100

Alert Levels:
────────────
│ ABS(deviation_percent) │ Alert Level │ Message                          │
├────────────────────────┼─────────────┼──────────────────────────────────┤
│ < 1%                   │ INFO        │ "תשלום תקין - סטייה מינימלית"   │
│ 1% - 5%                │ WARNING     │ "סטייה קלה: ₪X (Y%)"            │
│ > 5%                   │ CRITICAL    │ "⚠️ סטייה משמעותית: ₪X (Y%)!"  │
└────────────────────────┴─────────────┴──────────────────────────────────┘

Direction:
─────────
deviation_amount > 0  →  "תשלום חסר"  (Underpaid)
deviation_amount < 0  →  "תשלום עודף" (Overpaid)
deviation_amount = 0  →  "תשלום מדויק" (Exact)
```

## VAT Calculation Rules

```
Israeli VAT Rate: 18%

Constraints enforced by database:
─────────────────────────────────
1. amount_with_vat = amount_before_vat + amount_vat
2. amount_paid = amount_with_vat
3. amount_vat = amount_before_vat × 0.18

Example:
────────
amount_before_vat:  ₪10,000
amount_vat:         ₪1,800  (10,000 × 0.18)
amount_with_vat:    ₪11,800 (10,000 + 1,800)
amount_paid:        ₪11,800 (equals amount_with_vat)

✅ Valid
❌ Invalid if any constraint is violated
```

## Installment Tracking

```
Payment with 8 installments:
────────────────────────────

actual_payments:
  id: payment-123
  amount_paid: ₪11,800
  num_installments: 8

payment_installments:
  ┌───┬──────────────┬─────────┬──────────┬──────────┐
  │ # │     Date     │ Amount  │  Status  │   Paid   │
  ├───┼──────────────┼─────────┼──────────┼──────────┤
  │ 1 │ 2025-01-05   │ ₪1,475  │ paid     │ 2025-01-05│
  │ 2 │ 2025-02-05   │ ₪1,475  │ paid     │ 2025-02-06│
  │ 3 │ 2025-03-05   │ ₪1,475  │ pending  │    -     │
  │ 4 │ 2025-04-05   │ ₪1,475  │ pending  │    -     │
  │ 5 │ 2025-05-05   │ ₪1,475  │ pending  │    -     │
  │ 6 │ 2025-06-05   │ ₪1,475  │ pending  │    -     │
  │ 7 │ 2025-07-05   │ ₪1,475  │ pending  │    -     │
  │ 8 │ 2025-08-05   │ ₪1,475  │ pending  │    -     │
  └───┴──────────────┴─────────┴──────────┴──────────┘

View aggregates:
  installment_count: 8
  installments_paid: 2
  installments_overdue: 0 (as of today)
```

## Security Model

```
Row Level Security (RLS):
─────────────────────────

Every table has 4 policies:
  1. SELECT - View records from own tenant
  2. INSERT - Create records for own tenant
  3. UPDATE - Modify records from own tenant
  4. DELETE - Remove records from own tenant

Enforcement:
  WHERE tenant_id = get_current_tenant_id()
  WITH CHECK (tenant_id = get_current_tenant_id())

Multi-tenant Isolation:
─────────────────────────
  ✅ Tenant A cannot see Tenant B's payments
  ✅ Tenant A cannot modify Tenant B's data
  ✅ Tenant A cannot delete Tenant B's records
  ✅ View automatically filters by tenant_id

Database Functions:
──────────────────
  SECURITY DEFINER - Run with elevated privileges
  SET search_path = public, pg_temp - Prevent injection
```

## Performance Optimizations

```
Indexes Created:
───────────────

actual_payments (6 indexes):
  - PK on id (unique)
  - tenant_id (filtering)
  - client_id (joins)
  - fee_calculation_id (joins)
  - payment_date (date range queries)
  - payment_method (grouping)

payment_installments (4 indexes):
  - PK on id (unique)
  - tenant_id (filtering)
  - actual_payment_id (joins)
  - status (filtering pending/overdue)
  - installment_date (date range queries)

payment_deviations (5 indexes):
  - PK on id (unique)
  - tenant_id (filtering)
  - client_id (joins)
  - fee_calculation_id (joins)
  - alert_level (filtering)
  - reviewed (partial index on FALSE only)

fee_calculations (2 new indexes):
  - actual_payment_id (nullable lookup)
  - has_deviation (partial index on TRUE only)

Partial Indexes:
───────────────
  - Only index unreviewed deviations (saves space)
  - Only index fees with deviations (saves space)

Estimated Performance:
─────────────────────
  Query with tenant_id: < 5ms (indexed)
  Join to clients: < 10ms (indexed)
  Deviation filtering: < 2ms (partial index)
  View query: < 15ms (all joins indexed)
```

## Verification Summary

```
✅ Database Objects Created:
   - 3 tables (actual_payments, payment_installments, payment_deviations)
   - 3 columns added to fee_calculations
   - 19 indexes
   - 12 RLS policies (4 per table)
   - 1 view (fee_tracking_enhanced_view)
   - 2 functions (calculate_payment_deviation, update_actual_payments_updated_at)
   - 1 trigger (update_actual_payments_timestamp)

✅ Data Integrity:
   - Foreign key constraints
   - Check constraints for enums
   - VAT calculation constraints
   - NOT NULL enforcement
   - Default values

✅ Security:
   - RLS enabled on all tables
   - Tenant isolation enforced
   - Secure function execution
   - View uses security_invoker

✅ Documentation:
   - Table comments
   - Column comments
   - Function comments
   - Index comments
```

---

**Last Updated:** 2025-01-06
**Migration:** 081_actual_payments_system.sql
**Status:** DEPLOYED & VERIFIED
