import { expect, it } from 'vitest';
import { consentReturnPath } from './consent-return';

it('keeps the authorization ID on the canonical consent path', () => {
  expect(consentReturnPath('/oauth/consent?authorization_id=abc%2F123'))
    .toBe('/oauth/consent?authorization_id=abc%2F123');
});

it.each(['//external.test/oauth/consent?authorization_id=abc', '/captain', '/oauth/consent',
  '/oauth/consent?authorization_id=abc&authorization_id=xyz', '/oauth/consent?authorization_id=abc#other'])(
  'rejects an invalid sign-in return path (%s)', path => expect(consentReturnPath(path)).toBeUndefined(),
);
