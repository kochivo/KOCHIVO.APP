import { expect, it } from 'vitest';
import { feedReply } from './feed-reply';

it('reads the token and detail from a T-403 action card', () => {
  expect(feedReply({ kind: 'message', text: 'I’ve prepared your request.', actions: [
    { id: 'a', title: 'Workout reminder for Hesham', detail: 'Player: Hesham', token: 't1' },
  ] })).toEqual({ text: 'Workout reminder for Hesham\nPlayer: Hesham', token: 't1' });
});

it('still reads the older confirm shape', () => {
  expect(feedReply({ kind: 'confirm', text: 'Send it?', token: 't2' })).toEqual({ text: 'Send it?', token: 't2' });
});

it('treats a plain message as final text with no token', () => {
  expect(feedReply({ kind: 'message', text: 'Workout reminder queued.' })).toEqual({ text: 'Workout reminder queued.', token: undefined });
});

it('rejects malformed replies', () => {
  expect(feedReply(null)).toBeNull();
  expect(feedReply({ kind: 'message' })).toBeNull();
});
