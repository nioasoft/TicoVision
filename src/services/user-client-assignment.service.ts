/**
 * User-Client Assignment Service
 * Manages which clients are assigned to which users (primarily for bookkeepers)
 */

import { BaseService, type ServiceResponse } from './base.service';
import { supabase } from '@/lib/supabase';

export interface UserClientAssignment {
  id: string;
  user_id: string;
  client_id: string;
  tenant_id: string;
  assigned_by: string | null;
  assigned_at: string;
  is_primary: boolean;
  notes: string | null;
}

export interface AssignedClient {
  client_id: string;
  client_name: string;
  tax_id: string;
  assignment_id: string;
  assigned_at: string;
  is_primary: boolean;
}

export interface AssignableClient {
  id: string;
  company_name: string;
  tax_id: string;
  is_assigned: boolean;
}

class UserClientAssignmentService extends BaseService {
  constructor() {
    super('user_client_assignments');
  }

  /**
   * Get all clients assigned to a specific user
   */
  async getAssignedClients(userId: string): Promise<ServiceResponse<AssignedClient[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('user_client_assignments')
        .select(`
          id,
          client_id,
          assigned_at,
          is_primary,
          clients!inner(
            company_name,
            tax_id
          )
        `)
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      const assignedClients: AssignedClient[] = (data || []).map((item: Record<string, unknown>) => ({
        client_id: item.client_id as string,
        client_name: (item.clients as Record<string, string>)?.company_name || '',
        tax_id: (item.clients as Record<string, string>)?.tax_id || '',
        assignment_id: item.id as string,
        assigned_at: item.assigned_at as string,
        is_primary: item.is_primary as boolean,
      }));

      return { data: assignedClients, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get list of all clients with assignment status for a user
   * Used in admin UI to show checkboxes
   */
  async getClientsWithAssignmentStatus(userId: string): Promise<ServiceResponse<AssignableClient[]>> {
    try {
      const tenantId = await this.getTenantId();

      // Get all clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, company_name, tax_id')
        .eq('tenant_id', tenantId)
        .order('company_name');

      if (clientsError) throw clientsError;

      // Get assigned client IDs for this user
      const { data: assignments, error: assignmentsError } = await supabase
        .from('user_client_assignments')
        .select('client_id')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (assignmentsError) throw assignmentsError;

      const assignedIds = new Set((assignments || []).map(a => a.client_id));

      const result: AssignableClient[] = (clients || []).map(client => ({
        id: client.id,
        company_name: client.company_name,
        tax_id: client.tax_id || '',
        is_assigned: assignedIds.has(client.id),
      }));

      return { data: result, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Assign a client to a user
   */
  async assignClient(
    userId: string,
    clientId: string,
    options?: { is_primary?: boolean; notes?: string }
  ): Promise<ServiceResponse<UserClientAssignment>> {
    try {
      const tenantId = await this.getTenantId();
      const currentUser = await this.getCurrentUserId();

      const { data, error } = await supabase
        .from('user_client_assignments')
        .insert({
          user_id: userId,
          client_id: clientId,
          tenant_id: tenantId,
          assigned_by: currentUser,
          assigned_at: new Date().toISOString(),
          is_primary: options?.is_primary || false,
          notes: options?.notes || null,
        })
        .select()
        .single();

      if (error) throw error;

      await this.logAction('assign_client', userId, {
        client_id: clientId,
        assigned_by: currentUser,
      });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Remove client assignment from user
   */
  async unassignClient(userId: string, clientId: string): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();

      const { error } = await supabase
        .from('user_client_assignments')
        .delete()
        .eq('user_id', userId)
        .eq('client_id', clientId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      await this.logAction('unassign_client', userId, {
        client_id: clientId,
      });

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Bulk update client assignments for a user
   * Replaces all current assignments with the new list
   */
  async updateAssignments(
    userId: string,
    clientIds: string[]
  ): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();
      const currentUser = await this.getCurrentUserId();

      // Delete all existing assignments for this user
      const { error: deleteError } = await supabase
        .from('user_client_assignments')
        .delete()
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (deleteError) throw deleteError;

      // Insert new assignments if any
      if (clientIds.length > 0) {
        const assignments = clientIds.map(clientId => ({
          user_id: userId,
          client_id: clientId,
          tenant_id: tenantId,
          assigned_by: currentUser,
          assigned_at: new Date().toISOString(),
          is_primary: false,
          notes: null,
        }));

        const { error: insertError } = await supabase
          .from('user_client_assignments')
          .insert(assignments);

        if (insertError) throw insertError;
      }

      await this.logAction('bulk_update_assignments', userId, {
        client_count: clientIds.length,
        assigned_by: currentUser,
      });

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Check if current user has access to a specific client
   * Used for bookkeepers to verify client access
   */
  async hasAccessToClient(clientId: string): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();
      const currentUser = await this.getCurrentUserId();

      // Get user role and permissions
      const { data: userData, error: userError } = await supabase
        .from('user_tenant_access')
        .select('role, permissions')
        .eq('user_id', currentUser)
        .eq('tenant_id', tenantId)
        .single();

      if (userError) throw userError;

      // Check if user can see all clients:
      // 1. Admins always have access
      // 2. Users with see_all_clients permission have access
      const canSeeAllClients =
        userData?.role === 'admin' ||
        (userData?.permissions as { see_all_clients?: boolean })?.see_all_clients === true;

      if (canSeeAllClients) {
        return { data: true, error: null };
      }

      // For other roles, check assignment
      const { data, error } = await supabase
        .from('user_client_assignments')
        .select('id')
        .eq('user_id', currentUser)
        .eq('client_id', clientId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;

      return { data: !!data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get clients for current user based on role and permissions
   * - Admin: all clients
   * - User with see_all_clients permission: all clients
   * - Others: only assigned clients
   */
  async getAccessibleClients(): Promise<ServiceResponse<Array<{ id: string; company_name: string; tax_id: string }>>> {
    try {
      const tenantId = await this.getTenantId();
      const currentUser = await this.getCurrentUserId();

      // Get user role and permissions
      const { data: userData, error: userError } = await supabase
        .from('user_tenant_access')
        .select('role, permissions')
        .eq('user_id', currentUser)
        .eq('tenant_id', tenantId)
        .single();

      if (userError) throw userError;

      // Check if user can see all clients:
      // 1. Admins always see all
      // 2. Users with see_all_clients permission see all
      const canSeeAllClients =
        userData?.role === 'admin' ||
        (userData?.permissions as { see_all_clients?: boolean })?.see_all_clients === true;

      if (canSeeAllClients) {
        const { data: clients, error: clientsError } = await supabase
          .from('clients')
          .select('id, company_name, tax_id')
          .eq('tenant_id', tenantId)
          .order('company_name');

        if (clientsError) throw clientsError;
        return { data: clients || [], error: null };
      }

      // Others get only assigned clients
      const { data: assignments, error: assignError } = await supabase
        .from('user_client_assignments')
        .select(`
          clients!inner(
            id,
            company_name,
            tax_id
          )
        `)
        .eq('user_id', currentUser)
        .eq('tenant_id', tenantId);

      if (assignError) throw assignError;

      const clients = (assignments || []).map((a: Record<string, unknown>) => {
        const client = a.clients as Record<string, string>;
        return {
          id: client.id,
          company_name: client.company_name,
          tax_id: client.tax_id || '',
        };
      }).sort((a, b) => a.company_name.localeCompare(b.company_name, 'he'));

      return { data: clients, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Check if the current user can see all clients
   * @returns true if admin or has see_all_clients permission
   */
  async canSeeAllClients(): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();
      const currentUser = await this.getCurrentUserId();

      const { data: userData, error: userError } = await supabase
        .from('user_tenant_access')
        .select('role, permissions')
        .eq('user_id', currentUser)
        .eq('tenant_id', tenantId)
        .single();

      if (userError) throw userError;

      const canSeeAll =
        userData?.role === 'admin' ||
        (userData?.permissions as { see_all_clients?: boolean })?.see_all_clients === true;

      return { data: canSeeAll, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  private async getCurrentUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error('No authenticated user');
    return user.id;
  }
}

export const userClientAssignmentService = new UserClientAssignmentService();
