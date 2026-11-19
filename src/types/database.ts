// Base generated from Supabase; additive public-page data regenerated from local PGlite (0103).
// Do not edit; corrections go in app-database.ts.
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
      captain_freeze_settings: {
        Row: {
          captain_id: string
          default_days: number | null
          updated_at: string
        }
        Insert: {
          captain_id: string
          default_days?: number | null
          updated_at?: string
        }
        Update: {
          captain_id?: string
          default_days?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "captain_freeze_settings_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_waitlist: {
        Row: {
          captain_id: string
          created_at: string
          id: string
          notified_at: string | null
          player_id: string
        }
        Insert: {
          captain_id: string
          created_at?: string
          id: string
          notified_at?: string | null
          player_id: string
        }
        Update: {
          captain_id?: string
          created_at?: string
          id?: string
          notified_at?: string | null
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_waitlist_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_waitlist_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      form_answers: {
        Row: {
          id: string
          request_id: string
          question_id: string
          value: Json
          photo_paths: string[]
        }
        Insert: {
          id: string
          request_id: string
          question_id: string
          value?: Json
          photo_paths?: string[]
        }
        Update: {
          id?: string
          request_id?: string
          question_id?: string
          value?: Json
          photo_paths?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "form_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "form_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_answers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "form_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      form_questions: {
        Row: {
          show_chart: boolean
          id: string
          form_id: string
          position: number
          label_ar: string
          label_en: string
          type: string
          options: Json
          required: boolean
          maps_to: string | null
          alert_on: Json | null
        }
        Insert: {
          show_chart?: boolean
          id: string
          form_id: string
          position: number
          label_ar: string
          label_en: string
          type: string
          options?: Json
          required?: boolean
          maps_to?: string | null
          alert_on?: Json | null
        }
        Update: {
          show_chart?: boolean
          id?: string
          form_id?: string
          position?: number
          label_ar?: string
          label_en?: string
          type?: string
          options?: Json
          required?: boolean
          maps_to?: string | null
          alert_on?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "form_questions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_requests: {
        Row: {
          id: string
          form_id: string
          player_id: string
          captain_id: string
          sent_at: string
          due_at: string | null
          reminded_at: string | null
          answered_at: string | null
          reviewed_at: string | null
          captain_reply: string | null
          status: string | null
        }
        Insert: {
          id: string
          form_id: string
          player_id: string
          captain_id: string
          sent_at?: string
          due_at?: string | null
          reminded_at?: string | null
          answered_at?: string | null
          reviewed_at?: string | null
          captain_reply?: string | null
          status?: never
        }
        Update: {
          id?: string
          form_id?: string
          player_id?: string
          captain_id?: string
          sent_at?: string
          due_at?: string | null
          reminded_at?: string | null
          answered_at?: string | null
          reviewed_at?: string | null
          captain_reply?: string | null
          status?: never
        }
        Relationships: [
          {
            foreignKeyName: "form_requests_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_requests_form_id_captain_id_fkey"
            columns: ["form_id","captain_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id","captain_id"]
          },
          {
            foreignKeyName: "form_requests_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_requests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          id: string
          captain_id: string
          title: string
          kind: string
          schedule: Json | null
          remind_after_hours: number | null
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          captain_id: string
          title: string
          kind: string
          schedule?: Json | null
          remind_after_hours?: number | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          captain_id?: string
          title?: string
          kind?: string
          schedule?: Json | null
          remind_after_hours?: number | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      body_scans: {
        Row: {
          created_at: string
          fat_pct: number | null
          file_path: string | null
          id: string
          muscle_kg: number | null
          player_id: string
          scan_date: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          fat_pct?: number | null
          file_path?: string | null
          id: string
          muscle_kg?: number | null
          player_id?: string
          scan_date: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          fat_pct?: number | null
          file_path?: string | null
          id?: string
          muscle_kg?: number | null
          player_id?: string
          scan_date?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "body_scans_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      captain_package_tiers: {
        Row: {
          id: string
          captain_id: string
          name: string
          description: string
          color: string
          position: number
          features: Json
          is_featured: boolean
          archived_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          captain_id: string
          name: string
          description?: string
          color?: string
          position?: number
          features?: Json
          is_featured?: boolean
          archived_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          captain_id?: string
          name?: string
          description?: string
          color?: string
          position?: number
          features?: Json
          is_featured?: boolean
          archived_at?: string | null
          created_at?: string
        }
        Relationships: [{
          foreignKeyName: "captain_package_tiers_captain_id_fkey"
          columns: ["captain_id"]
          isOneToOne: false
          referencedRelation: "profiles"
          referencedColumns: ["id"]
        }]
      }
      captain_offers: {
        Row: {
          id: string
          captain_id: string
          name: string
          kind: string
          value: number
          scope: string
          tier_ids: string[]
          package_ids: string[]
          starts_at: string
          ends_at: string
          for_new: boolean
          for_renewals: boolean
          max_uses: number | null
          used_count: number
          paused_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          captain_id: string
          name: string
          kind: string
          value: number
          scope?: string
          tier_ids?: string[]
          package_ids?: string[]
          starts_at: string
          ends_at: string
          for_new?: boolean
          for_renewals?: boolean
          max_uses?: number | null
          used_count?: number
          paused_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          captain_id?: string
          name?: string
          kind?: string
          value?: number
          scope?: string
          tier_ids?: string[]
          package_ids?: string[]
          starts_at?: string
          ends_at?: string
          for_new?: boolean
          for_renewals?: boolean
          max_uses?: number | null
          used_count?: number
          paused_at?: string | null
          created_at?: string
        }
        Relationships: [{
          foreignKeyName: "captain_offers_captain_id_fkey"
          columns: ["captain_id"]
          isOneToOne: false
          referencedRelation: "profiles"
          referencedColumns: ["id"]
        }]
      }
      freeze_requests: {
        Row: { id: string; player_id: string; captain_id: string; days: number; note: string | null; status: string; created_at: string; decided_at: string | null }
        Insert: { id: string; player_id: string; captain_id: string; days: number; note?: string | null; status?: string; created_at?: string; decided_at?: string | null }
        Update: { id?: string; player_id?: string; captain_id?: string; days?: number; note?: string | null; status?: string; created_at?: string; decided_at?: string | null }
        Relationships: [
          { foreignKeyName: "freeze_requests_player_id_fkey"; columns: ["player_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
          { foreignKeyName: "freeze_requests_captain_id_fkey"; columns: ["captain_id"]; isOneToOne: false; referencedRelation: "profiles"; referencedColumns: ["id"] },
        ]
      }
      captain_packages: {
        Row: {
          max_freeze_days: number | null
          archived_at: string | null
          captain_id: string
          created_at: string
          days: number
          id: string
          kind: string
          name: string
          price_egp: number
          sessions: number | null
          tier_id: string | null
        }
        Insert: {
          max_freeze_days?: number | null
          archived_at?: string | null
          captain_id: string
          created_at?: string
          days: number
          id?: string
          kind?: string
          name: string
          price_egp: number
          sessions?: number | null
          tier_id?: string | null
        }
        Update: {
          max_freeze_days?: number | null
          archived_at?: string | null
          captain_id?: string
          created_at?: string
          days?: number
          id?: string
          kind?: string
          name?: string
          price_egp?: number
          sessions?: number | null
          tier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "captain_packages_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "captain_package_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_tier_owner"
            columns: ["tier_id", "captain_id"]
            isOneToOne: false
            referencedRelation: "captain_package_tiers"
            referencedColumns: ["id", "captain_id"]
          },
          {
            foreignKeyName: "captain_packages_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
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
          body_fat_pct: number | null
          body_weight_kg: number | null
          captain_id: string
          captain_reply: string | null
          created_at: string
          id: string
          notes: string | null
          photo_paths: string[]
          photo_poses: string[]
          player_id: string
          reviewed_at: string | null
          waist_cm: number | null
          week_start: string
        }
        Insert: {
          body_fat_pct?: number | null
          body_weight_kg?: number | null
          captain_id: string
          captain_reply?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          photo_paths?: string[]
          photo_poses?: string[]
          player_id?: string
          reviewed_at?: string | null
          waist_cm?: number | null
          week_start: string
        }
        Update: {
          body_fat_pct?: number | null
          body_weight_kg?: number | null
          captain_id?: string
          captain_reply?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          photo_paths?: string[]
          photo_poses?: string[]
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
          frozen_until: string | null
          subscription_starts_on: string | null
          awaiting_plans_at: string | null
          access_until: string
          archived_at: string | null
          billing_started_at: string
          captain_id: string
          created_at: string
          frozen_at: string | null
          id: string
          pending: boolean
          player_id: string
          sessions_left: number | null
          started_on: string
          updated_at: string
        }
        Insert: {
          frozen_until?: string | null
          subscription_starts_on?: string | null
          awaiting_plans_at?: string | null
          access_until: string
          archived_at?: string | null
          billing_started_at?: string
          captain_id: string
          created_at?: string
          frozen_at?: string | null
          id?: string
          pending?: boolean
          player_id: string
          sessions_left?: number | null
          started_on?: string
          updated_at?: string
        }
        Update: {
          frozen_until?: string | null
          subscription_starts_on?: string | null
          awaiting_plans_at?: string | null
          access_until?: string
          archived_at?: string | null
          billing_started_at?: string
          captain_id?: string
          created_at?: string
          frozen_at?: string | null
          id?: string
          pending?: boolean
          player_id?: string
          sessions_left?: number | null
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
          free_trial: boolean | null
          id: string
          kind: string | null
          package_id: string | null
          paid_egp: number | null
          player_name: string | null
          price_egp: number | null
          quantity: number | null
          redeemed_at: string | null
          redeemed_by: string | null
          starts_on: string | null
          whatsapp: string | null
        }
        Insert: {
          access_until: string
          captain_id: string
          code?: string
          created_at?: string
          expires_at?: string
          free_trial?: boolean | null
          id?: string
          kind?: string | null
          package_id?: string | null
          paid_egp?: number | null
          player_name?: string | null
          price_egp?: number | null
          quantity?: number | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          starts_on?: string | null
          whatsapp?: string | null
        }
        Update: {
          access_until?: string
          captain_id?: string
          code?: string
          created_at?: string
          expires_at?: string
          free_trial?: boolean | null
          id?: string
          kind?: string | null
          package_id?: string | null
          paid_egp?: number | null
          player_name?: string | null
          price_egp?: number | null
          quantity?: number | null
          redeemed_at?: string | null
          redeemed_by?: string | null
          starts_on?: string | null
          whatsapp?: string | null
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
            foreignKeyName: "coach_invites_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "captain_packages"
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
      coach_join_requests: {
        Row: {
          package_id: string | null
          offer_id: string | null
          captain_id: string
          created_at: string
          id: string
          player_id: string
          status: string
        }
        Insert: {
          package_id?: string | null
          offer_id?: string | null
          captain_id: string
          created_at?: string
          id: string
          player_id: string
          status?: string
        }
        Update: {
          package_id?: string | null
          offer_id?: string | null
          captain_id?: string
          created_at?: string
          id?: string
          player_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_join_requests_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_join_requests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_renewal_requests: {
        Row: {
          id: string; player_id: string; captain_id: string; package_id: string; offer_id: string | null
          status: string; created_at: string; updated_at: string; decided_at: string | null
        }
        Insert: {
          id: string; player_id: string; captain_id: string; package_id: string; offer_id?: string | null
          status?: string; created_at?: string; updated_at?: string; decided_at?: string | null
        }
        Update: {
          status?: string; updated_at?: string; decided_at?: string | null
        }
        Relationships: []
      }
      crown_prizes: {
        Row: {
          captain_id: string
          month: string
          prize: string
          updated_at: string
        }
        Insert: {
          captain_id: string
          month: string
          prize: string
          updated_at?: string
        }
        Update: {
          captain_id?: string
          month?: string
          prize?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crown_prizes_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crown_winners: {
        Row: {
          adherence: number
          captain_id: string
          done: number
          month: string
          planned: number
          player_id: string
        }
        Insert: {
          adherence: number
          captain_id: string
          done: number
          month: string
          planned: number
          player_id: string
        }
        Update: {
          adherence?: number
          captain_id?: string
          done?: number
          month?: string
          planned?: number
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crown_winners_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crown_winners_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_checks: {
        Row: {
          client_updated_at: string
          deleted_at: string | null
          id: string
          log_date: string
          player_id: string
          sleep_hours: number | null
          soreness: number | null
          water_ml: number
        }
        Insert: {
          client_updated_at: string
          deleted_at?: string | null
          id: string
          log_date: string
          player_id?: string
          sleep_hours?: number | null
          soreness?: number | null
          water_ml?: number
        }
        Update: {
          client_updated_at?: string
          deleted_at?: string | null
          id?: string
          log_date?: string
          player_id?: string
          sleep_hours?: number | null
          soreness?: number | null
          water_ml?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_checks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_generator_tags: {
        Row: {
          equipment: string
          exercise_id: string
          kind: string
          min_level: string
          pattern: string
          stress: string[]
        }
        Insert: {
          equipment: string
          exercise_id: string
          kind: string
          min_level: string
          pattern: string
          stress?: string[]
        }
        Update: {
          equipment?: string
          exercise_id?: string
          kind?: string
          min_level?: string
          pattern?: string
          stress?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "exercise_generator_tags_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: true
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_swap_requests: {
        Row: {
          captain_id: string
          created_at: string
          decided_at: string | null
          from_exercise_id: string
          id: string
          injury: string | null
          player_id: string
          program_exercise_id: string
          reason: string
          status: string
          to_exercise_id: string
        }
        Insert: {
          captain_id: string
          created_at?: string
          decided_at?: string | null
          from_exercise_id: string
          id?: string
          injury?: string | null
          player_id: string
          program_exercise_id: string
          reason?: string
          status?: string
          to_exercise_id: string
        }
        Update: {
          captain_id?: string
          created_at?: string
          decided_at?: string | null
          from_exercise_id?: string
          id?: string
          injury?: string | null
          player_id?: string
          program_exercise_id?: string
          reason?: string
          status?: string
          to_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_swap_requests_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_swap_requests_from_exercise_id_fkey"
            columns: ["from_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_swap_requests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_swap_requests_program_exercise_id_fkey"
            columns: ["program_exercise_id"]
            isOneToOne: false
            referencedRelation: "program_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_swap_requests_to_exercise_id_fkey"
            columns: ["to_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          archived_at: string | null
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
          video_url: string | null
        }
        Insert: {
          archived_at?: string | null
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
          video_url?: string | null
        }
        Update: {
          archived_at?: string | null
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
          video_url?: string | null
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
          archived_at: string | null
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
          archived_at?: string | null
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
          archived_at?: string | null
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
      ko_dismissals: {
        Row: {
          key: string
          until: string
          user_id: string
        }
        Insert: {
          key: string
          until: string
          user_id?: string
        }
        Update: {
          key?: string
          until?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ko_dismissals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ko_waitlist: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ko_waitlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
          eaten_macros: Json | null
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
          eaten_macros?: Json | null
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
          eaten_macros?: Json | null
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
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          payload: Json
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          payload?: Json
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          payload?: Json
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        Relationships: [
          {
            foreignKeyName: "payment_collections_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_collections_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "player_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_collections_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      player_payments: {
        Row: {
          tier_id: string | null
          offer_id: string | null
          list_price_egp: number | null
          bonus_days: number | null
          amount_egp: number | null
          captain_id: string
          created_at: string
          days: number
          id: string
          notes: string | null
          package_id: string | null
          period_end: string
          period_start: string
          player_id: string
          price_egp: number | null
        }
        Insert: {
          tier_id?: string | null
          offer_id?: string | null
          list_price_egp?: number | null
          bonus_days?: number | null
          amount_egp?: number | null
          captain_id: string
          created_at?: string
          days: number
          id?: string
          notes?: string | null
          package_id?: string | null
          period_end: string
          period_start: string
          player_id: string
          price_egp?: number | null
        }
        Update: {
          tier_id?: string | null
          offer_id?: string | null
          list_price_egp?: number | null
          bonus_days?: number | null
          amount_egp?: number | null
          captain_id?: string
          created_at?: string
          days?: number
          id?: string
          notes?: string | null
          package_id?: string | null
          period_end?: string
          period_start?: string
          player_id?: string
          price_egp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_payments_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "captain_package_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_payments_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "captain_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_payments_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_payments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "captain_packages"
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
      player_points: {
        Row: {
          lifetime: number
          player_id: string
          updated_at: string
        }
        Insert: {
          lifetime?: number
          player_id: string
          updated_at?: string
        }
        Update: {
          lifetime?: number
          player_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_points_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      points_log: {
        Row: {
          captain_id: string
          created_at: string
          earned_on: string
          id: string
          kind: string
          player_id: string
          points: number
          reviewed_at: string | null
          source_key: string
          status: string
        }
        Insert: {
          captain_id: string
          created_at?: string
          earned_on: string
          id?: string
          kind: string
          player_id: string
          points: number
          reviewed_at?: string | null
          source_key: string
          status: string
        }
        Update: {
          captain_id?: string
          created_at?: string
          earned_on?: string
          id?: string
          kind?: string
          player_id?: string
          points?: number
          reviewed_at?: string | null
          source_key?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_log_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_log_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          languages: string[]
          show_public_stats: boolean
          specialties: string[]
          years_experience: number | null
          avatar_path: string | null
          bio: string | null
          captain_intake: Json | null
          captain_reviewed_at: string | null
          captain_status: string
          created_at: string
          deletion_requested_at: string | null
          demo_expires_at: string | null
          full_name: string
          id: string
          invite_message: string | null
          location: string | null
          phone: string | null
          plan: Database["public"]["Enums"]["captain_plan"]
          public_slug: string | null
          role: Database["public"]["Enums"]["user_role"]
          role_confirmed: boolean
          social: Json
          suspended_at: string | null
          timezone: string
          tour_seen_at: string | null
          units: string
          updated_at: string
        }
        Insert: {
          languages?: string[]
          show_public_stats?: boolean
          specialties?: string[]
          years_experience?: number | null
          avatar_path?: string | null
          bio?: string | null
          captain_intake?: Json | null
          captain_reviewed_at?: string | null
          captain_status?: string
          created_at?: string
          deletion_requested_at?: string | null
          demo_expires_at?: string | null
          full_name?: string
          id: string
          invite_message?: string | null
          location?: string | null
          phone?: string | null
          plan?: Database["public"]["Enums"]["captain_plan"]
          public_slug?: string | null
          role: Database["public"]["Enums"]["user_role"]
          role_confirmed?: boolean
          social?: Json
          suspended_at?: string | null
          timezone?: string
          tour_seen_at?: string | null
          units?: string
          updated_at?: string
        }
        Update: {
          languages?: string[]
          show_public_stats?: boolean
          specialties?: string[]
          years_experience?: number | null
          avatar_path?: string | null
          bio?: string | null
          captain_intake?: Json | null
          captain_reviewed_at?: string | null
          captain_status?: string
          created_at?: string
          deletion_requested_at?: string | null
          demo_expires_at?: string | null
          full_name?: string
          id?: string
          invite_message?: string | null
          location?: string | null
          phone?: string | null
          plan?: Database["public"]["Enums"]["captain_plan"]
          public_slug?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          role_confirmed?: boolean
          social?: Json
          suspended_at?: string | null
          timezone?: string
          tour_seen_at?: string | null
          units?: string
          updated_at?: string
        }
        Relationships: []
      }
      program_cardio: {
        Row: {
          day_id: string
          id: string
          intensity: string
          kind: string
          minutes: number
          notes: string
          position: number
        }
        Insert: {
          day_id: string
          id?: string
          intensity: string
          kind: string
          minutes: number
          notes?: string
          position: number
        }
        Update: {
          day_id?: string
          id?: string
          intensity?: string
          kind?: string
          minutes?: number
          notes?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_cardio_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "program_days"
            referencedColumns: ["id"]
          },
        ]
      }
      program_days: {
        Row: {
          id: string
          is_rest_day: boolean
          position: number
          program_id: string
          title: string
          weekday: number | null
          warmup: Json
        }
        Insert: {
          id?: string
          is_rest_day?: boolean
          position: number
          program_id: string
          title?: string
          weekday?: number | null
          warmup?: Json
        }
        Update: {
          id?: string
          is_rest_day?: boolean
          position?: number
          program_id?: string
          title?: string
          weekday?: number | null
          warmup?: Json
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
          alternatives: string[]
          set_plan: Json | null
          day_id: string
          exercise_id: string
          id: string
          notes: string | null
          position: number
          reps_max: number | null
          reps_min: number
          rest_seconds: number
          rir: number | null
          rpe: number | null
          sets: number
          superset_group: number | null
          tempo: string | null
        }
        Insert: {
          alternatives?: string[]
          set_plan?: Json | null
          day_id: string
          exercise_id: string
          id?: string
          notes?: string | null
          position: number
          reps_max?: number | null
          reps_min: number
          rest_seconds?: number
          rir?: number | null
          rpe?: number | null
          sets: number
          superset_group?: number | null
          tempo?: string | null
        }
        Update: {
          alternatives?: string[]
          set_plan?: Json | null
          day_id?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          position?: number
          reps_max?: number | null
          reps_min?: number
          rest_seconds?: number
          rir?: number | null
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_success_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id: string
          last_success_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_success_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      readiness_decisions: {
        Row: {
          captain_id: string
          created_at: string
          decision: string
          decision_date: string
          id: string
          player_id: string
        }
        Insert: {
          captain_id: string
          created_at?: string
          decision: string
          decision_date: string
          id: string
          player_id: string
        }
        Update: {
          captain_id?: string
          created_at?: string
          decision?: string
          decision_date?: string
          id?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "readiness_decisions_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "readiness_decisions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_deductions: {
        Row: {
          link_id: string
          session_id: string
        }
        Insert: {
          link_id: string
          session_id: string
        }
        Update: {
          link_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_deductions_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "coach_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      set_logs: {
        Row: {
          drop_index: number
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
          drop_index?: number
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
          drop_index?: number
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
      supplement_logs: {
        Row: {
          client_updated_at: string
          deleted_at: string | null
          id: string
          log_date: string
          player_id: string
          supplement_id: string
          taken_at: string | null
        }
        Insert: {
          client_updated_at: string
          deleted_at?: string | null
          id: string
          log_date: string
          player_id?: string
          supplement_id: string
          taken_at?: string | null
        }
        Update: {
          client_updated_at?: string
          deleted_at?: string | null
          id?: string
          log_date?: string
          player_id?: string
          supplement_id?: string
          taken_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplement_logs_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplement_logs_supplement_id_player_id_fkey"
            columns: ["supplement_id", "player_id"]
            isOneToOne: false
            referencedRelation: "supplements"
            referencedColumns: ["id", "player_id"]
          },
        ]
      }
      supplements: {
        Row: {
          archived_at: string | null
          captain_id: string
          created_at: string
          dose: string
          id: string
          name: string
          notes: string
          player_id: string
          position: number
          timing: string
        }
        Insert: {
          archived_at?: string | null
          captain_id: string
          created_at?: string
          dose?: string
          id: string
          name: string
          notes?: string
          player_id: string
          position?: number
          timing: string
        }
        Update: {
          archived_at?: string | null
          captain_id?: string
          created_at?: string
          dose?: string
          id?: string
          name?: string
          notes?: string
          player_id?: string
          position?: number
          timing?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplements_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplements_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          id: string
          captain_id: string
          player_id: string
          sender_id: string
          body: string | null
          audio_path: string | null
          duration_seconds: number | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id: string
          captain_id: string
          player_id: string
          sender_id: string
          body?: string | null
          audio_path?: string | null
          duration_seconds?: number | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "voice_notes_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_notes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          player_note: string | null
          program_day_id: string | null
          server_updated_at: string
          session_rpe: number | null
          started_at: string
          training_date: string
        }
        Insert: {
          client_updated_at: string
          completed_at?: string | null
          id: string
          player_id?: string
          player_note?: string | null
          program_day_id?: string | null
          server_updated_at?: string
          session_rpe?: number | null
          started_at: string
          training_date: string
        }
        Update: {
          client_updated_at?: string
          completed_at?: string | null
          id?: string
          player_id?: string
          player_note?: string | null
          program_day_id?: string | null
          server_updated_at?: string
          session_rpe?: number | null
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
      remaining_freeze_days: { Args: { p_captain: string }; Returns: number }
      request_player_freeze: { Args: { p_id: string; p_captain: string; p_days: number; p_note?: string | null }; Returns: undefined }
      cancel_freeze_request: { Args: { p_id: string }; Returns: undefined }
      decide_freeze_request: { Args: { p_id: string; p_approve: boolean }; Returns: undefined }
      leave_coach_waitlist: {
        Args: { p_id: string }
        Returns: undefined
      }
      can_join_coach_waitlist: {
        Args: { p_captain: string }
        Returns: boolean
      }
      coach_public_page: {
        Args: { slug: string }
        Returns: {
          specialties: string[]
          years_experience: number
          languages: string[]
          show_public_stats: boolean
          spots_left: number
          accepting: boolean
        }[]
      }
      coach_public_stats: {
        Args: { slug: string }
        Returns: Json
      }
      valid_public_specialties: {
        Args: { items: string[] }
        Returns: boolean
      }
      pending_coach_join_packages: {
        Args: never
        Returns: { id: string; full_name: string; created_at: string; package_id: string | null; offer_id: string | null;
          package_days: number | null; package_sessions: number | null }[]
      }
      decide_player_renewal: { Args: { p_request: string; p_status: string }; Returns: boolean }
      activate_join_package: { Args: { p_link: string; p_package: string; p_paid: number }; Returns: boolean }
      captain_player_tiers: {
        Args: never
        Returns: { player_id: string; id: string; name: string; color: string; is_featured: boolean }[]
      }
      activate_nutrition_plan: { Args: { p_plan: string }; Returns: undefined }
      activate_player: {
        Args: {
          p_free_trial: boolean
          p_kind: string
          p_link: string
          p_package: string
          p_paid_egp: number
          p_price_egp: number
          p_quantity: number
        }
        Returns: undefined
      }
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
      admin_notification_kpis: {
        Args: never
        Returns: {
          captains: number
          paid_captains: number
          players: number
        }[]
      }
      admin_dashboard: {
        Args: never
        Returns: Json
      }
      admin_captain_activity: {
        Args: { p_ids: string[] }
        Returns: {
          id: string
          lastActiveAt: string | null
          expiringSoon: boolean
          quiet: boolean
        }[]
      }
      admin_captain_detail: {
        Args: { p_captain: string }
        Returns: Json
      }
      admin_pending_captains: {
        Args: never
        Returns: {
          captain_intake: Json
          created_at: string
          email: string
          full_name: string
          id: string
          instagram: string
          whatsapp: string
        }[]
      }
      admin_review_captain: {
        Args: { p_captain: string; p_status: string }
        Returns: undefined
      }
      admin_set_suspended: {
        Args: { p_reason: string; p_suspended: boolean; p_user: string }
        Returns: undefined
      }
      assign_nutrition_template: {
        Args: { p_player: string; p_template: string }
        Returns: string
      }
      assign_program_template: {
        Args: { p_player: string; p_template: string }
        Returns: string
      }
      award_meal_check: {
        Args: { p_day: string; p_receipt: string }
        Returns: undefined
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
        Returns: {
          due_egp: number
          player_id: string
        }[]
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
      captain_since: { Args: { p_player: string }; Returns: string }
      coach_public_profile: {
        Args: { slug: string }
        Returns: {
          avatar_path: string
          bio: string
          full_name: string
          id: string
          location: string
          social: Json
        }[]
      }
      collect_player_payment: {
        Args: { p_amount: number; p_player: string }
        Returns: number
      }
      confirm_role: {
        Args: { p_role: Database["public"]["Enums"]["user_role"] }
        Returns: undefined
      }
      copy_template: {
        Args: { p_kind: string; p_template: string; p_title: string }
        Returns: string
      }
      create_demo_player_workspace: { Args: never; Returns: undefined }
      create_demo_workspace: { Args: never; Returns: undefined }
      create_player_invite: {
        Args: {
          p_free_trial: boolean
          p_kind: string
          p_name: string
          p_package: string
          p_paid_egp: number
          p_price_egp: number
          p_quantity: number
          p_starts_on: string
          p_whatsapp: string
        }
        Returns: string
      }
      crown_hall_of_fame: {
        Args: never
        Returns: {
          adherence: number
          display_name: string
          done: number
          month: string
          planned: number
          player_id: string
        }[]
      }
      current_tier: { Args: { p_captain: string }; Returns: string }
      ko_usage_tier: { Args: Record<never, never>; Returns: { captain_id: string; tier: string }[] }
      ko_usage_take: { Args: { p_day: string; p_kind: string; p_msg_cap: number; p_photo_cap: number; p_month_cap: number }; Returns: string }
      ko_credit_take: { Args: { p_month: string; p_cap: number; p_token?: string }; Returns: boolean }
      ko_usage_summary: { Args: Record<never, never>; Returns: { credits_used: number; credits_cap: number; month: string }[] }
      ko_usage_claim_warning: { Args: { p_month_cap: number; p_proof: string }; Returns: boolean }
      decide_exercise_swap: {
        Args: { p_approve: boolean; p_id: string }
        Returns: undefined
      }
      invite_preview: {
        Args: { p_code: string }
        Returns: {
          captain_name: string
          valid: boolean
        }[]
      }
      is_account_suspended: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_captain_of: { Args: { p_player: string }; Returns: boolean }
      is_suspended: { Args: never; Returns: boolean }
      ko_apply_action: { Args: { p_token: string }; Returns: Json }
      ko_feed: {
        Args: never
        Returns: {
          data: Json
          key: string
          kind: string
          player_id: string
          player_name: string
          severity: string
        }[]
      }
      my_approval_route_profile: {
        Args: never
        Returns: {
          captain_status: string
          is_admin: boolean
          role: Database["public"]["Enums"]["user_role"]
          role_confirmed: boolean
          suspended_at: string
        }[]
      }
      my_captain_id: { Args: never; Returns: string }
      my_captain_profile: {
        Args: never
        Returns: {
          avatar_path: string
          bio: string
          full_name: string
          location: string
          phone: string
          social: Json
        }[]
      }
      my_points: { Args: never; Returns: Json }
      my_medals: { Args: never; Returns: { workouts: number; full_weeks: number; prs: number; crowns: number; crown_streak: number }[] }
      player_medals: { Args: { p_player: string }; Returns: { workouts: number; full_weeks: number; prs: number; crowns: number; crown_streak: number }[] }
      my_route_profile: {
        Args: never
        Returns: {
          is_admin: boolean
          role: Database["public"]["Enums"]["user_role"]
          role_confirmed: boolean
          suspended_at: string
        }[]
      }
      nutrition_plan_to_template: {
        Args: { p_plan: string; p_title: string }
        Returns: string
      }
      owns_meal: { Args: { p_meal: string }; Returns: boolean }
      owns_program_day: { Args: { p_day: string }; Returns: boolean }
      owns_program_exercise: { Args: { p_item: string }; Returns: boolean }
      owns_session: { Args: { p_session: string }; Returns: boolean }
      pending_coach_join_requests: {
        Args: never
        Returns: {
          created_at: string
          full_name: string
          id: string
        }[]
      }
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
      push_config: { Args: never; Returns: Json }
      queue_crown_reminders: { Args: { p_today?: string }; Returns: undefined }
      queue_expiry_reminders: { Args: { p_today?: string }; Returns: undefined }
      queue_workout_reminders: {
        Args: { p_today?: string }
        Returns: undefined
      }
      redeem_invite: { Args: { p_code: string }; Returns: string }
      refresh_inactive_alerts: { Args: never; Returns: undefined }
      renew_player: {
        Args: {
          p_amount?: number
          p_days?: number
          p_package?: string
          p_player: string
          p_price?: number
        }
        Returns: string
      }
      request_account_deletion: { Args: never; Returns: string }
      request_exercise_swap: {
        Args: {
          p_injury?: string
          p_program_exercise_id: string
          p_reason?: string
          p_to_exercise_id: string
        }
        Returns: string
      }
      require_active_caller: { Args: never; Returns: boolean }
      require_profile_caller: { Args: never; Returns: boolean }
      resolve_coach_join_request: {
        Args: { p_link_id: string; p_request: string; p_status: string }
        Returns: undefined
      }
      save_nutrition_plan: {
        Args: { p_draft: Json; p_plan: string }
        Returns: undefined
      }
      save_weekly_program: { Args: { p_draft: Json }; Returns: undefined }
      set_player_frozen: {
        Args: { p_frozen: boolean; p_link: string }
        Returns: undefined
      }
      start_player_subscription: {
        Args: { p_link: string }
        Returns: undefined
      }
      storage_owner: { Args: { p_name: string }; Returns: string }
      sync_daily_checks: { Args: { p_rows: Json }; Returns: undefined }
      sync_meal_logs: { Args: { p_rows: Json }; Returns: undefined }
      sync_set_logs: { Args: { p_rows: Json }; Returns: undefined }
      sync_supplement_logs: { Args: { p_rows: Json }; Returns: undefined }
      sync_workout_sessions: { Args: { p_rows: Json }; Returns: undefined }
      team_leaderboard: {
        Args: { p_month?: string }
        Returns: {
          adherence: number
          display_name: string
          done: number
          is_crown: boolean
          lifetime: number
          monthly: number
          planned: number
          player_id: string
          position: number
          tier: string
        }[]
      }
      valid_captain_intake: { Args: { value: Json }; Returns: boolean }
      valid_intake_training_days: { Args: { days: number[] }; Returns: boolean }
      valid_profile_social: { Args: { value: Json }; Returns: boolean }
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
