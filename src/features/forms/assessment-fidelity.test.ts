import { createElement } from 'react';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { workspaceMessages, messages } from './messages';
import { messages as redesign } from './redesign/messages';
import { V11TemplateChooser } from './components/v11-template-chooser';
import { questionCount } from './question-count';
import { templates } from './templates';
import { templateCopyForAction } from './template-copy';
import { V11FormSettings } from './components/v11-form-settings';
import { copyTemplate } from './model';

vi.mock('./components/template-link-entry', () => ({ TemplateLinkEntry: ({ href, children }: { href: string; children: ReactNode }) => createElement('a', { href }, children) }));
vi.mock('./components/library-schedules-entry', () => ({ LibrarySchedulesEntry: () => null }));

it('uses assessment names and a consistent text type label', () => {
  expect(createT(workspaceMessages, 'ar')('newForm')).toBe('تقييم جديد');
  expect(createT(workspaceMessages, 'en')('title')).toBe('Assessments');
  expect(messages.ar.types.text).toBe('كتابة');
  expect(createT(redesign, 'ar')('text')).toBe('كتابة');
});

it('uses assessment names and question plurals in standard Arabic', () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  try {
    const t = createT(workspaceMessages, 'ar', 'standard');
    expect(t('title')).toBe('التقييمات');
    expect(t('newForm')).toBe('تقييم جديد');
    expect(questionCount(1, 'ar', 'standard')).toBe('سؤال واحد');
    expect(questionCount(2, 'ar', 'standard')).toBe('سؤالان');
    expect(questionCount(11, 'ar', 'standard')).toBe('11 سؤال');
  } finally { vi.unstubAllEnvs(); }
});

it.each([[1, 'سؤال واحد'], [2, 'سؤالين'], [3, '3 أسئلة'], [11, '11 سؤال']])('counts %s questions', (n, expected) => {
  expect(questionCount(Number(n), 'ar')).toBe(expected);
});

it('offers seven templates followed by a blank assessment', () => {
  const html = renderToStaticMarkup(createElement(V11TemplateChooser, { locale: 'ar' }));
  expect(html.match(/template=/g)).toHaveLength(8);
  for (const template of templates) expect(html).toContain(`template=${template.key ?? template.kind}`);
  expect(html).toContain('من الصفر');
  expect(html.lastIndexOf('template=custom')).toBeGreaterThan(html.lastIndexOf('template=feedback'));
});

it('opens every existing template with its questions and schedule', async () => {
  for (const template of templates) {
    const form = await templateCopyForAction(template.key ?? template.kind, 'captain', 'draft', 'ar');
    expect(form.questions.map(q => q.label_ar)).toEqual(template.questions.map(q => q.label_ar));
    expect(form.schedule).toEqual(template.schedule);
  }
});

it('summarizes manual settings once with a visible edit button', () => {
  const form = { ...copyTemplate(templates[0], 'captain', () => 'form'), schedule: null };
  const html = renderToStaticMarkup(createElement(V11FormSettings, { form, locale: 'ar', onChange() {} }));
  expect(html).toContain('بتبعته بإيدك لأي لاعب');
  expect(html).toMatch(/<button[^>]*aria-haspopup="dialog"/);
  expect(html).toContain('عدّل');
  expect(html).not.toContain('يدوي');
  expect(html).not.toContain('<dl>');
});

it('summarizes a weekly template using its stored time', () => {
  const form = copyTemplate(templates[0], 'captain', () => 'form');
  const html = renderToStaticMarkup(createElement(V11FormSettings, { form, locale: 'ar', onChange() {} }));
  expect(html).toContain('كل جمعة');
  expect(html).toContain('9');
  expect(html).toContain('كل اللاعبين');
});
