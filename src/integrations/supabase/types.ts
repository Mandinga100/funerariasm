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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string
          id: string
          message: string | null
          read: boolean
          read_at: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          read_at?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      agenda_event_attendees: {
        Row: {
          created_at: string
          event_id: string
          id: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_event_attendees_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "agenda_events"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_event_history: {
        Row: {
          change_type: string
          created_at: string
          description: string | null
          event_id: string
          id: string
          new_value: Json | null
          old_value: Json | null
          performed_by: string | null
        }
        Insert: {
          change_type: string
          created_at?: string
          description?: string | null
          event_id: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          performed_by?: string | null
        }
        Update: {
          change_type?: string
          created_at?: string
          description?: string | null
          event_id?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_event_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "agenda_events"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_events: {
        Row: {
          address: string | null
          all_day: boolean
          assigned_to: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          comuna: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          description: string | null
          end_at: string
          event_type: string
          id: string
          internal_notes: string | null
          lead_id: string | null
          location_name: string | null
          memorial_id: string | null
          metadata: Json | null
          obituary_id: string | null
          priority: string
          reminded_at: string | null
          reminder_minutes_before: number | null
          service_case_id: string | null
          start_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          all_day?: boolean
          assigned_to?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          comuna?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          end_at: string
          event_type?: string
          id?: string
          internal_notes?: string | null
          lead_id?: string | null
          location_name?: string | null
          memorial_id?: string | null
          metadata?: Json | null
          obituary_id?: string | null
          priority?: string
          reminded_at?: string | null
          reminder_minutes_before?: number | null
          service_case_id?: string | null
          start_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          all_day?: boolean
          assigned_to?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          comuna?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          end_at?: string
          event_type?: string
          id?: string
          internal_notes?: string | null
          lead_id?: string | null
          location_name?: string | null
          memorial_id?: string | null
          metadata?: Json | null
          obituary_id?: string | null
          priority?: string
          reminded_at?: string | null
          reminder_minutes_before?: number | null
          service_case_id?: string | null
          start_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "contact_leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_events_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_events_obituary_id_fkey"
            columns: ["obituary_id"]
            isOneToOne: false
            referencedRelation: "obituaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_events_service_case_id_fkey"
            columns: ["service_case_id"]
            isOneToOne: false
            referencedRelation: "service_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_action_invocations: {
        Row: {
          action_key: string
          created_at: string
          estimated_cost_usd: number
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action_key: string
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action_key?: string
          created_at?: string
          estimated_cost_usd?: number
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_action_settings: {
        Row: {
          action_key: string
          created_at: string
          description: string
          display_name: string
          enabled: boolean
          estimated_cost_usd: number
          id: string
          model: string | null
          module: string
          updated_at: string
        }
        Insert: {
          action_key: string
          created_at?: string
          description: string
          display_name: string
          enabled?: boolean
          estimated_cost_usd?: number
          id?: string
          model?: string | null
          module: string
          updated_at?: string
        }
        Update: {
          action_key?: string
          created_at?: string
          description?: string
          display_name?: string
          enabled?: boolean
          estimated_cost_usd?: number
          id?: string
          model?: string | null
          module?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          module: string
          new_data: Json | null
          old_data: Json | null
          user_agent: string | null
          user_email: string | null
          user_id: string
          user_role: string | null
        }
        Insert: {
          action: string
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          module: string
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id: string
          user_role?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          module?: string
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string
          user_role?: string | null
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_name: string | null
          category: string | null
          content: string
          cover_image: string | null
          created_at: string
          excerpt: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          published: boolean
          published_at: string | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          category?: string | null
          content: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean
          published_at?: string | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          category?: string | null
          content?: string
          cover_image?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          published?: boolean
          published_at?: string | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_subscribers: {
        Row: {
          email: string
          id: string
          metadata: Json | null
          source: string | null
          subscribed_at: string
          unsubscribed_at: string | null
        }
        Insert: {
          email: string
          id?: string
          metadata?: Json | null
          source?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Update: {
          email?: string
          id?: string
          metadata?: Json | null
          source?: string | null
          subscribed_at?: string
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      case_documents: {
        Row: {
          case_id: string
          created_at: string
          document_name: string
          document_type: string
          expires_at: string | null
          id: string
          metadata: Json | null
          mime_type: string | null
          notes: string | null
          size_bytes: number | null
          status: string
          storage_path: string | null
          updated_at: string
          uploaded_by: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          case_id: string
          created_at?: string
          document_name: string
          document_type: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          notes?: string | null
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          case_id?: string
          created_at?: string
          document_name?: string
          document_type?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          notes?: string | null
          size_bytes?: number | null
          status?: string
          storage_path?: string | null
          updated_at?: string
          uploaded_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "service_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_milestones: {
        Row: {
          assigned_to: string | null
          case_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          metadata: Json | null
          milestone_key: string
          notes: string | null
          position: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          case_id: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json | null
          milestone_key: string
          notes?: string | null
          position?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          case_id?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json | null
          milestone_key?: string
          notes?: string | null
          position?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_milestones_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "service_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_status_log: {
        Row: {
          case_id: string
          created_at: string
          id: string
          new_value: string
          old_value: string | null
          performed_by: string | null
          reason: string | null
          status_area: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          new_value: string
          old_value?: string | null
          performed_by?: string | null
          reason?: string | null
          status_area: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          new_value?: string
          old_value?: string | null
          performed_by?: string | null
          reason?: string | null
          status_area?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_status_log_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "service_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      comuna_conversion_events: {
        Row: {
          comuna_nombre: string | null
          comuna_slug: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          pathname: string | null
          session_id: string | null
          target: string | null
          user_agent: string | null
        }
        Insert: {
          comuna_nombre?: string | null
          comuna_slug: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          pathname?: string | null
          session_id?: string | null
          target?: string | null
          user_agent?: string | null
        }
        Update: {
          comuna_nombre?: string | null
          comuna_slug?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          pathname?: string | null
          session_id?: string | null
          target?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      comuna_page_views: {
        Row: {
          comuna_nombre: string | null
          comuna_slug: string
          created_at: string
          id: string
          pathname: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          comuna_nombre?: string | null
          comuna_slug: string
          created_at?: string
          id?: string
          pathname: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          comuna_nombre?: string | null
          comuna_slug?: string
          created_at?: string
          id?: string
          pathname?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      condolences: {
        Row: {
          approved: boolean
          author_name: string
          created_at: string
          id: string
          memorial_id: string
          message: string
        }
        Insert: {
          approved?: boolean
          author_name: string
          created_at?: string
          id?: string
          memorial_id: string
          message: string
        }
        Update: {
          approved?: boolean
          author_name?: string
          created_at?: string
          id?: string
          memorial_id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "condolences_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_leads: {
        Row: {
          ai_classification: Json | null
          ai_summary: string | null
          assigned_to: string | null
          comuna: string | null
          contact_type: string
          created_at: string
          email: string | null
          estimated_value: number | null
          id: string
          intent: string | null
          last_contacted_at: string | null
          message: string | null
          metadata: Json | null
          name: string | null
          next_follow_up: string | null
          phone: string | null
          pipeline_stage: string
          selected_plan: string | null
          source: string | null
          status: string | null
          urgency: string | null
          whatsapp_message: string | null
        }
        Insert: {
          ai_classification?: Json | null
          ai_summary?: string | null
          assigned_to?: string | null
          comuna?: string | null
          contact_type?: string
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          id?: string
          intent?: string | null
          last_contacted_at?: string | null
          message?: string | null
          metadata?: Json | null
          name?: string | null
          next_follow_up?: string | null
          phone?: string | null
          pipeline_stage?: string
          selected_plan?: string | null
          source?: string | null
          status?: string | null
          urgency?: string | null
          whatsapp_message?: string | null
        }
        Update: {
          ai_classification?: Json | null
          ai_summary?: string | null
          assigned_to?: string | null
          comuna?: string | null
          contact_type?: string
          created_at?: string
          email?: string | null
          estimated_value?: number | null
          id?: string
          intent?: string | null
          last_contacted_at?: string | null
          message?: string | null
          metadata?: Json | null
          name?: string | null
          next_follow_up?: string | null
          phone?: string | null
          pipeline_stage?: string
          selected_plan?: string | null
          source?: string | null
          status?: string | null
          urgency?: string | null
          whatsapp_message?: string | null
        }
        Relationships: []
      }
      family_tracking: {
        Row: {
          assigned_at: string
          family_code: string
          family_email: string | null
          family_name: string
          family_phone: string | null
          id: string
          memorial_id: string | null
          notes: string | null
          obituary_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          family_code?: string
          family_email?: string | null
          family_name: string
          family_phone?: string | null
          id?: string
          memorial_id?: string | null
          notes?: string | null
          obituary_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          family_code?: string
          family_email?: string | null
          family_name?: string
          family_phone?: string | null
          id?: string
          memorial_id?: string | null
          notes?: string | null
          obituary_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_tracking_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_tracking_obituary_id_fkey"
            columns: ["obituary_id"]
            isOneToOne: false
            referencedRelation: "obituaries"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          activity_type: string
          created_at: string
          description: string
          id: string
          lead_id: string
          metadata: Json | null
          performed_by: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string
          description: string
          id?: string
          lead_id: string
          metadata?: Json | null
          performed_by?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string
          description?: string
          id?: string
          lead_id?: string
          metadata?: Json | null
          performed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "contact_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          lead_id: string
          note_type: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          lead_id: string
          note_type?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
          note_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "contact_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_offerings: {
        Row: {
          amount: number | null
          created_at: string
          crown_tier: number | null
          donor_message: string | null
          donor_name: string
          id: string
          memorial_id: string
          offering_type: string
          payment_status: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          crown_tier?: number | null
          donor_message?: string | null
          donor_name?: string
          id?: string
          memorial_id: string
          offering_type: string
          payment_status?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          crown_tier?: number | null
          donor_message?: string | null
          donor_name?: string
          id?: string
          memorial_id?: string
          offering_type?: string
          payment_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorial_offerings_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      memorials: {
        Row: {
          biography: string | null
          birth_date: string | null
          city: string | null
          created_at: string
          death_date: string
          full_name: string
          id: string
          meta_description: string | null
          meta_title: string | null
          photo_url: string | null
          published: boolean
          published_at: string | null
          slug: string
          tribute_text: string | null
          updated_at: string
        }
        Insert: {
          biography?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          death_date: string
          full_name: string
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          photo_url?: string | null
          published?: boolean
          published_at?: string | null
          slug: string
          tribute_text?: string | null
          updated_at?: string
        }
        Update: {
          biography?: string | null
          birth_date?: string | null
          city?: string | null
          created_at?: string
          death_date?: string
          full_name?: string
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          photo_url?: string | null
          published?: boolean
          published_at?: string | null
          slug?: string
          tribute_text?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      obituaries: {
        Row: {
          biography: string | null
          birth_date: string | null
          ceremony_location: string | null
          ceremony_schedule: string | null
          city: string | null
          created_at: string
          death_date: string
          family_message: string | null
          family_names: string | null
          full_name: string
          id: string
          meta_description: string | null
          meta_title: string | null
          photo_url: string | null
          published: boolean
          published_at: string | null
          slug: string
          updated_at: string
          wake_location: string | null
          wake_schedule: string | null
        }
        Insert: {
          biography?: string | null
          birth_date?: string | null
          ceremony_location?: string | null
          ceremony_schedule?: string | null
          city?: string | null
          created_at?: string
          death_date: string
          family_message?: string | null
          family_names?: string | null
          full_name: string
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          photo_url?: string | null
          published?: boolean
          published_at?: string | null
          slug: string
          updated_at?: string
          wake_location?: string | null
          wake_schedule?: string | null
        }
        Update: {
          biography?: string | null
          birth_date?: string | null
          ceremony_location?: string | null
          ceremony_schedule?: string | null
          city?: string | null
          created_at?: string
          death_date?: string
          family_message?: string | null
          family_names?: string | null
          full_name?: string
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          photo_url?: string | null
          published?: boolean
          published_at?: string | null
          slug?: string
          updated_at?: string
          wake_location?: string | null
          wake_schedule?: string | null
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          case_reference: string | null
          created_at: string
          currency: string
          donor_display_name: string | null
          donor_message: string | null
          email: string
          form_loaded_at: string | null
          form_submitted_at: string | null
          fraud_flags: string[] | null
          full_name: string
          honeypot_triggered: boolean | null
          id: string
          ip_address: string | null
          is_anonymous: boolean | null
          memorial_id: string | null
          metadata: Json | null
          notes: string | null
          payment_subtype: string | null
          payment_type: string
          phone: string
          plan_id: string | null
          plan_name: string | null
          proof_filename: string | null
          proof_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rut: string
          service_description: string | null
          status: string
          transaction_ref: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          amount: number
          case_reference?: string | null
          created_at?: string
          currency?: string
          donor_display_name?: string | null
          donor_message?: string | null
          email: string
          form_loaded_at?: string | null
          form_submitted_at?: string | null
          fraud_flags?: string[] | null
          full_name: string
          honeypot_triggered?: boolean | null
          id?: string
          ip_address?: string | null
          is_anonymous?: boolean | null
          memorial_id?: string | null
          metadata?: Json | null
          notes?: string | null
          payment_subtype?: string | null
          payment_type: string
          phone: string
          plan_id?: string | null
          plan_name?: string | null
          proof_filename?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rut: string
          service_description?: string | null
          status?: string
          transaction_ref?: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          amount?: number
          case_reference?: string | null
          created_at?: string
          currency?: string
          donor_display_name?: string | null
          donor_message?: string | null
          email?: string
          form_loaded_at?: string | null
          form_submitted_at?: string | null
          fraud_flags?: string[] | null
          full_name?: string
          honeypot_triggered?: boolean | null
          id?: string
          ip_address?: string | null
          is_anonymous?: boolean | null
          memorial_id?: string | null
          metadata?: Json | null
          notes?: string | null
          payment_subtype?: string | null
          payment_type?: string
          phone?: string
          plan_id?: string | null
          plan_name?: string | null
          proof_filename?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rut?: string
          service_description?: string | null
          status?: string
          transaction_ref?: string
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      revenue_attribution: {
        Row: {
          amount: number
          attribution_first_visit: string | null
          attribution_referrer: string | null
          comuna_nombre: string | null
          comuna_slug: string
          created_at: string
          id: string
          lead_id: string | null
          metadata: Json | null
          pipeline_stage: string
          recorded_at: string
          selected_plan: string | null
          service_case_id: string
          service_type: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          attribution_first_visit?: string | null
          attribution_referrer?: string | null
          comuna_nombre?: string | null
          comuna_slug: string
          created_at?: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          pipeline_stage: string
          recorded_at?: string
          selected_plan?: string | null
          service_case_id: string
          service_type?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          attribution_first_visit?: string | null
          attribution_referrer?: string | null
          comuna_nombre?: string | null
          comuna_slug?: string
          created_at?: string
          id?: string
          lead_id?: string | null
          metadata?: Json | null
          pipeline_stage?: string
          recorded_at?: string
          selected_plan?: string | null
          service_case_id?: string
          service_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      service_cases: {
        Row: {
          ai_classification: Json | null
          ai_summary: string | null
          amount_paid: number
          assigned_to: string | null
          body_pickup_at: string | null
          branch: string | null
          case_number: string
          cemetery_name: string | null
          ceremony_date: string | null
          ceremony_location: string | null
          client_email: string | null
          client_name: string | null
          client_phone: string | null
          client_rut: string | null
          closed_at: string | null
          commercial_status: string
          comuna: string | null
          created_at: string
          currency: string
          death_cause: string | null
          death_place: string | null
          deceased_birth_date: string | null
          deceased_death_date: string | null
          deceased_gender: string | null
          deceased_name: string | null
          deceased_relationship: string | null
          deceased_rut: string | null
          disposition_type: string | null
          documental_status: string
          documents: string[] | null
          financial_status: string
          id: string
          intent: string | null
          internal_notes: string | null
          lead_id: string | null
          notes: string | null
          operational_status: string
          original_message: string | null
          payment_status: string
          pipeline_stage: string
          requires_autopsy: boolean
          selected_plan: string | null
          service_description: string | null
          service_type: string | null
          source: string | null
          total_amount: number
          updated_at: string
          urgency: string | null
          wake_room: string | null
        }
        Insert: {
          ai_classification?: Json | null
          ai_summary?: string | null
          amount_paid?: number
          assigned_to?: string | null
          body_pickup_at?: string | null
          branch?: string | null
          case_number?: string
          cemetery_name?: string | null
          ceremony_date?: string | null
          ceremony_location?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_rut?: string | null
          closed_at?: string | null
          commercial_status?: string
          comuna?: string | null
          created_at?: string
          currency?: string
          death_cause?: string | null
          death_place?: string | null
          deceased_birth_date?: string | null
          deceased_death_date?: string | null
          deceased_gender?: string | null
          deceased_name?: string | null
          deceased_relationship?: string | null
          deceased_rut?: string | null
          disposition_type?: string | null
          documental_status?: string
          documents?: string[] | null
          financial_status?: string
          id?: string
          intent?: string | null
          internal_notes?: string | null
          lead_id?: string | null
          notes?: string | null
          operational_status?: string
          original_message?: string | null
          payment_status?: string
          pipeline_stage?: string
          requires_autopsy?: boolean
          selected_plan?: string | null
          service_description?: string | null
          service_type?: string | null
          source?: string | null
          total_amount?: number
          updated_at?: string
          urgency?: string | null
          wake_room?: string | null
        }
        Update: {
          ai_classification?: Json | null
          ai_summary?: string | null
          amount_paid?: number
          assigned_to?: string | null
          body_pickup_at?: string | null
          branch?: string | null
          case_number?: string
          cemetery_name?: string | null
          ceremony_date?: string | null
          ceremony_location?: string | null
          client_email?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_rut?: string | null
          closed_at?: string | null
          commercial_status?: string
          comuna?: string | null
          created_at?: string
          currency?: string
          death_cause?: string | null
          death_place?: string | null
          deceased_birth_date?: string | null
          deceased_death_date?: string | null
          deceased_gender?: string | null
          deceased_name?: string | null
          deceased_relationship?: string | null
          deceased_rut?: string | null
          disposition_type?: string | null
          documental_status?: string
          documents?: string[] | null
          financial_status?: string
          id?: string
          intent?: string | null
          internal_notes?: string | null
          lead_id?: string | null
          notes?: string | null
          operational_status?: string
          original_message?: string | null
          payment_status?: string
          pipeline_stage?: string
          requires_autopsy?: boolean
          selected_plan?: string | null
          service_description?: string | null
          service_type?: string | null
          source?: string | null
          total_amount?: number
          updated_at?: string
          urgency?: string | null
          wake_room?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "service_cases_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "contact_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_table_preferences: {
        Row: {
          created_at: string
          id: string
          preferences: Json
          table_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preferences?: Json
          table_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preferences?: Json
          table_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      detect_agenda_conflicts: {
        Args: {
          _end: string
          _exclude_event_id?: string
          _start: string
          _user_id: string
        }
        Returns: {
          end_at: string
          event_id: string
          start_at: string
          title: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "family" | "ceo" | "moderator"
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
    Enums: {
      app_role: ["admin", "family", "ceo", "moderator"],
    },
  },
} as const
