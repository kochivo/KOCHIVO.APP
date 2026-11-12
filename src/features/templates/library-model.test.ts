import { expect, it } from 'vitest';
import { filterTemplates, trainingMetadata, usageCount } from './library-model';

it('normalizes Arabic and English search and filters only known levels', () => {
  const rows = [{ title: 'خُطّة إحماء', level: 'beginner' }, { title: 'Push PULL', level: 'advanced' }];
  expect(filterTemplates(rows, 'خطه احماء', 'all')).toEqual([rows[0]]);
  expect(filterTemplates(rows, ' push pull ', 'advanced')).toEqual([rows[1]]);
  expect(filterTemplates(rows, '', 'intermediate')).toEqual([]);
});
it('counts distinct assigned players and ignores archived copies and templates', () => {
  expect(usageCount([{ player_id: 'a', status: 'draft' }, { player_id: 'a', status: 'active' },
    { player_id: 'b', status: 'archived' }, { player_id: null, status: 'draft' }])).toBe(1);
});
it('does not invent missing training metadata', () => {
  expect(trainingMetadata({ repeatWeekly: true })).toEqual({});
  expect(trainingMetadata({ level: 'beginner', minutes: 30, equipment: 'gym' }))
    .toEqual({ level: 'beginner', minutes: 30, place: 'gym' });
});
