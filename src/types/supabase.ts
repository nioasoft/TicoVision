export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown | null
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
          ip_address?: unknown | null
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
          ip_address?: unknown | null
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
      clients: {
        Row: {
          address: string | null
          annual_revenue: number | null
          business_type: string | null
          city: string | null
          company_name: string
          company_name_hebrew: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          employee_count: number | null
          id: string
          incorporation_date: string | null
          notes: string | null
          payment_terms: number | null
          phone: string | null
          postal_code: string | null
          preferred_language: string | null
          status: string
          tags: string[] | null
          tax_id: string
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          annual_revenue?: number | null
          business_type?: string | null
          city?: string | null
          company_name: string
          company_name_hebrew?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          employee_count?: number | null
          id?: string
          incorporation_date?: string | null
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          postal_code?: string | null
          preferred_language?: string | null
          status?: string
          tags?: string[] | null
          tax_id: string
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          annual_revenue?: number | null
          business_type?: string | null
          city?: string | null
          company_name?: string
          company_name_hebrew?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          employee_count?: number | null
          id?: string
          incorporation_date?: string | null
          notes?: string | null
          payment_terms?: number | null
          phone?: string | null
          postal_code?: string | null
          preferred_language?: string | null
          status?: string
          tags?: string[] | null
          tax_id?: string
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_clients_tenant_id"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_calculations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          base_amount: number | null
          calculated_base_amount: number
          calculation_metadata: Json | null
          client_id: string
          created_at: string | null
          created_by: string | null
          current_year_data: Json | null
          discount_amount: number | null
          discount_percentage: number | null
          due_date: string | null
          fee_type_id: string | null
          final_amount: number | null
          id: string
          inflation_adjustment: number | null
          inflation_rate: number | null
          month: number | null
          notes: string | null
          payment_date: string | null
          payment_reference: string | null
          payment_terms: string | null
          period_end: string | null
          period_start: string | null
          previous_year_amount: number | null
          previous_year_base: number | null
          previous_year_data: Json | null
          previous_year_discount: number | null
          real_adjustment_reason: string | null
          real_adjustments: Json | null
          status: string
          tenant_id: string
          total_amount: number
          updated_at: string | null
          updated_by: string | null
          vat_amount: number
          year: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          base_amount?: number | null
          calculated_base_amount: number
          calculation_metadata?: Json | null
          client_id: string
          created_at?: string | null
          created_by?: string | null
          current_year_data?: Json | null
          discount_amount?: number | null
          discount_percentage?: number | null
          due_date?: string | null
          fee_type_id?: string | null
          final_amount?: number | null
          id?: string
          inflation_adjustment?: number | null
          inflation_rate?: number | null
          month?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          payment_terms?: string | null
          period_end?: string | null
          period_start?: string | null
          previous_year_amount?: number | null
          previous_year_base?: number | null
          previous_year_data?: Json | null
          previous_year_discount?: number | null
          real_adjustment_reason?: string | null
          real_adjustments?: Json | null
          status?: string
          tenant_id: string
          total_amount: number
          updated_at?: string | null
          updated_by?: string | null
          vat_amount: number
          year: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          base_amount?: number | null
          calculated_base_amount?: number
          calculation_metadata?: Json | null
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          current_year_data?: Json | null
          discount_amount?: number | null
          discount_percentage?: number | null
          due_date?: string | null
          fee_type_id?: string | null
          final_amount?: number | null
          id?: string
          inflation_adjustment?: number | null
          inflation_rate?: number | null
          month?: number | null
          notes?: string | null
          payment_date?: string | null
          payment_reference?: string | null
          payment_terms?: string | null
          period_end?: string | null
          period_start?: string | null
          previous_year_amount?: number | null
          previous_year_base?: number | null
          previous_year_data?: Json | null
          previous_year_discount?: number | null
          real_adjustment_reason?: string | null
          real_adjustments?: Json | null
          status?: string
          tenant_id?: string
          total_amount?: number
          updated_at?: string | null
          updated_by?: string | null
          vat_amount?: number
          year?: number
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
            foreignKeyName: "fee_calculations_fee_type_id_fkey"
            columns: ["fee_type_id"]
            isOneToOne: false
            referencedRelation: "fee_types"
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
      generated_letters: {
        Row: {
          clicked_at: string | null
          client_id: string
          created_at: string | null
          created_by: string | null
          fee_calculation_id: string | null
          generated_content_html: string
          generated_content_text: string | null
          id: string
          opened_at: string | null
          payment_link: string | null
          sent_at: string | null
          sent_via: string | null
          template_id: string
          tenant_id: string
          variables_used: Json
        }
        Insert: {
          clicked_at?: string | null
          client_id: string
          created_at?: string | null
          created_by?: string | null
          fee_calculation_id?: string | null
          generated_content_html: string
          generated_content_text?: string | null
          id?: string
          opened_at?: string | null
          payment_link?: string | null
          sent_at?: string | null
          sent_via?: string | null
          template_id: string
          tenant_id: string
          variables_used: Json
        }
        Update: {
          clicked_at?: string | null
          client_id?: string
          created_at?: string | null
          created_by?: string | null
          fee_calculation_id?: string | null
          generated_content_html?: string
          generated_content_text?: string | null
          id?: string
          opened_at?: string | null
          payment_link?: string | null
          sent_at?: string | null
          sent_via?: string | null
          template_id?: string
          tenant_id?: string
          variables_used?: Json
        }
        Relationships: [
          {
            foreignKeyName: "generated_letters_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "letter_templates"
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
      letter_templates: {
        Row: {
          content_html: string
          content_text: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          language: string | null
          name: string
          selection_rules: Json | null
          subject: string | null
          template_type: Database["public"]["Enums"]["letter_template_type"]
          tenant_id: string
          updated_at: string | null
          variables_schema: Json
          version: number | null
        }
        Insert: {
          content_html: string
          content_text?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          name: string
          selection_rules?: Json | null
          subject?: string | null
          template_type: Database["public"]["Enums"]["letter_template_type"]
          tenant_id: string
          updated_at?: string | null
          variables_schema: Json
          version?: number | null
        }
        Update: {
          content_html?: string
          content_text?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          name?: string
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
          phone?: string | null
          rejection_reason?: string | null
          requested_role?: Database["public"]["Enums"]["user_role"]
          status?: string | null
          tax_id?: string | null
        }
        Relationships: []
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
      tenant_activity_logs: {
        Row: {
          action: string
          action_category: string | null
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown | null
          request_id: string | null
          resource_id: string | null
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
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          request_id?: string | null
          resource_id?: string | null
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
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          request_id?: string | null
          resource_id?: string | null
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
      tenant_settings: {
        Row: {
          accent_color: string | null
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
          secondary_color: string | null
          tenant_id: string | null
          timezone: string | null
          trial_ends_at: string | null
          updated_at: string | null
        }
        Insert: {
          accent_color?: string | null
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
          secondary_color?: string | null
          tenant_id?: string | null
          timezone?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
        }
        Update: {
          accent_color?: string | null
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
          secondary_color?: string | null
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
          cancelled_at: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          plan_name: string
          status: string
          tenant_id: string
          trial_end_date: string | null
          updated_at: string | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          plan_name: string
          status: string
          tenant_id: string
          trial_end_date?: string | null
          updated_at?: string | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          plan_name?: string
          status?: string
          tenant_id?: string
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
          id: string
          letters_sent: number | null
          new_clients: number | null
          payments_processed: number | null
          period_end: string
          period_start: string
          period_type: string
          revenue_collected: number | null
          storage_used_mb: number | null
          tenant_id: string
          total_clients: number | null
          total_logins: number | null
        }
        Insert: {
          active_users?: number | null
          api_calls?: number | null
          created_at?: string | null
          id?: string
          letters_sent?: number | null
          new_clients?: number | null
          payments_processed?: number | null
          period_end: string
          period_start: string
          period_type: string
          revenue_collected?: number | null
          storage_used_mb?: number | null
          tenant_id: string
          total_clients?: number | null
          total_logins?: number | null
        }
        Update: {
          active_users?: number | null
          api_calls?: number | null
          created_at?: string | null
          id?: string
          letters_sent?: number | null
          new_clients?: number | null
          payments_processed?: number | null
          period_end?: string
          period_start?: string
          period_type?: string
          revenue_collected?: number | null
          storage_used_mb?: number | null
          tenant_id?: string
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
      tenant_users: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          permissions: Json | null
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          permissions?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          billing_email: string | null
          created_at: string | null
          deleted_at: string | null
          expires_at: string | null
          features: Json
          id: string
          max_clients: number | null
          max_users: number | null
          name: string
          name_english: string | null
          settings: Json
          status: string
          subscription_plan: string
          type: string
          updated_at: string | null
        }
        Insert: {
          billing_email?: string | null
          created_at?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          features?: Json
          id?: string
          max_clients?: number | null
          max_users?: number | null
          name: string
          name_english?: string | null
          settings?: Json
          status?: string
          subscription_plan?: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          billing_email?: string | null
          created_at?: string | null
          deleted_at?: string | null
          expires_at?: string | null
          features?: Json
          id?: string
          max_clients?: number | null
          max_users?: number | null
          name?: string
          name_english?: string | null
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
          ip_address: unknown | null
          payload: Json
          processed_at: string | null
          response_sent: string | null
          source: string
        }
        Insert: {
          error_message?: string | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          payload: Json
          processed_at?: string | null
          response_sent?: string | null
          source: string
        }
        Update: {
          error_message?: string | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          payload?: Json
          processed_at?: string | null
          response_sent?: string | null
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      format_ils: {
        Args: { amount: number }
        Returns: string
      }
      format_israeli_date: {
        Args: { date_input: string }
        Returns: string
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
      get_current_tenant_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_fee_summary: {
        Args: { p_tenant_id: string }
        Returns: {
          paid_amount: number
          pending_amount: number
          total_amount: number
          total_approved: number
          total_draft: number
          total_fees: number
          total_paid: number
          total_pending: number
          total_sent: number
        }[]
      }
      get_user_accessible_clients: {
        Args: { p_user_id?: string }
        Returns: string[]
      }
      get_user_role: {
        Args: { p_user_id?: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      get_users_for_tenant: {
        Args: Record<PropertyKey, never>
        Returns: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          last_sign_in_at: string
          permissions: Json
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string
          updated_at: string
          user_id: string
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      is_super_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      is_tenant_admin: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      log_tenant_activity: {
        Args: {
          p_action: string
          p_details?: Json
          p_resource_id?: string
          p_resource_type?: string
        }
        Returns: string
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      user_has_client_access: {
        Args: { p_client_id: string; p_user_id?: string }
        Returns: boolean
      }
      validate_israeli_tax_id: {
        Args: { tax_id: string }
        Returns: boolean
      }
    }
    Enums: {
      fee_status: "draft" | "sent" | "paid" | "overdue" | "cancelled"
      letter_template_type:
        | "annual_fee_notification"
        | "fee_increase_inflation"
        | "fee_increase_real"
        | "payment_reminder_gentle"
        | "payment_reminder_firm"
        | "payment_overdue"
        | "service_suspension_warning"
        | "payment_confirmation"
        | "new_client_welcome"
        | "service_completion"
        | "custom_consultation"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      tenant_status: "active" | "inactive" | "trial" | "suspended"
      tenant_type: "internal" | "white_label"
      user_role: "admin" | "accountant" | "bookkeeper" | "client"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never