/**
 * Foreign Worker Service
 * Manages foreign workers pool with passport-based search
 *
 * Workers belong to ONE client only (not shared like contacts)
 * Passport number is unique per tenant (cannot exist at different clients)
 */

import { supabase, getCurrentTenantId } from '@/lib/supabase';
import type {
  ForeignWorker,
  ForeignWorkerSearchResult,
  CreateForeignWorkerDto,
  UpsertWorkerResult,
} from '@/types/foreign-worker.types';

export class ForeignWorkerService {
  /**
   * Find worker by passport number (exact match)
   * Returns the worker if found, null otherwise
   */
  static async findByPassport(passportNumber: string): Promise<ForeignWorkerSearchResult | null> {
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        console.warn('No tenant_id available for worker search');
        return null;
      }

      const { data, error } = await supabase.rpc('find_worker_by_passport', {
        p_tenant_id: tenantId,
        p_passport_number: passportNumber,
      });

      if (error) {
        console.error('Error finding worker by passport:', error);
        return null;
      }

      // RPC returns array, get first result
      if (!data || data.length === 0) {
        return null;
      }

      return data[0] as ForeignWorkerSearchResult;
    } catch (error) {
      console.error('Error in findByPassport:', error);
      return null;
    }
  }

  /**
   * Create new worker OR update existing if passport found at same client
   * Returns error if passport exists at a DIFFERENT client
   */
  static async upsertWorker(dto: CreateForeignWorkerDto): Promise<UpsertWorkerResult> {
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        return {
          data: null,
          error: 'לא נמצא מזהה tenant',
          existsAtOtherClient: false,
        };
      }

      // Check if passport exists
      const existing = await this.findByPassport(dto.passport_number);

      if (existing) {
        // If exists at DIFFERENT client, block the operation
        if (existing.client_id !== dto.client_id) {
          return {
            data: null,
            error: `דרכון ${dto.passport_number} כבר קיים עבור לקוח אחר`,
            existsAtOtherClient: true,
          };
        }

        // Same client - update existing record
        const { data, error } = await supabase
          .from('foreign_workers')
          .update({
            full_name: dto.full_name,
            nationality: dto.nationality,
            salary: dto.salary ?? existing.salary,
            supplement: dto.supplement ?? existing.supplement,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) {
          return {
            data: null,
            error: error.message,
            existsAtOtherClient: false,
          };
        }

        return {
          data: data as ForeignWorker,
          error: null,
          existsAtOtherClient: false,
        };
      }

      // Create new worker
      const { data, error } = await supabase
        .from('foreign_workers')
        .insert({
          tenant_id: tenantId,
          client_id: dto.client_id,
          passport_number: dto.passport_number,
          full_name: dto.full_name,
          nationality: dto.nationality,
          salary: dto.salary ?? 0,
          supplement: dto.supplement ?? 0,
        })
        .select()
        .single();

      if (error) {
        return {
          data: null,
          error: error.message,
          existsAtOtherClient: false,
        };
      }

      return {
        data: data as ForeignWorker,
        error: null,
        existsAtOtherClient: false,
      };
    } catch (error) {
      console.error('Error in upsertWorker:', error);
      return {
        data: null,
        error: error instanceof Error ? error.message : 'שגיאה לא צפויה',
        existsAtOtherClient: false,
      };
    }
  }

  /**
   * Get all workers for a specific client
   */
  static async getClientWorkers(clientId: string): Promise<ForeignWorker[]> {
    try {
      const { data, error } = await supabase
        .from('foreign_workers')
        .select('*')
        .eq('client_id', clientId)
        .order('full_name');

      if (error) {
        console.error('Error getting client workers:', error);
        return [];
      }

      return data as ForeignWorker[];
    } catch (error) {
      console.error('Error in getClientWorkers:', error);
      return [];
    }
  }

  /**
   * Delete a worker by ID
   */
  static async delete(workerId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('foreign_workers')
        .delete()
        .eq('id', workerId);

      if (error) {
        console.error('Error deleting worker:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in delete:', error);
      return false;
    }
  }
}

export default ForeignWorkerService;
