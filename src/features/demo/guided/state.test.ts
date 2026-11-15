import { describe, expect, it } from 'vitest';
import { initialState, reduceDemo, summary, scaled, planIndex } from './state';
import { steps } from './steps';
import { canPulse, insideClips } from './pulse';

describe('guided demo', () => {
  it.each([[5, 4, 0], [20, 16, 1], [40, 31, 2], [100, 78, 3], [18, 14, 1]])('scales %i players and selects their plan', (n, trained, plan) => {
    expect(scaled(n)).toEqual({ players: n, trained });
    expect(planIndex(n)).toBe(plan);
  });
  it('advances each requested action and ignores unrelated events', () => {
    for (const [index, step] of steps.entries()) {
      if (!step.event) continue;
      const state = { ...initialState(1000), intro: false, step: index };
      expect(reduceDemo(state, { type: 'event', event: 'unrelated', now: 2000 }).step).toBe(index);
      expect(reduceDemo(state, { type: 'event', event: step.event, text: 'Demo action', now: 2000 }).step).toBe(index + 1);
    }
  });
  it('counts distinct actions and freezes elapsed time at the summary', () => {
    let state = reduceDemo(initialState(1000), { type: 'start', n: 20, now: 2000 });
    for (const event of ['nudge', 'nudge', 'renew', 'set']) state = reduceDemo(state, { type: 'event', event, now: 62000 });
    for (let i = 0; i < 13; i++) state = reduceDemo(state, { type: 'next', now: 65000 });
    expect(summary(state, 90000)).toEqual({ actions: 3, elapsed: '1:03', players: 20 });
    expect(state.sets).toEqual([[60, 10], [62.5, 8], [65, 8]]);
    expect(state.restUntil).toBe(152000);
  });
  it('wires messages, meals, payment and approval across panes without duplicates', () => {
    let state = initialState(0);
    state = reduceDemo(state, { type: 'event', event: 'send', text: 'Hello', now: 10 });
    expect(state.threads.mohamed.at(-1)).toEqual({ from: 'captain', text: 'Hello' });
    expect(state.unread).toBe(1);
    state = reduceDemo(state, { type: 'phone', tab: 'coach', now: 20 });
    expect(state.unread).toBe(0);
    for (const event of ['pay', 'pay', 'approve', 'swap', 'addex']) state = reduceDemo(state, { type: 'event', event, text: 'Reply', now: 30 });
    expect(state.paid).toBe(true);
    expect(state.approved).toBe(true);
    expect(state.swap).toBe(1);
    expect(state.added).toEqual(['Reply']);
    expect(state.feed.filter(item => item.event === 'pay')).toHaveLength(1);
  });
  it('restarts every local fixture, the guide and the opening question', () => {
    const state = reduceDemo({ ...initialState(0), step: 12, n: 100, paid: true, intro: false }, { type: 'restart', now: 50 });
    expect(state).toEqual(initialState(50));
  });
  it('keeps advancing a minimized guide and preserves a closed guide during exploration', () => {
    const state = { ...initialState(0), intro: false, step: 4, guide: 'min' as const };
    const next = reduceDemo(state, { type: 'event', event: 'approve', text: 'Approved', now: 100 });
    expect(next.step).toBe(5);
    expect(next.guide).toBe('min');
    expect(reduceDemo({ ...state, guide: 'closed' }, { type: 'event', event: 'approve', now: 100 }).step).toBe(4);
  });
  it('ignores empty messages instead of completing the send step', () => {
    const state = { ...initialState(0), step: 5 };
    expect(reduceDemo(state, { type: 'event', event: 'send', text: '  ', now: 100 })).toEqual(state);
  });
  it('keeps historical feed payloads when later sets and invitations change', () => {
    let state = reduceDemo(initialState(0), { type: 'event', event: 'set', now: 100 });
    state = reduceDemo(state, { type: 'patch', patch: { kg: 70, reps: 10 } });
    state = reduceDemo(state, { type: 'event', event: 'set', now: 200 });
    state = reduceDemo(state, { type: 'event', event: 'invite', text: 'First', now: 300 });
    state = reduceDemo(state, { type: 'event', event: 'again', now: 400 });
    state = reduceDemo(state, { type: 'event', event: 'invite', text: 'Second', now: 500 });
    expect(state.feed).toEqual([
      { event: 'invite', text: 'Second' }, { event: 'invite', text: 'First' },
      { event: 'set', text: '70 × 10' }, { event: 'set', text: '65 × 8' },
    ]);
  });
  it('skips endpoints clipped by any scroll ancestor', () => {
    const source = { x: 10, y: 200, width: 40, height: 40 };
    expect(insideClips(source, [{ x: 0, y: 0, width: 300, height: 210 }])).toBe(false);
    expect(insideClips(source, [{ x: 0, y: 0, width: 300, height: 300 }, { x: 0, y: 0, width: 300, height: 190 }])).toBe(false);
    expect(insideClips(source, [{ x: 0, y: 0, width: 300, height: 300 }])).toBe(true);
  });
  it('skips pulses for reduced motion, missing, clipped or hidden endpoints', () => {
    const rect = { x: 20, y: 20, width: 40, height: 40 };
    expect(canPulse(false, rect, rect, 390, 844)).toBe(true);
    expect(canPulse(true, rect, rect, 390, 844)).toBe(false);
    expect(canPulse(false, null, rect, 390, 844)).toBe(false);
    expect(canPulse(false, rect, { ...rect, width: 0 }, 390, 844)).toBe(false);
    expect(canPulse(false, { ...rect, y: 900 }, rect, 390, 844)).toBe(false);
    expect(canPulse(false, rect, { ...rect, x: -50 }, 390, 844)).toBe(false);
  });
});
