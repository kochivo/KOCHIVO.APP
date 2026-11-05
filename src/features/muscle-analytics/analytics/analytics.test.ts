import { describe, expect, it } from 'vitest';
import { muscleMap } from './muscle-map';
import { heatClass } from './heat';
import { weeklyVolume } from '../data/muscle-volume';
import type { VolumeRow } from '../data/muscle-volume';

const targets = {
  chest: ['pectorals', 'serratus anterior'],
  back: ['lats', 'upper back', 'traps', 'spine', 'levator scapulae'],
  shoulders: ['delts'], arms: ['biceps', 'triceps', 'forearms'], abs: ['abs'],
  legs: ['quads', 'glutes', 'hamstrings', 'calves', 'adductors', 'abductors'],
};
const parts = { chest: ['chest'], back: ['back'], shoulders: ['shoulders'],
  arms: ['upper arms', 'lower arms'], abs: ['waist'], legs: ['upper legs', 'lower legs'] };

describe('muscle mapping', () => {
  for (const [region, values] of Object.entries(targets)) {
    it.each(values)(`maps target %s to ${region} before body part`, target => {
      expect(muscleMap(target, 'waist')).toBe(region);
    });
  }
  for (const [region, values] of Object.entries(parts)) {
    it.each(values)(`falls back from unknown target to %s (${region})`, part => {
      expect(muscleMap('unknown', part)).toBe(region);
      expect(muscleMap(null, part)).toBe(region);
    });
  }
  it('ignores cardio, neck and unknown muscles', () => {
    expect(muscleMap('cardio', 'chest')).toBeNull();
    expect(muscleMap('neck', 'back')).toBeNull();
    expect(muscleMap('abs', 'cardio')).toBeNull();
    expect(muscleMap(null, 'neck')).toBeNull();
    expect(muscleMap(null, 'unknown')).toBeNull();
    expect(muscleMap(' PECTORALS ', 'chest')).toBe('chest');
  });
});

function row(completed_at: string, target = 'pectorals', extra: Partial<VolumeRow> = {}): VolumeRow {
  return { completed_at, deleted_at: null, reps: 8, exercises: { target, body_part: 'chest' }, ...extra };
}
describe('weekly volume', () => {
  const now = new Date('2026-11-04T10:00:00Z');
  it('buckets four Saturday weeks and ignores old, future, deleted and zero-rep logs', () => {
    const weeks = weeklyVolume([
      row('2026-10-09T20:59:59Z'), row('2026-10-09T21:00:00Z'),
      row('2026-10-16T21:00:00Z'), row('2026-10-23T21:00:00Z'),
      row('2026-10-30T21:59:59Z'), row('2026-10-30T22:00:00Z'),
      row('2026-11-04T10:00:01Z'), row('2026-11-02T10:00:00Z', 'pectorals', { deleted_at: 'deleted' }),
      row('2026-11-02T10:00:00Z', 'pectorals', { reps: 0 }),
      row('2026-11-02T10:00:00Z', 'pectorals', { reps: null }),
    ], now);
    expect(weeks.map(w => w.start)).toEqual(['2026-10-10', '2026-10-17', '2026-10-24', '2026-10-31']);
    expect(weeks.map(w => w.regions.chest)).toEqual([1, 1, 2, 1]);
  });
  it('keeps the leg split for push/pull and counts sets rather than repetitions', () => {
    const week = weeklyVolume(['quads', 'hamstrings', 'glutes', 'calves', 'delts', 'lats', 'biceps']
      .map(target => row('2026-11-02T10:00:00Z', target)), now)[3];
    expect(week?.regions.legs).toBe(4);
    expect(week?.anterior).toBe(2);
    expect(week?.posterior).toBe(3);
    expect(week?.total).toBe(7);
  });
  it('handles the Cairo midnight rollover in the injected now', () => {
    const rows = [row('2026-11-06T21:59:59Z'), row('2026-11-06T22:00:00Z')];
    expect(weeklyVolume(rows, new Date('2026-11-06T21:59:59Z'))[3]?.regions.chest).toBe(1);
    expect(weeklyVolume(rows, new Date('2026-11-06T22:00:00Z')).map(w => w.regions.chest)).toEqual([0, 0, 1, 1]);
  });
});

it('uses the heat thresholds including the glow boundary', () => {
  expect(heatClass(0)).toBe('fill-none');
  expect(heatClass(1)).toBe('fill-lime/20');
  expect(heatClass(5)).toBe('fill-lime/20');
  expect(heatClass(6)).toBe('fill-lime');
  expect(heatClass(12)).toBe('fill-lime');
  expect(heatClass(13)).toContain('shadow-lime-glow');
});
