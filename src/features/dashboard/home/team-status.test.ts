import { expect, it } from 'vitest';
import { teamStatus } from './team-status';

it.each([[0, 'teamLow'], [13, 'teamLow'], [49, 'teamLow'], [50, 'teamMid'], [79, 'teamMid'], [80, 'teamHigh'], [100, 'teamHigh']] as const)(
  'chooses the team status for %i percent adherence', (adherence, expected) => {
    expect(teamStatus(adherence)).toBe(expected);
  },
);
