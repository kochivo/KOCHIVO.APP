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
vi.mock('./data/templates', () => ({ listTemplates() {}, copyTemplate() {}, deleteTemplate() {}, renameTemplate() {}, assignTemplate() {}, listTemplatePlayers() {} }));
vi.mock('./data/template-preview', () => ({ previewTemplate() {} }));
const template = { id: 't', title: 'Starter', kind: 'program' as const, starter: true, count: 1, created_at: '2026-11-03T10:00:00Z' };
it('offers copying a starter when there are no personal templates', () => {
 state.values = [[template], 'program', null, null, false];
 expect(render(createElement(TemplatesScreen))).toContain('>Copy a starter</button>');
});
it('links a fully empty template library to players', () => {
 state.values = [[], 'program', null, null, false];
 expect(render(createElement(TemplatesScreen))).toMatch(/href="\/captain\/players"[^>]*>Open players<\/a>/);
});
it('links an empty assignment list to players', () => {
 state.values = [[], '', false];
 expect(render(createElement(AssignSheet, { template, onClose() {} }))).toMatch(/href="\/captain\/players"[^>]*>Open players<\/a>/);
});
it('returns from an empty template preview to choose another template', () => {
 state.values = [{ kind: 'program', groups: [] }];
 expect(render(createElement(PreviewSheet, { template: { ...template, starter: false }, onAssign() {}, onClose() {} }))).toContain('>Choose another template</button>');
});
