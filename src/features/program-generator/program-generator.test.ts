import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generatorBriefSchema } from './brief';
import { generateProgram, toProgramDraft } from './generate';
import { patterns, pick, seededRandom, type Candidate } from './pick';
import { prescription } from './prescription';
import { eligible } from './pick';
import { slotRecipes } from './splits';
import type { GeneratorBrief } from './brief';
import { loadCandidates } from './data/load-candidates';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase as Database } from '@/types/app-database';

const brief: GeneratorBrief = { goal: 'muscle', level: 'beginner', weekdays: [0, 2, 4],
  minutes: 60, equipment: 'gym', injuries: [], seed: 42 };
const candidates: Candidate[] = patterns.flatMap((pattern, p) => Array.from({ length: 9 }, (_, i) => ({
  exercise_id: `00000000-0000-7000-8000-${String(p * 9 + i).padStart(12, '0')}`,
  pattern, kind: p < 7 ? 'compound' : 'isolation', equipment: 'bodyweight', stress: [],
  min_level: 'beginner', usage: 0, library: null,
})));

describe('strict brief', () => {
  it('rejects duplicate weekdays, unknown keys and invalid values', () => {
    for (const patch of [{ weekdays: [0, 0] }, { weekdays: [7, 1] }, { minutes: 30 },
      { injuries: ['elbow'] }, { seed: -1 }, { seed: 1.5 }, { extra: true }, { playerId: 'bad' }]) {
      expect(generatorBriefSchema.safeParse({ ...brief, ...patch }).success).toBe(false);
    }
    expect(generatorBriefSchema.parse(brief)).toEqual(brief);
  });
});

it('allocates save identities only on acceptance and preserves parent links', () => {
  const result = generateProgram(brief, candidates);
  if (result.error) throw new Error(result.error.code);
  let counter = 0;
  const draft = toProgramDraft(result.data, 'program-id', 'Test', () => `id-${counter++}`);
  expect(draft.title).toBe('Test');
  expect(draft.id).toBe('program-id');
  expect(draft.days.every(d => d.program_id === draft.id && d.exercises.every(e => e.day_id === d.id))).toBe(true);
  const ids = [draft.id, ...draft.days.flatMap(d => [d.id, ...d.exercises.map(e => e.id)])];
  expect(new Set(ids).size).toBe(ids.length);
  expect(generateProgram(brief, candidates)).toEqual(result);
});

it('tries direct substitute patterns in order before indirect fallbacks, retaining per-day uniqueness', () => {
  const rows = candidates.filter(row => row.pattern !== 'squat').map(row => ({ ...row, usage: row.pattern === 'core' ? 100 : 0 }));
  const dayUsed = new Set(rows.filter(row => row.pattern === 'hinge').map(row => row.exercise_id));
  const choose = () => pick('squat', rows, dayUsed, new Set(), seededRandom(42));
  expect(choose()?.selected.pattern).toBe('legs_iso');
  for (const row of rows.filter(row => row.pattern === 'legs_iso')) dayUsed.add(row.exercise_id);
  expect(choose()?.selected.pattern).toBe('core');
  for (const row of rows.filter(row => row.pattern === 'core')) dayUsed.add(row.exercise_id);
  expect(choose()).toBeNull();
});

it('is deterministic, independent of catalog order, and varies by seed', () => {
  const result = generateProgram(brief, candidates);
  expect(generateProgram(brief, [...candidates].reverse())).toEqual(result);
  expect(generateProgram({ ...brief, seed: 43 }, candidates)).not.toEqual(result);
});

it('filters stress from selections and alternatives for every injury', () => {
  for (const injury of ['knee', 'shoulder', 'lower_back'] as const) {
    const rows = candidates.map((c, i) => ({ ...c, stress: i % 2 ? [injury] : [] }));
    const result = generateProgram({ ...brief, injuries: [injury] }, rows);
    expect(result.error).toBeUndefined();
    if (result.error) throw new Error(result.error.code);
    for (const day of result.data.days) for (const row of day.exercises) {
      for (const id of [row.exercise_id, ...row.alternatives])
        expect(rows.find(c => c.exercise_id === id)?.stress).not.toContain(injury);
      const affected: Record<typeof injury, readonly string[]> = { knee: ['squat', 'lunge', 'legs_iso'],
        shoulder: ['h_push', 'v_push', 'shoulder_iso', 'chest_iso'], lower_back: ['hinge', 'squat'] };
      const pattern = rows.find(c => c.exercise_id === row.exercise_id)?.pattern ?? '';
      expect(row.reasons.includes(`injury_safe_${injury}`)).toBe(affected[injury].includes(pattern));
      expect(row.reasons).not.toContain('seeded_choice');
    }
  }
});

it('returns a typed slot error without a partial draft', () => {
  const result = generateProgram(brief, []);
  expect(result).toMatchObject({ error: { code: 'unfilled_slot', pattern: 'squat', weekday: 0 } });
  expect(result).not.toHaveProperty('data');
  expect(generateProgram({ ...brief, weekdays: [0, 0] }, candidates)).toMatchObject({ error: { code: 'invalid_brief' } });
});

