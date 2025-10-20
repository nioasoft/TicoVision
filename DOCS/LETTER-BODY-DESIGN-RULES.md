# Letter Body Component - Design Rules & Guidelines
## TicoVision CRM - Hebrew Letter Template System

---

## 📋 Overview
This document defines the complete design system for creating new body components in the TicoVision letter template system. All body components MUST follow these rules for consistency and compatibility.

---

## 🎨 Visual Design Rules

### Typography
- **Font Size**: 19px (primary content)
- **Line Height**: 1.6 (for readability)
- **Font Family**: 'Assistant', 'Heebo', Arial, sans-serif (Hebrew-first)
- **Font Weights**:
  - Regular text: 400
  - Emphasis: 600
  - Strong emphasis: 700

### Colors
- **Primary Text**: `#09090b` (hsl(222.2 84% 4.9%))
- **Secondary Text**: `#71717a` (hsl(215.4 16.3% 46.9%))
- **Emphasis Text**: `#2c3e50` (dark blue-gray)
- **Borders**: `#e4e4e7` (light gray)

### Spacing
- **Between sections**: `padding-top: 24px`
- **Within sections**: `margin-bottom: 8px` to `16px`
- **Around borders**: `margin-top: 20px` or `24px`

### Layout
- **Direction**: RTL (Right-to-Left) - **MANDATORY**
- **Text Alignment**: `text-align: right` - **ALWAYS**
- **Width**: 100% (responsive)
- **Container**: Table-based layout for email compatibility

---

## 🏗️ HTML Structure Rules

### File Structure
**Location**: `/templates/bodies/[body-name].html`
**Naming Convention**: `kebab-case.html` (e.g., `annual-fee.html`, `fee-real-change.html`)

### Required Structure
```html
<!-- BODY: Subject (Optional - if letter has subject line) -->
<tr>
    <td style="padding-top: 24px;">
        <div style="font-size: 19px; text-align: center;">
            [Subject text with {{variables}}]
        </div>
    </td>
</tr>

<!-- BODY: Section 1 -->
<tr>
    <td style="padding-top: 24px;">
        <div style="font-size: 19px; line-height: 1.6; color: #09090b; text-align: right;">
            [Opening paragraph text]
        </div>

        <!-- Bullet list (if needed) -->
        <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-top: 16px;">
            <tr>
                <td style="width: 20px; vertical-align: top; padding-top: 4px;">
                    <img src="cid:bullet_star" width="9" height="9" alt="•" style="display: block; border: 0;">
                </td>
                <td style="font-size: 19px; line-height: 1.6; color: #09090b; text-align: right; padding-bottom: 12px;">
                    [Bullet point text with {{variables}}]
                </td>
            </tr>
            <!-- Repeat for more bullet points -->
        </table>
    </td>
</tr>

<!-- BODY: Section 2 (if needed) -->
<tr>
    <td style="padding-top: 24px;">
        <div style="font-size: 19px; line-height: 1.6; color: #09090b; text-align: right;">
            [Second section text]
        </div>
    </td>
</tr>

<!-- Add more sections as needed -->
```

---

## 🔤 Variable Usage Rules

### Variable Format
- **Always use**: `{{variable_name}}` (double curly braces)
- **Never use**: `[variable_name]` or `{variable_name}` (old formats)

### Common Variables
```typescript
// Client Information
{{company_name}}        // Client company name
{{group_name}}          // Company group name
{{client_name}}         // Contact person name

// Date & Time
{{letter_date}}         // Auto-generated: "20.10.2025"
{{year}}                // Auto-generated: 2025
{{tax_year}}            // Auto-generated: 2026 (year + 1)

// Financial
{{amount_original}}     // Original fee amount
{{inflation_rate}}      // Percentage (e.g., "4")
{{adjustment_reason}}   // Reason for fee change

// Payment (handled by payment-section component)
{{amount_after_bank}}   // After 9% discount
{{amount_after_single}} // After 8% discount
{{num_checks}}          // 8 or 12
```

### Auto-Generated Variables
These are ALWAYS available - no need to provide:
- `{{letter_date}}`
- `{{year}}`
- `{{tax_year}}`

---

## 📐 Component Integration Rules

### Headers & Footers
- **Never include** header or footer in body files
- Body components are sandwiched between header and footer automatically
- Payment section is inserted automatically for fee-related letters

