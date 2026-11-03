import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { allergyOptions, injuryOptions, makeIntakeSchema, medicalOptions, toggleChip } from './data/intake-schema';
import { canAdvance, progress, stepOrder, toPayload } from './wizard';
import type { Intake } from './data/intake-schema';
import { saveIntakeAt } from './data/save-intake-internal';

const saveIntake = (input: unknown) => saveIntakeAt(input, new Date('2026-06-01T12:00:00Z'));
import { hasIntake } from './data/intake-status';
import { fetchOnboardingStatus } from './data/onboarding-status';
import { readIntakeDraft } from './hooks/use-intake-draft';

const server = vi.hoisted(() => ({ claims: vi.fn(), upsert: vi.fn(), row: vi.fn(), eq: vi.fn(), from: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/supabase/server', () => ({ supabaseServer: async () => ({
  auth: { getClaims: server.claims }, from: server.from,
}) }));

const { intakeSchema, stepSchemas } = makeIntakeSchema(new Date('2026-06-01T12:00:00Z'));
const samples = {
  basics: { birth_year: 1995, sex: 'male', height_cm: 175.5, weight_kg: 80, target_weight_kg: null },
  schedule: { training_days: [0, 2, 4], session_minutes: 60, experience: 'new' },
  health: { injuries: ['knee'], medical: ['none'] },
  food: { allergies: ['lactose'], notes: 'وجع بسيط في الركبة' },
} satisfies Record<string, Partial<Intake>>;

describe('wizard navigation and payload', () => {
  const now = new Date('2026-06-01T12:00:00Z');
  const draft = { ...samples.basics, ...samples.schedule, ...samples.health, ...samples.food };
  it('orders the steps and reports their percentage', () => {
    expect(stepOrder).toEqual(['basics', 'schedule', 'health', 'food']);
    expect(stepOrder.map(progress)).toEqual([25, 50, 75, 100]);
  });
  for (const step of ['basics', 'schedule', 'health', 'food'] as const) {
    it(`allows a valid ${step} independently of other steps`, () => {
      expect(canAdvance(step, samples[step], now)).toBe(true);
    });
  }
  it('rejects an invalid answer on each step', () => {
    expect(canAdvance('basics', { ...draft, sex: undefined }, now)).toBe(false);
    expect(canAdvance('schedule', { ...draft, training_days: [] }, now)).toBe(false);
    expect(canAdvance('health', { ...draft, medical: ['none', 'heart'] }, now)).toBe(false);
    expect(canAdvance('food', { ...draft, notes: 'أ'.repeat(501) }, now)).toBe(false);
    expect(canAdvance('basics', { ...draft, birth_year: 2017 }, now)).toBe(false);
    expect(canAdvance('basics', { ...draft, birth_year: 2017 }, new Date('2027-06-01'))).toBe(true);
  });
  it('keeps optional targets null and trims notes without mutating answers', () => {
    expect(toPayload({ ...draft, notes: '   ' })).toMatchObject({ target_weight_kg: null, notes: null });
    expect(toPayload(draft).notes).toBe(samples.food.notes);
    expect(toPayload({ ...draft, notes: '  كلام  ' }).notes).toBe('كلام');
    expect(toPayload(draft).medical).toEqual(['none']);
    expect(toPayload({ ...draft, injuries: ['none', 'knee'] }).injuries).toEqual(['knee']);
    expect(toPayload({ ...draft, allergies: ['none', 'eggs'] }).allergies).toEqual(['eggs']);
    expect(draft.medical).toEqual(['none']);
  });
});

