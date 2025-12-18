/**
 * Capital Declaration Public Service
 * Handles public (unauthenticated) operations for the client portal
 */

import { supabase } from '@/lib/supabase';
import type {
  PublicDeclarationData,
  CapitalDeclarationDocument,
  CapitalDeclarationCategory,
  CategoryDocumentCount,
} from '@/types/capital-declaration.types';

const STORAGE_BUCKET = 'capital-declarations';
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

class CapitalDeclarationPublicServiceClass {
  /**
   * Get declaration data by public token
   */
  async getByToken(token: string): Promise<PublicDeclarationData | null> {
    try {
      // Get declaration via RPC (bypasses RLS for public access)
      const { data: declData, error: declError } = await supabase.rpc(
        'get_declaration_by_token',
        { p_token: token }
      );

      if (declError || !declData || declData.length === 0) {
        console.error('Declaration not found:', declError);
        return null;
      }

      const declaration = declData[0];

      // Track portal access
      await supabase.rpc('track_declaration_portal_access', { p_token: token });

      // Get documents for this declaration
      const { data: documents, error: docsError } = await supabase
        .from('capital_declaration_documents')
        .select('*')
        .eq('declaration_id', declaration.id)
        .order('category')
        .order('uploaded_at', { ascending: false });

      if (docsError) {
        console.error('Error fetching documents:', docsError);
      }

      // Calculate category counts
      const categoryMap = new Map<CapitalDeclarationCategory, number>();
      (documents || []).forEach((doc) => {
        const current = categoryMap.get(doc.category as CapitalDeclarationCategory) || 0;
        categoryMap.set(doc.category as CapitalDeclarationCategory, current + 1);
      });

      const category_counts: CategoryDocumentCount[] = Array.from(categoryMap.entries()).map(
        ([category, count]) => ({ category, count })
      );

      return {
        id: declaration.id,
        tenant_id: declaration.tenant_id,
        contact_name: declaration.contact_name,
        tax_year: declaration.tax_year,
        declaration_date: declaration.declaration_date,
        status: declaration.status,
        portal_accessed_at: declaration.portal_accessed_at,
        tenant_name: declaration.tenant_name,
        documents: (documents || []) as CapitalDeclarationDocument[],
        category_counts,
      };
    } catch (error) {
      console.error('Error in getByToken:', error);
      return null;
    }
  }

  /**
   * Upload document to declaration (public access)
   */
  async uploadDocument(
    token: string,
    file: File,
    category: CapitalDeclarationCategory,
    notes?: string
  ): Promise<{ success: boolean; error?: string; document?: CapitalDeclarationDocument }> {
    try {
      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        return { success: false, error: 'סוג קובץ לא נתמך. יש להעלות PDF או תמונה' };
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return { success: false, error: 'הקובץ גדול מדי. גודל מקסימלי: 15MB' };
      }

      // Get declaration by token
      const { data: declData } = await supabase.rpc('get_declaration_by_token', {
        p_token: token,
      });

      if (!declData || declData.length === 0) {
        return { success: false, error: 'הצהרה לא נמצאה' };
      }

      const declaration = declData[0];

      // Generate unique filename
      const timestamp = Date.now();
      const ext = file.name.split('.').pop();
      // Clean filename - remove Hebrew, Arabic, and special characters
      const sanitizedName = file.name
        .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII
        .replace(/[^a-zA-Z0-9.-]/g, '-')
        .slice(0, 50);
      const fileName = `${timestamp}-${sanitizedName || `file.${ext}`}`;
      const storagePath = `${declaration.id}/${category}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return { success: false, error: 'שגיאה בהעלאת הקובץ' };
      }

      // Insert document record
      const { data: document, error: insertError } = await supabase
        .from('capital_declaration_documents')
        .insert({
          tenant_id: declaration.tenant_id,
          declaration_id: declaration.id,
          category,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: storagePath,
          notes: notes || null,
        })
        .select()
        .single();

      if (insertError) {
        // Rollback storage upload
        await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
        console.error('Insert error:', insertError);
        return { success: false, error: 'שגיאה בשמירת המסמך' };
      }

      return { success: true, document: document as CapitalDeclarationDocument };
    } catch (error) {
      console.error('Upload error:', error);
      return { success: false, error: 'שגיאה בהעלאת הקובץ' };
    }
  }

  /**
   * Delete document (public access via token)
   */
  async deleteDocument(
    token: string,
    documentId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify token matches document's declaration
      const { data: declData } = await supabase.rpc('get_declaration_by_token', {
        p_token: token,
      });

      if (!declData || declData.length === 0) {
        return { success: false, error: 'הצהרה לא נמצאה' };
      }

      const declaration = declData[0];

      // Get document
      const { data: doc, error: fetchError } = await supabase
        .from('capital_declaration_documents')
        .select('*')
        .eq('id', documentId)
        .eq('declaration_id', declaration.id)
        .single();

      if (fetchError || !doc) {
        return { success: false, error: 'מסמך לא נמצא' };
      }

      // Delete from storage
      await supabase.storage.from(STORAGE_BUCKET).remove([doc.storage_path]);

      // Delete from database
      const { error: deleteError } = await supabase
        .from('capital_declaration_documents')
        .delete()
        .eq('id', documentId);

      if (deleteError) {
        return { success: false, error: 'שגיאה במחיקת המסמך' };
      }

      return { success: true };
    } catch (error) {
      console.error('Delete error:', error);
      return { success: false, error: 'שגיאה במחיקת המסמך' };
    }
  }

  /**
   * Get signed URL for document preview/download (public access)
   */
  async getDocumentUrl(
    token: string,
    documentId: string
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Verify token matches document's declaration
      const { data: declData } = await supabase.rpc('get_declaration_by_token', {
        p_token: token,
      });

      if (!declData || declData.length === 0) {
        return { success: false, error: 'הצהרה לא נמצאה' };
      }

      const declaration = declData[0];

      // Get document
      const { data: doc } = await supabase
        .from('capital_declaration_documents')
        .select('storage_path')
        .eq('id', documentId)
        .eq('declaration_id', declaration.id)
        .single();

      if (!doc) {
        return { success: false, error: 'מסמך לא נמצא' };
      }

      // Generate signed URL
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(doc.storage_path, 3600); // 1 hour

      if (error || !data) {
        return { success: false, error: 'שגיאה ביצירת קישור' };
      }

      return { success: true, url: data.signedUrl };
    } catch (error) {
      console.error('Get URL error:', error);
      return { success: false, error: 'שגיאה ביצירת קישור' };
    }
  }
}

// Export singleton instance
export const capitalDeclarationPublicService = new CapitalDeclarationPublicServiceClass();
