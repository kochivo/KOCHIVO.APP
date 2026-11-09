import { describe, expect, it, vi } from 'vitest';
import { createDemoPlan, executeDemoTool, isKoDemoOrigin } from './demo-plan';
import { selectKoTool } from './gemini';

describe('local KO training tools', () => {
  it('persists the captain’s prescription for the player in the same demo', () => {
    const plan = createDemoPlan();
    const update = { name: 'update_bench', args: { sets: 3, reps: 8 } };
    expect(executeDemoTool(plan, 'captain', update)).toEqual({ kind: 'updated', sets: 3, reps: 8 });
    expect(executeDemoTool(plan, 'player', { name: 'read_bench', args: {} })).toEqual({ kind: 'read', sets: 3, reps: 8 });
    expect(createDemoPlan()).toEqual({ sets: 4, reps: 10 });
  });

  it('allows partial edits and denies player writes or invalid arguments', () => {
    const plan = createDemoPlan();
    expect(executeDemoTool(plan, 'captain', { name: 'update_bench', args: { sets: 2 } })).toEqual({ kind: 'updated', sets: 2, reps: 10 });
    expect(executeDemoTool(plan, 'player', { name: 'update_bench', args: { reps: 5 } })).toEqual({ kind: 'unsupported' });
    expect(executeDemoTool(plan, 'captain', { name: 'update_bench', args: { sets: 0 } })).toEqual({ kind: 'unsupported' });
    expect(executeDemoTool(plan, 'captain', { name: 'update_bench', args: { sets: 8, playerId: 'other' } })).toEqual({ kind: 'unsupported' });
    expect(plan).toEqual({ sets: 2, reps: 10 });
  });

  it('requires development, an exact loopback host, and matching origin', () => {
    expect(isKoDemoOrigin('development', '127.0.0.1:3105', 'http://127.0.0.1:3105')).toBe(true);
    expect(isKoDemoOrigin('production', '127.0.0.1:3105', 'http://127.0.0.1:3105')).toBe(false);
    expect(isKoDemoOrigin('development', 'localhost.evil.test', 'http://localhost.evil.test')).toBe(false);
    expect(isKoDemoOrigin('development', 'localhost:3105', 'http://localhost:3106')).toBe(false);
    expect(isKoDemoOrigin('development', 'localhost:3105', null)).toBe(false);
  });

  it('exposes only read and clarification to the player and passes voice audio to Gemini', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({
      candidates: [{ content: { parts: [{ functionCall: { name: 'read_bench', args: {} } }] } }],
    }));
    const result = await selectKoTool('player', { audio: new Uint8Array([1, 2, 3]), mimeType: 'audio/webm' }, 'test-key', undefined, fetcher);
    expect(result).toEqual({ name: 'read_bench', args: {} });
    const body = String(fetcher.mock.calls[0]?.[1]?.body);
    expect(body).toContain('"mimeType":"audio/webm"');
    expect(body).not.toContain('update_bench');
    expect(body).not.toContain('test-key');
  });
});
