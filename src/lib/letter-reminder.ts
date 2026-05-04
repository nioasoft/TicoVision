/**
 * Transform an original letter HTML into a "reminder" version:
 *  - Replaces the letter date in the header ("תל אביב | DD/MM/YYYY") with today's date.
 *  - Injects a red "תזכורת" banner above the subject ("הנדון:") row.
 *
 * Pure string transformation — used by both the client preview dialog and the
 * send-batch-reminders Edge Function so the email matches what the user sees.
 */
export function buildReminderHtml(originalHtml: string, today: Date = new Date()): string {
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  const todayStr = `${dd}/${mm}/${yyyy}`;

  let result = originalHtml.replace(
    /(תל אביב\s*\|\s*)\d{1,2}\/\d{1,2}\/\d{4}/g,
    `$1${todayStr}`
  );

  const reminderBannerRow = `<tr><td style="padding-top: 16px;"><div style="font-family: 'David Libre', 'Heebo', 'Assistant', sans-serif; font-size: 22px; font-weight: 700; color: #dc2626; text-align: right; padding: 10px 14px; border: 2px solid #dc2626; background-color: #fef2f2; border-radius: 4px;">תזכורת — הואלו נא לטפל בהקדם</div></td></tr>`;

  const subjectIdx = result.indexOf('הנדון:');
  if (subjectIdx > -1) {
    const trIdx = result.lastIndexOf('<tr', subjectIdx);
    if (trIdx > -1) {
      return result.slice(0, trIdx) + reminderBannerRow + result.slice(trIdx);
    }
  }

  const fallbackBanner = `<div style="font-family: Arial, sans-serif; font-size: 22px; font-weight: 700; color: #dc2626; text-align: right; padding: 10px 14px; margin: 12px; border: 2px solid #dc2626; background-color: #fef2f2;">תזכורת — הואלו נא לטפל בהקדם</div>`;
  const bodyMatch = result.match(/<body[^>]*>/i);
  if (bodyMatch && bodyMatch.index !== undefined) {
    const insertAt = bodyMatch.index + bodyMatch[0].length;
    return result.slice(0, insertAt) + fallbackBanner + result.slice(insertAt);
  }
  return fallbackBanner + result;
}
