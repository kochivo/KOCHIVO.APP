import { expect, it } from 'vitest';
import { intakeSchema, normalizeInstagram, normalizeWhatsapp } from './schemas';

it.each([
  ['٠١٠ ١٢٣٤ ٥٦٧٨', '+201012345678'],
  ['+٤٤ (٧٧٠٠) ٩٠٠١٢٣', '+447700900123'],
  ['00201012345678', '+201012345678'],
  ['447700900123', '+447700900123'],
])('normalizes WhatsApp %s', (input, expected) => {
  expect(normalizeWhatsapp(input)).toBe(expected);
});
it.each(['coach.name', '@coach.name', 'https://www.instagram.com/coach.name/?hl=en'])('normalizes Instagram %s', input => {
  expect(normalizeInstagram(input)).toBe('coach.name');
});
it('rejects invalid contacts and incomplete answers', () => {
  const input = { full_name: 'Coach', whatsapp: '01012345678', instagram: '',
    current_tool: 'whatsapp_excel', main_challenge: 'time_on_tables', players_range: '1-10' };
  expect(intakeSchema.safeParse(input).success).toBe(true);
  for (const whatsapp of ['123', '0101234567', '+2001012345678', 'abc01012345678']) {
    expect(intakeSchema.safeParse({ ...input, whatsapp }).success).toBe(false);
  }
  expect(intakeSchema.safeParse({ ...input, instagram: 'https://evil.test/coach' }).success).toBe(false);
  expect(intakeSchema.safeParse({ ...input, current_tool: '' }).success).toBe(false);
  expect(intakeSchema.safeParse({ ...input, full_name: ' ' }).success).toBe(false);
  expect(intakeSchema.safeParse({ ...input, full_name: 'a'.repeat(81) }).success).toBe(false);
});
