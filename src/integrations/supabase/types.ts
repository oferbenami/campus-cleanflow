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
      activity_logs: {
        Row: {
          action_type: string
          actor_id: string
          actor_name: string
          assignment_id: string | null
          created_at: string
          details: string | null
          id: string
          metadata: Json | null
          target_staff_id: string | null
          target_staff_name: string | null
        }
        Insert: {
          action_type: string
          actor_id: string
          actor_name: string
          assignment_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          metadata?: Json | null
          target_staff_id?: string | null
          target_staff_name?: string | null
        }
        Update: {
          action_type?: string
          actor_id?: string
          actor_name?: string
          assignment_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          metadata?: Json | null
          target_staff_id?: string | null
          target_staff_name?: string | null
        }
        Relationships: []
      }
      audit_checklist_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_he: string
          sort_order: number
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_he: string
          sort_order?: number
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_he?: string
          sort_order?: number
          weight?: number
        }
        Relationships: []
      }
      buildings: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          site_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          site_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          site_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_protocols: {
        Row: {
          checklist: Json
          created_at: string
          frequency_per_day: number
          id: string
          is_active: boolean
          name: string
          name_he: string
          notes: string | null
          required_equipment: Json
          required_materials: Json
          sla_minutes: number
          sla_warning_minutes: number
          space_category: string
          updated_at: string
        }
        Insert: {
          checklist?: Json
          created_at?: string
          frequency_per_day?: number
          id?: string
          is_active?: boolean
          name: string
          name_he: string
          notes?: string | null
          required_equipment?: Json
          required_materials?: Json
          sla_minutes?: number
          sla_warning_minutes?: number
          space_category: string
          updated_at?: string
        }
        Update: {
          checklist?: Json
          created_at?: string
          frequency_per_day?: number
          id?: string
          is_active?: boolean
          name?: string
          name_he?: string
          notes?: string | null
          required_equipment?: Json
          required_materials?: Json
          sla_minutes?: number
          sla_warning_minutes?: number
          space_category?: string
          updated_at?: string
        }
        Relationships: []
      }
      corrective_actions: {
        Row: {
          assigned_to: string | null
          audit_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          audit_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          audit_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corrective_actions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "quality_audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_worker_scores: {
        Row: {
          actual_minutes_total: number
          audit_avg_score_used: number | null
          created_at: string
          discipline_flags: Json
          discipline_points: number
          explanation_text: string | null
          id: string
          planned_minutes_total: number
          productivity_points: number
          quality_points: number
          score_date: string
          total_points: number
          variance_percent: number
          worker_id: string
        }
        Insert: {
          actual_minutes_total?: number
          audit_avg_score_used?: number | null
          created_at?: string
          discipline_flags?: Json
          discipline_points?: number
          explanation_text?: string | null
          id?: string
          planned_minutes_total?: number
          productivity_points?: number
          quality_points?: number
          score_date?: string
          total_points?: number
          variance_percent?: number
          worker_id: string
        }
        Update: {
          actual_minutes_total?: number
          audit_avg_score_used?: number | null
          created_at?: string
          discipline_flags?: Json
          discipline_points?: number
          explanation_text?: string | null
          id?: string
          planned_minutes_total?: number
          productivity_points?: number
          quality_points?: number
          score_date?: string
          total_points?: number
          variance_percent?: number
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_worker_scores_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_routing_rules: {
        Row: {
          auto_assign_role: string | null
          created_at: string
          event_type: string
          id: string
          is_active: boolean
          priority: number
          source: string
          zone_id: string | null
        }
        Insert: {
          auto_assign_role?: string | null
          created_at?: string
          event_type: string
          id?: string
          is_active?: boolean
          priority?: number
          source?: string
          zone_id?: string | null
        }
        Update: {
          auto_assign_role?: string | null
          created_at?: string
          event_type?: string
          id?: string
          is_active?: boolean
          priority?: number
          source?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_routing_rules_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      event_triggers: {
        Row: {
          assigned_task_id: string | null
          created_at: string
          description: string | null
          event_type: string
          id: string
          location_id: string | null
          metadata: Json | null
          reported_by: string | null
          resolved_at: string | null
          severity: string
          source: string
          status: string
          title: string
          zone_id: string | null
        }
        Insert: {
          assigned_task_id?: string | null
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          location_id?: string | null
          metadata?: Json | null
          reported_by?: string | null
          resolved_at?: string | null
          severity?: string
          source?: string
          status?: string
          title: string
          zone_id?: string | null
        }
        Update: {
          assigned_task_id?: string | null
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          location_id?: string | null
          metadata?: Json | null
          reported_by?: string | null
          resolved_at?: string | null
          severity?: string
          source?: string
          status?: string
          title?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_triggers_assigned_task_id_fkey"
            columns: ["assigned_task_id"]
            isOneToOne: false
            referencedRelation: "task_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_triggers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_triggers_reported_by_fkey"
            columns: ["reported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_triggers_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      floors: {
        Row: {
          building_id: string
          created_at: string
          floor_number: number
          id: string
          name: string
        }
        Insert: {
          building_id: string
          created_at?: string
          floor_number?: number
          id?: string
          name: string
        }
        Update: {
          building_id?: string
          created_at?: string
          floor_number?: number
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "floors_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      incentive_config: {
        Row: {
          base_bonus_amount: number
          created_at: string
          discipline_full: number
          discipline_weight: number
          id: string
          is_active: boolean
          late_threshold_minutes: number
          no_audit_policy: string
          points_on_standard: number
          points_tier1: number
          points_tier2: number
          points_tier3: number
          productivity_weight: number
          quality_band_fail: number
          quality_band_high: number
          quality_band_low: number
          quality_band_mid: number
          quality_weight: number
          site_id: string | null
          tier_50_threshold: number
          tier_80_threshold: number
          tier_full_threshold: number
          updated_at: string
          variance_on_standard: number
          variance_tier1: number
          variance_tier2: number
        }
        Insert: {
          base_bonus_amount?: number
          created_at?: string
          discipline_full?: number
          discipline_weight?: number
          id?: string
          is_active?: boolean
          late_threshold_minutes?: number
          no_audit_policy?: string
          points_on_standard?: number
          points_tier1?: number
          points_tier2?: number
          points_tier3?: number
          productivity_weight?: number
          quality_band_fail?: number
          quality_band_high?: number
          quality_band_low?: number
          quality_band_mid?: number
          quality_weight?: number
          site_id?: string | null
          tier_50_threshold?: number
          tier_80_threshold?: number
          tier_full_threshold?: number
          updated_at?: string
          variance_on_standard?: number
          variance_tier1?: number
          variance_tier2?: number
        }
        Update: {
          base_bonus_amount?: number
          created_at?: string
          discipline_full?: number
          discipline_weight?: number
          id?: string
          is_active?: boolean
          late_threshold_minutes?: number
          no_audit_policy?: string
          points_on_standard?: number
          points_tier1?: number
          points_tier2?: number
          points_tier3?: number
          productivity_weight?: number
          quality_band_fail?: number
          quality_band_high?: number
          quality_band_low?: number
          quality_band_mid?: number
          quality_weight?: number
          site_id?: string | null
          tier_50_threshold?: number
          tier_80_threshold?: number
          tier_full_threshold?: number
          updated_at?: string
          variance_on_standard?: number
          variance_tier1?: number
          variance_tier2?: number
        }
        Relationships: [
          {
            foreignKeyName: "incentive_config_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          area_sqm: number | null
          created_at: string
          floor_id: string | null
          floor_type: string
          has_active_kitchen: boolean
          has_glass: boolean
          id: string
          name: string
          protocol_id: string | null
          room_type: string | null
          space_category: string
          traffic_level: string
          zone_id: string
        }
        Insert: {
          area_sqm?: number | null
          created_at?: string
          floor_id?: string | null
          floor_type?: string
          has_active_kitchen?: boolean
          has_glass?: boolean
          id?: string
          name: string
          protocol_id?: string | null
          room_type?: string | null
          space_category?: string
          traffic_level?: string
          zone_id: string
        }
        Update: {
          area_sqm?: number | null
          created_at?: string
          floor_id?: string | null
          floor_type?: string
          has_active_kitchen?: boolean
          has_glass?: boolean
          id?: string
          name?: string
          protocol_id?: string | null
          room_type?: string | null
          space_category?: string
          traffic_level?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_protocol_id_fkey"
            columns: ["protocol_id"]
            isOneToOne: false
            referencedRelation: "cleaning_protocols"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_incentive_summaries: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          avg_daily_points: number
          created_at: string
          id: string
          month: string
          payout_amount: number
          status: string
          tier: string
          total_points: number
          updated_at: string
          workdays_count: number
          worker_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          avg_daily_points?: number
          created_at?: string
          id?: string
          month: string
          payout_amount?: number
          status?: string
          tier?: string
          total_points?: number
          updated_at?: string
          workdays_count?: number
          worker_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          avg_daily_points?: number
          created_at?: string
          id?: string
          month?: string
          payout_amount?: number
          status?: string
          tier?: string
          total_points?: number
          updated_at?: string
          workdays_count?: number
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_incentive_summaries_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_incentive_summaries_worker_id_fkey"
            columns: ["worker_id"]
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
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          avatar_initials?: string | null
          created_at?: string
          full_name?: string
          id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          avatar_initials?: string | null
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      quality_audits: {
        Row: {
          auditor_id: string
          created_at: string
          id: string
          notes: string | null
          rating_cleanliness: number
          rating_safety: number
          rating_supplies: number
          rating_thoroughness: number
          rating_timeliness: number
          task_assignment_id: string
        }
        Insert: {
          auditor_id: string
          created_at?: string
          id?: string
          notes?: string | null
          rating_cleanliness: number
          rating_safety: number
          rating_supplies: number
          rating_thoroughness: number
          rating_timeliness: number
          task_assignment_id: string
        }
        Update: {
          auditor_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          rating_cleanliness?: number
          rating_safety?: number
          rating_supplies?: number
          rating_thoroughness?: number
          rating_timeliness?: number
          task_assignment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quality_audits_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quality_audits_task_assignment_id_fkey"
            columns: ["task_assignment_id"]
            isOneToOne: false
            referencedRelation: "task_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      supply_alerts: {
        Row: {
          assignment_id: string
          created_at: string
          id: string
          item: string
          staff_id: string
          zone_name: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          id?: string
          item: string
          staff_id: string
          zone_name: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          id?: string
          item?: string
          staff_id?: string
          zone_name?: string
        }
        Relationships: []
      }
      task_assignments: {
        Row: {
          assignment_date: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          elapsed_minutes: number | null
          id: string
          is_break_fix: boolean | null
          issues: Json | null
          sequence_order: number
          staff_id: string
          started_at: string | null
          status: string
          stock_low: Json | null
          task_template_id: string
          updated_at: string
        }
        Insert: {
          assignment_date?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          elapsed_minutes?: number | null
          id?: string
          is_break_fix?: boolean | null
          issues?: Json | null
          sequence_order?: number
          staff_id: string
          started_at?: string | null
          status?: string
          stock_low?: Json | null
          task_template_id: string
          updated_at?: string
        }
        Update: {
          assignment_date?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          elapsed_minutes?: number | null
          id?: string
          is_break_fix?: boolean | null
          issues?: Json | null
          sequence_order?: number
          staff_id?: string
          started_at?: string | null
          status?: string
          stock_low?: Json | null
          task_template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_task_template_id_fkey"
            columns: ["task_template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      task_set_items: {
        Row: {
          created_at: string
          id: string
          planned_end: string
          planned_start: string
          sequence_order: number
          set_template_id: string
          task_template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          planned_end?: string
          planned_start?: string
          sequence_order?: number
          set_template_id: string
          task_template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          planned_end?: string
          planned_start?: string
          sequence_order?: number
          set_template_id?: string
          task_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_set_items_set_template_id_fkey"
            columns: ["set_template_id"]
            isOneToOne: false
            referencedRelation: "task_set_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_set_items_task_template_id_fkey"
            columns: ["task_template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      task_set_templates: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          shift: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          shift?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          shift?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_templates: {
        Row: {
          created_at: string
          estimated_minutes: number
          id: string
          location_id: string | null
          name: string
          shift: string
          sla_minutes: number | null
          sla_warning_minutes: number | null
          task_type: string
        }
        Insert: {
          created_at?: string
          estimated_minutes?: number
          id?: string
          location_id?: string | null
          name: string
          shift?: string
          sla_minutes?: number | null
          sla_warning_minutes?: number | null
          task_type?: string
        }
        Update: {
          created_at?: string
          estimated_minutes?: number
          id?: string
          location_id?: string | null
          name?: string
          shift?: string
          sla_minutes?: number | null
          sla_warning_minutes?: number | null
          task_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
      zones: {
        Row: {
          area_sqm: number | null
          building_id: string | null
          created_at: string
          floor: string | null
          floor_id: string | null
          id: string
          name: string
          site_id: string
          traffic_level: string
          wing: string | null
        }
        Insert: {
          area_sqm?: number | null
          building_id?: string | null
          created_at?: string
          floor?: string | null
          floor_id?: string | null
          id?: string
          name: string
          site_id: string
          traffic_level?: string
          wing?: string | null
        }
        Update: {
          area_sqm?: number | null
          building_id?: string | null
          created_at?: string
          floor?: string | null
          floor_id?: string | null
          id?: string
          name?: string
          site_id?: string
          traffic_level?: string
          wing?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zones_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zones_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zones_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
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
    },
  },
} as const
