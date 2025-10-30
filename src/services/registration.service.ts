import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types/user-role';
import { logger } from '@/lib/logger';

export interface RegistrationData {
  email: string;
  full_name: string;
  phone?: string;
  company_name?: string;
  requested_role: UserRole;
  tax_id?: string;
  message?: string;
  // NOTE: No password field - users set password via email link after approval
}

export interface PendingRegistration extends RegistrationData {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

export interface UserClientAssignment {
  id: string;
  user_id: string;
  client_id: string;
  tenant_id: string;
  assigned_by?: string;
  assigned_at: string;
  is_primary: boolean;
  notes?: string;
  client?: {
    company_name: string;
    company_name_hebrew?: string;
    tax_id: string;
  };
}

class RegistrationService {
  /**
   * Submit a new registration request
   */
  async submitRegistration(data: RegistrationData) {
    try {
      // No password hashing - users will set password via email link after approval
      const { data: registration, error } = await supabase
        .from('pending_registrations')
        .insert({
          email: data.email,
          full_name: data.full_name,
          phone: data.phone,
          company_name: data.company_name,
          requested_role: data.requested_role,
          tax_id: data.tax_id,
          message: data.message
          // password_hash removed for security - see migration 031
        })
        .select()
        .single();

      if (error) throw error;
      return { data: registration, error: null };
    } catch (error) {
      logger.error('Error submitting registration:', error);
      return { data: null, error };
    }
  }

  /**
   * Get all pending registrations (admin only)
   */
  async getPendingRegistrations() {
    try {
      const { data: registrations, error } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: registrations as PendingRegistration[], error: null };
    } catch (error) {
      logger.error('Error fetching pending registrations:', error);
      return { data: null, error };
    }
  }

  /**
   * Get all registrations with filters (admin only)
   */
  async getAllRegistrations(status?: 'pending' | 'approved' | 'rejected') {
    try {
      let query = supabase
        .from('pending_registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data: registrations, error } = await query;

      if (error) throw error;
      return { data: registrations as PendingRegistration[], error: null };
    } catch (error) {
      logger.error('Error fetching registrations:', error);
      return { data: null, error };
    }
  }

  /**
   * Get rejected registrations (admin only)
   */
  async getRejectedRegistrations() {
    return this.getAllRegistrations('rejected');
  }

  /**
   * Permanently delete a registration (allows user to re-register)
   */
  async deleteRegistration(registrationId: string) {
    try {
      const { error } = await supabase
        .from('pending_registrations')
        .delete()
        .eq('id', registrationId);

      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      logger.error('Error deleting registration:', error);
      return { data: null, error };
    }
  }

  /**
   * Approve a registration request and create user
   */
  async approveRegistration(
    registrationId: string,
    assignedClientIds?: string[]
  ) {
    try {
      // Get registration details
      const { data: registration, error: fetchError } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('id', registrationId)
        .single();

      if (fetchError) throw fetchError;
      if (!registration) throw new Error('Registration not found');

      // Get current tenant
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Not authenticated');

      const { data: tenantUser } = await supabase
        .from('user_tenant_access')
        .select('tenant_id')
        .eq('user_id', currentUser.id)
        .single();

      if (!tenantUser) throw new Error('Tenant not found');

      // Generate a secure random temporary password (will be reset immediately via email)
      const tempPassword = crypto.randomUUID() + Math.random().toString(36);

      // Create auth user with temporary password
      // Using v2 function to bypass PostgREST cache issue
      const { data: authData, error: authError } = await supabase
        .rpc('create_user_with_role_v2', {
          p_email: registration.email,
          p_password: tempPassword, // Temporary password - user will reset via email
          p_full_name: registration.full_name,
          p_phone: registration.phone || null,
          p_role: registration.requested_role,
          p_permissions: {}
        })
        .single();

      if (authError) throw authError;
      if (!authData) throw new Error('Failed to create user');

      // CRITICAL: Immediately send password reset email (secure invitation flow)
      // This ensures user sets their own password via secure token
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        registration.email,
        {
          redirectTo: `${window.location.origin}/set-password`
        }
      );

      if (resetError) {
        logger.error('Failed to send password reset email:', resetError);
        // Don't fail the approval - user was created successfully
        // Admin can manually resend password reset if needed
      }

      // If client role and tax_id provided, find and assign client
      if (registration.requested_role === 'client' && registration.tax_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('id')
          .eq('tax_id', registration.tax_id)
          .eq('tenant_id', tenantUser.tenant_id)
          .single();

        if (client) {
          assignedClientIds = [client.id];
        }
      }

      // Create client assignments if provided
      if (assignedClientIds && assignedClientIds.length > 0) {
        const assignments = assignedClientIds.map((clientId, index) => ({
          user_id: authData.user_id,
          client_id: clientId,
          tenant_id: tenantUser.tenant_id,
          assigned_by: currentUser.id,
          is_primary: index === 0 // First client is primary
        }));

        const { error: assignmentError } = await supabase
          .from('user_client_assignments')
          .insert(assignments);

        if (assignmentError) throw assignmentError;
      }

      // Update registration status
      const { error: updateError } = await supabase
        .from('pending_registrations')
        .update({
          status: 'approved',
          approved_by: currentUser.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', registrationId);

      if (updateError) throw updateError;

      return { data: { userId: authData.user_id }, error: null };
    } catch (error) {
      logger.error('Error approving registration:', error);
      return { data: null, error };
    }
  }

  /**
   * Reject a registration request
   */
  async rejectRegistration(registrationId: string, reason: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('pending_registrations')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', registrationId);

      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      logger.error('Error rejecting registration:', error);
      return { data: null, error };
    }
  }

  /**
   * Get user's client assignments
   */
  async getUserClientAssignments(userId: string) {
    try {
      const { data: assignments, error } = await supabase
        .from('user_client_assignments')
        .select(`
          *,
          client:clients(
            id,
            company_name,
            company_name_hebrew,
            tax_id
          )
        `)
        .eq('user_id', userId)
        .order('is_primary', { ascending: false });

      if (error) throw error;
      return { data: assignments as UserClientAssignment[], error: null };
    } catch (error) {
      logger.error('Error fetching user assignments:', error);
      return { data: null, error };
    }
  }

  /**
   * Assign clients to a user
   */
  async assignClientsToUser(
    userId: string,
    clientIds: string[],
    primaryClientId?: string
  ) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: tenantUser } = await supabase
        .from('user_tenant_access')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (!tenantUser) throw new Error('Tenant not found');

