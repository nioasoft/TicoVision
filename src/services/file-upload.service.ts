/**
 * File Upload Service
 * Handles file uploads to Supabase Storage and database management
 */

import { BaseService } from './base.service';
import { supabase } from '@/lib/supabase';
import type {
  ClientAttachment,
  FileUploadOptions,
  FileType,
  UploadContext,
  FileCategory
} from '@/types/file-attachment.types';
import { generateUniqueFilename, validateFile, FILE_CATEGORIES } from '@/types/file-attachment.types';

interface ServiceResponse<T> {
  data: T | null;
  error: Error | null;
}

export class FileUploadService extends BaseService {
  private readonly STORAGE_BUCKET = 'client-attachments';

  constructor() {
    super('client_attachments');
  }

  /**
   * Upload a file to Supabase Storage and create database record
   */
  async uploadFile(
    file: File,
    options: FileUploadOptions
  ): Promise<ServiceResponse<ClientAttachment>> {
    try {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const tenantId = await this.getTenantId();
      const userId = (await supabase.auth.getUser()).data.user?.id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Generate unique filename
      const uniqueFilename = generateUniqueFilename(file.name);

      // Build storage path: {tenant_id}/{client_id}/{context}/{filename}
      const storagePath = this.buildStoragePath(
        tenantId,
        options.clientId,
        options.uploadContext,
        uniqueFilename,
        options.yearContext
      );

      // Check if file with same context exists (for versioning)
      const existingFile = await this.getLatestFileByContext(
        options.clientId,
        options.uploadContext,
        options.yearContext
      );

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Create database record
      const attachmentData = {
        tenant_id: tenantId,
        client_id: options.clientId,
        file_name: file.name,
        file_type: file.type as FileType,
        file_size: file.size,
        storage_path: storagePath,
        upload_context: options.uploadContext,
        year_context: options.yearContext,
        version: existingFile.data ? (existingFile.data.version + 1) : 1,
        is_latest: true,
        replaces_attachment_id: existingFile.data?.id,
        uploaded_by: userId,
        notes: options.notes
      };

      const { data, error: dbError } = await supabase
        .from(this.tableName)
        .insert(attachmentData)
        .select()
        .single();

      if (dbError) {
        // Rollback: delete uploaded file if database insert fails
        await supabase.storage
          .from(this.STORAGE_BUCKET)
          .remove([storagePath]);

        throw dbError;
      }

      // If this is a new version, mark old version as not latest
      if (existingFile.data) {
        await supabase
          .from(this.tableName)
          .update({ is_latest: false })
          .eq('id', existingFile.data.id);
      }

      // Log action
      await this.logAction(
        'upload_file',
        data.id,
        {
          file_name: file.name,
          context: options.uploadContext,
          year: options.yearContext
        }
      );

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Delete a file (hard delete from storage and database)
   */
  async deleteFile(attachmentId: string): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();

      // Get attachment details
      const { data: attachment, error: fetchError } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', attachmentId)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError || !attachment) {
        throw new Error('File not found');
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .remove([attachment.storage_path]);

      if (storageError) {
        throw storageError;
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', attachmentId)
        .eq('tenant_id', tenantId);

      if (dbError) {
        throw dbError;
      }

      // Log action
      await this.logAction(
        'delete_file',
        attachmentId,
        { file_name: attachment.file_name }
      );

      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get all files for a client
   */
  async getFilesByClient(
    clientId: string,
    context?: UploadContext,
    latestOnly = true
  ): Promise<ServiceResponse<ClientAttachment[]>> {
    try {
      const tenantId = await this.getTenantId();

      let query = supabase
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId);

      if (context) {
        query = query.eq('upload_context', context);
      }

      if (latestOnly) {
        query = query.eq('is_latest', true);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get file versions (history)
   */
  async getFileVersions(
    clientId: string,
    context: UploadContext,
    yearContext?: number
  ): Promise<ServiceResponse<ClientAttachment[]>> {
    try {
      const tenantId = await this.getTenantId();

      let query = supabase
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .eq('upload_context', context);

      if (yearContext) {
        query = query.eq('year_context', yearContext);
      }

      query = query.order('version', { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get signed URL for file viewing
   */
  async getFileUrl(storagePath: string): Promise<ServiceResponse<string>> {
    try {
      const { data, error } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .createSignedUrl(storagePath, 3600); // Valid for 1 hour

      if (error || !data) {
        throw error || new Error('Failed to generate signed URL');
      }

      return { data: data.signedUrl, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get latest file by context
   * Private helper method
   */
  private async getLatestFileByContext(
    clientId: string,
    context: UploadContext,
    yearContext?: number
  ): Promise<ServiceResponse<ClientAttachment>> {
    try {
      const tenantId = await this.getTenantId();

      let query = supabase
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .eq('upload_context', context)
        .eq('is_latest', true);

      if (yearContext) {
        query = query.eq('year_context', yearContext);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Build storage path for file
   * Path format: {tenant_id}/{client_id}/{context}/{year?}/{filename}
   */
  private buildStoragePath(
    tenantId: string,
    clientId: string,
    context: UploadContext,
    filename: string,
    yearContext?: number
  ): string {
    const parts = [tenantId, clientId, context];

    if (yearContext) {
      parts.push(yearContext.toString());
    }

    parts.push(filename);

    return parts.join('/');
  }

  // ===================================
  // Category-Based File Management
  // ===================================

  /**
   * Get all files for a specific category
   */
  async getFilesByCategory(
    clientId: string,
    category: FileCategory
  ): Promise<ServiceResponse<ClientAttachment[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .eq('file_category', category)
        .eq('is_latest', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return { data: data || [], error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Upload file with category assignment
   */
  async uploadFileToCategory(
    file: File,
    clientId: string,
    category: FileCategory,
    description: string
  ): Promise<ServiceResponse<ClientAttachment>> {
    try {
      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Validate description length (50 chars max)
      if (description.length > 50) {
        throw new Error('התיאור חייב להיות עד 50 תווים');
      }

      const tenantId = await this.getTenantId();
      const userId = (await supabase.auth.getUser()).data.user?.id;

      if (!userId) {
        throw new Error('משתמש לא מחובר');
      }

      // Validate category exists
      if (!FILE_CATEGORIES[category]) {
        throw new Error('קטגוריה לא חוקית');
      }

      // Generate unique filename
      const uniqueFilename = generateUniqueFilename(file.name);

      // Build storage path with category: {tenant_id}/{client_id}/{category}/{filename}
      const storagePath = `${tenantId}/${clientId}/${category}/${uniqueFilename}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Create database record
      const attachmentData = {
        tenant_id: tenantId,
        client_id: clientId,
        file_name: file.name,
        file_type: file.type as FileType,
        file_size: file.size,
        storage_path: storagePath,
        file_category: category,
        description: description,
        upload_context: 'client_form' as UploadContext, // Default context
        version: 1,
        is_latest: true,
        uploaded_by: userId
      };

      const { data, error: dbError } = await supabase
        .from(this.tableName)
        .insert(attachmentData)
        .select()
        .single();

      if (dbError) {
        // Rollback: delete uploaded file if database insert fails
        await supabase.storage
          .from(this.STORAGE_BUCKET)
          .remove([storagePath]);

        throw dbError;
      }

      // Log action
      await this.logAction(
        'upload_file_category',
        data.id,
        {
          file_name: file.name,
          category: category,
          description: description
        }
      );

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Update file description
   */
  async updateFileDescription(
    fileId: string,
    description: string
  ): Promise<ServiceResponse<ClientAttachment>> {
    try {
      // Validate description length (50 chars max)
      if (description.length > 50) {
        throw new Error('התיאור חייב להיות עד 50 תווים');
      }

      const tenantId = await this.getTenantId();

      // Check file exists and belongs to tenant
      const { data: existing, error: fetchError } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', fileId)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError || !existing) {
        throw new Error('קובץ לא נמצא');
      }

      // Update description
      const { data, error: updateError } = await supabase
        .from(this.tableName)
        .update({ description: description })
        .eq('id', fileId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Log action
      await this.logAction(
        'update_file_description',
        fileId,
        {
          old_description: existing.description,
          new_description: description
        }
      );

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Save PDF reference to client_attachments
   * Used for foreign worker documents that are already stored in letter-pdfs bucket
   */
  async savePdfReference(
    clientId: string,
    storagePath: string,
    fileName: string,
    category: FileCategory,
    description?: string
  ): Promise<ServiceResponse<ClientAttachment>> {
    try {
      const tenantId = await this.getTenantId();
      const userId = (await supabase.auth.getUser()).data.user?.id;

      if (!userId) {
        throw new Error('משתמש לא מחובר');
      }

      // Create database record pointing to the PDF in letter-pdfs bucket
      const attachmentData = {
        tenant_id: tenantId,
        client_id: clientId,
        file_name: fileName,
        file_type: 'application/pdf' as FileType,
        file_size: 1, // Minimal size - actual size unknown from Edge Function
        storage_path: storagePath,
        file_category: category,
        description: description || null,
        upload_context: 'client_form' as UploadContext,
        version: 1,
        is_latest: true,
        uploaded_by: userId
      };

      const { data, error: dbError } = await supabase
        .from(this.tableName)
        .insert(attachmentData)
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      // Log action
      await this.logAction(
        'save_pdf_reference',
        data.id,
        {
          file_name: fileName,
          category: category,
          storage_path: storagePath
        }
      );

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get statistics of files per category for a client
   */
  async getCategoryStats(clientId: string): Promise<ServiceResponse<Record<FileCategory, number>>> {
    try {
      const tenantId = await this.getTenantId();

      // Get all latest files for the client
      const { data: files, error } = await supabase
        .from(this.tableName)
        .select('file_category')
        .eq('tenant_id', tenantId)
        .eq('client_id', clientId)
        .eq('is_latest', true);

      if (error) {
        throw error;
      }

      // Initialize stats with all categories at 0
      const stats: Record<FileCategory, number> = {
        company_registry: 0,
        financial_report: 0,
        bookkeeping_card: 0,
        quote_invoice: 0,
        payment_proof_2026: 0,
        holdings_presentation: 0,
        general: 0,
        foreign_worker_docs: 0
      };

      // Count files per category
      if (files) {
        files.forEach((file) => {
          const category = file.file_category as FileCategory;
          if (stats[category] !== undefined) {
            stats[category]++;
          }
        });
      }

      return { data: stats, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();
