/**
 * Protocol Management Types
 * Types for meeting protocols with attendees, decisions, and content sections
 */

// ============================================================================
// Protocol Status
// ============================================================================

export type ProtocolStatus = 'draft' | 'locked';

// ============================================================================
// Attendee Types
// ============================================================================

export type AttendeeSourceType = 'contact' | 'employee' | 'external';

export interface ProtocolAttendee {
  id: string;
  protocol_id: string;
  source_type: AttendeeSourceType;
  contact_id: string | null;
  user_id: string | null;
  display_name: string;
  role_title: string | null;
  created_at: string;
}

export interface CreateAttendeeDto {
  source_type: AttendeeSourceType;
  contact_id?: string | null;
  user_id?: string | null;
  display_name: string;
  role_title?: string | null;
}

// ============================================================================
// Decision Types
// ============================================================================

export type DecisionUrgency = 'normal' | 'urgent';

export type ResponsibilityType = 'office' | 'client' | 'bookkeeper' | 'other';

export interface ProtocolDecision {
  id: string;
  protocol_id: string;
  content: string;
  urgency: DecisionUrgency;
  responsibility_type: ResponsibilityType;
  assigned_employee_id: string | null;
  assigned_other_name: string | null;
  audit_report_year: number | null;
  sort_order: number;
  created_at: string;
}

export interface CreateDecisionDto {
  content: string;
  urgency?: DecisionUrgency;
  responsibility_type: ResponsibilityType;
  assigned_employee_id?: string | null;
  assigned_other_name?: string | null;
  audit_report_year?: number | null;
  sort_order?: number;
}

export interface UpdateDecisionDto extends Partial<CreateDecisionDto> {
  id: string;
}

// ============================================================================
// Content Section Types
// ============================================================================

export type ContentSectionType = 'announcement' | 'background_story' | 'recommendation';

export interface ProtocolContentSection {
  id: string;
  protocol_id: string;
  section_type: ContentSectionType;
  content: string;
  sort_order: number;
  created_at: string;
}

export interface CreateContentSectionDto {
  section_type: ContentSectionType;
  content: string;
  sort_order?: number;
}

export interface UpdateContentSectionDto extends Partial<CreateContentSectionDto> {
  id: string;
}

// ============================================================================
// Protocol Types
// ============================================================================

export interface Protocol {
  id: string;
  tenant_id: string;
  client_id: string | null;
  group_id: string | null;
  meeting_date: string;
  title: string | null;
  status: ProtocolStatus;
  locked_at: string | null;
  locked_by: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ProtocolWithRelations extends Protocol {
  client?: {
    id: string;
    company_name: string;
    company_name_hebrew: string | null;
  } | null;
  group?: {
    id: string;
    group_name_hebrew: string | null;
  } | null;
  attendees: ProtocolAttendee[];
  decisions: ProtocolDecision[];
  content_sections: ProtocolContentSection[];
}

export interface CreateProtocolDto {
  client_id?: string | null;
  group_id?: string | null;
  meeting_date: string;
  title?: string | null;
}

export interface UpdateProtocolDto {
  meeting_date?: string;
  title?: string | null;
}

// ============================================================================
// UI Types
// ============================================================================

/**
 * Form state for the protocol builder
 */
export interface ProtocolFormState {
  meeting_date: string;
  title: string;
  attendees: CreateAttendeeDto[];
  decisions: CreateDecisionDto[];
  content_sections: CreateContentSectionDto[];
}

/**
 * Responsibility type display info
 */
export interface ResponsibilityTypeInfo {
  type: ResponsibilityType;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/**
 * Content section type display info
 */
export interface ContentSectionTypeInfo {
  type: ContentSectionType;
  label: string;
  labelPlural: string;
  icon: string;
}

// ============================================================================
// Constants
// ============================================================================

export const RESPONSIBILITY_TYPES: ResponsibilityTypeInfo[] = [
  {
    type: 'office',
    label: 'אחריות משרד רואי חשבון',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  {
    type: 'client',
    label: 'אחריות לקוח',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  {
    type: 'bookkeeper',
    label: 'אחריות מנהלת חשבונות',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  {
    type: 'other',
    label: 'אחריות אחר',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
];

export const CONTENT_SECTION_TYPES: ContentSectionTypeInfo[] = [
  {
    type: 'announcement',
    label: 'הכרזה',
    labelPlural: 'הכרזות',
    icon: 'megaphone',
  },
  {
    type: 'background_story',
    label: 'סיפור רקע',
    labelPlural: 'סיפורי רקע',
    icon: 'book-open',
  },
  {
    type: 'recommendation',
    label: 'המלצה',
    labelPlural: 'המלצות',
    icon: 'lightbulb',
  },
];

/**
 * Get responsibility type info
 */
export function getResponsibilityTypeInfo(type: ResponsibilityType): ResponsibilityTypeInfo {
  return RESPONSIBILITY_TYPES.find(r => r.type === type) || RESPONSIBILITY_TYPES[3];
}

/**
 * Get content section type info
 */
export function getContentSectionTypeInfo(type: ContentSectionType): ContentSectionTypeInfo {
  return CONTENT_SECTION_TYPES.find(s => s.type === type) || CONTENT_SECTION_TYPES[0];
}
