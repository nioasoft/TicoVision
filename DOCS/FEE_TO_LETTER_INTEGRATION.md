# Fee Calculation to Letter Integration

**Date Implemented:** October 28, 2025
**Status:** ✅ COMPLETED

## Overview

This document describes the integration between the Fee Calculation system and the Letter Sending system. After creating a fee calculation in FeesPage, users can now preview and send the fee letter to clients via email.

## Architecture

### Flow Diagram

```
User completes fee calculation
         ↓
Fee saved to database (status='draft')
         ↓
LetterPreviewDialog opens automatically
         ↓
System loads fee + client data
         ↓
Generates letter variables
         ↓
Shows HTML preview with payment options
         ↓
User confirms and sends
         ↓
Email sent via send-letter Edge Function
         ↓
Database updated:
  - fee_calculations.status = 'sent'
  - generated_letters record created
         ↓
Letter appears in Collections Dashboard
```

## Components

### 1. LetterPreviewDialog Component

**File:** `src/modules/letters/components/LetterPreviewDialog.tsx`

**Purpose:** Reusable dialog for previewing and sending fee letters

**Props:**
```typescript
interface LetterPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feeId: string | null;
  clientId: string | null;
  onEmailSent?: () => void;
}
```

**Features:**
- Loads fee calculation and client data automatically
- Calculates letter variables (amounts, discounts, dates)
- Generates HTML preview using `templateService.previewLetterFromFiles()`
- Sends email via `send-letter` Edge Function
- Updates database after successful send:
  - `fee_calculations.status` → 'sent'
  - Creates `generated_letters` record
- Calls `onEmailSent()` callback for parent component

### 2. FeesPage Integration

**File:** `src/pages/FeesPage.tsx`

**Changes:**
1. Added state variables (lines 77-78):
   ```typescript
   const [letterPreviewOpen, setLetterPreviewOpen] = useState(false);
   const [currentFeeId, setCurrentFeeId] = useState<string | null>(null);
   ```

2. Modified `handleSaveCalculation` (lines 311-315):
   - Removed immediate toast + reset
   - Opens LetterPreviewDialog instead:
   ```typescript
   if (response.data) {
     setCurrentFeeId(response.data.id);
     setLetterPreviewOpen(true);
   }
   ```

3. Added LetterPreviewDialog component (lines 847-862):
   ```tsx
   <LetterPreviewDialog
     open={letterPreviewOpen}
     onOpenChange={setLetterPreviewOpen}
     feeId={currentFeeId}
     clientId={formData.client_id || null}
     onEmailSent={() => {
       toast({ title: 'הצלחה', description: 'המכתב נשלח בהצלחה ללקוח' });
       resetForm();
       loadInitialData();
       setLetterPreviewOpen(false);
     }}
   />
   ```

## Letter Variables Calculation

The system automatically calculates all required variables from fee and client data:

### Auto-Generated Variables
```typescript
{
  letter_date: "28/10/2025",        // Current date in Israeli format
  year: "2026",                     // Next tax year
  previous_year: "2025",            // Current year
  tax_year: "2026"                  // Next tax year
}
```

### Client Variables
```typescript
{
  company_name: client.company_name_hebrew || client.company_name,
  group_name: client.group_name || '',
  client_id: clientId
}
```

### Amount Variables (with discounts)
```typescript
{
  amount_original: "52,000",           // fee.total_with_vat
  amount_after_bank: "47,320",         // 9% discount
  amount_after_single: "47,840",       // 8% discount
  amount_after_payments: "49,920",     // 4% discount
}
```

### Payment Links
```typescript
{
  payment_link_single: "http://localhost:5173/payment?fee_id={id}&method=single",
  payment_link_4_payments: "http://localhost:5173/payment?fee_id={id}&method=installments"
}
```
**Note:** These are placeholder URLs. Real Cardcom integration will be added in Phase 2.

### Template-Specific Variables
```typescript
{
  inflation_rate: "4.0%",              // From fee.inflation_rate
  num_checks: "8",                     // Fixed for now
  check_dates_description: "החל מיום 5.1.2026 ועד ליום 5.8.2026"
}
```

## Template System

### Default Template
Currently uses: **`external_index_only`** (Annual Fee - Index Only)

File: `templates/bodies/annual-fee.html`

### Letter Structure
The letter is composed of 4 parts:
1. **Header** (`templates/components/header.html`)
   - TICO logo
   - Date
   - Recipient (company name)

2. **Body** (`templates/bodies/annual-fee.html`)
   - Subject line
   - Thank you message
   - Fee explanation
   - Inflation adjustment details

