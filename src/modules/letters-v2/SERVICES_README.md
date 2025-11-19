# Letters V2 - Services Layer Documentation

## Overview
שכבת Services אחידה וממוקדת עבור מערכת המכתבים V2. 3 שירותים עצמאיים שעובדים יחד.

## Architecture Principle
```
Database (generated_letters)
    ↓
ImageServiceV2 → LetterRenderingService → PDFGenerationService
    ↓                     ↓                       ↓
Supabase Storage    3 Rendering Modes    Edge Function
```

## Services

### 1. ImageServiceV2
**Purpose:** ניהול מרכזי של כל התמונות במערכת

**File:** `services/image.service.ts`

**Key Methods:**
```typescript
// Get public URL for browser
imageServiceV2.getPublicUrl('tico_logo_new')
// → https://zbqfeebrhberddvfkuhe.supabase.co/storage/v1/object/public/...

// Get all URLs for browser rendering
imageServiceV2.getAllPublicUrls()
// → { 'cid:tico_logo_new': 'https://...', 'cid:franco_logo_new': 'https://...' }

// Get base64 for email attachments
await imageServiceV2.getAsBase64('tico_logo_new')
// → "iVBORw0KGgoAAAANSUhEUgAA..."

// Get all as base64 for email
await imageServiceV2.getAllAsBase64()
// → { tico_logo_new: 'iVBOR...', franco_logo_new: 'iVBOR...' }
```

**Images Managed:**
- `tico_logo_new` - Tico_logo_png_new.png
- `tico_logo` - tico_logo_240.png (legacy)
- `franco_logo_new` - Tico_franco_co.png
- `franco_logo` - franco-logo-hires.png (legacy)
- `tagline` - tagline.png
- `bullet_star_blue` - Bullet_star_blue.png
- `bullet_star` - bullet-star.png (legacy)

**Storage:**
- Bucket: `letter-assets-v2`
- Access: Public read, admin write
- Location: Supabase Storage

---

### 2. LetterRenderingService
**Purpose:** 3 מצבי rendering שונים מאותו מקור

**File:** `services/letter-rendering.service.ts`

**3 Rendering Modes:**

#### Mode 1: Email Rendering
```typescript
const { html, attachments } = await letterRenderingService.renderForEmail(letterId);

// html = "<html>...<img src='cid:tico_logo_new'>...</html>"
// attachments = [
//   {
//     content: 'iVBOR...',        // base64
//     filename: 'tico_logo_new.png',
//     type: 'image/png',
//     disposition: 'inline',
//     content_id: 'tico_logo_new'
//   },
//   ...
// ]

// Ready for SendGrid/SMTP
await sendEmail({
  to: 'client@example.com',
  subject: 'מכתב שכר טרחה',
  html,
  attachments
});
```

#### Mode 2: Browser Rendering
```typescript
const html = await letterRenderingService.renderForBrowser(letterId);

// html = "<html>...<img src='https://supabase.co/storage/...'>...</html>"

// Use in React:
<div dangerouslySetInnerHTML={{ __html: html }} />
```

#### Mode 3: PDF Rendering
```typescript
const html = await letterRenderingService.renderForPDF(letterId);

// Optimized HTML for Puppeteer
// Same as browser mode but can be extended with:
// - Inline CSS
// - Removed interactive elements
// - Print-specific styles
```

**Additional Methods:**
```typescript
// Parse for editing
const { html, variables, letterType } = await letterRenderingService.parseLetterForEdit(letterId);

// Get metadata only
const metadata = await letterRenderingService.getLetterMetadata(letterId);

// Validate images
const missingImages = await letterRenderingService.validateLetterImages(letterId);
// → [] or ['missing_image_name']
```

---

### 3. PDFGenerationService
**Purpose:** יצירת PDF לפי דרישה + cache

**File:** `services/pdf-generation.service.ts`

