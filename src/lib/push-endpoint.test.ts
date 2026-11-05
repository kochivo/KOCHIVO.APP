import { expect, it } from 'vitest';
import { allowedPushEndpoint } from './push-endpoint';
import { allowedPushEndpoint as edgeAllowed } from '../../supabase/functions/send-push/push-endpoint';

it.each([
  ['https://fcm.googleapis.com/fcm/send/abc', true],
  ['https://web.push.apple.com/abc', true],
  ['https://updates.push.services.mozilla.com/wpush/v2/a', true],
  ['https://push.services.mozilla.com/a', true],
  ['https://wns2.notify.windows.com/a', true],
  ['https://push.apple.com/a', false],
  ['https://fcm.googleapis.com.evil.test/a', false],
  ['https://evil.test@fcm.googleapis.com/a', false],
  ['https://fcm.googleapis.com:8443/a', false],
  ['http://fcm.googleapis.com/a', false],
  ['https://127.0.0.1/a', false],
  ['https://evil.test/a', false],
  ['bad', false],
])('validates %s in browser and edge runtimes', (endpoint, expected) => {
  expect(allowedPushEndpoint(endpoint)).toBe(expected);
  expect(edgeAllowed(endpoint)).toBe(expected);
});
