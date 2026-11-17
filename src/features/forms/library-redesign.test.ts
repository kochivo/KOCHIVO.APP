import { createElement, isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppDatabase } from '@/types/app-database';
import { FormsLibraryPage } from './components/forms-library-page';
import { FormsLibraryEntry } from './components/forms-library-entry';
import { V11LibraryList } from './components/v11-library-list';
import type { AssessmentLibraryData } from './data/assessment-library';
import { templateCopyForAction } from './template-copy';

const load = vi.hoisted(() => vi.fn());
vi.mock('server-only', () => ({}));
vi.mock('./data/assessment-library', () => ({ loadAssessmentLibrary: load }));
vi.mock('@/core/i18n/server', () => ({ getArabicStyle: async () => 'egyptian' }));
vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('NOT_FOUND'); }, useRouter: () => ({ push() {} }) }));
const captain = '00000000-0000-7000-8000-000000000201';
const action = '00000000-0000-7000-8000-000000000202';
const data: AssessmentLibraryData = { forms: [], metrics: { active: 0, sent: 0, answered: 0, recipients: 0, averageHours: null },
  byForm: {}, activity: {}, now: '2026-11-12T10:00:00Z', waitingReview: 0, pending: 0, answeredWeek: 0,
  players: [], schedules: [], answers: [], counts: [], timezone: 'Africa/Cairo' };
const client = {} as SupabaseClient<AppDatabase>;
beforeEach(() => { load.mockReset(); load.mockResolvedValue(structuredClone(data)); });

function entry(node: ReactNode): ReactElement<Parameters<typeof FormsLibraryEntry>[0]> | undefined {
  if (Array.isArray(node)) return node.map(entry).find(Boolean);
  if (!isValidElement<{ children?: ReactNode }>(node)) return;
  return node.type === FormsLibraryEntry ? node as ReactElement<Parameters<typeof FormsLibraryEntry>[0]> : entry(node.props.children);
}
const visit = (query: { template?: string; draft?: string }) => FormsLibraryPage({
  captain, client, locale: 'ar', query, now: new Date(data.now),
});

it('does not instantiate or autosave a starter on repeated read-only template visits', async () => {
  for (let i = 0; i < 3; i++) expect(entry(await visit({ template: 'checkin' }))?.props.form).toBeNull();
});

it('reuses the same draft after a reload and preserves the saved captain edits', async () => {
  const first = entry(await visit({ template: 'checkin', draft: action }))?.props.form;
  expect(first).toEqual(await templateCopyForAction('checkin', captain, action, 'ar'));
  expect(entry(await visit({ template: 'checkin', draft: action }))?.props.form).toEqual(first);
  const saved = { ...await templateCopyForAction('checkin', captain, action, 'ar'), title: 'Captain edits', creation_key: undefined };
  load.mockResolvedValue({ ...data, forms: [saved] });
  expect(entry(await visit({ template: 'checkin', draft: action }))?.props.form).toBe(saved);
});

it('rejects invalid copy keys before opening an autosaving editor', async () => {
  await expect(visit({ template: 'checkin', draft: 'invalid' })).rejects.toThrow('NOT_FOUND');
});

it('shows the question count and distinct recipients on a form card', async () => {
  const template = await templateCopyForAction('checkin', captain, action, 'en');
  if (!template) throw new Error('Missing check-in template');
  const form = { ...template, title: 'Weekly review', questions: template.questions.slice(0, 2) };
  const html = renderToStaticMarkup(createElement(V11LibraryList, { locale: 'en', data: {
    ...data, forms: [form], byForm: { [form.id]: { active: 0, sent: 8, answered: 3, recipients: 4, averageHours: null } },
  } }));
  expect(html).toContain('Weekly review');
  expect(html).toContain('2 questions');
  expect(html).toContain('4 players');
  expect(html).toContain('3/8');
});