      // Remove existing assignments
      await supabase
        .from('user_client_assignments')
        .delete()
        .eq('user_id', userId);

      // Create new assignments
      const assignments = clientIds.map(clientId => ({
        user_id: userId,
        client_id: clientId,
        tenant_id: tenantUser.tenant_id,
        assigned_by: user.id,
        is_primary: clientId === primaryClientId
      }));

      const { error } = await supabase
        .from('user_client_assignments')
        .insert(assignments);

      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      logger.error('Error assigning clients:', error);
      return { data: null, error };
    }
  }

  /**
   * Remove client assignment from user
   */
  async removeClientAssignment(userId: string, clientId: string) {
    try {
      const { error } = await supabase
        .from('user_client_assignments')
        .delete()
        .eq('user_id', userId)
        .eq('client_id', clientId);

      if (error) throw error;
      return { data: true, error: null };
    } catch (error) {
      logger.error('Error removing assignment:', error);
      return { data: null, error };
    }
  }

  /**
   * Check if email is already registered or pending
   */
  async checkEmailAvailability(email: string) {
    try {
      // Check in pending registrations (all statuses due to unique constraint)
      // Note: Cannot check auth.users directly from client-side
      // Auth check will happen server-side during approval
      const { data: existing, error } = await supabase
        .from('pending_registrations')
        .select('id, status')
        .eq('email', email)
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned (which is OK)
        logger.error('Error checking email:', error);
        return { available: true }; // Allow registration on error
      }

      if (existing) {
        if (existing.status === 'pending') {
          return { available: false, reason: 'pending_registration' };
        } else if (existing.status === 'approved') {
          return { available: false, reason: 'already_registered' };
        } else {
          // status === 'rejected' - allow re-registration
          return { available: true };
        }
      }

      // If no existing registration found, allow it
      // Duplicate email check will happen during approval
      return { available: true };
    } catch (error) {
      // On any error, allow registration (server will validate)
      logger.error('Error in checkEmailAvailability:', error);
      return { available: true };
    }
  }
}

export const registrationService = new RegistrationService();