**Core Methods:**
```typescript
// Generate new PDF (calls Edge Function)
const pdfUrl = await pdfGenerationService.generatePDF(letterId);
// → https://supabase.co/storage/v1/object/public/letter-pdfs-v2/...

// Check if PDF exists
const hasPDF = await pdfGenerationService.hasPDF(letterId);
// → true/false

// Get existing PDF URL
const url = await pdfGenerationService.getPDFUrl(letterId);
// → "https://..." or null

// Smart: Get or generate (recommended)
const pdfUrl = await pdfGenerationService.getOrGeneratePDF(letterId);
// Returns existing URL if available, generates if not

// Force regeneration
const pdfUrl = await pdfGenerationService.getOrGeneratePDF(letterId, true);
```

**Advanced Methods:**
```typescript
// Get metadata
const metadata = await pdfGenerationService.getPDFMetadata(letterId);
// → { letterId, generatedAt, fileSize, url }

// Delete PDF
await pdfGenerationService.deletePDF(letterId);

// Get download URL (signed, expires)
const downloadUrl = await pdfGenerationService.getDownloadUrl(letterId, 3600);

// Batch generation
const results = await pdfGenerationService.batchGeneratePDFs([id1, id2, id3]);
// → [{ letterId, success, url }, ...]
```

**Storage:**
- Bucket: `letter-pdfs-v2`
- Format: PDF
- Naming: `{letterId}.pdf`

---

## Usage Examples

### Example 1: Send Letter via Email
```typescript
import { letterRenderingService } from '@/modules/letters-v2/services';
import { sendEmail } from '@/services/email.service';

async function sendLetterEmail(letterId: string, recipientEmail: string) {
  // 1. Render for email
  const { html, attachments } = await letterRenderingService.renderForEmail(letterId);

  // 2. Send via SendGrid
  await sendEmail({
    to: recipientEmail,
    subject: 'מכתב שכר טרחה 2026',
    html,
    attachments
  });
}
```

### Example 2: Display Letter in Browser
```typescript
import { letterRenderingService } from '@/modules/letters-v2/services';
import { useState, useEffect } from 'react';

function LetterPreview({ letterId }: { letterId: string }) {
  const [html, setHtml] = useState('');

  useEffect(() => {
    letterRenderingService.renderForBrowser(letterId).then(setHtml);
  }, [letterId]);

  return (
    <div
      className="letter-preview"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
```

### Example 3: Generate and Download PDF
```typescript
import { pdfGenerationService } from '@/modules/letters-v2/services';

async function downloadLetterPDF(letterId: string) {
  // 1. Get or generate PDF
  const pdfUrl = await pdfGenerationService.getOrGeneratePDF(letterId);

  // 2. Get signed download URL (expires in 1 hour)
  const downloadUrl = await pdfGenerationService.getDownloadUrl(letterId, 3600);

  // 3. Trigger download
  window.open(downloadUrl, '_blank');
}
```

### Example 4: Edit Existing Letter
```typescript
import { letterRenderingService } from '@/modules/letters-v2/services';

async function editLetter(letterId: string) {
  // Parse letter to get variables
  const { html, variables, letterType } = await letterRenderingService.parseLetterForEdit(letterId);

  // Show in edit form
  console.log('Letter Type:', letterType);
  console.log('Variables:', variables);

  // User can modify variables and regenerate
}
```

---

## Data Flow

### Email Flow:
```
DB: generated_letters
    ↓
LetterRenderingService.renderForEmail()
    ↓ (loads HTML with CID references)
ImageServiceV2.getAllAsBase64()
    ↓ (downloads images from Storage)
Base64 Attachments Array
    ↓
SendGrid/SMTP
```

### Browser Flow:
```
DB: generated_letters
    ↓
LetterRenderingService.renderForBrowser()
    ↓ (loads HTML with CID references)
ImageServiceV2.getAllPublicUrls()
    ↓ (gets public URLs)
Replace CID → URL
    ↓
Browser Renders
```

