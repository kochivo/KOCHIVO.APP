import { expect, it } from 'vitest';
import { koPreviewAllowed, nextKoExpression } from './policy';

it.each(['localhost', '127.0.0.1', '[::1]', '::1'])('permits local development on %s', hostname => {
  expect(koPreviewAllowed('development', hostname)).toBe(true);
});
it.each(['production', 'test', undefined])('never exposes KO in %s, even on localhost', mode => {
  expect(koPreviewAllowed(mode, 'localhost')).toBe(false);
});
it.each(['kochivo.site', 'kochivo-app.vercel.app', 'localhost.evil.test', '192.168.1.2', '', 'example.com'])('hides KO from non-loopback host %s', hostname => {
  expect(koPreviewAllowed('development', hostname)).toBe(false);
});
it('cycles the three approved expressions without timers or random choices', () => {
  expect(nextKoExpression('welcome')).toBe('thinking');
  expect(nextKoExpression('thinking')).toBe('cheer');
  expect(nextKoExpression('cheer')).toBe('welcome');
});
