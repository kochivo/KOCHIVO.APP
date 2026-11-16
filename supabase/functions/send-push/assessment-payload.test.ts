import { expect, it } from 'vitest';
import { pushPayload } from './payload';

it('formats assessment replies and their request link in every language style', () => {
  const row = { id: 'notice', type: 'coach_replied', payload: { kind: 'assessment', request_id: 'a/b', captain_name: 'Sam' } };
  for (const [locale, style, body] of [
    ['ar', 'egyptian', 'كابتن Sam رد على التقييم'],
    ['ar', 'standard', 'ردّ المدرب Sam على التقييم'],
    ['en', 'egyptian', 'Sam replied to your assessment'],
  ] as const) {
    expect(pushPayload(row, locale, style)).toMatchObject({ body, url: `/${locale}/player/forms/a%2Fb` });
  }
  expect(pushPayload({ ...row, payload: { kind: 'assessment' } })).toMatchObject({ url: '/ar/player/assessments' });
});
