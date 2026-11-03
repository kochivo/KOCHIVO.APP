import { expect, it } from 'vitest';
import { settingsSchemas } from './schema';

const valid = { full_name: 'Ali', timezone: 'Africa/Cairo', units: 'metric', bio: '', location: '', social: {} };
it('normalizes Egyptian and international WhatsApp numbers', () => {
  const schema = settingsSchemas().captainProfileSchema;
  for (const whatsapp of ['01012345678', '+201012345678', 'https://wa.me/201012345678']) {
    expect(schema.parse({ ...valid, social: { whatsapp } }).social.whatsapp).toBe('https://wa.me/201012345678');
  }
});
it('rejects wrong domains, unsafe URLs, unknown keys and invalid profile fields', () => {
  const schema = settingsSchemas().captainProfileSchema;
  for (const social of [{ instagram: 'https://instagram.com.evil.com/a' }, { x: 'http://x.com/a' },
    { youtube: 'https://evil.com' }, { other: 'https://x.com' }, { whatsapp: '123' }, { facebook: 'x'.repeat(201) }]) {
    expect(schema.safeParse({ ...valid, social }).success).toBe(false);
  }
  for (const fields of [{ timezone: 'bad' }, { bio: 'a'.repeat(281) }, { location: 'a'.repeat(81) }, { units: 'bad' }]) {
    expect(schema.safeParse({ ...valid, ...fields }).success).toBe(false);
  }
  expect(schema.safeParse({ ...valid, social: { x: 'https://twitter.com/ali', youtube: 'https://youtu.be/video' } }).success).toBe(true);
});
