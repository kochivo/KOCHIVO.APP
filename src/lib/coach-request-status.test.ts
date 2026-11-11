import { expect, it } from 'vitest';
import { coachRequestValues, parseCoachRequestStatus } from './coach-request-status';

it.each([
  ['1', 'sent'], ['member', 'member'], ['linked', 'linked'], ['junk', undefined],
  ['sent', undefined], ['', undefined], ['toString', undefined], [undefined, undefined], [['1', 'linked'], undefined],
])('parses requested=%s as %s', (value, expected) => {
  expect(parseCoachRequestStatus(value)).toBe(expected);
});

it('round-trips every status through its URL value', () => {
  for (const [status, value] of Object.entries(coachRequestValues)) {
    expect(parseCoachRequestStatus(value)).toBe(status);
  }
});
