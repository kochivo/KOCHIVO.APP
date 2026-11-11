import type { AppDatabase } from '@/types/app-database';
import type { ArabicStyle } from './locale';

type Public = AppDatabase['public'];
type Profiles = Public['Tables']['profiles'];
// Migration 0095 is additive; keep this boundary typed until database types are regenerated.
export type ArabicStyleDatabase = Omit<AppDatabase, 'public'> & {
  public: Omit<Public, 'Tables'> & {
    Tables: Omit<Public['Tables'], 'profiles'> & {
      profiles: Omit<Profiles, 'Row' | 'Insert' | 'Update'> & {
        Row: Profiles['Row'] & { arabic_style: ArabicStyle | null };
        Insert: Profiles['Insert'] & { arabic_style?: ArabicStyle | null };
        Update: Profiles['Update'] & { arabic_style?: ArabicStyle | null };
      };
    };
  };
};
