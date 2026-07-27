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
      bookings: {
        Row: {
          campaign_id: string | null
          client_id: string | null
          created_at: string
          day: string
          discount_chf: number | null
          duration_minutes: number
          google_event_id: string | null
          id: string
          notes: string | null
          price_chf: number | null
          silent: boolean
          source: Database["public"]["Enums"]["booking_source"]
          studio_id: string
          time: string
          treatment: string
        }
        Insert: {
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string
          day: string
          discount_chf?: number | null
          duration_minutes?: number
          google_event_id?: string | null
          id?: string
          notes?: string | null
          price_chf?: number | null
          silent?: boolean
          source?: Database["public"]["Enums"]["booking_source"]
          studio_id: string
          time: string
          treatment: string
        }
        Update: {
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string
          day?: string
          discount_chf?: number | null
          duration_minutes?: number
          google_event_id?: string | null
          id?: string
          notes?: string | null
          price_chf?: number | null
          silent?: boolean
          source?: Database["public"]["Enums"]["booking_source"]
          studio_id?: string
          time?: string
          treatment?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios_public"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          age_max: number | null
          age_min: number | null
          applies_to: string
          budget_chf: number | null
          channels: string[]
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          duration_minutes: number | null
          goal: string
          id: string
          max_redemptions: number | null
          radius_km: number | null
          redemptions_used: number
          status: string
          studio_id: string
          title: string
          treatment_id: string | null
          valid_from: string
          valid_to: string
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          applies_to?: string
          budget_chf?: number | null
          channels?: string[]
          code: string
          created_at?: string
          discount_type?: string
          discount_value: number
          duration_minutes?: number | null
          goal?: string
          id?: string
          max_redemptions?: number | null
          radius_km?: number | null
          redemptions_used?: number
          status?: string
          studio_id: string
          title: string
          treatment_id?: string | null
          valid_from: string
          valid_to: string
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          applies_to?: string
          budget_chf?: number | null
          channels?: string[]
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          duration_minutes?: number | null
          goal?: string
          id?: string
          max_redemptions?: number | null
          radius_km?: number | null
          redemptions_used?: number
          status?: string
          studio_id?: string
          title?: string
          treatment_id?: string | null
          valid_from?: string
          valid_to?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments_public"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          city: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string
          street: string
          studio_id: string
          updated_at: string
          zip: string
        }
        Insert: {
          city: string
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          phone: string
          street: string
          studio_id: string
          updated_at?: string
          zip: string
        }
        Update: {
          city?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          street?: string
          studio_id?: string
          updated_at?: string
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios_public"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          consent_ok: boolean
          created_at: string
          height: number | null
          id: string
          kind: string
          license_note: string | null
          source: string
          storage_path: string
          studio_id: string | null
          tags: string[]
          title: string
          width: number | null
        }
        Insert: {
          consent_ok?: boolean
          created_at?: string
          height?: number | null
          id?: string
          kind?: string
          license_note?: string | null
          source?: string
          storage_path: string
          studio_id?: string | null
          tags?: string[]
          title: string
          width?: number | null
        }
        Update: {
          consent_ok?: boolean
          created_at?: string
          height?: number | null
          id?: string
          kind?: string
          license_note?: string | null
          source?: string
          storage_path?: string
          studio_id?: string | null
          tags?: string[]
          title?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios_public"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_logs: {
        Row: {
          author_id: string | null
          body_html: string
          body_map: Json
          booking_id: string | null
          client_id: string
          created_at: string
          duration_minutes: number | null
          id: string
          mobility: Json
          pain_level: number | null
          studio_id: string
          tension: Json
          treatment_date: string | null
          treatment_name: string | null
        }
        Insert: {
          author_id?: string | null
          body_html: string
          body_map?: Json
          booking_id?: string | null
          client_id: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          mobility?: Json
          pain_level?: number | null
          studio_id: string
          tension?: Json
          treatment_date?: string | null
          treatment_name?: string | null
        }
        Update: {
          author_id?: string | null
          body_html?: string
          body_map?: Json
          booking_id?: string | null
          client_id?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          mobility?: Json
          pain_level?: number | null
          studio_id?: string
          tension?: Json
          treatment_date?: string | null
          treatment_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_logs_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_logs_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios_public"
            referencedColumns: ["id"]
          },
        ]
      }
      studio_members: {
        Row: {
          created_at: string
          id: string
          role: string
          studio_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          studio_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          studio_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "studio_members_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "studio_members_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios_public"
            referencedColumns: ["id"]
          },
        ]
      }
      studios: {
        Row: {
          about_heading: string | null
          about_text: string | null
          active: boolean
          buffer_minutes: number
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          faqs: Json
          features: Json
          google_calendar_id: string | null
          hero_heading: string | null
          hero_image_path: string | null
          hero_text: string | null
          id: string
          logo_path: string | null
          maps_url: string | null
          name: string
          opening_hours: Json
          parking_note: string | null
          payment_methods: Json
          phone: string | null
          portrait_image_path: string | null
          room_image_path: string | null
          slot_step_minutes: number
          slug: string
          street: string | null
          tagline: string | null
          testimonials: Json
          timezone: string
          whatsapp_phone_number_id: string | null
          zip: string | null
        }
        Insert: {
          about_heading?: string | null
          about_text?: string | null
          active?: boolean
          buffer_minutes?: number
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          faqs?: Json
          features?: Json
          google_calendar_id?: string | null
          hero_heading?: string | null
          hero_image_path?: string | null
          hero_text?: string | null
          id?: string
          logo_path?: string | null
          maps_url?: string | null
          name: string
          opening_hours?: Json
          parking_note?: string | null
          payment_methods?: Json
          phone?: string | null
          portrait_image_path?: string | null
          room_image_path?: string | null
          slot_step_minutes?: number
          slug: string
          street?: string | null
          tagline?: string | null
          testimonials?: Json
          timezone?: string
          whatsapp_phone_number_id?: string | null
          zip?: string | null
        }
        Update: {
          about_heading?: string | null
          about_text?: string | null
          active?: boolean
          buffer_minutes?: number
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          faqs?: Json
          features?: Json
          google_calendar_id?: string | null
          hero_heading?: string | null
          hero_image_path?: string | null
          hero_text?: string | null
          id?: string
          logo_path?: string | null
          maps_url?: string | null
          name?: string
          opening_hours?: Json
          parking_note?: string | null
          payment_methods?: Json
          phone?: string | null
          portrait_image_path?: string | null
          room_image_path?: string | null
          slot_step_minutes?: number
          slug?: string
          street?: string | null
          tagline?: string | null
          testimonials?: Json
          timezone?: string
          whatsapp_phone_number_id?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      treatments: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          key: string
          label: string
          options: Json
          sort_order: number
          studio_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          key: string
          label: string
          options?: Json
          sort_order?: number
          studio_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          label?: string
          options?: Json
          sort_order?: number
          studio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatments_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios_public"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_sessions: {
        Row: {
          created_at: string
          draft: Json
          last_message_id: string | null
          phone: string
          state: string
          studio_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          draft?: Json
          last_message_id?: string | null
          phone: string
          state?: string
          studio_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          draft?: Json
          last_message_id?: string | null
          phone?: string
          state?: string
          studio_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_sessions_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_sessions_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      studios_public: {
        Row: {
          about_heading: string | null
          about_text: string | null
          buffer_minutes: number | null
          city: string | null
          country: string | null
          email: string | null
          features: Json | null
          hero_heading: string | null
          hero_image_path: string | null
          hero_text: string | null
          id: string | null
          logo_path: string | null
          maps_url: string | null
          name: string | null
          opening_hours: Json | null
          parking_note: string | null
          payment_methods: Json | null
          phone: string | null
          portrait_image_path: string | null
          room_image_path: string | null
          slot_step_minutes: number | null
          slug: string | null
          street: string | null
          tagline: string | null
          timezone: string | null
          zip: string | null
        }
        Insert: {
          about_heading?: string | null
          about_text?: string | null
          buffer_minutes?: number | null
          city?: string | null
          country?: string | null
          email?: string | null
          features?: Json | null
          hero_heading?: string | null
          hero_image_path?: string | null
          hero_text?: string | null
          id?: string | null
          logo_path?: string | null
          maps_url?: string | null
          name?: string | null
          opening_hours?: Json | null
          parking_note?: string | null
          payment_methods?: Json | null
          phone?: string | null
          portrait_image_path?: string | null
          room_image_path?: string | null
          slot_step_minutes?: number | null
          slug?: string | null
          street?: string | null
          tagline?: string | null
          timezone?: string | null
          zip?: string | null
        }
        Update: {
          about_heading?: string | null
          about_text?: string | null
          buffer_minutes?: number | null
          city?: string | null
          country?: string | null
          email?: string | null
          features?: Json | null
          hero_heading?: string | null
          hero_image_path?: string | null
          hero_text?: string | null
          id?: string | null
          logo_path?: string | null
          maps_url?: string | null
          name?: string | null
          opening_hours?: Json | null
          parking_note?: string | null
          payment_methods?: Json | null
          phone?: string | null
          portrait_image_path?: string | null
          room_image_path?: string | null
          slot_step_minutes?: number | null
          slug?: string | null
          street?: string | null
          tagline?: string | null
          timezone?: string | null
          zip?: string | null
        }
        Relationships: []
      }
      treatments_public: {
        Row: {
          description: string | null
          id: string | null
          key: string | null
          label: string | null
          options: Json | null
          sort_order: number | null
          studio_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatments_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatments_studio_id_fkey"
            columns: ["studio_id"]
            isOneToOne: false
            referencedRelation: "studios_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_studio_member: {
        Args: { _studio_id: string; _user_id: string }
        Returns: boolean
      }
      redeem_campaign: { Args: { _campaign_id: string }; Returns: number }
      release_campaign: { Args: { _campaign_id: string }; Returns: number }
    }
    Enums: {
      booking_source: "online" | "manual" | "block"
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
      booking_source: ["online", "manual", "block"],
    },
  },
} as const
