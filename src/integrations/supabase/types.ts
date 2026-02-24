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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      addon_rules: {
        Row: {
          addon_template_id: string
          created_at: string
          id: string
          trigger_payload: Json
          trigger_type: string
        }
        Insert: {
          addon_template_id: string
          created_at?: string
          id?: string
          trigger_payload?: Json
          trigger_type: string
        }
        Update: {
          addon_template_id?: string
          created_at?: string
          id?: string
          trigger_payload?: Json
          trigger_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "addon_rules_addon_template_id_fkey"
            columns: ["addon_template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      assigned_tasks: {
        Row: {
          actual_minutes: number | null
          assignment_id: string
          checklist_json: Json | null
          created_at: string
          defer_reason: string | null
          finish_tag_uid: string | null
          finished_at: string | null
          id: string
          is_deferred: boolean
          location_id: string
          priority: Database["public"]["Enums"]["task_priority"]
          queue_order: number | null
          sequence_order: number
          source_template_id: string | null
          source_type: string | null
          standard_minutes: number
          start_tag_uid: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          task_name: string
          variance_percent: number | null
          window_end: string | null
          window_start: string | null
        }
        Insert: {
          actual_minutes?: number | null
          assignment_id: string
          checklist_json?: Json | null
          created_at?: string
          defer_reason?: string | null
          finish_tag_uid?: string | null
          finished_at?: string | null
          id?: string
          is_deferred?: boolean
          location_id: string
          priority?: Database["public"]["Enums"]["task_priority"]
          queue_order?: number | null
          sequence_order?: number
          source_template_id?: string | null
          source_type?: string | null
          standard_minutes?: number
          start_tag_uid?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_name: string
          variance_percent?: number | null
          window_end?: string | null
          window_start?: string | null
        }
        Update: {
          actual_minutes?: number | null
          assignment_id?: string
          checklist_json?: Json | null
          created_at?: string
          defer_reason?: string | null
          finish_tag_uid?: string | null
          finished_at?: string | null
          id?: string
          is_deferred?: boolean
          location_id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          queue_order?: number | null
          sequence_order?: number
          source_template_id?: string | null
          source_type?: string | null
          standard_minutes?: number
          start_tag_uid?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_name?: string
          variance_percent?: number | null
          window_end?: string | null
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assigned_tasks_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_tasks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "campus_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assigned_tasks_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_addons: {
        Row: {
          addon_template_id: string
          apply_mode: string
          assignment_id: string
          created_at: string
          id: string
          notes: string | null
        }
        Insert: {
          addon_template_id: string
          apply_mode?: string
          assignment_id: string
          created_at?: string
          id?: string
          notes?: string | null
        }
        Update: {
          addon_template_id?: string
          apply_mode?: string
          assignment_id?: string
          created_at?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_addons_addon_template_id_fkey"
            columns: ["addon_template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_addons_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          shift_type: Database["public"]["Enums"]["shift_type"]
          site_id: string
          staff_user_id: string
          status: Database["public"]["Enums"]["assignment_status"]
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          shift_type?: Database["public"]["Enums"]["shift_type"]
          site_id: string
          staff_user_id: string
          status?: Database["public"]["Enums"]["assignment_status"]
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          shift_type?: Database["public"]["Enums"]["shift_type"]
          site_id?: string
          staff_user_id?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_inspections: {
        Row: {
          assigned_task_id: string
          created_at: string
          id: string
          inspector_user_id: string
          notes: string | null
          scores_json: Json
          site_id: string
          total_score: number
        }
        Insert: {
          assigned_task_id: string
          created_at?: string
          id?: string
          inspector_user_id: string
          notes?: string | null
          scores_json?: Json
          site_id: string
          total_score?: number
        }
        Update: {
          assigned_task_id?: string
          created_at?: string
          id?: string
          inspector_user_id?: string
          notes?: string | null
          scores_json?: Json
          site_id?: string
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_inspections_assigned_task_id_fkey"
            columns: ["assigned_task_id"]
            isOneToOne: false
            referencedRelation: "assigned_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_inspections_inspector_user_id_fkey"
            columns: ["inspector_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_inspections_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      break_fix_tickets: {
        Row: {
          assigned_to_user_id: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          location_id: string
          photo_url: string | null
          priority: Database["public"]["Enums"]["ticket_priority"]
          resolved_at: string | null
          site_id: string
          status: Database["public"]["Enums"]["ticket_status"]
        }
        Insert: {
          assigned_to_user_id?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          location_id: string
          photo_url?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          site_id: string
          status?: Database["public"]["Enums"]["ticket_status"]
        }
        Update: {
          assigned_to_user_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          location_id?: string
          photo_url?: string | null
          priority?: Database["public"]["Enums"]["ticket_priority"]
          resolved_at?: string | null
          site_id?: string
          status?: Database["public"]["Enums"]["ticket_status"]
        }
        Relationships: [
          {
            foreignKeyName: "break_fix_tickets_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "break_fix_tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "break_fix_tickets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "campus_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "break_fix_tickets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      campus_locations: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          level_type: Database["public"]["Enums"]["location_level"]
          name: string
          nfc_tag_uid: string | null
          parent_location_id: string | null
          site_id: string
          space_type: Database["public"]["Enums"]["space_type"] | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          level_type: Database["public"]["Enums"]["location_level"]
          name: string
          nfc_tag_uid?: string | null
          parent_location_id?: string | null
          site_id: string
          space_type?: Database["public"]["Enums"]["space_type"] | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          level_type?: Database["public"]["Enums"]["location_level"]
          name?: string
          nfc_tag_uid?: string | null
          parent_location_id?: string | null
          site_id?: string
          space_type?: Database["public"]["Enums"]["space_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "campus_locations_parent_location_id_fkey"
            columns: ["parent_location_id"]
            isOneToOne: false
            referencedRelation: "campus_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campus_locations_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      events_log: {
        Row: {
          assigned_task_id: string | null
          assignment_id: string | null
          created_at: string
          event_payload: Json | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          site_id: string | null
          user_id: string
        }
        Insert: {
          assigned_task_id?: string | null
          assignment_id?: string | null
          created_at?: string
          event_payload?: Json | null
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          site_id?: string | null
          user_id: string
        }
        Update: {
          assigned_task_id?: string | null
          assignment_id?: string | null
          created_at?: string
          event_payload?: Json | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          site_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_log_assigned_task_id_fkey"
            columns: ["assigned_task_id"]
            isOneToOne: false
            referencedRelation: "assigned_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_log_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_log_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_initials: string | null
          created_at: string
          default_break_minutes: number | null
          default_shift_end: string | null
          default_shift_start: string | null
          default_work_days: Json | null
          email: string | null
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          site_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_initials?: string | null
          created_at?: string
          default_break_minutes?: number | null
          default_shift_end?: string | null
          default_shift_start?: string | null
          default_work_days?: Json | null
          email?: string | null
          full_name?: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          site_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_initials?: string | null
          created_at?: string
          default_break_minutes?: number | null
          default_shift_end?: string | null
          default_shift_start?: string | null
          default_work_days?: Json | null
          email?: string | null
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          site_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          timezone: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          timezone?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          timezone?: string
        }
        Relationships: []
      }
      supply_shortage_reports: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          category: string
          created_at: string
          forwarded_at: string | null
          id: string
          item_key: string
          item_label: string
          location: string
          notes: string | null
          quantity: number
          reported_by: string
          resolved_at: string | null
          resolved_by: string | null
          site_id: string
          status: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          category: string
          created_at?: string
          forwarded_at?: string | null
          id?: string
          item_key: string
          item_label: string
          location?: string
          notes?: string | null
          quantity?: number
          reported_by: string
          resolved_at?: string | null
          resolved_by?: string | null
          site_id: string
          status?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          category?: string
          created_at?: string
          forwarded_at?: string | null
          id?: string
          item_key?: string
          item_label?: string
          location?: string
          notes?: string | null
          quantity?: number
          reported_by?: string
          resolved_at?: string | null
          resolved_by?: string | null
          site_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_shortage_reports_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_shortage_reports_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_shortage_reports_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_shortage_reports_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          shift_type: Database["public"]["Enums"]["shift_type"] | null
          site_id: string | null
          sop_text: string | null
          standard_source: string | null
          template_type: Database["public"]["Enums"]["template_type"]
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          shift_type?: Database["public"]["Enums"]["shift_type"] | null
          site_id?: string | null
          sop_text?: string | null
          standard_source?: string | null
          template_type?: Database["public"]["Enums"]["template_type"]
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          shift_type?: Database["public"]["Enums"]["shift_type"] | null
          site_id?: string | null
          sop_text?: string | null
          standard_source?: string | null
          template_type?: Database["public"]["Enums"]["template_type"]
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      template_tasks: {
        Row: {
          checklist_json: Json | null
          created_at: string
          days_of_week: number[]
          id: string
          is_optional: boolean
          location_id: string
          priority: Database["public"]["Enums"]["task_priority"]
          recurrence_rule: Json | null
          standard_minutes: number
          task_name: string
          template_id: string
          window_end: string | null
          window_start: string | null
        }
        Insert: {
          checklist_json?: Json | null
          created_at?: string
          days_of_week?: number[]
          id?: string
          is_optional?: boolean
          location_id: string
          priority?: Database["public"]["Enums"]["task_priority"]
          recurrence_rule?: Json | null
          standard_minutes?: number
          task_name: string
          template_id: string
          window_end?: string | null
          window_start?: string | null
        }
        Update: {
          checklist_json?: Json | null
          created_at?: string
          days_of_week?: number[]
          id?: string
          is_optional?: boolean
          location_id?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          recurrence_rule?: Json | null
          standard_minutes?: number
          task_name?: string
          template_id?: string
          window_end?: string | null
          window_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_tasks_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "campus_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "template_tasks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
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
      is_manager: { Args: never; Returns: boolean }
      is_supervisor: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role:
        | "campus_manager"
        | "property_manager"
        | "supervisor"
        | "cleaning_staff"
      assignment_status: "planned" | "active" | "completed" | "cancelled"
      event_type:
        | "nfc_scan"
        | "task_start"
        | "task_finish"
        | "photo_upload"
        | "inventory_shortage"
        | "break_fix_created"
        | "break_fix_assigned"
        | "sla_alert"
      location_level: "building" | "wing" | "floor" | "zone" | "room"
      shift_type: "morning" | "evening"
      space_type:
        | "office"
        | "meeting_room"
        | "restroom"
        | "kitchenette"
        | "lobby"
        | "other"
      task_priority: "normal" | "high"
      task_status:
        | "queued"
        | "ready"
        | "in_progress"
        | "blocked"
        | "completed"
        | "failed"
      template_type: "base" | "addon"
      ticket_priority: "urgent" | "high" | "normal"
      ticket_status: "open" | "assigned" | "in_progress" | "resolved" | "closed"
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
      app_role: [
        "campus_manager",
        "property_manager",
        "supervisor",
        "cleaning_staff",
      ],
      assignment_status: ["planned", "active", "completed", "cancelled"],
      event_type: [
        "nfc_scan",
        "task_start",
        "task_finish",
        "photo_upload",
        "inventory_shortage",
        "break_fix_created",
        "break_fix_assigned",
        "sla_alert",
      ],
      location_level: ["building", "wing", "floor", "zone", "room"],
      shift_type: ["morning", "evening"],
      space_type: [
        "office",
        "meeting_room",
        "restroom",
        "kitchenette",
        "lobby",
        "other",
      ],
      task_priority: ["normal", "high"],
      task_status: [
        "queued",
        "ready",
        "in_progress",
        "blocked",
        "completed",
        "failed",
      ],
      template_type: ["base", "addon"],
      ticket_priority: ["urgent", "high", "normal"],
      ticket_status: ["open", "assigned", "in_progress", "resolved", "closed"],
    },
  },
} as const