3. **Payment Section** (`templates/components/payment-section.html`)
   - 4 payment options:
     - Bank transfer (9% discount) - Most recommended
     - Credit card single (8% discount)
     - Credit card 4 installments (4% discount)
     - 8 checks (0% discount)

4. **Footer** (`templates/components/footer.html`)
   - Contact details (Sigal Nagar)
   - Franco logo
   - Company tagline

### Future Enhancement
Template selection will be rule-based, determined by client parameters (Phase 2).

## Database Schema

### Tables Used

#### fee_calculations
```sql
-- Status updated after sending
status VARCHAR DEFAULT 'draft'
-- Changes to 'sent' after email is sent
```

#### generated_letters
```sql
-- New record created after sending
{
  tenant_id: UUID,
  client_id: UUID,
  fee_calculation_id: UUID,
  template_id: NULL,                    -- File-based templates
  variables_used: JSONB,                -- All letter variables
  generated_content_html: TEXT,         -- Full HTML of letter
  payment_link: TEXT,                   -- Primary payment link
  sent_at: TIMESTAMP,                   -- When email was sent
  created_by: UUID                      -- User who sent it
}
```

## Email Sending

### Edge Function
**Name:** `send-letter`
**Location:** `supabase/functions/send-letter/index.ts`

**Process:**
1. Receives letter variables from frontend
2. Fetches templates from Vercel (`APP_URL/templates/`)
3. Replaces all `{{variables}}` with actual values
4. Builds full HTML email with CID images
5. Sends via SendGrid API
6. Returns success/error response

### SendGrid Configuration
- **Sender:** `shani@franco.co.il` (verified)
- **Images:** Inline CID attachments (logos, bullets, tagline)
- **Format:** HTML with RTL support

## User Experience Flow

1. **Fee Calculation Complete**
   - User fills fee calculation form in FeesPage
   - Clicks "שמור חישוב" (Save Calculation)
   - Fee saved with status='draft'

2. **Letter Preview Opens**
   - LetterPreviewDialog opens automatically
   - Loading spinner while generating preview
   - Full HTML letter displayed in dialog
   - Recipient email pre-filled from client data

3. **Review and Send**
   - User reviews letter content
   - Can edit recipient email if needed
   - Clicks "שלח למייל" (Send to Email)

4. **Email Sent**
   - Loading state during sending
   - Success toast: "המכתב נשלח בהצלחה ללקוח"
   - Dialog closes
   - Form resets
   - Data reloads

5. **Collections Dashboard**
   - Letter now appears in `/collections`
   - Status: 'sent'
   - Tracking: email opens, payment selections

## Testing Checklist

- [x] TypeScript compilation (no errors)
- [ ] Fee creation triggers dialog
- [ ] Preview loads correctly
- [ ] All variables replaced properly
- [ ] Email sends successfully
- [ ] status updates to 'sent'
- [ ] generated_letters record created
- [ ] Letter appears in Collections
- [ ] Payment links work (placeholder URLs)
- [ ] Form resets after send
- [ ] Error handling works

## Known Limitations

1. **Cardcom Integration:** Payment links are placeholders. Real Cardcom API integration needed.
2. **Template Selection:** Always uses `external_index_only`. Rule-based selection needed.
3. **Email Tracking:** Tracking pixel not yet implemented for open tracking.
4. **Multiple Recipients:** Currently sends to one email. Multi-recipient support needed.

## Future Enhancements

### Phase 2
- Real Cardcom payment link generation
- Template selection rules (based on client type, fee type)
- Email open tracking with pixel
- Payment selection tracking webhooks

### Phase 3
- Multiple recipient support
- CC/BCC functionality
- Letter scheduling (send later)
- Draft letter saving
- Letter history view per client

## Code References

**Components:**
- [LetterPreviewDialog.tsx](../src/modules/letters/components/LetterPreviewDialog.tsx) - Main dialog component
- [FeesPage.tsx](../src/pages/FeesPage.tsx#L847-L862) - Integration point

**Services:**
- [template.service.ts](../src/modules/letters/services/template.service.ts) - Template handling
- [fee.service.ts](../src/services/fee.service.ts) - Fee calculations

**Edge Functions:**
- [send-letter](../supabase/functions/send-letter/index.ts) - Email sending

**Templates:**
- [Header](../templates/components/header.html)
- [Annual Fee Body](../templates/bodies/annual-fee.html)
- [Payment Section](../templates/components/payment-section.html)
- [Footer](../templates/components/footer.html)

## Deployment Checklist

- [x] Code committed to git
- [ ] Tested in local environment
- [ ] Tested in production
- [ ] SendGrid templates updated
- [ ] Edge Function deployed
- [ ] Documentation updated

---

**Implementation Date:** October 28, 2025
**Developer:** Claude Code Agent
**Status:** ✅ Complete - Ready for Testing
