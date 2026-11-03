import { describe, expect, it } from 'vitest';
import { allergyOptions, injuryOptions, makeIntakeSchema, medicalOptions, toggleChip } from './index';

const { intakeSchema, stepSchemas } = makeIntakeSchema(new Date('2026-06-01T12:00:00Z'));
const samples = {
  basics: { birth_year: 1995, sex: 'male', height_cm: 175.5, weight_kg: 80, target_weight_kg: null },
  schedule: { training_days: [0, 2, 4], session_minutes: 60, experience: 'new' },
  health: { injuries: ['knee'], medical: ['none'] },
  food: { allergies: ['lactose'], notes: 'وجع بسيط في الركبة' },
};

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
