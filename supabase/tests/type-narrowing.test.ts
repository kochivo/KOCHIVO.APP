import { afterAll, beforeAll, describe, expect, expectTypeOf, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import * as enums from '../../src/types/enums';
import type { AppDatabase } from '../../src/types/app-database';
import type { Tables } from '../../src/types/database';
import type { MealLogRow, SetLogRow, WorkoutSessionRow } from '../../src/core/offline/tables';
import { createTestDb } from './harness';

const columns = [
  ['profiles', 'captain_status', 'captainStatuses'],
  ['profiles', 'units', 'units'],
  ['supplements', 'timing', 'supplementTimings'],
  ['notifications', 'type', 'notificationTypes'],
  ['points_log', 'kind', 'pointKinds'],
  ['points_log', 'status', 'pointStatuses'],
  ['exercise_swap_requests', 'injury', 'injuries'],
  ['exercise_swap_requests', 'reason', 'swapReasons'],
  ['exercise_swap_requests', 'status', 'swapStatuses'],
  ['exercise_generator_tags', 'pattern', 'movementPatterns'],
  ['exercise_generator_tags', 'kind', 'exerciseKinds'],
  ['exercise_generator_tags', 'equipment', 'equipmentKinds'],
  ['exercise_generator_tags', 'stress', 'injuries'],
  ['exercise_generator_tags', 'min_level', 'experienceLevels'],
  ['readiness_decisions', 'decision', 'readinessDecisions'],
  ['coach_join_requests', 'status', 'joinStatuses'],
  ['captain_packages', 'kind', 'packageKinds'],
] as const;

describe('application unions match migrated CHECK constraints', () => {
  let db: PGlite;
  beforeAll(async () => { db = await createTestDb(); }, 120_000);
  afterAll(async () => { await db?.close(); });

  it('preserves write restrictions and explicit local/server differences', () => {
    type AppTables = AppDatabase['public']['Tables'];
    expectTypeOf<AppTables['notifications']['Row']['type']>().toEqualTypeOf<enums.NotificationType>();
    expectTypeOf<AppTables['supplements']['Row']['timing']>().toEqualTypeOf<enums.SupplementTiming>();
    expectTypeOf<AppTables['points_log']['Insert']>().toEqualTypeOf<never>();
    expectTypeOf<AppTables['notifications']['Insert']>().toEqualTypeOf<never>();
    expectTypeOf<AppTables['coach_join_requests']['Update']>().toEqualTypeOf<never>();
    expectTypeOf<AppTables['daily_checks']['Insert']['player_id']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<Tables<'set_logs'>['program_exercise_id']>().toEqualTypeOf<string | null>();
    expectTypeOf<SetLogRow['program_exercise_id']>().toEqualTypeOf<string>();
    expectTypeOf<WorkoutSessionRow['session_rpe']>().toEqualTypeOf<number | null | undefined>();
    expectTypeOf<MealLogRow['swaps']>().toEqualTypeOf<Record<string, string>>();
  });

  it.each(columns)('%s.%s matches %s', async (table, column, enumName) => {
    const { rows } = await db.query<{ definition: string }>(`
      select pg_get_constraintdef(c.oid) as definition
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      join pg_attribute a on a.attrelid = t.oid and a.attnum = any(c.conkey)
      where c.contype = 'c' and n.nspname = 'public'
        and t.relname = $1 and a.attname = $2
    `, [table, column]);
    // Other checks on the same column may restrict nullability or pair it with another column.
    const checks = rows.filter(({ definition }) => /ARRAY\[/.test(definition));
    expect(checks).toHaveLength(1);
    const values = [...(checks[0]?.definition ?? '').matchAll(/'((?:[^']|'')*)'::text/g)]
      .map(match => match[1]?.replaceAll("''", "'"));
    expect([...new Set(values)].sort()).toEqual([...enums[enumName]].sort());
  });
});
