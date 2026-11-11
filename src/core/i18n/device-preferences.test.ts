import { expect, it } from 'vitest';
import { devicePreference, devicePreferenceCookies } from './device-preferences';

it('encodes device hints without overwriting a manual style cookie', () => {
  const cookies = devicePreferenceCookies('Africa/Cairo', 'ar-EG');
  expect(cookies).toHaveLength(2);
  expect(cookies[0]).toMatch(/^kochivo.timezone=Africa%2FCairo; Path=\/; Max-Age=31536000; SameSite=Lax/);
  expect(cookies[1]).toMatch(/^kochivo.language=ar-EG;/);
  expect(devicePreference('Africa%2FCairo')).toBe('Africa/Cairo');
  expect(devicePreference('%broken')).toBeUndefined();
});
