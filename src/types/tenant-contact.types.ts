/**
 * Shared Contacts System Types
 * Multi-tenant contact pool with many-to-many client assignments
 */

import type { ContactType } from '../services/client.service';

// ============================================
// CORE TYPES
// ============================================

export interface TenantContact {
  id: string;
  tenant_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  contact_type: ContactType;
  job_title: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ClientContactAssignment {
  id: string;
  client_id: string;
  contact_id: string;
  is_primary: boolean;
  email_preference: EmailPreference;
  role_at_client: string | null; // Specific role at THIS client
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface GroupContactAssignment {
  id: string;
  group_id: string;
  contact_id: string;
  is_primary: boolean; // Primary controlling owner
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// ============================================
// JOINED/ENRICHED TYPES
// ============================================

export interface AssignedContact extends TenantContact {
  assignment_id: string;
  is_primary: boolean;
  email_preference: EmailPreference;
  role_at_client: string | null;
  assignment_notes: string | null;
  other_clients_count: number; // How many OTHER clients share this contact
}

export interface AssignedGroupContact extends TenantContact {
  assignment_id: string;
  is_primary: boolean; // Primary controlling owner
  assignment_notes: string | null;
  other_groups_count: number; // How many OTHER groups share this contact
}

export interface ContactSearchResult extends TenantContact {
  client_count: number; // Total clients this contact is assigned to
  highlight?: string; // Matched search term for highlighting
}

// ============================================
// ENUMS & CONSTANTS
// ============================================

export type EmailPreference = 'all' | 'important_only' | 'none';

export const EMAIL_PREFERENCE_LABELS: Record<EmailPreference, string> = {
  all: 'כל המיילים',
  important_only: 'חשובים בלבד',
  none: 'ללא מיילים',
};

// ============================================
// DTOS (Data Transfer Objects)
// ============================================

export interface CreateTenantContactDto {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  contact_type: ContactType;
  job_title?: string | null;
  notes?: string | null;
}

export interface UpdateTenantContactDto {
  full_name?: string;
  email?: string | null;
  phone?: string | null;
  contact_type?: ContactType;
  job_title?: string | null;
  notes?: string | null;
}

export interface AssignContactToClientDto {
  client_id: string;
  contact_id: string;
  is_primary?: boolean;
  email_preference?: EmailPreference;
  role_at_client?: string | null;
  notes?: string | null;
}

export interface UpdateAssignmentDto {
  is_primary?: boolean;
  email_preference?: EmailPreference;
  role_at_client?: string | null;
  notes?: string | null;
}

export interface AssignContactToGroupDto {
  group_id: string;
  contact_id: string;
  is_primary?: boolean;
  notes?: string | null;
}

export interface UpdateGroupAssignmentDto {
  is_primary?: boolean;
  notes?: string | null;
}

// ============================================
// SEARCH & FILTER
// ============================================

export interface ContactSearchParams {
  query: string;
  contact_type?: ContactType;
  limit?: number;
}

export interface ContactFilters {
  contact_type?: ContactType;
  has_email?: boolean;
  has_phone?: boolean;
  min_clients?: number; // Filter by how many clients share this contact
}

// ============================================
// MIGRATION & STATS
// ============================================

export interface MigrationResult {
  tenant_id: string;
  original_count: number;
  unique_contacts_created: number;
  assignments_created: number;
  duplicates_merged: number;
}

export interface ContactStats {
  total_contacts: number;
  total_assignments: number;
  shared_contacts: number; // Contacts assigned to 2+ clients
  most_shared_contact: {
    contact_id: string;
    full_name: string;
    client_count: number;
  } | null;
}