it('uses the exact fixed prescription table and level modifiers', () => {
  for (const [goal, sets, min, max, rest, rir] of [
    ['strength', 4, 3, 6, 150, 2], ['muscle', 3, 8, 12, 90, 1],
    ['fat_loss', 3, 10, 15, 60, 2], ['general', 3, 8, 12, 75, 3],
  ] as const) {
    expect(prescription(goal, 'intermediate', 'compound')).toEqual({ sets, reps_min: min, reps_max: max, rest_seconds: rest, rir });
    expect(prescription(goal, 'beginner', 'compound')).toMatchObject({ sets: sets - 1, rir: rir + 1 });
    expect(prescription(goal, 'advanced', 'compound')).toMatchObject({ sets: sets + 1, rir });
    expect(prescription(goal, 'advanced', 'isolation')).toMatchObject({ sets, rir });
  }
});

it('filters equipment and level before ranking favorites, and avoids reuse when possible', () => {
  const rows = candidates.map((c, i) => ({ ...c, usage: i % 9 === 0 ? 100 : 0 }));
  const result = generateProgram(brief, rows);
  if (result.error) throw new Error(result.error.code);
  expect(result.data.days[0]?.exercises[0]?.reasons).toContain('captain_favorite');
  const squats = result.data.days.flatMap(d => d.exercises).filter(e => rows.find(c => c.exercise_id === e.exercise_id)?.pattern === 'squat');
  expect(new Set(squats.map(e => e.exercise_id)).size).toBe(squats.length);
  for (const patch of [{ equipment: 'gym' as const }, { min_level: 'advanced' as const }]) {
    expect(generateProgram({ ...brief, equipment: 'bodyweight' }, rows.map(c => ({ ...c, ...patch }))))
      .toMatchObject({ error: { code: 'unfilled_slot' } });
  }
});

