/**
 * Branch Types for Foreign Workers Module
 *
 * Branches allow the same client to have multiple locations/branches
 * Each branch has its own foreign workers data while sharing other client data
 */

import type { Database } from './database.types';

// Base types from database
export type ClientBranchRow = Database['public']['Tables']['client_branches']['Row'];
export type ClientBranchInsert = Database['public']['Tables']['client_branches']['Insert'];
export type ClientBranchUpdate = Database['public']['Tables']['client_branches']['Update'];

// Extended branch type with display name
export interface ClientBranch extends ClientBranchRow {
  display_name?: string;
}

// Branch with display name (from RPC function)
export interface BranchWithDisplayName {
  id: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
  display_name: string;
}

// Create branch DTO
export interface CreateBranchDto {
  client_id: string;
  name: string;
  is_default?: boolean;
}

// Update branch DTO
export interface UpdateBranchDto {
  name?: string;
  is_default?: boolean;
  is_active?: boolean;
}

// Branch selector option
export interface BranchOption {
  id: string;
  name: string;
  is_default: boolean;
  display_name: string;
}
