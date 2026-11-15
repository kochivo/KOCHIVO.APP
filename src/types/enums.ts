// CHECK-backed values are verified against migrated pg_constraint definitions.
export const customFormKinds = ['checkin', 'onboarding', 'progress', 'injury', 'update', 'custom'] as const;
export type CustomFormKind = typeof customFormKinds[number];
export const customFormQuestionTypes = ['number', 'scale', 'choice', 'multi', 'text', 'photos', 'yesno'] as const;
export type CustomFormQuestionType = typeof customFormQuestionTypes[number];
export type CustomFormStatus = 'pending' | 'answered' | 'reviewed';
export type CustomFormFactKey = 'weight' | 'targetWeight' | 'height' | 'age' | 'sex' | 'experience'
  | 'trainingDays' | 'sessionMinutes' | 'injuries' | 'medical' | 'allergies' | 'waist' | 'note';
export const captainStatuses = ['pending', 'approved', 'rejected'] as const;
export type CaptainStatus = typeof captainStatuses[number];
export const units = ['metric', 'imperial'] as const;
export type Units = typeof units[number];
export const publicProfileLanguages = ['ar', 'en'] as const;
export type PublicProfileLanguage = typeof publicProfileLanguages[number];
export const supplementTimings = ['morning', 'pre_workout', 'post_workout', 'with_meal', 'before_bed', 'any'] as const;
export type SupplementTiming = typeof supplementTimings[number];
export const notificationTypes = [
  'plan_assigned', 'nutrition_updated', 'player_joined', 'player_inactive', 'join_requested',
  'workout_reminder', 'workout_feedback', 'sessions_used_up', 'captain_approved',
  'subscription_expiring', 'subscription_expired', 'rank_up', 'crown_taken', 'crown_lost',
  'crown_close', 'crown_defend', 'form_requested', 'renewal_requested', 'chat_message', 'player_rank_up', 'player_pain', 'pain_answered',
] as const;
export type NotificationType = typeof notificationTypes[number];
export const pointKinds = ['workout', 'pr', 'perfect_week', 'inbody', 'meal_check'] as const;
export type PointKind = typeof pointKinds[number];
export const pointStatuses = ['counted', 'pending', 'rejected'] as const;
export type PointStatus = typeof pointStatuses[number];
export const injuries = ['knee', 'shoulder', 'lower_back'] as const;
export type Injury = typeof injuries[number];
export const swapReasons = ['injury', 'busy', 'discomfort'] as const;
export type SwapReason = typeof swapReasons[number];
export const swapStatuses = ['pending', 'approved', 'declined'] as const;
export type SwapStatus = typeof swapStatuses[number];
export const movementPatterns = [
  'squat', 'hinge', 'lunge', 'h_push', 'v_push', 'h_pull', 'v_pull', 'chest_iso',
  'shoulder_iso', 'biceps', 'triceps', 'legs_iso', 'calves', 'core',
] as const;
export type MovementPattern = typeof movementPatterns[number];
export const exerciseKinds = ['compound', 'isolation'] as const;
export type ExerciseKind = typeof exerciseKinds[number];
export const equipmentKinds = ['gym', 'dumbbells', 'bodyweight'] as const;
export type EquipmentKind = typeof equipmentKinds[number];
export const experienceLevels = ['beginner', 'intermediate', 'advanced'] as const;
export type ExperienceLevel = typeof experienceLevels[number];
export const readinessDecisions = ['keep', 'reduce', 'rest'] as const;
export type ReadinessDecision = typeof readinessDecisions[number];
export const joinStatuses = ['pending', 'accepted', 'declined'] as const;
export type JoinStatus = typeof joinStatuses[number];
export const packageKinds = ['days', 'sessions'] as const;
export type PackageKind = typeof packageKinds[number];

// Computed by rank RPCs rather than a table CHECK constraint.
export const rankTiers = ['beginner', 'champion', 'elite', 'legend'] as const;
export type RankTier = typeof rankTiers[number];