### PDF Flow:
```
DB: generated_letters
    ↓
PDFGenerationService.generatePDF()
    ↓ (calls Edge Function)
Edge Function: generate-pdf
    ↓
LetterRenderingService.renderForPDF()
    ↓ (HTML with public URLs)
Puppeteer renders to PDF
    ↓
Upload to Storage: letter-pdfs-v2
    ↓
Update DB: pdf_url
```

---

## Error Handling

All services throw descriptive errors:

```typescript
try {
  const html = await letterRenderingService.renderForEmail(letterId);
} catch (error) {
  if (error.message.includes('Letter not found')) {
    // Handle missing letter
  } else if (error.message.includes('Image download failed')) {
    // Handle missing image
  }
}
```

---

## Testing Strategy

### Unit Tests (Vitest)
```typescript
describe('ImageServiceV2', () => {
  it('should return public URL for known image', () => {
    const url = imageServiceV2.getPublicUrl('tico_logo_new');
    expect(url).toContain('letter-assets-v2');
  });

  it('should throw for unknown image', () => {
    expect(() => imageServiceV2.getPublicUrl('fake_image')).toThrow();
  });
});
```

### Integration Tests
```typescript
describe('LetterRenderingService', () => {
  it('should render letter for email with attachments', async () => {
    const { html, attachments } = await letterRenderingService.renderForEmail(testLetterId);

    expect(html).toContain('cid:tico_logo_new');
    expect(attachments).toHaveLength(4);
    expect(attachments[0].content_id).toBe('tico_logo_new');
  });
});
```

---

## Type Safety

All services are fully typed:

```typescript
import type {
  EmailRenderResult,
  ImageName,
  ParsedLetter
} from '@/modules/letters-v2/types';

// Type-safe image names
const imageName: ImageName = 'tico_logo_new'; // ✅
const invalidName: ImageName = 'random_image'; // ❌ TypeScript error

// Type-safe render result
const result: EmailRenderResult = await letterRenderingService.renderForEmail(id);
// result.html → string
// result.attachments → EmailAttachment[]
```

---

## Performance Considerations

### Caching
- **ImageServiceV2**: Public URLs are cached by Supabase CDN
- **PDFGenerationService**: PDFs are cached in Storage (check with `hasPDF()`)
- **LetterRenderingService**: No internal cache (stateless)

### Optimization Tips
```typescript
// ✅ Good: Check before generating
if (!await pdfGenerationService.hasPDF(letterId)) {
  await pdfGenerationService.generatePDF(letterId);
}

// ✅ Better: Use smart method
await pdfGenerationService.getOrGeneratePDF(letterId);

// ❌ Bad: Always generate
await pdfGenerationService.generatePDF(letterId); // Wasteful
```

---

## Migration from V1

### Old Way (V1):
```typescript
// Multiple services, inconsistent patterns
const images = await getLetterImages();
const html = await renderLetterHTML(letterId);
const pdf = await convertToPDF(html);
```

### New Way (V2):
```typescript
// Unified services, clear separation
import {
  imageServiceV2,
  letterRenderingService,
  pdfGenerationService
} from '@/modules/letters-v2/services';

const { html, attachments } = await letterRenderingService.renderForEmail(letterId);
const pdfUrl = await pdfGenerationService.getOrGeneratePDF(letterId);
```

---

## Next Steps

1. **Edge Function**: Create `generate-pdf` Edge Function (Phase 3)
2. **Storage Buckets**: Create `letter-assets-v2` and `letter-pdfs-v2`
3. **UI Components**: Build preview components using these services
4. **Testing**: Add unit tests for all services

---

## Questions?

- **Where are images stored?** → Supabase Storage bucket `letter-assets-v2`
- **Where are PDFs stored?** → Supabase Storage bucket `letter-pdfs-v2`
- **Where is letter HTML stored?** → PostgreSQL table `generated_letters.generated_content_html`
- **How do I preview a letter?** → Use `letterRenderingService.renderForBrowser(letterId)`
- **How do I send a letter?** → Use `letterRenderingService.renderForEmail(letterId)` + email service
- **How do I generate PDF?** → Use `pdfGenerationService.getOrGeneratePDF(letterId)`
