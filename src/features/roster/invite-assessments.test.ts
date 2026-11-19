import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { InviteAssessments } from './components/invite-assessments';
import type { FormDraft } from '@/features/forms';

vi.mock('@/features/forms', () => ({ FormPreviewEntry: () => null }));
vi.mock('@/core/offline/ids', () => ({ uuidv7: () => '00000000-0000-7000-8000-000000000001' }));
const form: FormDraft = { id: 'form', captain_id: 'captain', title: 'Goals', kind: 'custom', schedule: null,
  remind_after_hours: null, questions: [{ id: 'q', form_id: 'form', position: 0, label_ar: 'الهدف', label_en: 'Goal',
    type: 'text', required: true, options: [], maps_to: null, alert_on: null, show_chart: false }] };
function render(formIds: string[], gate: boolean, forms = [form]) {
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(InviteAssessments, { forms, formIds, gate, onChange() {} })));
}
it('renders a disabled unchecked switch until an assessment is selected', () => {
  const empty = render([], true);
  expect(empty).toMatch(/role="switch"[^>]*disabled=""/);
  expect(empty).toMatch(/role="switch"[^>]*aria-checked="false"/);
  const selected = render(['form'], true);
  expect(selected).toMatch(/role="switch"[^>]*aria-checked="true"/);
  expect(selected).not.toMatch(/role="switch"[^>]*disabled=""/);
  expect(selected).toContain('Goals'); expect(selected).toContain('1 question');
  expect(selected).toContain('Preview');
});
it('provides the empty state and creates a fresh editor draft in a separate tab', () => {
  const html = render([], false, []);
  expect(html).toContain('No assessments yet.');
  expect(html).toContain('Create your first assessment');
  expect(html).toContain('href="/en/captain/library/forms?template=custom"');
  expect(html).toContain('target="_blank"');
});
