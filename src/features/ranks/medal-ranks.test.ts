import { describe, expect, it } from 'vitest';
import * as tiers from './tiers';

describe('seven lifetime medals', () => {
  it.each([
    [0, 'iron'], [99, 'iron'], [100, 'bronze'], [199, 'bronze'],
    [200, 'silver'], [299, 'silver'], [300, 'gold'], [399, 'gold'],
    [400, 'platinum'], [599, 'platinum'], [600, 'diamond'], [899, 'diamond'], [900, 'legend'],
  ])('maps %i lifetime points to %s', (points, rank) => {
    expect('medalRank' in tiers && tiers.medalRank(points)).toBe(rank);
  });
  it('starts legend stars at 1200', () => {
    expect([1199, 1200, 1500].map(tiers.legendStars)).toEqual([0, 1, 2]);
  });
  it.each([[0,'bronze',100],[99,'bronze',1],[100,'silver',100],[199,'silver',1],
    [200,'gold',100],[299,'gold',1],[300,'platinum',100],[399,'platinum',1],
    [400,'diamond',200],[599,'diamond',1],[600,'legend',300],[899,'legend',1],
    [900,'legend',300],[1199,'legend',1],[1200,'legend',300],[1500,'legend',300]] as const)(
    'finds the next medal or star at %i', (points, rank, needed) => {
      expect(tiers.nextMedalRank(points)).toEqual({ rank, needed });
    });
});
