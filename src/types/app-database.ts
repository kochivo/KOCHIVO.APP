import type { Database, Json } from './database';
import type { AssessmentSchedulesTable } from './assessment-schedules';
import type { PainReportRow, PainLoadHint, PainReply } from '@/core/offline/pain-tables';
import type { WomenModeTables, WomenModeFunctions } from './women-mode';
import type {
  CaptainStatus, Units, SupplementTiming, NotificationType, PointKind, PointStatus,
  Injury, SwapReason, SwapStatus, MovementPattern, ExerciseKind, EquipmentKind,
  ExperienceLevel, ReadinessDecision, JoinStatus, PackageKind, RankTier,
  CustomFormKind, CustomFormQuestionType, CustomFormStatus, CustomFormFactKey,
  PublicProfileLanguage,
} from './enums';

export type Narrow<Row, Patch> = Omit<Row, keyof Patch> & Patch;

type Public = Database['public'];
export type FoodRegion = 'eg' | 'gulf' | 'lev' | 'na' | 'intl';
export type FoodDietTag = 'meat' | 'poultry' | 'fish' | 'dairy' | 'egg' | 'plant';
export type FoodSourceRef = {
  fdc_id: string; dataset: string; description: string;
} | {
  ingredients: { fdc_id: string; grams: number; description: string; diet_tags: FoodDietTag[] }[]; cooked_yield_g: number;
};
export type FoodLibraryFields = {
  diet_tags: FoodDietTag[];
  region: FoodRegion; state: 'raw' | 'cooked' | null;
  fiber_per_100g: number | null; sugar_per_100g: number | null; sodium_mg_per_100g: number | null;
  source_kind: 'usda' | 'recipe' | 'proxy' | null; source_ref: FoodSourceRef | null;
};
type Foods = Public['Tables']['foods'];
// Keep jsonb opaque at the PostgREST boundary, as in generated database types.
type FoodDatabaseFields = Omit<FoodLibraryFields, 'source_ref'> & { source_ref: Json | null };
type SourcedFoods = Narrow<Foods, {
  Row: Foods['Row'] & FoodDatabaseFields;
  Insert: Foods['Insert'] & Partial<FoodDatabaseFields>;
  Update: Foods['Update'] & Partial<FoodDatabaseFields>;
}>;
type FormChecks = Public['Tables']['form_checks'];
type CheckIns = Public['Tables']['check_ins'];
type ActivatePlan = Public['Functions']['admin_activate_plan'];
// valid_profile_social (0046) restricts JSON keys and values to these optional links.
type Social = Partial<Record<'whatsapp' | 'instagram' | 'tiktok' | 'facebook' | 'youtube' | 'x', string>>;