// The migration is the single curated list; this test prevents silent catalog-id drift.
const seedSql = readFileSync('supabase/migrations/0075_exercise_generator_tags.sql', 'utf8');
const seed = [...seedSql.matchAll(/\('([0-9]+)','([^']+)','([^']+)','([^']+)','([^']*)','([^']+)'\)/g)]
  .map((match): Candidate => ({ exercise_id: match[1] ?? '', pattern: match[2] as Candidate['pattern'],
    kind: match[3] as Candidate['kind'], equipment: match[4] as Candidate['equipment'],
    stress: (match[5] ? match[5].split(',') : []) as Candidate['stress'],
    min_level: match[6] as Candidate['min_level'], usage: 0, library: null }));

it('fills real-seed weeks for every split, goal, level, equipment, duration and requested injury set', () => {
  const injuryCases: GeneratorBrief['injuries'][] = [[], ['knee'], ['shoulder'], ['lower_back'], ['knee', 'lower_back']];
  const byId = new Map(seed.map(row => [row.exercise_id, row]));
  for (const count of [2, 3, 4, 5, 6]) for (const goal of ['fat_loss', 'muscle', 'strength', 'general'] as const)
    for (const level of ['beginner', 'intermediate', 'advanced'] as const)
      for (const equipment of ['bodyweight', 'dumbbells', 'gym'] as const)
        for (const minutes of [45, 60, 90] as const) for (const injuries of injuryCases) {
          const input = { ...brief, goal, level, equipment, minutes, injuries,
            weekdays: Array.from({ length: count }, (_, index) => index) };
          const result = generateProgram(input, seed);
          expect(result.error, JSON.stringify(input)).toBeUndefined();
          if (result.error) throw new Error(result.error.code);
          expect(result.data.days).toHaveLength(7);
          expect(result.data.days.filter(day => !day.is_rest_day)).toHaveLength(count);
          for (const day of result.data.days.filter(day => !day.is_rest_day)) {
            expect(day.exercises).toHaveLength(minutes === 45 ? 4 : minutes === 60 ? 6 : 8);
            expect(new Set(day.exercises.map(row => row.exercise_id)).size).toBe(day.exercises.length);
            const kinds = day.exercises.map(row => byId.get(row.exercise_id)?.kind);
            const firstIsolation = kinds.indexOf('isolation');
            if (firstIsolation >= 0) expect(kinds.slice(firstIsolation)).not.toContain('compound');
            for (const row of day.exercises) {
              expect(row).toMatchObject(prescription(goal, level, byId.get(row.exercise_id)?.kind ?? 'isolation'));
              expect(row.alternatives.length).toBeLessThanOrEqual(3);
              expect(row.alternatives).not.toContain(row.exercise_id);
              for (const id of [row.exercise_id, ...row.alternatives]) {
                const candidate = byId.get(id);
                expect(candidate).toBeDefined();
                expect(candidate?.stress.some(stress => injuries.includes(stress))).toBe(false);
                expect(candidate?.pattern).toBe(byId.get(row.exercise_id)?.pattern);
                expect(eligible(input, candidate ? [candidate] : [])).toHaveLength(1);
              }
            }
          }
        }
  // About 2,700 generated weeks; the shared 20 s budget is too tight under full-suite load.
}, 120_000);

it('explains real knee substitutions and keeps injured drafts deterministic across seeds', () => {
  for (const injuryList of [['knee'], ['shoulder'], ['lower_back'], ['knee', 'lower_back']] as const) {
    const input = { ...brief, goal: 'fat_loss', weekdays: [0, 1, 2, 3], injuries: [...injuryList], minutes: 90 };
    const result = generateProgram(input, seed);
    if (result.error) throw new Error(result.error.code);
    expect(generateProgram(input, [...seed].reverse())).toEqual(result);
    expect(generateProgram({ ...input, seed: 43 }, seed)).not.toEqual(result);
    const squatReplacement = result.data.days.flatMap(day => day.exercises).find(row => row.replacedPattern === 'squat');
    if (injuryList.some(injury => injury === 'knee')) expect(squatReplacement?.reasons).toContain('replaced_for_knee');
    for (const row of result.data.days.flatMap(day => day.exercises)) expect(row.reasons).not.toContain('seeded_choice');
  }
});

it('seeds about 120 real unique catalog ids and covers every recipe with at least three candidates', () => {
  const source: { dataset_id: string }[] = JSON.parse(readFileSync('supabase/seed/source/exercises-gif.json', 'utf8'));
  expect(seed.length).toBeGreaterThanOrEqual(120);
  expect(new Set(seed.map(c => c.exercise_id)).size).toBe(seed.length);
  expect(seed.every(c => source.some(row => row.dataset_id === c.exercise_id))).toBe(true);
  for (const count of [2, 3, 4, 5, 6]) for (const level of ['beginner', 'intermediate', 'advanced'] as const)
    for (const equipment of ['gym', 'dumbbells', 'bodyweight'] as const) {
      const input = { ...brief, level, equipment, minutes: 90 as const,
        weekdays: Array.from({ length: count }, (_, i) => i) };
      for (const pattern of new Set(slotRecipes(input).flat())) {
        expect(eligible({ ...input, level: 'advanced' }, seed).filter(c => c.pattern === pattern).length, `${equipment}/${pattern}`)
          .toBeGreaterThanOrEqual(3);
      }
      const result = generateProgram(input, seed);
      expect(result.error, `${equipment}/${level}/${count}`).toBeUndefined();
      if (result.error) throw new Error(result.error.code);
      for (const day of result.data.days) {
        const kinds = day.exercises.map(e => seed.find(c => c.exercise_id === e.exercise_id)?.kind);
        const firstIsolation = kinds.indexOf('isolation');
        if (firstIsolation >= 0) expect(kinds.slice(firstIsolation)).not.toContain('compound');
      }
    }
});

function loaderFixture(failure?: string) {
  const calls: unknown[][] = [];
  const client = { auth: { getClaims: async () => ({ data: { claims: { sub: 'captain' } }, error: failure === 'auth' }) },
    from: (table: string) => {
      const query = {
        select: (value: string) => { calls.push(['select', table, value]); return query; },
        is: (field: string, value: null) => { calls.push(['is', field, value]); return query; },
        eq: (field: string, value: string) => { calls.push(['eq', field, value]); return query; },
        order: () => query,
        range: async (start: number, end: number) => {
          calls.push(['range', table, start, end]);
          if (table === failure) return { data: null, error: { message: 'failed' } };
          const first = candidates[0];
          if (!first) throw new Error('fixture');
          const data = failure === 'empty' ? [] : table === 'exercise_generator_tags'
            ? Array.from({ length: failure === 'catalog_pages' ? start === 0 ? 500 : 1 : 1 },
              () => ({ ...first, exercises: null }))
            : Array.from({ length: start === 0 ? 500 : 1 }, () => ({ exercise_id: first.exercise_id }));
          return { data, error: null };
        },
      };
      return query;
    } };
  return { client: client as unknown as SupabaseClient<Database>, calls };
}

it('loads all usage pages restricted to the authenticated captain, including templates', async () => {
  const { client, calls } = loaderFixture();
  const result = await loadCandidates(client);
  expect(result.data?.[0]?.usage).toBe(501);
  expect(calls).toContainEqual(['eq', 'program_days.programs.captain_id', 'captain']);
  expect(calls).toContainEqual(['is', 'exercises.owner_id', null]);
  expect(calls).toContainEqual(['range', 'program_exercises', 500, 999]);
  const pages = loaderFixture('catalog_pages');
  expect((await loadCandidates(pages.client)).data).toHaveLength(501);
  expect(pages.calls).toContainEqual(['range', 'exercise_generator_tags', 500, 999]);
});

it('returns atomic typed loader failures and supports an empty catalog', async () => {
  for (const [failure, code] of [['auth', 'unauthenticated'], ['exercise_generator_tags', 'catalog_load_failed'],
    ['program_exercises', 'usage_load_failed']] as const) {
    expect(await loadCandidates(loaderFixture(failure).client)).toEqual({ error: code });
  }
  expect(await loadCandidates(loaderFixture('empty').client)).toEqual({ data: [] });
});
