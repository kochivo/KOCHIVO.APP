import { expect, it, vi } from 'vitest';
import { planIntent } from './data/intents';

vi.mock('server-only', () => ({}));

const read = { name: 'team_summary', args: {} };
const reminder = { name: 'send_reminder', args: { player: 'Youssef' } };
const invalid = { name: 'renew_subscription', args: { days: -1 } };

async function plan(calls: unknown[]) {
  const fetcher: typeof fetch = async () => Response.json({
    candidates: [{ content: { parts: calls.map(functionCall => ({ functionCall })) } }],
  });
  return planIntent('captain', { text: 'Youssef and the team' }, 'key',
    new AbortController().signal, undefined, [], fetcher);
}

it('plans two requests in order', async () => {
  expect((await plan([read, reminder])).map(intent => intent.kind)).toEqual(['team_summary', 'send_reminder']);
});

it('ignores calls after the third and replaces invalid args with a clarify marker', async () => {
  expect(await plan([read, invalid, reminder, { name: 'player_summary', args: {} }])).toEqual([
    { kind: 'team_summary', args: {} },
    { kind: 'clarify', reason: 'renew_subscription', args: { question: '' } },
    { kind: 'send_reminder', args: { player: 'Youssef' } },
  ]);
});

it('drops duplicate calls', async () => {
  expect(await plan([read, reminder, read])).toHaveLength(2);
});

it('keeps repeated tools with distinct arguments', async () => {
  expect(await plan([reminder, { ...reminder, args: { player: 'Ahmed' } }])).toEqual([
    { kind: 'send_reminder', args: { player: 'Youssef' } },
    { kind: 'send_reminder', args: { player: 'Ahmed' } },
  ]);
});
