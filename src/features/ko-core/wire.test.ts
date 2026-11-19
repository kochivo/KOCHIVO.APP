import { expect, it } from 'vitest';
import { accountReplySchema, koReplySchema } from './wire';

it.each([
  { kind: 'updated', sets: 3, reps: 8 },
  { kind: 'read', sets: 4, reps: 10 },
  { kind: 'clarify', question: 'Which day?' },
  { kind: 'unsupported' },
])('preserves the demo reply contract: $kind', reply => {
  expect(koReplySchema.parse(reply)).toEqual(reply);
});

it.each([
  { kind: 'message', text: 'Ready' },
  { kind: 'message', text: 'Choose', optionsToken: 'signed-options' },
  { kind: 'confirm', text: 'Review', token: 'signed-approval' },
])('preserves the account reply contract: $kind', reply => {
  expect(accountReplySchema.parse(reply)).toEqual(reply);
});

it('rejects malformed reply variants without adding parsing to existing flows', () => {
  for (const reply of [{ kind: 'read', sets: '3', reps: 8 }, { kind: 'clarify' }, { kind: 'unknown' }])
    expect(koReplySchema.safeParse(reply).success).toBe(false);
  for (const reply of [{ kind: 'confirm', text: 'Review' }, { kind: 'message', text: 3 }, { kind: 'unknown' }])
    expect(accountReplySchema.safeParse(reply).success).toBe(false);
});

it('preserves action order and enforces the three-card limit', () => {
  const actions = ['first', 'second', 'third'].map(id => ({ id, title: id, detail: 'Preview', token: 'signed' }));
  const reply = { kind: 'message', text: 'Review', actions };
  expect(accountReplySchema.parse(reply)).toEqual(reply);
  expect(accountReplySchema.safeParse({ ...reply, actions: [...actions, actions[0]] }).success).toBe(false);
});
