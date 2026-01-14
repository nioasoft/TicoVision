import { BaseService } from '@/services/base.service';
import type { ServiceResponse } from '@/services/base.service';
import { supabase } from '@/lib/supabase';
import type {
  DistributionList,
  DistributionListWithMembers,
  ListMemberWithDetails,
  CreateListDto,
  UpdateListDto,
} from '../types/broadcast.types';

class DistributionListService extends BaseService {
  constructor() {
    super('distribution_lists');
  }

  /**
   * Get all distribution lists for the current tenant
   */
  async getLists(): Promise<ServiceResponse<DistributionList[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('distribution_lists')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });

      if (error) throw this.handleError(error);

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get all lists with member counts
   */
  async getListsWithCounts(): Promise<ServiceResponse<(DistributionList & { member_count: number; email_count: number })[]>> {
    try {
      const tenantId = await this.getTenantId();

      // Get lists
      const { data: lists, error: listsError } = await supabase
        .from('distribution_lists')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });

      if (listsError) throw this.handleError(listsError);

      // Get member counts for each list
      const listsWithCounts = await Promise.all(
        (lists || []).map(async (list) => {
          const { data: members } = await supabase
            .rpc('get_list_members_with_details', { p_list_id: list.id });

          const member_count = members?.length || 0;
          const email_count = members?.reduce((sum: number, m: ListMemberWithDetails) => sum + (m.email_count || 0), 0) || 0;

          return {
            ...list,
            member_count,
            email_count,
          };
        })
      );

      return { data: listsWithCounts, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Get a single list by ID with all member details
   */
  async getListWithMembers(id: string): Promise<ServiceResponse<DistributionListWithMembers>> {
    try {
      // Get the list
      const { data: list, error: listError } = await supabase
        .from('distribution_lists')
        .select('*')
        .eq('id', id)
        .single();

      if (listError) throw this.handleError(listError);

      // Get members with details using the DB function
      const { data: members, error: membersError } = await supabase
        .rpc('get_list_members_with_details', { p_list_id: id });

      if (membersError) throw this.handleError(membersError);

      const membersList = (members || []) as ListMemberWithDetails[];
      const result: DistributionListWithMembers = {
        ...list,
        members: membersList,
        member_count: membersList.length,
        email_count: membersList.reduce((sum, m) => sum + (m.email_count || 0), 0),
      };

      return { data: result, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Create a new distribution list
   */
  async createList(dto: CreateListDto): Promise<ServiceResponse<DistributionList>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      // Create the list
      const { data: list, error: listError } = await supabase
        .from('distribution_lists')
        .insert({
          tenant_id: tenantId,
          name: dto.name,
          description: dto.description || null,
          created_by: user?.id,
        })
        .select()
        .single();

      if (listError) throw this.handleError(listError);

      // Add initial members if provided
      if (dto.client_ids && dto.client_ids.length > 0) {
        const members = dto.client_ids.map(client_id => ({
          list_id: list.id,
          client_id,
          added_by: user?.id,
        }));

        const { error: membersError } = await supabase
          .from('distribution_list_members')
          .insert(members);

        if (membersError) throw this.handleError(membersError);
      }

      await this.logAction('create_distribution_list', list.id, { name: dto.name });

      return { data: list, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Update an existing distribution list
   */
  async updateList(id: string, dto: UpdateListDto): Promise<ServiceResponse<DistributionList>> {
    try {
      const updates: Partial<DistributionList> = {};
      if (dto.name !== undefined) updates.name = dto.name;
      if (dto.description !== undefined) updates.description = dto.description;

      const { data, error } = await supabase
        .from('distribution_lists')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw this.handleError(error);

      await this.logAction('update_distribution_list', id, dto);

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Delete a distribution list
   */
  async deleteList(id: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('distribution_lists')
        .delete()
        .eq('id', id);

      if (error) throw this.handleError(error);

      await this.logAction('delete_distribution_list', id);

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Set members for a list (replaces all existing members)
   */
  async setMembers(listId: string, clientIds: string[]): Promise<ServiceResponse<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Delete existing members
      const { error: deleteError } = await supabase
        .from('distribution_list_members')
        .delete()
        .eq('list_id', listId);

      if (deleteError) throw this.handleError(deleteError);

      // Add new members
      if (clientIds.length > 0) {
        const members = clientIds.map(client_id => ({
          list_id: listId,
          client_id,
          added_by: user?.id,
        }));

        const { error: insertError } = await supabase
          .from('distribution_list_members')
          .insert(members);

        if (insertError) throw this.handleError(insertError);
      }

      await this.logAction('set_list_members', listId, { member_count: clientIds.length });

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Add members to a list
   */
  async addMembers(listId: string, clientIds: string[]): Promise<ServiceResponse<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const members = clientIds.map(client_id => ({
        list_id: listId,
        client_id,
        added_by: user?.id,
      }));

      // Use upsert to handle duplicates gracefully
      const { error } = await supabase
        .from('distribution_list_members')
        .upsert(members, { onConflict: 'list_id,client_id' });

      if (error) throw this.handleError(error);

      await this.logAction('add_list_members', listId, { added_count: clientIds.length });

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  /**
   * Remove members from a list
   */
  async removeMembers(listId: string, clientIds: string[]): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('distribution_list_members')
        .delete()
        .eq('list_id', listId)
        .in('client_id', clientIds);

      if (error) throw this.handleError(error);

      await this.logAction('remove_list_members', listId, { removed_count: clientIds.length });

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }
}

export const distributionListService = new DistributionListService();
