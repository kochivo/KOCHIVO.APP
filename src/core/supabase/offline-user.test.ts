import { expect, it } from 'vitest';
import { offlineSessionUser } from './offline-user';

it('reads an expired persisted identity without a refresh request', async () => {
  const raw = JSON.stringify({ expires_at: 1, user: { id: 'alice' } });
  const value = 'base64-' + Buffer.from(raw).toString('base64url');
  expect(await offlineSessionUser(`sb-project-auth-token=${value}`, 'sb-project-auth-token')).toBe('alice');
});

it('uses only this project cookie and combines persisted chunks', async () => {
  const cookies = 'sb-project-auth-token.0=%7B%22user%22%3A; sb-project-auth-token.1=%7B%22id%22%3A%22bob%22%7D%7D';
  expect(await offlineSessionUser(cookies, 'sb-project-auth-token')).toBe('bob');
  expect(await offlineSessionUser(cookies, 'sb-other-auth-token')).toBeNull();
});

it.each(['', 'sb-project-auth-token=invalid', 'sb-project-auth-token=%7B%7D'])('fails closed on missing or malformed identity: %s', async header => {
  expect(await offlineSessionUser(header, 'sb-project-auth-token')).toBeNull();
});