describe('intake server boundary', () => {
  const draft = { ...samples.basics, ...samples.schedule, ...samples.health, ...samples.food };
  beforeEach(() => {
    vi.resetAllMocks();
    server.claims.mockResolvedValue({ data: { claims: { sub: 'verified-player' } }, error: null });
    server.upsert.mockResolvedValue({ error: null });
    server.row.mockResolvedValue({ data: null, error: null });
    server.eq.mockReturnValue({ maybeSingle: server.row });
    server.from.mockReturnValue({ upsert: server.upsert, select: () => ({ eq: server.eq }) });
  });
  it('validates before writing and uses only the verified caller identity', async () => {
    expect(await saveIntake({ ...draft, weight_kg: 301 })).toHaveProperty('error');
    expect(server.from).not.toHaveBeenCalled();
    expect(await saveIntake({ ...draft, player_id: 'forged-player' })).toEqual({});
    expect(server.from).toHaveBeenCalledWith('player_intake');
    expect(server.upsert).toHaveBeenCalledWith({ ...draft, player_id: 'verified-player',
      completed_at: '2026-06-01T12:00:00.000Z' }, { onConflict: 'player_id' });
  });
  it('refuses anonymous writes and reports database and transport failures', async () => {
    server.claims.mockResolvedValueOnce({ data: null, error: null });
    expect(await saveIntake(draft)).toEqual({ error: 'ادخل حسابك الأول' });
    expect(server.upsert).not.toHaveBeenCalled();
    server.upsert.mockResolvedValueOnce({ error: { message: 'private detail' } });
    expect(await saveIntake(draft)).toEqual({ error: 'مش قادرين نبعت إجاباتك. جرّب تاني' });
    server.upsert.mockRejectedValueOnce(new Error('network'));
    expect(await saveIntake(draft)).toHaveProperty('error');
  });
  it('checks the caller row and distinguishes missing intake from query failures', async () => {
    expect(await hasIntake()).toBe(false);
    expect(server.eq).toHaveBeenCalledWith('player_id', 'verified-player');
    server.row.mockResolvedValueOnce({ data: { player_id: 'verified-player' }, error: null });
    expect(await hasIntake()).toBe(true);
    server.row.mockResolvedValueOnce({ data: null, error: { message: 'database' } });
    await expect(hasIntake()).rejects.toThrow('مش قادرين نحمّل بياناتك');
    server.claims.mockResolvedValueOnce({ data: null, error: null });
    await expect(hasIntake()).rejects.toThrow('ادخل حسابك الأول');
  });
  it('maps intake completion and lookup failures for the route', async () => {
    expect(await fetchOnboardingStatus()).toEqual({ submitted: false });
    server.row.mockResolvedValueOnce({ data: { player_id: 'verified-player' }, error: null });
    expect(await fetchOnboardingStatus()).toMatchObject({ submitted: true });
    server.row.mockRejectedValueOnce(new Error('offline'));
    expect(await fetchOnboardingStatus()).toEqual({ submitted: false,
      statusError: 'مش قادرين نحمّل بياناتك. جرّب تاني' });
  });
});

describe('local draft restoration', () => {
  const now = new Date('2026-06-01T12:00:00Z');
  afterEach(() => { vi.unstubAllGlobals(); });
  it('keeps answers including measurements awaiting correction across reloads', () => {
    const getItem = vi.fn(() => JSON.stringify({ ...samples.basics, weight_kg: 301, notes: 'لسه بكمل',
      training_days: [], injuries: [], medical: [], allergies: [] }));
    const removeItem = vi.fn();
    vi.stubGlobal('window', { localStorage: { removeItem }, sessionStorage: { getItem } });
    expect(readIntakeDraft(now)).toMatchObject({ ...samples.basics, weight_kg: 301, notes: 'لسه بكمل' });
    expect(getItem).toHaveBeenCalledWith('kochivo:intake-draft');
    expect(removeItem).toHaveBeenCalledWith('kochivo:intake-draft');
  });
  it('restores the session even when legacy local storage is denied', () => {
    vi.stubGlobal('window', { get localStorage() { throw new Error('denied'); },
      sessionStorage: { getItem: () => JSON.stringify({ injuries: ['knee'] }) } });
    expect(readIntakeDraft(now).injuries).toEqual(['knee']);
  });
  it('uses sane defaults when storage is corrupt, denied, or missing on the server', () => {
    for (const raw of ['{', 'null', '[]', '{"sex":"invalid"}']) {
      vi.stubGlobal('window', { sessionStorage: { getItem: () => raw } });
      expect(readIntakeDraft(now)).toMatchObject({ birth_year: 1998, height_cm: 170, weight_kg: 75 });
    }
    vi.stubGlobal('window', { get sessionStorage() { throw new Error('denied'); } });
    expect(readIntakeDraft(now).target_weight_kg).toBeNull();
    vi.stubGlobal('window', undefined);
    expect(readIntakeDraft(now).training_days).toEqual([]);
  });
});

describe('chip selections', () => {
  it('selecting none clears the other chips without mutating the input', () => {
    const selected = ['knee', 'shoulder'];
    expect(toggleChip(selected, 'none')).toEqual(['none']);
    expect(selected).toEqual(['knee', 'shoulder']);
  });

  it('selecting another chip removes none and toggles existing chips off', () => {
    expect(toggleChip(['none'], 'knee')).toEqual(['knee']);
    expect(toggleChip(['knee'], 'shoulder')).toEqual(['knee', 'shoulder']);
    expect(toggleChip(['knee', 'shoulder'], 'knee')).toEqual(['shoulder']);
    expect(toggleChip(['none'], 'none')).toEqual([]);
    expect(toggleChip([], 'knee')).toEqual(['knee']);
  });

  it('exports the agreed chip keys and labels', () => {
    expect(injuryOptions.map(({ key }) => key)).toEqual([
      'none', 'knee', 'lower_back', 'shoulder', 'neck', 'wrist', 'ankle', 'hip', 'other',
    ]);
    expect(allergyOptions.map(({ key }) => key)).toEqual(['none', 'lactose', 'gluten', 'nuts', 'eggs', 'seafood', 'other']);
    expect(medicalOptions.map(({ key }) => key)).toEqual([
      'none', 'heart', 'blood_pressure', 'diabetes', 'asthma', 'recent_surgery', 'pregnancy', 'other',
    ]);
    for (const options of [injuryOptions, allergyOptions, medicalOptions]) {
      expect(options[0]).toEqual({ key: 'none', label: 'مفيش' });
      expect(options.every(({ label }) => /[\u0600-\u06ff]/u.test(label))).toBe(true);
    }
  });
});

