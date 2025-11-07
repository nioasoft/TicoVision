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
  UploadContext
} from '@/types/file-attachment.types';
import { generateUniqueFilename, validateFile } from '@/types/file-attachment.types';

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
}

// Export singleton instance
export const fileUploadService = new FileUploadService();
