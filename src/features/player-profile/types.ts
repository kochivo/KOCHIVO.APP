export interface ProfileIntake {
  birthYear: number;
  sex: 'male' | 'female';
  heightCm: number;
  weightKg: number;
  targetWeightKg: number | null;
  trainingDays: number[];
  sessionMinutes: number;
  experience: string;
  injuries: string[];
  allergies: string[];
  medical: string[];
  notes: string | null;
  completedAt: string | null;
}

export interface ProfileCheckIn {
  id: string;
  weekStart: string;
  weightKg: number | null;
  waistCm: number | null;
  bodyFatPct?: number | null;
  photoPoses?: string[];
  photoError?: boolean;
  notes: string | null;
  reviewedAt: string | null;
  reply: string | null;
  /** Private URLs signed for ten minutes. */
  photos: string[];
}

export interface PlayerProfile {
  name: string;
  intake: ProfileIntake | null;
  checkIns: ProfileCheckIn[];
  program: { title: string; updatedAt: string; days: number; exercises: number } | null;
  nutrition: { title: string; updatedAt: string; meals: number; kcal: number | null; protein: number | null;
    carbs: number | null; fat: number | null } | null;
}

/** `data: null` means the player does not exist or is not this captain's. */
export type ProfileResult = { data: PlayerProfile | null; error?: never } | { error: true; data?: never };
