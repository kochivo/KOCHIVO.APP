import { describe, expect, it, vi } from 'vitest';
import { clampMetric, completeIntake } from './wizard';

describe('cinematic intake controls and completion', () => {
  it('waits for save, preparation and visible success before redirecting', async () => {
    const events: string[] = [];
    let resolveSave: (value: { error?: string }) => void = () => undefined;
    let advance: () => void = () => undefined;
    const save = new Promise<{ error?: string }>(resolve => { resolveSave = resolve; });
    const finished = completeIntake(() => save, stage => events.push(stage), () => events.push('redirect'),
      milliseconds => new Promise<void>(resolve => { events.push(`wait:${milliseconds}`); advance = resolve; }));
    expect(events).toEqual([]);
    resolveSave({});
    await Promise.resolve();
    expect(events).toEqual(['preparing', 'wait:1200']);
    advance();
    await Promise.resolve();
    expect(events).toEqual(['preparing', 'wait:1200', 'success', 'wait:1200']);
    advance();
    await finished;
    expect(events.at(-1)).toBe('redirect');
  });
  it('keeps fine adjustments within the unchanged measurement bounds', () => {
    expect(clampMetric('height_cm', 99)).toBe(100);
    expect(clampMetric('height_cm', 251)).toBe(250);
    expect(clampMetric('weight_kg', 24.5)).toBe(25);
    expect(clampMetric('weight_kg', 300.5)).toBe(300);
    expect(clampMetric('target_weight_kg', 300.5)).toBe(300);
    expect(clampMetric('weight_kg', 75.1 + 0.2)).toBe(75.3);
    expect(clampMetric('height_cm', 175.5)).toBe(175.5);
  });
  it('keeps failed saves in the form without showing completion', async () => {
    const stage = vi.fn();
    const redirect = vi.fn();
    const wait = vi.fn();
    expect(await completeIntake(async () => ({ error: 'offline' }), stage, redirect, wait)).toEqual({ error: 'offline' });
    expect(stage).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    expect(wait).not.toHaveBeenCalled();
  });
});
