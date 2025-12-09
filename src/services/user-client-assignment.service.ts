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

// Group assignment types
export interface UserGroupAssignment {
  id: string;
  user_id: string;
  group_id: string;
  tenant_id: string;
  assigned_by: string | null;
  assigned_at: string;
  notes: string | null;
}

export interface AssignedGroup {
  group_id: string;
  group_name: string;
  assignment_id: string;
  assigned_at: string;
  member_count: number;
}

export interface AssignableGroup {
  id: string;
  group_name_hebrew: string;
  primary_owner: string;
  member_count: number;
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
   * Checks direct assignment and group-based assignment
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

      // Check direct client assignment
      const { data: directAssignment, error: directError } = await supabase
        .from('user_client_assignments')
        .select('id')
        .eq('user_id', currentUser)
        .eq('client_id', clientId)
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (directError) throw directError;
      if (directAssignment) {
        return { data: true, error: null };
      }

      // Check group-based assignment
      // First get the client's group_id
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('group_id')
        .eq('id', clientId)
        .eq('tenant_id', tenantId)
        .single();

      if (clientError) throw clientError;

      // If client is in a group, check if user is assigned to that group
      if (client?.group_id) {
        const { data: groupAssignment, error: groupError } = await supabase
          .from('user_group_assignments')
          .select('id')
          .eq('user_id', currentUser)
          .eq('group_id', client.group_id)
          .eq('tenant_id', tenantId)
          .maybeSingle();

        if (groupError) throw groupError;
        if (groupAssignment) {
          return { data: true, error: null };
        }
      }

