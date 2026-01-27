/**
 * Protocol Service
 * Handles CRUD operations for meeting protocols, attendees, decisions, and content sections
 */

import { BaseService } from '@/services/base.service';
import type { ServiceResponse } from '@/services/base.service';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { fileUploadService } from '@/services/file-upload.service';
import { userService } from '@/services/user.service';
import type { ClientAttachment } from '@/types/file-attachment.types';
import type {
  Protocol,
  ProtocolWithRelations,
  CreateProtocolDto,
  UpdateProtocolDto,
  ProtocolAttendee,
  CreateAttendeeDto,
  ProtocolDecision,
  CreateDecisionDto,
  ProtocolContentSection,
  CreateContentSectionDto,
  ProtocolFormState,
  ItemStyle,
} from '../types/protocol.types';
import {
  RESPONSIBILITY_TYPES,
  CONTENT_SECTION_TYPES,
  getContentSectionTypeInfo,
  ITEM_STYLE_COLORS,
} from '../types/protocol.types';

/**
 * Generate inline CSS style string from ItemStyle
 */
function getInlineStyle(style?: ItemStyle): string {
  if (!style) return '';

  const styles: string[] = [];

  if (style.bold) {
    styles.push('font-weight: bold');
  }
  if (style.underline) {
    styles.push('text-decoration: underline');
  }
  if (style.color && style.color !== 'default') {
    const colorInfo = ITEM_STYLE_COLORS.find(c => c.value === style.color);
    if (colorInfo) {
      styles.push(`color: ${colorInfo.hex}`);
    }
  }

  return styles.length > 0 ? ` style="${styles.join('; ')}"` : '';
}

export class ProtocolService extends BaseService {
  constructor() {
    super('protocols');
  }

  // ============================================================================
  // Protocol CRUD
  // ============================================================================

