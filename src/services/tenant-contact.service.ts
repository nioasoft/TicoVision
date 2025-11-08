/**
 * Tenant Contact Service
 * Manages shared contact pool and client-contact assignments
 */

import { supabase } from '../lib/supabase';
import type {
  TenantContact,
  ClientContactAssignment,
  AssignedContact,
  ContactSearchResult,
  CreateTenantContactDto,
  UpdateTenantContactDto,
  AssignContactToClientDto,
  UpdateAssignmentDto,
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
      const { data, error } = await supabase.rpc('search_tenant_contacts', {
        search_query: query,
        max_results: limit,
      });

      console.log('📡 RPC response:', { data, error });

      if (error) {
        console.error('❌ RPC error:', error);
        throw error;
      }

      // Filter by contact_type if provided
      if (contact_type && data) {
        const filtered = data.filter((c: ContactSearchResult) => c.contact_type === contact_type);
        console.log('✅ Filtered results:', filtered.length, 'contacts');
        return filtered;
      }

      console.log('✅ Unfiltered results:', data?.length || 0, 'contacts');
      return data || [];
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
      // Try to find existing by email
      if (contactData.email) {
        const existing = await this.findByEmail(contactData.email);
        if (existing) {
          console.log('Found existing contact by email:', existing.full_name);
          return existing;
        }
      }

      // Try to find existing by phone
      if (contactData.phone) {
        const existing = await this.findByPhone(contactData.phone);
        if (existing) {
          console.log('Found existing contact by phone:', existing.full_name);
          return existing;
        }
      }

      // Create new contact
      const { data: newContact, error } = await supabase
        .from('tenant_contacts')
        .insert([contactData])
        .select()
        .single();

      if (error) throw error;

      console.log('Created new contact:', newContact.full_name);
      return newContact;
    } catch (error) {
      console.error('Error creating/getting contact:', error);
      return null;
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
   */
  static async assignToClient(
    assignmentData: AssignContactToClientDto
  ): Promise<ClientContactAssignment | null> {
    try {
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

      return contacts
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
}

export default TenantContactService;
