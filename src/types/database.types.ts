export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      actual_payments: {
        Row: {
          amount_before_vat: number
          amount_paid: number
          amount_vat: number
          amount_with_vat: number
          applied_discount_percent: number | null
          attachment_ids: string[] | null
          billing_letter_id: string | null
          client_id: string
          created_at: string
          created_by: string | null
          fee_calculation_id: string | null
          group_calculation_id: string | null
          id: string
          notes: string | null
          num_installments: number | null
          payment_date: string
          payment_method: string
          payment_reference: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount_before_vat: number
          amount_paid: number
          amount_vat: number
          amount_with_vat: number
          applied_discount_percent?: number | null
          attachment_ids?: string[] | null
          billing_letter_id?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          fee_calculation_id?: string | null
          group_calculation_id?: string | null
          id?: string
          notes?: string | null
          num_installments?: number | null
          payment_date: string
          payment_method: string
          payment_reference?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount_before_vat?: number
          amount_paid?: number
          amount_vat?: number
          amount_with_vat?: number
          applied_discount_percent?: number | null
          attachment_ids?: string[] | null
          billing_letter_id?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          fee_calculation_id?: string | null
          group_calculation_id?: string | null
          id?: string
          notes?: string | null
          num_installments?: number | null
          payment_date?: string
          payment_method?: string
          payment_reference?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actual_payments_billing_letter_id_fkey"
            columns: ["billing_letter_id"]
            isOneToOne: false
            referencedRelation: "billing_letters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actual_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actual_payments_fee_calculation_id_fkey"
            columns: ["fee_calculation_id"]
            isOneToOne: false
            referencedRelation: "fee_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actual_payments_fee_calculation_id_fkey"
            columns: ["fee_calculation_id"]
            isOneToOne: false
            referencedRelation: "fee_tracking_enhanced_view"
            referencedColumns: ["fee_calculation_id"]
          },
          {
            foreignKeyName: "actual_payments_group_calculation_id_fkey"
            columns: ["group_calculation_id"]
            isOneToOne: false
            referencedRelation: "group_fee_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actual_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      annual_balance_sheets: {
        Row: {
          advance_rate_alert: boolean | null
          advances_letter_id: string | null
          advances_updated_at: string | null
          auditor_confirmed: boolean | null
          auditor_confirmed_at: string | null
          auditor_id: string | null
          backup_link: string | null
          calculated_advance_rate: number | null
          client_id: string
          created_at: string | null
          current_advance_rate: number | null
          debt_letter_id: string | null
          debt_letter_sent: boolean | null
          id: string
          is_active: boolean | null
          materials_received_at: string | null
          materials_received_by: string | null
          meeting_date: string | null
          new_advances_amount: number | null
          notes: string | null
          office_approved_at: string | null
          office_approved_by: string | null
          report_transmitted_at: string | null
          status: string
          tax_amount: number | null
          tax_coding: string | null
          tenant_id: string
          turnover: number | null
          updated_at: string | null
          work_completed_at: string | null
          work_started_at: string | null
          year: number
        }
        Insert: {
          advance_rate_alert?: boolean | null
          advances_letter_id?: string | null
          advances_updated_at?: string | null
          auditor_confirmed?: boolean | null
          auditor_confirmed_at?: string | null
          auditor_id?: string | null
          backup_link?: string | null
          calculated_advance_rate?: number | null
          client_id: string
          created_at?: string | null
          current_advance_rate?: number | null
          debt_letter_id?: string | null
          debt_letter_sent?: boolean | null
          id?: string
          is_active?: boolean | null
          materials_received_at?: string | null
          materials_received_by?: string | null
          meeting_date?: string | null
          new_advances_amount?: number | null
          notes?: string | null
          office_approved_at?: string | null
          office_approved_by?: string | null
          report_transmitted_at?: string | null
          status?: string
          tax_amount?: number | null
          tax_coding?: string | null
          tenant_id: string
          turnover?: number | null
          updated_at?: string | null
          work_completed_at?: string | null
          work_started_at?: string | null
          year: number
        }
        Update: {
          advance_rate_alert?: boolean | null
          advances_letter_id?: string | null
          advances_updated_at?: string | null
          auditor_confirmed?: boolean | null
          auditor_confirmed_at?: string | null
          auditor_id?: string | null
          backup_link?: string | null
          calculated_advance_rate?: number | null
          client_id?: string
          created_at?: string | null
          current_advance_rate?: number | null
          debt_letter_id?: string | null
          debt_letter_sent?: boolean | null
          id?: string
          is_active?: boolean | null
          materials_received_at?: string | null
          materials_received_by?: string | null
          meeting_date?: string | null
          new_advances_amount?: number | null
          notes?: string | null
          office_approved_at?: string | null
          office_approved_by?: string | null
          report_transmitted_at?: string | null
          status?: string
          tax_amount?: number | null
          tax_coding?: string | null
          tenant_id?: string
          turnover?: number | null
          updated_at?: string | null
          work_completed_at?: string | null
          work_started_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "annual_balance_sheets_advances_letter_id_fkey"
            columns: ["advances_letter_id"]
            isOneToOne: false
            referencedRelation: "generated_letters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_balance_sheets_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_balance_sheets_debt_letter_id_fkey"
            columns: ["debt_letter_id"]
            isOneToOne: false
            referencedRelation: "generated_letters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "annual_balance_sheets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown
          module: string
          resource_id: string | null
          resource_type: string | null
          tenant_id: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          module: string
          resource_id?: string | null
          resource_type?: string | null
          tenant_id: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          module?: string
          resource_id?: string | null
          resource_type?: string | null
          tenant_id?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_audit_logs_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_chat_messages: {
        Row: {
          balance_id: string
          content: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          message_type: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          balance_id: string
          content: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          message_type?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          balance_id?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          message_type?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_chat_messages_balance_id_fkey"
            columns: ["balance_id"]
            isOneToOne: false
            referencedRelation: "annual_balance_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_chat_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_sheet_status_history: {
        Row: {
          balance_sheet_id: string
          changed_at: string | null
          changed_by: string
          from_status: string | null
          id: string
          note: string | null
          tenant_id: string
          to_status: string
        }
        Insert: {
          balance_sheet_id: string
          changed_at?: string | null
          changed_by: string
          from_status?: string | null
          id?: string
          note?: string | null
          tenant_id: string
          to_status: string
        }
        Update: {
          balance_sheet_id?: string
          changed_at?: string | null
          changed_by?: string
          from_status?: string | null
          id?: string
          note?: string | null
          tenant_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_sheet_status_history_balance_sheet_id_fkey"
            columns: ["balance_sheet_id"]
            isOneToOne: false
            referencedRelation: "annual_balance_sheets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_sheet_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_letters: {
        Row: {
          actual_payment_id: string | null
          amount_after_discount: number | null
          amount_before_vat: number
          bank_discount_percentage: number
          billing_subject: string | null
          client_id: string
          created_at: string
          created_by: string | null
          due_date: string | null
          generated_letter_id: string | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_reference: string | null
          reminder_count: number
          sent_at: string | null
          sent_manually: boolean
          sent_method: string | null
          service_description: string
          status: string
          tenant_id: string
          total_amount: number
          updated_at: string
          vat_amount: number
          vat_rate: number
        }
        Insert: {
          actual_payment_id?: string | null
          amount_after_discount?: number | null
          amount_before_vat: number
          bank_discount_percentage?: number
          billing_subject?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          generated_letter_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          reminder_count?: number
          sent_at?: string | null
          sent_manually?: boolean
          sent_method?: string | null
          service_description: string
          status?: string
          tenant_id: string
          total_amount: number
          updated_at?: string
          vat_amount: number
          vat_rate?: number
        }
        Update: {
          actual_payment_id?: string | null
          amount_after_discount?: number | null
          amount_before_vat?: number
          bank_discount_percentage?: number
          billing_subject?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          generated_letter_id?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          reminder_count?: number
          sent_at?: string | null
          sent_manually?: boolean
          sent_method?: string | null
          service_description?: string
          status?: string
          tenant_id?: string
          total_amount?: number
          updated_at?: string
          vat_amount?: number
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_letters_actual_payment_id_fkey"
            columns: ["actual_payment_id"]
            isOneToOne: false
            referencedRelation: "actual_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_letters_actual_payment_id_fkey"
            columns: ["actual_payment_id"]
            isOneToOne: false
            referencedRelation: "fee_tracking_enhanced_view"
            referencedColumns: ["actual_payment_id"]
          },
          {
            foreignKeyName: "billing_letters_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_letters_generated_letter_id_fkey"
            columns: ["generated_letter_id"]
            isOneToOne: false
            referencedRelation: "generated_letters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_letters_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_recipients: {
        Row: {
          broadcast_id: string
          client_id: string
          contact_id: string | null
          created_at: string
          email: string
          error_message: string | null
          generated_letter_id: string | null
          id: string
          last_opened_at: string | null
          open_count: number | null
          opened_at: string | null
          recipient_name: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          broadcast_id: string
          client_id: string
          contact_id?: string | null
          created_at?: string
          email: string
          error_message?: string | null
          generated_letter_id?: string | null
          id?: string
          last_opened_at?: string | null
          open_count?: number | null
          opened_at?: string | null
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          broadcast_id?: string
          client_id?: string
          contact_id?: string | null
          created_at?: string
          email?: string
          error_message?: string | null
          generated_letter_id?: string | null
          id?: string
          last_opened_at?: string | null
          open_count?: number | null
          opened_at?: string | null
          recipient_name?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_recipients_broadcast_id_fkey"
            columns: ["broadcast_id"]
            isOneToOne: false
            referencedRelation: "broadcasts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_recipients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_recipients_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "tenant_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_recipients_generated_letter_id_fkey"
            columns: ["generated_letter_id"]
            isOneToOne: false
            referencedRelation: "generated_letters"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          custom_content_html: string | null
          id: string
          includes_payment_section: boolean | null
          list_id: string | null
          list_type: string
          name: string
          recipient_count: number
          scheduled_at: string | null
          started_at: string | null
          status: string
          subject: string
          template_type: string | null
          tenant_id: string
          total_emails_failed: number | null
          total_emails_opened: number | null
          total_emails_sent: number | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          custom_content_html?: string | null
          id?: string
          includes_payment_section?: boolean | null
          list_id?: string | null
          list_type: string
          name: string
          recipient_count?: number
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          subject: string
          template_type?: string | null
          tenant_id: string
          total_emails_failed?: number | null
          total_emails_opened?: number | null
          total_emails_sent?: number | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          custom_content_html?: string | null
          id?: string
          includes_payment_section?: boolean | null
          list_id?: string | null
          list_type?: string
          name?: string
          recipient_count?: number
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          subject?: string
          template_type?: string | null
          tenant_id?: string
          total_emails_failed?: number | null
          total_emails_opened?: number | null
          total_emails_sent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "distribution_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_declaration_communications: {
        Row: {
          communicated_at: string | null
          communication_type: string
          content: string | null
          created_at: string | null
          created_by: string | null
          declaration_id: string
          direction: string | null
          id: string
          letter_id: string | null
          outcome: string | null
          subject: string | null
          tenant_id: string
        }
        Insert: {
          communicated_at?: string | null
          communication_type: string
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          declaration_id: string
          direction?: string | null
          id?: string
          letter_id?: string | null
          outcome?: string | null
          subject?: string | null
          tenant_id: string
        }
        Update: {
          communicated_at?: string | null
          communication_type?: string
          content?: string | null
          created_at?: string | null
          created_by?: string | null
          declaration_id?: string
          direction?: string | null
          id?: string
          letter_id?: string | null
          outcome?: string | null
          subject?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capital_declaration_communications_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "capital_declarations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_declaration_communications_letter_id_fkey"
            columns: ["letter_id"]
            isOneToOne: false
            referencedRelation: "generated_letters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_declaration_communications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_declaration_documents: {
        Row: {
          category: Database["public"]["Enums"]["capital_declaration_category"]
          declaration_id: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          notes: string | null
          storage_path: string
          tenant_id: string
          uploaded_at: string
          uploaded_by_ip: string | null
        }
        Insert: {
          category: Database["public"]["Enums"]["capital_declaration_category"]
          declaration_id: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          notes?: string | null
          storage_path: string
          tenant_id: string
          uploaded_at?: string
          uploaded_by_ip?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["capital_declaration_category"]
          declaration_id?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          notes?: string | null
          storage_path?: string
          tenant_id?: string
          uploaded_at?: string
          uploaded_by_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capital_declaration_documents_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "capital_declarations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_declaration_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_declaration_reminder_settings: {
        Row: {
          banner_triggered_at: string | null
          client_reminder_frequency_days: number
          created_at: string
          enable_client_reminders: boolean
          enable_weekly_report: boolean
          id: string
          last_banner_dismissed_at: string | null
          last_banner_dismissed_by: string | null
          show_weekly_banner: boolean
          tenant_id: string
          updated_at: string
          weekly_report_email: string | null
        }
        Insert: {
          banner_triggered_at?: string | null
          client_reminder_frequency_days?: number
          created_at?: string
          enable_client_reminders?: boolean
          enable_weekly_report?: boolean
          id?: string
          last_banner_dismissed_at?: string | null
          last_banner_dismissed_by?: string | null
          show_weekly_banner?: boolean
          tenant_id: string
          updated_at?: string
          weekly_report_email?: string | null
        }
        Update: {
          banner_triggered_at?: string | null
          client_reminder_frequency_days?: number
          created_at?: string
          enable_client_reminders?: boolean
          enable_weekly_report?: boolean
          id?: string
          last_banner_dismissed_at?: string | null
          last_banner_dismissed_by?: string | null
          show_weekly_banner?: boolean
          tenant_id?: string
          updated_at?: string
          weekly_report_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "capital_declaration_reminder_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_declaration_reminders: {
        Row: {
          created_at: string
          declaration_id: string
          email_opened: boolean
          email_opened_at: string | null
          id: string
          reminder_sequence: number | null
          reminder_type: string
          sent_at: string
          sent_to_email: string | null
          sent_via: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          declaration_id: string
          email_opened?: boolean
          email_opened_at?: string | null
          id?: string
          reminder_sequence?: number | null
          reminder_type: string
          sent_at?: string
          sent_to_email?: string | null
          sent_via?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          declaration_id?: string
          email_opened?: boolean
          email_opened_at?: string | null
          id?: string
          reminder_sequence?: number | null
          reminder_type?: string
          sent_at?: string
          sent_to_email?: string | null
          sent_via?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "capital_declaration_reminders_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "capital_declarations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_declaration_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_declaration_status_history: {
        Row: {
          changed_at: string
          changed_by: string
          created_at: string
          declaration_id: string
          from_status: string | null
          id: string
          notes: string | null
          tenant_id: string
          to_status: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          created_at?: string
          declaration_id: string
          from_status?: string | null
          id?: string
          notes?: string | null
          tenant_id: string
          to_status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          created_at?: string
          declaration_id?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          tenant_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "capital_declaration_status_history_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "capital_declarations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_declaration_status_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      capital_declarations: {
        Row: {
          appeal_date: string | null
          appeal_notes: string | null
          assigned_at: string | null
          assigned_to: string | null
          client_id: string | null
          contact_email: string | null
          contact_id: string | null
          contact_name: string
          contact_phone: string | null
          contact_phone_secondary: string | null
          created_at: string
          created_by: string | null
          declaration_date: string
          google_drive_link: string | null
          group_id: string | null
          id: string
          internal_due_date: string | null
          last_reminder_sent_at: string | null
          letter_id: string | null
          next_reminder_due_at: string | null
          notes: string | null
          penalty_amount: number | null
          penalty_notes: string | null
          penalty_paid_amount: number | null
          penalty_paid_by: string | null
          penalty_paid_date: string | null
          penalty_received_date: string | null
          penalty_status: Database["public"]["Enums"]["penalty_status"] | null
          portal_access_count: number | null
          portal_accessed_at: string | null
          priority: string | null
          public_token: string
          recipient_contact_id: string | null
          recipient_email: string | null
          recipient_mode: string
          recipient_name: string | null
          recipient_phone: string | null
          recipient_phone_secondary: string | null
          reminder_count: number
          status: string
          subject: string
          submission_screenshot_path: string | null
          submitted_at: string | null
          tax_authority_due_date: string | null
          tax_authority_due_date_document_path: string | null
          tax_year: number
          tenant_id: string
          updated_at: string
          was_submitted_late: boolean | null
        }
        Insert: {
          appeal_date?: string | null
          appeal_notes?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          client_id?: string | null
          contact_email?: string | null
          contact_id?: string | null
          contact_name: string
          contact_phone?: string | null
          contact_phone_secondary?: string | null
          created_at?: string
          created_by?: string | null
          declaration_date: string
          google_drive_link?: string | null
          group_id?: string | null
          id?: string
          internal_due_date?: string | null
          last_reminder_sent_at?: string | null
          letter_id?: string | null
          next_reminder_due_at?: string | null
          notes?: string | null
          penalty_amount?: number | null
          penalty_notes?: string | null
          penalty_paid_amount?: number | null
          penalty_paid_by?: string | null
          penalty_paid_date?: string | null
          penalty_received_date?: string | null
          penalty_status?: Database["public"]["Enums"]["penalty_status"] | null
          portal_access_count?: number | null
          portal_accessed_at?: string | null
          priority?: string | null
          public_token: string
          recipient_contact_id?: string | null
          recipient_email?: string | null
          recipient_mode?: string
          recipient_name?: string | null
          recipient_phone?: string | null
          recipient_phone_secondary?: string | null
          reminder_count?: number
          status?: string
          subject?: string
          submission_screenshot_path?: string | null
          submitted_at?: string | null
          tax_authority_due_date?: string | null
          tax_authority_due_date_document_path?: string | null
          tax_year: number
          tenant_id: string
          updated_at?: string
          was_submitted_late?: boolean | null
        }
        Update: {
          appeal_date?: string | null
          appeal_notes?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          client_id?: string | null
          contact_email?: string | null
          contact_id?: string | null
          contact_name?: string
          contact_phone?: string | null
          contact_phone_secondary?: string | null
          created_at?: string
          created_by?: string | null
          declaration_date?: string
          google_drive_link?: string | null
          group_id?: string | null
          id?: string
          internal_due_date?: string | null
          last_reminder_sent_at?: string | null
          letter_id?: string | null
          next_reminder_due_at?: string | null
          notes?: string | null
          penalty_amount?: number | null
          penalty_notes?: string | null
          penalty_paid_amount?: number | null
          penalty_paid_by?: string | null
          penalty_paid_date?: string | null
          penalty_received_date?: string | null
          penalty_status?: Database["public"]["Enums"]["penalty_status"] | null
          portal_access_count?: number | null
          portal_accessed_at?: string | null
          priority?: string | null
          public_token?: string
          recipient_contact_id?: string | null
          recipient_email?: string | null
          recipient_mode?: string
          recipient_name?: string | null
          recipient_phone?: string | null
          recipient_phone_secondary?: string | null
          reminder_count?: number
          status?: string
          subject?: string
          submission_screenshot_path?: string | null
          submitted_at?: string | null
          tax_authority_due_date?: string | null
          tax_authority_due_date_document_path?: string | null
          tax_year?: number
          tenant_id?: string
          updated_at?: string
          was_submitted_late?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "capital_declarations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_declarations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "tenant_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_declarations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "client_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_declarations_letter_id_fkey"
            columns: ["letter_id"]
            isOneToOne: false
            referencedRelation: "generated_letters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_declarations_recipient_contact_id_fkey"
            columns: ["recipient_contact_id"]
            isOneToOne: false
            referencedRelation: "tenant_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "capital_declarations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          channel_type: string
          client_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          channel_type: string
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          channel_type?: string
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_channels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string | null
          id: string
          sender_id: string
          tenant_id: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string | null
          id?: string
          sender_id: string
          tenant_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string | null
          id?: string
          sender_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_read_status: {
        Row: {
          channel_id: string
          id: string
          last_read_at: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          last_read_at?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          last_read_at?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_read_status_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_read_status_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_attachments: {
        Row: {
          client_id: string | null
          created_at: string | null
          description: string | null
          file_category: Database["public"]["Enums"]["file_category"]
          file_name: string
          file_size: number
          file_type: string
          group_id: string | null
          id: string
          is_latest: boolean | null
          notes: string | null
          replaces_attachment_id: string | null
          storage_path: string
          tenant_id: string
          updated_at: string | null
          upload_context: string
          uploaded_by: string | null
          version: number | null
          year_context: number | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          file_category?: Database["public"]["Enums"]["file_category"]
          file_name: string
          file_size: number
          file_type: string
          group_id?: string | null
          id?: string
          is_latest?: boolean | null
          notes?: string | null
          replaces_attachment_id?: string | null
          storage_path: string
          tenant_id: string
          updated_at?: string | null
          upload_context: string
          uploaded_by?: string | null
          version?: number | null
          year_context?: number | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          description?: string | null
          file_category?: Database["public"]["Enums"]["file_category"]
          file_name?: string
          file_size?: number
          file_type?: string
          group_id?: string | null
          id?: string
          is_latest?: boolean | null
          notes?: string | null
          replaces_attachment_id?: string | null
          storage_path?: string
          tenant_id?: string
          updated_at?: string | null
          upload_context?: string
          uploaded_by?: string | null
          version?: number | null
          year_context?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_attachments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_attachments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "client_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_attachments_replaces_attachment_id_fkey"
            columns: ["replaces_attachment_id"]
            isOneToOne: false
            referencedRelation: "client_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_branches: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_branches_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_branches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contact_assignments: {
        Row: {
          client_id: string
          contact_id: string
          created_at: string
          created_by: string | null
          email_preference: string
          id: string
          is_primary: boolean
          notes: string | null
          role_at_client: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          contact_id: string
          created_at?: string
          created_by?: string | null
          email_preference?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          role_at_client?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          contact_id?: string
          created_at?: string
          created_by?: string | null
          email_preference?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          role_at_client?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contact_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contact_assignments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "tenant_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          client_id: string
          contact_type: Database["public"]["Enums"]["contact_type"]
          created_at: string | null
          created_by: string | null
          email: string | null
          email_preference: string | null
          full_name: string
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          notes: string | null
          phone: string | null
          position: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          contact_type?: Database["public"]["Enums"]["contact_type"]
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          email_preference?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          contact_type?: Database["public"]["Enums"]["contact_type"]
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          email_preference?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_groups: {
        Row: {
          address: Json | null
          canva_link: string | null
          combined_billing: boolean | null
          combined_letters: boolean | null
          company_structure_link: string | null
          created_at: string | null
          created_by: string | null
          google_drive_link: string | null
          group_name_hebrew: string
          id: string
          notes: string | null
          primary_owner: string | null
          secondary_owners: string[] | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          address?: Json | null
          canva_link?: string | null
          combined_billing?: boolean | null
          combined_letters?: boolean | null
          company_structure_link?: string | null
          created_at?: string | null
          created_by?: string | null
          google_drive_link?: string | null
          group_name_hebrew: string
          id?: string
          notes?: string | null
          primary_owner?: string | null
          secondary_owners?: string[] | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          address?: Json | null
          canva_link?: string | null
          combined_billing?: boolean | null
          combined_letters?: boolean | null
          company_structure_link?: string | null
          created_at?: string | null
          created_by?: string | null
          google_drive_link?: string | null
          group_name_hebrew?: string
          id?: string
          notes?: string | null
          primary_owner?: string | null
          secondary_owners?: string[] | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_interactions: {
        Row: {
          client_id: string
          content: string | null
          created_at: string | null
          created_by: string
          direction: string | null
          fee_calculation_id: string | null
          id: string
          interacted_at: string | null
          interaction_type: string
          outcome: string | null
          subject: string
          tenant_id: string
        }
        Insert: {
          client_id: string
          content?: string | null
          created_at?: string | null
          created_by: string
          direction?: string | null
          fee_calculation_id?: string | null
          id?: string
          interacted_at?: string | null
          interaction_type: string
          outcome?: string | null
          subject: string
          tenant_id: string
        }
        Update: {
          client_id?: string
          content?: string | null
          created_at?: string | null
          created_by?: string
          direction?: string | null
          fee_calculation_id?: string | null
          id?: string
          interacted_at?: string | null
          interaction_type?: string
          outcome?: string | null
          subject?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_interactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_interactions_fee_calculation_id_fkey"
            columns: ["fee_calculation_id"]
            isOneToOne: false
            referencedRelation: "fee_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_interactions_fee_calculation_id_fkey"
            columns: ["fee_calculation_id"]
            isOneToOne: false
            referencedRelation: "fee_tracking_enhanced_view"
            referencedColumns: ["fee_calculation_id"]
          },
          {
            foreignKeyName: "client_interactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_month_range: {
        Row: {
          branch_id: string
          client_id: string
          created_at: string
          created_by: string | null
          end_month: string
          id: string
          start_month: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          client_id: string
          created_at?: string
          created_by?: string | null
          end_month: string
          id?: string
          start_month: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          end_month?: string
          id?: string
          start_month?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_month_range_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "client_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_month_range_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_month_range_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_monthly_reports: {
        Row: {
          branch_id: string
          client_id: string
          created_at: string
          created_by: string | null
          employee_count: number | null
          id: string
          month_date: string
          notes: string | null
          report_type: Database["public"]["Enums"]["client_report_type"]
          tenant_id: string
          turnover_amount: number | null
          updated_at: string
        }
        Insert: {
          branch_id: string
          client_id: string
          created_at?: string
          created_by?: string | null
          employee_count?: number | null
          id?: string
          month_date: string
          notes?: string | null
          report_type: Database["public"]["Enums"]["client_report_type"]
          tenant_id: string
          turnover_amount?: number | null
          updated_at?: string
        }
        Update: {
          branch_id?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          employee_count?: number | null
          id?: string
          month_date?: string
          notes?: string | null
          report_type?: Database["public"]["Enums"]["client_report_type"]
          tenant_id?: string
          turnover_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_monthly_reports_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "client_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_monthly_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_monthly_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_phones: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          notes: string | null
          phone_number: string
          phone_type: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          notes?: string | null
          phone_number: string
          phone_type: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          notes?: string | null
          phone_number?: string
          phone_type?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_phones_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_phones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          accountant_email: string | null
          accountant_name: string | null
          accountant_phone: string | null
          accountant_phone_secondary: string | null
          activity_level: string | null
          address: Json | null
          annual_revenue: number | null
          business_type: string | null
          canva_link: string | null
          city_new: string | null
          client_type: string | null
          collection_responsibility: string | null
          commercial_name: string | null
          company_name: string
          company_name_hebrew: string | null
          company_status: string | null
          company_subtype: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          contact_phone_secondary: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          employee_count: number | null
          google_drive_link: string | null
          group_id: string | null
          id: string
          incorporation_date: string | null
          internal_external: string | null
          is_passive_income: boolean | null
          is_retainer: boolean | null
          linked_company_id: string | null
          notes: string | null
          payer_client_id: string | null
          payment_role: string | null
          payment_terms: number | null
          pays_fees: boolean | null
          phone: string | null
          postal_code_new: string | null
          preferred_language: string | null
          receives_as_group: boolean | null
          receives_letters: boolean | null
          shareholders: string[] | null
          signature_path: string | null
          status: string
          tags: string[] | null
          tax_coding: string | null
          tax_id: string
          tenant_id: string
          type: Database["public"]["Enums"]["client_type"] | null
          updated_at: string | null
        }
        Insert: {
          accountant_email?: string | null
          accountant_name?: string | null
          accountant_phone?: string | null
          accountant_phone_secondary?: string | null
          activity_level?: string | null
          address?: Json | null
          annual_revenue?: number | null
          business_type?: string | null
          canva_link?: string | null
          city_new?: string | null
          client_type?: string | null
          collection_responsibility?: string | null
          commercial_name?: string | null
          company_name: string
          company_name_hebrew?: string | null
          company_status?: string | null
          company_subtype?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_phone_secondary?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          employee_count?: number | null
          google_drive_link?: string | null
          group_id?: string | null
          id?: string
          incorporation_date?: string | null
          internal_external?: string | null
          is_passive_income?: boolean | null
          is_retainer?: boolean | null
          linked_company_id?: string | null
          notes?: string | null
          payer_client_id?: string | null
          payment_role?: string | null
          payment_terms?: number | null
          pays_fees?: boolean | null
          phone?: string | null
          postal_code_new?: string | null
          preferred_language?: string | null
          receives_as_group?: boolean | null
          receives_letters?: boolean | null
          shareholders?: string[] | null
          signature_path?: string | null
          status?: string
          tags?: string[] | null
          tax_coding?: string | null
          tax_id: string
          tenant_id: string
          type?: Database["public"]["Enums"]["client_type"] | null
          updated_at?: string | null
        }
        Update: {
          accountant_email?: string | null
          accountant_name?: string | null
          accountant_phone?: string | null
          accountant_phone_secondary?: string | null
          activity_level?: string | null
          address?: Json | null
          annual_revenue?: number | null
          business_type?: string | null
          canva_link?: string | null
          city_new?: string | null
          client_type?: string | null
          collection_responsibility?: string | null
          commercial_name?: string | null
          company_name?: string
          company_name_hebrew?: string | null
          company_status?: string | null
          company_subtype?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_phone_secondary?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          employee_count?: number | null
          google_drive_link?: string | null
          group_id?: string | null
          id?: string
          incorporation_date?: string | null
          internal_external?: string | null
          is_passive_income?: boolean | null
          is_retainer?: boolean | null
          linked_company_id?: string | null
          notes?: string | null
          payer_client_id?: string | null
          payment_role?: string | null
          payment_terms?: number | null
          pays_fees?: boolean | null
          phone?: string | null
          postal_code_new?: string | null
          preferred_language?: string | null
          receives_as_group?: boolean | null
          receives_letters?: boolean | null
          shareholders?: string[] | null
          signature_path?: string | null
          status?: string
          tags?: string[] | null
          tax_coding?: string | null
          tax_id?: string
          tenant_id?: string
          type?: Database["public"]["Enums"]["client_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "client_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_linked_company_id_fkey"
            columns: ["linked_company_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_payer_client_id_fkey"
            columns: ["payer_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_clients_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_letter_bodies: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          includes_payment: boolean | null
          name: string
          parsed_html: string
          plain_text: string
          subject: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          includes_payment?: boolean | null
          name: string
          parsed_html: string
          plain_text: string
          subject?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          includes_payment?: boolean | null
          name?: string
          parsed_html?: string
          plain_text?: string
          subject?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_letter_bodies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_list_members: {
        Row: {
          added_at: string
          added_by: string | null
          client_id: string
          id: string
          list_id: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          client_id: string
          id?: string
          list_id: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          client_id?: string
          id?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribution_list_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribution_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "distribution_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_lists: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_permissions: {
        Row: {
          allowed_roles: string[]
          created_at: string | null
          created_by: string | null
          denied_roles: string[]
          id: string
          permission_scope: string
          scope_id: string
          tenant_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          allowed_roles?: string[]
          created_at?: string | null
          created_by?: string | null
          denied_roles?: string[]
          id?: string
          permission_scope: string
          scope_id: string
          tenant_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          allowed_roles?: string[]
          created_at?: string | null
          created_by?: string | null
          denied_roles?: string[]
          id?: string
          permission_scope?: string
          scope_id?: string
          tenant_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_calculations: {
        Row: {
          actual_payment_id: string | null
          amount_after_selected_discount: number | null
          apply_inflation_index: boolean | null
          approved_at: string | null
          approved_by: string | null
          bank_transfer_amount_before_vat: number | null
          bank_transfer_amount_with_vat: number | null
          bank_transfer_discount_percentage: number | null
          bank_transfer_only: boolean | null
          base_amount: number | null
          bookkeeping_calculation: Json | null
          calculated_base_amount: number
          calculated_before_vat: number | null
          calculated_inflation_amount: number | null
          calculated_with_vat: number | null
          calculation_metadata: Json | null
          client_id: string
          client_requested_adjustment: number | null
          client_requested_adjustment_note: string | null
          created_at: string | null
          created_by: string | null
          current_year_data: Json | null
          custom_payment_text: string | null
          deviation_alert_level: string | null
          discount_amount: number | null
          discount_percentage: number | null
          due_date: string | null
          fee_type_id: string | null
          final_amount: number | null
          group_calculation_id: string | null
          has_deviation: boolean | null
          id: string
          index_manual_adjustment: number | null
          inflation_adjustment: number | null
          inflation_rate: number | null
          is_group_member: boolean | null
          last_reminder_sent_at: string | null
          month: number | null
          notes: string | null
          partial_payment_amount: number | null
          payment_date: string | null
          payment_method_selected: string | null
          payment_method_selected_at: string | null
          payment_reference: string | null
          payment_terms: string | null
          period_end: string | null
          period_start: string | null
          previous_year_amount: number | null
          previous_year_amount_after_discount: number | null
          previous_year_amount_before_discount: number | null
          previous_year_amount_with_vat: number | null
          previous_year_amount_with_vat_before_discount: number | null
          previous_year_base: number | null
          previous_year_data: Json | null
          previous_year_discount: number | null
          promise_created_at: string | null
          promise_created_by: string | null
          promise_note: string | null
          promised_payment_date: string | null
          real_adjustment: number | null
          real_adjustment_reason: string | null
          real_adjustments: Json | null
          reminder_count: number | null
          retainer_calculation: Json | null
          status: string
          tenant_id: string
          total_amount: number | null
          updated_at: string | null
          updated_by: string | null
          vat_amount: number
          year: number
          year_over_year_change_amount: number | null
          year_over_year_change_percent: number | null
        }
        Insert: {
          actual_payment_id?: string | null
          amount_after_selected_discount?: number | null
          apply_inflation_index?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          bank_transfer_amount_before_vat?: number | null
          bank_transfer_amount_with_vat?: number | null
          bank_transfer_discount_percentage?: number | null
          bank_transfer_only?: boolean | null
          base_amount?: number | null
          bookkeeping_calculation?: Json | null
          calculated_base_amount: number
          calculated_before_vat?: number | null
          calculated_inflation_amount?: number | null
          calculated_with_vat?: number | null
          calculation_metadata?: Json | null
          client_id: string
          client_requested_adjustment?: number | null
          client_requested_adjustment_note?: string | null
          created_at?: string | null
          created_by?: string | null
          current_year_data?: Json | null
          custom_payment_text?: string | null
          deviation_alert_level?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          due_date?: string | null
          fee_type_id?: string | null
          final_amount?: number | null
          group_calculation_id?: string | null
          has_deviation?: boolean | null
          id?: string
          index_manual_adjustment?: number | null
          inflation_adjustment?: number | null
          inflation_rate?: number | null
          is_group_member?: boolean | null
          last_reminder_sent_at?: string | null
          month?: number | null
          notes?: string | null
          partial_payment_amount?: number | null
          payment_date?: string | null
          payment_method_selected?: string | null
          payment_method_selected_at?: string | null
          payment_reference?: string | null
          payment_terms?: string | null
          period_end?: string | null
          period_start?: string | null
          previous_year_amount?: number | null
          previous_year_amount_after_discount?: number | null
          previous_year_amount_before_discount?: number | null
          previous_year_amount_with_vat?: number | null
          previous_year_amount_with_vat_before_discount?: number | null
          previous_year_base?: number | null
          previous_year_data?: Json | null
          previous_year_discount?: number | null
          promise_created_at?: string | null
          promise_created_by?: string | null
          promise_note?: string | null
          promised_payment_date?: string | null
          real_adjustment?: number | null
          real_adjustment_reason?: string | null
          real_adjustments?: Json | null
          reminder_count?: number | null
          retainer_calculation?: Json | null
          status?: string
          tenant_id: string
          total_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
          vat_amount: number
          year: number
          year_over_year_change_amount?: number | null
          year_over_year_change_percent?: number | null
        }
        Update: {
          actual_payment_id?: string | null
          amount_after_selected_discount?: number | null
          apply_inflation_index?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          bank_transfer_amount_before_vat?: number | null
          bank_transfer_amount_with_vat?: number | null
          bank_transfer_discount_percentage?: number | null
          bank_transfer_only?: boolean | null
          base_amount?: number | null
          bookkeeping_calculation?: Json | null
          calculated_base_amount?: number
          calculated_before_vat?: number | null
          calculated_inflation_amount?: number | null
          calculated_with_vat?: number | null
          calculation_metadata?: Json | null
          client_id?: string
          client_requested_adjustment?: number | null
          client_requested_adjustment_note?: string | null
          created_at?: string | null
          created_by?: string | null
          current_year_data?: Json | null
          custom_payment_text?: string | null
          deviation_alert_level?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          due_date?: string | null
          fee_type_id?: string | null
          final_amount?: number | null
          group_calculation_id?: string | null
          has_deviation?: boolean | null
          id?: string
          index_manual_adjustment?: number | null
          inflation_adjustment?: number | null
          inflation_rate?: number | null
          is_group_member?: boolean | null
          last_reminder_sent_at?: string | null
          month?: number | null
          notes?: string | null
          partial_payment_amount?: number | null
          payment_date?: string | null
          payment_method_selected?: string | null
          payment_method_selected_at?: string | null
          payment_reference?: string | null
          payment_terms?: string | null
          period_end?: string | null
          period_start?: string | null
          previous_year_amount?: number | null
          previous_year_amount_after_discount?: number | null
          previous_year_amount_before_discount?: number | null
          previous_year_amount_with_vat?: number | null
          previous_year_amount_with_vat_before_discount?: number | null
          previous_year_base?: number | null
          previous_year_data?: Json | null
          previous_year_discount?: number | null
          promise_created_at?: string | null
          promise_created_by?: string | null
          promise_note?: string | null
          promised_payment_date?: string | null
          real_adjustment?: number | null
          real_adjustment_reason?: string | null
          real_adjustments?: Json | null
          reminder_count?: number | null
          retainer_calculation?: Json | null
          status?: string
          tenant_id?: string
          total_amount?: number | null
          updated_at?: string | null
          updated_by?: string | null
          vat_amount?: number
          year?: number
          year_over_year_change_amount?: number | null
          year_over_year_change_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_calculations_actual_payment_id_fkey"
            columns: ["actual_payment_id"]
            isOneToOne: false
            referencedRelation: "actual_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_calculations_actual_payment_id_fkey"
            columns: ["actual_payment_id"]
            isOneToOne: false
            referencedRelation: "fee_tracking_enhanced_view"
            referencedColumns: ["actual_payment_id"]
          },
          {
            foreignKeyName: "fee_calculations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_calculations_fee_type_id_fkey"
            columns: ["fee_type_id"]
            isOneToOne: false
            referencedRelation: "fee_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_calculations_group_calculation_id_fkey"
            columns: ["group_calculation_id"]
            isOneToOne: false
            referencedRelation: "group_fee_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fee_calculations_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_calculations_archived: {
        Row: {
          amount_after_selected_discount: number | null
          archived_at: string | null
          client_id: string | null
          created_at: string | null
          id: string
          last_reminder_sent_at: string | null
          partial_payment_amount: number | null
          payment_method_selected: string | null
          reminder_count: number | null
          status: string | null
          tenant_id: string | null
          total_amount: number | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          amount_after_selected_discount?: number | null
          archived_at?: string | null
          client_id?: string | null
          created_at?: string | null
          id: string
          last_reminder_sent_at?: string | null
          partial_payment_amount?: number | null
          payment_method_selected?: string | null
          reminder_count?: number | null
          status?: string | null
          tenant_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          amount_after_selected_discount?: number | null
          archived_at?: string | null
          client_id?: string | null
          created_at?: string | null
          id?: string
          last_reminder_sent_at?: string | null
          partial_payment_amount?: number | null
          payment_method_selected?: string | null
          reminder_count?: number | null
          status?: string | null
          tenant_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: []
      }
      fee_types: {
        Row: {
          created_at: string | null
          default_amount: number | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          default_amount?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          default_amount?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
        }
        Relationships: []
      }
      foreign_worker_monthly_data: {
        Row: {
          branch_id: string
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          month_date: string
          salary: number
          supplement: number
          tenant_id: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          branch_id: string
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          month_date: string
          salary?: number
          supplement?: number
          tenant_id: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          branch_id?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          month_date?: string
          salary?: number
          supplement?: number
          tenant_id?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "foreign_worker_monthly_data_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "client_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foreign_worker_monthly_data_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foreign_worker_monthly_data_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foreign_worker_monthly_data_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "foreign_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      foreign_workers: {
        Row: {
          branch_id: string
          client_id: string
          created_at: string
          created_by: string | null
          full_name: string
          id: string
          nationality: string | null
          passport_number: string
          salary: number | null
          supplement: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branch_id: string
          client_id: string
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: string
          nationality?: string | null
          passport_number: string
          salary?: number | null
          supplement?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branch_id?: string
          client_id?: string
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: string
          nationality?: string | null
          passport_number?: string
          salary?: number | null
          supplement?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "foreign_workers_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "client_branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foreign_workers_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "foreign_workers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_letters: {
        Row: {
          billing_letter_id: string | null
          body_content_html: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          clicked_at: string | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          created_by_name: string | null
          document_type_id: string | null
          fee_calculation_id: string | null
          generated_content_html: string
          generated_content_text: string | null
          group_calculation_id: string | null
          group_id: string | null
          id: string
          is_latest: boolean | null
          last_opened_at: string | null
          name: string | null
          open_count: number | null
          opened_at: string | null
          parent_letter_id: string | null
          payment_link: string | null
          pdf_file_name: string | null
          pdf_filed_at: string | null
          pdf_filed_to_attachment_id: string | null
          pdf_url: string | null
          recipient_emails: Json | null
          rendering_engine: string | null
          search_vector: unknown
          sent_at: string | null
          sent_via: string | null
          status: string | null
          subject: string | null
          system_version: string | null
          template_id: string | null
          template_type: string | null
          tenant_id: string
          uses_bank_transfer_only: boolean | null
          variables_used: Json
          version_number: number
        }
        Insert: {
          billing_letter_id?: string | null
          body_content_html?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          clicked_at?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          document_type_id?: string | null
          fee_calculation_id?: string | null
          generated_content_html: string
          generated_content_text?: string | null
          group_calculation_id?: string | null
          group_id?: string | null
          id?: string
          is_latest?: boolean | null
          last_opened_at?: string | null
          name?: string | null
          open_count?: number | null
          opened_at?: string | null
          parent_letter_id?: string | null
          payment_link?: string | null
          pdf_file_name?: string | null
          pdf_filed_at?: string | null
          pdf_filed_to_attachment_id?: string | null
          pdf_url?: string | null
          recipient_emails?: Json | null
          rendering_engine?: string | null
          search_vector?: unknown
          sent_at?: string | null
          sent_via?: string | null
          status?: string | null
          subject?: string | null
          system_version?: string | null
          template_id?: string | null
          template_type?: string | null
          tenant_id: string
          uses_bank_transfer_only?: boolean | null
          variables_used: Json
          version_number?: number
        }
        Update: {
          billing_letter_id?: string | null
          body_content_html?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          clicked_at?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          created_by_name?: string | null
          document_type_id?: string | null
          fee_calculation_id?: string | null
          generated_content_html?: string
          generated_content_text?: string | null
          group_calculation_id?: string | null
          group_id?: string | null
          id?: string
          is_latest?: boolean | null
          last_opened_at?: string | null
          name?: string | null
          open_count?: number | null
          opened_at?: string | null
          parent_letter_id?: string | null
          payment_link?: string | null
          pdf_file_name?: string | null
          pdf_filed_at?: string | null
          pdf_filed_to_attachment_id?: string | null
          pdf_url?: string | null
          recipient_emails?: Json | null
          rendering_engine?: string | null
          search_vector?: unknown
          sent_at?: string | null
          sent_via?: string | null
          status?: string | null
          subject?: string | null
          system_version?: string | null
          template_id?: string | null
          template_type?: string | null
          tenant_id?: string
          uses_bank_transfer_only?: boolean | null
          variables_used?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "generated_letters_billing_letter_id_fkey"
            columns: ["billing_letter_id"]
            isOneToOne: false
            referencedRelation: "billing_letters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_letters_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_letters_group_calculation_id_fkey"
            columns: ["group_calculation_id"]
            isOneToOne: false
            referencedRelation: "group_fee_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_letters_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "client_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_letters_parent_letter_id_fkey"
            columns: ["parent_letter_id"]
            isOneToOne: false
            referencedRelation: "generated_letters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_letters_pdf_filed_to_attachment_id_fkey"
            columns: ["pdf_filed_to_attachment_id"]
            isOneToOne: false
            referencedRelation: "client_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_letters_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "letter_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      group_contact_assignments: {
        Row: {
          contact_id: string
          created_at: string
          created_by: string | null
          group_id: string
          id: string
          is_primary: boolean
          notes: string | null
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_by?: string | null
          group_id: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by?: string | null
          group_id?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_contact_assignments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "tenant_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_contact_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "client_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_fee_calculations: {
        Row: {
          amount_paid: number | null
          audit_apply_inflation_index: boolean | null
          audit_base_amount: number
          audit_discount_percentage: number | null
          audit_final_amount: number | null
          audit_final_amount_with_vat: number | null
          audit_index_manual_adjustment: number | null
          audit_inflation_rate: number | null
          audit_real_adjustment: number | null
          audit_real_adjustment_reason: string | null
          bank_transfer_amount_before_vat: number | null
          bank_transfer_amount_with_vat: number | null
          bank_transfer_discount_percentage: number | null
          bank_transfer_only: boolean | null
          bookkeeping_apply_inflation_index: boolean | null
          bookkeeping_base_amount: number | null
          bookkeeping_discount_percentage: number | null
          bookkeeping_final_amount: number | null
          bookkeeping_final_amount_with_vat: number | null
          bookkeeping_index_manual_adjustment: number | null
          bookkeeping_inflation_rate: number | null
          bookkeeping_real_adjustment: number | null
          bookkeeping_real_adjustment_reason: string | null
          client_requested_adjustment: number | null
          client_requested_adjustment_note: string | null
          created_at: string | null
          created_by: string | null
          custom_payment_text: string | null
          group_id: string
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          payment_reference: string | null
          status: Database["public"]["Enums"]["group_fee_status"]
          tenant_id: string
          total_final_amount: number | null
          total_final_amount_with_vat: number | null
          updated_at: string | null
          year: number
        }
        Insert: {
          amount_paid?: number | null
          audit_apply_inflation_index?: boolean | null
          audit_base_amount?: number
          audit_discount_percentage?: number | null
          audit_final_amount?: number | null
          audit_final_amount_with_vat?: number | null
          audit_index_manual_adjustment?: number | null
          audit_inflation_rate?: number | null
          audit_real_adjustment?: number | null
          audit_real_adjustment_reason?: string | null
          bank_transfer_amount_before_vat?: number | null
          bank_transfer_amount_with_vat?: number | null
          bank_transfer_discount_percentage?: number | null
          bank_transfer_only?: boolean | null
          bookkeeping_apply_inflation_index?: boolean | null
          bookkeeping_base_amount?: number | null
          bookkeeping_discount_percentage?: number | null
          bookkeeping_final_amount?: number | null
          bookkeeping_final_amount_with_vat?: number | null
          bookkeeping_index_manual_adjustment?: number | null
          bookkeeping_inflation_rate?: number | null
          bookkeeping_real_adjustment?: number | null
          bookkeeping_real_adjustment_reason?: string | null
          client_requested_adjustment?: number | null
          client_requested_adjustment_note?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_payment_text?: string | null
          group_id: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["group_fee_status"]
          tenant_id: string
          total_final_amount?: number | null
          total_final_amount_with_vat?: number | null
          updated_at?: string | null
          year: number
        }
        Update: {
          amount_paid?: number | null
          audit_apply_inflation_index?: boolean | null
          audit_base_amount?: number
          audit_discount_percentage?: number | null
          audit_final_amount?: number | null
          audit_final_amount_with_vat?: number | null
          audit_index_manual_adjustment?: number | null
          audit_inflation_rate?: number | null
          audit_real_adjustment?: number | null
          audit_real_adjustment_reason?: string | null
          bank_transfer_amount_before_vat?: number | null
          bank_transfer_amount_with_vat?: number | null
          bank_transfer_discount_percentage?: number | null
          bank_transfer_only?: boolean | null
          bookkeeping_apply_inflation_index?: boolean | null
          bookkeeping_base_amount?: number | null
          bookkeeping_discount_percentage?: number | null
          bookkeeping_final_amount?: number | null
          bookkeeping_final_amount_with_vat?: number | null
          bookkeeping_index_manual_adjustment?: number | null
          bookkeeping_inflation_rate?: number | null
          bookkeeping_real_adjustment?: number | null
          bookkeeping_real_adjustment_reason?: string | null
          client_requested_adjustment?: number | null
          client_requested_adjustment_note?: string | null
          created_at?: string | null
          created_by?: string | null
          custom_payment_text?: string | null
          group_id?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          status?: Database["public"]["Enums"]["group_fee_status"]
          tenant_id?: string
          total_final_amount?: number | null
          total_final_amount_with_vat?: number | null
          updated_at?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_fee_calculations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "client_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_fee_calculations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      job_queue: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          failed_at: string | null
          id: string
          job_type: string
          max_retries: number | null
          payload: Json
          priority: number | null
          retry_count: number | null
          scheduled_at: string | null
          started_at: string | null
          status: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          job_type: string
          max_retries?: number | null
          payload: Json
          priority?: number | null
          retry_count?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          failed_at?: string | null
          id?: string
          job_type?: string
          max_retries?: number | null
          payload?: Json
          priority?: number | null
          retry_count?: number | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_job_queue_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      letter_component_combinations: {
        Row: {
          body_template: string
          created_at: string | null
          default_amount: number | null
          id: string
          name: string
          payment_template: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          body_template: string
          created_at?: string | null
          default_amount?: number | null
          id?: string
          name: string
          payment_template: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          body_template?: string
          created_at?: string | null
          default_amount?: number | null
          id?: string
          name?: string
          payment_template?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "letter_component_combinations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      letter_templates: {
        Row: {
          category: string | null
          content_html: string
          content_text: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_editable: boolean | null
          language: string | null
          name: string
          name_english: string | null
          name_hebrew: string | null
          original_file_path: string | null
          selection_rules: Json | null
          subject: string | null
          template_type: Database["public"]["Enums"]["letter_template_type"]
          tenant_id: string
          updated_at: string | null
          variables_schema: Json
          version: number | null
        }
        Insert: {
          category?: string | null
          content_html: string
          content_text?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_editable?: boolean | null
          language?: string | null
          name: string
          name_english?: string | null
          name_hebrew?: string | null
          original_file_path?: string | null
          selection_rules?: Json | null
          subject?: string | null
          template_type?: Database["public"]["Enums"]["letter_template_type"]
          tenant_id: string
          updated_at?: string | null
          variables_schema: Json
          version?: number | null
        }
        Update: {
          category?: string | null
          content_html?: string
          content_text?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_editable?: boolean | null
          language?: string | null
          name?: string
          name_english?: string | null
          name_hebrew?: string | null
          original_file_path?: string | null
          selection_rules?: Json | null
          subject?: string | null
          template_type?: Database["public"]["Enums"]["letter_template_type"]
          tenant_id?: string
          updated_at?: string | null
          variables_schema?: Json
          version?: number | null
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string | null
          daily_alert_time: string | null
          enable_automatic_reminders: boolean | null
          enable_email_notifications: boolean | null
          first_reminder_days: number | null
          group_daily_alerts: boolean | null
          id: string
          notification_email: string | null
          notify_abandoned_cart_days: number | null
          notify_checks_overdue_days: number | null
          notify_letter_not_opened_days: number | null
          notify_no_selection_days: number | null
          second_reminder_days: number | null
          tenant_id: string
          third_reminder_days: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_alert_time?: string | null
          enable_automatic_reminders?: boolean | null
          enable_email_notifications?: boolean | null
          first_reminder_days?: number | null
          group_daily_alerts?: boolean | null
          id?: string
          notification_email?: string | null
          notify_abandoned_cart_days?: number | null
          notify_checks_overdue_days?: number | null
          notify_letter_not_opened_days?: number | null
          notify_no_selection_days?: number | null
          second_reminder_days?: number | null
          tenant_id: string
          third_reminder_days?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_alert_time?: string | null
          enable_automatic_reminders?: boolean | null
          enable_email_notifications?: boolean | null
          first_reminder_days?: number | null
          group_daily_alerts?: boolean | null
          id?: string
          notification_email?: string | null
          notify_abandoned_cart_days?: number | null
          notify_checks_overdue_days?: number | null
          notify_letter_not_opened_days?: number | null
          notify_no_selection_days?: number | null
          second_reminder_days?: number | null
          tenant_id?: string
          third_reminder_days?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_deviations: {
        Row: {
          actual_amount: number | null
          actual_payment_id: string
          alert_level: string
          alert_message: string | null
          client_id: string
          created_at: string
          deviation_amount: number | null
          deviation_percent: number | null
          expected_amount: number | null
          expected_discount_percent: number | null
          fee_calculation_id: string
          id: string
          review_notes: string | null
          reviewed: boolean | null
          reviewed_at: string | null
          reviewed_by: string | null
          tenant_id: string
        }
        Insert: {
          actual_amount?: number | null
          actual_payment_id: string
          alert_level: string
          alert_message?: string | null
          client_id: string
          created_at?: string
          deviation_amount?: number | null
          deviation_percent?: number | null
          expected_amount?: number | null
          expected_discount_percent?: number | null
          fee_calculation_id: string
          id?: string
          review_notes?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tenant_id: string
        }
        Update: {
          actual_amount?: number | null
          actual_payment_id?: string
          alert_level?: string
          alert_message?: string | null
          client_id?: string
          created_at?: string
          deviation_amount?: number | null
          deviation_percent?: number | null
          expected_amount?: number | null
          expected_discount_percent?: number | null
          fee_calculation_id?: string
          id?: string
          review_notes?: string | null
          reviewed?: boolean | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_deviations_actual_payment_id_fkey"
            columns: ["actual_payment_id"]
            isOneToOne: false
            referencedRelation: "actual_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_deviations_actual_payment_id_fkey"
            columns: ["actual_payment_id"]
            isOneToOne: false
            referencedRelation: "fee_tracking_enhanced_view"
            referencedColumns: ["actual_payment_id"]
          },
          {
            foreignKeyName: "payment_deviations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_deviations_fee_calculation_id_fkey"
            columns: ["fee_calculation_id"]
            isOneToOne: false
            referencedRelation: "fee_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_deviations_fee_calculation_id_fkey"
            columns: ["fee_calculation_id"]
            isOneToOne: false
            referencedRelation: "fee_tracking_enhanced_view"
            referencedColumns: ["fee_calculation_id"]
          },
          {
            foreignKeyName: "payment_deviations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_disputes: {
        Row: {
          claimed_amount: number | null
          claimed_payment_date: string | null
          claimed_payment_method: string | null
          claimed_reference: string | null
          client_id: string
          created_at: string | null
          dispute_reason: string | null
          fee_calculation_id: string
          id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          claimed_amount?: number | null
          claimed_payment_date?: string | null
          claimed_payment_method?: string | null
          claimed_reference?: string | null
          client_id: string
          created_at?: string | null
          dispute_reason?: string | null
          fee_calculation_id: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          claimed_amount?: number | null
          claimed_payment_date?: string | null
          claimed_payment_method?: string | null
          claimed_reference?: string | null
          client_id?: string
          created_at?: string | null
          dispute_reason?: string | null
          fee_calculation_id?: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_disputes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_disputes_fee_calculation_id_fkey"
            columns: ["fee_calculation_id"]
            isOneToOne: false
            referencedRelation: "fee_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_disputes_fee_calculation_id_fkey"
            columns: ["fee_calculation_id"]
            isOneToOne: false
            referencedRelation: "fee_tracking_enhanced_view"
            referencedColumns: ["fee_calculation_id"]
          },
          {
            foreignKeyName: "payment_disputes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_installments: {
        Row: {
          actual_payment_id: string
          created_at: string
          id: string
          installment_amount: number
          installment_date: string
          installment_number: number
          notes: string | null
          paid_date: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          actual_payment_id: string
          created_at?: string
          id?: string
          installment_amount: number
          installment_date: string
          installment_number: number
          notes?: string | null
          paid_date?: string | null
          status?: string
          tenant_id: string
        }
        Update: {
          actual_payment_id?: string
          created_at?: string
          id?: string
          installment_amount?: number
          installment_date?: string
          installment_number?: number
          notes?: string | null
          paid_date?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_installments_actual_payment_id_fkey"
            columns: ["actual_payment_id"]
            isOneToOne: false
            referencedRelation: "actual_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_installments_actual_payment_id_fkey"
            columns: ["actual_payment_id"]
            isOneToOne: false
            referencedRelation: "fee_tracking_enhanced_view"
            referencedColumns: ["actual_payment_id"]
          },
          {
            foreignKeyName: "payment_installments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_method_selections: {
        Row: {
          amount_after_discount: number
          client_id: string
          completed_payment: boolean | null
          created_at: string | null
          discount_percent: number
          fee_calculation_id: string
          generated_letter_id: string
          id: string
          original_amount: number
          payment_transaction_id: string | null
          selected_at: string | null
          selected_method: string
          tenant_id: string
        }
        Insert: {
          amount_after_discount: number
          client_id: string
          completed_payment?: boolean | null
          created_at?: string | null
          discount_percent: number
          fee_calculation_id: string
          generated_letter_id: string
          id?: string
          original_amount: number
          payment_transaction_id?: string | null
          selected_at?: string | null
          selected_method: string
          tenant_id: string
        }
        Update: {
          amount_after_discount?: number
          client_id?: string
          completed_payment?: boolean | null
          created_at?: string | null
          discount_percent?: number
          fee_calculation_id?: string
          generated_letter_id?: string
          id?: string
          original_amount?: number
          payment_transaction_id?: string | null
          selected_at?: string | null
          selected_method?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_method_selections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_method_selections_fee_calculation_id_fkey"
            columns: ["fee_calculation_id"]
            isOneToOne: false
            referencedRelation: "fee_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_method_selections_fee_calculation_id_fkey"
            columns: ["fee_calculation_id"]
            isOneToOne: false
            referencedRelation: "fee_tracking_enhanced_view"
            referencedColumns: ["fee_calculation_id"]
          },
          {
            foreignKeyName: "payment_method_selections_generated_letter_id_fkey"
            columns: ["generated_letter_id"]
            isOneToOne: false
            referencedRelation: "generated_letters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_method_selections_payment_transaction_id_fkey"
            columns: ["payment_transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_method_selections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminders: {
        Row: {
          client_id: string
          created_at: string | null
          email_opened: boolean | null
          email_opened_at: string | null
          fee_calculation_id: string
          id: string
          reminder_sequence: number | null
          reminder_type: string
          sent_at: string | null
          sent_via: string | null
          template_used: string | null
          tenant_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          email_opened?: boolean | null
          email_opened_at?: string | null
          fee_calculation_id: string
          id?: string
          reminder_sequence?: number | null
          reminder_type: string
          sent_at?: string | null
          sent_via?: string | null
          template_used?: string | null
          tenant_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          email_opened?: boolean | null
          email_opened_at?: string | null
          fee_calculation_id?: string
          id?: string
          reminder_sequence?: number | null
          reminder_type?: string
          sent_at?: string | null
          sent_via?: string | null
          template_used?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_fee_calculation_id_fkey"
            columns: ["fee_calculation_id"]
            isOneToOne: false
            referencedRelation: "fee_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_fee_calculation_id_fkey"
            columns: ["fee_calculation_id"]
            isOneToOne: false
            referencedRelation: "fee_tracking_enhanced_view"
            referencedColumns: ["fee_calculation_id"]
          },
          {
            foreignKeyName: "payment_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          cardcom_deal_id: string | null
          cardcom_transaction_id: string | null
          client_id: string
          created_at: string | null
          currency: string | null
          failure_reason: string | null
          fee_calculation_id: string | null
          id: string
          invoice_number: string | null
          metadata: Json | null
          payment_date: string | null
          payment_link: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["payment_status"] | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          cardcom_deal_id?: string | null
          cardcom_transaction_id?: string | null
          client_id: string
          created_at?: string | null
          currency?: string | null
          failure_reason?: string | null
          fee_calculation_id?: string | null
          id?: string
          invoice_number?: string | null
          metadata?: Json | null
          payment_date?: string | null
          payment_link?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          cardcom_deal_id?: string | null
          cardcom_transaction_id?: string | null
          client_id?: string
          created_at?: string | null
          currency?: string | null
          failure_reason?: string | null
          fee_calculation_id?: string | null
          id?: string
          invoice_number?: string | null
          metadata?: Json | null
          payment_date?: string | null
          payment_link?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pending_registrations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_name: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          message: string | null
          password_hash: string | null
          phone: string | null
          rejection_reason: string | null
          requested_role: Database["public"]["Enums"]["user_role"]
          status: string | null
          tax_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_name?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          message?: string | null
          password_hash?: string | null
          phone?: string | null
          rejection_reason?: string | null
          requested_role: Database["public"]["Enums"]["user_role"]
          status?: string | null
          tax_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          password_hash?: string | null
          phone?: string | null
          rejection_reason?: string | null
          requested_role?: Database["public"]["Enums"]["user_role"]
          status?: string | null
          tax_id?: string | null
        }
        Relationships: []
      }
      protocol_attendees: {
        Row: {
          contact_id: string | null
          created_at: string | null
          display_name: string
          id: string
          protocol_id: string
          role_title: string | null
          source_type: string
          user_id: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          display_name: string
          id?: string
          protocol_id: string
          role_title?: string | null
          source_type: string
          user_id?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          protocol_id?: string
          role_title?: string | null
          source_type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_attendees_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "tenant_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocol_attendees_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_content_sections: {
        Row: {
          content: string
          created_at: string | null
          id: string
          protocol_id: string
          section_type: string
          sort_order: number
          style: Json | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          protocol_id: string
          section_type: string
          sort_order?: number
          style?: Json | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          protocol_id?: string
          section_type?: string
          sort_order?: number
          style?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "protocol_content_sections_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      protocol_decisions: {
        Row: {
          assigned_employee_id: string | null
          assigned_other_name: string | null
          audit_report_year: number | null
          content: string
          created_at: string | null
          id: string
          protocol_id: string
          responsibility_types: string[]
          sort_order: number
          style: Json | null
          urgency: string
        }
        Insert: {
          assigned_employee_id?: string | null
          assigned_other_name?: string | null
          audit_report_year?: number | null
          content: string
          created_at?: string | null
          id?: string
          protocol_id: string
          responsibility_types: string[]
          sort_order?: number
          style?: Json | null
          urgency?: string
        }
        Update: {
          assigned_employee_id?: string | null
          assigned_other_name?: string | null
          audit_report_year?: number | null
          content?: string
          created_at?: string | null
          id?: string
          protocol_id?: string
          responsibility_types?: string[]
          sort_order?: number
          style?: Json | null
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "protocol_decisions_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "protocols"
            referencedColumns: ["id"]
          },
        ]
      }
      protocols: {
        Row: {
          client_id: string | null
          created_at: string | null
          created_by: string | null
          group_id: string | null
          id: string
          locked_at: string | null
          locked_by: string | null
          meeting_date: string
          pdf_url: string | null
          status: string
          tenant_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          group_id?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          meeting_date: string
          pdf_url?: string | null
          status?: string
          tenant_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          group_id?: string | null
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          meeting_date?: string
          pdf_url?: string | null
          status?: string
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "protocols_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocols_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "client_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "protocols_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_rules: {
        Row: {
          actions: Json
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          tenant_id: string
          trigger_conditions: Json
          updated_at: string | null
        }
        Insert: {
          actions: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          tenant_id: string
          trigger_conditions: Json
          updated_at?: string | null
        }
        Update: {
          actions?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          tenant_id?: string
          trigger_conditions?: Json
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      short_links: {
        Row: {
          click_count: number | null
          client_id: string | null
          created_at: string | null
          expires_at: string | null
          fee_calculation_id: string | null
          group_calculation_id: string | null
          id: string
          last_clicked_at: string | null
          letter_id: string | null
          original_url: string
          payment_method: string | null
          short_code: string
        }
        Insert: {
          click_count?: number | null
          client_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          fee_calculation_id?: string | null
          group_calculation_id?: string | null
          id?: string
          last_clicked_at?: string | null
          letter_id?: string | null
          original_url: string
          payment_method?: string | null
          short_code: string
        }
        Update: {
          click_count?: number | null
          client_id?: string | null
          created_at?: string | null
          expires_at?: string | null
          fee_calculation_id?: string | null
          group_calculation_id?: string | null
          id?: string
          last_clicked_at?: string | null
          letter_id?: string | null
          original_url?: string
          payment_method?: string | null
          short_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "short_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_links_fee_calculation_id_fkey"
            columns: ["fee_calculation_id"]
            isOneToOne: false
            referencedRelation: "fee_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_links_fee_calculation_id_fkey"
            columns: ["fee_calculation_id"]
            isOneToOne: false
            referencedRelation: "fee_tracking_enhanced_view"
            referencedColumns: ["fee_calculation_id"]
          },
          {
            foreignKeyName: "short_links_group_calculation_id_fkey"
            columns: ["group_calculation_id"]
            isOneToOne: false
            referencedRelation: "group_fee_calculations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_links_letter_id_fkey"
            columns: ["letter_id"]
            isOneToOne: false
            referencedRelation: "generated_letters"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          permissions: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      support_ticket_attachments: {
        Row: {
          file_name: string
          file_size: number
          file_type: string
          id: string
          reply_id: string | null
          storage_path: string
          tenant_id: string
          ticket_id: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          file_name: string
          file_size: number
          file_type: string
          id?: string
          reply_id?: string | null
          storage_path: string
          tenant_id: string
          ticket_id: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          reply_id?: string | null
          storage_path?: string
          tenant_id?: string
          ticket_id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_attachments_reply_id_fkey"
            columns: ["reply_id"]
            isOneToOne: false
            referencedRelation: "support_ticket_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_categories: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          level: number
          name: string
          name_hebrew: string
          parent_id: string | null
          sort_order: number | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          level?: number
          name: string
          name_hebrew: string
          parent_id?: string | null
          sort_order?: number | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          level?: number
          name?: string
          name_hebrew?: string
          parent_id?: string | null
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "support_ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_history: {
        Row: {
          action: string
          created_at: string | null
          field_changed: string | null
          id: string
          new_value: string | null
          notes: string | null
          old_value: string | null
          performed_by: string | null
          performer_name: string | null
          tenant_id: string
          ticket_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          performed_by?: string | null
          performer_name?: string | null
          tenant_id: string
          ticket_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          field_changed?: string | null
          id?: string
          new_value?: string | null
          notes?: string | null
          old_value?: string | null
          performed_by?: string | null
          performer_name?: string | null
          tenant_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_replies: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          email_opened_at: string | null
          email_sent_at: string | null
          id: string
          is_from_client: boolean | null
          is_html: boolean | null
          is_internal: boolean | null
          sender_email: string | null
          sender_name: string | null
          tenant_id: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          email_opened_at?: string | null
          email_sent_at?: string | null
          id?: string
          is_from_client?: boolean | null
          is_html?: boolean | null
          is_internal?: boolean | null
          sender_email?: string | null
          sender_name?: string | null
          tenant_id: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          email_opened_at?: string | null
          email_sent_at?: string | null
          id?: string
          is_from_client?: boolean | null
          is_html?: boolean | null
          is_internal?: boolean | null
          sender_email?: string | null
          sender_name?: string | null
          tenant_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_replies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_replies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_settings: {
        Row: {
          auto_archive_days: number | null
          auto_assign_enabled: boolean | null
          created_at: string | null
          default_assignee_id: string | null
          default_response_hours: number | null
          id: string
          notify_assignee_on_assign: boolean | null
          notify_on_new_ticket: boolean | null
          round_robin_enabled: boolean | null
          tenant_id: string
          updated_at: string | null
          urgent_response_hours: number | null
          visible_column_keys: string[] | null
        }
        Insert: {
          auto_archive_days?: number | null
          auto_assign_enabled?: boolean | null
          created_at?: string | null
          default_assignee_id?: string | null
          default_response_hours?: number | null
          id?: string
          notify_assignee_on_assign?: boolean | null
          notify_on_new_ticket?: boolean | null
          round_robin_enabled?: boolean | null
          tenant_id: string
          updated_at?: string | null
          urgent_response_hours?: number | null
          visible_column_keys?: string[] | null
        }
        Update: {
          auto_archive_days?: number | null
          auto_assign_enabled?: boolean | null
          created_at?: string | null
          default_assignee_id?: string | null
          default_response_hours?: number | null
          id?: string
          notify_assignee_on_assign?: boolean | null
          notify_on_new_ticket?: boolean | null
          round_robin_enabled?: boolean | null
          tenant_id?: string
          updated_at?: string | null
          urgent_response_hours?: number | null
          visible_column_keys?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_statuses: {
        Row: {
          auto_close_after_days: number | null
          color: string
          column_order: number
          created_at: string | null
          icon: string | null
          id: string
          is_closed_status: boolean | null
          is_default_for_new: boolean | null
          is_system: boolean | null
          is_visible_on_board: boolean | null
          key: string
          name: string
          name_hebrew: string
          tenant_id: string
          warn_at_percent: number | null
          wip_limit: number | null
        }
        Insert: {
          auto_close_after_days?: number | null
          color?: string
          column_order?: number
          created_at?: string | null
          icon?: string | null
          id?: string
          is_closed_status?: boolean | null
          is_default_for_new?: boolean | null
          is_system?: boolean | null
          is_visible_on_board?: boolean | null
          key: string
          name: string
          name_hebrew: string
          tenant_id: string
          warn_at_percent?: number | null
          wip_limit?: number | null
        }
        Update: {
          auto_close_after_days?: number | null
          color?: string
          column_order?: number
          created_at?: string | null
          icon?: string | null
          id?: string
          is_closed_status?: boolean | null
          is_default_for_new?: boolean | null
          is_system?: boolean | null
          is_visible_on_board?: boolean | null
          key?: string
          name?: string
          name_hebrew?: string
          tenant_id?: string
          warn_at_percent?: number | null
          wip_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_statuses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          assigned_to: string | null
          category_id: string
          created_at: string | null
          created_by: string | null
          description: string
          due_date: string | null
          first_response_at: string | null
          id: string
          is_new_lead: boolean | null
          matched_by: string | null
          matched_client_id: string | null
          notify_client_on_update: boolean | null
          priority: string
          public_accessed_at: string | null
          public_token: string
          resolved_at: string | null
          source: string
          status_id: string
          subcategory_id: string | null
          subject: string
          submitter_company_name: string | null
          submitter_email: string
          submitter_name: string
          submitter_phone: string | null
          submitter_tax_id: string | null
          tenant_id: string
          ticket_number: number
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          category_id: string
          created_at?: string | null
          created_by?: string | null
          description: string
          due_date?: string | null
          first_response_at?: string | null
          id?: string
          is_new_lead?: boolean | null
          matched_by?: string | null
          matched_client_id?: string | null
          notify_client_on_update?: boolean | null
          priority?: string
          public_accessed_at?: string | null
          public_token?: string
          resolved_at?: string | null
          source?: string
          status_id: string
          subcategory_id?: string | null
          subject: string
          submitter_company_name?: string | null
          submitter_email: string
          submitter_name: string
          submitter_phone?: string | null
          submitter_tax_id?: string | null
          tenant_id: string
          ticket_number: number
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          assigned_to?: string | null
          category_id?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          due_date?: string | null
          first_response_at?: string | null
          id?: string
          is_new_lead?: boolean | null
          matched_by?: string | null
          matched_client_id?: string | null
          notify_client_on_update?: boolean | null
          priority?: string
          public_accessed_at?: string | null
          public_token?: string
          resolved_at?: string | null
          source?: string
          status_id?: string
          subcategory_id?: string | null
          subject?: string
          submitter_company_name?: string | null
          submitter_email?: string
          submitter_name?: string
          submitter_phone?: string | null
          submitter_tax_id?: string | null
          tenant_id?: string
          ticket_number?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "support_ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_matched_client_id_fkey"
            columns: ["matched_client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "support_ticket_statuses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "support_ticket_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_activity_logs: {
        Row: {
          action: string
          action_category: string | null
          changes: Json | null
          created_at: string | null
          details: Json | null
          error_message: string | null
          id: string
          ip_address: unknown
          request_id: string | null
          resource_id: string | null
          resource_name: string | null
          resource_type: string | null
          status: string | null
          tenant_id: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          action_category?: string | null
          changes?: Json | null
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          request_id?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          status?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          action_category?: string | null
          changes?: Json | null
          created_at?: string | null
          details?: Json | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          request_id?: string | null
          resource_id?: string | null
          resource_name?: string | null
          resource_type?: string | null
          status?: string | null
          tenant_id?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_activity_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_contacts: {
        Row: {
          contact_type: Database["public"]["Enums"]["contact_type"]
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          job_title: string | null
          notes: string | null
          phone: string | null
          phone_secondary: string | null
          search_vector: unknown
          signature_path: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          contact_type: Database["public"]["Enums"]["contact_type"]
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          job_title?: string | null
          notes?: string | null
          phone?: string | null
          phone_secondary?: string | null
          search_vector?: unknown
          signature_path?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          contact_type?: Database["public"]["Enums"]["contact_type"]
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          job_title?: string | null
          notes?: string | null
          phone?: string | null
          phone_secondary?: string | null
          search_vector?: unknown
          signature_path?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          accent_color: string | null
          alert_email: string | null
          billing_plan: string | null
          company_address: Json | null
          company_email: string | null
          company_name: string | null
          company_name_english: string | null
          company_phone: string | null
          created_at: string | null
          currency: string | null
          custom_domain: string | null
          custom_domain_verified: boolean | null
          date_format: string | null
          favicon_url: string | null
          features: Json | null
          id: string
          limits: Json | null
          locale: string | null
          logo_url: string | null
          primary_color: string | null
          reply_to_email: string | null
          secondary_color: string | null
          sender_email: string | null
          sender_name: string | null
          tenant_id: string | null
          timezone: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
          alert_email?: string | null
          billing_plan?: string | null
          company_address?: Json | null
          company_email?: string | null
          company_name?: string | null
          company_name_english?: string | null
          company_phone?: string | null
          created_at?: string | null
          currency?: string | null
          custom_domain?: string | null
          custom_domain_verified?: boolean | null
          date_format?: string | null
          favicon_url?: string | null
          features?: Json | null
          id?: string
          limits?: Json | null
          locale?: string | null
          logo_url?: string | null
          primary_color?: string | null
          reply_to_email?: string | null
          secondary_color?: string | null
          sender_email?: string | null
          sender_name?: string | null
          tenant_id?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
          alert_email?: string | null
          billing_plan?: string | null
          company_address?: Json | null
          company_email?: string | null
          company_name?: string | null
          company_name_english?: string | null
          company_phone?: string | null
          created_at?: string | null
          currency?: string | null
          custom_domain?: string | null
          custom_domain_verified?: boolean | null
          date_format?: string | null
          favicon_url?: string | null
          features?: Json | null
          id?: string
          limits?: Json | null
          locale?: string | null
          logo_url?: string | null
          primary_color?: string | null
          reply_to_email?: string | null
          secondary_color?: string | null
          sender_email?: string | null
          sender_name?: string | null
          tenant_id?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          billing_cycle: string | null
          billing_email: string | null
          billing_name: string | null
          cancelled_at: string | null
          created_at: string | null
          currency: string | null
          current_usage: Json | null
          discount_percentage: number | null
          end_date: string | null
          features: Json | null
          id: string
          limits: Json | null
          next_billing_date: string | null
          payment_details: Json | null
          payment_method: string | null
          plan_id: string
          plan_name: string | null
          price_per_cycle: number | null
          start_date: string
          status: string | null
          tenant_id: string | null
          trial_end_date: string | null
          updated_at: string | null
        }
        Insert: {
          billing_cycle?: string | null
          billing_email?: string | null
          billing_name?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          currency?: string | null
          current_usage?: Json | null
          discount_percentage?: number | null
          end_date?: string | null
          features?: Json | null
          id?: string
          limits?: Json | null
          next_billing_date?: string | null
          payment_details?: Json | null
          payment_method?: string | null
          plan_id: string
          plan_name?: string | null
          price_per_cycle?: number | null
          start_date?: string
          status?: string | null
          tenant_id?: string | null
          trial_end_date?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_cycle?: string | null
          billing_email?: string | null
          billing_name?: string | null
          cancelled_at?: string | null
          created_at?: string | null
          currency?: string | null
          current_usage?: Json | null
          discount_percentage?: number | null
          end_date?: string | null
          features?: Json | null
          id?: string
          limits?: Json | null
          next_billing_date?: string | null
          payment_details?: Json | null
          payment_method?: string | null
          plan_id?: string
          plan_name?: string | null
          price_per_cycle?: number | null
          start_date?: string
          status?: string | null
          tenant_id?: string | null
          trial_end_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_usage_stats: {
        Row: {
          active_users: number | null
          api_calls: number | null
          created_at: string | null
          documents_count: number | null
          fees_calculated: number | null
          id: string
          letters_sent: number | null
          new_clients: number | null
          payments_processed: number | null
          period_end: string
          period_start: string
          period_type: string
          revenue_collected: number | null
          storage_used_mb: number | null
          tenant_id: string | null
          total_clients: number | null
          total_logins: number | null
        }
        Insert: {
          active_users?: number | null
          api_calls?: number | null
          created_at?: string | null
          documents_count?: number | null
          fees_calculated?: number | null
          id?: string
          letters_sent?: number | null
          new_clients?: number | null
          payments_processed?: number | null
          period_end: string
          period_start: string
          period_type: string
          revenue_collected?: number | null
          storage_used_mb?: number | null
          tenant_id?: string | null
          total_clients?: number | null
          total_logins?: number | null
        }
        Update: {
          active_users?: number | null
          api_calls?: number | null
          created_at?: string | null
          documents_count?: number | null
          fees_calculated?: number | null
          id?: string
          letters_sent?: number | null
          new_clients?: number | null
          payments_processed?: number | null
          period_end?: string
          period_start?: string
          period_type?: string
          revenue_collected?: number | null
          storage_used_mb?: number | null
          tenant_id?: string | null
          total_clients?: number | null
          total_logins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_usage_stats_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          billing_email: string | null
          created_at: string | null
          expires_at: string | null
          features: Json
          id: string
          max_clients: number | null
          max_users: number | null
          name: string
          settings: Json
          status: string
          subscription_plan: string
          type: string
          updated_at: string | null
        }
        Insert: {
          billing_email?: string | null
          created_at?: string | null
          expires_at?: string | null
          features?: Json
          id?: string
          max_clients?: number | null
          max_users?: number | null
          name: string
          settings?: Json
          status?: string
          subscription_plan?: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          billing_email?: string | null
          created_at?: string | null
          expires_at?: string | null
          features?: Json
          id?: string
          max_clients?: number | null
          max_users?: number | null
          name?: string
          settings?: Json
          status?: string
          subscription_plan?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_client_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          client_id: string
          id: string
          is_primary: boolean | null
          notes: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          client_id: string
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          client_id?: string
          id?: string
          is_primary?: boolean | null
          notes?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_client_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_client_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_group_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          created_at: string | null
          group_id: string
          id: string
          notes: string | null
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          group_id: string
          id?: string
          notes?: string | null
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          created_at?: string | null
          group_id?: string
          id?: string
          notes?: string | null
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_group_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "client_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_group_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tenant_access: {
        Row: {
          expires_at: string | null
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          last_accessed_at: string | null
          permissions: Json | null
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          role: string
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_accessed_at?: string | null
          permissions?: Json | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          expires_at?: string | null
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          last_accessed_at?: string | null
          permissions?: Json | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_tenant_access_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          error_message: string | null
          event_type: string
          id: string
          ip_address: unknown
          payload: Json
          processed_at: string | null
          response_sent: string | null
          source: string
        }
        Insert: {
          error_message?: string | null
          event_type: string
          id?: string
          ip_address?: unknown
          payload: Json
          processed_at?: string | null
          response_sent?: string | null
          source: string
        }
        Update: {
          error_message?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown
          payload?: Json
          processed_at?: string | null
          response_sent?: string | null
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      collection_dashboard_view: {
        Row: {
          amount_after_selected_discount: number | null
          amount_before_vat: number | null
          amount_original: number | null
          amount_paid: number | null
          amount_remaining: number | null
          billing_letter_id: string | null
          bookkeeping_base_amount: number | null
          bookkeeping_before_vat: number | null
          bookkeeping_with_vat: number | null
          client_id: string | null
          company_name: string | null
          company_name_hebrew: string | null
          contact_email: string | null
          contact_phone: string | null
          days_since_sent: number | null
          fee_calculation_id: string | null
          has_dispute: boolean | null
          interaction_count: number | null
          last_interaction: string | null
          last_reminder_sent_at: string | null
          letter_open_count: number | null
          letter_opened_at: string | null
          letter_sent_date: string | null
          payment_method_selected: string | null
          payment_status: string | null
          reminder_count: number | null
          service_description: string | null
          source_type: string | null
          tenant_id: string | null
        }
        Relationships: []
      }
      cron_job_monitoring: {
        Row: {
          active: boolean | null
          command: string | null
          current_status: string | null
          jobid: number | null
          jobname: string | null
          last_run_end: string | null
          last_run_message: string | null
          last_run_start: string | null
          last_run_status: string | null
          schedule: string | null
        }
        Relationships: []
      }
      fee_tracking_enhanced_view: {
        Row: {
          actual_amount_paid: number | null
          actual_before_vat: number | null
          actual_payment_date: string | null
          actual_payment_id: string | null
          actual_payment_method: string | null
          actual_with_vat: number | null
          attachment_count: number | null
          attachment_ids: string[] | null
          bookkeeping_before_vat: number | null
          bookkeeping_with_vat: number | null
          client_id: string | null
          company_name: string | null
          created_at: string | null
          deviation_alert_level: string | null
          deviation_alert_message: string | null
          deviation_amount: number | null
          deviation_id: string | null
          deviation_percent: number | null
          deviation_review_notes: string | null
          deviation_reviewed: boolean | null
          deviation_reviewed_at: string | null
          deviation_reviewed_by: string | null
          expected_amount: number | null
          expected_discount_percent: number | null
          fee_calculation_id: string | null
          fee_payment_date: string | null
          has_deviation: boolean | null
          installment_count: number | null
          installments_overdue: number | null
          installments_paid: number | null
          num_installments: number | null
          original_amount: number | null
          original_before_vat: number | null
          original_with_vat: number | null
          payment_created_at: string | null
          payment_method_selected: string | null
          payment_reference: string | null
          payment_updated_at: string | null
          status: string | null
          tax_id: string | null
          tenant_id: string | null
          updated_at: string | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_calculations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_fee_calculations_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_collection_view: {
        Row: {
          amount: number | null
          client_id: string | null
          company_name: string | null
          company_name_hebrew: string | null
          created_at: string | null
          letter_sent_date: string | null
          payment_date: string | null
          service_description: string | null
          source_id: string | null
          source_type: string | null
          status: string | null
          tenant_id: string | null
        }
        Relationships: []
      }
      unused_indexes_analysis: {
        Row: {
          index_size: string | null
          indexname: unknown
          schemaname: unknown
          tablename: unknown
          times_used: number | null
          usage_status: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_payment_deviation: {
        Args: { p_actual_amount: number; p_fee_calculation_id: string }
        Returns: Json
      }
      check_document_permission: {
        Args: {
          p_category_id: string
          p_document_type_id: string
          p_user_role: string
        }
        Returns: boolean
      }
      check_email_availability: {
        Args: { p_email: string }
        Returns: {
          available: boolean
          reason: string
        }[]
      }
      check_primary_payer_exists: {
        Args: { p_client_id?: string; p_group_id: string; p_tenant_id: string }
        Returns: boolean
      }
      check_super_admin_access: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      check_tenant_access: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: boolean
      }
      check_tenant_admin_access: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: boolean
      }
      cleanup_client_monthly_data: {
        Args: { p_before_date: string; p_client_id: string }
        Returns: {
          deleted_client_reports: number
          deleted_worker_data: number
        }[]
      }
      cleanup_old_monthly_data: {
        Args: never
        Returns: {
          cutoff_date: string
          deleted_client_reports: number
          deleted_worker_data: number
        }[]
      }
      create_user_with_role: {
        Args: {
          p_email: string
          p_full_name?: string
          p_password: string
          p_permissions?: Json
          p_phone?: string
          p_role?: Database["public"]["Enums"]["user_role"]
        }
        Returns: {
          email: string
          full_name: string
          role: string
          tenant_id: string
          user_id: string
        }[]
      }
      create_user_with_role_v2: {
        Args: {
          p_email: string
          p_full_name?: string
          p_password: string
          p_permissions?: Json
          p_phone?: string
          p_role?: Database["public"]["Enums"]["user_role"]
        }
        Returns: {
          email: string
          full_name: string
          role: string
          tenant_id: string
          user_id: string
        }[]
      }
      create_user_with_role_v3: {
        Args: {
          p_email: string
          p_full_name?: string
          p_password_hash: string
          p_permissions?: Json
          p_phone?: string
          p_role?: Database["public"]["Enums"]["user_role"]
        }
        Returns: {
          email: string
          full_name: string
          role: string
          tenant_id: string
          user_id: string
        }[]
      }
      deactivate_user_account: {
        Args: { p_reason?: string; p_user_id: string }
        Returns: boolean
      }
      delete_old_client_monthly_reports: {
        Args: {
          p_before_date: string
          p_client_id: string
          p_report_type: Database["public"]["Enums"]["client_report_type"]
        }
        Returns: number
      }
      delete_old_worker_monthly_data: {
        Args: { p_before_date: string; p_client_id: string }
        Returns: number
      }
      derive_payment_status: {
        Args: { p_fee_status: string; p_has_letter: boolean }
        Returns: string
      }
      find_contact_by_email: {
        Args: { p_email: string; p_tenant_id: string }
        Returns: string
      }
      find_contact_by_phone: {
        Args: { p_phone: string; p_tenant_id: string }
        Returns: string
      }
      find_worker_by_passport: {
        Args: { p_passport_number: string; p_tenant_id: string }
        Returns: {
          client_id: string
          full_name: string
          id: string
          nationality: string
          passport_number: string
          salary: number
          supplement: number
        }[]
      }
      format_ils: { Args: { amount: number }; Returns: string }
      format_israeli_date:
        | {
            Args: { date_input: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.format_israeli_date(date_input => text), public.format_israeli_date(date_input => date). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { date_input: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.format_israeli_date(date_input => text), public.format_israeli_date(date_input => date). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      generate_months_array: {
        Args: { p_end_month: string; p_start_month: string }
        Returns: string[]
      }
      get_branch_display_name: {
        Args: { p_branch_id: string }
        Returns: string
      }
      get_branch_month_range: {
        Args: { p_branch_id: string }
        Returns: {
          end_month: string
          month_count: number
          start_month: string
        }[]
      }
      get_branch_workers: {
        Args: { p_branch_id: string }
        Returns: {
          created_at: string
          full_name: string
          id: string
          nationality: string
          passport_number: string
          salary: number
          supplement: number
        }[]
      }
      get_broadcast_eligible_clients: {
        Args: never
        Returns: {
          client_id: string
          company_name: string
          company_name_hebrew: string
          contact_count: number
          email_count: number
          tax_id: string
        }[]
      }
      get_budget_by_category: {
        Args: { p_tax_year: number; p_tenant_id: string }
        Returns: {
          audit_external_actual_before_vat: number
          audit_external_actual_with_vat: number
          audit_external_before_vat: number
          audit_external_count: number
          audit_external_with_vat: number
          audit_internal_actual_before_vat: number
          audit_internal_actual_with_vat: number
          audit_internal_before_vat: number
          audit_internal_count: number
          audit_internal_with_vat: number
          audit_retainer_actual_before_vat: number
          audit_retainer_actual_with_vat: number
          audit_retainer_before_vat: number
          audit_retainer_count: number
          audit_retainer_with_vat: number
          billing_letters_actual_before_vat: number
          billing_letters_actual_with_vat: number
          billing_letters_before_vat: number
          billing_letters_count: number
          billing_letters_with_vat: number
          bookkeeping_internal_actual_before_vat: number
          bookkeeping_internal_actual_with_vat: number
          bookkeeping_internal_before_vat: number
          bookkeeping_internal_count: number
          bookkeeping_internal_with_vat: number
          bookkeeping_retainer_actual_before_vat: number
          bookkeeping_retainer_actual_with_vat: number
          bookkeeping_retainer_before_vat: number
          bookkeeping_retainer_count: number
          bookkeeping_retainer_with_vat: number
          freelancers_actual_before_vat: number
          freelancers_actual_with_vat: number
          freelancers_before_vat: number
          freelancers_count: number
          freelancers_with_vat: number
        }[]
      }
      get_cd_status_counts: {
        Args: { p_tenant_id: string }
        Returns: {
          count: number
          status: string
        }[]
      }
      get_client_branches: {
        Args: { p_client_id: string }
        Returns: {
          display_name: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
        }[]
      }
      get_client_broadcast_emails: {
        Args: { p_client_id: string }
        Returns: {
          contact_id: string
          email: string
          email_preference: string
          full_name: string
        }[]
      }
      get_client_contacts_detailed: {
        Args: { p_client_id: string }
        Returns: {
          assignment_id: string
          assignment_notes: string
          contact_id: string
          contact_type: Database["public"]["Enums"]["contact_type"]
          created_at: string
          created_by: string
          email: string
          email_preference: string
          full_name: string
          is_primary: boolean
          job_title: string
          notes: string
          phone: string
          phone_secondary: string
          role_at_client: string
          signature_path: string
          tenant_id: string
          updated_at: string
        }[]
      }
      get_client_month_range: {
        Args: { p_client_id: string }
        Returns: {
          end_month: string
          month_count: number
          start_month: string
        }[]
      }
      get_client_monthly_reports: {
        Args: {
          p_client_id: string
          p_limit?: number
          p_report_type: Database["public"]["Enums"]["client_report_type"]
        }
        Returns: {
          created_at: string
          employee_count: number
          id: string
          month_date: string
          notes: string
          turnover_amount: number
          updated_at: string
        }[]
      }
      get_client_statistics: {
        Args: { p_tenant_id: string }
        Returns: {
          active_clients: number
          inactive_clients: number
          pending_clients: number
          total_clients: number
        }[]
      }
      get_collection_statistics: {
        Args: { p_tenant_id: string }
        Returns: {
          alerts_abandoned: number
          alerts_disputes: number
          alerts_no_selection: number
          alerts_unopened: number
          clients_paid: number
          clients_pending: number
          clients_sent: number
          collection_rate: number
          total_expected: number
          total_pending: number
          total_received: number
        }[]
      }
      get_comprehensive_deletion_preview: {
        Args: { p_before_date: string; p_client_id: string }
        Returns: Json
      }
      get_current_tenant_id: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      get_dashboard_summary: {
        Args: { p_tax_year: number; p_tenant_id: string }
        Returns: {
          amount_collected: number
          amount_pending: number
          audit_before_vat: number
          audit_with_vat: number
          billing_before_vat: number
          billing_with_vat: number
          bookkeeping_before_vat: number
          bookkeeping_with_vat: number
          clients_paid_count: number
          clients_pending_count: number
          clients_sent_count: number
        }[]
      }
      get_declaration_by_token: {
        Args: { p_token: string }
        Returns: {
          contact_name: string
          declaration_date: string
          id: string
          portal_accessed_at: string
          status: string
          tax_year: number
          tenant_id: string
          tenant_name: string
        }[]
      }
      get_declaration_communication_count: {
        Args: { p_declaration_id: string }
        Returns: number
      }
      get_declaration_document_counts: {
        Args: { p_declaration_id: string }
        Returns: {
          category: Database["public"]["Enums"]["capital_declaration_category"]
          count: number
        }[]
      }
      get_declaration_last_communication: {
        Args: { p_declaration_id: string }
        Returns: string
      }
      get_declarations_needing_reminders: {
        Args: { p_frequency_days?: number; p_tenant_id: string }
        Returns: {
          contact_email: string
          contact_name: string
          declaration_date: string
          declaration_id: string
          last_reminder_sent_at: string
          portal_link: string
          reminder_count: number
          tax_year: number
        }[]
      }
      get_fee_summary: {
        Args: { p_tenant_id: string }
        Returns: {
          paid_amount: number
          pending_amount: number
          total_amount: number
          total_cancelled: number
          total_draft: number
          total_fees: number
          total_overdue: number
          total_paid: number
          total_sent: number
        }[]
      }
      get_fee_tracking_data: {
        Args: { p_tax_year: number; p_tenant_id: string }
        Returns: {
          amount_after_selected_discount: number
          calculation_amount: number
          calculation_created_at: string
          calculation_id: string
          calculation_status: string
          client_id: string
          client_name: string
          client_name_hebrew: string
          group_audit_before_vat: number
          group_audit_with_vat: number
          group_bookkeeping_before_vat: number
          group_bookkeeping_with_vat: number
          group_calculation_id: string
          group_calculation_status: string
          group_id: string
          group_letter_id: string
          group_letter_sent_at: string
          group_name: string
          has_calculation: boolean
          has_letter: boolean
          letter_id: string
          letter_sent_at: string
          payer_client_id: string
          payer_client_name: string
          payment_amount: number
          payment_date: string
          payment_method_selected: string
          payment_method_selected_at: string
          payment_role: string
          payment_status: string
          tax_id: string
        }[]
      }
      get_fees_needing_reminders: {
        Args: { p_rule_id: string; p_tenant_id: string }
        Returns: {
          amount: number
          client_email: string
          client_id: string
          days_since_sent: number
          fee_calculation_id: string
          opened: boolean
          payment_method_selected: string
        }[]
      }
      get_group_contacts_detailed: {
        Args: { p_group_id: string }
        Returns: {
          assignment_id: string
          contact_id: string
          contact_type: Database["public"]["Enums"]["contact_type"]
          created_at: string
          email: string
          full_name: string
          is_primary: boolean
          job_title: string
          notes: string
          other_groups_count: number
          phone: string
          phone_secondary: string
        }[]
      }
      get_list_members_with_details: {
        Args: { p_list_id: string }
        Returns: {
          added_at: string
          client_id: string
          company_name: string
          company_name_hebrew: string
          contact_count: number
          email_count: number
          tax_id: string
        }[]
      }
      get_next_ticket_number: { Args: { p_tenant_id: string }; Returns: number }
      get_or_create_cd_reminder_settings: {
        Args: { p_tenant_id: string }
        Returns: {
          banner_triggered_at: string | null
          client_reminder_frequency_days: number
          created_at: string
          enable_client_reminders: boolean
          enable_weekly_report: boolean
          id: string
          last_banner_dismissed_at: string | null
          last_banner_dismissed_by: string | null
          show_weekly_banner: boolean
          tenant_id: string
          updated_at: string
          weekly_report_email: string | null
        }
        SetofOptions: {
          from: "*"
          to: "capital_declaration_reminder_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_or_create_default_branch: {
        Args: { p_client_id: string }
        Returns: string
      }
      get_payer_client_name: { Args: { p_client_id: string }; Returns: string }
      get_payment_method_breakdown: {
        Args: { p_tax_year: number; p_tenant_id: string }
        Returns: {
          bank_transfer_amount: number
          bank_transfer_count: number
          cc_installments_amount: number
          cc_installments_count: number
          cc_single_amount: number
          cc_single_count: number
          checks_amount: number
          checks_count: number
          not_selected_amount: number
          not_selected_count: number
        }[]
      }
      get_public_ticket_replies: {
        Args: { p_token: string }
        Returns: {
          content: string
          created_at: string
          id: string
          is_from_client: boolean
          sender_name: string
        }[]
      }
      get_ticket_by_public_token: {
        Args: { p_token: string }
        Returns: {
          category_name: string
          created_at: string
          description: string
          id: string
          priority: string
          resolved_at: string
          status_color: string
          status_key: string
          status_name: string
          subcategory_name: string
          subject: string
          tenant_name: string
          ticket_number: number
          updated_at: string
        }[]
      }
      get_ticket_kpis: { Args: { p_tenant_id: string }; Returns: Json }
      get_ticket_reply_counts: {
        Args: { p_ticket_ids: string[] }
        Returns: {
          reply_count: number
          ticket_id: string
        }[]
      }
      get_user_accessible_clients: {
        Args: { p_user_id: string }
        Returns: {
          client_id: string
        }[]
      }
      get_user_details: {
        Args: { p_user_id: string }
        Returns: {
          email: string
          full_name: string
          granted_at: string
          is_active: boolean
          is_primary: boolean
          last_accessed_at: string
          last_sign_in_at: string
          permissions: Json
          role: string
          tenant_id: string
          user_id: string
        }[]
      }
      get_user_email: { Args: { p_user_id: string }; Returns: string }
      get_user_info: {
        Args: { p_user_id: string }
        Returns: {
          email: string
          full_name: string
        }[]
      }
      get_user_role: {
        Args: { p_user_id?: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_user_with_auth: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          is_active: boolean
          last_sign_in_at: string
          permissions: Json
          phone: string
          role: string
          tenant_id: string
          updated_at: string
          user_id: string
        }[]
      }
      get_users_for_tenant: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          is_active: boolean
          last_sign_in_at: string
          permissions: Json
          phone: string
          role: string
          tenant_id: string
          updated_at: string
          user_id: string
        }[]
      }
      get_worker_monthly_data: {
        Args: { p_client_id: string; p_limit?: number; p_worker_id?: string }
        Returns: {
          created_at: string
          id: string
          month_date: string
          nationality: string
          passport_number: string
          salary: number
          supplement: number
          updated_at: string
          worker_id: string
          worker_name: string
        }[]
      }
      hash_password: { Args: { password: string }; Returns: string }
      increment_short_link_click: {
        Args: { p_short_code: string }
        Returns: undefined
      }
      is_super_admin: { Args: { user_id: string }; Returns: boolean }
      is_tenant_admin: { Args: { p_user_id: string }; Returns: boolean }
      list_users_with_auth: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          is_active: boolean
          last_sign_in_at: string
          permissions: Json
          phone: string
          role: string
          tenant_id: string
          updated_at: string
          user_id: string
        }[]
      }
      log_tenant_activity:
        | {
            Args: {
              p_action: string
              p_details?: Json
              p_resource_id?: string
              p_resource_type?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_action: string
              p_details?: Json
              p_resource_id?: string
              p_resource_type?: string
            }
            Returns: string
          }
      mark_declaration_complete: { Args: { p_token: string }; Returns: boolean }
      mark_materials_received:
        | {
            Args: { p_balance_sheet_id: string; p_received_at?: string }
            Returns: undefined
          }
        | {
            Args: {
              p_backup_link?: string
              p_balance_sheet_id: string
              p_received_at?: string
            }
            Returns: undefined
          }
      match_client_by_contact: {
        Args: {
          p_email: string
          p_phone: string
          p_tax_id: string
          p_tenant_id: string
        }
        Returns: {
          client_id: string
          matched_by: string
        }[]
      }
      migrate_existing_group_owners: { Args: never; Returns: undefined }
      migrate_to_shared_contacts: { Args: never; Returns: undefined }
      reset_user_password: {
        Args: { p_new_password: string; p_user_id: string }
        Returns: boolean
      }
      search_tenant_contacts: {
        Args: { p_search_term: string; p_tenant_id: string }
        Returns: {
          contact_type: string
          email: string
          full_name: string
          id: string
          job_title: string
          phone: string
        }[]
      }
      seed_tico_tickets_defaults: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      submit_registration: {
        Args: {
          p_company_name?: string
          p_email: string
          p_full_name: string
          p_message?: string
          p_password: string
          p_phone?: string
          p_requested_role?: Database["public"]["Enums"]["user_role"]
          p_tax_id?: string
        }
        Returns: string
      }
      track_declaration_portal_access: {
        Args: { p_token: string }
        Returns: boolean
      }
      update_user_role_and_metadata: {
        Args: {
          p_full_name?: string
          p_is_active?: boolean
          p_permissions?: Json
          p_phone?: string
          p_role?: string
          p_user_id: string
        }
        Returns: boolean
      }
      upsert_client_month_range: {
        Args: {
          p_client_id: string
          p_end_month: string
          p_start_month: string
        }
        Returns: string
      }
      upsert_client_monthly_report: {
        Args: {
          p_client_id: string
          p_employee_count?: number
          p_month_date: string
          p_notes?: string
          p_report_type: Database["public"]["Enums"]["client_report_type"]
          p_turnover_amount?: number
        }
        Returns: string
      }
      upsert_worker_monthly_data: {
        Args: {
          p_client_id: string
          p_month_date: string
          p_salary?: number
          p_supplement?: number
          p_worker_id: string
        }
        Returns: string
      }
      user_has_client_access: {
        Args: { p_client_id: string; p_user_id?: string }
        Returns: boolean
      }
      user_has_letters_permission: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: boolean
      }
      validate_israeli_tax_id: { Args: { tax_id: string }; Returns: boolean }
    }
    Enums: {
      capital_declaration_category:
        | "bank"
        | "real_estate"
        | "insurance"
        | "vehicles"
        | "abroad"
        | "other"
        | "general"
      client_report_type: "accountant_turnover" | "israeli_workers"
      client_type:
        | "company"
        | "freelancer"
        | "salary_owner"
        | "partnership"
        | "nonprofit"
      contact_type:
        | "owner"
        | "accountant_manager"
        | "secretary"
        | "cfo"
        | "board_member"
        | "legal_counsel"
        | "other"
      fee_status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
      file_category:
        | "company_registry"
        | "financial_report"
        | "bookkeeping_card"
        | "quote_invoice"
        | "payment_proof_2026"
        | "holdings_presentation"
        | "general"
        | "foreign_worker_docs"
        | "protocols"
        | "agreements"
        | "letters"
      group_fee_status:
        | "draft"
        | "calculated"
        | "sent"
        | "partially_paid"
        | "paid"
        | "disputed"
      letter_template_type:
        | "external_index_only"
        | "external_real_change"
        | "external_as_agreed"
        | "internal_audit_index"
        | "internal_audit_real"
        | "internal_audit_as_agreed"
        | "retainer_index"
        | "retainer_real"
        | "internal_bookkeeping_index"
        | "internal_bookkeeping_real"
        | "internal_bookkeeping_as_agreed"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      penalty_status:
        | "received"
        | "appeal_submitted"
        | "cancelled"
        | "paid_by_client"
        | "paid_by_office"
      tenant_status: "active" | "inactive" | "trial" | "suspended"
      tenant_type: "internal" | "white_label"
      user_role: "admin" | "accountant" | "bookkeeper" | "client"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          owner_id: string | null
          public: boolean | null
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          owner_id?: string | null
          public?: boolean | null
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string | null
        }
        Relationships: []
      }
      buckets_analytics: {
        Row: {
          created_at: string
          deleted_at: string | null
          format: string
          id: string
          name: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          format?: string
          id?: string
          name?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      buckets_vectors: {
        Row: {
          created_at: string
          id: string
          type: Database["storage"]["Enums"]["buckettype"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          type?: Database["storage"]["Enums"]["buckettype"]
          updated_at?: string
        }
        Relationships: []
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          level: number | null
          metadata: Json | null
          name: string | null
          owner: string | null
          owner_id: string | null
          path_tokens: string[] | null
          updated_at: string | null
          user_metadata: Json | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          level?: number | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          owner_id?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          user_metadata?: Json | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      prefixes: {
        Row: {
          bucket_id: string
          created_at: string | null
          level: number
          name: string
          updated_at: string | null
        }
        Insert: {
          bucket_id: string
          created_at?: string | null
          level?: number
          name: string
          updated_at?: string | null
        }
        Update: {
          bucket_id?: string
          created_at?: string | null
          level?: number
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prefixes_bucketId_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          id: string
          in_progress_size: number
          key: string
          owner_id: string | null
          upload_signature: string
          user_metadata: Json | null
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          id: string
          in_progress_size?: number
          key: string
          owner_id?: string | null
          upload_signature: string
          user_metadata?: Json | null
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          id?: string
          in_progress_size?: number
          key?: string
          owner_id?: string | null
          upload_signature?: string
          user_metadata?: Json | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
        ]
      }
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string
          created_at: string
          etag: string
          id: string
          key: string
          owner_id: string | null
          part_number: number
          size: number
          upload_id: string
          version: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          etag: string
          id?: string
          key: string
          owner_id?: string | null
          part_number: number
          size?: number
          upload_id: string
          version: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          etag?: string
          id?: string
          key?: string
          owner_id?: string | null
          part_number?: number
          size?: number
          upload_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "s3_multipart_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      vector_indexes: {
        Row: {
          bucket_id: string
          created_at: string
          data_type: string
          dimension: number
          distance_metric: string
          id: string
          metadata_configuration: Json | null
          name: string
          updated_at: string
        }
        Insert: {
          bucket_id: string
          created_at?: string
          data_type: string
          dimension: number
          distance_metric: string
          id?: string
          metadata_configuration?: Json | null
          name: string
          updated_at?: string
        }
        Update: {
          bucket_id?: string
          created_at?: string
          data_type?: string
          dimension?: number
          distance_metric?: string
          id?: string
          metadata_configuration?: Json | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey"
            columns: ["bucket_id"]
            isOneToOne: false
            referencedRelation: "buckets_vectors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_prefixes: {
        Args: { _bucket_id: string; _name: string }
        Returns: undefined
      }
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string }
        Returns: undefined
      }
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      delete_prefix: {
        Args: { _bucket_id: string; _name: string }
        Returns: boolean
      }
      extension: { Args: { name: string }; Returns: string }
      filename: { Args: { name: string }; Returns: string }
      foldername: { Args: { name: string }; Returns: string[] }
      get_level: { Args: { name: string }; Returns: number }
      get_prefix: { Args: { name: string }; Returns: string }
      get_prefixes: { Args: { name: string }; Returns: string[] }
      get_size_by_bucket: {
        Args: never
        Returns: {
          bucket_id: string
          size: number
        }[]
      }
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_key_token?: string
          next_upload_token?: string
          prefix_param: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
        }[]
      }
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string
          delimiter_param: string
          max_keys?: number
          next_token?: string
          prefix_param: string
          start_after?: string
        }
        Returns: {
          id: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      lock_top_prefixes: {
        Args: { bucket_ids: string[]; names: string[] }
        Returns: undefined
      }
      operation: { Args: never; Returns: string }
      search: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_legacy_v1: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v1_optimised: {
        Args: {
          bucketname: string
          levels?: number
          limits?: number
          offsets?: number
          prefix: string
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          created_at: string
          id: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
      search_v2: {
        Args: {
          bucket_name: string
          levels?: number
          limits?: number
          prefix: string
          sort_column?: string
          sort_column_after?: string
          sort_order?: string
          start_after?: string
        }
        Returns: {
          created_at: string
          id: string
          key: string
          last_accessed_at: string
          metadata: Json
          name: string
          updated_at: string
        }[]
      }
    }
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      capital_declaration_category: [
        "bank",
        "real_estate",
        "insurance",
        "vehicles",
        "abroad",
        "other",
        "general",
      ],
      client_report_type: ["accountant_turnover", "israeli_workers"],
      client_type: [
        "company",
        "freelancer",
        "salary_owner",
        "partnership",
        "nonprofit",
      ],
      contact_type: [
        "owner",
        "accountant_manager",
        "secretary",
        "cfo",
        "board_member",
        "legal_counsel",
        "other",
      ],
      fee_status: ["draft", "sent", "paid", "overdue", "cancelled"],
      file_category: [
        "company_registry",
        "financial_report",
        "bookkeeping_card",
        "quote_invoice",
        "payment_proof_2026",
        "holdings_presentation",
        "general",
        "foreign_worker_docs",
        "protocols",
        "agreements",
        "letters",
      ],
      group_fee_status: [
        "draft",
        "calculated",
        "sent",
        "partially_paid",
        "paid",
        "disputed",
      ],
      letter_template_type: [
        "external_index_only",
        "external_real_change",
        "external_as_agreed",
        "internal_audit_index",
        "internal_audit_real",
        "internal_audit_as_agreed",
        "retainer_index",
        "retainer_real",
        "internal_bookkeeping_index",
        "internal_bookkeeping_real",
        "internal_bookkeeping_as_agreed",
      ],
      payment_status: ["pending", "completed", "failed", "refunded"],
      penalty_status: [
        "received",
        "appeal_submitted",
        "cancelled",
        "paid_by_client",
        "paid_by_office",
      ],
      tenant_status: ["active", "inactive", "trial", "suspended"],
      tenant_type: ["internal", "white_label"],
      user_role: ["admin", "accountant", "bookkeeper", "client"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const