describe('wizard steps', () => {
  for (const step of ['basics', 'schedule', 'health', 'food'] as const) {
    it(`${step} accepts its valid sample`, () => {
      expect(stepSchemas[step].safeParse(samples[step]).success).toBe(true);
    });
  }

  const invalid = {
    basics: {
      birth_year: [1929, 2017, 1995.5, null], sex: ['other', null],
      height_cm: [99.9, 250.1, null], weight_kg: [24.9, 300.1, null], target_weight_kg: [24.9, 300.1],
    },
    schedule: {
      training_days: [[], [0, 0], [7], [-1], [1.5], [null], [0, 1, 2, 3, 4, 5, 6, 0]],
      session_minutes: [15, 30.5, null], experience: ['expert', null],
    },
    health: { injuries: [['none', 'knee'], ['unknown'], null], medical: [['none', 'heart'], ['unknown'], null] },
    food: { allergies: [['none', 'eggs'], ['unknown'], null], notes: ['أ'.repeat(501), 42] },
  };
  for (const step of ['basics', 'schedule', 'health', 'food'] as const) {
    for (const [field, values] of Object.entries(invalid[step])) {
      for (const value of values) {
        it(`${step} rejects ${field} = ${JSON.stringify(value)}`, () => {
          const result = stepSchemas[step].safeParse({ ...samples[step], [field]: value });
          expect(result.success).toBe(false);
          if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
        });
      }
    }
  }

  it('accepts inclusive bounds and all valid schedule options', () => {
    for (const birth_year of [1930, 2016]) {
      expect(stepSchemas.basics.safeParse({
        birth_year, sex: 'female', height_cm: 100, weight_kg: 25, target_weight_kg: 300,
      }).success).toBe(true);
    }
    expect(stepSchemas.basics.safeParse({
      ...samples.basics, height_cm: 250, weight_kg: 300, target_weight_kg: 25,
    }).success).toBe(true);
    for (const session_minutes of [30, 45, 60, 90]) {
      for (const experience of ['new', 'under_1y', '1_3y', 'over_3y']) {
        expect(stepSchemas.schedule.safeParse({ training_days: [0, 1, 2, 3, 4, 5, 6], session_minutes, experience }).success)
          .toBe(true);
      }
    }
  });

  it('accepts every health option individually, empty arrays, and nullable notes', () => {
    for (const { key } of injuryOptions) expect(stepSchemas.health.safeParse({ injuries: [key], medical: [] }).success).toBe(true);
    for (const { key } of medicalOptions) expect(stepSchemas.health.safeParse({ injuries: [], medical: [key] }).success).toBe(true);
    for (const { key } of allergyOptions) expect(stepSchemas.food.safeParse({ allergies: [key], notes: null }).success).toBe(true);
    expect(stepSchemas.food.safeParse({ allergies: [], notes: 'أ'.repeat(500) }).success).toBe(true);
  });

  it('combines every step and supplies the database chip defaults', () => {
    const full = { ...samples.basics, ...samples.schedule, ...samples.health, ...samples.food };
    expect(intakeSchema.safeParse(full).success).toBe(true);
    expect(intakeSchema.safeParse({ ...full, weight_kg: 301 }).success).toBe(false);
    expect(intakeSchema.parse({ ...samples.basics, ...samples.schedule, notes: null })).toMatchObject({
      injuries: [], medical: [], allergies: [],
    });
  });

  it('moves the birth year ceiling with the injected year while keeping the floor', () => {
    const next = makeIntakeSchema(new Date('2027-06-01T12:00:00Z')).stepSchemas.basics;
    expect(stepSchemas.basics.safeParse({ ...samples.basics, birth_year: 2017 }).success).toBe(false);
    expect(next.safeParse({ ...samples.basics, birth_year: 2017 }).success).toBe(true);
    expect(next.safeParse({ ...samples.basics, birth_year: 2018 }).success).toBe(false);
    expect(next.safeParse({ ...samples.basics, birth_year: 1930 }).success).toBe(true);
    expect(next.safeParse({ ...samples.basics, birth_year: 1929 }).success).toBe(false);
  });
});
