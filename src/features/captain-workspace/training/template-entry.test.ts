import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TemplateTrainingEntry } from './template-entry';

vi.mock('server-only', () => ({}));
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => 'en' }));
const state = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('@/features/programs/server', () => ({ readProgram: state.read }));
vi.mock('@/features/programs', () => { throw new Error('Server template reads must not load the client barrel'); });
vi.mock('next/dynamic', () => ({ default: () => (props: object) => createElement('div', { 'data-editor': JSON.stringify(props) }) }));
const id = '01900000-0000-7000-8000-000000000001';
const draft = { id, title: 'My plan', player_id: null, is_template: true, is_starter: false, status: 'draft', days: [] };
beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1'); state.read.mockReset(); state.read.mockResolvedValue({ data: draft }); });
afterEach(() => vi.unstubAllEnvs());
it('passes template mode and loading copy to the lazy shared editor without player facts', async () => {
  const html = renderToStaticMarkup(await TemplateTrainingEntry({ planId: id }));
  expect(state.read).toHaveBeenCalledWith(id);
  expect(html).toContain('My plan');
  expect(html).toContain('href="/captain/templates"');
  expect(html).toContain('&quot;mode&quot;:&quot;template&quot;');
  expect(html).toContain('&quot;loadingLabel&quot;:&quot;Loading…&quot;');
  expect(html).not.toContain('playerId');
  expect(html).not.toContain('Player details');
});
it.each([{ is_template: false }, { is_starter: true }, { player_id: 'player' }])('rejects a non-editable template %j', async patch => {
  state.read.mockResolvedValue({ data: { ...draft, ...patch } });
  await expect(TemplateTrainingEntry({ planId: id })).rejects.toMatchObject({ digest: expect.stringContaining('404') });
});
it('does not read disabled or malformed requests', async () => {
  await expect(TemplateTrainingEntry({ planId: 'invalid' })).rejects.toThrow();
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  await expect(TemplateTrainingEntry({ planId: id })).rejects.toThrow();
  expect(state.read).not.toHaveBeenCalled();
});
it('keeps a server read failure retryable', async () => {
  state.read.mockResolvedValue({ error: 'Failed' });
  const html = renderToStaticMarkup(await TemplateTrainingEntry({ planId: id }));
  expect(html).toContain('role="alert"');
  expect(html).toContain(`href="/captain/templates?plan=${id}"`);
  expect(html).toContain('Try again');
});
