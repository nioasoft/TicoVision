/**
 * Foreign Worker Database Types
 * Types for the foreign_workers table and service layer
 */

// ============================================
// DATABASE ENTITY
// ============================================

export interface ForeignWorker {
  id: string;
  tenant_id: string;
  client_id: string;
  passport_number: string;
  full_name: string;
  nationality: string | null;
  salary: number;
  supplement: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

// ============================================
// DTOs (Data Transfer Objects)
// ============================================

export interface CreateForeignWorkerDto {
  client_id: string;
  passport_number: string;
  full_name: string;
  nationality?: string | null;
  salary?: number;
  supplement?: number;
}

export interface UpdateForeignWorkerDto {
  full_name?: string;
  nationality?: string | null;
  salary?: number;
  supplement?: number;
}

// ============================================
// SERVICE RESPONSES
// ============================================

export interface ForeignWorkerSearchResult {
  id: string;
  client_id: string;
  passport_number: string;
  full_name: string;
  nationality: string | null;
  salary: number;
  supplement: number;
}

export interface UpsertWorkerResult {
  data: ForeignWorker | null;
  error: string | null;
  existsAtOtherClient: boolean;
}
