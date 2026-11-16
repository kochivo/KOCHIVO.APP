import type { AppDatabase } from '@/types/app-database';
import type { ArabicStyle, Locale } from './locale';

type Public = AppDatabase['public'];
type Profiles = Public['Tables']['profiles'];
// Keep migrations 0095 and 0142 typed at this boundary until database types are regenerated.
export type ArabicStyleDatabase = Omit<AppDatabase, 'public'> & {
  public: Omit<Public, 'Tables'> & {
    Tables: Omit<Public['Tables'], 'profiles'> & {
      profiles: Omit<Profiles, 'Row' | 'Insert' | 'Update'> & {
        Row: Profiles['Row'] & { arabic_style: ArabicStyle | null; locale: Locale | null };
        Insert: Profiles['Insert'] & { arabic_style?: ArabicStyle | null; locale?: Locale | null };
        Update: Profiles['Update'] & { arabic_style?: ArabicStyle | null; locale?: Locale | null };
      };
    };
  };
};
