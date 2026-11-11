import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { formTestDatabase } from './test-database';
import { copyTemplate, reorderQuestions } from './model';
import { templates } from './templates';

const access = vi.hoisted(() => ({ current: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('./data/access', () => ({ formsAccess: access.current }));
const captain = '00000000-0000-7000-8000-000000000001';
let store: Awaited<ReturnType<typeof formTestDatabase>>;
beforeEach(async () => { store = await formTestDatabase(); access.current.mockResolvedValue({ client: store.client, captain }); });
afterEach(async () => { await store.db.close(); });
const save = async (form: ReturnType<typeof copyTemplate>) => (await import('./data/save-form')).saveForm(form);

it('persists schedules, options, alerts and stable question IDs through reorder and delete', async () => {
  let form = copyTemplate(templates[0], captain);
  expect(await save(form), store.errors.join('\n')).toEqual({ ok: true });
  const first = form.questions[0];
  if (!first) throw new Error('Expected question');
  form = { ...form, questions: reorderQuestions(form.questions, 0, 1) };
  expect(await save(form)).toEqual({ ok: true });
  const result = await store.db.query<{ id: string; position: number }>('select id,position from form_questions order by position');
  expect(result.rows[1]).toEqual({ id: first.id, position: 1 });
  expect((await store.db.query('select schedule,remind_after_hours from forms')).rows).toEqual([
    { schedule: { every: 'week', weekday: 5, hour: 9 }, remind_after_hours: 24 },
  ]);
  form = { ...form, questions: form.questions.filter(q => q.id !== first.id) };
  expect(await save(form)).toEqual({ ok: true });
  expect((await store.db.query('select id from form_questions where id=$1', [first.id])).rows).toHaveLength(0);
});

it('rejects foreign question IDs before modifying either form', async () => {
  const one = copyTemplate(templates[0], captain), two = copyTemplate(templates[0], captain);
  expect(await save(one)).toEqual({ ok: true });
  const first = one.questions[0];
  if (!first) throw new Error('Expected question');
  two.questions[0] = { ...first, form_id: two.id };
  expect(await save(two)).toEqual({ ok: false });
  expect((await store.db.query('select id from forms where id=$1', [two.id])).rows).toHaveLength(0);
  expect((await store.db.query('select form_id from form_questions where id=$1', [first.id])).rows).toEqual([{ form_id: one.id }]);
});

it('preserves answered questions and allows retry after a failed write', async () => {
  const form = copyTemplate(templates[0], captain);
  expect(await save(form)).toEqual({ ok: true });
  const first = form.questions[0];
  if (!first) throw new Error('Expected question');
  await store.db.query('insert into form_answers values($1,$2)', [form.id, first.id]);
  expect(await save({ ...form, title: 'Changed', questions: form.questions.slice(1) })).toEqual({ ok: false });
  expect((await store.db.query('select title from forms')).rows).toEqual([{ title: form.title }]);
  store.failWrite();
  expect(await save({ ...form, title: 'Retry' })).toEqual({ ok: false });
  expect(await save({ ...form, title: 'Retry' })).toEqual({ ok: true });
});
