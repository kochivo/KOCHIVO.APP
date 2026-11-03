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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json
          id: string
          target_id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json
          id: string
          target_id: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json
          id?: string
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admins: {
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
        Relationships: [
          {
            foreignKeyName: "admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      captain_subscriptions: {
        Row: {
          activated_by: string
          amount_egp: number
          captain_id: string
          created_at: string
          ends_at: string
          id: string
          payment_ref: string | null
          starts_at: string
          tier: string
        }
        Insert: {
          activated_by: string
          amount_egp: number
          captain_id: string
          created_at?: string
          ends_at: string
          id?: string
          payment_ref?: string | null
          starts_at: string
          tier: string
        }
        Update: {
          activated_by?: string
          amount_egp?: number
          captain_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          payment_ref?: string | null
          starts_at?: string
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "captain_subscriptions_activated_by_fkey"
            columns: ["activated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captain_subscriptions_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "captain_subscriptions_tier_fkey"
            columns: ["tier"]
            isOneToOne: false
            referencedRelation: "plan_tiers"
            referencedColumns: ["tier"]
          },
        ]
      }
      check_ins: {
        Row: {
          body_weight_kg: number | null
          captain_id: string
          captain_reply: string | null
          created_at: string
          id: string
          notes: string | null
          photo_paths: string[]
          player_id: string
          reviewed_at: string | null
          waist_cm: number | null
          week_start: string
        }
        Insert: {
          body_weight_kg?: number | null
          captain_id: string
          captain_reply?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          photo_paths?: string[]
          player_id?: string
          reviewed_at?: string | null
          waist_cm?: number | null
          week_start: string
        }
        Update: {
          body_weight_kg?: number | null
          captain_id?: string
          captain_reply?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          photo_paths?: string[]
          player_id?: string
          reviewed_at?: string | null
          waist_cm?: number | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_ins_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_ins_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_clients: {
        Row: {
          access_until: string
          archived_at: string | null
          captain_id: string
          created_at: string
          id: string
          player_id: string
          started_on: string
          updated_at: string
        }
        Insert: {
          access_until: string
          archived_at?: string | null
          captain_id: string
          created_at?: string
          id?: string
          player_id: string
          started_on?: string
          updated_at?: string
        }
        Update: {
          access_until?: string
          archived_at?: string | null
          captain_id?: string
          created_at?: string
          id?: string
          player_id?: string
          started_on?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_clients_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_clients_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_invites: {
        Row: {
          access_until: string
          captain_id: string
          code: string
          created_at: string
          expires_at: string
          id: string
          redeemed_at: string | null
          redeemed_by: string | null
        }
        Insert: {
          access_until: string
          captain_id: string
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Update: {
          access_until?: string
          captain_id?: string
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_invites_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_invites_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          body_part: string
          created_at: string
          dataset_id: string | null
          equipment: string | null
          id: string
          instructions_ar: string[] | null
          instructions_en: string[]
          media_path: string | null
          name_ar: string | null
          name_en: string
          owner_id: string | null
          secondary_muscles: string[]
          target: string | null
        }
        Insert: {
          body_part: string
          created_at?: string
          dataset_id?: string | null
          equipment?: string | null
          id?: string
          instructions_ar?: string[] | null
          instructions_en?: string[]
          media_path?: string | null
          name_ar?: string | null
          name_en: string
          owner_id?: string | null
          secondary_muscles?: string[]
          target?: string | null
        }
        Update: {
          body_part?: string
          created_at?: string
          dataset_id?: string | null
          equipment?: string | null
          id?: string
          instructions_ar?: string[] | null
          instructions_en?: string[]
          media_path?: string | null
          name_ar?: string | null
          name_en?: string
          owner_id?: string | null
          secondary_muscles?: string[]
          target?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      foods: {
        Row: {
          carbs_per_100g: number
          created_at: string
          fat_per_100g: number
          id: string
          kcal_per_100g: number
          name_ar: string
          name_en: string | null
          owner_id: string | null
          photo_path: string | null
          protein_per_100g: number
          seed_key: string | null
          source: string | null
        }
        Insert: {
          carbs_per_100g: number
          created_at?: string
          fat_per_100g: number
          id?: string
          kcal_per_100g: number
          name_ar: string
          name_en?: string | null
          owner_id?: string | null
          photo_path?: string | null
          protein_per_100g: number
          seed_key?: string | null
          source?: string | null
        }
        Update: {
          carbs_per_100g?: number
          created_at?: string
          fat_per_100g?: number
          id?: string
          kcal_per_100g?: number
          name_ar?: string
          name_en?: string | null
          owner_id?: string | null
          photo_path?: string | null
          protein_per_100g?: number
          seed_key?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "foods_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      form_checks: {
        Row: {
          captain_id: string
          captain_reply: string | null
          created_at: string
          exercise_id: string
          id: string
          note: string | null
          player_id: string
          reviewed_at: string | null
          set_log_id: string | null
          video_path: string
        }
        Insert: {
          captain_id: string
          captain_reply?: string | null
          created_at?: string
          exercise_id: string
          id?: string
          note?: string | null
          player_id?: string
          reviewed_at?: string | null
          set_log_id?: string | null
          video_path: string
        }
        Update: {
          captain_id?: string
          captain_reply?: string | null
          created_at?: string
          exercise_id?: string
          id?: string
          note?: string | null
          player_id?: string
          reviewed_at?: string | null
          set_log_id?: string | null
          video_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_checks_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_checks_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_checks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_checks_set_log_id_fkey"
            columns: ["set_log_id"]
            isOneToOne: false
            referencedRelation: "set_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_item_alternatives: {
        Row: {
          food_id: string
          grams: number
          id: string
          meal_item_id: string
        }
        Insert: {
          food_id: string
          grams: number
          id?: string
          meal_item_id: string
        }
        Update: {
          food_id?: string
          grams?: number
          id?: string
          meal_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meal_item_alternatives_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_item_alternatives_meal_item_id_fkey"
            columns: ["meal_item_id"]
            isOneToOne: false
            referencedRelation: "meal_items"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_items: {
        Row: {
          food_id: string
          grams: number
          id: string
          meal_id: string
          position: number
        }
        Insert: {
          food_id: string
          grams: number
          id?: string
          meal_id: string
          position: number
        }
        Update: {
          food_id?: string
          grams?: number
          id?: string
          meal_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "meal_items_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "foods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_items_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
        ]
      }
      meal_logs: {
        Row: {
          client_updated_at: string
          completed_at: string | null
          deleted_at: string | null
          id: string
          log_date: string
          meal_id: string | null
          player_id: string
          server_updated_at: string
          swaps: Json
        }
        Insert: {
          client_updated_at: string
          completed_at?: string | null
          deleted_at?: string | null
          id: string
          log_date: string
          meal_id?: string | null
          player_id?: string
          server_updated_at?: string
          swaps?: Json
        }
        Update: {
          client_updated_at?: string
          completed_at?: string | null
          deleted_at?: string | null
          id?: string
          log_date?: string
          meal_id?: string | null
          player_id?: string
          server_updated_at?: string
          swaps?: Json
        }
        Relationships: [
          {
            foreignKeyName: "meal_logs_meal_id_fkey"
            columns: ["meal_id"]
            isOneToOne: false
            referencedRelation: "meals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meal_logs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          id: string
          name: string
          plan_id: string
          position: number
        }
        Insert: {
          id?: string
          name: string
          plan_id: string
          position: number
        }
        Update: {
          id?: string
          name?: string
          plan_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "meals_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "nutrition_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_plans: {
        Row: {
          captain_id: string
          created_at: string
          id: string
          is_starter: boolean
          is_template: boolean
          player_id: string | null
          source_template_id: string | null
          status: Database["public"]["Enums"]["content_status"]
          target_carbs: number | null
          target_fat: number | null
          target_kcal: number | null
          target_protein: number | null
          title: string
          updated_at: string
        }
        Insert: {
          captain_id: string
          created_at?: string
          id?: string
          is_starter?: boolean
          is_template?: boolean
          player_id?: string | null
          source_template_id?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          target_carbs?: number | null
          target_fat?: number | null
          target_kcal?: number | null
          target_protein?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          captain_id?: string
          created_at?: string
          id?: string
          is_starter?: boolean
          is_template?: boolean
          player_id?: string | null
          source_template_id?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          target_carbs?: number | null
          target_fat?: number | null
          target_kcal?: number | null
          target_protein?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_plans_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_plans_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_plans_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "nutrition_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_tiers: {
        Row: {
          player_limit: number
          position: number
          price_egp: number
          tier: string
        }
        Insert: {
          player_limit: number
          position: number
          price_egp: number
          tier: string
        }
        Update: {
          player_limit?: number
          position?: number
          price_egp?: number
          tier?: string
        }
        Relationships: []
      }
      player_intake: {
        Row: {
          allergies: string[]
          birth_year: number
          completed_at: string | null
          created_at: string
          experience: string
          height_cm: number
          injuries: string[]
          medical: string[]
          notes: string | null
          player_id: string
          session_minutes: number
          sex: string
          target_weight_kg: number | null
          training_days: number[]
          updated_at: string
          weight_kg: number
        }
        Insert: {
          allergies?: string[]
          birth_year: number
          completed_at?: string | null
          created_at?: string
          experience: string
          height_cm: number
          injuries?: string[]
          medical?: string[]
          notes?: string | null
          player_id: string
          session_minutes: number
          sex: string
          target_weight_kg?: number | null
          training_days: number[]
          updated_at?: string
          weight_kg: number
        }
        Update: {
          allergies?: string[]
          birth_year?: number
          completed_at?: string | null
          created_at?: string
          experience?: string
          height_cm?: number
          injuries?: string[]
          medical?: string[]
          notes?: string | null
          player_id?: string
          session_minutes?: number
          sex?: string
          target_weight_kg?: number | null
          training_days?: number[]
          updated_at?: string
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_intake_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      captain_packages: {
        Row: {
          archived_at: string | null
          captain_id: string
          created_at: string
          days: number
          id: string
          name: string
          price_egp: number
        }
        Insert: {
          archived_at?: string | null
          captain_id: string
          created_at?: string
          days: number
          id?: string
          name: string
          price_egp: number
        }
        Update: {
          archived_at?: string | null
          captain_id?: string
          created_at?: string
          days?: number
          id?: string
          name?: string
          price_egp?: number
        }
        Relationships: []
      }
      voice_notes: {
        Row: {
          audio_path: string
          captain_id: string
          context_id: string | null
          context_kind: string | null
          created_at: string
          duration_seconds: number
          id: string
          listened_at: string | null
          player_id: string
        }
        Insert: {
          audio_path: string
          captain_id: string
          context_id?: string | null
          context_kind?: string | null
          created_at?: string
          duration_seconds: number
          id: string
          listened_at?: string | null
          player_id: string
        }
        Update: {
          audio_path?: string
          captain_id?: string
          context_id?: string | null
          context_kind?: string | null
          created_at?: string
          duration_seconds?: number
          id?: string
          listened_at?: string | null
          player_id?: string
        }
        Relationships: []
      }
      payment_collections: {
        Row: {
          amount_egp: number
          captain_id: string
          created_at: string
          id: string
          payment_id: string
          player_id: string
        }
        Insert: {
          amount_egp: number
          captain_id: string
          created_at?: string
          id?: string
          payment_id: string
          player_id: string
        }
        Update: {
          amount_egp?: number
          captain_id?: string
          created_at?: string
          id?: string
          payment_id?: string
          player_id?: string
        }
        Relationships: []
      }
      player_payments: {
        Row: {
          amount_egp: number | null
          captain_id: string
          created_at: string
          days: number
          id: string
          package_id: string | null
          period_end: string
          period_start: string
          player_id: string
          price_egp: number | null
        }
        Insert: {
          amount_egp?: number | null
          captain_id: string
          created_at?: string
          days: number
          id?: string
          package_id?: string | null
          period_end: string
          period_start: string
          player_id: string
          price_egp?: number | null
        }
        Update: {
          amount_egp?: number | null
          captain_id?: string
          created_at?: string
          days?: number
          id?: string
          package_id?: string | null
          period_end?: string
          period_start?: string
          player_id?: string
          price_egp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_payments_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_payments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          deletion_requested_at: string | null
          demo_expires_at: string | null
          full_name: string
          id: string
          invite_message: string | null
          phone: string | null
          plan: Database["public"]["Enums"]["captain_plan"]
          role: Database["public"]["Enums"]["user_role"]
          role_confirmed: boolean
          suspended_at: string | null
          timezone: string
          tour_seen_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deletion_requested_at?: string | null
          demo_expires_at?: string | null
          full_name?: string
          id: string
          invite_message?: string | null
          phone?: string | null
          plan?: Database["public"]["Enums"]["captain_plan"]
          role: Database["public"]["Enums"]["user_role"]
          role_confirmed?: boolean
          suspended_at?: string | null
          timezone?: string
          tour_seen_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deletion_requested_at?: string | null
          demo_expires_at?: string | null
          full_name?: string
          id?: string
          invite_message?: string | null
          phone?: string | null
          plan?: Database["public"]["Enums"]["captain_plan"]
          role?: Database["public"]["Enums"]["user_role"]
          role_confirmed?: boolean
          suspended_at?: string | null
          timezone?: string
          tour_seen_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      program_days: {
        Row: {
          id: string
          position: number
          program_id: string
          title: string
        }
        Insert: {
          id?: string
          position: number
          program_id: string
          title?: string
        }
        Update: {
          id?: string
          position?: number
          program_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_days_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_exercises: {
        Row: {
          day_id: string
          exercise_id: string
          id: string
          notes: string | null
          position: number
          reps_max: number | null
          reps_min: number
          rest_seconds: number
          rpe: number | null
          sets: number
          superset_group: number | null
          tempo: string | null
        }
        Insert: {
          day_id: string
          exercise_id: string
          id?: string
          notes?: string | null
          position: number
          reps_max?: number | null
          reps_min: number
          rest_seconds?: number
          rpe?: number | null
          sets: number
          superset_group?: number | null
          tempo?: string | null
        }
        Update: {
          day_id?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          position?: number
          reps_max?: number | null
          reps_min?: number
          rest_seconds?: number
          rpe?: number | null
          sets?: number
          superset_group?: number | null
          tempo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_exercises_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "program_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          captain_id: string
          created_at: string
          id: string
          is_starter: boolean
          is_template: boolean
          notes: string | null
          player_id: string | null
          settings: Json
          source_template_id: string | null
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
        }
        Insert: {
          captain_id: string
          created_at?: string
          id?: string
          is_starter?: boolean
          is_template?: boolean
          notes?: string | null
          player_id?: string | null
          settings?: Json
          source_template_id?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
        }
        Update: {
          captain_id?: string
          created_at?: string
          id?: string
          is_starter?: boolean
          is_template?: boolean
          notes?: string | null
          player_id?: string | null
          settings?: Json
          source_template_id?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      set_logs: {
        Row: {
          client_updated_at: string
          completed_at: string
          deleted_at: string | null
          exercise_id: string
          id: string
          player_id: string
          program_exercise_id: string | null
          reps: number | null
          server_updated_at: string
          session_id: string
          set_index: number
          weight_kg: number | null
        }
        Insert: {
          client_updated_at: string
          completed_at: string
          deleted_at?: string | null
          exercise_id: string
          id: string
          player_id?: string
          program_exercise_id?: string | null
          reps?: number | null
          server_updated_at?: string
          session_id: string
          set_index: number
          weight_kg?: number | null
        }
        Update: {
          client_updated_at?: string
          completed_at?: string
          deleted_at?: string | null
          exercise_id?: string
          id?: string
          player_id?: string
          program_exercise_id?: string | null
          reps?: number | null
          server_updated_at?: string
          session_id?: string
          set_index?: number
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "set_logs_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_logs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_logs_program_exercise_id_fkey"
            columns: ["program_exercise_id"]
            isOneToOne: false
            referencedRelation: "program_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "set_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          client_updated_at: string
          completed_at: string | null
          id: string
          player_id: string
          program_day_id: string | null
          server_updated_at: string
          started_at: string
          training_date: string
        }
        Insert: {
          client_updated_at: string
          completed_at?: string | null
          id: string
          player_id?: string
          program_day_id?: string | null
          server_updated_at?: string
          started_at: string
          training_date: string
        }
        Update: {
          client_updated_at?: string
          completed_at?: string | null
          id?: string
          player_id?: string
          program_day_id?: string | null
          server_updated_at?: string
          started_at?: string
          training_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_program_day_id_fkey"
            columns: ["program_day_id"]
            isOneToOne: false
            referencedRelation: "program_days"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      inbox_items: {
        Row: {
          captain_id: string | null
          created_at: string | null
          id: string | null
          kind: string | null
          player_id: string | null
          reviewed_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_nutrition_plan: { Args: { p_plan: string }; Returns: undefined }
      activate_program: { Args: { p_program: string }; Returns: undefined }
      admin_activate_plan: {
        Args: {
          p_captain: string
          p_months: number
          p_payment_ref: string
          p_tier: string
        }
        Returns: string
      }
      admin_captains: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: {
          active_players: number
          created_at: string
          email: string
          email_confirmed: boolean
          full_name: string
          id: string
          last_paid_ends_at: string
          last_paid_tier: string
          over_limit: boolean
          player_limit: number
          suspended: boolean
          tier: string
          tier_ends_at: string
        }[]
      }
      admin_set_suspended: {
        Args: { p_reason: string; p_suspended: boolean; p_user: string }
        Returns: undefined
      }
      assign_nutrition_template: {
        Args: { p_player: string; p_template: string }
        Returns: string
      }
      copy_template: {
        Args: { p_kind: string; p_template: string; p_title: string }
        Returns: string
      }
      assign_program_template: {
        Args: { p_player: string; p_template: string }
        Returns: string
      }
      can_edit_plan: { Args: { p_plan: string }; Returns: boolean }
      can_edit_program: { Args: { p_program: string }; Returns: boolean }
      can_read_plan: { Args: { p_plan: string }; Returns: boolean }
      can_read_program: { Args: { p_program: string }; Returns: boolean }
      cancel_account_deletion: { Args: never; Returns: undefined }
      captain_dropout_radar: {
        Args: { p_today?: string }
        Returns: {
          days: number
          full_name: string
          phone: string
          player_id: string
          reason: string
        }[]
      }
      captain_dues: {
        Args: never
        Returns: { due_egp: number; player_id: string }[]
      }
      collect_player_payment: {
        Args: { p_amount: number; p_player: string }
        Returns: number
      }
      captain_last_payments: {
        Args: never
        Returns: {
          amount_egp: number
          captain_id: string
          created_at: string
          days: number
          id: string
          period_end: string
          period_start: string
          player_id: string
        }[]
      }
      captain_roster: {
        Args: never
        Returns: {
          access_until: string
          full_name: string
          last_training_date: string
          open_tasks: number
          player_id: string
          program_title: string
          started_on: string
        }[]
      }
      confirm_role: {
        Args: { p_role: Database["public"]["Enums"]["user_role"] }
        Returns: undefined
      }
      create_demo_workspace: { Args: never; Returns: undefined }
      current_tier: { Args: { p_captain: string }; Returns: string }
      invite_preview: {
        Args: { p_code: string }
        Returns: {
          captain_name: string
          valid: boolean
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_captain_of: { Args: { p_player: string }; Returns: boolean }
      is_suspended: { Args: never; Returns: boolean }
      my_captain_id: { Args: never; Returns: string }
      nutrition_plan_to_template: {
        Args: { p_plan: string; p_title: string }
        Returns: string
      }
      owns_meal: { Args: { p_meal: string }; Returns: boolean }
      owns_program_day: { Args: { p_day: string }; Returns: boolean }
      owns_program_exercise: { Args: { p_item: string }; Returns: boolean }
      owns_session: { Args: { p_session: string }; Returns: boolean }
      plan_of_item: { Args: { p_item: string }; Returns: string }
      plan_of_meal: { Args: { p_meal: string }; Returns: string }
      player_can_read: { Args: never; Returns: boolean }
      player_can_read_from: { Args: { p_captain: string }; Returns: boolean }
      player_can_write: { Args: never; Returns: boolean }
      program_to_template: {
        Args: { p_program: string; p_title: string }
        Returns: string
      }
      purge_deleted_accounts: { Args: never; Returns: number }
      redeem_invite: { Args: { p_code: string }; Returns: string }
      renew_player: {
        Args: { p_amount?: number; p_days?: number; p_package?: string; p_player: string; p_price?: number }
        Returns: string
      }
      request_account_deletion: { Args: never; Returns: string }
      require_active_caller: { Args: never; Returns: boolean }
      save_nutrition_plan: {
        Args: { p_draft: Json; p_plan: string }
        Returns: undefined
      }
      storage_owner: { Args: { p_name: string }; Returns: string }
      sync_meal_logs: { Args: { p_rows: Json }; Returns: undefined }
      sync_set_logs: { Args: { p_rows: Json }; Returns: undefined }
      sync_workout_sessions: { Args: { p_rows: Json }; Returns: undefined }
      valid_intake_training_days: { Args: { days: number[] }; Returns: boolean }
    }
    Enums: {
      captain_plan: "free" | "pro"
      content_status: "draft" | "active" | "archived"
      user_role: "captain" | "player"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      captain_plan: ["free", "pro"],
      content_status: ["draft", "active", "archived"],
      user_role: ["captain", "player"],
    },
  },
} as const
