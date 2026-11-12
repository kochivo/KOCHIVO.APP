import type { AppDatabase } from '@/types/app-database';

// Keep the generated database change limited to show_chart. This local write
// projection includes the server-only idempotency key introduced by 0101.
type Public = AppDatabase['public'];
type Form = Public['Tables']['forms'];
export type FormsWriteDatabase = Omit<AppDatabase, 'public'> & {
  public: Omit<Public, 'Tables'> & { Tables: Omit<Public['Tables'], 'forms'> & {
    forms: Omit<Form, 'Row' | 'Insert' | 'Update'> & {
      Row: Form['Row'] & { creation_key: string | null };
      Insert: Form['Insert'] & { creation_key?: string };
      Update: Form['Update'] & { creation_key?: string };
    };
  } };
};