// Text CHECK constraints are verified by supabase/tests/type-narrowing.test.ts.
type RowPatches = {
  forms: { kind: CustomFormKind };
  form_questions: { type: CustomFormQuestionType; maps_to: CustomFormFactKey | null };
  form_requests: { status: CustomFormStatus; blocks_access: boolean };
  profiles: { captain_status: CaptainStatus; units: Units; social: Social; languages: PublicProfileLanguage[] };
  supplements: { timing: SupplementTiming };
  notifications: { type: NotificationType };
  points_log: { kind: PointKind; status: PointStatus };
  exercise_swap_requests: { injury: Injury | null; reason: SwapReason; status: SwapStatus };
  exercise_generator_tags: {
    pattern: MovementPattern; kind: ExerciseKind; equipment: EquipmentKind;
    stress: Injury[]; min_level: ExperienceLevel;
  };
  readiness_decisions: { decision: ReadinessDecision };
  coach_join_requests: { status: JoinStatus };
  captain_packages: { kind: PackageKind };
};
type PatchFields<Row, Patch> = { [Key in keyof Row]: Key extends keyof Patch ? Patch[Key] : Row[Key] };
type CorrectedRows = {
  [Name in keyof RowPatches]: Narrow<Public['Tables'][Name], {
    Row: Narrow<Public['Tables'][Name]['Row'], RowPatches[Name]>;
    Insert: PatchFields<Public['Tables'][Name]['Insert'], RowPatches[Name]>;
    Update: PatchFields<Public['Tables'][Name]['Update'], RowPatches[Name]>;
  }>;
};
type ServerWritten = { Insert: never; Update: never };
type DailyChecks = Public['Tables']['daily_checks'];
type SupplementLogs = Public['Tables']['supplement_logs'];
// Preserve the existing write contract; RLS remains the actual security boundary.
type WritePatches = {
  form_requests: {
    Insert: Pick<Public['Tables']['form_requests']['Insert'], 'id' | 'form_id' | 'player_id' | 'captain_id' | 'sent_at' | 'due_at'>;
    Update: Pick<Public['Tables']['form_requests']['Update'], 'due_at' | 'reminded_at' | 'reviewed_at' | 'captain_reply'>;
  };
  form_answers: {
    Update: Pick<Public['Tables']['form_answers']['Update'], 'value' | 'photo_paths'>;
  };
  crown_winners: ServerWritten;
  points_log: ServerWritten;
  player_points: ServerWritten;
  exercise_generator_tags: ServerWritten;
  coach_join_requests: { Update: never };
  coach_waitlist: {
    Insert: Pick<Public['Tables']['coach_waitlist']['Insert'], 'id' | 'captain_id' | 'player_id'>;
    Update: never;
  };
  notifications: { Insert: never };
  daily_checks: {
    // The database fills player_id from auth.uid().
    Insert: Omit<DailyChecks['Row'], 'player_id'> & Partial<Pick<DailyChecks['Row'], 'player_id'>>;
    Update: Pick<DailyChecks['Update'], 'sleep_hours' | 'soreness' | 'water_ml' | 'client_updated_at' | 'deleted_at'>;
  };
  supplements: { Insert: CorrectedRows['supplements']['Row']; Update: Partial<CorrectedRows['supplements']['Row']> };
  supplement_logs: {
    // The database fills player_id from auth.uid().
    Insert: Omit<SupplementLogs['Row'], 'player_id'> & Partial<Pick<SupplementLogs['Row'], 'player_id'>>;
    Update: Partial<Omit<SupplementLogs['Row'], 'player_id'>>;
  };
};
type CorrectedWrites = {
  [Name in keyof WritePatches]: Narrow<
    Name extends keyof CorrectedRows ? CorrectedRows[Name] : Public['Tables'][Name], WritePatches[Name]
  >;
};
type CorrectedTables = Omit<CorrectedRows, keyof WritePatches> & CorrectedWrites;
type TimezoneProfiles = Narrow<CorrectedTables['profiles'], {
  Row: CorrectedTables['profiles']['Row'] & { timezone_auto: boolean; coach_gender: 'male' | 'female' | null };
  Insert: CorrectedTables['profiles']['Insert'] & { timezone_auto?: boolean; coach_gender?: 'male' | 'female' | null };
  Update: CorrectedTables['profiles']['Update'] & { timezone_auto?: boolean; coach_gender?: 'male' | 'female' | null };
}>;
type Functions = Public['Functions'];
type ProfileRow = Public['Tables']['profiles']['Row'];
type ProfileLinks = Pick<ProfileRow, 'bio' | 'location' | 'avatar_path'> & { social: Social };
type PainRow = { [K in keyof PainReportRow]: PainReportRow[K] };
type FunctionPatches = {
  // RPC return metadata omits column nullability and the JSON aggregate's shape.
  coach_public_page: Narrow<Functions['coach_public_page'], {
    Returns: Narrow<Functions['coach_public_page']['Returns'][number], {
      years_experience: number | null; languages: PublicProfileLanguage[]; coach_gender: 'male' | 'female' | null;
    }>[];
  }>;
  coach_public_stats: Narrow<Functions['coach_public_stats'], {
    Returns: { players: number; workouts_logged: number; adherence_pct: number; member_since: number } | null;
  }>;
  // Privacy projections intentionally hide ids for other players.
  crown_hall_of_fame: Narrow<Functions['crown_hall_of_fame'], {
    Returns: Narrow<Functions['crown_hall_of_fame']['Returns'][number], { player_id: string | null }>[];
  }>;
  team_leaderboard: Narrow<Functions['team_leaderboard'], {
    Returns: Narrow<Functions['team_leaderboard']['Returns'][number], { player_id: string | null; tier: RankTier }>[];
  }>;
  // SQL accepts explicit nulls for these optional references; generation cannot express them.
  activate_player: Narrow<Functions['activate_player'], {
    Args: Narrow<Functions['activate_player']['Args'], { p_package: string | null }>;
  }>;
  create_player_invite: Narrow<Functions['create_player_invite'], {
    Args: Narrow<Functions['create_player_invite']['Args'], { p_package: string | null; p_whatsapp: string | null }>;
  }>;
  request_exercise_swap: Narrow<Functions['request_exercise_swap'], {
    Args: Narrow<Functions['request_exercise_swap']['Args'], { p_injury?: string | null }>;
  }>;
  // These RPCs project CHECK-backed profile columns and validated social JSON.
  my_approval_route_profile: Narrow<Functions['my_approval_route_profile'], {
    Returns: Narrow<Functions['my_approval_route_profile']['Returns'][number], {
      captain_status: CaptainStatus; suspended_at: ProfileRow['suspended_at'];
    }>[];
  }>;
  my_route_profile: Narrow<Functions['my_route_profile'], {
    Returns: Narrow<Functions['my_route_profile']['Returns'][number], Pick<ProfileRow, 'suspended_at'>>[];
  }>;
  // SQL projections retain nullable contact/profile fields despite generated return metadata.
  admin_pending_captains: Narrow<Functions['admin_pending_captains'], {
    Returns: Narrow<Functions['admin_pending_captains']['Returns'][number], {
      email: string | null; whatsapp: string | null; instagram: string | null;
    }>[];
  }>;
  coach_public_profile: Narrow<Functions['coach_public_profile'], {
    Returns: Narrow<Functions['coach_public_profile']['Returns'][number], ProfileLinks>[];
  }>;
  my_captain_profile: Narrow<Functions['my_captain_profile'], {
    Returns: Narrow<Functions['my_captain_profile']['Returns'][number], ProfileLinks & Pick<ProfileRow, 'phone'>>[];
  }>;
  // my_points builds this JSON object in SQL; generation otherwise exposes only Json.
  my_points: Narrow<Functions['my_points'], {
    Returns: {
      lifetime: number; tier: string; monthly: number; month_position: number | null;
      crown_gap: number; adherence: number; done: number; planned: number;
      crown_needs_workouts: number; logs: Json[];
    };
  }>;
};

