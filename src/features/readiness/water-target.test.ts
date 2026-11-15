import { describe, expect, it } from 'vitest';
import { playerWaterGoalMl } from './water';

describe('captain water target', () => {
  it('uses the captain target before weight', () => {
    expect(playerWaterGoalMl(3500, 80)).toBe(3500);
  });
  it('falls back to weight and the existing default', () => {
    expect(playerWaterGoalMl(null, 80)).toBe(2750);
    expect(playerWaterGoalMl(undefined)).toBe(3000);
  });
});
