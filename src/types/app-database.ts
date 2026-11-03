import type { Database } from './database';

type Public = Database['public'];
type FormChecks = Public['Tables']['form_checks'];
type CheckIns = Public['Tables']['check_ins'];
type ActivatePlan = Public['Functions']['admin_activate_plan'];

export type AppDatabase = Omit<Database, 'public'> & {
  public: Omit<Public, 'Tables' | 'Functions'> & {
    Tables: Omit<Public['Tables'], 'form_checks' | 'check_ins'> & {
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
    Functions: Omit<Public['Functions'], 'admin_activate_plan'> & {
      admin_activate_plan: Omit<ActivatePlan, 'Args'> & {
        // SQL accepts null here, but this argument has no default and must be sent.
        Args: Omit<ActivatePlan['Args'], 'p_payment_ref'> & { p_payment_ref: string | null };
      };
    };
  };
};
