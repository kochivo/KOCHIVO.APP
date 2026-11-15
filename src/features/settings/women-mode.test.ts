import { expect, it } from 'vitest';
import { settingsSchemas } from './schema';
it('accepts optional coach gender and rejects unsupported values', () => {
  const schema = settingsSchemas().captainProfileSchema;
  const profile = { full_name: 'Coach', bio: '', location: '', timezone: 'Africa/Cairo', units: 'metric', social: {} };
  for (const coach_gender of [undefined, null, 'male', 'female']) {
    expect(schema.parse({ ...profile, coach_gender }).coach_gender).toBe(coach_gender);
  }
  expect(schema.safeParse({ ...profile, coach_gender: 'other' }).success).toBe(false);
});
