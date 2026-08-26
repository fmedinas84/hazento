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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_type: string
          address_line: string | null
          archived_at: string | null
          city: string | null
          commune: string | null
          created_at: string
          display_name: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          legal_name: string | null
          normalized_email: string | null
          notes: string | null
          organization_id: string | null
          phone: string | null
          role: string | null
          status: string
          tax_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          account_type: string
          address_line?: string | null
          archived_at?: string | null
          city?: string | null
          commune?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          legal_name?: string | null
          normalized_email?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          status: string
          tax_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          account_type?: string
          address_line?: string | null
          archived_at?: string | null
          city?: string | null
          commune?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          legal_name?: string | null
          normalized_email?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          status?: string
          tax_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_workspace_organization_fk"
            columns: ["workspace_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["workspace_id", "id"]
          },
        ]
      }
      activities: {
        Row: {
          account_id: string
          activity_type: string
          completed_at: string | null
          contact_id: string | null
          created_at: string
          description: string | null
          engagement_id: string | null
          id: string
          opportunity_id: string | null
          prestation_id: string | null
          scheduled_at: string | null
          source: string | null
          status: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          account_id: string
          activity_type: string
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          engagement_id?: string | null
          id?: string
          opportunity_id?: string | null
          prestation_id?: string | null
          scheduled_at?: string | null
          source?: string | null
          status: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          account_id?: string
          activity_type?: string
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          engagement_id?: string | null
          id?: string
          opportunity_id?: string | null
          prestation_id?: string | null
          scheduled_at?: string | null
          source?: string | null
          status?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_workspace_id_account_id_contact_id_fkey"
            columns: ["workspace_id", "account_id", "contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["workspace_id", "account_id", "id"]
          },
          {
            foreignKeyName: "activities_workspace_id_account_id_engagement_id_fkey"
            columns: ["workspace_id", "account_id", "engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["workspace_id", "account_id", "id"]
          },
          {
            foreignKeyName: "activities_workspace_id_account_id_fkey"
            columns: ["workspace_id", "account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "activities_workspace_id_account_id_opportunity_id_fkey"
            columns: ["workspace_id", "account_id", "opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["workspace_id", "account_id", "id"]
          },
          {
            foreignKeyName: "activities_workspace_id_account_id_prestation_id_fkey"
            columns: ["workspace_id", "account_id", "prestation_id"]
            isOneToOne: false
            referencedRelation: "prestations"
            referencedColumns: ["workspace_id", "account_id", "id"]
          },
          {
            foreignKeyName: "activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_reminders: {
        Row: {
          account_id: string
          created_at: string
          error_message: string | null
          id: string
          lead_hours: number
          prestation_id: string
          provider: string
          provider_message_id: string | null
          recipient_email: string
          scheduled_for: string
          sent_at: string | null
          slot: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          lead_hours: number
          prestation_id: string
          provider?: string
          provider_message_id?: string | null
          recipient_email: string
          scheduled_for: string
          sent_at?: string | null
          slot: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          lead_hours?: number
          prestation_id?: string
          provider?: string
          provider_message_id?: string | null
          recipient_email?: string
          scheduled_for?: string
          sent_at?: string | null
          slot?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminders_account_fk"
            columns: ["workspace_id", "account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "appointment_reminders_prestation_fk"
            columns: ["workspace_id", "prestation_id"]
            isOneToOne: false
            referencedRelation: "prestations"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "appointment_reminders_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          account_id: string
          created_at: string
          email: string | null
          first_name: string
          id: string
          is_primary: boolean
          job_title: string | null
          last_name: string
          notes: string | null
          phone: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          email?: string | null
          first_name: string
          id?: string
          is_primary?: boolean
          job_title?: string | null
          last_name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          email?: string | null
          first_name?: string
          id?: string
          is_primary?: boolean
          job_title?: string | null
          last_name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_workspace_id_account_id_fkey"
            columns: ["workspace_id", "account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      document_adjustments: {
        Row: {
          adjustment_date: string
          adjustment_type: string
          amount: number
          created_at: string
          document_id: string
          id: string
          reason: string
          recorded_by: string | null
          tax_correction_status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          adjustment_date?: string
          adjustment_type: string
          amount: number
          created_at?: string
          document_id: string
          id?: string
          reason: string
          recorded_by?: string | null
          tax_correction_status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          adjustment_date?: string
          adjustment_type?: string
          amount?: number
          created_at?: string
          document_id?: string
          id?: string
          reason?: string
          recorded_by?: string | null
          tax_correction_status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_adjustments_workspace_id_document_id_fkey"
            columns: ["workspace_id", "document_id"]
            isOneToOne: false
            referencedRelation: "document_payment_summaries"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "document_adjustments_workspace_id_document_id_fkey"
            columns: ["workspace_id", "document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "document_adjustments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          account_id: string
          created_at: string
          currency_code: string
          document_number: string | null
          document_type: string
          id: string
          issued_at: string | null
          notes: string | null
          tax_status: string
          total_amount: number
          updated_at: string
          voided_at: string | null
          workspace_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          currency_code?: string
          document_number?: string | null
          document_type?: string
          id?: string
          issued_at?: string | null
          notes?: string | null
          tax_status?: string
          total_amount: number
          updated_at?: string
          voided_at?: string | null
          workspace_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          currency_code?: string
          document_number?: string | null
          document_type?: string
          id?: string
          issued_at?: string | null
          notes?: string | null
          tax_status?: string
          total_amount?: number
          updated_at?: string
          voided_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_workspace_id_account_id_fkey"
            columns: ["workspace_id", "account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      engagements: {
        Row: {
          account_id: string
          agreed_amount: number | null
          billing_type: string
          created_at: string
          end_date: string | null
          engagement_type: string
          id: string
          name: string
          notes: string | null
          opportunity_id: string | null
          recurrence_rule: string | null
          start_date: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          account_id: string
          agreed_amount?: number | null
          billing_type: string
          created_at?: string
          end_date?: string | null
          engagement_type: string
          id?: string
          name: string
          notes?: string | null
          opportunity_id?: string | null
          recurrence_rule?: string | null
          start_date?: string | null
          status: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          account_id?: string
          agreed_amount?: number | null
          billing_type?: string
          created_at?: string
          end_date?: string | null
          engagement_type?: string
          id?: string
          name?: string
          notes?: string | null
          opportunity_id?: string | null
          recurrence_rule?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagements_workspace_id_account_id_fkey"
            columns: ["workspace_id", "account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "engagements_workspace_id_account_id_opportunity_id_fkey"
            columns: ["workspace_id", "account_id", "opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["workspace_id", "account_id", "id"]
          },
          {
            foreignKeyName: "engagements_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          account_id: string
          created_at: string
          estimated_amount: number | null
          expected_close_date: string | null
          id: string
          lost_at: string | null
          lost_reason: string | null
          name: string
          notes: string | null
          primary_contact_id: string | null
          probability: number | null
          stage: string
          status: string
          updated_at: string
          won_at: string | null
          workspace_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          estimated_amount?: number | null
          expected_close_date?: string | null
          id?: string
          lost_at?: string | null
          lost_reason?: string | null
          name: string
          notes?: string | null
          primary_contact_id?: string | null
          probability?: number | null
          stage: string
          status: string
          updated_at?: string
          won_at?: string | null
          workspace_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          estimated_amount?: number | null
          expected_close_date?: string | null
          id?: string
          lost_at?: string | null
          lost_reason?: string | null
          name?: string
          notes?: string | null
          primary_contact_id?: string | null
          probability?: number | null
          stage?: string
          status?: string
          updated_at?: string
          won_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_workspace_id_account_id_fkey"
            columns: ["workspace_id", "account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "opportunities_workspace_id_account_id_primary_contact_id_fkey"
            columns: ["workspace_id", "account_id", "primary_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["workspace_id", "account_id", "id"]
          },
          {
            foreignKeyName: "opportunities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          archived_at: string | null
          business_activity: string | null
          city: string | null
          commune: string | null
          created_at: string
          email: string | null
          id: string
          legal_name: string | null
          name: string
          normalized_name: string | null
          notes: string | null
          phone: string | null
          region: string | null
          tax_id: string | null
          updated_at: string
          website: string | null
          workspace_id: string
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          business_activity?: string | null
          city?: string | null
          commune?: string | null
          created_at?: string
          email?: string | null
          id?: string
          legal_name?: string | null
          name: string
          normalized_name?: string | null
          notes?: string | null
          phone?: string | null
          region?: string | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
          workspace_id: string
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          business_activity?: string | null
          city?: string | null
          commune?: string | null
          created_at?: string
          email?: string | null
          id?: string
          legal_name?: string | null
          name?: string
          normalized_name?: string | null
          notes?: string | null
          phone?: string | null
          region?: string | null
          tax_id?: string | null
          updated_at?: string
          website?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          amount: number
          created_at: string
          document_id: string | null
          id: string
          payment_id: string
          payment_request_id: string | null
          prestation_id: string | null
          workspace_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          document_id?: string | null
          id?: string
          payment_id: string
          payment_request_id?: string | null
          prestation_id?: string | null
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          document_id?: string | null
          id?: string
          payment_id?: string
          payment_request_id?: string | null
          prestation_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_workspace_document_id_fkey"
            columns: ["workspace_id", "document_id"]
            isOneToOne: false
            referencedRelation: "document_payment_summaries"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "payment_allocations_workspace_document_id_fkey"
            columns: ["workspace_id", "document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "payment_allocations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_workspace_id_payment_id_fkey"
            columns: ["workspace_id", "payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "payment_allocations_workspace_id_prestation_id_fkey"
            columns: ["workspace_id", "prestation_id"]
            isOneToOne: false
            referencedRelation: "prestations"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "payment_allocations_workspace_request_fk"
            columns: ["workspace_id", "payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_request_summaries"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "payment_allocations_workspace_request_fk"
            columns: ["workspace_id", "payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["workspace_id", "id"]
          },
        ]
      }
      payment_request_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          engagement_id: string | null
          id: string
          payment_request_id: string
          prestation_id: string | null
          workspace_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          engagement_id?: string | null
          id?: string
          payment_request_id: string
          prestation_id?: string | null
          workspace_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          engagement_id?: string | null
          id?: string
          payment_request_id?: string
          prestation_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_request_items_engagement_fk"
            columns: ["workspace_id", "engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "payment_request_items_prestation_fk"
            columns: ["workspace_id", "prestation_id"]
            isOneToOne: false
            referencedRelation: "prestations"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "payment_request_items_request_fk"
            columns: ["workspace_id", "payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_request_summaries"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "payment_request_items_request_fk"
            columns: ["workspace_id", "payment_request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "payment_request_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_requests: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          currency_code: string
          due_date: string | null
          id: string
          notes: string | null
          origin_engagement_id: string | null
          origin_opportunity_id: string | null
          origin_prestation_id: string | null
          parent_request_id: string | null
          status: string
          updated_at: string
          waived_amount: number
          waived_at: string | null
          waived_by: string | null
          waiver_reason: string | null
          workspace_id: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          currency_code?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          origin_engagement_id?: string | null
          origin_opportunity_id?: string | null
          origin_prestation_id?: string | null
          parent_request_id?: string | null
          status?: string
          updated_at?: string
          waived_amount?: number
          waived_at?: string | null
          waived_by?: string | null
          waiver_reason?: string | null
          workspace_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          currency_code?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          origin_engagement_id?: string | null
          origin_opportunity_id?: string | null
          origin_prestation_id?: string | null
          parent_request_id?: string | null
          status?: string
          updated_at?: string
          waived_amount?: number
          waived_at?: string | null
          waived_by?: string | null
          waiver_reason?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_engagement_fk"
            columns: ["workspace_id", "account_id", "origin_engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["workspace_id", "account_id", "id"]
          },
          {
            foreignKeyName: "payment_requests_opportunity_fk"
            columns: ["workspace_id", "account_id", "origin_opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["workspace_id", "account_id", "id"]
          },
          {
            foreignKeyName: "payment_requests_parent_fk"
            columns: ["workspace_id", "account_id", "parent_request_id"]
            isOneToOne: false
            referencedRelation: "payment_request_summaries"
            referencedColumns: ["workspace_id", "account_id", "id"]
          },
          {
            foreignKeyName: "payment_requests_parent_fk"
            columns: ["workspace_id", "account_id", "parent_request_id"]
            isOneToOne: false
            referencedRelation: "payment_requests"
            referencedColumns: ["workspace_id", "account_id", "id"]
          },
          {
            foreignKeyName: "payment_requests_prestation_fk"
            columns: ["workspace_id", "account_id", "origin_prestation_id"]
            isOneToOne: false
            referencedRelation: "prestations"
            referencedColumns: ["workspace_id", "account_id", "id"]
          },
          {
            foreignKeyName: "payment_requests_workspace_account_fk"
            columns: ["workspace_id", "account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "payment_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          currency_code: string
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          reference: string | null
          status: string
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          workspace_id: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          currency_code?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          reference?: string | null
          status: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          workspace_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          currency_code?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          reference?: string | null
          status?: string
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_workspace_id_account_id_fkey"
            columns: ["workspace_id", "account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "payments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      prestations: {
        Row: {
          account_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          engagement_id: string | null
          follow_up_note: string | null
          id: string
          name: string
          notes: string | null
          opportunity_id: string | null
          quantity: number
          scheduled_end: string | null
          scheduled_start: string | null
          service_id: string | null
          status: string
          total_amount: number
          unit_price: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          account_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          engagement_id?: string | null
          follow_up_note?: string | null
          id?: string
          name: string
          notes?: string | null
          opportunity_id?: string | null
          quantity?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          service_id?: string | null
          status: string
          total_amount?: number
          unit_price?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          account_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          engagement_id?: string | null
          follow_up_note?: string | null
          id?: string
          name?: string
          notes?: string | null
          opportunity_id?: string | null
          quantity?: number
          scheduled_end?: string | null
          scheduled_start?: string | null
          service_id?: string | null
          status?: string
          total_amount?: number
          unit_price?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prestations_workspace_id_account_id_engagement_id_fkey"
            columns: ["workspace_id", "account_id", "engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["workspace_id", "account_id", "id"]
          },
          {
            foreignKeyName: "prestations_workspace_id_account_id_fkey"
            columns: ["workspace_id", "account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "prestations_workspace_id_account_id_opportunity_id_fkey"
            columns: ["workspace_id", "account_id", "opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["workspace_id", "account_id", "id"]
          },
          {
            foreignKeyName: "prestations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prestations_workspace_id_service_id_fkey"
            columns: ["workspace_id", "service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["workspace_id", "id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          active: boolean
          created_at: string
          default_duration_minutes: number | null
          default_price: number | null
          description: string | null
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_duration_minutes?: number | null
          default_price?: number | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_duration_minutes?: number | null
          default_price?: number | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          next_payment_date: string | null
          plan: string
          provider: string | null
          provider_plan_id: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          next_payment_date?: string | null
          plan: string
          provider?: string | null
          provider_plan_id?: string | null
          provider_subscription_id?: string | null
          status: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          next_payment_date?: string | null
          plan?: string
          provider?: string | null
          provider_plan_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          address_line: string | null
          country_code: string
          created_at: string
          currency_code: string
          id: string
          name: string
          reminder_email_enabled: boolean
          reminder_primary_hours: number
          reminder_secondary_enabled: boolean
          reminder_secondary_hours: number
          tax_id: string | null
          timezone: string
          updated_at: string
          vertical_type: string
        }
        Insert: {
          address_line?: string | null
          country_code?: string
          created_at?: string
          currency_code?: string
          id?: string
          name: string
          reminder_email_enabled?: boolean
          reminder_primary_hours?: number
          reminder_secondary_enabled?: boolean
          reminder_secondary_hours?: number
          tax_id?: string | null
          timezone?: string
          updated_at?: string
          vertical_type: string
        }
        Update: {
          address_line?: string | null
          country_code?: string
          created_at?: string
          currency_code?: string
          id?: string
          name?: string
          reminder_email_enabled?: boolean
          reminder_primary_hours?: number
          reminder_secondary_enabled?: boolean
          reminder_secondary_hours?: number
          tax_id?: string | null
          timezone?: string
          updated_at?: string
          vertical_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      document_payment_summaries: {
        Row: {
          account_id: string | null
          adjusted_amount: number | null
          collection_status: string | null
          id: string | null
          outstanding_amount: number | null
          paid_amount: number | null
          tax_status: string | null
          total_amount: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_workspace_id_account_id_fkey"
            columns: ["workspace_id", "account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "documents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_request_summaries: {
        Row: {
          account_id: string | null
          amount: number | null
          id: string | null
          outstanding_amount: number | null
          paid_amount: number | null
          status: string | null
          waived_amount: number | null
          workspace_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_requests_workspace_account_fk"
            columns: ["workspace_id", "account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "payment_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      bootstrap_user_workspace: {
        Args: {
          p_first_name?: string
          p_last_name?: string
          p_vertical_type: string
          p_workspace_name: string
        }
        Returns: string
      }
      create_payment_request_with_items: {
        Args: {
          p_account_id: string
          p_amount: number
          p_due_date?: string
          p_items?: Json
          p_notes?: string
          p_origin_engagement_id?: string
          p_origin_opportunity_id?: string
          p_origin_prestation_id?: string
        }
        Returns: string
      }
      create_workspace: {
        Args: {
          p_country_code?: string
          p_currency_code?: string
          p_name: string
          p_tax_id?: string
          p_timezone?: string
          p_vertical_type: string
        }
        Returns: string
      }
      is_workspace_member: {
        Args: { workspace_uuid: string }
        Returns: boolean
      }
      replace_document_payment_allocations: {
        Args: { p_allocations: Json; p_payment_id: string }
        Returns: undefined
      }
      settle_payment_request: {
        Args: {
          p_difference_action?: string
          p_payment_method: string
          p_received_amount: number
          p_request_id: string
          p_waiver_reason?: string
        }
        Returns: {
          payment_id: string
          successor_request_id: string
        }[]
      }
      void_received_payment: {
        Args: { p_payment_id: string; p_reason: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const

