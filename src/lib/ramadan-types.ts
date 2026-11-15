import type { AppDatabase } from '@/types/app-database';
import type { Json } from '@/types/database';
export type RamadanTraining = 'before_iftar_1h' | 'after_iftar_2h' | 'after_taraweeh' | 'before_suhoor';
export type RamadanIntensity = 'same' | 'lighter_20' | 'maintenance';
export type RamadanStatus = { active: boolean; training: RamadanTraining; intensity: RamadanIntensity; water_ml: number };
export type RamadanPreferences = { ramadan_mode: boolean; ramadan_training: RamadanTraining;
  ramadan_intensity: RamadanIntensity; ramadan_water_ml: number };
type Profiles = AppDatabase['public']['Tables']['profiles'];
type Exempt = { captain_id: string; player_id: string; created_at?: string };
// Local extension until the generated schema includes migration 0122.
export type RamadanDatabase = Omit<AppDatabase, 'public'> & { public: Omit<AppDatabase['public'], 'Tables' | 'Functions'> & {
  Tables: Omit<AppDatabase['public']['Tables'], 'profiles'> & {
    profiles: Omit<Profiles, 'Row' | 'Update'> & { Row: Profiles['Row'] & RamadanPreferences & { prayer_city: string | null };
      Update: Profiles['Update'] & Partial<RamadanPreferences> & { prayer_city?: string | null } };
    ramadan_exempt: { Row: Exempt; Insert: Exempt; Update: Partial<Exempt>; Relationships: [] };
  };
  Functions: AppDatabase['public']['Functions'] & { my_ramadan: { Args: Record<string, never>; Returns: RamadanStatus[] };
    save_ramadan: { Args: { p_preferences: Json; p_exempt: string[] }; Returns: undefined } };
} };
