import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
type Template = { key: string; title: string; days: { exercises: { dataset_id: string; notes?: string }[] }[] };
it('seeds three programs with the prescribed days and post-natal note prefixes', () => {
  const templates: Template[] = JSON.parse(readFileSync('supabase/seed/source/starter-templates.json', 'utf8'));
  for (const [key, count] of [['post-natal', 3], ['women-home', 3], ['women-strength', 4]] as const) {
    const template = templates.find(row => row.key === key);
    expect(template?.days).toHaveLength(count);
    if (key === 'post-natal') for (const exercise of template?.days.flatMap(day => day.exercises) ?? []) {
      expect(exercise.notes?.startsWith('بإذن الدكتور')).toBe(true);
    }
  }
  const exercises: { dataset_id: string; equipment: string }[] = JSON.parse(readFileSync('supabase/seed/source/exercises-gif.json', 'utf8'));
  for (const exercise of templates.find(row => row.key === 'women-home')?.days.flatMap(day => day.exercises) ?? []) {
    expect(exercises.find(row => row.dataset_id === exercise.dataset_id)?.equipment).toBe('body weight');
  }
});
