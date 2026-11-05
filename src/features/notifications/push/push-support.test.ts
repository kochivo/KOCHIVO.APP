import { expect, it } from 'vitest';
import { base64UrlBytes, pushSupport } from './push-support';

const supported = { serviceWorker: true, pushManager: true, notification: true, userAgent: 'Chrome', platform: 'Win32', maxTouchPoints: 0, standalone: false };
it('decodes URL-safe VAPID keys including missing padding', () => {
  expect([...base64UrlBytes('AAH-_w')]).toEqual([0, 1, 254, 255]);
});
it.each([
  [{}, 'supported'],
  [{ serviceWorker: false }, 'unsupported'],
  [{ notification: false }, 'unsupported'],
  [{ pushManager: false }, 'unsupported'],
  [{ userAgent: 'iPhone', pushManager: false }, 'ios-install'],
  [{ userAgent: 'iPad', standalone: true }, 'supported'],
  [{ userAgent: 'iPod', standalone: false }, 'ios-install'],
  [{ platform: 'MacIntel', maxTouchPoints: 5 }, 'ios-install'],
  [{ platform: 'MacIntel', maxTouchPoints: 0 }, 'supported'],
  [{ userAgent: 'iPhone', standalone: true, pushManager: false }, 'unsupported'],
] as const)('detects support for %j', (input, expected) => {
  expect(pushSupport({ ...supported, ...input })).toBe(expected);
});