export type AppDatabase = Omit<Database, 'public'> & {
  public: Omit<Public, 'Tables' | 'Functions'> & {
    Tables: Omit<Public['Tables'], keyof CorrectedTables | 'form_checks' | 'check_ins' | 'foods'> & Omit<CorrectedTables, 'profiles'> & WomenModeTables & {
      foods: SourcedFoods;
      profiles: TimezoneProfiles;
      assessment_schedules: AssessmentSchedulesTable;
      pain_reports: {
        Row: PainRow & { player_id: string; status: 'open' | 'answered'; reply: PainReply | null; answered_at: string | null; swap_alternatives: string[] | null };
        Insert: PainRow & { player_id?: string }; Update: never; Relationships: [];
      };
      pain_load_hints: { Row: { [K in keyof PainLoadHint]: PainLoadHint[K] }; Insert: never; Update: never; Relationships: [] };
      form_checks: Omit<FormChecks, 'Insert'> & {
        // The inbox BEFORE INSERT trigger in 0008 overwrites captain_id.
        Insert: Omit<FormChecks['Insert'], 'captain_id'> & {
          captain_id?: FormChecks['Insert']['captain_id'];
        };
      };
      check_ins: Omit<CheckIns, 'Insert'> & {
        // The inbox BEFORE INSERT trigger in 0008 overwrites captain_id.
        Insert: Omit<CheckIns['Insert'], 'captain_id'> & {
          captain_id?: CheckIns['Insert']['captain_id'];
        };
      };
    };
    Functions: Omit<Public['Functions'], keyof FunctionPatches | 'admin_activate_plan'> & FunctionPatches & WomenModeFunctions & {
      sync_pain_reports: { Args: { p_rows: Json }; Returns: undefined };
      expire_pain_swaps: { Args: never; Returns: undefined };
      answer_pain: { Args: { p_report: string; p_reply: PainReply }; Returns: undefined };
      pain_repeat_count: { Args: { p_player: string; p_area: string }; Returns: number };
      my_captain_timezone: { Args: never; Returns: string | null };
      assessment_schedule_counts: { Args: never; Returns: { schedule_id: string; player_id: string; sends: number }[] };
      admin_activate_plan: Omit<ActivatePlan, 'Args'> & {
        // SQL accepts null here, but this argument has no default and must be sent.
        Args: Omit<ActivatePlan['Args'], 'p_payment_ref'> & { p_payment_ref: string | null };
      };
    };
  };
};
