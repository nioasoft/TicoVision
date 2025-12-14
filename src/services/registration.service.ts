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
  password: string; // User's password - hashed server-side during registration
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
   * Password is hashed server-side via RPC for security
   */
  async submitRegistration(data: RegistrationData) {
    try {
      // Use RPC function to hash password server-side
      const { data: registrationId, error } = await supabase
        .rpc('submit_registration', {
          p_email: data.email,
          p_password: data.password,
          p_full_name: data.full_name,
          p_phone: data.phone || null,
          p_company_name: data.company_name || null,
          p_requested_role: data.requested_role,
          p_tax_id: data.tax_id || null,
          p_message: data.message || null
        });

      if (error) throw error;
      return { data: { id: registrationId }, error: null };
    } catch (error) {
      logger.error('Error submitting registration:', error);
      return { data: null, error };
    }
  }

  /**
   * Get all pending registrations (admin only)
   * @param silent - If true, suppress error logging (useful for background polling)
   */
  async getPendingRegistrations(silent = false) {
    try {
      const { data: registrations, error } = await supabase
        .from('pending_registrations')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: registrations as PendingRegistration[], error: null };
    } catch (error) {
      // Only log errors if not in silent mode (to reduce console noise during polling)
      if (!silent) {
        logger.error('Error fetching pending registrations:', error);
      }
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
   * @param registrationId - ID of the pending registration
   * @param role - Role to assign (overrides requested_role if provided)
   * @param assignedClientIds - Optional client IDs to assign to the user
   */
  async approveRegistration(
    registrationId: string,
    role?: UserRole,
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

      const roleToAssign = role || registration.requested_role;
      let authData;

      // Check if user provided password during registration
      if (registration.password_hash) {
        // NEW FLOW: Use stored password hash - user can log in immediately
        const { data, error: authError } = await supabase
          .rpc('create_user_with_role_v3', {
            p_email: registration.email,
            p_password_hash: registration.password_hash,
            p_full_name: registration.full_name,
            p_phone: registration.phone || null,
            p_role: roleToAssign,
            p_permissions: {}
          })
          .single();

        if (authError) throw authError;
        if (!data) throw new Error('Failed to create user');
        authData = data;

        // Send simple confirmation email (no password reset needed)
        await this.sendApprovalConfirmationEmail(registration.email, registration.full_name);

        // Clear password hash after user creation for security
        await supabase
          .from('pending_registrations')
          .update({ password_hash: null })
          .eq('id', registrationId);

      } else {
        // LEGACY FLOW: No password stored - use temp password + reset email
        const tempPassword = crypto.randomUUID() + Math.random().toString(36);

        const { data, error: authError } = await supabase
          .rpc('create_user_with_role_v2', {
            p_email: registration.email,
            p_password: tempPassword,
            p_full_name: registration.full_name,
            p_phone: registration.phone || null,
            p_role: roleToAssign,
            p_permissions: {}
          })
          .single();

        if (authError) throw authError;
        if (!data) throw new Error('Failed to create user');
        authData = data;

        // Send password reset email
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          registration.email,
          { redirectTo: `${window.location.origin}/set-password` }
        );

        if (resetError) {
          logger.error('Failed to send password reset email:', resetError);
        }
      }

      // If client role and tax_id provided, find and assign client
      if (roleToAssign === 'client' && registration.tax_id) {
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
          is_primary: index === 0
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
   * Send approval confirmation email (no password reset link)
   * Called when user already set their password during registration
   */
  private async sendApprovalConfirmationEmail(email: string, fullName: string): Promise<void> {
    try {
      // Use production URL, not window.location.origin (which could be localhost)
      const loginUrl = 'https://ticovision.vercel.app/login';
      const { data: sessionData } = await supabase.auth.getSession();

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-letter`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session?.access_token}`
          },
          body: JSON.stringify({
            recipientEmails: [email],
            recipientName: fullName,
            subject: 'ההרשמה שלך אושרה - TicoVision',
            customText: `שלום ${fullName},

בקשת ההרשמה שלך אושרה בהצלחה!

כעת ניתן להתחבר למערכת עם הסיסמה שבחרת בעת ההרשמה.

לחץ כאן לכניסה: ${loginUrl}

בברכה,
צוות TicoVision`,
            simpleMode: true, // Use simple email mode - no letter template
            includesPayment: false
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('Failed to send approval email:', errorData);
      } else {
        logger.info('Approval confirmation email sent to:', email);
      }
    } catch (error) {
      // Don't throw - email failure shouldn't block approval
      logger.error('Failed to send approval confirmation email:', error);
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
   * Uses secure RPC function that doesn't expose table data
   */
  async checkEmailAvailability(email: string) {
    try {
      // Use RPC function for secure email check (doesn't expose password_hash)
      const { data, error } = await supabase
        .rpc('check_email_availability', { p_email: email });

      if (error) {
        logger.error('Error checking email:', error);
        return { available: true }; // Allow registration on error, server will validate
      }

      return {
        available: data?.available ?? true,
        reason: data?.reason || undefined
      };
    } catch (error) {
      // On any error, allow registration (server will validate)
      logger.error('Error in checkEmailAvailability:', error);
      return { available: true };
    }
  }
}

export const registrationService = new RegistrationService();