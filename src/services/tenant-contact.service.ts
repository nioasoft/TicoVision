/**
 * Tenant Contact Service
 * Manages shared contact pool and client-contact assignments
 */

import { supabase, getCurrentTenantId } from '../lib/supabase';
import type {
  TenantContact,
  ClientContactAssignment,
  GroupContactAssignment,
  AssignedContact,
  AssignedGroupContact,
  ContactSearchResult,
  CreateTenantContactDto,
  UpdateTenantContactDto,
  AssignContactToClientDto,
  AssignContactToGroupDto,
  UpdateAssignmentDto,
  UpdateGroupAssignmentDto,
  ContactSearchParams,
} from '../types/tenant-contact.types';

export class TenantContactService {
  /**
   * Search contacts (autocomplete)
   * Uses database function for optimized search with Hebrew support
   */
  static async searchContacts(
    params: ContactSearchParams
  ): Promise<ContactSearchResult[]> {
    const { query, contact_type, limit = 10 } = params;

    console.log('🔍 searchContacts called:', { query, contact_type, limit });

    try {
      // Get tenant_id for the new function signature (Migration 116)
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        console.warn('⚠️ No tenant_id available for contact search');
        return [];
      }

      const { data, error } = await supabase.rpc('search_tenant_contacts', {
        p_tenant_id: tenantId,
        p_search_term: query,
      });

      console.log('📡 RPC response:', { data, error });

      if (error) {
        console.error('❌ RPC error:', error);
        throw error;
      }

      let results = data || [];

      // Filter by contact_type if provided
      if (contact_type) {
        results = results.filter((c: ContactSearchResult) => c.contact_type === contact_type);
      }

      // Apply limit (since DB function no longer has max_results param)
      results = results.slice(0, limit);

      console.log('✅ Results:', results.length, 'contacts');
      return results;
    } catch (error) {
      console.error('💥 Error searching contacts:', error);
      return [];
    }
  }

  /**
   * Find contact by email (exact match, case-insensitive)
   */
  static async findByEmail(email: string): Promise<TenantContact | null> {
    try {
      const { data: contactId, error } = await supabase.rpc('find_contact_by_email', {
        contact_email: email,
      });

      if (error || !contactId) return null;

      // Fetch full contact details
      const { data: contact } = await supabase
        .from('tenant_contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      return contact;
    } catch (error) {
      console.error('Error finding contact by email:', error);
      return null;
    }
  }

  /**
   * Find contact by phone (exact match)
   */
  static async findByPhone(phone: string): Promise<TenantContact | null> {
    try {
      const { data: contactId, error } = await supabase.rpc('find_contact_by_phone', {
        contact_phone: phone,
      });

      if (error || !contactId) return null;

      // Fetch full contact details
      const { data: contact } = await supabase
        .from('tenant_contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      return contact;
    } catch (error) {
      console.error('Error finding contact by phone:', error);
      return null;
    }
  }

  /**
   * Create new contact OR return existing if found by email/phone
   */
  static async createOrGet(
    contactData: CreateTenantContactDto
  ): Promise<TenantContact | null> {
    try {
      // Get tenant_id from current session
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        console.error('❌ Cannot create contact: No tenant_id in session');
        throw new Error('No tenant_id found in session');
      }

      // Try to find existing by email
      if (contactData.email) {
        const existing = await this.findByEmail(contactData.email);
        if (existing) {
          console.log('✅ Found existing contact by email:', existing.full_name);
          return existing;
        }
      }

      // Try to find existing by phone
      if (contactData.phone) {
        const existing = await this.findByPhone(contactData.phone);
        if (existing) {
          console.log('✅ Found existing contact by phone:', existing.full_name);
          return existing;
        }
      }

      // Create new contact with tenant_id
      const contactWithTenant = {
        ...contactData,
        tenant_id: tenantId,
      };

      console.log('📝 Creating new contact:', {
        name: contactWithTenant.full_name,
        email: contactWithTenant.email,
        tenant_id: tenantId,
      });

      const { data: newContact, error } = await supabase
        .from('tenant_contacts')
        .insert([contactWithTenant])
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to insert contact:', error);
        throw error;
      }

      console.log('✅ Created new contact:', newContact.full_name);
      return newContact;
    } catch (error) {
      console.error('💥 Error in createOrGet:', error);
      // Re-throw instead of returning null for better error tracking
      throw error;
    }
  }

  /**
   * Update existing contact
   */
  static async update(
    contactId: string,
    updates: UpdateTenantContactDto
  ): Promise<TenantContact | null> {
    try {
      const { data, error } = await supabase
        .from('tenant_contacts')
        .update(updates)
        .eq('id', contactId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error updating contact:', error);
      return null;
    }
  }

  /**
   * Delete contact (only if not assigned to any clients)
   */
  static async delete(contactId: string): Promise<boolean> {
    try {
      // Check if contact is assigned to any clients
      const { data: assignments } = await supabase
        .from('client_contact_assignments')
        .select('id')
        .eq('contact_id', contactId)
        .limit(1);

      if (assignments && assignments.length > 0) {
        console.warn('Cannot delete contact - still assigned to clients');
        return false;
      }

      // Safe to delete
      const { error } = await supabase
        .from('tenant_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error deleting contact:', error);
      return false;
    }
  }

  /**
   * Assign contact to client (create assignment)
   * Checks for existing assignment first to prevent 409 duplicates
   */
  static async assignToClient(
    assignmentData: AssignContactToClientDto
  ): Promise<ClientContactAssignment | null> {
    try {
      // Check if this contact is already assigned to this client
      const { data: existing, error: checkError } = await supabase
        .from('client_contact_assignments')
        .select('*')
        .eq('client_id', assignmentData.client_id)
        .eq('contact_id', assignmentData.contact_id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing assignment:', checkError);
        throw checkError;
      }

      // If already assigned, return existing assignment (skip duplicate)
      if (existing) {
        console.warn('⚠️ Contact already assigned to this client. Skipping duplicate assignment.', {
          client_id: assignmentData.client_id,
          contact_id: assignmentData.contact_id,
          existing_role: existing.role_at_client,
          attempted_role: assignmentData.role_at_client,
        });
        return existing;
      }

      // Create new assignment
      const { data, error } = await supabase
        .from('client_contact_assignments')
        .insert([
          {
            client_id: assignmentData.client_id,
            contact_id: assignmentData.contact_id,
            is_primary: assignmentData.is_primary ?? false,
            email_preference: assignmentData.email_preference ?? 'all',
            role_at_client: assignmentData.role_at_client,
            notes: assignmentData.notes,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error assigning contact to client:', error);
      return null;
    }
  }

  /**
   * Update assignment (e.g., set as primary, change email preference)
   */
  static async updateAssignment(
    assignmentId: string,
    updates: UpdateAssignmentDto
  ): Promise<ClientContactAssignment | null> {
    try {
      const { data, error } = await supabase
        .from('client_contact_assignments')
        .update(updates)
        .eq('id', assignmentId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error updating assignment:', error);
      return null;
    }
  }

  /**
   * Remove contact from client (delete assignment)
   */
  static async unassignFromClient(assignmentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('client_contact_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error unassigning contact from client:', error);
      return false;
    }
  }

  /**
   * Get all contacts assigned to a client (with full details)
   */
  static async getClientContacts(clientId: string): Promise<AssignedContact[]> {
    try {
      const { data, error } = await supabase.rpc('get_client_contacts_detailed', {
        p_client_id: clientId,
      });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting client contacts:', error);
      return [];
    }
  }

  /**
   * Get all email addresses for a client based on letter importance
   *
   * This is the SINGLE centralized function for retrieving contact emails.
   * Everyone should use this instead of manually filtering contacts!
   *
   * @param clientId - Client ID
   * @param letterType - 'important' for fee letters (sends to 'all' + 'important_only')
   *                     'all' for general letters (sends only to 'all')
   * @returns Array of email addresses ready to send
   *
   * @example
   * // For fee letters (שכר טרחה):
   * const emails = await TenantContactService.getClientEmails(clientId, 'important');
   *
   * // For general letters:
   * const emails = await TenantContactService.getClientEmails(clientId, 'all');
   */
  static async getClientEmails(
    clientId: string,
    letterType: 'important' | 'all' = 'all'
  ): Promise<string[]> {
    try {
      const contacts = await this.getClientContacts(clientId);

      const emails = contacts
        .filter(contact => {
          // Must have email
          if (!contact.email) return false;

          // Fee letters (important) = send to 'all' OR 'important_only'
          if (letterType === 'important') {
            return (
              contact.email_preference === 'all' ||
              contact.email_preference === 'important_only'
            );
          }

          // General letters = send only to 'all'
          return contact.email_preference === 'all';
        })
        .map(contact => contact.email!);

      // FALLBACK: If no contacts found in the new system, get email from client directly
      if (emails.length === 0) {
        const { data: client, error } = await supabase
          .from('clients')
          .select('contact_email')
          .eq('id', clientId)
          .single();

        if (!error && client?.contact_email) {
          console.log('📧 Using fallback email from client.contact_email:', client.contact_email);
          return [client.contact_email];
        }
      }

      return emails;
    } catch (error) {
      console.error('Error getting client emails:', error);
      return [];
    }
  }

  /**
   * Get all clients this contact is assigned to
   */
  static async getContactClients(contactId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('client_contact_assignments')
        .select(`
          *,
          client:clients(id, company_name, company_name_hebrew)
        `)
        .eq('contact_id', contactId);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting contact clients:', error);
      return [];
    }
  }

  /**
   * Set contact as primary for a client
   */
  static async setPrimary(assignmentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('client_contact_assignments')
        .update({ is_primary: true })
        .eq('id', assignmentId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error setting primary contact:', error);
      return false;
    }
  }

  // ============================================
  // GROUP CONTACT MANAGEMENT
  // ============================================

  /**
   * Get all contacts assigned to a group (with full details)
   */
  static async getGroupContacts(groupId: string): Promise<AssignedGroupContact[]> {
    try {
      const { data, error } = await supabase.rpc('get_group_contacts_detailed', {
        p_group_id: groupId,
      });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting group contacts:', error);
      return [];
    }
  }

  /**
   * Assign contact to group (create assignment)
   * Checks for existing assignment first to prevent duplicates
   */
  static async assignToGroup(
    assignmentData: AssignContactToGroupDto
  ): Promise<GroupContactAssignment | null> {
    try {
      // Check if this contact is already assigned to this group
      const { data: existing, error: checkError } = await supabase
        .from('group_contact_assignments')
        .select('*')
        .eq('group_id', assignmentData.group_id)
        .eq('contact_id', assignmentData.contact_id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing assignment:', checkError);
        throw checkError;
      }

      // If already assigned, return existing assignment (skip duplicate)
      if (existing) {
        console.warn('⚠️ Contact already assigned to this group. Skipping duplicate assignment.', {
          group_id: assignmentData.group_id,
          contact_id: assignmentData.contact_id,
        });
        return existing;
      }

      // Create new assignment
      const { data, error } = await supabase
        .from('group_contact_assignments')
        .insert([
          {
            group_id: assignmentData.group_id,
            contact_id: assignmentData.contact_id,
            is_primary: assignmentData.is_primary ?? false,
            notes: assignmentData.notes,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error assigning contact to group:', error);
      return null;
    }
  }

  /**
   * Update group assignment (e.g., set as primary, change notes)
   */
  static async updateGroupAssignment(
    assignmentId: string,
    updates: UpdateGroupAssignmentDto
  ): Promise<GroupContactAssignment | null> {
    try {
      const { data, error } = await supabase
        .from('group_contact_assignments')
        .update(updates)
        .eq('id', assignmentId)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error updating group assignment:', error);
      return null;
    }
  }

  /**
   * Remove contact from group (delete assignment)
   */
  static async unassignFromGroup(assignmentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('group_contact_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error unassigning contact from group:', error);
      return false;
    }
  }

  /**
   * Set contact as primary owner for a group
   */
  static async setGroupPrimary(assignmentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('group_contact_assignments')
        .update({ is_primary: true })
        .eq('id', assignmentId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error setting primary group contact:', error);
      return false;
    }
  }
}

export default TenantContactService;
