import type { AppDatabase } from '@/types/app-database';

type Public = AppDatabase['public'];
type CheckIns = Public['Tables']['check_ins'];
type Measurements = { body_fat_pct: number | null; photo_poses: string[] };

// Keep the migration's additions local until the shared generated types are refreshed.
export type ProgressDatabase = Omit<AppDatabase, 'public'> & {
  public: Omit<Public, 'Tables'> & {
    Tables: Omit<Public['Tables'], 'check_ins'> & {
      check_ins: Omit<CheckIns, 'Row' | 'Insert' | 'Update'> & {
        Row: CheckIns['Row'] & Measurements;
        Insert: CheckIns['Insert'] & Partial<Measurements>;
        Update: CheckIns['Update'] & Partial<Measurements>;
      };
    };
  };
};
