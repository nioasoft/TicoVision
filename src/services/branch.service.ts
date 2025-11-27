/**
 * Branch Service
 * Manages client branches for the foreign workers module
 *
 * Branches allow the same client to have multiple locations
 * Each branch has its own foreign workers data
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type {
  ClientBranch,
  BranchWithDisplayName,
  CreateBranchDto,
  UpdateBranchDto,
} from '@/types/branch.types';

export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
}

export class BranchService {
  /**
   * Get all branches for a client
   */
  static async getClientBranches(clientId: string): Promise<BranchWithDisplayName[]> {
    try {
      const { data, error } = await supabase.rpc('get_client_branches', {
        p_client_id: clientId,
      });

      if (error) {
        console.error('Error getting client branches:', error);
        return [];
      }

      return (data || []) as BranchWithDisplayName[];
    } catch (error) {
      console.error('Error in getClientBranches:', error);
      return [];
    }
  }

  /**
   * Get or create default branch for a client
   * Used when first accessing foreign workers for a client
   */
  static async getOrCreateDefaultBranch(clientId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('get_or_create_default_branch', {
        p_client_id: clientId,
      });

      if (error) {
        console.error('Error getting/creating default branch:', error);
        return null;
      }

      return data as string;
    } catch (error) {
      console.error('Error in getOrCreateDefaultBranch:', error);
      return null;
    }
  }

  /**
   * Get display name for a branch (for letters)
   * Returns "Company Name" for default branch, or "Company Name - Branch Name"
   */
  static async getBranchDisplayName(branchId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.rpc('get_branch_display_name', {
        p_branch_id: branchId,
      });

      if (error) {
        console.error('Error getting branch display name:', error);
        return null;
      }

      return data as string;
    } catch (error) {
      console.error('Error in getBranchDisplayName:', error);
      return null;
    }
  }

  /**
   * Create a new branch for a client
   */
  static async createBranch(dto: CreateBranchDto): Promise<ServiceResponse<ClientBranch>> {
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        return { data: null, error: 'לא נמצא מזהה tenant' };
      }

      // If setting as default, unset current default first
      if (dto.is_default) {
        await supabase
          .from('client_branches')
          .update({ is_default: false })
          .eq('client_id', dto.client_id)
          .eq('is_default', true);
      }

      const { data, error } = await supabase
        .from('client_branches')
        .insert({
          tenant_id: tenantId,
          client_id: dto.client_id,
          name: dto.name,
          is_default: dto.is_default ?? false,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return { data: null, error: 'סניף עם שם זהה כבר קיים' };
        }
        return { data: null, error: error.message };
      }

      return { data: data as ClientBranch, error: null };
    } catch (error) {
      console.error('Error in createBranch:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'שגיאה לא צפויה',
      };
    }
  }

  /**
   * Update an existing branch
   */
  static async updateBranch(
    branchId: string,
    dto: UpdateBranchDto
  ): Promise<ServiceResponse<ClientBranch>> {
    try {
      // If setting as default, unset current default first
      if (dto.is_default) {
        const { data: branch } = await supabase
          .from('client_branches')
          .select('client_id')
          .eq('id', branchId)
          .single();

        if (branch) {
          await supabase
            .from('client_branches')
            .update({ is_default: false })
            .eq('client_id', branch.client_id)
            .eq('is_default', true)
            .neq('id', branchId);
        }
      }

      const { data, error } = await supabase
        .from('client_branches')
        .update(dto)
        .eq('id', branchId)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return { data: null, error: 'סניף עם שם זהה כבר קיים' };
        }
        return { data: null, error: error.message };
      }

      return { data: data as ClientBranch, error: null };
    } catch (error) {
      console.error('Error in updateBranch:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'שגיאה לא צפויה',
      };
    }
  }

  /**
   * Delete a branch
   * Cannot delete the only branch or a branch with data
   */
  static async deleteBranch(branchId: string): Promise<ServiceResponse<boolean>> {
    try {
      // Check if this is the only branch
      const { data: branch } = await supabase
        .from('client_branches')
        .select('client_id, is_default')
        .eq('id', branchId)
        .single();

      if (!branch) {
        return { data: null, error: 'סניף לא נמצא' };
      }

      const { data: branches } = await supabase
        .from('client_branches')
        .select('id')
        .eq('client_id', branch.client_id)
        .eq('is_active', true);

      if (!branches || branches.length <= 1) {
        return { data: null, error: 'לא ניתן למחוק את הסניף היחיד' };
      }

      // Check if branch has workers
      const { data: workers } = await supabase
        .from('foreign_workers')
        .select('id')
        .eq('branch_id', branchId)
        .limit(1);

      if (workers && workers.length > 0) {
        return { data: null, error: 'לא ניתן למחוק סניף עם עובדים' };
      }

      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('client_branches')
        .update({ is_active: false })
        .eq('id', branchId);

      if (error) {
        return { data: null, error: error.message };
      }

      // If deleted branch was default, set another as default
      if (branch.is_default) {
        const { data: firstBranch } = await supabase
          .from('client_branches')
          .select('id')
          .eq('client_id', branch.client_id)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (firstBranch) {
          await supabase
            .from('client_branches')
            .update({ is_default: true })
            .eq('id', firstBranch.id);
        }
      }

      return { data: true, error: null };
    } catch (error) {
      console.error('Error in deleteBranch:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'שגיאה לא צפויה',
      };
    }
  }

  /**
   * Get branch by ID
   */
  static async getBranch(branchId: string): Promise<ClientBranch | null> {
    try {
      const { data, error } = await supabase
        .from('client_branches')
        .select('*')
        .eq('id', branchId)
        .single();

      if (error) {
        console.error('Error getting branch:', error);
        return null;
      }

      return data as ClientBranch;
    } catch (error) {
      console.error('Error in getBranch:', error);
      return null;
    }
  }
}

export default BranchService;
