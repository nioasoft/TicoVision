/**
 * File Upload Service
 * Handles file uploads to Supabase Storage and database management
 */

import { BaseService } from './base.service';
import { supabase } from '@/lib/supabase';
import { clientService } from './client.service';
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

  // Signature upload constants
  private readonly SIGNATURE_MAX_SIZE = 500 * 1024; // 500KB
  private readonly SIGNATURE_ALLOWED_TYPE = 'image/png';

  constructor() {
    super('client_attachments');
  }

  // ===================================
  // Signature Upload Methods
  // ===================================

  /**
   * Validate signature file (PNG only, max 500KB)
   */
  private validateSignatureFile(file: File): { valid: boolean; error?: string } {
    if (file.type !== this.SIGNATURE_ALLOWED_TYPE) {
      return { valid: false, error: 'יש להעלות קובץ PNG בלבד' };
    }
    if (file.size > this.SIGNATURE_MAX_SIZE) {
      const sizeKB = Math.round(file.size / 1024);
      return { valid: false, error: `הקובץ גדול מדי (${sizeKB}KB). מקסימום: 500KB` };
    }
    return { valid: true };
  }

  /**
   * Upload signature for a contact
   */
  async uploadContactSignature(
    file: File,
    contactId: string
  ): Promise<ServiceResponse<string>> {
    try {
      const validation = this.validateSignatureFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const tenantId = await this.getTenantId();
      const timestamp = Date.now();
      const storagePath = `${tenantId}/signatures/contacts/${contactId}/signature-${timestamp}.png`;

      // Get existing signature path to delete old file
      const { data: contact } = await supabase
        .from('tenant_contacts')
        .select('signature_path')
        .eq('id', contactId)
        .eq('tenant_id', tenantId)
        .single();

      // Delete old signature if exists
      if (contact?.signature_path) {
        await supabase.storage
          .from(this.STORAGE_BUCKET)
          .remove([contact.signature_path]);
      }

      // Upload new signature
      const { error: uploadError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(storagePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // Update database
      const { error: dbError } = await supabase
        .from('tenant_contacts')
        .update({ signature_path: storagePath })
        .eq('id', contactId)
        .eq('tenant_id', tenantId);

      if (dbError) {
        // Rollback: delete uploaded file
        await supabase.storage.from(this.STORAGE_BUCKET).remove([storagePath]);
        throw dbError;
      }

      await this.logAction('upload_contact_signature', contactId);
      return { data: storagePath, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Upload signature/stamp for a client
   */
  async uploadClientSignature(
    file: File,
    clientId: string
  ): Promise<ServiceResponse<string>> {
    try {
      const validation = this.validateSignatureFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const tenantId = await this.getTenantId();
      const timestamp = Date.now();
      const storagePath = `${tenantId}/signatures/clients/${clientId}/signature-${timestamp}.png`;

      // Get existing signature path to delete old file
      const { data: client } = await supabase
        .from('clients')
        .select('signature_path')
        .eq('id', clientId)
        .eq('tenant_id', tenantId)
        .single();

      // Delete old signature if exists
      if (client?.signature_path) {
        await supabase.storage
          .from(this.STORAGE_BUCKET)
          .remove([client.signature_path]);
      }

      // Upload new signature
      const { error: uploadError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .upload(storagePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      // Update database
      const { error: dbError } = await supabase
        .from('clients')
        .update({ signature_path: storagePath })
        .eq('id', clientId)
        .eq('tenant_id', tenantId);

      if (dbError) {
        // Rollback: delete uploaded file
        await supabase.storage.from(this.STORAGE_BUCKET).remove([storagePath]);
        throw dbError;
      }

      await this.logAction('upload_client_signature', clientId);
      return { data: storagePath, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Delete signature for a contact
   */
  async deleteContactSignature(contactId: string): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();

      // Get current path
      const { data: contact } = await supabase
        .from('tenant_contacts')
        .select('signature_path')
        .eq('id', contactId)
        .eq('tenant_id', tenantId)
        .single();

      if (contact?.signature_path) {
        // Delete from storage
        await supabase.storage
          .from(this.STORAGE_BUCKET)
          .remove([contact.signature_path]);

        // Update database
        await supabase
          .from('tenant_contacts')
          .update({ signature_path: null })
          .eq('id', contactId)
          .eq('tenant_id', tenantId);
      }

      await this.logAction('delete_contact_signature', contactId);
      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Delete signature/stamp for a client
   */
  async deleteClientSignature(clientId: string): Promise<ServiceResponse<boolean>> {
    try {
      const tenantId = await this.getTenantId();

      // Get current path
      const { data: client } = await supabase
        .from('clients')
        .select('signature_path')
        .eq('id', clientId)
        .eq('tenant_id', tenantId)
        .single();

      if (client?.signature_path) {
        // Delete from storage
        await supabase.storage
          .from(this.STORAGE_BUCKET)
          .remove([client.signature_path]);

        // Update database
        await supabase
          .from('clients')
          .update({ signature_path: null })
          .eq('id', clientId)
          .eq('tenant_id', tenantId);
      }

      await this.logAction('delete_client_signature', clientId);
      return { data: true, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Upload file directly to a group (group-level file, not distributed to clients)
   */
  async uploadFileToGroupCategory(
    file: File,
    groupId: string,
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

      // Build storage path for group: {tenant_id}/groups/{group_id}/{category}/{filename}
      const storagePath = `${tenantId}/groups/${groupId}/${category}/${uniqueFilename}`;

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

      // Create database record with group_id (not client_id)
      const attachmentData = {
        tenant_id: tenantId,
        group_id: groupId,  // Group-level file
        client_id: null,    // No client for group files
        file_name: file.name,
        file_type: file.type as FileType,
        file_size: file.size,
        storage_path: storagePath,
        file_category: category,
        description: description,
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
        // Rollback: delete uploaded file if database insert fails
        await supabase.storage
          .from(this.STORAGE_BUCKET)
          .remove([storagePath]);

        throw dbError;
      }

      // Log action
      await this.logAction(
        'upload_file_group_category',
        data.id,
        {
          file_name: file.name,
          group_id: groupId,
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
   * Get all files for a specific group and category
   */
  async getFilesByGroupCategory(
    groupId: string,
    category: FileCategory
  ): Promise<ServiceResponse<ClientAttachment[]>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('group_id', groupId)
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
   * Delete multiple files at once (bulk delete)
   */
  async bulkDeleteFiles(attachmentIds: string[]): Promise<ServiceResponse<{ deleted: number; failed: number }>> {
    try {
      const tenantId = await this.getTenantId();

      if (!attachmentIds.length) {
        return { data: { deleted: 0, failed: 0 }, error: null };
      }

      // Get all attachment details
      const { data: attachments, error: fetchError } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .in('id', attachmentIds);

      if (fetchError) {
        throw fetchError;
      }

      if (!attachments || attachments.length === 0) {
        throw new Error('קבצים לא נמצאו');
      }

      // Collect storage paths for deletion
      const storagePaths = attachments.map((a) => a.storage_path);

      // Delete from storage (supports multiple files)
      const { error: storageError } = await supabase.storage
        .from(this.STORAGE_BUCKET)
        .remove(storagePaths);

      if (storageError) {
        throw storageError;
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from(this.tableName)
        .delete()
        .eq('tenant_id', tenantId)
        .in('id', attachmentIds);

      if (dbError) {
        throw dbError;
      }

      // Log action
      await this.logAction(
        'bulk_delete_files',
        attachmentIds[0],
        {
          count: attachments.length,
          file_names: attachments.map((a) => a.file_name)
        }
      );

      return { data: { deleted: attachments.length, failed: 0 }, error: null };
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
   * Get URL for file viewing
   * Automatically detects the correct bucket from the storage path
   * Uses public URL for public buckets, signed URL for private buckets
   */
  async getFileUrl(storagePath: string): Promise<ServiceResponse<string>> {
    try {
      // Detect bucket from path prefix
      let bucket = this.STORAGE_BUCKET; // default: 'client-attachments'
      let filePath = storagePath;
      let isPublicBucket = false;

      // If path starts with 'letter-pdfs/', use that bucket (public)
      if (storagePath.startsWith('letter-pdfs/')) {
        bucket = 'letter-pdfs';
        filePath = storagePath.replace('letter-pdfs/', '');
        isPublicBucket = true;
      }

      // For public buckets, use getPublicUrl (createSignedUrl doesn't work on public buckets)
      if (isPublicBucket) {
        const { data } = supabase.storage
          .from(bucket)
          .getPublicUrl(filePath);

        if (!data?.publicUrl) {
          throw new Error('Failed to generate public URL');
        }

        return { data: data.publicUrl, error: null };
      }

      // For private buckets, use createSignedUrl
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 3600); // Valid for 1 hour

      if (error || !data) {
        throw error || new Error('Failed to generate signed URL');
      }

      return { data: data.signedUrl, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Get signature as base64 data URI for PDF embedding
   * Returns null if signature doesn't exist or path is empty
   */
  async getSignatureAsBase64(storagePath: string | null): Promise<ServiceResponse<string | null>> {
    if (!storagePath) {
      return { data: null, error: null };
    }

    try {
      // Get signed URL first
      const urlResult = await this.getFileUrl(storagePath);
      if (urlResult.error || !urlResult.data) {
        return { data: null, error: urlResult.error };
      }

      // Fetch image and convert to base64
      const response = await fetch(urlResult.data);
      if (!response.ok) {
        throw new Error(`Failed to fetch signature: ${response.status}`);
      }

      const blob = await response.blob();
      const base64 = await this.blobToBase64(blob);

      return { data: base64, error: null };
    } catch (error) {
      console.error('Error converting signature to base64:', error);
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Convert Blob to base64 data URI
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
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

      // Use upsert to handle updates to existing PDFs (same storage_path)
      const { data, error: dbError } = await supabase
        .from(this.tableName)
        .upsert(attachmentData, { onConflict: 'storage_path' })
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
   * File letter PDF to client/group "letters" category
   * Links the existing PDF in letter-pdfs bucket to client_attachments
   * and updates generated_letters with filing info
   */
  async fileLetterPdf(params: {
    letterId: string;
    clientId: string | null;
    groupId: string | null;
    pdfUrl: string;
    letterSubject: string;
  }): Promise<ServiceResponse<ClientAttachment>> {
    try {
      const tenantId = await this.getTenantId();
      const userId = (await supabase.auth.getUser()).data.user?.id;

      if (!userId) {
        throw new Error('משתמש לא מחובר');
      }

      // Must have either client or group
      if (!params.clientId && !params.groupId) {
        throw new Error('חובה לבחור לקוח או קבוצה לשמירת ה-PDF');
      }

      // Generate descriptive file name
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const truncatedSubject = params.letterSubject.slice(0, 30).replace(/[^א-תa-zA-Z0-9\s]/g, '').trim();
      const fileName = `letter-${truncatedSubject}-${dateStr}-${timeStr}.pdf`;

      // Extract storage path from PDF URL
      // URL format: https://xxx.supabase.co/storage/v1/object/public/letter-pdfs/{tenant_id}/{filename}
      // Or: letter-pdfs/{tenant_id}/{filename}
      let storagePath = params.pdfUrl;
      if (params.pdfUrl.includes('/letter-pdfs/')) {
        const pathParts = params.pdfUrl.split('/letter-pdfs/');
        storagePath = 'letter-pdfs/' + pathParts[pathParts.length - 1];
      }
      // Remove cache-busting query params (e.g., ?t=123456)
      storagePath = storagePath.split('?')[0];

      // Check if storage path already exists, add suffix if needed
      const { count } = await supabase
        .from(this.tableName)
        .select('*', { count: 'exact', head: true })
        .eq('storage_path', storagePath);

      if (count && count > 0) {
        // Add version suffix: path.pdf → path-2.pdf
        const basePath = storagePath.replace('.pdf', '');
        storagePath = `${basePath}-${count + 1}.pdf`;
        console.log('📝 Storage path already exists, using versioned path:', storagePath);
      }

      // Create database record pointing to the PDF in letter-pdfs bucket
      const attachmentData: Record<string, unknown> = {
        tenant_id: tenantId,
        client_id: params.clientId,
        group_id: params.groupId,
        file_name: fileName,
        file_type: 'application/pdf' as FileType,
        file_size: 1, // Minimal size - actual size unknown
        storage_path: storagePath,
        file_category: 'letters' as FileCategory,
        description: params.letterSubject.slice(0, 50), // Max 50 chars
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

      // Update generated_letters with filing info
      const { error: updateError } = await supabase
        .from('generated_letters')
        .update({
          pdf_filed_at: now.toISOString(),
          pdf_filed_to_attachment_id: data.id,
          pdf_file_name: fileName
        })
        .eq('id', params.letterId)
        .eq('tenant_id', tenantId);

      if (updateError) {
        console.error('Error updating letter with filing info:', updateError);
        // Don't throw - the file was saved successfully
      }

      // Log action
      await this.logAction(
        'file_letter_pdf',
        data.id,
        {
          letter_id: params.letterId,
          file_name: fileName,
          client_id: params.clientId,
          group_id: params.groupId
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
        foreign_worker_docs: 0,
        protocols: 0,
        agreements: 0,
        letters: 0
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

  // ===================================
  // Move Files Between Categories
  // ===================================

  /**
   * Move a single file to a different category (database-only update)
   * Physical file stays in original storage location
   */
  async moveFileToCategory(
    fileId: string,
    targetCategory: FileCategory
  ): Promise<ServiceResponse<ClientAttachment>> {
    try {
      const tenantId = await this.getTenantId();

      // Validate target category exists
      if (!FILE_CATEGORIES[targetCategory]) {
        throw new Error('קטגוריה לא חוקית');
      }

      // Fetch current file to validate ownership and get current category
      const { data: existing, error: fetchError } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', fileId)
        .eq('tenant_id', tenantId)
        .single();

      if (fetchError || !existing) {
        throw new Error('קובץ לא נמצא');
      }

      // Check if already in target category (no-op)
      if (existing.file_category === targetCategory) {
        return { data: existing, error: null };
      }

      const fromCategory = existing.file_category;

      // Update file_category in database
      const { data, error: updateError } = await supabase
        .from(this.tableName)
        .update({ file_category: targetCategory })
        .eq('id', fileId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Log action for audit trail
      await this.logAction(
        'move_file_category',
        fileId,
        {
          file_name: existing.file_name,
          from_category: fromCategory,
          to_category: targetCategory,
          client_id: existing.client_id,
          group_id: existing.group_id
        }
      );

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }

  /**
   * Move multiple files to a different category (bulk operation)
   */
  async bulkMoveFilesToCategory(
    fileIds: string[],
    targetCategory: FileCategory
  ): Promise<ServiceResponse<{ moved: number; failed: number; errors: string[] }>> {
    try {
      const tenantId = await this.getTenantId();

      if (!fileIds.length) {
        return { data: { moved: 0, failed: 0, errors: [] }, error: null };
      }

      // Validate target category
      if (!FILE_CATEGORIES[targetCategory]) {
        throw new Error('קטגוריה לא חוקית');
      }

      // Fetch all files to validate ownership
      const { data: files, error: fetchError } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('tenant_id', tenantId)
        .in('id', fileIds);

      if (fetchError) {
        throw fetchError;
      }

      if (!files || files.length === 0) {
        throw new Error('קבצים לא נמצאו');
      }

      // Filter out files already in target category
      const filesToMove = files.filter(f => f.file_category !== targetCategory);
      const alreadyInCategory = files.length - filesToMove.length;

      if (filesToMove.length === 0) {
        return {
          data: {
            moved: 0,
            failed: 0,
            errors: alreadyInCategory > 0
              ? [`${alreadyInCategory} קבצים כבר נמצאים בקטגוריה זו`]
              : []
          },
          error: null
        };
      }

      // Bulk update
      const idsToMove = filesToMove.map(f => f.id);
      const { error: updateError } = await supabase
        .from(this.tableName)
        .update({ file_category: targetCategory })
        .eq('tenant_id', tenantId)
        .in('id', idsToMove);

      if (updateError) {
        throw updateError;
      }

      // Log action
      await this.logAction(
        'bulk_move_files_category',
        idsToMove[0],
        {
          count: filesToMove.length,
          file_names: filesToMove.map(f => f.file_name),
          to_category: targetCategory,
          skipped_already_in_category: alreadyInCategory
        }
      );

      return {
        data: {
          moved: filesToMove.length,
          failed: 0,
          errors: alreadyInCategory > 0
            ? [`${alreadyInCategory} קבצים כבר היו בקטגוריה זו`]
            : []
        },
        error: null
      };
    } catch (error) {
      return { data: null, error: this.handleError(error) };
    }
  }
}

// Export singleton instance
export const fileUploadService = new FileUploadService();
