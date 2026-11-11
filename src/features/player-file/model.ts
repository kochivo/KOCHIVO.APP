import type { Tables } from '@/types/database';

export interface FactValues {
  weight: number;
  targetWeight: number | null;
  height: number;
  age: number;
  sex: string;
  experience: string;
  trainingDays: number[];
  sessionMinutes: number;
  injuries: string[];
  medical: string[];
  allergies: string[];
  waist: number;
  note: string | null;
}
export type FactKey = keyof FactValues;
export type FormSource = { kind: 'intake' | 'checkin' | (string & Record<never, never>); id: string; at: string };
export type PlayerFact<K extends FactKey = FactKey> = {
  key: K;
  value: FactValues[K];
  source: FormSource;
  previous?: { value: FactValues[K]; source: FormSource };
  isNew: boolean;
};
export type PlayerFacts = { [K in FactKey]?: PlayerFact<K> };
export interface Snapshot { source: FormSource; facts: Partial<FactValues> }
export interface FormHistoryEntry { source: FormSource; changed: FactKey[]; first: boolean }
export interface PlayerFile { facts: PlayerFacts; history: FormHistoryEntry[] }
export type IntakeRow = Omit<Tables<'player_intake'>, 'updated_at'> & { updated_at: string | null };
export type CheckinRow = Pick<Tables<'check_ins'>, 'id' | 'created_at' | 'body_weight_kg' | 'waist_cm' | 'notes'>;

// Birth year is the available precision; no birthday is collected.
export function age(birthYear: number, today: string): number {
  return Number(today.slice(0, 4)) - birthYear;
}

export function intakeSnapshot(row: IntakeRow, today: string): Snapshot {
  return {
    source: { kind: 'intake', id: row.player_id, at: row.updated_at ?? row.completed_at ?? row.created_at },
    facts: {
      weight: row.weight_kg, targetWeight: row.target_weight_kg, height: row.height_cm,
      age: age(row.birth_year, today), sex: row.sex, experience: row.experience,
      // Intake stores Sunday = 0; planning stores Saturday = 0.
      trainingDays: [...new Set(row.training_days.map(day => (day + 1) % 7))].sort((a, b) => a - b),
      sessionMinutes: row.session_minutes, injuries: [...row.injuries], medical: [...row.medical],
      allergies: [...row.allergies], note: row.notes,
    },
  };
}

export function checkinSnapshot(row: CheckinRow): Snapshot {
  return {
    source: { kind: 'checkin', id: row.id, at: row.created_at },
    // Blank check-in fields are unanswered, so they cannot erase an earlier answer.
    facts: {
      ...(row.body_weight_kg === null ? {} : { weight: row.body_weight_kg }),
      ...(row.waist_cm === null ? {} : { waist: row.waist_cm }),
      ...(row.notes === null ? {} : { note: row.notes }),
    },
  };
}

export function fitFacts(facts: PlayerFacts) {
  return {
    trainingDays: facts.trainingDays?.value ?? [],
    sessionMinutes: facts.sessionMinutes?.value ?? null,
    injuries: (facts.injuries?.value ?? []).filter(key => key !== 'none'),
  };
}
