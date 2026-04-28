/**
 * Yael Software Systems Approvals - Type Definitions
 * אישורים לחברת יעל מערכות תוכנה
 *
 * Currently supports a single letter type: CPA National Insurance Approval
 * (אישור רו"ח - דוח תקורות שוטף לביטוח לאומי)
 */

export const YAEL_DEFAULT_RECIPIENT = 'יעל מערכות תוכנה בע"מ';

export const YAEL_CPA_APPROVAL_DEFAULT_SUBJECT =
  'דוח תקורות שוטף לגבי כלל נותני השירותים בביטוח לאומי';

export interface YaelCpaApprovalVariables {
  /** Document creation date (ISO YYYY-MM-DD) - shown in header */
  document_date: string;
  /** Recipient company name shown in "לכבוד" section */
  recipient_name: string;
  /** Period end date (ISO YYYY-MM-DD) - "לשנה שנסתיימה ביום..." */
  period_end_date: string;
}

export function validateYaelCpaApproval(data: Partial<YaelCpaApprovalVariables>): boolean {
  return !!(
    data.document_date &&
    data.recipient_name?.trim() &&
    data.period_end_date
  );
}

export function createInitialYaelFormState(): YaelCpaApprovalVariables {
  return {
    document_date: new Date().toISOString().split('T')[0],
    recipient_name: YAEL_DEFAULT_RECIPIENT,
    period_end_date: '',
  };
}