  /**
   * Get all protocols for a client or group
   */
  async getProtocols(params: {
    clientId?: string;
    groupId?: string;
    status?: 'draft' | 'locked';
    page?: number;
    pageSize?: number;
  }): Promise<ServiceResponse<{ protocols: Protocol[]; total: number }>> {
    try {
      const tenantId = await this.getTenantId();
      const { clientId, groupId, status, page = 1, pageSize = 20 } = params;

      let query = supabase
        .from('protocols')
        .select(`
          *,
          client:clients(id, company_name, company_name_hebrew),
          group:client_groups(id, group_name_hebrew)
        `, { count: 'exact' })
        .eq('tenant_id', tenantId)
        .order('meeting_date', { ascending: false });

      if (clientId) {
        query = query.eq('client_id', clientId);
      }
      if (groupId) {
        query = query.eq('group_id', groupId);
      }
      if (status) {
        query = query.eq('status', status);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return {
        data: {
          protocols: data || [],
          total: count || 0,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Get a single protocol by ID with all relations
   */
  async getProtocolById(id: string): Promise<ServiceResponse<ProtocolWithRelations>> {
    try {
      const tenantId = await this.getTenantId();

      // Get protocol with client/group
      const { data: protocol, error: protocolError } = await supabase
        .from('protocols')
        .select(`
          *,
          client:clients(id, company_name, company_name_hebrew),
          group:client_groups(id, group_name_hebrew)
        `)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (protocolError || !protocol) {
        return { data: null, error: protocolError ? this.handleError(protocolError) : new Error('Protocol not found') };
      }

      // Get attendees
      const { data: attendees, error: attendeesError } = await supabase
        .from('protocol_attendees')
        .select('*')
        .eq('protocol_id', id)
        .order('created_at', { ascending: true });

      if (attendeesError) {
        logger.warn('Error fetching attendees:', attendeesError);
      }

      // Get decisions
      const { data: decisions, error: decisionsError } = await supabase
        .from('protocol_decisions')
        .select('*')
        .eq('protocol_id', id)
        .order('sort_order', { ascending: true });

      if (decisionsError) {
        logger.warn('Error fetching decisions:', decisionsError);
      }

      // Get content sections
      const { data: content_sections, error: contentError } = await supabase
        .from('protocol_content_sections')
        .select('*')
        .eq('protocol_id', id)
        .order('sort_order', { ascending: true });

      if (contentError) {
        logger.warn('Error fetching content sections:', contentError);
      }

      const result: ProtocolWithRelations = {
        ...protocol,
        attendees: attendees || [],
        decisions: decisions || [],
        content_sections: content_sections || [],
      };

      return { data: result, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Create a new protocol
   */
  async createProtocol(dto: CreateProtocolDto): Promise<ServiceResponse<Protocol>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('protocols')
        .insert({
          tenant_id: tenantId,
          client_id: dto.client_id || null,
          group_id: dto.group_id || null,
          meeting_date: dto.meeting_date,
          title: dto.title || null,
          status: 'draft',
          created_by: user?.id || null,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      await this.logAction('create_protocol', data.id, { client_id: dto.client_id, group_id: dto.group_id });

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update an existing protocol (only if not locked)
   */
  async updateProtocol(id: string, dto: UpdateProtocolDto): Promise<ServiceResponse<Protocol>> {
    try {
      const tenantId = await this.getTenantId();

      // Check if protocol is locked
      const { data: existing, error: checkError } = await supabase
        .from('protocols')
        .select('status')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (checkError || !existing) {
        return { data: null, error: new Error('Protocol not found') };
      }

      if (existing.status === 'locked') {
        return { data: null, error: new Error('Cannot update a locked protocol') };
      }

      const { data, error } = await supabase
        .from('protocols')
        .update({
          meeting_date: dto.meeting_date,
          title: dto.title,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      await this.logAction('update_protocol', id, dto);

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Delete a protocol (only if not locked)
   */
  async deleteProtocol(id: string): Promise<ServiceResponse<void>> {
    try {
      const tenantId = await this.getTenantId();

      // Check if protocol is locked
      const { data: existing, error: checkError } = await supabase
        .from('protocols')
        .select('status')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (checkError || !existing) {
        return { data: null, error: new Error('Protocol not found') };
      }

      if (existing.status === 'locked') {
        return { data: null, error: new Error('Cannot delete a locked protocol') };
      }

      const { error } = await supabase
        .from('protocols')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      await this.logAction('delete_protocol', id);

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ============================================================================
  // Protocol Lifecycle
  // ============================================================================

  /**
   * Lock a protocol (make it read-only)
   */
  async lockProtocol(id: string): Promise<ServiceResponse<Protocol>> {
    try {
      const tenantId = await this.getTenantId();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('protocols')
        .update({
          status: 'locked',
          locked_at: new Date().toISOString(),
          locked_by: user?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .eq('status', 'draft')
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      await this.logAction('lock_protocol', id);

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Duplicate a protocol (creates a new draft with the same content)
   */
  async duplicateProtocol(id: string): Promise<ServiceResponse<Protocol>> {
    try {
      const { data: original, error: fetchError } = await this.getProtocolById(id);

      if (fetchError || !original) {
        return { data: null, error: fetchError || new Error('Protocol not found') };
      }

      // Create new protocol
      const { data: newProtocol, error: createError } = await this.createProtocol({
        client_id: original.client_id,
        group_id: original.group_id,
        meeting_date: new Date().toISOString().split('T')[0],
        title: original.title ? `${original.title} (עותק)` : null,
      });

      if (createError || !newProtocol) {
        return { data: null, error: createError };
      }

      // Copy attendees
      for (const attendee of original.attendees) {
        await this.addAttendee(newProtocol.id, {
          source_type: attendee.source_type,
          contact_id: attendee.contact_id,
          user_id: attendee.user_id,
          display_name: attendee.display_name,
          role_title: attendee.role_title,
        });
      }

      // Copy decisions
      for (const decision of original.decisions) {
        await this.addDecision(newProtocol.id, {
          content: decision.content,
          urgency: decision.urgency,
          responsibility_type: decision.responsibility_type,
          assigned_employee_id: decision.assigned_employee_id,
          assigned_other_name: decision.assigned_other_name,
          audit_report_year: decision.audit_report_year,
          sort_order: decision.sort_order,
          style: decision.style,
        });
      }

      // Copy content sections
      for (const section of original.content_sections) {
        await this.addContentSection(newProtocol.id, {
          section_type: section.section_type,
          content: section.content,
          sort_order: section.sort_order,
          style: section.style,
        });
      }

      await this.logAction('duplicate_protocol', newProtocol.id, { original_id: id });

      return { data: newProtocol, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ============================================================================
  // Attendees
  // ============================================================================

  /**
   * Add an attendee to a protocol
   */
  async addAttendee(protocolId: string, dto: CreateAttendeeDto): Promise<ServiceResponse<ProtocolAttendee>> {
    try {
      const { data, error } = await supabase
        .from('protocol_attendees')
        .insert({
          protocol_id: protocolId,
          source_type: dto.source_type,
          contact_id: dto.contact_id || null,
          user_id: dto.user_id || null,
          display_name: dto.display_name,
          role_title: dto.role_title || null,
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Remove an attendee from a protocol
   */
  async removeAttendee(attendeeId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('protocol_attendees')
        .delete()
        .eq('id', attendeeId);

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ============================================================================
  // Decisions
  // ============================================================================

  /**
   * Add a decision to a protocol
   */
  async addDecision(protocolId: string, dto: CreateDecisionDto): Promise<ServiceResponse<ProtocolDecision>> {
    try {
      const { data, error } = await supabase
        .from('protocol_decisions')
        .insert({
          protocol_id: protocolId,
          content: dto.content,
          urgency: dto.urgency || 'normal',
          responsibility_type: dto.responsibility_type,
          assigned_employee_id: dto.assigned_employee_id || null,
          assigned_other_name: dto.assigned_other_name || null,
          audit_report_year: dto.audit_report_year || null,
          sort_order: dto.sort_order || 0,
          style: dto.style || {},
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update a decision
   */
  async updateDecision(decisionId: string, dto: Partial<CreateDecisionDto>): Promise<ServiceResponse<ProtocolDecision>> {
    try {
      const { data, error } = await supabase
        .from('protocol_decisions')
        .update(dto)
        .eq('id', decisionId)
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Remove a decision from a protocol
   */
  async removeDecision(decisionId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('protocol_decisions')
        .delete()
        .eq('id', decisionId);

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ============================================================================
  // Content Sections
  // ============================================================================

  /**
   * Add a content section to a protocol
   */
  async addContentSection(protocolId: string, dto: CreateContentSectionDto): Promise<ServiceResponse<ProtocolContentSection>> {
    try {
      const { data, error } = await supabase
        .from('protocol_content_sections')
        .insert({
          protocol_id: protocolId,
          section_type: dto.section_type,
          content: dto.content,
          sort_order: dto.sort_order || 0,
          style: dto.style || {},
        })
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Update a content section
   */
  async updateContentSection(sectionId: string, dto: Partial<CreateContentSectionDto>): Promise<ServiceResponse<ProtocolContentSection>> {
    try {
      const { data, error } = await supabase
        .from('protocol_content_sections')
        .update(dto)
        .eq('id', sectionId)
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Remove a content section from a protocol
   */
  async removeContentSection(sectionId: string): Promise<ServiceResponse<void>> {
    try {
      const { error } = await supabase
        .from('protocol_content_sections')
        .delete()
        .eq('id', sectionId);

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Save the complete protocol form (creates/updates protocol with all relations)
   */
  async saveProtocolForm(
    protocolId: string | null,
    clientId: string | null,
    groupId: string | null,
    formState: ProtocolFormState
  ): Promise<ServiceResponse<Protocol>> {
    try {
      let protocol: Protocol;

      if (protocolId) {
        // Update existing protocol
        const { data, error } = await this.updateProtocol(protocolId, {
          meeting_date: formState.meeting_date,
          title: formState.title || null,
        });

        if (error || !data) {
          return { data: null, error: error || new Error('Failed to update protocol') };
        }

        protocol = data;

        // Delete existing sub-entities
        await supabase.from('protocol_attendees').delete().eq('protocol_id', protocolId);
        await supabase.from('protocol_decisions').delete().eq('protocol_id', protocolId);
        await supabase.from('protocol_content_sections').delete().eq('protocol_id', protocolId);
      } else {
        // Create new protocol
        const { data, error } = await this.createProtocol({
          client_id: clientId,
          group_id: groupId,
          meeting_date: formState.meeting_date,
          title: formState.title || null,
        });

        if (error || !data) {
          return { data: null, error: error || new Error('Failed to create protocol') };
        }

        protocol = data;
      }

      // Add attendees
      for (const attendee of formState.attendees) {
        await this.addAttendee(protocol.id, attendee);
      }

      // Add decisions
      for (let i = 0; i < formState.decisions.length; i++) {
        await this.addDecision(protocol.id, {
          ...formState.decisions[i],
          sort_order: i,
        });
      }

      // Add content sections
      for (let i = 0; i < formState.content_sections.length; i++) {
        await this.addContentSection(protocol.id, {
          ...formState.content_sections[i],
          sort_order: i,
        });
      }

      return { data: protocol, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ============================================================================
  // PDF Generation
  // ============================================================================

  /**
   * Update protocol with PDF URL
   */
  async updatePdfUrl(protocolId: string, pdfUrl: string): Promise<ServiceResponse<Protocol>> {
    try {
      const tenantId = await this.getTenantId();

      const { data, error } = await supabase
        .from('protocols')
        .update({
          pdf_url: pdfUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', protocolId)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) {
        return { data: null, error: this.handleError(error) };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ============================================================================
  // PDF Generation
  // ============================================================================

  /**
   * Generate HTML content for a protocol (for PDF generation)
   */
  generateProtocolHtml(protocol: ProtocolWithRelations, employeeNameMap: Record<string, string> = {}): string {
    const recipientName = protocol.client
      ? protocol.client.company_name_hebrew || protocol.client.company_name
      : protocol.group
        ? protocol.group.group_name_hebrew || ''
        : '';

    const meetingDate = format(new Date(protocol.meeting_date), 'EEEE, dd בMMMM yyyy', { locale: he });

    // Group decisions by responsibility type
    const groupedDecisions = RESPONSIBILITY_TYPES.map((typeInfo) => ({
      ...typeInfo,
      decisions: protocol.decisions.filter((d) => d.responsibility_type === typeInfo.type),
    })).filter((g) => g.decisions.length > 0);

    // Group content sections by type
    const groupedSections = CONTENT_SECTION_TYPES.map((typeInfo) => ({
      ...typeInfo,
      sections: protocol.content_sections.filter((s) => s.section_type === typeInfo.type),
    })).filter((g) => g.sections.length > 0);

    // Generate attendees HTML (without role titles per user request)
    const attendeesHtml = protocol.attendees.length > 0
      ? `
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 16px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">משתתפים</h2>
          <ul style="margin: 0; padding-right: 20px; list-style-type: disc;">
            ${protocol.attendees.map((a) => `<li style="margin-bottom: 5px;">${a.display_name}</li>`).join('')}
          </ul>
        </div>
      `
      : '';

    // Generate decisions HTML
    const decisionsHtml = groupedDecisions.length > 0
      ? `
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 16px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">החלטות</h2>
          ${groupedDecisions.map((group) => {
            const bgColor = group.type === 'office' ? '#fef2f2' :
                           group.type === 'client' ? '#fefce8' :
                           group.type === 'bookkeeper' ? '#f0fdf4' : '#f9fafb';
            const borderColor = group.type === 'office' ? '#fecaca' :
                               group.type === 'client' ? '#fef08a' :
                               group.type === 'bookkeeper' ? '#bbf7d0' : '#e5e7eb';
            return `
              <div style="background: ${bgColor}; border: 2px solid ${borderColor}; border-radius: 8px; padding: 12px; margin-bottom: 12px;">
                <h3 style="font-size: 14px; font-weight: bold; margin-bottom: 8px;">${group.label}</h3>
                <ol style="margin: 0; padding-right: 20px;">
                  ${group.decisions.map((d) => `
                    <li style="margin-bottom: 8px;">
                      <span${getInlineStyle(d.style)}>${d.content}</span>
                      ${d.urgency === 'urgent' ? '<span style="color: #dc2626; font-weight: bold; margin-right: 8px;"> (דחוף)</span>' : ''}
                      ${d.assigned_employee_id && employeeNameMap[d.assigned_employee_id] ? `<span style="color: #2563eb; font-size: 12px;"> - אחראי: ${employeeNameMap[d.assigned_employee_id]}</span>` : ''}
                      ${d.assigned_other_name ? `<span style="color: #6b7280; font-size: 12px;"> - ${d.assigned_other_name}</span>` : ''}
                      ${d.audit_report_year ? `<span style="color: #6b7280; font-size: 12px;"> (דוח ${d.audit_report_year})</span>` : ''}
                    </li>
                  `).join('')}
                </ol>
              </div>
            `;
          }).join('')}
        </div>
      `
      : '';

    // Generate content sections HTML
    const contentSectionsHtml = groupedSections.length > 0
      ? `
        <div style="margin-bottom: 20px;">
          <h2 style="font-size: 16px; margin-bottom: 10px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">תוכן נוסף</h2>
          ${groupedSections.map((group) => {
            const sectionTypeInfo = getContentSectionTypeInfo(group.type);
            return `
              <div style="margin-bottom: 15px;">
                <h3 style="font-size: 14px; font-weight: bold; margin-bottom: 8px;">${sectionTypeInfo.labelPlural}</h3>
                ${group.sections.map((s) => `
                  <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 8px;">
                    <p style="margin: 0; white-space: pre-wrap;"${getInlineStyle(s.style)}>${s.content}</p>
                  </div>
                `).join('')}
              </div>
            `;
          }).join('')}
        </div>
      `
      : '';

    // Full HTML document
    return `
      <div dir="rtl" style="font-family: 'David Libre', 'Heebo', 'Assistant', serif; padding: 20px; max-width: 700px; margin: 0 auto;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-size: 24px; margin-bottom: 10px;">פרוטוקול פגישה</h1>
          <p style="font-size: 18px; color: #374151;">${recipientName}</p>
        </div>

        <!-- Meeting Details -->
        <div style="background: #f9fafb; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 0;"><strong>תאריך פגישה:</strong> ${meetingDate}</p>
          ${protocol.title ? `<p style="margin: 8px 0 0 0;"><strong>נושא:</strong> ${protocol.title}</p>` : ''}
        </div>

        ${attendeesHtml}
        ${decisionsHtml}
        ${contentSectionsHtml}

        <!-- Footer -->
        <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #9ca3af;">
          <p>נוצר: ${format(new Date(protocol.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}</p>
          ${protocol.locked_at ? `<p>ננעל: ${format(new Date(protocol.locked_at), 'dd/MM/yyyy HH:mm', { locale: he })}</p>` : ''}
        </div>
      </div>
    `;
  }

  /**
   * Generate PDF for a protocol using the Edge Function
   */
  async generateProtocolPdf(protocolId: string): Promise<ServiceResponse<{ pdfUrl: string; fileName: string }>> {
    try {
      const tenantId = await this.getTenantId();

      // Get protocol with relations
      const { data: protocol, error: fetchError } = await this.getProtocolById(protocolId);
      if (fetchError || !protocol) {
        return { data: null, error: fetchError || new Error('Protocol not found') };
      }

      // Load employees for displaying assigned employee names
      let employeeNameMap: Record<string, string> = {};
      const { data: employeesData } = await userService.getUsers();
      if (employeesData) {
        employeeNameMap = employeesData.users.reduce<Record<string, string>>((acc, emp) => {
          acc[emp.id] = emp.full_name;
          return acc;
        }, {});
      }

      // Generate HTML content
      const htmlContent = this.generateProtocolHtml(protocol, employeeNameMap);

      // Get recipient name for filename
      const recipientName = protocol.client
        ? protocol.client.company_name_hebrew || protocol.client.company_name
        : protocol.group
          ? protocol.group.group_name_hebrew || ''
          : '';

      // Create a temporary record in generated_letters for the Edge Function
      const { data: letterRecord, error: insertError } = await supabase
        .from('generated_letters')
        .insert({
          tenant_id: tenantId,
          client_id: protocol.client_id,
          group_id: protocol.group_id,
          template_type: 'protocols_meeting',  // Starts with 'protocols_' for standalone template detection
          subject: `פרוטוקול פגישה - ${recipientName}`,
          generated_content_html: htmlContent,
          variables_used: {
            protocol_id: protocolId,
            recipient_name: recipientName,
            meeting_date: protocol.meeting_date,
          },
          status: 'saved',  // Mark as saved (valid status: draft, saved, sent_email, sent_whatsapp, sent_print, cancelled)
        })
        .select()
        .single();

      if (insertError || !letterRecord) {
        logger.error('Failed to create letter record for PDF:', insertError);
        return { data: null, error: insertError || new Error('Failed to create letter record') };
      }

      // Call the Edge Function to generate PDF
      const { data: pdfResult, error: pdfError } = await supabase.functions.invoke('generate-pdf', {
        body: { letterId: letterRecord.id },
      });

      if (pdfError || !pdfResult?.success) {
        logger.error('PDF generation failed:', pdfError || pdfResult?.error);
        // Clean up the letter record
        await supabase.from('generated_letters').delete().eq('id', letterRecord.id);
        return { data: null, error: new Error(pdfResult?.error || 'PDF generation failed') };
      }

      // Update protocol with PDF URL
      await this.updatePdfUrl(protocolId, pdfResult.pdfUrl);

      // Log the action
      await this.logAction('generate_protocol_pdf', protocolId, { letterId: letterRecord.id });

      return {
        data: {
          pdfUrl: pdfResult.pdfUrl,
          fileName: pdfResult.fileName,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  /**
   * Save protocol PDF to the file manager
   */
  async saveProtocolToFileManager(
    protocolId: string,
    pdfUrl: string,
    clientId: string | null,
    groupId: string | null
  ): Promise<ServiceResponse<ClientAttachment>> {
    try {
      // Get protocol for descriptive info
      const { data: protocol, error: fetchError } = await this.getProtocolById(protocolId);
      if (fetchError || !protocol) {
        return { data: null, error: fetchError || new Error('Protocol not found') };
      }

      const recipientName = protocol.client
        ? protocol.client.company_name_hebrew || protocol.client.company_name
        : protocol.group
          ? protocol.group.group_name_hebrew || ''
          : '';

      // Build filename
      const dateStr = format(new Date(protocol.meeting_date), 'dd-MM-yyyy');
      const fileName = `protocol-${recipientName}-${dateStr}.pdf`;

      // Extract storage path from PDF URL
      // URL format: https://xxx.supabase.co/storage/v1/object/public/letter-pdfs/{filename}
      let storagePath = pdfUrl;
      if (pdfUrl.includes('/letter-pdfs/')) {
        const pathParts = pdfUrl.split('/letter-pdfs/');
        storagePath = 'letter-pdfs/' + pathParts[pathParts.length - 1];
      }
      // Remove cache-busting query params
      storagePath = storagePath.split('?')[0];

      // If we have a client, save to client's file manager
      if (clientId) {
        const result = await fileUploadService.savePdfReference(
          clientId,
          storagePath,
          fileName,
          'protocols',
          protocol.title || `פרוטוקול פגישה - ${dateStr}`
        );
        return result;
      }

      // If we have a group, save to group's file manager
      if (groupId) {
        const tenantId = await this.getTenantId();
        const userId = (await supabase.auth.getUser()).data.user?.id;

        const { data, error } = await supabase
          .from('client_attachments')
          .insert({
            tenant_id: tenantId,
            client_id: null,
            group_id: groupId,
            file_name: fileName,
            file_type: 'application/pdf',
            file_size: 1,
            storage_path: storagePath,
            file_category: 'protocols',
            description: protocol.title || `פרוטוקול פגישה - ${dateStr}`,
            upload_context: 'client_form',
            version: 1,
            is_latest: true,
            uploaded_by: userId,
          })
          .select()
          .single();

        if (error) {
          return { data: null, error: this.handleError(error) };
        }

        await this.logAction('save_protocol_to_file_manager', protocolId, { groupId, attachmentId: data.id });

        return { data, error: null };
      }

      return { data: null, error: new Error('No client or group specified') };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }

  // ============================================================================
  // Email Sending
  // ============================================================================

  /**
   * Send protocol via email using simpleMode
   * First generates PDF if needed, then sends email with PDF info
   */
  async sendProtocolByEmail(
    protocolId: string,
    recipientEmails: string[],
    recipientName: string
  ): Promise<ServiceResponse<void>> {
    try {
      // Get protocol with relations
      const { data: protocol, error: fetchError } = await this.getProtocolById(protocolId);
      if (fetchError || !protocol) {
        return { data: null, error: fetchError || new Error('Protocol not found') };
      }

      // Generate PDF if not already generated
      let pdfUrl = protocol.pdf_url;
      if (!pdfUrl) {
        const { data: pdfData, error: pdfError } = await this.generateProtocolPdf(protocolId);
        if (pdfError || !pdfData) {
          return { data: null, error: pdfError || new Error('PDF generation failed') };
        }
        pdfUrl = pdfData.pdfUrl;
      }

      // Format meeting date for email
      const meetingDate = format(new Date(protocol.meeting_date), 'dd/MM/yyyy', { locale: he });

      // Build email content
      const subject = `פרוטוקול פגישה - ${recipientName} - ${meetingDate}`;
      const emailContent = `שלום,

מצורף פרוטוקול הפגישה מתאריך ${meetingDate}.

לצפייה בפרוטוקול: ${pdfUrl}

${protocol.title ? `נושא הפגישה: ${protocol.title}` : ''}

בברכה,
צוות TicoVision`;

      // Send via Edge Function (simpleMode)
      const { error: sendError } = await supabase.functions.invoke('send-letter', {
        body: {
          recipientEmails,
          recipientName,
          subject,
          customText: emailContent,
          simpleMode: true,
          clientId: protocol.client_id,
        },
      });

      if (sendError) {
        logger.error('Email sending failed:', sendError);
        return { data: null, error: new Error('שליחת האימייל נכשלה') };
      }

      // Log the action
      await this.logAction('send_protocol_email', protocolId, {
        recipientEmails,
        recipientName
      });

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: this.handleError(error as Error) };
    }
  }
}

// Export singleton instance
export const protocolService = new ProtocolService();
