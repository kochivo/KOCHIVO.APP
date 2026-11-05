import { createElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
const state = vi.hoisted(() => ({ values: [] as unknown[], index: 0 }));
vi.mock('react', async original => {
 const react = await original<typeof React>();
 return { ...react, useState: (initial: unknown) => {
 const index = state.index++;
 return [index in state.values ? state.values[index] : typeof initial === 'function' ? initial() : initial, () => {}];
 } };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ push() {}, refresh() {} }) }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success() {}, error() {} }) }));
beforeEach(() => { state.values = []; state.index = 0; });
const render = (element: React.ReactElement) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, element));
import { TemplatesScreen } from './components/templates-screen';
import { AssignSheet } from './components/assign-sheet';
import { PreviewSheet } from './components/preview-sheet';
vi.mock('./data/templates', () => ({ listTemplates() {}, copyTemplate() {}, createTemplate() {}, deleteTemplate() {}, renameTemplate() {}, assignTemplate() {}, listTemplatePlayers() {} }));
vi.mock('./data/template-preview', () => ({ previewTemplate() {} }));
const template = { id: 't', title: 'Starter', kind: 'program' as const, starter: true, count: 1, created_at: '2026-11-03T10:00:00Z' };
it('offers scrolling to ready templates when there are no personal templates', () => {
 state.values = [[template], 'program', null, null, false];
 expect(render(createElement(TemplatesScreen))).toMatch(/href="#kochivo-templates"[^>]*>Copy a ready template<\/a>/);
});
it('offers creating a blank template in an empty library', () => {
 state.values = [[], 'program', null, null, false];
 const html = render(createElement(TemplatesScreen));
 expect(html).toContain('>+ New template</button>');
 expect(html).toContain('You haven&#x27;t made any templates yet');
});
it('groups personal templates first with separate counts and protects starters', () => {
 state.values = [[template, { ...template, id: 'mine', title: 'My strength', starter: false },
   { ...template, id: 'meal', kind: 'nutrition', title: 'Meal template', starter: false }], 'program', null, null, false];
 const html = render(createElement(TemplatesScreen));
 expect(html.indexOf('id="my-templates"')).toBeLessThan(html.indexOf('id="kochivo-templates"'));
 const own = html.slice(html.indexOf('id="my-templates"'), html.indexOf('id="kochivo-templates"'));
 const starters = html.slice(html.indexOf('id="kochivo-templates"'));
 expect(own).toContain('My templates<span class="ms-3 text-muted">1</span>');
 expect(own).toContain('My strength'); expect(own).not.toContain('>Starter</h3>');
 expect(own).toContain('Rename My strength'); expect(own).not.toContain('Meal template');
 expect(starters).toContain('KOCHIVO templates<span class="ms-3 text-muted">1</span>');
 expect(starters).toContain('>Starter</h3>'); expect(starters).not.toContain('aria-label="Rename');
});
it('shows loading and retry errors inside both sections', () => {
 let html = render(createElement(TemplatesScreen));
 expect(html).toContain('id="my-templates"'); expect(html).toContain('id="kochivo-templates"');
 state.index = 0; state.values = [[], 'program', null, null, false, 'Load failed'];
 html = render(createElement(TemplatesScreen));
 expect(html.match(/Load failed/g)).toHaveLength(2);
 expect(html.match(/>Try again<\/button>/g)).toHaveLength(2);
});
it('renders multi-select, succeeded players and named failures', () => {
 state.values = [[{ playerId: 'ali', fullName: 'Ali' }, { playerId: 'omar', fullName: 'Omar' }],
   false, '', 0, ['omar'], ['ali'], { omar: 'Failed' }, false];
 const html = render(createElement(AssignSheet, { template, onClose() {} }));
 expect(html.match(/type="checkbox"/g)).toHaveLength(3);
 expect(html).toContain('Select all'); expect(html).toContain('Assign to 1 players');
 expect(html).toMatch(/<input(?=[^>]*value="ali")(?=[^>]*disabled="")(?=[^>]*checked="")[^>]*>/);
 expect(html).toContain('Omar: Failed'); expect(html).toContain('Assigned');
});
it('links an empty assignment list to players', () => {
 state.values = [[], false];
 expect(render(createElement(AssignSheet, { template, onClose() {} }))).toMatch(/href="\/captain\/players"[^>]*>Open players<\/a>/);
});
it('returns from an empty template preview to choose another template', () => {
 state.values = [{ kind: 'program', groups: [] }];
 expect(render(createElement(PreviewSheet, { template: { ...template, starter: false }, onAssign() {}, onClose() {} }))).toContain('>Choose another template</button>');
});