### Border & Separation
- **Top border**: Use `padding-top: 24px` on first `<tr>`
- **Between sections**: Use `padding-top: 24px` on `<td>`
- **No bottom border**: Footer/payment section handles this

### Images
- **Bullet points**: Use `cid:bullet_star` (embedded image)
- **Icons**: Must be embedded as CID attachments
- **Never use**: External URLs (emails block them)

---

## 📝 Content Writing Rules

### Hebrew Language
- **Primary language**: Hebrew (עברית)
- **Formal tone**: Professional, respectful
- **Gender-neutral**: Use inclusive language when possible

### Structure Guidelines
1. **Opening**: Polite greeting or context (1-2 sentences)
2. **Main content**: Clear explanation with bullet points
3. **Closing**: Call to action or next steps (optional)

### Bullet Points
- **Use bullet lists** for multiple points (2+ items)
- **Keep each point** to 1-3 lines
- **Use star bullets** (cid:bullet_star) for consistency

---

## 🎯 Template Types Reference

### Existing Body Components
1. **annual-fee.html** (A - חיצוניים - שינוי מדד בלבד)
   - Subject: Fee notification for new tax year
   - Variables: `company_name`, `year`, `inflation_rate`
   - Structure: 2 sections with bullet lists

### Future Body Components (To Be Created)
2. **B** - חיצוניים - שינוי ריאלי
3. **C** - חיצוניים - כמוסכם
4. **D1** - פנימי ראיית חשבון - שינוי מדד
5. **D2** - פנימי ראיית חשבון - שינוי ריאלי
6. **D3** - פנימי ראיית חשבון - כמוסכם
7. **E1** - ריטיינר - שינוי מדד
8. **E2** - ריטיינר - שינוי ריאלי
9. **F1** - פנימי הנהלת חשבונות - שינוי מדד
10. **F2** - פנימי הנהלת חשבונות - שינוי ריאלי
11. **F3** - פנימי הנהלת חשבונות - כמוסכם

---

## ✅ Pre-Flight Checklist

Before creating a new body component, verify:

- [ ] File name is `kebab-case.html`
- [ ] Located in `/templates/bodies/`
- [ ] All text is right-aligned (`text-align: right`)
- [ ] Font size is 19px for main content
- [ ] Line height is 1.6 for readability
- [ ] Variables use `{{variable}}` format
- [ ] Images use `cid:` attachments
- [ ] No header/footer code included
- [ ] No payment section code included
- [ ] Hebrew text is professional and formal
- [ ] Bullet points use star image
- [ ] Colors match design system
- [ ] Spacing follows 24px rule
- [ ] Tested with variable replacement
- [ ] Compatible with email clients

---

## 🚀 Request New Body Component

When requesting a new body component, provide:

1. **Template Type**: (B, C, D1, etc.)
2. **Hebrew Name**: Full name in Hebrew
3. **Subject Line**: What appears in email subject
4. **Content Structure**: Number of sections, bullet points
5. **Required Variables**: List of {{variables}} needed
6. **Special Requirements**: Any unique formatting or logic

**Example Request:**
```
Template Type: B - חיצוניים - שינוי ריאלי
Hebrew Name: מכתב גביית שכר טרחה - שינוי ריאלי
Subject: שכר טרחתנו לשנת המס {{year}} - עדכון ריאלי
Structure:
  - Opening paragraph (1)
  - Bullet list (3 points)
  - Closing paragraph (1)
Variables:
  - {{company_name}}
  - {{year}}
  - {{real_change_percentage}}
  - {{adjustment_reason}}
Special: Emphasize real change vs. inflation
```

---

## 📚 Reference Files

- **Example body**: `/templates/bodies/annual-fee.html`
- **Header component**: `/templates/components/header.html`
- **Footer component**: `/templates/components/footer.html`
- **Payment section**: `/templates/components/payment-section.html`
- **Complete example**: `/templates/letter-email-complete.html`

---

## 🔄 Version History

**v1.0** - 2025-10-20
- Initial design rules document
- Based on existing annual-fee.html component
- 4-component architecture (header, body, payment, footer)

---

**Last Updated**: 2025-10-20
**Document Owner**: Asaf Benatia
**System**: TicoVision CRM - Letter Template System
