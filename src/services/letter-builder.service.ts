/**
 * Letter Builder Service
 * Combines header + body + footer into complete HTML email
 */

import { formatLetterDate } from '@/modules/letters/utils/date-formatter';

interface LetterVariables {
  // Header variables
  letter_date?: string;
  company_name: string;
  group_name?: string;

  // Body variables (example for annual fee letter)
  year?: string;
  inflation_rate?: string;

  // Footer payment variables
  payment_link_single: string;
  amount_single: string;
  discount_single: string;
  payment_link_4_payments: string;
  amount_4_payments: string;
  discount_4_payments: string;
  amount_bank: string;
  amount_checks: string;
  client_id: string;
}

/**
 * Build complete letter HTML from header + body + footer templates
 */
export async function buildLetterHtml(
  headerPath: string,
  bodyPath: string,
  footerPath: string,
  variables: LetterVariables
): Promise<string> {
  try {
    // Read template files
    const headerHtml = await fetch(headerPath).then((r) => r.text());
    const bodyHtml = await fetch(bodyPath).then((r) => r.text());
    const footerHtml = await fetch(footerPath).then((r) => r.text());

    // Auto-generate date and year if not provided
    const letterDate = variables.letter_date || formatLetterDate();
    const currentYear = variables.year || new Date().getFullYear().toString();

    // Combine all templates
    const fullHtml = `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>מכתב - ${variables.company_name}</title>
    <style>
        body {
            font-family: 'Assistant', 'Heebo', Arial, sans-serif;
            background-color: #ffffff;
            margin: 0;
            padding: 0;
            direction: rtl;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        ${headerHtml}
        ${bodyHtml}
        ${footerHtml}
    </div>
</body>
</html>
    `;

    // Replace all variables
    return replaceVariables(fullHtml, {
      ...variables,
      letter_date: letterDate,
      year: currentYear,
    });
  } catch (error) {
    console.error('❌ Failed to build letter HTML:', error);
    throw error;
  }
}

/**
 * Replace all {{variable}} placeholders with actual values
 */
function replaceVariables(html: string, variables: Record<string, string>): string {
  let result = html;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  }

  return result;
}

/**
 * Build letter from template files in public/templates folder
 */
export async function buildLetterFromTemplates(
  bodyFileName: string,
  variables: LetterVariables
): Promise<string> {
  const baseUrl = window.location.origin;

  return buildLetterHtml(
    `${baseUrl}/templates/letter-header.html`,
    `${baseUrl}/templates/${bodyFileName}`,
    `${baseUrl}/templates/letter-footer.html`,
    variables
  );
}
