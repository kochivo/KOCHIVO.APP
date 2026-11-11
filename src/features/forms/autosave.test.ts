import { expect, it } from 'vitest';
import { createAutosave } from './hooks/autosave';
import { copyTemplate } from './model';
import { templates } from './templates';

it('debounces, serializes writes and never reports a stale revision as saved', async () => {
  let tick: (() => void) | undefined;
  let finish: (() => void) | undefined;
  const writes: string[] = [], statuses: string[] = [];
  const autosave = createAutosave(async form => {
    writes.push(form.title); await new Promise<void>(resolve => { finish = resolve; });
  }, status => statuses.push(status), fn => { tick = fn; return () => { tick = undefined; }; });
  const form = copyTemplate(templates[0], 'captain');
  autosave.update({ ...form, title: 'one' });
  autosave.update({ ...form, title: 'two' });
  expect(writes).toEqual([]);
  tick?.(); await Promise.resolve();
  expect(writes).toEqual(['two']);
  autosave.update({ ...form, title: 'three' }); tick?.();
  finish?.(); await Promise.resolve(); await Promise.resolve();
  expect(writes).toEqual(['two','three']);
  expect(statuses.at(-1)).toBe('saving');
  finish?.(); await Promise.resolve(); await Promise.resolve();
  expect(statuses.at(-1)).toBe('saved');
  autosave.dispose();
});

it('retains failed edits for retry and does not save invalid forms', async () => {
  let tick: (() => void) | undefined, fail = true;
  const statuses: string[] = [];
  const autosave = createAutosave(async () => { if (fail) throw new Error('offline'); }, status => statuses.push(status),
    fn => { tick = fn; return () => {}; });
  const form = copyTemplate(templates[0], 'captain');
  autosave.update(form); tick?.(); await Promise.resolve(); await Promise.resolve();
  expect(statuses.at(-1)).toBe('saveError');
  fail = false; autosave.retry(); await Promise.resolve(); await Promise.resolve();
  expect(statuses.at(-1)).toBe('saved');
  autosave.update({ ...form, title: '' }); tick?.(); await Promise.resolve();
  expect(statuses.at(-1)).toBe('pending');
  autosave.dispose();
});

it('cancels a discarded unsaved draft and clears its pending status', () => {
  let tick: (() => void) | undefined;
  const statuses: string[] = [], writes: string[] = [];
  const autosave = createAutosave(async form => { writes.push(form.title); }, status => statuses.push(status),
    fn => { tick = fn; return () => { tick = undefined; }; });
  autosave.update(copyTemplate(templates[0], 'captain'));
  autosave.reset();
  tick?.();
  expect(writes).toEqual([]);
  expect(statuses.at(-1)).toBe('saved');
});
