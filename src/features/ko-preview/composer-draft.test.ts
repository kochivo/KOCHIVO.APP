import { expect, it } from 'vitest';
import { canSubmitKoDraft } from './composer-draft';

it('allows a voice note by itself and rejects mixed voice drafts', () => {
  const voice = new Blob(['audio']);
  const photo = new Blob(['photo']);
  expect(canSubmitKoDraft('', voice, null)).toBe(true);
  expect(canSubmitKoDraft('question', voice, null)).toBe(false);
  expect(canSubmitKoDraft('', voice, photo)).toBe(false);
  expect(canSubmitKoDraft('question', null, photo)).toBe(true);
  expect(canSubmitKoDraft(' ', null, null)).toBe(false);
});