      return { data: false, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get clients for current user based on role and permissions
   * - Admin: all clients
   * - User with see_all_clients permission: all clients
   * - Others: directly assigned clients + clients in assigned groups
   */
  async getAccessibleClients(): Promise<ServiceResponse<Array<{ id: string; company_name: string; tax_id: string; source?: 'direct' | 'group' }>>> {
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
        return { data: (clients || []).map(c => ({ ...c, source: 'direct' as const })), error: null };
      }

      // Get directly assigned clients
      const { data: directAssignments, error: directError } = await supabase
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

      if (directError) throw directError;

      // Get groups assigned to user
      const assignedGroupIds = await this.getAssignedGroupIds(currentUser, tenantId);

      // Get clients in those groups
      let groupClients: Array<{ id: string; company_name: string; tax_id: string }> = [];
      if (assignedGroupIds.length > 0) {
        const { data: clientsInGroups, error: groupClientsError } = await supabase
          .from('clients')
          .select('id, company_name, tax_id')
          .eq('tenant_id', tenantId)
          .in('group_id', assignedGroupIds);

        if (groupClientsError) throw groupClientsError;
        groupClients = clientsInGroups || [];
      }

      // Build direct clients list
      const directClients = (directAssignments || []).map((a: Record<string, unknown>) => {
        const client = a.clients as Record<string, string>;
        return {
          id: client.id,
          company_name: client.company_name,
          tax_id: client.tax_id || '',
          source: 'direct' as const,
        };
      });

      // Merge and deduplicate (direct assignments take priority)
      const directClientIds = new Set(directClients.map(c => c.id));
      const uniqueGroupClients = groupClients
        .filter(c => !directClientIds.has(c.id))
        .map(c => ({ ...c, source: 'group' as const }));

      const allClients = [...directClients, ...uniqueGroupClients]
        .sort((a, b) => a.company_name.localeCompare(b.company_name, 'he'));

      return { data: allClients, error: null };
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

  // ==================== GROUP ASSIGNMENT METHODS ====================

  /**
   * Get all groups assigned to a specific user
   */
  async getAssignedGroups(userId: string): Promise<ServiceResponse<AssignedGroup[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('user_group_assignments')
        .select(`
          id,
          group_id,
          assigned_at,
          client_groups!inner(
            group_name_hebrew,
            id
          )
        `)
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // Get member counts for each group
      const groupIds = (data || []).map(item => (item.client_groups as { id: string }).id);

      let memberCounts: Record<string, number> = {};
      if (groupIds.length > 0) {
        const { data: clients, error: countError } = await supabase
          .from('clients')
          .select('group_id')
          .eq('tenant_id', tenantId)
          .in('group_id', groupIds);

        if (countError) throw countError;

        memberCounts = (clients || []).reduce((acc, client) => {
          if (client.group_id) {
            acc[client.group_id] = (acc[client.group_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
      }

      const assignedGroups: AssignedGroup[] = (data || []).map((item: Record<string, unknown>) => ({
        group_id: item.group_id as string,
        group_name: (item.client_groups as { group_name_hebrew: string })?.group_name_hebrew || '',
        assignment_id: item.id as string,
        assigned_at: item.assigned_at as string,
        member_count: memberCounts[(item.client_groups as { id: string })?.id] || 0,
      }));

      return { data: assignedGroups, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get list of all groups with assignment status for a user
   * Used in admin UI to show checkboxes
   */
  async getGroupsWithAssignmentStatus(userId: string): Promise<ServiceResponse<AssignableGroup[]>> {
    try {
      const tenantId = await this.getTenantId();

      // Get all groups
      const { data: groups, error: groupsError } = await supabase
        .from('client_groups')
        .select('id, group_name_hebrew, primary_owner')
        .eq('tenant_id', tenantId)
        .order('group_name_hebrew');

      if (groupsError) throw groupsError;

      // Get assigned group IDs for this user
      const { data: assignments, error: assignmentsError } = await supabase
        .from('user_group_assignments')
        .select('group_id')
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (assignmentsError) throw assignmentsError;

      // Get member counts for each group
      const groupIds = (groups || []).map(g => g.id);
      let memberCounts: Record<string, number> = {};
      if (groupIds.length > 0) {
        const { data: clients, error: countError } = await supabase
          .from('clients')
          .select('group_id')
          .eq('tenant_id', tenantId)
          .in('group_id', groupIds);

        if (countError) throw countError;

        memberCounts = (clients || []).reduce((acc, client) => {
          if (client.group_id) {
            acc[client.group_id] = (acc[client.group_id] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
      }

      const assignedIds = new Set((assignments || []).map(a => a.group_id));

      const result: AssignableGroup[] = (groups || []).map(group => ({
        id: group.id,
        group_name_hebrew: group.group_name_hebrew,
        primary_owner: group.primary_owner || '',
        member_count: memberCounts[group.id] || 0,
        is_assigned: assignedIds.has(group.id),
      }));

      return { data: result, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Bulk update group assignments for a user
   * Replaces all current group assignments with the new list
   */
  async updateGroupAssignments(
    userId: string,
    groupIds: string[]
  ): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();
      const currentUser = await this.getCurrentUserId();

      // Delete all existing group assignments for this user
      const { error: deleteError } = await supabase
        .from('user_group_assignments')
        .delete()
        .eq('user_id', userId)
        .eq('tenant_id', tenantId);

      if (deleteError) throw deleteError;

      // Insert new group assignments if any
      if (groupIds.length > 0) {
        const assignments = groupIds.map(groupId => ({
          user_id: userId,
          group_id: groupId,
          tenant_id: tenantId,
          assigned_by: currentUser,
          assigned_at: new Date().toISOString(),
          notes: null,
        }));

        const { error: insertError } = await supabase
          .from('user_group_assignments')
          .insert(assignments);

        if (insertError) throw insertError;
      }

      await this.logAction('bulk_update_group_assignments', userId, {
        group_count: groupIds.length,
        assigned_by: currentUser,
      });

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get IDs of groups assigned to a user
   * Used internally for access control
   */
  private async getAssignedGroupIds(userId: string, tenantId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('user_group_assignments')
      .select('group_id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId);

    if (error) throw error;
    return (data || []).map(item => item.group_id);
  }

  private async getCurrentUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error('No authenticated user');
    return user.id;
  }
}

export const userClientAssignmentService = new UserClientAssignmentService();
