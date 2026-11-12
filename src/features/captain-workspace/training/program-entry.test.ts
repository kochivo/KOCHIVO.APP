import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ProgramTrainingEntry } from './program-entry';
import { TrainingContent } from './training-content';
import { TemplateTrainingEntry } from './template-entry';
vi.mock('server-only', () => ({}));
vi.mock('@/core/i18n/server', () => ({ getLocale: async () => 'en' }));
const state = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('@/features/programs/server', () => ({ readProgram: state.read }));
vi.mock('./training-content', () => ({ TrainingContent: () => createElement('section') }));
vi.mock('./template-entry', () => ({ TemplateTrainingEntry: () => createElement('section') }));
const id = '01900000-0000-7000-8000-000000000001', player = '01900000-0000-7000-8000-000000000002';
const draft = { id, player_id: player, title: 'Plan', status: 'draft', days: [], is_template: false, is_starter: false };
beforeEach(() => { vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1'); state.read.mockReset(); state.read.mockResolvedValue({ data: draft }); });
afterEach(() => vi.unstubAllEnvs());
it('passes the authorized requested draft to the shared player editor rather than selecting a different program', async () => {
  const element = await ProgramTrainingEntry({ programId: id });
  expect(element.type).toBe(TrainingContent);
  expect(element.props).toEqual({ playerId: player, initial: draft });
  expect(state.read).toHaveBeenCalledWith(id);
});
it('uses the existing validated template entry for a program without a player', async () => {
  state.read.mockResolvedValue({ data: { ...draft, is_template: true, player_id: null } });
  const element = await ProgramTrainingEntry({ programId: id });
  expect(element.type).toBe(TemplateTrainingEntry); expect(element.props.planId).toBe(id);
});
it.each([{ is_template: true }, { is_starter: true }, { player_id: 'bad-id' }])('rejects non-editable player program shape %j', async patch => {
  state.read.mockResolvedValue({ data: { ...draft, ...patch } });
  await expect(ProgramTrainingEntry({ programId: id })).rejects.toMatchObject({ digest: expect.stringContaining('404') });
});
it('does not query disabled or malformed requests', async () => {
  await expect(ProgramTrainingEntry({ programId: 'invalid' })).rejects.toThrow();
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  await expect(ProgramTrainingEntry({ programId: id })).rejects.toThrow(); expect(state.read).not.toHaveBeenCalled();
});
it('leaves server failures retryable without exposing a draft', async () => {
  state.read.mockResolvedValue({ error: 'private details' });
  const html = renderToStaticMarkup(await ProgramTrainingEntry({ programId: id }));
  expect(html).toContain('role="alert"'); expect(html).toContain(`href="/captain/programs/${id}"`);
  expect(html).not.toContain('private details');
});
