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
          comuna: string | null
          contact_type: string
          created_at: string
          email: string | null
          id: string
          intent: string | null
          message: string | null
          metadata: Json | null
          name: string | null
          phone: string | null
          selected_plan: string | null
          source: string | null
          status: string | null
          urgency: string | null
          whatsapp_message: string | null
        }
        Insert: {
          comuna?: string | null
          contact_type?: string
          created_at?: string
          email?: string | null
          id?: string
          intent?: string | null
          message?: string | null
          metadata?: Json | null
          name?: string | null
          phone?: string | null
          selected_plan?: string | null
          source?: string | null
          status?: string | null
          urgency?: string | null
          whatsapp_message?: string | null
        }
        Update: {
          comuna?: string | null
          contact_type?: string
          created_at?: string
          email?: string | null
          id?: string
          intent?: string | null
          message?: string | null
          metadata?: Json | null
          name?: string | null
          phone?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "family"
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
      app_role: ["admin", "family"],
    },
  },
} as const
